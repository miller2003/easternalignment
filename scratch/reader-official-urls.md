# 70 篇 Reader Review — 官方解读师页面链接（最终版）

生成日期：2026-08-10。用途：你拿这些官方链接去 TUNE / Barges 后台转成深层链接（deep link），发回给我即可替换 `affiliateUrl` 并 rebuild。

**深层链接公式**
```
https://bargestech.go2cloud.org/aff_c?offer_id=<OFFER>&aff_id=2326&url=<URL-encoded 官方链接>
```
- Kasamba → `offer_id=191`
- Purple Garden → `offer_id=30`
- Keen → `offer_id=221`

**状态总览**
| 平台 | 有官方 URL | 实测验证（2026-08-11） | 结论 |
|------|-----------|----------------------|------|
| Kasamba | 20 / 20 | **curl 全部 HTTP 200** | ✅ 确定有效，可直接建深层链接 |
| Purple Garden | 20 / 20 | **curl 全部 HTTP 200** | ✅ 确定有效，可直接建深层链接 |
| Keen | 23 / 30（7 删除） | ⚠️ **无法复验** | 见下方红色警示 |

> **🔴 Keen 红色警示（务必读）**：2026-08-11 实测，Keen 对本环境已彻底封锁——`curl`（沙箱+关 shim 均 403）与 `WebFetch`（12 条全部返回 Cloudflare "You are unable to access keen.com"）都打不开。这 23 条是 **2026-08-10 审计时经 WebFetch 验证过可打开**的，但今天起我无法再替你确认它们是否仍有效。
> **因此：Keen 这 23 条，你在 TUNE 后台建深层链接之前，必须自己在本机浏览器逐条点开确认能打开。** 哪条打不开，告诉我 slug，我来处理（换 URL 或删文）。
> **优先重点检查这 4 条结构最脆弱的**：`master-psychic-dev`（http:// 非 https）、`intuitive-jade`（http:// 且真实 slug 是 isis-jade）、`ladyfontaine` 与 `lollie-ext-5555`（无数字 ID 的非标准 Keen URL）。其余 19 条为标准 `keen.com/<category>/<slug>/<id>` 格式，相对稳定。
> Kasamba 与 Purple Garden 不受 Cloudflare 影响，今天 curl 实测全 200，放心用。

> Purple Garden 与 Kasamba 的 URL 均来自平台官方 sitemap 并已核实可解析（2026-08-11 复验 200）。
> Keen 的 30 条：16 条已有直接 URL（3A）；原 14 条待处理（3B）经全面核查 —— 7 条已找到规范个人页 URL（文章保留），7 条公开渠道无法找到规范 URL（文章已删除，见 3B）。

---

## 一、Kasamba（20 条，全部有官方 URL）

| # | 我的 slug | 解读师 | 官方链接 | offer_id |
|---|----------|--------|---------|----------|
| 1 | kasamba-cosmic-fusion | Cosmic Fusion | https://www.kasamba.com/psychic/cosmic-fusion/ | 191 |
| 2 | kasamba-david-james | David James | https://www.kasamba.com/psychic/david-james-psychic-wisdom/ | 191 |
| 3 | kasamba-elizabeth | Elizabeth | https://www.kasamba.com/psychic/elizabeth/ | 191 |
| 4 | kasamba-stefan | Love Stefan's Psychic Soul | https://www.kasamba.com/psychic/love-stefans-psychic-soul/ | 191 |
| 5 | kasamba-safina | Psychic Safina | https://www.kasamba.com/psychic/psychic-safina/ | 191 |
| 6 | kasamba-satire | Psychic Satire | https://www.kasamba.com/psychic/psychic-satire/ | 191 |
| 7 | kasamba-simmi | Psychic Simmi | https://www.kasamba.com/psychic/psychic-simmi/ | 191 |
| 8 | kasamba-yazmin | Psychic Yazmin | https://www.kasamba.com/psychic/psychic-yazmin/ | 191 |
| 9 | kasamba-wisdom-and-love | Wisdom and Love | https://www.kasamba.com/psychic/wisdom-and-love/ | 191 |
| 10 | kasamba-chelle | Seek Chelle | https://www.kasamba.com/psychic/seek-chelle/ | 191 |
| 11 | kasamba-golden-eye | Golden Eye | https://www.kasamba.com/psychic/golden-eye/ | 191 |
| 12 | kasamba-cristina | Ask Cristina | https://www.kasamba.com/psychic/ask-cristina/ | 191 |
| 13 | kasamba-master-enigma | Master Enigma | https://www.kasamba.com/psychic/master-enigma/ | 191 |
| 14 | kasamba-invincible-insights | Invincible Insights | https://www.kasamba.com/psychic/invincible-insights/ | 191 |
| 15 | kasamba-sweet-spirit-of-love | Sweet Spirit of Love | https://www.kasamba.com/psychic/sweet-spirit-of-love/ | 191 |
| 16 | kasamba-immense-spark | Immense Spark | https://www.kasamba.com/psychic/immense-spark-n-aura/ | 191 |
| 17 | kasamba-danielle | Danielle Psychic | https://www.kasamba.com/psychic/danielle-psychic/ | 191 |
| 18 | kasamba-truthful-visions | Truthful Visions | https://www.kasamba.com/psychic/truthful-visions/ | 191 |
| 19 | kasamba-supernormal-soul | Supernormal Soul | https://www.kasamba.com/psychic/supernormal-soul/ | 191 |
| 20 | kasamba-jenny | Advisor by Jenny | https://www.kasamba.com/psychic/advisor-by-jenny/ | 191 |

> 注：#16 Immense Spark 之前的 slug 是 `/immense-spark-n-au/`（已失效，重定向到平台页），官方 sitemap 确认现 slug 为 `immense-spark-n-aura`。

---

## 二、Purple Garden（20 条，全部有官方 URL，来自官方 sitemap）

| # | 我的 slug | 解读师 | 官方链接 | offer_id |
|---|----------|--------|---------|----------|
| 1 | truthful-love | Truthful love（#1 trending） | https://www.purplegarden.co/psychics/24002-truthful-love | 30 |
| 2 | niki-medium | Niki Medium | https://www.purplegarden.co/psychics/4512-niki-medium | 30 |
| 3 | quantum-drew | QuantumDrew | https://www.purplegarden.co/psychics/2876-quantumdrew | 30 |
| 4 | advisor-vanessa | Advisor Vanessa | https://www.purplegarden.co/psychics/1645-advisor-vanessa | 30 |
| 5 | psychic-jeanne | Psychicjeanne | https://www.purplegarden.co/psychics/1130-psychicjeanne | 30 |
| 6 | athina-mystic | Athina Mystic | https://www.purplegarden.co/psychics/10689-athina-mystic | 30 |
| 7 | satie-readings | Satie Readings | https://www.purplegarden.co/psychics/9789-satie-readings | 30 |
| 8 | fanny-dalfiume | Fanny Dalfiume | https://www.purplegarden.co/psychics/10632-fanny-dalfiume | 30 |
| 9 | ayla-love-resolution | Ayla | https://www.purplegarden.co/psychics/11861-ayla | 30 |
| 10 | tarot-withh-love | Tarot Withh Love | https://www.purplegarden.co/psychics/6877-tarot-withh-love | 30 |
| 11 | psychic-shirla | Psychic Shirla | https://www.purplegarden.co/psychics/8406-psychic-shirla | 30 |
| 12 | adam-africa | Adam Africa | https://www.purplegarden.co/psychics/5686-adam-africa | 30 |
| 13 | jackies-tea-tarot | Jackies Tea Tarot | https://www.purplegarden.co/psychics/3129-jackies-tea-tarot | 30 |
| 14 | lejla-kristal | Lejla Kristal | https://www.purplegarden.co/psychics/6414-lejla-kristal | 30 |
| 15 | nuwatarot | nuwatarot | https://www.purplegarden.co/psychics/14178-nuwatarot | 30 |
| 16 | empathic-intuitive-marcus | Marcus | https://www.purplegarden.co/psychics/2146-marcus-andy | 30 |
| 17 | psychic-medium-chloe | Chloe | https://www.purplegarden.co/psychics/1884-chloe-psychic-uk | 30 |
| 18 | tarot-by-elena | Elena | https://www.purplegarden.co/psychics/11714-psychic-elena | 30 |
| 19 | twin-flame-specialist-aria | Aria | https://www.purplegarden.co/psychics/2270-readings-by-aria | 30 |
| 20 | psychic-advisor-serena | Serena | https://www.purplegarden.co/psychics/12093-advisor-serena | 30 |

---

## 三、Keen（30 条：16 直接 URL + 14 待处理 → 现 23 可用 + 7 删除）

### 3A. 直接 URL（16 条）

| # | 我的 slug | 解读师 | 官方链接 | offer_id |
|---|----------|--------|---------|----------|
| 1 | chloe-has-your-love-insights | Chloe Has Your Love Insights | https://www.keen.com/love-relationships/chloe-has-your-love-insights/12440298 | 221 |
| 2 | dr-lisa-powerful-insights | Dr Lisa Powerful Insights | https://www.keen.com/love-relationships/dr-lisa-powerful-insights/9814045 | 221 |
| 3 | eli-casey | Eli Casey | https://www.keen.com/love-relationships/eli-casey/1230903 | 221 |
| 4 | gabriel-the-messenger | Gabriel the Messenger | https://www.keen.com/love-relationships/gabriel-the-messenger/8418200 | 221 |
| 5 | heather-ashera | Heather Ashera | https://www.keen.com/life-path-advice/heather-ashera/7480845 | 221 |
| 6 | jeanne-clock | Jeanne Clock | https://www.keen.com/love-relationships/jeanne-clock/7463353 | 221 |
| 7 | ladyfontaine | LadyFontaine | https://www.keen.com/ladyfontaine | 221 |
| 8 | lollie-ext-5555 | Lollie | https://www.keen.com/lollie-ext-5555 | 221 |
| 9 | mike-pace | Mike Pace | https://www.keen.com/psychic-readings/mike-pace/1107663 | 221 |
| 10 | psychic-jane-just-knows | Psychic Jane Just Knows | https://www.keen.com/love-relationships/psychic-jane-just-knows/6859792 | 221 |
| 11 | readings-by-ruth | Readings by Ruth | https://www.keen.com/psychic-readings/readings-by-ruth/12445159 | 221 |
| 12 | serenity-stone | Serenity Stone | https://www.keen.com/psychic-mediums/serenity-stone/294696 | 221 |
| 13 | that-magic-man | That Magic Man | https://www.keen.com/psychic-readings/that-magic-man/10739866 | 221 |
| 14 | allmyangels | All My Angels | https://www.keen.com/pet-psychics/allmyangels/5359594 | 221 |
| 15 | master-psychic-dev | Master Psychic Dev | http://www.keen.com/love-relationships/master-psychic-dev/10669544 | 221 |
| 16 | intuitive-jade | Intuitive Jade（Keen 真实 slug: isis-jade） | http://www.keen.com/psychic-readings/life-questions/isis-jade/6292704 | 221 |

### 3B. 待处理项处理结果（原 14 条 → 7 已找到官方 URL + 7 已删除文章）

> 核查方法：WebFetch 直连 Keen 个人页（沙箱 curl 被 Cloudflare 403，但 WebFetch 后端 IP 可读 Keen）+ 多次 web search + Keen 分类列表页提取档案链接。
> 下方「已找到 URL」的 7 位可直接拿去 TUNE 后台转深层链接；「已删除文章」的 7 位若你日后从 Keen 后台拿到规范 URL，可重新写回并 rebuild。

**✅ 已找到官方 URL（7 条，文章保留）**

| # | 我的 slug | 官方链接 | offer_id |
|---|----------|---------|----------|
| 1 | alice-runyon | https://www.keen.com/love-relationships/alice-runyon/12446294 | 221 |
| 2 | chosenone77 | https://www.keen.com/love-relationships/chosenone77/6682497 | 221 |
| 3 | clairvoyant-nicky-power | https://www.keen.com/psychic-readings/clairvoyant-nicky-power/5029675 | 221 |
| 4 | dar66 | https://www.keen.com/life-path-advice/dar66/9015981 | 221 |
| 5 | lady-india | https://www.keen.com/love-relationships/lady-india/3324823 | 221 |
| 6 | master-psychic-adam-stone | https://www.keen.com/psychic-mediums/master-psychic-adam-stone/11362802 | 221 |
| 7 | tammy-the-voice-reader | https://www.keen.com/love-relationships/mistress-voice-reader/5177751 | 221 |

> 注：clairvoyant-nicky-power 公开列表曾显示 61,424 readings，但规范个人页 5029675 显示 19,938 readings（疑似 Keen 有两个同名档案或历史 ID）；该 URL 经验证为真实可打开的个人页，已采用。

**❌ 已删除文章（7 条，官方 URL 公开渠道无法找到）**

| # | 我的 slug | 原因 |
|---|----------|------|
| 1 | dzigns | 仅旧 URL dream-interpretation/dzigns/5303588（92 readings），活跃档案（18,332）无规范 URL |
| 2 | mikes-love-and-light | 列表显示 46,504 readings，但无带数字 ID 的规范个人页 URL |
| 3 | silver-fairy-hawk | 仅 Keen 社区博客；3118146 重定向到 Life Path 分类页，非个人页 |
| 4 | storm-cestavani | 仅个人站 stormcestavani.com / stormonkeen.com，无 Keen 规范个人页 URL |
| 5 | susan-100 | 列表显示 50,082 readings，但无带数字 ID 的规范个人页 URL |
| 6 | the-6th-sense | 列表显示 119,578 readings，但无带数字 ID 的规范个人页 URL |
| 7 | true-love-advisor | R-A-I-N-A-G-A-D-E/3835541 重定向到 Love 分类列表页，非个人页 |

### ⚠️ Keen 身份核对（别搞混）
- **tammy-the-voice-reader**（4.98★，handle "tammy the voice reader"）≠ Keen 的 "Tammy Rogers"。
- **true-love-advisor**（4.81★，handle "true love advisor"）≠ Keen 的 "The True Love Advisor"（slug `the-twin-flame-advisor`）。
- **mikes-love-and-light**（4.63★）≠ Keen 的 "Mike Pace"（4.95★）。
- **serenity-stone**（4.66★）即真实 `serenity-stone/294696`，≠ Keen 的 "Sweet Serenity"。

---

## 你回传格式建议
直接发 `我的 slug → 深层链接` 即可，例如：
```
kasamba-master-enigma → https://bargestech.go2cloud.org/aff_c?offer_id=191&aff_id=2326&url=https%3A%2F%2Fwww.kasamba.com%2Fpsychic%2Fmaster-enigma%2F
```
我收到后批量替换 `src/data/affiliateLinks.ts` 里对应的 `kasamba-*` / `purple-garden-*` / `keen-*` 条目并 rebuild。
