# Eastern Alignment 项目长期约定

## 业务基线
英文 psychic reading 联盟站（Astro 静态站，Cloudflare Pages）。平台优先级 Kasamba > Purple Garden > Keen（`src/lib/offers.ts`）。2026-09-05 起只主推 Kasamba+PG，新内容不主动内链 Keen，但不得改全局模板，去 CTA 只能走页面级 `noCta: true`。目标：月 100 合格转化、CPA $125；瓶颈是流量量级，不是跳出率。

## 内容原则
- 红线：禁拆产品缺陷 / miss 率 / 差评引用 / Reddit 投诉；只做人群匹配式劝退（给替代方案+内链），负面指向人不指向产品。
- 要诊断不要共情：描述"类型"而非"你"。
- Review v2 骨架：H1 含判断 → 首屏判定 → 诊断框（只对 1–2 类问题有效）→ 检验报告（必含不利发现）→ 工作方式与失效条件 → 真实成本账 → 分流劝退 → FAQ（答案有机制）。
- 信息准入：BRIEF 四项第一手信息缺一即停写；H2 骨架不与最近 5 篇重复。

## GEO
- 两阶段（检索→抽取），保抽取四要素：自包含答案块 / 枚举 / 数字锚点 / 信息增量。被 AI 引用后锁 URL、H1、被引用段措辞；CTA/内链可改。
- chrome 恒定 620–740 词；正文 <1500 词页面禁加新 CTA；测 `python scratch/geo_text_ratio.py`。CTA 伤害排序：InlineCta > 顶 bar > EndCTA > SideDock。

## 生产约定
- CTA 一律路由注入，正文禁手写 CTA / `/go/` 链接。
- `noCta: true` 关全页 CTA（含 guides 底部三按钮卡），TOC / AuthorBio / MidArticleLink 保留；noCta 页文末须留 1 条纯文字出口链到 `/reviews/kasamba/`（PG 语境 `/reviews/purple-garden/`）。
- 外部供稿：正文不改（仅 frontmatter / 标题降级 / 补 FAQ / 原措辞内链锚）；已有页面零改动，发现问题单独问用户；重叠意图不合并，靠 URL 语义分化+互链成簇。
- 旗舰文：倒金字塔（首段结论+首屏速览表），"We Tested" 口径 Kasamba 60+ / Keen 45+ / PG 40+ / 跨平台 150+，Kasamba 为主、Keen 最少；多批写完统一构建。
- 范本页（不轻易改）：david7、ask-fran、c-garrett、master-sher、readings-by-kelly777、master-enigma-kasamba-review、how-to-spot-fake-psychic、brutally-honest-psychics-keen、psychic-prediction-didnt-come-true、karmic-relationships-signs-and-lessons、evidential-mediums-passed-spouse、reviews/keen。
- 高风险主题（financial-motives-psychics、other-woman-psychic-readings）先由用户定调；用户定方向，AI 落地。

## 构建部署
- 构建必须沙箱外，先清 CODEBUDDY_SESSION_ID / CLAUDE_SESSION_ID；退出码非 0 ≠ 失败（日志有 `✓ Completed in` 即可）；收尾 `rm -rf dist/.prerender` + 核对 + 确认 `dist/sitemap-index.xml` 非 0 字节（仅中断时才用 gen_sitemap.py 补）。
- 基线：529 index.html / 733 文件 / sitemap 275–276 条；构建前 `cp -r dist dist.bak.<日期>`。
- YAML：含撇号的 frontmatter 值用双引号（报错指向上一行）；检测 `node scratch/yaml_check.mjs`。

## 移动端 fixed 元素
- iOS 15+ Safari 地址栏在底部（~88px），Android Chrome 在顶部；fixed 元素先定锚哪端。SideOfferTab：CSS 底部锚定 `bottom: max(6.5rem,15vh)`，JS UA 检测 iOS 切 `top: 42vh`，JS 失效降级底部。
- 🔴 原则（用户两次否决后确立）：绝不为浮层改正文 padding/宽度；不做自动收起；接受 ~20px 轻微重叠。宁可重叠，不牺牲任一方。
- **iPhone 排查 2026-09-05**（报告 `iPhone显示全面排查报告_2026-09-05.md`；工具 `scratch/iphone-audit-20260905/audit.mjs` 可复跑）：iOS 26 浮动工具栏会遮 fixed/sticky 边缘元素（系统 bug，Safari 地址栏设顶部时最显著）；**Header 把 background+backdrop-filter 写在 sticky 元素本身是冲突写法，应移到 absolute 子元素**；viewport 无 `viewport-fit=cover` → 全站 `env(safe-area-inset-*)` 皆死代码，启用须真机回归；侧边 tab iOS 定位无跳变（慢 3G 逐帧实测）；首屏 chrome 176px ≈ 可用首屏 26.5%。

## 测量与审计
- 网络测量必须 `--noproxy '*'`；CTA / 链接审计落在 `dist/**/*.html`。
- CTA 审计 `scratch/audit20260902_cta/audit_cta_aff_mapping.py`；TUNE 落地在 url= 参数（percent-decode 取 profile）；slug≠显示名，看页内 JSON 判同人；顾问流失信号 profile 变 58KB 空壳，**tarot-by-elena（PG 11714）待处理**；offer 209 = keen-intuitive-jade / keen-suzen，其余 keen 走 221；西语站 EsSpanishCTA 无埋点、EsLeftSidebar 两个 /go/ 未注册 404。
- AI 爬虫：Cloudflare Bots = Block AI bots Off、Search/Agent/Training Allow、AI Labyrinth Off、Bot fight mode 关、不接管 robots.txt；改后 UA 矩阵实测。

## 编码与数据
- `platform` 字段定 CTA 平台归属 + guides review 卡；平台专文必须显式 platform+affiliateUrl。slug 化 `.replace(/\s+/g,'-')`。数字区间用 en dash。
- 优惠事实源 `src/lib/offers.ts`：Kasamba 3 分钟免费+首单 5 折；PG $30 credit（purplegarden 无连字符）；Keen 5 分钟 $1。
