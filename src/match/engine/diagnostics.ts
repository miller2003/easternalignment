/**
 * src/match/engine/diagnostics.ts
 * Synthesizes user answers into an Audited Situation Dossier following the
 * Reflection -> Synthesis -> Strategic Guidance methodology.
 */

import type { UserAnswers, DiagnosticDossier } from '../types';

export function generateDiagnosis(answers: UserAnswers): DiagnosticDossier {
  const { intent, situationSubject, preferredFormat, preferredStyles } = answers;

  let coreDynamicTitle = 'Situational Uncertainty & Decision Crossroads';
  let situationSummary = '';
  let underlyingMechanism = '';
  let whatIsClear: string[] = [];
  let whatIsUnresolved: string[] = [];
  let recommendedOpeningQuestion = '';
  let scamWarning = 'Never pay an advisor for "curse removal," "energy cleansing," or candle rituals. Legitimate readers offer insight and perspective — not fear-based monetization.';
  let suggestedGuideSlugs: string[] = ['how-to-choose-a-psychic-reader', 'questions-to-ask-a-psychic'];

  // 1. Love & Relationship Dynamics
  if (intent === 'love_relationship' || intent === 'another_person_intentions') {
    coreDynamicTitle = 'The Word-Action Divergence & Intermittent Connection Pattern';
    situationSummary = 'You are navigating a connection where the emotional climate feels inconsistent. Warmth or affection appears in bursts, but behavioral follow-through is unpredictable, leaving you constantly questioning whether to trust their words or your gut.';
    underlyingMechanism = 'Intermittent emotional availability creates a psychological loop called "intermittent reinforcement." When someone alternates between attentiveness and distance, your mind naturally attempts to solve the puzzle by re-reading past texts and over-analyzing minor shifts. The exhaustion you feel is the mental energy spent trying to decode mixed signals.';
    whatIsClear = [
      'You are picking up on a real behavioral shift — this is not "just in your head."',
      'Their current level of effort does not currently match the emotional stakes you have invested.',
      'Relying purely on verbal reassurance is no longer providing genuine peace of mind.',
    ];
    whatIsUnresolved = [
      'Whether their current withdrawal is driven by external stress or a deeper shift in romantic commitment.',
      'Their true internal intentions and what they plan to do over the next 30 days.',
      'Whether holding space will foster reconnection, or if maintaining clear personal boundaries is necessary.',
    ];
    recommendedOpeningQuestion = '“What is [Name]’s current emotional headspace toward me, and what is the primary blockage keeping their actions from matching their words?”';
    suggestedGuideSlugs = ['questions-to-ask-a-psychic', 'karmic-relationships-signs-and-lessons'];
  }

  // 2. Breakup & Reconciliation
  else if (intent === 'breakup_ex') {
    coreDynamicTitle = 'Post-Breakup Ambiguity & Energetic Reconnection Dilemma';
    situationSummary = 'You are dealing with the painful aftermath of a separation where threads remain open — either through unresolved words, lingering feelings, or the deafening silence of no-contact.';
    underlyingMechanism = 'Sudden disconnection triggers grief alongside cognitive dissonance. When past shared promises contrast with present silence, the brain seeks closure that the ex-partner is unable or unwilling to provide. This keeps you in an exhausting holding pattern.';
    whatIsClear = [
      'You need clarity so you can either rebuild with genuine mutual effort or close the chapter with dignity.',
      'Reaching out impulsively while emotions are heightened often reinforces avoidant patterns.',
      'The bond held genuine significance, which is why letting go without clarity feels so difficult.',
    ];
    whatIsUnresolved = [
      'Whether their silence signifies permanent closure or an internal processing stage.',
      'What emotions they experience during periods of no-contact.',
      'The realistic likelihood and timing of an unprompted reunion attempt.',
    ];
    recommendedOpeningQuestion = '“In the silence between us, what is [Name] actually feeling, and does the trajectory show mutual reconnection or a necessary transition?”';
    suggestedGuideSlugs = ['signs-your-ex-is-coming-back', 'no-contact-psychic-readings-guide'];
  }

  // 3. Dating & New Connection
  else if (intent === 'dating') {
    coreDynamicTitle = 'Early Stage Sincerity & Chemistry vs. Compatibility Check';
    situationSummary = 'You have connected with someone new and feel a spark, but past experiences have taught you to be cautious. You want to assess whether their intentions are authentic before opening your heart fully.';
    underlyingMechanism = 'High initial chemistry frequently masks fundamental alignment gaps. Your intuition is actively scanning for early warning signs or avoidant patterns so you do not repeat past cycles of emotional over-investment.';
    whatIsClear = [
      'You are consciously choosing to protect your peace rather than rush in blindly.',
      'Chemistry is present, but long-term emotional availability has yet to be proven.',
      'You value transparency and consistency far more than superficial flattery.',
    ];
    whatIsUnresolved = [
      'What their true relationship goals and emotional availability look like.',
      'Whether they are presenting an authentic self or an idealized persona.',
      'Key blind spots or unspoken baggage that may emerge as the connection deepens.',
    ];
    recommendedOpeningQuestion = '“What are [Name]’s genuine intentions toward dating, and are there unseen emotional blockages I should be aware of?”';
    suggestedGuideSlugs = ['questions-to-ask-a-psychic', 'how-to-choose-a-psychic-reader'];
  }

  // 4. Career & Work Crossroads
  else if (intent === 'career_work' || intent === 'money_finance') {
    coreDynamicTitle = 'Professional Crossroads & Strategic Opportunity Realignment';
    situationSummary = 'You are standing at a career inflection point where your current environment no longer fulfills your potential, or you face a high-stakes choice involving financial or professional advancement.';
    underlyingMechanism = 'Professional stagnation or toxic workplace dynamics drain vitality. When the effort you invest fails to yield proportional recognition or financial reward, your intuition signals that the current season has run its course.';
    whatIsClear = [
      'Your existing trajectory is no longer aligned with your long-term ambitions.',
      'Staying purely out of comfort is exacting a hidden toll on your confidence and energy.',
      'You possess untapped capabilities ready to be deployed in a more receptive environment.',
    ];
    whatIsUnresolved = [
      'The optimal timing window for initiating a transition or negotiating terms.',
      'Unseen political dynamics or leadership shifts within your organization.',
      'Which professional pathway offers sustainable growth versus short-lived promise.',
    ];
    recommendedOpeningQuestion = '“Looking at my career trajectory over the next 6 months, what opportunities and obstacles should I prepare for, and when is the ideal window to make my move?”';
    suggestedGuideSlugs = ['how-much-does-a-psychic-reading-cost', 'how-to-choose-a-psychic-reader'];
  }

  // 5. Grief & Mediumship
  else if (intent === 'grief_loss') {
    coreDynamicTitle = 'Spiritual Continuity, Grief Healing & Departed Soul Connection';
    situationSummary = 'You are carrying the profound weight of losing someone close to you. You seek reassurance, evidential confirmation of their continued presence, or peace surrounding unsaid words.';
    underlyingMechanism = 'Grief is the persistence of love across physical absence. The desire for a mediumship reading is not about fortune-telling; it is a sacred search for recognizable evidence and heartfelt reassurance that the connection endures.';
    whatIsClear = [
      'Your desire for connection is rooted in deep mutual love and a search for peaceful closure.',
      'True mediumship relies on specific evidential memories — not generic generalities.',
      'Allowing yourself to receive closure is a healthy step in honoring both their memory and your healing.',
    ];
    whatIsUnresolved = [
      'Unspoken words, mutual forgiveness, or unresolved circumstances surrounding their passing.',
      'Subtle signs, synchronicities, or messages they are attempting to convey.',
      'How to release lingering guilt and carry their legacy forward with grace.',
    ];
    recommendedOpeningQuestion = '“I would like to open space for [Name] — what specific memories or messages do they wish to share regarding our connection and their peace?”';
    suggestedGuideSlugs = ['what-is-psychic-reading', 'questions-to-ask-a-psychic'];
  }

  // 6. Decision Making & Future Direction
  else {
    coreDynamicTitle = 'Life Crossroads, Inner Alignment & Approaching Milestones';
    situationSummary = 'You are experiencing a threshold moment where multiple paths diverge. The fog of daily routine has obscured your internal compass, and you want an unvarnished aerial view of the road ahead.';
    underlyingMechanism = 'Analysis paralysis occurs when your rational mind lacks sufficient data to guarantee an outcome. An intuitive perspective helps cut through intellectual overthinking and illuminates the energetic currents already in motion.';
    whatIsClear = [
      'The status quo cannot continue indefinitely without causing internal friction.',
      'You already sense which choice aligns with your truth, but seek external confirmation before taking the leap.',
      'Timing and pacing are as crucial as the direction itself.',
    ];
    whatIsUnresolved = [
      'Hidden factors and secondary consequences of each competing path.',
      'The key milestones and pivotal decisions awaiting you in the next 3 to 6 months.',
      'The internal fear or limiting belief that must be transcended to move forward.',
    ];
    recommendedOpeningQuestion = '“What major shifts and energetic turning points are approaching in my life over the next quarter, and what blind spot is most critical for me to recognize?”';
    suggestedGuideSlugs = ['what-is-psychic-reading', 'how-to-choose-a-psychic-reader'];
  }

  return {
    coreDynamicTitle,
    situationSummary,
    underlyingMechanism,
    whatIsClear,
    whatIsUnresolved,
    recommendedOpeningQuestion,
    scamWarning,
    suggestedGuideSlugs,
  };
}
