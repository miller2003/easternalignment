# Workbook Design — 解读师深层链接对照表

> 由 excel-generation skill 在主代理侧产出，供 sheet-agent 子代理按图施工。

## User Intent
用户需要一张 Excel 对照表：10 个解读师的官网原链接，外加一列空白列，供用户从联盟（TUNE/Barges）后台拿到深层链接后填入，后续用于一一对应部署 aff 链接。

## Scenario Archetype
- 记录型：10 行明细清单，字段规范、冻结表头、开启筛选。

## Sheets
- 对照表（角色：主表/明细）

## Sheet: 对照表

### Columns
| 列 | 字段名 | 类型 | 来源 | 备注 |
|---|---|---|---|---|
| A | 序号 | 序号 | 推断 | 1–10，居中 |
| B | 平台 | 枚举 | 用户原话 | 选项：Kasamba / Purple Garden |
| C | 解读师 | 文本 | 用户原话 | 展示名（与平台主页一致） |
| D | aff slug 键名 | 文本 | 推断 | 即 src/data/affiliateLinks.ts 中的键名，部署映射用 |
| E | 官网原链接 | 文本 | 用户原话 | 完整 https URL，列宽 360px，自动换行，左对齐 |
| F | TUNE offer_id | 数字 | 推断 | Kasamba=191；Purple Garden=30；居中 |
| G | 联盟后台深层链接（待填） | 文本 | 用户填写 | **留空**，输入区浅蓝底，列宽 360px，自动换行，左对齐 |

### Sample Data Scale
10 行（按用户给定名单，数据如下，逐行填入 A2:F11，G 列留空）：
1. Kasamba | Love Insights by Jennifer | kasamba-love-insights-by-jennifer | https://www.kasamba.com/psychic/love-insights-by-jennifer/ | 191
2. Kasamba | light4you | kasamba-light4you | https://www.kasamba.com/psychic/light4you/ | 191
3. Purple Garden | Andrew Angel | purple-garden-andrew-angel | https://www.purplegarden.co/psychics/20-andrew-angel | 30
4. Kasamba | Sparks Of Insight | kasamba-sparks-of-insight | https://www.kasamba.com/psychic/sparks-of-insight/ | 191
5. Purple Garden | Athena Love | purple-garden-athena-love | https://www.purplegarden.co/psychics/5811-athena-love | 30
6. Kasamba | LOVE READINGS BY SAJ | kasamba-love-readings-by-saj | https://www.kasamba.com/psychic/love-readings-by-saj/ | 191
7. Kasamba | Spiritual Annie | kasamba-spiritual-annie | https://www.kasamba.com/psychic/spiritual-annie/ | 191
8. Purple Garden | Tattooed Psychic | purple-garden-tattooed-psychic | https://www.purplegarden.co/psychics/805-tattooed-psychic | 30
9. Purple Garden | Bella Love | purple-garden-bella-love | https://www.purplegarden.co/psychics/6964-bella-love | 30
10. Kasamba | Divinely Spiritual | kasamba-divinely-spiritual | https://www.kasamba.com/psychic/divinely-spiritual/ | 191

### Notes for sheet-agent
- 表头（第 1 行）：商务蓝 `#4472C4` 底 + 白字 `#FFFFFF` + 加粗 + 水平居中 + 下边框 thin
- 输入区：G 列（联盟后台深层链接）数据区 G2:G11 浅蓝底 `#D9E2F3`，留空给用户填写
- E 列（官网原链接）与 G 列列宽 360px，自动换行（wrapText），左对齐；E 列值设为超链接（指向自身 URL）
- 可用性：冻结第 1 行表头，开启筛选（A1:G11）
- 不合并任何单元格；除 G 列外无其他空列穿插

## Charts / Pivots
无

## 约束与不做的事
- 单 sheet、10 行，不加图表、不加条件格式、不加汇总行、不加第二 sheet
- 不做数据验证下拉（平台列仅枚举说明即可）
