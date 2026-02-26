// app.js - Main Controller

// --- STATE ---
let currentMode = 'miles';
// userProfile is defined in core.js (V9.2)

function getTodayIsoDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function ensureTxDateInputDefault() {
    const txDateInput = document.getElementById('tx-date');
    if (txDateInput && !txDateInput.value) txDateInput.value = getTodayIsoDate();
    return txDateInput;
}

window.showToast = function (message, type = 'info', duration = 2200) {
    const root = document.getElementById('toast-root');
    if (!root) {
        if (type === 'error') console.error(message);
        else console.log(message);
        return;
    }
    const toast = document.createElement('div');
    const safeType = ['info', 'success', 'warning', 'error'].includes(type) ? type : 'info';
    toast.className = `toast toast-${safeType}`;
    toast.textContent = String(message || '');
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    root.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(6px)';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 220);
    }, Math.max(1200, Number(duration) || 2200));
}

// --- INIT ---
function checkDependencies() {
    const missing = [];
    // Data
    if (typeof DATA === "undefined" || !DATA) missing.push("DATA");
    else {
        if (!DATA.modules) missing.push("DATA.modules");
        if (!DATA.cards) missing.push("DATA.cards");
        if (!DATA.countersRegistry) missing.push("DATA.countersRegistry");
        if (!DATA.periodPolicy) missing.push("DATA.periodPolicy");
    }
    // Functions from core.js
    if (typeof validateData !== "function") missing.push("validateData");
    if (typeof evaluateTrackers !== "function") missing.push("evaluateTrackers");
    if (typeof getBucketKey !== "function") missing.push("getBucketKey");
    if (typeof isCategoryMatch !== "function") missing.push("isCategoryMatch");
    if (typeof ensureBooleanSettingDefaults !== "function") missing.push("ensureBooleanSettingDefaults");
    if (typeof buildCardResult !== "function") missing.push("buildCardResult");
    if (typeof calculateResults !== "function") missing.push("calculateResults");
    // HolidayManager
    if (typeof HolidayManager === "undefined") missing.push("HolidayManager");
    if (missing.length > 0) {
        const msg = "[init] Missing dependencies: " + missing.join(", ");
        console.error(msg);
        throw new Error(msg);
    }
}

function init() {
    checkDependencies();
    const shouldValidate = !(DATA.debug && DATA.debug.validate === false);
    if (shouldValidate) {
        validateData(DATA);
        if (typeof validateUsageKeys === "function") validateUsageKeys(DATA);
    }
    loadUserData();
    const guruUsageKeys = getGuruUsageKeys();
    if (!userProfile.usage[guruUsageKeys.spendKey]) userProfile.usage[guruUsageKeys.spendKey] = 0;
    if (!userProfile.usage[guruUsageKeys.rewardKey]) userProfile.usage[guruUsageKeys.rewardKey] = 0;
    if (!userProfile.usage.spend_guru_unlock) userProfile.usage.spend_guru_unlock = 0;
    ensureBooleanSettingDefaults(userProfile.settings);
    if (userProfile.settings.deduct_fcf_ranking === undefined) userProfile.settings.deduct_fcf_ranking = false;
    if (userProfile.settings.settings_focus_card === undefined) userProfile.settings.settings_focus_card = "";
    if (userProfile.settings.settings_detail_mode === undefined) userProfile.settings.settings_detail_mode = false;
    if (userProfile.settings.settings_wallet_edit_mode === undefined) userProfile.settings.settings_wallet_edit_mode = false;
    if (userProfile.settings.settings_wallet_add_open === undefined) userProfile.settings.settings_wallet_add_open = false;
    if (userProfile.settings.wallet_remove_confirm_disabled === undefined) userProfile.settings.wallet_remove_confirm_disabled = false;
    if (!userProfile.settings.settings_wallet_add_groups || typeof userProfile.settings.settings_wallet_add_groups !== "object") {
        userProfile.settings.settings_wallet_add_groups = {};
    }
    if (userProfile.settings.dashboard_focus_card === undefined) userProfile.settings.dashboard_focus_card = "";
    if (userProfile.settings.dashboard_detail_mode === undefined) userProfile.settings.dashboard_detail_mode = false;
    {
        const allowed = ["month", "quarter", "year", "all"];
        const period = String(userProfile.settings.dashboard_period || "month");
        userProfile.settings.dashboard_period = allowed.includes(period) ? period : "month";
    }
    {
        const allowed = ["dining", "electronics", "entertainment"];
        const raw = Array.isArray(userProfile.settings.mmpower_selected_categories)
            ? userProfile.settings.mmpower_selected_categories.map(x => String(x))
            : [];
        const normalized = Array.from(new Set(raw.filter(x => allowed.includes(x)))).slice(0, 2);
        userProfile.settings.mmpower_selected_categories = normalized.length > 0 ? normalized : ["dining", "electronics"];
    }
    {
        const allowed = ["mobile_pay", "travel", "overseas", "online_entertainment"];
        const selected = String(userProfile.settings.wewa_selected_category || "mobile_pay");
        userProfile.settings.wewa_selected_category = allowed.includes(selected) ? selected : "mobile_pay";
    }
    {
        const allowed = ["cashback", "miles"];
        const mode = String(userProfile.settings.mox_reward_mode || "cashback");
        userProfile.settings.mox_reward_mode = allowed.includes(mode) ? mode : "cashback";
    }
    if (userProfile.settings.citi_prestige_bonus_enabled === undefined) userProfile.settings.citi_prestige_bonus_enabled = false;
    if (userProfile.settings.citi_prestige_tenure_years === undefined) userProfile.settings.citi_prestige_tenure_years = 1;
    if (userProfile.settings.citi_prestige_wealth_client === undefined) userProfile.settings.citi_prestige_wealth_client = false;
    migrateWinterUsage();
    migrateCathayCxuoQuarterly();
    migrateDualCapUsageTracking();
    resetCountersForPeriod("month");
    resetCountersForPeriod("quarter");
    resetCountersForPeriod("year");
    resetCountersForPeriod("promo");
    validateUsageRegistry();

    // Initial Render
    refreshUI();
    ensureTxDateInputDefault();
    if (userProfile.ownedCards.length === 0) switchTab('settings');

    // Initialize holidays in background; rerun calc when ready
    if (typeof HolidayManager !== 'undefined' && HolidayManager.init) {
        HolidayManager.init().then(() => {
            if (typeof runCalc === 'function') runCalc();
        });
    }
}

function getGuruUsageKeys() {
    return getTravelGuruUsageKeys();
}

function isGuruOverseasCategory(category) {
    return isCategoryMatch(["overseas"], category);
}

function isGuruEligibleSpend(category, isOnline) {
    return !isOnline && isGuruOverseasCategory(category);
}

function isWinterPromoEligibleCard(cardId) {
    const cid = String(cardId || "").trim();
    if (!cid || !DATA || !Array.isArray(DATA.cards)) return false;
    const card = DATA.cards.find((c) => c && c.id === cid);
    return !!(card && Array.isArray(card.trackers) && card.trackers.includes("winter_tracker"));
}

function migrateWinterUsage() {
    if (!userProfile.usage) userProfile.usage = {};
    if (userProfile.usage.winter_recalc_v5) return;
    let total = 0;
    let eligible = 0;
    if (Array.isArray(userProfile.transactions)) {
        userProfile.transactions.forEach(tx => {
            const amt = Number(tx.amount) || 0;
            if (amt <= 0) return;
            const cardId = String(tx.cardId || "").trim();
            if (!isWinterPromoEligibleCard(cardId)) return;
            const cat = tx.category;
            const txDate = String(tx.txDate || (tx.date ? new Date(tx.date).toISOString().slice(0, 10) : "")).trim();
            const txCtx = {
                txDate,
                isOnline: !!tx.isOnline,
                merchantId: tx.merchantId || "",
                cardId
            };
            const countsForThreshold = (typeof isWinterPromoTrackerEligible === "function")
                ? !!isWinterPromoTrackerEligible(cat, txCtx)
                : true;
            if (!countsForThreshold) return;
            total += amt;
            const countsForReward = (typeof isWinterPromoRewardEligibleCategory === "function")
                ? !!isWinterPromoRewardEligibleCategory(cat)
                : isCategoryMatch(["dining", "overseas"], cat);
            if (countsForReward) eligible += amt;
        });
    }
    userProfile.usage.winter_total = total;
    userProfile.usage.winter_eligible = eligible;
    userProfile.usage.winter_recalc_v2 = true;
    userProfile.usage.winter_recalc_v3 = true;
    userProfile.usage.winter_recalc_v4 = true;
    userProfile.usage.winter_recalc_v5 = true;
    saveUserData();
}

function migrateDualCapUsageTracking() {
    if (!userProfile.usage) userProfile.usage = {};
    if (userProfile.usage.dual_cap_tracking_v1) return;
    rebuildUsageAndStatsFromTransactions();
    userProfile.usage.dual_cap_tracking_v1 = true;
    saveUserData();
}

function migrateCathayCxuoQuarterly() {
    if (!userProfile.usage) userProfile.usage = {};
    if (userProfile.usage.sc_cathay_cxuo_quarterly_v1) return;

    const p2Spend = Number(userProfile.usage.sc_cathay_cxuo_spend_p2) || 0;
    const p2Bonus = Number(userProfile.usage.sc_cathay_cxuo_bonus_cap_p2) || 0;
    if (p2Spend > 0) {
        userProfile.usage.sc_cathay_cxuo_spend = (Number(userProfile.usage.sc_cathay_cxuo_spend) || 0) + p2Spend;
    }
    if (p2Bonus > 0) {
        userProfile.usage.sc_cathay_cxuo_bonus_cap = (Number(userProfile.usage.sc_cathay_cxuo_bonus_cap) || 0) + p2Bonus;
    }
    delete userProfile.usage.sc_cathay_cxuo_spend_p2;
    delete userProfile.usage.sc_cathay_cxuo_bonus_cap_p2;

    userProfile.usage.sc_cathay_cxuo_quarterly_v1 = true;
    saveUserData();
}

function getMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getCountersRegistry() {
    return DATA.countersRegistry || {};
}

function resolveAnchorForKey(key, entry) {
    const defaults = DATA.periodDefaults || {};
    const overrides = (userProfile.settings && userProfile.settings.periodOverrides) ? userProfile.settings.periodOverrides : {};

    let override = null;
    if (overrides.byKey && overrides.byKey[key]) {
        override = overrides.byKey[key];
    }
    if (!override && entry && entry.refType === "module" && overrides.modules && overrides.modules[entry.refId]) {
        override = overrides.modules[entry.refId];
    }
    if (!override && entry && (entry.refType === "promo" || entry.refType === "campaign") && overrides.byCampaignId && overrides.byCampaignId[entry.refId]) {
        override = overrides.byCampaignId[entry.refId];
    }
    if (!override && entry && entry.refType === "promo" && overrides.promos && overrides.promos[entry.refId]) {
        override = overrides.promos[entry.refId];
    }

    const base = override || entry.anchorRef || (entry.periodType ? defaults[entry.periodType] : null) || null;
    if (!base) return null;
    const normalized = { ...base };
    if (!normalized.type) normalized.type = entry.periodType;
    if (entry && (entry.refType === "promo" || entry.refType === "campaign") && entry.refId) normalized.promoId = entry.refId;
    return normalized;
}

function migrateCounterPeriods() {
    if (!userProfile.usage) userProfile.usage = {};
    if (!userProfile.usage._counter_periods) userProfile.usage._counter_periods = {};
    const periods = userProfile.usage._counter_periods;
    if (!periods.month) {
        const legacyMonth = userProfile.usage.monthly_cap_month || userProfile.usage.red_cap_month || userProfile.usage.bea_month;
        if (legacyMonth) periods.month = legacyMonth;
    }
    if (!periods.byKey) {
        periods.byKey = {};
        const legacyMonth = periods.month;
        if (legacyMonth) {
            const registry = getCountersRegistry();
            Object.keys(registry).forEach((key) => {
                const entry = registry[key];
                if (!entry || entry.periodType !== "month") return;
                const anchor = resolveAnchorForKey(key, entry);
                const bucketKey = legacyMonthToBucketKey(legacyMonth, anchor);
                if (bucketKey) periods.byKey[key] = bucketKey;
            });
        }
    }

    if (periods.quarter && periods.byKey) {
        const legacyQuarter = periods.quarter;
        const registry = getCountersRegistry();
        Object.keys(registry).forEach((key) => {
            const entry = registry[key];
            if (!entry || entry.periodType !== "quarter") return;
            const anchor = resolveAnchorForKey(key, entry);
            const bucketKey = legacyQuarterToBucketKey(legacyQuarter, anchor);
            if (bucketKey && !periods.byKey[key]) periods.byKey[key] = bucketKey;
        });
    }
}

function resetCountersForPeriod(period) {
    if (!userProfile.usage) userProfile.usage = {};
    migrateCounterPeriods();
    const registry = getCountersRegistry();
    const byKey = (userProfile.usage._counter_periods || {}).byKey || {};
    const today = new Date();

    const keys = Object.keys(registry).filter((k) => registry[k] && registry[k].periodType === period);
    if (keys.length === 0) return;

    keys.forEach((key) => {
        const entry = registry[key];
        const anchor = resolveAnchorForKey(key, entry);
        const bucketKey = getBucketKey(today, period, anchor, anchor && anchor.promoId);
        if (!bucketKey) return;
        if (!Object.prototype.hasOwnProperty.call(byKey, key)) {
            byKey[key] = bucketKey;
            return;
        }
        if (byKey[key] !== bucketKey) {
            delete userProfile.usage[key];
            byKey[key] = bucketKey;
        }
    });

    if (!userProfile.usage._counter_periods) userProfile.usage._counter_periods = {};
    userProfile.usage._counter_periods.byKey = byKey;
    saveUserData();
}

function validateUsageRegistry() {
    const registry = getCountersRegistry();
    const usage = userProfile.usage || {};
    const internalKeys = new Set([
        "_counter_periods",
        "monthly_cap_month",
        "red_cap_month",
        "bea_month",
        "winter_recalc_v2",
        "winter_recalc_v3",
        "winter_recalc_v4",
        "winter_recalc_v5",
        "dual_cap_tracking_v1",
        "sc_cathay_cxuo_quarterly_v1"
    ]);
    const unknown = Object.keys(usage).filter(k => !internalKeys.has(k) && !registry[k] && !String(k).startsWith("spend_"));
    if (unknown.length) {
        console.warn("[warn] usage keys missing from countersRegistry:", unknown.join(", "));
    }
}


// --- CORE ACTIONS ---

// loadUserData and saveUserData are inherited from core.js (V9.2) to match new data structure

function refreshUI() {
    if (!userProfile.transactions || userProfile.transactions.length === 0) {
        clearUsageAndStats();
        saveUserData();
    }
    renderSettings(userProfile);
    renderDashboard(userProfile)

    // Dynamically update categories based on owned cards
    if (typeof updateCategoryDropdown === 'function') updateCategoryDropdown(userProfile.ownedCards);
    if (typeof populateCurrencyDropdown === 'function') populateCurrencyDropdown();

    const feeToggle = document.getElementById('toggle-fee-deduct');
    if (feeToggle) feeToggle.checked = !!userProfile.settings.deduct_fcf_ranking;
    const feeWrap = document.getElementById('fee-deduct-wrap');
    if (feeWrap) {
        if (currentMode === 'cash') feeWrap.classList.remove('hidden');
        else feeWrap.classList.add('hidden');
    }

    runCalc();
}

function clearUsageAndStats() {
    const prevUsage = userProfile.usage || {};
    userProfile.usage = {};
    if (prevUsage._counter_periods) userProfile.usage._counter_periods = prevUsage._counter_periods;
    if (prevUsage.red_cap_month) userProfile.usage.red_cap_month = prevUsage.red_cap_month;
    if (prevUsage.bea_month) userProfile.usage.bea_month = prevUsage.bea_month;
    if (prevUsage.monthly_cap_month) userProfile.usage.monthly_cap_month = prevUsage.monthly_cap_month;
    if (prevUsage.winter_recalc_v2) userProfile.usage.winter_recalc_v2 = prevUsage.winter_recalc_v2;
    if (prevUsage.winter_recalc_v3) userProfile.usage.winter_recalc_v3 = prevUsage.winter_recalc_v3;
    if (prevUsage.winter_recalc_v4) userProfile.usage.winter_recalc_v4 = prevUsage.winter_recalc_v4;
    if (prevUsage.winter_recalc_v5) userProfile.usage.winter_recalc_v5 = prevUsage.winter_recalc_v5;
    if (prevUsage.dual_cap_tracking_v1) userProfile.usage.dual_cap_tracking_v1 = prevUsage.dual_cap_tracking_v1;
    if (prevUsage.sc_cathay_cxuo_quarterly_v1) userProfile.usage.sc_cathay_cxuo_quarterly_v1 = prevUsage.sc_cathay_cxuo_quarterly_v1;
    userProfile.stats = { totalSpend: 0, totalVal: 0, txCount: 0 };
}

// --- EVENT HANDLERS (Exposed to Window for HTML onclick) ---

window.switchTab = function (t) {
    // Hide all, Show one
    document.querySelectorAll('.tab-content').forEach(e => e.classList.add('hidden'));
    document.getElementById(`view-${t}`).classList.remove('hidden');

    // Update Buttons
    document.querySelectorAll('.tab-btn').forEach(e => {
        e.classList.replace('text-stone-700', 'text-gray-400');
        e.setAttribute('aria-selected', 'false');
    });
    const activeBtn = document.getElementById(`btn-${t}`);
    activeBtn.classList.replace('text-gray-400', 'text-stone-700');
    activeBtn.setAttribute('aria-selected', 'true');

    if (t === 'dashboard') renderDashboard(userProfile);
    if (t === 'ledger') renderLedger(userProfile.transactions);
    if (t === 'calculator') ensureTxDateInputDefault();
}

window.toggleMode = function (m) {
    currentMode = m;
    document.getElementById('btn-mode-miles').className = m === 'miles' ? "px-4 py-1.5 rounded-md transition-all bg-white text-blue-600 shadow-sm" : "px-4 py-1.5 rounded-md transition-all text-gray-500";
    document.getElementById('btn-mode-cash').className = m === 'cash' ? "px-4 py-1.5 rounded-md transition-all bg-white text-blue-600 shadow-sm" : "px-4 py-1.5 rounded-md transition-all text-gray-500";
    const feeWrap = document.getElementById('fee-deduct-wrap');
    if (feeWrap) {
        if (m === 'cash') feeWrap.classList.remove('hidden');
        else feeWrap.classList.add('hidden');
    }
    runCalc();
}

// Debounce counter to discard stale async results
let _runCalcSeq = 0;

window.runCalc = async function () {
    const seq = ++_runCalcSeq;
    const foreignAmt = parseFloat(document.getElementById('amount').value) || 0;
    let cat = document.getElementById('category').value;
    const onlineToggle = document.getElementById('tx-online');
    const isOnline = onlineToggle ? !!onlineToggle.checked : false;
    const paymentSelect = document.getElementById('tx-payment');
    const paymentMethod = paymentSelect ? paymentSelect.value : "physical";
    const isMobilePay = paymentMethod !== "physical";
    const txDateInput = document.getElementById('tx-date');
    const txDateRaw = txDateInput ? txDateInput.value : "";
    const txDate = txDateRaw || getTodayIsoDate();

    // Auto-detect Holiday
    const isHoliday = HolidayManager.isHoliday(txDate);

    // Update Badge UI
    const badge = document.getElementById('holiday-badge');
    if (badge) {
        if (txDateRaw && isHoliday) badge.classList.remove('hidden');
        else badge.classList.add('hidden');
    }

    // Resolve currency selection — read from separate #tx-currency picker
    const currencySelect = document.getElementById('tx-currency');
    const selectedCurrencyCode = currencySelect ? currencySelect.value : "HKD";
    let selectedCurrency = null;
    let hkdAmount = foreignAmt;
    let fxRates = null; // Map<cardType, rateResult>

    if (selectedCurrencyCode !== "HKD") {
        selectedCurrency = selectedCurrencyCode;
        const currDef = (typeof DATA !== "undefined" && DATA.currencies) ? DATA.currencies[selectedCurrencyCode] : null;
        // Override category to overseas based on currency
        cat = currDef && currDef.category ? currDef.category : "overseas_other";

        if (selectedCurrencyCode !== "_OTHER" && typeof ExchangeRateService !== "undefined") {
            // Collect unique card types from owned cards to batch-fetch rates
            const ownedCardTypes = [];
            if (userProfile && userProfile.ownedCards && DATA && DATA.cards) {
                userProfile.ownedCards.forEach(cid => {
                    const c = DATA.cards.find(x => x.id === cid);
                    if (c && c.type && !ownedCardTypes.includes(c.type)) ownedCardTypes.push(c.type);
                });
            }
            if (ownedCardTypes.length === 0) ownedCardTypes.push("master");

            fxRates = await ExchangeRateService.getRatesForCardTypes(selectedCurrencyCode, ownedCardTypes, txDate);

            // Stale check — if user changed inputs while we were fetching, discard
            if (seq !== _runCalcSeq) return;

            // Use first available rate to compute a representative HKD amount for ranking
            const firstRate = fxRates.values().next().value;
            hkdAmount = (firstRate && firstRate.rate) ? foreignAmt * firstRate.rate : foreignAmt;

            // Update conversion hint
            const hintEl = document.getElementById('fx-conversion-hint');
            if (hintEl && firstRate && firstRate.rate) {
                hintEl.textContent = "≈ HK$" + (hkdAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                hintEl.classList.remove('hidden');
            } else if (hintEl) {
                hintEl.textContent = "匯率暫時未能載入";
                hintEl.classList.remove('hidden');
            }
        }
    }

    // Calls core.js function
    const merchantId = (typeof window.getEffectiveMerchantId === "function")
        ? window.getEffectiveMerchantId()
        : (window.__selectedMerchantId || null);
    const results = calculateResults(hkdAmount, cat, currentMode, userProfile, txDate, isHoliday, {
        deductFcfForRanking: !!userProfile.settings.deduct_fcf_ranking && currentMode === 'cash',
        isOnline,
        isMobilePay,
        paymentMethod,
        merchantId,
        selectedCurrency,
        foreignAmount: selectedCurrency ? foreignAmt : null,
        fxRates: fxRates
    });

    // Calls ui.js function
    renderCalculatorResults(results, currentMode);
}

window.handleRecord = function (n, d) {
    const payload = JSON.parse(decodeURIComponent(d));
    const txDateInput = document.getElementById('tx-date');
    const txDate = txDateInput ? txDateInput.value : "";
    if (!txDate) {
        showToast("請先選擇簽賬日期，再記帳。", "warning");
        return;
    }
    payload.txDate = txDate;
    const msg = commitTransaction(payload);
    const extras = [];
    if (payload.guruRC > 0) extras.push(`🏆 Guru額度 -$${payload.guruRC.toFixed(1)} RC`);
    if (msg) extras.push(msg.trim());
    showToast(`已記錄：${n}${extras.length ? `\n${extras.join('\n')}` : ''}`, "success", 3200);
    refreshUI();
}

window.handleGuruUpgrade = function () {
    if (confirm("恭喜達標！確定要升級嗎？\n(這將會重置目前的累積簽賬和回贈額度，開始新的一級)")) {
        const msg = upgradeGuruLevel();
        alert(msg);
        refreshUI();
    }
}

window.handleTravelGuruStartGo = function () {
    const unlockTarget = 8000;
    const unlockSpend = Number(userProfile.usage.spend_guru_unlock) || 0;
    if (unlockSpend < unlockTarget) {
        alert(`尚未達標，仍需海外簽賬 $${(unlockTarget - unlockSpend).toLocaleString()}。`);
        return;
    }
    if (parseInt(userProfile.settings.guru_level, 10) > 0) {
        alert("已啟動 GO 級或以上。");
        return;
    }
    if (!confirm("已完成解鎖，啟動 GO級？")) return;
    userProfile.settings.guru_level = 1;
    saveUserData();
    refreshUI();
}

function rebuildUsageAndStatsFromTransactions() {
    const prevUsage = userProfile.usage || {};
    userProfile.usage = {};
    userProfile.stats = { totalSpend: 0, totalVal: 0, txCount: 0 };
    if (prevUsage.red_cap_month) userProfile.usage.red_cap_month = prevUsage.red_cap_month;
    if (prevUsage.bea_month) userProfile.usage.bea_month = prevUsage.bea_month;
    if (prevUsage.monthly_cap_month) userProfile.usage.monthly_cap_month = prevUsage.monthly_cap_month;
    if (prevUsage.winter_recalc_v2) userProfile.usage.winter_recalc_v2 = prevUsage.winter_recalc_v2;
    if (prevUsage.winter_recalc_v3) userProfile.usage.winter_recalc_v3 = prevUsage.winter_recalc_v3;
    if (prevUsage.winter_recalc_v4) userProfile.usage.winter_recalc_v4 = prevUsage.winter_recalc_v4;
    if (prevUsage.winter_recalc_v5) userProfile.usage.winter_recalc_v5 = prevUsage.winter_recalc_v5;
    if (prevUsage.dual_cap_tracking_v1) userProfile.usage.dual_cap_tracking_v1 = prevUsage.dual_cap_tracking_v1;
    if (prevUsage.sc_cathay_cxuo_quarterly_v1) userProfile.usage.sc_cathay_cxuo_quarterly_v1 = prevUsage.sc_cathay_cxuo_quarterly_v1;

    if (!Array.isArray(userProfile.transactions)) return;
    const txs = [...userProfile.transactions].reverse();
    txs.forEach(tx => {
        const amount = Number(tx.amount) || 0;
        const category = tx.category;
        const cardId = tx.cardId;
        const isOnline = !!tx.isOnline;
        const paymentMethod = tx.paymentMethod || (tx.isMobilePay ? "mobile" : "physical");
        const isMobilePay = paymentMethod !== "physical";
        const txDate = tx.txDate || (tx.date ? new Date(tx.date).toISOString().slice(0, 10) : "");
        const isHoliday = HolidayManager.isHoliday(txDate);

        userProfile.stats.totalSpend += amount;
        userProfile.stats.totalVal += Number(tx.rebateVal) || 0;
        userProfile.stats.txCount += 1;

        if (cardId) {
            userProfile.usage[`spend_${cardId}`] = (userProfile.usage[`spend_${cardId}`] || 0) + amount;
        }

        const guruUsageKeys = getGuruUsageKeys();
        const guruEligibleSpend = isGuruEligibleSpend(category, isOnline);
        if (userProfile.settings.travel_guru_registered && guruEligibleSpend) {
            userProfile.usage.spend_guru_unlock = (userProfile.usage.spend_guru_unlock || 0) + amount;
            if (parseInt(userProfile.settings.guru_level) > 0) {
                userProfile.usage[guruUsageKeys.spendKey] = (userProfile.usage[guruUsageKeys.spendKey] || 0) + amount;
            }
        }

        const card = DATA.cards.find(c => c.id === cardId);
        if (!card) return;
        const res = buildCardResult(card, amount, category, 'cash', userProfile, txDate, isHoliday, isOnline, isMobilePay, paymentMethod, tx.merchantId || null);
        if (!res) return;

        if (res.rewardTrackingKey && res.generatedReward > 0) {
            userProfile.usage[res.rewardTrackingKey] = (userProfile.usage[res.rewardTrackingKey] || 0) + res.generatedReward;
            if (res.secondaryRewardTrackingKey) {
                userProfile.usage[res.secondaryRewardTrackingKey] = (userProfile.usage[res.secondaryRewardTrackingKey] || 0) + res.generatedReward;
            }
        }
        if (res.trackingKey) {
            userProfile.usage[res.trackingKey] = (userProfile.usage[res.trackingKey] || 0) + amount;
        }

        if (res.guruRC > 0) {
            const guruUsageKeys = getGuruUsageKeys();
            userProfile.usage[guruUsageKeys.rewardKey] = (userProfile.usage[guruUsageKeys.rewardKey] || 0) + res.guruRC;
        }

        trackMissionSpend(cardId, category, amount, isOnline, isMobilePay, paymentMethod, txDate, isHoliday, tx.merchantId || null);
    });

    if (!userProfile.usage.red_cap_month) {
        const now = new Date();
        userProfile.usage.red_cap_month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    userProfile.usage.winter_recalc_v2 = true;
    userProfile.usage.winter_recalc_v3 = true;
    userProfile.usage.winter_recalc_v4 = true;
    userProfile.usage.winter_recalc_v5 = true;
    userProfile.usage.dual_cap_tracking_v1 = true;
    userProfile.usage.sc_cathay_cxuo_quarterly_v1 = true;
}

window.handleDeleteTx = function (id) {
    if (!confirm("刪除這筆記帳？")) return;
    if (!Array.isArray(userProfile.transactions)) return;
    userProfile.transactions = userProfile.transactions.filter(t => t.id !== id);
    rebuildUsageAndStatsFromTransactions();
    saveUserData();
    refreshUI();
    renderLedger(userProfile.transactions);
    showToast("已刪除記帳。", "info");
}

// --- DATA MODIFIERS ---

function trackMissionSpend(cardId, category, amount, isOnline, isMobilePay, paymentMethod, txDate, isHoliday, merchantId) {
    if (!cardId || !DATA.cards) return;
    const res = evaluateTrackers(cardId, { category, amount, isOnline, isMobilePay, paymentMethod, txDate, isHoliday, merchantId }, userProfile, DATA);
    if (!res || !Array.isArray(res.effects)) return;
    res.effects.forEach((effect) => {
        if (!effect || !effect.key) return;
        userProfile.usage[effect.key] = (userProfile.usage[effect.key] || 0) + effect.amount;
    });
}

function commitTransaction(data) {
    const { amount, trackingKey, estValue, guruRC, missionTags, category, cardId, rewardTrackingKey, secondaryRewardTrackingKey, generatedReward, pendingUnlocks, isOnline } = data;
    const fallbackMerchantId = (typeof window.getEffectiveMerchantId === "function")
        ? window.getEffectiveMerchantId()
        : (window.__selectedMerchantId || null);
    const merchantId = data.merchantId || fallbackMerchantId || null;
    const paymentMethod = data.paymentMethod || (data.isMobilePay ? "mobile" : "physical");
    const isMobilePay = paymentMethod !== "physical";
    const txDate = data.txDate || "";
    if (!txDate) return "\n⚠️ 未記錄：請先選擇簽賬日期。";
    const txDateSafe = txDate;
    const isHoliday = HolidayManager.isHoliday(txDateSafe);

    userProfile.stats.totalSpend += amount;
    userProfile.stats.totalVal += estValue;
    userProfile.stats.txCount += 1;

    if (rewardTrackingKey && generatedReward > 0) {
        userProfile.usage[rewardTrackingKey] = (userProfile.usage[rewardTrackingKey] || 0) + generatedReward;
        if (secondaryRewardTrackingKey) {
            userProfile.usage[secondaryRewardTrackingKey] = (userProfile.usage[secondaryRewardTrackingKey] || 0) + generatedReward;
        }
    }
    if (trackingKey) {
        userProfile.usage[trackingKey] = (userProfile.usage[trackingKey] || 0) + amount;
    }

    // Track spending per card for mission progress (DBS Black, MMPower, Travel+)
    if (cardId) {
        userProfile.usage[`spend_${cardId}`] = (userProfile.usage[`spend_${cardId}`] || 0) + amount;
    }
    // Track mission spends (e.g. sim non-online tracker) attached to the current card
    trackMissionSpend(cardId, category, amount, isOnline, isMobilePay, paymentMethod, txDateSafe, isHoliday, merchantId);
    if (guruRC > 0) {
        const guruUsageKeys = getGuruUsageKeys();
        userProfile.usage[guruUsageKeys.rewardKey] = (userProfile.usage[guruUsageKeys.rewardKey] || 0) + guruRC;
    }

    const level = parseInt(userProfile.settings.guru_level);
    // Track Guru-eligible overseas spend for upgrade progress (exclude online tx)
    const guruUsageKeys = getGuruUsageKeys();
    const guruEligibleSpend = isGuruEligibleSpend(category, isOnline);
    if (userProfile.settings.travel_guru_registered && guruEligibleSpend) {
        userProfile.usage.spend_guru_unlock = (userProfile.usage.spend_guru_unlock || 0) + amount;
        if (level > 0) {
            userProfile.usage[guruUsageKeys.spendKey] = (userProfile.usage[guruUsageKeys.spendKey] || 0) + amount;
        }
    }

    let alertMsg = "";
    // Mission progress keys are now updated via tracker effects (trackMissionSpend).
    // Keep alerts based on missionTags (only when eligible actually counts).
    missionTags.forEach(tag => {
        if (tag.id === "winter_promo" && tag.eligible) alertMsg += "\n❄️ 冬日賞累積更新";
        if (tag.id === "em_promo" && tag.eligible) alertMsg += "\n🌏 EM推廣累積更新";
    });

    // Record Transaction History
    if (!userProfile.transactions) userProfile.transactions = [];
    const rawResultText = String((data && data.resultText) || "").trim();
    const safeResultText = (rawResultText && /\d/.test(rawResultText))
        ? rawResultText
        : (estValue > 0 ? `$${estValue.toFixed(2)}` : "$0");

    const tx = {
        id: Date.now(),
        date: new Date().toISOString(),
        txDate: txDateSafe,
        cardId: cardId || 'unknown',
        category: category,
        merchantId: merchantId,
        isOnline: !!isOnline,
        isMobilePay: !!isMobilePay,
        paymentMethod: paymentMethod,
        amount: amount,
        grossAmount: Number(data.grossAmount) || amount,
        memberDayDiscount: Math.max(0, Number(data.memberDayDiscount) || 0),
        rebateVal: estValue,
        rebateText: safeResultText,
        desc: data.program || 'Spending',
        pendingUnlocks: Array.isArray(pendingUnlocks) ? pendingUnlocks : []
    };
    userProfile.transactions.unshift(tx);
    // Keep last 100
    if (userProfile.transactions.length > 100) userProfile.transactions = userProfile.transactions.slice(0, 100);

    applyPendingUnlocks();
    saveUserData();
    return alertMsg;
}

window.toggleFeeDeduct = function (checked) {
    userProfile.settings.deduct_fcf_ranking = !!checked;
    saveUserData();
    runCalc();
}

function applyPendingUnlocks() {
    if (!userProfile.transactions || userProfile.transactions.length === 0) return;

    userProfile.transactions.forEach(tx => {
        if (!Array.isArray(tx.pendingUnlocks) || tx.pendingUnlocks.length === 0) return;

        const remaining = [];
        tx.pendingUnlocks.forEach(p => {
            const currentSpend = userProfile.usage[p.reqKey] || 0;
            if (currentSpend < (p.reqSpend || 0)) {
                remaining.push(p);
                return;
            }

            let remainingCap = Infinity;
            if (p.capKey && p.capLimit) {
                const used = userProfile.usage[p.capKey] || 0;
                remainingCap = Math.max(0, p.capLimit - used);
            }
            if (p.secondaryCapKey && p.secondaryCapLimit) {
                const usedSec = userProfile.usage[p.secondaryCapKey] || 0;
                remainingCap = Math.min(remainingCap, Math.max(0, p.secondaryCapLimit - usedSec));
            }

            if (remainingCap <= 0) return;

            const applyNative = Math.min(p.pendingNative || 0, remainingCap);
            if (applyNative <= 0) return;

            if (p.capKey) {
                userProfile.usage[p.capKey] = (userProfile.usage[p.capKey] || 0) + applyNative;
            }
            if (p.secondaryCapKey) {
                userProfile.usage[p.secondaryCapKey] = (userProfile.usage[p.secondaryCapKey] || 0) + applyNative;
            }

            const applyCash = applyNative * (p.cashRate || 0);
            tx.rebateVal = (tx.rebateVal || 0) + applyCash;
            tx.rebateText = `$${tx.rebateVal.toFixed(2)}`;
            userProfile.stats.totalVal += applyCash;

            const leftover = (p.pendingNative || 0) - applyNative;
            if (leftover > 0) {
                remaining.push({ ...p, pendingNative: leftover });
            }
        });

        tx.pendingUnlocks = remaining;
    });
}

function upgradeGuruLevel() {
    let current = parseInt(userProfile.settings.guru_level);
    if (!Number.isFinite(current) || current < 0) current = 0;
    const maxLevel = getTravelGuruMaxLevel();
    if (current < maxLevel) {
        userProfile.settings.guru_level = current + 1;
    }
    const guruUsageKeys = getGuruUsageKeys();
    // Deep Reset
    userProfile.usage[guruUsageKeys.spendKey] = 0;
    userProfile.usage[guruUsageKeys.rewardKey] = 0;
    saveUserData();

    const newLevel = Number(userProfile.settings.guru_level) || 0;
    const levelName = getTravelGuruLevelName(newLevel) || `${newLevel}級`;
    return `成功升級至 ${levelName}！\n數據已重置，開始新旅程 🚀`;
}

// Settings Handlers
function removeOwnedCardById(id) {
    const i = userProfile.ownedCards.indexOf(id);
    if (i === -1) return false;
    userProfile.ownedCards.splice(i, 1);
    if (userProfile.settings.settings_focus_card === id) {
        userProfile.settings.settings_focus_card = userProfile.ownedCards[0] || "";
    }
    if (userProfile.settings.dashboard_focus_card === id) {
        userProfile.settings.dashboard_focus_card = userProfile.ownedCards[0] || "";
    }
    if (userProfile.ownedCards.length === 0) {
        userProfile.settings.settings_detail_mode = false;
        userProfile.settings.dashboard_detail_mode = false;
        userProfile.settings.settings_wallet_edit_mode = false;
    }
    return true;
}

function getCardNameById(cardId) {
    const cards = (DATA && Array.isArray(DATA.cards)) ? DATA.cards : [];
    const card = cards.find((c) => c && c.id === cardId);
    return (card && card.name) ? String(card.name) : String(cardId || "");
}

function finalizeWalletCardRemoval(cardId) {
    if (!removeOwnedCardById(cardId)) return false;
    saveUserData();
    refreshUI();
    return true;
}

function showWalletRemoveConfirm(cardId, onConfirm) {
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 z-40 bg-black/40 flex items-center justify-center px-4";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    const panel = document.createElement("div");
    panel.className = "w-full max-w-sm rounded-xl border border-[#e9e9e7] bg-white p-4 shadow-xl";

    const title = document.createElement("div");
    title.className = "text-sm font-semibold text-[#37352f] mb-1";
    title.textContent = "從銀包移除卡片？";

    const desc = document.createElement("div");
    desc.className = "text-xs text-gray-600 mb-3 leading-relaxed";
    desc.textContent = `將會移除：${getCardNameById(cardId)}`;

    const checkWrap = document.createElement("label");
    checkWrap.className = "flex items-center gap-2 text-xs text-gray-600 mb-4 cursor-pointer select-none";
    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "accent-gray-700 w-3.5 h-3.5";
    const checkText = document.createElement("span");
    checkText.textContent = "不再提示";
    checkWrap.appendChild(check);
    checkWrap.appendChild(checkText);

    const actions = document.createElement("div");
    actions.className = "flex justify-end gap-2";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "px-3 py-1.5 text-xs border border-[#e9e9e7] rounded-md text-gray-600 hover:bg-gray-50";
    cancelBtn.textContent = "取消";

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "px-3 py-1.5 text-xs rounded-md bg-[#37352f] text-white hover:opacity-90";
    confirmBtn.textContent = "移除";

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    panel.appendChild(title);
    panel.appendChild(desc);
    panel.appendChild(checkWrap);
    panel.appendChild(actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const cleanup = () => {
        document.removeEventListener("keydown", onKeyDown);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };

    const onKeyDown = (event) => {
        if (!event) return;
        if (event.key === "Escape") cleanup();
    };

    cancelBtn.onclick = cleanup;
    confirmBtn.onclick = () => {
        const disableConfirm = !!check.checked;
        cleanup();
        if (typeof onConfirm === "function") onConfirm(disableConfirm);
    };
    overlay.onclick = (event) => {
        if (event && event.target === overlay) cleanup();
    };
    document.addEventListener("keydown", onKeyDown);
}

window.toggleCard = function (id, options) {
    const opts = (options && typeof options === "object") ? options : {};
    const i = userProfile.ownedCards.indexOf(id);
    if (i > -1) {
        removeOwnedCardById(id);
    } else {
        userProfile.ownedCards.push(id);
        if (opts.fromAddList) {
            userProfile.settings.settings_wallet_add_open = true;
            const groupKey = String(opts.groupKey || "");
            if (groupKey) {
                const groupState = (userProfile.settings.settings_wallet_add_groups && typeof userProfile.settings.settings_wallet_add_groups === "object")
                    ? userProfile.settings.settings_wallet_add_groups
                    : {};
                groupState[groupKey] = true;
                userProfile.settings.settings_wallet_add_groups = groupState;
            }
        }
        if (!userProfile.settings.settings_focus_card) userProfile.settings.settings_focus_card = id;
        if (!userProfile.settings.dashboard_focus_card) userProfile.settings.dashboard_focus_card = id;
    }
    saveUserData();
    refreshUI();
}

window.setWalletAddCardsOpen = function (isOpen) {
    const open = !!isOpen;
    userProfile.settings.settings_wallet_add_open = open;
    saveUserData();
}

window.toggleWalletAddCardsPanel = function (forceState) {
    const next = (typeof forceState === "boolean")
        ? forceState
        : !Boolean(userProfile.settings.settings_wallet_add_open);
    userProfile.settings.settings_wallet_add_open = next;
    saveUserData();
    refreshUI();
}

window.setWalletAddGroupOpen = function (groupKey, isOpen) {
    const key = String(groupKey || "");
    if (!key) return;
    const groupState = (userProfile.settings.settings_wallet_add_groups && typeof userProfile.settings.settings_wallet_add_groups === "object")
        ? userProfile.settings.settings_wallet_add_groups
        : {};
    if (isOpen) groupState[key] = true;
    else delete groupState[key];
    userProfile.settings.settings_wallet_add_groups = groupState;
    saveUserData();
}

window.openWalletCardDetail = function (cardId) {
    if (!cardId) return;
    if (userProfile.settings && userProfile.settings.settings_wallet_edit_mode) return;
    if (!Array.isArray(userProfile.ownedCards) || !userProfile.ownedCards.includes(cardId)) {
        showToast("請先把呢張卡加入銀包。", "info");
        return;
    }
    userProfile.settings.settings_focus_card = cardId;
    userProfile.settings.settings_detail_mode = true;
    saveUserData();
    refreshUI();
}

window.toggleWalletEditMode = function (forceState) {
    const next = (typeof forceState === "boolean")
        ? forceState
        : !Boolean(userProfile.settings.settings_wallet_edit_mode);
    userProfile.settings.settings_wallet_edit_mode = next;
    if (next) {
        userProfile.settings.settings_detail_mode = false;
    } else {
        window.__walletDragCardId = "";
        window.__walletDropTargetEl = null;
    }
    saveUserData();
    refreshUI();
}

window.removeWalletCard = function (cardId) {
    if (!cardId) return;
    if (!Array.isArray(userProfile.ownedCards) || !userProfile.ownedCards.includes(cardId)) return;
    if (userProfile.settings && userProfile.settings.wallet_remove_confirm_disabled) {
        finalizeWalletCardRemoval(cardId);
        return;
    }
    showWalletRemoveConfirm(cardId, (disableConfirm) => {
        if (disableConfirm) {
            userProfile.settings.wallet_remove_confirm_disabled = true;
        }
        finalizeWalletCardRemoval(cardId);
    });
}

window.walletDragStart = function (event, cardId) {
    if (!userProfile.settings || !userProfile.settings.settings_wallet_edit_mode) return;
    if (!cardId) return;
    window.__walletDragCardId = cardId;
    const dragEl = event && event.currentTarget ? event.currentTarget : null;
    if (dragEl && dragEl.classList) dragEl.classList.add("wallet-dragging");
    if (event && event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", cardId);
    }
}

window.walletDragEnd = function () {
    window.__walletDragCardId = "";
    const draggingEl = document.querySelector(".wallet-dragging");
    if (draggingEl && draggingEl.classList) draggingEl.classList.remove("wallet-dragging");
    if (window.__walletDropTargetEl && window.__walletDropTargetEl.classList) {
        window.__walletDropTargetEl.classList.remove("wallet-drop-target");
    }
    window.__walletDropTargetEl = null;
}

window.walletDragOver = function (event) {
    if (!userProfile.settings || !userProfile.settings.settings_wallet_edit_mode) return;
    if (!event) return;
    event.preventDefault();
    const targetEl = event.currentTarget || null;
    if (window.__walletDropTargetEl && window.__walletDropTargetEl !== targetEl && window.__walletDropTargetEl.classList) {
        window.__walletDropTargetEl.classList.remove("wallet-drop-target");
    }
    if (targetEl && targetEl.classList) {
        targetEl.classList.add("wallet-drop-target");
        window.__walletDropTargetEl = targetEl;
    }
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
}

window.walletDrop = function (event, targetCardId) {
    if (!userProfile.settings || !userProfile.settings.settings_wallet_edit_mode) return;
    if (!targetCardId) return;
    if (event) event.preventDefault();

    let sourceCardId = window.__walletDragCardId || "";
    if (!sourceCardId && event && event.dataTransfer) {
        sourceCardId = String(event.dataTransfer.getData("text/plain") || "");
    }
    if (!sourceCardId || sourceCardId === targetCardId) return;

    const list = Array.isArray(userProfile.ownedCards) ? userProfile.ownedCards : [];
    const from = list.indexOf(sourceCardId);
    const to = list.indexOf(targetCardId);
    if (from < 0 || to < 0) return;

    list.splice(from, 1);
    list.splice(to, 0, sourceCardId);
    userProfile.ownedCards = list;
    window.__walletDragCardId = "";
    if (window.__walletDropTargetEl && window.__walletDropTargetEl.classList) {
        window.__walletDropTargetEl.classList.remove("wallet-drop-target");
    }
    window.__walletDropTargetEl = null;
    saveUserData();
    refreshUI();
}

window.closeWalletCardDetail = function () {
    userProfile.settings.settings_detail_mode = false;
    saveUserData();
    refreshUI();
}

window.navigateSettingsCard = function (cardId) {
    if (!cardId) return;
    userProfile.settings.settings_focus_card = cardId;
    saveUserData();
    refreshUI();
}

window.openDashboardCardDetail = function (cardId) {
    const focus = String(cardId || "");
    if (!focus) return;
    if (focus !== "__shared__" && (!Array.isArray(userProfile.ownedCards) || !userProfile.ownedCards.includes(focus))) return;
    userProfile.settings.dashboard_focus_card = focus;
    userProfile.settings.dashboard_detail_mode = true;
    saveUserData();
    switchTab('dashboard');
    refreshUI();
}

window.closeDashboardCardDetail = function () {
    userProfile.settings.dashboard_detail_mode = false;
    saveUserData();
    refreshUI();
}

window.toggleSetting = function (k) {
    userProfile.settings[k] = !userProfile.settings[k];
    saveUserData();
    refreshUI();
}

window.toggleBatchReviewMode = function () {
    if (typeof settingsBatchReviewMode !== "undefined") {
        settingsBatchReviewMode = !settingsBatchReviewMode;
    }
    refreshUI();
}

window.toggleRegistrationFromDashboard = function (settingKey) {
    if (!settingKey) return;
    userProfile.settings[settingKey] = !userProfile.settings[settingKey];
    saveUserData();
    const newState = userProfile.settings[settingKey];
    showToast(newState ? "已標記為已登記" : "已取消登記", "success");
    refreshUI();
}

window.saveDrop = function (k, v) {
    userProfile.settings[k] = v;
    saveUserData();
    refreshUI();
}

window.toggleMmpowerSelected = function (key, checked) {
    const valid = ["dining", "electronics", "entertainment"];
    if (!valid.includes(key)) return;
    const cur = Array.isArray(userProfile.settings.mmpower_selected_categories)
        ? [...userProfile.settings.mmpower_selected_categories]
        : ["dining", "electronics"];

    const idx = cur.indexOf(key);
    if (checked) {
        if (idx === -1) {
            if (cur.length >= 2) {
                showToast("MMPower 自選類別最多只可選 2 項。", "warning");
                refreshUI();
                return;
            }
            cur.push(key);
        }
    } else if (idx !== -1) {
        cur.splice(idx, 1);
    }

    userProfile.settings.mmpower_selected_categories = cur;
    saveUserData();
    refreshUI();
}

window.saveWinterThresholds = function () {
    const t1El = document.getElementById('st-winter-tier1');
    const t2El = document.getElementById('st-winter-tier2');
    let tier1 = t1El ? parseInt(t1El.value, 10) : 0;
    let tier2 = t2El ? parseInt(t2El.value, 10) : 0;
    if (!Number.isFinite(tier1) || tier1 < 0) tier1 = 0;
    if (!Number.isFinite(tier2) || tier2 < 0) tier2 = 0;
    if (tier2 < tier1) tier2 = tier1;

    userProfile.settings.winter_tier1_threshold = tier1;
    userProfile.settings.winter_tier2_threshold = tier2;
    saveUserData();
    refreshUI();
}

window.savePrestigeTenureYears = function () {
    const yearsEl = document.getElementById('st-prestige-years');
    let years = yearsEl ? parseInt(yearsEl.value, 10) : 1;
    if (!Number.isFinite(years) || years < 1) years = 1;
    userProfile.settings.citi_prestige_tenure_years = years;
    saveUserData();
    refreshUI();
}

// --- DATA MANAGEMENT ---

window.exportData = function () {
    try {
        const data = JSON.stringify(userProfile, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        a.href = url;
        a.download = `credit-card-backup-${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Visual feedback
        const btn = event.target;
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ 已匯出';
        btn.disabled = true;
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);
    } catch (error) {
        showToast('匯出失敗：' + error.message, 'error', 3000);
    }
}

window.importData = function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const importedData = JSON.parse(e.target.result);

            // Validate structure
            if (!importedData.ownedCards || !importedData.settings || !importedData.usage) {
                throw new Error('檔案格式錯誤');
            }

            // Confirm before overwriting
            if (!confirm('⚠️ 確定要匯入數據？現有數據將被覆蓋！')) {
                event.target.value = ''; // Reset file input
                return;
            }

            // Restore data
            userProfile = { ...userProfile, ...importedData };
            if (!userProfile.settings) userProfile.settings = {};
            ensureBooleanSettingDefaults(userProfile.settings);
            if (userProfile.settings.winter_tier1_threshold === undefined) userProfile.settings.winter_tier1_threshold = 20000;
            if (userProfile.settings.winter_tier2_threshold === undefined) userProfile.settings.winter_tier2_threshold = 40000;
            if (userProfile.settings.winter_tier2_threshold < userProfile.settings.winter_tier1_threshold) {
                userProfile.settings.winter_tier2_threshold = userProfile.settings.winter_tier1_threshold;
            }
            {
                const allowed = ["dining", "electronics", "entertainment"];
                const raw = Array.isArray(userProfile.settings.mmpower_selected_categories)
                    ? userProfile.settings.mmpower_selected_categories.map(x => String(x))
                    : [];
                const normalized = Array.from(new Set(raw.filter(x => allowed.includes(x)))).slice(0, 2);
                userProfile.settings.mmpower_selected_categories = normalized.length > 0 ? normalized : ["dining", "electronics"];
            }
            if (userProfile.settings.citi_prestige_bonus_enabled === undefined) userProfile.settings.citi_prestige_bonus_enabled = false;
            if (userProfile.settings.citi_prestige_tenure_years === undefined) userProfile.settings.citi_prestige_tenure_years = 1;
            if (userProfile.settings.citi_prestige_wealth_client === undefined) userProfile.settings.citi_prestige_wealth_client = false;
            saveUserData();
            refreshUI();

            showToast('數據匯入成功。', 'success');
            event.target.value = ''; // Reset file input
        } catch (error) {
            showToast('匯入失敗：' + error.message, 'error', 3000);
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

window.openSettingsForRegistration = function (settingKey, cardId) {
    switchTab('settings');
    if (cardId && Array.isArray(userProfile.ownedCards) && userProfile.ownedCards.includes(cardId)) {
        userProfile.settings.settings_focus_card = cardId;
        userProfile.settings.settings_detail_mode = true;
        saveUserData();
        refreshUI();
    } else {
        userProfile.settings.settings_detail_mode = false;
        saveUserData();
        refreshUI();
    }
    setTimeout(() => {
        const row = document.querySelector(`[data-setting-key="${settingKey}"]`);
        if (!row) return;
        let parent = row.parentElement;
        while (parent) {
            if (parent.tagName && parent.tagName.toLowerCase() === 'details') parent.setAttribute('open', '');
            parent = parent.parentElement;
        }
        row.classList.add('ring-2', 'ring-yellow-300');
        setTimeout(() => row.classList.remove('ring-2', 'ring-yellow-300'), 1800);
    }, 50);
}

window.filterWalletCards = function (rawQuery) {
    const query = String(rawQuery || '').trim().toLowerCase();
    const covers = Array.from(document.querySelectorAll('[data-wallet-cover]'));
    covers.forEach((cover) => {
        const text = (cover.getAttribute('data-wallet-card') || '').toLowerCase();
        const match = !query || text.includes(query);
        cover.classList.toggle('hidden', !match);
    });
    const coverEmpty = document.getElementById('wallet-cover-empty');
    if (coverEmpty) {
        const visibleCount = covers.filter((cover) => !cover.classList.contains('hidden')).length;
        coverEmpty.classList.toggle('hidden', visibleCount > 0);
    }

    const groups = Array.from(document.querySelectorAll('[data-wallet-group]'));
    groups.forEach((group) => {
        const cards = Array.from(group.querySelectorAll('[data-wallet-card]'));
        let visible = 0;
        cards.forEach((row) => {
            const text = (row.getAttribute('data-wallet-card') || '').toLowerCase();
            const match = !query || text.includes(query);
            row.classList.toggle('hidden', !match);
            if (match) visible += 1;
        });
        const total = Number(group.getAttribute('data-wallet-total')) || cards.length;
        const summary = group.querySelector('[data-wallet-match-count]');
        if (summary) summary.textContent = `${visible}/${total}`;
        group.classList.toggle('hidden', query && visible === 0);
        if (query && visible > 0) group.setAttribute('open', '');
    });
}

// Start
if (typeof window === "undefined" || !window.__SKIP_INIT) {
    init();
}
