/**
 * types.ts - Core type definitions for the Spiritual Intent Router
 */

export type Domain =
  | 'love' | 'breakup' | 'relationships' | 'money' | 'career'
  | 'family' | 'spirituality' | 'future' | 'self_growth' | 'protection';

export type EmotionalState =
  | 'curiosity' | 'hope' | 'anxiety' | 'fear' | 'confusion'
  | 'grief' | 'excitement' | 'loneliness' | 'frustration'
  | 'anticipation' | 'uncertainty' | 'sadness';

export type TemporalOrientation = 'past' | 'present' | 'future';

export type DesiredOutcome =
  | 'clarity' | 'reassurance' | 'prediction' | 'closure'
  | 'action' | 'validation' | 'connection' | 'control';

export type RelationshipState =
  | 'single' | 'talking' | 'dating' | 'relationship'
  | 'recently_separated' | 'no_contact' | 'complicated' | 'thinking_about_someone';

export type Urgency = 'low' | 'medium' | 'high';

export type SpiritualOrientation =
  | 'curious' | 'open' | 'spiritual' | 'experienced' | 'skeptical' | 'experienced_user';

export interface WeightedTag { [dimension: string]: number; }

export interface QuizOption {
  id: string;
  label: string;
  weights: WeightedTag;
  branchKey?: string;
}

export type QuestionType = 'single' | 'multi' | 'freetext';

export interface QuizQuestion {
  id: string;
  text: string;
  subtext?: string;
  type: QuestionType;
  options?: QuizOption[];
  branchFrom?: string;
  optionSets?: Record<string, QuizOption[]>;
}

export interface SessionAnswers {
  [questionId: string]: string | string[];
}

export interface UserProfile {
  primary_domain: Domain;
  secondary_domain?: Domain;
  emotional_states: EmotionalState[];
  relationship_state?: RelationshipState;
  desired_outcomes: DesiredOutcome[];
  temporal_orientation: TemporalOrientation;
  urgency: Urgency;
  spiritual_orientation: SpiritualOrientation;
  loss_or_change?: string;
  freeTextAnswer?: string;
  rawScores: Record<string, number>;
  normalizedScores: Record<string, number>;
  createdAt: string;
  sessionId: string;
}

export interface NarrativeBlock {
  key: string;
  theme: string;
  summary: string[];
  deeperQuestion: string;
  whatNext: string[];
  explicitAnchorField: string;
}

export type CommercialIntent = 'high' | 'medium' | 'low';

export interface ArticleMetadata {
  slug: string;
  title: string;
  url: string;
  primary_domain: Domain;
  secondary_topics: Domain[];
  emotional_states: EmotionalState[];
  relationship_states: RelationshipState[];
  desired_outcomes: DesiredOutcome[];
  temporal_orientation: TemporalOrientation[];
  commercial_intent: CommercialIntent;
  recommended_reader_type?: string;
}

export interface ReaderMatchMetadata {
  slug: string;
  platform: string;
  displayName: string;
  specialties: Domain[];
  relationship_states: RelationshipState[];
  style: string[];
  availability: boolean;
  rating: number;
  affiliateUrl: string;
  avatarUrl?: string;
  bestFor?: string;
  pricing?: string;
  freeOffer?: string;
  matchScore?: number;
}

export interface RecommendationResult {
  recommended_readers: ReaderMatchMetadata[];
  recommended_articles: ArticleMetadata[];
  recommended_email_topic: string;
  narrative: NarrativeBlock;
}

export interface TarotCard {
  id: string;
  name: string;
  suit: 'major' | 'wands' | 'cups' | 'swords' | 'pentacles';
  number: number;
  symbolicMeaning: string;
  reflection: string;
  domainReflections?: Partial<Record<Domain, string>>;
}

export interface DailyCardSession {
  date: string;
  card: TarotCard;
  interpretation: string;
  profile?: UserProfile;
}

export interface UTMData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export interface AnalyticsContext {
  anonymous_id: string;
  session_id: string;
  timestamp: string;
  source?: string;
  landing_page?: string;
  utm: UTMData;
  profile_snapshot?: Partial<UserProfile>;
}
