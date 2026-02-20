# 🤖 AI Agent Guide (hk-creditcard-calculator)

呢份文件係俾其他 AI / coding agent 快速理解同安全地改呢個 repo 用。目標係：**改 data/logic 唔爆行為、可對數、可回滾、可擴展**。

---

## TL;DR（最重要規矩）

- 每次改 `js/` data/engine：必跑 `node tools/run_golden_cases.js`。
- 唔好隨便改 ID/key（例如 cardId、module key、cap_key、usage key）。改咗會影響 ledger 舊交易同 usage。
- Workbench 係「視覺化 + staging」，唔係唯一 source of truth；真正落地要變成 `js/data_*.js` 規則。
- `tx.txDate`（簽賬日）係 period/reset/holiday 的唯一基準；唔好用 `tx.date`（記帳時間）。
- `cap_mode` 要搞清楚：
  - `spending`：usage 存「簽帳金額」。
  - `reward`：usage 存「回贈本位單位」（例如 RC、分、點）。

---

## Repo 結構（你要改嘅地方通常喺邊）

- `/Users/wangheiip/Desktop/Work/hk-creditcard-calculator/index.html`
  - UI input（category、網上、支付方式、簽賬日期）
  - script load order（`data_*` → `data_overrides.js` → `data_index.js` → engine/UI）
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

## DATA Pipeline（重要：overrides 係點入到 app）

`js/data_index.js` 會組裝出全局 `DATA`：

1. 讀入 repo 原生資料：`data_cards/categories/modules/trackers/conversions/rules/campaigns`
2. 套 core overrides：`js/data_overrides.js`（由 `tools/workbench.js apply` 產生）
   - **只 allowlist** 安全欄位（例如 `desc/rate/cap_limit/.../promo_end/valid_to`）
   - 刻意唔俾直接改 `type/mode/match`（避免一改就爆計算邏輯）
3. build derived registries：`DATA.countersRegistry = buildCountersRegistry(DATA)`

所以：
- Workbench 係用嚟「改數字/描述/到期日」，但**任何 structural/logic change** 仍然要落返 `data_*.js`。

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

### 3) 點樣 review period

- 用 `node tools/workbench.js audit` 或 workbench HTML 睇 Counters Registry：
  - `Period Type` = `none/month/quarter/year/promo`
  - `Anchor` = JSON（startDay/startMonth/startDate/endDate…）
  - `Source/Ref Type/Ref ID` 用嚟追返邊個 module/tracker/campaign 生出嚟

---

## Promotions / Badges（點解有時「冇 badge」）

- Campaign cards（`js/data_campaigns.js`）嘅 badge 係由 `campaign.badge` + `campaign.period`/promo end date 決定。
- Remaining Caps cards（dashboard 最尾嗰堆）嘅 badge 係由 `DATA.countersRegistry[cap_key]` 計出 reset；如果 `periodType="none"`：
  - 有 `module.promo_end` / `module.valid_to` → 顯示「推廣期至 …」
  - 冇 end date → 顯示「不重置」

想有「推廣期至」badge：
- 最好係用 workbench 填 `Promo End` / `Valid To`，再 apply 落 repo（呢兩個欄位係 allowlist）。

---

## Notes（`note_zhhk` 點處理）

原則：`note_zhhk` 唔係用嚟 display（除非特別需要），而係：

- 用嚟記低「資料唔完整／規則未落地」
- 最終要轉做一個可執行嘅 rule

例子：

- 「要手機支付」→ `eligible_check`（用 `paymentMethod !== "physical"`）
- 「中國/澳門外幣手續費 0」→ card 加 `fcf_exempt_categories`，engine fee 計算要尊重 exemptions

---

## 常見坑（改之前先睇）

- Core overrides（`data_overrides.js`）會覆蓋 module 的 `desc/rate/cap_limit...`，所以你喺 repo 改咗 module，但 overrides 又寫住另一個值，就會「睇落冇改到」。
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

## Workbench（推薦工作流）

### 產生 workbench HTML（review + 編輯）

```bash
node tools/workbench.js html
open reports/workbench.html
```

### Apply edits 到 repo

```bash
node tools/workbench.js apply --edits <path>
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

---

## Agent Team

呢個 repo 有三個專責 agent 角色。每個 agent 有明確嘅 scope、guidelines 同 backlog。跨角色改動要遵守下面嘅 coordination rules。

---

### @ux — UX/UI Research

**職責：** 確保用戶可以方便、快速、直覺地獲取所需資訊。負責美觀度、可用性、無障礙設計。

**Scope 檔案：**
- `index.html` — HTML 結構、語義化、accessibility attributes
- `css/style.css` — 樣式系統、設計 tokens、responsive
- `js/ui.js` — UI rendering（calculator cards、dashboard progress、settings）
- `js/copy_zhhk.js` — 用戶介面文案集中管理

**Guidelines：**
- Accessibility：所有互動元素必須有 `aria-label`、`role`、`aria-selected`。觸控目標最少 44×44px（WCAG）。
- Responsive：mobile-first 設計，用 media queries 處理唔同 viewport。保留 safe-area-inset padding。
- 資訊密度：減少用戶操作步驟，smart grouping（例如合併交易類型 + 支付方式）。
- 美觀：設計 tokens 集中管理（CSS custom properties），progress bar 狀態要一致。
- 文案：所有 user-facing 文字歸入 `copy_zhhk.js`，唔好 hardcode 喺 `ui.js`。

**Backlog（按優先順序）：**

| # | 任務 | 位置 | 備註 |
|---|------|------|------|
| 1 | 加 `aria-label`、`role`、`aria-selected` 到所有互動元素 | `index.html` 全部 button/input/select | 目前幾乎全部冇 aria attributes |
| 2 | Tab bar 按鈕觸控目標加大到 44×44px | `index.html` lines 132-140 | 現時文字 10px，觸控區太細 |
| 3 | 簡化計算機表單步驟（合併交易類型 + 支付方式） | `js/ui.js` lines 2539-2702 | 目前要 6+ 步先有結果 |
| 4 | 完善 `copy_zhhk.js` 文案集中化 | `js/copy_zhhk.js` + `js/ui.js` | 目前只有 3 個 status string，但 UI 散佈 20+ 文字 |
| 5 | Settings 頁面分組摺疊（expandable sections） | `js/ui.js` lines 2704-3412 | 700+ 行 monolithic rendering |
| 6 | Wallet tone 顏色改用 CSS custom properties | `css/style.css` lines 164-177 | 13 組重複 gradient 定義 |
| 7 | 加 responsive media queries | `css/style.css` | 目前完全冇 breakpoint |
| 8 | 簡化 progress bar overlay 視覺 | `js/ui.js` lines 1410-1476 | 三種 overlay 類型視覺區別唔夠明顯 |
| 9 | 表單驗證回饋（amount > 0、視覺 error state） | `js/ui.js` + `index.html` | 目前無任何輸入驗證提示 |
| 10 | Dark mode 支援 | `css/style.css` | 所有顏色 hardcode light theme |

---

### @data — Data Flow Manager

**職責：** 確保數據流暢同安全。數據庫管理系統要易用、易維護。用戶要可以喺清晰、易視覺化嘅系統入面修改同更新數據。數據結構要支援到任何複雜規則。

**Scope 檔案：**
- `js/app.js` — localStorage 持久化、commitTransaction、resetCountersForPeriod、migrations、import/export
- `js/core.js` — loadUserData/saveUserData、userProfile 結構
- `js/data_index.js` — 數據組裝 pipeline、overrides 套用、allowlist
- `js/data_overrides.js` — Runtime config overrides（由 workbench 產生）
- `js/data_counters.js` — countersRegistry 自動建構
- `js/validate.js` — 數據完整性驗證
- `tools/` — workbench、export、quality report

**Guidelines：**
- 永遠唔好喺冇 backup/rollback 嘅情況下刪除 usage 數據。
- `data_index.js` 同 `tools/workbench.js` 嘅 allowlist 必須保持同步。
- Migration 要 idempotent、有序、可審計。
- Import 驗證要檢查：card ID 係咪存在、usage key 係咪 match registry、settings 有冇必要欄位、transaction array 大小限制。
- `_counter_periods` 係內部狀態——要文檔化同保護，防止外部污染。
- `tx.txDate`（簽賬日）係 period/reset/holiday 唯一基準；永遠唔好用 `tx.date`（記帳時間）。
- 任何 `userProfile` mutation 都應該 wrap 喺 try-catch 入面，失敗時 rollback。

**Backlog（按優先順序）：**

| # | 任務 | 位置 | 備註 |
|---|------|------|------|
| 1 | localStorage backup/recovery（保留最近 N 個版本 + checksum 驗證） | `js/core.js` lines 143-196 | 目前 save 直接覆蓋，冇恢復機制 |
| 2 | `rebuildUsageAndStatsFromTransactions()` 加 pre/post validation | `js/app.js` lines 468-538 | 目前 wipe all usage 再 rebuild，新 field 會被永久刪除 |
| 3 | 加強 import 驗證（card ID 存在性、usage key match、settings schema、tx array size） | `js/app.js` lines 1010-1061 | 目前只檢查頂層欄位存在 |
| 4 | 同步 `data_index.js` 同 `workbench.js` 嘅 allowlist | `js/data_index.js` lines 211-261 + `tools/workbench.js` lines 30-81 | 兩套 allowlist 可能 diverge |
| 5 | Destructive migration 加 try-catch + rollback | `js/app.js` lines 156-203 | 目前 migration 直接 delete，冇 undo |
| 6 | `validate.js` 加 cap_mode collision 檢測 | `js/validate.js` lines 616-638 | 兩個 module 共用 cap_key 但 cap_mode 唔同（reward vs spending）未被偵測 |
| 7 | Period reset 前保留歷史 counter 值 | `js/app.js` lines 240-304 | 目前跨 period 直接 delete counter，歷史數據永久消失 |
| 8 | 數據變更 audit trail（timestamp + diff log） | `js/app.js` + `js/core.js` | 目前完全冇變更記錄，debug 困難 |
| 9 | DRY `normalizePeriodSpec()` | `js/data_counters.js` + `js/data_index.js` + `js/app.js` | 同一邏輯三處重複 |
| 10 | 「Health Check」debug 界面（顯示所有 counter、period boundary、reset bucket key） | 新 UI section | 用戶同開發者都冇方法直接睇到 counter 狀態 |

---

### @logic — Logic/Calculation Manager

**職責：** 確保回贈計算準確跟足條款。準備好接入實驗性新功能（詳細商戶選擇、Effective Rebate Rate）。

**Scope 檔案：**
- `js/core.js` — 回贈計算引擎（`calculateResults`、`buildCardResult`、`evaluateModules`、cap enforcement）
- `js/engine_trackers.js` — Tracker 評估（mission delta 累計）
- `js/periods.js` + `js/period_policy.js` — Period/bucket 計算
- `js/data_modules.js` — 129 個 module 定義（rate/cap/mission/eligible_check）
- `js/data_rules.js` — 商業規則（zero reward categories、category aliases、card overrides）
- `tools/golden_cases.json` — 253 個 golden test cases

**Guidelines：**
- 每次改計算邏輯必跑 `node tools/run_golden_cases.js`。
- `--update` golden cases 只喺行為改動係 intended 同 reviewed 先用。
- `cap_mode` 區分至關重要：`spending` = usage 存簽帳金額；`reward` = usage 存回贈本位單位。
- `mode: "replace"` 取代 base rate；`mode: "add"` 疊加 bonus——永遠唔好搞混。
- Retroactive modules（`retroactive: true`）會喺 mission unlock 後回溯計算——必須測試 locked 同 unlocked 兩條路徑。
- Tracker evaluation 順序會影響結果——確保 deterministic ordering。
- 新 module type 要求：`evaluateModules()` 加 handler、`validate.js` 加驗證、golden cases 加測試。

**Backlog（按優先順序）：**

| # | 任務 | 位置 | 備註 |
|---|------|------|------|
| 1 | Secondary cap（`secondary_cap_key`）加入 result breakdown 顯示 | `js/core.js` lines 1311-1394 | 目前內部追蹤但用戶睇唔到 |
| 2 | 加 10+ golden test cases（multi-cap、retroactive+immediate、concurrent promos、period boundary） | `tools/golden_cases.json` | 253 cases 但部分場景覆蓋不足 |
| 3 | 🧪 **[實驗] 詳細商戶選擇**：merchant-aware `eligible_check` | `js/core.js` + `js/data_modules.js` | UI 將商戶 → category，`ctx.merchant` 傳入 eligible_check。module 可用 MCC 做精細排除 |
| 4 | 🧪 **[實驗] Effective Rebate Rate**：考慮全部任務所需簽賬嘅實際回贈率 | `js/core.js` `buildFinalResult()` | 用 `pendingUnlocks[]` + `usage[reqKey]` 計算混合回贈率：`(即時回贈 + 加權待解鎖回贈) / 任務總簽賬`。作為標準回贈率旁邊嘅第二指標顯示 |
| 5 | Tracker evaluation 確保 deterministic 順序 | `js/engine_trackers.js` | 多個 tracker 可能互相影響（A 更新 key → B 讀到新值），需要排序保證一致性 |
| 6 | Partial cap 浮點精度修正 | `js/core.js` lines 1334, 1387 | `remaining / amount` 可產生 fractional rate，中間計算未 round |
| 7 | 新 module type schema registry 驗證 | `js/validate.js` + `js/core.js` | 目前加新 type 唔會被 validate.js catch 到 |
| 8 | Module type dispatch 改為 registry pattern | `js/core.js` `evaluateModules()` | 目前 if/else chain，擴展性差 |
| 9 | Category hierarchy 支援多層（>1 level） | `js/core.js` `isCategoryMatch()` lines 992-1004 | 目前只 check 一層 parent |
| 10 | Composite rule composition 支援（declarative 組合 rate-capping + mission-locking） | `js/data_modules.js` + `js/core.js` | 長期目標：減少新 promo 嘅 hardcode |

---

## Agent 協調規則

### 1. Golden tests 係合約
任何 agent 改計算行為必須更新 golden cases。改 UI 嘅 agent 要驗證 dashboard progress rendering 同 golden output 一致。

### 2. Data schema 改動要跨 agent review
如果 `@data` 改咗 userProfile 結構，`@logic` 要驗證計算兼容性，`@ux` 要驗證 UI rendering。

### 3. Module 改動流程
`@logic` 定義規則（`data_modules.js`）→ `@data` 確保 counters/periods registered → `@ux` 確保 dashboard 正確顯示。

### 4. 實驗功能 gating
新實驗功能（商戶選擇、effective rate）必須用 `setting_key` toggle 控制，可以獨立開關。

### 5. 跨 scope 檔案
- `js/core.js`：`@logic`（計算引擎）同 `@data`（userProfile load/save）共管。改計算要 `@logic` lead；改數據持久化要 `@data` lead。
- `js/ui.js`：`@ux` 主導，但如果涉及 dashboard 數據顯示邏輯（例如 cap 進度計算），需要 `@logic` review。
- `index.html`：`@ux` 主導。

