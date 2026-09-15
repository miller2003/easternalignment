/**
 * content/readerClassifier.ts — 读者元数据推断（构建期运行）
 *
 * 旧实现把 162 位读者的原始 frontmatter 以 89KB 内联 JSON 塞进页面，
 * 再由浏览器端脚本现场分类。现在分类挪到构建期：
 *   · 页面只输出匹配真正用得到的字段
 *   · 分类结果可以在构建时被校验（缺头像、/go/ 路由不存在等问题当场暴露）
 *   · 浏览器端少下载并执行一个模块
 */

import type { Domain, RelationshipState, ReaderMatchMetadata, Platform } from '../types';

export interface RawReader {
  slug: string;
  platform: Platform;
  platformName?: string;
  rating?: number;
  affiliateUrl?: string;
  avatarUrl?: string;
  bestFor?: string;
  freeOffer?: string;
  unavailable?: boolean;
}

/** 只在「真正需要」时才带上页面的字段长度上限，控制内联载荷 */
const BESTFOR_MAX = 150;

export function classifyReader(reader: RawReader): ReaderMatchMetadata | null {
  const goUrl = reader.affiliateUrl ?? '';
  // 强制站内 /go/ 路由：任何指向联盟域名的裸链都会绕开 /go/ 的归因与门禁，
  // 构建期直接丢弃，避免这类卡片悄悄上线。
  if (!/^\/go\/[a-z0-9-]+\/?$/.test(goUrl)) return null;
  if (reader.unavailable) return null;

  const rawName = reader.platformName ?? reader.slug;
  const displayName = rawName.includes(':') ? (rawName.split(':').pop() ?? rawName).trim() : rawName;

  const text = `${(reader.bestFor ?? '').toLowerCase()} ${displayName.toLowerCase()}`;

  const specialties: Domain[] = [];
  if (/love|relationship|romance|soulmate|twin|breakup|divorce|no.contact|reconcil|reunion|heart/.test(text)) specialties.push('love');
  if (/breakup|divorce|separation|ex-/.test(text)) specialties.push('breakup');
  if (/career|money|financ|business|job|work|abundance/.test(text)) specialties.push('career');
  if (/spiritual|psychic|intuitive|clairvoyant|medium|angel|aura|energy|tarot|past.life/.test(text)) specialties.push('spirituality');
  if (/family|children|parent|pregnan/.test(text)) specialties.push('family');
  if (/protection|clearing|negative.energy|curse|block|cord.cutting/.test(text)) specialties.push('protection');
  if (specialties.length === 0) specialties.push('love', 'spirituality');

  const relationship_states: RelationshipState[] = [];
  if (/no.contact|silence|ghosted|not.talking/.test(text)) relationship_states.push('no_contact');
  if (/breakup|divorce|separation|ex-|heartbreak/.test(text)) relationship_states.push('recently_separated');
  if (/specific.person|someone.special|does.he|does.she/.test(text)) relationship_states.push('thinking_about_someone');
  if (/situationship|complicated|undefined|on.and.off|third.party/.test(text)) relationship_states.push('complicated');
  if (/dating|new.relationship|online.dating/.test(text)) relationship_states.push('dating');
  if (/marriage|married|propose|husband|wife/.test(text)) relationship_states.push('relationship');

  const style: string[] = [];
  if (/direct|honest|straightforward|no.nonsense|blunt|tells.it.like/.test(text)) style.push('direct');
  if (/detailed|thorough|in.depth|comprehensive/.test(text)) style.push('detailed');
  if (/empathetic|compassionate|warm|gentle|nurturing|kind/.test(text)) style.push('empathetic');
  if (style.length === 0) style.push('empathetic');

  const platform = reader.platform;
  const bestFor = reader.bestFor
    ? (reader.bestFor.length > BESTFOR_MAX
        ? reader.bestFor.slice(0, BESTFOR_MAX).replace(/\s+\S*$/, '') + '…'
        : reader.bestFor)
    : undefined;

  return {
    slug: reader.slug,
    platform,
    displayName,
    profileUrl: `/reviews/${platform}/${reader.slug}/`,
    goUrl: goUrl.endsWith('/') ? goUrl : goUrl + '/',
    rating: typeof reader.rating === 'number' ? reader.rating : 4.5,
    avatarUrl: reader.avatarUrl,
    freeOffer: reader.freeOffer,
    bestFor,
    specialties: Array.from(new Set(specialties)),
    relationship_states: Array.from(new Set(relationship_states)),
    style,
    availability: true,
  };
}
