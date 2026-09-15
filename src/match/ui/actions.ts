/**
 * ui/actions.ts — 界面层与控制器之间的唯一契约
 *
 * 规格 §22：UI 不得内嵌业务逻辑。
 * 界面只负责「渲染状态 + 上报用户动作」，所有判断都在控制器与引擎里。
 */

import type {
  RecommendationResult, ScoredReader, UserProfile, SessionAnswers,
  AskUniverseResult, TarotCard,
} from '../types';
import type { CardInterpretation } from '../engine/dailyCard';
import type { ProfileSnapshot } from '../engine/scoring';

export interface ScreenState {
  screen: 'landing' | 'assessment' | 'computing' | 'result' | 'card' | 'ask' | 'degraded';
  questionIndex: number;
  answers: SessionAnswers;
  profile?: UserProfile;
  recs?: RecommendationResult;
  restoredProfile?: UserProfile;
  restoredTheme?: string;
  activeCard?: { card: TarotCard; interpretation: CardInterpretation; streak: number };
  askResult?: AskUniverseResult;
  askCaution?: string;
  emailState: 'idle' | 'sending' | 'ok' | 'error';
  emailMessage?: string;
  resultToken?: string;
  /**
   * 危机拦截。为 true 时结果页只渲染求助资源，不渲染画像、推荐、读者或邮件。
   * 由控制器在 finishQuiz / submitAsk 命中危机信号时置位。
   */
  crisis?: boolean;
}

export interface MatchActions {
  /* 导航 */
  startQuiz: (source: string) => void;
  goToCard: (source: string) => void;
  goToAsk: () => void;
  resumePrevious: () => void;
  restart: () => void;
  /** 从工具页回到已经算好的结果页（不重新作答） */
  backToResult: () => void;

  /* 测验 */
  selectOption: (questionId: string, optionId: string) => void;
  setFreeText: (value: string) => void;
  next: () => void;
  back: () => void;
  skipFreeText: () => void;

  /* 结果页 */
  copyResultLink: () => void;
  readerClicked: (reader: ScoredReader, position: number, impression?: boolean) => void;
  articleClicked: (slug: string, position: number, isFlagship: boolean, url: string) => void;
  sectionViewed: (section: string, scrollPct: number) => void;
  readerImpression: (reader: ScoredReader, position: number) => void;
  articleImpression: (slug: string, position: number, isFlagship: boolean) => void;
  emailFormViewed: () => void;
  submitEmail: (email: string, consent: boolean) => void;

  /* 工具 */
  drawCard: () => void;
  submitAsk: (question: string) => void;
}

export type { ProfileSnapshot };
