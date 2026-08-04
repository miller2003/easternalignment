/**
 * Zodiac data for the Eastern Alignment compatibility matrix.
 * Pure astronomical/astrological data — no fabricated claims.
 * Compatibility scoring is derived from classical element & modality rules.
 */

export interface ZodiacSign {
  name: string;          // English name
  symbol: string;        // glyph
  element: 'Fire' | 'Earth' | 'Air' | 'Water';
  modality: 'Cardinal' | 'Fixed' | 'Mutable';
  ruler: string;         // ruling planet (classical)
  dates: string;         // typical date range
  opposite: string;      // opposite sign (polarity axis)
  traits: string[];      // core character traits
  keywords: string;      // SEO keywords for the page
  intro: string;         // 2-3 sentence opening description
}

export const SIGNS: ZodiacSign[] = [
  {
    name: 'Aries',
    symbol: '♈',
    element: 'Fire',
    modality: 'Cardinal',
    ruler: 'Mars',
    dates: 'March 21 – April 19',
    opposite: 'Libra',
    traits: ['Direct', 'Courageous', 'Impulsive', 'Independent', 'Competitive'],
    keywords: 'aries personality, aries love, aries traits',
    intro: 'Aries is the first sign of the zodiac, ruled by Mars, the planet of drive and action. This cardinal fire sign leads with instinct and moves faster than almost anyone else in the zodiac.',
  },
  {
    name: 'Taurus',
    symbol: '♉',
    element: 'Earth',
    modality: 'Fixed',
    ruler: 'Venus',
    dates: 'April 20 – May 20',
    opposite: 'Scorpio',
    traits: ['Steadfast', 'Sensual', 'Patient', 'Loyal', 'Practical'],
    keywords: 'taurus personality, taurus love, taurus traits',
    intro: 'Taurus is the fixed earth sign ruled by Venus, the planet of love and pleasure. Steady, sensual, and deeply loyal, Taurus builds slowly and rarely abandons what it has committed to.',
  },
  {
    name: 'Gemini',
    symbol: '♊',
    element: 'Air',
    modality: 'Mutable',
    ruler: 'Mercury',
    dates: 'May 21 – June 20',
    opposite: 'Sagittarius',
    traits: ['Adaptable', 'Curious', 'Communicative', 'Playful', 'Restless'],
    keywords: 'gemini personality, gemini love, gemini traits',
    intro: 'Gemini is the mutable air sign ruled by Mercury, the messenger planet. Quick-witted, endlessly curious, and gifted with language, Gemini lives in the exchange of ideas.',
  },
  {
    name: 'Cancer',
    symbol: '♋',
    element: 'Water',
    modality: 'Cardinal',
    ruler: 'The Moon',
    dates: 'June 21 – July 22',
    opposite: 'Capricorn',
    traits: ['Nurturing', 'Intuitive', 'Protective', 'Moody', 'Tenacious'],
    keywords: 'cancer personality, cancer love, cancer traits',
    intro: 'Cancer is the cardinal water sign ruled by the Moon. Deeply intuitive and protective, Cancer feels everything first and thinks about it second, and its loyalty runs to the bone.',
  },
  {
    name: 'Leo',
    symbol: '♌',
    element: 'Fire',
    modality: 'Fixed',
    ruler: 'The Sun',
    dates: 'July 23 – August 22',
    opposite: 'Aquarius',
    traits: ['Radiant', 'Generous', 'Proud', 'Warm', 'Dramatic'],
    keywords: 'leo personality, leo love, leo traits',
    intro: 'Leo is the fixed fire sign ruled by the Sun. Warm, generous, and impossible to ignore, Leo leads with heart and expects the loyalty it so freely gives.',
  },
  {
    name: 'Virgo',
    symbol: '♍',
    element: 'Earth',
    modality: 'Mutable',
    ruler: 'Mercury',
    dates: 'August 23 – September 22',
    opposite: 'Pisces',
    traits: ['Analytical', 'Precise', 'Helpful', 'Modest', 'Observant'],
    keywords: 'virgo personality, virgo love, virgo traits',
    intro: 'Virgo is the mutable earth sign ruled by Mercury. Analytical, precise, and quietly devoted, Virgo expresses care through practical service and sharp attention to detail.',
  },
  {
    name: 'Libra',
    symbol: '♎',
    element: 'Air',
    modality: 'Cardinal',
    ruler: 'Venus',
    dates: 'September 23 – October 22',
    opposite: 'Aries',
    traits: ['Harmonious', 'Fair', 'Charming', 'Indecisive', 'Diplomatic'],
    keywords: 'libra personality, libra love, libra traits',
    intro: 'Libra is the cardinal air sign ruled by Venus. Diplomatic, charming, and devoted to balance, Libra seeks harmony in every room it enters and every decision it faces.',
  },
  {
    name: 'Scorpio',
    symbol: '♏',
    element: 'Water',
    modality: 'Fixed',
    ruler: 'Pluto',
    dates: 'October 23 – November 21',
    opposite: 'Taurus',
    traits: ['Intense', 'Resourceful', 'Private', 'Passionate', 'Transformative'],
    keywords: 'scorpio personality, scorpio love, scorpio traits',
    intro: 'Scorpio is the fixed water sign ruled by Pluto, the planet of transformation. Intense, private, and magnetically powerful, Scorpio feels in extremes and trusts almost no one completely.',
  },
  {
    name: 'Sagittarius',
    symbol: '♐',
    element: 'Fire',
    modality: 'Mutable',
    ruler: 'Jupiter',
    dates: 'November 22 – December 21',
    opposite: 'Gemini',
    traits: ['Adventurous', 'Optimistic', 'Honest', 'Independent', 'Philosophical'],
    keywords: 'sagittarius personality, sagittarius love, sagittarius traits',
    intro: 'Sagittarius is the mutable fire sign ruled by Jupiter, the planet of expansion. Adventurous, bluntly honest, and allergic to confinement, Sagittarius is the explorer of the zodiac.',
  },
  {
    name: 'Capricorn',
    symbol: '♑',
    element: 'Earth',
    modality: 'Cardinal',
    ruler: 'Saturn',
    dates: 'December 22 – January 19',
    opposite: 'Cancer',
    traits: ['Disciplined', 'Ambitious', 'Reliable', 'Reserved', 'Strategic'],
    keywords: 'capricorn personality, capricorn love, capricorn traits',
    intro: 'Capricorn is the cardinal earth sign ruled by Saturn, the planet of structure and time. Disciplined, ambitious, and quietly powerful, Capricorn builds its life the way it builds everything: deliberately.',
  },
  {
    name: 'Aquarius',
    symbol: '♒',
    element: 'Air',
    modality: 'Fixed',
    ruler: 'Uranus',
    dates: 'January 20 – February 18',
    opposite: 'Leo',
    traits: ['Inventive', 'Independent', 'Humanitarian', 'Detached', 'Original'],
    keywords: 'aquarius personality, aquarius love, aquarius traits',
    intro: 'Aquarius is the fixed air sign ruled by Uranus, the planet of rebellion and innovation. Forward-thinking, independent, and fiercely original, Aquarius belongs to the future more than the present.',
  },
  {
    name: 'Pisces',
    symbol: '♓',
    element: 'Water',
    modality: 'Mutable',
    ruler: 'Neptune',
    dates: 'February 19 – March 20',
    opposite: 'Virgo',
    traits: ['Empathetic', 'Artistic', 'Intuitive', 'Dreamy', 'Compassionate'],
    keywords: 'pisces personality, pisces love, pisces traits',
    intro: 'Pisces is the mutable water sign ruled by Neptune, the planet of dreams and illusion. Empathetic, artistic, and deeply intuitive, Pisces dissolves boundaries and feels the whole room.',
  },
];

export const signByName = (name: string): ZodiacSign =>
  SIGNS.find(s => s.name.toLowerCase() === name.toLowerCase())!;

export const ELEMENTS: Record<'Fire' | 'Earth' | 'Air' | 'Water', {
  label: string;
  desc: string;
  harmonious: ('Fire' | 'Earth' | 'Air' | 'Water')[];
  challenging: ('Fire' | 'Earth' | 'Air' | 'Water')[];
}> = {
  Fire: {
    label: 'Fire',
    desc: 'Fire signs — Aries, Leo, Sagittarius — are driven by passion, instinct, and momentum. They ignite, lead, and inspire.',
    harmonious: ['Fire', 'Air'],
    challenging: ['Water', 'Earth'],
  },
  Earth: {
    label: 'Earth',
    desc: 'Earth signs — Taurus, Virgo, Capricorn — are grounded in practicality, patience, and the material world. They build, stabilize, and endure.',
    harmonious: ['Earth', 'Water'],
    challenging: ['Fire', 'Air'],
  },
  Air: {
    label: 'Air',
    desc: 'Air signs — Gemini, Libra, Aquarius — live in the realm of ideas, language, and connection. They communicate, analyze, and circulate.',
    harmonious: ['Air', 'Fire'],
    challenging: ['Earth', 'Water'],
  },
  Water: {
    label: 'Water',
    desc: 'Water signs — Cancer, Scorpio, Pisces — feel deeply and move by emotion and intuition. They nurture, transform, and connect.',
    harmonious: ['Water', 'Earth'],
    challenging: ['Fire', 'Air'],
  },
};

export const MODALITIES: Record<'Cardinal' | 'Fixed' | 'Mutable', string> = {
  Cardinal: 'Cardinal signs — Aries, Cancer, Libra, Capricorn — are the initiators of the zodiac. They start things.',
  Fixed: 'Fixed signs — Taurus, Leo, Scorpio, Aquarius — are the sustainers. They hold, stabilize, and complete.',
  Mutable: 'Mutable signs — Gemini, Virgo, Sagittarius, Pisces — are the adapters. They change, translate, and close cycles.',
};

/** Opposite-sign pairing (polarity axis) — these are the most intense, magnetic matches */
export const POLARITY_AXES: [string, string][] = [
  ['Aries', 'Libra'],
  ['Taurus', 'Scorpio'],
  ['Gemini', 'Sagittarius'],
  ['Cancer', 'Capricorn'],
  ['Leo', 'Aquarius'],
  ['Virgo', 'Pisces'],
];

/**
 * Compatibility scoring based on classical element rules:
 * - Same element: strong natural resonance (7-9 range, with modality variation)
 * - Harmonious element: supportive flow (6-8 range)
 * - Challenging element: friction that can become growth (4-6 range)
 * - Opposite sign (polarity axis): max intensity, magnetic, 5-9 depending on other factors
 * - Same modality: shared rhythm; different modality: complementary
 */
export function compatibilityScore(a: ZodiacSign, b: ZodiacSign): {
  score: number;          // 1-10 overall
  romance: number;        // 1-10
  communication: number;  // 1-10
  longTerm: number;       // 1-10
  label: string;          // short verdict label
} {
  const sameElement = a.element === b.element;
  const harmonious = ELEMENTS[a.element].harmonious.includes(b.element);
  const challenging = ELEMENTS[a.element].challenging.includes(b.element);
  const isOpposite = a.opposite === b.name;
  const sameModality = a.modality === b.modality;

  let base = 5;
  if (sameElement) base = 8;
  else if (harmonious) base = 7;
  else if (challenging) base = 4.5;

  // Polarity axis adds intensity — magnetic but demanding
  const intensity = isOpposite ? 1.5 : 0;

  let romance = base + (isOpposite ? 1.2 : 0) + (sameElement ? 0.5 : 0);
  let communication = base + (a.element === 'Air' || b.element === 'Air' ? 1 : 0) + (sameModality ? 0.5 : 0);
  let longTerm = base + (a.element === 'Earth' || b.element === 'Earth' ? 0.8 : 0) + (sameModality ? 0.5 : 0) - (isOpposite ? 1.5 : 0);

  const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n * 10) / 10));
  romance = clamp(romance + intensity * 0.4);
  communication = clamp(communication);
  longTerm = clamp(longTerm);
  const score = clamp((romance + communication + longTerm) / 3);

  let label: string;
  if (score >= 8.5) label = 'Excellent Match';
  else if (score >= 7.5) label = 'Strong Match';
  else if (score >= 6.5) label = 'Good Match';
  else if (score >= 5.5) label = 'Workable Match';
  else if (score >= 4.5) label = 'Challenging Match';
  else label = 'Difficult Match';

  return { score, romance, communication, longTerm, label };
}

/** Generate all 66 unordered pairs */
export function allPairs(): [ZodiacSign, ZodiacSign][] {
  const pairs: [ZodiacSign, ZodiacSign][] = [];
  for (let i = 0; i < SIGNS.length; i++) {
    for (let j = i + 1; j < SIGNS.length; j++) {
      pairs.push([SIGNS[i], SIGNS[j]]);
    }
  }
  return pairs;
}

/** Slug for a pair page, e.g. "taurus-and-scorpio-compatibility". Normalized by zodiac order so any call order produces the same URL. */
export function pairSlug(a: ZodiacSign, b: ZodiacSign): string {
  const ia = SIGNS.indexOf(a);
  const ib = SIGNS.indexOf(b);
  const [first, second] = ia <= ib ? [a, b] : [b, a];
  return `${first.name.toLowerCase()}-and-${second.name.toLowerCase()}-compatibility`;
}

/** Element interaction narrative for a pair */
export function elementNarrative(a: ZodiacSign, b: ZodiacSign): string {
  const combo = [a.element, b.element].sort().join('-');
  const narratives: Record<string, string> = {
    'Fire-Fire': 'Two fire signs together create a blaze. The energy is high, the passion immediate, and the risk is two flames consuming one another when neither wants to yield. The relationship thrives on shared adventure and dies when it becomes a competition.',
    'Fire-Earth': 'Fire meets earth: one wants to ignite, the other wants to build. This pairing works when the fire sign provides the spark and the earth sign provides the foundation. The friction comes when fire sees earth as too slow and earth sees fire as too reckless.',
    'Fire-Air': 'Air feeds fire. This is one of the most naturally supportive combinations in the zodiac — the air sign brings ideas, communication, and oxygen, and the fire sign brings warmth and momentum. Energy flows freely between them.',
    'Fire-Water': 'Fire and water are the classic tension pairing. Water extinguishes fire; fire boils water. Yet some of the most passionate and transformative relationships in the zodiac come from this clash, because each challenges the other to evolve.',
    'Earth-Earth': 'Two earth signs build a fortress. The relationship is stable, practical, and enduring, with both partners prioritizing security and loyalty. The risk is the opposite of fire-fire: comfort so complete that growth stalls.',
    'Earth-Air': 'Earth meets air: the practical meets the conceptual. The earth sign grounds the air sign\u2019s ideas; the air sign opens the earth sign\u2019s horizons. The friction arises when earth dismisses air as impractical and air sees earth as rigid.',
    'Earth-Water': 'Water nourishes earth. This is the most fertile combination in the zodiac — the water sign brings emotional depth and intuition, and the earth sign provides stability and care. Relationships here tend to grow slowly and root deeply.',
    'Air-Air': 'Two air signs live in the mind. Conversation is endless, ideas multiply, and the connection is intellectually electric. The risk is a relationship of concepts rather than feelings, where neither partner is willing to descend into emotion.',
    'Air-Water': 'Air meets water: the mind meets the heart. The air sign articulates what the water sign feels; the water sign gives the air sign emotional depth. The friction comes when air intellectualizes feelings and water takes everything personally.',
    'Water-Water': 'Two water signs swim in the same emotional ocean. The empathy is profound, the intuition shared, and neither partner ever has to explain their feelings. The risk is an ocean with no shore — the relationship can drown in its own depth.',
  };
  return narratives[combo] || 'A complementary pairing of instincts and logic, where each partner brings what the other lacks.';
}

/** Modality interaction narrative */
export function modalityNarrative(a: ZodiacSign, b: ZodiacSign): string {
  if (a.modality === b.modality) {
    return `Both are ${a.modality} signs, which means they share the same rhythm: ${MODALITIES[a.modality]} This shared tempo makes coordination easy, but it can also mean both partners want the same role in the relationship — two initiators, two sustainers, or two adapters rarely want to switch parts.`;
  }
  return `${a.name} is a ${a.modality} sign while ${b.name} is ${b.modality === 'Cardinal' ? 'a' : b.modality === 'Fixed' ? 'a' : 'a'} ${b.modality} sign. Their different tempos are complementary — one initiates, the other stabilizes or adapts — and this natural division of roles tends to keep the relationship moving without either partner feeling crowded.`;
}
