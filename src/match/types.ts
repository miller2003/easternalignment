/**
 * src/match/types.ts
 * Strict TypeScript types for the Eastern Alignment Situation-Based Reader Match Engine.
 */

export type Practice =
  | 'psychic'
  | 'tarot'
  | 'astrology'
  | 'medium'
  | 'numerology'
  | 'spiritual_guidance'
  | 'empath';

export type Intent =
  | 'love_relationship'
  | 'another_person_intentions'
  | 'breakup_ex'
  | 'dating'
  | 'career_work'
  | 'money_finance'
  | 'decision_making'
  | 'future_direction'
  | 'grief_loss'
  | 'self_reflection'
  | 'general_guidance';

export type QuestionType =
  | 'relationship_clarity'
  | 'does_someone_have_feelings'
  | 'another_person_intentions'
  | 'relationship_direction'
  | 'reconciliation'
  | 'breakup_closure'
  | 'career_decision'
  | 'career_direction'
  | 'financial_decision'
  | 'future_outlook'
  | 'timing'
  | 'general_guidance'
  | 'self_understanding'
  | 'emotional_reflection';

export type CommunicationFormat = 'chat' | 'phone' | 'video' | 'no_preference';

export type ReadingStyle =
  | 'direct'
  | 'gentle'
  | 'fast_answers'
  | 'practical'
  | 'detailed'
  | 'conversational'
  | 'reflective'
  | 'structured';

export type Urgency = 'right_now' | 'today' | 'few_days' | 'no_rush';

export type BudgetRange = 'under_20' | '20_to_50' | '50_plus' | 'no_pref';

export interface FitVector {
  love: number;
  breakup: number;
  dating: number;
  intentions: number;
  career: number;
  money: number;
  future: number;
  selfReflection: number;
  general: number;
  grief?: number;
}

export interface ReaderProfile {
  id: string;
  slug: string;
  name: string;
  platform: 'kasamba' | 'keen' | 'purple-garden';
  platformName: string;
  reviewUrl: string;
  affiliateUrl: string;
  avatarUrl: string | null;
  rating: number;
  reviewRating: number;
  reviewCount: number;
  pricing: string;
  pricePerMinute: number;
  freeOffer: string;
  bestFor: string;
  verdict: string;
  highlights: string[];
  pros: string[];
  cons: string[];
  practices: Practice[];
  primaryPractice: Practice;
  intents: Intent[];
  questionTypes: QuestionType[];
  formats: ('chat' | 'phone' | 'video')[];
  languages: string[];
  styles: ReadingStyle[];
  fitVector: FitVector;
  trust: {
    eaEvidenceScore: number;
    platformRating: number;
    reviewCount: number;
  };
  availability: {
    status: 'available' | 'busy' | 'offline' | 'unknown';
    checkedAt: string | null;
  };
  active: boolean;
}

export interface UserAnswers {
  intent: Intent;
  situationSubject: 'myself' | 'another_person' | 'relationship_dynamic' | 'future_event' | 'past_closure' | 'not_sure';
  preferredPractice: Practice | 'open';
  preferredFormat: CommunicationFormat;
  preferredStyles: ReadingStyle[];
  urgency: Urgency;
  budget: BudgetRange;
}

export interface ScoreBreakdown {
  intentScore: number;          // Max 35
  practiceScore: number;        // Max 20
  questionTypeScore: number;    // Max 15
  communicationScore: number;   // Max 10
  styleScore: number;           // Max 8
  budgetScore: number;          // Max 7
  availabilityModifier: number; // Max 5
  totalScore: number;           // Max 100
  isEligible: boolean;
  ineligibilityReason?: string;
}

export interface MatchRecommendation {
  reader: ReaderProfile;
  rank: 1 | 2 | 3;
  matchPercentage: number;
  badge: 'Best Overall Fit' | 'Strong Alternative' | 'Specialist Option';
  scoreBreakdown: ScoreBreakdown;
  whyMatched: string[];
  bestSuitedFor: string;
  whenToSkip: string;
}

export interface DiagnosticDossier {
  coreDynamicTitle: string;
  situationSummary: string;
  underlyingMechanism: string;
  whatIsClear: string[];
  whatIsUnresolved: string[];
  recommendedOpeningQuestion: string;
  scamWarning: string;
  suggestedGuideSlugs: string[];
}

export interface MatchEngineResult {
  answers: UserAnswers;
  diagnosis: DiagnosticDossier;
  topMatches: MatchRecommendation[];
  totalEligibleReaders: number;
  timestamp: string;
}

export interface QuizQuestionOption {
  id: string;
  label: string;
  sublabel?: string;
  icon?: string;
  value: any;
}

export interface QuizQuestion {
  id: keyof UserAnswers | 'welcome';
  stepNumber: number;
  totalSteps: number;
  eyebrow: string;
  title: string;
  subtitle?: string;
  isMultiSelect?: boolean;
  maxSelect?: number;
  options: QuizQuestionOption[];
}
