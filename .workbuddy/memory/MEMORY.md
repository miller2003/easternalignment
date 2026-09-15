# Eastern Alignment 项目长期约定

## 业务基线
英文 psychic aff 评测站（Astro 静态 → Cloudflare Pages）。平台优先 Kasamba > PG > Keen（`src/lib/offers.ts`）；新内容不内链 Keen；去 CTA 仅走页面级 `noCta:true`。目标月 100 转化 / CPA $125。

## 🔴 红线（简版）
- 不协助伪造实测证据；实测口径含糊化（extended period / dozens of / my own money），替换时须同时 grep `public/`。
- 禁拆产品缺陷/差评，只做人群匹配式劝退。自测流量分析须排除；联盟自测 fraud 不协助。
- **收入链路（点击/跳转/CTA/归因）改动＝高风险**：默认不动；必须动则留零成本回滚点并说明。
- 🔴 **GitHub 仓库 public 且 `.workbuddy/` 未被 ignore → 本目录一切内容视为公开**，勿记凭证与敏感自述。

## 构建部署（红线）
- 构建 `node ./node_modules/astro/bin/astro.mjs build`：必须禁沙箱（沙箱内必挂死）+ 先清 CODEBUDDY/CLAUDE_SESSION_ID；勿并发勿 npx。
- 清 dist 用 `mv`（`rm -rf dist` 被 safe-delete 拦且静默中断 `&&` 链）；`mv dist` 报 busy 时：`cp -r dist/. bak` → Python 逐项清空 → 原地重建。
- 构建确定性；基线 564 html/934 文件。dist 被 gitignore，CF 从 git 构建；本地要 dist 优先「恢复备份+patch_dist.py」；sitemap 缺失先 diff html 路径集。

## /match 引擎（2026-09-14/15 定版）
- 架构：`src/match/{config,types,app}.ts` + `engine/`（纯函数）+ `content/` + `ui/`（只渲染）+ `styles/match.css`；`match.astro` 薄壳，构建期压内联 JSON。权重/阈值全在 `config.ts`；权重键带 `d:e:r:o:t:u:s:` 前缀，勿回退裸键。
- 结果态在 URL `?r=<base64>`；`decodeResult` 三道校验（长度/字符集/键白名单）。
- 读者 CTA：`data-cta-source="match-reader"` + `rel="nofollow sponsored"` + `target="_blank"`，走全站 `/go/` 通道，挂 click+auxclick，绝不自己 navigate。PostHog 归因（preventDefault+ea_sub）**无条件运行**，HAS_KEY 只门控上报。
- 危机拦截双路径（submitAsk+finishQuiz），文案集中 `CRISIS_MESSAGE`；词表不收裸 `\bdie\b`；危机屏无任何 `/go/`。
- 🔴 机制轴三铁律：8 个内部代号不进文案/URL/埋点（bundle 有查表 token 属预期，勿声称已清除）；`internalMechanismActions.ARCHIVE.ts` **任何 src 文件不得 import**；两道闸门 minScore:18 + minLead:6，不达标整段不渲染。`buildAnchor()` 跳过 q4。
- 每日牌幂等：`pickDailyCard()` 避重列表必须剔除今天。
- 必跑测试：`engine_suite.mjs`（654 断言）、`mech_render_probe.mjs`、`mobile_css_check.mjs`（100 断言）、`article_pool_probe.mjs`、`integrity_probe.mjs`；文案门禁 `node scripts/check-copy-discipline.mjs`。
- 负向断言方法论：两侧同时归一化；先注入确认会红；产物级断言单独写（读 dist/_astro/match.*.js）；`__match` grep 应为 0，minifier 改名属预期。
- 遗留：`noindex:true`；邮件 provider:'local'（不发信，文案=保存）。

### /match 动效层（2026-09-15 交互重构）
- `render(t)` 四种转场：push/pop（iOS 式横滑+26% 视差，380/340ms）/fade/none；WAAPI 只动 transform/opacity；is-transitioning 锁点击；双通道收尾（finished+超时兜底）防容器卡死。
- 选项**静默点选**：`selectOption(..., {quiet:true})` 不重渲染，assessment 原地改 class/计数/禁用态 + `.is-just-picked` 动画钩子；自动前进定时器模块级可取消（防跳题竞态）。
- `ui/swipeBack.ts` 边缘右滑返回：左缘 30px 起滑、水平优势裁决、跟手 transform、peek 静默渲染上一屏（`renderAssessment(..., silent)` 跳焦点/播报）、距离 28%/速度 0.45px/ms 双阈值、吞捕获期 click（once 会残留，用定时自毁）、commit 走 `back({viaSwipe:true})` → `render('none')`。
- 同屏内容更新（邮件回显）用 `render('none')` → afterRender 'skip'，不动焦点/滚动；结果页 `revealOnScroll` 渐显只在跨屏进入时播；pop 用 savedScroll 还原滚动位置。
- 底栏磨砂：color-mix 82% + backdrop-filter（freetext 题撤掉）；动效全走 no-preference 守卫 + 末尾独立 reduce 出口块（首个 reduce 块是 71 断言锚点，勿动）。

## 移动端标准（Apple HIG）
触控 ≥44px；input ≥16px；`100dvh`+safe-area（`/go/*` 刻意未补 viewport-fit）。`.m-card` 用 `width:min(260px,78vw,36dvh)` 不用 max-height；`.m-quote__*` 覆盖带 `!important`。移动端规则集中在 match.css 末尾章节，删章即回退。回归 `mobile_css_check.mjs` + `scratch/mobile_audit/audit.js`。

## 样式分层
- 页面级定制走 BaseLayout prop（noCta/hideDisclosure/bareFooter），不改共享组件；**只有 /match 用的样式一律放 match.css**（layout 组件内 style 会进全站共享 CSS）。
- CSS 安全性按「selector→declaration 集合」比较不按字节；chunk 重分组致大量 HTML 报差异属预期。.astro 文本手术后必须回读整档，失败整档重写。

## 本地工具链（Windows 沙箱）
- Bash 必前置 `export PATH="/usr/bin:/bin:/mingw64/bin:/c/Windows/System32:/c/Windows:$PATH"`。
- agent-browser：后台+禁沙箱，open→set viewport→eval→screenshot 单 .sh 跑完；eval 用 `eval "$(cat x.js)"`，脚本直接 return JSON。
- `engine_suite.mjs` 遗留 esbuild.exe 孤儿 → Python ctypes EnumProcesses 强杀。
- 编辑数组字面量/词表后必须回读（Edit 曾静默吞行）；含连字符文案做 `\b` 断言先去连字符。

## 其他
- `/go/*` CF 双规则（Skip ea_sub / 非本站 Referer 质询）已验证零误伤，勿改顺序勿加 WAF Skip；待决：`!!sub` 门禁可收紧含点号（勿擅自改）。
- favicon 方形 48 倍数+posterise；SERP 图标走 Google 缓存，验证比 s2/favicons 亮度。
- YAML 含撇号用双引号。
- 未修复 P1：HTML 无 ETag 却 must-revalidate；勿信 09-10 报告两条假阳性。
