/**
 * src/match/taxonomy.ts
 * Central taxonomy, questions, and label dictionaries for Eastern Alignment Reader Match.
 */

import type { QuizQuestion, Intent, Practice, CommunicationFormat, ReadingStyle, Urgency, BudgetRange } from './types';

export const INTENT_LABELS: Record<Intent, string> = {
  love_relationship: 'Relationship Dynamic',
  another_person_intentions: "Someone's Hidden Intentions",
  breakup_ex: 'Breakup & Reconciliation',
  dating: 'Dating & New Connection',
  career_work: 'Career & Work Direction',
  money_finance: 'Money & Financial Choices',
  decision_making: 'Critical Decision',
  future_direction: 'Future Path & Timing',
  grief_loss: 'Mediumship & Departed Loved Ones',
  self_reflection: 'Personal Growth & Healing',
  general_guidance: 'General Intuitive Clarity',
};

export const PRACTICE_LABELS: Record<Practice, string> = {
  psychic: 'Psychic & Intuitive',
  tarot: 'Tarot & Oracle',
  astrology: 'Astrology & Horoscopes',
  medium: 'Psychic Mediumship',
  numerology: 'Numerology & Life Path',
  spiritual_guidance: 'Spiritual Life Coaching',
  empath: 'Clairvoyant Empath',
};

export const FORMAT_LABELS: Record<CommunicationFormat, string> = {
  chat: 'Live Chat (Transcripts Saved)',
  phone: 'Phone & Voice Call',
  video: 'Live Video Reading',
  no_preference: 'Any Format / Best Value',
};

export const STYLE_LABELS: Record<ReadingStyle, string> = {
  direct: 'Direct & Unvarnished',
  gentle: 'Empathetic & Gentle',
  fast_answers: 'Fast & Efficient',
  practical: 'Practical Next Steps',
  detailed: 'Detailed & Thorough',
  conversational: 'Warm & Conversational',
  reflective: 'Reflective & Psychological',
  structured: 'Structured & Card-by-Card',
};

export const PLATFORM_BADGES: Record<string, { label: string; class: string; promoTag: string }> = {
  kasamba: {
    label: 'Kasamba',
    class: 'platform-badge--kasamba',
    promoTag: '3 Free Minutes with New Advisors',
  },
  'purple-garden': {
    label: 'Purple Garden',
    class: 'platform-badge--purple',
    promoTag: '$30 First-Purchase Credit',
  },
  keen: {
    label: 'Keen',
    class: 'platform-badge--keen',
    promoTag: '$1 for 5 Minutes Intro Trial',
  },
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'intent',
    stepNumber: 1,
    totalSteps: 7,
    eyebrow: 'Step 1 of 7 · Primary Focus',
    title: 'What are you trying to understand most right now?',
    subtitle: 'Choose the specific situation creating the most friction or uncertainty in your life today.',
    options: [
      {
        id: 'love_rel',
        label: 'My relationship dynamic',
        sublabel: 'Mixed signals, growing distance, or understanding where we stand',
        value: 'love_relationship',
      },
      {
        id: 'intentions',
        label: "Someone's hidden feelings or intentions",
        sublabel: 'What they actually think, feel, and plan beneath their emotional guard',
        value: 'another_person_intentions',
      },
      {
        id: 'breakup',
        label: 'A breakup or possible reconciliation',
        sublabel: 'No-contact silence, unresolved threads, or deciding whether to let go',
        value: 'breakup_ex',
      },
      {
        id: 'dating',
        label: 'Dating and evaluating someone new',
        sublabel: 'Assessing sincerity, chemistry, and spotting potential red flags early',
        value: 'dating',
      },
      {
        id: 'career',
        label: 'Career crossroads or work direction',
        sublabel: 'Job transition, workplace politics, promotions, or burnout',
        value: 'career_work',
      },
      {
        id: 'money',
        label: 'Money, finances, or a major investment',
        sublabel: 'Financial stability, business risks, contracts, or major expenditures',
        value: 'money_finance',
      },
      {
        id: 'decision',
        label: 'A critical decision I am facing',
        sublabel: 'Paralyzed between two paths or timing a high-stakes life transition',
        value: 'decision_making',
      },
      {
        id: 'future',
        label: 'My broader future path and timing',
        sublabel: 'What shifts, obstacles, or opportunities are approaching in the next 3–6 months',
        value: 'future_direction',
      },
      {
        id: 'grief',
        label: 'Connecting with someone who passed away',
        sublabel: 'Mediumship for closure, departed loved ones, and emotional peace',
        value: 'grief_loss',
      },
      {
        id: 'general',
        label: "I'm not sure / Need general clarity",
        sublabel: 'A foggy sense of unease or seeking an honest high-level perspective',
        value: 'general_guidance',
      },
    ],
  },
  {
    id: 'situationSubject',
    stepNumber: 2,
    totalSteps: 7,
    eyebrow: 'Step 2 of 7 · Reality Slice',
    title: 'Whose situation or headspace are you mainly asking about?',
    subtitle: 'This helps our algorithm determine whether you need a third-person reader or internal guidance.',
    options: [
      {
        id: 'subj_other',
        label: 'Another specific person',
        sublabel: 'Their internal thoughts, emotional bandwidth, sincerity, and next moves',
        value: 'another_person',
      },
      {
        id: 'subj_dynamic',
        label: 'The dynamic between us',
        sublabel: 'How our energies interact, compatibility, and where this connection leads',
        value: 'relationship_dynamic',
      },
      {
        id: 'subj_myself',
        label: 'Mostly myself',
        sublabel: 'My personal healing, career choices, boundary setting, and next steps',
        value: 'myself',
      },
      {
        id: 'subj_future',
        label: 'A future event or timeline',
        sublabel: 'An impending milestone, turning point, or external outcome',
        value: 'future_event',
      },
      {
        id: 'subj_closure',
        label: 'Closure on something that already happened',
        sublabel: 'Making peace with what went wrong and halting repetitive mental loops',
        value: 'past_closure',
      },
      {
        id: 'subj_open',
        label: "I'm not sure / A mix of these",
        sublabel: 'Open to whatever the advisor uncovers first',
        value: 'not_sure',
      },
    ],
  },
  {
    id: 'preferredPractice',
    stepNumber: 3,
    totalSteps: 7,
    eyebrow: 'Step 3 of 7 · Modality Fit',
    title: 'What kind of reading experience fits you best?',
    subtitle: 'Different intuitive modalities answer questions through completely different frameworks.',
    options: [
      {
        id: 'prac_psychic',
        label: 'Direct Intuitive Conversation',
        sublabel: 'Clairvoyant perception, third-person insight, and immediate conversational candor',
        value: 'psychic',
      },
      {
        id: 'prac_tarot',
        label: 'Symbolic & Reflective Card Pull',
        sublabel: 'Archetypes, subconscious patterns, and card-by-card situational roadmaps',
        value: 'tarot',
      },
      {
        id: 'prac_astrology',
        label: 'Astrological Cycles & Energetic Blueprint',
        sublabel: 'Planetary alignments, transits, compatibility matrices, and timing windows',
        value: 'astrology',
      },
      {
        id: 'prac_medium',
        label: 'Connecting with Loved Ones in Spirit',
        sublabel: 'Evidential contact with passed loved ones, grief resolution, and closure',
        value: 'medium',
      },
      {
        id: 'prac_open',
        label: "I'm open / Match me with what best fits my question",
        sublabel: 'Let Eastern Alignment match the modality based on your core question',
        value: 'open',
      },
    ],
  },
  {
    id: 'preferredFormat',
    stepNumber: 4,
    totalSteps: 7,
    eyebrow: 'Step 4 of 7 · Communication Channel',
    title: 'How do you prefer to communicate with an advisor?',
    subtitle: 'Choose the format where you feel most grounded and secure.',
    options: [
      {
        id: 'fmt_chat',
        label: 'Live Chat',
        sublabel: 'Private, real-time typing with auto-saved transcripts you can re-read and audit later',
        value: 'chat',
      },
      {
        id: 'fmt_phone',
        label: 'Phone / Audio Call',
        sublabel: 'Direct voice connection, instant vocal nuance, and immediate conversational flow',
        value: 'phone',
      },
      {
        id: 'fmt_video',
        label: 'Live Video',
        sublabel: 'Face-to-face transparency — see the reader, their cards, and verified video bios',
        value: 'video',
      },
      {
        id: 'fmt_open',
        label: 'No preference / Prioritize reader quality & best intro deal',
        sublabel: 'Auditions top-rated advisors regardless of communication format',
        value: 'no_preference',
      },
    ],
  },
  {
    id: 'preferredStyles',
    stepNumber: 5,
    totalSteps: 7,
    eyebrow: 'Step 5 of 7 · Reader Style',
    title: 'What style of advisor delivers the highest value for you?',
    subtitle: 'Select up to 2 qualities you value most in a reading session.',
    isMultiSelect: true,
    maxSelect: 2,
    options: [
      {
        id: 'style_direct',
        label: 'Direct & Unvarnished',
        sublabel: 'Tells the hard truth without sugarcoating, but zero moral judgment',
        value: 'direct',
      },
      {
        id: 'style_gentle',
        label: 'Empathetic & Gentle',
        sublabel: 'A safe, compassionate space that validates emotions and root causes',
        value: 'gentle',
      },
      {
        id: 'style_fast',
        label: 'Fast, Structured & Efficient',
        sublabel: 'Rapid communicator, no mystical padding, maximum value per minute',
        value: 'fast_answers',
      },
      {
        id: 'style_practical',
        label: 'Practical & Strategic',
        sublabel: 'Grounded advice, concrete boundaries, and tangible next steps for tomorrow',
        value: 'practical',
      },
      {
        id: 'style_reflective',
        label: 'Reflective & Soulful',
        sublabel: 'Deep psychological insights, karmic lessons, and personal sovereignty',
        value: 'reflective',
      },
    ],
  },
  {
    id: 'urgency',
    stepNumber: 6,
    totalSteps: 7,
    eyebrow: 'Step 6 of 7 · Urgency & Timing',
    title: 'How soon do you want to talk to an advisor?',
    subtitle: 'We balance verified reader track records with current advisor availability.',
    options: [
      {
        id: 'urg_now',
        label: 'Right now',
        sublabel: 'Prioritize advisors who are currently online and ready to take a session',
        value: 'right_now',
      },
      {
        id: 'urg_today',
        label: 'Within today or tonight',
        sublabel: 'Looking to connect during personal downtime later today',
        value: 'today',
      },
      {
        id: 'urg_days',
        label: 'In the next couple of days',
        sublabel: 'Willing to queue or wait for high-demand, booked-out specialists',
        value: 'few_days',
      },
      {
        id: 'urg_norush',
        label: 'No rush — I care most about the best match',
        sublabel: 'Focus purely on deep expertise and audited reviews, not immediate queue status',
        value: 'no_rush',
      },
    ],
  },
  {
    id: 'budget',
    stepNumber: 7,
    totalSteps: 7,
    eyebrow: 'Step 7 of 7 · Budget & Session Scope',
    title: 'What is your approximate budget for this session?',
    subtitle: 'Every major platform offers introductory risk-reduction trials for new clients.',
    options: [
      {
        id: 'bud_under20',
        label: 'Under $20',
        sublabel: 'Audition an advisor using introductory offers before spending your own money',
        value: 'under_20',
      },
      {
        id: 'bud_20to50',
        label: '$20 – $50',
        sublabel: 'A focused consultation with a mid-priced, verified specialist',
        value: '20_to_50',
      },
      {
        id: 'bud_50plus',
        label: '$50 – $100+',
        sublabel: 'Deep dive with an elite, high-demand advisor',
        value: '50_plus',
      },
      {
        id: 'bud_open',
        label: 'No preference / Value-first',
        sublabel: 'Match purely based on situation fit and verified client track records',
        value: 'no_pref',
      },
    ],
  },
];
