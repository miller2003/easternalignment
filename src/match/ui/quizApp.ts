/**
 * src/match/ui/quizApp.ts
 * Apple-grade client-side controller for the Eastern Alignment Reader Match System.
 */

import type { ReaderProfile, UserAnswers, MatchEngineResult, QuizQuestion } from '../types';
import { QUIZ_QUESTIONS, PLATFORM_BADGES } from '../taxonomy';
import { runMatchEngine } from '../engine/recommend';
import { trackMatchEvent } from '../analytics';

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

  constructor(containerId: string, readers: ReaderProfile[]) {
    const el = document.getElementById(containerId);
    if (!el) {
      console.warn(`[MatchQuizApp] Target container #${containerId} not found.`);
      return;
    }
    this.container = el;
    this.readers = readers;
    this.debugMode = window.location.search.includes('debug=true') || window.location.hash.includes('debug');

    trackMatchEvent('match_started', { totalReaders: readers.length });
    this.render();
  }

  private render() {
    if (this.result) {
      this.renderResults();
    } else if (this.isComputing) {
      this.renderComputing();
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
        <!-- Progress Header -->
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

        <!-- Question View -->
        <div class="ea-match-question-view" key="step-${current}">
          <span class="ea-match-eyebrow">${question.eyebrow}</span>
          <h2 class="ea-match-title">${question.title}</h2>
          ${question.subtitle ? `<p class="ea-match-subtitle">${question.subtitle}</p>` : ''}

          <!-- Options -->
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

          <!-- Multi-select Footer -->
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
    // Back button
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
      // Multi-select flow
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
              // Replace earliest
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
      // Single-choice auto-advance
      optionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.getAttribute('data-value')!;
          (this.answers as any)[question.id] = val;

          // Highlight selected
          optionButtons.forEach(b => b.classList.remove('is-selected'));
          btn.classList.add('is-selected');

          // Tactile beat before smooth advance
          setTimeout(() => {
            this.advanceStep(question.id);
          }, 280);
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

  private startComputing() {
    this.isComputing = true;
    this.render();

    const statusEl = this.container.querySelector('#ea-status-text');
    const barEl = this.container.querySelector('#ea-status-bar') as HTMLElement;

    const stages = [
      { text: 'Deconstructing situational tension & observation dynamics…', percent: '28%', delay: 0 },
      { text: 'Screening 240+ advisor track records across Kasamba, Purple Garden, & Keen…', percent: '56%', delay: 900 },
      { text: 'Filtering communication format, verified reviews & budget fit…', percent: '82%', delay: 1800 },
      { text: 'Synthesizing your situation diagnosis & precision reader matches…', percent: '100%', delay: 2700 },
    ];

    stages.forEach(s => {
      setTimeout(() => {
        if (statusEl) statusEl.textContent = s.text;
        if (barEl) barEl.style.width = s.percent;
      }, s.delay);
    });

    // Complete computing at 3.5 seconds
    setTimeout(() => {
      this.isComputing = false;
      this.result = runMatchEngine(this.readers, this.answers as UserAnswers);
      trackMatchEvent('match_completed', {
        intent: this.answers.intent,
        topReader: this.result.topMatches[0]?.reader?.id,
      });
      this.render();
    }, 3400);
  }

  private renderComputing() {
    this.container.innerHTML = `
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

  private renderResults() {
    if (!this.result) return;
    const { diagnosis, topMatches, totalEligibleReaders } = this.result;

    this.container.innerHTML = `
      <div class="ea-match-card">
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
                <button type="button" class="ea-copy-question-btn" id="ea-copy-btn">
                  Copy Question
                </button>
              </div>
              <div class="ea-opening-text" id="ea-opening-text">
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
            <button type="button" class="ea-retake-btn" id="ea-retake-btn">
              ↻ Adjust My Answers / Retake Match
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindResultEvents();
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
    // Copy question
    const copyBtn = this.container.querySelector('#ea-copy-btn');
    const questionText = this.container.querySelector('#ea-opening-text');
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

    // Retake
    const retakeBtn = this.container.querySelector('#ea-retake-btn');
    if (retakeBtn) {
      retakeBtn.addEventListener('click', () => {
        this.currentStepIndex = 0;
        this.result = null;
        this.isComputing = false;
        this.render();
      });
    }

    // Track clicks on advisor recommendations
    const affiliateLinks = this.container.querySelectorAll('.ea-cta-primary');
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
