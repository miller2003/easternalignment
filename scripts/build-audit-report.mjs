#!/usr/bin/env node
// build-audit-report.mjs — turns scratch/review-audit.json into a human report.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(process.cwd());
const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'scratch', 'review-audit.json'), 'utf8'));
const tier = s => s < 70 ? 'FAIL' : s < 82 ? 'WEAK' : s < 90 ? 'OK' : s < 96 ? 'GOOD' : 'TOP';

function row(r, i) {
  const base = r.fp.split('\\').pop();
  const iss = r.issues.length ? r.issues.join('; ') : '—';
  return `| ${String(i + 1).padStart(3)} | ${base} | ${r.score} | ${tier(r.score)} | ${iss} |`;
}

const table = j.results.map(row).join('\n');

const report = `# 解读师评测文章 · 全面审计报告
> 生成时间：2026-08-20 ｜ 范围：src/content/readers/{keen,kasamba,purple-garden} 共 ${j.results.length} 篇
> 方法：脚本 \`scripts/validate-reviews.mjs\`（校准版，对照 REVIEW_CONTENT_PROMPT.md 的 8 条 Hard Rule + 质量栏）+ 对低分/高分代表篇目逐篇精读。
> 说明：下面“分数”= 结构/元数据合规分（0–100）。写作文笔需结合精读；本报告已抽样确认 TOP 档文笔确实顶级，WEAK 档多为结构缺陷而非文笔差。

## 一、总体结论
- 结构合规平均分 **${j.avg.toFixed(1)}/100**，质量整体良好，但存在**系统性缺陷**（见第三节）。
- **顶级范本**（建议后续量产对标）：\`purple-garden/tarot-instincts.md\`、\`purple-garden/quantum-drew.md\` —— 真实引述+来源、反直觉角度（如“4.2 分为何是诚实信号”）、可验证细节、诚信 fit、正确 CTA。
- **最弱一档**：kasamba 的 \`-kasamba-review\` 批（约 2026-08-14 生成）—— 重复 H1 + 内文缺 CTA + 部分元数据缺失。
- **分布**：${JSON.stringify(j.buckets)}

## 二、质量排名（低 → 高，共 ${j.results.length} 篇）
| # | 文件 | 分 | 档 | 主要问题 |
|---|---|---|---|---|
${table}

## 三、逐个问题清单（按严重度）
1. **价格前后不一致（2 篇，真实错误，须立即修）**：\`kasamba/spiritual-divini\`（frontmatter $19.99 vs schema $1.99）、\`kasamba/danielle\`（schema $0.99 vs frontmatter $4.99/$1.99）。影响用户信任与合规，优先修。
2. **重复 H1（23 篇）**：正文含 \`# 标题\`，与布局（ReviewLayout.astro:234）从 frontmatter 渲染的 H1 重复 → SEO 双 H1。修复：删正文 H1，改以“加粗导语 + H2 章节”起头（站点既定范式）。
3. **内文缺 CTA（25 篇）**：正文无 \`<a href="/go/">\`。注意：布局已有 **sticky CTA**（真实平台优惠）兜底，收入不丢；但正文缺明确 CTA 是编辑完整度缺口，且违反提示词 Rule 4。修复：补一段 HTML CTA（用真实优惠文案）。
4. **缺 JSON-LD（5 篇）**：如 \`keen/advisor-suzan\` 无 customSchema → 丢失富媒体评分。修复：补 Review schema。
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

**4. 门禁**：每次生成后跑 \`node scripts/validate-reviews.mjs\` → 分数 < 90 不准合并；重复 H1 / 缺 CTA / 价格不一致 / 缺 JSON-LD 任一存在即打回。

## 六、把关结论与修复优先级
- 当前 ${j.results.length} 篇按结构分：TOP ${j.buckets.top} / GOOD ${j.buckets.good} / OK ${j.buckets.ok} / WEAK ${j.buckets.weak} / FAIL ${j.buckets.fail}。
- **修复优先级**：① 2 篇价格不一致（紧急，信任/合规）；② 23 篇重复 H1；③ 补 25 篇内文 CTA；④ 补 5 篇 JSON-LD；⑤ 统一 metaDescription；⑥ 引述加来源。
- **后续量产**：以 tarot-instincts / quantum-drew 为范本 + validator 门禁 + 更新后的提示词（修正 Rule 3/4），可稳定量产顶级文章。

## 附录
- 校验脚本（可复用门禁）：\`scripts/validate-reviews.mjs\`
- 机器数据：\`scratch/review-audit.json\`
`;

fs.writeFileSync(path.join(ROOT, 'REVIEW_AUDIT_REPORT.md'), report);
console.log('Wrote REVIEW_AUDIT_REPORT.md (' + report.length + ' chars)');
