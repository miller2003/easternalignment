# Eastern Alignment 全站富媒体（Rich Results）顶级实施方案（2026 版）
> 生成时间：2026-08-25（修订版，依据 2026-08 最新 Google 富媒体存活状态）
> 目标：修复当前评分/schema 报错，让 Google 在 SERP 中展示**站点名称、星级评分、面包屑、产品信息**等当前仍真实渲染的富媒体，系统性提升 CTR。

---

## 〇、2026 关键前提：哪些富媒体"活着"，哪些已经死了

你在最新调研里给出的结论完全正确，多源交叉验证一致（seorunnerz / patrickstox / crawlraven / alphonsolabs）：

| 富媒体类型 | 2026 状态 | 对本站影响 |
|-----------|----------|-----------|
| **FAQ** | **已死**（2026-05-07 全站下线，含 gov/health） | 不再产生 SERP 折叠。但 FAQ **标记本身不要删**——Google 仍把它当内容理解信号，Bing 与 AI Overviews/LLM 仍会读。 |
| **HowTo** | **已死**（2023-09 桌面端下线） | 不再产生步骤折叠。标记可保留作无害信号。 |
| **Sitelinks Searchbox** | **已死**（2024-11 全球下线） | 站内搜索框富媒体彻底消失。**不要再加 `SearchAction`**。 |
| Review / AggregateRating | **存活** | 核心，本站主战场。 |
| Product + Offer | **存活** | 平台页价格/库存展示。 |
| Breadcrumb | **存活** | 全站可用，URL 处显示路径。 |
| Article / NewsArticle | **存活** | 指南/评测头图、作者、日期。 |
| Organization / LocalBusiness | **存活** | 知识面板 + 站点名称信号。 |
| Video | **存活** | 有视频才用。 |
| Software App (SoftwareApplication) | **存活** | 工具/计算器页可用（需取消 noindex）。 |
| Image Metadata / Speakable / Course / Q&A / Dataset 等 | **存活**（细分场景） | 按需求启用。 |

> **结论**：旧的"顶级富媒体策略"里 FAQ / HowTo / 站内搜索框这三项在 2026 年**不产生任何 SERP 展示效果**，已从执行清单移除。但 FAQ/HowTo 的 **JSON-LD 标记保留不删**（对 Bing、AI 摘要、Google 内容理解仍有用，且删除无收益）。

---

## 一、审计结论：当前问题与机会

### 1.1 你截图里看到的两个现象，根因是什么？

| 现象 | 根因 | 影响 |
|------|------|------|
| SERP 里站点名显示为 `easternalignment.com` 而不是 **Eastern Alignment** | 英文站向 Google 发送的品牌/站点名称信号太弱：① `WebSite.name` 可能缺失或不稳定；② 缺少 `og:site_name`；③ 缺少 `<meta name="application-name">`；④ `Organization` 与 `WebSite` 没有 `@id` 强关联；⑤ favicon 信号可能不规范。注意：**站点名称（Site Name）是 2026 年仍存活的功能，与已死的 Sitelinks Searchbox 是两回事**，本方案专门修复它。 | 品牌词不突出，SERP 可信度与 CTR 受损。 |
| 没有任何富媒体（无星级、无面包屑） | ① `Review` schema 的 `itemReviewed` 嵌套 `AggregateRating` 存在类型/字段冲突，Google 报"种类问题/Unsupported type"并拒绝渲染——**这正是你之前一直看到的报错**；② 英文站 `BreadcrumbList` 注入不完整；③ 平台页未用 `Product + Offer`；④ 工具页 `noindex` 导致 `SoftwareApplication` 无效。 | 同一排名位置损失大量视觉吸引力。 |

### 1.2 当前代码层面的具体问题

1. **BaseLayout.astro（英文全局布局）**
   - `WebSite` schema 可能缺 `@id` 与 `Organization` 关联；缺 `og:site_name`、`<meta application-name>`。
   - `Organization.logo` 是字符串，不是带 `width/height` 的 `ImageObject`。
   - 没有 `sameAs` 把品牌实体与社交/官网关联。

2. **ReviewLayout.astro（平台/读者评测页）** —— **这是"种类问题"报错的根源**
   - `itemReviewed` 用 `Product` 但嵌套 `AggregateRating`，且 `itemReviewed.url` 在部分场景是 `/go/kasamba/` 联盟门控链接（非被评价实体 canonical URL），易被 Google 判定为 self-serving / 类型不匹配。
   - `AggregateRating` 与 `Review.reviewRating` 同时存在，触发类型冲突。
   - `Product` 缺 `offers`、`brand` 等字段，触发"类型不完整"警告。

3. **ComparisonLayout.astro（对比页）**
   - 使用 `@graph` + `ItemList`，`Product.aggregateRating` 同样面临类型风险。

4. **ArticleLayout.astro（指南页）**
   - 只有基础 `Article`，缺 `wordCount`、`dateModified`、`author` 头像等增强字段。

5. **FAQ.astro / EsFAQ.astro** —— **保留标记，不追求富媒体**
   - 继续输出 `FAQPage` JSON-LD（对 Bing / AI 有用，无害），但**不要期望 SERP 折叠**。
   - 仅做正确性清洗：`acceptedAnswer.text` 里的 HTML 标签在 Schema Validator 会警告，建议 `stripHtml` 纯文本化（不影响 Google，但保持整洁）。

6. **工具页** `zodiac-compatibility-calculator.astro`：`noindex={true}` → `SoftwareApplication` 看不到，富媒体为空。

7. **西班牙语站**：`EsBaseLayout` 比英文站完善（有 `ImageObject` logo、breadcrumb），但 `EsReviewLayout` 同样缺 `AggregateRating` 安全写法。

---

## 二、2026 可做的富媒体类型全景（按商业价值 + 存活状态排序）

> 只列**当前在 Google SERP 真实渲染**且**对本站适用**的类型。

| 优先级 | 富媒体类型 | 适用页面 | 预期 SERP 效果 | 实施难度 |
|--------|-----------|----------|----------------|----------|
| **P0** | **站点名称（Site Name）** | 全站 | SERP 顶部显示"Eastern Alignment"而非域名 | 低 |
| **P0** | **Review Snippet（星级）** | 平台 hub、读者评测、对比页 | 标题下方星级+评分 | 中 |
| **P0** | **Breadcrumb** | 所有页面 | URL 处显示路径而非纯网址 | 低 |
| **P1** | **Product + Offer（价格/库存）** | 平台 hub、对比页 | 价格、可用性、星级 | 中 |
| **P1** | **Article（作者/日期/头图）** | 所有 guides / reviews | 大图、作者、发布日期 | 低 |
| **P1** | **SoftwareApplication** | 工具页（先取消 noindex） | 工具名、评分 | 中 |
| **P2** | **Organization 知识面板** | 首页/about | 右侧品牌面板 | 中 |
| **P2** | **Image Metadata + og:image 标准化** | 全站 | 图片搜索/缩略图 | 中 |
| **P2** | **Video（VideoObject）** | 未来新增视频 | 视频缩略图/时长 | 中 |
| **P2** | **Speakable** | 指南/评测 | 语音助手引用 | 低 |

**已死、不纳入执行清单（标记保留不删）**：FAQPage、HowTo、Sitelinks Searchbox（SearchAction）。

---

## 三、核心修复策略：为什么评分报"种类问题"

### 3.1 问题本质
Google 对 `Review` snippet 的 `itemReviewed` 类型有**白名单**：`Book`、`Course`、`Event`、`HowTo`、`LocalBusiness`、`Movie`、`Product`、`Recipe`、`SoftwareApplication`。

当前实现把平台/读者都标记为 `Product` 并在 `Product` 里放 `AggregateRating`，技术上类型允许，但有三个致命问题：

1. **self-serving 嫌疑**：`itemReviewed.url` 指向 `/go/...` 联盟链接，Google 难以区分"评论"与"推广"。
2. **Product 字段不完整**：缺 `offers`、`brand`，触发"类型不完整"警告。
3. **AggregateRating 与 Review.reviewRating 并存**：单实体同时有 editorial rating 和 aggregate，Google 可能只取其一或判冲突——这就是"种类问题"报错的直接来源之一。

### 3.2 推荐解决方案（方案 A 为主、B 为辅）

- **平台 hub 页**：输出 `Product` + `AggregateRating`（无 `Review.reviewRating`），`reviewCount` = 该平台读者评测数（35/49/30）。
- **读者单页**：输出 `Review` + `reviewRating`，`itemReviewed` 为 `Product`，**不加 `AggregateRating`**，`reviewCount` 语义上为 1。
- 给 `Product` 补 `brand`（平台品牌）和 `offers`（价格区间）。
- `itemReviewed.url` 改为平台/读者**站内 canonical URL**（如 `/reviews/kasamba/`），绝不用 `/go/...` 联盟链接。

> 备选方案 B：hub 页纯 `Product + AggregateRating`（无 Review），读者单页纯 `Review + reviewRating`，类型职责更清晰。本方案以 A 为主。

---

## 四、分阶段实施计划

### 阶段一：P0 修复（第 1–2 周）——让基础富媒体先跑通

#### 4.1 统一全局 schema + 站点名称信号（BaseLayout.astro）
目标：Google 100% 识别站点名称为 **Eastern Alignment**。

1. `WebSite` 增加 `@id`（`#website`）、`name`、可选 `alternateName`，`publisher` 指向 Organization `@id`。**不**加 `potentialAction/SearchAction`（已死）。
2. `Organization` 增加 `@id`（`#organization`）、`sameAs`、`logo` 为带 `width/height` 的 `ImageObject`（logo 实际 1024×817）。
3. `<head>` 增加：
   - `<meta property="og:site_name" content="Eastern Alignment">`
   - `<meta name="application-name" content="Eastern Alignment">`
   - `<meta name="apple-mobile-web-app-title" content="Eastern Alignment">`
4. 确保 `<title>` 中英站以品牌名收尾（如 `Kasamba Review 2026 | Eastern Alignment`）。
5. 校验 `favicon.ico` / `icon` 规范（SERP 站点名左侧图标用的是 favicon，不是 Organization.logo）。
6. 新增统一 `breadcrumbSchema` 注入机制（参考西语站 `EsBaseLayout`）。

#### 4.2 修复 Review / Rating schema（ReviewLayout.astro）
目标：消除"种类问题"，让星级有机会显示。

1. 平台 hub：`Product` + `AggregateRating`（无 `Review.reviewRating`）。
2. 读者单页：`Review` + `reviewRating`，不加 `AggregateRating`。
3. 补 `brand` + `offers`（用 frontmatter 的 pricing 提取）。
4. `itemReviewed.url` 改为站内 canonical URL。

#### 4.3 FAQ 标记清洗（FAQ.astro）——保留标记，不追求富媒体
1. 继续输出 `FAQPage` JSON-LD（无害、助 Bing/AI）。
2. `acceptedAnswer.text` 用 `stripHtml` 纯文本化，消除 Schema Validator 警告。

#### 4.4 全站面包屑升级（Breadcrumb.astro + layouts）
1. `BreadcrumbList` 最后一项带上当前页 URL。
2. 所有 layout 把 `canonical` 传给 `Breadcrumb`。

### 阶段二：P1 扩展（第 3–4 周）——占据更多 SERP 空间

#### 4.5 Product + Offer（平台 hub / 对比页）
- 在 hub/对比页的 `Product` 补 `offers`（AggregateOffer 价格区间，USD）。
- 价格从 `$1.99/min to $30.00+/min` 类字符串提取 lowPrice/highPrice。

#### 4.6 工具页取消 noindex + SoftwareApplication
- 工具页改 `noindex={false}`（先确保内容厚实、有独特价值）。
- 输出 `SoftwareApplication`：`name`、`applicationCategory`、`operatingSystem`、`offers`、`aggregateRating`（如有）。
- `/tools/` 索引页用 `ItemList` / `SoftwareApplication` 列出所有工具。

#### 4.7 Article schema 增强（ArticleLayout.astro）
- 所有 `Article` / `Review` 增 `wordCount`（运行时统计正文词数）、`articleSection`、`dateModified`、`author` 头像、`publisher`。
- （可选）`speakable` 指向正文主要段落 CSS 选择器。

### 阶段三：P2 巩固（第 5–6 周）——品牌与长期资产

#### 4.8 Organization 知识面板
- 首页输出完整 `Organization` + `Person`（Sarah）关联图谱，`sameAs` 填真实社交/资料 URL。
- `/about/` 上传 Sarah 真实头像并在 `Person` 引用。
- 向 Wikidata 提交实体（若适用）。

#### 4.9 图片 / og 标准化
- 所有文章生成 1200×630 `og:image`；评测页生成专属 featured image。
- 输出 `ImageObject` schema 含 `width/height`。

#### 4.10 验证与监控闭环
- 每批修改后用 Rich Results Test 验证（注意：FAQ/HowTo/Sitelinks 已从该测试移除，不再出现在报告里，属正常）。
- GSC → 增强功能 → 观察错误下降趋势。

---

## 五、代码模板与修改清单

### 5.1 BaseLayout.astro 全局 schema（站点名称 + 组织，无 SearchAction）

```astro
const SITE_NAME = 'Eastern Alignment';
const SITE_URL  = 'https://easternalignment.com';
const canonical = canonicalUrl || new URL(Astro.url.pathname, SITE_URL).href;

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  "name": SITE_NAME,
  "alternateName": "EA",
  "url": SITE_URL,
  "description": "Honest, independent reviews and guidance for online psychic reading platforms. Tested by real users.",
  "inLanguage": "en-US",
  "publisher": { "@id": `${SITE_URL}/#organization` }
  // 注意：Sitelinks Searchbox 已于 2024-11 下线，不再加 potentialAction/SearchAction
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  "name": SITE_NAME,
  "url": SITE_URL,
  "logo": {
    "@type": "ImageObject",
    "@id": `${SITE_URL}/#logo`,
    "url": `${SITE_URL}/logo.jpg`,
    "contentUrl": `${SITE_URL}/logo.jpg`,
    "width": 1024,
    "height": 817,
    "caption": SITE_NAME
  },
  "image": { "@id": `${SITE_URL}/#logo` },
  "description": "Honest, independent reviews of online psychic reading platforms. Personally tested by real users.",
  "sameAs": [],
  "founder": {
    "@type": "Person",
    "@id": `${SITE_URL}/about/#author`,
    "name": "Sarah",
    "url": `${SITE_URL}/about/`
  }
};
```

`<head>` 增加：

```astro
<meta property="og:site_name" content={SITE_NAME} />
<meta name="application-name" content={SITE_NAME} />
<meta name="apple-mobile-web-app-title" content={SITE_NAME} />
```

### 5.2 ReviewLayout.astro 安全 Rating schema（hub vs 读者单页）

```astro
const isHub = !isReaderReview && reviewCount && reviewCount > 1;

const itemReviewed = {
  "@type": "Product",
  "@id": `${canonical}#product`,
  "name": readerLabel || platformName,
  "url": canonical,                              // 站内 canonical，绝不用 /go/ 联盟链接
  "image": absoluteAvatarUrl || ogImage || `${SITE_URL}/logo.jpg`,
  "description": description,
  "brand": { "@type": "Brand", "name": parentPlatformLabel || platformName },
  ...(frontmatter.pricing ? {
    "offers": {
      "@type": "AggregateOffer",
      "lowPrice": extractLowPrice(frontmatter.pricing),
      "highPrice": extractHighPrice(frontmatter.pricing),
      "priceCurrency": "USD"
    }
  } : {})
};

// hub 页：Product + AggregateRating（无 Review.reviewRating）
// 读者单页：Review + reviewRating（无 AggregateRating）
const schema = isHub
  ? {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": platformName,
      "image": ogImage || `${SITE_URL}/logo.jpg`,
      "brand": { "@type": "Brand", "name": platformName },
      "description": description,
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": rating,
        "bestRating": 5, "worstRating": 1,
        "reviewCount": reviewCount,
        "ratingCount": reviewCount
      },
      "review": readerReviews?.map(r => ({
        "@type": "Review",
        "author": { "@type": "Person", "name": r.author },
        "reviewRating": { "@type": "Rating", "ratingValue": r.rating, "bestRating": 5, "worstRating": 1 },
        "url": r.url
      }))
    }
  : {
      "@context": "https://schema.org",
      "@type": "Review",
      "headline": title,
      "description": description,
      "author": { "@type": "Person", "@id": `${SITE_URL}/about/#author`, "name": schemaAuthor || "Sarah", "url": `${SITE_URL}/about/` },
      "datePublished": schemaDatePublished || publishDate,
      ...(updatedDate ? { "dateModified": updatedDate } : {}),
      "reviewRating": { "@type": "Rating", "ratingValue": rating, "bestRating": 5, "worstRating": 1 },
      "itemReviewed": itemReviewed,
      "publisher": { "@type": "Organization", "@id": `${SITE_URL}/#organization`, "name": SITE_NAME, "url": SITE_URL, "logo": { "@id": `${SITE_URL}/#logo` } },
      "mainEntityOfPage": { "@type": "WebPage", "@id": canonical }
    };
```

> 需新增 `extractLowPrice` / `extractHighPrice`，从 `$1.99/min to $30.00+/min` 提取数字。

### 5.3 FAQ 标记（保留，仅清洗）

```ts
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
```

`FAQ.astro` 继续输出 `FAQPage`，但 `acceptedAnswer.text` 经 `stripHtml` 处理。**不期待 SERP 折叠**——它的价值在 Bing / AI Overviews / Google 内容理解。

### 5.4 Breadcrumb 升级（最后一项带当前页 URL）

```astro
const { items, canonicalUrl } = Astro.props;
const crumbs = [{ label: 'Home', href: '/' }, ...items];
const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": crumbs.map((item, index) => {
    const isLast = index === crumbs.length - 1;
    const itemUrl = isLast && canonicalUrl ? canonicalUrl
      : item.href ? `${SITE_URL}${item.href}` : undefined;
    return { "@type": "ListItem", "position": index + 1, "name": item.label, ...(itemUrl ? { "item": itemUrl } : {}) };
  })
};
```

### 5.5 西语站同步
- 把 `EsBaseLayout` 的 logo `ImageObject`、`og:site_name` 等优化同步回 `BaseLayout`。
- `EsReviewLayout` 采用与英文站一致的 `isHub` 逻辑。
- 西语站若已有 `SearchAction` 标记——**建议移除**（Sitelinks Searchbox 已死，无收益）。

---

## 六、验证清单（每轮修改后必做）

### 6.1 线上验证工具
1. Google Rich Results Test：https://search.google.com/test/rich-results （注：2026-06 起**已不再支持 FAQ/HowTo/Sitelinks**，这些类型从测试与 GSC 报告中消失属正常）
2. Schema Markup Validator：https://validator.schema.org/
3. GSC → 增强功能 → 报告

### 6.2 必测页面
- [ ] 首页 `https://easternalignment.com/`
- [ ] 平台 hub：`/reviews/kasamba/`、`/reviews/keen/`、`/reviews/purple-garden/`
- [ ] 读者页：`/reviews/keen/mystic-raj-on-keen-review-2026/` 等高流量页
- [ ] Guide：`/guides/how-to-prepare-for-psychic-reading/`、`/guides/questions-to-ask-a-psychic/`
- [ ] 对比页：`/comparisons/kasamba-vs-keen/`、`/comparisons/keen-vs-purple-garden-accuracy-2026/`
- [ ] 工具页：`/tools/zodiac-compatibility-calculator/`

### 6.3 每个页面检查项
- [ ] 无"种类问题/Unsupported type/Invalid type"错误（Review 修复核心）。
- [ ] `WebSite` / `Organization` 100% 通过，含 `@id` 与 `ImageObject` logo。
- [ ] `BreadcrumbList` 最后一项有 URL。
- [ ] `Review` / `AggregateRating` 的 `itemReviewed.url` 为站内 canonical（非 /go/）。
- [ ] `Product` 含 `brand` + `offers`（hub 页）。
- [ ] `og:site_name` 与 `<title>` 品牌名一致。
- [ ] `FAQPage` 标记仍输出但**不期待** SERP 折叠。

### 6.4 GSC 后续监控
- 改完 3–5 天观察 GSC"增强功能"错误数下降。
- 用 URL Inspection 请求重新索引关键页面。
- 站点名称无手动设置入口时，靠稳定的 `og:site_name` + `WebSite.name` + `<title>` 信号引导 Google。

---

## 七、预期效果与 CTR 估算（仅基于存活类型）

| 富媒体元素 | 对 CTR 的行业提升 | 对本站适用性 |
|-----------|-------------------|-------------|
| Review 星级 | **+35–50%**（SERP 最醒目元素） | 平台 hub / 读者页 |
| 站点名称显示品牌 | +5–10%（品牌认知） | 全站 |
| Product 价格/库存 | +10–20% | 平台 hub / 对比页 |
| Breadcrumb | +5–10%（URL 可读性） | 全站 |
| Article 头图/作者 | +5–10% | guides |

> 叠加估算：若首页零点击词（如 `keen free 3 minutes` 排名 7–8）获得星级 + breadcrumb + 站点名，CTR 可能从 ~2% 升至 ~4–5%，排名不变下直接翻倍。结合 SEO 战略报告"CTR×2.5 × 排名×3 × 内容面×4"模型，P0 富媒体修复即"CTR×2.5"核心技术动作。

> **已剔除的旧估算**：FAQ 折叠（+10–15%）、HowTo 折叠（+10–20%）、Sitelinks Searchbox（+5–8%）——三者 2026 年已无 SERP 展示，不再计入。

---

## 八、风险与注意事项

1. **Google 不保证展示富媒体**：schema 正确只是"有资格"，是否展示还看网站质量、E-E-A-T、搜索意图。先保证技术正确，再叠内容与外链。
2. **避免 self-serving review 误判**：
   - 不在 `/go/...` 联盟链接上挂 `AggregateRating`；
   - 不伪造星级；`reviewCount` 必须为真实评测数。
3. **死类型标记保留不删**：FAQ/HowTo JSON-LD 继续存在，无害且助 Bing/AI；只是不再追求 SERP 折叠。
4. **工具页取消 noindex 的前提**：确保内容厚实、有独特价值，避免被判定 thin/duplicate。
5. **构建后必须重新验证**：当前 `dist/` 是旧产物（如 `/reviews/kasamba/index.html` 的 reviewRating 仍为旧值），需本机构建部署后再验证。

---

## 九、下一步行动建议

1. **本周内**：按 5.1 改 `BaseLayout.astro`——修站点名称（`og:site_name` + `WebSite.name` + meta + favicon 校验）。
2. **本周内**：按 5.2 改 `ReviewLayout.astro`——消除评分"种类问题"报错。
3. **下周**：按 5.3 清洗 FAQ，按 5.4 升级 `Breadcrumb.astro`。
4. **第 3 周**：平台/对比页补 `Product + Offer`；guides 增 `Article` 增强字段。
5. **第 4 周**：评估工具页取消 noindex，上 `SoftwareApplication`。
6. **持续**：每批上线用 Rich Results Test + GSC 验证，建立"上线前 schema 验证"门禁。

---

## 附录：参考资源
- Google Review Snippet：https://developers.google.com/search/docs/appearance/structured-data/review-snippet
- Google Site Name：https://developers.google.com/search/docs/appearance/site-names
- 2026 存活类型综述：https://seorunnerz.com/rich-results-types-whats-actually-live-in-google-search-2026
- 弃用时间线（FAQ/HowTo/Sitelinks）：https://patrickstox.com/technical-seo/on-page/structured-data/rich-results
- FAQ 下线说明（2026-05-07）：https://crawlraven.com/blog/google-faq-rich-results-deprecated-may-2026
- Schema.org Product：https://schema.org/Product

---

## 执行日志（2026-08-25 批次）

> 用户指示：**保留前序任务已优化的部分（title 逻辑、og:site_name、AggregateRating 上线），不再改动**；本次仅解锁「其他能做的富媒体」，即方案里除 Review 星级结构修正外的所有增量项。

### 已落地改动（全部为增量 / 修正死类型，不触碰前序优化）

| # | 文件 | 改动 | 类型 |
|---|------|------|------|
| 1 | `src/lib/toolSchema.ts` | **新建** `buildWebApplication()` helper，把每个工具页的 `WebApplication` 实体化到站点图谱（`#organization`/`#sarah` 引用）+ 含 `offers`/`featureList`/`browserRequirements` | 新增 |
| 2 | `src/layouts/BaseLayout.astro` | 站点名实体图谱：`WebSite`/`Organization`/`Person` 加 `@id` 互相引用；`Organization.logo` 升级为 `ImageObject`（1024×817，真实尺寸）；加 `<meta application-name>`；`publisher`/`worksFor` 实体关联 | 增量 |
| 3 | `src/layouts/EsBaseLayout.astro` | **移除死类型** `SearchAction`（Sitelinks Searchbox 2024 已死）；`logo` 尺寸由错误 200×200 修正为 1024×817；加 `@id` 关联与 `application-name` meta | 修正+清理 |
| 4 | `src/layouts/ArticleLayout.astro` | `Article` schema 顶级增强：`@id`、实体化 `author`/`publisher`（`#sarah`/`#organization`）、`articleSection`、`mainEntityOfPage`、`speakable`（SpeakableSpecification → 语音助手富媒体） | 增量 |
| 5 | `src/components/Breadcrumb.astro` | 末项（当前页）补齐 `item` URL（原先缺 `item`/`href`，ListItem 不完整） | 修正 |
| 6 | `src/pages/tools/*.astro`（7 个工具页 + index） | 改用 `buildWebApplication` helper；`noindex` 翻转（`true`→`false`）以解锁 SoftwareApplication 富媒体 | 解锁 |
| 7 | `astro.config.mjs` | sitemap 生成移除 `/tools/` 排除项，工具页进入索引 | 解锁 |

### 已验证（本地 Node 重建图谱）

- 6 个顶层 schema 均序列化为合法 JSON ✅
- `@id` 实体图谱自洽（`#organization`/`#sarah`/`#logo` 在所有引用处均可解析）✅
- Breadcrumb 末项已带 URL ✅
- `WebApplication` 节点正确归属 `@graph` 的 `@context`（自身无 `@context`）✅
- 全站无残留 `SearchAction` 标记（仅注释提及）✅

### 未做（按用户指示保留前序优化，待 GSC 复核后再定）

- ❌ `ReviewLayout.astro` 的 `itemReviewed.url` = `/go/` 联盟链接问题（前序已上线 AggregateRating，本次不动）
- ❌ hub vs reader 页 AggregateRating 结构拆分（前序已上线，本次不动）
- ❌ 首页 title `length>42` 去品牌后缀逻辑（前序优化，保留）

### 后续动作（本机执行，沙箱无法跑真实 URL 测试）

1. `npm run build` + 部署（沙箱 build 卡死，必须用户本机）
2. 部署后用 **Rich Results Test** 测：首页、kasamba hub、1 个 reader 页、1 个 guides、1 个工具页（如 `/tools/moon-phase/`）
3. GSC → 增强功能 → 确认 Site Name 显示「Eastern Alignment」而非域名；tools 页出现 SoftwareApplication 报告
4. 观察 2–4 周：SERP 星级、站点名、工具页富媒体是否真实渲染
5. 若星级仍未出 → 回到前序保留项（ReviewLayout 结构），届时再按方案 §5.2 修正

### 仍待补（P2 长期资产，本次未触及）

- `Organization.sameAs`（社交主页）— 代码已留 TODO，填真实 URL 可解锁 Knowledge Panel
- Image Metadata / VideoObject / 站点 Image sitemap（需真实图片/视频资产）
- 西语站 `es/psiquicos-web` 空 hub 仍是 noindex（前序决策，保留）
