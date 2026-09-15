/**
 * app.ts — /match 控制器与状态机
 *
 * 职责边界（规格 §22）：这里只做「状态迁移 + 调用引擎 + 上报埋点」。
 * 不写任何渲染标记（在 ui/ 里），不写任何打分逻辑（在 engine/ 里）。
 */

import type { MatchActions, ScreenState } from './ui/actions';
import { renderLanding, renderComputing } from './ui/landing';
import { renderAssessment } from './ui/assessment';
import { renderResult } from './ui/result';
import { renderCard, renderAsk } from './ui/tools';
import { focusScreen } from './ui/dom';

import { QUIZ_QUESTIONS } from './engine/questions';
import { buildProfile, toSnapshot, type StoredProfile } from './engine/scoring';
import { buildNarrative } from './engine/narrative';
import { getRecommendations, commercialIntent } from './engine/recommend';
import { drawDailyCard, getTodaysCard, interpretCard, storeDailyCard, cardStreak, todayString, type CardInterpretation } from './engine/dailyCard';
import { askUniverse, isCrisis, cautionFor, CRISIS_MESSAGE } from './engine/askUniverse';
import { TAROT_CARDS } from './content/tarotCards';
import { encodeResult, decodeResult, resultUrl } from './engine/share';

import { track } from './analytics';
import { initAttribution, getAnonymousId, identify } from './attribution';
import { submitEmail, providerCanDeliver, emailDomain } from './email';
import { STORAGE, PROFILE_HISTORY_LIMIT, RESULT_PARAM } from './config';

import type { ArticleMetadata, ReaderMatchMetadata } from './types';

/* ── 构建期注入的内容索引 ──────────────────────────────────────────── */

function readIndex<T>(id: string): T[] {
  try {
    const el = document.getElementById(id);
    if (!el?.textContent) return [];
    const parsed = JSON.parse(el.textContent);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (err) {
    track.error('readIndex', id + ': ' + (err instanceof Error ? err.message : 'parse'));
    return [];
  }
}

let READERS: ReaderMatchMetadata[] = [];
let ARTICLES: ArticleMetadata[] = [];

/* ── 状态 ──────────────────────────────────────────────────────────── */

const state: ScreenState = {
  screen: 'landing',
  questionIndex: 0,
  answers: {},
  emailState: 'idle',
};

let quizStartedAt = 0;
let questionShownAt = 0;
let quizSource = 'unknown';
let viewedSections = new Set<string>();
let resultShownAt = 0;

/* ── 持久化 ────────────────────────────────────────────────────────── */

function readHistory(): StoredProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE.profileHistory);
    return raw ? (JSON.parse(raw) as StoredProfile[]) : [];
  } catch { return []; }
}

function saveToHistory(entry: StoredProfile): void {
  try {
    const history = readHistory();
    // 规格 §14：保留历史而不是覆盖；同一份答案重复保存时只保留一份
    const dedup = history.filter((h) => JSON.stringify(h.answers) !== JSON.stringify(entry.answers));
    dedup.unshift(entry);
    localStorage.setItem(STORAGE.profileHistory, JSON.stringify(dedup.slice(0, PROFILE_HISTORY_LIMIT)));
    localStorage.setItem(STORAGE.lastProfile, JSON.stringify(entry));
  } catch { /* 隐私模式 */ }
}

function restoreFromHistory(): void {
  try {
    const raw = localStorage.getItem(STORAGE.lastProfile);
    if (!raw) return;
    const entry = JSON.parse(raw) as StoredProfile;
    if (!entry?.profile) return;
    state.restoredProfile = entry.profile;
    state.restoredTheme = entry.theme;
    state.answers = entry.answers;
    state.profile = entry.profile;
  } catch { /* ignore */ }
}

/* ── URL / 历史 ────────────────────────────────────────────────────── */

function currentParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

function pushUrl(params: Record<string, string>, mode: 'push' | 'replace' = 'push'): void {
  const sp = new URLSearchParams(params);
  const url = `${window.location.pathname}${sp.toString() ? '?' + sp.toString() : ''}`;
  const stateObj = { match: true, ...params };
  // 测验内部各步用 replaceState：这是一个单页工具，不该为每一步都塞一条
  // 历史记录 —— 否则用户从结果页按后退，会一次次退回上一道题，很怪。
  // 只有「首屏 → 第 1 题」和「结果页」值得成为真正的历史节点。
  if (mode === 'replace') window.history.replaceState(stateObj, '', url);
  else window.history.pushState(stateObj, '', url);
}

/* ── 渲染 ──────────────────────────────────────────────────────────── */

function render(): void {
  const host = document.getElementById('match-app');
  if (!host) return;
  host.textContent = '';

  let node: HTMLElement;
  switch (state.screen) {
    case 'assessment': node = renderAssessment(state, actions); break;
    case 'computing': node = renderComputing(); break;
    case 'result': node = renderResult(state, actions); break;
    case 'card': node = renderCard(state, actions); break;
    case 'ask': node = renderAsk(state, actions); break;
    default: node = renderLanding(state, actions);
  }
  host.appendChild(node);

  // 结果页与工具页在渲染后把焦点交给标题；答题页自己管（它要播报进度）
  if (state.screen !== 'assessment') {
    window.requestAnimationFrame(() => {
      focusScreen(document.getElementById('m-screen-title'));
    });
  }

  syncTitle();
}

/**
 * 让浏览器标签页标题跟着当前主题走。
 *
 * 为什么值得做：用户做完测评后往往会开着好几个标签，标题还停在
 * "Find Your Spiritual Theme" 会让这个标签变得不可辨认；而且切到别的
 * 页面再按后退回来时，历史记录里的标题也该是主题而不是泛标题。
 * 分享链接被别人打开时，标签页标题直接就是对方的主题 —— 这也是
 * 「这是写给我的」这个感受的一部分。
 */
function syncTitle(): void {
  const base = 'Eastern Alignment';
  let title = 'Find Your Spiritual Theme';
  if (state.screen === 'result') {
    title = state.crisis
      ? 'Before anything else'
      : (state.recs?.narrative.block.theme ?? 'Your reading');
  } else if (state.screen === 'card') {
    title = state.activeCard ? `Today's card: ${state.activeCard.card.name}` : 'Daily card';
  } else if (state.screen === 'ask') {
    title = 'Ask the Universe';
  }
  document.title = `${title} | ${base}`;
}

/* ── 测验 ──────────────────────────────────────────────────────────── */

function currentQuestion() {
  return QUIZ_QUESTIONS[state.questionIndex];
}

function goToQuestion(index: number, mode: 'push' | 'replace' = 'replace'): void {
  state.screen = 'assessment';
  state.questionIndex = Math.max(0, Math.min(index, QUIZ_QUESTIONS.length - 1));
  questionShownAt = Date.now();
  render();
  pushUrl({ step: String(state.questionIndex + 1) }, mode);
}

function finishQuiz(): void {
  const freeText = typeof state.answers.q7 === 'string' ? state.answers.q7 : '';

  // 危机信号在测验路径同样必须拦（此前只有 Ask 路径检测）。
  // 自由文本里出现自伤/自杀意念时，绝不能再往下走「推荐读者 + 推付费咨询」
  // 这条商业链路：那不只是不体面，是危险。
  if (freeText && isCrisis(freeText)) {
    state.crisis = true;
    state.profile = undefined;
    state.recs = undefined;
    state.resultToken = undefined;
    state.screen = 'result';
    resultShownAt = Date.now();
    // 用 replace 顶掉最后一题的历史记录，与正常完成保持一致
    pushUrl({ [RESULT_PARAM]: '' }, 'replace');
    render();
    track.crisisDetected({ source: 'quiz' });
    return;
  }

  const profile = buildProfile(state.answers);
  const narrative = buildNarrative(profile, state.answers);
  const recs = getRecommendations({ profile, readers: READERS, articles: ARTICLES, narrative });

  state.profile = profile;
  state.recs = recs;
  state.resultToken = encodeResult(state.answers);
  state.screen = 'result';
  viewedSections = new Set();
  resultShownAt = Date.now();

  const skippedFreeText = !state.answers.q7 || String(state.answers.q7).trim() === '';
  track.quizCompleted({
    profile: toSnapshot(profile),
    durationMs: Date.now() - quizStartedAt,
    answered: Object.values(state.answers).filter((v) => (Array.isArray(v) ? v.length : String(v).length)).length,
    skippedFreeText,
  });

  saveToHistory({
    profile,
    answers: state.answers,
    theme: narrative.block.theme,
    savedAt: new Date().toISOString(),
  });

  // 用 URL 承载结果：可收藏、可分享，也是「保存了我的阅读」这个承诺的实现方式。
  // 用 replace 把当前这条历史记录（最后一题）原地换成结果页，于是从结果页
  // 按后退会回到首屏，而不是退回第 7 题。
  pushUrl({ [RESULT_PARAM]: state.resultToken }, 'replace');

  state.restoredProfile = profile;
  state.restoredTheme = narrative.block.theme;

  render();
  track.resultViewed({
    profile: toSnapshot(profile),
    theme: narrative.block.theme,
    intent: commercialIntent(profile),
    readerCount: recs.readers.length,
    articleCount: recs.articles.length,
    restored: false,
  });
}

/* ── 控制器动作 ────────────────────────────────────────────────────── */

const actions: MatchActions = {
  startQuiz(source) {
    quizSource = source;
    quizStartedAt = Date.now();
    state.profile = undefined;
    state.recs = undefined;
    state.answers = {};
    track.quizStarted(source);
    goToQuestion(0);
  },

  goToCard(source) {
    track.dailyCardStarted(state.profile ? toSnapshot(state.profile) : undefined);
    state.screen = 'card';
    actions.drawCard();
    pushUrl({ tool: 'card' });
    void source;
  },

  goToAsk() {
    state.askResult = undefined;
    state.askCaution = undefined;
    state.screen = 'ask';
    track.askStarted(state.profile ? toSnapshot(state.profile) : undefined);
    render();
    pushUrl({ tool: 'ask' });
  },

  resumePrevious() {
    if (!state.restoredProfile) return;
    const profile = state.restoredProfile;
    const narrative = buildNarrative(profile, state.answers);
    state.profile = profile;
    state.recs = getRecommendations({ profile, readers: READERS, articles: ARTICLES, narrative });
    state.resultToken = encodeResult(state.answers);
    state.screen = 'result';
    viewedSections = new Set();
    resultShownAt = Date.now();
    pushUrl({ [RESULT_PARAM]: state.resultToken });
    render();
    track.resultViewed({
      profile: toSnapshot(profile),
      theme: narrative.block.theme,
      intent: commercialIntent(profile),
      readerCount: state.recs.readers.length,
      articleCount: state.recs.articles.length,
      restored: true,
    });
  },

  restart() {
    state.answers = {};
    state.profile = undefined;
    state.recs = undefined;
    state.questionIndex = 0;
    state.screen = 'assessment';
    quizStartedAt = Date.now();
    questionShownAt = Date.now();
    render();
    pushUrl({ step: '1' });
  },

  backToResult() {
    if (!state.recs) { actions.goToCard('fallback'); return; }
    state.screen = 'result';
    render();
    pushUrl({ [RESULT_PARAM]: state.resultToken ?? '' }, 'replace');
  },

  /* ── 答题 ── */
  selectOption(questionId, optionId) {
    const q = currentQuestion();
    if (!q) return;
    const previous = state.answers[questionId];
    const before = JSON.stringify(previous);

    if (q.type === 'multi') {
      const list = Array.isArray(previous) ? [...previous] : previous ? [previous as string] : [];
      const at = list.indexOf(optionId);
      if (at > -1) list.splice(at, 1);
      else {
        const max = q.maxSelect ?? 3;
        if (list.length >= max) return; // 上限由 UI 与控制器双重拦截
        list.push(optionId);
      }
      state.answers[questionId] = list;
    } else {
      state.answers[questionId] = optionId;
    }

    track.questionAnswered({
      questionId,
      stepIndex: state.questionIndex,
      total: QUIZ_QUESTIONS.length,
      optionIds: Array.isArray(state.answers[questionId]) ? (state.answers[questionId] as string[]) : [optionId],
      msOnQuestion: Date.now() - questionShownAt,
      changedAnswer: before !== JSON.stringify(state.answers[questionId]) && previous !== undefined,
    });

    render();
  },

  setFreeText(value) {
    state.answers.q7 = value;
  },

  next() {
    const q = currentQuestion();
    if (!q) return;
    const ans = state.answers[q.id];
    const empty = ans === undefined || (Array.isArray(ans) ? ans.length === 0 : String(ans).trim() === '');
    if (q.type !== 'freetext' && empty) return;

    if (state.questionIndex < QUIZ_QUESTIONS.length - 1) {
      goToQuestion(state.questionIndex + 1);
    } else {
      state.screen = 'computing';
      render();
      // 计算本身是毫秒级的；这里留一个短暂的过渡，是为了让用户对结果产生
      // 心理预期，而不是假装后台在算什么。
      window.setTimeout(() => finishQuiz(), 1150);
    }
  },

  back() {
    if (state.questionIndex === 0) {
      state.screen = 'landing';
      render();
      pushUrl({});
      return;
    }
    track.backNavigated({
      fromQuestion: currentQuestion()?.id ?? '',
      toQuestion: QUIZ_QUESTIONS[state.questionIndex - 1]?.id ?? '',
      fromIndex: state.questionIndex,
    });
    goToQuestion(state.questionIndex - 1);
  },

  skipFreeText() {
    track.questionSkipped({ questionId: 'q7', stepIndex: state.questionIndex });
    state.answers.q7 = '';
    actions.next();
  },

  /* ── 结果页 ── */
  copyResultLink() {
    const token = state.resultToken ?? encodeResult(state.answers);
    const url = resultUrl(token);
    const done = () => {
      if (state.profile) track.resultLinkCopied(toSnapshot(state.profile));
      window.dispatchEvent(new CustomEvent('match:copied'));
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(() => window.prompt('Copy your reading link:', url));
    } else {
      window.prompt('Copy your reading link:', url);
    }
  },

  readerImpression(reader, position) {
    if (!state.profile) return;
    track.readerImpression({
      readerSlug: reader.slug,
      platform: reader.platform,
      position,
      matchScore: reader.matchScore,
      profile: toSnapshot(state.profile),
    });
  },

  readerClicked(reader, position) {
    if (state.profile) {
      track.readerClicked({
        readerSlug: reader.slug,
        platform: reader.platform,
        position,
        matchScore: reader.matchScore,
        profile: toSnapshot(state.profile),
      });
    }
    // 跳转本身交给全站统一的 /go/ 点击处理器（PostHog.astro）：
    // 它负责拼 ea_sub、过门禁、上报 affiliate_link_click。
    // 这里绝不自己 navigate，否则点击会双发或丢失归因。
  },

  articleImpression(slug, position, isFlagship) {
    if (!state.profile) return;
    track.articleImpression({ articleSlug: slug, position, isFlagship, profile: toSnapshot(state.profile) });
  },

  articleClicked(slug, position, isFlagship, url) {
    if (!state.profile) return;
    track.articleClicked({ articleSlug: slug, position, url, isFlagship, profile: toSnapshot(state.profile) });
  },

  sectionViewed(section, scrollPct) {
    if (!state.profile || viewedSections.has(section)) return;
    viewedSections.add(section);
    track.sectionViewed(section, scrollPct, Date.now() - resultShownAt);
  },

  emailFormViewed() {
    if (state.profile) track.emailFormViewed(toSnapshot(state.profile));
  },

  async submitEmail(email, consent) {
    state.emailState = 'sending';
    state.emailMessage = undefined;
    render();

    const result = await submitEmail({
      email,
      consent,
      profile: state.profile,
      topic: state.recs?.emailTopic ?? 'Your weekly spiritual reading',
      theme: state.recs?.narrative.block.theme,
    });

    if (result.ok) {
      state.emailState = 'ok';
      state.emailMessage = result.message;
      // 匿名 → 已知身份合并（规格 §19）
      identify(email, state.profile ? { ea_domain: state.profile.primary_domain } : {});
      track.emailSubmitted({
        emailDomain: emailDomain(email),
        provider: result.provider,
        consent,
        topic: state.recs?.emailTopicShort ?? '',
      });
    } else {
      state.emailState = 'error';
      state.emailMessage = result.message;
      track.emailFailed({ provider: result.provider, reason: result.reason ?? 'unknown' });
    }
    render();
  },

  /* ── 工具 ── */
  drawCard() {
    // 幂等：同一天已经抽过就直接回放那一张。
    //
    // 为什么必须这么做：本文件的契约是「同一天同一台设备抽到的永远是同一张」。
    // 此前 drawCard 每次都重新抽取并覆盖写入，于是用户连点两次会看到两张不同
    // 的牌 —— 这个工具立刻从「占卜」退化成「随机数生成器」，信任感一次性耗尽。
    // 缓存命中时标 repeated:true，埋点里就能看出有多少次是回放。
    const existing = getTodaysCard();
    if (existing) {
      const card = TAROT_CARDS.find((c) => c.id === existing.cardId);
      if (card) {
        const interp: CardInterpretation = {
          text: existing.interpretation,
          reflection: existing.reflection,
        };
        state.activeCard = { card, interpretation: interp, streak: cardStreak() };
        state.screen = 'card';
        render();
        track.dailyCardCompleted({
          cardName: card.name,
          cardId: card.id,
          repeated: true,
          streak: state.activeCard.streak,
          profile: state.profile ? toSnapshot(state.profile) : undefined,
        });
        return;
      }
      // 历史里的 cardId 在当前牌库中找不到（牌库被改过）—— 落到重抽，不崩
    }

    const anonId = getAnonymousId();
    const card = drawDailyCard(anonId);
    const interp = interpretCard(card, state.profile);
    storeDailyCard({
      date: todayString(),
      cardId: card.id,
      cardName: card.name,
      interpretation: interp.text,
      reflection: interp.reflection,
      theme: state.profile?.primary_domain,
    });
    const streak = cardStreak();

    state.activeCard = { card, interpretation: interp, streak };
    state.screen = 'card';
    render();
    track.dailyCardCompleted({
      cardName: card.name,
      cardId: card.id,
      repeated: false,
      streak,
      profile: state.profile ? toSnapshot(state.profile) : undefined,
    });
  },

  submitAsk(question) {
    // 危机信号：不做任何解读，直接给求助方向
    if (isCrisis(question)) {
      state.askResult = undefined;
      state.askCaution = CRISIS_MESSAGE;
      state.screen = 'ask';
      render();
      track.askCompleted({
        questionLength: question.length,
        domain: 'crisis',
        outcomes: [],
        predictionSeeking: false,
        articleCount: 0,
        suggestedHuman: false,
      });
      return;
    }

    const result = askUniverse(question, ARTICLES, READERS);
    state.askResult = result;
    state.askCaution = cautionFor(result.classification);
    render();

    track.askCompleted({
      questionLength: question.length,
      domain: result.classification.domain,
      outcomes: result.classification.desired_outcomes,
      predictionSeeking: /\b(will|when|does (he|she|they))\b/i.test(question),
      articleCount: result.articles.length,
      suggestedHuman: result.suggestHumanReading,
    });
  },
};

/* ── 启动 ──────────────────────────────────────────────────────────── */

/** 数据索引缺失时的降级说明（与 match.astro 的 noscript 兜底同源） */
export const FALLBACK_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/reviews/kasamba/', label: 'Kasamba review' },
  { href: '/reviews/purple-garden/', label: 'Purple Garden review' },
  { href: '/guides/no-contact-psychic-readings-guide/', label: 'No contact and psychic readings' },
  { href: '/guides/how-to-choose-a-psychic-reader/', label: 'How to choose a reader' },
];

/**
 * 索引缺失时的降级屏。
 *
 * 与简单报错的区别：它仍然给出**可用的下一步**（站内最常被读的页面），
 * 而不是让访客撞到一堵墙。措辞不细说内部原因（访客不关心 JSON 注入），
 * 但也不撒谎说"稍后再试"—— 它不知道何时会好。
 */
function renderDegraded(): void {
  const host = document.getElementById('match-app');
  if (!host) return;
  state.screen = 'degraded';
  host.textContent = '';

  const section = document.createElement('section');
  section.className = 'm-screen m-screen--center';
  const box = document.createElement('div');
  box.className = 'm-landing';

  const title = document.createElement('h1');
  title.className = 'm-h1';
  title.id = 'm-screen-title';
  title.textContent = 'The theme finder is unavailable right now';
  box.appendChild(title);

  const lede = document.createElement('p');
  lede.className = 'm-lede';
  lede.textContent = 'Something on our side did not load, so we cannot match you accurately. '
    + 'Rather than guess, here are the pages visitors find most useful:';
  box.appendChild(lede);

  const links = document.createElement('p');
  links.className = 'm-p';
  FALLBACK_LINKS.forEach((l, i) => {
    if (i > 0) links.appendChild(document.createTextNode(' · '));
    const a = document.createElement('a');
    a.className = 'm-link';
    a.href = l.href;
    a.textContent = l.label;
    links.appendChild(a);
  });
  box.appendChild(links);

  section.appendChild(box);
  host.appendChild(section);
}

function boot(): void {
  initAttribution();
  READERS = readIndex<ReaderMatchMetadata>('match-reader-data');
  ARTICLES = readIndex<ArticleMetadata>('match-article-data');

  // 数据索引为空 = 推荐引擎无法工作。此时如果照常往下走，用户答完 7 题会拿到
  // 一个没有任何推荐、没有任何 CTA 的空结果页 —— 那比直接说「暂时不可用」更糟。
  // 所以这里必须硬停，并把流量导向已有的可索引页面。
  if (!READERS.length || !ARTICLES.length) {
    track.error('boot', `readers=${READERS.length} articles=${ARTICLES.length}`);
    renderDegraded();
    return;
  }

  restoreFromHistory();

  const params = currentParams();
  const shared = params.get(RESULT_PARAM);

  if (shared) {
    const decoded = decodeResult(shared);
    if (decoded) {
      state.answers = decoded.answers;
      state.profile = decoded.profile;
      const narrative = buildNarrative(decoded.profile, decoded.answers);
      state.recs = getRecommendations({ profile: decoded.profile, readers: READERS, articles: ARTICLES, narrative });
      state.resultToken = shared;
      state.screen = 'result';
      resultShownAt = Date.now();
      render();
      track.resultViewed({
        profile: toSnapshot(decoded.profile),
        theme: narrative.block.theme,
        intent: commercialIntent(decoded.profile),
        readerCount: state.recs.readers.length,
        articleCount: state.recs.articles.length,
        restored: true,
      });
      return;
    }
  }

  if (params.get('tool') === 'ask') {
    actions.goToAsk();
    return;
  }
  if (params.get('tool') === 'card') {
    track.dailyCardStarted(state.profile ? toSnapshot(state.profile) : undefined);
    actions.drawCard();
    return;
  }
  const step = parseInt(params.get('step') ?? '', 10);
  if (step >= 1 && step <= QUIZ_QUESTIONS.length) {
    state.screen = 'assessment';
    state.questionIndex = step - 1;
    quizStartedAt = Date.now();
    questionShownAt = Date.now();
    render();
    return;
  }

  render();
}

/* 浏览器后退/前进 */
window.addEventListener('popstate', () => {
  const params = currentParams();
  const shared = params.get(RESULT_PARAM);
  if (shared) {
    const decoded = decodeResult(shared);
    if (decoded) {
      state.answers = decoded.answers;
      state.profile = decoded.profile;
      const narrative = buildNarrative(decoded.profile, decoded.answers);
      state.recs = getRecommendations({ profile: decoded.profile, readers: READERS, articles: ARTICLES, narrative });
      state.resultToken = shared;
      state.screen = 'result';
      render();
      return;
    }
  }
  if (params.get('tool') === 'ask') { state.screen = 'ask'; render(); return; }
  if (params.get('tool') === 'card') { state.screen = 'card'; render(); return; }
  const step = parseInt(params.get('step') ?? '', 10);
  if (step >= 1 && step <= QUIZ_QUESTIONS.length) {
    state.screen = 'assessment';
    state.questionIndex = step - 1;
    render();
    return;
  }
  state.screen = 'landing';
  render();
});

/* 中途离开：这是算完成率的分母所必需的（规格 §30） */
window.addEventListener('pagehide', () => {
  if (state.screen === 'assessment' && quizStartedAt) {
    track.quizAbandoned({
      lastQuestionIndex: state.questionIndex,
      total: QUIZ_QUESTIONS.length,
      durationMs: Date.now() - quizStartedAt,
    });
  }
});

/* 复制成功的小提示 */
window.addEventListener('match:copied', () => {
  const el = document.getElementById('m-block-narrative');
  if (!el) return;
  const note = document.createElement('p');
  note.className = 'm-fineprint';
  note.setAttribute('role', 'status');
  note.textContent = 'Link copied. Paste it anywhere to come back to this reading.';
  el.appendChild(note);
  window.setTimeout(() => note.remove(), 4000);
});

export { boot };

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

/**
 * 本地验证用的内部状态出口。
 *
 * ⚠️ 仅在开发构建下挂载。此前是无条件挂载的 —— 生产环境里任何人打开
 * 控制台都能读到完整 state（含用户画像）以及读者/文章索引的规模，
 * 并可以用 __match.state 反查解码后的分享载荷。调试价值在本地就够了。
 */
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__match = {
    get state() { return state; },
    get readers() { return READERS.length; },
    get articles() { return ARTICLES.length; },
    providerCanDeliver,
  };
}
