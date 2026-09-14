import type { NarrativeBlock } from '../types';
import type { UserProfile } from '../types';

export const NARRATIVE_BLOCKS: NarrativeBlock[] = [
  {
    key: 'love__no_contact',
    theme: 'The Unfinished Chapter',
    summary: [
      'The silence itself becomes a kind of story we tell ourselves. When communication stops without resolution, it is natural to search the quiet for meaning, replaying memories to find where the thread was lost.',
      'Not knowing where you stand can feel harder than a clear answer. Ambiguity keeps you suspended, unable to fully step forward into a new chapter or return to the way things were.',
      'What makes this situation particularly heavy is that the chapter did not close - it paused. This no-contact period often points to a need for internal processing rather than immediate external resolution.'
    ],
    deeperQuestion: 'Are you waiting for them to reach out - or are you waiting to understand what this connection meant?',
    whatNext: [
      'Explore what closure might look like for you, even without their participation',
      'Consider speaking with a reader who specializes in no-contact situations',
      'Read about the spiritual weight of unfinished connections',
      'Reflect on what you would do if the answer never came - and what that tells you'
    ],
    explicitAnchorField: 'relationship_state'
  },
  {
    key: 'love__recently_separated',
    theme: 'What Ends and What Remains',
    summary: [
      'A recent separation leaves a distinct kind of emotional wake. The routines, expectations, and shared futures you built are suddenly shifting, requiring you to rebuild your center of gravity.',
      'It is worth noticing the difference between missing a person and missing what the relationship represented. The space left behind often echoes with unresolved questions about belonging and what comes next.',
      'This period may be an opportunity to reclaim parts of yourself that were quietly set aside. Moving through a recent separation is rarely linear, but each stage tends to serve a purpose in the larger story of who you are becoming.'
    ],
    deeperQuestion: 'Are you grieving the person - or the version of yourself that existed within that relationship?',
    whatNext: [
      'Give yourself permission to feel this without rushing toward resolution',
      'A reader focused on post-separation clarity may help you process what is unresolved',
      'Read about what spiritual traditions say about loss and what it opens',
      'Notice which memories surface most - they often point to what you are truly processing'
    ],
    explicitAnchorField: 'relationship_state'
  },
  {
    key: 'love__thinking_about_someone',
    theme: 'The Quiet Pull',
    summary: [
      'There is a magnetic quality to an unspoken connection, where even small interactions feel loaded with unseen potential and meaning.',
      'When someone occupies significant space in your thoughts, that energy is real and worth taking seriously. It can feel exhilarating - but it can also cloud your own needs if you lose yourself in trying to read their signals.',
      'This focus might be pointing toward a genuine energetic link, or it could reflect your own readiness for deeper connection. Understanding the source of the pull is the first step toward clarity.'
    ],
    deeperQuestion: 'Is there something holding you back from expressing how you feel - or is there something you are still figuring out about how you feel?',
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
      'Navigating a connection where nothing is formally defined often requires more emotional energy than a clear commitment or a clean break. The continuous negotiation of boundaries can be quietly exhausting.',
      'Uncertainty about what both people want creates a cycle of hope and hesitation. You may find yourself waiting for the other person to set the terms, which can inadvertently give away your own power in the situation.',
      'This kind of dynamic could reflect conflicting desires - either within them, within yourself, or both. Finding stable ground may require stepping back from trying to fix it and simply observing what is actually there.'
    ],
    deeperQuestion: 'Would more clarity change what you feel - or is part of you afraid of what clarity might reveal?',
    whatNext: [
      'Identify what specific answer would give you the most relief right now',
      'A reader can help you understand the energetic dynamic at play',
      'Read about navigating relationship uncertainty without losing yourself',
      'Notice whether the ambiguity is coming from them, from you, or from both'
    ],
    explicitAnchorField: 'relationship_state'
  },
  {
    key: 'love__single',
    theme: 'The Open Question',
    summary: [
      'Being single and wondering about love sits at a particular intersection - between loneliness and openness, between patience and longing.',
      'There is a meaningful difference between waiting for love to arrive and becoming the person you want to be in love. The question is not always when, but sometimes what kind of connection you are truly ready for.',
      'This chapter of solitude may carry more information than it appears to. The questions that arise when you are alone often reveal what you have been avoiding knowing about yourself and what you actually want.'
    ],
    deeperQuestion: 'Are you asking when love will arrive - or are you asking what kind of love you actually want?',
    whatNext: [
      'Explore what your ideal relationship would feel like, not just what it would look like',
      'A love reader can offer perspective on your current energy and readiness',
      'Read about the spiritual significance of this particular chapter of being alone',
      'Reflect on what changed the last time you opened yourself to something new'
    ],
    explicitAnchorField: 'relationship_state'
  },
  {
    key: 'love__relationship',
    theme: 'The Shifting Ground',
    summary: [
      'Being in a relationship and sensing that something has changed can be one of the more disorienting experiences. You share a context with someone, yet something beneath the surface feels unfamiliar.',
      'This sense of shift may reflect something in them, something in you, or something in the connection itself that has quietly outgrown its previous form.',
      'These moments of internal uncertainty within a relationship are often the beginning of a deeper conversation - either with your partner or with yourself about what you need the relationship to become.'
    ],
    deeperQuestion: 'Is something actually changing between you - or have you changed in ways the relationship has not yet caught up to?',
    whatNext: [
      'Name the specific feeling or moment that triggered this sense of shift',
      'A reader who specializes in relationship dynamics may offer useful perspective',
      'Read about how relationships evolve through periods of uncertainty',
      'Consider what you would need to feel secure again, and what that would require'
    ],
    explicitAnchorField: 'relationship_state'
  },
  {
    key: 'love__talking',
    theme: 'The Moment Before',
    summary: [
      'Early connection carries a particular charge - the charged uncertainty of something that might become meaningful, set against the risk of reading it wrong.',
      'When you are in contact but nothing has been defined, you exist in a space that is rich with possibility and equally vulnerable to misreading. Hope and self-protection tend to operate simultaneously.',
      'This stage often asks more of your patience than it does of your actions. Understanding your own feelings clearly before trying to understand theirs tends to make everything that follows more grounded.'
    ],
    deeperQuestion: 'Are you uncertain about their feelings - or uncertain about whether you are ready to know?',
    whatNext: [
      'Notice what specific reassurance you are looking for',
      'A love reader can help you read the energy between you',
      'Read about navigating the early stages of connection with clarity',
      'Clarify what you want this to become, so you have a direction to move toward'
    ],
    explicitAnchorField: 'relationship_state'
  },
  {
    key: 'love',
    theme: "The Heart's Question",
    summary: [
      'Love questions tend to carry more weight than they appear to on the surface. What presents itself as a question about another person often contains an underlying question about what you need and what you are ready for.',
      'The emotional clarity you are looking for may be less about predicting what they will do and more about understanding what you would do with different kinds of answers.',
      'Whatever is currently unresolved in this area of your life, the act of bringing it into focus - of naming it clearly enough to ask about it - is itself a meaningful step.'
    ],
    deeperQuestion: 'Beneath the question you came with - what do you actually want to know?',
    whatNext: [
      'Be specific about what answer would give you the most clarity or relief',
      'A love reader can help you understand the emotional and energetic landscape',
      'Read about the spiritual dimensions of love and connection',
      'Notice what comes up when you imagine the best possible outcome'
    ],
    explicitAnchorField: 'primary_domain'
  },
  {
    key: 'career__fear',
    theme: 'The Fork in the Road',
    summary: [
      'A career or financial crossroads carries a particular weight - not just because of what is at stake, but because of what it reveals about what you truly value.',
      'The fear that accompanies a major decision is not always a warning sign. Sometimes it is simply the signal that what you are deciding actually matters to you.',
      'This kind of uncertainty often asks you to distinguish between the fear of making the wrong choice and the fear of fully committing to the right one. They feel similar but require very different responses.'
    ],
    deeperQuestion: 'Are you afraid of making the wrong choice - or afraid of fully committing to the right one?',
    whatNext: [
      'Identify what specific outcome you are most afraid of, and examine whether that fear is proportionate',
      'A career-focused reader can help you see the situation from a different angle',
      'Read about navigating major career transitions with clarity',
      'Write out both paths - what each one costs and what each one genuinely offers'
    ],
    explicitAnchorField: 'emotional_states'
  },
  {
    key: 'career__confusion',
    theme: 'The Uncertain Ground',
    summary: [
      'Feeling directionless in your work or career can be one of the more unsettling experiences, particularly when you have invested significant time in a particular path.',
      'This kind of confusion sometimes signals that you have grown beyond the context you are in, rather than that something is wrong with you. The situation may have become too small for where you are now.',
      'The path forward often becomes visible once you stop trying to see it from within the fog and instead focus on what you know to be true about what energizes you and what does not.'
    ],
    deeperQuestion: 'Is the confusion about which direction to take - or about whether any of the visible options is truly what you want?',
    whatNext: [
      'Spend time with what originally drew you to your current path - is that pull still present?',
      'A reader focused on life purpose can offer a fresh perspective',
      'Read about the spiritual significance of career crossroads',
      'Make a list of what you are moving toward, not just what you are moving away from'
    ],
    explicitAnchorField: 'emotional_states'
  },
  {
    key: 'career__frustration',
    theme: 'The Resistance',
    summary: [
      'Feeling stuck, undervalued, or frustrated in your work is a signal that deserves to be taken seriously rather than pushed through.',
      'Persistent frustration in a professional context often reflects a misalignment between your actual values and the environment you are operating in - not simply a lack of effort or ability.',
      'This resistance may be asking you to push harder, or it may be asking you to reconsider what you are pushing toward. These two responses look very different, and the right one depends on an honest assessment of what is actually blocked.'
    ],
    deeperQuestion: 'Is this situation asking you to push harder - or asking you to reconsider what you are pushing toward?',
    whatNext: [
      'Identify whether the block is primarily external or whether it reflects something you need to shift internally',
      'A reader can help you understand what may be contributing to the pattern of resistance',
      'Read about the difference between persistence and the wisdom of redirection',
      'Notice what would need to change for the work to feel meaningful again'
    ],
    explicitAnchorField: 'emotional_states'
  },
  {
    key: 'money__anxiety',
    theme: 'The Weight of What Is Next',
    summary: [
      'Financial pressure has a way of bleeding into every other area of life. When resources feel uncertain, it is difficult to give full attention to anything else.',
      'The anxiety around money is rarely only about the numbers. It tends to carry deeper fears about security, worth, and what the material world says about you.',
      'Separating the practical concerns from the emotional ones - while acknowledging that both are real - is often the first step toward finding ground again. Both layers need attention, but they need different kinds of response.'
    ],
    deeperQuestion: 'Is the fear about money itself - or about what having or not having money represents to you?',
    whatNext: [
      'Separate the practical concerns from the emotional ones - both are real but need different responses',
      'A reader can help you understand the energetic patterns around abundance in your life',
      'Read about the psychological and spiritual relationship to financial fear',
      'Identify one small area of agency - even a small sense of control can shift the energy'
    ],
    explicitAnchorField: 'primary_domain'
  },
  {
    key: 'career',
    theme: 'The Next Chapter at Work',
    summary: [
      'Questions about work and purpose tend to run deeper than the immediate practical concerns. They connect to larger questions about what you are building and who you are becoming in the process.',
      'Whatever specific situation is on your mind right now, it may be worth asking whether it represents an isolated challenge or part of a larger pattern in how you relate to work, recognition, and your own potential.',
      'This kind of reflection is rarely comfortable, but it is often where the most useful clarity lives.'
    ],
    deeperQuestion: 'What would it mean to truly succeed in what you are pursuing - and is that still what you want?',
    whatNext: [
      'Clarify what success looks like to you right now, not to anyone else',
      'A career or life-purpose reader may offer a useful perspective',
      'Read about navigating career transitions and important decisions',
      'Give yourself permission to want what you actually want'
    ],
    explicitAnchorField: 'primary_domain'
  },
  {
    key: 'spirituality__curiosity',
    theme: 'The Signal',
    summary: [
      'Noticing patterns, synchronicities, and signs is a meaningful form of attention. The fact that something keeps appearing and asking for your awareness is not random.',
      'Whether these signals are pointing to something external or reflecting something shifting internally, the impulse to pay attention to them is worth honoring.',
      'The question is rarely whether the signs are real. The more useful question is what interpretation would make the most sense given what is actually happening in your life right now.'
    ],
    deeperQuestion: 'Are you looking for confirmation of something you already sense - or for permission to trust what you are noticing?',
    whatNext: [
      'Begin documenting the patterns you are noticing - dates, feelings, contexts',
      'A spiritually-oriented reader can help you interpret what is emerging',
      'Read about how symbolic experiences often coincide with internal shifts',
      'Ask yourself what message would make the most sense given what is happening in your life'
    ],
    explicitAnchorField: 'emotional_states'
  },
  {
    key: 'spirituality__anxiety',
    theme: 'The Unsettled Field',
    summary: [
      'When something feels energetically off but you cannot quite name it, that experience is worth taking seriously rather than dismissing.',
      'The body and intuitive field often register shifts before the conscious mind finds language for them. What you are sensing may be real, even if it is not yet fully formed.',
      'This kind of unsettledness sometimes points to something in the external environment that needs attention. At other times it reflects something in your own energy that is asking to be cleared or grounded.'
    ],
    deeperQuestion: 'Is something in your external situation asking for attention - or is something in you asking to be cleared?',
    whatNext: [
      'Name the specific situations where the feeling of unease is strongest',
      'A reader who works with energy can help identify what may be contributing',
      'Read about protection, clearing, and energetic maintenance',
      'Ground yourself through consistent routine - structure can help when energy feels scattered'
    ],
    explicitAnchorField: 'emotional_states'
  },
  {
    key: 'spirituality',
    theme: 'The Inner Compass',
    summary: [
      'A spiritual search often feels more disorienting than it appears from the outside. The very act of questioning, of wanting something deeper, can temporarily make familiar things feel unfamiliar.',
      'What you are reaching toward - whether you call it meaning, connection, or something harder to name - is a genuine need rather than a distraction from practical concerns.',
      'The information you are looking for may already be accessible to you, in the form of what consistently draws your attention, what you avoid, and what questions keep returning.'
    ],
    deeperQuestion: 'What would it feel like to trust what you already know, even without external confirmation?',
    whatNext: [
      'Spend time in stillness and notice what arises without trying to interpret it immediately',
      'A spiritually experienced reader can offer grounding and perspective',
      'Read about spiritual awakening and the different ways it presents',
      'Consider keeping a record of your dreams, signs, and intuitions over the next few weeks'
    ],
    explicitAnchorField: 'primary_domain'
  },
  {
    key: 'future__confusion',
    theme: 'The Fog Before the Path',
    summary: [
      'Not knowing which direction to go at a major crossroads is one of the more disorienting experiences available. The fog of uncertainty is real, even when the practical elements of your situation are visible.',
      'This kind of confusion often accompanies periods of genuine transition - when the old structure has stopped working but the new one has not yet become clear. That space in between is uncomfortable, but it is not without meaning.',
      'The path through this fog rarely becomes visible all at once. It tends to reveal itself incrementally, as you make small movements toward what feels more true, even before you can see the full picture.'
    ],
    deeperQuestion: 'Are you unclear about the direction - or unclear about what you are truly willing to leave behind?',
    whatNext: [
      'Identify what you know for certain, even if it is small - clarity often builds from small truths',
      'A reader can offer perspective from outside your current frame of reference',
      'Read about navigating major life transitions with intention',
      'Give yourself permission to not know - sometimes the path only becomes visible once you begin walking'
    ],
    explicitAnchorField: 'emotional_states'
  },
  {
    key: 'future__fear',
    theme: 'The Unseen Road',
    summary: [
      'Fear of what is coming is one of the most common and most understandable experiences. When the future feels genuinely uncertain, the mind naturally tries to prepare for everything at once.',
      'Not all of what fear generates is useful information. Some of it reflects real probabilities; some of it reflects patterns from the past being projected onto a situation that may be genuinely different.',
      'The most useful thing is often to distinguish between what is actually likely based on current evidence, and what fear is imagining might happen. They are not the same thing, and responding to them requires different tools.'
    ],
    deeperQuestion: 'Are you afraid of a specific outcome - or afraid of the uncertainty itself?',
    whatNext: [
      'Separate what is actually likely from what fear is generating as possibility',
      'A reader focused on timing and what is in motion can offer perspective',
      'Read about how to navigate uncertainty without being controlled by it',
      'Identify what you can genuinely influence and what you need to release'
    ],
    explicitAnchorField: 'emotional_states'
  },
  {
    key: 'future__anticipation',
    theme: 'The Horizon',
    summary: [
      'Sensing that change is coming - before you can fully see it - is a meaningful experience. The fact that you are aware of it suggests that something in you is already tracking what is in motion.',
      'This anticipatory state can feel exciting and unsettling simultaneously. The desire for confirmation that what is coming is good is natural, even when you already sense that it is.',
      'The energy of genuine positive change often has a particular texture - it feels both right and slightly larger than where you currently are. If that is what you are sensing, it may be worth trusting it enough to move toward it.'
    ],
    deeperQuestion: 'Are you waiting for confirmation that it is safe to hope - or are you ready to step toward what you want?',
    whatNext: [
      'Name specifically what you are hoping for and why it matters to you',
      'A reader can help you understand what the current energy is supporting',
      'Read about how periods of transition often carry the seeds of what comes next',
      'Notice what small step forward is available to you right now'
    ],
    explicitAnchorField: 'emotional_states'
  },
  {
    key: 'future',
    theme: 'What Comes Next',
    summary: [
      'Questions about the future tend to carry more weight than the practical details they involve. They are often really questions about readiness, about trust, about what you are willing to commit to.',
      'Whatever is prompting this inquiry, the impulse to understand what is ahead is a natural response to feeling that something significant is in motion - whether you have named it clearly yet or not.',
      'Futures are not simply experienced. They are built from present choices, present attention, and present willingness to act on what you already know.'
    ],
    deeperQuestion: 'What are you really trying to prepare for - and what would it take to feel ready?',
    whatNext: [
      'Clarify what specific outcome would give you the most peace right now',
      'A reader experienced in guidance and timing can offer perspective',
      'Read about what spiritual practice says about trust and navigating uncertainty',
      'Focus on what is in motion now - futures are built from present choices'
    ],
    explicitAnchorField: 'primary_domain'
  },
  {
    key: 'self_growth',
    theme: 'The Turning Point',
    summary: [
      'Personal growth and inner transformation rarely feel like what they look like from the outside. From the inside, they often feel like confusion, restlessness, or the sense that the life you have been living no longer quite fits.',
      'This kind of discomfort is not a sign that something is wrong. It is often the signal that something right is trying to emerge - something that requires you to become slightly larger than you currently are.',
      'The version of yourself you are moving toward is not yet fully formed, which is exactly why the transition feels uncertain. That uncertainty is part of the process, not evidence that the process has failed.'
    ],
    deeperQuestion: 'Are you looking for permission to change - or for confirmation that the change you are already making is the right one?',
    whatNext: [
      'Identify what specific version of yourself you are moving toward, even imprecisely',
      'A reader focused on personal development and spiritual growth can offer insight',
      'Read about how identity shifts often look like confusion before they look like clarity',
      'Trust that the discomfort of growth is not the same as going in the wrong direction'
    ],
    explicitAnchorField: 'primary_domain'
  },
  {
    key: 'family',
    theme: 'The Ties That Shape Us',
    summary: [
      'Family questions carry a particular weight because they involve the relationships that most shaped who you became - for better or for worse, intentionally or not.',
      'Whatever is currently unresolved within your family context, it is likely connected to deeper patterns about belonging, worth, and what you expect from the people who are supposed to be closest to you.',
      'The work of navigating family complexity is rarely straightforward, partly because it is hard to see clearly from inside the patterns you were shaped by. Distance - whether physical, emotional, or temporal - often provides the perspective that proximity does not.'
    ],
    deeperQuestion: 'Are you trying to repair something - or trying to understand whether it can be repaired?',
    whatNext: [
      'Give yourself space to feel what is true without immediately trying to fix it',
      'A reader can offer perspective on the energetic dynamics within families',
      'Read about the spiritual weight of family bonds and how they shape us',
      'Identify what you need from this situation, not just what the situation needs from you'
    ],
    explicitAnchorField: 'primary_domain'
  },
  {
    key: 'protection',
    theme: 'The Shield',
    summary: [
      'Feeling like something external is working against you - or that your energy is being depleted in ways you cannot fully explain - is a real experience that deserves to be taken seriously.',
      'Sometimes what presents itself as bad luck or negative energy reflects actual environmental factors that can be addressed. Sometimes it reflects something within your own energy field that is asking for attention and maintenance.',
      'Distinguishing between external and internal sources of difficulty is the most useful first step. The responses to each are quite different, even though the experience of both can feel similar.'
    ],
    deeperQuestion: 'Is there something in your external environment asking for attention - or something in you asking to be strengthened?',
    whatNext: [
      'Identify specific patterns: when and where does the negative energy feel strongest?',
      'A reader who specializes in protection and energy work can help you understand what is at play',
      'Read about energetic clearing and how to maintain your own field',
      'Begin simple grounding practices - they are consistently more powerful than they appear'
    ],
    explicitAnchorField: 'primary_domain'
  },
];

export function getFallbackNarrative(profile: UserProfile): NarrativeBlock {
  return {
    key: 'fallback',
    theme: 'Your Current Chapter',
    summary: [
      'Whatever brought you here today, the act of pausing to ask the question is itself meaningful. Something is in motion in your life - something that deserves more than passing attention.',
      'The themes that keep returning in your thoughts, the feelings that surface in quiet moments, the questions that persist despite your best efforts to resolve them - these are the signals worth following.',
      'Clarity tends to arrive not all at once, but incrementally - as you pay closer attention to what is actually true for you, rather than what you expect or fear might be true.'
    ],
    deeperQuestion: 'What question, if answered, would change how you move through the next chapter of your life?',
    whatNext: [
      'Take time to name the specific question that is most alive for you right now',
      'A reader can offer a perspective that is outside your current frame',
      'Browse the guides that speak to what you are currently navigating',
      'Notice what you are drawn to - the attraction itself often carries information'
    ],
    explicitAnchorField: 'primary_domain'
  };
}