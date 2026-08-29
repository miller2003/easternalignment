# Eastern Alignment 项目长期约定

## 业务基线
英文 psychic reading 联盟站（Astro 静态站，Cloudflare Pages 部署）。三平台：Kasamba(#1) / Purple Garden(#2) / Keen(#3)，优先级见 `src/lib/offers.ts` 的 `PLATFORM_PRIORITY`。
商业目标：月 100 个合格转化，CPA $125。当前 Google 月点击基线 ~90，缺口 22–28 倍 —— **瓶颈是量级，不是跳出率**。

## 内容红线（用户确立，2026-08-26）
- **禁止**：针对产品本身的缺陷拆解、miss 率 / 投诉率 / 差评占比当卖点、差评原文引用、论坛 Reddit 投诉拆解、`The Small Print` 式负面罗列。
- **允许**：**人群匹配式劝退** —— "你是这类人就不适合找她，**那你该找谁**"，必须给替代方案 + 内链。判定标准：负面指向**人**的匹配度，不是指向**产品**的缺陷。

## 🔑 内容原则：不要共情，要诊断（用户确立，2026-08-29）
**禁止任何形式共情段落**（"我知道你很难受""凌晨三点的焦虑"）。三条理由：
1. 会猜错——猜中命中，猜错读者判定"作者不懂我"直接划走，比不写更糟。
2. **共情不产生信任，判断才产生信任**。读者要的不是被理解，是"我的情况属于哪一种、该怎么做"。
3. 共情段是 AI 味重灾区（`we understand how painful this is` 全行业都在写）。
替代方案 = **诊断**：描述"类型"而非描述"你"。读者自己对照，不需要猜她的感受，且天然带"我见过很多案例"的权威感。
*（用户原话：「用户凌晨一点反复刷他的社交动态，别乱猜啊，没猜对的话用户直接划走了！」→「不太好，就不应该共情。」）*

## 单篇 reader review 的标准结构（v2，见 `READER_REVIEW_PROMPT_v2.md`）
H1（必含判断/质疑，禁命名式）→ 第0块 首屏判定块（四要素：一句话判定 + 三行情境分流 + 真实总预算 + 最低门槛路径；不滚动可见）→ 第1块 诊断框（问题分三类，她只对1–2类有效）→ 第2块 **检验报告**（用 how-to-spot-fake-psychic 的三条标准逐条检验，必含一项对她不利的发现）→ 第3块 工作方式与失效条件（开场顺序、失效条件、开场句、判断信号）→ 第4块 真实成本账（**总额不是单价** + 下限 + 新客优惠覆盖 + 退出条件含是否扣费）→ 第5块 分流与劝退（该订三类 / 该换人两类带内链 / **硬劝退三条：先别订任何人**）→ 第6块 FAQ（答案必须有机制，AI 只引用有因果的解释）。
**转化机制**：不是 CTA 堆叠，是降低决策重量 —— 读者能在脑子里预演这次会话 + 知道不值钱就能退出时，下单就从"花 $100 赌博"变成"用免费分钟试一下"。

## GEO / AI 引用约定（2026-08-29 确立）
- **两阶段模型**：阶段1 检索（相对排序，吃传统 SEO，是入场券）→ 阶段2 抽取（绝对判断"这段能答吗"，吃内容形态）。**用户踩中的是阶段2**，与 llms.txt / AI 摘要块 / schema 堆叠等表层 GEO 技巧无关。写作时优先保阶段2 四要素：**自包含答案块（脱离上下文也能读）／枚举结构／具体数字锚点／信息增量（别处没有的独家事实）**。
- **被 AI 引用后的改动边界**：锁 URL、H1、**被引用那一段的措辞**；CTA／样式／内链可随意改；补新事实是加法，安全。判定标准：**改的是"答案"还是"包装"**。
- **chrome 稀释红线**：全站 chrome 恒定 620–740 词（两遍导航＋disclosure bar＋offer bar＋双侧栏＋SideDock＋EndCTA＋AuthorBio）。**正文 < ~1,500 词的页面，chrome 占比 > 30%** → 此类页面禁止再叠加新 CTA。测量：`python scratch/geo_text_ratio.py dist/<path>/index.html`。
- **CTA 位置伤害排序**（大→小）：`InlineCta` 打断 H2 与答案的语义单元 ＞ 顶部 disclosure/offer bar 占开头加权位 ＞ 底部 EndCTA（几乎无害）＞ 折叠但仍输出 HTML 的 SideDock（纯浪费 token）。
- 待修：导航 DOM 输出两遍（可砍 15–20% chrome）；SideDock panel 改 JS 动态注入；`InlineCta` 改按标记插入而非"第 2 个 H2 前"。

## 生产约定
- **信息准入闸门**：BRIEF 四项第一手信息（实测次数与花费 / 沉默测试原文 / 可验证的具体项 / 一次不满意的发现）缺任何一项 → **停止，不许写**。宁可不发布也不产 AI 味空文。
- **反模板化**：骨架固定保可批量，但每块给 2–3 种展开形态由 AI 轮换，且标题不得与同平台最近 5 篇重复（v1 时代 60+ 篇共用一副骨架是最大教训）。
- **CTA 由路由注入**（ReaderEndCTA + CTABox），正文禁止手写 CTA / `/go/` 链接 / 结尾 nudge 段。
- **不在沙箱 build**（会卡死，已知坑）。本机跑：`pkill -9 -f "npm run build"; CODEBUDDY_SESSION_ID= CLAUDE_SESSION_ID= npm run build`。

## ⚠️ 审计口径铁律（2026-08-29 踩坑后确立）
**凡涉及「转化路径 / CTA / 链接是否缺失」的审计，统计必须落在渲染后的 `dist/**/*.html`，
禁止只看 `src/content/**/*.md` 源文件下结论。** 曾据此误报两条 P0：
①「某文无 /go/ 链接」—— 实际 `EndCTA` 恒定遍历输出三平台链接，源文件没有才是规范；
②「PG 无深层链接」—— 实际 `src/data/affiliateLinks.ts` 里 46 条全带 `url=` 参数、完好可用。
源文件层面的统计只能回答「内容写了什么」，不能回答「页面输出什么」。

## `platform` 字段的双重作用（改 frontmatter 前必读）
`platform` 不只是分类标签，它有**两处**消费点，缺标影响远大于"少一组内链"：
1. `src/pages/guides/[slug].astro` → `matchedReviews` / `matchedComparisons`（是否展示对应平台 review 卡片与对比页）。
2. **`src/layouts/ArticleLayout.astro` → 决定全页 CTA 的平台归属**：
   `pagePlatform = (rawPlatform==='keen'||'purple-garden') ? rawPlatform : 'kasamba'`。
   缺失即 hero CTA / `InlineCta` / sticky CTA / 右侧 deal 卡 / TopOfferBar **全部回落 Kasamba**。
   中立科普文这样合理（Kasamba 是站内 #1），但**平台专文漏标 = 把用户送去竞品**
   （`purple-garden-30-credit-guide` 曾真实踩此坑，2026-08-29 已修）。
**新写任何平台专文，frontmatter 必须显式写 `platform` + `affiliateUrl`。**

## 编码红线（2026-08-28 发现的全站 bug）
新写内容禁止引入 `→–`、`→’`、孤立控制字节 0x02，以及数字区间错写为 `$3—/min`、`8—0 minutes`。正确为 en dash 完整区间 `$3–6/min`、`8–10 minutes`。
（frontmatter 里的 `\"` 是**合法 YAML 转义**，不是 bug，勿修。）

## 平台优惠口径（唯一事实源 `src/lib/offers.ts`）
Kasamba `kasamba`：每个新顾问 3 分钟免费 + 首单 5 折 ｜ Keen `keen`：5 分钟 $1（一次性）｜ Purple Garden **`purplegarden`**（无连字符）：$30 credit。

## 范本页（PostHog 验证，永不修改）
`david7`、`ask-fran`、`c-garrett`、`master-sher`、`readings-by-kelly777`、`master-enigma-kasamba-review`、`how-to-spot-fake-psychic`、`brutally-honest-psychics-keen`、`psychic-prediction-didnt-come-true`、`karmic-relationships-signs-and-lessons`、`evidential-mediums-passed-spouse`、`reviews/keen`
