$dir = "c:\Users\samja\Desktop\site\easternalignment\src\match\content"
if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

$narrativeBlocks = @'
export interface UserProfile {
  [key: string]: any;
}

export interface NarrativeBlock {
  key: string;
  theme: string;
  summary: string[];
  deeperQuestion: string;
  whatNext: string[];
  explicitAnchorField?: string;
}

export const NARRATIVE_BLOCKS: NarrativeBlock[] = [
  {
    key: 'love__no_contact',
    theme: 'The Unfinished Chapter',
    summary: [
      'The silence itself becomes a kind of story we tell ourselves. When communication stops abruptly, it is natural to search the quiet for meaning, replaying memories to find where the thread was lost.',
      'Not knowing where you stand can feel harder than a clear answer. Ambiguity keeps you suspended, unable to fully step forward into a new chapter or go back to the way things were.',
      'What makes this situation particularly heavy is that the chapter did not close — it paused. This no_contact dynamic often points to a need for internal processing rather than immediate external resolution.'
    ],
    deeperQuestion: 'Are you waiting for them to reach out — or are you waiting to understand what this connection meant?',
    whatNext: [
      'Explore what closure might look like for you, even without their participation',
      'Consider speaking with a reader who specializes in no-contact situations',
      'Read: understanding the spiritual weight of unfinished connections',
      'Reflect on what you would do if the answer never came — and what that tells you'
    ],
    explicitAnchorField: 'relationship_state'
  },
  {
    key: 'love__recently_separated',
    theme: 'What Ends and What Remains',
    summary: [
      'A recent separation leaves a distinct kind of energetic wake. The routines, expectations, and shared futures you built are suddenly shifting, requiring you to rebuild your center of gravity.',
      'It is important to recognize the difference between missing a person and missing what the relationship represented. The space left behind often echoes with unresolved questions about self-worth and belonging.',
      'This period might suggest an opportunity to reclaim parts of yourself that were quietly compromised. Moving through recent separation is rarely linear, but each stage serves a purpose in your healing.'
    ],
    deeperQuestion: 'Are you grieving the person — or the version of yourself that existed within that relationship?',
    whatNext: [
      'Give yourself permission to feel this without rushing toward resolution',
      'A reader focused on post-separation clarity may help you process what is unresolved',
      'Read about what spiritual traditions say about loss and what it opens',
      'Notice which memories surface most — they often point to what you are truly processing'
    ],
    explicitAnchorField: 'relationship_state'
  },
  {
    key: 'love__thinking_about_someone',
    theme: 'The Quiet Pull',
    summary: [
      'There is a magnetic quality to an unspoken connection, where even the smallest interactions seem loaded with unseen potential and meaning.',
      'When you are thinking_about_someone intensely, their energy takes up significant space in your inner world. This can feel exhilarating, but it can also obscure your own needs if you lose yourself in trying to read their signals.',
      'This focus might be pointing toward a genuine energetic link, or it could reflect your own readiness for deeper connection. Understanding the source of the pull is the first step toward clarity.'
    ],
    deeperQuestion: 'Is there something holding you back from expressing how you feel — or is there something you are still figuring out about how you feel?',
    whatNext: [
      'Notice what specific fear or hesitation keeps surfacing',
      'A love reader can help you explore the energy between you',
      'Reflect on what you would want them to know, even if you never say it',
      'Journaling what you imagine can clarify what you actually want'
    ],
    explicitAnchorField: 'relationship_state'
  },
  {
    key: 'love__complicated',
    theme: 'The Tangled Thread',
    summary: [
      'Navigating a complicated relationship where nothing is defined often requires more emotional energy than a clear commitment or a clean break. The continuous negotiation of boundaries can be exhausting.',
      'Uncertainty about what both people want creates a cycle of hope and hesitation. You may find yourself waiting for the other person to establish the rules, inadvertently giving away your own power.',
      'This complicated dynamic could reflect conflicting desires—either within them or within yourself. Finding stable ground may require stepping back from trying to fix it and simply observing what is.'
    ],
    deeperQuestion: 'Would more clarity change what you feel — or is part of you afraid of what clarity might reveal?',
    whatNext: [
      'Identify what specific answer would help you most right now',
      'A reader can help you understand the energetic dynamic at play',
      'Read: navigating relationship uncertainty without losing yourself',
      'Notice whether the ambiguity is coming from them, from you, or from both'
    ],
    explicitAnchorField: 'relationship_state'
  },
  {
    key: 'love__single',
    theme: 'The Open Question',
    summary: [
      'Walking the path of being single is an ongoing dialogue between loneliness and openness. It is a time when your energetic field is entirely your own, unshaped by the immediate demands of a partner.',
      'There is a subtle but profound difference between waiting for love and becoming ready for it. Waiting implies life is on pause, while readiness involves active cultivation of the love you wish to invite in.',
      'This chapter might suggest a critical period of integration, where you align your inner values with what you will accept externally. It is a fertile space for deep personal transformation.'
    ],
    deeperQuestion: 'Are you asking when love will arrive — or are you asking what kind of love you actually want?',
    whatNext: [
      'Explore what your ideal relationship would feel like, not just look like',
      'A love reader can offer perspective on your current energy and readiness',
      'Read about the spiritual significance of this particular chapter of being alone',
      'Reflect on what changed the last time you opened to something new'
    ],
    explicitAnchorField: 'relationship_state'
  },
  {
    key: 'love__relationship',
    theme: 'The Shifting Ground',
    summary: [
      'Even within a committed relationship, energy is constantly in motion. Sensing that something has changed or become uncertain is often the first sign that the dynamic is evolving.',
      'When the familiar ground beneath a partnership shifts, it can trigger deep vulnerabilities. This discomfort is not necessarily a sign of breakdown, but rather a call for recalibration.',
      'This relationship state could reflect the need for one or both partners to bring new, unexpressed aspects of themselves to the table. Growth often requires renegotiating the silent agreements you began with.'
    ],
    deeperQuestion: 'Is something actually changing — or have you changed in ways the relationship has not yet caught up to?',
    whatNext: [
      'Name the specific feeling or moment that triggered this sense of shift',
      'A reader specializing in relationship dynamics may offer useful perspective',
      'Read about how relationships evolve through periods of uncertainty',
      'Consider what you would need to feel secure again, and what that would require of you'
    ],
    explicitAnchorField: 'relationship_state'
  },
  {
    key: 'love__talking',
    theme: 'The Moment Before',
    summary: [
      'There is a charged uncertainty in the early stages of connection, where you are talking but the shape of the relationship is not yet defined. Every exchange carries the weight of future possibilities.',
      'Hope is frequently mixed with the fear of reading the signals wrong. The desire to lean in competes with the protective instinct to hold back until you are sure of their intentions.',
      'This delicate phase might suggest an opportunity to practice vulnerability without attachment to the outcome. It is a space for discovering whether your rhythms truly align.'
    ],
    deeperQuestion: 'Are you uncertain about their feelings — or uncertain about whether you are ready to know?',
    whatNext: [
      'Notice what specific reassurance you are looking for',
      'A love reader can help you read the energy between you',
      'Read about navigating the early stages of connection',
      'Clarify what you want this to become, so you have a direction to move toward'
    ],
    explicitAnchorField: 'relationship_state'
  },
  {
    key: 'career__fear',
    theme: 'The Fork in the Road',
    summary: [
      'Standing at a career or financial crossroads brings the weight of a decision that matters. The stakes feel high, and the fear of making a misstep can cloud your natural intuition.',
      'When fear takes the lead, it often amplifies the risks while minimizing your own resilience and capability to handle whatever outcomes arise.',
      'This state of fear might suggest that the choice before you carries significant potential for growth. The resistance you feel is often proportional to the transformation the new path offers.'
    ],
    deeperQuestion: 'Are you afraid of making the wrong choice — or afraid of fully committing to the right one?',
    whatNext: [
      'Identify what specific outcome you are most afraid of',
      'A career-focused reader can help you see the situation from a different angle',
      'Read about navigating major career transitions',
      'Write out both paths — what each one costs and what each one offers'
    ],
    explicitAnchorField: 'emotional_state'
  },
  {
    key: 'career__confusion',
    theme: 'The Uncertain Ground',
    summary: [
      'Feeling directionless in your career or work life is deeply disorienting. When the path forward is obscured, even small decisions can feel overwhelmingly complex.',
      'Not knowing which path is right often indicates that you have outgrown your previous ambitions, but have not yet fully formulated the new ones. The confusion itself is a protective space while you incubate a new vision.',
      'This confusion might point toward a need to disconnect from external expectations and reconnect with what genuinely sustains your energy.'
    ],
    deeperQuestion: 'Is the confusion about which direction to take — or about whether any of the visible options is truly what you want?',
    whatNext: [
      'Spend time with what drew you to your current path in the first place',
      'A reader focused on life purpose can offer fresh perspective',
      'Read about the spiritual significance of career crossroads',
      'Make a list of what you are moving toward, not just what you are moving away from'
    ],
    explicitAnchorField: 'emotional_state'
  },
  {
    key: 'career__frustration',
    theme: 'The Resistance',
    summary: [
      'Feeling stuck, undervalued, or chronically frustrated in your work drains the life force needed to make a change. It is a sign that the energy exchange in your environment is out of balance.',
      'Prolonged frustration often masks a deeper realization that you are trying to force a fit where one no longer exists, or that your unique contributions remain unseen.',
      'This frustration might reflect a powerful inner knowing that you are meant for a different kind of impact. It can serve as the necessary catalyst to break free from comfortable stagnation.'
    ],
    deeperQuestion: 'Is this situation asking you to push harder — or asking you to reconsider what you are pushing toward?',
    whatNext: [
      'Identify whether the block is external or whether it reflects something you need to shift internally',
      'A reader can help you understand what may be contributing to the pattern',
      'Read about the difference between persistence and redirection',
      'Notice what would need to change for the work to feel meaningful again'
    ],
    explicitAnchorField: 'emotional_state'
  },
  {
    key: 'money__anxiety',
    theme: 'The Weight of What Is Next',
    summary: [
      'Financial pressure and anxiety have a way of narrowing your vision, making it difficult to see beyond immediate survival concerns. The stress often bleeds into every other area of life.',
      'The energetic weight of money anxiety can create a feeling of contraction, which paradoxically blocks the flow of new opportunities and creative solutions.',
      'This intense pressure might suggest it is time to examine your foundational beliefs about abundance and security. Finding a small foothold of agency can begin to shift the overarching dynamic.'
    ],
    deeperQuestion: 'Is the fear about money itself — or about what having or not having money represents to you?',
    whatNext: [
      'Separate the practical concerns from the emotional ones — both are real but need different responses',
      'A reader can help you understand the energetic patterns around abundance in your life',
      'Read about the psychological and spiritual relationship to financial fear',
      'Identify one small area of agency — even a small sense of control can shift the energy'
    ],
    explicitAnchorField: 'topic'
  },
  {
    key: 'career',
    theme: 'The Next Chapter at Work',
    summary: [
      'Your career and professional life reflect how you direct your energy into the world. Navigating questions in this area often touches on deeper themes of purpose, value, and recognition.',
      'Whether you are seeking advancement, a change of pace, or a complete pivot, the desire for clarity indicates that your current container may no longer hold your ambitions.',
      'This inquiry could suggest that you are preparing to step into a greater level of responsibility or authentic expression in your work.'
    ],
    deeperQuestion: 'What would it mean to truly succeed in what you are pursuing — and is that still what you want?',
    whatNext: [
      'Clarify what success looks like to you right now, not to anyone else',
      'A career or life-purpose reader may offer a useful perspective',
      'Read about navigating career transitions and decisions',
      'Give yourself permission to want what you actually want'
    ],
    explicitAnchorField: 'domain'
  },
  {
    key: 'spirituality__curiosity',
    theme: 'The Signal',
    summary: [
      'Noticing signs, synchronicities, or repeating patterns is often the first language the universe uses when a new channel of awareness is opening up for you.',
      'This profound curiosity and spiritual hunger suggests that your intuitive faculties are coming online, asking you to look beyond the surface of mundane events to find their hidden architecture.',
      'These experiences might be pointing toward an internal shift that is already underway. Seeking to understand them is a way of saying "yes" to the dialogue.'
    ],
    deeperQuestion: 'Are you looking for confirmation of something you already sense — or for permission to trust what you are noticing?',
    whatNext: [
      'Begin documenting the patterns you are noticing — dates, feelings, contexts',
      'A spiritually-oriented reader can help you interpret what is emerging',
      'Read about how symbolic experiences often coincide with internal shifts',
      'Ask yourself what message would make the most sense given what is happening in your life'
    ],
    explicitAnchorField: 'emotional_state'
  },
  {
    key: 'spirituality__anxiety',
    theme: 'The Unsettled Field',
    summary: [
      'Sensing that something is off energetically or spiritually, yet being unable to name it, can be deeply unsettling. It is like hearing a frequency that others cannot perceive.',
      'This form of anxiety in a spiritual context often occurs when your energetic boundaries are porous, or when you are picking up on undercurrents in your environment that remain unspoken.',
      'This unsettled feeling might suggest that you need to re-establish your protective grounding. It is a signal from your inner warning system asking for maintenance and care.'
    ],
    deeperQuestion: 'Is something in your external situation asking for attention — or is something in you asking to be cleared?',
    whatNext: [
      'Name the specific situations where the feeling is strongest',
      'A reader who works with energy can help identify what may be contributing',
      'Read about protection, clearing, and energetic maintenance',
      'Ground yourself through routine — structure can help when energy feels scattered'
    ],
    explicitAnchorField: 'emotional_state'
  },
  {
    key: 'spirituality',
    theme: 'The Inner Compass',
    summary: [
      'Embarking on a general spiritual search is often prompted by a quiet realization that the material world alone does not satisfy your deeper questions about meaning and existence.',
      'This seeking phase requires a delicate balance of keeping an open mind while remaining grounded in your own discernment. It is about discovering what resonates as true for you.',
      'This journey could reflect a readiness to integrate more profound philosophies or practices into your daily life, bridging the unseen with the tangible.'
    ],
    deeperQuestion: 'What would it feel like to trust what you already know, even without external confirmation?',
    whatNext: [
      'Spend time in stillness and notice what arises without judgment',
      'A spiritually experienced reader can offer grounding and perspective',
      'Read about spiritual awakening and the different ways it presents',
      'Consider keeping a record of your dreams, signs, and intuitions over the next few weeks'
    ],
    explicitAnchorField: 'domain'
  },
  {
    key: 'future__confusion',
    theme: 'The Fog Before the Path',
    summary: [
      'Not knowing which direction to go creates a specific kind of disorientation. Standing at a major crossroads, the future can look like an impenetrable fog rather than a landscape of choices.',
      'This confusion is often compounded by the pressure to have a grand plan. Yet, clarity is rarely found by straining your eyes; it is found by taking the next right step, however small.',
      'This period might reflect a necessary dismantling of old blueprints. The fog serves to keep you focused on the immediate present rather than projecting into an uncertain distance.'
    ],
    deeperQuestion: 'Are you unclear about the direction — or unclear about what you are truly willing to leave behind?',
    whatNext: [
      'Identify what you know for certain, even if it is small',
      'A reader can offer perspective from outside your current frame',
      'Read about navigating major life transitions',
      'Give yourself permission to not know — sometimes the path only becomes visible once you start walking'
    ],
    explicitAnchorField: 'emotional_state'
  },
  {
    key: 'future__fear',
    theme: 'The Unseen Road',
    summary: [
      'Fear of the future is deeply human. Not knowing what is coming, and the anxiety wrapped up in that vast unknown, can trigger our most primal instincts for safety and control.',
      'When you focus intensely on potential negative outcomes, you inadvertently feed them your energy. This fear often masquerades as practical preparation, but it usually leads to paralysis.',
      'This apprehension might suggest an opportunity to build trust in your own adaptability. Your track record of surviving difficult transitions is likely stronger than fear allows you to remember.'
    ],
    deeperQuestion: 'Are you afraid of a specific outcome — or afraid of the uncertainty itself?',
    whatNext: [
      'Separate what is actually likely from what fear is telling you might happen',
      'A reader focused on future timing can help you understand what energies are at play',
      'Read about how to navigate uncertainty without being paralyzed by it',
      'Identify what you can control and what you need to release'
    ],
    explicitAnchorField: 'emotional_state'
  },
  {
    key: 'future__anticipation',
    theme: 'The Horizon',
    summary: [
      'Sensing that change is coming and living in a state of excited anticipation gives life a vibrant, electric quality. You can feel the wind shifting before you see the weather change.',
      'This positive momentum is powerful, though it can sometimes make it difficult to stay anchored in the current moment. The future pulls at you with the promise of new expansion.',
      'This anticipation could indicate that your energetic field is already aligning with the reality you are moving toward. The task is to remain steady while the bridge is being built.'
    ],
    deeperQuestion: 'Are you waiting for confirmation that it is safe to hope — or are you ready to step toward what you want?',
    whatNext: [
      'Name specifically what you are hoping for and why it matters to you',
      'A reader can help you understand what the current energy supports',
      'Read about how periods of transition often carry the seeds of what comes next',
      'Notice what small step forward is available to you right now'
    ],
    explicitAnchorField: 'emotional_state'
  },
  {
    key: 'future',
    theme: 'What Comes Next',
    summary: [
      'Looking ahead toward the future is an act of co-creation. It involves understanding the trajectories that are currently in motion based on the choices you have made thus far.',
      'While the desire to know what comes next is natural, true empowerment lies in recognizing your own role in shaping those outcomes. The future is not entirely written; it is a collaborative dance.',
      'This focus might point toward a readiness to lay a firmer foundation for the chapters ahead, combining preparation with a willingness to be surprised.'
    ],
    deeperQuestion: 'What are you really trying to prepare for — and what would it take to feel ready?',
    whatNext: [
      'Clarify what outcome would give you the most peace right now',
      'A reader experienced in timing and future guidance can offer perspective',
      'Read about what spiritual practice says about trust and uncertainty',
      'Focus on what is in motion now — futures are built from present choices'
    ],
    explicitAnchorField: 'domain'
  },
  {
    key: 'self_growth',
    theme: 'The Turning Point',
    summary: [
      'Personal growth and inner transformation are rarely comfortable processes. They demand that you outgrow the very structures and beliefs that once kept you safe and defined your identity.',
      'During these turning points, you may feel like a stranger to yourself. Friends and environments that used to fit perfectly might suddenly feel restrictive or misaligned.',
      'This process could suggest that you are shedding an old skin. The discomfort you feel is often the friction between the person you were and the person you are becoming.'
    ],
    deeperQuestion: 'Are you looking for permission to change — or for confirmation that the change you are making is the right one?',
    whatNext: [
      'Identify what specific version of yourself you are moving toward',
      'A reader focused on personal development and spiritual growth can offer insight',
      'Read about how identity shifts often look like confusion before they look like clarity',
      'Trust that the discomfort of growth is not the same as going in the wrong direction'
    ],
    explicitAnchorField: 'topic'
  },
  {
    key: 'family',
    theme: 'The Ties That Shape Us',
    summary: [
      'Family questions — whether they involve conflict, distance, grief, or major decisions — touch the very bedrock of our lives. These bonds are forged with histories that are difficult to disentangle.',
      'Navigating family dynamics often involves unpacking generations of inherited patterns. The emotional weight here is dense because it intersects with your fundamental sense of belonging and duty.',
      'This situation might be pointing toward an opportunity to establish healthier boundaries or to initiate a cycle of healing that extends beyond just yourself.'
    ],
    deeperQuestion: 'Are you trying to repair something — or trying to understand whether it can be repaired?',
    whatNext: [
      'Give yourself space to feel what is true without immediately trying to fix it',
      'A reader can offer perspective on the energetic dynamics within families',
      'Read about the spiritual weight of family bonds and how they shape us',
      'Identify what you need from this situation, not just what the situation needs from you'
    ],
    explicitAnchorField: 'domain'
  },
  {
    key: 'protection',
    theme: 'The Shield',
    summary: [
      'Feeling like negative energy, bad luck, or hidden forces are working against you can foster a deep sense of vulnerability. It is as if unseen obstacles are continually placed in your path.',
      'When your energetic boundaries are compromised, it is easy to absorb the chaotic or heavy frequencies of your environment, mistaking them for your own natural state.',
      'This experience might reflect a need to consciously fortify your own spiritual armor. Reclaiming your space often requires actively declaring what you will no longer allow into your field.'
    ],
    deeperQuestion: 'Is there something in your external environment asking for attention — or something in you asking to be strengthened?',
    whatNext: [
      'Identify specific patterns: when does the negative energy feel strongest?',
      'A reader who specializes in protection and energy work can help',
      'Read about energetic clearing and how to maintain your own field',
      'Begin simple grounding practices — they are more powerful than they appear'
    ],
    explicitAnchorField: 'topic'
  },
  {
    key: 'love',
    theme: 'The Heart\'s Question',
    summary: [
      'Questions of the heart are rarely just about the other person; they are mirrors reflecting our own deepest desires, insecurities, and capacities for vulnerability.',
      'When the relationship state is unclear, love can feel like navigating without a map. The search for answers is often a search for solid ground on which to safely open yourself.',
      'This generalized inquiry might suggest that your heart is seeking reassurance or direction before making its next significant emotional investment.'
    ],
    deeperQuestion: 'Beneath the question you came with — what do you actually want to know?',
    whatNext: [
      'Be specific about what answer would give you the most clarity',
      'A love reader can help you understand the emotional and energetic landscape',
      'Read about the spiritual dimensions of love and connection',
      'Notice what comes up when you imagine the best possible outcome'
    ],
    explicitAnchorField: 'domain'
  }
];

export function getFallbackNarrative(profile: UserProfile): NarrativeBlock {
  return NARRATIVE_BLOCKS.find(b => b.key === 'general__seeker') || {
    key: 'general__seeker',
    theme: 'The Unfolding Path',
    summary: [
      'You are in a period of transition where the old answers no longer fit, but the new ones have not fully arrived.',
      'This space between chapters can feel ungrounded, but it is precisely where the most significant inner shifts occur.',
      'By asking these questions now, you are actively participating in what comes next rather than waiting for it to happen to you.'
    ],
    deeperQuestion: 'What are you ready to let go of in order to make space for what is arriving?',
    whatNext: [
      'Give yourself permission to sit with the questions before demanding answers',
      'A general intuitive reading can help identify your current energetic patterns',
      'Trust that the path forward will reveal itself one step at a time'
    ]
  };
}
'@

Set-Content -Path "$dir\narrativeBlocks.ts" -Value $narrativeBlocks -Encoding UTF8

$articleClassifier = @'
export interface ArticleMetadata {
  slug: string;
  title: string;
  url: string;
  primary_domain: string;
  secondary_topics: string[];
  emotional_states: string[];
  relationship_states: string[];
  desired_outcomes: string[];
  temporal_orientation: string;
  commercial_intent: string;
}

export const GUIDE_SLUGS: string[] = [
  'age-gap-relationship-psychics', 'ai-psychic-readings-vs-human', 'am-i-psychic-signs-and-tests', 
  'angel-numbers-1111-222-333-meaning-guide', 'are-psychics-real', 'aura-reading-meaning-colors', 
  'avoidant-attachment-psychic-readings', 'before-you-pay-for-a-psychic-reading', 'best-kasamba-psychics-2026', 
  'best-kasamba-psychics-career-money', 'best-kasamba-psychics-ex-recovery', 'best-kasamba-psychics-first-reading', 
  'best-keen-psychics-2026', 'best-lgbtq-psychics-online', 'best-love-psychics-kasamba-ranked', 
  'best-love-psychics-keen-ex-recovery', 'best-love-psychics-purple-garden', 'best-mediums-on-kasamba', 
  'best-mediums-on-purple-garden', 'best-psychic-hotlines-2026', 'best-psychics-for-breakups', 
  'best-purple-garden-psychics-2026', 'best-purple-garden-psychics-career-money', 'best-purple-garden-psychics-ex-recovery', 
  'best-purple-garden-psychics-first-reading', 'best-soulmate-psychics-online', 'best-tarot-readers-for-love', 
  'best-tarot-readers-on-kasamba', 'best-twin-flame-psychics-online', 'best-video-psychics-purple-garden', 
  'brutally-honest-psychics-kasamba', 'brutally-honest-psychics-keen', 'brutally-honest-psychics-purple-garden', 
  'can-psychic-predict-marriage', 'career-and-money-psychic-readings', 'chat-vs-phone-vs-video-psychic-reading', 
  'cheap-love-psychics-online', 'choose-the-right-psychic-reader-for-you', 'clairs-the-four-psychic-abilities-guide', 
  'divorce-breakup-psychics-online', 'does-he-like-me-psychics', 'dreaming-about-ex-psychic-meaning', 
  'evidential-mediums-passed-spouse', 'financial-motives-psychics', 'first-psychic-reading-guide', 
  'free-psychic-readings-online-truth', 'healing-after-heartbreak-spiritual-guide', 'how-much-does-a-psychic-reading-cost', 
  'how-often-psychic-reading', 'how-to-choose-a-psychic-reader', 'how-to-pick-a-psychic-reader', 
  'how-to-prepare-for-psychic-reading', 'how-to-spot-fake-psychic', 'how-to-tell-if-an-online-psychic-is-legitimate', 
  'is-he-the-one-psychic-indicators', 'is-purple-garden-legit', 'karmic-relationships-signs-and-lessons', 
  'kasamba-3-free-minutes-guide', 'kasamba-love-readings-review', 'kasamba-no-contact-love-reading', 
  'kasamba-specific-person-reading', 'kasamba-twin-flame-reading', 'keen-ldr-timelines-close-the-gap', 
  'keen-love-psychics-review', 'keen-twin-flame-reading', 'long-distance-relationship-psychics', 
  'love-after-loss-mediums', 'love-or-career-psychics', 'love-triangles-psychics', 'most-accurate-love-psychics', 
  'most-accurate-psychics-kasamba', 'most-accurate-psychics-keen', 'most-accurate-psychics-purple-garden', 
  'no-contact-psychic-readings-guide', 'online-dating-psychics', 'other-woman-psychic-readings', 
  'palm-reading-beginners-guide', 'past-life-connections-psychic-readings', 'pet-psychic-readings-online', 
  'pregnancy-psychic-readings-guide', 'psychic-prediction-didnt-come-true', 'psychic-reading-prices', 
  'psychic-reading-vs-therapy', 'psychic-readings-for-anxiety', 'psychic-vs-medium-vs-tarot-reader', 
  'psychic-vs-tarot-vs-astrology', 'purple-garden-30-credit-guide', 'purple-garden-journeys-guide', 
  'purple-garden-love-readings-review', 'purple-garden-twin-flame-readings', 'questions-to-ask-a-psychic', 
  'real-marriage-psychics', 'should-you-pay-for-a-psychic-reading', 'signs-spiritual-connection-with-someone', 
  'signs-your-ex-is-coming-back', 'single-parent-psychics', 'situationship-psychic-readings', 
  'spiritual-awakening-signs-guide', 'tarot-card-meanings-beginners-guide', 'tarot-for-love-practical-guide', 
  'third-party-psychic-readings-jealousy', 'top-love-psychics-kasamba', 'top-love-psychics-keen', 
  'top-love-psychics-online', 'top-love-psychics-purple-garden', 'twin-flame-vs-soulmate-difference', 
  'what-is-psychic-reading', 'what-to-expect-from-your-first-psychic-reading', 'when-will-i-get-married-psychics', 
  'will-he-propose-psychics', 'win-her-back-psychics', 'zodiac-compatibility-psychic-readings'
];

function slugToTitle(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function classifyArticle(slug: string): ArticleMetadata {
  const s = slug.toLowerCase();
  
  let primary_domain = 'love';
  if (s.match(/career|money|financial|abundance/)) primary_domain = 'career';
  else if (s.match(/angel|spiritual|aura|psychic|medium|clairs|palm|past-life|tarot|astrology/)) primary_domain = 'spirituality';
  else if (s.match(/single-parent|pregnancy/)) primary_domain = 'family';
  else if (s.match(/third-party|jealousy|protection/)) primary_domain = 'protection';
  
  let commercial_intent = 'low';
  if (s.match(/best-|top-|kasamba|keen|purple-garden|credit|minutes/)) commercial_intent = 'high';
  else if (s.match(/guide|review|how-to/)) commercial_intent = 'medium';

  const secondary_topics: string[] = [];
  if (s.includes('tarot')) secondary_topics.push('tarot');
  if (s.includes('medium')) secondary_topics.push('mediumship');
  if (s.includes('astrology') || s.includes('zodiac')) secondary_topics.push('astrology');

  const emotional_states: string[] = [];
  if (s.match(/anxiety|worry|fear/)) emotional_states.push('anxious');
  if (s.match(/healing|heartbreak/)) emotional_states.push('healing');
  if (s.match(/confusion|uncertainty/)) emotional_states.push('confused');

  const relationship_states: string[] = [];
  if (s.match(/no-contact|ghosted/)) relationship_states.push('no_contact');
  if (s.match(/breakup|divorce|ex-|separation|heartbreak/)) relationship_states.push('recently_separated');
  if (s.match(/does-he|is-he|specific-person/)) relationship_states.push('thinking_about_someone');
  if (s.match(/situationship|complicated|love-triangle|third-party/)) relationship_states.push('complicated');
  if (s.match(/marriage|propose/)) relationship_states.push('relationship');
  if (s.match(/twin-flame|soulmate/)) relationship_states.push('deep_connection');

  const desired_outcomes: string[] = [];
  if (s.match(/win-her-back|reconcil|coming-back/)) desired_outcomes.push('reconciliation');
  if (s.match(/healing/)) desired_outcomes.push('closure');

  let temporal_orientation = 'present';
  if (s.match(/future|when-will|predict/)) temporal_orientation = 'future';
  else if (s.match(/past-life|ex-|past/)) temporal_orientation = 'past';

  return {
    slug,
    title: slugToTitle(slug),
    url: `/guides/${slug}/`,
    primary_domain,
    secondary_topics,
    emotional_states,
    relationship_states,
    desired_outcomes,
    temporal_orientation,
    commercial_intent,
  };
}
'@

Set-Content -Path "$dir\articleClassifier.ts" -Value $articleClassifier -Encoding UTF8

$readerClassifier = @'
export interface RawReader {
  slug: string;
  platform: string;
  platformName: string;
  rating: number;
  affiliateUrl: string;
  avatarUrl?: string;
  bestFor?: string;
  pricing?: string;
  freeOffer?: string;
  entities?: string[];
  unavailable?: boolean;
}

export interface ReaderMatchMetadata extends RawReader {
  displayName: string;
  specialties: string[];
  relationship_states: string[];
  style: string[];
  availability: boolean;
}

export function classifyReader(reader: RawReader): ReaderMatchMetadata {
  const displayName = reader.platformName ? reader.platformName.replace(/^Platform:\s*/i, '') : reader.slug;
  const bestFor = (reader.bestFor || '').toLowerCase();
  const entities = (reader.entities || []).map(e => e.toLowerCase());
  const combinedText = bestFor + ' ' + entities.join(' ');
  
  const specialties: string[] = [];
  if (combinedText.match(/love|relationship|romance|soulmate|twin|ex-|breakup|divorce|no contact|reconcil|heart|reunion/)) specialties.push('love');
  if (combinedText.match(/career|money|finance|business|job|work|abundance/)) specialties.push('career');
  if (combinedText.match(/spiritual|psychic|intuitive|clairvoyant|medium|angel|aura|energy|tarot|past life/)) specialties.push('spirituality');
  if (combinedText.match(/breakup|divorce|separation|ex-/)) specialties.push('breakup');
  if (combinedText.match(/family|children|parent/)) specialties.push('family');
  if (combinedText.match(/protection|clearing|negative energy|curse|block/)) specialties.push('protection');

  const relationship_states: string[] = [];
  if (combinedText.match(/no contact|silence|ghosted/)) relationship_states.push('no_contact');
  if (combinedText.match(/breakup|divorce|separation|ex-/)) relationship_states.push('recently_separated');
  if (combinedText.match(/specific person|someone special/)) relationship_states.push('thinking_about_someone');
  if (combinedText.match(/complicated|undefined|situationship/)) relationship_states.push('complicated');

  const style: string[] = [];
  if (combinedText.match(/empathetic|compassionate|warm|gentle|nurturing/)) style.push('empathetic');
  if (combinedText.match(/direct|honest|straightforward|no-nonsense|blunt/)) style.push('direct');
  if (combinedText.match(/detailed|thorough|in-depth|comprehensive/)) style.push('detailed');

  return {
    ...reader,
    displayName,
    specialties,
    relationship_states,
    style,
    availability: !reader.unavailable,
  };
}
'@

Set-Content -Path "$dir\readerClassifier.ts" -Value $readerClassifier -Encoding UTF8
