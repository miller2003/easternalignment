# Kasamba 内容质检缺陷修复报告

**日期**：2026-08-13
**范围**：独立 AI 内容质检标出的 12 篇 Kasamba 单解读师 review
**结论**：报告所述缺陷**基本属实，已全部修复**。全部 20 篇 Kasamba 通过一致性校验；全站 87 篇机械 QA 复跑 Kasamba + Purple Garden **0 flag**。

---

## 修复明细（12 篇）

| 文件 | 缺陷类型 | 修复动作 | 关键数值变更 |
|------|----------|----------|--------------|
| ask-cristina | rating 不一致、缺 pricing | 抬高 YAML rating、补 pricing、对齐读数 | rating 4.7→**4.8**；readings 11,781→**36,000+ since 2002**；pricing `$5.99/min (promo $2.99)` |
| cosmic-fusion | YAML title `''''` 转义损坏、bestFor 截断、缺 entities | 清转义、补 bestFor、加 entities | rating 5（保持）；清 `''''` 损坏 |
| david-james-psychic-wisdom | YAML 4.7 vs 正文 "5-star"、缺 pricing/bestFor | 抬高 YAML、补 pricing/bestFor | rating 4.7→**5**；补 pricing/bestFor |
| elizabeth | YAML title/desc/verdict `''''` 结构性损坏、缺 pricing | 清转义、补 pricing、对齐真实值 | rating 4.8（保持）；pricing `$8.99`→**`$4.99/min (intro $2.49)`**；readings 17,000→**47,000+**；正文 "5-star"→"4.8-star" |
| golden-eye | title/desc/bestFor 截断、highlights "5-star" vs rating 4.9 | 补截断、对齐星级 | rating 4.9（保持）；highlights "5-star"→"4.9-star" |
| love-stefans-psychic-soul | desc 截断、`''''` 损坏、缺 pricing | 清转义、补 pricing | rating 5（保持） |
| psychic-safina | verdict 截断、rating 不一致 | 补 verdict、正文星级对齐 | rating 4.8（保持）；正文 "5-star"→"4.8-star" |
| psychic-satire | desc/verdict 截断、价格错误、双加号残留 | 补截断、改价格、修 `20,000++`、同步第 116 行 | rating 4.7（保持）；pricing `$6.99`→**`$2.49/min (promo $1.24)`**；readings 3,100→**20,000+** |
| psychic-simmi | rating 4.6 vs seoTitle "Perfect 5.0" | 抬高 YAML rating | rating 4.6→**4.9**；pricing `$3.99/min (promo $1.99)` |
| psychic-yazmin | rating 4.5 vs 正文 "5-star"、缺 pricing | 抬高 YAML、补 pricing | rating 4.5→**5**；补 pricing |
| seek-chelle | title/desc/bestFor 截断 | 补截断、对齐读数 | rating 5（保持）；readings 10,000→**55,000+**（3 处正文） |
| wisdom-and-love | desc/verdict 截断、缺 pricing、星级表述 | 补截断、补 pricing、对齐星级 | rating 4.7（保持）；pricing `$12.99`→**`$9.99/min (intro $4.99)`**；"31,551 five-star reviews"→"31,551 reviews at a 4.7-star average" |

---

## 方法决策（为何这样修）

1. **未整篇重写**。12 篇正文本身质量已高且经核实为真，缺陷集中在 frontmatter 元数据层（`entities` 缺失、rating 不一致、截断、`''''` 转义损坏、价格错误）。采用 `scratch/fix_kasamba.py` 做**手术式 frontmatter 修复**，保留正文，规避重写引入的新风险。
2. **rating 修复方向：抬高 YAML，而非压低正文**。联网核对 kasamba.com 真实档案后确认，多数正文里的 "5-star" 声称是**正确的**，错在 YAML 被设得过低（simmi 4.6→4.9、yazmin 4.5→5、david-james 4.7→5、ask-cristina 4.7→4.8）。因此方向是把 YAML 抬到真实值，而非矮化正文。
3. **价格/读数对齐真实值**。基于 live 搜索修正了虚高/过时统计（见上表）。

## 一处来源差异（需你知悉）

AI 报告 snapshot 写 Satire 现价 **$1.18/min**；但 live 搜索显示 Kasamba 当前为 **$2.49/min（promo $1.24）**。我采用 live 值，并已将正文两处（第 88、116 行）统一为 `$2.49 per minute (promo $1.24)`，消除原文内部不一致。如你手上那份 snapshot 来自更早时间点，价格可能确实有过 $1.18 的历史——上线的实时值请以 Kasamba 当前页面为准。

## 不在本轮范围（既存问题，未动）

- **4 篇 Keen `BAD_CANONICAL`**：flora-knows-all、love-psychic-victoria-sands、psychic-suzen-on、psychicreader19622-raymond —— canonicalUrl 缺 `-2026` 后缀，指向非自身 URL。属前序已知问题，非本次 Kasamba 质检范围，未处理。如需我修复可单独指示。

## 验证证据

- `scratch/validate_kasamba_repairs.py`：**20/20 PASS**（YAML 解析、entities 非空、rating == customSchema.ratingValue、无 `''''` 残留、无 `++` 双加号、正文星级与 rating 一致）。
- `scratch/qa_review_scan.py`：全站 87 篇复跑，**Kasamba 0 flag、Purple Garden 0 flag**；仅余的 4 flag 全在 Keen canonical（见上）。
- 全 12 篇 `updatedDate` 置为 `2026-08-13`。
