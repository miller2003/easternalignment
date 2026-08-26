---
name: ea-reader-review-production
description: easternalignment 解读师（reader/psychic）review 生产流水线。当用户要求"写/新增 N 篇解读师测评/review"时使用。覆盖：机会榜取数 → 官网抓取 → advisorsBySlug JSON 解析 → feedbacks API 拉真实评论 → 头像部署 → affiliateLinks 配置 → .md 写作规范 → 校验。
---

# 解读师 Review 生产流水线（easternalignment）

## 0. 目标名单来源
- `C:\Users\samja\Desktop\解读师待做清单.html` 的「待做机会榜」（全名册未做、按解读数降序）。用 Python 正则从 HTML 内嵌 JSON 提取：`name / platform / profile_url / readings_count / rating / price_usd / year_joined / done_on_site`。
- 名单数据可能滞后：**一律以抓取的官网页面实时数据为准**（如 Jennifer 名册 4.8 → 页面 4.9；readings 数每天涨）。

## 1. 抓取官网 profile 页
- Bash curl + 浏览器 UA，小批 3-4 个 + sleep 2s。沙箱 Python 网络必死，只用 curl。
- Kasamba `https://www.kasamba.com/psychic/{slug}/` 与 Purple Garden `https://www.purplegarden.co/psychics/{id-slug}` 均可直连（200，~530KB）。**keen.com 主站被 Cloudflare 拦，本环境不可抓**（Keen 解读师需用户本机或海外 IP）。

## 2. 解析页面内嵌 JSON（两平台同构，均为 Ingenio）
- **⚠️ 2026-08-26 起 Kasamba 已迁移 Next.js RSC**：页面不再有 `window.advisorsBySlug`。数据在 `self.__next_f.push([1,"..."])` 转义字符串块里（camelCase 字段）。用 `scratch/extract_kasamba_rsc.py <html> "<nickname>"` 提取：正则抓全部 push 块 → `json.loads('"'+p+'"')` 反转义（**不能用 unicode_escape，会毁 UTF-8**）→ 定位 `"nickname":"<名字>"` → 向前找 `{"id"` → 大括号配对截取。字段名对应：readingsCount / yearJoined / likesCount / dislikesCount / aboutMe / serviceDescription / profilePictureUrl。
- PG 仍为 `window.advisorsBySlug = {...}`（正则定位 + 大括号配对计数截取，snake_case）。advisor 对象字段：
  - `rating / readings_count / year_joined / likes_count / dislikes_count`
  - 价格：`analytics["undiscounted chat ppm"] / ["undiscounted voice ppm"]` + `live_mode_min_price`（注意倒挂案例：light4you voice $4.99 < chat $5.99；Jennifer voice $25.49 >> chat $3.99）
  - 文案：`about_me / service_description / instructions`（instructions 是"怎么跟 TA 读"的金矿）
  - `specialities[].name`、`ai_reviews_summary`（平台 AI 总结）、`accuracy_percent`、`badges`
  - `profile_picture_url`（头像，见 §4）
- 页面 `window.endpoint` 给出评论 API host：Kasamba=`https://api3.kasamba.com`，PG=`https://api.purplegarden.co`。

## 3. 拉真实评论（明贬暗褒的原料）
- API：`{endpoint}/advisors/{advisor_id}/feedbacks?page=N`（advisor_id 在 advisorsBySlug 的 `advisor.id`）。Accept: application/json。
- 拉 5 页 ≈150 条，按 order_id 去重。筛 `like=false` 的差评——但**差评只用作"连批评者都确认 TA 准"的背书证据**（如 Kris10 "deeply hurt but probably very accurate"），**绝不写进文章的缺点/cons**。
- 同一昵称的连续评论可拼出"客户故事线"（Diane 8 个月 31 条、Partika 39 条、Kieran Hunter 13 条），并用 Counter 算复购签名（复购客户数、头部集中度）——这是"减少套路化"和独家分析的核心素材。
- **统计挖掘（必做）**：主题词计数（accur/honest/kind/detail/timing 等）、复购客户表、新颖引文（mega-regulars 的长评）。文章厚度来自这些独家数据，不来自形容词。
- **⚠️ 低分读者红线（2026-08-26 Mystic Knight 案例）**：官网实时 rating ≤ 4.2 或近 150 条差评率 >5% 且内容涉实质质量指控（拖时/不准/说教）时，**不写**，向用户报告数据并建议替换。净读必须是推荐，无法在不编造的前提下达成。
- **Small Print 标题保持中性**（用户 2026-08-26 明确要求）：可用 "The Small Print — Two Harmless Quirks" / "Three Notes Before You Book"，**禁止**在标题层承认"不是缺点"（如 "Three Things That Aren't Flaws"）。正文中 "the friction flatters her" 式表述有批次 1/2 先例、可用。

## 4. 头像部署
- `profile_picture_url` curl 下载 → `public/avatars/{platform}/{slug}.jpg`。
- **命名约定**：Kasamba = `{slug}-kasamba-review.jpg`；PG = `{slug}.jpg`；Keen = `{slug}.jpg`。
- 验证：JPEG SOI（FFD8）+ 尺寸（官网均为 588px 级）。
- **k3cdn 签名 URL 偶发 AccessDenied**（如 base64 带 `==` padding 的）：解码 base64 取 `key` 字段，直连 `https://k3cdn.kassrv.com/{key}`（或 profilePictureDetails.host + key）可绕过（2026-08-26 tarot 案例）。

## 5. 联盟链接（src/data/affiliateLinks.ts）
- Kasamba：`"kasamba-{slug}"`，offer_id=191，url 编码后**带尾斜杠**：`...%2Fpsychic%2F{slug}%2F%3Fclickid%3D...`
- PG：`"purple-garden-{slug}"`，offer_id=30，**无尾斜杠**：`...%2Fpsychics%2F{id-slug}%3Fclickid%3D...`
- 尾部统一 `{transaction_id}` / `{affiliate_id}-{affiliate_name}` 宏，照抄既有条目。
- .md 的 `affiliateUrl: /go/{slug}/` 必须与键名一致。

## 6. .md 写作规范（硬规则）
- 文件位置：Kasamba=`src/content/readers/kasamba/{slug}-kasamba-review.md`；PG=`src/content/readers/purple-garden/{slug}.md`。
- frontmatter 必填：title/description/platform/platformName/rating/verdict/affiliateUrl/avatarUrl/canonicalUrl/seoTitle/metaDescription/publishDate/updatedDate/highlights/pros/cons/entities/customSchema（PG 加 ogImage）。
- customSchema = Review 型 JSON-LD（reviewRating/author/itemReviewed(Person)/about/datePublished），块内 JSON 必须合法。
- **首段 = 全文结论**（**Book X if… Skip X if…** 格式，含核心数字）；后续每节展开论证；结尾不手写 CTA/nudge（路由自动注入 ReaderEndCTA）。
- 转化导向 + 明贬暗褒（**2026-08-26 用户纠偏后的硬规则**）：缺点/cons **只允许"无关痛痒型"**——打字慢（=真在抽卡）、有口音、高峰难抢在线（=人气）、emoji 多（=温暖）、bio 有错别字（=真人非文案）、程序性要求多（需备名字/生日=效率）、价格太低被误判新手（翻转）。**严禁把准确性争议/预测未兑现/"vague"/"浪费钱"类实质差评写进缺点**——那是避雷写法，会打消下单。实质差评只有一个合法用途：改写成"连批评者都确认 TA 准"的背书段。
- 明贬暗褒的公式：每个小毛病必须紧跟翻转（"the pause is the reading"）；frontmatter 的 cons 数组同样只放无关痛痒型。
- **禁编造**：引文必须来自 feedbacks API 原文（带昵称+日期）；价格/数字以抓取数据为准。
- 每篇一个独特主线（五代首位女灵媒 / 24 年元老 / $1.99 满分 / 家规 / 真相派），避免模板化。
- 文末加 `**More {platform} reviews:**` 内链 footer（3 篇相关 + hub），校验链接目标文件存在。

## 7. 校验（写完必跑）
- 检查项：frontmatter 必填键、customSchema JSON 合法（注意从完整文件提取，frontmatter 末行无换行会截掉 `}`）、avatar 文件存在、affiliateLinks 键存在、内链目标 .md 存在、无 CRLF。
- 参考脚本思路见 scratch/（2026-08-26 批次所用校验 one-liner）。

## 8. 构建
- **沙箱内 astro build 确定性卡死**——build 必须用户本机跑，前置 `CODEBUDDY_SESSION_ID= CLAUDE_SESSION_ID=`。
