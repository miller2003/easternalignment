# Eastern Alignment 项目记忆

> 2026-09-29 压缩定版(超限前全文留档 `MEMORY.full-20260929.md`,细节回查留档/当日日志)。

## 基本事实
- Astro 站:英文主站 + `/es` 西语分站;变现 = Kasamba/Keen/Purple Garden 评测佣金(`/go/`)。**联盟后台 = barges**,转化一律查 barges。
- 环境:python `~/.workbuddy/binaries/python/versions/3.13.12/python.exe`;node `~/.workbuddy/binaries/node/versions/22.22.2-3/node.exe`;chrome `C:/Program Files/Google/Chrome/Application/chrome.exe`;puppeteer-core 在 node workspace(ESM 用 `createRequire`)。
- 产出放 `scratch/`,勿动 `src/`;只留报告,脚本/日志/截图用完即删。
- **删未跟踪文件前先打包备份**(2026-09-23 误删 18 个分析脚本);清理前双信号:近 7 天 mtime 视为在用 + grep memory 日志找引用。

## 铁律
1. **读师数据唯一事实源 = 各篇 md 的 frontmatter**;hub 卡/首页不得手写数字(2026-09-28 PG hub 已因此出事)。
2. **HTML 里有 `<img>` ≠ 图片显示了**:卡片头像必须跑浏览器级核验(判 `naturalWidth>0`)。2026-09-29 事故 = 两个 ES hub 精选卡渲染渐变底首字母 div。工具 `scripts/avatar-render-audit.mjs gen|parse`(基线 70 页/469 图)。精选卡头像写法 = 渐变+首字母打底、`<img>` 绝对定位覆盖。
3. 按人深链**三处同时到位**才生效:`affiliateLinks.ts` + `esOffers.ES_READER_URLS` + `[lector].astro` 传 `readerSlug`(漏后者 = 35 条静默失效)。
4. 视觉核验:Chrome headless 最小窗口≈500px,`--window-size=390` 伪造右裁假象 → 同源 iframe 探针或 puppeteer `setViewport()`(须 `--no-proxy-server`);`--screenshot` 必须绝对路径;chrome 一律由 bash 启动(node 子进程 spawn 会 EBUSY)。
5. **滚动**:`html{scroll-behavior:smooth}` 把根元素上的历史滚动恢复也动画化(「回退时页面从顶部落下」的根因)。别删 CSS,用 `src/components/ScrollRestoreGuard.astro`(`is:inline`,必须置 `<head>`):首帧前打 `ea-scroll-instant`,首次用户意图时解除,`pagehide` 复武装覆盖 bfcache;挂 BaseLayout/EsBaseLayout。回归 `scripts/scroll-back-verify.mjs`。
6. **审计/核验工具放 `scripts/`(已入 .gitignore 白名单、纳入版本控制),`scratch/` 只放报告与数据**。2026-10-01 迁移:这些脚本被 skill 引用,而 scratch 是「用完即删」的本地目录,两者冲突会误删 skill 依赖。迁移时 `ROOT` 由 `path.resolve(dirname,'../..')` 改为 `'..'`(scratch/es-readers 两层深 → scripts 一层)。清单:`predeploy-audit` / `verify-es-dist` / `check-es-links` / `avatar-render-audit` / `verify-pg-deeplinks` / `scroll-back-verify` / `indexnow`。

## 西语站(66 篇 = PG 31 + psi 35)
- CTA 单一事实源 `src/lib/esOffers.ts`;offer 口径 **PG=34 / psi=42(勿再用 30)**。
- 头像 `public/avatars/es-readers/{slug}.webp`(192²)+ `-og.jpg`(588² 方形,与页面声明的 1200×630 不符,待定夺)。
- 新篇 frontmatter 必带 ogImage/freeOffer/metaDescription(120–160)/seoTitle(≤65);FAQ 写 `frontmatter.faq`;`pricing` 统一 `"$X.XX/min"`。
- 评分终版 **psi 4.8 > PG 4.7**,改分四处同步(schema/hub-rating-bar/首页 comparisonPlatforms/平台卡);psi 无 video;规模 psi 144 / PG 西语 126。
- **两套评分,别混**:①站点编辑评分 = frontmatter `rating` → 徽章`Calificación de Experto`/hub 卡/`reviewRating`;②正文+metadata 里的 `N★`(「3.537 lecturas en 5.0★ desde 2020」)**全是平台档案真实分**(源=数据库`评分`列)。66 篇共 489 处评分数字,**0 处**在说站点自己的分 → 调整站点评分时正文一律不动。详见 skill `ea-es-reader-rating-sync`。
- **日期字段语义(写死)**:`verifiedDate` = 复核后**无改动**才设(`VerifiedNote.astro`);**真实内容更新必须删 `verifiedDate` 并把 `updatedDate` 改当天**。
- 审计硬约束:`scripts/predeploy-audit.mjs` 对 `seoTitle > 65` 报 ERR(现状 4 篇已卡 65,加字符就超);`metaDescription` 里评分恒一位小数(`5.0★`),`seoTitle` 里 5.0 写 `5★`。
- 解读师库:xlsx 常读不了(编辑器池 `No workbook open`)→ 用同源 `out/西语解读师_基础信息表.csv`;join 靠 `es_slug_map.json`/`psi_slug_map.json` 的 id;`luna-aestethic` 在 CSV 查无行。
- 缺口:psi 35 篇偏薄(中位 583 词)、66 篇互链为 0。
- **/es/guias/ 类目（2026-10-02 上线首批 10 篇）**：内容 `src/content/es-guides/*.md` → 路由 `src/pages/es/guias/[slug].astro` + 索引页；布局 `EsGuideLayout.astro`；单一事实源 `src/lib/esGuides.ts`（4 个分类 amor/tarot/senales/consultante）。frontmatter 必带 seoTitle(≤65)/metaDescription(120–160)/category/platform/shortAnswer/keywords/faq；`featuredReaders` 渲染读师实时卡片，`ctaReader` 决定主 CTA 深链。路由走 glob 不过 zod → 发布前跑 `node scripts/audit-es-guides.mjs`（0 ERR 才能部署）。keywords 里纯数字必须加引号（1111 会被 YAML 解析成 number 导致构建崩）。66 篇读师页底部已自动挂「Guías para preparar tu consulta」互链（`EsRelatedGuides`）。
- ES 按钮一律挂 `.es-cta`(`global.css` §5b);长标签 `white-space: normal`。

## 构建 / 部署陷阱
- **`import.meta.glob` 快照在构建启动时**:并发落盘的文章会被静默漏掉 → build 前后各数一次文件数。
- `rm -rf dist` 被 safe-delete 拦截 → 用 PowerShell `Remove-Item -Recurse -Force`。
- es 路由 `[lector].astro` 绕过 content.config.ts 的 zod 校验(写错不报错)。
- 部署前 `git status --porcelain` 确认工作区已提交。

## 转化回传链路(2026-09-28,勿回退)
- 事件名只有 `Order_Converted`;lead($0)/sale 靠 `properties.conversion_type` 区分,勿拆事件名。
- `$insert_id = ea-pb-<txn>-<type>-<payout>`,撤销追加 `-<status>` 另开一条。revenue:lead=0、sale=实收、撤销=负值;笔数按 `transaction_id` 去重。
- 平台识别 = `aff_sub2` 第三段。**未修缺口**:`OFFER_TO_PLATFORM_CODE`(go 页)与 `OFFER_TO_PLATFORM`(postback.js)只有 221/191/30,缺 34/42/209 → psi platform 恒为 null。
- Lead 收不到:barges 回传页 3 行「目标」全是 First Purchase → 需**新增**注册类目标行(现有 3 行勿动)。代码 `functions/api/postback.js`。

## 战略 / 其它
- 定位:psychic 只是玄学分支,做「全玄学词类聚合站」;王牌场景 = 爱情挽回。
- Match quiz 红线:选项不点名平台、无「直接给结果」标签。`mysticdo` 只读。
- CF zone 开 Hotlink Protection:跨站 Referer 图片 403;PostHog 回放破图是回放侧假象。
- 勿重复调研:TUNE/HasOffers 无「解读师实时在线状态」API。
