---
name: ea-pinterest-hook-pins
description: 为 easternalignment / MysticDo 批量制作 Pinterest 钩子 Pin 图并打包进 pins素材 发布系统的完整流程。当用户说「再做一批 pin」「pin 图换文案」「做第 N 批 pin」「把 pin 打包成能发的格式」时使用。覆盖：AI 底图 + 文字叠加渲染、钩子文案公式、按 pins素材 格式（00_文案_复制这里.txt + 打勾 CSV）打包、双号双域名规则。
---

# EA/MD Pinterest 钩子 Pin 生产线

## 资产位置（勿再找错）

- 生成模板（已入版本控制）：
  - `scripts/pinterest/pin-hook.html` — 钩子版（AI 底图 + 文字叠加），主力模板
  - `scripts/pinterest/pin-text-cards.html` — 白底文字卡版（品牌款，混发用）
  - `scripts/pinterest/bg/bg-XX.png` — AI 底图库
- 渲染产物：`scratch/social-kit/pins/out*/`（用完即删，最终交付以 pins素材 包为准）
- 发布包：`C:/Users/samja/Desktop/pins素材/`（用户的真实发布系统，见下）

## 出图流程（3 步）

1. **AI 底图**：ImageGen，`size: 1024x1536`（2:3），prompt 末尾加 `no text, no words`。
   - **人像必须写种族**：目标受众北美 18–38 女性 → prompt 写 `Caucasian woman in her late twenties`，否则默认出东亚脸（踩过两次）。
   - EA 底图 = 神秘物品特写（塔罗牌/烛光/水晶球/笔记本）；MD 底图 = 情绪场景（夜看手机/雨窗/未发送的消息）。
2. **文字叠加**：改 `pin-hook.html` 里 PINS 数组（bg/kicker/title/tcls/sub/cta/brand），
   文字永远用浏览器渲染（AI 生图的文字必乱码）。
3. **渲染**（chrome 必须 bash 启动，截图路径必须绝对路径）：
   ```bash
   for i in $(seq 0 N); do "C:/Program Files/Google/Chrome/Application/chrome.exe" \
     --headless=new --disable-gpu --hide-scrollbars --window-size=1000,1500 \
     --force-device-scale-factor=2 \
     --screenshot="C:\\绝对路径\\pin-$(printf '%02d' $i).png" \
     "file:///C:/.../scripts/pinterest/pin-hook.html?p=$i" 2>/dev/null; done
   ```
   产物 2000×3000。**每张都要 Read 视觉核验**（溢出/乱版/人脸）。

## 文案公式（用户已拍板，勿回退）

- **标题 = 用户原话问句**（Does He Love Me? / Why Did He Go Silent?），
  不用工具名做主标题（"Free 30-Second Pattern Check" 这类降级到副标题/按钮）。
  问句原句即 Pinterest 搜索词，有 SEO 加成。
- **kicker 黄标签 = 品类/场景词**（PSYCHIC READING / LOVE & TAROT / ASK A PSYCHIC? WAIT.）——
  1 秒品类识别，放这里成本最低。
- **副标题 = 免费承诺**（free 2-min Pattern Check / no card required）——占便宜感。
- **白色胶囊假按钮 = 行动**（Take the Free Check →）。
- 关键卖点词（FREE/数字/问句核心词）用 `.free` 黄色高亮。
- 合规红线：图上写 Free 必须落到真实免费项（平台新客分钟 / 免费 quiz），变了先改图再发。

## 打包进 pins素材 发布系统（格式已定型，照抄）

用户系统：`C:/Users/samja/Desktop/pins素材/`，主系统是 112 个 Carousel 的 28 天队列（01_每天的任务）。
新批次建独立编号目录（如 `05_钩子Pin_EA+MD双号/`），含：

- `00_先看我.txt` — 批次说明 + 双号规则 + Board 对照 + MD 新板描述
- `第NN天_YYYY-MM-DD/00_文案_复制这里.txt` — 严格复刻主系统格式：
  `【n / N】时间（美东）` / `账号：` / `Board：` / `图片（1 张）：1) xxx.png` /
  `▼ 标题 Title` / `▼ 描述 Description` / `▼ 目标链接 Link` / `▼ 图片 Alt 文字（可填可不填）`
  （Alt = Title + 描述第一句）；图片拷进当天文件夹，文件名不改
- `全部Pin总表_可打勾.csv` — 列：序号,第几天,日期,美东时间,账号,张数,图片列表,标题,描述,Alt,链接,Board,已发

## 铁律

1. **域名-账号绑定**：easternalignment.com 只从 EA 主号发；mysticdo.com 只从 MD 号发。
   交叉或开三号推同域名 = Pinterest「协同网络」封域名。
2. **UTM 口径跟主系统**：`utm_source=pinterest&utm_campaign={board-slug}&utm_content={slug}`，
   无 utm_medium；钩子 Pin 的 utm_content 加 `-hook` 后缀以便数据切分。
3. EA 侧 Board 用现有 12 个板（见 `02_备用资料/board名字和描述.csv`）；
   MD 侧板子需新建（描述在批次 00_先看我.txt 里给）。
4. 每天总量别超 6 条（含轮播队列），发不完顺延；4 条之间隔 30–60 分钟。
