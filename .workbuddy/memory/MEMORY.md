# Eastern Alignment 项目记忆

## 项目性质
英文 Astrosoastro联盟站(站名 Eastern Alignment),变现 = Kasamba/Keen/Purple Garden 三平台 psychic 评测佣金(/go/ 跳转)。内容集:guides(112 篇)、readers(130+ 评测)、reviews(3 平台)、comparisons(4 篇)、astrology zodiac(数据驱动)、es/ 西语版。

## SEO 战略共识(2026-09-16 确定)
- psychic 只是玄学分支,非总括词;站点从「psychic 站」升级为「全玄学词类聚合站」,psychic 内容不减产但不再独占产能。
- 已知 P0:删除 astrology 三处 noindex(index.astro:15、zodiac/[sign].astro:38、zodiac/[pair].astro:35),解冻 90 页。
- 站内王牌场景 = 爱情挽回/ex-recovery;新分支内容优先找与爱情主线的交叉角度(如 mercury retrograde ex、1111 love、manifest ex back)。
- 完整缺口报告:scratch/seo-gap-analysis-2026-09-16.html;12 分支优先级:Tarot > Astrology(慢漏斗) > Numerology/天使数字(程序化) > Mediumship > 其余。

## 技术要点
- Python 用 "C:/Users/samja/.workbuddy/binaries/python/versions/3.13.12/python.exe";bash 的 ls 等基础命令在此环境不可用,文件操作优先用专用工具。
- guides 内容聚类定义在 src/lib/relatedReaders.ts(GUIDE_SECTIONS),hub 分区:love、breakups-ex-recovery、mediumship、tarot、career-money、spirituality、getting-started、more-guides。
- 报告/脚本产出统一放 scratch/,勿动 src/。
