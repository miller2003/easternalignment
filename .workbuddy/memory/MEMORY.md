# Eastern Alignment 项目长期约定

## 业务基线
英文 psychic aff 评测站（Astro 静态，Cloudflare Pages）。平台优先 Kasamba > PG > Keen（`src/lib/offers.ts`）。2026-09-05 起主推 Kasamba+PG，新内容不内链 Keen；去 CTA 仅走页面级 `noCta: true`。目标月 100 转化 / CPA $125，瓶颈是流量量级。

## 🔴 红线
- **内容真实性**：About/Methodology 的"实测"数据（$840、24 advisor、158 评测、Sarah 人设等）实为编造，用户已坦白；站点已被 AI 引用，核查成本极低。不协助伪造任何证据。
- **实测口径含糊化**：不写具体金额/人数/小时/月数，用 extended period / dozens of / my own money / firsthand research。全站替换须同时 grep `public/`（llms.txt 是历史盲区）。
- **禁拆产品缺陷/差评/Reddit 投诉**；只做人群匹配式劝退（负面向人不向产品）。
- **自测流量**：用户自测指纹＝CN IP 全 + GB 桌面 Chrome（9 月前）；分析须排除。联盟自测属 fraud，不协助。
- **收入链路（点击/跳转/CTA）代码改动＝高风险**，用户可能事后要求回退；默认不动或改 Cloudflare 后台方案；必须动则说明零回退成本+留回滚点。
- 高风险主题（financial-motives-psychics、other-woman-psychic-readings）先由用户定调。
- 🔴 **仓库外泄（2026-09-13 发现）**：`.gitignore` **未忽略 `.workbuddy/`**，且 GitHub 仓库 `miller2003/easternalignment` 为 **public** → 本项目全部内部记忆（含本节红线、运营策略、CPA 目标）自 2026-08-11（743515e）起已匿名可读，横跨 39 个提交。实测 `raw.githubusercontent.com/.../.workbuddy/memory/MEMORY.md` = 200。**任何写入本目录的内容都默认视为对外公开**，勿记凭证、勿记可被联盟平台利用的自述。处置待用户定调（建议先转 private）。

## 内容与生产
- 要诊断不要共情（描述"类型"非"你"）。
- Review v2 骨架：H1 判断→首屏判定→诊断框→检验报告（含不利发现）→工作方式与失效条件→成本账→分流劝退→FAQ。
- 信息准入：BRIEF 四项第一手信息缺一停写；H2 骨架不与最近 5 篇重复。
- CTA 一律路由注入，正文禁手写 CTA / `/go/`。`noCta:true` 关全页 CTA（TOC/AuthorBio/MidArticleLink 保留），文末留 1 条文字链到 `/reviews/kasamba/`（PG 语境 `purple-garden`）。
- 外部供稿：正文不改（仅 frontmatter/标题降级/补 FAQ/原措辞内链锚）。
- 范本页（勿改）：david7、ask-fran、c-garrett、master-sher、readings-by-kelly777、master-enigma、how-to-spot-fake-psychic、brutally-honest-psychics-keen、psychic-prediction-didnt-come-true、karmic-relationships、evidential-mediums、reviews/keen。
- 优惠源 `offers.ts`：Kasamba 3 分钟免费+首单 5 折；PG $30 credit（purplegarden 无连字符）；Keen 5 分钟 $1。
- rating＝本站独立分（非平台分），可低于平台 0.5–0.8（需正文解释），分布 4.3–4.7 为主。

## GEO
两阶段（检索→抽取）；四要素：自包含答案块/枚举/数字锚点/信息增量。被引用后锁 URL、H1、被引用段措辞。chrome 620–740 词；<1500 词正文禁加新 CTA（`python scratch/geo_text_ratio.py`）。CTA 伤害：Inline > 顶 bar > EndCTA > SideDock。

## 构建部署（红线）
- 🔴 用 `node ./node_modules/astro/bin/astro.mjs build`（勿用 npx / astro.js）。须沙箱外，先清 CODEBUDDY_SESSION_ID/CLAUDE_SESSION_ID。
- 🔴 **挂死/假完成**：日志停在 `✓ Completed in` 后、dist 不再增长＝缓存脏 → **`rm -rf .astro node_modules/.astro` 重跑**（同代码 18s、560 页）。注意：Bash 工具里用 `&` 后台跑的构建会随该次调用结束被回收（易误判挂死）。勿并发。渲染完进程常不退出：html 数达标即算完成，直接 TaskStop。**dist 被 gitignore，CF 从 git 构建；需本地 dist 时用「恢复备份 + `patch_dist.py` 打补丁」比本地构建更快更稳。**
- 基线（2026-09-11）：**563 html / 920 文件** / index 191B / sitemap-0 129,699B（含前序加的 161 webp 头像；177 个 `/go/*` 无 favicon 声明属正常）。构建前 `cp -r dist dist.bak.<日期>` 只留最新 1 个；收尾 `rm -rf dist/.prerender`；sitemap 缺失先 diff html 路径集，一致则 cp 备份。
- YAML 含撇号用双引号；`node scratch/yaml_check.mjs`。

## favicon / SERP 图标（2026-09-11）
- Google 降采样 favicon 到 ~16px；须方形且为 48 的倍数，**别用 16×16**（放大变糊）；光栅 ico 别加 `sizes="any"`（SVG 专用，易让 Google 选错）；96/192 PNG 排在 .ico 前。
- 淡彩/水彩图墨迹覆盖率低（本图仅 ~18%），"加深/锐化"救不了 16px，必须 **posterise 成实色块**。鲜艳＝高彩度+高亮度；RGB 压暗发灰、HSV 降 V 发褐。
- 🔴 **PIL `crop()` 越界用黑填充**：logo.jpg 是 1024×817，方形裁切会跑到负坐标 → 上下出现纯黑条。裁切必须先算边距或垫纸色。**交付前务必查首/末行像素亮度**。
- 工具 `scratch/favicon-20260911/`（Pillow 在 `~/.workbuddy/binaries/python/envs/default`）；原图备份在 `ORIGINAL-backup/`；已上线 = P1。
- 🔴 **SERP 图标 ≠ 站点文件**：Google 用自家缓存（`google.com/s2/favicons` → `t*.gstatic.com/faviconV2`），独立于线上文件、按自己节奏刷新（数天~数周）。"浏览器标签页变了但 SERP 没变"＝正常现象，不是部署错。验证法：`curl -sL "google.com/s2/favicons?domain=<域名>&sz=64"` 比均值亮度（旧图≈新图→已刷新；≈旧图→未刷新）。唯一有效动作＝GSC 首页「请求编入索引」。

## 测量与审计
- 网络测量加 `--noproxy '*'`。CTA 审计 `scratch/audit20260902_cta/audit_cta_aff_mapping.py`；技术审计 `scratch/audit_20260910/*.py`。
- **✅ 已澄清（勿动）：`/go/*` 的 Cloudflare 规则是用户自己加的防 bot 直连规则，确认对真人零误伤。** 实配：① `Skip: Real Aff Clicks`（顺序 1）＝ `path contains "/go/" and uri.query contains "ea_sub="` → 跳过；② `Protect Aff Redirects`（顺序 2）＝ `path contains "/go/" and not http.referer contains "easternalignment.com"` → 托管质询。逐头隔离实验证明它只认「同域 `Referer`」或「非空 `?ea_sub=`」两个业务信号，与 UA/Accept/Sec-Fetch 完全无关；真人点击 CTA 两条都满足（`PostHog.astro:179-181` 无条件拼 `ea_sub`；同源相对路径导航必带 Referer，全站 `noreferrer` 命中 0）。生产数据实证：埋点上线后 2/2 点击到达 `/go/`（`gate_reason=referrer`，TTFB 320/339ms），`aff_go_blocked` 恒 0，且 09-10 11:34 那次无 hit 的点击**产生了 $125 转化**（反证未被拦）。**不要建议加 WAF Skip**（会放回 bot 直连）；**不要调换两规则顺序**。测法脚本：`scratch/audit_20260911/{header_matrix,referer_isolate,easub_test}.py`；报告见 `技术审计报告_2026-09-11.md` 附录 A。
- **待决（收入链路，勿擅自改）**：`src/pages/go/[...slug].astro` 门禁 `isReal = referrerOk || ssOk || !!sub` 中 `!!sub` 只要求非空 → `?ea_sub=1` 即可同时跳过 CF 质询 + 过门禁 + 产生真实联盟点击。可收紧为要求含点号（真人必然带点号，零影响）。另需用户确认 Skip 规则的「要跳过组件」是否被勾成"所有组件"。
- **教训**：`curl -D -` 拿到 403 挑战页也会有响应头，别当成线上正常配置 —— 基于响应头的结论必须同时确认状态码 200。
- **未修复（真 P1）**：全站 HTML 无 ETag/Last-Modified 却声明 `must-revalidate`（矛盾，`_headers` 里"304 很便宜"的前提不成立）→ 每次导航全量重传。
- 🔴 **勿信 09-10 报告两条结论**（工具假阳性）：①「214 Product 结构化数据无效」——全是 `Review.itemReviewed` 嵌套节点，本就不需要 offers；②「21 页 description <70 字符」——审计正则遇撇号截断所致，实际最短 110 字符。
- 审计工具链：`scratch/audit_20260911/`（live_audit / linkcheck / distcheck / cta_check / dupid / imgcheck）；技能 `~/.workbuddy/skills/website-technical-audit` 已修正上述两处假阳性。
- 待办（低优先）：14 个枢纽页（含首页）缺 sitemap `lastmod`（`buildLastmodMap()` 只读 content collection）；`/coupons/` 547KB/1179 div；viewport 缺 `viewport-fit=cover` 致 `SideOfferTab` 的 safe-area 变量恒为 0；孤儿 slug `/go/keen-love-lake/`；`Crawl-delay:1`；缺 HSTS/CSP。
- 日常看 PostHog；每月+关键节点扫 GSC（排名/AI 引用/收录）。

## 移动端
- SideOfferTab 底部锚定 + iOS UA 切 top。绝不为浮层改正文 padding、不自动收起、接受 ~20px 重叠。
- Header 的 background+backdrop-filter 应移到 absolute 子元素。viewport 无 `viewport-fit=cover` → safe-area 变量全是死代码。
