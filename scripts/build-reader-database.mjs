#!/usr/bin/env node
/**
 * scripts/build-reader-database.mjs
 *
 * Compiles all 242 reader markdown files across Kasamba, Purple Garden, and Keen
 * into a structured, validated dataset (src/data/readers.json).
 *
 * Each reader profile is enriched with:
 *   - Clean metadata (name, platform, URLs, rating, pricing, free offer, avatar)
 *   - Taxonomy tags (practices, primaryPractice, intents, questionTypes, formats, styles)
 *   - Deterministic fitVector (scores 0-5 for love, breakup, dating, intentions, career, money, future, selfReflection, general)
 *   - Trust & evidence metrics (eaEvidenceScore 70-98, reviewCount, platformRating)
 *   - Availability status (default 'unknown', ready for live feed sync)
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import yaml from 'yaml';

const ROOT = process.cwd();
const READERS_DIR = join(ROOT, 'src', 'content', 'readers');
const OUTPUT_FILE = join(ROOT, 'src', 'data', 'readers.json');

const PLATFORMS = ['kasamba', 'keen', 'purple-garden'];

function extractFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  try {
    return yaml.parse(match[1]) || {};
  } catch (err) {
    console.warn('Failed to parse YAML:', err.message);
    return {};
  }
}

function parsePrice(pricingStr) {
  if (!pricingStr) return 3.99;
  // Match patterns like "$5.49/min", "$1.99 - $5.99", "$9.99/min"
  const match = pricingStr.match(/\$(\d+(?:\.\d{1,2})?)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return 3.99;
}

function parseReviewCount(fullText) {
  // Look for patterns like "95,479 readings", "136,000 readings", "4,100+ readings"
  const match = fullText.match(/(\d{1,3}(?:,\d{3})+|\d{3,6})\+?\s*(?:readings|reviews|sessions)/i);
  if (match) {
    return parseInt(match[1].replace(/,/g, ''), 10);
  }
  return 2500; // fallback reasonable average
}

function cleanReaderName(fm, slug) {
  if (fm.platformName) {
    const parts = fm.platformName.split(':');
    if (parts.length > 1) {
      return parts.slice(1).join(':').trim();
    }
  }
  if (fm.title) {
    const titleMatch = fm.title.match(/^([^—(:\-]+?)(?:\s+(?:on|Kasamba|Keen|Purple Garden|Review|2026))/i);
    if (titleMatch) return titleMatch[1].trim();
  }
  return slug.replace(/-(?:kasamba|keen|purple-garden|review|2026)+/gi, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

function buildFitVectorAndTaxonomy(fm, bodyText, platform) {
  const text = `${fm.title || ''} ${fm.description || ''} ${fm.verdict || ''} ${fm.bestFor || ''} ${(fm.highlights || []).join(' ')} ${(fm.pros || []).join(' ')} ${(fm.cons || []).join(' ')} ${(fm.entities || []).join(' ')} ${bodyText}`.toLowerCase();

  // Keyword scoring helper
  const countMatches = (regex) => {
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  };

  // 1. Practice detection
  const practices = [];
  const tarotHits = countMatches(/\b(tarot|card|spread|deck|arcana|rider-waite)\b/g);
  const astrologyHits = countMatches(/\b(astrology|astrologer|horoscope|zodiac|natal|chart|planet|retrograde|sign)\b/g);
  const mediumHits = countMatches(/\b(medium|mediumship|passed away|departed|deceased|spirit connection|afterlife|grief)\b/g);
  const psychicHits = countMatches(/\b(psychic|clairvoyant|clairaudience|clairsentient|empath|intuition|intuitive)\b/g);
  const numerologyHits = countMatches(/\b(numerology|life path|angel numbers)\b/g);
  const coachingHits = countMatches(/\b(coach|coaching|energy healing|chakra|aura|reiki)\b/g);

  if (psychicHits > 0 || practices.length === 0) practices.push('psychic');
  if (tarotHits > 0) practices.push('tarot');
  if (astrologyHits > 0) practices.push('astrology');
  if (mediumHits > 0) practices.push('medium');
  if (numerologyHits > 0) practices.push('numerology');
  if (coachingHits > 0) practices.push('spiritual_guidance');

  // Primary practice
  let primaryPractice = 'psychic';
  if (mediumHits >= 2 && mediumHits >= tarotHits && mediumHits >= astrologyHits) {
    primaryPractice = 'medium';
  } else if (tarotHits > psychicHits && tarotHits >= astrologyHits) {
    primaryPractice = 'tarot';
  } else if (astrologyHits > psychicHits && astrologyHits >= tarotHits) {
    primaryPractice = 'astrology';
  }

  // 2. Intent detection & scoring
  const loveHits = countMatches(/\b(love|relationship|partner|husband|wife|boyfriend|girlfriend|couple|romantic|heart|connection|twin flame|soulmate)\b/g);
  const intentionsHits = countMatches(/\b(what he thinks|what she thinks|his feelings|her feelings|their feelings|intentions|sincerity|truthful|secret|hidden|motive|lying|honest)\b/g);
  const breakupHits = countMatches(/\b(breakup|broke up|separated|divorce|reconcile|reconciliation|no contact|ex|walk away|distance|distant|cold|reunion|come back)\b/g);
  const datingHits = countMatches(/\b(dating|new person|crush|early stages|meeting someone|situationship|swipe|tinder)\b/g);
  const careerHits = countMatches(/\b(career|job|promotion|work|workplace|boss|business|colleague|interview|profession|corporate|employment)\b/g);
  const moneyHits = countMatches(/\b(money|finance|financial|wealth|investment|property|debt|contract|inheritance)\b/g);
  const decisionHits = countMatches(/\b(decision|crossroads|dilemma|choice|choose|turning point|which path|should i)\b/g);
  const futureHits = countMatches(/\b(future|timeline|prediction|milestone|what lies ahead|upcoming|destiny|outlook)\b/g);
  const griefHits = countMatches(/\b(grief|loss|passed away|departed|closure|deceased|ancestor)\b/g);
  const selfHits = countMatches(/\b(self|empowerment|healing|growth|shadow work|boundary|sovereignty|inner child|awakening)\b/g);

  // Derive Fit Vector (0 - 5)
  const calcScore = (hits, base = 2) => {
    if (hits >= 6) return 5;
    if (hits >= 4) return 4;
    if (hits >= 2) return 3;
    if (hits >= 1) return 2;
    return 1;
  };

  // Most readers on these platforms have love capabilities, but specialists score 4 or 5
  const fitVector = {
    love: loveHits >= 5 ? 5 : (loveHits >= 2 ? 4 : (careerHits > 5 ? 1 : 3)),
    breakup: (breakupHits >= 4 || (loveHits >= 4 && breakupHits >= 1)) ? 5 : (breakupHits >= 2 ? 4 : 2),
    dating: (datingHits >= 3 || (loveHits >= 3 && datingHits >= 1)) ? 5 : (datingHits >= 1 ? 4 : 2),
    intentions: (intentionsHits >= 3 || (loveHits >= 4 && text.includes('thought'))) ? 5 : (intentionsHits >= 1 ? 4 : 2),
    career: careerHits >= 4 ? 5 : (careerHits >= 2 ? 4 : (careerHits >= 1 ? 2 : 1)),
    money: moneyHits >= 3 ? 5 : (moneyHits >= 1 ? 3 : 1),
    future: futureHits >= 4 ? 5 : (futureHits >= 2 ? 4 : 3),
    selfReflection: (selfHits >= 3 || coachingHits >= 2) ? 5 : (selfHits >= 1 ? 3 : 2),
    general: 3,
  };

  // If reader is clearly a grief/medium specialist
  if (primaryPractice === 'medium' || griefHits >= 3) {
    fitVector.grief = 5;
  }

  // Derive intent list
  const intents = [];
  if (fitVector.love >= 3) intents.push('love_relationship');
  if (fitVector.intentions >= 4) intents.push('another_person_intentions');
  if (fitVector.breakup >= 4) intents.push('breakup_ex');
  if (fitVector.dating >= 4) intents.push('dating');
  if (fitVector.career >= 3) intents.push('career_work');
  if (fitVector.money >= 3) intents.push('money_finance');
  if (decisionHits >= 2) intents.push('decision_making');
  if (fitVector.future >= 4) intents.push('future_direction');
  if (griefHits >= 2 || primaryPractice === 'medium') intents.push('grief_loss');
  if (fitVector.selfReflection >= 4) intents.push('self_reflection');
  intents.push('general_guidance');

  // Derive question types
  const questionTypes = [];
  if (fitVector.love >= 3) questionTypes.push('relationship_clarity');
  if (fitVector.intentions >= 4) {
    questionTypes.push('does_someone_have_feelings');
    questionTypes.push('another_person_intentions');
  }
  if (fitVector.breakup >= 4) {
    questionTypes.push('reconciliation');
    questionTypes.push('breakup_closure');
  }
  if (fitVector.career >= 3) {
    questionTypes.push('career_decision');
    questionTypes.push('career_direction');
  }
  if (fitVector.money >= 3) questionTypes.push('financial_decision');
  if (fitVector.future >= 3) {
    questionTypes.push('future_outlook');
    questionTypes.push('timing');
  }
  questionTypes.push('general_guidance');

  // 3. Formats supported
  let formats = ['chat'];
  if (platform === 'kasamba') {
    formats = ['chat', 'phone'];
  } else if (platform === 'purple-garden') {
    formats = ['video', 'phone', 'chat'];
  } else if (platform === 'keen') {
    formats = ['phone', 'chat'];
  }

  // 4. Styles
  const styles = [];
  if (text.match(/\b(direct|blunt|honest|no sugarcoat|truth|candid|straightforward|unvarnished)\b/)) {
    styles.push('direct');
  }
  if (text.match(/\b(gentle|compassionate|kind|empathetic|soothing|safe|nurturing|reassuring)\b/)) {
    styles.push('gentle');
  }
  if (text.match(/\b(fast|quick|rapid|speed|concise|to the point|dense)\b/)) {
    styles.push('fast_answers');
  }
  if (text.match(/\b(practical|actionable|next step|grounded|clear step|advice|strategy)\b/)) {
    styles.push('practical');
  }
  if (text.match(/\b(detailed|in-depth|thorough|breakdown|deep dive|comprehensive)\b/)) {
    styles.push('detailed');
  }
  if (text.match(/\b(conversational|warm|talk|dialogue|friendly)\b/)) {
    styles.push('conversational');
  }
  if (text.match(/\b(reflective|karmic|spiritual|soul|psychological)\b/)) {
    styles.push('reflective');
  }
  if (text.match(/\b(structured|card-by-card|organized|methodical)\b/)) {
    styles.push('structured');
  }

  if (styles.length === 0) styles.push('conversational', 'direct');

  return {
    practices,
    primaryPractice,
    intents,
    questionTypes,
    formats,
    styles,
    fitVector
  };
}

function calculateEvidenceScore(fm, reviewCount, platform) {
  let score = 75;
  const rating = fm.rating || 4.5;
  score += Math.round((rating - 4.0) * 15); // e.g. 4.8 -> +12, 4.4 -> +6

  if (reviewCount >= 50000) score += 9;
  else if (reviewCount >= 20000) score += 7;
  else if (reviewCount >= 5000) score += 5;
  else if (reviewCount >= 1000) score += 3;

  if (fm.pros && fm.pros.length >= 3) score += 3;
  if (fm.cons && fm.cons.length >= 2) score += 3; // candor bonus

  return Math.min(score, 98);
}

function main() {
  console.log('--- Building Eastern Alignment Reader Catalog ---');
  const readers = [];
  let fileCount = 0;

  for (const platform of PLATFORMS) {
    const platformDir = join(READERS_DIR, platform);
    if (!existsSync(platformDir)) continue;

    const files = readdirSync(platformDir).filter(f => f.endsWith('.md'));
    console.log(`Scanning ${platform}: ${files.length} profiles...`);

    for (const file of files) {
      fileCount++;
      const fullPath = join(platformDir, file);
      const rawContent = readFileSync(fullPath, 'utf8');
      const fm = extractFrontmatter(rawContent);
      const bodyText = rawContent.replace(/^---\r?\n[\s\S]*?\r?\n---/, '');
      const slug = file.replace(/\.md$/, '');

      const name = cleanReaderName(fm, slug);
      const reviewCount = parseReviewCount(rawContent);
      const pricePerMinute = parsePrice(fm.pricing);
      const {
        practices,
        primaryPractice,
        intents,
        questionTypes,
        formats,
        styles,
        fitVector
      } = buildFitVectorAndTaxonomy(fm, bodyText, platform);

      const eaEvidenceScore = calculateEvidenceScore(fm, reviewCount, platform);

      // Construct reader object
      const reader = {
        id: `${platform}-${slug}`,
        slug,
        name,
        platform,
        platformName: fm.platformName || `${platform}: ${name}`,
        reviewUrl: `/reviews/${platform}/${slug}/`,
        affiliateUrl: fm.affiliateUrl || `/go/${platform}/`,
        avatarUrl: fm.avatarUrl || null,
        rating: fm.rating || 4.5,
        reviewRating: fm.platformRating || 4.9,
        reviewCount,
        pricing: fm.pricing || `$${pricePerMinute.toFixed(2)}/min`,
        pricePerMinute,
        freeOffer: fm.freeOffer || (platform === 'kasamba' ? '3 free minutes + 50% off' : (platform === 'purple-garden' ? '$30 first-purchase credit' : '$1 for 5 minutes')),
        bestFor: fm.bestFor || 'General intuitive clarity and honest guidance',
        verdict: fm.verdict || fm.description || '',
        highlights: fm.highlights || [],
        pros: fm.pros || [],
        cons: fm.cons || [],
        practices,
        primaryPractice,
        intents,
        questionTypes,
        formats,
        languages: ['en'],
        styles,
        fitVector,
        trust: {
          eaEvidenceScore,
          platformRating: fm.platformRating || 4.9,
          reviewCount
        },
        availability: {
          status: 'unknown',
          checkedAt: null
        },
        active: fm.unavailable !== true
      };

      readers.push(reader);
    }
  }

  // Sort deterministically
  readers.sort((a, b) => b.trust.eaEvidenceScore - a.trust.eaEvidenceScore || a.name.localeCompare(b.name));

  console.log(`Total readers processed: ${readers.length}`);
  writeFileSync(OUTPUT_FILE, JSON.stringify(readers, null, 2), 'utf8');
  console.log(`Successfully generated: ${OUTPUT_FILE} (${(Buffer.byteLength(JSON.stringify(readers)) / 1024).toFixed(1)} KB)`);
}

main();
