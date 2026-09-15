/**
 * ui/result.ts — 结果页（规格 §7 / §8 / §12 / §21 / §27）
 *
 * 与旧版的差别：
 *   · 旧版读 recs.readers / recs.articles（引擎返回的是 recommended_readers /
 *     recommended_articles），结果页一进就 TypeError 崩在读者区块
 *   · 旧版没有「你可能真正在寻找的」这一段，也从不引用用户自己的答案
 *   · 旧版读者卡显示的是 slug（a-psychic-friend-kasamba-review），不是人名
 *   · 旧版邮箱表单只弹一句「Reading sent!」，没有任何后端
 */

import type { MatchActions, ScreenState } from './actions';
import { h, initials, onceVisible } from './dom';
import { DOMAIN_LABEL, EMOTION_LABEL, PLATFORM_NAME } from '../content/labels';
import { PLATFORM_OFFERS } from '../../lib/offers';
import { EMAIL_CONFIG } from '../config';
import { emailCopy, providerCanDeliver } from '../email';
import { cautionFor } from '../engine/askUniverse';
import type { ResultSection, ScoredArticle, ScoredReader } from '../types';

export function renderResult(state: ScreenState, act: MatchActions): HTMLElement {
  // 危机拦截优先于一切：不渲染画像、不渲染推荐、不渲染读者，不出现任何付费入口。
  if (state.crisis) return renderCrisis();

  const { profile, recs } = state;
  if (!profile || !recs) return h('section', { class: 'm-screen' });

  const section = h('section', { class: 'm-screen m-screen--result' });
  const inner = h('div', { class: 'm-result' });

  /* ── 页头 ── */
  const head = h('header', { class: 'm-result__head' });
  head.appendChild(h('p', { class: 'm-badge', text: 'Your current spiritual theme' }));
  const h1 = h('h1', { class: 'm-h1 m-h1--theme', id: 'm-screen-title', text: recs.narrative.block.theme });
  head.appendChild(h1);
  head.appendChild(h('p', { class: 'm-result__meta', text: metaLine(profile) }));

  const tools = h('div', { class: 'm-result__tools' },
    h('button', {
      class: 'm-btn m-btn--ghost m-btn--sm',
      type: 'button',
      on: { click: () => act.copyResultLink() },
      text: 'Copy link to this reading',
    }),
    h('button', {
      class: 'm-btn m-btn--text m-btn--sm',
      type: 'button',
      on: { click: () => act.restart() },
      text: 'Start over',
    }),
  );
  head.appendChild(tools);
  inner.appendChild(head);

  /* ── 区块 ── */
  const blocks: Record<ResultSection, HTMLElement | null> = {
    narrative: blockNarrative(state),
    mechanism: blockMechanism(state),
    deeperQuestion: blockDeeperQuestion(recs.narrative.block.deeperQuestion),
    whatNext: blockWhatNext(recs.narrative.block.whatNext),
    readers: blockReaders(state, act),
    article: blockArticles(state, act),
    tool: blockTool(act, !!state.profile),
    email: blockEmail(state, act),
  };

  for (const id of recs.sectionOrder) {
    const node = blocks[id];
    if (!node) continue;
    inner.appendChild(node);
    // 区块曝光：只有真正滚到才计一次，用来定位结果页在哪一段掉人
    onceVisible(node, () => act.sectionViewed(id, scrollPct()), 0.35);
  }

  inner.appendChild(h('p', {
    class: 'm-disclaimer',
    text: 'This is a reflective reading, not a prediction, and not medical, legal, or financial advice. Nothing here tells you what another person will do. For entertainment and self-reflection.',
  }));

  section.appendChild(inner);
  return section;
}

function scrollPct(): number {
  const doc = document.documentElement;
  const total = doc.scrollHeight - window.innerHeight;
  return total > 0 ? Math.round((window.scrollY / total) * 100) : 0;
}

/* ── 危机屏 ────────────────────────────────────────────────────────── */

/**
 * 用户在自由文本里写下了自伤/自杀意念时，结果页整体降级为这一屏。
 *
 * 设计纪律（规格 §21 + 常识）：
 *   · 不给任何属灵解读 —— 这正是用户此刻最不需要的东西
 *   · 不出现读者推荐、不出现「3 free minutes」、不出现任何付费入口
 *   · 不写"会好起来的"这类空承诺
 *   · 唯一动作是「把用户交给真人」，并给出可直接拨打的号码
 *
 * 号码选择：988（美）+ 116 123（英，Samaritans 免费 24h）+ findahelpline.com
 * 作为其他辖区的出口。实测流量以美/英为主，这两个覆盖面最广。
 */
function renderCrisis(): HTMLElement {
  const section = h('section', { class: 'm-screen m-screen--result' });
  const inner = h('div', { class: 'm-result' });

  const head = h('header', { class: 'm-result__head' });
  head.appendChild(h('p', { class: 'm-badge', text: 'Before anything else' }));
  head.appendChild(h('h1', {
    class: 'm-h1',
    id: 'm-screen-title',
    text: 'This is not something to sit with alone',
  }));
  inner.appendChild(head);

  const block = h('div', { class: 'm-block m-block--crisis' });
  block.appendChild(h('p', {
    class: 'm-p',
    text: 'What you wrote suggests you may be thinking about harming yourself. '
      + 'I am not going to read that as a spiritual question, and I am not going to '
      + 'give you a psychic recommendation for it. It deserves a person, not a tool.',
  }));

  const lines = h('div', { class: 'm-crisis__lines' });
  lines.appendChild(h('p', { class: 'm-p' },
    h('strong', { text: 'United States — call or text 988' }),
    h('span', { text: ' (Suicide & Crisis Lifeline, free, 24/7)' }),
  ));
  lines.appendChild(h('p', { class: 'm-p' },
    h('strong', { text: 'United Kingdom — call 116 123' }),
    h('span', { text: ' (Samaritans, free, 24/7)' }),
  ));
  lines.appendChild(h('p', { class: 'm-p' },
    h('strong', { text: 'Anywhere else — findahelpline.com' }),
    h('span', { text: ' lists a free line for your country.' }),
  ));
  block.appendChild(lines);

  block.appendChild(h('p', {
    class: 'm-fineprint',
    text: 'If you are in immediate danger, please call your local emergency number.',
  }));

  inner.appendChild(block);

  inner.appendChild(h('p', {
    class: 'm-disclaimer',
    text: 'You can close this page. There is nothing here for you to buy.',
  }));

  section.appendChild(inner);
  return section;
}

/**
 * 结果页副标题。
 * 用句子式大小写而不是 CSS text-transform: capitalize —— 后者会把
 * "love and relationships" 变成 "Love And Relationships"，看着像机器生成。
 */
function metaLine(profile: NonNullable<ScreenState['profile']>): string {
  const parts: string[] = [];
  parts.push(DOMAIN_LABEL[profile.primary_domain]);
  const emo = profile.emotional_states.map((e) => EMOTION_LABEL[e]).slice(0, 2);
  if (emo.length) parts.push(emo.join(' and '));
  if (profile.relationship_state) parts.push(profile.relationship_state.replace(/_/g, ' '));
  const line = parts.join(' · ');
  return line.charAt(0).toUpperCase() + line.slice(1);
}

/* ── 1. 发生了什么 ─────────────────────────────────────────────────── */

function blockNarrative(state: ScreenState): HTMLElement {
  const { profile, recs } = state;
  const wrap = h('div', { class: 'm-block', id: 'm-block-narrative' });
  const n = recs!.narrative;

  // 锚定句：明确引用用户勾选的选项（规格 §8 硬要求）
  if (n.anchor) {
    wrap.appendChild(h('div', { class: 'm-anchor' },
      h('p', { class: 'm-anchor__label', text: 'From your answers' }),
      h('p', { class: 'm-anchor__body', text: n.anchor }),
    ));
  }

  wrap.appendChild(h('h2', { class: 'm-h2', text: 'What may be happening' }));
  n.block.summary.forEach((p) => wrap.appendChild(h('p', { class: 'm-p', text: p })));
  if (n.toneLine) wrap.appendChild(h('p', { class: 'm-p m-p--aside', text: n.toneLine }));

  // 依据自由文本识别出的具体变化，再补一句（只有识别到才写）
  if (profile!.loss_or_change) {
    const map: Record<string, string> = {
      recent_breakup: 'You described a breakup that is still recent enough to be shaping how everything else reads.',
      divorce: 'You mentioned a divorce — an ending with paperwork attached, which tends to keep the past administratively open.',
      no_contact_period: 'You described a stretch where communication simply stopped. Silence is unusual in that it supplies no new information, only time.',
      job_loss: 'You mentioned losing work, which removes both income and the daily structure that usually carries you through a hard week.',
      bereavement: 'You mentioned a loss by death. That is a different kind of ending from a separation, and it does not negotiate.',
      relocation: 'You mentioned a move or the prospect of one. Leaving a place ends things that nobody formally ended.',
      health_event: 'You mentioned a health event, which tends to reorder every other priority without asking.',
      commitment_change: 'You mentioned a change in commitment — that shifts the question from "what is this" to "what did I agree to".',
      pregnancy_change: 'You mentioned something around pregnancy or a child. That kind of change arrives with a timeline nobody chose.',
      partner_left: 'You described them leaving. Being the one who stays is a different position than being the one who goes.',
    };
    const line = map[profile!.loss_or_change];
    if (line) wrap.appendChild(h('p', { class: 'm-p m-p--aside', text: line }));
  }

  // 领域级专项免责（规格 §21）。
  // 此前 caution 只在 Ask the Universe 路径出现，这意味着一个在测验里选了
  // 「钱 / 事业」的用户，结果页只看到一句通用免责 —— 而他恰恰是最容易被
  // 「财务预测」这类内容的边界问题绊倒的人。这里复用同一条 caution 来源。
  const caution = cautionFor({
    domain: profile!.primary_domain,
    emotional_states: profile!.emotional_states,
    desired_outcomes: profile!.desired_outcomes,
  });
  if (caution) {
    wrap.appendChild(h('p', { class: 'm-caution', text: caution }));
  }

  return wrap;
}

/* ── 1b. 底层机制解读（内部轴，代号永不外显） ──────────────────────── */

/**
 * 「为什么你会卡在这里」这一段。
 *
 * 三条硬纪律：
 *   1. **不渲染 key。** `mechanism.key` 是内部代号（sudden_loss 这类），
 *      渲染出来既吓人又暴露分类逻辑。这里只用它做 id 后缀（不可见 DOM 属性）、
 *      也**不进埋点** —— 埋点只上报「有过机制区块 / 没有」这一个布尔。
 *   2. **不渲染 actions。** 用户明确要求不提供「解决方法」。
 *      数据层仍留着（content/internalMechanisms.ts），但渲染路径不读它，
 *      总开关是 config.MECHANISM_ACTIONS_ENABLED。即便哪天打开，
 *      这段代码也不会自动开始渲染 —— 必须显式改这里。
 *   3. **信号不足时整段不渲染。** 由引擎的 minScore / minLead 决定，
 *      这里只做 null 判断，不自己再判一次阈值（避免出现两套标准）。
 *
 * 结构：解读段落 → 一句过渡 → 反思问题。反思问题是留白，不是任务清单，
 * 因此用 blockquote/列表的视觉语义，而不是带勾选框的 to-do。
 */
function blockMechanism(state: ScreenState): HTMLElement | null {
  const m = state.recs?.narrative.mechanism;
  if (!m || !m.paragraphs.length) return null;

  const wrap = h('div', { class: 'm-block', id: 'm-block-mechanism' });
  wrap.appendChild(h('h2', { class: 'm-h2', text: 'What may be keeping it in place' }));

  m.paragraphs.forEach((p) => wrap.appendChild(h('p', { class: 'm-p', text: p })));

  if (m.reflections.length) {
    wrap.appendChild(h('p', {
      class: 'm-p m-block__sub',
      text: 'Two questions worth sitting with — you do not need answers today.',
    }));
    const ul = h('ul', { class: 'm-list m-list--reflect' });
    m.reflections.forEach((q) => ul.appendChild(h('li', { text: q })));
    wrap.appendChild(ul);
  }

  return wrap;
}

/* ── 2. 值得探索的问题 ─────────────────────────────────────────────── */

function blockDeeperQuestion(text: string): HTMLElement {
  return h('div', { class: 'm-block', id: 'm-block-question' },
    h('h2', { class: 'm-h2', text: 'What you may really be looking for' }),
    h('blockquote', { class: 'm-quote' },
      h('p', { text: text }),
      h('p', {
        class: 'm-quote__note',
        text: 'You do not need an answer to this today. Noticing it is the work.',
      }),
    ),
  );
}

/* ── 3. 接下来可以做的 ─────────────────────────────────────────────── */

function blockWhatNext(items: string[]): HTMLElement {
  const wrap = h('div', { class: 'm-block', id: 'm-block-whatnext' });
  wrap.appendChild(h('h2', { class: 'm-h2', text: 'What to explore next' }));
  const list = h('ol', { class: 'm-list' });
  items.forEach((t) => list.appendChild(h('li', { text: t })));
  wrap.appendChild(list);
  return wrap;
}

/* ── 4. 读者 ───────────────────────────────────────────────────────── */

function blockReaders(state: ScreenState, act: MatchActions): HTMLElement | null {
  const recs = state.recs!;
  if (!recs.readers.length) return null;

  const wrap = h('div', { class: 'm-block', id: 'm-block-readers' });
  wrap.appendChild(h('h2', { class: 'm-h2', text: 'Readers who fit what you described' }));
  wrap.appendChild(h('p', {
    class: 'm-block__sub',
    text: 'Human readers on the platforms we review. Matched against your answers — not paid placement.',
  }));

  const grid = h('div', { class: 'm-readers' });
  recs.readers.forEach((r, i) => {
    const card = readerCard(r, i, act);
    onceVisible(card, () => act.readerImpression(r, i), 0.5);
    grid.appendChild(card);
  });
  wrap.appendChild(grid);

  wrap.appendChild(h('p', {
    class: 'm-fineprint',
    text: 'We earn a commission if you start a reading through these links. It does not change the price you pay, and it is how this site stays free.',
  }));

  return wrap;
}

function readerCard(r: ScoredReader, index: number, act: MatchActions): HTMLElement {
  const offer = PLATFORM_OFFERS[r.platform];

  const card = h('article', { class: 'm-reader' });

  // 竖排居中：三列网格下每列只有 ~230px，横排会把名字挤成三行、
  // 卡片高度参差。头像在上、名字居中的排法在窄列里稳定得多。
  //
  // 手机上（≤640px）单列全宽，再由 CSS 切回「头像在左、文字在右」的横排；
  // 因此名字/平台/评分/优惠这四行必须包在同一个文字列里 ——
  // 否则它们会成为头像的平级 flex 子项，各自抢一列，名字只剩 ~50px。
  const top = h('div', { class: 'm-reader__top' });

  const avatar = r.avatarUrl
    ? h('img', {
        class: 'm-reader__avatar',
        src: r.avatarUrl,
        alt: '',
        width: '56',
        height: '56',
        loading: 'lazy',
        decoding: 'async',
        on: {
          // 头像 404 时退回首字母，而不是留一个破图标
          error: (e: Event) => {
            const img = e.target as HTMLImageElement;
            img.replaceWith(h('div', { class: 'm-reader__avatar m-reader__avatar--fallback', 'aria-hidden': 'true', text: initials(r.displayName) }));
          },
        },
      })
    : h('div', { class: 'm-reader__avatar m-reader__avatar--fallback', 'aria-hidden': 'true', text: initials(r.displayName) });
  top.appendChild(avatar);

  const idCol = h('div', { class: 'm-reader__id' });
  idCol.appendChild(h('h3', { class: 'm-reader__name', text: r.displayName }));
  idCol.appendChild(h('p', { class: 'm-reader__platform', text: PLATFORM_NAME[r.platform] }));
  idCol.appendChild(h('p', { class: 'm-reader__rating' },
    h('span', { class: 'm-stars', 'aria-hidden': 'true', text: '★' }),
    h('span', { text: ` ${r.rating.toFixed(1)}` }),
  ));
  if (r.freeOffer) idCol.appendChild(h('p', { class: 'm-reader__offer', text: r.freeOffer }));
  top.appendChild(idCol);

  card.appendChild(top);

  if (r.bestFor) {
    card.appendChild(h('p', { class: 'm-reader__bestfor', text: r.bestFor }));
  }

  if (r.reasons.length) {
    const ul = h('ul', { class: 'm-reader__reasons' });
    r.reasons.forEach((reason) => ul.appendChild(h('li', { text: reason })));
    card.appendChild(h('div', { class: 'm-reader__why' },
      h('p', { class: 'm-reader__why-label', text: 'Why this one' }),
      ul,
    ));
  }

  card.appendChild(h('a', {
    class: 'm-btn m-btn--primary m-btn--full',
    href: r.goUrl,
    target: '_blank',
    rel: 'nofollow sponsored',
    'data-cta-source': 'match-reader',
    on: {
      click: () => act.readerClicked(r, index),
      // ⚠️ 归因漏损修复（2026-09-15）：
      // 中键点击、"在新标签打开"、Ctrl/Cmd+点击 都**不会**触发 click 事件，
      // 于是全站 /go/ 的点击拦截器不会运行 —— 落地页拿不到 ea_sub，
      // 只能退回 referrer 门禁，这次点击的归因精度就丢了。
      // auxclick 覆盖非左键点击；键盘回车激活由 click 覆盖。
      auxclick: () => act.readerClicked(r, index),
    },
    text: offer?.ctaLabel ?? 'Start a reading →',
  }));

  card.appendChild(h('a', {
    class: 'm-reader__review',
    href: r.profileUrl,
    text: `Read our full review of ${r.displayName}`,
  }));

  return card;
}

/* ── 5. 文章 ───────────────────────────────────────────────────────── */

function blockArticles(state: ScreenState, act: MatchActions): HTMLElement | null {
  const recs = state.recs!;
  if (!recs.articles.length) return null;

  // 找不到真正对题的文章时如实降级：不挂「Best match」，标题也改成背景阅读，
  // 而不是把一篇泛泛的文章包装成"为你写的"。
  const topical = recs.articleFlagshipIsTopical;

  const wrap = h('div', { class: 'm-block', id: 'm-block-article' });
  wrap.appendChild(h('h2', { class: 'm-h2', text: topical ? 'Start here' : 'Background reading' }));
  wrap.appendChild(h('p', {
    class: 'm-block__sub',
    text: topical
      ? 'Written guides matched to your answers.'
      : 'Nothing here was written for your exact situation, so these are the closest useful pieces rather than a direct match.',
  }));

  recs.articles.forEach((a, i) => {
    const card = articleCard(a, i, i === 0 && topical, act);
    onceVisible(card, () => act.articleImpression(a.slug, i, i === 0 && topical), 0.5);
    wrap.appendChild(card);
  });

  return wrap;
}

function articleCard(a: ScoredArticle, index: number, flagship: boolean, act: MatchActions): HTMLElement {
  const card = h('a', {
    class: `m-article${flagship ? ' m-article--flagship' : ''}`,
    href: a.url,
    on: { click: () => act.articleClicked(a.slug, index, flagship, a.url) },
  });

  card.appendChild(h('div', { class: 'm-article__body' },
    flagship ? h('p', { class: 'm-article__flag', text: 'Best match' }) : null,
    h('h3', { class: 'm-article__title', text: a.title }),
    a.reasons.length ? h('p', { class: 'm-article__why', text: a.reasons.slice(0, 2).join(' · ') }) : null,
    h('span', { class: 'm-article__go', text: 'Read the guide →' }),
  ));

  return card;
}

/* ── 6. 免费工具 ───────────────────────────────────────────────────── */

function blockTool(act: MatchActions, hasProfile: boolean): HTMLElement {
  return h('div', { class: 'm-block', id: 'm-block-tool' },
    h('div', { class: 'm-toolcard' },
      h('h2', { class: 'm-h2', text: 'One card for today' }),
      h('p', {
        class: 'm-p',
        text: hasProfile
          ? 'Draw a single card and read it against the theme above.'
          : 'Draw a single card and sit with one question.',
      }),
      h('button', {
        class: 'm-btn m-btn--primary',
        type: 'button',
        on: { click: () => act.drawCard() },
        text: 'Draw today’s card',
      }),
    ),
  );
}

/* ── 7. 邮件 ───────────────────────────────────────────────────────── */

function blockEmail(state: ScreenState, act: MatchActions): HTMLElement {
  const copy = emailCopy(state.recs!.emailTopicShort);
  const wrap = h('div', { class: 'm-block', id: 'm-block-email' });

  const card = h('div', { class: 'm-email' });
  card.appendChild(h('h2', { class: 'm-h2', text: copy.heading }));
  card.appendChild(h('p', { class: 'm-p', text: copy.body }));

  const form = h('form', { class: 'm-email__form', novalidate: 'true' });

  const input = h('input', {
    class: 'm-input',
    type: 'email',
    name: 'email',
    required: 'true',
    autocomplete: 'email',
    inputmode: 'email',
    // iOS 键盘显示「前往」而不是灰色的「return」，且不自动大写邮箱
    autocapitalize: 'none',
    autocorrect: 'off',
    spellcheck: 'false',
    enterkeyhint: 'go',
    placeholder: 'you@example.com',
    'aria-label': 'Email address',
  });
  form.appendChild(input);

  form.appendChild(h('button', {
    class: 'm-btn m-btn--primary',
    type: 'submit',
    disabled: state.emailState === 'sending',
    text: state.emailState === 'sending' ? 'Saving…' : copy.cta,
  }));

  if (EMAIL_CONFIG.requireConsent) {
    const consent = h('input', { class: 'm-checkbox', type: 'checkbox', id: 'm-consent', name: 'consent' });
    form.appendChild(h('label', { class: 'm-consent', for: 'm-consent' }, consent,
      h('span', {
        text: providerCanDeliver()
          ? 'Yes, email me the weekly reading. Unsubscribe any time.'
          : 'Yes, keep my answers with my email so my reading is here next time.',
      }),
    ));
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // 重复提交防护。按钮的 disabled 只挡住「光标还在按钮上」的第二次点击：
    // render() 重建 DOM 后 state.emailState 会回到 idle，用户若快速按两次
    // 回车/点两次提交，就会发出两条订阅。local provider 下无副作用，
    // 但接入真实 ESP 后会变成重复订阅 —— 现在就用一个闭包锁挡掉。
    if (form.dataset.submitting === '1') return;
    form.dataset.submitting = '1';
    const email = (input as HTMLInputElement).value.trim();
    const box = form.querySelector<HTMLInputElement>('#m-consent');
    act.submitEmail(email, box ? box.checked : true);
  });

  card.appendChild(form);

  if (state.emailMessage) {
    card.appendChild(h('p', {
      class: `m-email__msg ${state.emailState === 'error' ? 'is-error' : 'is-ok'}`,
      role: 'status',
      text: state.emailMessage,
    }));
  }

  card.appendChild(h('p', {
    class: 'm-fineprint',
    text: EMAIL_CONFIG.requireConsent
      ? 'We store only your email and your answers. No selling, no sharing. Ask us and we delete it.'
      : 'We store only your email and your answers.',
  }));

  wrap.appendChild(card);
  onceVisible(card, () => act.emailFormViewed(), 0.4);
  return wrap;
}
