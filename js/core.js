// js/core.js - V9.10 (Logic Core)

// --- CONFIG ---
const USER_DATA_KEY = 'shawn_app_v9_2_data';
const HOLIDAY_CACHE_KEY = 'cc_mgr_holidays_cache';

// Static Holidays Failure Fallback (2025-2026)
// Source: 1823.gov.hk
const STATIC_HOLIDAYS = [
    // 2025
    "20250101", "20250129", "20250130", "20250131", "20250404", "20250418", "20250419", "20250421",
    "20250501", "20250505", "20250531", "20250701", "20251001", "20251007", "20251029", "20251225", "20251226",
    // 2026 (Estimated)
    "20260101", "20260217", "20260218", "20260219", "20260403", "20260404", "20260406", "20260501", "20260525", "20260619", "20260701", "20260928", "20261001", "20261020", "20261225", "20261226"
];

// --- HOLIDAY MANAGER ---
const HolidayManager = {
    holidays: [], // array of YYYYMMDD strings

    init: async function () {
        // 1. Load from LocalStorage
        const cached = localStorage.getItem(HOLIDAY_CACHE_KEY);
        if (cached) {
            const data = JSON.parse(cached);
            // Check expiry (e.g. 7 days)
            if (Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
                this.holidays = data.list;
                console.log("Loaded cached holidays:", this.holidays.length);
            }
        }

        // 2. Fetch from API (Background)
        // HK Gov API: https://www.1823.gov.hk/common/ical/gc/en.json
        try {
            const response = await fetch('https://www.1823.gov.hk/common/ical/gc/en.json');
            if (response.ok) {
                const json = await response.json();
                if (json && json.vcalendar && json.vcalendar[0] && json.vcalendar[0].vevent) {
                    const rawEvents = json.vcalendar[0].vevent;
                    const newHolidays = rawEvents.map(e => {
                        let d = e.dtstart[0];
                        return d; // YYYYMMDD
                    });
                    this.holidays = [...new Set([...STATIC_HOLIDAYS, ...newHolidays])].sort();

                    // Save Cache
                    localStorage.setItem(HOLIDAY_CACHE_KEY, JSON.stringify({
                        timestamp: Date.now(),
                        list: this.holidays
                    }));
                    console.log("Fetched holidays from Gov API:", this.holidays.length);
                }
            }
        } catch (err) {
            console.warn("Holiday fetch failed, using static/cache.", err);
            if (this.holidays.length === 0) this.holidays = STATIC_HOLIDAYS;
        }

        // Ensure static fallback if empty
        if (this.holidays.length === 0) this.holidays = STATIC_HOLIDAYS;
    },

    isHoliday: function (dateStr) { // Input: YYYY-MM-DD
        if (!dateStr) return false;
        const compact = dateStr.replace(/-/g, ''); // YYYYMMDD
        return this.holidays.includes(compact);
    }
};

let userProfile = {
    ownedCards: ["hsbc_red", "hsbc_everymile"],
    settings: {
        guru_level: 0,
        em_promo_enabled: false,
        winter_promo_enabled: false,
        winter_tier1_threshold: 20000,
        winter_tier2_threshold: 40000,
        red_hot_rewards_enabled: true,
        red_hot_allocation: { dining: 5, world: 0, home: 0, enjoyment: 0, style: 0 },
        boc_amazing_enabled: false,      // 狂賞派 + 狂賞飛
        dbs_black_promo_enabled: false,  // DBS Black $2/里推廣
        fubon_in_promo_enabled: false,   // Fubon iN 網購20X
        sim_promo_enabled: false         // sim 8%網購
    },
    usage: { "winter_total": 0, "winter_eligible": 0, "em_q1_total": 0, "em_q1_eligible": 0, "guru_rc_used": 0, "guru_spend_accum": 0 },
    stats: { totalSpend: 0, totalVal: 0, txCount: 0 },
    transactions: []
};

function loadUserData() {
    const s = localStorage.getItem(USER_DATA_KEY);
    if (s) {
        let loaded = JSON.parse(s);
        userProfile = { ...userProfile, ...loaded };
        if (!userProfile.settings) userProfile.settings = {};
        if (userProfile.settings.winter_tier1_threshold === undefined) userProfile.settings.winter_tier1_threshold = 20000;
        if (userProfile.settings.winter_tier2_threshold === undefined) userProfile.settings.winter_tier2_threshold = 40000;
        if (userProfile.settings.winter_tier2_threshold < userProfile.settings.winter_tier1_threshold) {
            userProfile.settings.winter_tier2_threshold = userProfile.settings.winter_tier1_threshold;
        }
        if (!userProfile.settings.red_hot_allocation) userProfile.settings.red_hot_allocation = { dining: 5, world: 0, home: 0, enjoyment: 0, style: 0 };
        if (!userProfile.stats) userProfile.stats = { totalSpend: 0, totalVal: 0, txCount: 0 };
        if (!userProfile.usage) userProfile.usage = {};
        if (!userProfile.transactions) userProfile.transactions = [];

        // Migration: tuition cap used to track spending (cap_limit=8333) and now tracks reward ($200).
        // If we detect an old large value, convert it to reward units using the module rate (2.4%).
        const tuitionKey = "student_tuition_cap";
        const tuitionVal = Number(userProfile.usage[tuitionKey]) || 0;
        if (tuitionVal > 200.5) {
            userProfile.usage[tuitionKey] = tuitionVal * 0.024;
        }
    }
    saveUserData();
}

function saveUserData() {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userProfile));
}

function checkCap(key, limit) { const u = userProfile.usage[key] || 0; return { used: u, remaining: Math.max(0, limit - u), isMaxed: u >= limit }; }

function getForeignFeeRate(card, category) {
    if (!card) return 0;
    const base = Number(card.fcf) || 0;
    if (base <= 0) return 0;
    const exempt = Array.isArray(card.fcf_exempt_categories) ? card.fcf_exempt_categories : [];
    if (exempt.includes(category)) return 0;
    return base;
}

function inferPromoTypeFromSections(promo) {
    const sections = Array.isArray(promo && promo.sections) ? promo.sections : [];
    let hasMission = false;
    let capCount = 0;
    let hasCapRate = false;
    let hasTierCap = false;

    sections.forEach((sec) => {
        if (!sec || typeof sec !== "object") return;
        if (sec.type === "mission") hasMission = true;
        if (sec.type === "cap") capCount += 1;
        if (sec.type === "cap_rate") hasCapRate = true;
        if (sec.type === "tier_cap") hasTierCap = true;
    });

    if (hasTierCap) return "tiered_cap";
    if (hasMission && hasCapRate) return "mission_cap_rate";
    if (hasMission && capCount > 1) return "mission_multi_cap";
    if (hasMission && capCount === 1) return "mission_cap";
    if (hasMission && sections.length === 1) return "mission_only";
    return "custom";
}

function getPromoType(promo) {
    if (!promo || typeof promo !== "object") return "custom";
    const explicit = typeof promo.promo_type === "string" ? promo.promo_type.trim() : "";
    if (explicit) return explicit;
    return inferPromoTypeFromSections(promo);
}

function getSpecialPromoModel(modelId) {
    if (!modelId || typeof DATA === "undefined" || !DATA || !DATA.specialPromoModels) return null;
    const model = DATA.specialPromoModels[modelId];
    return (model && typeof model === "object") ? model : null;
}

function getTravelGuruFallbackLevels() {
    return {
        1: { name: "GO級", targetSpend: 30000, rewardCap: 500, nextName: "GING級" },
        2: { name: "GING級", targetSpend: 70000, rewardCap: 1200, nextName: "GURU級" },
        3: { name: "GURU級", targetSpend: 70000, rewardCap: 2200, nextName: "保級" }
    };
}

function getLevelLifecycleModelDefaults(modelId) {
    if (modelId === "travel_guru") {
        return {
            title: "Travel Guru",
            icon: "fas fa-trophy",
            theme: "yellow",
            settingKey: "guru_level",
            spendKey: "guru_spend_accum",
            rewardKey: "guru_rc_used",
            rewardUnit: "RC",
            upgradeAction: "handleGuruUpgrade()",
            levels: getTravelGuruFallbackLevels()
        };
    }
    return {
        title: modelId,
        icon: "fas fa-chart-line",
        theme: "gray",
        settingKey: "",
        spendKey: "",
        rewardKey: "",
        rewardUnit: "",
        upgradeAction: null,
        levels: {}
    };
}

function normalizeLevelLifecycleLevels(levels, fallbackLevels) {
    const source = (levels && typeof levels === "object" && !Array.isArray(levels))
        ? levels
        : (fallbackLevels || {});
    const normalized = {};
    Object.keys(source).forEach((key) => {
        const lv = Number(key);
        if (!Number.isFinite(lv) || lv <= 0) return;
        const cfg = source[key] || {};
        normalized[lv] = {
            name: cfg.name || `${lv}級`,
            targetSpend: Math.max(0, Number(cfg.targetSpend) || 0),
            rewardCap: Math.max(0, Number(cfg.rewardCap) || 0),
            nextName: cfg.nextName || null
        };
    });

    if (Object.keys(normalized).length > 0) return normalized;

    const fallback = {};
    Object.keys(fallbackLevels || {}).forEach((key) => {
        const lv = Number(key);
        if (!Number.isFinite(lv) || lv <= 0) return;
        const cfg = fallbackLevels[key] || {};
        fallback[lv] = {
            name: cfg.name || `${lv}級`,
            targetSpend: Math.max(0, Number(cfg.targetSpend) || 0),
            rewardCap: Math.max(0, Number(cfg.rewardCap) || 0),
            nextName: cfg.nextName || null
        };
    });
    return fallback;
}

function getLevelLifecycleModel(modelId) {
    if (!modelId) return null;
    const raw = getSpecialPromoModel(modelId);
    if (!raw) return null;
    const promoType = (typeof raw.promo_type === "string" && raw.promo_type.trim()) ? raw.promo_type.trim() : "";
    if (promoType !== "level_lifecycle") return null;

    const defaults = getLevelLifecycleModelDefaults(modelId);
    const usage = (raw.usage && typeof raw.usage === "object" && !Array.isArray(raw.usage)) ? raw.usage : {};
    const spendKey = usage.spendKey || usage.spend_key || defaults.spendKey;
    const rewardKey = usage.rewardKey || usage.reward_key || defaults.rewardKey;
    const levels = normalizeLevelLifecycleLevels(raw.levels, defaults.levels);
    return {
        id: modelId,
        promoType,
        title: raw.title || raw.display_name_zhhk || raw.name || defaults.title,
        icon: raw.icon || defaults.icon,
        theme: raw.theme || defaults.theme,
        settingKey: raw.settingKey || raw.setting_key || defaults.settingKey,
        rewardUnit: raw.rewardUnit || raw.reward_unit || defaults.rewardUnit,
        upgradeAction: raw.upgradeAction || raw.upgrade_action || defaults.upgradeAction,
        cards: Array.isArray(raw.cards) ? raw.cards.slice() : [],
        module: raw.module || "",
        usage: { spendKey, rewardKey },
        levels
    };
}

function getLevelLifecycleModelIds() {
    if (typeof DATA === "undefined" || !DATA) return [];
    if (Array.isArray(DATA.offers)) {
        const ids = DATA.offers
            .filter((offer) => offer && offer.renderType === "level_lifecycle")
            .map((offer) => offer.modelId || offer.id)
            .filter((id) => !!id && !!getLevelLifecycleModel(id));
        if (ids.length > 0) return Array.from(new Set(ids));
    }
    if (!DATA.specialPromoModels) return [];
    return Object.keys(DATA.specialPromoModels).filter((id) => !!getLevelLifecycleModel(id));
}

function getLevelLifecycleState(modelId, profile) {
    if (!profile || !profile.settings || !profile.usage) return null;
    const model = getLevelLifecycleModel(modelId);
    if (!model) return null;

    const eligibleCards = Array.isArray(model.cards) ? model.cards : [];
    if (eligibleCards.length > 0) {
        const owned = Array.isArray(profile.ownedCards) ? profile.ownedCards : [];
        const eligible = eligibleCards.some((id) => owned.includes(id));
        if (!eligible) return { eligible: false, active: false, model };
    }

    const settingKey = model.settingKey || "";
    const level = settingKey ? (Number(profile.settings[settingKey]) || 0) : 0;
    if (level <= 0) return { eligible: true, active: false, model };

    const levels = model.levels || {};
    const levelCfg = levels[level] || null;
    if (!levelCfg) return { eligible: true, active: false, model };

    const maxLevel = Math.max(0, ...Object.keys(levels).map((k) => Number(k)).filter((n) => Number.isFinite(n)));
    const nextCfg = levels[level + 1] || null;
    const nextLevelName = levelCfg.nextName || (nextCfg && nextCfg.name) || "";
    const levelName = levelCfg.name || `${level}級`;
    const spendAccum = Number(profile.usage[model.usage.spendKey]) || 0;
    const rewardUsed = Number(profile.usage[model.usage.rewardKey]) || 0;
    const targetSpend = Number(levelCfg.targetSpend) || 0;
    const rewardCap = Number(levelCfg.rewardCap) || 0;

    const upgPct = targetSpend > 0 ? Math.min(100, (spendAccum / targetSpend) * 100) : 0;
    const rebatePct = rewardCap > 0 ? Math.min(100, (rewardUsed / rewardCap) * 100) : 0;
    const isMaxed = rewardCap > 0 ? (rewardUsed >= rewardCap) : false;
    const canUpgrade = !!model.upgradeAction && targetSpend > 0 && spendAccum >= targetSpend && level < maxLevel;
    const rewardUnit = model.rewardUnit || "";
    const rewardSuffix = rewardUnit ? ` ${rewardUnit}` : "";

    return {
        eligible: true,
        active: true,
        model,
        level,
        maxLevel,
        title: model.title,
        icon: model.icon,
        theme: model.theme,
        badge: levelName,
        actionButton: canUpgrade
            ? {
                label: `🎉 升級至 ${nextLevelName || `${level + 1}級`}`,
                icon: "fas fa-level-up-alt",
                onClick: model.upgradeAction
            }
            : null,
        sections: [
            {
                kind: "mission",
                label: "🚀 升級進度",
                valueText: `$${spendAccum.toLocaleString()} / $${targetSpend.toLocaleString()}`,
                progress: upgPct,
                state: "active",
                lockedReason: spendAccum >= targetSpend ? null : `尚差 $${Math.max(0, targetSpend - spendAccum).toLocaleString()}`,
                markers: null,
                overlayModel: null,
                meta: { spendAccum, target: targetSpend, unlocked: spendAccum >= targetSpend, unlockedText: "可升級" }
            },
            {
                kind: "cap",
                label: "💰 本級回贈",
                valueText: `${Math.floor(rewardUsed).toLocaleString()}${rewardSuffix} / ${Math.floor(rewardCap).toLocaleString()}${rewardSuffix}`,
                progress: rebatePct,
                state: isMaxed ? "capped" : "active",
                lockedReason: null,
                markers: null,
                overlayModel: null,
                meta: {
                    used: rewardUsed,
                    cap: rewardCap,
                    remaining: Math.max(0, rewardCap - rewardUsed),
                    prefix: "",
                    unit: rewardSuffix,
                    unlocked: true
                }
            }
        ]
    };
}

function getTravelGuruLevelMap() {
    const model = getLevelLifecycleModel("travel_guru");
    return (model && model.levels) ? model.levels : getTravelGuruFallbackLevels();
}

function getTravelGuruUsageKeys() {
    const model = getLevelLifecycleModel("travel_guru");
    const usage = (model && model.usage) ? model.usage : {};
    return {
        spendKey: usage.spendKey || "guru_spend_accum",
        rewardKey: usage.rewardKey || "guru_rc_used"
    };
}

function getTravelGuruLevelConfig(level) {
    const levels = getTravelGuruLevelMap();
    const lv = Number(level);
    return Number.isFinite(lv) ? (levels[lv] || null) : null;
}

function getTravelGuruMaxLevel() {
    const levels = getTravelGuruLevelMap();
    const keys = Object.keys(levels).map((k) => Number(k)).filter((n) => Number.isFinite(n));
    return keys.length > 0 ? Math.max(...keys) : 0;
}

function getTravelGuruLevelName(level) {
    const cfg = getTravelGuruLevelConfig(level);
    return cfg && cfg.name ? cfg.name : "";
}

function getTravelGuruNextLevelName(level) {
    const cfg = getTravelGuruLevelConfig(level);
    if (cfg && cfg.nextName) return cfg.nextName;
    const next = getTravelGuruLevelConfig(Number(level) + 1);
    return next && next.name ? next.name : "";
}

function buildPromoStatus(promo, userProfile, modulesDB) {
    if (!promo || !userProfile) return null;
    const policyMeta = (typeof DATA !== "undefined" && DATA.periodPolicy && DATA.periodPolicy.byCampaignId && promo.id)
        ? DATA.periodPolicy.byCampaignId[promo.id]
        : null;
    if (policyMeta && policyMeta.hasDateWindows && !policyMeta.isActive) {
        return { eligible: false };
    }
    const eligible = Array.isArray(promo.cards) && promo.cards.some(id => (userProfile.ownedCards || []).includes(id));
    if (!eligible) return { eligible: false };

    const sections = [];
    const renderedCaps = new Set();
    let missionUnlockTarget = null;
    let missionUnlockValue = null;

    const promoType = getPromoType(promo);
    const isWinterPromo = promoType === "tiered_cap" || promo.id === "winter_promo";
    const winterTier1 = Math.max(0, Number(userProfile.settings && userProfile.settings.winter_tier1_threshold) || 0);
    const winterTier2Raw = Math.max(0, Number(userProfile.settings && userProfile.settings.winter_tier2_threshold) || 0);
    const winterTier2 = Math.max(winterTier1, winterTier2Raw);

    const getModule = (key) => (key && modulesDB && modulesDB[key]) ? modulesDB[key] : null;
    const getCapFromModule = (key) => {
        const m = getModule(key);
        return m && m.cap_limit ? { cap: m.cap_limit, capKey: m.cap_key || null } : null;
    };
    const toFiniteNumber = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    };
    const toPositiveNumber = (value) => {
        const n = toFiniteNumber(value);
        return (n !== null && n > 0) ? n : null;
    };
    const uniqueList = (values) => Array.from(new Set((values || []).filter(Boolean)));
    const getModuleRefs = (sec, singleKey, listKey) => {
        const refs = [];
        const single = sec && sec[singleKey];
        if (typeof single === "string" && single) refs.push(single);
        const list = sec && sec[listKey];
        if (Array.isArray(list)) {
            list.forEach((id) => {
                if (typeof id === "string" && id) refs.push(id);
            });
        }
        return uniqueList(refs);
    };
    const deriveMissionSpec = (sec) => {
        let usageKey = sec.usageKey || null;
        let usageKeys = Array.isArray(sec.usageKeys) ? uniqueList(sec.usageKeys) : [];
        let target = toFiniteNumber(sec.target);
        const refs = getModuleRefs(sec, "missionModule", "missionModules");
        const derivedKeys = [];
        const derivedTargets = [];

        refs.forEach((id) => {
            const mod = getModule(id);
            if (!mod) return;
            if (mod.req_mission_key) derivedKeys.push(mod.req_mission_key);
            const spend = toFiniteNumber(mod.req_mission_spend);
            if (spend !== null) derivedTargets.push(spend);
        });

        const uniqKeys = uniqueList(derivedKeys);
        if (!usageKey && usageKeys.length === 0) {
            if (uniqKeys.length === 1) usageKey = uniqKeys[0];
            else if (uniqKeys.length > 1) usageKeys = uniqKeys;
        }

        if (target === null && derivedTargets.length > 0) {
            const uniqTargets = uniqueList(derivedTargets);
            if (uniqTargets.length === 1) target = Number(uniqTargets[0]);
            else target = Math.max(...uniqTargets.map((n) => Number(n) || 0));
        }

        return { usageKey, usageKeys, target };
    };
    const deriveUnlockSpec = (sec) => {
        let unlockKey = sec.unlockKey || null;
        let unlockTarget = toFiniteNumber(sec.unlockTarget);
        const refs = getModuleRefs(sec, "unlockModule", "unlockModules");
        const derivedKeys = [];
        const derivedTargets = [];

        refs.forEach((id) => {
            const mod = getModule(id);
            if (!mod) return;
            if (mod.req_mission_key) derivedKeys.push(mod.req_mission_key);
            const spend = toFiniteNumber(mod.req_mission_spend);
            if (spend !== null) derivedTargets.push(spend);
        });

        const uniqKeys = uniqueList(derivedKeys);
        if (!unlockKey && uniqKeys.length === 1) unlockKey = uniqKeys[0];

        if (unlockTarget === null && derivedTargets.length > 0) {
            const uniqTargets = uniqueList(derivedTargets);
            if (uniqTargets.length === 1) unlockTarget = Number(uniqTargets[0]);
            else unlockTarget = Math.max(...uniqTargets.map((n) => Number(n) || 0));
        }

        return { unlockKey, unlockTarget };
    };

    (promo.sections || []).forEach(sec => {
        if (sec.type === "mission") {
            const missionSpec = deriveMissionSpec(sec);
            let spend = 0;
            if (missionSpec.usageKeys && missionSpec.usageKeys.length > 0) {
                spend = missionSpec.usageKeys.reduce((s, k) => s + (Number(userProfile.usage[k]) || 0), 0);
            } else if (missionSpec.usageKey) {
                spend = Number(userProfile.usage[missionSpec.usageKey]) || 0;
            }
            const target = isWinterPromo ? winterTier2 : (toFiniteNumber(missionSpec.target) || 0);
            missionUnlockTarget = target;
            missionUnlockValue = spend;
            const pct = target > 0 ? Math.min(100, (spend / target) * 100) : 0;
            const unlocked = target > 0 ? (spend >= target) : true;
            let markers = null;
            const markersSrc = isWinterPromo ? [winterTier1, winterTier2] : sec.markers;
            if (markersSrc) {
                const list = Array.isArray(markersSrc) ? markersSrc.slice() : [];
                if (list.length > 0 && list[0] !== 0) list.unshift(0);
                markers = list;
            }

	            sections.push({
	                kind: "mission",
	                label: sec.label || "簽賬任務進度",
	                valueText: `$${spend.toLocaleString()} / $${target.toLocaleString()}`,
	                progress: isWinterPromo ? 100 : pct,
	                // Mission is informational progress; reward sections handle lock/cap gating.
	                state: "active",
	                markers,
	                overlayModel: isWinterPromo ? { type: "winter_mission", tier1: winterTier1, tier2: winterTier2, spend } : null,
	                lockedReason: unlocked ? null : `尚差 $${Math.max(0, target - spend).toLocaleString()}`,
	                meta: { spend, target, unlocked, isWinterPromo }
	            });
        }

	        if (sec.type === "cap_rate") {
	            const used = Number(userProfile.usage[sec.usageKey]) || 0;
	            let capVal = toPositiveNumber(sec.cap);
	            if (sec.capModule) {
	                const capInfo = getCapFromModule(sec.capModule);
	                if (capInfo && capInfo.cap) capVal = toPositiveNumber(capInfo.cap);
	            }
	            let rate = Number(sec.rate);
	            if (!Number.isFinite(rate) && sec.rateModule) {
	                const rm = getModule(sec.rateModule);
	                if (rm && Number.isFinite(Number(rm.rate))) rate = Number(rm.rate);
	            }
	            if (!Number.isFinite(rate) && sec.capModule) {
	                const rm = getModule(sec.capModule);
	                if (rm && Number.isFinite(Number(rm.rate))) rate = Number(rm.rate);
	            }
	            if (!Number.isFinite(rate)) rate = 0;
                const unlockSpec = deriveUnlockSpec(sec);
                const fallbackTarget = toFiniteNumber(missionUnlockTarget);
                const unlockTarget = unlockSpec.unlockTarget !== null ? unlockSpec.unlockTarget : fallbackTarget;
                const unlockValue = unlockSpec.unlockKey ? (Number(userProfile.usage[unlockSpec.unlockKey]) || 0) : missionUnlockValue;
                const hasCap = capVal !== null;

	            const rewardRaw = used * rate;
                const reward = hasCap ? Math.min(capVal, rewardRaw) : rewardRaw;
	            const pct = hasCap ? Math.min(100, (reward / capVal) * 100) : ((unlockTarget && unlockTarget > 0) ? Math.min(100, ((unlockValue || 0) / unlockTarget) * 100) : 100);
	            const unlocked = (unlockTarget !== null && unlockValue !== null) ? unlockValue >= unlockTarget : true;
	            const unit = sec.unit || "";
	            const isCurrencyUnit = (unit === "" || unit === "$" || unit === "HKD" || unit === "元" || unit === "HK$");
	            const prefix = isCurrencyUnit ? "$" : "";
	            const suffix = isCurrencyUnit ? "" : (unit ? ` ${unit}` : "");
	            const state = unlocked ? (hasCap && reward >= capVal ? "capped" : "active") : "locked";
	            const lockedReason = !unlocked ? "未解鎖" : null;
                const valueText = hasCap
                    ? `${prefix}${Math.floor(reward).toLocaleString()}${suffix} / ${prefix}${capVal.toLocaleString()}${suffix}`.trim()
                    : (unlocked ? "已達門檻（不設上限）" : "未達門檻");

	            sections.push({
	                kind: "cap_rate",
	                label: sec.label || "回贈進度",
	                valueText,
	                progress: pct,
	                state,
	                lockedReason,
	                meta: {
                    reward,
                    cap: hasCap ? capVal : 0,
                    unit,
                    remaining: hasCap ? Math.max(0, capVal - reward) : 0,
                    unlocked
                }
            });
        }

        if (sec.type === "tier_cap") {
            const total = Number(userProfile.usage[sec.totalKey]) || 0;
            const eligibleVal = Number(userProfile.usage[sec.eligibleKey]) || 0;
            const tiers = (isWinterPromo && Array.isArray(sec.tiers) && sec.tiers.length >= 2) ? [
                { ...sec.tiers[0], threshold: winterTier1 },
                { ...sec.tiers[1], threshold: winterTier2 }
            ] : sec.tiers;
            let cap = tiers[0].cap;
            let reward = 0;
            if (total >= tiers[1].threshold) {
                cap = tiers[1].cap;
                reward = Math.min(tiers[1].cap, eligibleVal * tiers[1].rate);
            } else if (total >= tiers[0].threshold) {
                cap = tiers[0].cap;
                reward = Math.min(tiers[0].cap, eligibleVal * tiers[0].rate);
            }
            const pct = Math.min(100, cap > 0 ? (reward / cap) * 100 : 0);
            const unlocked = total >= tiers[0].threshold;
            const state = unlocked ? (reward >= cap ? "capped" : "active") : "locked";
            let overlayModel = null;
            let markers = null;
            let lockedReason = null;
            let rewardDisplay = reward;

            if (isWinterPromo) {
                const cap1 = tiers[0].cap || 0;
                const cap2 = Math.max(cap1, tiers[1].cap || 0);
                const rewardTier1 = Math.min(cap1, eligibleVal * tiers[0].rate);
                const rewardTier2 = Math.min(cap2, eligibleVal * tiers[1].rate);
                const t1 = tiers[0].threshold || 0;
                const t2 = Math.max(t1, tiers[1].threshold || 0);
                const tier1Unlocked = total >= t1;
                const tier2Unlocked = total >= t2;

                overlayModel = {
                    type: "winter_reward",
                    cap1,
                    cap2,
                    rewardTier1,
                    rewardTier2,
                    tier1Unlocked,
                    tier2Unlocked,
                    tier1Threshold: t1,
                    tier2Threshold: t2
                };

                const totalCap = cap2 || 1;
                markers = [
                    { label: "0", pos: 0 },
                    { label: cap1.toLocaleString(), pos: (cap1 / totalCap) * 100 },
                    { label: cap2.toLocaleString(), pos: 100 }
                ];

                if (total >= t2) {
                    lockedReason = null;
                } else if (total >= t1) {
                    lockedReason = `第 2 階未解鎖：${Math.floor(rewardTier2).toLocaleString()} / ${tiers[1].cap}`;
                } else {
                    lockedReason = "第 1 階未解鎖";
                    // 未達第1階時也顯示可累積的預估回贈，避免長期顯示 0。
                    rewardDisplay = rewardTier1;
                }
            }

            sections.push({
                kind: "tier_cap",
                label: sec.label || "回贈進度",
                valueText: `$${Math.floor(rewardDisplay).toLocaleString()} / $${cap.toLocaleString()}`,
                progress: isWinterPromo ? 100 : pct,
                state,
                markers,
                overlayModel,
                lockedReason,
                meta: {
                    reward,
                    rewardDisplay,
                    cap,
                    remaining: Math.max(0, cap - reward),
                    unlocked,
                    isWinterPromo
                }
            });
        }

	        if (sec.type === "cap") {
                const unlockSpec = deriveUnlockSpec(sec);
	            let capKey = sec.capKey;
	            let capVal = toPositiveNumber(sec.cap);
	            if (sec.capModule) {
	                const capInfo = getCapFromModule(sec.capModule);
	                if (capInfo) {
	                    capVal = toPositiveNumber(capInfo.cap);
	                    capKey = capInfo.capKey || capKey;
	                }
	            }
	            const used = Number(userProfile.usage[capKey]) || 0;
                const fallbackTarget = toFiniteNumber(missionUnlockTarget);
                const unlockTarget = unlockSpec.unlockTarget !== null ? unlockSpec.unlockTarget : fallbackTarget;
                const unlockValue = unlockSpec.unlockKey ? (Number(userProfile.usage[unlockSpec.unlockKey]) || 0) : missionUnlockValue;
	            const unlocked = (unlockTarget !== null && unlockValue !== null) ? (unlockValue >= unlockTarget) : true;
                const hasCap = capVal !== null;
	            const pct = hasCap ? Math.min(100, (used / capVal) * 100) : ((unlockTarget && unlockTarget > 0) ? Math.min(100, ((unlockValue || 0) / unlockTarget) * 100) : 100);
	            const unitRaw = sec.unit || '';
	            const isCurrencyUnit = (unitRaw === "" || unitRaw === "$" || unitRaw === "HKD" || unitRaw === "元" || unitRaw === "HK$");
	            const prefix = isCurrencyUnit ? '$' : (unitRaw ? '' : '$');
	            const unit = isCurrencyUnit ? '' : unitRaw;
	            const state = hasCap ? (used >= capVal ? "capped" : (unlocked ? "active" : "locked")) : (unlocked ? "active" : "locked");
                const valueText = hasCap
                    ? `${prefix}${Math.floor(used).toLocaleString()}${unit} / ${prefix}${capVal.toLocaleString()}${unit}`
                    : (unlocked ? "已達門檻（不設上限）" : "未達門檻");

	            sections.push({
	                kind: "cap",
	                label: sec.label || "回贈進度",
	                valueText,
	                progress: pct,
	                state,
	                lockedReason: unlocked ? null : "未解鎖",
	                meta: {
	                    used,
	                    cap: hasCap ? capVal : 0,
	                    unit,
	                    prefix,
	                    remaining: hasCap ? Math.max(0, capVal - used) : 0,
	                    unlocked
	                }
	            });
	            if (capKey) renderedCaps.add(capKey);
	        }
    });

    if (promo.capKeys) promo.capKeys.forEach(k => renderedCaps.add(k));

    return {
        eligible: true,
        promoType,
        sections: sections,
        renderedCaps: Array.from(renderedCaps),
        capKeys: promo.capKeys || []
    };
}

function calculateGuru(mod, amount, level, category) {
    if (level <= 0 || !isCategoryMatch([mod.category], category)) return { rate: 0, entry: null, generatedRC: 0 };
    const conf = mod.config[level];
    if (!conf) return { rate: 0, entry: null, generatedRC: 0 };
    const capStatus = checkCap(mod.usage_key, conf.cap_rc);
    if (capStatus.isMaxed) {
        return {
            rate: 0,
            entry: { text: `${conf.desc} (爆Cap)`, tone: "warning", flags: { capped: true, strike: true } },
            generatedRC: 0
        };
    }
    const potentialRC = amount * conf.rate;
    if (potentialRC <= capStatus.remaining) {
        return {
            rate: conf.rate,
            entry: { text: conf.desc, tone: "warning", flags: { bold: true } },
            generatedRC: potentialRC
        };
    }
    return {
        rate: capStatus.remaining / amount,
        entry: { text: `${conf.desc}(部分)`, tone: "warning", flags: { partial: true, bold: true } },
        generatedRC: capStatus.remaining
    };
}

function getRedHotCategory(inputCategory) {
    if (typeof DATA === 'undefined' || !DATA.redHotCategories) return null;
    for (const [rhCat, validInputs] of Object.entries(DATA.redHotCategories)) {
        if (validInputs.includes(inputCategory)) return rhCat;
    }
    return null;
}

function resolveCategory(cardId, inputCategory) {
    const rules = DATA && DATA.rules;
    if (!rules) return inputCategory;

    const prefix = cardId.split('_')[0];
    const aliasRule = rules.categoryAliases && rules.categoryAliases[inputCategory];
    if (aliasRule) {
        if (aliasRule.byCardId && aliasRule.byCardId[cardId]) return aliasRule.byCardId[cardId];
        if (aliasRule.byPrefix && aliasRule.byPrefix[prefix]) return aliasRule.byPrefix[prefix];
        if (aliasRule.default) return aliasRule.default;
    }

    const cardRule = rules.cardCategoryOverrides && rules.cardCategoryOverrides[cardId];
    if (cardRule) {
        if (cardRule.preferenceKey && cardRule.preferences) {
            const pref = userProfile.settings[cardRule.preferenceKey];
            const prefRule = pref && cardRule.preferences[pref];
            if (prefRule && Array.isArray(prefRule.matches)) {
                if (prefRule.matches.includes(inputCategory)) return prefRule.mapTo;
            }
        }
        if (cardRule.map && cardRule.map[inputCategory]) return cardRule.map[inputCategory];
    }

    return inputCategory;
}

const CATEGORY_HIERARCHY = (DATA && DATA.rules && DATA.rules.categoryHierarchy) ? DATA.rules.categoryHierarchy : {
    "overseas_cn": ["overseas"],
    "overseas_mo": ["overseas"],
    "overseas_jkt": ["overseas"],
    "overseas_tw": ["overseas"],
    "overseas_other": ["overseas"],
    "travel_plus_tier1": ["overseas"]
};

function isCategoryMatch(moduleMatches, category) {
    if (!moduleMatches) return false;
    // Direct match
    if (moduleMatches.includes(category)) return true;

    // Parent match via hierarchy
    const parents = CATEGORY_HIERARCHY[category];
    if (parents) {
        return parents.some(parent => moduleMatches.includes(parent));
    }

    return false;
}

function isCategoryOrOnlineMatch(moduleMatches, category, isOnline) {
    if (!Array.isArray(moduleMatches) || moduleMatches.length === 0) return false;
    const hasOnline = moduleMatches.includes('online');
    const filteredMatches = hasOnline ? moduleMatches.filter(match => match !== 'online') : moduleMatches;
    const categoryMatch = filteredMatches.length > 0 ? isCategoryMatch(filteredMatches, category) : false;
    const onlineMatch = hasOnline && !!isOnline;
    return categoryMatch || onlineMatch;
}

function isForeignCategory(category) {
    // Prefer hierarchy-based detection so new overseas children (e.g. online_foreign, china_consumption)
    // automatically count as "foreign" without string prefix assumptions.
    if (!category) return false;
    if (category === 'foreign') return true; // legacy
    if (category === 'overseas') return true;

    const visited = new Set();
    const stack = [category];
    while (stack.length) {
        const cur = stack.pop();
        if (!cur || visited.has(cur)) continue;
        visited.add(cur);

        const parents = CATEGORY_HIERARCHY[cur];
        if (!parents || !Array.isArray(parents)) continue;
        if (parents.includes('overseas')) return true;
        parents.forEach(p => stack.push(p));
    }

    return false;
}

function isMissionMet(mod, userProfile, missionDeltaByKey) {
    if (!mod.req_mission_spend || !mod.req_mission_key) return true;
    let currentSpend = userProfile.usage[mod.req_mission_key] || 0;
    if (missionDeltaByKey && mod.req_mission_key) {
        currentSpend += Number(missionDeltaByKey[mod.req_mission_key] || 0);
    }
    return currentSpend >= mod.req_mission_spend;
}

function isRetroactive(mod) {
    if (mod.retroactive === false) return false;
    return !!(mod.req_mission_spend && mod.req_mission_key);
}

function isReplacerEligible(mod, amount, resolvedCategory, userProfile, includeLocked, ctx, missionDeltaByKey) {
    if (!mod || mod.type !== 'category' || mod.mode !== 'replace') return false;
    const matchOk = mod.match ? isCategoryOrOnlineMatch(mod.match, resolvedCategory, ctx && ctx.isOnline) : true;
    if (!matchOk) return false;
    if (typeof mod.eligible_check === 'function' && !mod.eligible_check(resolvedCategory, ctx || {})) return false;
    if (mod.min_single_spend && amount < mod.min_single_spend) return false;
    if (mod.min_spend && amount < mod.min_spend) return false;

    if (mod.req_mission_spend && mod.req_mission_key) {
        const met = isMissionMet(mod, userProfile, missionDeltaByKey);
        if (!met && !(includeLocked && isRetroactive(mod))) return false;
    }
    return true;
}

// Helper: Check if module is valid for the given date/context
function checkValidity(mod, txDate, isHoliday) {
    let d;
    let dateStr;

    if (!txDate) {
        // If no date provided, default to Today for validation context
        // This prevents "Double Count" where both mutually exclusive modules become valid
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const dayStr = String(now.getDate()).padStart(2, '0');
        dateStr = `${y}-${m}-${dayStr}`;
        d = now;
    } else {
        d = new Date(txDate);
        dateStr = txDate; // YYYY-MM-DD
    }

    // 1. Date Range
    if (mod.valid_from && dateStr < mod.valid_from) return false;
    if (mod.valid_to && dateStr > mod.valid_to) return false;

    // 2. Day of Week (0=Sun, 1=Mon... 6=Sat)
    if (mod.valid_days && Array.isArray(mod.valid_days)) {
        const day = d.getDay();
        if (!mod.valid_days.includes(day)) return false;
    }

    // 3. Holiday (If specified)
    // valid_on_holiday: true (only holiday), false (only non-holiday), undefined (both)
    if (mod.valid_on_holiday === true && !isHoliday) return false;
    if (mod.valid_on_holiday === false && isHoliday) return false;

    // 4. Red Day (BOC Amazing Rewards specific: Holiday + Sundays)
    // valid_on_red_day: true (Red Day only), false (Normal Day only)
    if (mod.valid_on_red_day !== undefined) {
        const day = d.getDay();
        const isRedDay = isHoliday || day === 0; // Holiday OR Sunday

        if (mod.valid_on_red_day === true && !isRedDay) return false;  // Require Red Day, but is Normal
        if (mod.valid_on_red_day === false && isRedDay) return false; // Require Normal Day, but is Red
    }

    return true;
}

function makeBreakdownEntry(text, tone, flags) {
    return { text: text || "", tone: tone || "normal", flags: flags || {} };
}

function makeBreakdownFromText(text, tone, flags) {
    const nextFlags = { ...(flags || {}) };
    if (text && text.includes("🔒")) nextFlags.locked = true;
    return makeBreakdownEntry(text, tone || (nextFlags.locked ? "muted" : "normal"), nextFlags);
}

function buildCardResult(card, amount, category, displayMode, userProfile, txDate, isHoliday, isOnline, isMobilePay, paymentMethod) {
    const modules = (DATA && DATA.modules) ? DATA.modules : {};
    const conversions = (DATA && DATA.conversions) ? DATA.conversions : [];
    const resolvedCategory = resolveCategory(card.id, category);
    const rules = DATA && DATA.rules;
    const prefix = card.id.split('_')[0];
    const zeroCats = rules && rules.zeroRewardByCardPrefix && rules.zeroRewardByCardPrefix[prefix];
    const isZeroCategory = Array.isArray(zeroCats) && zeroCats.includes(category);

    const conv = conversions.find(c => c.src === card.currency);
    if (!conv) return null;

    let totalRate = 0;
    let totalRatePotential = 0;
    let breakdown = [];
    let guruRC = 0;
    let missionTags = [];
    let trackingKey = null;
    let rewardInfo = null;
    let pendingUnlocks = [];
    const addBreakdown = (text, tone, flags) => {
        if (!text) return;
        breakdown.push(makeBreakdownFromText(text, tone, flags));
    };

    if (isZeroCategory) {
        let valStr = "", unitStr = "";
        let valStrPotential = "", unitStrPotential = "";
        const unsupportedMode = (displayMode === "miles") ? (conv.miles_rate === 0) : (conv.cash_rate === 0);
        if (displayMode === 'miles') {
            valStr = "0"; unitStr = "里";
            valStrPotential = "0"; unitStrPotential = "里";
        } else {
            valStr = "0"; unitStr = "$";
            valStrPotential = "0"; unitStrPotential = "$";
        }

        return {
            cardId: card.id,
            cardName: card.name,
            amount,
            displayVal: valStr,
            displayUnit: unitStr,
            displayValPotential: valStrPotential,
            displayUnitPotential: unitStrPotential,
            estValue: 0,
            estMiles: 0,
            estCash: 0,
            estCashNet: 0,
            estMilesPotential: 0,
            estCashPotential: 0,
            breakdown: [makeBreakdownEntry("Alipay/WeChat 0%", "muted", { zero: true })],
            trackingKey: null,
            guruRC: 0,
            missionTags: [],
            category,
            rewardTrackingKey: null,
            secondaryRewardTrackingKey: null,
            generatedReward: 0,
            redemptionConfig: card.redemption,
            supportsMiles: conv.miles_rate !== 0,
            supportsCash: conv.cash_rate !== 0,
            unsupportedMode,
            nativeVal: 0,
            nativeValPotential: 0,
            pendingUnlocks: []
        };
    }

    // Trackers (mission tags)
    let missionDeltaByKey = {};
    if (typeof evaluateTrackers === "function") {
        const trackerRes = evaluateTrackers(card.id, { category, amount, isOnline, isMobilePay, paymentMethod, txDate, isHoliday }, userProfile, DATA);
        if (trackerRes && Array.isArray(trackerRes.missionTags)) missionTags = trackerRes.missionTags;
        if (trackerRes && Array.isArray(trackerRes.effects)) {
            missionDeltaByKey = {};
            trackerRes.effects.forEach((effect) => {
                if (!effect || !effect.key) return;
                missionDeltaByKey[effect.key] = (Number(missionDeltaByKey[effect.key]) || 0) + (Number(effect.amount) || 0);
            });
        }
    }

    // [Module Logic]
    if (!Array.isArray(card.rewardModules) || card.rewardModules.length === 0) return null;

    // Filter Valid Modules First
    const activeModules = card.rewardModules.filter(modID => {
        const m = modules[modID];
        if (!m) return false;
        return checkValidity(m, txDate, isHoliday);
    });

    // Check for Replacer Module first (Optimization)
    // This replacerModule is for category-specific 'replace' mode modules
    const ctx = { isOnline: !!isOnline, isMobilePay: !!isMobilePay, paymentMethod: paymentMethod };
    let replacerModuleCurrentId = activeModules.find(mid => {
        const m = modules[mid];
        return isReplacerEligible(m, amount, resolvedCategory, userProfile, false, ctx, missionDeltaByKey);
    });
    let replacerModulePotentialId = activeModules.find(mid => {
        const m = modules[mid];
        return isReplacerEligible(m, amount, resolvedCategory, userProfile, true, ctx, missionDeltaByKey);
    });
    let replacerModuleCurrent = replacerModuleCurrentId ? modules[replacerModuleCurrentId] : null;
    let replacerModulePotential = replacerModulePotentialId ? modules[replacerModulePotentialId] : null;

    function replaceModuleCapped(mod) {
        if (!mod || !mod.cap_limit || !mod.cap_key) return false;
        if (mod.cap_mode === 'reward') {
            const capCheck = checkCap(mod.cap_key, mod.cap_limit);
            let isMaxed = capCheck.isMaxed;
            if (mod.secondary_cap_key && mod.secondary_cap_limit) {
                const secCap = checkCap(mod.secondary_cap_key, mod.secondary_cap_limit);
                if (secCap.isMaxed) isMaxed = true;
            }
            return isMaxed;
        }
        const capCheck = checkCap(mod.cap_key, mod.cap_limit);
        return capCheck.isMaxed;
    }

    if (replaceModuleCapped(replacerModuleCurrent)) replacerModuleCurrent = null;
    if (replaceModuleCapped(replacerModulePotential)) replacerModulePotential = null;

    const nextMissionThresholdByKey = {};
    activeModules.forEach((modID) => {
        const mod = modules[modID];
        if (!mod || !mod.req_mission_key || !mod.req_mission_spend) return;
        const key = mod.req_mission_key;
        const threshold = Number(mod.req_mission_spend) || 0;
        if (threshold <= 0) return;
        const spendNow = (Number(userProfile.usage[key]) || 0) + (Number(missionDeltaByKey[key]) || 0);
        if (spendNow >= threshold) return;
        if (!Object.prototype.hasOwnProperty.call(nextMissionThresholdByKey, key)) {
            nextMissionThresholdByKey[key] = threshold;
            return;
        }
        if (threshold < nextMissionThresholdByKey[key]) {
            nextMissionThresholdByKey[key] = threshold;
        }
    });

    // ... (Module Logic 保持 V10.7 不變) ...
    activeModules.forEach(modID => {
        const mod = modules[modID];
        // [FIX] Clone mod to avoid mutating global DB if we change desc
        // Actually mod is ref. Safer to use tempDesc.
        if (!mod) return;
        let tempDesc = null;
        let hit = false;
        let rate = 0;
        let capDisplayHandled = false;
        if (mod.setting_key && userProfile.settings[mod.setting_key] === false) return;

        // [NEW] Min Spend Check (Single Transaction)
        if (mod.min_spend && amount < mod.min_spend) return;

        // [NEW] Single Transaction Minimum (for BOC Amazing Rewards)
        if (mod.min_single_spend && amount < mod.min_single_spend) return;

        // [NEW] Mission Spend Check (Monthly Cumulative)
        const missionRequired = !!(mod.req_mission_spend && mod.req_mission_key);
        const missionMet = missionRequired ? isMissionMet(mod, userProfile, missionDeltaByKey) : true;
        const retroactive = missionRequired ? isRetroactive(mod) : false;
        const applyCurrent = missionMet;
        const applyPotential = missionMet || retroactive;
        const nextThreshold = (missionRequired && mod.req_mission_key)
            ? nextMissionThresholdByKey[mod.req_mission_key]
            : null;
        const showLockedBreakdown = !missionRequired || applyCurrent
            ? true
            : (nextThreshold === null || nextThreshold === undefined || Number(mod.req_mission_spend) === Number(nextThreshold));
        const addModuleBreakdown = (text, tone, flags) => {
            if (!showLockedBreakdown) return;
            addBreakdown(text, tone, flags);
        };

        if (!applyPotential) return;
        if (!applyCurrent && retroactive) {
            tempDesc = `🔒 ${mod.desc}`;
        } else if (!applyCurrent && !retroactive) {
            tempDesc = `🔒 ${mod.desc}`;
        }

        if (mod.type === "red_hot_allocation") {
            const rhCat = getRedHotCategory(category);
            if (rhCat) {
                const multiplier = userProfile.settings.red_hot_allocation[rhCat] || 0;
                if (multiplier > 0) { rate = multiplier * mod.rate_per_x; const pct = (rate * 100).toFixed(1); tempDesc = `${mod.desc} (${multiplier}X = ${pct}%)`; hit = true; }
            }
        }
        else if (mod.type === "red_hot_fixed_bonus") { const rhCat = getRedHotCategory(category); if (rhCat) { rate = mod.multiplier * mod.rate_per_x; hit = true; } }
            else if (mod.type === "guru_capped") {
                const res = calculateGuru(mod, amount, parseInt(userProfile.settings.guru_level), category);
                if (res.entry) {
                    breakdown.push(res.entry);
                    guruRC = res.generatedRC;
                    totalRate += res.rate;
                    totalRatePotential += res.rate;
                }
            }
            else if (mod.type === "category") {
                const matchOk = mod.match ? isCategoryOrOnlineMatch(mod.match, resolvedCategory, isOnline) : true;
                if (!matchOk) return;
                if (typeof mod.eligible_check === 'function' && !mod.eligible_check(resolvedCategory, { isOnline: !!isOnline, isMobilePay: !!isMobilePay, paymentMethod: paymentMethod })) return;
                if (mod.cap_limit) {
                    if (applyCurrent && mod.cap_mode !== 'reward') trackingKey = mod.cap_key;

                // [UPDATED] Check Cap Mode (Spending vs Reward)
                if (mod.cap_mode === 'reward') {
                    // Reward-based Cap Logic (e.g. Hang Seng Base + Bonus)
                    const rewardCapCheck = checkCap(mod.cap_key, mod.cap_limit);
                    let remaining = rewardCapCheck.remaining;
                    let isMaxed = rewardCapCheck.isMaxed;

                    // [NEW] Secondary Cap Check (e.g. Total Cap)
                    if (mod.secondary_cap_key && mod.secondary_cap_limit) {
                        const secCap = checkCap(mod.secondary_cap_key, mod.secondary_cap_limit);
                        if (secCap.isMaxed) isMaxed = true;
                        remaining = Math.min(remaining, secCap.remaining);
                    }

                        if (isMaxed) {
                            addModuleBreakdown(`${tempDesc || mod.desc} (爆Cap)`, "muted", { capped: true, strike: true });
                        } else {
                            const projectedReward = amount * mod.rate;
                            if (projectedReward <= remaining) {
                                rate = mod.rate;
                                hit = true;
                                addModuleBreakdown(tempDesc || mod.desc);
                            } else {
                                rate = remaining / amount;
                                addModuleBreakdown(`${tempDesc || mod.desc}(部分)`, null, { partial: true });
                                hit = true;
                            }
                        }
                } else {
                    // Standard Spending-based Cap
                    const capCheck = checkCap(mod.cap_key, mod.cap_limit);
                    if (capCheck.isMaxed) addModuleBreakdown(tempDesc || mod.desc, "muted", { capped: true, strike: true });
                    else if (amount > capCheck.remaining) { rate = (capCheck.remaining * mod.rate) / amount; addModuleBreakdown(`${tempDesc || mod.desc}(部分)`, null, { partial: true }); hit = true; }
                    else {
                        rate = mod.rate;
                        hit = true;
                        // [FIXED] Push description when within spending cap
                        addModuleBreakdown(tempDesc || mod.desc);
                    }
                }
            } else { rate = mod.rate; hit = true; }
        }
            else if (mod.type === "always") { rate = mod.rate; hit = true; }

            // Enforce cap for non-category modules (e.g. red_hot_allocation / red_hot_fixed_bonus).
            // Category cap logic is already handled in the category branch above.
            if (hit && mod.type !== "guru_capped" && mod.type !== "category" && mod.cap_limit && mod.cap_key) {
                if (applyCurrent && mod.cap_mode !== 'reward') trackingKey = mod.cap_key;

                if (mod.cap_mode === 'reward') {
                    const rewardCapCheck = checkCap(mod.cap_key, mod.cap_limit);
                    let remaining = rewardCapCheck.remaining;
                    let isMaxed = rewardCapCheck.isMaxed;

                    if (mod.secondary_cap_key && mod.secondary_cap_limit) {
                        const secCap = checkCap(mod.secondary_cap_key, mod.secondary_cap_limit);
                        if (secCap.isMaxed) isMaxed = true;
                        remaining = Math.min(remaining, secCap.remaining);
                    }

                    if (isMaxed) {
                        addModuleBreakdown(`${tempDesc || mod.desc} (爆Cap)`, "muted", { capped: true, strike: true });
                        hit = false;
                    } else {
                        const projectedReward = amount * rate;
                        if (projectedReward <= remaining) {
                            addModuleBreakdown(tempDesc || mod.desc);
                        } else {
                            rate = remaining / amount;
                            addModuleBreakdown(`${tempDesc || mod.desc}(部分)`, null, { partial: true });
                        }
                    }
                    capDisplayHandled = true;
                } else {
                    const capCheck = checkCap(mod.cap_key, mod.cap_limit);
                    if (capCheck.isMaxed) {
                        addModuleBreakdown(`${tempDesc || mod.desc} (爆Cap)`, "muted", { capped: true, strike: true });
                        hit = false;
                    } else if (amount > capCheck.remaining) {
                        rate = (capCheck.remaining * rate) / amount;
                        addModuleBreakdown(`${tempDesc || mod.desc}(部分)`, null, { partial: true });
                    } else {
                        addModuleBreakdown(tempDesc || mod.desc);
                    }
                    capDisplayHandled = true;
                }
            }

            if (hit && mod.type !== "guru_capped") {
                const skipCurrent = mod.type === "always" && replacerModuleCurrent;
                const skipPotential = mod.type === "always" && replacerModulePotential;

                const allowCurrent = applyCurrent && !skipCurrent;
                const allowPotential = applyPotential && !skipPotential;

                if (allowCurrent) totalRate += rate;
                if (allowPotential) totalRatePotential += rate;

                const descText = tempDesc || mod.desc;
                // Category modules with cap already render capped/partial state in their own branch.
                // Other module types (e.g. red_hot_*) may still carry cap metadata via overrides
                // and should remain visible in the equation breakdown.
                const capDisplayHandledInBranch = (mod.type === "category" && !!mod.cap_limit) || capDisplayHandled;
                if (!capDisplayHandledInBranch && (allowCurrent || allowPotential) && showLockedBreakdown) addBreakdown(descText);

                // [UPDATED] Capture Reward Tracking Info (current only)
                if (allowCurrent && mod.cap_mode === 'reward' && mod.cap_limit) {
                    if (!rewardInfo) rewardInfo = { key: mod.cap_key, val: 0 };
                    const actualReward = amount * rate;
                    rewardInfo.val += actualReward;
                    rewardInfo.key = mod.cap_key;
                    if (mod.secondary_cap_key) rewardInfo.secondaryKey = mod.secondary_cap_key;
                }

                // Pending unlocks for retroactive modules
                if (allowPotential && !allowCurrent && retroactive && mod.req_mission_key) {
                    const pendingNative = amount * rate;
                    if (pendingNative > 0) {
                            pendingUnlocks.push({
                                reqKey: mod.req_mission_key,
                                reqSpend: mod.req_mission_spend || 0,
                                pendingNative,
                                cashRate: (conversions.find(c => c.src === card.currency) || { cash_rate: 0 }).cash_rate,
                                capMode: mod.cap_mode || "reward",
                                capKey: mod.cap_key || null,
                                capLimit: mod.cap_limit || null,
                            secondaryCapKey: mod.secondary_cap_key || null,
                            secondaryCapLimit: mod.secondary_cap_limit || null
                        });
                    }
                }
            }
            if (mod.type === "guru_capped" && hit) {
                totalRate += rate;
                totalRatePotential += rate;
            }
        });

    // Extract reward tracking info if exists
    let rewardTrackingKey = null;
    let secondaryRewardTrackingKey = null;
    let generatedReward = 0;
    if (rewardInfo) {
        rewardTrackingKey = rewardInfo.key;
        secondaryRewardTrackingKey = rewardInfo.secondaryKey;
        generatedReward = rewardInfo.val;
    }

    // ... (Mission Tags Logic 保持不變) ...
    const campaignById = {};
    if (typeof DATA !== "undefined" && DATA && Array.isArray(DATA.offers)) {
        DATA.offers
            .filter((offer) => offer && offer.renderType === "campaign_sections" && offer.id)
            .forEach((offer) => { campaignById[offer.id] = offer; });
    }

    missionTags.forEach(tag => {
        if (tag && tag.hideInEquation) return;
        let label = tag.desc;
        const campaign = campaignById[tag.id] || null;
        const tagPromoType = getPromoType(campaign);
        let tone = tagPromoType === "tiered_cap" ? 'danger' : 'accent';
        let flags = {};
        const promoStatus = campaign ? buildPromoStatus(campaign, userProfile, modules) : null;
        const promoSections = (promoStatus && Array.isArray(promoStatus.sections)) ? promoStatus.sections : [];
        const rewardSections = promoSections.filter((sec) => sec && (sec.kind === "cap" || sec.kind === "cap_rate" || sec.kind === "tier_cap"));
        const missionSections = promoSections.filter((sec) => sec && sec.kind === "mission");
        const hasCappedReward = rewardSections.some((sec) => sec.state === "capped");
        const hasLockedReward = rewardSections.some((sec) => sec.state === "locked");
        const missionLocked = missionSections.some((sec) => sec.meta && sec.meta.unlocked === false);
        if (tag.eligible) {
            // [NEW] Redundancy Check: If breakdown already mentions this mission as "Not Met", skip the generic tracker line.
            // This prevents: "Basic... + Bonus (Not Met) + Tracker (Accumulating)"
            // [NEW] Redundancy Check: Fix emoji mismatch
            // Strip emojis from tag.desc (e.g. "🌏 EM推廣" -> "EM推廣")
            const cleanTagDesc = tag.desc.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();

            // Check if breakdown contains this cleaned name AND a Lock icon (indicating it's the warned version)
            const alreadyWarned = breakdown.some(b => {
                const text = typeof b === "string" ? b : (b && b.text) || "";
                const hasText = text.includes(cleanTagDesc);
                const locked = typeof b === "object" && b.flags && b.flags.locked;
                return hasText && (locked || text.includes("🔒"));
            });

            if (alreadyWarned) {
                return;
            }

            if (hasCappedReward) {
                label = `🚫 ${cleanTagDesc}(爆Cap)`;
                tone = "muted";
                flags = { capped: true, strike: true };
            } else if (hasLockedReward || missionLocked) {
                label = `🔒 ${cleanTagDesc}(累積中)`;
                tone = "muted";
                flags = { locked: true };
            }
            addBreakdown(label, tone, flags);
        } else {
            if (missionLocked && campaign) addBreakdown(`🎯 計入${tag.desc}門檻`, "muted");
        }
    });

    const native = amount * totalRate;
    const nativePotential = amount * totalRatePotential;

    // Calculate both values for sorting
    const estMiles = native * conv.miles_rate;
    const estCash = native * conv.cash_rate;
    const feeRate = (isForeignCategory(category) ? getForeignFeeRate(card, category) : 0);
    const foreignFee = feeRate ? amount * feeRate : 0;
    const estCashNet = estCash - foreignFee;
    const estMilesPotential = nativePotential * conv.miles_rate;
    const estCashPotential = nativePotential * conv.cash_rate;

    let valStr = "", unitStr = "";

    let valStrPotential = "", unitStrPotential = "";

    const supportsMiles = conv.miles_rate !== 0;
    const supportsCash = conv.cash_rate !== 0;
    const unsupportedMode = (displayMode === "miles") ? !supportsMiles : !supportsCash;

    if (displayMode === 'miles') {
        valStr = supportsMiles ? Math.floor(estMiles).toLocaleString() : "0";
        unitStr = "里";
        valStrPotential = supportsMiles ? Math.floor(estMilesPotential).toLocaleString() : "0";
        unitStrPotential = "里";
    } else {
        valStr = supportsCash ? Math.floor(estCash).toLocaleString() : "0";
        unitStr = "$";
        valStrPotential = supportsCash ? Math.floor(estCashPotential).toLocaleString() : "0";
        unitStrPotential = "$";
    }

    return {
        cardId: card.id, // [NEW] For tracking per-card spending
        cardName: card.name, amount, displayVal: valStr, displayUnit: unitStr,
        displayValPotential: valStrPotential, displayUnitPotential: unitStrPotential,
        estValue: estCash, // Legacy support if needed
        estMiles: estMiles, // For sorting
        estCash: estCash,   // For sorting
        estCashNet: estCashNet, // For sorting with fee deduction
        estMilesPotential: estMilesPotential,
        estCashPotential: estCashPotential,
        breakdown, trackingKey, guruRC, missionTags, category,
        rewardTrackingKey, secondaryRewardTrackingKey, generatedReward, // [UPDATED] Passed for commitTransaction
        redemptionConfig: card.redemption,
        supportsMiles,
        supportsCash,
        unsupportedMode,
        nativeVal: native,
        nativeValPotential: nativePotential,
        pendingUnlocks
    };
}

function calculateResults(amount, category, displayMode, userProfile, txDate, isHoliday, options = {}) {
    let results = [];
    const deductFcf = !!options.deductFcfForRanking;
    const isOnline = !!options.isOnline;
    const isMobilePay = !!options.isMobilePay;
    const paymentMethod = options.paymentMethod || (isMobilePay ? "mobile" : "physical");
    const cards = (DATA && DATA.cards) ? DATA.cards : [];

    userProfile.ownedCards.forEach(cardId => {
        const card = cards.find(c => c.id === cardId);
        if (!card) return;
        const res = buildCardResult(card, amount, category, displayMode, userProfile, txDate, isHoliday, isOnline, isMobilePay, paymentMethod);
        if (res) results.push(res);
    });

    // Return extended results
    return results.sort((a, b) => {
        if (displayMode === 'miles') {
            return b.estMiles - a.estMiles; // Sort by Miles descending
        } else {
            if (deductFcf) return b.estCashNet - a.estCashNet;
            return b.estCash - a.estCash;   // Sort by Cash descending
        }
    });
}
