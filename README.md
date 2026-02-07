# HK Credit Card Calculator

一個純前端（static）的香港信用卡回贈計算 + 進度追蹤工具。

## 功能

- 計算器：輸入金額、類別、是否網購/手機支付、交易日期，即時比較最佳回贈卡。
- Dashboard：顯示各推廣/任務進度、cap 用量、重置日提示。
- 記帳：把簽賬記錄到本機，並更新各種 usage counters（供 cap/任務判斷）。
- 匯出/匯入：備份 localStorage。

## 重要概念

- `tx.date`：記帳時間（timestamp）。
- `tx.txDate`：簽賬日（YYYY-MM-DD）。所有 period bucket（month/quarter/promo）同 holiday 判斷都以 `tx.txDate` 為準。

## Data 結構（最核心）

- 卡：`js/data_cards.js`
- 類別：`js/data_categories.js`
- 計回贈規則（Modules）：`js/data_modules.js`
- 任務/計數規則（Trackers）：`js/data_trackers.js`
- Dashboard 顯示（Campaigns）：`js/data_campaigns.js`
- Unified Offer View（derived）：`DATA.offers`（由 campaigns + special promo models + module rules 組裝）
- Counter/Period Registry（重置邏輯 metadata）：`js/data_counters.js`
- Data Bootstrap：`js/data_index.js`（組裝 `DATA`）

卡資料結構（Phase 7 之後）：

- `rewardModules`：只放計回贈用嘅 module id（對應 `DATA.modules`）。
- `trackers`：只放任務/計數用嘅 tracker id（對應 `DATA.trackers`）。

Campaign 建議明確填 `promo_type`（Phase 2A）：
- `mission_cap`：任務 + 單一 cap
- `mission_cap_rate`：任務 + `cap_rate`
- `mission_multi_cap`：任務 + 多個 cap
- `tiered_cap`：分 tier（例如冬日賞）
- `mission_uncapped`：有任務門檻但不設 cap（例如 DBS Black 推廣）
- `mission_only` / `custom`：特殊情況

`Travel Guru` 目前放喺 `SPECIAL_PROMO_MODELS.travel_guru`（`level_lifecycle`），
保留獨立 UI rendering，但 metadata 已可被 audit/validate。

## 開發/測試

1. 打開 `index.html`（或用任意 static server）。
1. 跑 golden tests（建議每次改 data/engine 都跑一次）：

```bash
node tools/run_golden_cases.js
```

1. 更新 golden expected（只喺你確定規則改動係 intended 時先用）：

```bash
node tools/run_golden_cases.js --update
```

## Notion Sync（用嚟 visualise 同方便改 data）

`tools/sync_notion.py` 會讀 repo 嘅 `DATA`（用 Node VM 跑 `js/data_index.js`），然後同步到你 Notion page 底下嘅 child databases（如果你有建立）。

1. 只輸出本地 JSON dump（唔需要 Notion token）：

```bash
python3 tools/sync_notion.py --dump .tmp_data_dump.json
```

1. 同步到 Notion（需要 Notion integration token）：

```bash
export NOTION_TOKEN='...'
python3 tools/sync_notion.py --page-url 'https://www.notion.so/...'
```

1. 支援嘅 database 名稱（建議用呢啲名；舊名亦會兼容）：

```text
Cards
Categories
Modules
Trackers
Campaigns (或 Promotions)
Campaign Sections (或 Promotion Sections)
Campaign Registry (或 Promo Registry)
Counters Registry (可選)
```

## Local Workbench（Notion 替代：本地 audit + 編輯）

如果 Notion 對複雜規則太難 audit，可以用本地 workbench：

1. 產生本地審核報告：

```bash
node tools/workbench.js audit
```

2. 匯出可檢查資料（+ 審核報告）：

```bash
node tools/workbench.js export
```

會產生：
- `tools/workbench_db.json`
- `reports/workbench_audit.md`

3. 產生可視化 HTML 報告（建議）：

```bash
node tools/workbench.js html
```

會產生：
- `reports/workbench.html`

4. 本地編輯 core overrides（不直接改 `js/data_*.js`）：

```bash
node tools/workbench.js apply --edits tools/workbench_edits.example.json --dry-run
node tools/workbench.js apply --edits tools/workbench_edits.example.json
```

預設會更新：`js/data_notion_core_overrides.js`

## 私隱

所有數據儲存在瀏覽器 localStorage，無後端、無伺服器儲存。

## 免責聲明

回贈計算只作估算；銀行條款/推廣會變；請自行核實，呢個 project 唔構成任何財務建議。

## License

MIT，見 `LICENSE`。
