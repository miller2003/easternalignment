/**
 * src/match/ui/quizApp.ts
 * Eastern Alignment Reader Match System — client controller.
 *
 * Two hosts (interaction skeleton ported from the MysticDo Apple-grade
 * quiz engine, restyled with Eastern Alignment tokens):
 *  - inline (default): the quiz renders inside the container
 *    (the dedicated /match/ page).
 *  - modal: the container shows an invitation launcher card; the quiz
 *    runs in a full-screen frosted-glass bottom-sheet overlay. Closing
 *    the overlay preserves state — the launcher button flips
 *    Begin → Resume → See your matches. Optimised for iPhone Safari:
 *    dvh sheet, html-level scroll lock with offset restore,
 *    history-back dismiss, safe-area padding, no double blur layers.
 */

import type { ReaderProfile, UserAnswers, MatchEngineResult, QuizQuestion } from '../types';
import { QUIZ_QUESTIONS, PLATFORM_BADGES } from '../taxonomy';
import { runMatchEngine } from '../engine/recommend';
import { trackMatchEvent } from '../analytics';

type Phase = 'idle' | 'running' | 'calculating' | 'done';

export class MatchQuizApp {
  // Definite assignment (`!`): the constructor early-returns with a console
  // warning when the target container is missing, so these are only touched
  // after successful assignment — the guard below protects every use.
  private container!: HTMLElement;
  private readers!: ReaderProfile[];
  private currentStepIndex: number = 0;
  private answers: Partial<UserAnswers> = {
    preferredStyles: [],
  };
  private isComputing: boolean = false;
  private result: MatchEngineResult | null = null;
  private debugMode: boolean = false;

  /* ---- modal state ---- */
  private modalMode: boolean = false;
  private overlay: HTMLElement | null = null;
  private modalCard: HTMLElement | null = null;
  private modalBody: HTMLElement | null = null;
  private modalOpen: boolean = false;
  private lastFocused: HTMLElement | null = null;
  private phase: Phase = 'idle';
  private calcTimers: number[] = [];
  private lockedScrollY: number = 0;
  private stepLock: boolean = false;

  constructor(containerId: string, readers: ReaderProfile[]) {
    const el = document.getElementById(containerId);
    if (!el) {
      console.warn(`[MatchQuizApp] Target container #${containerId} not found.`);
      return;
    }
    this.container = el;
    this.readers = readers;
    this.debugMode = window.location.search.includes('debug=true') || window.location.hash.includes('debug');

    this.modalMode = el.getAttribute('data-match-mode') === 'modal';

    if (this.modalMode) {
      this.updateLauncher();
      this.bindGlobalOpenTriggers();
      // Pre-build the overlay while the browser is idle so the first open
      // doesn't pay DOM construction cost in the same frame (visible hitch
      // on slower mobile GPUs).
      const warm = (window as any).requestIdleCallback || function (f: () => void) { setTimeout(f, 1500); };
      warm(() => { if (!this.overlay) this.buildModalSkeleton(); });
    } else {
      trackMatchEvent('match_started', { totalReaders: readers.length });
      this.renderQuestion(QUIZ_QUESTIONS[this.currentStepIndex]);
    }
  }

  /* ================================================================
     Launcher — the invitation card shown in the page (modal mode)
     ================================================================ */

  private updateLauncher() {
    const btn = this.container.querySelector('[data-match-open-label]');
    if (!btn) return;
    const label = this.phase === 'done'
      ? 'See My Matches'
      : this.phase === 'running' || this.phase === 'calculating'
        ? 'Resume the Match'
        : 'Match My Situation';
    btn.textContent = label + ' →';
    const retake = this.container.querySelector('[data-match-retake]') as HTMLElement | null;
    if (retake) retake.style.display = this.phase === 'done' ? '' : 'none';
  }

  /* Every element with [data-match-open] (hero CTA, launcher button,
     nav links) opens the overlay. href anchors stay as no-JS fallback. */
  private bindGlobalOpenTriggers() {
    document.querySelectorAll('[data-match-open]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal();
      });
    });
    const retake = this.container.querySelector('[data-match-retake]');
    if (retake) {
      retake.addEventListener('click', () => {
        this.openModal(true);
      });
    }
  }

  /* ================================================================
     Modal scaffolding (built once, on first open)
     ================================================================ */

  private buildModalSkeleton() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'ea-match-modal-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.setAttribute('aria-label', 'Situation-Based Reader Match');
    this.overlay.innerHTML =
      '<div class="ea-match-modal-scrim" data-match-close></div>'
      + '<div class="ea-match-modal-card" data-phase="questions">'
      +   '<div class="ea-match-modal-handle" aria-hidden="true"></div>'
      +   '<div class="ea-match-modal-topbar">'
      +     '<span class="ea-match-modal-brand">✦ Situation Match</span>'
      +     '<button type="button" class="ea-match-modal-close" data-match-close aria-label="Close the match tool">'
      +       '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>'
      +     '</button>'
      +   '</div>'
      +   '<div class="ea-match-modal-progress" id="ea-modal-progress"></div>'
      +   '<div class="ea-match-modal-body"></div>'
      + '</div>';
    document.body.appendChild(this.overlay);
    this.modalCard = this.overlay.querySelector('.ea-match-modal-card');
    this.modalBody = this.overlay.querySelector('.ea-match-modal-body');
    this.overlay.querySelectorAll('[data-match-close]').forEach((el) => {
      el.addEventListener('click', () => this.closeModal());
    });
  }

  private setCardPhase(p: Phase) {
    if (this.modalCard) this.modalCard.setAttribute('data-phase', p);
  }

  private openModal(restart: boolean = false) {
    if (!this.overlay) this.buildModalSkeleton();
    if (this.modalOpen) {
      if (restart) this.startQuiz();
      return;
    }
    this.modalOpen = true;
    this.lastFocused = document.activeElement as HTMLElement | null;
    this.setPageScrollLock(true);
    document.addEventListener('keydown', this.onModalKey);
    window.addEventListener('popstate', this.onModalPop);
    try { history.pushState({ eaMatchModal: true }, ''); } catch (e) { /* no-op */ }
    // double rAF: let the browser paint the preopen state first so the
    // open transition actually animates instead of snapping
    this.overlay!.classList.add('preopen');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { this.overlay!.classList.add('open'); });
    });
    if (this.phase === 'idle' || restart) {
      this.setCardPhase('questions');
      this.startQuiz();
      trackMatchEvent('match_started', { totalReaders: this.readers.length });
    } else if (this.phase === 'running') {
      this.renderModalProgress();
      this.showModalStep(this.currentStepIndex, 'forward');
    }
    // phase === 'done': the result is still in the modal body — just reveal it
  }

  private closeModal(viaPop: boolean = false) {
    if (!this.modalOpen || !this.overlay) return;
    this.cancelComputing();
    this.modalOpen = false;
    this.overlay.classList.remove('open');
    this.overlay.classList.add('closing');
    document.removeEventListener('keydown', this.onModalKey);
    window.removeEventListener('popstate', this.onModalPop);
    this.setPageScrollLock(false);
    if (!viaPop && history.state && (history.state as any).eaMatchModal) {
      try { history.back(); } catch (e) { /* no-op */ }
    }
    const ov = this.overlay;
    setTimeout(() => {
      ov.classList.remove('closing', 'preopen');
      if (this.lastFocused && typeof this.lastFocused.focus === 'function') {
        try { this.lastFocused.focus(); } catch (e) { /* no-op */ }
      }
    }, 340);
    this.updateLauncher();
  }

  private onModalPop = () => { if (this.modalOpen) this.closeModal(true); };

  private onModalKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      this.closeModal();
      return;
    }
    if (e.key === 'Tab' && this.overlay) {
      // focus trap — keep Tab cycling inside the overlay
      const focusables = this.overlay.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const list = Array.prototype.filter.call(focusables, (el: HTMLElement) => el.offsetParent !== null);
      if (!list.length) return;
      const first = list[0] as HTMLElement;
      const last = list[list.length - 1] as HTMLElement;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !this.overlay.contains(active))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (active === last || !this.overlay.contains(active))) {
        e.preventDefault(); first.focus();
      }
    }
  };

  /* iOS Safari: locking <html> is what actually stops the page behind
     from rubber-banding. Restore the exact scroll offset on unlock. */
  private setPageScrollLock(lock: boolean) {
    const de = document.documentElement;
    if (lock) {
      this.lockedScrollY = window.scrollY || window.pageYOffset || 0;
      de.classList.add('ea-match-locked');
      document.body.classList.add('ea-match-locked');
    } else {
      de.classList.remove('ea-match-locked');
      document.body.classList.remove('ea-match-locked');
      if (Math.abs((window.scrollY || 0) - this.lockedScrollY) > 1) {
        const prev = de.style.scrollBehavior;
        de.style.scrollBehavior = 'auto';
        window.scrollTo(0, this.lockedScrollY);
        de.style.scrollBehavior = prev;
      }
    }
  }

  /* ================================================================
     Shared render helpers
     ================================================================ */

  private stepContentHTML(question: QuizQuestion): string {
    const selectedValue = this.answers[question.id as keyof UserAnswers];
    const options = question.options.map(opt => {
      const isSelected = question.isMultiSelect
        ? Array.isArray(selectedValue) && (selectedValue as string[]).includes(opt.value)
        : selectedValue === opt.value;
      return `
        <button
          type="button"
          class="ea-match-option-btn ${question.isMultiSelect ? 'is-multi' : ''} ${isSelected ? 'is-selected' : ''}"
          data-value="${opt.value}"
        >
          <div class="ea-match-option-marker"></div>
          <div class="ea-match-option-content">
            <span class="ea-match-option-label">${opt.label}</span>
            ${opt.sublabel ? `<span class="ea-match-option-sublabel">${opt.sublabel}</span>` : ''}
          </div>
        </button>
      `;
    }).join('');

    const multiFooter = question.isMultiSelect ? `
      <div class="ea-match-multiselect-footer">
        <span class="ea-match-counter-hint" data-multi-hint>
          Selected ${Array.isArray(selectedValue) ? (selectedValue as string[]).length : 0} of ${question.maxSelect || 2}
        </span>
        <button
          type="button"
          class="ea-match-primary-btn"
          data-multi-continue
          ${(!Array.isArray(selectedValue) || (selectedValue as string[]).length === 0) ? 'disabled' : ''}
        >
          Continue →
        </button>
      </div>
    ` : '';

    return `
      <span class="ea-match-eyebrow">${question.eyebrow}</span>
      <h2 class="ea-match-title">${question.title}</h2>
      ${question.subtitle ? `<p class="ea-match-subtitle">${question.subtitle}</p>` : ''}
      <div class="ea-match-options">${options}</div>
      ${multiFooter}
    `;
  }

  private progressHeaderHTML(): string {
    const total = QUIZ_QUESTIONS.length;
    const current = this.currentStepIndex + 1;
    const progressPercent = Math.round((current / total) * 100);
    return `
      <div class="ea-match-progress-meta">
        <span>Question ${current} of ${total}</span>
        ${this.currentStepIndex > 0 ? `
          <button type="button" class="ea-match-back-btn" data-back-btn>← Back</button>
        ` : '<span></span>'}
      </div>
      <div class="ea-match-progress-track">
        <div class="ea-match-progress-fill" style="width: ${progressPercent}%;"></div>
      </div>
    `;
  }

  private bindStepEvents(scope: HTMLElement, question: QuizQuestion) {
    const backBtn = scope.querySelector('[data-back-btn]');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (this.currentStepIndex > 0 && !this.stepLock) {
          this.currentStepIndex--;
          this.render();
        }
      });
    }

    const optionButtons = scope.querySelectorAll('.ea-match-option-btn');

    if (question.isMultiSelect) {
      const currentArr: string[] = Array.isArray(this.answers[question.id as keyof UserAnswers])
        ? [...(this.answers[question.id as keyof UserAnswers] as string[])]
        : [];
      const maxSelect = question.maxSelect || 2;
      const continueBtn = scope.querySelector('[data-multi-continue]') as HTMLButtonElement | null;
      const hint = scope.querySelector('[data-multi-hint]');

      optionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.getAttribute('data-value')!;
          const idx = currentArr.indexOf(val);

          if (idx >= 0) {
            currentArr.splice(idx, 1);
            btn.classList.remove('is-selected');
          } else {
            if (currentArr.length >= maxSelect) {
              const firstVal = currentArr.shift();
              const oldBtn = scope.querySelector(`.ea-match-option-btn[data-value="${firstVal}"]`);
              if (oldBtn) oldBtn.classList.remove('is-selected');
            }
            currentArr.push(val);
            btn.classList.add('is-selected');
          }

          (this.answers as any)[question.id] = currentArr;
          if (hint) hint.textContent = `Selected ${currentArr.length} of ${maxSelect}`;
          if (continueBtn) continueBtn.disabled = currentArr.length === 0;
        });
      });

      if (continueBtn) {
        continueBtn.addEventListener('click', () => {
          this.advanceStep(question.id);
        });
      }
    } else {
      optionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          if (this.stepLock) return;
          this.stepLock = true;
          const val = btn.getAttribute('data-value')!;
          (this.answers as any)[question.id] = val;

          // Highlight selected, dim the rest — the tactile beat before the
          // slide to the next question
          const all = Array.from(scope.querySelectorAll('.ea-match-option-btn')) as HTMLElement[];
          all.forEach(b => b.classList.remove('is-selected'));
          btn.classList.add('is-selected');
          if (navigator.vibrate) { try { navigator.vibrate(10); } catch (e) { /* no-op */ } }
          setTimeout(() => {
            all.forEach(b => { if (!b.classList.contains('is-selected')) b.classList.add('is-dimmed'); });
          }, 80);

          setTimeout(() => {
            this.stepLock = false;
            this.advanceStep(question.id);
          }, 380);
        });
      });
    }
  }

  private advanceStep(questionId: string) {
    trackMatchEvent('match_step_completed', {
      step: this.currentStepIndex + 1,
      questionId,
      answer: (this.answers as any)[questionId],
    });

    if (this.currentStepIndex < QUIZ_QUESTIONS.length - 1) {
      this.currentStepIndex++;
      this.render();
    } else {
      this.startComputing();
    }
  }

  /* ================================================================
     Inline host (the /match/ editorial page) — legacy behaviour kept
     ================================================================ */

  private render() {
    if (this.result) {
      this.renderResults();
    } else if (this.isComputing) {
      this.renderComputing();
    } else if (this.modalMode) {
      this.renderModalProgress();
      this.showModalStep(this.currentStepIndex, 'forward');
    } else {
      this.renderQuestion(QUIZ_QUESTIONS[this.currentStepIndex]);
    }
  }

  private renderQuestion(question: QuizQuestion) {
    const total = QUIZ_QUESTIONS.length;
    const current = this.currentStepIndex + 1;
    const progressPercent = Math.round((current / total) * 100);
    const selectedValue = this.answers[question.id as keyof UserAnswers];

    this.container.innerHTML = `
      <div class="ea-match-card">
        <div class="ea-match-header">
          <div class="ea-match-progress-meta">
            <span>Question ${current} of ${total}</span>
            ${this.currentStepIndex > 0 ? `
              <button type="button" class="ea-match-back-btn" id="ea-back-btn">
                ← Back
              </button>
            ` : '<span></span>'}
          </div>
          <div class="ea-match-progress-track">
            <div class="ea-match-progress-fill" style="width: ${progressPercent}%;"></div>
          </div>
        </div>

        <div class="ea-match-question-view" key="step-${current}">
          <span class="ea-match-eyebrow">${question.eyebrow}</span>
          <h2 class="ea-match-title">${question.title}</h2>
          ${question.subtitle ? `<p class="ea-match-subtitle">${question.subtitle}</p>` : ''}

          <div class="ea-match-options">
            ${question.options.map(opt => {
              const isSelected = question.isMultiSelect
                ? Array.isArray(selectedValue) && (selectedValue as string[]).includes(opt.value)
                : selectedValue === opt.value;

              return `
                <button
                  type="button"
                  class="ea-match-option-btn ${question.isMultiSelect ? 'is-multi' : ''} ${isSelected ? 'is-selected' : ''}"
                  data-value="${opt.value}"
                >
                  <div class="ea-match-option-marker"></div>
                  <div class="ea-match-option-content">
                    <span class="ea-match-option-label">${opt.label}</span>
                    ${opt.sublabel ? `<span class="ea-match-option-sublabel">${opt.sublabel}</span>` : ''}
                  </div>
                </button>
              `;
            }).join('')}
          </div>

          ${question.isMultiSelect ? `
            <div class="ea-match-multiselect-footer">
              <span class="ea-match-counter-hint" id="ea-multi-hint">
                Selected ${Array.isArray(selectedValue) ? (selectedValue as string[]).length : 0} of ${question.maxSelect || 2}
              </span>
              <button
                type="button"
                class="ea-match-primary-btn"
                id="ea-multi-continue-btn"
                ${(!Array.isArray(selectedValue) || (selectedValue as string[]).length === 0) ? 'disabled' : ''}
              >
                Continue →
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    this.bindQuestionEvents(question);
  }

  private bindQuestionEvents(question: QuizQuestion) {
    const backBtn = this.container.querySelector('#ea-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (this.currentStepIndex > 0) {
          this.currentStepIndex--;
          this.render();
        }
      });
    }

    const optionButtons = this.container.querySelectorAll('.ea-match-option-btn');

    if (question.isMultiSelect) {
      const currentArr: string[] = Array.isArray(this.answers[question.id as keyof UserAnswers])
        ? [...(this.answers[question.id as keyof UserAnswers] as string[])]
        : [];
      const maxSelect = question.maxSelect || 2;
      const continueBtn = this.container.querySelector('#ea-multi-continue-btn') as HTMLButtonElement;
      const hint = this.container.querySelector('#ea-multi-hint');

      optionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.getAttribute('data-value')!;
          const idx = currentArr.indexOf(val);

          if (idx >= 0) {
            currentArr.splice(idx, 1);
            btn.classList.remove('is-selected');
          } else {
            if (currentArr.length >= maxSelect) {
              const firstVal = currentArr.shift();
              const oldBtn = this.container.querySelector(`.ea-match-option-btn[data-value="${firstVal}"]`);
              if (oldBtn) oldBtn.classList.remove('is-selected');
            }
            currentArr.push(val);
            btn.classList.add('is-selected');
          }

          (this.answers as any)[question.id] = currentArr;
          if (hint) hint.textContent = `Selected ${currentArr.length} of ${maxSelect}`;
          if (continueBtn) continueBtn.disabled = currentArr.length === 0;
        });
      });

      if (continueBtn) {
        continueBtn.addEventListener('click', () => {
          this.advanceStep(question.id);
        });
      }
    } else {
      optionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.getAttribute('data-value')!;
          (this.answers as any)[question.id] = val;

          optionButtons.forEach(b => b.classList.remove('is-selected'));
          btn.classList.add('is-selected');

          setTimeout(() => {
            this.advanceStep(question.id);
          }, 280);
        });
      });
    }
  }

  /* ================================================================
     Modal step flow (persistent steps + directional animations)
     ================================================================ */

  private renderModalProgress() {
    const slot = this.overlay?.querySelector('#ea-modal-progress') as HTMLElement | null;
    if (!slot) return;
    slot.innerHTML = this.progressHeaderHTML();
    const backBtn = slot.querySelector('[data-back-btn]');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (this.currentStepIndex > 0 && !this.stepLock) {
          this.currentStepIndex--;
          this.render();
        }
      });
    }
  }

  private showModalStep(idx: number, dir: 'forward' | 'back') {
    if (!this.modalBody) return;
    const question = QUIZ_QUESTIONS[idx];

    let stepEl = this.modalBody.querySelector(`[data-step="${idx}"]`) as HTMLElement | null;
    if (!stepEl) {
      stepEl = document.createElement('div');
      stepEl.className = 'ea-match-step';
      stepEl.setAttribute('data-step', String(idx));
      stepEl.innerHTML = `
        <div class="ea-match-question-view">
          ${this.stepContentHTML(question)}
        </div>
      `;
      this.modalBody.appendChild(stepEl);
      this.bindStepEvents(stepEl, question);
    }

    this.modalBody.querySelectorAll('.ea-match-step').forEach((el) => {
      el.classList.remove('active', 'leaving', 'back-active');
    });
    if (dir === 'back') stepEl.classList.add('back-active');
    stepEl.classList.add('active');
    this.modalBody.scrollTop = 0;
  }

  /* ================================================================
     Computing ceremony — cancellable (closing mid-ceremony must not
     let a stale timer write last session's result into the new one)
     ================================================================ */

  private startComputing() {
    this.isComputing = true;
    this.phase = 'calculating';
    this.setCardPhase('calculating');
    this.render();

    const stages = [
      { text: 'Deconstructing situational tension & observation dynamics…', percent: '28%', delay: 0 },
      { text: 'Screening 241 audited advisor track records across Kasamba, Purple Garden, & Keen…', percent: '56%', delay: 900 },
      { text: 'Filtering communication format, verified reviews & budget fit…', percent: '82%', delay: 1800 },
      { text: 'Synthesizing your situation diagnosis & precision reader matches…', percent: '100%', delay: 2700 },
    ];

    stages.forEach(s => {
      this.calcTimers.push(window.setTimeout(() => {
        const scope = this.modalMode ? this.modalBody : this.container;
        const statusEl = scope?.querySelector('#ea-status-text');
        const barEl = scope?.querySelector('#ea-status-bar') as HTMLElement | null;
        if (statusEl) statusEl.textContent = s.text;
        if (barEl) barEl.style.width = s.percent;
      }, s.delay));
    });

    this.calcTimers.push(window.setTimeout(() => {
      this.calcTimers = [];
      this.isComputing = false;
      this.phase = 'done';
      this.setCardPhase('result');
      this.result = runMatchEngine(this.readers, this.answers as UserAnswers);
      trackMatchEvent('match_completed', {
        intent: this.answers.intent,
        topReader: this.result.topMatches[0]?.reader?.id,
      });
      this.render();
    }, 3400));
  }

  private cancelComputing() {
    for (const t of this.calcTimers) clearTimeout(t);
    this.calcTimers = [];
  }

  private renderComputing() {
    const target = this.modalMode ? this.modalBody : this.container;
    if (!target) return;
    target.innerHTML = `
      <div class="ea-match-card">
        <div class="ea-match-computing">
          <div class="ea-computing-orb-wrapper">
            <div class="ea-computing-orb">
              <div class="ea-computing-ring"></div>
              <div class="ea-computing-core"></div>
            </div>
          </div>
          <h3 class="ea-computing-status" id="ea-status-text">
            Deconstructing situational tension & observation dynamics…
          </h3>
          <p class="ea-computing-sub">Eastern Alignment Precision Engine · Audited Session Data</p>
          <div class="ea-computing-bar">
            <div class="ea-computing-bar-fill" id="ea-status-bar" style="width: 25%;"></div>
          </div>
        </div>
      </div>
    `;
  }

  /* ================================================================
     Results
     ================================================================ */

  private renderResults() {
    if (!this.result) return;
    const target = this.modalMode ? this.modalBody : this.container;
    if (!target) return;
    target.innerHTML = `
      <div class="ea-match-card">
        ${this.resultsHTML()}
      </div>
    `;
    this.bindResultEvents();
    if (this.modalMode && target instanceof HTMLElement) target.scrollTop = 0;
  }

  private resultsHTML(): string {
    if (!this.result) return '';
    const { diagnosis, topMatches, totalEligibleReaders } = this.result;

    return `
      <div class="ea-match-results-view">
        <!-- Header -->
        <div class="ea-match-results-header">
          <span class="ea-results-eyebrow">Audited Diagnostic Report</span>
          <h2 class="ea-results-title">Your Situation Diagnosis &amp; Recommended Advisors</h2>
          <p class="ea-results-meta">
            Synthesized across <strong>${totalEligibleReaders} eligible advisors</strong> based on your documented situation profile.
          </p>
        </div>

        <!-- 1. Diagnostic Dossier -->
        <div class="ea-diagnosis-card">
          <span class="ea-diagnosis-badge">AUDITED SITUATION PROFILE</span>
          <h3 class="ea-diagnosis-pattern-title">${diagnosis.coreDynamicTitle}</h3>
          <p class="ea-diagnosis-body">${diagnosis.situationSummary}</p>
          <div class="ea-diagnosis-mechanism">
            <strong>Underlying Tension:</strong> ${diagnosis.underlyingMechanism}
          </div>

          <div class="ea-diagnosis-grid">
            <div>
              <div class="ea-diagnosis-col-title is-clear">
                <span>✓</span> What Is Documented &amp; Clear
              </div>
              <ul class="ea-diagnosis-list is-clear">
                ${diagnosis.whatIsClear.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
            <div>
              <div class="ea-diagnosis-col-title is-unresolved">
                <span>•</span> What Remains Unresolved
              </div>
              <ul class="ea-diagnosis-list is-unresolved">
                ${diagnosis.whatIsUnresolved.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          </div>

          <!-- Recommended Opening Question -->
          <div class="ea-opening-question-box">
            <div class="ea-opening-header">
              <span class="ea-opening-label">Recommended Opening Question for Your Reading</span>
              <button type="button" class="ea-copy-question-btn" data-copy-btn>
                Copy Question
              </button>
            </div>
            <div class="ea-opening-text" data-opening-text>
              ${diagnosis.recommendedOpeningQuestion}
            </div>
          </div>

          <!-- Scam Notice -->
          <div class="ea-scam-notice">
            <span>🛡️</span>
            <span><strong>Eastern Alignment Consumer Protection:</strong> ${diagnosis.scamWarning}</span>
          </div>
        </div>

        <!-- 2. Matched Readers Section -->
        <div class="ea-matched-readers-section">
          <h3 class="ea-section-label">Your Top 3 Audited Advisor Matches</h3>
          <p class="ea-section-sublabel">
            Selected using deterministic fit-vector scoring across documented specialties, communication format, and verified reviews.
          </p>

          <div class="ea-reader-cards-stack">
            ${topMatches.map(m => {
              const r = m.reader;
              const platformMeta = PLATFORM_BADGES[r.platform] || { label: r.platform, class: '', promoTag: r.freeOffer };
              const rankBadgeClass = m.rank === 1 ? 'ea-rank-badge--rank-1' : (m.rank === 2 ? 'ea-rank-badge--rank-2' : 'ea-rank-badge--rank-3');

              return `
                <div class="ea-match-card-item ${m.rank === 1 ? 'is-rank-1' : ''}">
                  <!-- Top Bar -->
                  <div class="ea-reader-card-topbar">
                    <span class="ea-rank-badge ${rankBadgeClass}">
                      ${m.rank === 1 ? '★' : (m.rank === 2 ? '◈' : '◉')} #${m.rank} ${m.badge}
                    </span>
                    <span class="ea-match-score-pill">
                      ${m.matchPercentage}% Compatibility Fit
                    </span>
                  </div>

                  <!-- Reader Info Row -->
                  <div class="ea-reader-main-info">
                    ${r.avatarUrl ? `
                      <img
                        src="${r.avatarUrl}"
                        alt="${r.name}"
                        class="ea-reader-avatar"
                        loading="lazy"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                      />
                      <div class="ea-reader-avatar-fallback" style="display:none;">${r.name.slice(0, 1)}</div>
                    ` : `
                      <div class="ea-reader-avatar-fallback">${r.name.slice(0, 1)}</div>
                    `}
                    <div class="ea-reader-header-text">
                      <div class="ea-reader-name-row">
                        <h4 class="ea-reader-name">${r.name}</h4>
                        <span class="platform-badge ${platformMeta.class}">${platformMeta.label}</span>
                      </div>
                      <div class="ea-reader-rating-row">
                        <span class="ea-reader-stars">★</span>
                        <strong>${r.rating.toFixed(1)}</strong>
                        <span>(${r.reviewCount.toLocaleString()} readings)</span>
                        <span>·</span>
                        <span>${r.formats.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(' &amp; ')}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Offer Strip -->
                  <div class="ea-offer-strip">
                    <span><strong>Audited Offer:</strong> ${r.freeOffer || platformMeta.promoTag}</span>
                    <span class="ea-offer-price">${r.pricing}</span>
                  </div>

                  <!-- Why Matched -->
                  <div class="ea-why-matched-block">
                    <div class="ea-why-label">Why this advisor matches your situation:</div>
                    <ul class="ea-why-list">
                      ${m.whyMatched.map(bullet => `<li>${bullet}</li>`).join('')}
                    </ul>
                  </div>

                  <!-- Suited For & Skip Caveat -->
                  <div class="ea-suited-skip-grid">
                    <div class="ea-suited-row">
                      <strong>Best For:</strong> ${m.bestSuitedFor}
                    </div>
                    <div class="ea-skip-row">
                      <strong>When to Skip:</strong> ${m.whenToSkip}
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="ea-reader-actions">
                    <a
                      href="${r.affiliateUrl}"
                      class="ea-cta-primary"
                      target="_blank"
                      rel="nofollow sponsored"
                      data-cta-source="quiz-match-top${m.rank}"
                    >
                      Claim ${r.freeOffer ? r.freeOffer.split('+')[0].trim() : 'Intro Deal'} with ${r.name} →
                    </a>
                    <a
                      href="${r.reviewUrl}"
                      class="ea-cta-secondary"
                    >
                      Read Full Audit
                    </a>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Suggested Guides -->
        <div class="ea-matched-guides-section">
          <div class="ea-guides-header">Related Field Notes &amp; Preparation Guides</div>
          <div class="ea-guides-list">
            <a href="/guides/questions-to-ask-a-psychic/" class="ea-guide-chip">
              <span>📖</span> Questions to Ask a Psychic: The 3-Minute Protocol
            </a>
            <a href="/guides/how-to-choose-a-psychic-reader/" class="ea-guide-chip">
              <span>🔍</span> How to Choose an Advisor Without Getting Burned
            </a>
            <a href="/guides/how-to-spot-fake-psychic/" class="ea-guide-chip">
              <span>🛡️</span> Fake Psychic Detection Guide
            </a>
          </div>
        </div>

        <!-- Debug Inspector Panel -->
        ${this.debugMode ? this.renderDebugPanel() : ''}

        <!-- Footer Retake -->
        <div class="ea-match-results-footer">
          <button type="button" class="ea-retake-btn" data-retake-btn>
            ↻ Adjust My Answers / Retake Match
          </button>
        </div>
      </div>
    `;
  }

  private renderDebugPanel(): string {
    if (!this.result) return '';
    return `
      <div class="ea-match-debug-panel">
        <h4>[DEBUG INSPECTOR] Deterministic Scoring Breakdown</h4>
        <table class="ea-debug-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Reader</th>
              <th>Intent (/35)</th>
              <th>Practice (/20)</th>
              <th>Question (/15)</th>
              <th>Format (/10)</th>
              <th>Style (/8)</th>
              <th>Budget (/7)</th>
              <th>Avail (/5)</th>
              <th>Total (/100)</th>
            </tr>
          </thead>
          <tbody>
            ${this.result.topMatches.map(m => {
              const b = m.scoreBreakdown;
              return `
                <tr>
                  <td>#${m.rank}</td>
                  <td>${m.reader.name} (${m.reader.platform})</td>
                  <td>${b.intentScore}</td>
                  <td>${b.practiceScore}</td>
                  <td>${b.questionTypeScore}</td>
                  <td>${b.communicationScore}</td>
                  <td>${b.styleScore}</td>
                  <td>${b.budgetScore}</td>
                  <td>${b.availabilityModifier}</td>
                  <td><strong>${b.totalScore}</strong></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  private bindResultEvents() {
    const scope = this.modalMode && this.modalBody ? this.modalBody : this.container;

    // Copy question
    const copyBtn = scope.querySelector('[data-copy-btn]');
    const questionText = scope.querySelector('[data-opening-text]');
    if (copyBtn && questionText) {
      copyBtn.addEventListener('click', () => {
        const text = questionText.textContent?.trim() || '';
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = 'Copied! ✓';
          setTimeout(() => {
            copyBtn.textContent = 'Copy Question';
          }, 2000);
        });
      });
    }

    // Retake — restart inside the current host
    const retakeBtn = scope.querySelector('[data-retake-btn]');
    if (retakeBtn) {
      retakeBtn.addEventListener('click', () => {
        this.startQuiz();
      });
    }

    // Track clicks on advisor recommendations
    const affiliateLinks = scope.querySelectorAll('.ea-cta-primary');
    affiliateLinks.forEach((link, idx) => {
      link.addEventListener('click', () => {
        const matched = this.result?.topMatches[idx];
        if (matched) {
          trackMatchEvent('reader_clicked', {
            readerId: matched.reader.id,
            platform: matched.reader.platform,
            rank: matched.rank,
            matchPercentage: matched.matchPercentage,
          });
        }
      });
    });
  }

  /* Restart from question 1 — used by retake buttons in both hosts */
  private startQuiz() {
    this.cancelComputing();
    this.currentStepIndex = 0;
    this.answers = { preferredStyles: [] };
    this.result = null;
    this.isComputing = false;
    this.phase = 'running';
    this.stepLock = false;
    this.setCardPhase('questions');
    if (this.modalMode && this.modalBody) {
      this.modalBody.innerHTML = '';
    }
    this.render();
  }
}

// Global auto-mount helper
export function initMatchApp(containerId: string = 'ea-match-root') {
  if (typeof window === 'undefined') return;

  const dataScript = document.getElementById('ea-readers-data');
  if (!dataScript) {
    console.warn('[MatchApp] #ea-readers-data script not found.');
    return;
  }

  try {
    const readers: ReaderProfile[] = JSON.parse(dataScript.textContent || '[]');
    new MatchQuizApp(containerId, readers);
  } catch (err) {
    console.error('[MatchApp] Failed to parse reader catalog:', err);
  }
}
