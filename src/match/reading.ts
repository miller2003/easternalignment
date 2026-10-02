/**
 * src/match/reading.ts
 * Content model for the personalised reading the quiz produces.
 *
 * How the "this gets me" effect is built (keep these rules when editing):
 *  1. Mirror first. Everything the user told us (area, situation, how long,
 *     how it feels, what they hope to hear) is reflected back as concrete,
 *     lived-in detail — the strongest and most honest form of "being seen".
 *  2. Assert only what they told us. Anything inferred is hedged ("often",
 *     "usually", "many people") so a mismatch never breaks the spell.
 *  3. Two-sided statements (Barnum/Forer): one line per area that holds both
 *     sides of an ambivalence ("part of you… another part…") — near-universal
 *     for that situation, yet it reads as deeply personal.
 *  4. Validate the feeling (Linehan levels 4–5: "given this, it makes
 *     sense"), then name the question underneath the question.
 *  5. Safety beats spell. Grief, heartbreak and "overwhelmed" answers get
 *     care notes; nothing ever promises contact with the dead, a returning
 *     ex, or financial outcomes.
 */

import type { Area, Intent, UserAnswers, ReadingCard } from './types';

type Subject = UserAnswers['situationSubject'];

export interface Situation {
  id: string;
  label: string;
  sublabel: string;
  intent: Intent;
  subject: Subject;
  /** Short noun phrase used in mid-quiz reflection + computing copy. */
  short: string;
  headline: string;
  /** Clause that follows the duration lead ("For weeks now, …"). For grief: a full sentence. */
  mirror: string;
  mechanism: string;
  known: string[];
  helps: string[];
  ask: string;
}

export interface AreaDef {
  id: Area;
  label: string;
  sublabel: string;
  situationTitle: string;
  situationSubtitle: string;
  /** The two-sided reflection for this area. */
  twoSided: string;
  /** Topic words used in the reader rationale. */
  topic: string;
  situations: Situation[];
  hopes: string[];
  deck: { id: string; message: string }[];
  guide: { href: string; label: string };
}

/* ────────────────────────────────────────────────────────────────────────
 * Areas & situations
 * ──────────────────────────────────────────────────────────────────────── */

export const AREAS: AreaDef[] = [
  {
    id: 'love',
    label: 'A relationship I’m in',
    sublabel: 'A partner, a spouse, someone I’m committed to',
    situationTitle: 'What’s been happening between you?',
    situationSubtitle: 'Pick the one that sounds most like the last few weeks.',
    twoSided: 'Part of you wants to pull back and protect yourself; another part still wants to lean in and fix it. Both are true, and both are you.',
    topic: 'relationship questions',
    hopes: ['still_care', 'the_truth', 'what_to_do', 'future', 'my_fault', 'let_go'],
    deck: [
      { id: 'two_of_cups', message: 'The bond between you is real. The question this card raises isn’t whether there’s love. It’s whether both of you are willing to tend it equally.' },
      { id: 'the_moon', message: 'Not everything is visible yet, and your mind has been filling the gaps. The Moon asks you to separate what you know from what you fear, and to ask directly about what’s still in shadow.' },
      { id: 'temperance', message: 'Neither chasing nor walking away. Temperance points to a middle path: a pace where you stay open to them without abandoning yourself.' },
    ],
    guide: { href: '/guides/love/', label: 'Love & relationship guides' },
    situations: [
      {
        id: 'distant', label: 'They’ve pulled away', sublabel: 'Quieter, colder, less present than before',
        intent: 'love_relationship', subject: 'another_person', short: 'them pulling away',
        headline: 'When someone you love goes quiet',
        mirror: 'you’ve been watching them pull back: shorter replies, less warmth, a distance you can feel even when you’re in the same room.',
        mechanism: 'When a partner withdraws, it’s usually about something they’re carrying (stress, fear, a feeling they don’t know how to say) far more often than a simple loss of love. But silence is a vacuum, and an anxious mind fills it with the worst-case story. The work now is separating what’s actually happening from the story the silence is writing.',
        known: ['You’re not imagining it. You noticed a real change, and noticing is a strength, not paranoia.', 'You care enough to want the truth rather than a comfortable guess.'],
        helps: ['What’s actually behind the distance: stress, fear, or the relationship itself', 'Whether this is a phase they’ll come back from, or a bigger shift', 'How to reach them without pushing them further away'],
        ask: 'What’s really behind the distance I’m feeling from [Name] right now? Is it about me, about us, or about something they’re carrying alone?',
      },
      {
        id: 'hot_cold', label: 'Hot and cold', sublabel: 'Close and warm one day, distant the next',
        intent: 'another_person_intentions', subject: 'relationship_dynamic', short: 'on-and-off attention',
        headline: 'The hot-and-cold loop',
        mirror: 'they’ve been warm one day and distant the next, and you’ve been the one holding it together, rereading messages and trying to work out what changed.',
        mechanism: 'On-and-off attention is uniquely exhausting. Psychologists call it intermittent reinforcement: when warmth arrives unpredictably, the mind stays on high alert waiting for the next good moment, which is exactly why it’s so hard to stop thinking about. It’s not that you’re too attached. Unpredictability keeps anyone hooked.',
        known: ['The inconsistency is real. You’re not inventing it.', 'The good moments are genuine too, which is what makes this so confusing.'],
        helps: ['What’s driving the swings on their side', 'Whether the warm version is the real one, and how to see more of it', 'Where your line is, and how to hold it without losing the connection'],
        ask: 'Why does [Name] keep swinging between close and distant with me, and which version reflects how they really feel?',
      },
      {
        id: 'suspect', label: 'Something feels off', sublabel: 'Secrets, someone else, or a story that doesn’t add up',
        intent: 'another_person_intentions', subject: 'another_person', short: 'a feeling that something’s being hidden',
        headline: 'When your gut says something’s off',
        mirror: 'you’ve had a feeling you can’t shake: small things that don’t add up, a phone held a little closer, a story that changes in the retelling.',
        mechanism: 'Your gut is a pattern-detector. It notices small shifts long before your conscious mind can name them. That doesn’t make every suspicion true (old hurt can sound the same alarm), but it does mean the feeling deserves to be examined, not dismissed. A reading can’t prove anything; treat what you hear as a lens, not evidence.',
        known: ['Something has shifted enough for you to notice. That part is real.', 'You’d rather know the truth than keep living with the question.'],
        helps: ['Whether the feeling points to something real, or to fear from past hurt', 'What’s being left unsaid between you', 'How to raise it in a way that gets an honest answer'],
        ask: 'Is there something [Name] isn’t telling me about our relationship, and what do I need to see clearly right now?',
      },
      {
        id: 'conflict', label: 'The same fight, again', sublabel: 'We keep circling the same argument',
        intent: 'love_relationship', subject: 'relationship_dynamic', short: 'the same argument on repeat',
        headline: 'The fight underneath the fight',
        mirror: 'you two have been having the same argument in different outfits: a different trigger, the same ending, the same feeling of not being heard.',
        mechanism: 'When couples fight about the same thing again and again, the topic is rarely the real issue. Underneath, there’s usually a need that isn’t being met: to feel respected, chosen, safe, or seen. Until that need is named, the fight keeps finding new reasons to happen.',
        known: ['You’re still fighting for this. People who’ve given up stop arguing.', 'The repetition itself is telling you something important.'],
        helps: ['What need sits underneath the argument, yours and theirs', 'Whether you’re both still willing to change the pattern', 'The one conversation that could break the loop'],
        ask: 'What is the real issue underneath the conflict between [Name] and me, and what would help us break the pattern?',
      },
      {
        id: 'future_unsure', label: 'We’re okay, but…', sublabel: 'I’m not sure this is my forever',
        intent: 'love_relationship', subject: 'myself', short: 'quiet doubts about the future',
        headline: 'The quiet question',
        mirror: 'things have looked fine from the outside, but a quieter question keeps surfacing: is this really where you’re meant to be?',
        mechanism: 'Doubt in a stable relationship is more common than people admit, and it doesn’t automatically mean something is wrong. Sometimes it signals a real mismatch; sometimes it’s a season of growth asking the relationship to grow with you. The difference usually lies in what the doubt is actually about.',
        known: ['You’re being honest with yourself, which takes courage when nothing is obviously “wrong”.', 'You want to choose this relationship, not just stay in it by default.'],
        helps: ['Whether the doubt is about them, the relationship, or a change in you', 'What a shared future realistically looks like', 'What would need to change for you to feel sure'],
        ask: 'Is my relationship with [Name] aligned with the life I’m growing into, and what is my doubt really trying to tell me?',
      },
      {
        id: 'their_feelings', label: 'I can’t tell how they feel', sublabel: 'I don’t know where I stand with them',
        intent: 'another_person_intentions', subject: 'another_person', short: 'not knowing where you stand',
        headline: 'Not knowing where you stand',
        mirror: 'you’ve been trying to read someone who won’t quite let themselves be read, studying their words, their tone, the space between their messages.',
        mechanism: 'Uncertainty is harder on the mind than bad news. Studies find people are more stressed waiting on an uncertain outcome than a certain bad one. That’s why not knowing where you stand takes up so much space: your mind keeps working the problem because it has no answer to rest on.',
        known: ['You want clarity more than comfort, and that’s a strong place to ask from.', 'You’ve been reading their signals carefully. You’re more perceptive than you give yourself credit for.'],
        helps: ['How they actually feel about you right now', 'What’s holding them back from showing it clearly', 'What to expect from them in the coming weeks'],
        ask: 'How does [Name] truly feel about me right now, and what’s holding them back from showing it?',
      },
    ],
  },
  {
    id: 'dating',
    label: 'Someone I’m seeing or interested in',
    sublabel: 'Dating, a crush, a situationship',
    situationTitle: 'Which sounds most like where things are?',
    situationSubtitle: 'Go with your first instinct.',
    twoSided: 'One part of you is already imagining where this could go; another part is quietly bracing for disappointment. You’re trying to stay open without getting hurt again.',
    topic: 'new and undefined connections',
    hopes: ['still_care', 'the_truth', 'what_to_do', 'future', 'let_go'],
    deck: [
      { id: 'page_of_cups', message: 'Something tender is opening. This card says: let it stay curious before it becomes serious. Watch what they do, not just what they say.' },
      { id: 'knight_of_cups', message: 'Romance is on offer. The Knight is charming, and the lesson is to notice whether their actions keep pace with the poetry.' },
      { id: 'the_star', message: 'After everything you’ve been through, The Star is a reminder that good, easy connection is still possible for you, and you’re allowed to want it.' },
    ],
    guide: { href: '/guides/love/', label: 'Love & dating guides' },
    situations: [
      {
        id: 'mixed_signals', label: 'Mixed signals', sublabel: 'Interested one moment, vague the next',
        intent: 'another_person_intentions', subject: 'another_person', short: 'mixed signals',
        headline: 'Reading the mixed signals',
        mirror: 'you’ve been getting two messages at once: enough interest to keep you hoping, not enough to let you relax.',
        mechanism: 'Mixed signals in early dating usually mean one of three things: they’re interested but cautious, interested but not available, or they enjoy the attention more than the connection. From the outside the three look almost identical, which is exactly why you’re stuck decoding it.',
        known: ['There’s something real there. Otherwise you wouldn’t still be asking.', 'You deserve interest you don’t have to decode.'],
        helps: ['Which of the three it is: cautious, unavailable, or not serious', 'What they actually want from this', 'Whether to lean in or ease back'],
        ask: 'What does [Name] really want with me, and are they emotionally available for it right now?',
      },
      {
        id: 'fading', label: 'They’ve gone quiet', sublabel: 'Slower replies, a fade, or ghosting',
        intent: 'another_person_intentions', subject: 'another_person', short: 'a slow fade',
        headline: 'When the messages slow down',
        mirror: 'you’ve felt the energy shift: replies getting slower, plans getting vaguer, and you checking your phone more than you’d like to admit.',
        mechanism: 'A fade is one of the most painful ways to be let down, because it gives you nothing solid to respond to. People fade for many reasons: overwhelm, avoidance, someone else, or simply not knowing how to say “I’m not ready”. It almost always says more about their capacity than your worth.',
        known: ['You noticed the shift early. Your instincts are working.', 'You deserve a clear answer, not a guessing game.'],
        helps: ['Why they pulled back', 'Whether there’s still real interest underneath', 'Whether to reach out, or let the silence answer'],
        ask: 'Why has [Name] pulled back from me, and is there still genuine interest there?',
      },
      {
        id: 'situationship', label: 'Something, but undefined', sublabel: 'A situationship with no label',
        intent: 'dating', subject: 'relationship_dynamic', short: 'a connection with no name',
        headline: 'The in-between',
        mirror: 'you’ve been in something that feels like more than casual and less than committed, and every time you think about asking “what are we?”, you hesitate.',
        mechanism: 'Undefined connections can feel safe: no one can lose what was never named. But the ambiguity usually costs one person more than the other. If you’re the one carrying more of the hope, the question isn’t “is it wrong to want more?” It’s “can this person meet me there?”',
        known: ['You want more than this arrangement is giving you, and that’s a fair thing to want.', 'Your hesitation to ask isn’t weakness. It’s protecting something that matters to you.'],
        helps: ['Whether they see a future in this or prefer it undefined', 'What would happen if you asked for more', 'Whether this is worth your waiting'],
        ask: 'Where does [Name] see our connection going, and are they willing to define it?',
      },
      {
        id: 'new_spark', label: 'Someone new, and I’m wary', sublabel: 'Real chemistry, but I’ve been hurt before',
        intent: 'dating', subject: 'another_person', short: 'a new spark',
        headline: 'Open, but careful',
        mirror: 'you’ve been feeling a real spark with someone new and, right alongside it, a quiet voice reminding you what happened last time.',
        mechanism: 'After being hurt, the nervous system learns to treat excitement and danger as the same signal. That’s why a good connection can feel unsettling. Being wary isn’t the problem; it’s information. The goal is to let their consistency, over time, tell you whether you can relax.',
        known: ['You’re choosing to protect your peace rather than rush. That’s growth.', 'The chemistry is real. What’s unproven is consistency.'],
        helps: ['Whether their intentions are sincere', 'Any patterns worth watching early on', 'Whether this has potential beyond the spark'],
        ask: 'What are [Name]’s real intentions with me, and is there anything I should be aware of as this develops?',
      },
      {
        id: 'crush', label: 'I like someone', sublabel: 'And I don’t know if they feel it too',
        intent: 'another_person_intentions', subject: 'another_person', short: 'a crush you can’t read',
        headline: 'Do they feel it too?',
        mirror: 'you’ve been carrying a feeling for someone and quietly looking for proof it’s mutual: a look held a second too long, a message that might mean more.',
        mechanism: 'When we like someone, we read every signal through hope. It’s called confirmation bias, and everyone does it. That doesn’t mean the signals aren’t real. It means you deserve a clearer read than your own heart can give you right now.',
        known: ['Your feelings are real and worth taking seriously.', 'You’d rather know than keep wondering. That’s courage.'],
        helps: ['Whether they feel something for you', 'What’s keeping either of you from making a move', 'Whether to make a move, and when'],
        ask: 'Does [Name] have feelings for me, and is there a real chance for something between us?',
      },
    ],
  },
  {
    id: 'breakup',
    label: 'An ex, a breakup, or no contact',
    sublabel: 'Wanting them back, or wanting to let go',
    situationTitle: 'Where are things with your ex right now?',
    situationSubtitle: 'Pick the one that’s closest, even if it’s not exact.',
    twoSided: 'Some days you’re sure you’re better off. Other days, one song or one memory undoes all of it. That back-and-forth isn’t failure. It’s what letting go actually looks like from the inside.',
    topic: 'breakups and reconciliation',
    hopes: ['come_back', 'miss_me', 'reach_out', 'my_fault', 'let_go', 'the_truth'],
    deck: [
      { id: 'five_of_cups', message: 'You’ve been looking at what spilled. Behind you, two cups are still standing: something from this is still yours to keep, whether that’s the relationship or the lesson.' },
      { id: 'six_of_cups', message: 'The past is pulling at you. Some of that pull is love; some is the comfort of what’s familiar. This card asks you to tell the two apart.' },
      { id: 'wheel_of_fortune', message: 'Nothing about this is fixed. The Wheel says a turn is coming. The question is what you want to be standing on when it does.' },
    ],
    guide: { href: '/guides/breakups-ex-recovery/', label: 'Breakup & ex recovery guides' },
    situations: [
      {
        id: 'no_contact', label: 'No contact', sublabel: 'The silence is the loudest thing in my life',
        intent: 'breakup_ex', subject: 'another_person', short: 'no-contact silence',
        headline: 'Waiting in the silence',
        mirror: 'you’ve been living inside the silence: no messages, no answers, and a mind that keeps filling the quiet with questions.',
        mechanism: 'Silence after a breakup isn’t neutral to the brain. Research on heartbreak shows that losing someone lights up the same reward pathways as withdrawal, which is why the urge to check, wait, or reach out can feel almost physical. Their silence may mean distance, processing, pride, or pain. It rarely means they felt nothing.',
        known: ['What you had mattered. That’s why the silence hurts this much.', 'You’re still standing, even on the days it doesn’t feel like it.'],
        helps: ['What their silence actually means', 'Whether they’re thinking about you, and what they feel', 'Whether to wait, reach out, or start closing the door'],
        ask: 'What is [Name] feeling during this silence between us, and is this a pause or an ending?',
      },
      {
        id: 'blindsided', label: 'They ended it', sublabel: 'I didn’t see it coming, or didn’t want it',
        intent: 'breakup_ex', subject: 'past_closure', short: 'a breakup you didn’t choose',
        headline: 'When it wasn’t your choice',
        mirror: 'you’ve been trying to make sense of an ending you didn’t choose, replaying conversations, looking for the moment it turned, wondering what you missed.',
        mechanism: 'When a breakup isn’t your decision, you lose the person and your sense of control at the same time. The mind tries to win back control by searching for the “reason”, which is why you replay. But the reason often lives inside the other person and was never fully visible from where you stood.',
        known: ['You loved with your whole heart. That’s not a mistake.', 'Not seeing it coming doesn’t mean you weren’t paying attention.'],
        helps: ['What really led them to end it', 'Whether anything is left unresolved between you', 'What this chapter is asking you to learn, so it doesn’t repeat'],
        ask: 'What was really behind [Name]’s decision to end things, and is there anything still unresolved between us?',
      },
      {
        id: 'on_off', label: 'On again, off again', sublabel: 'We keep breaking up and getting back together',
        intent: 'breakup_ex', subject: 'relationship_dynamic', short: 'an on-and-off cycle',
        headline: 'The cycle',
        mirror: 'you’ve been riding a cycle (together, apart, together again) and each round costs a little more than the last.',
        mechanism: 'On-off relationships tend to repeat because the reunion feels like relief, and relief feels like love. If nothing changes between rounds, the cycle usually tightens rather than heals. The real question isn’t “do we love each other?” It’s “can we become people who don’t need to break up to be heard?”',
        known: ['The pull between you is real. This isn’t one-sided.', 'Part of you is tired of the cycle, and that tiredness is wisdom.'],
        helps: ['Why the cycle keeps repeating', 'Whether anything is genuinely different this time', 'What breaking the pattern would take, together or apart'],
        ask: 'What keeps pulling [Name] and me back into this cycle, and is this time genuinely different?',
      },
      {
        id: 'moved_on', label: 'They seem to have moved on', sublabel: 'Maybe with someone new',
        intent: 'breakup_ex', subject: 'another_person', short: 'seeing them move on',
        headline: 'When they seem to have moved on',
        mirror: 'you’ve been watching them seem to move on, maybe with someone new, while you’re still in the middle of it.',
        mechanism: 'What people show on the outside after a breakup is often a performance of being fine, of being free. Rebounds are frequently a way to avoid grief, not proof it’s over. Still, the healthiest question isn’t “are they really happy?” but “what do I need to stop measuring my healing against theirs?”',
        known: ['Seeing them move on hurts because the bond was real.', 'Your healing doesn’t have to keep pace with theirs.'],
        helps: ['What they genuinely feel beneath the surface', 'Whether the new connection is serious', 'How to take your focus back'],
        ask: 'What is [Name] really feeling beneath how they’re presenting, and what do I need to know to move forward?',
      },
      {
        id: 'i_left', label: 'I ended it', sublabel: 'And now I’m not sure I was right',
        intent: 'breakup_ex', subject: 'myself', short: 'second-guessing your decision',
        headline: 'Second-guessing the goodbye',
        mirror: 'you’ve been second-guessing a goodbye you chose, remembering the good parts more vividly than the reasons you left.',
        mechanism: 'After we end something, memory plays a trick: the good moments sharpen and the hard ones blur. Psychologists call it rosy retrospection. It doesn’t mean you were wrong, and it doesn’t mean you were right. It means you’re grieving something you chose, which is its own quiet kind of grief.',
        known: ['You had real reasons. They were true then, even if they feel fuzzy now.', 'Missing someone and being right to leave can both be true.'],
        helps: ['Whether the reasons you left still hold', 'What they feel now, and whether a door is still open', 'What you’d need to see change before considering it'],
        ask: 'Was ending things with [Name] the right choice for my path, and is anything between us still meant to be resolved?',
      },
      {
        id: 'cant_let_go', label: 'I can’t let go', sublabel: 'It’s been a while, and I’m still stuck',
        intent: 'breakup_ex', subject: 'past_closure', short: 'a bond that won’t let go',
        headline: 'The bond that won’t loosen',
        mirror: 'you’ve been carrying this person with you long after it ended, and wondering why everyone else seems to move on faster.',
        mechanism: 'Some bonds hold on because something was left unfinished: an unanswered question, an apology that never came, a future you’d already started living in. Letting go usually doesn’t happen by forcing it. It happens when the unfinished part finally gets named.',
        known: ['How long it takes you to heal isn’t a measure of weakness.', 'Something about this still feels unfinished, and that’s worth understanding.'],
        helps: ['What’s keeping the bond alive for you', 'Whether they’re still connected to you, too', 'What closure could actually look like'],
        ask: 'What is still tying me to [Name], and what do I need to understand to finally find closure?',
      },
    ],
  },
  {
    id: 'career',
    label: 'Work, career, or money',
    sublabel: 'A job, a choice, or financial pressure',
    situationTitle: 'What’s going on with work or money?',
    situationSubtitle: 'Pick the one that’s taking up the most space in your head.',
    twoSided: 'You’re capable of more than your current situation asks of you, and somewhere you know that. But knowing it and feeling safe enough to act on it are two different things.',
    topic: 'career and money questions',
    hopes: ['right_move', 'which_path', 'when', 'good_enough', 'okay'],
    deck: [
      { id: 'eight_of_pentacles', message: 'Your effort has been building something real, even when no one noticed. This card says your skill is the asset; the question is where it’s most valued.' },
      { id: 'three_of_wands', message: 'Your ships are already out. What you’ve set in motion is starting to return, so look further ahead than the next few weeks.' },
      { id: 'the_chariot', message: 'Movement comes from decision. You don’t need every answer to start steering. The Chariot rewards the person who picks a direction and commits.' },
    ],
    guide: { href: '/guides/career-money/', label: 'Career & money guides' },
    situations: [
      {
        id: 'stuck', label: 'I feel stuck', sublabel: 'Work drains me, but leaving feels risky',
        intent: 'career_work', subject: 'myself', short: 'feeling stuck at work',
        headline: 'Outgrowing where you are',
        mirror: 'you’ve been showing up to work that takes more than it gives: capable of more, but not sure leaving is safe.',
        mechanism: 'Feeling stuck is often a sign of growth, not failure: the role fit who you were, not who you’re becoming. What keeps people in place is rarely laziness. It’s uncertainty, and the very human preference for a known discomfort over an unknown risk.',
        known: ['You’ve outgrown something. That’s why it feels tight.', 'Wanting more isn’t ungrateful. It’s information.'],
        helps: ['Whether this is a season to stay and build, or to move', 'Where your energy and skills are actually being called', 'The timing for a change, if one is coming'],
        ask: 'Is it time for me to move on from my current work, and what direction is truly calling me?',
      },
      {
        id: 'offer', label: 'A choice to make', sublabel: 'An offer, a pivot, or two options',
        intent: 'career_work', subject: 'future_event', short: 'a career decision',
        headline: 'At the career crossroads',
        mirror: 'you’ve been weighing a real decision, running the numbers, then running them again, waiting to feel sure.',
        mechanism: 'Big career choices rarely come with certainty. When the pros and cons are close, more analysis doesn’t help; it just loops. What usually breaks the tie is clarity about what you’re optimizing for: security, growth, freedom, or meaning.',
        known: ['You have options, which means you’ve built something real.', 'You’ve done the logical homework. What’s missing is a different kind of clarity.'],
        helps: ['How each path is likely to unfold', 'Which choice you’d regret more', 'Hidden factors you can’t see from inside the decision'],
        ask: 'Of the options in front of me, which path leads to the growth I’m looking for, and what am I not seeing?',
      },
      {
        id: 'workplace', label: 'Trouble at work', sublabel: 'A boss, a colleague, or office politics',
        intent: 'career_work', subject: 'another_person', short: 'tension at work',
        headline: 'When work gets personal',
        mirror: 'you’ve been navigating tension at work, reading the room, guarding your words, and bringing more of it home than you’d like.',
        mechanism: 'Workplace conflict is draining because it pulls on two needs at once: being respected and being secure. When someone threatens either, the body treats it like a real threat, which is why it follows you home and into the night.',
        known: ['You’re handling more than most people can see.', 'Your sense that something’s off with this dynamic is worth trusting.'],
        helps: ['What’s really driving the other person', 'How the situation is likely to develop', 'Whether to address it, work around it, or move on'],
        ask: 'What’s really going on behind the tension at work, and how is it likely to play out for me?',
      },
      {
        id: 'waiting', label: 'Waiting to hear back', sublabel: 'A job search, an interview, a promotion',
        intent: 'career_work', subject: 'future_event', short: 'waiting on an outcome',
        headline: 'The waiting room',
        mirror: 'you’ve been waiting on an answer about your future, refreshing your inbox and trying not to read too much into the silence.',
        mechanism: 'Waiting is one of the hardest mental states because there’s nothing to do with the energy. The mind tries to help by rehearsing every outcome. It’s not pessimism; it’s preparation running in overdrive.',
        known: ['You’ve already done the hard part: putting yourself forward.', 'The outcome doesn’t decide your worth. It decides your next step.'],
        helps: ['What’s likely to come of this', 'Rough timing for news', 'What to focus on while you wait'],
        ask: 'How is the opportunity I’m waiting on likely to unfold, and when should I expect movement?',
      },
      {
        id: 'money_pressure', label: 'Money pressure', sublabel: 'Debt, bills, or not enough coming in',
        intent: 'money_finance', subject: 'myself', short: 'money pressure',
        headline: 'Carrying the money weight',
        mirror: 'you’ve been carrying money worries that sit at the back of everything, doing the math at night and trying to find a way through.',
        mechanism: 'Financial stress uses up mental bandwidth in a measurable way. Research suggests money worry can dent focus about as much as a sleepless night. That’s why it feels like it’s taking over: it literally is taking up space. A clearer plan gives the worry somewhere to go.',
        known: ['You’re facing it rather than looking away. That’s the hard part.', 'This is a season, not a verdict on who you are.'],
        helps: ['Where the turning point might come from', 'Which opportunities deserve your energy', 'When things are likely to ease'],
        ask: 'Where is my financial turning point likely to come from, and what should I focus on now to meet it?',
      },
      {
        id: 'money_move', label: 'A big money decision', sublabel: 'An investment, a purchase, a business',
        intent: 'money_finance', subject: 'future_event', short: 'a big money decision',
        headline: 'Before the big money move',
        mirror: 'you’ve been sitting with a big money decision, excited by the upside and unsettled by the risk.',
        mechanism: 'When the stakes are high, the mind swings between excitement and fear, and both distort judgment. A reading can help you see your own motives and blind spots more clearly. It isn’t financial advice, and the numbers still deserve a qualified eye.',
        known: ['You’re pausing to check before you leap. That’s wisdom.', 'Some part of you already has a lean, and it’s worth understanding why.'],
        helps: ['What’s driving the decision: opportunity or pressure', 'Blind spots worth checking', 'Whether the timing feels right'],
        ask: 'What do I need to see clearly about this financial decision, and is the timing right for me?',
      },
    ],
  },
  {
    id: 'direction',
    label: 'A big decision, or where life is heading',
    sublabel: 'A crossroads, timing, purpose',
    situationTitle: 'Which feels closest?',
    situationSubtitle: 'There’s no wrong answer here.',
    twoSided: 'You’re more intuitive than you let on, but you’ve learned to double-check your gut with logic. Right now the two are telling you slightly different things.',
    topic: 'decisions, timing and direction',
    hopes: ['which_path', 'right_move', 'when', 'purpose', 'okay', 'the_truth'],
    deck: [
      { id: 'two_of_swords', message: 'You’ve been holding the decision at arm’s length, blindfolded by trying to be fair to both sides. The way forward opens when you let yourself feel, not just think.' },
      { id: 'the_fool', message: 'A new beginning is asking for a little trust. Not recklessness, just the willingness to take the first step before the whole road is visible.' },
      { id: 'the_hermit', message: 'The answer isn’t out there yet; it’s in here. The Hermit asks for quiet, so you can hear what you already know.' },
    ],
    guide: { href: '/guides/getting-started/', label: 'Getting-started guides' },
    situations: [
      {
        id: 'two_paths', label: 'Torn between two paths', sublabel: 'Each one looks right on different days',
        intent: 'decision_making', subject: 'myself', short: 'a choice between two paths',
        headline: 'Between two roads',
        mirror: 'you’ve been standing between two roads, and each time you lean toward one, the other starts to look better.',
        mechanism: 'When two options feel equally right, it’s usually because each one protects something you care about. The paralysis isn’t indecision; it’s loyalty to two different parts of yourself. Clarity comes from naming which part needs to lead right now.',
        known: ['Both options mean something to you. That’s why it’s hard.', 'You don’t need a perfect choice, just a true one.'],
        helps: ['How each path is likely to unfold', 'What your hesitation is protecting', 'Which choice fits who you’re becoming'],
        ask: 'Between the two paths in front of me, which one fits who I’m becoming, and what am I afraid of in each?',
      },
      {
        id: 'big_change', label: 'Thinking about a big change', sublabel: 'Moving, leaving, starting over',
        intent: 'decision_making', subject: 'future_event', short: 'a big life change',
        headline: 'On the edge of a big change',
        mirror: 'you’ve been feeling the pull toward a big change, imagining a different life and then talking yourself back down.',
        mechanism: 'The urge for a big change often arrives before the reasons are fully clear. Sometimes it’s a genuine calling; sometimes it’s a need that could be met closer to home. Both deserve to be heard before you leap, or before you dismiss it.',
        known: ['The pull is real, and it’s been persistent. That matters.', 'Part of you is braver than you’ve been allowing.'],
        helps: ['Whether this change is the answer or a signpost', 'What the timing looks like', 'What to prepare before you move'],
        ask: 'Is the big change I’m considering truly right for me, and what timing would support it?',
      },
      {
        id: 'timing', label: 'Waiting for life to shift', sublabel: 'When is it finally going to happen?',
        intent: 'future_direction', subject: 'future_event', short: 'waiting for life to shift',
        headline: 'When is it my turn?',
        mirror: 'you’ve been waiting for something to finally shift, doing what you can and wondering when it’s your turn.',
        mechanism: 'Long waits wear down hope, especially when you’ve done everything right. It’s easy to start reading delay as rejection. But timing has its own logic, and things are often moving underneath long before you can see the surface change.',
        known: ['You’ve kept going when it would have been easier to quit.', 'What you want hasn’t stopped being possible just because it’s late.'],
        helps: ['What’s shifting beneath the surface', 'Realistic timing for change', 'What you can do now to meet it'],
        ask: 'What’s shifting for me over the next three to six months, and what can I do to meet it?',
      },
      {
        id: 'lost', label: 'I don’t know what I want', sublabel: 'I’ve lost my sense of direction',
        intent: 'self_reflection', subject: 'myself', short: 'feeling directionless',
        headline: 'Between chapters',
        mirror: 'you’ve been feeling unmoored, doing the things but without the old sense of where it’s all going.',
        mechanism: 'Losing your sense of direction often happens when an old version of you has finished its job and a new one hasn’t arrived yet. It feels like emptiness, and it’s often a doorway. The pressure to “figure it out” fast usually makes it slower.',
        known: ['You’re between chapters, not off the map.', 'The fact that you’re asking means something in you is ready to move.'],
        helps: ['What’s ending and what’s beginning', 'What keeps quietly calling you', 'A first step that feels right, not just logical'],
        ask: 'What is this season of my life asking of me, and what direction is quietly calling me forward?',
      },
      {
        id: 'pattern', label: 'The same thing keeps happening', sublabel: 'Different people, same ending',
        intent: 'self_reflection', subject: 'myself', short: 'a pattern that keeps repeating',
        headline: 'The pattern',
        mirror: 'you’ve been noticing a pattern that keeps coming back: different people, different places, the same ending.',
        mechanism: 'Patterns repeat not because you’re broken, but because the mind seeks what’s familiar, even when familiar hurts. Seeing the pattern is the first real step out of it, and most people never get that far.',
        known: ['Noticing it is the hardest part, and you’ve already done that.', 'The pattern isn’t who you are. It’s something you learned.'],
        helps: ['Where the pattern started', 'What it’s been protecting you from', 'What breaking it would look like'],
        ask: 'What pattern keeps repeating in my life, where did it begin, and what will it take to break it?',
      },
    ],
  },
  {
    id: 'unsure',
    label: 'I can’t quite name it',
    sublabel: 'Something feels off, or about to change',
    situationTitle: 'Which comes closest?',
    situationSubtitle: 'It doesn’t have to be exact. Go with what you feel.',
    twoSided: 'From the outside you probably look like you’re handling things fine. Inside, something has been asking for your attention for a while.',
    topic: 'general guidance',
    hopes: ['the_truth', 'when', 'purpose', 'okay', 'right_move'],
    deck: [
      { id: 'high_priestess', message: 'You know more than you’re letting yourself know. Something is ready to surface; it just needs quiet to be heard.' },
      { id: 'the_star', message: 'Whatever has felt heavy or unclear, The Star is about the light coming back in. Healing and direction are closer than they feel.' },
      { id: 'wheel_of_fortune', message: 'A turn is coming. The Wheel says the unease you feel is the first creak of change, and change can be in your favor.' },
    ],
    guide: { href: '/guides/spirituality/', label: 'Spirituality & intuition guides' },
    situations: [
      {
        id: 'shift', label: 'Something’s about to shift', sublabel: 'I can feel change coming',
        intent: 'future_direction', subject: 'future_event', short: 'a sense that change is coming',
        headline: 'Before the shift',
        mirror: 'you’ve been sensing something on the horizon. You can’t name it, but you can feel the ground starting to move.',
        mechanism: 'That pre-change feeling is real: the mind picks up on small signals before they add up to something you can explain. It can feel like restlessness, anticipation, or unease, often all three at once.',
        known: ['Your intuition is switched on right now.', 'You’re paying attention, which means you’ll be ready.'],
        helps: ['What’s coming, and roughly when', 'Which area of life it touches first', 'How to prepare'],
        ask: 'What change is coming into my life, and which area will it touch first?',
      },
      {
        id: 'heavy', label: 'Everything feels heavy', sublabel: 'And I don’t really know why',
        intent: 'general_guidance', subject: 'myself', short: 'a heaviness you can’t explain',
        headline: 'The weight without a name',
        mirror: 'you’ve been carrying a heaviness without a clear reason, like walking around in a coat you can’t take off.',
        mechanism: 'Unexplained heaviness usually has roots: small disappointments piling up, something unprocessed, or simply running too long without rest. If it has lasted weeks and is touching your sleep, appetite, or getting through the day, talking to a doctor or counselor is worth doing alongside anything else.',
        known: ['You’re not being dramatic. What you feel is real.', 'Something in you is asking for care, not more pushing.'],
        helps: ['What the weight is really about', 'What would genuinely lighten it', 'Where the next good thing is coming from'],
        ask: 'What is really weighing on me right now, and what will help it lift?',
      },
      {
        id: 'signs', label: 'I keep noticing signs', sublabel: 'Repeating numbers, dreams, coincidences',
        intent: 'general_guidance', subject: 'not_sure', short: 'signs and synchronicities',
        headline: 'When the signs keep showing up',
        mirror: 'you’ve been noticing signs (repeating numbers, vivid dreams, coincidences) that feel like they’re pointing somewhere.',
        mechanism: 'Whether you see them as spiritual messages or as your intuition getting louder, signs tend to appear when something in you is ready to pay attention. The meaning usually lies less in the sign itself and more in what you were thinking about when it appeared.',
        known: ['You’re unusually tuned in right now.', 'Something is asking for your attention.'],
        helps: ['What the signs might be pointing to', 'Which area of life they relate to', 'What to do with the message'],
        ask: 'What are the signs I keep seeing trying to tell me, and what should I do with that message?',
      },
      {
        id: 'neutral', label: 'Stuck, but not sure why', sublabel: 'Life isn’t bad. It just isn’t moving',
        intent: 'self_reflection', subject: 'myself', short: 'a stuck feeling',
        headline: 'Stuck in neutral',
        mirror: 'you’ve been feeling stuck in neutral. Life isn’t bad, exactly; it just isn’t moving.',
        mechanism: 'Stuck usually means your energy is going somewhere you can’t see: into worry, into holding things together, or into waiting for permission. Once you see where it’s going, momentum tends to return faster than you’d expect.',
        known: ['You’re ready for movement. That’s why stillness feels uncomfortable.', 'You haven’t lost anything; it’s waiting to be pointed somewhere.'],
        helps: ['Where your energy is leaking', 'What’s ready to move', 'A first step'],
        ask: 'Where is my energy stuck right now, and what’s ready to move in my life?',
      },
      {
        id: 'curious', label: 'Just curious what’s ahead', sublabel: 'Nothing’s wrong. I want a wider view',
        intent: 'general_guidance', subject: 'not_sure', short: 'curiosity about what’s ahead',
        headline: 'A wider view',
        mirror: 'you’ve been feeling ready for a wider view. Not because something’s wrong, but because you sense you’re at the edge of something.',
        mechanism: 'Coming to a reading from a calm place is the best position to be in: you’ll hear what’s actually said, not just what you’re hoping for.',
        known: ['You’re steady enough to hear a real answer.', 'You’re open, which is when readings tend to be most useful.'],
        helps: ['The biggest theme for the months ahead', 'Opportunities you might be overlooking', 'Where to put your energy'],
        ask: 'What’s the biggest theme for me in the coming months, and where should I put my energy?',
      },
    ],
  },
  {
    id: 'grief',
    label: 'Someone I’ve lost',
    sublabel: 'A loved one who has passed',
    situationTitle: 'Who are you missing?',
    situationSubtitle: 'Take your time.',
    twoSided: 'Some moments you can feel them close; other moments the distance is unbearable. Both can be true in the same day.',
    topic: 'mediumship and grief',
    hopes: ['at_peace', 'still_here', 'forgive', 'message', 'how_it_ended'],
    deck: [
      { id: 'six_of_cups', message: 'Love remembered is love that remains. This card is about the sweetness of shared memory, the parts of them you will always carry.' },
      { id: 'the_star', message: 'Healing doesn’t mean forgetting. The Star is the light that slowly returns, and many people describe it as feeling them close again.' },
      { id: 'temperance', message: 'Temperance is a bridge between two places. The bond hasn’t ended; it’s changing form, and it can be tended gently, at your own pace.' },
    ],
    guide: { href: '/guides/mediumship/', label: 'Mediumship & grief guides' },
    situations: (
      [
        ['parent', 'A parent', 'a parent', 'Missing a parent', 'Losing a parent rearranges the ground under you. They were part of the first world you ever knew, and some part of you still reaches for the phone to tell them things.'],
        ['partner', 'My partner or spouse', 'your partner', 'Missing your person', 'Losing a partner means losing the person you would have turned to about this very loss. The house, the routines, the plans: everything still holds their shape.'],
        ['child', 'My child', 'your child', 'A love that doesn’t end', 'There are no words big enough for losing a child, and we won’t pretend there are. The love you carry for them hasn’t gone anywhere. It just has nowhere to land.'],
        ['sibling_friend', 'A sibling or close friend', 'someone so close', 'Missing someone who shared your story', 'Losing a sibling or a close friend means losing someone who held part of your story, someone who knew you in a way few others ever will.'],
        ['grandparent', 'A grandparent', 'a grandparent', 'Missing a grandparent', 'Losing a grandparent can mean losing a particular kind of safety: someone who loved you simply, steadily, and without conditions.'],
        ['pet', 'A beloved pet', 'a beloved companion', 'Missing a faithful companion', 'Losing a pet is losing a daily, wordless kind of love, and it’s a grief the world doesn’t always make room for. It’s real, and it counts.'],
      ] as const
    ).map(([id, label, short, headline, mirror]): Situation => ({
      id, label, sublabel: '', intent: 'grief_loss', subject: 'past_closure', short, headline, mirror,
      mechanism: 'Grief researchers talk about “continuing bonds”: healthy grief usually isn’t about letting go, but about finding a new way to stay connected. For many people, a mediumship reading is one way of doing that. A good medium offers specific, recognizable details (names, memories, the way they spoke) rather than general comfort.',
      known: ['The depth of what you feel is a measure of the love, not a problem to fix.', 'Wanting to feel close to them again is natural and healthy.'],
      helps: ['Specific, recognizable details that feel like them', 'Words left unsaid, on either side', 'A sense of their peace, and of yours'],
      ask: 'I’d like to connect with [Name]. What would they want me to know right now, and is there a detail only they would share?',
    })),
  },
];

export const AREA_BY_ID: Record<Area, AreaDef> = Object.fromEntries(AREAS.map((a) => [a.id, a])) as Record<Area, AreaDef>;

export function findSituation(area: Area | undefined, id: string | undefined): Situation | undefined {
  if (!area || !id) return undefined;
  return AREA_BY_ID[area]?.situations.find((s) => s.id === id);
}

/* ────────────────────────────────────────────────────────────────────────
 * Duration
 * ──────────────────────────────────────────────────────────────────────── */

export interface DurationDef { id: string; label: string; short: string; lead: string; tail: string; known: string }

export const DURATIONS: DurationDef[] = [
  { id: 'days', label: 'A few days', short: 'a few days', lead: 'For the last few days,', tail: 'It’s fresh, which is why everything feels so loud right now.', known: 'You’re paying attention early, before it hardens into a pattern.' },
  { id: 'weeks', label: 'A few weeks', short: 'weeks', lead: 'For weeks now,', tail: 'Long enough that it has started taking up real space in your head: in the shower, at 2am, in the middle of other conversations.', known: 'You’ve given it enough time to know it’s not just a bad day.' },
  { id: 'months', label: 'A few months', short: 'months', lead: 'For months now,', tail: 'Long enough that it has stopped being a moment and become a pattern, and patterns are tiring in a way that’s hard to explain to anyone who isn’t living them.', known: 'You’ve given this real time and patience, more than most people would.' },
  { id: 'long', label: 'Longer than I’d like to admit', short: 'a long stretch', lead: 'For longer than you’d like to admit,', tail: 'And somewhere along the way, carrying it became its own kind of weight.', known: 'You’ve carried this a long time without giving up on yourself.' },
];

export const GRIEF_DURATIONS: DurationDef[] = [
  { id: 'recent', label: 'In the last few months', short: 'and it’s still so recent', lead: '', tail: 'And because it’s still so recent, some days it probably doesn’t feel real yet.', known: 'You’re reaching out even while it’s raw. That takes strength.' },
  { id: 'year', label: 'Within the past year', short: 'in this first year', lead: '', tail: 'In the first year, every “first” (a birthday, a holiday, an ordinary Tuesday) can open it all up again.', known: 'You’ve been getting through the firsts, one at a time.' },
  { id: 'years', label: 'A few years ago', short: 'a few years on', lead: '', tail: 'Years on, the grief has changed shape, but it hasn’t left, and that isn’t a sign you’re stuck. It’s a sign of how much they mattered.', known: 'You’ve learned to carry this, which doesn’t mean it got light.' },
  { id: 'long_ago', label: 'Many years ago', short: 'many years on', lead: '', tail: 'Even after all this time, part of you still reaches for them. Love doesn’t come with an expiry date.', known: 'The bond has lasted all these years. That says everything.' },
];

/* ────────────────────────────────────────────────────────────────────────
 * Feelings
 * ──────────────────────────────────────────────────────────────────────── */

export interface FeelingDef {
  id: string;
  label: string;
  sublabel: string;
  /** Clause for the mid-quiz reflection: "you’re anxious and overthinking". */
  clause: string;
  validation: string;
  /** Leans the style question toward gentle readers. */
  tender?: boolean;
  crisis?: boolean;
}

const OVERWHELMED: FeelingDef = {
  id: 'overwhelmed', label: 'Overwhelmed', sublabel: 'It’s hard to get through the day',
  clause: 'it’s been hard just getting through the day',
  validation: 'It sounds like this has been really heavy to carry, heavy enough that ordinary days are hard. That deserves care first and answers second, and you deserve support from people who can be with you right now.',
  tender: true, crisis: true,
};

export const FEELINGS: FeelingDef[] = [
  { id: 'anxious', label: 'Anxious', sublabel: 'Checking, replaying, overthinking', clause: 'you’re anxious and can’t stop replaying it', validation: 'If your mind keeps looping (checking, replaying, rehearsing what you’d say), that isn’t weakness. It’s what a caring mind does when it can’t get a clear answer.' },
  { id: 'hurt', label: 'Hurt', sublabel: 'And honestly, a little angry', clause: 'you’re hurt, and a little angry', validation: 'The hurt makes sense, and so does the anger underneath it. Anger is often just hurt that’s tired of being polite.', tender: true },
  { id: 'hopeful', label: 'Hopeful', sublabel: 'But scared to be', clause: 'you’re hopeful, but scared to be', validation: 'You’re hopeful, and a little afraid of how much. Hope feels risky when you’ve been let down before, but it’s also the part of you that hasn’t given up on good things.' },
  { id: 'drained', label: 'Drained', sublabel: 'Tired, numb, running on empty', clause: 'you’re running on empty', validation: 'Feeling numb usually isn’t the same as not caring. It’s what happens after caring hard for too long without relief.', tender: true },
  { id: 'confused', label: 'Confused', sublabel: 'I don’t trust my own read anymore', clause: 'you’re not sure what to trust anymore', validation: 'When you stop trusting your own read, it’s rarely because your instincts are broken. It’s because you’ve been getting mixed signals for too long.' },
  { id: 'calm', label: 'Steady', sublabel: 'I just want clarity', clause: 'you’re steady and want clarity', validation: 'You’re steadier than most people who ask this kind of question, which means you’re ready to hear a real answer rather than just a comforting one.' },
  OVERWHELMED,
];

/** Work/direction/unsure swap "Hurt" for "Frustrated". */
export const FRUSTRATED: FeelingDef = {
  id: 'frustrated', label: 'Frustrated', sublabel: 'Doing my best and still stuck',
  clause: 'you’re frustrated that effort isn’t paying off',
  validation: 'Frustration is what effort feels like when it isn’t being rewarded yet. It’s a sign you care, and a sign you know you’re capable of more.',
};

export const GRIEF_FEELINGS: FeelingDef[] = [
  { id: 'aching', label: 'Missing them so much it aches', sublabel: '', clause: 'you miss them so much it aches', validation: 'The ache is love with nowhere to go. It hurts this much because they mattered this much.', tender: true },
  { id: 'guilt', label: 'Guilt', sublabel: 'Things I wish I’d said or done', clause: 'you’re carrying some guilt', validation: 'Almost everyone who grieves carries some guilt: the call you didn’t make, the words you didn’t say. It’s one of grief’s cruelest tricks, making love look like failure in hindsight.', tender: true },
  { id: 'unreal', label: 'Numb', sublabel: 'It still doesn’t feel real', clause: 'it still doesn’t feel real', validation: 'Numbness is the mind’s way of letting a loss in slowly. It doesn’t mean you didn’t love them. It means it’s too big to take in all at once.', tender: true },
  { id: 'searching', label: 'Looking for a sign', sublabel: 'I want to know they’re okay', clause: 'you’re looking for a sign they’re okay', validation: 'Looking for signs is one of the most human things grief does. Many people find moments that feel like contact: a song, a scent, a dream.' },
  { id: 'peaceful', label: 'Mostly at peace', sublabel: 'I’d love to feel close again', clause: 'you’re mostly at peace and want to feel close again', validation: 'You’ve done a lot of grieving to reach this kind of peace. Wanting to feel close again isn’t reopening the wound. It’s honoring the bond.' },
  { ...OVERWHELMED, label: 'Struggling to cope', sublabel: 'Some days I can barely get through' },
];

export function feelingsFor(area: Area | undefined): FeelingDef[] {
  if (area === 'grief') return GRIEF_FEELINGS;
  if (area === 'career' || area === 'direction' || area === 'unsure') {
    return FEELINGS.map((f) => (f.id === 'hurt' ? FRUSTRATED : f));
  }
  return FEELINGS;
}

export function findFeeling(area: Area | undefined, id: string | undefined): FeelingDef | undefined {
  if (!id) return undefined;
  return feelingsFor(area).find((f) => f.id === id) || [...FEELINGS, FRUSTRATED, ...GRIEF_FEELINGS].find((f) => f.id === id);
}

/* ────────────────────────────────────────────────────────────────────────
 * Hopes: the question underneath the question
 * ──────────────────────────────────────────────────────────────────────── */

export interface HopeDef {
  id: string;
  label: string;
  /** "what you most want to know is {short}" */
  short: string;
  hidden: string;
  followUp: string;
}

export const HOPES: Record<string, HopeDef> = {
  still_care: { id: 'still_care', label: 'That they really care about me', short: 'whether they really care', hidden: 'Do they care about me the way I care about them, or am I wasting my time?', followUp: 'Is what they feel for me growing, holding, or fading, and what would change it?' },
  the_truth: { id: 'the_truth', label: 'The truth, even if it stings', short: 'the truth, even if it stings', hidden: 'What’s really going on that I’m not seeing?', followUp: 'What am I not seeing clearly right now, about them or about myself?' },
  what_to_do: { id: 'what_to_do', label: 'What I should do next', short: 'what to do next', hidden: 'What should I actually do now: wait, talk, or step back?', followUp: 'If I take one step this week, which one leads somewhere good?' },
  future: { id: 'future', label: 'Whether this has a real future', short: 'whether this has a future', hidden: 'Is there a real future here, or am I hoping for one?', followUp: 'Where does this realistically stand in six months if nothing changes?' },
  my_fault: { id: 'my_fault', label: 'That it isn’t my fault', short: 'whether this is your fault', hidden: 'Did I cause this, and could I have stopped it?', followUp: 'What part of this is mine to work on, and what part isn’t mine to carry?' },
  let_go: { id: 'let_go', label: 'Whether it’s time to let go', short: 'whether it’s time to let go', hidden: 'Is it time to stop holding on?', followUp: 'What is holding on costing me, and what would letting go open up?' },
  come_back: { id: 'come_back', label: 'That they’re coming back', short: 'whether they’ll come back', hidden: 'Are they going to come back to me?', followUp: 'Is there a real path back, and if so, what would have to be different this time?' },
  miss_me: { id: 'miss_me', label: 'That they miss me too', short: 'whether they miss you too', hidden: 'Do they think about me the way I think about them?', followUp: 'What do they actually feel when they think of me now?' },
  reach_out: { id: 'reach_out', label: 'Whether I should reach out', short: 'whether to reach out', hidden: 'Should I reach out, or would that make it worse?', followUp: 'If I reach out, how is it likely to land, and is now the time?' },
  right_move: { id: 'right_move', label: 'That I’m making the right move', short: 'whether you’re making the right move', hidden: 'Am I about to make the right move?', followUp: 'What am I not seeing about the option I’m leaning toward?' },
  which_path: { id: 'which_path', label: 'Which way to go', short: 'which way to go', hidden: 'Which way do I go?', followUp: 'How does each path look a year from now?' },
  when: { id: 'when', label: 'When things will finally shift', short: 'when things will finally shift', hidden: 'When is this finally going to change?', followUp: 'What’s the realistic timing, and what can I do to meet it halfway?' },
  good_enough: { id: 'good_enough', label: 'That I’m good enough for more', short: 'whether you’re good enough for more', hidden: 'Am I actually good enough for the life I want?', followUp: 'What strength am I underusing right now?' },
  okay: { id: 'okay', label: 'That it’s going to be okay', short: 'whether it’s going to be okay', hidden: 'Am I going to be okay?', followUp: 'Where is the real risk here, and where am I worrying more than I need to?' },
  purpose: { id: 'purpose', label: 'What I’m meant to be doing', short: 'what you’re meant to be doing', hidden: 'What am I actually meant to be doing with my life?', followUp: 'What keeps pulling at me that I keep putting off?' },
  at_peace: { id: 'at_peace', label: 'That they’re at peace', short: 'whether they’re at peace', hidden: 'Are they at peace?', followUp: 'Is there anything that would help me feel they’re at peace?' },
  still_here: { id: 'still_here', label: 'That they’re still with me', short: 'whether they’re still with you', hidden: 'Are they still with me, somehow?', followUp: 'How might I recognize them around me?' },
  forgive: { id: 'forgive', label: 'That they forgive me', short: 'whether there’s anything to forgive', hidden: 'Do they forgive me, or was there ever anything to forgive?', followUp: 'Is there anything unresolved between us that I can lay down now?' },
  message: { id: 'message', label: 'Anything they want me to know', short: 'what they’d want you to know', hidden: 'Is there anything they’d want me to know?', followUp: 'Is there anything they’d want me to know, or to do, now?' },
  how_it_ended: { id: 'how_it_ended', label: 'Something about how it ended', short: 'how to make peace with how it ended', hidden: 'Could it have gone differently?', followUp: 'What do I need to understand about how it ended to make peace with it?' },
};

/* ────────────────────────────────────────────────────────────────────────
 * Cards
 * ──────────────────────────────────────────────────────────────────────── */

export const CARD_FACES: Record<string, { name: string; numeral: string; keyword: string }> = {
  two_of_cups: { name: 'Two of Cups', numeral: 'II', keyword: 'Connection · mutuality' },
  the_moon: { name: 'The Moon', numeral: 'XVIII', keyword: 'Uncertainty · what’s hidden' },
  temperance: { name: 'Temperance', numeral: 'XIV', keyword: 'Balance · patience' },
  page_of_cups: { name: 'Page of Cups', numeral: 'P', keyword: 'New feeling · curiosity' },
  knight_of_cups: { name: 'Knight of Cups', numeral: 'Kn', keyword: 'Romance · promises' },
  the_star: { name: 'The Star', numeral: 'XVII', keyword: 'Hope · renewal' },
  five_of_cups: { name: 'Five of Cups', numeral: 'V', keyword: 'Loss · what remains' },
  six_of_cups: { name: 'Six of Cups', numeral: 'VI', keyword: 'Memory · love that stays' },
  wheel_of_fortune: { name: 'Wheel of Fortune', numeral: 'X', keyword: 'Cycles · turning points' },
  eight_of_pentacles: { name: 'Eight of Pentacles', numeral: 'VIII', keyword: 'Mastery · steady work' },
  three_of_wands: { name: 'Three of Wands', numeral: 'III', keyword: 'Expansion · what’s coming' },
  the_chariot: { name: 'The Chariot', numeral: 'VII', keyword: 'Will · direction' },
  two_of_swords: { name: 'Two of Swords', numeral: 'II', keyword: 'Stalemate · the choice' },
  the_fool: { name: 'The Fool', numeral: '0', keyword: 'Beginnings · trust' },
  the_hermit: { name: 'The Hermit', numeral: 'IX', keyword: 'Inner guidance · quiet' },
  high_priestess: { name: 'The High Priestess', numeral: 'II', keyword: 'Intuition · the unseen' },
};

export function cardFor(area: Area | undefined, id: string | undefined): ReadingCard | undefined {
  if (!area || !id) return undefined;
  const entry = AREA_BY_ID[area]?.deck.find((c) => c.id === id);
  const face = CARD_FACES[id];
  if (!entry || !face) return undefined;
  return { id, ...face, message: entry.message };
}

/* ────────────────────────────────────────────────────────────────────────
 * Care notes
 * ──────────────────────────────────────────────────────────────────────── */

export const CARE_CRISIS = 'If things feel like too much right now, please reach out to someone today. In the US you can call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline) any time, free. Elsewhere, <a href="https://findahelpline.com" target="_blank" rel="noopener">findahelpline.com</a> lists local lines. A reading can offer perspective; it can’t replace someone who can be with you right now.';
export const CARE_GRIEF_RECENT = 'Gently: in the first months, some people find a reading comforting and others find it better to wait. There’s no wrong timing. If you go ahead, choose a gentle reader, keep the first session short, and trust yourself to stop if it doesn’t feel right.';
export const CARE_GRIEF_HONESTY = 'A genuine medium won’t promise contact, won’t ask for more money to “reach” your loved one, and won’t say anything that adds to your guilt. If you hear any of that, end the session. You owe no one your hope.';
export const CARE_BREAKUP = 'A good reader talks about likelihoods and choices, not guarantees. Anyone who promises your ex will return, or sells spells or “reunion rituals”, is telling you what you want to hear for money.';
export const CARE_MONEY = 'A reading can sharpen your thinking, but it isn’t financial advice. Run the numbers with someone qualified before you commit.';

/* ────────────────────────────────────────────────────────────────────────
 * Small text helpers
 * ──────────────────────────────────────────────────────────────────────── */

export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Mid-quiz reflection: what we've heard so far, in one breath. */
export function reflectionLine(a: Partial<UserAnswers>): string {
  const sit = findSituation(a.area, a.symptom);
  const feel = findFeeling(a.area, a.feeling);
  const hope = a.hope ? HOPES[a.hope] : undefined;
  if (!sit) return '';
  const tail = feel && hope
    ? ` ${cap(feel.clause)}, and what you most want to know is ${hope.short}.`
    : '';
  if (a.area === 'grief') {
    const d = GRIEF_DURATIONS.find((x) => x.id === a.duration);
    return `You’re grieving ${sit.short}${d ? `, ${d.short}` : ''}.${tail}`;
  }
  const d = DURATIONS.find((x) => x.id === a.duration);
  return `${d ? cap(d.short) + ' of ' : ''}${sit.short}.${tail}`;
}
