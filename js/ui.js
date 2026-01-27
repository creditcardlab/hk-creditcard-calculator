// js/ui.js - V10.10 (Fix Winter Promo Reward Bar)

// Helper: Calculate days remaining
function getDaysLeft(dateStr) {
    if (!dateStr) return null;
    const end = new Date(dateStr);
    const now = new Date();
    const diff = end - now;
    if (diff < 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Helper: Toggle Collapsible Section
function toggleCollapsible(id) {
    const content = document.getElementById(id);
    const icon = document.getElementById(id + '-icon');
    if (content && icon) {
        content.classList.toggle('expanded');
        icon.classList.toggle('expanded');
    }
}

// Shared Category Definitions
const CATEGORY_DEF = [
    { v: "general", t: "🛒 本地零售 (Local Retail)" },
    { v: "dining", t: "🍱 餐飲 (Dining)" },
    { v: "online", t: "💻 網上購物 (Online)" },
    // Split Overseas Category - 3 Way
    { v: "overseas_jkt", t: "🇯🇵🇰🇷🇹🇭 海外 (日韓泰)" },
    { v: "overseas_tw", t: "🇹🇼 海外 (台灣)" },
    { v: "overseas_cn", t: "🇨🇳🇲🇴 海外 (內地澳門)" },
    { v: "overseas_other", t: "🌎 海外 (其他)" },
    { v: "alipay", t: "📱 Alipay / WeChat Pay" },
    { v: "gym", t: "🏋️ 健身/運動服飾" },
    { v: "medical", t: "👨‍⚕️ 醫療服務" },
    { v: "transport", t: "🚌 交通 (Transport)" },
    { v: "grocery", t: "🥦 超市 (Grocery)" },
    { v: "travel", t: "🧳 旅遊商戶 (Travel)" },
    { v: "entertainment", t: "🎬 娛樂/電影 (Entertainment)" },
    { v: "apparel", t: "👕 服飾/百貨 (Apparel/Dept)" },
    { v: "health_beauty", t: "💄 美妝/護理 (Beauty/Watsons)" },
    { v: "telecom", t: "📱 電訊/電器 (Telecom/Elec)" },
    // Dynamic/Card-specific
    { v: "moneyback_merchant", t: "🅿️ 易賞錢商戶 (百佳/屈臣氏/豐澤)", req: 'hsbc_easy' },
    { v: "tuition", t: "🎓 學費 (Tuition)", req: 'hsbc_gold_student' },
    { v: "red_designated", t: "🌹 Red 指定商戶 (8%)", req: 'hsbc_red' },
    { v: "em_designated_spend", t: "🚋 EveryMile 指定 ($2/里)", req: 'hsbc_everymile' },
    { v: "smart_designated", t: "🛍️ Smart 指定商戶 (5%)", req: 'sc_smart' },
    { v: "cathay_hkexpress", t: "🛫 國泰/HK Express ($2/里)", req: (cards) => cards.some(id => id.startsWith('sc_cathay')) },
    { v: "citi_club_merchant", t: "🛍️ The Club 指定商戶 (4%)", req: 'citi_club' },
    { v: "chill_merchant", t: "🎬 Chill商戶 (影視/咖啡/Uniqlo)", req: 'boc_chill' },
    { v: "go_merchant", t: "🚀 Go商戶", req: 'boc_go_diamond' }
];

function updateCategoryDropdown(ownedCards) {
    const select = document.getElementById('category');
    const currentVal = select.value;

    let options = CATEGORY_DEF.filter(cat => {
        if (!cat.req) return true;
        if (typeof cat.req === 'function') return cat.req(ownedCards);
        return ownedCards.includes(cat.req);
    });

    select.innerHTML = options.map(o => `<option value="${o.v}">${o.t}</option>`).join('');
    if (options.some(o => o.v === currentVal)) select.value = currentVal;
    else select.value = "general";

    toggleCategoryHelp();
}

function toggleCategoryHelp() {
    const cat = document.getElementById('category').value;
    const helpBtn = document.getElementById('cat-help-btn');

    const helpMap = {
        'red_designated': showRedMerchantList,
        'em_designated_spend': showEveryMileMerchantList,
        'grocery': showSupermarketList,
        'china_consumption': showChinaTips,
        'smart_designated': showSmartMerchantList,
        'citi_club_merchant': showClubMerchantList
    };

    let handler = helpMap[cat];
    if (cat === 'transport' && userProfile.ownedCards.includes('citi_octopus')) {
        handler = showOctopusTips;
    }

    if (handler) {
        helpBtn.classList.remove('hidden');
        helpBtn.onclick = handler;
    } else {
        helpBtn.classList.add('hidden');
    }
}

function showClubMerchantList() { alert("【Citi The Club 指定商戶 (4%)】\n\n🛍️ Club Shopping\n☕ Starbucks\n🍔 McDonald's\n🐼 Foodpanda (部分)\n📱 1010 / csl 服務月費\n\n回贈為 Clubpoints。"); }
function showOctopusTips() { alert("【Citi Octopus 交通神卡攻略 (15%)】\n\n🚌 適用：九巴、港鐵、渡輪、電車\n\n💰 門檻/上限：\n1. 月簽 $4,000：回贈上限 $300 (即交通簽 $2,000)\n2. 月簽 $10,000：回贈上限 $500\n\n⚡ 0成本達標大法：\n每月增值電子錢包 (PayMe/Alipay/WeChat) 各 $1,000，輕鬆達標 $3,000！\n\n🎁 疊加政府補貼：可賺高達 30%+ 回贈！"); }
function showSmartMerchantList() { alert("【SC Smart 指定商戶 (5%)】\n\n🥦 超市：百佳, 759, Donki\n🍽️ 餐飲：麥當勞, Deliveroo, Foodpanda\n💊 零售：HKTVmall, 屈臣氏, Klook, Decathlon\n\n⚠️ 每年最高簽賬 HK$60,000。"); }
function showSupermarketList() { alert("【🥦 超市類別定義】\n\n✅ 認可：百佳, Donki, 759, AEON\n⚠️ HSBC陷阱：❌ 不包惠康, Market Place, 萬寧"); }
function showRedMerchantList() { alert("【HSBC Red 指定 (8%)】\n\n🍽️ 壽司郎, 譚仔, Coffee Academïcs\n👕 GU, Decathlon, Uniqlo\n🎮 NAMCO"); }
function showEveryMileMerchantList() { alert("【EveryMile 指定 ($2/里)】\n\n🚌 交通 (港鐵/巴士/Uber)\n☕ 咖啡 (Starbucks/Pacific)\n🌏 旅遊 (Klook/Agoda)"); }
function showChinaTips() { alert("【🇨🇳 中國內地/澳門】\n\n推薦：Pulse (手機支付+2%)、EveryMile ($2/里)、MMPower (6%)"); }

// Helper: Create Progress Card Component
function createProgressCard(config) {
    // ... existing code ...
    // Note: Since I am replacing huge chunk, I must preserve previous code.
    // Wait, replace_file_content does block replacement. I should be careful not to delete createProgressCard if it's below.
    // The TargetContent above starts at line 23 'function updateCategoryDropdown'.
    // The TargetContent ends at line 746 (eof).
    // This is too big and unsafe to replace entire file logic blindly.
    // I should do it in smaller chunks or accurately target the sections.
}

function toggleCategoryHelp() {
    const cat = document.getElementById('category').value;
    const helpBtn = document.getElementById('cat-help-btn');

    const helpMap = {
        'red_designated': showRedMerchantList,
        'em_designated_spend': showEveryMileMerchantList,
        'grocery': showSupermarketList,
        'china_consumption': showChinaTips,
        'smart_designated': showSmartMerchantList,
        'citi_club_merchant': showClubMerchantList
    };

    let handler = helpMap[cat];
    if (cat === 'transport' && userProfile.ownedCards.includes('citi_octopus')) {
        handler = showOctopusTips;
    }

    if (handler) {
        helpBtn.classList.remove('hidden');
        helpBtn.onclick = handler;
    } else {
        helpBtn.classList.add('hidden');
    }
}

function showClubMerchantList() { alert("【Citi The Club 指定商戶 (4%)】\n\n🛍️ Club Shopping\n☕ Starbucks\n🍔 McDonald's\n🐼 Foodpanda (部分)\n📱 1010 / csl 服務月費\n\n回贈為 Clubpoints。"); }
function showOctopusTips() { alert("【Citi Octopus 交通神卡攻略 (15%)】\n\n🚌 適用：九巴、港鐵、渡輪、電車\n\n💰 門檻/上限：\n1. 月簽 $4,000：回贈上限 $300 (即交通簽 $2,000)\n2. 月簽 $10,000：回贈上限 $500\n\n⚡ 0成本達標大法：\n每月增值電子錢包 (PayMe/Alipay/WeChat) 各 $1,000，輕鬆達標 $3,000！\n\n🎁 疊加政府補貼：可賺高達 30%+ 回贈！"); }
function showSmartMerchantList() { alert("【SC Smart 指定商戶 (5%)】\n\n🥦 超市：百佳, 759, Donki\n🍽️ 餐飲：麥當勞, Deliveroo, Foodpanda\n💊 零售：HKTVmall, 屈臣氏, Klook, Decathlon\n\n⚠️ 每年最高簽賬 HK$60,000。"); }
function showSupermarketList() { alert("【🥦 超市類別定義】\n\n✅ 認可：百佳, Donki, 759, AEON\n⚠️ HSBC陷阱：❌ 不包惠康, Market Place, 萬寧"); }
function showRedMerchantList() { alert("【HSBC Red 指定 (8%)】\n\n🍽️ 壽司郎, 譚仔, Coffee Academïcs\n👕 GU, Decathlon, Uniqlo\n🎮 NAMCO"); }
function showEveryMileMerchantList() { alert("【EveryMile 指定 ($2/里)】\n\n🚌 交通 (港鐵/巴士/Uber)\n☕ 咖啡 (Starbucks/Pacific)\n🌏 旅遊 (Klook/Agoda)"); }
function showChinaTips() { alert("【🇨🇳 中國內地/澳門】\n\n推薦：Pulse (手機支付+2%)、EveryMile ($2/里)、MMPower (6%)"); }

// Helper: Create Progress Card Component
function createProgressCard(config) {
    const { title, icon, theme, badge, subTitle, sections, warning, actionButton } = config;

    // Theme mapping
    const themeMap = {
        'purple': { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-800', bar: 'bg-purple-500', badge: 'bg-purple-600', subText: 'text-purple-600' },
        'red': { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700', bar: 'bg-red-500', badge: 'bg-red-600', subText: 'text-red-600' },
        'blue': { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', bar: 'bg-blue-500', badge: 'bg-blue-600', subText: 'text-blue-600' },
        'yellow': { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', bar: 'bg-yellow-400', badge: 'bg-yellow-500', subText: 'text-yellow-700' },
        'green': { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700', bar: 'bg-green-500', badge: 'bg-green-600', subText: 'text-green-600' },
        'indigo': { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', bar: 'bg-indigo-500', badge: 'bg-indigo-600', subText: 'text-indigo-800' },
        'black': { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-800', bar: 'bg-gray-800', badge: 'bg-black', subText: 'text-gray-600' }
    };

    const t = themeMap[theme] || themeMap['blue'];
    const badgeHtml = badge ? `<span class="${t.badge} text-white text-[10px] px-2 py-0.5 rounded-full">${badge}</span>` : '';
    const subTitleHtml = subTitle ? `<span class="text-[10px] ${t.subText}">${subTitle}</span>` : '';
    const warningHtml = warning ? `<div>${warning}</div>` : '';
    const actionButtonHtml = actionButton ? `<div class="mt-3 pt-3 border-t border-gray-200">
        <button onclick="${actionButton.onClick}" class="${actionButton.className || 'w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2'}">
            ${actionButton.icon ? `<i class="${actionButton.icon}"></i>` : ''}${actionButton.label}
        </button>
    </div>` : '';

    let sectionsHtml = [];
    if (sections) {
        sectionsHtml = sections.map(sec => {
            const barColor = sec.barColor || t.bar;
            // Support split bar (e.g. Winter Promo Lv1/Lv2 markers)
            const markersHtml = sec.markers ? `<div class="flex justify-between text-[8px] text-gray-400 mt-0.5 px-1">${sec.markers}</div>` : '';
            const subTextHtml = sec.subText ? `<div class="text-[10px] text-right mt-1">${sec.subText}</div>` : '';

            return `<div>
                <div class="flex justify-between text-xs mb-1">
                    <span class="${t.text} font-bold">${sec.label}</span>
                    <span class="text-gray-500 font-mono">${sec.valueText}</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-3 relative overflow-hidden">
                    <div class="${barColor} h-3 rounded-full transition-all duration-700 ${sec.striped ? 'progress-stripe' : ''}" style="width: ${sec.progress}%"></div>
                    ${sec.overlay || ''}
                </div>
                ${markersHtml}
                ${subTextHtml}
            </div>`;
        }).join('');
    }

    return `<div class="bg-white border-2 ${t.border} rounded-2xl shadow-sm overflow-hidden mb-4">
        <div class="${t.bg} p-3 border-b ${t.border} flex justify-between items-center">
            <div class="flex flex-col">
                <h3 class="${t.text} font-bold text-sm"><i class="${icon} mr-1"></i>${title}</h3>
                ${subTitleHtml}
            </div>
            ${badgeHtml}
        </div>
        <div class="p-4 space-y-4">
            ${warningHtml}
            ${sectionsHtml}
            ${actionButtonHtml}
        </div>
    </div>`;
}

// Helper: Create Calculator Result Card
function createResultCard(res, dataStr, mainValHtml, redemptionHtml) {
    return `<div class="card-enter bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start cursor-pointer hover:bg-blue-50 mb-3" onclick="handleRecord('${res.cardName}','${dataStr}')">
        <div class="w-2/3 pr-2">
            <div class="font-bold text-gray-800 text-sm truncate">${res.cardName}</div>
            <div class="text-xs text-gray-500 mt-1">${res.breakdown.join(" + ") || "基本回贈"}</div>
        </div>
        <div class="text-right w-1/3 flex flex-col items-end">
            ${mainValHtml}
            ${redemptionHtml}
            <div class="text-[10px] text-blue-500 font-bold mt-2 bg-blue-50 inline-block px-2 py-1 rounded-full border border-blue-100">+ 記一筆</div>
        </div>
    </div>`;
}

function renderDashboard(userProfile) {
    const container = document.getElementById('dashboard-container');
    let html = `<div class="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-5 rounded-2xl shadow-lg mb-4"><div class="flex justify-between items-start"><div><h2 class="text-blue-100 text-xs font-bold uppercase tracking-wider">本月總簽賬</h2><div class="text-3xl font-bold mt-1">$${userProfile.stats.totalSpend.toLocaleString()}</div></div><div class="text-right"><h2 class="text-blue-100 text-xs font-bold uppercase tracking-wider">預估總回贈</h2><div class="text-xl font-bold mt-1 text-yellow-300">≈ $${Math.floor(userProfile.stats.totalVal).toLocaleString()}</div></div></div><div class="mt-4 pt-4 border-t border-blue-400/30 flex justify-between text-xs text-blue-100"><span>已記錄 ${userProfile.stats.txCount} 筆</span><span onclick="handleReset()" class="cursor-pointer hover:text-white underline">重置</span></div></div>`;

    // 1. Travel Guru
    const level = parseInt(userProfile.settings.guru_level);
    if (level > 0) {
        const upgConfig = { 1: { next: "GING級", target: 30000 }, 2: { next: "GURU級", target: 70000 }, 3: { next: "保級", target: 70000 } };
        const rebateConfig = { 1: { cap: 500 }, 2: { cap: 1200 }, 3: { cap: 2200 } };
        const curUpg = upgConfig[level]; const curRebate = rebateConfig[level];
        const spendAccum = userProfile.usage["guru_spend_accum"] || 0;
        const rcUsed = userProfile.usage["guru_rc_used"] || 0;
        const upgPct = Math.min(100, (spendAccum / curUpg.target) * 100);
        const rebatePct = Math.min(100, (rcUsed / curRebate.cap) * 100);
        const isMaxed = rcUsed >= curRebate.cap;
        const lvName = { 1: "GO級", 2: "GING級", 3: "GURU級" }[level];

        // Show upgrade button if spending threshold met and not at max level
        const canUpgrade = spendAccum >= curUpg.target && level < 3;
        const upgradeButton = canUpgrade ? {
            label: `🎉 升級至 ${curUpg.next}`,
            icon: "fas fa-level-up-alt",
            onClick: "handleGuruUpgrade()"
        } : null;

        html += createProgressCard({
            title: "Travel Guru", icon: "fas fa-trophy", theme: "yellow", badge: lvName,
            sections: [
                { label: "🚀 升級進度", valueText: `$${spendAccum.toLocaleString()} / $${curUpg.target.toLocaleString()}`, progress: upgPct, barColor: "bg-blue-500", striped: true },
                { label: "💰 本級回贈", valueText: `${Math.floor(rcUsed)} / ${curRebate.cap}`, progress: rebatePct, barColor: isMaxed ? "bg-red-500" : "bg-yellow-400" }
            ],
            actionButton: upgradeButton
        });
    }

    // 2. EveryMile Promo
    if (userProfile.settings.em_promo_enabled) {
        const endDate = modulesDB["em_overseas_mission"].promo_end;
        const daysLeft = getDaysLeft(endDate);
        const warn = userProfile.ownedCards.includes('hsbc_everymile') ? '' : `<div class="bg-red-50 text-red-500 text-[10px] p-2 rounded mb-2 border border-red-100">⚠️ 請啟用 EveryMile 卡</div>`;
        const total = userProfile.usage["em_q1_total"] || 0;
        const eligible = userProfile.usage["em_q1_eligible"] || 0;
        const isUnlocked = total >= 12000;
        const missionPct = Math.min(100, (total / 12000) * 100);
        const pot = Math.min(225, eligible * 0.015);
        const rewardPct = Math.min(100, (pot / 225) * 100);
        const barCls = isUnlocked ? (pot >= 225 ? "bg-red-500" : "bg-green-500") : "bg-gray-400 opacity-50";

        html += createProgressCard({
            title: "EveryMile 海外", icon: "fas fa-plane", theme: "purple", badge: "已登記",
            subTitle: `至 ${endDate} (剩${daysLeft}天)`, warning: warn,
            sections: [
                { label: "🎯 任務進度", valueText: `$${total.toLocaleString()} / 12,000`, progress: missionPct, barColor: "bg-purple-500" },
                { label: "💰 回贈進度", valueText: `${Math.floor(pot)} / 225`, progress: rewardPct, barColor: barCls, striped: true }
            ]
        });
    }

    // 3. Winter Promo
    if (userProfile.settings.winter_promo_enabled) {
        const endDate = modulesDB["winter_tracker"].promo_end;
        const daysLeft = getDaysLeft(endDate);
        // Check if user has any HSBC card that supports winter tracker (all except EveryMile)
        const hsbcWinterCards = ['hsbc_vs', 'hsbc_red', 'hsbc_pulse', 'hsbc_unionpay_std', 'hsbc_easy', 'hsbc_gold_student', 'hsbc_gold', 'hsbc_premier'];
        const hasEligibleCard = userProfile.ownedCards.some(card => hsbcWinterCards.includes(card));
        const warn = hasEligibleCard ? '' : `<div class="bg-red-50 text-red-500 text-[10px] p-2 rounded mb-2 border border-red-100">⚠️ 請啟用任何 HSBC 卡片（EveryMile 除外）</div>`;

        // 任務進度
        const total = userProfile.usage["winter_total"] || 0;
        const missionPct = Math.min(100, (total / 40000) * 100);
        const l1 = total >= 20000, l2 = total >= 40000;

        // 回贈計算邏輯
        const eligible = userProfile.usage["winter_eligible"] || 0;
        let pot = 0, cap = 250;
        if (l2) { pot = Math.min(800, eligible * 0.06); cap = 800; }
        else { pot = Math.min(250, eligible * 0.03); cap = 250; }

        const rewardPct = Math.min(100, (pot / cap) * 100);
        const max = pot >= cap;
        const txt = (l1 || l2) ? (max ? `<span class="text-red-500 font-bold">⚠️ 已達等級上限</span>` : `<span class="text-green-600 font-bold">✅ 賺取中</span>`) : `<span class="text-gray-400 font-bold"><i class="fas fa-lock"></i> 待解鎖: ${Math.floor(pot)} RC</span>`;
        const barCls = (l1 || l2) ? (max ? "bg-red-500" : "bg-green-500") : "bg-gray-400 opacity-50";

        html += createProgressCard({
            title: "最紅冬日賞", icon: "fas fa-gift", theme: "red", badge: "已登記",
            subTitle: `至 ${endDate} (剩${daysLeft}天)`, warning: warn,
            sections: [
                {
                    label: "🎯 任務進度", valueText: `$${total.toLocaleString()}`, progress: missionPct, barColor: "bg-red-500",
                    markers: `<span>Start</span><span class="${l1 ? 'text-red-600 font-bold' : ''}">Lv1 ($20,000)</span><span class="${l2 ? 'text-red-600 font-bold' : ''}">Lv2 ($40,000)</span>`,
                    overlay: `<div class="absolute top-0 left-1/2 w-0.5 h-3 bg-white opacity-50"></div>`
                },
                {
                    label: "💰 回贈進度", valueText: `${Math.floor(pot)} / ${cap}`, progress: rewardPct, barColor: barCls, striped: true,
                    subText: txt
                }
            ]
        });
    }

    // 4. Monthly Spending Missions
    const missionCards = [
        {
            id: 'hangseng_mmpower', name: 'MMPower 每月任務', target: 5000,
            rewardKey: 'mmpower_reward_cap', rewardCap: 500,
            icon: 'fas fa-gamepad', theme: 'red', rewardText: '額外 +FUN'
        },
        {
            id: 'hangseng_travel_plus', name: 'Travel+ 每月任務', target: 6000,
            rewardKey: 'travel_plus_reward_cap', rewardCap: 500,
            icon: 'fas fa-plane-departure', theme: 'blue', rewardText: '額外 +FUN'
        },
        {
            id: 'dbs_black', name: 'DBS Black 兌換任務', target: 20000,
            rewardKey: null, // Spending only
            icon: 'fas fa-plane', theme: 'black', rewardText: null
        },
        {
            id: 'boc_cheers_vi', name: 'BOC Cheers VI 每月任務', target: 5000,
            rewardKey: 'boc_cheers_dining_cap', rewardCap: 100000, rewardUnit: '分', // 100k points dining cap
            icon: 'fas fa-glass-cheers', theme: 'purple', rewardText: '餐飲回贈Cap',
            secondaryCap: { key: 'boc_cheers_travel_cap', limit: 250000, text: '旅遊/外幣Cap', unit: '分' } // 250k points travel cap
        },
        {
            id: 'boc_cheers_vs', name: 'BOC Cheers VS 每月任務', target: 5000,
            rewardKey: 'boc_cheers_dining_cap_vs', rewardCap: 60000, rewardUnit: '分',
            icon: 'fas fa-glass-cheers', theme: 'purple', rewardText: '餐飲回贈Cap',
            secondaryCap: { key: 'boc_cheers_travel_cap_vs', limit: 150000, text: '旅遊/外幣Cap', unit: '分' }
        },
        {
            id: 'boc_chill', name: 'BOC Chill 每月任務', target: 1500,
            rewardKey: 'boc_chill_cap', rewardCap: 150,
            icon: 'fas fa-film', theme: 'indigo', rewardText: '回贈上限'
        },
        // BOC Amazing Rewards (狂賞派)
        {
            id: 'boc_cheers_vi', name: '狂賞派 (5%) 每月任務', target: 5000,
            rewardKey: 'boc_amazing_cap', rewardCap: 300, rewardUnit: '元',
            icon: 'fas fa-fire', theme: 'red', rewardText: '回贈上限'
        },
        {
            id: 'boc_cheers_vs', name: '狂賞派 (5%) 每月任務', target: 5000,
            rewardKey: 'boc_amazing_cap', rewardCap: 300, rewardUnit: '元',
            icon: 'fas fa-fire', theme: 'red', rewardText: '回贈上限'
        },
        // BOC Amazing Fly (狂賞飛)
        {
            id: 'boc_cheers_vi', name: '狂賞飛 (外幣) 每月任務', target: 5000,
            rewardKey: 'boc_amazing_fly_cn_cap', rewardCap: 300, rewardUnit: '元',
            secondaryCap: { key: 'boc_amazing_fly_other_cap', limit: 300, text: '回贈上限 (其他)', unit: '元' },
            icon: 'fas fa-plane', theme: 'blue', rewardText: '回贈上限 (中澳)'
        },
        {
            id: 'boc_cheers_vs', name: '狂賞飛 (外幣) 每月任務', target: 5000,
            rewardKey: 'boc_amazing_fly_cn_cap', rewardCap: 300, rewardUnit: '元',
            secondaryCap: { key: 'boc_amazing_fly_other_cap', limit: 300, text: '回贈上限 (其他)', unit: '元' },
            icon: 'fas fa-plane', theme: 'blue', rewardText: '回贈上限 (中澳)'
        },
        // Fubon iN
        {
            id: 'fubon_in_platinum', name: 'Fubon iN 月簽任務', target: 1000,
            rewardKey: 'fubon_in_bonus_cap', rewardCap: 62500, rewardUnit: '分',
            icon: 'fas fa-mouse-pointer', theme: 'purple', rewardText: '網購Cap'
        },
        // sim Credit
        {
            id: 'sim_credit', name: 'sim 非網購任務', target: 500,
            usageKey: 'sim_non_online_spend', // Custom tracking key from module
            rewardKey: 'sim_online_cap', rewardCap: 200, rewardUnit: '元',
            icon: 'fas fa-shopping-basket', theme: 'green', rewardText: '網購Cap'
        }
    ];

    missionCards.forEach(mc => {
        if (userProfile.ownedCards.includes(mc.id)) {
            const spendKey = mc.usageKey || `spend_${mc.id}`;
            const spend = userProfile.usage[spendKey] || 0;
            const pct = Math.min(100, (spend / mc.target) * 100);
            const isUnlocked = spend >= mc.target;

            let statusText = isUnlocked ? `<span class="text-green-600 font-bold">✅ 已達標</span>` : `<span class="text-gray-400">🔒尚欠 $${(mc.target - spend).toLocaleString()}</span>`;
            let spendBarClass = isUnlocked ? "" : "bg-gray-400 opacity-50"; // Let theme default handle unlocked color, or override

            // DBS Black Adjustment
            if (mc.id === 'dbs_black') {
                statusText = isUnlocked ? `<span class="text-green-600 font-bold">✅ 已升級 $2/里</span>` : `<span class="text-gray-500">🔒 $4/里 (尚欠 $${(mc.target - spend).toLocaleString()})</span>`;
            }

            const sections = [];

            // 1. Spending Goal
            sections.push({
                label: "🎯 簽賬門檻",
                valueText: `$${spend.toLocaleString()} / $${mc.target.toLocaleString()}`,
                progress: pct,
                barColor: spendBarClass, // If empty, defaults to theme
                subText: statusText
            });

            // 2. Primary Reward Cap
            if (mc.rewardKey) {
                const rewardUsed = userProfile.usage[mc.rewardKey] || 0;
                const rewardPct = Math.min(100, (rewardUsed / mc.rewardCap) * 100);
                const isMaxed = rewardUsed >= mc.rewardCap;
                const remaining = Math.max(0, mc.rewardCap - rewardUsed);

                const unit = mc.rewardUnit || '';
                const prefix = unit ? '' : '$';

                sections.push({
                    label: `💰 ${mc.rewardText}`,
                    valueText: `${prefix}${Math.floor(rewardUsed).toLocaleString()}${unit} / ${prefix}${mc.rewardCap.toLocaleString()}${unit}`,
                    progress: rewardPct,
                    striped: true,
                    barColor: isMaxed ? "bg-red-500" : (isUnlocked ? "bg-green-500" : null), // null = default theme
                    subText: isMaxed ? '⚠️ 已爆 Cap' : `尚餘 ${prefix}${Math.floor(remaining).toLocaleString()}${unit}`
                });
            }

            // 3. Secondary Cap
            if (mc.secondaryCap) {
                const secUsed = userProfile.usage[mc.secondaryCap.key] || 0;
                const secPct = Math.min(100, (secUsed / mc.secondaryCap.limit) * 100);
                const secMaxed = secUsed >= mc.secondaryCap.limit;
                const remaining = Math.max(0, mc.secondaryCap.limit - secUsed);

                const unit = mc.secondaryCap.unit || '';
                const prefix = unit ? '' : '$';

                sections.push({
                    label: `💰 ${mc.secondaryCap.text}`,
                    valueText: `${prefix}${Math.floor(secUsed).toLocaleString()}${unit} / ${prefix}${mc.secondaryCap.limit.toLocaleString()}${unit}`,
                    progress: secPct,
                    striped: true,
                    barColor: secMaxed ? "bg-red-500" : (isUnlocked ? "bg-green-500" : null),
                    subText: secMaxed ? '⚠️ 已爆 Cap' : `尚餘 ${prefix}${Math.floor(remaining).toLocaleString()}${unit}`
                });
            }

            html += createProgressCard({
                title: mc.name, icon: mc.icon, theme: mc.theme, badge: "每月重置",
                sections: sections
            });
        }
    });

    container.innerHTML = html;

    // Cap Monitors
    const c = document.getElementById('cap-monitors'); c.innerHTML = "";
    const monitors = [
        { id: 'hsbc_red', key: 'red_online_cap', name: 'Red 網購 (4%)', limit: 10000, rate: 0.04, color: 'bg-pink-500', reset: '🔄 每月1日重置' },
        { id: 'hsbc_gold_student', key: 'student_tuition_cap', name: '學生學費', limit: 8333, rate: 0.024, color: 'bg-green-500', reset: '📅 推廣期內' },
        { id: 'sc_smart', key: 'sc_smart_cap', name: 'Smart 指定 (5%)', limit: 60000, rate: 0.05, color: 'bg-emerald-500', reset: '🔄 每年發卡日重置' },
        { id: 'citi_octopus', key: 'citi_oct_transport_cap', name: 'Citi Octopus (15%)', limit: 2000, rate: 0.15, color: 'bg-orange-500', reset: '🔄 每月1日重置' },
        // DBS Cap Monitors
        { id: 'dbs_eminent', key: 'dbs_eminent_bonus_cap', name: 'Eminent 指定 (5%)', limit: 8000, rate: 0.05, color: 'bg-gray-800', reset: '🔄 每月1日重置' },
        { id: 'dbs_live_fresh', key: 'dbs_live_fresh_cap', name: 'Live Fresh (5%)', type: 'reward_cap', limit: 150, rate: 0.05, color: 'bg-teal-500', reset: '🔄 每月1日重置' },

        // BOC Cap Monitors
        { id: 'boc_go_diamond', key: 'boc_go_mobile_cap', name: 'Go 手機支付 (4%)', type: 'reward_cap', limit: 100, rate: 0.04, color: 'bg-green-600', reset: '🔄 每月1日重置', unit: '分' },
        { id: 'boc_go_diamond', key: 'boc_go_merchant_cap', name: 'Go 商戶 (5%)', type: 'reward_cap', limit: 100, rate: 0.05, color: 'bg-blue-600', reset: '🔄 每月1日重置', unit: '分' },

        // AE Cap Monitors
        { id: 'ae_explorer', key: 'ae_explorer_q_overseas_cap', name: 'AE Explorer 季選 (海外 7X)', limit: 10000, rate: 7, color: 'bg-blue-800', reset: '🔄 每季重置', unit: '分' },
        { id: 'ae_explorer', key: 'ae_explorer_q_selected_cap', name: 'AE Explorer 季選 (指定 7X)', limit: 10000, rate: 7, color: 'bg-blue-800', reset: '🔄 每季重置', unit: '分' },
        { id: 'ae_platinum', key: 'ae_plat_overseas_cap', name: '細頭 Accelerator (海外)', limit: 15000, rate: 5, color: 'bg-gray-400', reset: '🔄 每季重置', unit: '分' },
        { id: 'ae_platinum', key: 'ae_plat_travel_cap', name: '細頭 Accelerator (旅遊)', limit: 15000, rate: 7, color: 'bg-gray-400', reset: '🔄 每季重置', unit: '分' },
        { id: 'ae_platinum', key: 'ae_plat_daily_cap', name: '細頭 Accelerator (日常)', limit: 15000, rate: 7, color: 'bg-gray-400', reset: '🔄 每季重置', unit: '分' },
        { id: 'ae_platinum_credit', key: 'ae_pcc_double_cap', name: '大頭 Double Points', type: 'reward_cap', limit: 30000, rate: 3, color: 'bg-yellow-600', reset: '🔄 每月重置', unit: '分' },

        // New Card Caps
        { id: 'fubon_in_platinum', key: 'fubon_in_bonus_cap', name: 'Fubon iN 網購 (20X)', type: 'reward_cap', limit: 62500, rate: 19, color: 'bg-purple-600', reset: '🔄 每月重置', unit: '分' },
        { id: 'sim_credit', key: 'sim_online_cap', name: 'sim 網購 (8%)', type: 'reward_cap', limit: 200, rate: 0.08, color: 'bg-blue-500', reset: '🔄 每月重置' },
        { id: 'aeon_wakuwaku', key: 'aeon_waku_cap', name: 'WAKU 網購/日本', type: 'reward_cap', limit: 300, rate: 0.06, color: 'bg-pink-500', reset: '🔄 每月重置' },
        { id: 'wewa', key: 'wewa_annual_cap', name: 'WeWa 旅遊 (4%)', type: 'reward_cap', limit: 2000, rate: 0.04, color: 'bg-yellow-500', reset: '🔄 每年重置' },
        { id: 'earnmore', key: 'earnmore_annual_spend', name: 'EarnMORE (2%)', limit: 150000, rate: 0.02, color: 'bg-blue-400', reset: '🔄 每年重置' }
    ];
    monitors.forEach(m => {
        if (userProfile.ownedCards.includes(m.id)) {
            const rawUsage = userProfile.usage[m.key] || 0;
            let currentVal = 0;
            let maxVal = 0;
            let label = `💰 回贈Cap (Reward)`; // Unified label
            let unit = m.unit || '$';

            if (m.type === 'reward_cap') {
                // Already Reward Value
                currentVal = rawUsage;
                maxVal = m.limit;
            } else {
                // Convert Spending Cap to Reward Cap (Implied)
                currentVal = rawUsage * m.rate;
                maxVal = m.limit * m.rate;
            }

            const pct = Math.min(100, (currentVal / maxVal) * 100);
            const remaining = Math.max(0, maxVal - currentVal);

            // Adjust unit prefix for '分' or '元'
            // If unit is '$' or '元', prefix is '$', suffix is empty? 
            // If unit is '分', prefix empty, suffix '分'
            const displayUnit = (unit === '分') ? '分' : ((unit === '元' || unit === '$') ? '' : unit);
            const displayPrefix = (unit === '元' || unit === '$') ? '$' : '';

            // Render with optional threshold bar for Amazing Rewards
            let thresholdHtml = '';
            if (m.threshold && m.thresholdKey) {
                const thresholdSpend = userProfile.usage[m.thresholdKey] || 0;
                const thresholdPct = Math.min(100, (thresholdSpend / m.threshold) * 100);
                const thresholdMet = thresholdSpend >= m.threshold;
                const thresholdBarClass = thresholdMet ? 'bg-green-500' : 'bg-gray-400 opacity-50';
                thresholdHtml = `
                    <div class="mb-3 pb-3 border-b border-gray-200">
                        <div class="flex justify-between text-xs mb-1">
                            <span class="text-gray-600 font-bold">🎯 門檻任務</span>
                            <span class="font-mono text-gray-700">$${thresholdSpend.toLocaleString()} / $${m.threshold.toLocaleString()}</span>
                        </div>
                        <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div class="${thresholdBarClass} h-2 rounded-full transition-all duration-500" style="width: ${thresholdPct}%"></div>
                        </div>
                        <div class="text-[10px] text-right mt-1">
                            ${thresholdMet ? '<span class="text-green-600 font-bold">✅ 已達標</span>' : `<span class="text-gray-400">🔒尚欠 $${(m.threshold - thresholdSpend).toLocaleString()}</span>`}
                        </div>
                    </div>
                `;
            }

            c.innerHTML += `<div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div class="flex justify-between mb-2">
                    <div class="flex flex-col">
                        <span class="font-bold text-gray-700 text-sm">${m.name}</span>
                        <span class="text-[10px] text-gray-400">${m.reset}</span>
                    </div>
                </div>
                
                ${thresholdHtml}
                
                <div class="mb-1">
                    <div class="flex justify-between text-xs mb-1">
                        <span class="text-gray-600 font-bold">${label}</span>
                        <span class="font-mono text-gray-700">${displayPrefix}${Math.floor(currentVal).toLocaleString()}${displayUnit} / ${displayPrefix}${Math.floor(maxVal).toLocaleString()}${displayUnit}</span>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div class="${m.color} h-2 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                    </div>
                </div>
                
                <div class="text-[10px] text-right text-gray-500 mt-1">
                    尚餘: ${displayPrefix}${Math.floor(remaining).toLocaleString()}${displayUnit}
                </div>
            </div>`;
        }
    });
}

function renderCalculatorResults(results, currentMode) {
    let html = "";

    results.forEach((res, index) => {
        // Prepare Rebate Text (User specific request)
        // Miles -> "400里", Cash -> "$40", RC -> "400 RC"
        let resultText = "";
        const u = res.displayUnit;
        const v = res.displayVal;

        if (v === '---') {
            resultText = '---';
        } else if (u === 'Miles' || u === '里') {
            resultText = `${v}里`;
        } else if (u === 'RC') {
            resultText = `${v} RC`;
        } else if (u === '$' || u === 'HKD' || u === '元') {
            resultText = `$${v}`;
        } else {
            resultText = `${v} ${u}`; // Fallback
        }

        const dataStr = encodeURIComponent(JSON.stringify({
            amount: res.amount, trackingKey: res.trackingKey, estValue: res.estValue,
            guruRC: res.guruRC, missionTags: res.missionTags, category: res.category,
            cardId: res.cardId,
            rewardTrackingKey: res.rewardTrackingKey,
            secondaryRewardTrackingKey: res.secondaryRewardTrackingKey,
            generatedReward: res.generatedReward,
            resultText: resultText
        }));
        const valClass = res.displayVal === '---' ? 'text-gray-400 font-medium' : 'text-red-600 font-bold';

        let mainValHtml = `<div class="text-xl ${valClass}">${res.displayVal} <span class="text-xs text-gray-400">${res.displayUnit}</span></div>`;
        let redemptionHtml = "";

        if (res.redemptionConfig) {
            const rd = res.redemptionConfig;
            if (res.displayVal !== '---') {
                mainValHtml = `
                    <div class="text-xl ${valClass}">${res.displayVal} <span class="text-xs text-gray-400">${res.displayUnit}</span></div>
                    <div class="text-xs text-gray-500 mt-0.5 font-mono">(${Math.floor(res.nativeVal).toLocaleString()} ${rd.unit})</div>
                `;
            } else {
                mainValHtml = `
                    <div class="text-xl text-gray-400 font-medium">---</div>
                    <div class="text-xs text-gray-500 mt-0.5 font-mono">${Math.floor(res.nativeVal).toLocaleString()} ${rd.unit}</div>
                `;
            }

            redemptionHtml = `
                <div class="mt-1 flex justify-end">
                    <button onclick="alert('【兌換詳情】\\n💰 手續費: ${rd.fee}\\n📉 最低兌換: ${rd.min.toLocaleString()} ${rd.unit}\\n🔄 比率: ${rd.ratio}')" 
                        class="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-yellow-200 transition-colors">
                        <i class="fas fa-exclamation-circle"></i> 條款
                    </button>
                </div>`;
        }

        // Add top result styling for top 3
        const isTop = index < 3 && res.displayVal !== '---';
        const topClass = isTop ? ' top-result relative' : '';
        const topBadge = index === 0 && res.displayVal !== '---' ? '<span class="top-result-badge">🏆 最佳</span>' : '';

        html += `<div class="card-enter bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start cursor-pointer hover:bg-blue-50 mb-3${topClass}" onclick="handleRecord('${res.cardName}','${dataStr}')">
            ${topBadge}
            <div class="w-2/3 pr-2">
                <div class="font-bold text-gray-800 text-sm truncate">${res.cardName}</div>
                <div class="text-xs text-gray-500 mt-1">${res.breakdown.join(" + ") || "基本回贈"}</div>
            </div>
            <div class="text-right w-1/3 flex flex-col items-end">
                ${mainValHtml}
                ${redemptionHtml}
                <div class="text-[10px] text-blue-500 font-bold mt-2 bg-blue-50 inline-block px-2 py-1 rounded-full border border-blue-100">+ 記一筆</div>
            </div>
        </div>`;
    });

    if (results.length === 0) html = `<div class="text-center text-gray-400 py-10 text-sm">請先在「設定」頁面新增卡片</div>`;
    document.getElementById('calc-results').innerHTML = html;
}

function renderSettings(userProfile) {
    const list = document.getElementById('settings-container');
    const bankGroups = [
        { name: "🦁 HSBC 滙豐", filter: id => id.startsWith('hsbc_') },
        { name: "🔵 Standard Chartered 渣打", filter: id => id.startsWith('sc_') },
        { name: "🏦 Citi 花旗", filter: id => id.startsWith('citi_') },
        { name: "⚫ DBS 星展", filter: id => id.startsWith('dbs_') },
        { name: "🌿 Hang Seng 恒生", filter: id => id.startsWith('hangseng_') },
        { name: "🏛️ BOC 中銀", filter: id => id.startsWith('boc_') },
        { name: "🏛️ American Express", filter: id => id.startsWith('ae_') },
        { name: "🏦 Fubon 富邦", filter: id => id.startsWith('fubon_') },
        { name: "💳 sim / AEON / WeWa", filter: id => id.startsWith('sim_') || id.startsWith('aeon_') || id.startsWith('wewa') || id.startsWith('earnmore') || id.startsWith('mox_') },
        { name: "💎 Others 其他", filter: id => !id.startsWith('hsbc_') && !id.startsWith('sc_') && !id.startsWith('citi_') && !id.startsWith('dbs_') && !id.startsWith('hangseng_') && !id.startsWith('boc_') && !id.startsWith('ae_') && !id.startsWith('fubon_') && !id.startsWith('sim_') && !id.startsWith('aeon_') && !id.startsWith('wewa') && !id.startsWith('earnmore') && !id.startsWith('mox_') }
    ];

    // Data Management Section
    let html = `<div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-2xl shadow-sm border-2 border-blue-200 mb-4">
        <h2 class="text-sm font-bold text-blue-800 uppercase mb-3 flex items-center gap-2">
            <i class="fas fa-database"></i> 數據管理
        </h2>
        <div class="grid grid-cols-2 gap-3">
            <button onclick="exportData()" 
                class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                <i class="fas fa-download"></i> 匯出數據
            </button>
            <label class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer">
                <i class="fas fa-upload"></i> 匯入數據
                <input type="file" accept=".json" onchange="importData(event)" class="hidden">
            </label>
        </div>
        <p class="text-xs text-blue-700 mt-3 bg-blue-100 p-2 rounded-lg">
            💡 建議定期匯出數據作備份，以免瀏覽器清除數據時遺失記錄。
        </p>
    </div>`;

    html += `<div class="bg-white p-5 rounded-2xl shadow-sm"><h2 class="text-sm font-bold text-gray-800 uppercase mb-4 border-b pb-2">我的錢包</h2><div class="space-y-6">`;
    bankGroups.forEach(group => {
        const groupCards = cardsDB.filter(c => group.filter(c.id));
        if (groupCards.length > 0) {
            html += `<div><h3 class="text-xs font-bold text-gray-400 uppercase mb-2 pl-1 tracking-wider">${group.name}</h3><div class="bg-gray-50 rounded-xl px-3 py-1 border border-gray-100">`;
            groupCards.forEach(c => {
                const ch = userProfile.ownedCards.includes(c.id) ? 'checked' : '';
                html += `<div class="flex justify-between items-center py-3 border-b border-gray-200 last:border-0"><span class="text-sm text-gray-700 font-medium">${c.name}</span><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" class="sr-only peer" ${ch} onchange="toggleCard('${c.id}')"><div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div></label></div>`;
            });
            html += `</div></div>`;
        }
    });

    html += `</div></div><div class="bg-white p-5 rounded-2xl shadow-sm mt-4"><h2 class="text-sm font-bold text-gray-800 uppercase mb-4 border-b pb-2">設定</h2><div class="space-y-4">`;
    html += `<div class="mb-4"><label class="text-xs font-bold text-gray-500">Travel Guru</label><select id="st-guru" class="w-full p-2 bg-gray-50 rounded" onchange="saveDrop('guru_level',this.value)"><option value="0">無</option><option value="1">GO級</option><option value="2">GING級</option><option value="3">GURU級</option></select></div>`;

    // Live Fresh Preference
    html += `<div class="mb-4"><label class="text-xs font-bold text-teal-600">DBS Live Fresh 自選類別 (4選1)</label>
        <select id="st-live-fresh" class="w-full p-2 bg-teal-50 rounded border border-teal-100" onchange="saveDrop('live_fresh_pref',this.value)">
            <option value="none">未設定</option>
            <option value="online_foreign">網上外幣簽賬 (Online Foreign Currency)</option>
            <option value="travel">旅遊娛樂探索達人 (Entertainment & Travel Expert)</option>
            <option value="fashion">潮流教主 (Fashionista)</option>
            <option value="charity">慈善關愛者 (Sustainability & Charity)</option>
        </select>
    </div>`;

    const rhEnabled = userProfile.settings.red_hot_rewards_enabled !== false;
    html += `<div class="mb-4 border p-3 rounded-xl bg-gray-50"><div class="flex justify-between items-center mb-2"><label class="text-xs font-bold text-red-600">已登記「最紅自主獎賞」</label><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" id="st-rh-enabled" class="sr-only peer" ${rhEnabled ? 'checked' : ''} onchange="toggleSetting('red_hot_rewards_enabled')"><div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-red-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div></label></div><div id="rh-allocator-container" class="${rhEnabled ? '' : 'hidden'} space-y-2 transition-all"><div class="text-[10px] text-gray-400 mb-2">分配 5X 獎賞錢 (總和: <span id="rh-total" class="text-blue-600">5</span>/5)</div>${renderAllocatorRow("dining", "賞滋味 (Dining)", userProfile.settings.red_hot_allocation.dining)}${renderAllocatorRow("world", "賞世界 (World)", userProfile.settings.red_hot_allocation.world)}${renderAllocatorRow("enjoyment", "賞享受 (Enjoyment)", userProfile.settings.red_hot_allocation.enjoyment)}${renderAllocatorRow("home", "賞家居 (Home)", userProfile.settings.red_hot_allocation.home)}${renderAllocatorRow("style", "賞購物 (Style)", userProfile.settings.red_hot_allocation.style)}</div></div>`;

    html += `<div class="flex justify-between items-center bg-red-50 p-2 rounded border border-red-100"><span>冬日賞 2026</span><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" id="st-winter" class="sr-only peer" ${userProfile.settings.winter_promo_enabled ? 'checked' : ''} onchange="toggleSetting('winter_promo_enabled')"><div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer peer-checked:bg-red-500"></div></label></div>`;
    html += `<div class="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100"><span>BOC 狂賞派 + 狂賞飛</span><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" id="st-boc-amazing" class="sr-only peer" ${userProfile.settings.boc_amazing_enabled ? 'checked' : ''} onchange="toggleSetting('boc_amazing_enabled')"><div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer peer-checked:bg-blue-600"></div></label></div>`;
    html += `<div class="flex justify-between items-center bg-gray-100 p-2 rounded border border-gray-300"><span>DBS Black $2/里推廣</span><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" id="st-dbs-black" class="sr-only peer" ${userProfile.settings.dbs_black_promo_enabled ? 'checked' : ''} onchange="toggleSetting('dbs_black_promo_enabled')"><div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer peer-checked:bg-gray-800"></div></label></div>`;
    html += `<div class="flex justify-between items-center bg-purple-50 p-2 rounded border border-purple-100"><span>Fubon iN 網購20X</span><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" id="st-fubon-in" class="sr-only peer" ${userProfile.settings.fubon_in_promo_enabled ? 'checked' : ''} onchange="toggleSetting('fubon_in_promo_enabled')"><div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer peer-checked:bg-purple-600"></div></label></div>`;
    html += `<div class="flex justify-between items-center bg-green-50 p-2 rounded border border-green-100"><span>sim 8%網購推廣</span><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" id="st-sim" class="sr-only peer" ${userProfile.settings.sim_promo_enabled ? 'checked' : ''} onchange="toggleSetting('sim_promo_enabled')"><div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer peer-checked:bg-green-600"></div></label></div>`;
    html += `<div class="flex justify-between items-center bg-gray-800 text-white p-2 rounded border border-gray-600"><span>Mox 活期任務 (+$250k)</span><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" id="st-mox" class="sr-only peer" ${userProfile.settings.mox_deposit_task_enabled ? 'checked' : ''} onchange="toggleSetting('mox_deposit_task_enabled')"><div class="w-9 h-5 bg-gray-500 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer peer-checked:bg-green-400"></div></label></div>`;
    html += `<div class="flex justify-between items-center bg-purple-50 p-2 rounded border border-purple-100"><span>EM 推廣</span><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" id="st-em" class="sr-only peer" ${userProfile.settings.em_promo_enabled ? 'checked' : ''} onchange="toggleSetting('em_promo_enabled')"><div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-purple-600"></div></label></div>`;
    html += `</div><div class="text-center mt-4"><button onclick="if(confirm('清除資料?')){localStorage.clear();location.reload();}" class="text-red-400 text-xs">Reset All</button></div></div>`;

    list.innerHTML = html;
    document.getElementById('st-guru').value = userProfile.settings.guru_level;
    document.getElementById('st-live-fresh').value = userProfile.settings.live_fresh_pref || "none";
    if (rhEnabled) updateAllocationTotal();
}

function renderAllocatorRow(key, label, value) { return `<div class="flex justify-between items-center bg-white p-2 rounded border"><span class="text-xs font-bold text-gray-700">${label}</span><div class="flex items-center gap-3"><button class="w-6 h-6 bg-gray-200 rounded text-gray-600 font-bold" onclick="changeAllocation('${key}', -1)">-</button><span class="text-sm font-mono w-4 text-center" id="alloc-${key}">${value}</span><button class="w-6 h-6 bg-gray-200 rounded text-gray-600 font-bold" onclick="changeAllocation('${key}', 1)">+</button></div></div>`; }
function changeAllocation(key, delta) {
    const current = userProfile.settings.red_hot_allocation[key];
    const total = Object.values(userProfile.settings.red_hot_allocation).reduce((a, b) => a + b, 0);
    if (delta > 0 && total >= 5) return;
    if (delta < 0 && current <= 0) return;
    userProfile.settings.red_hot_allocation[key] += delta;
    saveUserData();
    document.getElementById(`alloc-${key}`).innerText = userProfile.settings.red_hot_allocation[key];
    updateAllocationTotal();
}
function updateAllocationTotal() { const total = Object.values(userProfile.settings.red_hot_allocation).reduce((a, b) => a + b, 0); const el = document.getElementById('rh-total'); if (el) { el.innerText = total; if (total === 5) el.className = "text-green-600 font-bold"; else el.className = "text-red-500 font-bold"; } }// --- LEDGER ---
window.renderLedger = function (transactions) {
    const container = document.getElementById('ledger-container');
    if (!transactions || transactions.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-400 mt-20">
                <i class="fas fa-receipt text-5xl mb-4 text-gray-200"></i>
                <p>暫無簽賬記錄</p>
                <button onclick="switchTab('calculator')" class="mt-4 text-blue-500 text-sm font-bold">立即去記賬 ></button>
            </div>`;
        return;
    }

    let html = `<div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-gray-800">最近記錄 (${transactions.length})</h3>
        <button onclick="handleClearHistory()" class="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">清除所有</button>
    </div>
    <div class="space-y-3">`;

    transactions.forEach(tx => {
        const date = new Date(tx.date);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        // Try to get nice card name if possible, else use ID
        // Note: cardsDB is defined in data.js, but might be 'const' in global scope.
        // We can access 'cardsDB' directly as it is loaded first.
        let cardName = tx.cardId;
        if (typeof cardsDB !== 'undefined') {
            const c = cardsDB.find(x => x.id === tx.cardId);
            if (c) cardName = c.name;
        }

        html += `
            <div class="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">${dateStr}</span>
                        <span class="text-xs text-gray-500 truncate max-w-[120px]">${cardName}</span>
                    </div>
                     <div class="text-sm font-bold text-gray-800">
                        ${(() => {
                // Try to look up category name
                const def = CATEGORY_DEF.find(d => d.v === tx.category);
                // If found, use title (simplified?) or full title. Let's use simplified part if possible or just full title.
                // The titles are like "🍱 餐飲 (Dining)", maybe just take the part before (.
                // Actually user said "顯示中文類別", so full title is fine, or maybe cleaner.
                // Let's us full title for now as it contains the icon.
                return def ? def.t.split(' (')[0] : (tx.desc || tx.category);
            })()}
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-base font-bold">$${tx.amount.toLocaleString()}</div>
                    <div class="text-xs text-green-600 font-medium">+${tx.rebateText}</div>
                </div>
            </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

window.handleClearHistory = function () {
    if (confirm("確定要清除所有記帳記錄嗎？此操作無法復原。")) {
        userProfile.transactions = [];
        saveUserData();
        renderLedger([]);
    }
}
