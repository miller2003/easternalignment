import type { Domain, RelationshipState, ReaderMatchMetadata } from '../types';

export interface RawReader {
  slug: string;
  platform: string;
  platformName: string;
  rating: number;
  affiliateUrl: string;
  avatarUrl?: string;
  bestFor?: string;
  pricing?: string;
  freeOffer?: string;
  entities?: string[];
  unavailable?: boolean;
}

export function classifyReader(reader: RawReader): ReaderMatchMetadata {
  // Extract display name from platformName (e.g. 'Keen: Ask Fran' -> 'Ask Fran')
  const rawName = reader.platformName ?? reader.slug;
  const displayName = rawName.includes(':') ? rawName.split(':').pop()?.trim() ?? rawName : rawName;

  const bestFor = (reader.bestFor ?? '').toLowerCase();
  const entities = (reader.entities ?? []).map(e => e.toLowerCase());
  const text = bestFor + ' ' + entities.join(' ');

  // Derive specialties
  const specialties: Domain[] = [];
  if (/love|relationship|romance|soulmate|twin|ex-|breakup|divorce|no.contact|reconcil|heart|reunion/.test(text)) specialties.push('love');
  if (/career|money|finance|business|job|work|abundance/.test(text)) specialties.push('career');
  if (/spiritual|psychic|intuitive|clairvoyant|medium|angel|aura|energy|tarot|past.life/.test(text)) specialties.push('spirituality');
  if (/breakup|divorce|separation/.test(text)) {
    if (!specialties.includes('breakup' as Domain)) specialties.push('breakup' as Domain);
  }
  if (/family|children|parent/.test(text)) specialties.push('family');
  if (/protection|clearing|negative.energy|curse|block/.test(text)) specialties.push('protection');
  // Default: all readers have some love specialty (most applicable)
  if (specialties.length === 0) specialties.push('love', 'spirituality');

  // Derive relationship states
  const relationship_states: RelationshipState[] = [];
  if (/no.contact|silence|ghosted/.test(text)) relationship_states.push('no_contact');
  if (/breakup|divorce|separation|ex-/.test(text)) relationship_states.push('recently_separated');
  if (/specific.person|someone.special/.test(text)) relationship_states.push('thinking_about_someone');
  if (/complicated|undefined|situationship/.test(text)) relationship_states.push('complicated');

  // Style
  const style: string[] = [];
  if (/empathetic|compassionate|warm|gentle|nurturing/.test(text)) style.push('empathetic');
  if (/direct|honest|straightforward|no-nonsense|blunt/.test(text)) style.push('direct');
  if (/detailed|thorough|in-depth|comprehensive/.test(text)) style.push('detailed');
  if (style.length === 0) style.push('empathetic');

  return {
    slug: reader.slug,
    platform: reader.platform,
    displayName,
    specialties,
    relationship_states,
    style,
    availability: !reader.unavailable,
    rating: reader.rating,
    affiliateUrl: reader.affiliateUrl,
    avatarUrl: reader.avatarUrl,
    bestFor: reader.bestFor,
    pricing: reader.pricing,
    freeOffer: reader.freeOffer,
  };
}