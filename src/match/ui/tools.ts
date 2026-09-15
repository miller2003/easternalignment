/**
 * ui/tools.ts — 两个免费工具：每日牌（规格 §15）与 Ask the Universe（规格 §16）
 *
 * 两个工具都能匿名使用：不填邮箱、不注册，也能拿到完整结果。
 * 这是「先给价值再要邮箱」的顺序，也是这两个工具存在的理由。
 */

import type { MatchActions, ScreenState } from './actions';
import { h, onceVisible } from './dom';
import { DOMAIN_LABEL, PLATFORM_NAME } from '../content/labels';
import { PLATFORM_OFFERS } from '../../lib/offers';
import type { ScoredArticle, ScoredReader, TarotCard } from '../types';

/* ══ 每日牌 ═════════════════════════════════════════════════════════ */

const SUIT_LABEL: Record<TarotCard['suit'], string> = {
  major: 'Major Arcana',
  wands: 'Wands',
  cups: 'Cups',
  swords: 'Swords',
  pentacles: 'Pentacles',
};

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];

function numeral(card: TarotCard): string {
  if (card.suit === 'major') return ROMAN[card.number] ?? String(card.number);
  return card.number <= 10 ? String(card.number) : '';
}

export function renderCard(state: ScreenState, act: MatchActions): HTMLElement {
  const section = h('section', { class: 'm-screen m-screen--card' });
  const inner = h('div', { class: 'm-cardwrap' });

  if (!state.activeCard) {
    // 兜底：控制器还没有算出牌
    inner.appendChild(h('button', {
      class: 'm-btn m-btn--primary',
      type: 'button',
      on: { click: () => act.drawCard() },
      text: 'Draw today’s card',
    }));
    section.appendChild(inner);
    return section;
  }

  const { card, interpretation, streak } = state.activeCard;

  inner.appendChild(h('p', { class: 'm-badge', text: 'Your card for today' }));

  /* 牌面 */
  const face = h('div', { class: 'm-card', role: 'img', 'aria-label': `${card.name}, ${SUIT_LABEL[card.suit]}` });
  face.appendChild(h('div', { class: 'm-card__frame' },
    h('span', { class: 'm-card__mark', 'aria-hidden': 'true', text: '✦' }),
    h('span', { class: 'm-card__name', text: card.name }),
    numeral(card) ? h('span', { class: 'm-card__num', text: numeral(card) }) : null,
    h('span', { class: 'm-card__suit', text: SUIT_LABEL[card.suit] }),
  ));
  inner.appendChild(face);

  const h1 = h('h1', { class: 'm-h1 m-h1--card', id: 'm-screen-title', text: card.name });
  inner.appendChild(h1);

  inner.appendChild(h('p', { class: 'm-p m-p--lead', text: interpretation.text }));

  if (interpretation.connection) {
    inner.appendChild(h('p', { class: 'm-p m-p--aside', text: interpretation.connection }));
  }

  inner.appendChild(h('blockquote', { class: 'm-quote' },
    h('p', { class: 'm-quote__label', text: 'Sit with this' }),
    h('p', { text: interpretation.reflection }),
  ));

  if (streak > 1) {
    inner.appendChild(h('p', { class: 'm-fineprint', text: `You’ve drawn a card ${streak} days in a row.` }));
  }

  /* 下一步 */
  const actions = h('div', { class: 'm-cardwrap__actions' });

  if (state.profile) {
    actions.appendChild(h('button', {
      class: 'm-btn m-btn--ghost',
      type: 'button',
      on: { click: () => act.backToResult() },
      text: 'Back to my reading',
    }));
  } else {
    actions.appendChild(h('p', {
      class: 'm-p',
      text: 'One card is a moment. The full reading looks at the pattern underneath it.',
    }));
    actions.appendChild(h('button', {
      class: 'm-btn m-btn--primary',
      type: 'button',
      on: { click: () => act.startQuiz('card_upsell') },
      text: 'Find my spiritual theme',
    }));
  }

  inner.appendChild(actions);
  inner.appendChild(h('p', {
    class: 'm-disclaimer',
    text: 'Cards here are a reflective prompt, not a prediction. Your card stays the same for the rest of today.',
  }));

  section.appendChild(inner);
  return section;
}

/* ══ Ask the Universe ═══════════════════════════════════════════════ */

const EXAMPLE_QUESTIONS = [
  'Should I reach out to him?',
  'Why do I keep thinking about this?',
  'Is this the right time to change jobs?',
];

export function renderAsk(state: ScreenState, act: MatchActions): HTMLElement {
  const section = h('section', { class: 'm-screen m-screen--ask' });
  const inner = h('div', { class: 'm-ask' });

  if (!state.askResult) {
    inner.appendChild(h('p', { class: 'm-badge', text: 'Ask the universe' }));

    // 危机语句：不解读、不建议抽牌、不建议找解读师，只给求助方向。
    // 这一支必须渲染在表单之前，否则用户会只看到表单莫名其妙重来一次。
    if (state.askCaution) {
      inner.appendChild(h('div', { class: 'm-caution m-caution--alert', role: 'alert' },
        h('p', { class: 'm-caution__text', text: state.askCaution }),
        h('button', {
          class: 'm-btn m-btn--ghost m-btn--sm',
          type: 'button',
          on: { click: () => act.goToAsk() },
          text: 'Start over',
        }),
      ));
      section.appendChild(inner);
      window.requestAnimationFrame(() => {
        const alert = section.querySelector<HTMLElement>('.m-caution--alert');
        if (alert) { alert.setAttribute('tabindex', '-1'); alert.focus({ preventScroll: true }); }
      });
      return section;
    }

    const h1 = h('h1', { class: 'm-h1', id: 'm-screen-title', text: 'What do you actually want to ask?' });
    inner.appendChild(h1);
    inner.appendChild(h('p', {
      class: 'm-lede',
      text: 'Write it the way you would say it out loud. You will get a reflective reading of the question — not a prediction, and not a yes or no.',
    }));

    const form = h('form', { class: 'm-ask__form' });
    const area = h('textarea', {
      class: 'm-textarea',
      id: 'm-ask-input',
      rows: '3',
      maxlength: '400',
      placeholder: 'Ask it plainly…',
      // 同 freetext：让 iOS 键盘给出「完成」，并在句首自动大写
      autocapitalize: 'sentences',
      autocorrect: 'on',
      spellcheck: 'true',
      enterkeyhint: 'done',
      on: {
        keydown: (e: KeyboardEvent) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
        },
      },
    });
    const submit = () => {
      const v = (area as HTMLTextAreaElement).value.trim();
      if (v.length < 4) { (area as HTMLTextAreaElement).focus(); return; }
      act.submitAsk(v);
    };
    form.appendChild(area);
    form.appendChild(h('button', {
      class: 'm-btn m-btn--primary',
      type: 'button',
      on: { click: submit },
      text: 'Read my question',
    }));
    form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    inner.appendChild(form);

    const examples = h('div', { class: 'm-ask__examples' },
      h('p', { class: 'm-ask__examples-label', text: 'Or try one of these:' }),
    );
    EXAMPLE_QUESTIONS.forEach((q) => {
      examples.appendChild(h('button', {
        class: 'm-chip',
        type: 'button',
        on: {
          click: () => {
            (area as HTMLTextAreaElement).value = q;
            submit();
          },
        },
        text: q,
      }));
    });
    inner.appendChild(examples);

    inner.appendChild(h('p', {
      class: 'm-fineprint',
      text: 'Nothing you type leaves your browser until you choose to save it.',
    }));

    section.appendChild(inner);
    window.requestAnimationFrame(() => {
      h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
    });
    return section;
  }

  /* ── 结果 ── */
  const r = state.askResult;
  inner.appendChild(h('p', { class: 'm-badge', text: 'Your question' }));
  const h1 = h('h1', { class: 'm-h1 m-h1--ask', id: 'm-screen-title', text: `“${r.question}”` });
  inner.appendChild(h1);

  inner.appendChild(h('p', {
    class: 'm-ask__classify',
    text: `We read this as sitting in ${DOMAIN_LABEL[r.classification.domain]} territory.`,
  }));

  const body = h('div', { class: 'm-block' });
  r.reflection.forEach((p) => body.appendChild(h('p', { class: 'm-p', text: p })));
  body.appendChild(h('blockquote', { class: 'm-quote' },
    h('p', { class: 'm-quote__label', text: 'A question to sit with' }),
    h('p', { text: r.question_to_sit_with }),
  ));

  if (state.askCaution) {
    body.appendChild(h('p', { class: 'm-caution', text: state.askCaution }));
  }
  inner.appendChild(body);

  if (r.articles.length) {
    const block = h('div', { class: 'm-block' });
    block.appendChild(h('h2', { class: 'm-h2', text: 'Worth reading' }));
    r.articles.forEach((a, i) => {
      const card = articleRow(a, i, act);
      onceVisible(card, () => act.articleImpression(a.slug, i, i === 0), 0.5);
      block.appendChild(card);
    });
    inner.appendChild(block);
  }

  if (r.readers.length) {
    const block = h('div', { class: 'm-block' });
    block.appendChild(h('h2', { class: 'm-h2', text: 'If you want a person’s perspective' }));
    block.appendChild(h('p', {
      class: 'm-block__sub',
      text: 'Questions that ask about someone else’s actions are the ones people most often want a human read on.',
    }));
    const grid = h('div', { class: 'm-readers m-readers--compact' });
    r.readers.forEach((reader, i) => {
      const card = readerRow(reader, i, act);
      onceVisible(card, () => act.readerImpression(reader, i), 0.5);
      grid.appendChild(card);
    });
    block.appendChild(grid);
    inner.appendChild(block);
  }

  const actions = h('div', { class: 'm-cardwrap__actions' },
    h('button', {
      class: 'm-btn m-btn--ghost',
      type: 'button',
      on: { click: () => act.goToAsk() },
      text: 'Ask something else',
    }),
    h('button', {
      class: 'm-btn m-btn--text',
      type: 'button',
      on: { click: () => act.startQuiz('ask_upsell') },
      text: 'Or get matched to your current theme →',
    }),
  );
  inner.appendChild(actions);

  inner.appendChild(h('p', {
    class: 'm-disclaimer',
    text: 'This is a symbolic and reflective interpretation of your question. It is not a prediction, and it is not medical, legal, or financial advice.',
  }));

  section.appendChild(inner);
  return section;
}

/* ── 复用的行式卡片 ───────────────────────────────────────────────── */

function articleRow(a: ScoredArticle, index: number, act: MatchActions): HTMLElement {
  // Ask 工具的结果不挂「Best match」标记：它是一次性提问，不是完整画像，
  // 不该给出与测验结果页一样确定的口吻。
  return h('a', {
    class: 'm-article',
    href: a.url,
    on: { click: () => act.articleClicked(a.slug, index, false, a.url) },
  },
  h('div', { class: 'm-article__body' },
    h('h3', { class: 'm-article__title', text: a.title }),
    a.reasons.length ? h('p', { class: 'm-article__why', text: a.reasons.slice(0, 2).join(' · ') }) : null,
    h('span', { class: 'm-article__go', text: 'Read the guide →' }),
  ));
}

function readerRow(r: ScoredReader, index: number, act: MatchActions): HTMLElement {
  const offer = PLATFORM_OFFERS[r.platform];
  // 文字列包一层 .m-reader__id：与结果页读者卡保持同一套结构，
  // 这样「名字 + 平台评分」不会成为 flex 平级子项而互相挤宽度。
  const idCol = h('div', { class: 'm-reader__id' },
    h('h3', { class: 'm-reader__name', text: r.displayName }),
    h('p', { class: 'm-reader__platform', text: `${PLATFORM_NAME[r.platform]} · ★ ${r.rating.toFixed(1)}` }),
  );
  return h('article', { class: 'm-reader m-reader--compact' },
    h('div', { class: 'm-reader__top' }, idCol),
    r.reasons.length ? h('p', { class: 'm-reader__why-line', text: r.reasons[0] }) : null,
    h('a', {
      class: 'm-btn m-btn--primary m-btn--full m-btn--sm',
      href: r.goUrl,
      target: '_blank',
      rel: 'nofollow sponsored',
      'data-cta-source': 'match-ask-reader',
      on: { click: () => act.readerClicked(r, index) },
      text: offer?.ctaLabel ?? 'Start a reading →',
    }),
  );
}
