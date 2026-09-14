import { getUTMData, getAnonymousId } from './attribution';
import type { UserProfile } from './types';

declare global {
  interface Window {
    posthog?: any;
  }
}

const baseProps = () => {
  return {
    anonymous_id: getAnonymousId(),
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    ...getUTMData()
  };
};

const capture = (eventName: string, properties?: any) => {
  try {
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture(eventName, { ...baseProps(), ...properties });
    } else {
      console.log(`[Analytics] ${eventName}`, properties);
    }
  } catch (e) {
    console.error('Analytics capture failed', e);
  }
};

export const matchAnalytics = {
  quizStarted: (source?: string) => {
    capture('match_quiz_started', { source });
  },
  questionAnswered: (questionId: string, optionId: string | string[], stepIndex: number) => {
    capture('match_question_answered', { questionId, optionId, stepIndex });
  },
  quizCompleted: (profile: UserProfile) => {
    capture('match_quiz_completed', { profile_snapshot: profile });
  },
  resultViewed: (profile: UserProfile, narrativeTheme: string) => {
    capture('match_result_viewed', { profile_snapshot: profile, narrativeTheme });
  },
  readerImpression: (readerSlug: string, position: number, matchScore: number | undefined, profile: UserProfile) => {
    capture('match_reader_impression', { readerSlug, position, matchScore, profile_snapshot: profile });
  },
  readerClicked: (readerSlug: string, platform: string, position: number, profile: UserProfile) => {
    capture('match_reader_clicked', { readerSlug, platform, position, profile_snapshot: profile });
  },
  articleImpression: (articleSlug: string, position: number, profile: UserProfile) => {
    capture('match_article_impression', { articleSlug, position, profile_snapshot: profile });
  },
  articleClicked: (articleSlug: string, profile: UserProfile) => {
    capture('match_article_clicked', { articleSlug, profile_snapshot: profile });
  },
  emailFormViewed: (profile: UserProfile) => {
    capture('match_email_form_viewed', { profile_snapshot: profile });
  },
  emailSubmitted: (email: string, profile: UserProfile) => {
    capture('match_email_submitted', { profile_snapshot: profile });
  },
  dailyCardStarted: (profile?: UserProfile) => {
    capture('match_daily_card_started', { profile_snapshot: profile });
  },
  dailyCardCompleted: (cardName: string, profile?: UserProfile) => {
    capture('match_daily_card_completed', { cardName, profile_snapshot: profile });
  },
  backNavigated: (fromQuestion: string, toQuestion: string) => {
    capture('match_back_navigated', { fromQuestion, toQuestion });
  }
};
