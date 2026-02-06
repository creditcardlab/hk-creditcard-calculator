// app.js - Main Controller

// --- STATE ---
let currentMode = 'miles';
// userProfile is defined in core.js (V9.2)

// --- INIT ---
function init() {
    if (typeof validateData === "function") {
        const shouldValidate = !(DATA && DATA.debug && DATA.debug.validate === false);
        if (shouldValidate) validateData(DATA);
    }
    loadUserData();
    if (!userProfile.usage["guru_spend_accum"]) userProfile.usage["guru_spend_accum"] = 0;
    if (userProfile.settings.deduct_fcf_ranking === undefined) userProfile.settings.deduct_fcf_ranking = false;
    migrateWinterUsage();
    resetCountersForPeriod("month");
    resetCountersForPeriod("quarter");
    resetCountersForPeriod("year");
    resetCountersForPeriod("promo");
    validateUsageRegistry();

    // Initial Render
    refreshUI();
    if (userProfile.ownedCards.length === 0) switchTab('settings');

    // Initialize holidays in background; rerun calc when ready
    if (typeof HolidayManager !== 'undefined' && HolidayManager.init) {
        HolidayManager.init().then(() => {
            if (typeof runCalc === 'function') runCalc();
        });
    }
}

function migrateWinterUsage() {
    if (!userProfile.usage) userProfile.usage = {};
    if (userProfile.usage.winter_recalc_v2) return;
    let total = 0;
    let eligible = 0;
    if (Array.isArray(userProfile.transactions)) {
        userProfile.transactions.forEach(tx => {
            const amt = Number(tx.amount) || 0;
            const cat = tx.category;
            const isOnline = !!tx.isOnline;
            if (!isOnline && isCategoryMatch(["dining", "overseas"], cat)) {
                total += amt;
                eligible += amt;
            }
        });
    }
    userProfile.usage.winter_total = total;
    userProfile.usage.winter_eligible = eligible;
    userProfile.usage.winter_recalc_v2 = true;
    saveUserData();
}

function getMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getCountersRegistry() {
    return (typeof DATA !== "undefined" && DATA.countersRegistry) ? DATA.countersRegistry : {};
}

function resolveAnchorForKey(key, entry) {
    const defaults = (typeof DATA !== "undefined" && DATA.periodDefaults) ? DATA.periodDefaults : {};
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
        "winter_recalc_v2"
    ]);
    const unknown = Object.keys(usage).filter(k => !internalKeys.has(k) && !registry[k] && !String(k).startsWith("spend_"));
    if (unknown.length) {
        console.warn("[warn] usage keys missing from countersRegistry:", unknown.join(", "));
    }
}

function resetRedMonthlyCaps() {
    resetCountersForPeriod("month");
}

function resetBeaMonthlyCaps() {
    resetCountersForPeriod("month");
}

function resetMonthlyCaps() {
    resetCountersForPeriod("month");
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
    if (typeof updateCategoryDropdown === 'function') {
        updateCategoryDropdown(userProfile.ownedCards);
    }

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
    userProfile.stats = { totalSpend: 0, totalVal: 0, txCount: 0 };
}

// --- EVENT HANDLERS (Exposed to Window for HTML onclick) ---

window.switchTab = function (t) {
    // Hide all, Show one
    document.querySelectorAll('.tab-content').forEach(e => e.classList.add('hidden'));
    document.getElementById(`view-${t}`).classList.remove('hidden');

    // Update Buttons
    document.querySelectorAll('.tab-btn').forEach(e => e.classList.replace('text-blue-600', 'text-gray-400'));
    document.getElementById(`btn-${t}`).classList.replace('text-gray-400', 'text-blue-600');

    if (t === 'dashboard') renderDashboard(userProfile);
    if (t === 'ledger') renderLedger(userProfile.transactions);
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

window.runCalc = function () {
    const amt = parseFloat(document.getElementById('amount').value) || 0;
    const cat = document.getElementById('category').value;
    const onlineToggle = document.getElementById('tx-online');
    const isOnline = onlineToggle ? !!onlineToggle.checked : false;
    const paymentSelect = document.getElementById('tx-payment');
    const paymentMethod = paymentSelect ? paymentSelect.value : "physical";
    const isMobilePay = paymentMethod !== "physical";
    let txDate = document.getElementById('tx-date').value;

    // Fallback: If date is empty, use Today
    if (!txDate) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        txDate = `${y}-${m}-${d}`;
    }

    // Auto-detect Holiday
    const isHoliday = HolidayManager.isHoliday(txDate);

    // Update Badge UI
    const badge = document.getElementById('holiday-badge');
    if (badge) {
        if (isHoliday) badge.classList.remove('hidden');
        else badge.classList.add('hidden');
    }

    // Calls core.js function
    const results = calculateResults(amt, cat, currentMode, userProfile, txDate, isHoliday, {
        deductFcfForRanking: !!userProfile.settings.deduct_fcf_ranking && currentMode === 'cash',
        isOnline,
        isMobilePay,
        paymentMethod
    });

    // Calls ui.js function
    renderCalculatorResults(results, currentMode);
}

window.handleRecord = function (n, d) {
    if (!confirm(`確認以 [${n}] 簽賬?`)) return;
    const payload = JSON.parse(decodeURIComponent(d));
    const msg = commitTransaction(payload);
    alert("已記錄！" + (payload.guruRC > 0 ? `\n🏆 Guru額度 -$${payload.guruRC.toFixed(1)} RC` : "") + msg);
    refreshUI();
    window.switchTab('dashboard');
}

window.handleGuruUpgrade = function () {
    if (confirm("恭喜達標！確定要升級嗎？\n(這將會重置目前的累積簽賬和回贈額度，開始新的一級)")) {
        const msg = upgradeGuruLevel();
        alert(msg);
        refreshUI();
    }
}

function rebuildUsageAndStatsFromTransactions() {
    const prevUsage = userProfile.usage || {};
    userProfile.usage = {};
    userProfile.stats = { totalSpend: 0, totalVal: 0, txCount: 0 };
    if (prevUsage.red_cap_month) userProfile.usage.red_cap_month = prevUsage.red_cap_month;
    if (prevUsage.bea_month) userProfile.usage.bea_month = prevUsage.bea_month;
    if (prevUsage.monthly_cap_month) userProfile.usage.monthly_cap_month = prevUsage.monthly_cap_month;
    if (prevUsage.winter_recalc_v2) userProfile.usage.winter_recalc_v2 = prevUsage.winter_recalc_v2;

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
        const isHoliday = (typeof HolidayManager !== 'undefined' && HolidayManager.isHoliday) ? HolidayManager.isHoliday(txDate) : false;

        userProfile.stats.totalSpend += amount;
        userProfile.stats.totalVal += Number(tx.rebateVal) || 0;
        userProfile.stats.txCount += 1;

        if (cardId) {
            userProfile.usage[`spend_${cardId}`] = (userProfile.usage[`spend_${cardId}`] || 0) + amount;
        }

        const isOverseas = ['overseas', 'overseas_jkt', 'overseas_tw', 'overseas_cn', 'overseas_other'].includes(category);
        if (parseInt(userProfile.settings.guru_level) > 0 && isOverseas) {
            userProfile.usage["guru_spend_accum"] = (userProfile.usage["guru_spend_accum"] || 0) + amount;
        }

        const card = DATA.cards.find(c => c.id === cardId);
        if (!card) return;
        const res = buildCardResult(card, amount, category, 'cash', userProfile, txDate, isHoliday, isOnline, isMobilePay, paymentMethod);
        if (!res) return;

        if (res.rewardTrackingKey && res.generatedReward > 0) {
            userProfile.usage[res.rewardTrackingKey] = (userProfile.usage[res.rewardTrackingKey] || 0) + res.generatedReward;
            if (res.secondaryRewardTrackingKey) {
                userProfile.usage[res.secondaryRewardTrackingKey] = (userProfile.usage[res.secondaryRewardTrackingKey] || 0) + res.generatedReward;
            }
        } else if (res.trackingKey) {
            userProfile.usage[res.trackingKey] = (userProfile.usage[res.trackingKey] || 0) + amount;
        }

        if (res.guruRC > 0) {
            userProfile.usage["guru_rc_used"] = (userProfile.usage["guru_rc_used"] || 0) + res.guruRC;
        }

        trackMissionSpend(cardId, category, amount, isOnline, isMobilePay, paymentMethod, txDate, isHoliday);
    });

    if (!userProfile.usage.red_cap_month) {
        const now = new Date();
        userProfile.usage.red_cap_month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    userProfile.usage.winter_recalc_v2 = true;
}

window.handleDeleteTx = function (id) {
    if (!confirm("刪除這筆記帳？")) return;
    if (!Array.isArray(userProfile.transactions)) return;
    userProfile.transactions = userProfile.transactions.filter(t => t.id !== id);
    rebuildUsageAndStatsFromTransactions();
    saveUserData();
    refreshUI();
    renderLedger(userProfile.transactions);
}

// --- DATA MODIFIERS ---

function trackMissionSpend(cardId, category, amount, isOnline, isMobilePay, paymentMethod, txDate, isHoliday) {
    if (!cardId || typeof DATA === 'undefined' || !DATA.cards) return;
    if (typeof evaluateTrackers !== "function") return;
    const res = evaluateTrackers(cardId, { category, amount, isOnline, isMobilePay, paymentMethod, txDate, isHoliday }, userProfile, DATA);
    if (!res || !Array.isArray(res.effects)) return;
    res.effects.forEach((effect) => {
        if (!effect || !effect.key) return;
        userProfile.usage[effect.key] = (userProfile.usage[effect.key] || 0) + effect.amount;
    });
}

function commitTransaction(data) {
    const { amount, trackingKey, estValue, guruRC, missionTags, category, cardId, rewardTrackingKey, secondaryRewardTrackingKey, generatedReward, pendingUnlocks, isOnline } = data;
    const paymentMethod = data.paymentMethod || (data.isMobilePay ? "mobile" : "physical");
    const isMobilePay = paymentMethod !== "physical";
    const txDate = data.txDate || "";
    const txDateSafe = txDate || new Date().toISOString().slice(0, 10);
    const isHoliday = (typeof HolidayManager !== 'undefined' && HolidayManager.isHoliday) ? HolidayManager.isHoliday(txDateSafe) : false;

    userProfile.stats.totalSpend += amount;
    userProfile.stats.totalVal += estValue;
    userProfile.stats.txCount += 1;

    if (rewardTrackingKey && generatedReward > 0) {
        userProfile.usage[rewardTrackingKey] = (userProfile.usage[rewardTrackingKey] || 0) + generatedReward;
        if (secondaryRewardTrackingKey) {
            userProfile.usage[secondaryRewardTrackingKey] = (userProfile.usage[secondaryRewardTrackingKey] || 0) + generatedReward;
        }
    } else if (trackingKey) {
        userProfile.usage[trackingKey] = (userProfile.usage[trackingKey] || 0) + amount;
    }

    // Track spending per card for mission progress (DBS Black, MMPower, Travel+)
    if (cardId) {
        userProfile.usage[`spend_${cardId}`] = (userProfile.usage[`spend_${cardId}`] || 0) + amount;
    }
    // Track mission spends (e.g. sim non-online tracker) attached to the current card
    trackMissionSpend(cardId, category, amount, isOnline, isMobilePay, paymentMethod, txDateSafe, isHoliday);
    if (guruRC > 0) userProfile.usage["guru_rc_used"] = (userProfile.usage["guru_rc_used"] || 0) + guruRC;

    const level = parseInt(userProfile.settings.guru_level);
    // Track all overseas spending for Guru upgrade progress
    const isOverseas = ['overseas', 'overseas_jkt', 'overseas_tw', 'overseas_cn', 'overseas_mo', 'overseas_other'].includes(category);
    if (level > 0 && isOverseas) userProfile.usage["guru_spend_accum"] = (userProfile.usage["guru_spend_accum"] || 0) + amount;

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
        isOnline: !!isOnline,
        isMobilePay: !!isMobilePay,
        paymentMethod: paymentMethod,
        amount: amount,
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
    if (current < 3) {
        userProfile.settings.guru_level = current + 1;
    }
    // Deep Reset
    userProfile.usage["guru_spend_accum"] = 0;
    userProfile.usage["guru_rc_used"] = 0;
    saveUserData();

    const names = { 1: "GO級", 2: "GING級", 3: "GURU級" };
    return `成功升級至 ${names[userProfile.settings.guru_level]}！\n數據已重置，開始新旅程 🚀`;
}

// Settings Handlers
window.toggleCard = function (id) {
    const i = userProfile.ownedCards.indexOf(id);
    if (i > -1) userProfile.ownedCards.splice(i, 1);
    else userProfile.ownedCards.push(id);
    saveUserData();
    refreshUI();
}

window.toggleSetting = function (k) {
    userProfile.settings[k] = !userProfile.settings[k];
    saveUserData();
    refreshUI();
}

window.saveDrop = function (k, v) {
    userProfile.settings[k] = v;
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
        alert('❌ 匯出失敗：' + error.message);
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
            if (userProfile.settings.winter_tier1_threshold === undefined) userProfile.settings.winter_tier1_threshold = 20000;
            if (userProfile.settings.winter_tier2_threshold === undefined) userProfile.settings.winter_tier2_threshold = 40000;
            if (userProfile.settings.winter_tier2_threshold < userProfile.settings.winter_tier1_threshold) {
                userProfile.settings.winter_tier2_threshold = userProfile.settings.winter_tier1_threshold;
            }
            saveUserData();
            refreshUI();

            alert('✅ 數據匯入成功！');
            event.target.value = ''; // Reset file input
        } catch (error) {
            alert('❌ 匯入失敗：' + error.message);
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

// Start
if (typeof window === "undefined" || !window.__SKIP_INIT) {
    init();
}
