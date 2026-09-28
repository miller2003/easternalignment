# $0 / Lead 注册回传 接通手册

> 建立于 2026-09-28。目标：让 barges（TUNE HasOffers）后台的 **$0 注册 / Lead 类转化**
> 也能回传到本站，从而回答两个至今无法回答的问题：
> **① 哪个页面/哪一次点击带来了注册　② 注册 → 付费的升级率与升级耗时。**
>
> 现状（2026-09-28 实测）：付费回传正常（9 月已收到 7 笔），
> **Lead 回传一条都没进来**。已核验「收不到」不是端点的问题（端点早就能收 `payout=0`），
> 而是**后台那条 postback URL 没有对 Lead 类转化触发**。

---

## 0. 一句话结论

**根因已确认（2026-09-28 后台截图）：现有 3 行回传的「目标」全都是 `First Purchase`，
注册类目标从未绑定任何回传 URL。**

所以只需要在 barges 后台的「追踪点/回传」页**新增**行：
把**目标**换成**注册 / Signup / Lead 类**，其余照抄现有行，URL 末尾补 `&conversion_type=lead`。
**现有 3 行一个字都不要改**（它们负责付费回传，正在正常工作）。

收端代码已经就绪（本次再补了 5 个会让 Lead 数据失真的问题），**不需要第二条 URL**。
详见 §1.1 的逐步操作。

**判据（怎么知道是"没发"还是"发丢了"）**：
`Postback_Orphan` 一直是 0 而后台有注册 → **后台根本没发**（不是匹配失败）。
这个判据在 2026-09-16 的付费缺口上已被验证过一次（当时 4 笔付费缺失、Orphan 也是 0）。

---

## 1. 后台怎么配（唯一需要你操作的步骤）

### 1.0 🔴 根因已定位（2026-09-28 后台「追踪点/回传」页截图）

该页目前**只有 3 行，且每一行的「目标」都是 `First Purchase`**：

| 目标 | 类型 | 广告单 | 代码/网址 | 状态 |
|---|---|---|---|---|
| First Purchase | Postback URL | Keen -Tarot Reading EN | `https://easternalignment.com/api/postback?click_id={aff_sub2}…` | 活动 |
| First Purchase | Postback URL | Kasamba Web | 同上 | 活动 |
| First Purchase | Postback URL | Purple Garden Web English | 同上 | 活动 |

→ **回传只绑在「首次购买」这一个目标上。注册（$0 / Lead）是另一个目标，从来没绑过回传 URL。**

这就解释了全部现象：付费回传一直正常（9 月 7 笔），而 **Lead 一条都没有**，
且 `Postback_Orphan` 恒为 0（= 后台根本没发，不是发来了认不出人）。

### 1.1 唯一要做的事：**新增**行 —— 不要修改现有 3 行

现有的 3 行负责付费回传，**正在正常工作，一个字都不要改**。

操作：

1. 点表格上方的「**新增**」。
2. **目标**：选**注册 / Signup / Lead 类**的目标（下拉里有什么就选对应的那个）。
3. **类型**：`Postback URL`。
4. **广告单**：三个都要建，各建一条 —— `Keen -Tarot Reading EN`、`Kasamba Web`、`Purple Garden Web English`。
5. **代码/网址**：把现有那条 URL **整条复制过来**，只在**末尾追加** `&conversion_type=lead`：

   ```
   https://easternalignment.com/api/postback?click_id={aff_sub2}&payout={payout}&transaction_id={transaction_id}&conversion_type=lead
   ```

   > ⚠️ **不要手打宏名**。从现有行复制能让 `{aff_sub2}` / `{payout}` / `{transaction_id}` 一个字都不错；
   > 你只需要在结尾加上 `&conversion_type=lead` 这 20 个字符。

6. 保存，状态保持「活动」。

**为什么要加 `&conversion_type=lead`**：联盟侧在注册动作上有时会把 `{payout}` 填成「报价」而不是实际金额。
不加的话，一笔 $0 注册可能被判成 `sale` 并带着 $125 入库，直接污染付费笔数。
（`scripts/test-postback-classify.mjs` 的用例 C 就是专门覆盖这个坑的。）

### 1.2 如果「目标」下拉里**没有**注册/Lead 类目标

那就不是前端能改的事：说明这三个广告单在 barges 侧**没有配置注册类转化目标**，
或该目标对我们这个 affiliate 账号未开放。

此时请二选一：
- 把该广告单**可选的「目标」清单**截图发我（我按它的实际命名给你下一步）；或
- 直接问联盟经理：**「注册 / Lead 类转化目标是否可用？需要手动开启吗？」**

> 这是唯一可能卡住的地方。其余部分（收端代码、URL、参数）都已就绪。

### 1.3 保存后立刻自检（不用等真实注册）

1. 如果这一行旁边有「**测试**」按钮 → 点一次。
2. 1 分钟后查 PostHog（任一形式都算通）：
   - 出现新的 `Postback_Orphan`，或
   - 出现新的 `Order_Converted`
3. **测试回传因宏未被替换而落成孤儿事件，是正常且预期的** —— 我们要的就是"URL 可达、后台真的会发"这个信号。

> 旁证：2026-09-28 **19:26:32 出现过 3 次带空参数的请求**（`?c=`、`?click_i=`、`?click_id=`），
> 被端点记成了 3 条 `Postback_Orphan`。如果那是你点的测试，说明**链路本来就是通的**，
> 只差把「目标」选对；如果不是你点的，那是一次外部扫描（端点已加可选密钥应对）。

### 1.4 端点侧的类型判定（供理解，不需要你配置）

| 判定优先级 | 依据 | 说明 |
|---|---|---|
| 1 | URL 上显式写 `&conversion_type=lead` | 最可靠 ← **推荐就用这个** |
| 2 | 参数 `commission`（实际佣金）> 0 → sale；= 0 → lead | 最硬的信号 |
| 3 | 参数 `amount` / `sale_amount` / `order_amount` > 0 → sale；= 0 → lead | 订单金额为零即没有真实成交 |
| 4 | 都没有时退回 `payout > 0 → sale` | 改造前的旧行为 |

判定用了哪一级会写进 `type_inference` 属性，事后可审计。

**金额一致性收口**：类型判为 `lead` 却带着非零 `payout` 时，`revenue` 会被**归零**
并在 `revenue_source` 记 `lead_zeroed`。理由：那种情况只可能是 `{payout}` 填的是报价，
照原值入库会让一笔注册凭空产生 $125 营收——比丢一笔更糟，因为营收是花钱决策的输入。
原始值仍在 `amount_macros.payout` 与 `raw_params` 里，没有丢数据。

### 1.5 另外两个可以顺手确认的开关

1. **触发条件**：是否有「仅 payout > 0 才发送」之类的过滤？有就关掉。
2. **重试**：端点已做幂等（`$insert_id`），重复回调不会重复计营收；可以放心开重试。

---

## 2. 端点做了什么（`functions/api/postback.js`）

### 2.1 2026-09-10 已具备（本次沿用）

- `conversion_type` = `lead` / `sale`，两者都写进 **同一个事件 `Order_Converted`**，靠属性区分
  （口径不变：`Order_Converted` 是全站唯一的转化事件名，不要改成两个事件）。
- `<人ID>.<点击令牌>` 拆分 → `click_id` / `click_token`，实现"**哪一次点击**成交"的精确归因。
- 缺 `click_id` 不丢弃 → 写 `Postback_Orphan`。
- `$insert_id` 幂等。
- `?dry=1` 自检模式（只返回解析结果，不写库）。

### 2.2 2026-09-28 新增（本次）

| # | 问题 | 修法 |
|---|---|---|
| 4 | **撤销/退款无法表达**：`status=reversed` 的 revenue 仍是正数、且 `$insert_id` 不含 status → 被撤销的付费会永久虚增营收，撤销动作本身还被幂等丢弃 | 撤销类状态**另开一条事件**（`$insert_id` 追加状态后缀，不影响已入库历史事件的幂等），`revenue` 记**负值** → `sum(revenue)` 天然是净营收；人物属性加 `ea_reversed` |
| 5 | **Lead 被误判成 sale**（只看 `payout`） | 四级判定 + `type_inference` 属性；URL 可写 `&conversion_type=lead` 强制归类 |
| 6 | **`platform` 恒为 null**（回传里没有 `offer_id`），Lead 完全不知道记到哪个平台 | `/go/` 页把平台码拼进 `aff_sub2` 第三段：`<人ID>.<令牌>.<平台码>`；端点按白名单解析。**不需要改后台配置**。同时新增 `sub_id_canonical`（去掉平台码），可与点击事件按同一形状连接 |
| 7 | **端点无鉴权**：任何人 POST 都会写进 PostHog（实测 2026-09-28 19:26:32 有 3 次空参数探测被当成真实孤儿回传写入）；`transaction_id` 缺失时多条孤儿事件 `$insert_id` 撞号 | 支持可选共享密钥；孤儿事件 `$insert_id` 加参数指纹 |

### 2.3 新增/变更的属性（分析时可直接用）

| 属性 | 含义 |
|---|---|
| `conversion_type` | `lead`（$0 注册）/ `sale`（付费） |
| `is_lead` / `is_sale` | 布尔，方便过滤 |
| `type_inference` | 类型判定依据：`declared` / `commission` / `order_amount` / `payout` / `reversal` |
| `is_reversal` | 是否撤销/退款类回调 |
| `revenue` | $0 注册为 0；撤销类为**负值**；判为 lead 但金额只来自 `payout` 时归零（见下） |
| `revenue_source` | `payout` / `commission` / `none` / `lead_zeroed`（类型判为 lead 却带着非零 `payout`，金额已归零） |
| `platform` | `Kasamba` / `Keen` / `PurpleGarden`（来自 sub 第三段、或 `offer_id`、或广告主名） |
| `sub_id` | 原始 sub（可能含平台码） |
| `sub_id_canonical` | 归一化 sub，形状与 `affiliate_link_click.sub_id` 一致 |
| `click_token` | 单次点击令牌 |
| `client_ip` / `client_ua` / `client_country` | 回传请求的真实来源（端点转发的 `$ip` 永远是 Cloudflare 出口，不可用） |

---

## 3. 验证（两步，10 分钟）

### 3.1 本地自检（不写任何事件）

```bash
node scripts/postback-selftest.mjs
```

覆盖 6 个场景：$0 注册（显式声明 / commission 推断 / payout 被填成报价）、
付费、撤销、缺 click_id。全部 `✓` 才算通过。

### 3.2 写入验证（确认"写库"这步也通）

```bash
node scripts/postback-selftest.mjs --write
```

会写入 1 条 `transaction_id = SELFTEST-LEAD-WRITE` 的事件。约 1 分钟后在 PostHog 里查：

```
event = Order_Converted  AND  properties.transaction_id = 'SELFTEST-LEAD-WRITE'
```

期望：`conversion_type=lead`、`is_lead=true`、`platform=PurpleGarden`、`revenue=0`、`click_token=484cmo`。

> 分析时排除测试数据：`transaction_id NOT LIKE 'SELFTEST-%'`。

### 3.3 线上真实验证

后台触发一笔真实注册后，查：

```sql
SELECT toDate(toTimeZone(timestamp,'Asia/Shanghai')) AS day, properties.conversion_type,
       count() AS n, sum(properties.revenue) AS revenue
FROM events
WHERE event='Order_Converted' AND timestamp >= toDateTime(<epoch>)
GROUP BY day, properties.conversion_type ORDER BY day DESC
```

若 Lead 从 0 变成非 0 → 接通成功；若仍为 0 → 回到 §0 的判据（看 `Postback_Orphan`）。

---

## 4. 故障排查

| 现象 | 判断 | 处理 |
|---|---|---|
| 后台有注册，PostHog 什么都没有，且 `Postback_Orphan = 0` | **后台没发** | 回到 §1.4 三个开关 |
| `Postback_Orphan > 0` 且 `raw_params.click_id` 为空/被截断 | 发了但**归因参数丢了** | 检查后台 URL 的 `{click_id}` 宏是否写对、`aff_sub2` 是否被平台改写 |
| 有事件但 `conversion_type=sale` 而实际是注册 | `{payout}` 填的是报价 | URL 补 `&conversion_type=lead`（§1.3） |
| 有事件但 `platform=null` | 该笔点击发生在 2026-09-28 之前（sub 只有两段），或平台码不在白名单 | 属正常历史数据；新点击会自动带平台码 |
| HTTP 403 | 端点启用了 `POSTBACK_SECRET` 但 URL 没带密钥 | URL 补 `&k=<POSTBACK_SECRET>`；或临时移除该环境变量（改环境变量后需**重新部署**才生效） |
| `revenue` 加起来偏小/为负 | 有撤销类回调 | 属正常，`sum(revenue)` 就是净营收 |

---

## 5. 可选加固：共享密钥

端点默认**不校验**密钥（向后兼容，避免打断线上付费回传）。要启用：

1. Cloudflare Pages → Settings → Environment variables → 加 `POSTBACK_SECRET=<随机串>`，**重新部署**。
2. 到 barges 后台，把**所有** postback URL 补上 `&k=<同一个随机串>`。
3. 顺序不能反：先改 URL 再设环境变量，否则 403 会让回传全部中断。
4. 启用后跑 `node scripts/postback-selftest.mjs --secret <随机串>` 验证。

---

## 6. 相关口径（分析时别搞错）

- `Order_Converted` 是**唯一**的转化事件名，lead 与 sale 靠 `conversion_type` 区分。
- **累计营收按 `transaction_id` 去重**：Kasamba/PG 的「$0 注册 → 约 24h 后 $125 付费」
  是同一交易号的两条记录。若两条都记了金额，按事件条数求和会翻倍。
  本端点的实现是 lead 记 0、sale 记 $125，因此 `sum(revenue)` 天然正确；
  但**计"转化笔数"时必须去重**。
- 滞后常数（用于异常检测）：Kasamba / PG 点击 → $0 记录 **58.8–68.6 分钟**；
  Keen 点击 → 记录 4.6 / 8.6 分钟；Kasamba / PG 注册 → 付费约 **23–24 小时**。
- 「PostHog 看不到注册」在接通前是**预期现象**，不要当成埋点故障。
