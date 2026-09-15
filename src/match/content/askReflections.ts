/**
 * content/askReflections.ts — Ask the Universe 的反思文本库
 *
 * 规格 §16 / §21：
 *   · 不得呈现为事实性的超自然预测
 *   · 必须以 spiritual reflection / symbolic interpretation 的框架出现
 *   · 禁止确定性断言
 *
 * 因此这里的每一段都是「重新框定问题」而不是「回答问题」。
 * 问「他会不会回来」不会得到会/不会，而会得到「这个问题底下还有一个问题」。
 */

import type { Domain, DesiredOutcome, EmotionalState } from '../types';

export interface DomainReflection {
  /** 第 1 段：把问题翻译成它真正在问的东西 */
  opening: string;
  /** 第 2 段：张力 / 底下那层 */
  underneath: string;
  /** 第 3 段：象征性框架 */
  symbolic: string;
  /** 收尾问题 */
  sitWith: string;
  /** 是否属于「高风险」主题，需要额外提示 */
  caution?: string;
}

export const DOMAIN_REFLECTIONS: Record<Domain, DomainReflection> = {
  love: {
    opening:
      'Questions about love are almost never only about the other person. They are usually about whether your own read on the situation can be trusted — which is a much harder thing to check.',
    underneath:
      'What sits beneath a question like this is rarely a shortage of information. It is usually a shortage of permission: permission to want what you want, or to stop waiting for something that has not moved.',
    symbolic:
      'In most reflective traditions, love questions are treated as mirror questions. What you notice about them tends to be a description of what you are currently willing to accept, not a forecast about them.',
    sitWith: 'If nothing about this changed for three months, what would you want to have done with that time?',
  },
  breakup: {
    opening:
      'After an ending, the mind keeps reopening the case — not because the facts changed, but because an unresolved ending does not let your attention close.',
    underneath:
      'The urgent version of the question is usually "will this be restored". The quieter version is usually "does this mean what I thought it meant" — and only the second one is answerable today.',
    symbolic:
      'Endings in reflective work are treated as thresholds rather than verdicts. What feels like a loss of direction is often the space where a direction becomes visible.',
    sitWith: 'What would you need to be true about yourself — not about them — for this to stop being an open case?',
  },
  relationships: {
    opening:
      'When a relationship is difficult, the question you bring is often the third or fourth version of the real one. The first version is usually about the other person; the one that matters is about the pattern.',
    underneath:
      'What is tiring here is usually not the conflict itself but the repetition of it. The same conversation with different wording, and the sense that the thing that would actually change it has never been said out loud.',
    symbolic:
      'Most traditions treat relational friction as information about boundaries rather than evidence of failure. The discomfort marks a line that has not been drawn yet.',
    sitWith: 'What have you been translating into patience that is actually something you need to say?',
  },
  money: {
    opening:
      'Money questions carry a second question inside them, usually about safety, standing, or time. The number is real, but the weight of it is coming from one of those three.',
    underneath:
      'Financial pressure narrows the horizon — when things feel tight, thinking far ahead becomes physically harder. So the problem and the tool for solving it are in short supply at the same moment.',
    symbolic:
      'In reflective practice, material questions are treated as questions about what you are counting. Not everything of value in your life is counted the same way — and that mismatch is often where the unease lives.',
    sitWith: 'Separate this into two columns: what is short of resources, and what is short of a decision. Which column is bigger?',
    caution:
      'Nothing here is financial advice. For decisions about debt, investments, or anything with a contract attached, please talk to a qualified professional.',
  },
  career: {
    opening:
      'Work questions are usually questions about recognition or direction wearing a practical disguise. The practical part is real, but it is rarely the part keeping you up.',
    underneath:
      'What is exhausting is often not the workload but the ambiguity — not knowing whether the effort is building toward anything, or just being absorbed.',
    symbolic:
      'Reflective traditions treat vocation as something you are already doing and have not yet named, rather than a destination to be discovered and then arrived at.',
    sitWith: 'If this work continued exactly as it is for two more years, what would you be most afraid of having given up?',
  },
  family: {
    opening:
      'Family questions arrive with an older layer underneath them. You are not only managing a present situation — you are negotiating with a pattern that was set long before you could question it.',
    underneath:
      'The difficulty is usually not disagreement but obligation: the sense that distance, disagreement, or leaving would cost you something you are not willing to pay.',
    symbolic:
      'In most reflective frameworks, family is treated as the first place you learned what belonging requires. Whatever you learned there shows up in how you handle being needed now.',
    sitWith: 'Which part of this is a present-day problem, and which part is an old rule you have never actually agreed to?',
  },
  spirituality: {
    opening:
      'What you are describing is a common stage: the experience arrives before the language for it does. That gap is uncomfortable, and it is not a sign that you have it wrong.',
    underneath:
      'The tension is usually between wanting confirmation that this is real, and not wanting to look for confirmation because that would make it feel manufactured.',
    symbolic:
      'Reflective traditions generally treat this period as one of the more reliable ones — not because it is pleasant, but because the questions get sharper when the certainty thins out.',
    sitWith: 'If nobody could ever confirm this for you, what would you keep doing anyway?',
  },
  future: {
    opening:
      'The question underneath most questions about the future is not "what will happen" but "can I bear not knowing". Those are different problems, and only one of them can be worked on today.',
    underneath:
      'Waiting is difficult because uncertainty costs attention. The mind keeps spending energy trying to settle a question that has no available answer yet.',
    symbolic:
      'In reflective practice, the future is treated as something you meet rather than something you can audit in advance. What is legible ahead is usually just the next step.',
    sitWith: 'What would you do differently today if you accepted you would not get certainty?',
    caution:
      'Timeframes from any reader are impressions, not schedules. Please don’t make a decision with real consequences on the strength of a predicted date.',
  },
  self_growth: {
    opening:
      'Questions about direction usually surface right before a change rather than after it. The discomfort is often the leading edge of something that has not finished forming.',
    underneath:
      'What is unsettling is that you cannot yet describe the destination — only the fact that the current position is no longer acceptable.',
    symbolic:
      'Reflective traditions treat identity change as a period of confusion before it looks like clarity. That order is normal, not evidence of a wrong turn.',
    sitWith: 'What would you attempt if you gave yourself permission not to know how it turns out?',
  },
  protection: {
    opening:
      'When your energy or your surroundings feel wrong, the honest starting point is to treat the experience as real without assuming its source. The two questions — is this external or internal — have different answers and different responses.',
    underneath:
      'What wears people down here is usually not one dramatic event but a steady drain: giving more than you receive, and not counting it because it never looks dramatic in isolation.',
    symbolic:
      'Most traditions treat boundaries as the ordinary form of protection. Not a shield you find, but a line you maintain.',
    sitWith: 'Where exactly do you notice the drop — is it a place, a person, or a time of day?',
    caution:
      'If what you are describing includes persistent fear, sleep loss, or low mood, those are things a doctor is better positioned for than a reading.',
  },
};

export const OUTCOME_TWIST: Record<DesiredOutcome, string> = {
  clarity: 'You asked for clarity. Notice that clarity about someone else is not something you can obtain — clarity about your own position is.',
  reassurance: 'You asked for reassurance. It is worth asking who you would need to hear it from in order for it to actually land.',
  prediction: 'You asked what will happen. Nothing here can promise a date or an outcome — but the pattern you are asking about is usually more legible than the timeline.',
  closure: 'You asked for closure. Closure rarely arrives from the other side; it is usually something you assemble yourself, with or without their participation.',
  action: 'You asked what to do. The honest answer starts with what you can do without their cooperation — that part is immediately available.',
  validation: 'You asked to be confirmed. Before you get confirmation, it is worth noticing how much of your read you already trust.',
  connection: 'You asked for connection. What is worth examining is not whether it exists, but whether it is mutual in the way you need.',
  control: 'You asked for footing. The part of this you actually control is smaller than you would like, and more real than it feels.',
};

export const EMOTION_TONE: Partial<Record<EmotionalState, string>> = {
  anxiety: 'Since anxiety is loudest right now, note that anxiety is very good at making urgency feel like importance. They are not the same thing.',
  fear: 'Fear tends to narrow the available options before it narrows the facts. Worth checking which one happened first.',
  grief: 'Grief runs on its own schedule and it does not respond well to being managed. That is not failure, it is how it works.',
  hope: 'Hope is not a bias to correct here — it is information about what you actually want, and it is worth taking literally.',
  confusion: 'Confusion is often a sign that two of your own wants are in conflict, not that the situation is unreadable.',
  uncertainty: 'Uncertainty is uncomfortable precisely because it costs attention. Naming that cost is usually the first relief.',
  loneliness: 'Loneliness has a way of making the question feel more urgent than it is. It is worth checking whether the urgency is about them or about the absence.',
  frustration: 'Frustration usually points at a boundary that has not been drawn yet. Worth asking what line you have been avoiding.',
};

/** 什么时候该建议真人解读：问题指向他人且要求时间线/结果时 */
export const HUMAN_READING_TRIGGERS: DesiredOutcome[] = ['prediction', 'action', 'validation'];

export const OPENING_FRAME =
  'Here is one way to read the question underneath the question you asked. Take what is useful and leave the rest.';
