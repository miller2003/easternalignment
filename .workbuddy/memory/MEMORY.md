# 项目记忆 - easternalignment

## 项目概况
- 英文玄学/灵媒测评独立站（affiliate 流量站），Astro 静态站 → Cloudflare Pages，约 8 个月站龄（2026-08）
- 变现：TUNE/Barges 联盟网络（bargestech.go2cloud.org，aff_id=2326），广告主 Keen / Kasamba / Purple Garden
- 佣金：**Kasamba 和 PG 的 CPA 均已谈至 $125**（2026-08-26 用户确认；Kasamba 追溯生效）。转化（2026-08-25 用户确认）：10 conversions，其中 4 个 qualified 新客首单付费
- 增长目标（2026-08-26 确立）：每月 100 个合格付费转化 ≈ $12,500/月，需 ~2,000-2,500 点击/月（当前 ~90）
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
- **平台图标全部本地托管** `public/logos/{key}.png`（2026-08-26）：keen=Google faviconV2 48×48 PNG（红字+米色渐变）；kasamba/purple-garden=iOS App Store 官方 marketing 256×256 PNG；psiquicos-web=DDG icons 200×200。**不能热链 google.com/gstatic.com**——国内网络 GFW 直接断。`platformLogo()` 在 src/lib/offers.ts 返回 `/logos/${key}.png`，所有 CTA/侧栏/PS 组件统一走这条路径。
- **按钮命名硬约定（2026-08-26 棕底黑字事故后确立）**：任何按钮/CTA 锚点的 class 必须含 "btn" 或 "cta"；棕底白字的 color 声明必须带 `!important`。根因：global.css `.prose a:not(...)` 链接规则叠了多个 :not()，特异性 (0,6,1)，会覆盖渲染进 .prose 的按钮锚点的白字（组件作用域样式只有 (0,3,0)）。prose 规则已加 `:not([class*="btn"]):not([class*="cta"])` 豁免——新按钮类名不含这两个子串就会重蹈覆辙。InlineCta 是 JS 注入 .prose 的，ScorePanel 经 hub 页 slot 进 .prose，都要按"在 prose 内"对待。

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
- **Google favicon 服务至少两个端点、返回不同图片**：`www.google.com/s2/favicons?domain=X&sz=N` ≈ 16×16 ICO；`t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&url=X&size=N` ≈ 48×48 PNG。curl 一个端点不能推断另一个 —— 同一域名在两个端点下的视觉可能完全不一样（keen.com 就是典型：s2 返回红底白字 ICO，faviconV2 返回红字白底 PNG）。

## 用户
- Windows + Git Bash；中英文混用；自称 samja
- **国内网络（GFW）但有海外 IP 切换能力做站点 QA**——做"打不开/显示异常"类问题诊断时，海外 IP 通常一切正常，问题大概率是 GFW 拦境外域名（google.com / gstatic.com / keen.com 主站等）。早期做诊断别直接归因到"资源本身坏了"，先问"海外能不能看到"
