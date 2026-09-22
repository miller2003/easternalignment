/**
 * src/match/engine/recommend.ts
 * Master coordinator for the Eastern Alignment Reader Match System.
 * Ingests reader catalog and user answers, executes deterministic scoring,
 * selects diverse Top 3 recommendations, and bundles the diagnostic dossier.
 */

import type { ReaderProfile, UserAnswers, MatchEngineResult, MatchRecommendation } from '../types';
import { scoreReader } from './scoring';
import { generateDiagnosis } from './diagnostics';
import { generateReaderExplanation } from './explanations';

export function runMatchEngine(readers: ReaderProfile[], answers: UserAnswers): MatchEngineResult {
  const scoredList: { reader: ReaderProfile; score: ReturnType<typeof scoreReader> }[] = [];

  for (const reader of readers) {
    const score = scoreReader(reader, answers);
    if (score.isEligible) {
      scoredList.push({ reader, score });
    }
  }

  // Primary sort: totalScore desc -> evidenceScore desc -> reviewCount desc
  scoredList.sort((a, b) => {
    if (b.score.totalScore !== a.score.totalScore) {
      return b.score.totalScore - a.score.totalScore;
    }
    if (b.reader.trust.eaEvidenceScore !== a.reader.trust.eaEvidenceScore) {
      return b.reader.trust.eaEvidenceScore - a.reader.trust.eaEvidenceScore;
    }
    return b.reader.reviewCount - a.reader.reviewCount;
  });

  // Pick top 3 with platform / modality diversity consideration
  const topThree: { reader: ReaderProfile; score: ReturnType<typeof scoreReader>; rank: 1 | 2 | 3; badge: 'Best Overall Fit' | 'Strong Alternative' | 'Specialist Option' }[] = [];

  if (scoredList.length > 0) {
    // Rank 1: Absolute highest scoring match
    topThree.push({
      reader: scoredList[0].reader,
      score: scoredList[0].score,
      rank: 1,
      badge: 'Best Overall Fit',
    });
  }

  if (scoredList.length > 1) {
    // Rank 2: Runner up
    topThree.push({
      reader: scoredList[1].reader,
      score: scoredList[1].score,
      rank: 2,
      badge: 'Strong Alternative',
    });
  }

  if (scoredList.length > 2) {
    // Rank 3: Prefer a candidate from a different platform or modality if available within the top 8
    let rank3Index = 2;
    const existingPlatforms = new Set(topThree.map(t => t.reader.platform));
    
    for (let i = 2; i < Math.min(scoredList.length, 10); i++) {
      if (!existingPlatforms.has(scoredList[i].reader.platform) && scoredList[i].score.totalScore >= scoredList[0].score.totalScore - 12) {
        rank3Index = i;
        break;
      }
    }

    topThree.push({
      reader: scoredList[rank3Index].reader,
      score: scoredList[rank3Index].score,
      rank: 3,
      badge: 'Specialist Option',
    });
  }

  // Build recommendation objects
  const topMatches: MatchRecommendation[] = topThree.map((item) => {
    // Scale totalScore slightly so top match feels rewarding (93% - 99%)
    const matchPercentage = Math.min(99, Math.max(82, Math.round(item.score.totalScore * 0.96 + (item.rank === 1 ? 4 : (item.rank === 2 ? 2 : 0)))));
    const explanation = generateReaderExplanation(item.reader, answers, item.score, item.rank);

    return {
      reader: item.reader,
      rank: item.rank,
      matchPercentage,
      badge: item.badge,
      scoreBreakdown: item.score,
      whyMatched: explanation.whyMatched,
      bestSuitedFor: explanation.bestSuitedFor,
      whenToSkip: explanation.whenToSkip,
    };
  });

  const diagnosis = generateDiagnosis(answers);

  return {
    answers,
    diagnosis,
    topMatches,
    totalEligibleReaders: scoredList.length,
    timestamp: new Date().toISOString(),
  };
}
