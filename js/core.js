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

function calculateGuru(mod, amount, level, category) {
    if (level <= 0 || !isCategoryMatch([mod.category], category)) return { rate: 0, desc: "", generatedRC: 0 };
    const conf = mod.config[level];
    if (!conf) return { rate: 0, desc: "", generatedRC: 0 };
    const capStatus = checkCap(mod.usage_key, conf.cap_rc);
    if (capStatus.isMaxed) return { rate: 0, desc: `<span class="text-yellow-600 line-through text-[10px]">${conf.desc} (爆Cap)</span>`, generatedRC: 0 };
    const potentialRC = amount * conf.rate;
    if (potentialRC <= capStatus.remaining) return { rate: conf.rate, desc: `<span class="text-yellow-600 font-bold text-[10px]">${conf.desc}</span>`, generatedRC: potentialRC };
    else return { rate: capStatus.remaining / amount, desc: `<span class="text-yellow-600 font-bold text-[10px]">${conf.desc}(部分)</span>`, generatedRC: capStatus.remaining };
}

function getRedHotCategory(inputCategory) {
    if (typeof redHotCategories === 'undefined') return null;
    for (const [rhCat, validInputs] of Object.entries(redHotCategories)) {
        if (validInputs.includes(inputCategory)) return rhCat;
    }
    return null;
}

// Simplified resolveCategory
// Most logic now handled by CATEGORY_HIERARCHY in isCategoryMatch
function resolveCategory(cardId, inputCategory) {
    if (inputCategory === 'citysuper') {
        if (cardId.startsWith('hsbc')) return 'style';
        if (cardId === 'mox_credit') return 'grocery';
        return 'grocery';
    }

    // Live Fresh Preference Matching - MUST execute BEFORE overseas aliasing
    if (cardId === 'dbs_live_fresh') {
        const pref = userProfile.settings.live_fresh_pref;
        if (pref && pref !== 'none') {
            if (pref === 'online_foreign' && inputCategory.includes('overseas')) return 'live_fresh_selected';
            if (pref === 'travel' && (inputCategory === 'travel' || inputCategory === 'entertainment' || inputCategory === 'streaming' || inputCategory === 'cathay_hkexpress')) return 'live_fresh_selected';
            if (pref === 'fashion' && (inputCategory === 'apparel' || inputCategory === 'health_beauty' || inputCategory === 'online')) return 'live_fresh_selected';
            if (pref === 'charity' && (inputCategory === 'charity' || inputCategory === 'general')) return 'live_fresh_selected';
        }
    }

    // Specific card mappings (Pulse, Travel+)
    // Ideally this should be in data.js, but keeping here for now to avoid major data migration
    // But we remove the generic 'overseas' fallback because hierarchy handles it now

    if (inputCategory === 'overseas_cn') {
        if (cardId === 'hsbc_pulse') return 'china_consumption';
        if (cardId === 'hangseng_travel_plus') return 'travel_plus_tier1';
    }

    if (inputCategory === 'overseas_jkt' || inputCategory === 'overseas_tw') {
        if (cardId === 'hangseng_travel_plus') return 'travel_plus_tier1';
    }

    // For Travel+, we need to ensure Japanese/Korean/Thai/Taiwan spending matches Tier 1
    // The hierarchy handles "overseas_jktt" -> "overseas" for generic cards
    // But Travel+ needs "overseas_jktt" -> "travel_plus_tier1"
    // The above check handles it.

    return inputCategory;
}

const CATEGORY_HIERARCHY = {
    "overseas_cn": ["overseas"],
    "overseas_jkt": ["overseas"],
    "overseas_tw": ["overseas"],
    "overseas_other": ["overseas"],
    "travel_plus_tier1": ["overseas"],
    // Can expand for local spending too if needed
    // "dining": ["local_spending"],
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

function isForeignCategory(category) {
    return category && (category.startsWith('overseas') || category === 'foreign' || category === 'travel_plus_tier1');
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

function isReplacerEligible(mod, amount, resolvedCategory, userProfile, includeLocked) {
    if (!mod || mod.type !== 'category' || !isCategoryMatch(mod.match, resolvedCategory) || mod.mode !== 'replace') return false;
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

function buildCardResult(card, amount, category, displayMode, userProfile, txDate, isHoliday) {
    const resolvedCategory = resolveCategory(card.id, category);

    let totalRate = 0;
    let totalRatePotential = 0;
    let breakdown = [];
    let guruRC = 0;
    let missionTags = [];
    let trackingKey = null;
    let rewardInfo = null;
    let pendingUnlocks = [];

    // [Module Logic]
    if (!card.modules || !Array.isArray(card.modules)) return null;

    // Filter Valid Modules First
    const activeModules = card.modules.filter(modID => {
        const m = modulesDB[modID];
        if (!m) return false;
        return checkValidity(m, txDate, isHoliday);
    });

    // Check for Replacer Module first (Optimization)
    // This replacerModule is for category-specific 'replace' mode modules
    const replacerModuleCurrent = activeModules.find(mid => {
        const m = modulesDB[mid];
        return isReplacerEligible(m, amount, resolvedCategory, userProfile, false);
    });
    const replacerModulePotential = activeModules.find(mid => {
        const m = modulesDB[mid];
        return isReplacerEligible(m, amount, resolvedCategory, userProfile, true);
    });

    // ... (Module Logic 保持 V10.7 不變) ...
    activeModules.forEach(modID => {
        const mod = modulesDB[modID];
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
                if (res.desc) {
                    breakdown.push(res.desc);
                    guruRC = res.generatedRC;
                    totalRate += res.rate;
                    totalRatePotential += res.rate;
                }
            }
            else if (mod.type === "mission_tracker") { if (userProfile.settings[mod.setting_key]) missionTags.push({ id: mod.mission_id, eligible: isCategoryMatch(mod.match, category), desc: mod.desc }); }
            else if (mod.type === "category" && isCategoryMatch(mod.match, category)) {
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
                            breakdown.push(`<span class="text-gray-300 line-through text-[10px]">${tempDesc || mod.desc} (爆Cap)</span>`);
                        } else {
                            const projectedReward = amount * mod.rate;
                            if (projectedReward <= remaining) {
                                rate = mod.rate;
                                hit = true;
                                breakdown.push(tempDesc || mod.desc);
                            } else {
                                rate = remaining / amount;
                                breakdown.push(`${tempDesc || mod.desc}(部分)`);
                                hit = true;
                            }
                        }
                } else {
                    // Standard Spending-based Cap
                    const capCheck = checkCap(mod.cap_key, mod.cap_limit);
                    if (capCheck.isMaxed) breakdown.push(`<span class="text-gray-300 line-through text-[10px]">${tempDesc || mod.desc}</span>`);
                    else if (amount > capCheck.remaining) { rate = (capCheck.remaining * mod.rate) / amount; breakdown.push(`${tempDesc || mod.desc}(部分)`); hit = true; }
                    else {
                        rate = mod.rate;
                        hit = true;
                        // [FIXED] Push description when within spending cap
                        breakdown.push(tempDesc || mod.desc);
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
                if (!mod.cap_limit && (allowCurrent || allowPotential)) breakdown.push(descText);

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
                            cashRate: (conversionDB.find(c => c.src === card.currency) || { cash_rate: 0 }).cash_rate,
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
        let label = tag.desc, cls = tag.id === 'winter_promo' ? 'text-red-500' : 'text-purple-600';
        const emTotal = userProfile.usage["em_q1_total"] || 0;
        const winterTotal = userProfile.usage["winter_total"] || 0;
        if (tag.eligible) {
            // [NEW] Redundancy Check: If breakdown already mentions this mission as "Not Met", skip the generic tracker line.
            // This prevents: "Basic... + Bonus (Not Met) + Tracker (Accumulating)"
            // [NEW] Redundancy Check: Fix emoji mismatch
            // Strip emojis from tag.desc (e.g. "🌏 EM推廣" -> "EM推廣")
            const cleanTagDesc = tag.desc.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();

            // Check if breakdown contains this cleaned name AND a Lock icon (indicating it's the warned version)
            const alreadyWarned = breakdown.some(b => b.includes(cleanTagDesc) && b.includes("🔒"));

            if (alreadyWarned) {
                return;
            }

            let isCapped = false;
            if (tag.id === 'em_promo') { if ((userProfile.usage["em_q1_eligible"] || 0) * 0.015 >= 225) isCapped = true; if (isCapped) { label = "🚫 EM推廣(爆Cap)"; cls = "text-gray-400"; } else if (emTotal < 12000) { label = "🔒 EM推廣(累積中)"; cls = "text-gray-400"; } }
            if (tag.id === 'winter_promo') { const e = userProfile.usage["winter_eligible"] || 0; let max = 0, r = 0; if (winterTotal >= 40000) { max = 800; r = 0.06 } else if (winterTotal >= 20000) { max = 250; r = 0.03 } if (max > 0 && (e * r) >= max) isCapped = true; if (isCapped) { label = "🚫 冬日賞(爆Cap)"; cls = "text-gray-400"; } else if (winterTotal < 20000) { label = "🔒 冬日賞(累積中)"; cls = "text-gray-400"; } }
            breakdown.push(`<span class="${cls} font-bold text-[10px]">${label}</span>`);
        } else {
            let show = false;
            if (tag.id === 'em_promo' && emTotal < 12000) show = true;
            if (tag.id === 'winter_promo' && winterTotal < 40000) show = true;
            if (show) breakdown.push(`<span class="text-gray-400 text-[10px]">🎯 計入${tag.desc}門檻</span>`);
        }
    });

    const conv = conversionDB.find(c => c.src === card.currency);
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
        nativeVal: native,
        nativeValPotential: nativePotential,
        pendingUnlocks
    };
}

function calculateResults(amount, category, displayMode, userProfile, txDate, isHoliday, options = {}) {
    let results = [];
    const deductFcf = !!options.deductFcfForRanking;

    userProfile.ownedCards.forEach(cardId => {
        const card = cardsDB.find(c => c.id === cardId);
        if (!card) return;
        const res = buildCardResult(card, amount, category, displayMode, userProfile, txDate, isHoliday);
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


