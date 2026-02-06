# 🤖 AI Agent Guide (hk-creditcard-calculator)

呢份文件係俾其他 AI / coding agent 快速理解同安全地改呢個 repo 用。目標係：**改 data/logic 唔爆行為、可對數、可回滾、可擴展**。

---

## TL;DR（最重要規矩）

- 每次改 `js/` data/engine：必跑 `node tools/run_golden_cases.js`。
- 唔好隨便改 ID/key（例如 cardId、module key、cap_key、usage key）。改咗會影響 ledger 舊交易同 usage。
- Notion 係「視覺化 + staging」，唔係唯一 source of truth；真正落地要變成 `js/data_*.js` 規則。
- `tx.txDate`（簽賬日）係 period/reset/holiday 的唯一基準；唔好用 `tx.date`（記帳時間）。
- `cap_mode` 要搞清楚：
  - `spending`：usage 存「簽帳金額」。
  - `reward`：usage 存「回贈本位單位」（例如 RC、分、點）。

---

## Repo 結構（你要改嘅地方通常喺邊）

- `/Users/wangheiip/Desktop/Work/hk-creditcard-calculator/index.html`
  - UI input（category、網上、支付方式、簽賬日期）
  - script load order（`data_*` → Notion overrides → `data_index.js` → engine/UI）
- `/Users/wangheiip/Desktop/Work/hk-creditcard-calculator/js/data_cards.js`
  - cards list（卡名、幣種、FCF、掛邊啲 modules/trackers）
- `/Users/wangheiip/Desktop/Work/hk-creditcard-calculator/js/data_categories.js`
  - category 定義（label、order、parent hierarchy、hidden、req gating）
- `/Users/wangheiip/Desktop/Work/hk-creditcard-calculator/js/data_modules.js`
  - 計回贈規則（核心：type/match/mode/rate/cap/mission/eligible_check）
- `/Users/wangheiip/Desktop/Work/hk-creditcard-calculator/js/data_trackers.js`
  - 任務／門檻 tracking（missionTags、counter.period、promo_end）
- `/Users/wangheiip/Desktop/Work/hk-creditcard-calculator/js/data_campaigns.js`
  - dashboard cards（只係顯示用 metadata；唔係 engine）
- `/Users/wangheiip/Desktop/Work/hk-creditcard-calculator/js/data_counters.js`
  - 自動 build `DATA.countersRegistry`（每個 usage key 的 period/reset metadata）
- `/Users/wangheiip/Desktop/Work/hk-creditcard-calculator/js/periods.js`
  - bucket key 算法（支援 `month/quarter/year/promo`）
- `/Users/wangheiip/Desktop/Work/hk-creditcard-calculator/js/core.js`
  - 回贈計算 engine（module apply、cap、mission、foreign fee）
- `/Users/wangheiip/Desktop/Work/hk-creditcard-calculator/js/app.js`
  - localStorage、commitTransaction、resetCountersForPeriod、init
- `/Users/wangheiip/Desktop/Work/hk-creditcard-calculator/js/ui.js`
  - UI rendering（calculator cards、dashboard progress cards、badges）
- `/Users/wangheiip/Desktop/Work/hk-creditcard-calculator/js/validate.js`
  - data validation（必要時開 strict warnings）

---

## DATA Pipeline（重要：Notion overrides 係點入到 app）

`js/data_index.js` 會組裝出全局 `DATA`：

1. 讀入 repo 原生資料：`data_cards/categories/modules/trackers/conversions/rules/campaigns`
2. 套 Notion core overrides：`js/data_notion_core_overrides.js`
   - **只 allowlist** 安全欄位（例如 `desc/rate/cap_limit/.../promo_end/valid_to`）
   - 刻意唔俾 Notion 直接改 `type/mode/match`（避免一改就爆計算邏輯）
3. 套 Notion metadata overrides：`js/data_notion_overrides.js`
   - `display_name_zhhk/note_zhhk/status/last_verified_at/source_url/unit_override...`
4. build derived registries：`DATA.countersRegistry = buildCountersRegistry(DATA)`

所以：
- Notion 係用嚟「改數字/描述/到期日」同「記低 note」，但**任何 structural/logic change** 仍然要落返 `data_*.js`。

---

## Period / Reset（點樣設定、點樣 review）

### 1) Source of truth

- module cap reset：`js/data_modules.js` 入面：
  - `cap: { key, period: "month" }`
  - `cap: { key, period: { type: "month", startDay: 20 } }`
  - `cap: { key, period: { type: "quarter", startMonth: 1, startDay: 1 } }`
  - `cap: { key, period: { type: "year", startMonth: 1, startDay: 1 } }`
- tracker counters reset：`js/data_trackers.js` 入面 `counter.period`
- promo/campaign reset：`js/data_campaigns.js` 入面 `campaign.period`（for UI sections)

### 2) Engine reset 實際做法

`js/app.js` 會喺 init call：

- `resetCountersForPeriod("month")`
- `resetCountersForPeriod("quarter")`
- `resetCountersForPeriod("year")`
- `resetCountersForPeriod("promo")`

用 `DATA.countersRegistry` 去 decide「邊啲 key 要 reset」同 bucket key。

### 3) 點樣喺 Notion review period

- repo → Notion sync 之後，睇 Notion `Counters Registry` DB：
  - `Period Type` = `none/month/quarter/year/promo`
  - `Anchor` = JSON（startDay/startMonth/startDate/endDate…）
  - `Source/Ref Type/Ref ID` 用嚟追返邊個 module/tracker/campaign 生出嚟

注意：Notion 入面改 `Counters Registry` 暫時係 **唔會** push 返 repo 生效（目前只係 review/visualize）。

---

## Promotions / Badges（點解有時「冇 badge」）

- Campaign cards（`js/data_campaigns.js`）嘅 badge 係由 `campaign.badge` + `campaign.period`/promo end date 決定。
- Remaining Caps cards（dashboard 最尾嗰堆）嘅 badge 係由 `DATA.countersRegistry[cap_key]` 計出 reset；如果 `periodType="none"`：
  - 有 `module.promo_end` / `module.valid_to` → 顯示「推廣期至 …」
  - 冇 end date → 顯示「不重置」

想有「推廣期至」badge：
- 最好係喺 Notion `Modules` 填 `Promo End` / `Valid To`，再 `--pull-core` 落 repo（呢兩個欄位係 allowlist）。

---

## Notes（Notion `note_zhhk` 點處理）

原則：`note_zhhk` 唔係用嚟 display（除非特別需要），而係：

- 用嚟記低「資料唔完整／規則未落地」
- 最終要轉做一個可執行嘅 rule

例子：

- 「要手機支付」→ `eligible_check`（用 `paymentMethod !== "physical"`）
- 「中國/澳門外幣手續費 0」→ card 加 `fcf_exempt_categories`，engine fee 計算要尊重 exemptions

---

## 常見坑（改之前先睇）

- Notion core overrides 會覆蓋 module 的 `desc/rate/cap_limit...`，所以你喺 repo 改咗 module，但 Notion 又寫住另一個值，就會「睇落冇改到」。
- `mode:"replace"` vs `mode:"add"`：
  - replace 類型通常應該取代 base rate（例如某些特選類別）
  - add 類型係疊加 bonus（例如 +1.5% 推廣）
- `req_mission_*` 會影響 locked/potential 計算；預設 retroactive = true（除非 `retroactive:false`）
- 交易輸入：
  - `paymentMethod` 有 `physical/apple_pay/google_pay/samsung_pay/unionpay_cloud/omycard`
  - `isMobilePay` 係由 `paymentMethod !== "physical"` 推導（同 `app.js` / golden runner 一致）
- 外幣手續費：
  - foreign detection 用 category hierarchy（`overseas` ancestry）
  - exempt 用 `card.fcf_exempt_categories`

---

## 測試/對數（必做）

### Golden cases

```bash
node tools/run_golden_cases.js
```

只喺你非常肯定「行為改動係 intended」先用：

```bash
node tools/run_golden_cases.js --update
```

### Data validation

開發期如要更嚴：
- 可以喺 `DATA.debug.strictPeriods = true`（例如暫時加喺 `js/data_index.js`）睇 warnings（記得最後唔好長期開到好嘈）。

---

## Notion Sync（推薦工作流）

### repo → Notion（refresh DB for review）

```bash
export NOTION_TOKEN='...'
python3 tools/sync_notion.py --page-url "https://www.notion.so/..."
```

### Notion → repo（pull）

- 改完 row 後 tick `Sync To Repo`
- 推薦用一次過 pull（避免 ack 順序問題）：

```bash
python3 tools/sync_notion.py --page-url "https://www.notion.so/..." --pull-all --ack
```

只拉 modules core（數值/描述/到期日）：

```bash
python3 tools/sync_notion.py --page-url "https://www.notion.so/..." --pull-core --core-db modules --ack
```

然後：
- 跑 golden
- 如果 note 係「未落地規則」，就落地（改 `data_modules.js` / engine）
- commit + push

---

## Copy/語言

- UI/文案以「繁體香港」為主。
- Emoji 可以保留（呢個 repo 已經大量使用）。
- 單位：
  - 簽賬／任務一律用 `$`
  - 回贈單位優先跟 card redemption unit（例如 `RC/里/分`）；cash fallback 用 `$`

