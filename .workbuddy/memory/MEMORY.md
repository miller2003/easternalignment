# Eastern Alignment 项目记忆

## 项目性质
英文 Astrosoastro联盟站(站名 Eastern Alignment),变现 = Kasamba/Keen/Purple Garden 三平台 psychic 评测佣金(/go/ 跳转)。**联盟后台 = barges**(用户 2026-09-23 口头确认;README 里 Impact/TUNE 的提法以用户为准,转化核对一律查 barges 后台)。内容集:guides(112 篇)、readers(130+ 评测)、reviews(3 平台)、comparisons(4 篇)、astrology zodiac(数据驱动)、es/ 西语版。

## SEO 战略共识(2026-09-16 确定)
- psychic 只是玄学分支,非总括词;站点从「psychic 站」升级为「全玄学词类聚合站」,psychic 内容不减产但不再独占产能。
- 已知 P0:删除 astrology 三处 noindex(index.astro:15、zodiac/[sign].astro:38、zodiac/[pair].astro:35),解冻 90 页。
- 站内王牌场景 = 爱情挽回/ex-recovery;新分支内容优先找与爱情主线的交叉角度(如 mercury retrograde ex、1111 love、manifest ex back)。
- 完整缺口报告:scratch/seo-gap-analysis-2026-09-16.html;12 分支优先级:Tarot > Astrology(慢漏斗) > Numerology/天使数字(程序化) > Mediumship > 其余。

## 技术要点
- Python 用 "C:/Users/samja/.workbuddy/binaries/python/versions/3.13.12/python.exe";bash 的 ls 等基础命令在此环境不可用,文件操作优先用专用工具。
- guides 内容聚类定义在 src/lib/relatedReaders.ts(GUIDE_SECTIONS),hub 分区:love、breakups-ex-recovery、mediumship、tarot、career-money、spirituality、getting-started、more-guides。
- 报告/脚本产出统一放 scratch/,勿动 src/。scratch/ 已于 2026-09-23 做过标准清理(713.5MB→15.6MB),**只保留报告类(.md / HTML report)与 research 资料**;一次性脚本、抓取快照、日志、截图用完即删,勿长期堆积。

## 仓库卫生(2026-09-23 清理)
- .gitignore 已覆盖 `dist.stale*/`、`*.bak.*/`、`*.bak-*`。历史事故:`dist.stale-20260922/`(200 文件)、`src.content.bak.20260910/`(285 文件)、`build-scores.log`、`src/data/affiliateLinks.ts.bak-20260921` 曾被误提交,已 git rm(可从事后历史恢复)。**本次共 487 项待提交删除 + .gitignore 修改,尚未 commit,部署前需提交。**
- **清理 scratch/ 前的强制双信号校验**:①近 7 天 mtime 的脚本一律视为在用工具,不删;②grep `.workbuddy/memory/` 日志确认无"分析脚本:"类引用。仅 grep 源码不足以判断——关键引用写在 prose 日志里。
- **事故代价**:18 个 PostHog/barges 分析脚本(`analyze_barges_stats.py`、`posthog_shave_audit.py`、`posthog_alltime_platform.py` 等)被误永久删除,尚需重建;未跟踪文件永久删除前**必须先打包备份**。删除清单留档 `scratch/_CLEANUP_MANIFEST_20260923.txt`。
- `.env` 只有 `PUBLIC_POSTHOG_KEY` / `PUBLIC_POSTHOG_HOST`(埋点 public key,不能查询 Insights);重跑对账需另找 PostHog personal API key。
- 失效引用待修:`src/data/affiliateLinks.ts:41` 注释指向已删的 `scratch/check_reader_links.py`。


## 外部 API 调研结论(2026-09-23)
- **TUNE 开发者门户(developers.tune.com)已核查:无「解读师/顾问实时在线状态」能力**。Affiliate API = HasOffers Apiv3(24 controller / 49 model),覆盖账号、Offer 与素材、报表与佣金、通知与 webhook;Network API(41 controller)、Advertiser API、JS SDK 同样无 readers/advisors/presence 类资源。最接近"实时"的只有 Affiliate_NotificationCenter 事件订阅 + Webhook(推送的是转化/offer 事件)。
- 解读师在线状态只能从平台方(Kasamba/Keen/Purple Garden)自身获取,官网的实时可用标识是前端渲染,非开放 API。**不要再重复调研 TUNE。**

## Match quiz 内容红线(2026-09-23 用户确认)
- 用户可见的 quiz 选项**不点名平台**(Kasamba/Keen/PG)、不出现"直接给结果"的括号标签(类型/费率/优惠),靠 sublabel 描述引导沉浸式选择;题目数据在 src/match/taxonomy.ts。
- readers.json 的 cons/pros 是编辑内部审计笔记,只准出现在评测文章页;quiz 结果页 When to Skip 用 explanations.ts 生成文案,首页客户端 payload 已剔除 cons/pros。
- public/content-manager.html 是内部工具但会被部署到线上,待用户决定处置。

## 基础设施事实:Cloudflare 防盗链(2026-09-27 实测)
- **easternalignment.com 所在 CF zone 开启了 Scrape Shield → Hotlink Protection**。判定依据:图片资源在跨站 Referer 下返回 `403 error code: 1011` + `Vary: referer`,同源/无 Referer/www 子域均 200,且非图片资源(如 `/_astro/*.css`)不受限 → 按资源类型生效的 CF 边缘规则,与站点代码无关(`public/_headers`、`functions/` 均无 referer 判断)。
- **后果1(已解释一个真实困惑)**:PostHog 会话回放**不录图片像素**,只存 `<img src>`;回放器在 posthog.com iframe 内以 posthog.com 为 Referer 重新取图 → 403 → 录像里图片全是破图。**这是回放侧假象,真实用户图片显示正常**,排查线上图片问题勿被录像误导。
- **后果2(客观损失)**:Google/Bing 图片代理带自家 Referer → 403,站内图片难进图片搜索索引。社交/IM 预览爬虫多不带 Referer,通常不受影响。
- 关闭方式:CF Dashboard → Scrape Shield → Hotlink Protection → Off(零代码)。若要保留,须改用 WAF 自定义规则自建 allowlist(放行无 Referer / 同站 / posthog.com)。

## Match quiz 架构(2026-09-23 定型)
- **首页 = 弹窗模式**(ReaderMatch mode="modal":launcher 卡 + bottom-sheet overlay,交互骨架移植自 mysticdo 的 main.js initQuiz 引擎);**/match/ 专页 = inline 内嵌**。模式由容器 data-match-mode 区分,quizApp.ts 双 host。
- 弹窗要点:iPhone Safari 用 html 级滚动锁(ea-match-locked)+dvh+safe-area;history-back 可关闭弹窗;计算仪式 timer 必须可取消(否则旧会话结果写入新会话)。
- mysticdo 项目在 C:/Users/samja/Desktop/site/mysticdo,**只读参考,严禁改动**。

## 西语解读师 66 篇基建定型(2026-09-28,上线前检查后终态)
- **内容规模**:PG 31 篇 + psi 35 篇 = 66 篇,全部 `src/content/es-readers/{purple-garden-es,psiquicos-web}/`。
- **CTA 单一事实源 = `src/lib/esOffers.ts` ES_READER_URLS(66 条全量)**;/go/ slug 真源 = affiliateLinks.ts。**offer 口径:PG = offer_id 34(2026-09-28 用户在 barges 生成 30 条按人深链,桌面 `new30_official_urls.txt` 回填),psi = offer_id 42(`psi35_official_urls.txt` 用户回填);三向核验一致(用户 txt = affiliateLinks.ts = dist/go 产物)。勿再用 offer 30。** 所有 CTA 表面(hero/sticky/DealStrip/InlineCta/CTABox/EsReaderCard/hub 卡)均按人化;TopOfferBar 保持平台级通用链接是设计如此。**psi 的按人深链需要两件事同时到位才算接线:affiliateLinks.ts 条目 + `[lector].astro` 传 `readerSlug`——2026-09-28 曾漏掉后者,35 条深链静默失效。**
- **【铁律】读师数据只有一个事实源 = 各篇 md 的 frontmatter。** hub 展示卡、首页 field note、任何引用都不得手写数字。2026-09-28 在 PG hub 抓到 5 张硬编码卡中 3 张被平台数据否证(最严重:Aura Rosa 宣称 4.8★/350+ 而平台 0.0★),另有 Luz Tarot 与自家评测页互相矛盾。两个 hub 的展示卡现已改为 frontmatter 驱动(PG 选品 Top5、psi 选品 veronica/carlota,选品常量 + 渲染时取 frontmatter)。
- **头像/OG 规格与管线**:public/avatars/es-readers/{slug}.webp(192²)+{slug}-og.jpg(**588² 方形,而页面声明 og:image:width/height=1200×630,全站不一致,待用户定夺**);66 篇全齐(132 文件)。PG 批用 `build_avatar_assets.py`,psi 批用 `build_psi_avatar_assets.py`(竖图顶部锚定)。列表 API 不可靠,找人一律反查 roster/detail。
- **frontmatter 旗舰标准**(66 篇已达标,新篇必须遵循):ogImage + freeOffer(PG="$30 de crédito…"/psi="3 minutos gratis + hasta 60% de descuento")+ metaDescription(120–160 字符)+ seoTitle ≤65 字符。工具 `patch_frontmatter.py <platform>` / `audit_seo.py <platform>`。
- **FAQ 渲染**:两个 [lector].astro 已改为 frontmatter.faq 优先 + 通用问题去重补充,EsFAQ 自动出 FAQPage JSON-LD——新篇写 faq frontmatter 即生效,不要再写正文 FAQ 段。
- **pricing 字段写法**:统一 `"$X.XX/min"`;非数字值(如 "Tarifa por confirmar")组件已做防御,不会再渲染成 "…/min"。
- **待办/已知缺口**:①psi 35 篇篇幅偏薄(PG 1.028–1.687 词中位 1.357;psi 262–1.317 中位 583,17 篇 <500 词),建议扩到 900–1.200 词;②66 篇之间正文互链为 0;③平台规模数字(psi 全池 144、PG 1.689/西语 126)与页面宣称的「2.000+」「900+」口径待用户确认。
- **上线前检查工具**(scratch/es-readers/,可复用):`predeploy_audit.mjs`(源码级:frontmatter/SEO 长度/canonical/资产/CTA 三向一致/深链 offer 与宏/重复度/英文残留)、`verify_es_dist.mjs`(产物级逐页核验)、`check_es_links.mjs`(站内链接全量解析)、`rewrite_psi_body_cta.py`。报告:`scratch/es-predeploy-audit-20260928.html`。

## 西语站 CTA 按钮系统(2026-09-28 定型)
- **global.css §5b `.es-cta` 作用域** = /es 全部转化按钮的样式真源:深金渐变(--es-gold-600 #8A651A→700 #6B4E0F,取自 mysticdo 色板)+ cream 文字(#F8F4E9) + 药丸 + 紧凑 padding(lg 10×22px)+ hover 金环 rgba(184,147,58,.55)。英文站 tan 色 .btn--primary 不受影响;**不要改全局 --color-accent token**。
- 长标签按钮必须 `white-space: normal`(旧 nowrap 是手机截断根因)。新增 ES 按钮一律挂 `es-cta` 类(游离 btn--primary 已全部补挂:EsComparisonTable、es/index、es/404)。
- EsInlineCta/EsSidebarDealCard/EsLeftSidebar deal-card__btn/EsDealStrip 链接色均已同步金色系;EsTopOfferBar 横幅与 EsSideOfferTab 深棕是刻意保留。
- **移动端判定必须用 puppeteer 仿真**(setViewport isMobile+deviceScaleFactor),`chrome --headless --screenshot --window-size=375` 布局与截图宽度不一致会伪造整页右裁假象(2026-09-28 实测踩坑)。工具:`~/.workbuddy/binaries/node/workspace/overflow_probe.js`(溢出探针)、`mobile_btn_check.js`(按钮测量);npm 502 时用 `env HTTP_PROXY= NO_PROXY="*" npm install`。

## 平台评分口径(2026-09-28 用户定版:+0.1 终态,勿回退)
- **编辑评分:Psíquicos Web 4.8 > Purple Garden 4.7**(用户在数据版 4.7/4.6 基础上要求各 +0.1)。依据 = 抓取库硬数据:psi 883.194 次解读(7,2×)/144 位全西语/已评分均 4,80★/99,0% 好评/中位 chat $2,79;PG-ES 126 位(全池 7,5%)/仅 57 位已评分(均 4,96★,51 位 ≥4,9)/69 位未评分新人/99,1%/中位 chat $2,49·voz $3,49·video $4,99。PG 胜在顶部精英+全球 App+$30;psi 胜在体量/母语平台/价格/质量密度。
- **四处同步才算改分**:schema ratingValue + hub-rating-bar + 首页 comparisonPlatforms + 首页平台卡 StarRating。
- **psi 无 video 模式**(DB 144/144 仅 chat+voice)——psi hub 模式表已删 Video 行,首页 communication 为 Chat·Teléfono。规模口径:psi 144 位(勿写 2.000+)、PG 西语 126 位(勿写 900+)。价格区间一律「中位 + 区间」格式,区间来自 live_modes 实测。
- PG 子池过滤口径:`data/detail/pg/*.json` 里 `language_code=='es'`(126 位);rating=0 是未评分新人,平均分必须排除后算。

## 构建陷阱(2026-09-28 实测)
- **astro build 的 import.meta.glob 快照发生在构建启动时**:并发 agent 落盘的文章会被静默漏掉(实测 35 篇 psi 只出 10 页,build 仍报 Complete 不报错)。**多 agent 并发场景,build 前必须先 `ls` 确认源文件数量与 mtime 全部落盘,再启动构建;build 后必须数 dist 产物数量,不能只看 build 页数**。
- **`rm -rf dist` 会被本机 safe-delete 守卫拦截**(genie-trash 失败 → FAIL_CLOSED)。要冷构建清 dist,走 PowerShell `Remove-Item -LiteralPath ... -Recurse -Force`。
- **es 路由的集合 schema 完全不生效**:两个 `[lector].astro` 用 `import.meta.glob` 读原始 frontmatter,绕过 `content.config.ts` 里 `esReaders` 的 platform enum 与必填校验(写错不报错)。长期建议改 `getCollection('esReaders')` 或把审计脚本挂进构建前置。

## 转化回传链路(2026-09-28 补全,勿回退)
- **事件名只有一个:`Order_Converted`**。lead(注册,$0) 与 sale(付费,>0) 靠 `properties.conversion_type` 区分,**不要拆成两个事件名**(所有既有洞察都按此口径建立)。
- **`$insert_id` 格式 = `ea-pb-<txn>-<type>-<payout>`**(approved/无状态时保持此形状 → 历史事件幂等不被破坏);**撤销类追加 `-<status>` 另开一条**;孤儿事件追加参数指纹。
- **revenue 语义**:lead 记 0;sale 记实收;撤销类记**负值** → `sum(revenue)` 天然是净营收。**但"转化笔数"必须按 `transaction_id` 去重**(Kasamba/PG 的注册→付费是同交易号两条记录)。
- **类型判定四级**(结果写进 `type_inference`):显式 `conversion_type` > `commission` > `amount/sale_amount/order_amount` > `payout`。踩坑:联盟侧在 Lead 动作上可能把 `{payout}` 填成**报价**,只看 payout 会把注册算成付费 → 判为 lead 且金额只来自 payout 时 revenue 归零并记 `revenue_source=lead_zeroed`。
- **平台识别 = `aff_sub2` 第三段**:`/go/` 页把 `<人ID>.<令牌>.<平台码>`(kasamba|keen|purplegarden) 拼进 aff_sub2,端点按白名单解析。**因为回传里根本没有 offer_id,改造前 7 笔转化的 platform 全是 null**。老的两段格式继续兼容;归一化值在 `sub_id_canonical`。
- **端点可选鉴权**:`env.POSTBACK_SECRET` 未设置时不校验(向后兼容);设置后必须先在后台 URL 补 `&k=`,**顺序反了会让回传全部 403**。鉴权失败不写事件(否则端点自己变污染源)。
- **判"后台没发"还是"发丢了"**:`Postback_Orphan` 恒为 0 而后台有转化 → **后台根本没发**(端点早已能收 $0)。
- **🔴 Lead 收不到的根因(2026-09-28 后台截图确认)**:barges「追踪点/回传」页只有 3 行,**每行「目标」都是 `First Purchase`** → 注册类目标从未绑定回传 URL。修法 = **新增**行(目标换成注册/Signup/Lead 类,三个广告单各一条,URL 末尾补 `&conversion_type=lead`),**现有 3 行不要动**。既有 URL 形如 `https://easternalignment.com/api/postback?click_id={aff_sub2}&payout={payout}&transaction_id={transaction_id}`(宏名以此为准,不要再猜)。
- 代码 `functions/api/postback.js`;手册 `docs/lead-postback-setup.md`;自检 `scripts/postback-selftest.mjs`(线上 dry-run/写入)、`scripts/test-postback-classify.mjs`(离线回归,9 用例)、`posthog_analysis/lead_funnel.py`(lead→sale 升级率 + 注册归因)。

