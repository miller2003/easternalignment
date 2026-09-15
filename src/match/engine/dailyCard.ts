/**
 * engine/dailyCard.ts — 每日牌（规格 §15）
 *
 * 要求：可重复使用、防止不必要的重复、匿名可用、登录后能存历史。
 * 抽取用 (日期 + 匿名 id) 的确定性哈希 —— 同一天同一台设备抽到的永远是同一张，
 * 这样刷新页面不会「抽到你满意为止」，也符合占卜工具的心理契约。
 */

import type { TarotCard, UserProfile, Domain } from '../types';
import { TAROT_CARDS } from '../content/tarotCards';
import { STORAGE } from '../config';

export interface CardRecord {
  date: string;
  cardId: string;
  cardName: string;
  interpretation: string;
  reflection: string;
  theme?: Domain;
}

export function todayString(d = new Date()): string {
  // 本地日期，不用 toISOString（那是 UTC，东八区会在下午 4 点后跳到第二天）
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 最近 N 天抽到过的牌，用于避免短期重复 */
function recentCardIds(days = 14): string[] {
  try {
    const raw = localStorage.getItem(STORAGE.dailyCards);
    if (!raw) return [];
    const history: CardRecord[] = JSON.parse(raw);
    return history.slice(0, days).map((h) => h.cardId);
  } catch {
    return [];
  }
}

/**
 * 同一天同一设备的牌 —— 纯函数、幂等。
 *
 * 🔴 2026-09-15 修复：本函数此前是「种子哈希 + 跳过近 14 天出现过的牌」，
 * 而跳过列表里**包含今天自己那张**，于是第二次调用（此时当天记录已写入
 * localStorage）会跳过它、顺延到下一张候选 —— 同一天抽两次得到两张不同的牌。
 * app.ts 的 drawCard() 虽然会先读 getTodaysCard() 兜底，但只要历史被部分
 * 清理（隐私模式、手动清 storage、换 tab 后写入竞争）就会退化成重抽。
 *
 * 幂等必须由本函数自己保证，不能依赖调用方的缓存命中：
 * 「这一天属于这台设备的牌」是 (日期, 匿名 id) 的纯函数，与历史无关。
 * 避重（avoidRecent）只负责在**首次**抽取时挑一个近期没出现过的候选。
 */
export function pickDailyCard(date: string, anonymousId: string, avoidRecentIds: string[] = []): TarotCard {
  const seed = `${date}|${anonymousId}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  // 最多重试 40 次找一个近期没出现过的；找不到就用第一次的结果
  for (let attempt = 0; attempt < 40; attempt++) {
    const idx = (hash + attempt * 7919) % TAROT_CARDS.length;
    const card = TAROT_CARDS[idx];
    if (card && !avoidRecentIds.includes(card.id)) return card;
  }
  return TAROT_CARDS[hash % TAROT_CARDS.length]!;
}

export function drawDailyCard(anonymousId: string, avoidRecent = true): TarotCard {
  // 历史列表里必须剔除「今天」——今天那张就是我们要返回的答案本身，
  // 把它当成「近期已出现」会让同一天重抽时顺延到别的牌。
  const date = todayString();
  const seen = avoidRecent
    ? recentCardIds().filter((_, i) => i !== 0)   // 保留历史但去掉今天（storeDailyCard 永远把今天放首位）
    : [];
  return pickDailyCard(date, anonymousId, seen);
}

/** 已抽过就返回当天那张，避免「重抽」破坏工具的信任感 */
export function getTodaysCard(): CardRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE.dailyCards);
    if (!raw) return null;
    const history: CardRecord[] = JSON.parse(raw);
    return history.find((h) => h.date === todayString()) ?? null;
  } catch {
    return null;
  }
}

export interface CardInterpretation {
  text: string;
  reflection: string;
  /** 该牌与用户当前主题的连接句，无画像时为空 */
  connection?: string;
}

export function interpretCard(card: TarotCard, profile?: UserProfile): CardInterpretation {
  const domain = profile?.primary_domain;
  const domainText = domain ? card.domainReflections?.[domain] : undefined;

  const domainPhrase: Record<Domain, string> = {
    love: 'in the context of love and connection',
    breakup: 'during this period of transition',
    relationships: 'within the relationships around you',
    money: 'in relation to resources and security',
    career: 'in relation to your work and direction',
    family: 'within your family and closest bonds',
    spirituality: 'as a spiritual message',
    future: 'as guidance about what lies ahead',
    self_growth: 'as an invitation to your own growth',
    protection: 'as a note about your energy and boundaries',
  };

  const text = domainText ?? card.symbolicMeaning;

  if (!profile) return { text, reflection: card.reflection };

  const emotion = profile.emotional_states[0];
  const connection = emotion
    ? `Given that ${emotion} has been the loudest feeling for you, this card is worth reading ${domainPhrase[profile.primary_domain]}.`
    : `Read this card ${domainPhrase[profile.primary_domain]}.`;

  return { text, reflection: card.reflection, connection };
}

export function storeDailyCard(record: CardRecord): void {
  try {
    const raw = localStorage.getItem(STORAGE.dailyCards);
    const history: CardRecord[] = raw ? JSON.parse(raw) : [];
    const filtered = history.filter((h) => h.date !== record.date);
    filtered.unshift(record);
    localStorage.setItem(STORAGE.dailyCards, JSON.stringify(filtered.slice(0, 180)));
  } catch {
    /* 隐私模式下 localStorage 不可写，静默降级 */
  }
}

export function cardStreak(): number {
  try {
    const raw = localStorage.getItem(STORAGE.dailyCards);
    if (!raw) return 0;
    const dates = new Set((JSON.parse(raw) as CardRecord[]).map((h) => h.date));
    let streak = 0;
    const cursor = new Date();
    while (dates.has(todayString(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  } catch {
    return 0;
  }
}
