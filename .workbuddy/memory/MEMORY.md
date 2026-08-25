# 项目记忆 - easternalignment

## 项目概况
- 英文玄学/灵媒测评独立站（affiliate 流量站），Astro 静态站 → Cloudflare Pages，约 8 个月站龄（2026-08）
- 变现：TUNE/Barges 联盟网络（bargestech.go2cloud.org，aff_id=2326），广告主 Keen / Kasamba / Purple Garden
- 佣金：Kasamba CPA 已提升至 $125（追溯生效）；PG 提升中。转化（2026-08-25 用户确认）：10 conversions，其中 4 个 qualified 新客首单付费
- 主推顺序（2026-08-25 全站重置）：Kasamba #1 (4.9) → PG #2 (4.88) → Keen #3 (4.8)；Editor's Choice 归 Kasamba
- AM 关系：Maayan Bronstein（Ingenio，PG 内容指导：Top Psychics/love/mediumship LP 转化最好，别先做 Tarot）；Matthew Tenney（Ingenio Organic Growth Manager）——8-24 发现本站 fake-psychic 指南被 Claude 引用
- 用户邮件署名 huanchao wang <nuhannmiller@gmail.com>；不熟 PostHog 看板（已写 POSTHOG_PER_PAGE_GUIDE.md）

## 内容基调（review 写法硬规则）
- 转化优先 + 明贬暗褒：只提无关痛痒或可管理的小缺点，解法必须强化推荐；净读必须是推荐
- 禁编造 quote/价格；reader .md 不手写结尾 CTA / nudge / 披露（路由自动注入 ReaderEndCTA + CTABox）
- 批次2起：减少套路化论证；每篇以读者独特点为主线；文章要翔实（bio 细节/真实评论引文/session 体验）

## 关键技术架构
- Affiliate 链接（2026-08-10 重构）：映射在 src/data/affiliateLinks.ts；/go/[...slug].astro 门控占位页防 bot 虚点击（same-origin referrer / sessionStorage / ?ea_sub= 才跳 TUNE）；_redirects 已无 /go/ 302；PostHog.astro 点击监听带 e.isTrusted 校验
- ReaderEndCTA nudge 段按平台分桶（3桶×6段=18 段）：Keen=咖啡价锚定 / Kasamba=前3分钟免费 / PG=$30免费额度；data-cta-copy + data-cta-platform 标记供 PostHog 分桶分析
- src/lib/platform.ts 导出 platformFromName()
- readers schema 支持 avatarUrl/ctaOverride/unavailable；chosenone77 和 jackies-tea-tarot 无真图用字母/svg 兜底
- es/ 西语站未接 nudge；es/psiquicos-web 是空 hub 待处理

## SEO 战略（2026-08-24 报告 + 8-25 Matthew brief，详见 SEO_STRATEGY_REPORT_2026-08-24.md 和 scratch/gsc_matthew/）
- 阶段判断：非流量问题，是 CTR 损耗 + 排名断层（第二页魔咒，平均排名 ~23）
- 最高 ROI 动作：CTR 修复（首页零点击词如 keen free 3 minutes 排名7.8零点击）+ AggregateRating schema 全站补
- mysticmag.com 对标：~420 URL、日访客~4K、域名早5年；差距在体系（EEAT实体化/转化模板/每日运势/42平台）非单篇质量
- 月100转化数学：需 ~2,000-2,500 点击/月（当前~90），CTR×2.5 × 排名×3 × 内容面×4 叠加
- 三阶段：①接住流量（CTR/schema/hub重写）②扩关键词面（对比矩阵/tools内容化解除noindex/场景guides）③权威品牌（外链/新平台/es站）
- 已验证赢家：mystic-raj 读者页 CTR 21.6%（单读者深评模式成立，是差异化定位）

## 环境坑（跨会话复用）
- 沙箱：Python 网络必死（抓取用 Bash curl，小批3-4个+sleep）；Windows \r 毒化（写文件 newline='\n'，读行去尾 \r）
- 构建：沙箱内 astro build 确定性卡死（2026-08-14 起），**build 必须用户本机跑**；本机构建需前置 CODEBUDDY_SESSION_ID= CLAUDE_SESSION_ID= 关 safe-delete shim
- keen.com 主站被 Cloudflare 拦（本环境无法验证，须用户本机确认）；images.keen.com 头像 CDN 可 curl

## 用户
- Windows + Git Bash；中英文混用；自称 samja
