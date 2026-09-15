/**
 * engine/questions.ts — 测验定义
 *
 * 8 题（规格 §3：6–8 题），逐屏一题，第 2 / 7 题的选项由第 1 题动态决定。
 * 所有打分权重走 config.ts 的命名空间键，不存在跨维度撞键的可能。
 *
 * 题目顺序（2026-09-15 起）：
 *   q1 主题          —— 卡在哪件事上        → domain
 *   q2 具体困境      —— 那件事长什么样      → relationship / domain / emotion
 *   q3 诉求          —— 想要什么            → outcome
 *   q4 机制          —— 你是怎么卡住的      → internal（内部代号，永不外显）
 *   q5 情绪          —— 最强的感觉是什么    → emotion
 *   q6 时长          —— 持续多久            → urgency / temporal
 *   q7 期望支持方式  —— 想从人那里得到什么  → orientation
 *   q8 自由文本      —— 自己的一句话        → 危机检测 / 情境补强 / 锚定句
 *
 * 每个选项都可带 anchorPhrase：用户勾了它，结果页就必须用第二人称
 * 明确引用他的这个选择（规格 §8 的硬要求）。写作时按各自句槽的口吻来写：
 *   q2 → "You told us that ___ ."        (从句)
 *   q4 → (不生成锚定句 —— 机制题必须消失在文案里，见下)
 *   q5 → "the loudest feeling is ___ ."  (名词/形容词短语)
 *   q6 → "on your mind ___ ."            (时间状语)
 *   q3 → "what you're hoping to find is ___ ."  (名词短语)
 *
 * ⚠️ q4 的 anchorPhrase 是**刻意保留但不在锚定句里使用**的：
 * 机制轴的定位是「幕后解释」，一旦在锚定句里复述它，
 * 用户会看到自己被贴了一个分类标签，体验立刻变差。
 * buildAnchor() 因此只读 q2 / q3 / q5 / q6，跳过 q4。
 */

import type { QuizQuestion } from '../types';
import { key } from '../config';

const d = key.domain;
const e = key.emotion;
const r = key.relationship;
const o = key.outcome;
const t = key.temporal;
const u = key.urgency;
const s = key.orientation;
const i = key.internal;

export const getBranchedOptions = (
  optionSets: Record<string, import('../types').QuizOption[]>,
  branchKey?: string,
): import('../types').QuizOption[] => {
  if (!branchKey) return optionSets.unsure ?? [];
  return optionSets[branchKey] ?? optionSets.unsure ?? [];
};

/** 按题目 id 取该题在当前作答下的真实选项 */
export function optionsFor(q: QuizQuestion, answers: Record<string, string | string[]>) {
  if (!q.optionSets) return q.options ?? [];
  return getBranchedOptions(q.optionSets, answers[q.branchFrom ?? ''] as string | undefined);
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  /* ── Q1 ────────────────────────────────────────────────────────── */
  {
    id: 'q1',
    shortLabel: 'What is on your mind',
    text: 'What’s on your mind most right now?',
    subtext: 'Pick whichever one pulls at you first.',
    type: 'single',
    options: [
      { id: 'love', label: 'Love & Relationships', weights: { [d('love')]: 20 }, branchKey: 'love' },
      { id: 'money', label: 'Money & Career', weights: { [d('money')]: 20 }, branchKey: 'money' },
      { id: 'future', label: 'Future & Uncertainty', weights: { [d('future')]: 20 }, branchKey: 'future' },
      { id: 'spirituality', label: 'Spirituality & Signs', weights: { [d('spirituality')]: 20 }, branchKey: 'spirituality' },
      { id: 'direction', label: 'Life Direction', weights: { [d('self_growth')]: 20 }, branchKey: 'direction' },
      { id: 'protection', label: 'Protection & Energy', weights: { [d('protection')]: 20 }, branchKey: 'protection' },
      { id: 'family', label: 'Family & Home', weights: { [d('family')]: 20 }, branchKey: 'family' },
      { id: 'unsure', label: 'I’m not sure', weights: { [e('curiosity')]: 12 }, branchKey: 'unsure' },
    ],
  },

  /* ── Q2 ────────────────────────────────────────────────────────── */
  {
    id: 'q2',
    shortLabel: 'What is hardest',
    text: 'What feels hardest about it?',
    type: 'single',
    branchFrom: 'q1',
    optionSets: {
      love: [
        { id: 'single', label: 'I’m single and wondering what’s ahead for me', anchorPhrase: 'you’re single and wondering what’s ahead', weights: { [r('single')]: 20, [e('curiosity')]: 10, [t('future')]: 12 } },
        { id: 'dating', label: 'I’m seeing someone and don’t know where it’s going', anchorPhrase: 'you’re seeing someone and can’t tell where it’s going', weights: { [r('dating')]: 20, [e('anticipation')]: 12, [t('future')]: 12 } },
        { id: 'talking', label: 'We’re talking, but nothing is defined', anchorPhrase: 'you’re talking to someone but nothing is defined', weights: { [r('talking')]: 20, [e('confusion')]: 12, [e('anticipation')]: 8 } },
        { id: 'relationship', label: 'I’m in a relationship and something feels off', anchorPhrase: 'you’re in a relationship and something feels off', weights: { [r('relationship')]: 20, [e('anxiety')]: 12 } },
        { id: 'breakup', label: 'We recently broke up', anchorPhrase: 'you recently went through a breakup', weights: { [r('recently_separated')]: 22, [d('breakup')]: 20, [e('grief')]: 14, [e('sadness')]: 12, [t('past')]: 14, [i('sudden_loss')]: 14 } },
        { id: 'no_contact', label: 'We’re not talking at all', anchorPhrase: 'communication has stopped completely', weights: { [r('no_contact')]: 22, [d('breakup')]: 12, [e('uncertainty')]: 14, [o('closure')]: 12, [i('sudden_loss')]: 10 } },
        { id: 'thinking', label: 'I can’t stop thinking about someone', anchorPhrase: 'you can’t stop thinking about someone', weights: { [r('thinking_about_someone')]: 20, [e('confusion')]: 12, [e('loneliness')]: 10, [i('illusion_fixation')]: 14 } },
        { id: 'complicated', label: 'It’s complicated and I can’t explain it', anchorPhrase: 'the situation is complicated and hard to put into words', weights: { [r('complicated')]: 20, [e('confusion')]: 14, [e('frustration')]: 10, [i('illusion_fixation')]: 8 } },
      ],
      money: [
        { id: 'job_search', label: 'I’m looking for work', anchorPhrase: 'you’re looking for work', weights: { [d('career')]: 20, [e('anticipation')]: 12, [t('future')]: 12 } },
        { id: 'lost_job', label: 'I lost my job', anchorPhrase: 'you lost your job recently', weights: { [d('career')]: 22, [e('anxiety')]: 18, [e('grief')]: 10, [t('past')]: 12, [i('sudden_loss')]: 12 } },
        { id: 'debt', label: 'I’m carrying money pressure', anchorPhrase: 'money pressure has been building', weights: { [d('money')]: 22, [e('anxiety')]: 18, [e('fear')]: 12, [i('scarcity_panic')]: 14 } },
        { id: 'stuck', label: 'My work feels like a dead end', anchorPhrase: 'your work feels like a dead end', weights: { [d('career')]: 20, [e('frustration')]: 18, [i('stagnation_void')]: 12 } },
        { id: 'business', label: 'I’m building something of my own', anchorPhrase: 'you’re building something of your own', weights: { [d('career')]: 20, [e('excitement')]: 12, [e('hope')]: 10, [t('future')]: 12 } },
        { id: 'direction', label: 'I don’t know what I want to do next', anchorPhrase: 'you don’t know what you want to do next', weights: { [d('self_growth')]: 16, [d('career')]: 10, [e('confusion')]: 16, [i('stagnation_void')]: 12 } },
      ],
      future: [
        { id: 'feeling_stuck', label: 'I feel stuck', anchorPhrase: 'you feel stuck', weights: { [e('frustration')]: 20, [t('present')]: 18, [i('stagnation_void')]: 14 } },
        { id: 'big_choice', label: 'I have a big decision to make', anchorPhrase: 'you have a big decision in front of you', weights: { [e('confusion')]: 18, [e('anxiety')]: 12, [o('action')]: 12, [t('future')]: 12, [i('choice_friction')]: 20 } },
        { id: 'need_change', label: 'I need a change but don’t know what', anchorPhrase: 'you need a change but can’t name it yet', weights: { [d('self_growth')]: 16, [e('curiosity')]: 14, [e('frustration')]: 10, [i('stagnation_void')]: 10 } },
        { id: 'worry', label: 'I’m carrying a low-lying worry', anchorPhrase: 'a low-lying worry has been sitting with you', weights: { [e('anxiety')]: 22, [e('fear')]: 12, [i('scarcity_panic')]: 16 } },
        { id: 'shift', label: 'I can feel a shift coming', anchorPhrase: 'you can feel a shift coming', weights: { [e('anticipation')]: 20, [e('hope')]: 12, [t('future')]: 14 } },
        { id: 'timing', label: 'I want to know when something will happen', anchorPhrase: 'you want to know when something will happen', weights: { [o('prediction')]: 20, [t('future')]: 16, [e('anticipation')]: 12 } },
      ],
      direction: [
        { id: 'lost_purpose', label: 'I don’t know my purpose anymore', anchorPhrase: 'you’ve lost your sense of purpose', weights: { [d('self_growth')]: 20, [e('confusion')]: 18, [e('sadness')]: 10, [i('stagnation_void')]: 12 } },
        { id: 'new_chapter', label: 'I’m starting a new chapter', anchorPhrase: 'you’re starting a new chapter', weights: { [d('self_growth')]: 20, [e('anticipation')]: 16, [e('excitement')]: 10 } },
        { id: 'bored', label: 'I feel flat and disconnected from my life', anchorPhrase: 'you feel flat and disconnected', weights: { [d('self_growth')]: 16, [e('frustration')]: 16, [i('stagnation_void')]: 14 } },
        { id: 'healing', label: 'I’m trying to heal something', anchorPhrase: 'you’re trying to heal something', weights: { [d('self_growth')]: 20, [e('hope')]: 12, [t('past')]: 12, [i('sudden_loss')]: 8 } },
        { id: 'creative', label: 'I want to create again', anchorPhrase: 'you want to create again', weights: { [d('self_growth')]: 16, [e('curiosity')]: 14 } },
        { id: 'deeper_path', label: 'I want to go deeper spiritually', anchorPhrase: 'you want to go deeper spiritually', weights: { [d('spirituality')]: 20, [d('self_growth')]: 10 } },
      ],
      spirituality: [
        { id: 'seeing_signs', label: 'I keep noticing signs or repeating numbers', anchorPhrase: 'you keep noticing signs and repeating numbers', weights: { [d('spirituality')]: 20, [e('curiosity')]: 18 } },
        { id: 'awakening', label: 'Something in me is waking up', anchorPhrase: 'something in you is waking up', weights: { [d('spirituality')]: 22, [e('confusion')]: 12, [d('self_growth')]: 10 } },
        { id: 'dreams', label: 'My dreams have become vivid or strange', anchorPhrase: 'your dreams have become vivid or strange', weights: { [d('spirituality')]: 18, [e('curiosity')]: 16 } },
        { id: 'intuition', label: 'I want to trust my intuition', anchorPhrase: 'you want to trust your intuition', weights: { [d('spirituality')]: 16, [d('self_growth')]: 14 } },
        { id: 'guides', label: 'I want to feel connected to something larger', anchorPhrase: 'you want to feel connected to something larger', weights: { [d('spirituality')]: 20, [e('hope')]: 12, [o('connection')]: 12 } },
        { id: 'disconnected', label: 'I feel cut off from my spirituality', anchorPhrase: 'you feel cut off from your spirituality', weights: { [d('spirituality')]: 16, [e('sadness')]: 16, [e('grief')]: 10 } },
      ],
      family: [
        { id: 'conflict', label: 'There’s ongoing conflict at home', anchorPhrase: 'there’s ongoing conflict at home', weights: { [d('family')]: 22, [e('anxiety')]: 18, [e('frustration')]: 12 } },
        { id: 'boundaries', label: 'I need to set boundaries with family', anchorPhrase: 'you need to set boundaries with family', weights: { [d('family')]: 20, [d('self_growth')]: 12, [o('action')]: 12, [i('boundary_invasion')]: 16 } },
        { id: 'conceive', label: 'We’re trying to conceive', anchorPhrase: 'you’re hoping to conceive', weights: { [d('family')]: 22, [e('anticipation')]: 18, [e('hope')]: 14 } },
        { id: 'parenting', label: 'Parenting is wearing me down', anchorPhrase: 'parenting is wearing you down', weights: { [d('family')]: 20, [e('frustration')]: 16, [e('anxiety')]: 10, [i('boundary_invasion')]: 8 } },
        { id: 'estranged', label: 'I’m distanced from someone in my family', anchorPhrase: 'you’re distanced from someone in your family', weights: { [d('family')]: 22, [e('grief')]: 18, [e('sadness')]: 12, [t('past')]: 10, [i('sudden_loss')]: 8 } },
        { id: 'caregiving', label: 'I’m caring for someone who is unwell', anchorPhrase: 'you’re caring for someone who is unwell', weights: { [d('family')]: 22, [e('anxiety')]: 14, [e('sadness')]: 12, [i('boundary_invasion')]: 10 } },
      ],
      protection: [
        { id: 'bad_luck', label: 'I feel like something is working against me', anchorPhrase: 'it feels like something is working against you', weights: { [d('protection')]: 22, [e('fear')]: 16, [e('anxiety')]: 12 } },
        { id: 'toxic_person', label: 'There’s someone in my life who drains me', anchorPhrase: 'someone in your life is draining you', weights: { [d('protection')]: 20, [e('frustration')]: 16, [i('boundary_invasion')]: 12 } },
        { id: 'heaviness', label: 'I’ve been feeling heavy and drained', anchorPhrase: 'you’ve been feeling heavy and drained', weights: { [d('protection')]: 20, [e('sadness')]: 14, [i('boundary_invasion')]: 10 } },
        { id: 'presence', label: 'I keep sensing something I can’t explain', anchorPhrase: 'you keep sensing something you can’t explain', weights: { [d('protection')]: 18, [d('spirituality')]: 14, [e('fear')]: 16 } },
        { id: 'cleansing', label: 'I want to clear my space and my head', anchorPhrase: 'you want to clear your space and your head', weights: { [d('protection')]: 18, [o('action')]: 12, [e('curiosity')]: 12 } },
        { id: 'boundaries_energy', label: 'I give too much of myself away', anchorPhrase: 'you give too much of yourself away', weights: { [d('protection')]: 16, [d('self_growth')]: 16, [e('frustration')]: 12, [i('boundary_invasion')]: 18 } },
      ],
      unsure: [
        { id: 'just_curious', label: 'I’m mostly curious', anchorPhrase: 'you’re mostly curious', weights: { [e('curiosity')]: 20 } },
        { id: 'need_help', label: 'I need help and I don’t know where to start', anchorPhrase: 'you need help and don’t know where to start', weights: { [d('self_growth')]: 16, [e('sadness')]: 14, [e('confusion')]: 12 } },
        { id: 'overwhelmed', label: 'Too much is happening to explain', anchorPhrase: 'too much is happening to explain', weights: { [d('self_growth')]: 16, [e('anxiety')]: 20, [e('confusion')]: 16, [i('scarcity_panic')]: 10 } },
        { id: 'drawn_here', label: 'I felt drawn here', anchorPhrase: 'you felt drawn here', weights: { [d('spirituality')]: 16, [e('curiosity')]: 14 } },
        { id: 'flat', label: 'I just feel flat', anchorPhrase: 'you’ve been feeling flat', weights: { [d('self_growth')]: 14, [e('frustration')]: 14, [e('sadness')]: 12, [i('stagnation_void')]: 12 } },
        { id: 'other', label: 'Something else entirely', anchorPhrase: 'something else is going on', weights: { [e('curiosity')]: 10 } },
      ],
    },
  },

  /* ── Q3 ────────────────────────────────────────────────────────── */
  {
    id: 'q3',
    shortLabel: 'What you want',
    text: 'What do you want most right now?',
    subtext: 'Choose up to two.',
    type: 'multi',
    maxSelect: 2,
    options: [
      { id: 'clarity', label: 'Clarity', anchorPhrase: 'clarity', weights: { [o('clarity')]: 20, [t('present')]: 6 } },
      { id: 'reassurance', label: 'Reassurance', anchorPhrase: 'reassurance', weights: { [o('reassurance')]: 20, [e('anxiety')]: 8 } },
      { id: 'prediction', label: 'To know what may happen next', anchorPhrase: 'a sense of what may happen next', weights: { [o('prediction')]: 20, [t('future')]: 16, [e('anticipation')]: 8 } },
      { id: 'closure', label: 'Closure', anchorPhrase: 'closure', weights: { [o('closure')]: 20, [t('past')]: 16, [e('grief')]: 8 } },
      { id: 'guidance', label: 'Guidance on what to do', anchorPhrase: 'guidance on what to do', weights: { [o('action')]: 20, [t('future')]: 10 } },
      { id: 'confirmation', label: 'Confirmation of what I already sense', anchorPhrase: 'confirmation of what you already sense', weights: { [o('validation')]: 20, [e('uncertainty')]: 10 } },
      { id: 'perspective', label: 'A fresh perspective', anchorPhrase: 'a fresh perspective', weights: { [o('clarity')]: 12, [e('curiosity')]: 10 } },
    ],
  },

  /* ── Q4 ────────────────────────────────────────────────────────── */
  /*
   * 机制识别题（第 4 题）。
   *
   * 设计纪律：题干与选项全部用**用户自己的语言**描述「卡住的样子」，
   * 绝不能出现机制代号、进化论词汇或任何后台分类名 ——
   * 用户看到的必须是一个正常的人在描述自己的处境，
   * 而不是一份心理量表。
   *
   * 为什么单独设一题而不是复用 q2 / q4：
   *   机制轴与「具体困境」（q2）、「表面情绪」（q4）三者正交。
   *   同样是 no_contact，一个人是真失去了（sudden_loss），
   *   一个是对象不可得（illusion_fixation）。用 q2 推不出来。
   *   硬塞进现有题目会让识别精度退化到不可用。
   *
   * 选项顺序刻意打散：按 (关系类 / 选择类 / 消耗类 / 停摆类) 交错排列，
   * 避免同类集中让用户看出「这是在给我分类」。
   *
   * 每题 30 分的专设题权重，远高于辅助路径（12–22 分），
   * 因此本题的作答几乎总是决定性的 —— 这是刻意的：
   * 辅助权重只负责在用户没答本题时兜底，以及在多选题里做细微区分。
   */
  {
    id: 'q4',
    shortLabel: 'How it holds you',
    text: 'Which of these sounds most like what’s actually going on?',
    subtext: 'Not what you think you should say — the one that makes you wince a little.',
    type: 'single',
    options: [
      {
        id: 'churning',
        label: 'I keep going over the same thing and getting nowhere',
        anchorPhrase: 'you keep going over the same thing without getting anywhere',
        weights: { [i('illusion_fixation')]: 30, [e('uncertainty')]: 10 },
      },
      {
        id: 'two_roads',
        label: 'I have a decision to make and I keep not making it',
        anchorPhrase: 'you have a decision you keep not making',
        weights: { [i('choice_friction')]: 30, [e('confusion')]: 10, [o('action')]: 8 },
      },
      {
        id: 'drained_giving',
        label: 'I give a lot to people and get very little back',
        anchorPhrase: 'you give a lot and get little back',
        weights: { [i('boundary_invasion')]: 30, [e('frustration')]: 10 },
      },
      {
        id: 'cant_start',
        label: 'I know what I should do, I just can’t make myself start',
        anchorPhrase: 'you know what to do but can’t make yourself start',
        weights: { [i('stagnation_void')]: 30, [e('frustration')]: 10 },
      },
      {
        id: 'holding_grief',
        label: 'Something ended and I haven’t really let it end',
        anchorPhrase: 'something ended and you haven’t let it end',
        weights: { [i('sudden_loss')]: 30, [e('grief')]: 12, [t('past')]: 10 },
      },
      {
        id: 'same_person',
        label: 'I keep going back to someone I know is bad for me',
        anchorPhrase: 'you keep going back to someone you know is bad for you',
        weights: { [i('toxic_loop')]: 30, [e('uncertainty')]: 10 },
      },
      {
        id: 'always_alert',
        label: 'I’m always braced for something to go wrong, even when nothing has',
        anchorPhrase: 'you’re always braced for something to go wrong',
        weights: { [i('scarcity_panic')]: 30, [e('anxiety')]: 12, [e('fear')]: 10 },
      },
      {
        id: 'smaller',
        label: 'I downplay myself before anyone else gets the chance',
        anchorPhrase: 'you downplay yourself before anyone else can',
        weights: { [i('identity_crisis')]: 30, [e('uncertainty')]: 8 },
      },
    ],
  },

  /* ── Q5 ────────────────────────────────────────────────────────── */

  {
    id: 'q5',
    shortLabel: 'How you feel',
    text: 'What feeling is strongest right now?',
    subtext: 'Choose up to two.',
    type: 'multi',
    maxSelect: 2,
    options: [
      { id: 'hope', label: 'Hope', anchorPhrase: 'hope', weights: { [e('hope')]: 20 } },
      { id: 'curiosity', label: 'Curiosity', anchorPhrase: 'curiosity', weights: { [e('curiosity')]: 20 } },
      { id: 'confusion', label: 'Confusion', anchorPhrase: 'confusion', weights: { [e('confusion')]: 20 } },
      { id: 'fear', label: 'Fear', anchorPhrase: 'fear', weights: { [e('fear')]: 20 } },
      { id: 'sadness', label: 'Sadness', anchorPhrase: 'sadness', weights: { [e('sadness')]: 20 } },
      { id: 'excitement', label: 'Excitement', anchorPhrase: 'excitement', weights: { [e('excitement')]: 20 } },
      { id: 'frustration', label: 'Frustration', anchorPhrase: 'frustration', weights: { [e('frustration')]: 20 } },
      { id: 'uncertainty', label: 'Uncertainty', anchorPhrase: 'uncertainty', weights: { [e('uncertainty')]: 20 } },
      { id: 'loneliness', label: 'Loneliness', anchorPhrase: 'loneliness', weights: { [e('loneliness')]: 20 } },
      { id: 'anticipation', label: 'Anticipation', anchorPhrase: 'anticipation', weights: { [e('anticipation')]: 20 } },
    ],
  },

  /* ── Q6 ────────────────────────────────────────────────────────── */
  {
    id: 'q6',
    shortLabel: 'How long',
    text: 'How long has this been on your mind?',
    type: 'single',
    options: [
      { id: 'today', label: 'Just today', anchorPhrase: 'just today', weights: { [u('high')]: 3, [t('present')]: 12 } },
      { id: 'few_days', label: 'A few days', anchorPhrase: 'for a few days', weights: { [u('high')]: 2, [t('present')]: 16 } },
      { id: 'few_weeks', label: 'A few weeks', anchorPhrase: 'for a few weeks', weights: { [u('medium')]: 3, [t('present')]: 12, [t('past')]: 8 } },
      { id: 'few_months', label: 'A few months', anchorPhrase: 'for a few months', weights: { [u('medium')]: 2, [t('past')]: 18 } },
      { id: 'long_time', label: 'A long time — longer than I’d like', anchorPhrase: 'for longer than you’d like', weights: { [u('low')]: 3, [t('past')]: 22 } },
    ],
  },

  /* ── Q7 ────────────────────────────────────────────────────────── */
  {
    id: 'q7',
    shortLabel: 'What kind of support',
    text: 'If you had someone to talk to about this, what would you want from them?',
    type: 'single',
    branchFrom: 'q1',
    optionSets: {
      love: [
        { id: 'warm_reframe', label: 'Someone warm who helps me see it differently', anchorPhrase: '', weights: { [s('open')]: 10 } },
        { id: 'direct_read', label: 'Someone direct who tells me what they pick up', anchorPhrase: '', weights: { [s('experienced')]: 10, [o('validation')]: 8 } },
        { id: 'practical', label: 'Practical advice I can actually use', anchorPhrase: '', weights: { [s('skeptical')]: 10, [o('action')]: 10 } },
        { id: 'spiritual_frame', label: 'A spiritual or symbolic reading', anchorPhrase: '', weights: { [s('spiritual')]: 12 } },
      ],
      money: [
        { id: 'forecast', label: 'A read on how the next stretch looks', anchorPhrase: '', weights: { [t('future')]: 10, [o('prediction')]: 10 } },
        { id: 'blocks', label: 'Help seeing what’s blocking me', anchorPhrase: '', weights: { [s('open')]: 10, [o('clarity')]: 10 } },
        { id: 'steps', label: 'Concrete next steps', anchorPhrase: '', weights: { [s('skeptical')]: 10, [o('action')]: 12 } },
        { id: 'grounding', label: 'Something to steady me while I wait', anchorPhrase: '', weights: { [s('curious')]: 10, [e('anxiety')]: 8 } },
      ],
      future: [
        { id: 'timeline', label: 'A read on timing', anchorPhrase: '', weights: { [o('prediction')]: 14, [t('future')]: 10 } },
        { id: 'meaning', label: 'Help making sense of what I’m feeling', anchorPhrase: '', weights: { [s('open')]: 10, [o('clarity')]: 10 } },
        { id: 'signs', label: 'To look for signs together', anchorPhrase: '', weights: { [s('spiritual')]: 12 } },
        { id: 'ground', label: 'Someone to bring me back to solid ground', anchorPhrase: '', weights: { [s('curious')]: 10, [t('present')]: 8 } },
      ],
      direction: [
        { id: 'purpose', label: 'A deeper read on my path', anchorPhrase: '', weights: { [s('experienced')]: 12 } },
        { id: 'practical_path', label: 'Something practical I can act on', anchorPhrase: '', weights: { [s('skeptical')]: 10, [o('action')]: 10 } },
        { id: 'inner_work', label: 'Support for inner work', anchorPhrase: '', weights: { [s('open')]: 10, [d('self_growth')]: 8 } },
        { id: 'gentle', label: 'Gentle encouragement', anchorPhrase: '', weights: { [s('curious')]: 10, [e('sadness')]: 8 } },
      ],
      spirituality: [
        { id: 'experienced_reader', label: 'Someone experienced in this territory', anchorPhrase: '', weights: { [s('experienced')]: 16 } },
        { id: 'energy', label: 'Energy work or clearing', anchorPhrase: '', weights: { [s('spiritual')]: 12 } },
        { id: 'understanding', label: 'A grounded explanation of what I’m experiencing', anchorPhrase: '', weights: { [s('curious')]: 12, [o('clarity')]: 8 } },
        { id: 'companion', label: 'Someone to explore alongside me', anchorPhrase: '', weights: { [s('open')]: 10 } },
      ],
      family: [
        { id: 'dynamics', label: 'Help understanding the dynamic', anchorPhrase: '', weights: { [s('open')]: 10, [o('clarity')]: 10 } },
        { id: 'boundaries_help', label: 'Support around boundaries', anchorPhrase: '', weights: { [s('skeptical')]: 10, [o('action')]: 10 } },
        { id: 'lineage', label: 'A read on patterns that run deeper than this', anchorPhrase: '', weights: { [s('experienced')]: 12, [t('past')]: 8 } },
        { id: 'peace', label: 'Someone who can help me find peace with it', anchorPhrase: '', weights: { [s('curious')]: 10, [o('closure')]: 10 } },
      ],
      protection: [
        { id: 'clearing', label: 'Clearing and grounding work', anchorPhrase: '', weights: { [s('spiritual')]: 12 } },
        { id: 'diagnose', label: 'Someone to help me understand what’s at play', anchorPhrase: '', weights: { [s('open')]: 10, [o('clarity')]: 10 } },
        { id: 'practical_steps', label: 'Practical steps I can take myself', anchorPhrase: '', weights: { [s('skeptical')]: 10, [o('action')]: 10 } },
        { id: 'reassurance', label: 'Someone to tell me I’m not imagining it', anchorPhrase: '', weights: { [s('curious')]: 10, [o('validation')]: 12 } },
      ],
      unsure: [
        { id: 'general', label: 'A general read to see what comes up', anchorPhrase: '', weights: { [s('curious')]: 10 } },
        { id: 'comfort', label: 'Something kind and steadying', anchorPhrase: '', weights: { [s('open')]: 10, [o('reassurance')]: 10 } },
        { id: 'truth', label: 'Honesty, even if it isn’t what I want to hear', anchorPhrase: '', weights: { [s('skeptical')]: 10, [o('clarity')]: 10 } },
        { id: 'look_around', label: 'I’m still just looking around', anchorPhrase: '', weights: { [s('curious')]: 12 } },
      ],
    },
  },

  /* ── Q8 ────────────────────────────────────────────────────────── */
  {
    id: 'q8',
    shortLabel: 'In your own words',
    text: 'If you could get one answer right now, what would you ask?',
    subtext: 'Write it the way you’d say it out loud. This is only for you — we use it to shape your reading.',
    type: 'freetext',
    optional: true,
    placeholder: 'e.g. Should I reach out to him, or let it go?',
  },
];
