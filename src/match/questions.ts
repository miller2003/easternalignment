import type { QuizQuestion, QuizOption } from './types';

export const getBranchedOptions = (options: Record<string, QuizOption[]>, branchKey?: string): QuizOption[] => {
  if (!branchKey) return options['unsure'] || [];
  return options[branchKey] || options['unsure'] || [];
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    text: 'What brings you here today?',
    type: 'single',
    options: [
      { id: 'love', label: 'Love & Relationships', weights: { love: 20 }, branchKey: 'love' },
      { id: 'money', label: 'Money & Career', weights: { money: 20 }, branchKey: 'money' },
      { id: 'future', label: 'Future & Uncertainty', weights: { future: 20 }, branchKey: 'future' },
      { id: 'spirituality', label: 'Spirituality & Signs', weights: { spirituality: 20 }, branchKey: 'spirituality' },
      { id: 'direction', label: 'Life Direction', weights: { self_growth: 20 }, branchKey: 'direction' },
      { id: 'protection', label: 'Protection & Energy', weights: { protection: 20 }, branchKey: 'protection' },
      { id: 'family', label: 'Family & Home', weights: { family: 20 }, branchKey: 'family' },
      { id: 'unsure', label: 'I\'m not sure', weights: { curiosity: 10 }, branchKey: 'unsure' },
    ]
  },
  {
    id: 'q2',
    text: 'Can you tell me a little more about what\'s going on?',
    type: 'single',
    branchFrom: 'q1',
    optionSets: {
      love: [
        { id: 'single', label: 'I\'m single and wondering about my prospects', weights: { relationship_single: 20, curiosity: 10, future: 10 } },
        { id: 'dating', label: 'I\'m dating someone and want to know where it\'s going', weights: { relationship_dating: 20, anticipation: 10 } },
        { id: 'talking', label: 'We are just talking', weights: { relationship_talking: 20, anticipation: 10 } },
        { id: 'relationship', label: 'I\'m in a relationship and have concerns', weights: { relationship_relationship: 20, anxiety: 10 } },
        { id: 'breakup', label: 'I recently went through a breakup', weights: { relationship_recently_separated: 20, breakup: 20, grief: 10, sadness: 10 } },
        { id: 'thinking', label: 'I can\'t stop thinking about someone', weights: { relationship_thinking_about_someone: 20, confusion: 10 } },
      ],
      money: [
        { id: 'job_search', label: 'I\'m looking for a new job', weights: { career: 20, anticipation: 10, future: 10 } },
        { id: 'promotion', label: 'I want a promotion or raise', weights: { career: 15, hope: 10 } },
        { id: 'debt', label: 'I\'m struggling with debt', weights: { money: 20, anxiety: 15, fear: 10 } },
        { id: 'business', label: 'I\'m starting a business', weights: { career: 20, excitement: 10, hope: 10 } },
        { id: 'lost_job', label: 'I lost my job', weights: { career: 20, anxiety: 20, grief: 10, past: 10 } },
        { id: 'investments', label: 'I want to know about investments', weights: { money: 15, future: 10 } },
      ],
      future: [
        { id: 'feeling_stuck', label: 'I feel stuck', weights: { frustration: 20, present: 20 } },
        { id: 'big_choice', label: 'I have a big decision to make', weights: { confusion: 20, anxiety: 10, future: 10 } },
        { id: 'need_change', label: 'I need a change but don\'t know what', weights: { curiosity: 15, frustration: 10 } },
        { id: 'moving', label: 'I am moving or thinking of moving', weights: { anticipation: 15, future: 10 } },
        { id: 'general_worry', label: 'I\'m just worried about the world', weights: { anxiety: 20, fear: 10 } },
        { id: 'excited', label: 'I feel a shift coming and I am excited', weights: { excitement: 20, hope: 10, future: 10 } },
      ],
      direction: [
        { id: 'lost_purpose', label: 'I don\'t know my purpose anymore', weights: { confusion: 20, sadness: 10, self_growth: 15 } },
        { id: 'new_chapter', label: 'I am starting a new chapter', weights: { excitement: 10, anticipation: 15, self_growth: 10 } },
        { id: 'bored', label: 'I feel bored with life', weights: { frustration: 15, self_growth: 10 } },
        { id: 'healing', label: 'I am focused on healing', weights: { self_growth: 20, hope: 10, past: 10 } },
        { id: 'creative', label: 'I want to be more creative', weights: { self_growth: 15, curiosity: 10 } },
        { id: 'spiritual_path', label: 'I want to deepen my spiritual path', weights: { spirituality: 20, self_growth: 10 } },
      ],
      spirituality: [
        { id: 'seeing_signs', label: 'I keep seeing signs or numbers', weights: { curiosity: 20, spirituality: 15 } },
        { id: 'awakening', label: 'I think I am having a spiritual awakening', weights: { confusion: 10, spirituality: 20, self_growth: 10 } },
        { id: 'dreams', label: 'I am having vivid dreams', weights: { curiosity: 15, spirituality: 10 } },
        { id: 'intuition', label: 'I want to trust my intuition more', weights: { self_growth: 15, spirituality: 15 } },
        { id: 'connection', label: 'I want to feel connected to spirit guides', weights: { spirituality: 20, hope: 10 } },
        { id: 'lost_faith', label: 'I feel disconnected from my spirituality', weights: { sadness: 15, spirituality: 10, grief: 10 } },
      ],
      family: [
        { id: 'conflict', label: 'There is a conflict in my family', weights: { anxiety: 20, family: 20, frustration: 10 } },
        { id: 'boundaries', label: 'I need to set boundaries', weights: { self_growth: 15, family: 15 } },
        { id: 'pregnancy', label: 'Trying to conceive or pregnancy', weights: { anticipation: 20, family: 20, hope: 15 } },
        { id: 'parenting', label: 'Parenting struggles', weights: { frustration: 15, family: 20 } },
        { id: 'estranged', label: 'I am estranged from a family member', weights: { grief: 20, family: 20, sadness: 10 } },
        { id: 'caregiving', label: 'I am caring for a sick family member', weights: { anxiety: 15, family: 20, sadness: 10 } },
      ],
      protection: [
        { id: 'bad_luck', label: 'I feel like I have bad luck lately', weights: { fear: 15, protection: 20, anxiety: 10 } },
        { id: 'toxic_person', label: 'There is a toxic person in my life', weights: { frustration: 15, protection: 20 } },
        { id: 'drained', label: 'I feel energetically drained', weights: { protection: 20, sadness: 10 } },
        { id: 'haunted', label: 'I feel a presence or strange energy', weights: { fear: 20, protection: 15, spirituality: 10 } },
        { id: 'curse', label: 'I am worried about hexes or curses', weights: { fear: 20, protection: 20 } },
        { id: 'cleansing', label: 'I want to learn how to cleanse my space', weights: { curiosity: 15, protection: 15 } },
      ],
      unsure: [
        { id: 'just_curious', label: 'I am just looking around', weights: { curiosity: 20 } },
        { id: 'need_help', label: 'I just need some help', weights: { sadness: 15, hope: 10 } },
        { id: 'bored', label: 'I am bored', weights: { curiosity: 10 } },
        { id: 'drawn_here', label: 'I felt drawn here', weights: { spirituality: 15, curiosity: 10 } },
        { id: 'overwhelmed', label: 'I am too overwhelmed to explain', weights: { anxiety: 20, confusion: 15 } },
        { id: 'other', label: 'Something else', weights: { curiosity: 5 } },
      ],
    }
  },
  {
    id: 'q3',
    text: 'What are you hoping to find today?',
    type: 'multi',
    options: [
      { id: 'clarity', label: 'Clarity', weights: { outcome_clarity: 20 } },
      { id: 'reassurance', label: 'Reassurance', weights: { outcome_reassurance: 20 } },
      { id: 'prediction', label: 'To know what may happen next', weights: { outcome_prediction: 20 } },
      { id: 'closure', label: 'Closure', weights: { outcome_closure: 20 } },
      { id: 'guidance', label: 'Guidance about what to do', weights: { outcome_action: 20 } },
      { id: 'confirmation', label: 'Confirmation of what I already sense', weights: { outcome_validation: 20 } },
      { id: 'perspective', label: 'A fresh perspective', weights: { outcome_clarity: 10 } },
    ]
  },
  {
    id: 'q4',
    text: 'How are you feeling right now?',
    type: 'multi',
    options: [
      { id: 'hope', label: 'Hope', weights: { hope: 20 } },
      { id: 'curiosity', label: 'Curiosity', weights: { curiosity: 20 } },
      { id: 'confusion', label: 'Confusion', weights: { confusion: 20 } },
      { id: 'fear', label: 'Fear', weights: { fear: 20 } },
      { id: 'sadness', label: 'Sadness', weights: { sadness: 20 } },
      { id: 'excitement', label: 'Excitement', weights: { excitement: 20 } },
      { id: 'frustration', label: 'Frustration', weights: { frustration: 20 } },
      { id: 'uncertainty', label: 'Uncertainty', weights: { uncertainty: 20 } },
    ]
  },
  {
    id: 'q5',
    text: 'How long has this been on your mind?',
    type: 'single',
    options: [
      { id: 'today', label: 'Just today', weights: { urgency_high: 3, present: 10 } },
      { id: 'few_days', label: 'A few days', weights: { urgency_high: 2, present: 15 } },
      { id: 'few_weeks', label: 'A few weeks', weights: { urgency_medium: 3, past: 10 } },
      { id: 'few_months', label: 'A few months', weights: { urgency_medium: 2, past: 15 } },
      { id: 'long_time', label: 'A long time', weights: { urgency_low: 3, past: 20 } },
    ]
  },
  {
    id: 'q6',
    text: 'What kind of support sounds best to you?',
    type: 'single',
    branchFrom: 'q1',
    optionSets: {
      love: [
        { id: 'love_tarot', label: 'A love tarot reading', weights: { spirituality_open: 10 } },
        { id: 'love_psychic', label: 'A direct psychic connection', weights: { spirituality_experienced: 10 } },
        { id: 'love_astrology', label: 'Astrology compatibility', weights: { spirituality_curious: 10 } },
        { id: 'love_advice', label: 'Practical relationship advice', weights: { spirituality_skeptical: 10 } },
      ],
      money: [
        { id: 'career_forecast', label: 'A career forecast', weights: { future: 10 } },
        { id: 'money_blocks', label: 'Identifying money blocks', weights: { self_growth: 10 } },
        { id: 'practical_steps', label: 'Practical next steps', weights: { outcome_action: 10 } },
        { id: 'tarot_insight', label: 'Tarot insights for wealth', weights: { spirituality_open: 10 } },
      ],
      future: [
        { id: 'timeline', label: 'A timeline of events', weights: { outcome_prediction: 10 } },
        { id: 'destiny', label: 'Understanding my destiny', weights: { spirituality_experienced: 10 } },
        { id: 'signs', label: 'Looking for signs', weights: { spirituality_open: 10 } },
        { id: 'grounding', label: 'Grounding and present-moment focus', weights: { present: 10 } },
      ],
      direction: [
        { id: 'soul_purpose', label: 'Soul purpose reading', weights: { spirituality_experienced: 10 } },
        { id: 'life_path', label: 'Life path number / Numerology', weights: { spirituality_curious: 10 } },
        { id: 'coaching', label: 'Spiritual life coaching', weights: { self_growth: 10 } },
        { id: 'meditation', label: 'Meditation and inner work', weights: { spirituality_open: 10 } },
      ],
      spirituality: [
        { id: 'mediumship', label: 'Connecting with spirits/guides', weights: { spirituality_experienced: 20 } },
        { id: 'energy_healing', label: 'Energy healing or reiki', weights: { spirituality_open: 10 } },
        { id: 'akashic', label: 'Akashic records', weights: { spirituality_experienced: 15 } },
        { id: 'basic_understanding', label: 'Basic understanding of spirituality', weights: { spirituality_curious: 10 } },
      ],
      family: [
        { id: 'family_dynamics', label: 'Understanding family dynamics', weights: { family: 10 } },
        { id: 'ancestral', label: 'Ancestral healing', weights: { spirituality_experienced: 15, past: 10 } },
        { id: 'peace', label: 'Finding peace and acceptance', weights: { outcome_closure: 10 } },
        { id: 'communication', label: 'Improving communication', weights: { outcome_action: 10 } },
      ],
      protection: [
        { id: 'clearing', label: 'Energy clearing', weights: { spirituality_open: 10 } },
        { id: 'crystals', label: 'Protection crystals or tools', weights: { spirituality_curious: 10 } },
        { id: 'spells', label: 'Protection spells or rituals', weights: { spirituality_experienced: 15 } },
        { id: 'cord_cutting', label: 'Cord cutting', weights: { spirituality_open: 10, past: 10 } },
      ],
      unsure: [
        { id: 'general_reading', label: 'A general reading to see what comes up', weights: { curiosity: 10 } },
        { id: 'gentle_guidance', label: 'Gentle, comforting guidance', weights: { outcome_reassurance: 10 } },
        { id: 'direct_truth', label: 'Direct, no-nonsense truth', weights: { outcome_clarity: 10 } },
        { id: 'explore', label: 'Just exploring my options', weights: { spirituality_curious: 10 } },
      ],
    }
  },
  {
    id: 'q7',
    text: 'Is there anything else you want to share?',
    subtext: 'Take a moment and write whatever comes to mind.',
    type: 'freetext'
  }
];
