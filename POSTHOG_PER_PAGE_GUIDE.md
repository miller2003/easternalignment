# 怎么在 PostHog 看每页数据（流量 & 联盟点击）

> 目标：搞清楚「哪页流量最好」「哪页带来的 affiliate 点击最多」「哪页转化效率最高」。  
> 前提：站点已做 JS 门控（只有真人点击才触发 affiliate 跳转），所以下面的 `affiliate_link_click`  
> 事件**只含真人点击**，没有 bot 水分。刚上线后这个数字会比之前联盟后台的数字小很多——那是正常的，说明 bot 被挡掉了。



---

## 一、每页流量排行（哪页被人看最多）

PostHog 自动记录每次页面浏览（`$pageview`，带 `$path` 属性）。

**步骤：**

1. 打开 PostHog → 左侧 **Insights** → 新建 **Trends**
2. 事件选 **Page views**（或 `$pageview`）
3. 右上角 **Break down by** → 选 **Path**（`$path`）
4. 时间范围选 **Last 7 days / Last 30 days**
5. 图表下方表格就是「每页浏览量排行榜」

**看什么：** 排最前面的就是流量最好的页。命理站通常 `/reviews/keen/`、`/tools/one-card-tarot/`、首页这类排前面。

> 更快的方式：如果开了 **Web Analytics**（PostHog 左侧 Web Analytics），直接看 **Pages & Screens** 面板，已自带排行。

---

## 二、每页 affiliate 点击（哪页带来的点击最多）

我们埋的事件叫 **`affiliate_link_click`**，带两个关键属性：

- `location` = **点击发生的页面路径**（就是「哪页」）
- `slug` = 点了哪个商家/占卜师（`keen` / `kasamba` / `keen-flora` …）

**步骤：**

1. Insights → 新建 **Trends**
2. 事件选 **affiliate_link_click**
3. **Break down by** → 选 **location** → 得到「每页带来的 affiliate 点击数」
4. （可选）再开一个 Trends，Break down by **slug** → 得到「每个商家/占卜师被点了多少次」

**看什么：** `location` 排行第一的页 = 最能带货的页。把这页和「流量排行」对比：

- 流量高 + 点击高 = 你的核心页，重点维护、加内部链接
- 流量低 + 点击高 = 高意图页，值得加曝光（在侧边栏/相关文章里多链它）
- 流量高 + 点击低 = 流量浪费了，检查 CTA 文案/按钮位置

---

## 三、每页转化率 CTR（哪页效率最高，不是流量高就值钱）

CTR = 该页 affiliate 点击数 ÷ 该页浏览量。流量高不代表赚钱，CTR 高才说明这页「读者真的想点」。

PostHog 一个图里不能直接做除法，两步导出后在表格里算：

1. 按「二」导出 `affiliate_link_click`（按 `location` 分组）的 CSV
2. 按「一」导出 `$pageview`（按 `$path` 分组）的 CSV
3. 在 Excel/Sheets 用 `location`/`$path` 做 VLOOKUP 对齐，算 `点击 / 浏览`
4. 排序看 CTR 最高的页

> 小技巧：命理站 CTR 正常值大概 1%–5%。低于 1% 的页，CTA 需要优化；高于 5% 的是黄金页。

---

## 四、验证「bot 真的被挡了」

上线一周后做这个核对：

- PostHog 里 `affiliate_link_click` 总数（真人点击）
- 联盟后台同期的 raw clicks

| 比例                     | 含义                               |
| ---------------------- | -------------------------------- |
| PostHog ≈ 联盟后台         | 流量基本都是真人，干净                      |
| PostHog ≪ 联盟后台（比如 1/3） | 联盟那边还有 bot/重复计数，拿这个数据去工单找联盟方开反作弊 |
| PostHog ≫ 联盟后台         | 联盟少计了你的点击（漏佣），要查跟踪参数             |

---

## 五、建议的每周例行（5 分钟）

1. 看 **Pages & Screens** → 哪页流量跌了/涨了
2. 看 `affiliate_link_click` by `location` → 哪页点击最多
3. 看 `affiliate_link_click` by `slug` → 哪个商家/占卜师最吸点击
4. 把「高 CTR 低流量」的页在站内多链几次

---

## 六、CTA 位置归因（哪个位置的按钮最吸点击）

我们给每个 affiliate 按钮都打了 `data-cta-source` 标记，`affiliate_link_click` 会带上
`ctaSource` 字段。这样你能直接对比：**顶部 hero / 文末 end / 移动端 sticky / 侧边栏 sidebar / 正文 inline**
哪个位置带来的真人点击最多——不用猜，用数据决定以后把按钮放哪。

**步骤（对比各 CTA 位置）：**

1. Insights → 新建 **Trends** → 事件选 `affiliate_link_click`
2. **Break down by** → 选 **ctaSource**
3. 时间范围选 **Last 7 / 30 days**
4. 表格就是每个位置的点击数。换算 CTR：某位置点击数 ÷ 该页 `$pageview` 数

**各位置含义：**

| ctaSource | 出现位置 | 说明 |
| --------- | ------- | ---- |
| `hero`    | 文章/对比页顶部按钮、review 顶部大按钮 | 首屏即见，意图未热 |
| `end`     | 文末推荐卡（EndCTA / CTABox） | 读完内容、意图最热，通常转化最好 |
| `sticky`  | 移动端底部浮条（<1100px 才显示） | 解决「手机端看不到侧边栏 CTA」的问题 |
| `sidebar` | 左侧栏 3 张 deal-card | 桌面端才有（≥1100px） |
| `inline`  | 正文里手写的 CTA（如工具页结果区） | 上下文相关 |

> 预期：上线 1–2 周后，`end` 和 `sticky` 会贡献大部分新增点击（之前这两块是空的）。
> 如果 `sticky` 点击很少，检查它有没有在滚动后出现（JS 依赖 sessionStorage，无痕模式仍可用）。

---

## 附：事件字段速查

| 字段                     | 含义                | 用途               |
| ---------------------- | ----------------- | ---------------- |
| `affiliate_link_click` | 真人点击 affiliate 链接 | 统计点击数            |
| `location`             | 点击所在页面路径          | 按页归因             |
| `slug`                 | 哪个商家/占卜师          | 按商家归因            |
| `ctaSource`            | CTA 位置（hero/end/sticky/sidebar/inline） | 按位置归因，优化按钮摆放 |
| `target_blank`         | 是否新标签页打开          | 排查跳转行为           |
| `click_id`             | PostHog 用户 ID     | 对接联盟 postback 回传 |
| `$pageview` / `$path`  | 页面浏览 / 路径         | 流量排行、CTR 分母      |
