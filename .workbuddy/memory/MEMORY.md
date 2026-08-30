# Eastern Alignment 项目长期约定

## 业务基线
英文 psychic reading 联盟站（Astro 静态站，Cloudflare Pages 部署）。三平台优先级：Kasamba > Purple Garden > Keen，见 `src/lib/offers.ts` 的 `PLATFORM_PRIORITY`。
商业目标：月 100 个合格转化，CPA $125。当前 Google 月点击基线 ~90，缺口 22–28 倍——**瓶颈是量级，不是跳出率**。

## 内容红线
- **禁止**：针对产品本身的缺陷拆解、miss 率 / 投诉率 / 差评占比当卖点、差评原文引用、Reddit 投诉拆解、`The Small Print` 式负面罗列。
- **允许**：**人群匹配式劝退**——"你是这类人就不适合找她，**那你该找谁**"，必须给替代方案 + 内链。负面指向**人的匹配度**，不是指向**产品**的缺陷。

## 内容原则：要诊断，不要共情
禁止任何形式共情段落（"我知道你很难受"）。理由：猜错即流失；**判断才产生信任**；共情段是 AI 味重灾区。
替代方案：描述"类型"而非描述"你"，让读者自行对照。

## Reader Review 结构（v2）
H1（必含判断/质疑）→ 第0块 首屏判定（一句话判定 + 三行情境分流 + 真实总预算 + 最低门槛路径）→ 第1块 诊断框（问题分三类，只对 1–2 类有效）→ 第2块 检验报告（用 how-to-spot-fake-psychic 三条标准逐条检验，必含一项不利发现）→ 第3块 工作方式与失效条件 → 第4块 真实成本账（总额非单价 + 下限 + 新客优惠 + 退出条件）→ 第5块 分流与劝退（该订三类 / 该换人两类带内链 / 硬劝退三条）→ 第6块 FAQ（答案必须有机制）。

## GEO / AI 引用
- **两阶段模型**：阶段1 检索（传统 SEO，入场券）→ 阶段2 抽取（绝对判断"这段能答吗"）。优先保阶段2 四要素：**自包含答案块 / 枚举结构 / 具体数字锚点 / 信息增量**。
- **被 AI 引用后的改动边界**：锁 URL、H1、**被引用那段措辞**；CTA / 样式 / 内链可改；补新事实是加法，安全。
- **chrome 稀释红线**：全站 chrome 恒定 620–740 词。正文 < ~1,500 词页面 chrome > 30% 时禁止叠加新 CTA。测量：`python scratch/geo_text_ratio.py dist/<path>/index.html`。
- **CTA 位置伤害排序**：`InlineCta` > 顶部 disclosure/offer bar > 底部 EndCTA > 折叠但仍输出 HTML 的 SideDock。

## AI 爬虫可达性（第零步）
Cloudflare 曾在边缘 403 OpenAI / Anthropic / Perplexity 全家桶 + CCBot，表现为纯文本 `Your request was blocked.`、`Server: cloudflare`、无 `cf-mitigated: challenge`。
**robots.txt 允许不够，必须实测 UA。**

### Cloudflare Bots 正确配置
| 配置项 | 正确取值 |
|---|---|
| Block AI bots（legacy） | Off |
| AI bot policies → Search | Allow |
| AI bot policies → Agent | Allow |
| AI bot policies → Training | Allow（推荐） |
| Mixed purpose crawlers | continue to be allowed |
| AI Labyrinth | Off |
| Bot fight mode | 关 / 加例外 |
| Manage your robots.txt | 不接管 |

改后用 UA 矩阵复测：`curl -s -o /dev/null -w "%{http_code}" --noproxy '*' -A "GPTBot/1.0" https://easternalignment.com/`

### 封禁表现：慢性衰减
- 爬虫抓取 → 索引 → 新内容 AI 感知不到（增量归零）。
- 用户点击导流 → 浏览器正常 UA → 不受爬虫封禁影响，存量继续变现。
- 推论：AI 流量下降时要看"新页面有没有被引"，不要只看总量。

## 生产约定
- **信息准入闸门**：BRIEF 四项第一手信息（实测次数与花费 / 沉默测试原文 / 可验证的具体项 / 一次不满意的发现）缺一项 → 停止不写。
- **反模板化**：骨架固定保批量，但每块给 2–3 种展开形态轮换，H2 骨架不得与最近 5 篇重复。
- **CTA 由路由注入**（ReaderEndCTA + CTABox），正文禁止手写 CTA / `/go/` 链接 / 结尾 nudge。
- 跑构建前先 `set CODEBUDDY_SESSION_ID= && set CLAUDE_SESSION_ID=` 清空会话变量。

## 构建与部署
- **构建必须走沙箱外**（`dangerouslyDisableSandbox`）。沙箱内 Astro 收尾调 `genie-trash`
  会 spawnSync 15s 超时 → 在 ssr-assets 阶段就挂、**页面一个都不生成**，dist 被清成残缺。
  ⚠️ `CODEBUDDY_SAFE_DELETE_ENABLED=0` 无效，shim 仍会调 genie-trash。
- **退出码 failed ≠ 构建失败**：沙箱外能跑完全部 529 页（日志出现 `✓ Completed in`），
  只在最后删 `dist/.prerender` 时报 `Some operations were aborted` 退出非 0。
  → 收尾三步：`rm -rf dist/.prerender`（bash 的 rm 不走 node shim）→ 核对文件数 → 补 sitemap。
- sitemap：构建**完整跑完**时 Astro 会自己写出（275 条 URL，191 B）。只有构建被打断时才缺失，
  此时才用 `python scratch/audit20260830/gen_sitemap.py` 补救（276 条，口径略差 1 条）。
  **部署前必须确认 `dist/sitemap-index.xml` 存在且非 0 字节。**
- 数量核对：529 页 − 169(`/go/`) − 79(`/astrology/`) − 5(legal/`content-manager`) = 276；
  dist 校验 `find dist -type f | wc -l` = 733、`find dist -name index.html | wc -l` = 529。
- **dist 恢复纪律**：构建前 `cp -r dist dist.bak.<日期>`；中断后用 **TaskStop** 终止进程。
- **YAML 撇号坑**：单引号包裹的 frontmatter 值内不能含未转义撇号（`Kasamba's`），
  否则 js-yaml 报 `bad indentation of a mapping entry` 且**报错位置指向上一行**。
  检测：`node scratch/yaml_check.mjs`（扫 255 个 md）。含撇号的值用双引号包裹。

## 测量与审计
- **网络测量必须绕过本地代理**（`--noproxy '*'`），否则 TTFB 会从 ~1s 误报为 ~11s。
- **CTA / 链接审计必须落在渲染后的 `dist/**/*.html`**，禁止只看 `src/content/**/*.md`。
- **内容质量指标必须反向验证**：指标若让范本页显得比其余页面更差，则指标错了。

## 移动端 fixed 元素：锚定边取决于浏览器工具栏在哪一端（2026-08-30 血泪）
**iOS 15+ Safari 地址栏在屏幕底部**（~88px）；**Android Chrome 地址栏在顶部**。
`position: fixed` 元素只能锚视觉视口的某一端：
- 底部锚定 → Android 稳定，但 iOS 会被地址栏压住 + 随地址栏收起而上下移动
- 顶部锚定 → 反之
→ **纯 CSS 无解**（`vh`/`svh`/`lvh` 都只解决"单位是否随工具栏变"，不解决"锚哪一端"）。
→ 本站做法（`src/components/SideOfferTab.astro`）：CSS 默认底部锚定 + `bottom: max(6.5rem,15vh)`
  （避开 iOS 底部地址栏），JS 用 UA 检测给 iOS 加 `.side-tab--ios` 切 `top: 42vh`。
  JS 失效则降级回底部锚定，安全。
→ **新增任何移动端 fixed 元素前，先确定锚哪一端**，不要默认照抄。
- 另：垂直居中（`top:50%`）在两端都会跳，幅度是工具栏高度的一半——用户最先抱怨的就是它。

### 🔴 原则：正文不动，浮层也不动（用户 2026-08-30 两次否决后的最终形态）
① 为给 CTA 腾地方，把移动端 `.container`/`.page-with-sidebars` 的 `padding-right`
   改成 `max(1rem, 48px)` → 左右不对称、正文整体左偏。
   **用户否决：「你现在把我正文往左移了，这个不行」**
   → **绝不为浮动元素改动正文容器的 padding / 宽度。**
② 改成让 CTA 自动收起（向右滑出、只留 14px 把手）后，
   **用户再次否决：「把侧边栏缩进功能去掉吧」**
   → **也不做自动收起。CTA 的意义就是被看见，藏起来等于自我削弱。**
→ **最终形态：正文布局零改动 + CTA 常驻完整展开，接受移动端约 20px 的轻微重叠。**
→ 判断标准：为"不让浮层挡字"去动正文布局是错的；让 CTA 玩捉迷藏同样是错的。
   **宁可轻微重叠，也不要牺牲任一方。**

## 编码与数据
- **platform 字段双重作用**：决定 `ArticleLayout` 全页 CTA 平台归属（缺标回落 Kasamba），以及 guides 页是否展示对应 review 卡片。平台专文必须显式写 `platform` + `affiliateUrl`。
- **Slug 化铁律**：名称 → URL 必须显式 `.replace(/\s+/g, '-')`。
- **编码红线**：禁用 `→–`、`→’`、孤立 0x02；数字区间用 en dash，如 `$3–6/min`、`8–10 minutes`。
- **优惠口径事实源**：`src/lib/offers.ts`。Kasamba 3 分钟免费 + 首单 5 折；Keen 5 分钟 $1；Purple Garden 无连字符 `purplegarden`，$30 credit。

## 范本页（PostHog 验证，不轻易改）
`david7`、`ask-fran`、`c-garrett`、`master-sher`、`readings-by-kelly777`、`master-enigma-kasamba-review`、`how-to-spot-fake-psychic`、`brutally-honest-psychics-keen`、`psychic-prediction-didnt-come-true`、`karmic-relationships-signs-and-lessons`、`evidential-mediums-passed-spouse`、`reviews/keen`

## 内容分工
**用户定方向，AI 落地**：一次改透一篇，跑出效果再批量复制。高风险主题（`financial-motives-psychics`、`other-woman-psychic-readings`）需用户先定调。
