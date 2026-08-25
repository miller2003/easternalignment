# Eastern Alignment 全站富媒体（Rich Results）顶级实施方案
> 生成时间：2026-08-25  
> 目标：修复当前评分/schema 报错，让 Google 在 SERP 中展示站点名称、星级、FAQ 折叠、面包屑、站内搜索框等富媒体元素，系统性提升 CTR。

---

## 一、审计结论：当前问题与机会

### 1.1 你截图里看到的两个现象，根因是什么？

| 现象 | 根因 | 影响 |
|------|------|------|
| 搜索结果里站点名显示为 `easternalignment.com` 而不是 **Eastern Alignment** | 英文站向 Google 发送的站点名称信号太弱：① `WebSite` schema 没有 `@id` 与 `Organization` 强关联；② `Organization.logo` 只是字符串 URL，没有 `ImageObject` + 尺寸；③ 没有 `<meta name="application-name">` / `apple-mobile-web-app-title` 等 HTML 信号；④ 没有主动向 GSC 提交站点名称偏好。 | 品牌词不突出，SERP 可信度下降，CTR 受损。 |
| 没有任何富媒体（无星级、无 FAQ 折叠、无面包屑、无搜索框） | ① `Review` schema 的 `itemReviewed` 嵌套 `AggregateRating` 存在类型/字段冲突，导致 Google 报“种类问题/Unsupported type”并拒绝渲染；② 英文站缺少 `BreadcrumbList`、`SearchAction`、`HowTo` 等关键 schema；③ 工具页目前 `noindex`，`WebApplication` schema 无法进入富媒体；④ 很多 guide 页具备教程属性但未标记 `HowTo`。 | 同一排名位置损失 30–100% 的视觉吸引力。 |

### 1.2 当前代码层面的具体问题

1. **BaseLayout.astro（英文全局布局）**
   - `WebSite` schema 没有 `@id`，没有 `potentialAction`（站内搜索框）。
   - `Organization.logo` 是字符串，不是 `ImageObject`（Google 建议用 `ImageObject` 并含 `width/height`）。
   - 没有 `sameAs` 把品牌实体和官网、社交资料关联。
   - 没有 breadcrumb schema 注入机制，面包屑纯靠 `Breadcrumb.astro` 组件局部输出。

2. **ReviewLayout.astro（平台/读者评测页）**
   - `itemReviewed` 用 `Product`，但同时又放 `AggregateRating`，Google 对非电商第三方平台的 `Product + AggregateRating` 审查严格，易被判定为“self-serving review”或类型不匹配。
   - `aggregateRating.reviewCount` 在读者页为 `1`，数值上合理，但 `AggregateRating` 与 `Review.reviewRating` 同时存在，容易触发类型冲突。
   - `itemReviewed.url` 在部分场景是 `/go/kasamba/` 这种联盟门控链接，非被评价实体自身的 canonical URL，进一步加剧 Google 的“非官方评价”判断。

3. **ComparisonLayout.astro（对比页）**
   - 使用了 `@graph` + `ItemList`，但 `ItemList` 里的 `Product.aggregateRating` 同样面临类型风险。
   - 没有 `ComparisonTable` 或 `HowTo` schema，对比页的富媒体价值被浪费。

4. **ArticleLayout.astro（指南页）**
   - 只有基础 `Article` schema，缺少 `wordCount`、`articleSection`、`speakable`、`dateModified` 等增强字段。
   - 具备教程步骤的 guide（如“如何准备第一次通灵阅读”）没有 `HowTo` schema，错失 accordion 展示。

5. **FAQ.astro / EsFAQ.astro**
   - `acceptedAnswer.text` 里可能包含 HTML（如 `<a>`、`"`），虽然 schema 允许 `Text` 类型，但 Google Rich Results Test 会警告 HTML 标签，建议输出纯文本或先用 `stripHtml` 处理。

6. **工具页**
   - `zodiac-compatibility-calculator.astro` 等工具页目前 `noindex={true}`，导致 `WebApplication` schema 完全无法被 Google 看到，富媒体自然为空。

7. **西班牙语站**
   - `EsBaseLayout.astro` 已经比英文站完善：有 `SearchAction`、`ImageObject` logo、breadcrumb schema。但 `EsReviewLayout` 同样缺少 `AggregateRating` 的安全写法，且未与英文站策略对齐。

---

## 二、可做的富媒体类型全景（按商业价值排序）

| 优先级 | 富媒体类型 | 适用页面 | 预期 SERP 效果 | 实施难度 |
|--------|-----------|----------|----------------|----------|
| P0 | **站点名称（Site Name）** | 全站 | 搜索结果顶部显示“Eastern Alignment”而非域名 | 低 |
| P0 | **Review Snippet（星级）** | 平台 hub、读者评测、对比页 | 标题下方出现星级和评分 | 中 |
| P0 | **FAQ Rich Result** | 所有含 FAQ 的页面 | FAQ 折叠、占据更多垂直空间 | 低 |
| P0 | **Breadcrumb** | 所有页面 | URL 上方出现面包屑导航 | 低 |
| P1 | **Sitelinks Searchbox** | 首页、平台 hub | 站内搜索框直接出现在 SERP | 低 |
| P1 | **HowTo / Carousel** | 教程类 guides | 步骤折叠或 carousel | 中 |
| P1 | **Article（含作者、日期、图片）** | 所有 guides / reviews | 大图片、作者头像、发布日期 | 低 |
| P1 | **WebApplication** | 工具页（需先取消 noindex） | 工具名称、评分、价格 | 中 |
| P2 | **ImageObject + 图片站点地图** | 全站 | 图片搜索流量、SERP 图片缩略图 | 中 |
| P2 | **Speakable** | 指南/评测正文 | 语音助手引用 | 低 |
| P2 | **Organization Knowledge Panel** | 首页/about | 右侧知识面板 | 中 |
| P3 | **VideoObject** | 未来新增视频内容 | 视频缩略图 | 中 |

---

## 三、核心修复策略：为什么你之前的评分报“种类问题”

### 3.1 问题本质
Google 对 `Review` snippet 的 `itemReviewed` 类型有**白名单**，只支持：`Book`、`Course`、`Event`、`HowTo`、`LocalBusiness`、`Movie`、`Product`、`Recipe`、`SoftwareApplication`。

你现在的实现把平台（Kasamba / Keen / Purple Garden）和读者都标记为 `Product`，并在 `Product` 里放 `AggregateRating`。这在技术类型上是允许的，但存在三个致命问题：

1. **self-serving 嫌疑**：Google 2024 年以来严厉打击“给自己的产品打星”。虽然 Eastern Alignment 是第三方评论站，但 `itemReviewed.url` 指向 `/go/...` 联盟链接，会让 Google 难以区分“评论”和“推广”。
2. **Product 字段不完整**：Google 要求 `Product` 至少有 `name` + `review` 或 `aggregateRating` + `offers`。你缺少 `offers`、`sku`、`brand` 等字段，触发“种类/类型不完整”警告。
3. **AggregateRating 与 Review.reviewRating 并存**：一个实体上同时出现 editorial `Review.rating` 和 `AggregateRating`，Google 可能只取一个或判定数据冲突。

### 3.2 推荐解决方案

**方案 A（推荐）：把平台/读者标记为 `Service` + `Review`，去掉 `AggregateRating`，改用 `Review.reviewRating`  alone**

- `Service` 是 schema.org 合法类型，虽然 Google Review Snippet 白名单里没有 `Service`，但 `Product` 在白名单里。
- 因此更稳妥的是：**保留 `Product`，但把 `AggregateRating` 从 `Product` 里移除，只保留 `Review.reviewRating`**。
- 同时给 `Product` 补上 `offers`（价格区间）和 `brand`（平台品牌），让它看起来更像一个可评价的产品/服务实体。
- 平台 hub 页保留 `AggregateRating`（因为那里确实聚合了多篇读者评测），但 reader 单页只保留 `Review.reviewRating`。

**方案 B（备选）：把平台 hub 的聚合评分改成纯 `AggregateRating` schema，不包 `Review`**

- 对平台 hub 页单独输出 `Product` + `AggregateRating`，不输出 `Review`。
- 对读者单页只输出 `Review` + `reviewRating`。
- 这样类型职责清晰，避免冲突。

**方案 C（激进但 CTR 最高）：使用 `LocalBusiness` / `Organization` 作为被评价实体**

- 把每个平台视为 `LocalBusiness`（实际上是在线服务，类型不完全匹配），或 `Organization`。
- 但 `Organization` 不在 Review Snippet 白名单，所以不建议。
- 如果走这条路，需要给 `LocalBusiness` 加 `priceRange`、`telephone`、`address` 等字段，成本较高。

**本方案采用方案 A 为主、方案 B 为辅。**

---

## 四、分阶段实施计划

### 阶段一：P0 修复（第 1–2 周）——让基础富媒体先跑通

#### 4.1 统一全局 schema（BaseLayout.astro）

目标：让 Google 100% 识别站点名称为 **Eastern Alignment**。

需要修改：
1. `Organization` schema 增加 `@id`、`sameAs`、完整 `logo` ImageObject。
2. `WebSite` schema 增加 `@id`、`publisher`（指向 Organization @id）、`potentialAction`（SearchAction）。
3. `<head>` 增加 `<meta name="application-name" content="Eastern Alignment">`。
4. 新增统一的 `breadcrumbSchema` 注入机制（参考西语站 `EsBaseLayout`）。

#### 4.2 修复 Review / Rating schema（ReviewLayout.astro）

目标：消除“种类问题”报错，让星级有机会显示。

需要修改：
1. 平台 hub 页：输出 `Product` + `AggregateRating`（无 `Review.reviewRating`）。
2. 读者单页：输出 `Review` + `reviewRating`，`itemReviewed` 为 `Product`，但**不加 `AggregateRating`**。
3. 给 `Product` 补上 `brand` 和 `offers`（用 frontmatter 的 pricing）。
4. `itemReviewed.url` 改为平台/读者的 canonical 站内 URL（如 `/reviews/kasamba/`），而不是 `/go/...` 联盟链接。

#### 4.3 FAQ schema 文本清洗（FAQ.astro）

目标：消除 Rich Results Test 里的 HTML 标签警告。

需要修改：
1. 在生成 `acceptedAnswer.text` 前，去除 HTML 标签（保留纯文本）。
2. 或使用 `stripHtml` 工具函数。

#### 4.4 全站面包屑升级（Breadcrumb.astro + layouts）

目标：每个页面都有合法的 `BreadcrumbList`，且最后一项包含当前页 URL。

需要修改：
1. `Breadcrumb.astro` 输出的 schema 最后一项加上 `item: canonicalUrl`。
2. 所有 layout 把 `canonical` 传给 `Breadcrumb`。

### 阶段二：P1 扩展（第 3–4 周）——占据更多 SERP 空间

#### 4.5 Sitelinks Searchbox

- 英文站复用西语站 `SearchAction` 写法。
- 搜索目标：`https://easternalignment.com/reviews/?q={search_term_string}` 或 `/search/?q={search_term_string}`。
- 确保站内存在一个真实返回结果的搜索页（可先用 `/reviews/` 或 `/search/`）。

#### 4.6 HowTo schema for guides

- 在 `ArticleLayout.astro` 增加 `howToSchema` 支持。
- 对明显是教程的 guide（如“how-to-prepare-for-psychic-reading”、“questions-to-ask-a-psychic”），在 frontmatter 增加 `howToSteps` 字段，渲染 `HowTo` schema。
- 步骤文本控制在 200 字符内，每步配一张图（可选）。

#### 4.7 工具页取消 noindex + WebApplication 完善

- 工具页改为 `noindex={false}`。
- `WebApplication` schema 增加 `applicationSubCategory`、`screenshot`、`aggregateRating`（如果有）、`offers`。
- 在 `/tools/` 索引页用 `ItemList` / `SoftwareApplication` 列出所有工具。

#### 4.8 Article schema 增强

- 所有 `Article` / `Review` 增加 `wordCount`（运行时统计 markdown 正文词数）。
- 增加 `articleSection`（来自 frontmatter category）。
- 增加 `speakable`（指向正文主要段落 CSS 选择器）。

### 阶段三：P2 巩固（第 5–6 周）——品牌和长期资产

#### 4.9 Organization Knowledge Panel

- 在首页 `index.astro` 输出完整 `Organization` + `Person`（Sarah）关联图谱。
- 上传 `/about/` 页 Sarah 的真实头像，在 `Person` schema 中引用。
- 把站点提交到 Wikidata / Google Business（如果适用）。

#### 4.10 图片优化

- 为所有文章生成 1200×630 的 `og:image`。
- 为评测页生成专属 featured image（平台 logo + 评分）。
- 输出 `ImageObject` schema 含 `width/height`。

#### 4.11 验证与监控闭环

- 每批修改后，用 Google Rich Results Test 验证首页、3 个平台 hub、3 个读者页、3 个 guides、1 个对比页、1 个工具页。
- 在 GSC 的“增强功能”报告里观察错误下降趋势。

---

## 五、代码模板与修改清单

### 5.1 BaseLayout.astro 全局 schema（替换原 websiteSchema / organizationSchema）

```astro
const SITE_NAME = 'Eastern Alignment';
const SITE_URL  = 'https://easternalignment.com';
const canonical = canonicalUrl || new URL(Astro.url.pathname, SITE_URL).href;

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  "name": SITE_NAME,
  "url": SITE_URL,
  "description": "Honest reviews and guidance for online psychic reading platforms. Independently tested by real users.",
  "inLanguage": "en-US",
  "publisher": { "@id": `${SITE_URL}/#organization` },
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": `${SITE_URL}/search/?q={search_term_string}`
    },
    "query-input": "required name=search_term_string"
  }
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

并增加 meta：

```astro
<meta name="application-name" content={SITE_NAME} />
<meta name="apple-mobile-web-app-title" content={SITE_NAME} />
```

### 5.2 ReviewLayout.astro 安全 Rating schema（平台 hub vs 读者单页）

```astro
const isHub = !isReaderReview && reviewCount && reviewCount > 1;

const itemReviewed = {
  "@type": "Product",
  "@id": `${canonical}#product`,
  "name": readerLabel || platformName,
  "url": affiliateUrl !== '#' ? new URL(affiliateUrl, SITE_URL).href : canonical,
  "image": absoluteAvatarUrl || ogImage || `${SITE_URL}/logo.jpg`,
  "description": description,
  "brand": {
    "@type": "Brand",
    "name": parentPlatformLabel || platformName
  },
  ...(frontmatter.pricing ? {
    "offers": {
      "@type": "AggregateOffer",
      "lowPrice": extractLowPrice(frontmatter.pricing),
      "highPrice": extractHighPrice(frontmatter.pricing),
      "priceCurrency": "USD"
    }
  } : {})
};

const reviewSchema = {
  "@context": "https://schema.org",
  "@type": "Review",
  "headline": title,
  "description": description,
  "author": {
    "@type": "Person",
    "@id": `${SITE_URL}/about/#author`,
    "name": schemaAuthor || "Sarah",
    "url": `${SITE_URL}/about/`
  },
  "datePublished": schemaDatePublished || publishDate,
  ...(updatedDate ? { "dateModified": updatedDate } : {}),
  ...(ogImage ? { "image": ogImage } : {}),
  "reviewRating": {
    "@type": "Rating",
    "ratingValue": rating,
    "bestRating": 5,
    "worstRating": 1
  },
  "itemReviewed": itemReviewed,
  // hub 页才加 aggregateRating；读者单页不加
  ...(isHub ? {
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": rating,
      "bestRating": 5,
      "worstRating": 1,
      "reviewCount": reviewCount
    }
  } : {}),
  "publisher": {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    "name": SITE_NAME,
    "url": SITE_URL,
    "logo": { "@id": `${SITE_URL}/#logo` }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": canonical
  }
};
```

注意：
- 需要新增 `extractLowPrice` / `extractHighPrice` 工具函数，从 `$1.99/min to $30.00+/min` 这种字符串提取数字。
- hub 页的 `reviewCount` 用该平台的读者评测数（35/49/30）。
- 读者单页不输出 `AggregateRating`，只输出 `Review.reviewRating`。

### 5.3 FAQ 文本清洗函数（新增 `src/lib/schema.ts`）

```ts
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
```

在 FAQ.astro 中：

```astro
const faqSchema = generateSchema ? {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": items.map(item => ({
    "@type": "Question",
    "name": stripHtml(item.question),
    "acceptedAnswer": {
      "@type": "Answer",
      "text": stripHtml(item.answer)
    }
  }))
} : null;
```

### 5.4 Breadcrumb 升级（Breadcrumb.astro）

```astro
const { items, canonicalUrl } = Astro.props;
const crumbs = [{ label: 'Home', href: '/' }, ...items];

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": crumbs.map((item, index) => {
    const isLast = index === crumbs.length - 1;
    const itemUrl = isLast && canonicalUrl
      ? canonicalUrl
      : item.href
        ? `${SITE_URL}${item.href}`
        : undefined;
    return {
      "@type": "ListItem",
      "position": index + 1,
      "name": item.label,
      ...(itemUrl ? { "item": itemUrl } : {})
    };
  })
};
```

### 5.5 HowTo schema 模板（用于教程类 guides）

在 `ArticleLayout.astro` 中支持 `howToSteps` frontmatter：

```astro
const howToSchema = howToSteps && howToSteps.length > 0 ? {
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": title,
  "description": description,
  "totalTime": howToTotalTime || "PT15M",
  "step": howToSteps.map((step, i) => ({
    "@type": "HowToStep",
    "position": i + 1,
    "name": step.name,
    "text": step.text,
    "url": `${canonical}#step-${i + 1}`
  }))
} : null;
```

### 5.6 西语站同步

- 把 `EsBaseLayout` 的 logo ImageObject、SearchAction 等优化同步回 `BaseLayout`。
- `EsReviewLayout` 采用与英文站一致的 `isHub` 逻辑，hub 页加 `AggregateRating`，读者单页不加。

---

## 六、验证清单（每轮修改后必做）

### 6.1 线上验证工具
1. Google Rich Results Test：https://search.google.com/test/rich-results
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
- [ ] 无“种类问题/Unsupported type/Invalid type”错误。
- [ ] `WebSite` / `Organization` 100% 通过，无缺失字段。
- [ ] `BreadcrumbList` 最后一个 item 有 URL。
- [ ] `FAQPage` answer 无 HTML 标签警告。
- [ ] `Review` snippet 的 `itemReviewed` 类型正确。
- [ ] `Article` 有 `author`、`publisher`、`datePublished`、`image`。

### 6.4 GSC 后续监控
- 改完后 3–5 天观察 GSC“增强功能”里的错误数是否下降。
- 用 GSC 的 URL Inspection 请求重新索引关键页面。
- 在 GSC 设置 → 站点名称 中确认品牌名称（如果 GSC 提供该选项）。

---

## 七、预期效果与 CTR 估算

| 富媒体元素 | 对 CTR 的行业平均提升 | 对本站适用性 |
|-----------|---------------------|-------------|
| 站点名称显示品牌 | +5–10%（品牌认知） | 全站 |
| Review 星级 | +35–50%（SERP 中最醒目的元素） | 平台 hub / 读者页 |
| FAQ 折叠 | +10–15%（垂直空间 + 直接回答） | 所有 FAQ 页 |
| Breadcrumb | +5–10%（URL 可读性） | 全站 |
| Sitelinks Searchbox | +5–8% | 首页/hub |
| HowTo 折叠 | +10–20% | 教程 guides |

叠加估算：如果当前首页零点击词（如 `keen free 3 minutes` 排名第 7–8）能获得星级 + FAQ + breadcrumb，CTR 可能从 ~2% 提升到 ~4–5%，在排名不变的情况下直接翻倍。

结合 SEO 战略报告中“CTR×2.5 × 排名×3 × 内容面×4”的模型，P0 富媒体修复是“CTR×2.5”这一环的核心技术动作。

---

## 八、风险与注意事项

1. **Google 不保证展示富媒体**：即使 schema 100% 正确，Google 也会根据网站质量、E-E-A-T、搜索意图决定是否展示。本方案先做“技术正确”，再叠加内容和外链。
2. **避免 self-serving review 误判**：
   - 不要在联盟链接 `/go/...` 上直接挂 `AggregateRating`。
   - 不要在不是真实评价的页面上伪造星级。
   - `reviewCount` 必须是真实发布的评测数量。
3. **FAQ 不要重复问题**：Google 会惩罚“为 SEO 而生”的 FAQ。
4. **工具页取消 noindex 的影响**：工具页目前可能是 duplicate/thin content，取消前确保内容足够厚实，或有独特价值。
5. **构建后必须重新验证**：由于当前 `dist/` 中的 HTML 是旧构建产物（如 `/reviews/kasamba/index.html` 里 reviewRating 仍是 4.7 且缺 aggregateRating），必须在本机构建并部署后再做验证。

---

## 九、下一步行动建议

1. **本周内**：按第 5.1 节修改 `BaseLayout.astro`，解决站点名称问题。
2. **本周内**：按第 5.2 节修改 `ReviewLayout.astro`，消除评分 schema 报错。
3. **下周**：按第 5.3 节清洗 FAQ，升级 `Breadcrumb.astro`。
4. **第 3 周**：为英文站加 `SearchAction`，为教程 guides 加 `HowTo`。
5. **第 4 周**：评估工具页是否取消 noindex，完善 `WebApplication`。
6. **持续**：每批上线后用 Rich Results Test + GSC 验证，建立“上线前 schema 验证”门禁。

---

## 附录：参考资源

- Google Review Snippet 文档：https://developers.google.com/search/docs/appearance/structured-data/review-snippet
- Google Site Name 文档：https://developers.google.com/search/docs/appearance/site-names
- Google Sitelinks Searchbox：https://developers.google.com/search/docs/appearance/structured-data/sitelinks-searchbox
- Schema.org Product：https://schema.org/Product
- Schema.org Service：https://schema.org/Service
