# 平台图标修复备忘 · 2026-08-26

## 问题
部署后多个图标在浏览器里显示为白色方块：
- 所有 CTA 组件里的平台 logo（EndCTA / StickyCTA / ScorePanel / SidebarDealCard / TopOfferBar / LeftSidebar / EsLeftSidebar）
- 路由自动注入到文章内的 CTA（ReaderEndCTA + CTABox + InlineCta）继承同一实现 →所以文章内的"图标"也是空白

本地图标（`/logo.jpg`、`/sarah-avatar.jpg`、`/avatars/*`）显示正常。

## 根因
唯一的外部图片依赖是 **Google 的 `www.google.com/s2/favicons` 服务**（出现在 dist/ 的 198 个 HTML 里）。
- GFW 直接拦截 `www.google.com` → 在中国大陆任何浏览器里这些图标都是 0 字节响应 → CSS `.end-cta__logo { background:#fff; padding:2px }` 渲染成白色圆角方块（这就是用户看到的"白色图标"）。
- 即使能访问，s2 拿到的也是 16×16 ICO 被拉伸到 24–128px 显示槽位 → 模糊的代价。
- 合规问题：热链 Google 把访客 IP 暴露给第三方（GDPR 风险）。
- 可用性问题：Google 单点故障 = 全站品牌图标雪崩。

## 修复

### 1. 资源（已部署到 `public/logos/`）
| 平台 | 文件 | 尺寸 | 来源 |
| --- | --- | --- | --- |
| Keen | `keen.png` | 48×48 | Google `t1.gstatic.com/faviconV2?client=SOCIAL&...&url=http://keen.com&size=128` —— **官方 Social Graph favicon**，是用户截图里的红字 KEEN 白底 + 米色渐变版本（2026-08-26 用户指认的"原版"图标）|
| Kasamba | `kasamba.png` | 256×256 | App Store 官方 `Purple211/12043d01...` 图标 |
| Purple Garden | `purple-garden.png` | 256×256 | App Store 官方 `Purple221/3bb6cd9e...` 图标（Barges 发行，与联盟对接方一致）|
| Psíquicos Web | `psiquicos-web.png` | 200×200 | DDG `icons.duckduckgo.com/ip3/psiquicos.net.ico`（无 iOS 应用，回退到这个）|

四角像素已验证无黑角（Keen=全出血红色；Kasamba/PG=白底；Psíquicos=带透明圆角的 RGBA）。

### 2. 源码变更
| 文件 | 改动 |
| --- | --- |
| `src/lib/offers.ts` | `platformLogo()` 改为 `/logos/${key}.png`，移除 PLATFORM_OFFERS 中已死的 `faviconDomain` 字段；`size` 参数保留以兼容调用方 |
| `src/components/LeftSidebar.astro` | 第 79 行 `src` 改用 `platformLogo(card.key)`；移除本地 `DealCardData` 接口与三张卡里的 `faviconDomain` 字段 |
| `src/components/es/EsLeftSidebar.astro` | 第 15、39 行两处硬编码 URL → `/logos/psiquicos-web.png` 和 `/logos/purple-garden.png` |

### 4. 验收清单（重建+部署后请过一遍）
- [ ] `npm run build` 无报错（本机执行；沙箱构建会卡死）
- [ ] 首页、任一 reader review、任一 comparison、任一 guide 的 EndCTA 三张卡均显示彩色 logo（不再白方块）
- [ ] StickyCTA 滚动到中段出现：三种 logo + 名称 + 优惠文案完整
- [ ] 左侧栏 1100px 以上时三个 deal-card 的 logo 正常显示
- [ ] ES 站 `/es/resenas/psiquicos-web/` 左侧栏两个卡显示彩色 logo
- [ ] dist/ 中已无 `google.com/s2/favicons` 字符串：`grep -r "google.com/s2" dist/ | wc -l` 应为 0
- [ ] `curl -sI https://easternalignment.com/logos/keen.png` 应 200

### 5. 验证脚本
```bash
# 确认源码已无 google s2 引用
grep -rE "google\.com|s2/favicons|faviconDomain" src/ --include="*.astro" --include="*.ts"
# 确认新资源就位
ls -la public/logos/
```