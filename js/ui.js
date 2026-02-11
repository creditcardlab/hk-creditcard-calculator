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

function getCampaignPeriodMeta(campaignId) {
    if (!campaignId || typeof DATA === "undefined") return null;
    const byCampaignId = DATA.periodPolicy && DATA.periodPolicy.byCampaignId ? DATA.periodPolicy.byCampaignId : null;
    return byCampaignId ? (byCampaignId[campaignId] || null) : null;
}

function formatPeriodEndBadge(periodSpec, campaignId) {
    if (!periodSpec || !periodSpec.type) return "";
    if (periodSpec.type === "promo") {
        const endDate = periodSpec.endDate || "";
        return endDate ? formatPromoDate(endDate) : "";
    }

    const today = new Date();
    const bucketKey = getBucketKey(today, periodSpec.type, periodSpec, campaignId || null);
    if (!bucketKey) return "";
    const startDate = parseDateInput(bucketKey);
    if (!startDate) return "";

    let nextStart = null;
    if (periodSpec.type === "month") nextStart = addMonths(startDate, 1);
    else if (periodSpec.type === "quarter") nextStart = addMonths(startDate, 3);
    else if (periodSpec.type === "year") nextStart = addMonths(startDate, 12);
    if (!nextStart) return "";

    const resetDate = new Date(nextStart.getTime());
    resetDate.setDate(resetDate.getDate() - 1);
    return formatResetDate(formatDateKey(resetDate));
}

function getCampaignBadgeText(campaign) {
    if (!campaign || !campaign.id) return "";
    const meta = getCampaignPeriodMeta(campaign.id);
    if (!meta || !meta.badge) return "";
    const badge = meta.badge;

    if (badge.type === "promo_end") return badge.endDate ? formatPromoDate(badge.endDate) : "";
    if (badge.type === "period_end" && badge.period) return formatPeriodEndBadge(badge.period, campaign.id);
    if (badge.type === "month_end") return formatPeriodEndBadge({ type: "month", startDay: 1 }, campaign.id);
    if (badge.type === "quarter_end") return formatPeriodEndBadge({ type: "quarter", startMonth: 1, startDay: 1 }, campaign.id);
    if (badge.type === "year_end") return formatPeriodEndBadge({ type: "year", startMonth: 1, startDay: 1 }, campaign.id);
    if (badge.type === "static_date") return badge.date ? formatPromoDate(badge.date) : "";
    if (badge.type === "text") return badge.text ? String(badge.text) : "";
    return "";
}

function getCampaignOffers() {
    if (typeof DATA === "undefined" || !DATA) return [];
    const legacyCampaigns = Array.isArray(DATA.campaigns) ? DATA.campaigns : [];
    const orderMap = {};
    legacyCampaigns.forEach((campaign, idx) => {
        if (campaign && campaign.id) orderMap[campaign.id] = idx;
    });

    const offers = (Array.isArray(DATA.offers) ? DATA.offers : [])
        .filter((offer) => offer && offer.renderType === "campaign_sections" && offer.id)
        .map((offer) => ({ ...offer }));
    offers.sort((a, b) => {
        const ai = Object.prototype.hasOwnProperty.call(orderMap, a.id) ? orderMap[a.id] : Number.MAX_SAFE_INTEGER;
        const bi = Object.prototype.hasOwnProperty.call(orderMap, b.id) ? orderMap[b.id] : Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        return String(a.id).localeCompare(String(b.id));
    });
    return offers;
}

function resolveAnchorForKeyUi(key, entry, userProfile) {
    const defaults = (typeof DATA !== "undefined" && DATA.periodDefaults) ? DATA.periodDefaults : {};
    const overrides = (userProfile && userProfile.settings && userProfile.settings.periodOverrides) ? userProfile.settings.periodOverrides : {};

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

    const base = override || (entry ? entry.anchorRef : null) || (entry && entry.periodType ? defaults[entry.periodType] : null) || null;
    if (!base) return null;
    const normalized = { ...base };
    if (entry && entry.periodType && !normalized.type) normalized.type = entry.periodType;
    if (entry && (entry.refType === "promo" || entry.refType === "campaign") && entry.refId) normalized.promoId = entry.refId;
    return normalized;
}

function getResetBadgeForKey(key, userProfile) {
    if (typeof DATA === "undefined" || !DATA.countersRegistry) return "";
    const entry = DATA.countersRegistry[key];
    if (!entry || !entry.periodType) return "";

    // Non-resettable caps: if the underlying module/campaign has an end date, show it as "promo end".
    // Otherwise, show an explicit "no reset" badge so the card doesn't look broken/missing metadata.
    if (entry.periodType === "none") {
        const mod = (entry.refType === "module" && entry.refId && DATA.modules) ? DATA.modules[entry.refId] : null;
        const endDate = mod && (mod.promo_end || mod.valid_to) ? (mod.promo_end || mod.valid_to) : null;
        if (endDate) return formatPromoDate(endDate);
        return "不重置";
    }

    const anchor = resolveAnchorForKeyUi(key, entry, userProfile);
    if (entry.periodType === "promo") {
        const endDate = anchor && anchor.endDate ? anchor.endDate : null;
        return endDate ? formatPromoDate(endDate) : "";
    }

    const today = new Date();
    const bucketKey = getBucketKey(today, entry.periodType, anchor, anchor && anchor.promoId);
    if (!bucketKey) return "";
    const startDate = parseDateInput(bucketKey);
    if (!startDate) return "";

    let nextStart = null;
    if (entry.periodType === "month") nextStart = addMonths(startDate, 1);
    else if (entry.periodType === "quarter") nextStart = addMonths(startDate, 3);
    else if (entry.periodType === "year") nextStart = addMonths(startDate, 12);
    if (!nextStart) return "";

    const resetDate = new Date(nextStart.getTime());
    resetDate.setDate(resetDate.getDate() - 1);
    return formatResetDate(formatDateKey(resetDate));
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

function getPromoToggleThemeClasses(theme) {
    const key = String(theme || "").toLowerCase();
    if (key === "red") return { row: "bg-red-50", border: "border-red-100", checked: "peer-checked:bg-red-500" };
    if (key === "blue") return { row: "bg-blue-50", border: "border-blue-100", checked: "peer-checked:bg-blue-600" };
    if (key === "purple") return { row: "bg-purple-50", border: "border-purple-100", checked: "peer-checked:bg-purple-600" };
    if (key === "green") return { row: "bg-green-50", border: "border-green-100", checked: "peer-checked:bg-green-600" };
    if (key === "yellow") return { row: "bg-yellow-50", border: "border-yellow-100", checked: "peer-checked:bg-yellow-500" };
    return { row: "bg-gray-100", border: "border-gray-300", checked: "peer-checked:bg-gray-800" };
}

function escapeJsSingleQuoted(input) {
    return String(input || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function getCampaignToggleDefinitions() {
    if (typeof DATA === "undefined") return [];
    const campaigns = getCampaignOffers();
    const registry = (DATA.campaignRegistry && typeof DATA.campaignRegistry === "object") ? DATA.campaignRegistry : {};
    const bySettingKey = {};
    const priorityOrder = [
        "winter_promo_enabled",
        "boc_amazing_enabled",
        "dbs_black_promo_enabled",
        "mmpower_promo_enabled",
        "travel_plus_promo_enabled",
        "fubon_in_promo_enabled",
        "sim_promo_enabled",
        "em_promo_enabled"
    ];
    const priorityMap = {};
    priorityOrder.forEach((k, idx) => { priorityMap[k] = idx; });

    campaigns.forEach((campaign, idx) => {
        if (!campaign || !campaign.id) return;
        const reg = registry[campaign.id] || {};
        const settingKey = String(campaign.settingKey || reg.settingKey || "").trim();
        if (!settingKey) return;
        if (!bySettingKey[settingKey]) {
            bySettingKey[settingKey] = {
                settingKey,
                labels: [],
                themes: [],
                order: idx
            };
        }
        const fromRegistry = (typeof reg.warningTitle === "string" && reg.warningTitle.trim()) ? reg.warningTitle.trim() : "";
        const fromDisplay = (typeof campaign.display_name_zhhk === "string" && campaign.display_name_zhhk.trim()) ? campaign.display_name_zhhk.trim() : "";
        const fromName = (typeof campaign.name === "string" && campaign.name.trim()) ? campaign.name.trim() : "";
        bySettingKey[settingKey].labels.push(fromRegistry || fromDisplay || fromName || campaign.id);
        bySettingKey[settingKey].themes.push(campaign.theme || "");
        bySettingKey[settingKey].order = Math.min(bySettingKey[settingKey].order, idx);
    });

    return Object.values(bySettingKey).map((entry) => {
        const labels = Array.from(new Set((entry.labels || []).filter(Boolean)));
        return {
            settingKey: entry.settingKey,
            label: labels.join(" / "),
            theme: (entry.themes || []).find(Boolean) || "gray",
            order: entry.order,
            priority: Object.prototype.hasOwnProperty.call(priorityMap, entry.settingKey)
                ? priorityMap[entry.settingKey]
                : 1000
        };
    }).sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (a.order !== b.order) return a.order - b.order;
        return a.settingKey.localeCompare(b.settingKey);
    });
}

function renderCampaignToggleRows(userProfile, options) {
    const opts = options || {};
    const excludedKeys = new Set(Array.isArray(opts.excludeSettingKeys) ? opts.excludeSettingKeys : []);
    const defs = getCampaignToggleDefinitions().filter((def) => !excludedKeys.has(def.settingKey));
    if (defs.length === 0) return "";

    return defs.map((def) => {
        const classes = getPromoToggleThemeClasses(def.theme);
        const checked = !!(userProfile && userProfile.settings && userProfile.settings[def.settingKey]);
        const toggleSettingKey = escapeJsSingleQuoted(def.settingKey);
        const inputId = `st-${def.settingKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
        return `<div class="flex justify-between items-center ${classes.row} p-2 rounded border ${classes.border}">
            <span>${escapeHtml(def.label)}</span>
            <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="${inputId}" class="sr-only peer" ${checked ? "checked" : ""} onchange="toggleSetting('${toggleSettingKey}')">
                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full ${classes.checked} after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
            </label>
        </div>`;
    }).join("");
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

    if (overlayModel.type === "winter_reward" || overlayModel.type === "tier_reward") {
        const cap1 = Number(overlayModel.cap1) || 0;
        const cap2 = Math.max(cap1, Number(overlayModel.cap2) || 0);
        const rewardTier1 = Number(overlayModel.rewardTier1) || 0;
        const rewardTier2 = Number(overlayModel.rewardTier2) || 0;
        const tier1Unlocked = !!overlayModel.tier1Unlocked;
        const tier2Unlocked = !!overlayModel.tier2Unlocked;

        const capTotal = cap2 || 1;
        const seg1Width = (cap1 / capTotal) * 100;
        const seg2Width = 100 - seg1Width;
        const seg1Ratio = cap1 > 0 ? Math.min(1, rewardTier1 / cap1) : 0;
        const seg2Ratio = cap2 > cap1 ? Math.min(1, Math.max(0, rewardTier2 - cap1) / (cap2 - cap1)) : 0;
        const seg1Fill = tier1Unlocked ? seg1Ratio * seg1Width : 0;
        const seg2Fill = tier2Unlocked ? seg2Ratio * seg2Width : 0;
        const seg1Preview = !tier1Unlocked ? seg1Ratio * seg1Width : 0;
        const seg2Preview = (tier1Unlocked && !tier2Unlocked) ? seg2Ratio * seg2Width : 0;
        const seg1WidthSafe = Math.max(0, Math.min(100, seg1Width));
        const seg2WidthSafe = Math.max(0, Math.min(100, seg2Width));

        return `<div class="absolute inset-0">
            <div class="absolute inset-0 flex">
                <div style="width:${seg1WidthSafe}%" class="h-3"></div>
                <div style="width:${seg2WidthSafe}%" class="bg-gray-200 h-3"></div>
            </div>
            <div class="absolute inset-0 flex">
                <div style="width:${seg1Preview}%; background:repeating-linear-gradient(135deg, rgba(16,185,129,0.40) 0, rgba(16,185,129,0.40) 6px, rgba(16,185,129,0.22) 6px, rgba(16,185,129,0.22) 12px)" class="h-3"></div>
                <div style="width:${seg2Preview}%; background:repeating-linear-gradient(135deg, rgba(5,150,105,0.40) 0, rgba(5,150,105,0.40) 6px, rgba(5,150,105,0.22) 6px, rgba(5,150,105,0.22) 12px)" class="h-3"></div>
            </div>
            <div class="absolute inset-0 flex">
                <div style="width:${seg1Fill}%" class="bg-green-500 h-3"></div>
                <div style="width:${seg2Fill}%" class="bg-green-600 h-3"></div>
            </div>
            <div class="absolute top-0 bottom-0" style="left:${seg1WidthSafe}%; width:1px; background:rgba(0,0,0,0.08)"></div>
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

function cget(path, fallback) {
    const root = (typeof COPY_ZHHK !== "undefined" && COPY_ZHHK) ? COPY_ZHHK : (window.COPY_ZHHK || {});
    const parts = String(path || "").split(".").filter(Boolean);
    let cur = root;
    for (const p of parts) {
        if (!cur || typeof cur !== "object" || !(p in cur)) return fallback;
        cur = cur[p];
    }
    return (cur === undefined || cur === null) ? fallback : cur;
}

function normalizeProgressLabel(kind, label) {
    const raw = (label || "").trim();
    if (!raw) {
        if (kind === "mission") return cget("progress.missionThreshold", "任務門檻");
        if (kind === "cap" || kind === "cap_rate" || kind === "tier_cap") return cget("progress.rewardCap", "回贈上限");
        return "";
    }

    // Normalize common variants but preserve any prefix emoji / qualifiers.
    const mission = cget("progress.missionThreshold", "簽賬任務進度");
    const reward = cget("progress.rewardCap", "回贈進度");

    let out = raw;
    if (out === "Mission Progress") out = mission;
    if (out === "Reward Progress") out = reward;

    const hasMission = out.includes(mission);
    const hasReward = out.includes(reward);

    if (!hasMission) {
        out = out
            .replaceAll("簽賬門檻", mission)
            .replaceAll("任務門檻", mission)
            .replaceAll("任務進度", mission)
            .replaceAll("門檻任務", mission);
    }
    if (!hasReward) {
        out = out.replaceAll("回贈上限", reward);
    }

    // If someone already typed the new terms, keep them.
    return out;
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

	    if (kind === "mission") {
        // Mission progress is informational; do not render lock overlay even if unmet.
        ui.showLock = false;
        ui.striped = false;

        const met = !!meta.unlocked;
        if (hasOverlay) {
            ui.fillClass = "bg-gray-200";
        } else {
            ui.fillClass = met ? "bg-green-500" : "bg-blue-500";
        }

	        if (met) {
	            ui.subText = meta.unlockedText || cget("status.met", "已達標");
	            ui.subTextClass = "text-green-600 font-bold";
	        } else {
	            ui.subText = sec.lockedReason || cget("status.inProgress", "進行中");
	            ui.subTextClass = "text-gray-500";
	        }

        return ui;
    }

	    if (state === "locked") {
        ui.trackClass = "pc-track pc-track-locked";
        ui.fillClass = "bg-gray-300";
        ui.striped = false;
	        ui.subText = sec.lockedReason || cget("status.locked", "未解鎖");
	        ui.subTextClass = "text-gray-400";
	    } else if (state === "capped") {
        ui.fillClass = "bg-red-500";
        ui.striped = false;
	        ui.subText = cget("status.capped", "已封頂");
	        ui.subTextClass = "text-red-500";
	    } else {
        if (typeof meta.remaining === "number") {
            const prefix = meta.prefix || "";
            const unit = meta.unit || "";
	            ui.subText = `${cget("status.remainingPrefix", "尚餘")} ${prefix}${Math.max(0, Math.floor(meta.remaining)).toLocaleString()}${unit}`;
	        } else {
	            ui.subText = cget("status.inProgress", "進行中");
	        }
        ui.subTextClass = "text-gray-500";
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

        const label = escapeHtml(normalizeProgressLabel(sec.kind, sec.label));
        const valueText = escapeHtml(sec.valueText || "");
        const progress = Number.isFinite(sec.progress) ? sec.progress : 0;

        const ui = getSectionUi(sec, theme);
        if (sec.overlayModel && (sec.overlayModel.type === "winter_reward" || sec.overlayModel.type === "tier_reward") && sec.lockedReason && sec.state !== "capped") {
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
        'fastfood': showFastfoodTips,
        'tunnel': showOctopusTips,
        'china_consumption': showChinaTips,
        'smart_designated': showSmartMerchantList,
        'citi_club_merchant': showClubMerchantList,
        'club_shopping': showClubShoppingTips,
        'citi_club_telecom': showClubTelecomTips,
        'enjoy_4x': showEnjoy4xInfo,
        'enjoy_3x': showEnjoy3xInfo,
        'enjoy_2x': showEnjoy2xInfo
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

function showClubMerchantList() {
    const pdfUrl = "https://www.citibank.com.hk/chinese/credit-cards/cititheclub/merchants.pdf";
    const msg = "【Citi The Club 指定商戶】\n\n✅ 指定商戶總回贈 4%（基本1% + 額外3%）\n✅ 額外3%每月上限 1,500 Club積分\n\n📄 商戶清單以 Citi 官方 PDF 為準。";
    const shouldOpen = confirm(`${msg}\n\n按「確定」開啟官方商戶清單 PDF。`);
    if (shouldOpen) window.open(pdfUrl, "_blank", "noopener");
}
function showClubShoppingTips() {
    alert("【Club Shopping】\n\n✅ 總回贈 2%（基本1% + 額外1%）\n✅ 額外1%每月上限 500 Club積分\n\n提示：商戶清單可按「The Club 指定商戶」類別旁 ? 查看官方 PDF。");
}
function showClubTelecomTips() {
    alert("【The Club 電訊】\n\n適用：csl / 1010 / Now TV / 網上行\n\n✅ 目前以總回贈 3% 計算（replace）\n⚠️ 若你之後想細分條款（例如特定付款方式），可以再加子分類。");
}
function showOctopusTips() { alert("【Citi Octopus 交通神卡攻略 (15%)】\n\n🚌 適用：九巴、港鐵、渡輪、電車\n\n💰 門檻/上限：\n1. 月簽 $4,000：回贈上限 $300 (即交通簽 $2,000)\n2. 月簽 $10,000：回贈上限 $500\n\n⚡ 0成本達標大法：\n每月增值電子錢包 (PayMe/Alipay/WeChat) 各 $1,000，輕鬆達標 $3,000！\n\n🎁 疊加政府補貼：可賺高達 30%+ 回贈！"); }
function showSmartMerchantList() { alert("【SC Smart 指定商戶 (5%)】\n\n🥦 超市：百佳, 759, Donki\n🍽️ 餐飲：麥當勞, Deliveroo, Foodpanda\n💊 零售：HKTVmall, 屈臣氏, Klook, Decathlon\n\n⚠️ 指定商戶每月可計回贈簽賬上限 HK$5,000。"); }
function showSupermarketList() { alert("【🥦 超市類別定義】\n\n✅ 認可：百佳, Donki, 759, AEON\n⚠️ HSBC陷阱：❌ 不包惠康, Market Place, 萬寧"); }
function showRedMerchantList() { alert("【HSBC Red 指定 (8%)】\n\n🍽️ 壽司郎, 譚仔, Coffee Academïcs\n👕 GU, Decathlon, Uniqlo\n🎮 NAMCO"); }
function showEveryMileMerchantList() { alert("【EveryMile 指定 ($2/里)】\n\n🚌 交通 (港鐵/巴士/Uber)\n☕ 咖啡 (Starbucks/Pacific)\n🌏 旅遊 (Klook/Agoda)"); }
function showChinaTips() { alert("【🇨🇳 中國內地/澳門】\n\n推薦：Pulse (手機支付+2%)、EveryMile ($2/里)、MMPower (6%)"); }
function showFastfoodTips() { alert("【快餐店 (Fast Food)】\n\n💡 呢個分類主要俾 MMPower 用作「餐飲自選不包括快餐店」。\n\n- 一般其他卡：系統會當作 Dining 處理\n- Hang Seng MMPower：只計基本回贈，不食自選額外 1%"); }
function showEnjoyPoints4xGuide(tierLabel) {
    const url = "https://cms.hangseng.com/cms/emkt/pmo/grp06/p13/chi/index.html#Points4X";
    const msg = `【Hang Seng enJoy ${tierLabel}】\n\n` +
        "換算（本工具）：\n" +
        "- 4X = 2%\n" +
        "- 3X = 1.5%\n" +
        "- 2X = 1%\n" +
        "- 其他簽賬 = 1X = 0.5%\n\n" +
        "快速記法（你可先用呢個分類）：\n" +
        "- 2X（多為美心集團高檔食肆）\n" +
        "- 3X（多為 yuu 旗下便利店及超市）\n" +
        "- 4X（多為美心集團輕食/平民食肆）\n\n" +
        "⚠️ 如唔肯定商戶屬於邊一檔，先用較保守檔位或一般簽賬；最終以官方列表為準。";
    if (confirm(`${msg}\n\n按「確定」開啟恒生官方 Points4X 頁面。`)) {
        window.open(url, "_blank", "noopener");
    }
}
function showEnjoy4xInfo() { showEnjoyPoints4xGuide("4X（2%）"); }
function showEnjoy3xInfo() { showEnjoyPoints4xGuide("3X（1.5%）"); }
function showEnjoy2xInfo() { showEnjoyPoints4xGuide("2X（1%）"); }

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
    const renderedCaps = new Set();
    // If the same cap_key appears across multiple cards in the dataset, treat it as a shared cap.
    // In that case, avoid showing a specific owned card prefix in the title (e.g. HSBC 最紅自主).
    const capKeyCounts = {};
    const monthTotals = getMonthTotals(userProfile.transactions);
    const totalSpend = monthTotals.spend;
    const totalVal = monthTotals.reward;
    const txCount = monthTotals.count;
    let html = `<div class="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-5 rounded-2xl shadow-lg mb-4"><div class="flex justify-between items-start"><div><h2 class="text-blue-100 text-xs font-bold uppercase tracking-wider">本月總簽賬</h2><div class="text-3xl font-bold mt-1">$${totalSpend.toLocaleString()}</div></div><div class="text-right"><h2 class="text-blue-100 text-xs font-bold uppercase tracking-wider">預估總回贈</h2><div class="text-xl font-bold mt-1 text-yellow-300">≈ $${Math.floor(totalVal).toLocaleString()}</div></div></div><div class="mt-4 pt-4 border-t border-blue-400/30 flex justify-between text-xs text-blue-100"><span>已記錄 ${txCount} 筆</span></div></div>`;

    // 1. Special promo models with lifecycle (e.g. Travel Guru)
    if (typeof getLevelLifecycleModelIds === "function" && typeof getLevelLifecycleState === "function") {
        const lifecycleIds = getLevelLifecycleModelIds();
        lifecycleIds.forEach((modelId) => {
            const state = getLevelLifecycleState(modelId, userProfile);
            if (!state || !state.eligible || !state.active) return;
            html += createProgressCard({
                title: state.title,
                icon: state.icon,
                theme: state.theme,
                badge: state.badge,
                sections: state.sections || [],
                actionButton: state.actionButton || null
            });
        });
    }

    // Campaigns (data-driven)
    if (typeof DATA !== 'undefined') {
        const campaignOffers = getCampaignOffers();
        campaignOffers.forEach(campaign => {
            const status = (typeof buildPromoStatus === "function") ? buildPromoStatus(campaign, userProfile, DATA.modules) : null;
            if (!status || !status.eligible) return;
            const campaignTitle = (campaign.display_name_zhhk && String(campaign.display_name_zhhk).trim())
                ? String(campaign.display_name_zhhk).trim()
                : (campaign.name || campaign.id);

            const reg = (DATA.campaignRegistry && campaign && campaign.id) ? DATA.campaignRegistry[campaign.id] : null;
	        if (reg && reg.settingKey && userProfile.settings[reg.settingKey] === false) {
	            html += renderWarningCard(
	                reg.warningTitle || campaignTitle,
	                campaign.icon,
	                reg.warningDesc || cget("warning.needRegister", "需登記以賺取回贈"),
	                reg.settingKey
	            );
	            // Prevent duplicate rendering in the "Remaining Caps" section.
	            if (status.renderedCaps) status.renderedCaps.forEach(k => renderedCaps.add(k));
	            else if (campaign.capKeys) campaign.capKeys.forEach(k => renderedCaps.add(k));
	            return;
	        }

            const sections = status.sections || [];
            if (status.renderedCaps) status.renderedCaps.forEach(k => renderedCaps.add(k));
            if (status.capKeys) status.capKeys.forEach(k => renderedCaps.add(k));

            const badgeText = getCampaignBadgeText(campaign);

            html += createProgressCard({
                title: campaignTitle, icon: campaign.icon, theme: campaign.theme, badge: badgeText,
                sections: sections
            });
        });
    }

    // 5. Remaining Caps as Promotion Cards (no separate cap monitors)
    (DATA.cards || []).forEach(card => {
        if (!card || !Array.isArray(card.rewardModules)) return;
        card.rewardModules.forEach(modId => {
            const mod = DATA.modules[modId];
            if (!mod || !mod.cap_limit || !mod.cap_key) return;
            if (mod.cap_key === 'boc_amazing_local_weekday_cap' || mod.cap_key === 'boc_amazing_local_holiday_cap' || mod.cap_key === 'boc_amazing_online_weekday_cap' || mod.cap_key === 'boc_amazing_online_holiday_cap') return;
            capKeyCounts[mod.cap_key] = (capKeyCounts[mod.cap_key] || 0) + 1;
        });
    });

    userProfile.ownedCards.forEach(cardId => {
        const card = DATA.cards.find(c => c.id === cardId);
        if (!card || !Array.isArray(card.rewardModules)) return;
        card.rewardModules.forEach(modId => {
            const mod = DATA.modules[modId];
            if (!mod || !mod.cap_limit || !mod.cap_key) return;
            if (mod.cap_key === 'boc_amazing_local_weekday_cap' || mod.cap_key === 'boc_amazing_local_holiday_cap' || mod.cap_key === 'boc_amazing_online_weekday_cap' || mod.cap_key === 'boc_amazing_online_holiday_cap') return;
            if (renderedCaps.has(mod.cap_key)) return;
	        if (mod.setting_key && userProfile.settings[mod.setting_key] === false) {
                const title = (mod.display_name_zhhk && String(mod.display_name_zhhk).trim())
                    ? String(mod.display_name_zhhk).trim()
                    : String(mod.desc || mod.id || "").trim();

	            html += renderWarningCard(
	                title,
	                "fas fa-exclamation-triangle",
	                cget("warning.needRegister", "需登記以賺取回贈"),
	                mod.setting_key
	            );
	            renderedCaps.add(mod.cap_key);
	            return;
	        }

            const title = (mod.display_name_zhhk && String(mod.display_name_zhhk).trim())
                ? String(mod.display_name_zhhk).trim()
                : String(mod.desc || mod.id || "").trim();

            renderedCaps.add(mod.cap_key);

            const rawUsage = Number(userProfile.usage[mod.cap_key]) || 0;
            const isRewardCap = mod.cap_mode === 'reward';
            const spendingCap = Number(mod.cap_limit) || 0;
            const hasMissionGate = !!(mod.req_mission_spend && mod.req_mission_key);
            const thresholdTarget = hasMissionGate ? (Number(mod.req_mission_spend) || 0) : 0;
            const thresholdSpend = hasMissionGate ? (Number(userProfile.usage[mod.req_mission_key]) || 0) : 0;
            const progressSpendKey = (hasMissionGate && mod.progress_mission_key) ? mod.progress_mission_key : (hasMissionGate ? mod.req_mission_key : null);
            const progressSpend = progressSpendKey ? (Number(userProfile.usage[progressSpendKey]) || 0) : thresholdSpend;
            let unlockMet = !hasMissionGate || thresholdSpend >= thresholdTarget;

            let displayPrefix = '$';
            let displayUnit = '';
            let displayCurrentVal = rawUsage;
            let displayMaxVal = spendingCap;

            let rewardUnit = (card.redemption && card.redemption.unit) ? String(card.redemption.unit) : '';
            if (!rewardUnit && typeof DATA !== "undefined" && DATA && Array.isArray(DATA.conversions)) {
                const conv = DATA.conversions.find((c) => c && c.src === card.currency) || null;
                if (conv) {
                    const milesRate = Number(conv.miles_rate) || 0;
                    const cashRate = Number(conv.cash_rate) || 0;
                    if (milesRate > 0 && cashRate === 0) rewardUnit = "里";
                }
            }
            const rewardIsCurrency = (rewardUnit === "" || rewardUnit === "$" || rewardUnit === "HKD" || rewardUnit === "元" || rewardUnit === "HK$");

            if (isRewardCap) {
                displayPrefix = rewardIsCurrency ? '$' : '';
                displayUnit = rewardIsCurrency ? '' : rewardUnit;

                if (!unlockMet && hasMissionGate && mod.retroactive !== false) {
                    let projectedRate = NaN;
                    if (Number.isFinite(Number(mod.rate))) projectedRate = Number(mod.rate);
                    else if (Number.isFinite(Number(mod.rate_per_x)) && Number.isFinite(Number(mod.multiplier))) {
                        projectedRate = Number(mod.rate_per_x) * Number(mod.multiplier);
                    }
                    if (Number.isFinite(projectedRate) && projectedRate > 0) {
                        displayCurrentVal = Math.min(displayMaxVal, progressSpend * projectedRate);
                    }
                }
            } else {
                let nativeRate = NaN;
                if (Number.isFinite(Number(mod.rate))) nativeRate = Number(mod.rate);
                else if (Number.isFinite(Number(mod.rate_per_x)) && Number.isFinite(Number(mod.multiplier))) {
                    nativeRate = Number(mod.rate_per_x) * Number(mod.multiplier);
                }

                if (Number.isFinite(nativeRate) && nativeRate > 0) {
                    displayPrefix = rewardIsCurrency ? '$' : '';
                    displayUnit = rewardIsCurrency ? '' : rewardUnit;
                    displayCurrentVal = rawUsage * nativeRate;
                    displayMaxVal = spendingCap * nativeRate;
                }
            }

            const pct = displayMaxVal > 0 ? Math.min(100, (displayCurrentVal / displayMaxVal) * 100) : 0;
            const remaining = Math.max(0, displayMaxVal - displayCurrentVal);

	            const sections = [];

	            if (hasMissionGate) {
	                const thresholdPct = thresholdTarget > 0 ? Math.min(100, (thresholdSpend / thresholdTarget) * 100) : 0;
	                const thresholdMet = unlockMet;
	                sections.push({
	                    kind: "mission",
	                    label: "🎯 簽賬任務進度",
	                    valueText: `$${thresholdSpend.toLocaleString()} / $${thresholdTarget.toLocaleString()}`,
	                    progress: thresholdPct,
	                    state: "active",
	                    lockedReason: thresholdMet ? null : `尚差 $${Math.max(0, thresholdTarget - thresholdSpend).toLocaleString()}`,
	                    markers: null,
	                    overlayModel: null,
	                    meta: { spend: thresholdSpend, target: thresholdTarget, unlocked: thresholdMet }
	                });
	            }

	            const rewardState = rawUsage >= spendingCap ? "capped" : (unlockMet ? "active" : "locked");
	            sections.push({
	                kind: "cap",
	                label: "💰 回贈進度",
	                valueText: `${displayPrefix}${Math.floor(displayCurrentVal).toLocaleString()}${displayUnit} / ${displayPrefix}${Math.floor(displayMaxVal).toLocaleString()}${displayUnit}`,
	                progress: pct,
	                state: rewardState,
	                lockedReason: unlockMet ? null : cget("status.locked", "未解鎖"),
	                markers: null,
	                overlayModel: null,
	                meta: {
	                    used: displayCurrentVal,
	                    cap: displayMaxVal,
	                    remaining: Math.max(0, remaining),
	                    prefix: displayPrefix,
	                    unit: displayUnit,
	                    unlocked: unlockMet
	                }
	            });

            html += createProgressCard({
                title,
                icon: "fas fa-chart-line",
                theme: "gray",
                badge: getResetBadgeForKey(mod.cap_key, userProfile),
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
	        const unsupportedMode = currentMode === "miles" ? !res.supportsMiles : !res.supportsCash;

            const formatValueText = (val, unit) => {
                const v = String(val ?? "");
                const u = String(unit ?? "");
                if (u === "$") return `$${v}`;
                if (u === "里") return `${v}里`;
                if (u === "RC") return `${v} RC`;
                if (u === "分") return `${v}分`;
                // Fallback: keep old behavior.
                if (u === "HKD" || u === "元") return `$${v}`;
                return u ? `${v} ${u}` : v;
            };

	        // Prepare Rebate Text (User specific request)
	        // Miles -> "400里", Cash -> "$40", RC -> "400 RC"
	        let resultText = "";
	        const u = res.displayUnit;
	        const v = res.displayVal;

	        resultText = formatValueText(v, u);

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

        const exempt = cardConfig && Array.isArray(cardConfig.fcf_exempt_categories) ? cardConfig.fcf_exempt_categories : [];
        const feeRate = (cardConfig && cardConfig.fcf > 0 && isForeign && !exempt.includes(res.category)) ? cardConfig.fcf : 0;
        if (cardConfig && feeRate > 0) {
            const fee = res.amount * feeRate;
            const feeVal = fee.toFixed(1);
            const net = res.estCash - fee;
            const netPotential = res.estCashPotential - fee;
            hasFee = true;
            feeNetValue = Math.floor(net).toLocaleString();
            feeNetPotential = Math.floor(netPotential).toLocaleString();
            feeLineHtml = `<div class="text-xs text-red-400 mt-0.5"><i class="fas fa-money-bill-wave mr-1"></i>外幣手續費: $${feeVal} (${(feeRate * 100).toFixed(2)}%)</div>`;
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
	            unsupportedMode,
	            pendingUnlocks: res.pendingUnlocks || [],
	            isOnline,
	            isMobilePay,
	            paymentMethod,
	            txDate
	        }));
	        let displayVal = res.displayVal;
	        let displayUnit = res.displayUnit;
	        let valClass = unsupportedMode ? 'text-gray-400 font-medium' : 'text-red-600 font-bold';

	        if (allowFeeNet && hasFee && feeNetValue !== null) {
	            displayVal = feeNetValue;
	            displayUnit = "$";
	            valClass = 'text-blue-600 font-bold';
	        }

		        let mainValHtml = `<div class="text-xl ${valClass}">${escapeHtml(formatValueText(displayVal, displayUnit))}</div>`;
		        if (unsupportedMode) {
		            mainValHtml += `<div class="text-[10px] text-gray-400 mt-0.5">${escapeHtml(cget("calc.unsupportedMode", "不支援此模式"))}</div>`;
		        }
	        let potentialHtml = "";
	        if (res.displayValPotential && res.displayValPotential !== res.displayVal) {
	            let potentialVal = res.displayValPotential;
	            let potentialUnit = res.displayUnitPotential;
	            if (allowFeeNet && hasFee && feeNetPotential !== null) {
	                potentialVal = feeNetPotential;
	                potentialUnit = "$";
	            }
	            potentialHtml = `<div class="text-[10px] text-gray-500 mt-0.5">🔓 解鎖後：${escapeHtml(formatValueText(potentialVal, potentialUnit))}</div>`;
	        }
        let redemptionHtml = "";
        if (potentialHtml && !res.redemptionConfig) {
            mainValHtml += potentialHtml;
        }

	        if (res.redemptionConfig) {
	            const rd = res.redemptionConfig;
	            if (!unsupportedMode) {
	                mainValHtml = `
	                    <div class="text-xl ${valClass}">${displayVal} <span class="text-xs text-gray-400">${displayUnit}</span></div>
	                    <div class="text-xs text-gray-500 mt-0.5 font-mono">(${Math.floor(res.nativeVal).toLocaleString()} ${rd.unit})</div>
	                    ${potentialHtml}
	                `;
		            } else {
		                mainValHtml = `
		                    <div class="text-xl ${valClass}">0 <span class="text-xs text-gray-400">${displayUnit}</span></div>
		                    <div class="text-[10px] text-gray-400 mt-0.5">${escapeHtml(cget("calc.unsupportedMode", "不支援此模式"))}</div>
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
	        const isTop = index < 3 && !unsupportedMode;
	        const topClass = isTop ? ' top-result relative' : '';
	        const topBadge = index === 0 && !unsupportedMode ? '<span class="top-result-badge">🏆 最佳</span>' : '';

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
                html += `<div class="flex justify-between items-center py-3 border-b border-gray-200 last:border-0"><span class="text-sm text-gray-700 font-medium">${escapeHtml(c.name)}</span><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" class="sr-only peer" ${ch} onchange="toggleCard('${c.id}')"><div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div></label></div>`;
            });
            html += `</div></div>`;
        }
    });

    html += `</div></div><div class="bg-white p-5 rounded-2xl shadow-sm mt-4"><h2 class="text-sm font-bold text-gray-800 uppercase mb-4 border-b pb-2">設定</h2><div class="space-y-4">`;
    const guruLevels = (typeof getTravelGuruLevelMap === "function")
        ? getTravelGuruLevelMap()
        : { 1: { name: "GO級" }, 2: { name: "GING級" }, 3: { name: "GURU級" } };
    const guruOptions = Object.keys(guruLevels)
        .map((key) => Number(key))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b)
        .map((lv) => `<option value="${lv}">${escapeHtml((guruLevels[lv] && guruLevels[lv].name) || `${lv}級`)}</option>`)
        .join("");
    html += `<div class="mb-4"><label class="text-xs font-bold text-gray-500">Travel Guru</label><select id="st-guru" class="w-full p-2 bg-gray-50 rounded" onchange="saveDrop('guru_level',this.value)"><option value="0">無</option>${guruOptions}</select></div>`;

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
    const mmpowerSelected = Array.isArray(userProfile.settings.mmpower_selected_categories)
        ? userProfile.settings.mmpower_selected_categories
        : ["dining", "electronics"];
    const mmpowerSet = new Set(mmpowerSelected);
    html += `<div class="mb-4 border p-3 rounded-xl bg-orange-50 border-orange-100">
        <div class="text-xs font-bold text-orange-800 mb-2">MMPower 自選簽賬類別（3選2）</div>
        <div class="space-y-2 text-xs">
            <label class="flex justify-between items-center bg-white border border-orange-100 rounded p-2">
                <span>🍽️ 餐飲（不包括快餐店）</span>
                <input type="checkbox" ${mmpowerSet.has("dining") ? 'checked' : ''} onchange="toggleMmpowerSelected('dining', this.checked)">
            </label>
            <label class="flex justify-between items-center bg-white border border-orange-100 rounded p-2">
                <span>🔌 電子產品</span>
                <input type="checkbox" ${mmpowerSet.has("electronics") ? 'checked' : ''} onchange="toggleMmpowerSelected('electronics', this.checked)">
            </label>
            <label class="flex justify-between items-center bg-white border border-orange-100 rounded p-2">
                <span>🎟️ 娛樂（含串流）</span>
                <input type="checkbox" ${mmpowerSet.has("entertainment") ? 'checked' : ''} onchange="toggleMmpowerSelected('entertainment', this.checked)">
            </label>
        </div>
        <div class="mt-2 text-[11px] text-orange-800">現已選：${mmpowerSelected.length}/2（最多 2 項）</div>
    </div>`;

    html += `<div class="mb-4 border p-3 rounded-xl bg-yellow-50 border-yellow-100">
        <div class="flex justify-between items-center">
            <label class="text-xs font-bold text-yellow-800">Hang Seng enJoy：已綁定 yuu（Points4X 生效）</label>
            <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="st-enjoy-points4x" class="sr-only peer" ${userProfile.settings.hangseng_enjoy_points4x_enabled ? 'checked' : ''} onchange="toggleSetting('hangseng_enjoy_points4x_enabled')">
                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer peer-checked:bg-yellow-500"></div>
            </label>
        </div>
        <div class="mt-2 text-[11px] text-yellow-800">未綁定時建議關閉，上面 enJoy 4X/3X/2X 類別會回落基本 1X（0.5%）。</div>
    </div>`;

    const prestigeEnabled = !!userProfile.settings.citi_prestige_bonus_enabled;
    const prestigeYears = Math.max(1, parseInt(userProfile.settings.citi_prestige_tenure_years, 10) || 1);
    const prestigeWealth = !!userProfile.settings.citi_prestige_wealth_client;
    const prestigePct = (typeof getCitiPrestigeBonusPercentForSettings === "function")
        ? getCitiPrestigeBonusPercentForSettings({
            citi_prestige_bonus_enabled: prestigeEnabled,
            citi_prestige_tenure_years: prestigeYears,
            citi_prestige_wealth_client: prestigeWealth
        })
        : 0;
    html += `<div class="mb-4 border p-3 rounded-xl bg-blue-50 border-blue-100">
        <div class="flex justify-between items-center mb-2">
            <label class="text-xs font-bold text-blue-700">Citi Prestige 年資額外積分</label>
            <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="st-prestige-bonus" class="sr-only peer" ${prestigeEnabled ? 'checked' : ''} onchange="toggleSetting('citi_prestige_bonus_enabled')">
                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer peer-checked:bg-blue-500"></div>
            </label>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
                <label class="block text-blue-700 font-bold mb-1">於花旗年期（年）</label>
                <input id="st-prestige-years" type="number" min="1" class="w-full p-2 rounded bg-white border border-blue-100" value="${prestigeYears}" onchange="savePrestigeTenureYears()">
            </div>
            <div class="flex items-end">
                <label class="w-full flex justify-between items-center bg-white border border-blue-100 rounded p-2">
                    <span class="text-blue-700 font-bold">Citigold/私人客戶</span>
                    <input type="checkbox" ${prestigeWealth ? 'checked' : ''} onchange="toggleSetting('citi_prestige_wealth_client')">
                </label>
            </div>
        </div>
        <div class="mt-2 text-[11px] text-blue-700">現時對應年資獎賞：<span class="font-bold">${prestigePct}%</span>（以有效簽賬計）</div>
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
    html += renderCampaignToggleRows(userProfile, { excludeSettingKeys: ["winter_promo_enabled"] });
    html += `<div class="flex justify-between items-center bg-gray-800 text-white p-2 rounded border border-gray-600"><span>Mox 活期任務 (+$250k)</span><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" id="st-mox" class="sr-only peer" ${userProfile.settings.mox_deposit_task_enabled ? 'checked' : ''} onchange="toggleSetting('mox_deposit_task_enabled')"><div class="w-9 h-5 bg-gray-500 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer peer-checked:bg-green-400"></div></label></div>`;
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
        const rawRebateText = String(tx.rebateText || "").trim();
        const safeRebateText = (rawRebateText && /\d/.test(rawRebateText)) ? rawRebateText : "$0";
        const rebateText = escapeHtml(safeRebateText);
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
