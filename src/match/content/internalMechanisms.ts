/**
 * content/internalMechanisms.ts — 底层机制轴（内部专用）
 *
 * ⚠️⚠️ 文件中所有标识符（key、tier、注释里的分组名）都是**后台内部代号**。
 * 任何一处都**不得**出现在面向用户的文案、URL、埋点、结构化数据里。
 * 用户看到的只有 narrative（解读段落）与 reflections（反思问题）。
 *
 * 产品定位：用户做完题后，用「这不是你有毛病，是你的旧保护机制在过度工作」
 * 这一层解释增强结果页的说服力。它解释的是**为什么会卡住**，
 * 与「发生了什么」（narrativeBlocks 的主题块）互补而非重复。
 *
 * 🔴 严格分区（2026-09-15 用户定调）：
 *   · content.narrative    —— 可渲染，逐字使用
 *   · content.reflections  —— 可渲染，供结果页挑选 2 条
 *   · ~~content.actions~~  —— **已移出本文件**，见下方说明
 *
 * 为什么 actions 不在这里（2026-09-15 实测发现的生产缺陷）：
 * 原本 actions 是本对象的一个属性，即使没有任何渲染路径读它，
 * 它依然被打进了客户端 bundle（`dist/_astro/match.astro_*.js`）——
 * 因为模块级 const 对象上的属性是「活」的，打包器无法静态证明它永远不被读，
 * 于是整表保留。后果是任何人都能在 DevTools 里读到我们刻意删除的
 * 「解决方法」原文。现已拆到 `internalMechanismActions.ARCHIVE.ts`，
 * 只要无人 import 它就不会进入任何产物。
 * 该不变量由 engine_suite.mjs §16 与 mech_render_probe.mjs 双重守护。
 */

import type { InternalKey } from '../types';

export interface InternalMechanismContent {
  /**
   * 机制解读。段落顺序即渲染顺序。
   * 2026-09-15 用户指示「原样保留，不改」—— 以下文本为创作方原稿逐字。
   */
  narrative: string[];
  /** 可用于结果页的反思问题（挑 2 条展示，避免页面过长） */
  reflections: string[];
}

export const INTERNAL_MECHANISMS: Record<InternalKey, InternalMechanismContent> = {
  /* ── 内部代号 choice_friction ─────────────────────────────────────── */
  choice_friction: {
    narrative: [
      'Your hesitation has nothing to do with picking the "right path"; it is entirely about postponing "loss." As long as you delay the final decision, you simultaneously "possess" both possibilities in your mind. You are using extreme mental friction to escape the physical sting of having to discard one of the options.',
      'In the jungle, the cost of a wrong decision is death, whereas the cost of missing a good opportunity is merely skipping a meal. Therefore, our genes evolved an extreme "negativity bias"—a hyper-sensitivity to potential loss. When you face two major life choices, your nervous system interprets it as facing two different tigers.',
      'Your agonizing "inability to choose" is actually the instinctual "Freeze" defense strategy animals deploy when confronted by an absolute predator.',
    ],
    reflections: [
      'Which of the two options are you avoiding because choosing it would mean giving something up — not because it is wrong?',
      'If you imagine the coin already in the air, which outcome makes your stomach drop? Not the answer you want. The one you flinched at.',
      'Whose expectations are inside this decision that you have not admitted are there?',
      'What would you decide if you knew no one would ever ask you about it again?',
    ],
  },

  /* ── 内部代号 scarcity_panic ──────────────────────────────────────── */
  scarcity_panic: {
    narrative: [
      'Your brain has fallen into a severe cognitive fallacy, treating "anxiety" as a protective amulet. Your subconscious firmly believes that as long as you maintain panic and hyper-vigilance every second, disasters will be averted. You use extreme mental friction to manufacture a false sense of control, tricking yourself into thinking, "I am actively solving the problem."',
      'Our ancestors survived countless ice ages and prolonged famines. The ancient humans who lacked extreme anxiety and didn\'t frantically hoard fat and supplies went extinct long ago.',
      'If you are losing sleep tonight over a slight dip in your bank account, or exhibiting extreme controlling behavior over a partner\'s whereabouts, it is because your genes, despite the material abundance of modern society, are still frantically hallucinating an impending "winter famine."',
    ],
    reflections: [
      'What is the actual number you are afraid of? Not the feeling — the number. Vagueness is where this kind of fear lives.',
      'If the worst outcome happened, what specifically would you have to do the next morning?',
      'Is there a difference between the danger and your alertness to it? How far apart are they right now?',
      'When did you last feel safe in your body? What was different about that day?',
    ],
  },

  /* ── 内部代号 boundary_invasion ───────────────────────────────────── */
  boundary_invasion: {
    narrative: [
      'Your "lack of defenses" and "over-giving" are essentially a covert transaction. You are attempting to "buy" a guarantee against abandonment by surrendering your boundaries. You mistake this for kindness, but it is actually people-pleasing driven by an extreme fear of relationship rupture.',
      'Homo sapiens are obligate pack animals. In ancient times, anyone who was fiercely independent, refused to obey the tribal chief, or declined to share resources would be exiled from the cave—which guaranteed being eaten by wild beasts.',
      'Your current inability to refuse others and your boundless people-pleasing stem exactly from this physiological fear of "tribal exile" etched deep in your genes. You are paying "genetic protection fees" by surrendering your personal boundaries to those around you.',
    ],
    reflections: [
      'What do you believe would happen if you said no once, plainly, without an excuse attached?',
      'Whose approval are you buying, and what is the actual price you pay for it each week?',
      'Which relationship in your life only ever moves in one direction — and what have you told yourself about why that is fine?',
      'When someone close to you is disappointed, what does it feel like it says about you?',
    ],
  },

  /* ── 内部代号 stagnation_void ─────────────────────────────────────── */
  stagnation_void: {
    narrative: [
      'Your "confusion" is a meticulously orchestrated strike. By declaring yourself "directionless" or claiming "it\'s all meaningless," you acquire legitimate immunity. You no longer have to bear the cost of trial and error, nor do you have to face the objective reality of remaining mediocre despite your efforts. Stagnation is your safest harbor.',
      'In primitive societies where food was extremely scarce, the first directive of human genetics was: absolutely do not burn calories unless there is a clear survival threat or an easily attainable, high-calorie reward.',
      'Your current state of "stagnation and lying flat" is essentially your brain determining, after calculation, that the current external environment\'s "ROI (Return on Investment) is too low." Consequently, it forcibly cuts off your dopamine secretion, throwing you into a genetic "psychological hibernation" to preserve physical energy.',
    ],
    reflections: [
      'What are you protecting yourself from by not starting? Be specific — name the exact outcome you are avoiding.',
      'If you could not fail, would you still want it? Or was the impossibility part of the appeal?',
      'What is the smallest version of this that would not feel like a public commitment?',
      'What did you want before you learned to call wanting things naive?',
    ],
  },

  /* ── 内部代号 identity_crisis ─────────────────────────────────────── */
  identity_crisis: {
    narrative: [
      'Your "imposter syndrome" and "self-deprecation" are top-tier defense strategies. As long as you trample yourself into the mud first and announce, "I\'m actually not that good," you permanently absolve yourself from bearing the weight of external expectations, completely neutralizing the risk of eventually falling from the pedestal.',
      'Within primate communities, any individual attempting to climb the hierarchy and challenge for a higher position is met with ruthless suppression from the Alpha.',
      'When you receive a promotion in the workplace or life but experience "imposter syndrome" (the feeling that you don\'t deserve it) or self-doubt, this is actually your subconscious emitting an ancient "submissive signal." Through self-deprecation, you are signaling to potential competitors around you that "I am not a threat," thereby avoiding becoming the nail that gets hammered down.',
    ],
    reflections: [
      'Whose voice is the one telling you that you do not deserve this? Can you name them?',
      'If you stopped pre-emptively putting yourself down, what would you have to risk being seen as?',
      'What have you achieved that you have never once let yourself call an achievement?',
      'Which part of this discomfort is growth, and which part is just unfamiliarity?',
    ],
  },

  /* ── 内部代号 toxic_loop ──────────────────────────────────────────── */
  toxic_loop: {
    narrative: [
      'Your nervous system is allergic to a "healthy, stable environment." In your deepest memories, relationships are inexorably tied to exploitation and turbulence. You repeatedly jump into the same fire pit because that "toxic familiarity" makes your subconscious feel that "everything is under control" in a way that the unknown peace and safety cannot.',
      'To ancient humans, "unknown" territories highly correlated with venomous snakes and vicious beasts; whereas "known" territories, even if the environment was harsh and resources were scarce, proved that you managed to survive there yesterday.',
      'Your genes strictly optimize for "survival," not "happiness." You repeatedly fall for the same terrible people and return to the same exploitative environments because your nervous system categorizes "familiar pain" as a "safe survival zone," while perceiving "unknown healthy relationships" as lethal threats.',
    ],
    reflections: [
      'What does the familiar version of this feel like in your body — and what does the calm version feel like? Which one is more uncomfortable?',
      'When you imagine something steady, what is the first objection your mind raises?',
      'What did you learn early on about what love is supposed to cost?',
      'If you stayed away this time, what would you have to sit with that the chaos has been covering?',
    ],
  },

  /* ── 内部代号 sudden_loss ─────────────────────────────────────────── */
  sudden_loss: {
    narrative: [
      'Your pain is a "time capsule" designed by your subconscious. As long as you weep and rage over the loss, you feel the event hasn\'t truly concluded. You are using intense emotional fluctuations to reject the absolute physical reality that "the connection has run its course / the structure has been destroyed." Pain is your final resort for maintaining a false sense of control.',
      'Hundreds of thousands of years ago during the Pleistocene, being separated from the tribe or losing a core mate meant freezing to death, starving, or being preyed upon in the wild.',
      'Your prefrontal cortex logically knows this is merely a breakup or a layoff, but your amygdala (the limbic system) equates it to "physical death." The acute heartbreak and somatic pain you feel right now is your brain triggering its highest-level ancient alarm to stop you from "walking toward death."',
      'You are not sick; you are simply experiencing a severely outdated survival immune response.',
    ],
    reflections: [
      'What is the part of this that you have not let yourself say out loud yet?',
      'Is the pain you are feeling about what happened — or about the fact that it is finished and cannot be renegotiated?',
      'What would you be able to feel if you stopped treating the ending as still open?',
      'Who has been carrying this with you, and have you actually told them how heavy it is?',
    ],
  },

  /* ── 内部代号 illusion_fixation ───────────────────────────────────── */
  illusion_fixation: {
    narrative: [
      'You are so fanatically obsessed with that impossible person or situation precisely because it is "impossible." Because it has zero chance of manifesting in reality, you will never have to face the trivialities of daily domestic life or the cruel reality of eventual disillusionment. This illusion is the safest, most consequence-free emotional anchor.',
      'In the wilderness, if you mistake the rustling of wind in the grass for a tiger (over-imagining), you merely experience a false alarm and run a few steps; but if you mistake a tiger for the wind (lack of association), you lose your life. Therefore, evolution heavily rewarded brains prone to over-imagining and forcing causal connections.',
      'Your frantic mental attrition and dramatic plot construction regarding an impossible person or ethereal obsession is actually your brain over-exercising its "pattern recognition" function, forcibly manufacturing a sense of safety for you in a vacuum.',
    ],
    reflections: [
      'What would you lose if this actually became real and ordinary?',
      'How much of the story you have built exists outside of any evidence?',
      'Is the pull toward this person — or toward a version of yourself that the longing lets you keep imagining?',
      'What are you not looking at while you keep looking here?',
    ],
  },
};

/**
 * 结果页展示的反思问题条数。
 * 每条机制备了 4 条，只挑前 N 条 —— 结果页已经有 7 个区块，
 * 再多会把页面推长到用户不会读完的程度。
 */
export const MECHANISM_REFLECTION_COUNT = 2;

export function getMechanismContent(key: InternalKey): InternalMechanismContent | undefined {
  return INTERNAL_MECHANISMS[key];
}
