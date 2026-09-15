/**
 * ui/landing.ts — 首屏与计算过渡屏
 *
 * 规格 §2：标题、支撑文案、主 CTA 固定；次入口是「我只想直接问一个问题」。
 * 规格 §26：不要廉价星座风、不要赌场式游戏化、不要假科学感。
 *
 * 这里额外加了两样东西，都是为了转化率：
 *   1. 「你以为会发生的 3 步」—— 降低未知感，直接抬高开始率
 *   2. 「继续上次的阅读」—— 老访客不被从头再来一遍，直接回到结果页
 */

import type { MatchActions, ScreenState } from './actions';
import { h } from './dom';
import { DOMAIN_NOUN } from '../content/labels';

export function renderLanding(state: ScreenState, act: MatchActions): HTMLElement {
  const section = h('section', { class: 'm-screen m-screen--landing' });

  const inner = h('div', { class: 'm-landing' });

  inner.appendChild(h('p', { class: 'm-badge', text: 'Spiritual theme finder' }));

  const h1 = h('h1', {
    class: 'm-h1',
    id: 'm-screen-title',
    text: 'What’s really going on in your life right now?',
  });
  inner.appendChild(h1);

  inner.appendChild(h('p', {
    class: 'm-lede',
    text: 'Answer a few quick questions and we’ll suggest what your current spiritual theme may be asking you to explore — plus the guides and readers that fit it.',
  }));

  /* 老访客：继续上次 */
  if (state.restoredProfile && state.restoredTheme) {
    const topic = DOMAIN_NOUN[state.restoredProfile.primary_domain];
    const resume = h('div', { class: 'm-resume' },
      h('div', { class: 'm-resume__body' },
        h('p', { class: 'm-resume__label', text: 'You were exploring' }),
        h('p', { class: 'm-resume__theme', text: state.restoredTheme }),
        h('p', { class: 'm-resume__meta', text: `Theme: ${topic}` }),
      ),
      h('button', {
        class: 'm-btn m-btn--ghost',
        type: 'button',
        on: { click: () => act.resumePrevious() },
        text: 'Continue reading →',
      }),
    );
    inner.appendChild(resume);
  }

  inner.appendChild(h('div', { class: 'm-cta-group' },
    h('button', {
      class: 'm-btn m-btn--primary m-btn--lg',
      type: 'button',
      id: 'm-start',
      on: { click: () => act.startQuiz('hero_cta') },
      text: 'Find my spiritual theme',
    }),
    h('button', {
      class: 'm-btn m-btn--text',
      type: 'button',
      on: { click: () => act.goToAsk() },
      text: 'I just want to ask a question',
    }),
  ));

  /* 三步预期 */
  const steps = h('ol', { class: 'm-steps' });
  [
    ['7 questions', 'One per screen. About two minutes.'],
    ['A written reading', 'A theme, a reflection and a question worth sitting with.'],
    ['What fits it', 'Guides and readers matched to your answers — only if you want them.'],
  ].forEach(([title, body], i) => {
    steps.appendChild(h('li', { class: 'm-steps__item' },
      h('span', { class: 'm-steps__n', text: String(i + 1) }),
      h('span', { class: 'm-steps__text' },
        h('strong', { text: title }),
        h('span', { text: ` ${body}` }),
      ),
    ));
  });
  inner.appendChild(steps);

  /* 第三入口：每日牌 */
  inner.appendChild(h('p', { class: 'm-alt-entry' },
    h('span', { text: 'Not ready for the full thing? ' }),
    h('button', {
      class: 'm-link',
      type: 'button',
      on: { click: () => act.goToCard('landing_secondary') },
      text: 'Draw today’s card',
    }),
    h('span', { text: ' — one card, one question, no sign-up.' }),
  ));

  inner.appendChild(h('p', {
    class: 'm-fineprint',
    text: 'Your answers are scored in your browser. Nothing you type is sent to a server, and there is no account to create.',
  }));

  section.appendChild(inner);
  return section;
}

/* ── 计算过渡屏 ────────────────────────────────────────────────────── */

const STAGES = [
  'Putting your answers together…',
  'Looking for the pattern underneath them…',
  'Writing your reading…',
];

export function renderComputing(): HTMLElement {
  const section = h('section', { class: 'm-screen m-screen--center' });
  const inner = h('div', { class: 'm-computing' });

  inner.appendChild(h('div', { class: 'm-orb', 'aria-hidden': 'true' }));

  const heading = h('h2', { class: 'm-computing__title', id: 'm-screen-title', text: STAGES[0] });
  inner.appendChild(heading);
  inner.appendChild(h('p', { class: 'm-computing__sub', text: 'This takes a second.' }));

  // 三段文案随真实等待按序替换；不做假的百分比进度条
  STAGES.forEach((text, i) => {
    if (i === 0) return;
    window.setTimeout(() => { heading.textContent = text; }, 420 * i);
  });

  section.appendChild(inner);
  return section;
}
