// js/ui.js - V10.10 (Fix Winter Promo Reward Bar)

function escapeHtml(input) {
    return String(input)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Helper: Calculate days remaining
function getDaysLeft(dateStr) {
    if (!dateStr) return null;
    const end = new Date(dateStr);
    const now = new Date();
    const diff = end - now;
    if (diff < 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Helper: Standard Date Display (YYYY-MM-DD (剩 X 日))
function formatDateWithDaysLeft(dateStr) {
    if (!dateStr) return "";
    const days = getDaysLeft(dateStr);
    return `${dateStr} (剩 ${days} 日)`;
}

// Helper: Reset Date Display (重置於 YYYY-MM-DD (剩 X 日))
function formatResetDate(dateStr) {
    if (!dateStr) return "";
    const days = getDaysLeft(dateStr);
    return `於 ${dateStr} 重置 (剩 ${days} 日)`;
}

// Helper: Promo End Date Display (推廣期至 YYYY-MM-DD (剩 X 日))
function formatPromoDate(dateStr) {
    if (!dateStr) return "";
    const days = getDaysLeft(dateStr);
    return `推廣期至 ${dateStr} (剩 ${days} 日)`;
}

// Helper: Get Month End Date String (e.g. "2026-01-31")
function getMonthEndStr() {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(lastDay.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${m}-${d}`;
}

// Helper: Get Quarter End Date String (e.g. "2026-03-31")
function getQuarterEndStr() {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11
    const endMonth = Math.floor(currentMonth / 3) * 3 + 2;
    const year = now.getFullYear();
    const lastDay = new Date(year, endMonth + 1, 0);
    const m = String(endMonth + 1).padStart(2, '0');
    const d = String(lastDay.getDate()).padStart(2, '0');
    return `${year}-${m}-${d}`;
}

function getMonthTotals(transactions) {
    if (!Array.isArray(transactions)) return { spend: 0, reward: 0, count: 0 };
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    let spend = 0;
    let reward = 0;
    let count = 0;
    transactions.forEach(tx => {
        let d = null;
        if (tx.txDate) {
            const parts = String(tx.txDate).split('-').map(n => parseInt(n, 10));
            if (parts.length === 3 && parts.every(n => Number.isFinite(n))) {
                const [y, m, day] = parts;
                d = new Date(y, m - 1, day);
            }
        }
        if (!d && tx.date) d = new Date(tx.date);
        if (!d || Number.isNaN(d.getTime())) return;
        if (d.getFullYear() !== y || d.getMonth() !== m) return;
        spend += Number(tx.amount) || 0;
        reward += Number(tx.rebateVal) || 0;
        count += 1;
    });
    return { spend, reward, count };
}

// Helper: Render Warning Card (Yellow/Black for Not Registered)
function renderWarningCard(title, icon, description, settingKey) {
    return `<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-xl shadow-sm mb-4">
        <div class="flex items-start">
            <div class="flex-shrink-0">
                <i class="fas fa-exclamation-triangle text-yellow-600 text-xl mt-1"></i>
            </div>
            <div class="ml-3 w-full">
                <h3 class="text-sm font-bold text-yellow-800">${title}</h3>
                <div class="mt-1 text-xs text-yellow-700 font-bold mb-2">
                    ⚠️ 尚未登記 (NOT REGISTERED)
                </div>
                <div class="text-[10px] text-yellow-600 mb-2">${description || "請前往設定頁面開啟此推廣。"}</div>
                <button onclick="toggleSetting('${settingKey}'); refreshUI();" class="text-xs bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-3 py-1.5 rounded-lg font-bold transition-colors">
                    立即開啟
                </button>
            </div>
        </div>
    </div>`;
}

function renderPromoOverlay(overlayModel) {
    if (!overlayModel || !overlayModel.type) return "";

    if (overlayModel.type === "winter_mission") {
        const t1 = Number(overlayModel.tier1) || 0;
        const t2 = Math.max(t1, Number(overlayModel.tier2) || 0);
        const spend = Number(overlayModel.spend) || 0;
        const totalCap = t2 || 1;
        const seg1Width = (t1 / totalCap) * 100;
        const seg2Width = 100 - seg1Width;
        const seg1Fill = t1 > 0 ? Math.min(1, spend / t1) * seg1Width : 0;
        const seg2Fill = t2 > t1 ? Math.min(1, Math.max(0, spend - t1) / (t2 - t1)) * seg2Width : 0;
        const seg1WidthSafe = Math.max(0, Math.min(100, seg1Width));
        const seg2WidthSafe = Math.max(0, Math.min(100, seg2Width));

        return `<div class="absolute inset-0">
            <div class="absolute inset-0 flex">
                <div style="width:${seg1WidthSafe}%" class="h-3"></div>
                <div style="width:${seg2WidthSafe}%" class="bg-gray-200 h-3"></div>
            </div>
            <div class="absolute inset-0 flex">
                <div style="width:${seg1Fill}%" class="bg-blue-500 h-3"></div>
                <div style="width:${seg2Fill}%" class="bg-blue-400 h-3"></div>
            </div>
            <div class="absolute top-0 bottom-0" style="left:${seg1WidthSafe}%; width:1px; background:rgba(0,0,0,0.08)"></div>
        </div>`;
    }

    if (overlayModel.type === "winter_reward") {
        const cap1 = Number(overlayModel.cap1) || 0;
        const cap2 = Math.max(cap1, Number(overlayModel.cap2) || 0);
        const rewardTier1 = Number(overlayModel.rewardTier1) || 0;
        const rewardTier2 = Number(overlayModel.rewardTier2) || 0;
        const tier1Unlocked = !!overlayModel.tier1Unlocked;
        const tier2Unlocked = !!overlayModel.tier2Unlocked;
        const rewardLocked = !tier1Unlocked;

        const capTotal = cap2 || 1;
        const seg1Width = (cap1 / capTotal) * 100;
        const seg2Width = 100 - seg1Width;
        const seg1Fill = tier1Unlocked && cap1 > 0 ? Math.min(1, rewardTier1 / cap1) * seg1Width : 0;
        const seg2Fill = tier2Unlocked && cap2 > cap1 ? Math.min(1, Math.max(0, rewardTier2 - cap1) / (cap2 - cap1)) * seg2Width : 0;
        const seg1WidthSafe = Math.max(0, Math.min(100, seg1Width));
        const seg2WidthSafe = Math.max(0, Math.min(100, seg2Width));

        return `<div class="absolute inset-0">
            ${rewardLocked ? '' : `<div class="absolute inset-0 flex">
                <div style="width:${seg1WidthSafe}%" class="h-3"></div>
                <div style="width:${seg2WidthSafe}%" class="bg-gray-200 h-3"></div>
            </div>`}
            <div class="absolute inset-0 flex">
                <div style="width:${seg1Fill}%" class="bg-green-500 h-3"></div>
                <div style="width:${seg2Fill}%" class="bg-green-600 h-3"></div>
            </div>
            ${rewardLocked ? '' : `<div class="absolute top-0 bottom-0" style="left:${seg1WidthSafe}%; width:1px; background:rgba(0,0,0,0.08)"></div>`}
        </div>`;
    }

    return "";
}

function renderPromoMarkers(markers) {
    if (!markers) return "";
    if (typeof markers === "string") {
        return `<div class="flex justify-between text-[8px] text-gray-400 mt-0.5 px-1">${markers}</div>`;
    }
    if (Array.isArray(markers) && markers.length > 0 && typeof markers[0] === "object") {
        const items = markers.map(m => {
            const pos = Math.max(0, Math.min(100, Number(m.pos) || 0));
            const align = pos === 0 ? 'left' : (pos === 100 ? 'right' : 'center');
            const translate = align === 'center' ? 'translateX(-50%)' : (align === 'right' ? 'translateX(-100%)' : 'translateX(0)');
            const label = escapeHtml(m.label || "");
            return `<span style="left:${pos}%; transform:${translate}" class="absolute text-[8px] text-gray-400">${label}</span>`;
        }).join('');
        return `<div class="relative h-3 mt-0.5 px-1">${items}</div>`;
    }
    if (Array.isArray(markers)) {
        const items = markers.map(m => {
            const label = (typeof m === "number") ? m.toLocaleString() : String(m);
            return `<span>${escapeHtml(label)}</span>`;
        }).join('');
        return `<div class="flex justify-between text-[8px] text-gray-400 mt-0.5 px-1">${items}</div>`;
    }
    return "";
}

function clampPercent(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.min(100, num));
}

function getSectionUi(sec, theme) {
    const state = sec.state || "active";
    const kind = sec.kind || "cap";
    const meta = sec.meta || {};
    const hasOverlay = !!sec.overlayModel;

    const ui = {
        trackClass: "pc-track",
        fillClass: theme && theme.bar ? theme.bar : "bg-green-500",
        striped: false,
        showLock: state === "locked",
        lockClass: "pc-lock",
        showTierSeparators: false,
        separatorPositions: [],
        separatorClass: "pc-sep",
        subText: "",
        subTextClass: "text-gray-500"
    };

    if (state === "locked") {
        ui.trackClass = "pc-track pc-track-locked";
        ui.fillClass = "bg-gray-300";
        ui.striped = false;
        ui.subText = sec.lockedReason || "Locked";
        ui.subTextClass = "text-gray-400";
    } else if (state === "capped") {
        ui.fillClass = "bg-red-500";
        ui.striped = false;
        ui.subText = "Capped";
        ui.subTextClass = "text-red-500";
    } else {
        if (kind === "mission") {
            ui.fillClass = "bg-blue-500";
            ui.subText = "Unlocked";
            ui.subTextClass = "text-green-600 font-bold";
        } else {
            if (typeof meta.remaining === "number") {
                const prefix = meta.prefix || "";
                const unit = meta.unit || "";
                ui.subText = `Remaining ${prefix}${Math.max(0, Math.floor(meta.remaining)).toLocaleString()}${unit}`;
            } else {
                ui.subText = "In Progress";
            }
            ui.subTextClass = "text-gray-500";
        }
    }

    if (hasOverlay) {
        ui.fillClass = state === "locked" ? "bg-gray-300" : "bg-gray-200";
        ui.striped = false;
    }

    if (state === "active") {
        ui.striped = (kind === "cap" || kind === "tier_cap") && !hasOverlay;
    }

    if (kind === "tier_cap") {
        ui.showTierSeparators = true;
        if (Array.isArray(sec.markers) && sec.markers.length > 0 && typeof sec.markers[0] === "object") {
            ui.separatorPositions = sec.markers
                .map(m => Number(m.pos))
                .filter(n => Number.isFinite(n));
        } else if (meta && Array.isArray(meta.tierBreaks)) {
            ui.separatorPositions = meta.tierBreaks
                .map(n => Number(n))
                .filter(n => Number.isFinite(n));
        }

        // Avoid "random border" look by not rendering separators at the bar edges.
        ui.separatorPositions = Array.from(new Set(ui.separatorPositions))
            .filter(pos => pos > 0 && pos < 100)
            .sort((a, b) => a - b);
    }

    return ui;
}

function renderProgressBar({ progress, state, ui, overlayModel }) {
    const width = overlayModel ? 100 : clampPercent(progress);
    const fillClass = `pc-fill ${ui.fillClass}${ui.striped ? " progress-stripe" : ""}`;
    const overlay = renderPromoOverlay(overlayModel);
    const separators = ui.showTierSeparators && Array.isArray(ui.separatorPositions)
        ? ui.separatorPositions.map(pos => {
            const safe = clampPercent(pos);
            return `<div class="${ui.separatorClass}" style="left:${safe}%"></div>`;
        }).join("")
        : "";
    const lockHtml = ui.showLock ? `<div class="${ui.lockClass}"><i class="fas fa-lock"></i></div>` : "";

    return `<div class="${ui.trackClass}">
        <div class="${fillClass}" style="width:${width}%"></div>
        ${separators}
        ${overlay}
        ${lockHtml}
    </div>`;
}

function renderPromoSections(sections, theme) {
    if (!sections) return "";
    return sections.map(sec => {
        if (!sec) return "";
        if (!sec.kind) return "";

        const label = escapeHtml(sec.label || "");
        const valueText = escapeHtml(sec.valueText || "");
        const progress = Number.isFinite(sec.progress) ? sec.progress : 0;

        const ui = getSectionUi(sec, theme);
        if (sec.overlayModel && sec.overlayModel.type === "winter_reward" && sec.lockedReason && sec.state !== "capped") {
            // Winter tier bars can be "active" but still have a meaningful lockedReason
            // (e.g. "Tier 2 Locked ..."). Prefer showing it over generic Remaining/In Progress.
            ui.subText = sec.lockedReason;
            ui.subTextClass = (sec.state === "locked") ? "text-gray-400" : "text-gray-500";
        }

        const barHtml = renderProgressBar({
            progress,
            state: sec.state || "active",
            ui,
            overlayModel: sec.overlayModel
        });
        const markersHtml = renderPromoMarkers(sec.markers);
        const subTextHtml = ui.subText ? `<div class="text-[10px] text-right mt-1 ${ui.subTextClass}">${escapeHtml(ui.subText)}</div>` : '';

        return `<div>
            <div class="flex justify-between text-xs mb-1">
                <span class="${theme.text} font-bold">${label}</span>
                <span class="text-gray-500 font-mono">${valueText}</span>
            </div>
            ${barHtml}
            ${markersHtml}
            ${subTextHtml}
        </div>`;
    }).join('');
}

function breakdownToneClass(tone, flags) {
    const classes = [];
    const safeTone = tone || "normal";
    if (safeTone === "muted") classes.push("text-gray-400");
    else if (safeTone === "warning") classes.push("text-yellow-600");
    else if (safeTone === "accent") classes.push("text-purple-600");
    else if (safeTone === "danger") classes.push("text-red-500");
    else if (safeTone === "success") classes.push("text-green-600");
    else classes.push("text-gray-500");
    if (flags && flags.strike) classes.push("line-through");
    if (flags && flags.bold) classes.push("font-bold");
    return classes.join(" ");
}

function renderBreakdown(entries) {
    if (!Array.isArray(entries) || entries.length === 0) return "基本回贈";
    return entries.map(entry => {
        if (typeof entry === "string") return escapeHtml(entry);
        const text = escapeHtml(entry.text || "");
        const cls = breakdownToneClass(entry.tone, entry.flags);
        return cls ? `<span class="${cls}">${text}</span>` : text;
    }).join(" + ");
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

function getCategoryList(ownedCards) {
    if (typeof DATA === 'undefined' || !DATA.categories) return [];
    return Object.entries(DATA.categories)
        .map(([id, c]) => ({ id, ...c }))
        .filter(c => !c.hidden)
        .filter(c => {
            if (!c.req) return true;
            if (typeof c.req === 'function') return c.req(ownedCards);
            return ownedCards.includes(c.req);
        })
        .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
}

function updateCategoryDropdown(ownedCards) {
    const select = document.getElementById('category');
    const currentVal = select.value;

    const options = getCategoryList(ownedCards);
    select.innerHTML = options.map(o => `<option value="${o.id}">${o.label}</option>`).join('');
    if (options.some(o => o.id === currentVal)) select.value = currentVal;
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
    const { title, icon, theme, badge, subTitle, sections, warning, actionButton } = config;

    // Theme mapping
    const themeMap = {
        'purple': { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-800', bar: 'bg-purple-500', badge: 'bg-purple-600', subText: 'text-purple-600' },
        'red': { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700', bar: 'bg-red-500', badge: 'bg-red-600', subText: 'text-red-600' },
        'blue': { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', bar: 'bg-blue-500', badge: 'bg-blue-600', subText: 'text-blue-600' },
        'yellow': { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', bar: 'bg-yellow-400', badge: 'bg-yellow-500', subText: 'text-yellow-700' },
        'green': { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700', bar: 'bg-green-500', badge: 'bg-green-600', subText: 'text-green-600' },
        'indigo': { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', bar: 'bg-indigo-500', badge: 'bg-indigo-600', subText: 'text-indigo-800' },
        'black': { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-800', bar: 'bg-gray-800', badge: 'bg-black', subText: 'text-gray-600' },
        'gray': { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-800', bar: 'bg-gray-500', badge: 'bg-gray-600', subText: 'text-gray-600' }
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

    const sectionsHtml = sections ? renderPromoSections(sections, t) : '';

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
            <div class="text-xs text-gray-500 mt-1">${renderBreakdown(res.breakdown)}</div>
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
    const monthEndStr = getMonthEndStr();
    const quarterEndStr = getQuarterEndStr();
    const renderedCaps = new Set();
    const monthTotals = getMonthTotals(userProfile.transactions);
    const totalSpend = monthTotals.spend;
    const totalVal = monthTotals.reward;
    const txCount = monthTotals.count;
    let html = `<div class="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-5 rounded-2xl shadow-lg mb-4"><div class="flex justify-between items-start"><div><h2 class="text-blue-100 text-xs font-bold uppercase tracking-wider">本月總簽賬</h2><div class="text-3xl font-bold mt-1">$${totalSpend.toLocaleString()}</div></div><div class="text-right"><h2 class="text-blue-100 text-xs font-bold uppercase tracking-wider">預估總回贈</h2><div class="text-xl font-bold mt-1 text-yellow-300">≈ $${Math.floor(totalVal).toLocaleString()}</div></div></div><div class="mt-4 pt-4 border-t border-blue-400/30 flex justify-between text-xs text-blue-100"><span>已記錄 ${txCount} 筆</span></div></div>`;

    // 1. Travel Guru
    const level = parseInt(userProfile.settings.guru_level);
    if (level > 0) {
        const upgConfig = { 1: { next: "GING級", target: 30000 }, 2: { next: "GURU級", target: 70000 }, 3: { next: "保級", target: 70000 } };
        const rebateConfig = { 1: { cap: 500 }, 2: { cap: 1200 }, 3: { cap: 2200 } };
        const curUpg = upgConfig[level]; const curRebate = rebateConfig[level];
        const spendAccum = Number(userProfile.usage["guru_spend_accum"]) || 0;
        const rcUsed = Number(userProfile.usage["guru_rc_used"]) || 0;
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
	                {
	                    kind: "mission",
	                    label: "🚀 升級進度",
	                    valueText: `$${spendAccum.toLocaleString()} / $${curUpg.target.toLocaleString()}`,
	                    progress: upgPct,
	                    state: "active",
	                    lockedReason: null,
	                    markers: null,
	                    overlayModel: null,
	                    meta: { spendAccum, target: curUpg.target }
	                },
	                {
	                    kind: "cap",
	                    label: "💰 本級回贈",
	                    valueText: `${Math.floor(rcUsed)} / ${curRebate.cap}`,
	                    progress: rebatePct,
	                    state: isMaxed ? "capped" : "active",
	                    lockedReason: null,
	                    markers: null,
	                    overlayModel: null,
	                    meta: {
	                        used: rcUsed,
	                        cap: curRebate.cap,
	                        remaining: Math.max(0, curRebate.cap - rcUsed),
	                        prefix: "",
	                        unit: " RC",
	                        unlocked: true
	                    }
	                }
	            ],
	            actionButton: upgradeButton
	        });
	    }

    // Campaigns (data-driven)
    if (typeof DATA !== 'undefined' && Array.isArray(DATA.campaigns)) {
        DATA.campaigns.forEach(campaign => {
            const status = (typeof buildPromoStatus === "function") ? buildPromoStatus(campaign, userProfile, DATA.modules) : null;
            if (!status || !status.eligible) return;

            const reg = (DATA.campaignRegistry && campaign && campaign.id) ? DATA.campaignRegistry[campaign.id] : null;
            if (reg && reg.settingKey && userProfile.settings[reg.settingKey] === false) {
                html += renderWarningCard(reg.warningTitle || campaign.name, campaign.icon, reg.warningDesc || "需登記以賺取回贈", reg.settingKey);
                // Prevent duplicate rendering in the "Remaining Caps" section.
                if (status.renderedCaps) status.renderedCaps.forEach(k => renderedCaps.add(k));
                else if (campaign.capKeys) campaign.capKeys.forEach(k => renderedCaps.add(k));
                return;
            }

            const sections = status.sections || [];
            if (status.renderedCaps) status.renderedCaps.forEach(k => renderedCaps.add(k));
            if (status.capKeys) status.capKeys.forEach(k => renderedCaps.add(k));

            let badgeText = "";
            if (campaign.badge) {
                if (campaign.badge.type === "month_end") badgeText = formatResetDate(monthEndStr);
                if (campaign.badge.type === "quarter_end") badgeText = formatResetDate(quarterEndStr);
                if (campaign.badge.type === "promo_end" && campaign.badge.moduleKey) {
                    const mod = DATA.modules[campaign.badge.moduleKey] || (DATA.trackers && DATA.trackers[campaign.badge.moduleKey]);
                    if (mod && mod[campaign.badge.field]) badgeText = formatPromoDate(mod[campaign.badge.field]);
                    if (campaign.badge.staticDate) badgeText = formatPromoDate(campaign.badge.staticDate);
                }
            }

            html += createProgressCard({
                title: campaign.name, icon: campaign.icon, theme: campaign.theme, badge: badgeText,
                sections: sections
            });
        });
    }

    // 5. Remaining Caps as Promotion Cards (no separate cap monitors)
    userProfile.ownedCards.forEach(cardId => {
        const card = DATA.cards.find(c => c.id === cardId);
        if (!card || !Array.isArray(card.rewardModules)) return;
        card.rewardModules.forEach(modId => {
            const mod = DATA.modules[modId];
            if (!mod || !mod.cap_limit || !mod.cap_key) return;
            if (mod.cap_key === 'boc_amazing_local_weekday_cap' || mod.cap_key === 'boc_amazing_local_holiday_cap' || mod.cap_key === 'boc_amazing_online_weekday_cap' || mod.cap_key === 'boc_amazing_online_holiday_cap') return;
            if (renderedCaps.has(mod.cap_key)) return;
            if (mod.setting_key && userProfile.settings[mod.setting_key] === false) {
                html += renderWarningCard(`${card.name} ${mod.desc}`, "fas fa-exclamation-triangle", "需登記以顯示進度", mod.setting_key);
                renderedCaps.add(mod.cap_key);
                return;
            }

            renderedCaps.add(mod.cap_key);

            const rawUsage = Number(userProfile.usage[mod.cap_key]) || 0;
            const isRewardCap = mod.cap_mode === 'reward';
            const currentVal = isRewardCap ? rawUsage : rawUsage * (mod.rate || 0);
            const maxVal = isRewardCap ? mod.cap_limit : mod.cap_limit * (mod.rate || 0);
            const pct = Math.min(100, (currentVal / maxVal) * 100);
            const remaining = Math.max(0, maxVal - currentVal);

            let unit = '$';
            if (card.redemption && card.redemption.unit) unit = card.redemption.unit;
            else if (card.currency === 'CASH_Direct' || card.currency === 'Fun_Dollars') unit = '元';

            const displayUnit = (unit === '分' || unit === 'RC') ? unit : ((unit === '元' || unit === '$') ? '' : unit);
            const displayPrefix = (unit === '元' || unit === '$') ? '$' : '';

	            const sections = [];
	            let unlockMet = true;

	            if (mod.req_mission_spend && mod.req_mission_key) {
	                const thresholdSpend = Number(userProfile.usage[mod.req_mission_key]) || 0;
	                const thresholdPct = Math.min(100, (thresholdSpend / mod.req_mission_spend) * 100);
	                const thresholdMet = thresholdSpend >= mod.req_mission_spend;
	                unlockMet = thresholdMet;
	                sections.push({
	                    kind: "mission",
	                    label: "🎯 門檻任務",
	                    valueText: `$${thresholdSpend.toLocaleString()} / $${mod.req_mission_spend.toLocaleString()}`,
	                    progress: thresholdPct,
	                    state: thresholdMet ? "active" : "locked",
	                    lockedReason: thresholdMet ? null : `尚欠 $${(mod.req_mission_spend - thresholdSpend).toLocaleString()}`,
	                    markers: null,
	                    overlayModel: null,
	                    meta: { spend: thresholdSpend, target: mod.req_mission_spend, unlocked: thresholdMet }
	                });
	            }

	            const rewardState = currentVal >= maxVal ? "capped" : (unlockMet ? "active" : "locked");
	            sections.push({
	                kind: "cap",
	                label: "💰 回贈進度",
	                valueText: `${displayPrefix}${Math.floor(currentVal).toLocaleString()}${displayUnit} / ${displayPrefix}${Math.floor(maxVal).toLocaleString()}${displayUnit}`,
	                progress: pct,
	                state: rewardState,
	                lockedReason: unlockMet ? null : "Locked",
	                markers: null,
	                overlayModel: null,
	                meta: {
	                    used: currentVal,
	                    cap: maxVal,
	                    remaining: Math.max(0, remaining),
	                    prefix: displayPrefix,
	                    unit: displayUnit,
	                    unlocked: unlockMet
	                }
	            });

            html += createProgressCard({
                title: `${card.name} ${mod.desc}`,
                icon: "fas fa-chart-line",
                theme: "gray",
                badge: formatResetDate(monthEndStr),
                sections: sections
            });
        });
    });

    container.innerHTML = html;
}

function renderCalculatorResults(results, currentMode) {
    let html = "";
    const onlineToggle = document.getElementById('tx-online');
    const isOnline = onlineToggle ? !!onlineToggle.checked : false;
    const paymentSelect = document.getElementById('tx-payment');
    const paymentMethod = paymentSelect ? paymentSelect.value : "physical";
    const isMobilePay = paymentMethod !== "physical";

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

        // Foreign Currency Fee Logic
        let feeNetValue = null;
        let feeNetPotential = null;
        let feeLineHtml = '';
        let hasFee = false;
        const showFeeEquation = currentMode === 'cash' && userProfile && userProfile.settings && userProfile.settings.deduct_fcf_ranking;
        const allowFeeNet = showFeeEquation && res.supportsCash;
        const cardConfig = DATA.cards.find(c => c.id === res.cardId);
        // Check if category implies foreign currency
        const isForeign = (typeof isForeignCategory === "function")
            ? isForeignCategory(res.category)
            : (res.category.startsWith('overseas') || res.category === 'foreign' || res.category === 'travel_plus_tier1');

        if (cardConfig && cardConfig.fcf > 0 && isForeign) {
            const fee = res.amount * cardConfig.fcf;
            const feeVal = fee.toFixed(1);
            const net = res.estCash - fee;
            const netPotential = res.estCashPotential - fee;
            hasFee = true;
            feeNetValue = Math.floor(net).toLocaleString();
            feeNetPotential = Math.floor(netPotential).toLocaleString();
            feeLineHtml = `<div class="text-xs text-red-400 mt-0.5"><i class="fas fa-money-bill-wave mr-1"></i>外幣手續費: $${feeVal} (${(cardConfig.fcf * 100).toFixed(2)}%)</div>`;
        }

        const txDateInput = document.getElementById('tx-date');
        const txDate = txDateInput ? txDateInput.value : "";
        const dataStr = encodeURIComponent(JSON.stringify({
            amount: res.amount, trackingKey: res.trackingKey, estValue: res.estValue,
            guruRC: res.guruRC, missionTags: res.missionTags, category: res.category,
            cardId: res.cardId,
            rewardTrackingKey: res.rewardTrackingKey,
            secondaryRewardTrackingKey: res.secondaryRewardTrackingKey,
            generatedReward: res.generatedReward,
            resultText: resultText,
            pendingUnlocks: res.pendingUnlocks || [],
            isOnline,
            isMobilePay,
            paymentMethod,
            txDate
        }));
        let displayVal = res.displayVal;
        let displayUnit = res.displayUnit;
        let valClass = res.displayVal === '---' ? 'text-gray-400 font-medium' : 'text-red-600 font-bold';

        if (allowFeeNet && hasFee && feeNetValue !== null) {
            displayVal = feeNetValue;
            displayUnit = "HKD";
            valClass = 'text-blue-600 font-bold';
        }

        let mainValHtml = `<div class="text-xl ${valClass}">${displayVal} <span class="text-xs text-gray-400">${displayUnit}</span></div>`;
        let potentialHtml = "";
        if (res.displayValPotential && res.displayValPotential !== res.displayVal && res.displayValPotential !== "---") {
            let potentialVal = res.displayValPotential;
            let potentialUnit = res.displayUnitPotential;
            if (allowFeeNet && hasFee && feeNetPotential !== null) {
                potentialVal = feeNetPotential;
                potentialUnit = "HKD";
            }
            potentialHtml = `<div class="text-[10px] text-gray-500 mt-0.5">🔓 解鎖後：${potentialVal} ${potentialUnit}</div>`;
        }
        let redemptionHtml = "";
        if (potentialHtml && !res.redemptionConfig) {
            mainValHtml += potentialHtml;
        }

        if (res.redemptionConfig) {
            const rd = res.redemptionConfig;
            if (res.displayVal !== '---') {
                mainValHtml = `
                    <div class="text-xl ${valClass}">${displayVal} <span class="text-xs text-gray-400">${displayUnit}</span></div>
                    <div class="text-xs text-gray-500 mt-0.5 font-mono">(${Math.floor(res.nativeVal).toLocaleString()} ${rd.unit})</div>
                    ${potentialHtml}
                `;
            } else {
                mainValHtml = `
                    <div class="text-xl text-gray-400 font-medium">---</div>
                    <div class="text-xs text-gray-500 mt-0.5 font-mono">${Math.floor(res.nativeVal).toLocaleString()} ${rd.unit}</div>
                    ${potentialHtml}
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
                <div class="text-xs text-gray-500 mt-1">${renderBreakdown(res.breakdown)}</div>
                ${hasFee && !showFeeEquation ? feeLineHtml : ''}
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
        { name: "🏦 BEA 東亞", filter: id => id.startsWith('bea_') },
        { name: "💳 sim / AEON / WeWa", filter: id => id.startsWith('sim_') || id.startsWith('aeon_') || id.startsWith('wewa') || id.startsWith('earnmore') || id.startsWith('mox_') },
        { name: "💎 Others 其他", filter: id => !id.startsWith('hsbc_') && !id.startsWith('sc_') && !id.startsWith('citi_') && !id.startsWith('dbs_') && !id.startsWith('hangseng_') && !id.startsWith('boc_') && !id.startsWith('ae_') && !id.startsWith('fubon_') && !id.startsWith('bea_') && !id.startsWith('sim_') && !id.startsWith('aeon_') && !id.startsWith('wewa') && !id.startsWith('earnmore') && !id.startsWith('mox_') }
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
        const groupCards = DATA.cards.filter(c => group.filter(c.id));
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
    html += `<div class="grid grid-cols-2 gap-2 text-xs bg-red-50/50 border border-red-100 rounded-lg p-2">
        <div>
            <label class="block text-red-700 font-bold mb-1">Tier 1 門檻</label>
            <input id="st-winter-tier1" type="number" min="0" class="w-full p-2 rounded bg-white border border-red-100" value="${Number(userProfile.settings.winter_tier1_threshold) || 0}" onchange="saveWinterThresholds()">
        </div>
        <div>
            <label class="block text-red-700 font-bold mb-1">Tier 2 門檻</label>
            <input id="st-winter-tier2" type="number" min="0" class="w-full p-2 rounded bg-white border border-red-100" value="${Number(userProfile.settings.winter_tier2_threshold) || 0}" onchange="saveWinterThresholds()">
        </div>
    </div>`;
    html += `<div class="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100"><span>BOC 狂賞派 + 狂賞飛</span><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" id="st-boc-amazing" class="sr-only peer" ${userProfile.settings.boc_amazing_enabled ? 'checked' : ''} onchange="toggleSetting('boc_amazing_enabled')"><div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer peer-checked:bg-blue-600"></div></label></div>`;
    html += `<div class="flex justify-between items-center bg-gray-100 p-2 rounded border border-gray-300"><span>DBS Black $2/里推廣</span><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" id="st-dbs-black" class="sr-only peer" ${userProfile.settings.dbs_black_promo_enabled ? 'checked' : ''} onchange="toggleSetting('dbs_black_promo_enabled')"><div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer peer-checked:bg-gray-800"></div></label></div>`;
    html += `<div class="flex justify-between items-center bg-gray-200 p-2 rounded border border-gray-300"><span>MMPower +FUN Dollars</span><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" id="st-mmpower" class="sr-only peer" ${userProfile.settings.mmpower_promo_enabled ? 'checked' : ''} onchange="toggleSetting('mmpower_promo_enabled')"><div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer peer-checked:bg-gray-800"></div></label></div>`;
    html += `<div class="flex justify-between items-center bg-purple-50 p-2 rounded border border-purple-100"><span>Travel+ 外幣回贈</span><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" id="st-travel-plus" class="sr-only peer" ${userProfile.settings.travel_plus_promo_enabled ? 'checked' : ''} onchange="toggleSetting('travel_plus_promo_enabled')"><div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer peer-checked:bg-purple-600"></div></label></div>`;
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

function renderAllocatorRow(key, label, value) {
    const safeValue = Number(value) || 0;
    return `<div class="flex justify-between items-center bg-white p-2 rounded border"><span class="text-xs font-bold text-gray-700">${label}</span><div class="flex items-center gap-3"><button class="w-6 h-6 bg-gray-200 rounded text-gray-600 font-bold" onclick="changeAllocation('${key}', -1)">-</button><span class="text-sm font-mono w-4 text-center" id="alloc-${key}">${safeValue}</span><button class="w-6 h-6 bg-gray-200 rounded text-gray-600 font-bold" onclick="changeAllocation('${key}', 1)">+</button></div></div>`;
}
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
        // Prefer transaction date (txDate) over record timestamp (date).
        let dateStr = "";
        if (tx.txDate) {
            dateStr = String(tx.txDate);
        } else {
            const date = new Date(tx.date);
            dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        }
        // Try to get nice card name if possible, else use ID
        let cardName = tx.cardId;
        if (typeof DATA !== 'undefined' && Array.isArray(DATA.cards)) {
            const c = DATA.cards.find(x => x.id === tx.cardId);
            if (c) cardName = c.name;
        }

        const amountNum = Number(tx.amount) || 0;
        const rebateText = escapeHtml(tx.rebateText || "");
        const safeDateStr = escapeHtml(dateStr);
        const safeCardName = escapeHtml(cardName);

        html += `
            <div class="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">${safeDateStr}</span>
                        <span class="text-xs text-gray-500 truncate max-w-[120px]">${safeCardName}</span>
                    </div>
                     <div class="text-sm font-bold text-gray-800">
                        ${(() => {
                const def = (typeof DATA !== 'undefined' && DATA.categories) ? DATA.categories[tx.category] : null;
                const label = def ? def.label.split(' (')[0] : (tx.desc || tx.category);
                return escapeHtml(label);
            })()}
                    </div>
                </div>
                <div class="text-right flex items-center gap-2">
                    <div>
                        <div class="text-base font-bold">$${escapeHtml(amountNum.toLocaleString())}</div>
                        <div class="text-xs text-green-600 font-medium">+${rebateText}</div>
                    </div>
                    <button onclick="handleDeleteTx(${tx.id})" class="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded border border-gray-200">刪除</button>
                </div>
            </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

window.handleClearHistory = function () {
    if (confirm("確定要清除所有記帳記錄嗎？此操作無法復原。")) {
        userProfile.transactions = [];
        if (typeof clearUsageAndStats === 'function') {
            clearUsageAndStats();
        }
        saveUserData();
        refreshUI();
        renderLedger([]);
    }
}
