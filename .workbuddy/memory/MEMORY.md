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

## Match quiz 架构(2026-09-23 定型)
- **首页 = 弹窗模式**(ReaderMatch mode="modal":launcher 卡 + bottom-sheet overlay,交互骨架移植自 mysticdo 的 main.js initQuiz 引擎);**/match/ 专页 = inline 内嵌**。模式由容器 data-match-mode 区分,quizApp.ts 双 host。
- 弹窗要点:iPhone Safari 用 html 级滚动锁(ea-match-locked)+dvh+safe-area;history-back 可关闭弹窗;计算仪式 timer 必须可取消(否则旧会话结果写入新会话)。
- mysticdo 项目在 C:/Users/samja/Desktop/site/mysticdo,**只读参考,严禁改动**。
