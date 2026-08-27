# PostHog 防吞单自检 + Aff 点击查看（零基础版）

> 你只要会点鼠标就行。这份指南假设你**从没打开过 PostHog**。  
> 目标：5 分钟内看到「我的 aff 链接被人点了多少次」，并学会每周自检联盟有没有吞你的单。  
> 进阶用法（每页流量、CTR、CTA 位置归因）看同目录的 `POSTHOG_PER_PAGE_GUIDE.md`。

---

## 〇、先搞清楚：能追踪到吗？防吞单了吗？

**能追踪。** 你项目里的实现（`src/components/PostHog.astro` + `src/pages/go/[...slug].astro`）已经做了三件事：

1. **真人点击才计数**：只有 `e.isTrusted === true`（真人鼠标/键盘触发）才会 fire `affiliate_link_click` 事件。脚本点击、bot 预取一律不 fire。
2. **/go/ 门控页挡 bot**：联盟链接不是直接跳 TUNE，而是先跳 `/go/<slug>/?ea_sub=<PostHog ID>`。这个页面检查 same-origin referrer / sessionStorage / `ea_sub` 三选一，bot 都没有 → 不跳转 → 联盟后台不计数。所以**联盟后台的 raw clicks 里没有 bot 水分**。
3. **点击 ID 透传给联盟**：`ea_sub` 里的 PostHog distinct_id 会被塞进 TUNE URL 的 `aff_sub2` 参数。这是反查的钥匙。

**防吞单分两层，目前只闭环第一层：**

| 层                              | 状态     | 你能做什么                                                                                                                 |
| ------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------- |
| ① **点击对账**（你 vs 联盟）            | ✅ 已闭环  | PostHog 真人点击数 vs TUNE 后台 raw clicks。PostHog > TUNE = 联盟漏计，拿数据找 AM Maayan                                              |
| ② **转化归因闭环**（conversion 一定算你的） | ⚠️ 未闭环 | 需要找 AM 配 **server postback**：TUNE 每次 conversion 把 `aff_sub2` 回传给你指定的 endpoint，你才能匹配回 PostHog click_id。**这步要主动找 AM 提** |

> 换句话说：现在你能证明"我送了 N 个真人点击给联盟"，但还不能证明"联盟后台那 M 个转化里有几个是我送的"。前者已经够你跟联盟对账"漏点击"的吞单；后者要 postback 才能对账"漏转化"的吞单。

---

## 一、第一次打开 PostHog：确认在收数据

### 1. 打开网址

浏览器访问 **<https://us.posthog.com>** （或 <https://app.posthog.com）。>

> ⚠️ **国内网络注意**：PostHog Cloud 在美国，国内直连可能很慢甚至打不开。如果转圈超过 30 秒，切海外 IP 再试。控制台域名是 `us.i.posthog.com`，你的站点数据上报也走这个域名——**国内访客的点击事件本身也可能因为 GFW 丢数据**，这是你做对账时要意识到的偏差来源。

### 2. 登录 + 选项目

登录后，左上角项目切换器选 **easternalignment**（或你建项目时起的名）。

### 3. 确认在收数据（30 秒自检）

左侧菜单点 **Activity**（或 **Live Events**）。

你会看到一个实时事件流，应该包含：

- `$pageview` — 有人访问了某页
- `affiliate_link_click` — 有人点了 aff 链接（如果还没有，说明上线后还没真人点过，或门控 JS 没部署生效）

> 如果**只有 `$pageview` 没有 `affiliate_link_click`**：正常。说明流量来了但还没人点 CTA。先做下面的"看点击总数"，数字是 0 也正常。
>
> 如果**两个都没有**：PostHog 没在收数据。检查 `src/components/PostHog.astro` 里 `PUBLIC_POSTHOG_KEY` 环境变量有没有设、最新构建有没有部署到 Cloudflare Pages。



---

## 二、核心：看 aff 链接点击总数（防吞单对账用）

这是你最该常看的一个数字。

### 步骤

1. 左侧菜单点 **Insights**（图标像个折线图）
2. 右上角点 **+ New insight** 按钮
3. 默认就是 **Trends** tab，不用切
4. 中间区域有个 **"Add graph series"** 或 **"Select an event"** 的下拉，点开，搜索框输入 **`affiliate_link_click`**，选中它
5. 右上角时间选择器选 **Last 30 days**（或你想看的区间）
6. 图表上方那个大数字 = 30 天内**真人** aff 点击总数

### 这个数字怎么用（防吞单对账）

打开 TUNE 后台（bargestech.go2cloud.org）→ Reports → 选同一时间区间 → 看 **raw clicks**（不是 unique clicks）。

| PostHog 数字 vs TUNE 数字 | 含义                       | 动作                             |
| --------------------- | ------------------------ | ------------------------------ |
| PostHog ≈ TUNE        | 流量干净，基本无 bot             | 正常运营                           |
| **PostHog > TUNE**    | **联盟漏计你的点击（吞单嫌疑）**       | **截图两边的数字，发工单/找 AM Maayan 对账** |
| PostHog < TUNE        | 联盟那边还有 bot 水分（你门控掉了，他们没） | 正常，说明你的门控生效了                   |

> 国内访客的 PostHog 事件可能因 GFW 丢失，所以 PostHog 数字可能略偏低。对账时如果 PostHog 只比 TUNE 少 10% 以内，可以接受；如果少 50% 以上，要么是 GFW 丢包严重，要么是门控 JS 在某些页面没生效——需要进一步查。

### 保存这个图（下次一键打开）

右上角 **Save** → 起名 `Aff clicks total - 防吞单` → 保存到默认 dashboard。以后左侧 Insights 列表里直接点开。

---

## 三、看每个 aff 链接被点了多少（按 slug 拆）

知道"总共被点了 N 次"还不够，要知道"哪个商家/占卜师被点最多"。

### 步骤

1. 在刚才那个 insight 里（或新建一个）
2. 事件还是 `affiliate_link_click`
3. 往下滚到 **Break down by** 区域（在图表下方）
4. 点开下拉，选 **`slug`**（搜 "slug"）
5. 图表变成多色堆叠，下方表格列出每个 slug 的点击数：
   - `keen` / `kasamba` / `purplegarden` / `purple-garden` — 平台主页
   - `keen-flora` / `kasamba-spiritual-shiwa` / `purple-garden-chloe` … — 具体占卜师

**看什么：**

- 哪个平台主页点击最多 → 跟 TUNE 后台对应 offer_id 的 clicks 对账
- 哪个占卜师页点击最多 → 这些是你的"带货明星"，内链多推
- 某个 slug PostHog 有点击但 TUNE 那边 offer 没数 → 那条链接的 tracking 可能断了，单独查

---

## 四、看每页带来的 aff 点击（按 location 拆）

知道"哪页最能带货"。

### 步骤

1. 同一个 insight
2. **Break down by** 改成 **`location`**（搜 "location"）
3. 表格列出每个页面路径贡献的点击数，例如：
   - `/reviews/keen/` — 12 次
   - `/psychics/kasamba/spiritual-shiwa/` — 8 次
   - `/` — 5 次
   - …

**怎么用：**

- 流量高 + 点击高 = 核心页，重点维护
- 流量低 + 点击高 = 高意图页，在侧边栏/相关文章里多链它
- 流量高 + 点击低 = CTA 文案/位置有问题，优化

> 怎么看每页流量？新建一个 insight，事件选 `$pageview`（或 Page views），Break down by `$path`。两份表格按路径对齐，用 Excel VLOOKUP 算 `点击/浏览 = CTR`。详见 `POSTHOG_PER_PAGE_GUIDE.md` 第三节。

---

## 五、按 CTA 位置看（hero/end/sticky/sidebar/inline）

知道"哪个位置的按钮最吸点击"。

### 步骤

1. 同一个 insight，事件 `affiliate_link_click`
2. **Break down by** 选 **`ctaSource`**
3. 表格列出每个位置的点击数

| ctaSource | 出现位置                   | 预期                    |
| --------- | ---------------------- | --------------------- |
| `hero`    | 页面顶部大按钮                | 首屏即见，意图未热，点击中等        |
| `end`     | 文末推荐卡（读完才见）            | 意图最热，通常转化最好           |
| `sticky`  | 手机端底部浮条                | 补手机端侧栏看不到的盲区          |
| `sidebar` | 桌面端左侧栏                 | 仅 ≥1100px 显示          |
| `inline`  | 正文手写 CTA               | 上下文相关                 |
| `unknown` | 没标 data-cta-source 的链接 | 应该是 0；不是 0 说明有漏标的 CTA |

**动作：** 如果 `end` 和 `sticky` 点击占比低，检查这两个位置的按钮有没有正常渲染（尤其 sticky 依赖 JS 滚动触发）。

---

## 六、每周例行（5 分钟，周一做）

1. 打开保存的 **Aff clicks total - 防吞单** insight，记下上周点击数
2. 打开 TUNE 后台同期 raw clicks，对比
3. 如果 PostHog > TUNE 超过 20% → 截图，发 AM 对账
4. 打开 by `slug` 拆分，看有没有某条链接突然 0 点击（可能是占卜师下架、链接断了）
5. 打开 by `location` 拆分，看有没有某页突然不带货了（可能是 CTA 被改坏、页面布局错位）

---

## 七、异常情况排查

### "PostHog 里一个 affiliate_link_click 都没有"

可能原因（按概率排序）：

1. **还没人点过 aff 链接** — 流量低时正常，先看 `$pageview` 有没有数据
2. **门控 JS 没部署生效** — 检查 Cloudflare Pages 最新部署有没有包含 `PostHog.astro` 的点击监听代码（浏览器 F12 → Sources 搜 `affiliate_link_click`）
3. **PostHog Key 没配** — `PUBLIC_POSTHOG_KEY` 环境变量空着，控制台会打印 `Analytics disabled` 警告
4. **CTA 链接不是 `/go/` 开头** — 门控只认 `/go/<slug>` 格式的 href。如果某些 CTA 直接写了 TUNE 原始 URL，点击不会被门控也不会被追踪

### "PostHog 有点击，但 TUNE 后台 0 clicks"

1. 检查 <u>go</u> 页面的重定向有没有真的跳到 TUNE（浏览器 F12 → Network → 点一次 aff 链接 → 看请求链有没有到 `bargestech.go2cloud.org`）
2. 检查 TUNE offer_id 是否还在线（找 AM 确认 offer 没暂停）
3. 如果只有特定 slug 0 clicks，对比 `affiliateLinks.ts` 里那个 slug 的 URL 是否还有效

### "TUNE 有转化，但不算我的"

这就是第二层吞单（转化归因），需要 postback 闭环。**找 AM Maayan 提：**

> "Can we set up a server-side postback so I receive aff_sub2 (my internal click ID) on every conversion? I want to reconcile conversions with my own click tracking."

---

## 八、事件字段速查

| 字段                     | 含义                                            | 在哪看                           |
| ---------------------- | --------------------------------------------- | ----------------------------- |
| `affiliate_link_click` | 真人点击 aff 链接（事件名本身）                            | Insights → Trends → 选事件       |
| `slug`                 | 点了哪个商家/占卜师                                    | Break down by → slug          |
| `location`             | 点击所在页面路径                                      | Break down by → location      |
| `ctaSource`            | CTA 位置（hero/end/sticky/sidebar/inline）        | Break down by → ctaSource     |
| `click_id`             | PostHog 用户 distinct_id（= 透传给 TUNE 的 aff_sub2） | Activity → 点开单条事件看 properties |
| `target_blank`         | 是否新标签打开                                       | 同上                            |
| `text`                 | 按钮文案（前 80 字符）                                 | 同上                            |

---

## 九、进阶

- 每页流量排行、CTR 计算、bot 验证、CTA 位置归因的详细版 → `POSTHOG_PER_PAGE_GUIDE.md`
- 转化归因闭环（postback）→ 找 AM Maayan 配，配好后另写一节补充
