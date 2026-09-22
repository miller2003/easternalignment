/**
 * functions/api/match.ts
 * Cloudflare Pages Functions endpoint for the Eastern Alignment Reader Match API.
 * Route: POST|GET /api/match
 *
 * The same deterministic engine that powers the client-side quiz, exposed as a
 * plain JSON API — used for debugging, and as the reference HTTP surface that
 * the /mcp tools conceptually wrap. Input enums are validated before scoring
 * so responses are always well-formed.
 */

import readersData from '../../src/data/readers.json';
import { runMatchEngine } from '../../src/match/engine/recommend';
import type { ReaderProfile, UserAnswers } from '../../src/match/types';

const READERS = readersData as unknown as ReaderProfile[];

const VALID = {
  intent: ['love_relationship', 'another_person_intentions', 'breakup_ex', 'dating', 'career_work', 'money_finance', 'decision_making', 'future_direction', 'grief_loss', 'self_reflection', 'general_guidance'],
  situationSubject: ['myself', 'another_person', 'relationship_dynamic', 'future_event', 'past_closure', 'not_sure'],
  preferredPractice: ['psychic', 'tarot', 'astrology', 'medium', 'numerology', 'spiritual_guidance', 'empath', 'open'],
  preferredFormat: ['chat', 'phone', 'video', 'no_preference'],
  urgency: ['right_now', 'today', 'few_days', 'no_rush'],
  budget: ['under_20', '20_to_50', '50_plus', 'no_pref'],
  styles: ['direct', 'gentle', 'fast_answers', 'practical', 'detailed', 'conversational', 'reflective', 'structured'],
} as const;

function pickEnum<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]): T[number] {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T[number]) : fallback;
}

function normalizeAnswers(raw: Record<string, unknown>): UserAnswers {
  const DEFAULT_STYLES: UserAnswers['preferredStyles'] = ['direct'];
  const styles = Array.isArray(raw.preferredStyles)
    ? (raw.preferredStyles.filter((s: unknown) => typeof s === 'string' && (VALID.styles as readonly string[]).includes(s)) as UserAnswers['preferredStyles'])
    : DEFAULT_STYLES;
  return {
    intent: pickEnum(raw.intent, VALID.intent, 'love_relationship'),
    situationSubject: pickEnum(raw.situationSubject, VALID.situationSubject, 'another_person'),
    preferredPractice: pickEnum(raw.preferredPractice, VALID.preferredPractice, 'open'),
    preferredFormat: pickEnum(raw.preferredFormat, VALID.preferredFormat, 'no_preference'),
    preferredStyles: styles.length ? styles : DEFAULT_STYLES,
    urgency: pickEnum(raw.urgency, VALID.urgency, 'today'),
    budget: pickEnum(raw.budget, VALID.budget, 'no_pref'),
  };
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestPost(context: { request: Request }): Promise<Response> {
  try {
    let raw: Record<string, unknown> = {};
    try {
      raw = (await context.request.json()) as Record<string, unknown>;
    } catch (_) {
      return json({ ok: false, error: 'Invalid JSON payload' }, 400);
    }

    const result = runMatchEngine(READERS, normalizeAnswers(raw));
    return json({ ok: true, result });
  } catch (error) {
    return json({ ok: false, error: 'Internal scoring error' }, 500);
  }
}

export async function onRequestGet(context: { request: Request }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const result = runMatchEngine(READERS, normalizeAnswers({
      intent: url.searchParams.get('intent') ?? undefined,
      situationSubject: url.searchParams.get('subject') ?? undefined,
      preferredPractice: url.searchParams.get('practice') ?? undefined,
      preferredFormat: url.searchParams.get('format') ?? undefined,
      preferredStyles: (url.searchParams.get('styles') || '').split(',').filter(Boolean),
      urgency: url.searchParams.get('urgency') ?? undefined,
      budget: url.searchParams.get('budget') ?? undefined,
    }));
    return json({ ok: true, result });
  } catch (error) {
    return json({ ok: false, error: 'Internal scoring error' }, 500);
  }
}
