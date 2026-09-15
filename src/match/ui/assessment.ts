/**
 * ui/assessment.ts — 逐屏单题（规格 §3 / §26）
 *
 * 关键实现点（旧版全部缺失）：
 *   · 多选题（q3 / q4）此前根本没有渲染分支 —— 到第 3 题就没选项、按钮永远灰
 *   · 动态分支题的选项池此前传错参数，q2 / q6 渲染出 0 个选项
 *   · 切屏后不滚动、不移动焦点、不播报，键盘用户完全无法使用
 *   · 浏览器后退键无法在题目间回退
 */

import type { MatchActions, ScreenState } from './actions';
import { h, announce, pct } from './dom';
import { QUIZ_QUESTIONS, optionsFor } from '../engine/questions';
import type { QuizOption, QuizQuestion } from '../types';

const AUTO_ADVANCE_MS = 260;

export function renderAssessment(state: ScreenState, act: MatchActions): HTMLElement {
  const q = QUIZ_QUESTIONS[state.questionIndex];
  if (!q) return h('section', { class: 'm-screen' });

  const options = optionsFor(q, state.answers);
  const picked = state.answers[q.id];
  const pickedIds = Array.isArray(picked) ? picked : picked ? [picked as string] : [];
  const isLast = state.questionIndex === QUIZ_QUESTIONS.length - 1;

  const section = h('section', { class: 'm-screen m-screen--quiz' });
  const inner = h('div', { class: 'm-quiz' });

  /* ── 进度 ── */
  const prog = h('div', {
    class: 'm-progress',
    role: 'progressbar',
    'aria-valuemin': '1',
    'aria-valuemax': String(QUIZ_QUESTIONS.length),
    'aria-valuenow': String(state.questionIndex + 1),
    'aria-label': `Question ${state.questionIndex + 1} of ${QUIZ_QUESTIONS.length}`,
  });
  const track = h('div', { class: 'm-progress__track' });
  QUIZ_QUESTIONS.forEach((_, i) => {
    track.appendChild(h('span', {
      class: `m-progress__seg${i < state.questionIndex ? ' is-done' : ''}${i === state.questionIndex ? ' is-current' : ''}`,
    }));
  });
  prog.appendChild(track);
  prog.appendChild(h('div', { class: 'm-progress__meta' },
    h('span', { class: 'm-progress__count', text: `Question ${state.questionIndex + 1} of ${QUIZ_QUESTIONS.length}` }),
    h('span', { class: 'm-progress__label', text: q.shortLabel }),
  ));
  inner.appendChild(prog);

  /* ── 题面 ── */
  const heading = h('h2', { class: 'm-q', id: 'm-screen-title', text: q.text });
  inner.appendChild(heading);
  if (q.subtext) inner.appendChild(h('p', { class: 'm-q__sub', text: q.subtext }));

  /* ── 选项区 ── */
  if (q.type === 'single' || q.type === 'multi') {
    inner.appendChild(buildOptions(q, options, pickedIds, act, state, isLast));
  } else {
    inner.appendChild(buildFreeText(q, pickedIds[0] ?? '', act));
  }

  /* ── 底部导航 ── */
  inner.appendChild(buildNav(state, q, pickedIds, act, isLast));

  section.appendChild(inner);

  // 切屏后把焦点交给题面，并播报进度
  window.requestAnimationFrame(() => {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    announce(`Question ${state.questionIndex + 1} of ${QUIZ_QUESTIONS.length}. ${q.text}`);
  });

  return section;
}

/* ── 选项 ──────────────────────────────────────────────────────────── */

function buildOptions(
  q: QuizQuestion,
  options: QuizOption[],
  pickedIds: string[],
  act: MatchActions,
  state: ScreenState,
  isLast: boolean,
): HTMLElement {
  const isMulti = q.type === 'multi';
  const max = q.maxSelect ?? (isMulti ? 3 : 1);
  const atMax = isMulti && pickedIds.length >= max;

  const wrap = h('div', {
    class: `m-options${isMulti ? ' m-options--multi' : ''}`,
    role: isMulti ? 'group' : 'radiogroup',
    'aria-labelledby': 'm-screen-title',
    'aria-describedby': isMulti ? 'm-multi-hint' : null,
  });

  if (isMulti) {
    wrap.appendChild(h('p', {
      class: 'm-hint',
      id: 'm-multi-hint',
      text: `Choose up to ${max}. ${pickedIds.length} selected.`,
    }));
  }

  options.forEach((opt, i) => {
    const selected = pickedIds.includes(opt.id);
    const blocked = atMax && !selected;

    const btn = h('button', {
      class: `m-option${selected ? ' is-selected' : ''}${blocked ? ' is-blocked' : ''}`,
      type: 'button',
      role: isMulti ? 'checkbox' : 'radio',
      'aria-checked': String(selected),
      'aria-disabled': String(blocked),
      'data-option': opt.id,
      on: {
        click: () => {
          if (blocked) {
            announce(`You can choose up to ${max}. Deselect one first.`);
            return;
          }
          act.selectOption(q.id, opt.id);
          // 单选即时前进：这是完成率最高的交互（Typeform 模式）。
          // 多选题必须显式确认，否则「最多选 2」无法表达完选意图。
          if (!isMulti && !isLast) {
            window.setTimeout(() => act.next(), AUTO_ADVANCE_MS);
          }
        },
      },
    });

    btn.appendChild(h('span', { class: 'm-option__key', 'aria-hidden': 'true', text: String((i + 1) % 10) }));
    btn.appendChild(h('span', { class: 'm-option__label', text: opt.label }));
    btn.appendChild(h('span', { class: 'm-option__mark', 'aria-hidden': 'true' }));
    wrap.appendChild(btn);
  });

  if (options.length === 0) {
    // 理论上不该发生。真发生了要留下可诊断的痕迹，而不是给用户一个死屏。
    wrap.appendChild(h('p', {
      class: 'm-hint m-hint--warn',
      text: 'These options didn’t load correctly. Please go back and try the previous question again.',
    }));
  }

  /* 键盘：数字选择 / 上下移动 */
  wrap.addEventListener('keydown', (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const all = Array.from(wrap.querySelectorAll<HTMLButtonElement>('.m-option'));
    const idx = all.indexOf(target as HTMLButtonElement);

    if (/^[1-9]$/.test(e.key)) {
      const n = parseInt(e.key, 10) - 1;
      const btn = all[n];
      if (btn && !btn.classList.contains('is-blocked')) { e.preventDefault(); btn.click(); }
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      all[(idx + 1) % all.length]?.focus();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      all[(idx - 1 + all.length) % all.length]?.focus();
    }
  });

  return wrap;
}

/* ── 自由文本 ──────────────────────────────────────────────────────── */

function buildFreeText(q: QuizQuestion, value: string, act: MatchActions): HTMLElement {
  const wrap = h('div', { class: 'm-freetext' });

  const area = h('textarea', {
    class: 'm-textarea',
    id: 'm-freetext',
    rows: '4',
    maxlength: '600',
    placeholder: q.placeholder ?? 'Type it the way you would say it…',
    'aria-labelledby': 'm-screen-title',
    // 移动端键盘行为：句首自动大写、以句子为整段、回车键显示「完成」。
    // 不这样写的话 iOS 会把它当成通用文本域，键盘上是灰色的「return」，
    // 用户只能手动收起键盘才能碰到「Continue」。
    autocapitalize: 'sentences',
    autocorrect: 'on',
    spellcheck: 'true',
    enterkeyhint: 'done',
    on: {
      input: (e: Event) => {
        const v = (e.target as HTMLTextAreaElement).value;
        act.setFreeText(v);
        counter.textContent = `${v.length}/600`;
        const btn = document.getElementById('m-next') as HTMLButtonElement | null;
        if (btn) btn.disabled = false;
      },
      keydown: (e: KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); act.next(); }
      },
    },
  });
  area.value = value;

  const counter = h('span', { class: 'm-freetext__count', text: `${value.length}/600` });

  wrap.appendChild(area);
  wrap.appendChild(h('div', { class: 'm-freetext__foot' },
    counter,
    h('span', { class: 'm-freetext__note', text: 'Optional — but it makes the reading noticeably more specific.' }),
  ));

  // label 关联（textarea 用 aria-labelledby 指向题面即可，这里补一层显式 label）
  wrap.insertBefore(h('label', { class: 'm-visually-hidden', for: 'm-freetext', text: q.text }), area);

  return wrap;
}

/* ── 导航 ──────────────────────────────────────────────────────────── */

function buildNav(
  state: ScreenState,
  q: QuizQuestion,
  pickedIds: string[],
  act: MatchActions,
  isLast: boolean,
): HTMLElement {
  const nav = h('div', { class: 'm-nav' });

  /* 左：后退 */
  if (state.questionIndex > 0) {
    nav.appendChild(h('button', {
      class: 'm-btn m-btn--text m-btn--back',
      type: 'button',
      on: { click: () => act.back() },
      text: '← Back',
    }));
  } else {
    nav.appendChild(h('span'));
  }

  /* 右：继续 / 完成 */
  const right = h('div', { class: 'm-nav__right' });

  if (q.type === 'freetext') {
    right.appendChild(h('button', {
      class: 'm-btn m-btn--text',
      type: 'button',
      on: { click: () => act.skipFreeText() },
      text: 'Skip',
    }));
  }

  // 单选非末题是自动前进，不需要按钮；但保留一个可见按钮有两点好处：
  // 键盘用户有明确落点，且自动前进因故未触发时有兜底路径。
  const needsButton = q.type !== 'single' || isLast;
  if (needsButton) {
    const disabled = q.type === 'freetext' ? false : pickedIds.length === 0;
    right.appendChild(h('button', {
      class: 'm-btn m-btn--primary',
      type: 'button',
      id: 'm-next',
      disabled,
      on: { click: () => act.next() },
      text: isLast ? 'See my reading' : 'Continue',
    }));
  } else {
    // 单选：给一个可点区域仍是必要的兜底，但视觉上退到次级
    right.appendChild(h('button', {
      class: 'm-btn m-btn--ghost',
      type: 'button',
      id: 'm-next',
      disabled: pickedIds.length === 0,
      on: { click: () => act.next() },
      text: 'Continue',
    }));
  }

  nav.appendChild(right);
  nav.appendChild(h('span', { class: 'm-visually-hidden', text: pct(((state.questionIndex + 1) / QUIZ_QUESTIONS.length) * 100) }));
  return nav;
}
