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
- 🔴 **挂死/假完成**：日志停在 `✓ Completed in` 后、dist 文件数不再增长（2026-09-11 实测卡 233/563 达 4 分钟）＝缓存脏 → **`rm -rf .astro node_modules/.astro` 重跑**（同代码重跑 18s、560 页、sitemap 正常）。勿并发启动构建。渲染完进程常不退出：html 数达标即算完成，直接 TaskStop。
- 基线（2026-09-11）：**563 html / 920 文件** / index 191B / sitemap-0 129,699B（含前序加的 161 webp 头像；177 个 `/go/*` 无 favicon 声明属正常）。构建前 `cp -r dist dist.bak.<日期>` 只留最新 1 个；收尾 `rm -rf dist/.prerender`；sitemap 缺失先 diff html 路径集，一致则 cp 备份。
- YAML 含撇号用双引号；`node scratch/yaml_check.mjs`。

## favicon / SERP 图标（2026-09-11）
- Google 降采样 favicon 到 ~16px；须方形且为 48 的倍数，**别用 16×16**（放大变糊）；光栅 ico 别加 `sizes="any"`（SVG 专用，易让 Google 选错）；96/192 PNG 排在 .ico 前。
- 淡彩/水彩图墨迹覆盖率低（本图仅 ~18%），"加深/锐化"救不了 16px，必须 **posterise 成实色块**。鲜艳＝高彩度+高亮度；RGB 压暗发灰、HSV 降 V 发褐。
- 🔴 **PIL `crop()` 越界用黑填充**：logo.jpg 是 1024×817，方形裁切会跑到负坐标 → 上下出现纯黑条。裁切必须先算边距或垫纸色。**交付前务必查首/末行像素亮度**。
- 工具 `scratch/favicon-20260911/`（Pillow 在 `~/.workbuddy/binaries/python/envs/default`）；原图备份在 `ORIGINAL-backup/`；已上线 = P1。

## 测量与审计
- 网络测量加 `--noproxy '*'`。CTA 审计 `scratch/audit20260902_cta/audit_cta_aff_mapping.py`；技术审计 `scratch/audit_20260910/*.py`。
- 待办：`/go/*` 被 CF Managed Challenge 403；4 个 Keen 页 canonical 404（删 `canonicalUrl`）；214 Product 节点缺 offers/aggregateRating；人数真值 64/49/49=162（llms.txt 硬编码过期）；tarot-by-elena（PG 11714）。
- 日常看 PostHog；每月+关键节点扫 GSC（排名/AI 引用/收录）。

## 移动端
- SideOfferTab 底部锚定 + iOS UA 切 top。绝不为浮层改正文 padding、不自动收起、接受 ~20px 重叠。
- Header 的 background+backdrop-filter 应移到 absolute 子元素。viewport 无 `viewport-fit=cover` → safe-area 变量全是死代码。
