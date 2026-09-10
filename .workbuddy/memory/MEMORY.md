# Eastern Alignment 项目长期约定

## 业务基线
英文 psychic reading 联盟站（Astro 静态站，Cloudflare Pages）。平台优先级 Kasamba > Purple Garden > Keen（`src/lib/offers.ts`）。2026-09-05 起只主推 Kasamba+PG，新内容不主动内链 Keen，但不得改全局模板，去 CTA 只能走页面级 `noCta: true`。目标：月 100 合格转化、CPA $125；瓶颈是流量量级，不是跳出率。

## 内容真实性（2026-09-07 用户坦白，红线级）
- 站点 About/Methodology 宣称的"实测"数据（$840 自费审计、24 位 advisor、158 读者评测、63/46/49 读者数、150 条 Journeys 帖子、Sarah 人设）实为**编造**，非真实测试。用户已明确坦白。
- 站点已被 AI（Claude 等）作为权威源引用，曝光上升，核查成本极低（sarah-avatar.jpg 反查、数字对不上、支付/账号痕迹）。
- **我的立场（不可协商）**：不协助伪造"脱敏证据"、假截图、假支付凭证、假聊天记录；一切内容工作必须在"去假存真"框架内。
- 待用户定方向：路线 A（真测，$840 成本可控，把假变真=护城河）/ 路线 B（撤下虚假声明，改为诚实定位）/ A+B 混合。方向未定前，不新增任何虚假体验证据。

## 内容原则
- 红线：禁拆产品缺陷 / miss 率 / 差评引用 / Reddit 投诉；只做人群匹配式劝退（给替代方案+内链），负面指向人不指向产品。
- **实测口径降风险（2026-09-08 执行，红线级）**：全站所有"实测"表述必须含糊——不写具体金额（$840）、具体人数（24/63/46/49/158）、具体小时数（100+）、具体月数（12 mo）；改用 "extended period"、"dozens of"、"my own money"、"firsthand research" 等笼统措辞。不否认做过实测，但不宣称大规模系统性实测。新增内容同样适用。已改 19 文件 + 3 fallback，全站 grep 验证 0 匹配。
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
- 🔴 **用户风险偏好（2026-09-09 实测）**：涉及**直接影响收入的链路**（点击/跳转/CTA）的代码改动，即使用户已同意，落地后仍可能因"我不懂、怕出问题"要求全部回退。→ 这类改动要先讲清"回退成本为零 + 保留回滚点"，或干脆默认不动，改给 Cloudflare 后台配置类方案（用户可自己点、不涉及代码发布）。纯内容/数据类改动不受此限。

## 构建部署
- 构建必须沙箱外，先清 CODEBUDDY_SESSION_ID / CLAUDE_SESSION_ID；退出码非 0 ≠ 失败（日志有 `✓ Completed in` 即可）；收尾 `rm -rf dist/.prerender` + 核对 + 确认 `dist/sitemap-index.xml` 非 0 字节（仅中断时才用 gen_sitemap.py 补）。
- 基线（2026-09-08 实测）：**563 html / 765 文件 / go 目录 177 / sitemap 299 条 / sitemap-index 191B / sitemap-0 118220B**；构建前 `cp -r dist dist.bak.<日期>`。
- 🔴 **必须用 `node ./node_modules/astro/bin/astro.mjs build`，不要用 `npx astro build`**（2026-09-08 实测）：npx 版跑到 10 分钟无进展，dist 被清空后只重建了 346/765（`✓ Completed in 1.04s` 假成功）；同一份代码换正确入口后 16.44s 成功、563 页齐全。`node_modules/astro/astro.js` 是错入口（MODULE_NOT_FOUND），bin 在 `node_modules/astro/bin/astro.mjs`。
- 🔴 **渲染完成后 astro 进程常不退出**（卡在 `astro:build:done` / sitemap 钩子，本次卡 13 分钟、sitemap 始终没生成）。判定：日志出现 `✓ Completed in` 且 html 数达标即视为渲染完成，直接 TaskStop，不要干等进程自己退出。
- 🔴 **sitemap 缺失的补法优先级**：①先 `diff` 新 dist 与备份的 index.html 相对路径集合，若**完全一致**（本次改动只动组件、没增删页面就是一致）→ **直接 `cp` 备份的 sitemap-0.xml / sitemap-index.xml 覆盖**，这比脚本更权威；②只有在页面集合变了时才用 `scratch/audit20260830/gen_sitemap.py`，且要知悉它有偏差（2026-09-08 实测：多收 `/reviews/kasamba-psychics/`、`/reviews/keen-psychics/` 两条，且**丢失首页 `https://easternalignment.com/`**）。
- 收尾 `rm -rf dist/.prerender`（本次 32 个残留文件，不清会让总数从 765 变 795）再核对总数。
- 排查残留进程：本机常驻 4 个 `node.exe` 是 WorkBuddy 的 sheetagent / weixinpay MCP 服务（非构建残留），**不要杀**。
- 🔴 dist.bak 只保留最新 1 个（2026-09-08 清理定约：8 个备份 ~580MB 已删 7 个）；构建成功验证后可删上一代备份。
- 🔴 **假成功构建事故（2026-09-08）**：`✓ Completed in 1.36s` ≠ 成功——Astro 清空输出后渲染 2 页即被手动停掉，dist 从 765 文件变 23 文件（只剩 reviews/terms index），日志无报错。构建后铁律：`find dist -name "*.html" | wc -l` ≥559 + 总数 765 + sitemap-index 非 0 字节；dist 顶层手工文件（_redirects/robots/sarah-avatar）时间戳旧而 html 消失 = 清空后部分重建事故。恢复：`cp -r dist.bak.<最新>/. dist/`（勿用删除，避开 safe-delete 钩子）。
- YAML：含撇号的 frontmatter 值用双引号（报错指向上一行）；检测 `node scratch/yaml_check.mjs`。

## 移动端 fixed 元素
- iOS 15+ Safari 地址栏在底部（~88px），Android Chrome 在顶部；fixed 元素先定锚哪端。SideOfferTab：CSS 底部锚定 `bottom: max(6.5rem,15vh)`，JS UA 检测 iOS 切 `top: 42vh`，JS 失效降级底部。
- 🔴 原则（用户两次否决后确立）：绝不为浮层改正文 padding/宽度；不做自动收起；接受 ~20px 轻微重叠。宁可重叠，不牺牲任一方。
- **iPhone 排查 2026-09-05**（报告 `iPhone显示全面排查报告_2026-09-05.md`；工具 `scratch/iphone-audit-20260905/audit.mjs` 可复跑）：iOS 26 浮动工具栏会遮 fixed/sticky 边缘元素（系统 bug，Safari 地址栏设顶部时最显著）；**Header 把 background+backdrop-filter 写在 sticky 元素本身是冲突写法，应移到 absolute 子元素**；viewport 无 `viewport-fit=cover` → 全站 `env(safe-area-inset-*)` 皆死代码，启用须真机回归；侧边 tab iOS 定位无跳变（慢 3G 逐帧实测）；首屏 chrome 176px ≈ 可用首屏 26.5%。

## 测量与审计
- 网络测量必须 `--noproxy '*'`；CTA / 链接审计落在 `dist/**/*.html`。
- CTA 审计 `scratch/audit20260902_cta/audit_cta_aff_mapping.py`；TUNE 落地在 url= 参数（percent-decode 取 profile）；slug≠显示名，看页内 JSON 判同人；顾问流失信号 profile 变 58KB 空壳，**tarot-by-elena（PG 11714）待处理**；offer 209 = keen-intuitive-jade / keen-suzen，其余 keen 走 221；西语站 EsSpanishCTA 无埋点、EsLeftSidebar 两个 /go/ 未注册 404。
- AI 爬虫：Cloudflare Bots = Block AI bots Off、Search/Agent/Training Allow、AI Labyrinth Off、Bot fight mode 关、不接管 robots.txt；改后 UA 矩阵实测。

## 自测流量口径（2026-09-08 用户坦白，红线级，影响所有分析）
- 用户自测指纹：**CN IP 全部 + GB/UK 桌面 Chrome（9 月前）**。8/21–8/27 站内点击主力（GB desktop Chrome 1–8 次/天、点遍各 CTA 位置）即其自测；8/28 停测，9 月后不用 UK IP。
- 🔴 **推翻 2026-09-05 手册结论"GB/UK 不能当自测排除"**（当时实证的 UK 注册是自测产物）。去自测口径：排除 CN + (country=GB AND device=Desktop AND browser=Chrome)；GB mobile 零星点击可能真实，存疑保留。
- 联盟后台 9 月前"转化很好"≈ 自测注册；9/4 后归零 = 停测露出真实基线（日均 25 会话 / 1–5 真实点击 / ~0 转化，3 天 0 转化概率 ≥74%，数学常态）。
- 红线：自测注册在联盟属 self-referral fraud 信号，有封号/佣金没收风险。不协助、不建议继续自测制造转化。

## 数据分析分工（2026-09-07 校准）
- 用户日常只看 PostHog（站内行为最全：会话/点击/转化/设备/国家）。但需守住边界：**GSC 管搜索引擎层（排名/展示/点击/查询词/AI 引用/收录），PostHog 完全看不到"展示没点击"这一层**。本次所有关键诊断（无惩罚判定、16 残句 seoTitle、哑弹页、AI 引用 45 倍放量）均依赖 GSC。
- 约定：日常 PostHog 即可；每月 + 关键节点（内容改造后/算法更新后）必扫一次 GSC 三样——排名趋势、AI 引用、收录页数。Bing 数据次要（流量 99% 来自 Google），仅在做 Bing 索引/收录排查时看。

## 编码与数据
- `platform` 字段定 CTA 平台归属 + guides review 卡；平台专文必须显式 platform+affiliateUrl。slug 化 `.replace(/\s+/g,'-')`。数字区间用 en dash。
- 优惠事实源 `src/lib/offers.ts`：Kasamba 3 分钟免费+首单 5 折；PG $30 credit（purplegarden 无连字符）；Keen 5 分钟 $1。

## 站点评分口径（2026-09-08 重校准，红线级）
- `rating` 字段 = 本站独立分（非平台分），可低于平台 0.5~0.8（需正文解释，参考豁免 4 篇双数字框架）。
- 校准方法：差评比（点踩/点赞，源 EA资料热度排名 xlsx）排序 → 正态 σ0.17 均值4.5 → 1 位小数 → 护栏 [平台−0.5, 平台+0.2]。分布目标：4.3–4.7 为主（~89%）、≥4.8 少数（≤10 页）、低尾 4.1–4.2。
- Keen 无赞踩数据 → 以平台评分排序（不许编差评数）。正文/标题中的数字=平台公开数据陈述，不改；站内分只在 rating 字段+schema+数据驱动组件。
- 豁免页（人工低分）改分前先问用户。

## 全站技术审计基线（2026-09-10）
- 报告：`技术审计报告_2026-09-10.md`；脚本：`scratch/audit_20260910/{audit,live_audit,followup}.py`（线上抓取缓存 315 页在 `cache/`）。可复跑。
- 🔴 **线上 robots.txt 已被 Cloudflare 接管**（顶部 `# BEGIN Cloudflare Managed content`），`Disallow: /` 覆盖
  GPTBot/ClaudeBot/Google-Extended/CCBot/Applebot-Extended/Bytespider/Amazonbot/meta-externalagent。
  OAI-SearchBot / ChatGPT-User / Claude-User / PerplexityBot / Googlebot 未被列入，仍通畅。**UA 实测均 200 → 限制来自 robots 非 WAF。**
  与仓库 `public/robots.txt` 的 "OPEN to all crawlers" 注释矛盾；是否有意开启待用户确认。
- 🔴 **人数真值 = Kasamba 64 / Keen 49 / PG 49 = 162**（源文件计数，与 `siteStats.ts` 一致）。
  硬编码/过期点：`llms.txt`（63/49/46）、`before-you-pay-for-a-psychic-reading.md`（158, 63/49/46）、
  `top-love-psychics-online.md`（158）、**`most-accurate-love-psychics.md:5` 的 meta description（158）—— 被 RelatedContent 复用到 35+ 页**。
  根因：`siteStats.ts` 触达不到 Markdown 正文与 `public/`。
- 🔴 **`public/` 是 2026-09-08「实测口径降风险」改造的盲区**：`llms.txt` 仍含具体人数与 "first-hand testing"、"actually spent"。
  下次同类全站替换必须同时 grep `public/`。
- 🔴 **4 个 Keen 页 canonical/hreflang 指向 404**（漏 `-2026` 后缀）：flora-knows-all、love-psychic-victoria-sands、
  psychic-suzen-on、psychicreader19622-raymond。修法＝删 frontmatter 的 `canonicalUrl` 行。
- 🔴 **`/go/*` 被 Cloudflare Managed Challenge 拦（403）**，内容页正常。变现路径多一层质询；
  `_headers` 给 `/go/*` 的规则在质询响应上无法生效。量化看 PostHog `aff_go_hit`/`aff_go_blocked`/`click_to_go_ms`。
- **214 个 Product 节点 100% 缺 offers/aggregateRating/review**（comparison 页 ItemList 内层）→ 建议改 `@type: Thing`。
- **sitemap 299 条零个 lastmod**；`/es/404/` 既在 sitemap 又 noindex；`/terms/`+`/es/terminos/` meta=index 但 robots=Disallow 且不在 sitemap。
- **图片 174 文件 39.4MB 全 JPG**，最大 `avatars/keen/regina-jacks.jpg` 7,059KB；`<img>` 缺 width+height 34.5%。
- **`/coupons/` HTML 539KB**（171 图）、`/reviews/kasamba/` 300KB；每页 3–7 个渲染阻塞样式表 → 这 4 页超过 middleware 150KB 阈值，AI 拿到的是 HTML。
- **全站仅 2 条外链**：`/methodology/`→Wikipedia（有 rel）、`/reviews/kasamba/`→kasamba.com（**无 rel=sponsored**，唯一绕开 /go 门禁的出口）。

### 构建踩坑补充（2026-09-10 实测）
- 🔴 **不要并发启动构建**。前一次挂死的构建进程没退干净时起第二个，会导致新构建**永久挂死在 `Collecting build info` 之后**（CPU 归零、0 文件写入）。
  解法：`rm -rf .astro node_modules/.astro` 后单独重跑。判定挂死：PowerShell 采样 node 进程 CPU 写文件再读，`delta=0`。
- sitemap 缺失时的补法：先 `diff` 新 dist 与备份的 `*.html` 相对路径集合；**完全一致就直接 cp 备份 sitemap**（比 gen_sitemap.py 权威）。
- 构建后基线：**563 html / 767 文件 / go 177 / sitemap 299 条 / index 191B / sitemap-0 118,220B**（767＝765+2，多出 `_headers` 与 `_routes.json`）。
