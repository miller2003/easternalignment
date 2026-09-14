/**
 * dailyCard.ts - Daily card draw logic
 */
import type { TarotCard, DailyCardSession, UserProfile, Domain } from './types';
import { TAROT_CARDS } from './content/tarotCards';

const CARD_HISTORY_KEY = 'ea_match_daily_cards';

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function drawDailyCard(anonymousId: string): TarotCard {
  const seed = todayString() + anonymousId;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return TAROT_CARDS[hash % TAROT_CARDS.length]!;
}

export function getCardInterpretation(card: TarotCard, profile?: UserProfile): string {
  if (profile && card.domainReflections) {
    const domainText = card.domainReflections[profile.primary_domain as Domain];
    if (domainText) return domainText;
  }
  const base = card.symbolicMeaning;
  if (!profile) return base;
  const domainPhrase: Partial<Record<Domain, string>> = {
    love: 'in the context of love and connection',
    career: 'as it relates to your work and purpose',
    spirituality: 'as a spiritual message',
    future: 'as guidance about what is ahead',
    family: 'within your family and closest bonds',
    protection: 'as a note about your energy and protection',
    self_growth: 'as an invitation to your own growth',
    breakup: 'during this time of transition',
    money: 'as it relates to abundance and resources',
    relationships: 'within your relationships',
  };
  const phrase = domainPhrase[profile.primary_domain] ?? 'right now';
  return base + ' Consider this ' + phrase + '.';
}

export function storeDailyCard(session: DailyCardSession): void {
  try {
    const raw = localStorage.getItem(CARD_HISTORY_KEY);
    const history: DailyCardSession[] = raw ? JSON.parse(raw) : [];
    const filtered = history.filter(s => s.date !== session.date);
    filtered.unshift(session);
    localStorage.setItem(CARD_HISTORY_KEY, JSON.stringify(filtered.slice(0, 90)));
  } catch (_) {}
}

export function getTodaysCard(): DailyCardSession | null {
  try {
    const raw = localStorage.getItem(CARD_HISTORY_KEY);
    if (!raw) return null;
    const history: DailyCardSession[] = JSON.parse(raw);
    return history.find(s => s.date === todayString()) ?? null;
  } catch { return null; }
}
