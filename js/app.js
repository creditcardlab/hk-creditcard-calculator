// app.js - Main Controller

// --- STATE ---
let currentMode = 'miles';
// userProfile is defined in core.js (V9.2)

// --- INIT ---
function init() {
    loadUserData();
    if (!userProfile.usage["guru_spend_accum"]) userProfile.usage["guru_spend_accum"] = 0;

    // Initial Render
    refreshUI();
    if (userProfile.ownedCards.length === 0) switchTab('settings');
}

// --- CORE ACTIONS ---

// loadUserData and saveUserData are inherited from core.js (V9.2) to match new data structure

function refreshUI() {
    renderSettings(userProfile);
    renderDashboard(userProfile)

    // Dynamically update categories based on owned cards
    if (typeof updateCategoryDropdown === 'function') {
        updateCategoryDropdown(userProfile.ownedCards);
    }

    runCalc();
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
    runCalc();
}

window.runCalc = function () {
    const amt = parseFloat(document.getElementById('amount').value) || 0;
    const cat = document.getElementById('category').value;

    // Calls core.js function
    const results = calculateResults(amt, cat, currentMode, userProfile);

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

window.handleReset = function () {
    if (confirm("重置本月數據？")) {
        userProfile.usage = {};
        userProfile.stats = { totalSpend: 0, totalVal: 0, txCount: 0 };
        saveUserData();
        refreshUI();
    }
}

window.handleGuruUpgrade = function () {
    if (confirm("恭喜達標！確定要升級嗎？\n(這將會重置目前的累積簽賬和回贈額度，開始新的一級)")) {
        const msg = upgradeGuruLevel();
        alert(msg);
        refreshUI();
    }
}

// --- DATA MODIFIERS ---

function commitTransaction(data) {
    const { amount, trackingKey, estValue, guruRC, missionTags, category, cardId, rewardTrackingKey, secondaryRewardTrackingKey, generatedReward } = data;

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
    if (guruRC > 0) userProfile.usage["guru_rc_used"] = (userProfile.usage["guru_rc_used"] || 0) + guruRC;

    const level = parseInt(userProfile.settings.guru_level);
    // Track all overseas spending for Guru upgrade progress
    const isOverseas = ['overseas', 'overseas_jkt', 'overseas_tw', 'overseas_cn', 'overseas_other'].includes(category);
    if (level > 0 && isOverseas) userProfile.usage["guru_spend_accum"] = (userProfile.usage["guru_spend_accum"] || 0) + amount;

    let alertMsg = "";
    missionTags.forEach(tag => {
        if (tag.id === "winter_promo") {
            userProfile.usage["winter_total"] = (userProfile.usage["winter_total"] || 0) + amount;
            if (tag.eligible) userProfile.usage["winter_eligible"] = (userProfile.usage["winter_eligible"] || 0) + amount;
            alertMsg += "\n❄️ 冬日賞累積更新";
        }
        if (tag.id === "em_promo") {
            userProfile.usage["em_q1_total"] = (userProfile.usage["em_q1_total"] || 0) + amount;
            if (tag.eligible) userProfile.usage["em_q1_eligible"] = (userProfile.usage["em_q1_eligible"] || 0) + amount;
            alertMsg += "\n🌏 EM推廣累積更新";
        }
    });

    // Record Transaction History
    if (!userProfile.transactions) userProfile.transactions = [];
    const tx = {
        id: Date.now(),
        date: new Date().toISOString(),
        cardId: cardId || 'unknown',
        category: category,
        amount: amount,
        rebateVal: estValue,
        rebateText: data.resultText || (estValue > 0 ? `$${estValue.toFixed(2)}` : 'No Reward'),
        desc: data.program || 'Spending'
    };
    userProfile.transactions.unshift(tx);
    // Keep last 100
    if (userProfile.transactions.length > 100) userProfile.transactions = userProfile.transactions.slice(0, 100);

    saveUserData();
    return alertMsg;
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
init();
