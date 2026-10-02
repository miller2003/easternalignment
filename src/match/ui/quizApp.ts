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
import { buildQuizSteps, finalizeAnswers, AREA_DEPENDENT_FIELDS, PLATFORM_BADGES } from '../taxonomy';
import { runMatchEngine } from '../engine/recommend';
import { areaTopic } from '../engine/explanations';
import { AREA_BY_ID, CARD_FACES, DURATIONS, GRIEF_DURATIONS, cardFor, findSituation } from '../reading';
import { trackMatchEvent } from '../analytics';

type Phase = 'idle' | 'running' | 'calculating' | 'done';

export class MatchQuizApp {
  // Definite assignment (`!`): the constructor early-returns with a console
  // warning when the target container is missing, so these are only touched
  // after successful assignment — the guard below protects every use.
  private container!: HTMLElement;
  private readers!: ReaderProfile[];
  /** Count shown in copy. Known before the catalogue arrives (data-reader-count). */
  private readerCount = 0;
  /** Resolves once the advisor catalogue is in memory (see loadReaders). */
  private readersReady: Promise<void> = Promise.resolve();
  private readersSrc = '';
  private readersRequested = false;
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
  /** Rotates which card sits under which face-down slot; reset per quiz. */
  private cardSeed: number = Math.floor(Math.random() * 3);

  constructor(containerId: string, readers: ReaderProfile[]) {
    const el = document.getElementById(containerId);
    if (!el) {
      console.warn(`[MatchQuizApp] Target container #${containerId} not found.`);
      return;
    }
    this.container = el;
    this.readers = readers;
    this.readerCount = readers.length || Number(el.getAttribute('data-reader-count')) || 0;
    this.readersSrc = el.getAttribute('data-readers-src') || '';
    this.debugMode = window.location.search.includes('debug=true') || window.location.hash.includes('debug');

    this.modalMode = el.getAttribute('data-match-mode') === 'modal';

    // Fetch the catalogue once the browser is idle (the dedicated /match/ page
    // and the homepage both need it only after the visitor answers a few
    // questions). Intent signals below pull it forward.
    const idle = (window as any).requestIdleCallback || function (f: () => void) { setTimeout(f, 1200); };
    idle(() => { this.ensureReaders().catch(() => {}); }, { timeout: 4000 });

    if (this.modalMode) {
      this.updateLauncher();
      this.bindGlobalOpenTriggers();
      // Pre-build the overlay while the browser is idle so the first open
      // doesn't pay DOM construction cost in the same frame (visible hitch
      // on slower mobile GPUs).
      const warm = (window as any).requestIdleCallback || function (f: () => void) { setTimeout(f, 1500); };
      warm(() => { if (!this.overlay) this.buildModalSkeleton(); });
    } else {
      trackMatchEvent('match_started', { totalReaders: this.readerCount });
      this.renderQuestion(this.steps()[this.currentStepIndex]);
    }
  }

  /* ================================================================
     Advisor catalogue — fetched on demand, not inlined in the HTML
     ================================================================ */

  /** Idempotent. Called on idle, on first pointer/focus intent over any open
   *  trigger, and when the quiz opens — whichever happens first. */
  public ensureReaders(): Promise<void> {
    if (this.readersRequested || this.readers.length > 0 || !this.readersSrc) return this.readersReady;
    this.readersRequested = true;
    const load = (attempt: number): Promise<void> =>
      fetch(this.readersSrc, { credentials: 'omit' })
        .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then((list: ReaderProfile[]) => { this.readers = list; this.readerCount = list.length; })
        .catch((err) => {
          if (attempt < 2) return new Promise<void>((res) => setTimeout(res, 800 * (attempt + 1))).then(() => load(attempt + 1));
          console.error('[MatchApp] Failed to load reader catalogue:', err);
          throw err;
        });
    this.readersReady = load(0);
    // A failed load must not become an unhandled rejection; the compute step
    // awaits readersReady itself and reports the failure there.
    this.readersReady.catch(() => { this.readersRequested = false; });
    return this.readersReady;
  }

  /* ================================================================
     Launcher — the invitation card shown in the page (modal mode)
     ================================================================ */

  /* Every [data-match-open-label] on the page (launch card button, the
     /match/ hero + closing CTAs) flips Begin → Resume → See matches.
     Each label's authored text is kept as its "begin" wording. */
  private updateLauncher() {
    document.querySelectorAll('[data-match-open-label]').forEach((node) => {
      const el = node as HTMLElement;
      if (el.dataset.matchBeginLabel === undefined) el.dataset.matchBeginLabel = el.textContent?.trim() || '';
      el.textContent = this.phase === 'done'
        ? 'See My Matches →'
        : this.phase === 'running' || this.phase === 'calculating'
          ? 'Resume My Match →'
          : el.dataset.matchBeginLabel || 'Match My Situation →';
    });
    document.querySelectorAll('[data-match-retake-wrap]').forEach((node) => {
      (node as HTMLElement).style.display = this.phase === 'done' ? '' : 'none';
    });
  }

  /* Every element with [data-match-open] (hero CTA, launcher button,
     nav links) opens the overlay. href anchors stay as no-JS fallback. */
  private bindGlobalOpenTriggers() {
    document.querySelectorAll('[data-match-open]').forEach((el) => {
      const warmData = () => { this.ensureReaders().catch(() => {}); };
      el.addEventListener('pointerenter', warmData, { once: true, passive: true });
      el.addEventListener('touchstart', warmData, { once: true, passive: true });
      el.addEventListener('focus', warmData, { once: true });
      el.addEventListener('click', (e) => {
        e.preventDefault();
        warmData();
        this.openModal();
      });
    });
    document.querySelectorAll('[data-match-retake]').forEach((el) => {
      el.addEventListener('click', () => this.openModal(true));
    });
    // Deep link: /match/#start opens the quiz straight away (links from
    // guides / the no-JS homepage fallback land one click closer)
    if (window.location.hash === '#start') {
      try { history.replaceState(history.state, '', window.location.pathname + window.location.search); } catch (e) { /* no-op */ }
      setTimeout(() => this.openModal(), 250);
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
      trackMatchEvent('match_started', { totalReaders: this.readerCount });
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

  private steps(): QuizQuestion[] {
    return buildQuizSteps(this.answers);
  }

  private stepContentHTML(question: QuizQuestion): string {
    const selectedValue = this.answers[question.field];
    const reflection = question.reflection ? `
      <div class="ea-match-reflection">
        <span class="ea-match-reflection-label">What we’re hearing</span>
        <p>${question.reflection}</p>
      </div>
    ` : '';

    let body: string;
    if (question.kind === 'cards') {
      body = this.cardsHTML(question);
    } else {
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
      body = `<div class="ea-match-options">${options}</div>${multiFooter}`;
    }

    return `
      ${reflection}
      <span class="ea-match-eyebrow">${question.eyebrow}</span>
      <h2 class="ea-match-title">${question.title}</h2>
      ${question.subtitle ? `<p class="ea-match-subtitle">${question.subtitle}</p>` : ''}
      ${body}
    `;
  }

  /* Three face-down cards. Which card sits under which slot rotates per
     quiz (cardSeed); every card in an area's deck is on-theme, so any
     pick gives a meaningful reading. */
  private cardSlots(question: QuizQuestion): string[] {
    const deck = question.options.map(o => o.value as string);
    return deck.map((_, i) => deck[(i + this.cardSeed) % deck.length]);
  }

  private cardsHTML(question: QuizQuestion): string {
    const picked = this.answers.card;
    const slots = this.cardSlots(question);
    const cards = slots.map((id, i) => {
      const face = CARD_FACES[id];
      const state = picked ? (picked === id ? 'is-flipped' : 'is-dimmed') : '';
      return `
        <button type="button" class="ea-tarot-card ${state}" data-card="${id}" aria-label="Card ${i + 1}" ${picked ? 'disabled' : ''}>
          <span class="ea-tarot-inner">
            <span class="ea-tarot-face ea-tarot-back" aria-hidden="true"><span>✦</span></span>
            <span class="ea-tarot-face ea-tarot-front">
              <span class="ea-tarot-numeral">${face?.numeral || ''}</span>
              <span class="ea-tarot-name">${face?.name || ''}</span>
            </span>
          </span>
        </button>
      `;
    }).join('');
    return `
      <div class="ea-tarot-spread">${cards}</div>
      <div class="ea-tarot-reveal" data-card-reveal>${picked ? this.cardRevealHTML(picked) : ''}</div>
    `;
  }

  private cardRevealHTML(id: string): string {
    const card = cardFor(this.answers.area, id);
    if (!card) return '';
    return `
      <p class="ea-tarot-reveal-kw">${card.keyword}</p>
      <h3 class="ea-tarot-reveal-name">${card.name}</h3>
      <p class="ea-tarot-reveal-msg">${card.message}</p>
      <button type="button" class="ea-match-primary-btn" data-card-continue>Continue →</button>
    `;
  }

  private progressHeaderHTML(): string {
    const total = this.steps().length;
    const current = this.currentStepIndex + 1;
    const progressPercent = Math.round((current / total) * 100);
    return `
      <div class="ea-match-progress-meta">
        <span>Step ${current} of ${total}</span>
        ${this.currentStepIndex > 0 ? `
          <button type="button" class="ea-match-back-btn" data-back-btn>← Back</button>
        ` : '<span></span>'}
      </div>
      <div class="ea-match-progress-track">
        <div class="ea-match-progress-fill" style="width: ${progressPercent}%;"></div>
      </div>
    `;
  }

  /* Changing the area switches branch: everything answered inside the old
     branch is dropped so the reading never mixes two situations. */
  private setAnswer(field: keyof UserAnswers, value: unknown) {
    if (field === 'area' && this.answers.area !== value) {
      AREA_DEPENDENT_FIELDS.forEach(f => { delete (this.answers as any)[f]; });
      this.cardSeed = Math.floor(Math.random() * 3);
    }
    (this.answers as any)[field] = value;
  }

  private goBack() {
    if (this.currentStepIndex <= 0 || this.stepLock) return;
    this.currentStepIndex--;
    if (this.modalMode) {
      this.renderModalProgress();
      this.showModalStep(this.currentStepIndex, 'back');
    } else {
      this.render();
    }
  }

  private bindStepEvents(scope: HTMLElement, question: QuizQuestion) {
    const backBtn = scope.querySelector('[data-back-btn]');
    if (backBtn) backBtn.addEventListener('click', () => this.goBack());

    if (question.kind === 'cards') {
      const reveal = scope.querySelector('[data-card-reveal]') as HTMLElement | null;
      const bindContinue = () => {
        const btn = scope.querySelector('[data-card-continue]');
        if (btn) btn.addEventListener('click', () => this.advanceStep(question));
      };
      bindContinue();
      const cards = Array.from(scope.querySelectorAll('.ea-tarot-card')) as HTMLButtonElement[];
      cards.forEach(card => {
        card.addEventListener('click', () => {
          if (this.answers.card) return;
          const id = card.getAttribute('data-card')!;
          this.setAnswer('card', id);
          if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) { /* no-op */ } }
          card.classList.add('is-flipped');
          cards.forEach(c => {
            c.disabled = true;
            if (c !== card) c.classList.add('is-dimmed');
          });
          // let the flip land before the meaning fades in
          setTimeout(() => {
            if (reveal) {
              reveal.innerHTML = this.cardRevealHTML(id);
              bindContinue();
            }
          }, 650);
        });
      });
      return;
    }

    const optionButtons = scope.querySelectorAll('.ea-match-option-btn');

    if (question.isMultiSelect) {
      const current = this.answers[question.field];
      const currentArr: string[] = Array.isArray(current) ? [...(current as string[])] : [];
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

          this.setAnswer(question.field, [...currentArr]);
          if (hint) hint.textContent = `Selected ${currentArr.length} of ${maxSelect}`;
          if (continueBtn) continueBtn.disabled = currentArr.length === 0;
        });
      });

      if (continueBtn) {
        continueBtn.addEventListener('click', () => this.advanceStep(question));
      }
    } else {
      optionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          if (this.stepLock) return;
          this.stepLock = true;
          const val = btn.getAttribute('data-value')!;
          this.setAnswer(question.field, val);

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
            this.advanceStep(question);
          }, 380);
        });
      });
    }
  }

  private advanceStep(question: QuizQuestion) {
    trackMatchEvent('match_step_completed', {
      step: this.currentStepIndex + 1,
      questionId: question.id,
      answer: (this.answers as any)[question.field],
    });

    if (this.currentStepIndex < this.steps().length - 1) {
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
      this.renderQuestion(this.steps()[this.currentStepIndex]);
    }
  }

  private renderQuestion(question: QuizQuestion) {
    this.container.innerHTML = `
      <div class="ea-match-card">
        <div class="ea-match-header">${this.progressHeaderHTML()}</div>
        <div class="ea-match-question-view">${this.stepContentHTML(question)}</div>
      </div>
    `;
    this.bindStepEvents(this.container, question);
  }

  /* ================================================================
     Modal step flow (directional animations). Steps are rebuilt on every
     visit because their content depends on earlier answers (branching,
     the mid-quiz reflection); the previous step element stays in the DOM
     only as a hidden sibling.
     ================================================================ */

  private renderModalProgress() {
    const slot = this.overlay?.querySelector('#ea-modal-progress') as HTMLElement | null;
    if (!slot) return;
    slot.innerHTML = this.progressHeaderHTML();
    const backBtn = slot.querySelector('[data-back-btn]');
    if (backBtn) backBtn.addEventListener('click', () => this.goBack());
  }

  private showModalStep(idx: number, dir: 'forward' | 'back') {
    if (!this.modalBody) return;
    const question = this.steps()[idx];

    this.modalBody.querySelectorAll(`[data-step="${idx}"]`).forEach(el => el.remove());
    const stepEl = document.createElement('div');
    stepEl.className = 'ea-match-step';
    stepEl.setAttribute('data-step', String(idx));
    stepEl.innerHTML = `
      <div class="ea-match-question-view">
        ${this.stepContentHTML(question)}
      </div>
    `;
    this.modalBody.appendChild(stepEl);
    this.bindStepEvents(stepEl, question);

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

  /* The "labor illusion" works best when each stage visibly uses what the
     user told us, so the wait itself becomes a moment of being heard. */
  private computingStages(): { text: string; percent: string; delay: number }[] {
    const a = this.answers;
    const sit = findSituation(a.area, a.symptom);
    const isGrief = a.area === 'grief';
    const dur = (isGrief ? GRIEF_DURATIONS : DURATIONS).find(d => d.id === a.duration);
    const first = isGrief
      ? `Sitting with what you’ve shared about ${sit?.short || 'them'}…`
      : `Reading what ${dur ? `${dur.short} of ` : ''}${sit?.short || 'this'} usually means…`;
    const topic = areaTopic(finalizeAnswers(a));
    return [
      { text: first, percent: '30%', delay: 0 },
      { text: 'Finding the question underneath your question…', percent: '55%', delay: 1100 },
      { text: `Screening ${this.readerCount} advisors for ${topic}…`, percent: '80%', delay: 2200 },
      { text: 'Writing your reading…', percent: '100%', delay: 3100 },
    ];
  }

  private startComputing() {
    this.isComputing = true;
    this.phase = 'calculating';
    this.setCardPhase('calculating');
    this.render();

    this.computingStages().forEach(s => {
      this.calcTimers.push(window.setTimeout(() => {
        const scope = this.modalMode ? this.modalBody : this.container;
        const statusEl = scope?.querySelector('#ea-status-text');
        const barEl = scope?.querySelector('#ea-status-bar') as HTMLElement | null;
        if (statusEl) statusEl.textContent = s.text;
        if (barEl) barEl.style.width = s.percent;
      }, s.delay));
    });

    this.calcTimers.push(window.setTimeout(async () => {
      // The catalogue is fetched on demand; by now (>=3.8s after the last
      // answer) it is long since loaded, but never score against an empty list.
      try {
        await this.ensureReaders();
      } catch {
        this.showCatalogueError();
        return;
      }
      if (this.phase !== 'calculating') return; // cancelled / restarted meanwhile
      this.calcTimers = [];
      this.isComputing = false;
      this.phase = 'done';
      this.setCardPhase('result');
      const answers = finalizeAnswers(this.answers);
      this.result = runMatchEngine(this.readers, answers);
      trackMatchEvent('match_completed', {
        intent: answers.intent,
        area: answers.area,
        symptom: answers.symptom,
        feeling: answers.feeling,
        hope: answers.hope,
        topReader: this.result.topMatches[0]?.reader?.id,
      });
      this.render();
    }, 3800));
  }

  /* Network failure while fetching the advisor catalogue: say so plainly and
     offer the manual route instead of hanging on the progress screen. */
  private showCatalogueError() {
    this.calcTimers = [];
    this.isComputing = false;
    this.phase = 'running';
    const target = this.modalMode ? this.modalBody : this.container;
    if (!target) return;
    target.innerHTML = `
      <div class="ea-match-card" style="text-align:center">
        <h3 class="ea-computing-status">We couldn’t load the advisor list</h3>
        <p class="ea-computing-sub">Check your connection and reload the page, or browse the platform reviews directly.</p>
        <p><a class="btn btn--primary btn--sm" href="/reviews/kasamba/">Kasamba review</a>
        <a class="btn btn--secondary btn--sm" href="/reviews/purple-garden/">Purple Garden review</a>
        <a class="btn btn--secondary btn--sm" href="/reviews/keen/">Keen review</a></p>
      </div>`;
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
          <h3 class="ea-computing-status" id="ea-status-text">${this.computingStages()[0].text}</h3>
          <p class="ea-computing-sub">${this.readerCount} advisors · Runs privately in your browser</p>
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
    const { diagnosis: d, topMatches, totalEligibleReaders, answers } = this.result;
    const topic = areaTopic(answers);
    const areaGuide = answers.area ? AREA_BY_ID[answers.area]?.guide : undefined;
    const isGrief = answers.area === 'grief';
    const openingTip = isGrief
      ? 'Give their first name and nothing more. Let the reader bring the details: specific, recognizable ones are the mark of a genuine medium.'
      : d.recommendedOpeningQuestion.includes('[Name]')
        ? 'Swap in their first name, then hold back the backstory. A good reader will pick up the rest, and you’ll know within the free minutes.'
        : 'Ask it word for word in your free minutes and hold back the details. A good reader will pick up the rest.';

    return `
      <div class="ea-match-results-view">
        <!-- Header -->
        <div class="ea-match-results-header">
          <span class="ea-results-eyebrow">Your reading</span>
          <h2 class="ea-results-title">${d.coreDynamicTitle}</h2>
          <p class="ea-results-meta">Built from your answers · matched across <strong>${totalEligibleReaders} advisors</strong></p>
        </div>

        <!-- 1. The reading -->
        <div class="ea-diagnosis-card">
          <p class="ea-reading-mirror">${d.situationSummary}</p>
          ${d.feelingReflection ? `<p class="ea-reading-mirror">${d.feelingReflection}</p>` : ''}

          ${d.hiddenQuestion ? `
            <div class="ea-reading-hidden">
              <span class="ea-reading-label">The question underneath</span>
              <p class="ea-reading-hidden-q">“${d.hiddenQuestion}”</p>
              <p class="ea-reading-hidden-note">That’s the one worth bringing to a reading, not the polite version.</p>
            </div>
          ` : ''}

          ${d.card ? `
            <div class="ea-reading-card">
              <div class="ea-reading-card-art" aria-hidden="true">
                <span class="ea-tarot-numeral">${d.card.numeral}</span>
                <span class="ea-reading-card-star">✦</span>
              </div>
              <div class="ea-reading-card-body">
                <span class="ea-reading-label">Your card · ${d.card.keyword}</span>
                <h3 class="ea-reading-card-name">${d.card.name}</h3>
                <p>${d.card.message}</p>
              </div>
            </div>
          ` : ''}

          <div class="ea-diagnosis-mechanism">
            <strong>What’s often going on:</strong> ${d.underlyingMechanism}
          </div>

          <div class="ea-diagnosis-grid">
            <div>
              <div class="ea-diagnosis-col-title is-clear">
                <span>✓</span> What you already know
              </div>
              <ul class="ea-diagnosis-list is-clear">
                ${d.whatIsClear.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
            <div>
              <div class="ea-diagnosis-col-title is-unresolved">
                <span>•</span> What a good reading can help with
              </div>
              <ul class="ea-diagnosis-list is-unresolved">
                ${d.whatIsUnresolved.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          </div>

          ${(d.careNotes || []).map(n => `
            <div class="ea-care-note"><span aria-hidden="true">♡</span><p>${n}</p></div>
          `).join('')}

          <!-- Opening question + follow-up -->
          <div class="ea-opening-question-box">
            <div class="ea-opening-header">
              <span class="ea-opening-label">Your opening question</span>
              <button type="button" class="ea-copy-question-btn" data-copy-btn>
                Copy
              </button>
            </div>
            <div class="ea-opening-text" data-opening-text>“${d.recommendedOpeningQuestion}”</div>
            ${d.recommendedFollowUp ? `
              <div class="ea-opening-follow">
                <span class="ea-opening-follow-label">Then ask:</span>
                <span data-follow-text>“${d.recommendedFollowUp}”</span>
              </div>
            ` : ''}
            <p class="ea-opening-tip">${openingTip}</p>
          </div>

          <!-- Scam Notice -->
          <div class="ea-scam-notice">
            <span>🛡️</span>
            <span><strong>One honest rule:</strong> ${d.scamWarning}</span>
          </div>
        </div>

        <!-- 2. Matched Readers Section -->
        <div class="ea-matched-readers-section">
          <h3 class="ea-section-label">Three readers for this</h3>
          <p class="ea-section-sublabel">
            Ranked for ${topic}, the style you asked for and your format. Readers can’t pay to rank.
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
                      ${m.matchPercentage}% fit
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
                    <span><strong>New-client offer:</strong> ${r.freeOffer || platformMeta.promoTag}</span>
                    <span class="ea-offer-price">${r.pricing}</span>
                  </div>

                  <!-- Why Matched -->
                  <div class="ea-why-matched-block">
                    <div class="ea-why-label">Why ${r.name} fits your situation:</div>
                    <ul class="ea-why-list">
                      ${m.whyMatched.map(bullet => `<li>${bullet}</li>`).join('')}
                    </ul>
                  </div>

                  <!-- Suited For & Skip Caveat -->
                  <div class="ea-suited-skip-grid">
                    <div class="ea-suited-row">
                      <strong>Best for:</strong> ${m.bestSuitedFor}
                    </div>
                    <div class="ea-skip-row">
                      <strong>When to skip:</strong> ${m.whenToSkip}
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
                      Read our review
                    </a>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Suggested Guides -->
        <div class="ea-matched-guides-section">
          <div class="ea-guides-header">Before your reading</div>
          <div class="ea-guides-list">
            ${areaGuide ? `
              <a href="${areaGuide.href}" class="ea-guide-chip">
                <span>📚</span> ${areaGuide.label}
              </a>
            ` : ''}
            <a href="/guides/questions-to-ask-a-psychic/" class="ea-guide-chip">
              <span>📖</span> Questions to Ask a Psychic: The 3-Minute Protocol
            </a>
            <a href="/guides/how-to-spot-fake-psychic/" class="ea-guide-chip">
              <span>🛡️</span> How to Spot a Fake Psychic
            </a>
          </div>
        </div>

        <!-- Debug Inspector Panel -->
        ${this.debugMode ? this.renderDebugPanel() : ''}

        <!-- Footer Retake -->
        <div class="ea-match-results-footer">
          <button type="button" class="ea-retake-btn" data-retake-btn>
            ↻ Start over with a different question
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
    const followText = scope.querySelector('[data-follow-text]');
    if (copyBtn && questionText) {
      copyBtn.addEventListener('click', () => {
        const text = [questionText.textContent?.trim(), followText?.textContent?.trim()].filter(Boolean).join('\n');
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = 'Copied ✓';
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
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
    this.cardSeed = Math.floor(Math.random() * 3);
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

  const root = document.getElementById(containerId);
  if (!root) return;

  // Legacy: pages built before 2026-10-02 inline the catalogue as JSON. Honour
  // it if present so a cached page keeps working; otherwise the app fetches
  // data-readers-src on demand (see MatchQuizApp.ensureReaders).
  let inline: ReaderProfile[] = [];
  const dataScript = document.getElementById('ea-readers-data');
  if (dataScript) {
    try {
      inline = JSON.parse(dataScript.textContent || '[]');
    } catch (err) {
      console.error('[MatchApp] Failed to parse reader catalog:', err);
    }
  }
  if (!inline.length && !root.getAttribute('data-readers-src')) {
    console.warn('[MatchApp] No reader catalogue source found.');
    return;
  }
  new MatchQuizApp(containerId, inline);
}
