# 解读师评测文章 · 全面审计报告
> 生成时间：2026-08-20 ｜ 范围：src/content/readers/{keen,kasamba,purple-garden} 共 114 篇
> 方法：脚本 `scripts/validate-reviews.mjs`（校准版，对照 REVIEW_CONTENT_PROMPT.md 的 8 条 Hard Rule + 质量栏）+ 对低分/高分代表篇目逐篇精读。
> 说明：下面“分数”= 结构/元数据合规分（0–100）。写作文笔需结合精读；本报告已抽样确认 TOP 档文笔确实顶级，WEAK 档多为结构缺陷而非文笔差。

## 一、总体结论
- 结构合规平均分 **93.7/100**，质量整体良好，但存在**系统性缺陷**（见第三节）。
- **顶级范本**（建议后续量产对标）：`purple-garden/tarot-instincts.md`、`purple-garden/quantum-drew.md` —— 真实引述+来源、反直觉角度（如“4.2 分为何是诚实信号”）、可验证细节、诚信 fit、正确 CTA。
- **最弱一档**：kasamba 的 `-kasamba-review` 批（约 2026-08-14 生成）—— 重复 H1 + 内文缺 CTA + 部分元数据缺失。
- **分布**：{"fail":0,"weak":7,"ok":20,"good":41,"top":46}

## 二、质量排名（低 → 高，共 114 篇）
| # | 文件 | 分 | 档 | 主要问题 |
|---|---|---|---|---|
|   1 | advisor-by-jenny-kasamba-review.md | 70 | WEAK | CTA_HTML_COUNT=0 (expected 1); PRICE_MISMATCH schema=$1.99 not in frontmatter($3.99/5.99) |
|   2 | danielle-psychic-kasamba-review.md | 71 | WEAK | CTA_HTML_COUNT=0 (expected 1); PRICE_MISMATCH schema=$0.99 not in frontmatter($4.99/1.99) |
|   3 | advisor-suzan.md | 78 | WEAK | JSONLD_MISSING; PROS_EMPTY; CONS_EMPTY |
|   4 | supernormal-soul-kasamba-review.md | 78 | WEAK | CTA_HTML_COUNT=0 (expected 1) |
|   5 | psychic-satire-kasamba-review.md | 79 | WEAK | CTA_HTML_COUNT=0 (expected 1) |
|   6 | invincible-insights-kasamba-review.md | 80 | WEAK | CTA_HTML_COUNT=0 (expected 1) |
|   7 | seek-chelle-kasamba-review.md | 80 | WEAK | CTA_HTML_COUNT=0 (expected 1) |
|   8 | ask-cristina-kasamba-review.md | 82 | OK | CTA_HTML_COUNT=0 (expected 1) |
|   9 | elizabeth-kasamba-review.md | 82 | OK | CTA_HTML_COUNT=0 (expected 1) |
|  10 | psychic-simmi-kasamba-review.md | 82 | OK | CTA_HTML_COUNT=0 (expected 1) |
|  11 | truthful-visions-kasamba-review.md | 82 | OK | CTA_HTML_COUNT=0 (expected 1) |
|  12 | jackies-tea-tarot.md | 86 | OK | CTA_HTML_COUNT=0 (expected 1) |
|  13 | adam-africa.md | 88 | OK | CTA_HTML_COUNT=0 (expected 1) |
|  14 | athina-mystic.md | 88 | OK | CTA_HTML_COUNT=0 (expected 1) |
|  15 | ayla-love-resolution.md | 88 | OK | CTA_HTML_COUNT=0 (expected 1) |
|  16 | empathic-intuitive-marcus.md | 88 | OK | CTA_HTML_COUNT=0 (expected 1) |
|  17 | fanny-dalfiume.md | 88 | OK | CTA_HTML_COUNT=0 (expected 1) |
|  18 | lejla-kristal.md | 88 | OK | CTA_HTML_COUNT=0 (expected 1) |
|  19 | nuwatarot.md | 88 | OK | CTA_HTML_COUNT=0 (expected 1) |
|  20 | psychic-advisor-serena.md | 88 | OK | CTA_HTML_COUNT=0 (expected 1) |
|  21 | psychic-medium-chloe.md | 88 | OK | CTA_HTML_COUNT=0 (expected 1) |
|  22 | psychic-shirla.md | 88 | OK | CTA_HTML_COUNT=0 (expected 1) |
|  23 | satie-readings.md | 88 | OK | CTA_HTML_COUNT=0 (expected 1) |
|  24 | tarot-by-elena.md | 88 | OK | CTA_HTML_COUNT=0 (expected 1) |
|  25 | tarot-withh-love.md | 88 | OK | CTA_HTML_COUNT=0 (expected 1) |
|  26 | twin-flame-specialist-aria.md | 88 | OK | CTA_HTML_COUNT=0 (expected 1) |
|  27 | love-psychic-victoria-sands-keen-review-2026.md | 89 | OK | JSONLD_MISSING |
|  28 | david7.md | 91 | GOOD | — |
|  29 | eli-casey.md | 91 | GOOD | — |
|  30 | flora-knows-all-keen-review-2026.md | 92 | GOOD | JSONLD_MISSING |
|  31 | psychic-suzen-on-keen-review-2026.md | 92 | GOOD | JSONLD_MISSING |
|  32 | psychicreader19622-raymond-keen-review-2026.md | 92 | GOOD | JSONLD_MISSING |
|  33 | master-enigma-kasamba-review.md | 92 | GOOD | — |
|  34 | psychic-safina-kasamba-review.md | 92 | GOOD | — |
|  35 | sweet-spirit-of-love-kasamba-review.md | 92 | GOOD | — |
|  36 | arradaza.md | 94 | GOOD | — |
|  37 | c-garrett.md | 94 | GOOD | — |
|  38 | gina-marie.md | 94 | GOOD | — |
|  39 | lady-india.md | 94 | GOOD | — |
|  40 | master-sher.md | 94 | GOOD | — |
|  41 | regina-jacks.md | 94 | GOOD | — |
|  42 | the-psychic-one.md | 94 | GOOD | — |
|  43 | cosmic-fusion-kasamba-review.md | 94 | GOOD | — |
|  44 | david-james-kasamba-review.md | 94 | GOOD | — |
|  45 | golden-eye-kasamba-review.md | 94 | GOOD | — |
|  46 | immense-spark-n-au-kasamba-review.md | 94 | GOOD | — |
|  47 | love-stefans-psychic-soul-kasamba-review.md | 94 | GOOD | — |
|  48 | psychic-yazmin-kasamba-review.md | 94 | GOOD | — |
|  49 | wisdom-and-love-kasamba-review.md | 94 | GOOD | — |
|  50 | allmyangels.md | 95 | GOOD | — |
|  51 | chloe-has-your-love-insights.md | 95 | GOOD | — |
|  52 | clairvoyant-nicky-power.md | 95 | GOOD | — |
|  53 | dar66.md | 95 | GOOD | — |
|  54 | dr-lisa-powerful-insights.md | 95 | GOOD | — |
|  55 | gabriel-the-messenger.md | 95 | GOOD | — |
|  56 | heather-ashera.md | 95 | GOOD | — |
|  57 | intuitive-guidance-with-lc-on-keen-review-2026.md | 95 | GOOD | — |
|  58 | intuitive-jade.md | 95 | GOOD | — |
|  59 | jeanne-clock.md | 95 | GOOD | — |
|  60 | krys-britton-on-keen-review-2026.md | 95 | GOOD | — |
|  61 | ladyfontaine.md | 95 | GOOD | — |
|  62 | mystic-raj-on-keen-review-2026.md | 95 | GOOD | — |
|  63 | psychic-jane-just-knows.md | 95 | GOOD | — |
|  64 | readings-by-ruth.md | 95 | GOOD | — |
|  65 | serenity-stone.md | 95 | GOOD | — |
|  66 | spirit-answers-on-keen-review-2026.md | 95 | GOOD | — |
|  67 | tammy-the-voice-reader.md | 95 | GOOD | — |
|  68 | that-magic-man.md | 95 | GOOD | — |
|  69 | ask-fran.md | 96 | TOP | — |
|  70 | intuitive-azzy.md | 96 | TOP | — |
|  71 | alice-runyon.md | 98 | TOP | — |
|  72 | chosenone77.md | 98 | TOP | — |
|  73 | eye-of-pheobe-on-keen-review-2026.md | 98 | TOP | — |
|  74 | heeratheintuitive-on-keen-review-2026.md | 98 | TOP | — |
|  75 | lollie-ext-5555.md | 98 | TOP | — |
|  76 | master-psychic-adam-stone.md | 98 | TOP | — |
|  77 | master-psychic-dev.md | 98 | TOP | — |
|  78 | mike-pace.md | 98 | TOP | — |
|  79 | psychic-visions-by-atlantis-on-keen-review-2026.md | 98 | TOP | — |
|  80 | readings-by-kelly777.md | 98 | TOP | — |
|  81 | sophia-rose-light-on-keen-review-2026.md | 98 | TOP | — |
|  82 | tarot-with-meg-on-keen-review-2026.md | 98 | TOP | — |
|  83 | best-psychic-readings-kasamba-review.md | 98 | TOP | — |
|  84 | divine-master-kasamba-review.md | 98 | TOP | — |
|  85 | intuitive-counselor-kasamba-review.md | 98 | TOP | — |
|  86 | love-specialist-isabelle-kasamba-review.md | 98 | TOP | — |
|  87 | raven-franks-kasamba-review.md | 98 | TOP | — |
|  88 | spiritual-divini-service-kasamba-review.md | 98 | TOP | — |
|  89 | emmanuelle-berger.md | 98 | TOP | — |
|  90 | lorrie-c.md | 100 | TOP | — |
|  91 | symonne.md | 100 | TOP | — |
|  92 | accurate-love-readings-kasamba-review.md | 100 | TOP | — |
|  93 | ambers-light-kasamba-review.md | 100 | TOP | — |
|  94 | divine-soul-kasamba-review.md | 100 | TOP | — |
|  95 | love-psychic-indi-kasamba-review.md | 100 | TOP | — |
|  96 | miss-bathsheba-kasamba-review.md | 100 | TOP | — |
|  97 | powerful-visions-kasamba-review.md | 100 | TOP | — |
|  98 | quietsound-kasamba-review.md | 100 | TOP | — |
|  99 | the-fruno-kasamba-review.md | 100 | TOP | — |
| 100 | truth-and-light-kasamba-review.md | 100 | TOP | — |
| 101 | advisor-vanessa.md | 100 | TOP | — |
| 102 | mystic-mark.md | 100 | TOP | — |
| 103 | namrata.md | 100 | TOP | — |
| 104 | nicholas-knight.md | 100 | TOP | — |
| 105 | nick.md | 100 | TOP | — |
| 106 | niki-medium.md | 100 | TOP | — |
| 107 | plutoniandust.md | 100 | TOP | — |
| 108 | psychic-jeanne.md | 100 | TOP | — |
| 109 | psychic-logan.md | 100 | TOP | — |
| 110 | psychic-willow.md | 100 | TOP | — |
| 111 | quantum-drew.md | 100 | TOP | — |
| 112 | sagest.md | 100 | TOP | — |
| 113 | tarot-instincts.md | 100 | TOP | — |
| 114 | truthful-love.md | 100 | TOP | — |

## 三、逐个问题清单（按严重度）
1. **价格前后不一致（2 篇，真实错误，须立即修）**：`kasamba/spiritual-divini`（frontmatter $19.99 vs schema $1.99）、`kasamba/danielle`（schema $0.99 vs frontmatter $4.99/$1.99）。影响用户信任与合规，优先修。
2. **重复 H1（23 篇）**：正文含 `# 标题`，与布局（ReviewLayout.astro:234）从 frontmatter 渲染的 H1 重复 → SEO 双 H1。修复：删正文 H1，改以“加粗导语 + H2 章节”起头（站点既定范式）。
3. **内文缺 CTA（25 篇）**：正文无 `<a href="/go/">`。注意：布局已有 **sticky CTA**（真实平台优惠）兜底，收入不丢；但正文缺明确 CTA 是编辑完整度缺口，且违反提示词 Rule 4。修复：补一段 HTML CTA（用真实优惠文案）。
4. **缺 JSON-LD（5 篇）**：如 `keen/advisor-suzan` 无 customSchema → 丢失富媒体评分。修复：补 Review schema。
5. **元数据缺失/不达标**：metaDescription 长度不达标 31 篇（含 0 长度）、seoTitle 缺失 9 篇、个别 pros/cons 为空。影响 CTR 与检索呈现。
6. **schema reviewBody 未写费率（51 篇）**：JSON-LD 的 reviewBody 没提 $/min → 结构化数据不完整。建议补 headline 费率。
7. **引述无内联来源（22+ 篇）**：引用客户原话但正文无来源链接 → 可信度 / FTC 风险。建议每个引述旁给来源（平台 profile / thepsychicreviews / reddit），或文末统一说明。
8. **提示词与站点不一致（关键，须改提示词）**：
   - Rule 3“正文以 H1 开头”与布局渲染 H1 冲突 → 改为“正文不以 H1 开头，用加粗导语 + H2”。
   - Rule 4 的 Purple Garden CTA 模板 “Chat with X on Purple Garden” 与真实优惠 “$30 credit” 不符（站点 sticky CTA 也用 $30 credit）→ 更新为真实优惠文案。
   - Rule 2 价格核实：danielle/spiritual-divini 出现 schema 与 frontmatter 价格打架，说明生成时未核实 → 强化“价格三处一致”校验。

## 四、可改进的共性机会（提炼）
- **A. 结构合规层（机器可卡）**：重复 H1、CTA、JSON-LD、价格三处一致、meta 长度 → 用 validator 做合并前门禁。
- **B. 可信度层（编辑层）**：所有客户引述必须带来源；避免“据客户说”无出处。affiliate 披露 footer 已有，保持。
- **C. 深度层（已做得好，保持并普及）**：tarot-instincts 的“4.2 为何是诚实信号”式反直觉角度、quantum-drew 的“未说出口的军事细节”式可验证细节，是顶级标志。建议每篇都找一个此类钩子。
- **D. 一致性层**：价格表述统一（chat/voice/video 三档时，正文与 schema 都聚焦 headline rate）；优惠文案统一用真实优惠。

## 五、顶级生产策略（后续大量生产遵循的“EasternAlignment 解读师评测 · 顶级标准 v1”）
**1. 研究先行（保真）**
- 必须用 WebSearch 找真实第三方来源（平台 profile、thepsychicreviews、reddit）→ 只引用可核实内容。
- 客户原话必须标注来源链接；无来源不写原话（用聚合式客观口径代替）。

**2. 结构铁律（机器门禁）**
- 正文不以 H1 开头（布局渲染标题）；以加粗导语 + H2 章节。
- 正文末尾恰好一个 HTML CTA，用真实平台优惠文案（Keen “5 min for $1”；Kasamba “3 free mins + 50% off”；Purple Garden “$30 credit”）。
- 必须有 customSchema（Review），ratingValue == frontmatter rating，reviewBody 含 headline 费率。
- 价格三处一致：frontmatter.pricing、正文 $/min、schema.reviewBody 同值。
- slug ∈ affiliateLinks.ts；metaDescription 120–155 字符；seoTitle 有；pros/cons/verdict 具体非空。

**3. 写作质量栏（模型自检 / 人工抽检）**
- 钩子：反直觉角度或可验证细节，禁空话（禁 “in today's fast-paced world” 等 AI 套话）。
- 深度：解释“为什么”（价差结构、低分为何诚实），不止罗列数字。
- 诚信 fit：明确 bestFor / skipIf，敢于写缺点。
- 无编造引述、无编造价格。

**4. 门禁**：每次生成后跑 `node scripts/validate-reviews.mjs` → 分数 < 90 不准合并；重复 H1 / 缺 CTA / 价格不一致 / 缺 JSON-LD 任一存在即打回。

## 六、把关结论与修复优先级
- 当前 114 篇按结构分：TOP 46 / GOOD 41 / OK 20 / WEAK 7 / FAIL 0。
- **修复优先级**：① 2 篇价格不一致（紧急，信任/合规）；② 23 篇重复 H1；③ 补 25 篇内文 CTA；④ 补 5 篇 JSON-LD；⑤ 统一 metaDescription；⑥ 引述加来源。
- **后续量产**：以 tarot-instincts / quantum-drew 为范本 + validator 门禁 + 更新后的提示词（修正 Rule 3/4），可稳定量产顶级文章。

## 附录
- 校验脚本（可复用门禁）：`scripts/validate-reviews.mjs`
- 机器数据：`scratch/review-audit.json`
