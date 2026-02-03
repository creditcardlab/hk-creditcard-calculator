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
    }
    saveUserData();
}

function saveUserData() {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userProfile));
}

function checkCap(key, limit) { const u = userProfile.usage[key] || 0; return { used: u, remaining: Math.max(0, limit - u), isMaxed: u >= limit }; }

function buildPromoStatus(promo, userProfile, modulesDB) {
    if (!promo || !userProfile) return null;
    const eligible = Array.isArray(promo.cards) && promo.cards.some(id => (userProfile.ownedCards || []).includes(id));
    if (!eligible) return { eligible: false };

    const sections = [];
    const renderedCaps = new Set();
    let missionUnlockTarget = null;
    let missionUnlockValue = null;

    const isWinterPromo = promo.id === "winter_promo";
    const winterTier1 = Math.max(0, Number(userProfile.settings && userProfile.settings.winter_tier1_threshold) || 0);
    const winterTier2Raw = Math.max(0, Number(userProfile.settings && userProfile.settings.winter_tier2_threshold) || 0);
    const winterTier2 = Math.max(winterTier1, winterTier2Raw);

    const getModule = (key) => (key && modulesDB && modulesDB[key]) ? modulesDB[key] : null;
    const getCapFromModule = (key) => {
        const m = getModule(key);
        return m && m.cap_limit ? { cap: m.cap_limit, capKey: m.cap_key || null } : null;
    };

    (promo.sections || []).forEach(sec => {
        if (sec.type === "mission") {
            let spend = 0;
            if (sec.usageKeys) spend = sec.usageKeys.reduce((s, k) => s + (Number(userProfile.usage[k]) || 0), 0);
            else spend = Number(userProfile.usage[sec.usageKey]) || 0;
            const target = isWinterPromo ? winterTier2 : sec.target;
            missionUnlockTarget = target;
            missionUnlockValue = spend;
            const pct = target > 0 ? Math.min(100, (spend / target) * 100) : 0;
            const unlocked = spend >= target;
            let markers = null;
            const markersSrc = isWinterPromo ? [winterTier1, winterTier2] : sec.markers;
            if (markersSrc) {
                const list = Array.isArray(markersSrc) ? markersSrc.slice() : [];
                if (list.length > 0 && list[0] !== 0) list.unshift(0);
                markers = list;
            }

            sections.push({
                kind: "mission",
                label: sec.label || "Mission Progress",
                valueText: `$${spend.toLocaleString()} / $${target.toLocaleString()}`,
                progress: isWinterPromo ? 100 : pct,
                state: unlocked ? "unlocked" : "locked",
                markers,
                overlayModel: isWinterPromo ? { type: "winter_mission", tier1: winterTier1, tier2: winterTier2, spend } : null,
                lockedReason: unlocked ? null : `Remaining $${Math.max(0, target - spend).toLocaleString()}`,
                meta: { spend, target, unlocked, isWinterPromo }
            });
        }

        if (sec.type === "cap_rate") {
            const used = Number(userProfile.usage[sec.usageKey]) || 0;
            let capVal = sec.cap;
            if (sec.capModule) {
                const capInfo = getCapFromModule(sec.capModule);
                if (capInfo && capInfo.cap) capVal = capInfo.cap;
            }
            const reward = Math.min(capVal, used * sec.rate);
            const pct = Math.min(100, (reward / capVal) * 100);
            const unlocked = missionUnlockValue !== null ? missionUnlockValue >= sec.unlockTarget : true;
            const unit = sec.unit || "";
            const state = unlocked ? (reward >= capVal ? "capped" : "active") : "locked";
            const lockedReason = !unlocked ? `Locked ${Math.floor(reward).toLocaleString()} ${unit}`.trim() : null;

            sections.push({
                kind: "cap_rate",
                label: sec.label || "Reward Progress",
                valueText: `${Math.floor(reward).toLocaleString()} / ${capVal} ${unit}`.trim(),
                progress: pct,
                state,
                lockedReason,
                meta: {
                    reward,
                    cap: capVal,
                    unit,
                    remaining: Math.max(0, capVal - reward),
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
                    lockedReason = `Tier 2 Locked ${Math.floor(rewardTier2).toLocaleString()} / ${tiers[1].cap}`;
                } else {
                    lockedReason = "Tier 1 Locked";
                }
            }

            sections.push({
                kind: "tier_cap",
                label: sec.label || "Reward Progress",
                valueText: `${Math.floor(reward)} / ${cap}`,
                progress: isWinterPromo ? 100 : pct,
                state,
                markers,
                overlayModel,
                lockedReason,
                meta: {
                    reward,
                    cap,
                    remaining: Math.max(0, cap - reward),
                    unlocked,
                    isWinterPromo
                }
            });
        }

        if (sec.type === "cap") {
            let capKey = sec.capKey;
            let capVal = sec.cap;
            if (sec.capModule) {
                const capInfo = getCapFromModule(sec.capModule);
                if (capInfo) {
                    capVal = capInfo.cap;
                    capKey = capInfo.capKey || capKey;
                }
            }
            const used = Number(userProfile.usage[capKey]) || 0;
            const pct = Math.min(100, (used / capVal) * 100);
            const unlocked = missionUnlockTarget ? (missionUnlockValue >= missionUnlockTarget) : true;
            const unit = sec.unit || '';
            const prefix = unit ? '' : '$';
            const state = used >= capVal ? "capped" : (unlocked ? "active" : "locked");

            sections.push({
                kind: "cap",
                label: sec.label || "Reward Progress",
                valueText: `${prefix}${Math.floor(used).toLocaleString()}${unit} / ${prefix}${capVal.toLocaleString()}${unit}`,
                progress: pct,
                state,
                lockedReason: unlocked ? null : "Locked",
                meta: {
                    used,
                    cap: capVal,
                    unit,
                    prefix,
                    remaining: Math.max(0, capVal - used),
                    unlocked
                }
            });
            if (capKey) renderedCaps.add(capKey);
        }
    });

    if (promo.capKeys) promo.capKeys.forEach(k => renderedCaps.add(k));

    return {
        eligible: true,
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

function isMissionMet(mod, userProfile) {
    if (!mod.req_mission_spend || !mod.req_mission_key) return true;
    const currentSpend = userProfile.usage[mod.req_mission_key] || 0;
    return currentSpend >= mod.req_mission_spend;
}

function isRetroactive(mod) {
    if (mod.retroactive === false) return false;
    return !!(mod.req_mission_spend && mod.req_mission_key);
}

function isReplacerEligible(mod, amount, resolvedCategory, userProfile, includeLocked, ctx) {
    if (!mod || mod.type !== 'category' || mod.mode !== 'replace') return false;
    const matchOk = mod.match ? isCategoryOrOnlineMatch(mod.match, resolvedCategory, ctx && ctx.isOnline) : true;
    if (!matchOk) return false;
    if (typeof mod.eligible_check === 'function' && !mod.eligible_check(resolvedCategory, ctx || {})) return false;
    if (mod.min_single_spend && amount < mod.min_single_spend) return false;
    if (mod.min_spend && amount < mod.min_spend) return false;

    if (mod.req_mission_spend && mod.req_mission_key) {
        const met = isMissionMet(mod, userProfile);
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
        if (displayMode === 'miles') {
            if (conv.miles_rate === 0) { valStr = "---"; unitStr = "(不支援)"; }
            else { valStr = "0"; unitStr = "里"; }
            if (conv.miles_rate === 0) { valStrPotential = "---"; unitStrPotential = "(不支援)"; }
            else { valStrPotential = "0"; unitStrPotential = "里"; }
        } else {
            if (conv.cash_rate === 0) { valStr = "---"; unitStr = "(不支援)"; }
            else { valStr = "0"; unitStr = "HKD"; }
            if (conv.cash_rate === 0) { valStrPotential = "---"; unitStrPotential = "(不支援)"; }
            else { valStrPotential = "0"; unitStrPotential = "HKD"; }
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
            nativeVal: 0,
            nativeValPotential: 0,
            pendingUnlocks: []
        };
    }

    // Trackers (mission tags)
    if (typeof evaluateTrackers === "function") {
        const trackerRes = evaluateTrackers(card.id, { category, amount, isOnline, isMobilePay, paymentMethod, txDate, isHoliday }, userProfile, DATA);
        if (trackerRes && Array.isArray(trackerRes.missionTags)) missionTags = trackerRes.missionTags;
    }

    // [Module Logic]
    if (!card.modules || !Array.isArray(card.modules)) return null;

    // Filter Valid Modules First
    const activeModules = card.modules.filter(modID => {
        const m = modules[modID];
        if (!m) return false;
        return checkValidity(m, txDate, isHoliday);
    });

    // Check for Replacer Module first (Optimization)
    // This replacerModule is for category-specific 'replace' mode modules
    const ctx = { isOnline: !!isOnline, isMobilePay: !!isMobilePay, paymentMethod: paymentMethod };
    let replacerModuleCurrentId = activeModules.find(mid => {
        const m = modules[mid];
        return isReplacerEligible(m, amount, resolvedCategory, userProfile, false, ctx);
    });
    let replacerModulePotentialId = activeModules.find(mid => {
        const m = modules[mid];
        return isReplacerEligible(m, amount, resolvedCategory, userProfile, true, ctx);
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

    // ... (Module Logic 保持 V10.7 不變) ...
    activeModules.forEach(modID => {
        const mod = modules[modID];
        // [FIX] Clone mod to avoid mutating global DB if we change desc
        // Actually mod is ref. Safer to use tempDesc.
        if (!mod) return;
        let tempDesc = null;
        let hit = false;
        let rate = 0;
        if (mod.setting_key && userProfile.settings[mod.setting_key] === false) return;

        // [NEW] Min Spend Check (Single Transaction)
        if (mod.min_spend && amount < mod.min_spend) return;

        // [NEW] Single Transaction Minimum (for BOC Amazing Rewards)
        if (mod.min_single_spend && amount < mod.min_single_spend) return;

        // [NEW] Mission Spend Check (Monthly Cumulative)
        const missionRequired = !!(mod.req_mission_spend && mod.req_mission_key);
        const missionMet = missionRequired ? isMissionMet(mod, userProfile) : true;
        const retroactive = missionRequired ? isRetroactive(mod) : false;
        const applyCurrent = missionMet;
        const applyPotential = missionMet || retroactive;

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
                    if (applyCurrent) trackingKey = mod.cap_key;

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
                            addBreakdown(`${tempDesc || mod.desc} (爆Cap)`, "muted", { capped: true, strike: true });
                        } else {
                            const projectedReward = amount * mod.rate;
                            if (projectedReward <= remaining) {
                                rate = mod.rate;
                                hit = true;
                                addBreakdown(tempDesc || mod.desc);
                            } else {
                                rate = remaining / amount;
                                addBreakdown(`${tempDesc || mod.desc}(部分)`, null, { partial: true });
                                hit = true;
                            }
                        }
                } else {
                    // Standard Spending-based Cap
                    const capCheck = checkCap(mod.cap_key, mod.cap_limit);
                    if (capCheck.isMaxed) addBreakdown(tempDesc || mod.desc, "muted", { capped: true, strike: true });
                    else if (amount > capCheck.remaining) { rate = (capCheck.remaining * mod.rate) / amount; addBreakdown(`${tempDesc || mod.desc}(部分)`, null, { partial: true }); hit = true; }
                    else {
                        rate = mod.rate;
                        hit = true;
                        // [FIXED] Push description when within spending cap
                        addBreakdown(tempDesc || mod.desc);
                    }
                }
            } else { rate = mod.rate; hit = true; }
        }
            else if (mod.type === "always") { rate = mod.rate; hit = true; }

            if (hit && mod.type !== "guru_capped") {
                const skipCurrent = mod.type === "always" && replacerModuleCurrent;
                const skipPotential = mod.type === "always" && replacerModulePotential;

                const allowCurrent = applyCurrent && !skipCurrent;
                const allowPotential = applyPotential && !skipPotential;

                if (allowCurrent) totalRate += rate;
                if (allowPotential) totalRatePotential += rate;

                const descText = tempDesc || mod.desc;
                if (!mod.cap_limit && (allowCurrent || allowPotential)) addBreakdown(descText);

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
    missionTags.forEach(tag => {
        let label = tag.desc;
        let tone = tag.id === 'winter_promo' ? 'danger' : 'accent';
        let flags = {};
        const emTotal = userProfile.usage["em_q1_total"] || 0;
        const winterTotal = userProfile.usage["winter_total"] || 0;
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

            let isCapped = false;
            if (tag.id === 'em_promo') {
                if ((userProfile.usage["em_q1_eligible"] || 0) * 0.015 >= 225) isCapped = true;
                if (isCapped) {
                    label = "🚫 EM推廣(爆Cap)";
                    tone = "muted";
                    flags = { capped: true, strike: true };
                } else if (emTotal < 12000) {
                    label = "🔒 EM推廣(累積中)";
                    tone = "muted";
                    flags = { locked: true };
                }
            }
            if (tag.id === 'winter_promo') {
                const e = userProfile.usage["winter_eligible"] || 0;
                let max = 0, r = 0;
                if (winterTotal >= 40000) { max = 800; r = 0.06 }
                else if (winterTotal >= 20000) { max = 250; r = 0.03 }
                if (max > 0 && (e * r) >= max) isCapped = true;
                if (isCapped) {
                    label = "🚫 冬日賞(爆Cap)";
                    tone = "muted";
                    flags = { capped: true, strike: true };
                } else if (winterTotal < 20000) {
                    label = "🔒 冬日賞(累積中)";
                    tone = "muted";
                    flags = { locked: true };
                }
            }
            addBreakdown(label, tone, flags);
        } else {
            let show = false;
            if (tag.id === 'em_promo' && emTotal < 12000) show = true;
            if (tag.id === 'winter_promo' && winterTotal < 40000) show = true;
            if (show) addBreakdown(`🎯 計入${tag.desc}門檻`, "muted");
        }
    });

    const native = amount * totalRate;
    const nativePotential = amount * totalRatePotential;

    // Calculate both values for sorting
    const estMiles = native * conv.miles_rate;
    const estCash = native * conv.cash_rate;
    const foreignFee = (card.fcf && isForeignCategory(category)) ? amount * card.fcf : 0;
    const estCashNet = estCash - foreignFee;
    const estMilesPotential = nativePotential * conv.miles_rate;
    const estCashPotential = nativePotential * conv.cash_rate;

    let valStr = "", unitStr = "";

    let valStrPotential = "", unitStrPotential = "";

    const supportsMiles = conv.miles_rate !== 0;
    const supportsCash = conv.cash_rate !== 0;

    if (displayMode === 'miles') {
        if (conv.miles_rate === 0) { valStr = "---"; unitStr = "(不支援)"; }
        else { valStr = Math.floor(estMiles).toLocaleString(); unitStr = "里"; }
        if (conv.miles_rate === 0) { valStrPotential = "---"; unitStrPotential = "(不支援)"; }
        else { valStrPotential = Math.floor(estMilesPotential).toLocaleString(); unitStrPotential = "里"; }
    } else {
        if (conv.cash_rate === 0) { valStr = "---"; unitStr = "(不支援)"; }
        else { valStr = Math.floor(estCash).toLocaleString(); unitStr = "HKD"; }
        if (conv.cash_rate === 0) { valStrPotential = "---"; unitStrPotential = "(不支援)"; }
        else { valStrPotential = Math.floor(estCashPotential).toLocaleString(); unitStrPotential = "HKD"; }
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
