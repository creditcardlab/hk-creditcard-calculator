// js/core.js - V9.10 (Logic Core)

let userProfile = {
    ownedCards: ["hsbc_red", "hsbc_everymile"],
    settings: {
        guru_level: 0,
        em_promo_enabled: false,
        winter_promo_enabled: false,
        red_hot_rewards_enabled: true,
        red_hot_allocation: { dining: 5, world: 0, home: 0, enjoyment: 0, style: 0 }
    },
    usage: { "winter_total": 0, "winter_eligible": 0, "em_q1_total": 0, "em_q1_eligible": 0, "guru_rc_used": 0, "guru_spend_accum": 0 },
    stats: { totalSpend: 0, totalVal: 0, txCount: 0 }
};

function loadUserData() {
    const s = localStorage.getItem('shawn_app_v9_2_data');
    if (s) {
        let loaded = JSON.parse(s);
        userProfile = { ...userProfile, ...loaded };
        if (!userProfile.settings.red_hot_allocation) userProfile.settings.red_hot_allocation = { dining: 5, world: 0, home: 0, enjoyment: 0, style: 0 };
        if (!userProfile.stats) userProfile.stats = { totalSpend: 0, totalVal: 0, txCount: 0 };
        if (!userProfile.usage) userProfile.usage = {};
    }
    saveUserData();
}

function saveUserData() {
    localStorage.setItem('shawn_app_v9_2_data', JSON.stringify(userProfile));
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

    if (inputCategory === 'overseas_jktt') {
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
    "overseas_jktt": ["overseas"],
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

function calculateResults(amount, inputCategory, displayMode) {
    let results = [];

    cardsDB.forEach(card => {
        if (!userProfile.ownedCards.includes(card.id)) return;
        const category = resolveCategory(card.id, inputCategory);

        let totalRate = 0;
        let breakdown = [];
        let trackingKey = null;
        let missionTags = [];
        let guruRC = 0;

        const replacerModule = card.modules.find(mid => {
            const m = modulesDB[mid];
            if (!m || m.type !== 'category' || !isCategoryMatch(m.match, category) || m.mode !== 'replace') return false;

            // [CRITICAL FIX] Check if mission spending threshold is met
            if (m.req_mission_spend && m.req_mission_key) {
                const currentSpend = userProfile.usage[m.req_mission_key] || 0;
                if (currentSpend < m.req_mission_spend) return false; // Threshold not met
            }

            // [CRITICAL FIX] Check if single transaction minimum is met
            if (m.min_single_spend && amount < m.min_single_spend) return false;

            // [CRITICAL FIX] Check if min_spend is met
            if (m.min_spend && amount < m.min_spend) return false;

            return true;
        });

        // ... (Module Logic 保持 V10.7 不變) ...
        card.modules.forEach(modID => {
            const mod = modulesDB[modID];
            if (!mod) return;
            let hit = false;
            let rate = 0;
            if (mod.setting_key && userProfile.settings[mod.setting_key] === false) return;

            // [NEW] Min Spend Check (Single Transaction)
            if (mod.min_spend && amount < mod.min_spend) return;

            // [NEW] Single Transaction Minimum (for BOC Amazing Rewards)
            if (mod.min_single_spend && amount < mod.min_single_spend) return;

            // [NEW] Mission Spend Check (Monthly Cumulative)
            if (mod.req_mission_spend && mod.req_mission_key) {
                const currentSpend = userProfile.usage[mod.req_mission_key] || 0;
                if (currentSpend < mod.req_mission_spend) return;
            }

            if (mod.type === "red_hot_allocation") {
                const rhCat = getRedHotCategory(category);
                if (rhCat) {
                    const multiplier = userProfile.settings.red_hot_allocation[rhCat] || 0;
                    if (multiplier > 0) { rate = multiplier * mod.rate_per_x; const pct = (rate * 100).toFixed(1); mod.tempDesc = `${mod.desc} (${multiplier}X = ${pct}%)`; hit = true; }
                }
            }
            else if (mod.type === "red_hot_fixed_bonus") { const rhCat = getRedHotCategory(category); if (rhCat) { rate = mod.multiplier * mod.rate_per_x; hit = true; } }
            else if (mod.type === "guru_capped") { const res = calculateGuru(mod, amount, parseInt(userProfile.settings.guru_level), category); if (res.desc) { breakdown.push(res.desc); guruRC = res.generatedRC; totalRate += res.rate; } }
            else if (mod.type === "mission_tracker") { if (userProfile.settings[mod.setting_key]) missionTags.push({ id: mod.mission_id, eligible: isCategoryMatch(mod.match, category), desc: mod.desc }); }
            else if (mod.type === "category" && isCategoryMatch(mod.match, category)) {
                if (mod.cap_limit) {
                    trackingKey = mod.cap_key;

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
                            breakdown.push(`<span class="text-gray-300 line-through text-[10px]">${mod.desc} (爆Cap)</span>`);
                        } else {
                            const projectedReward = amount * mod.rate;
                            if (projectedReward <= remaining) {
                                rate = mod.rate;
                                guruRC = projectedReward;
                                hit = true;
                                breakdown.push(mod.desc);
                            } else {
                                rate = remaining / amount;
                                breakdown.push(`${mod.desc}(部分)`);
                                hit = true;
                            }
                        }
                    } else {
                        // Standard Spending-based Cap
                        const capCheck = checkCap(mod.cap_key, mod.cap_limit);
                        if (capCheck.isMaxed) breakdown.push(`<span class="text-gray-300 line-through text-[10px]">${mod.desc}</span>`);
                        else if (amount > capCheck.remaining) { rate = (capCheck.remaining * mod.rate) / amount; breakdown.push(`${mod.desc}(部分)`); hit = true; }
                        else {
                            rate = mod.rate;
                            hit = true;
                            // [FIXED] Push description when within spending cap
                            breakdown.push(mod.desc);
                        }
                    }
                } else { rate = mod.rate; hit = true; }
            }
            else if (mod.type === "always") { if (replacerModule) return; rate = mod.rate; hit = true; }

            if (hit && mod.type !== "guru_capped") {
                totalRate += rate;
                const descText = mod.tempDesc || mod.desc;
                if (!mod.cap_limit) breakdown.push(descText);
                if (mod.tempDesc) delete mod.tempDesc;

                // [UPDATED] Capture Reward Tracking Info
                if (mod.cap_mode === 'reward' && mod.cap_limit) {
                    // We need to pass this to result. 
                    // Since a card might have multiple reward-capped modules (unlikely to overlap, but possible), 
                    // we should probably sum them or handle the primary one.
                    // For Hang Seng, it's usually one bonus module active per category.
                    // So we can store it in a variable.
                    // However, `results.push` is outside this loop.
                    // Let's attach it to a temporary object `rewardInfo`.
                    if (!card.rewardInfo) card.rewardInfo = { key: mod.cap_key, val: 0 };
                    const actualReward = amount * rate;
                    card.rewardInfo.val += actualReward;
                    card.rewardInfo.key = mod.cap_key;
                    if (mod.secondary_cap_key) card.rewardInfo.secondaryKey = mod.secondary_cap_key;
                }
            }
            if (mod.type === "guru_capped" && hit) totalRate += rate;
        });

        // Extract reward tracking info if exists
        let rewardTrackingKey = null;
        let secondaryRewardTrackingKey = null;
        let generatedReward = 0;
        if (card.rewardInfo) {
            rewardTrackingKey = card.rewardInfo.key;
            secondaryRewardTrackingKey = card.rewardInfo.secondaryKey;
            generatedReward = card.rewardInfo.val;
            delete card.rewardInfo; // Clean up
        }

        // ... (Mission Tags Logic 保持不變) ...
        missionTags.forEach(tag => {
            let label = tag.desc, cls = tag.id === 'winter_promo' ? 'text-red-500' : 'text-purple-600';
            const emTotal = userProfile.usage["em_q1_total"] || 0;
            const winterTotal = userProfile.usage["winter_total"] || 0;
            if (tag.eligible) {
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
        const estHKD = native * conv.cash_rate;

        // [UPDATED] Calculate both values for sorting
        const estMiles = native * conv.miles_rate;
        const estCash = native * conv.cash_rate;

        let valStr = "", unitStr = "";

        if (displayMode === 'miles') {
            if (conv.miles_rate === 0) { valStr = "---"; unitStr = "(不支援)"; }
            else { valStr = Math.floor(estMiles).toLocaleString(); unitStr = "里"; }
        } else {
            if (conv.cash_rate === 0) { valStr = "---"; unitStr = "(不支援)"; }
            else { valStr = Math.floor(estCash).toLocaleString(); unitStr = "HKD"; }
        }

        results.push({
            cardId: card.id, // [NEW] For tracking per-card spending
            cardName: card.name, amount, displayVal: valStr, displayUnit: unitStr,
            estValue: estCash, // Legacy support if needed
            estMiles: estMiles, // For sorting
            estCash: estCash,   // For sorting
            breakdown, trackingKey, guruRC, missionTags, category,
            rewardTrackingKey, secondaryRewardTrackingKey, generatedReward, // [UPDATED] Passed for commitTransaction
            redemptionConfig: card.redemption,
            nativeVal: native
        });
    });
    // End of Module Loop

    // Return extended results
    return results.sort((a, b) => {
        if (displayMode === 'miles') {
            return b.estMiles - a.estMiles; // Sort by Miles descending
        } else {
            return b.estCash - a.estCash;   // Sort by Cash descending
        }
    });
}

function commitTransaction(data) {
    const { amount, trackingKey, estValue, guruRC, missionTags, category, breakdown } = data; // Added breakdown to check logic if needed

    userProfile.stats.totalSpend += amount;
    userProfile.stats.totalVal += estValue;
    userProfile.stats.txCount += 1;

    // [NEW] Track Spending by Card ID (for Thresholds)
    if (data.cardId) {
        const key = `spend_${data.cardId}`;
        userProfile.usage[key] = (userProfile.usage[key] || 0) + amount;
    }

    // Spending-based Cap Update
    // If cap_mode was reward, trackingKey might still be passed if we want to track spending too, 
    // but usually we want to track the REWARD amount for reward caps.
    // In my logic above, I used the same `trackingKey` variable. 
    // Issue: If it's reward mode, we need to know HOW MUCH REWARD was generated to add to the cap.
    // The `data` object needs to contain the `generatedReward` if we are in reward mode.
    // Let's re-verify `calculateResults` modifications. 
    // Wait, I updated `calculateResults` to calculate rate, but didn't pass `generatedReward` explicitly out in `results`.
    // I need to patch `calculateResults` to store `generatedReward` for the winning modules or ALL modules? 
    // `calculateResults` iterates ALL cards. `commitTransaction` is called for ONE card (the user clicks).
    // The `data` passed to `commitTransaction` is one item from `results`.

    // Let's refine `calculateResults` to include `rewardUpdates` array or similar.
    // For now, I will modify `commitTransaction` to re-calculate? No, that's redundant.
    // I need to modify `calculateResults` again to properly capture the reward amount to be committed.

    // ... Actually, let's look at `commitTransaction` in the file.
    // It uses `trackingKey`. 
    // If I use `mod.cap_key` as `trackingKey`, `commitTransaction` currently does:
    // userProfile.usage[trackingKey] = (userProfile.usage[trackingKey] || 0) + amount; <--- ADDS AMOUNT (Spending)

    // THIS IS WRONG for Reward Caps.
    // validation: I need to change `commitTransaction` to accept `rewardUpdates`.

    // I will simplisticly assume if `rewardTrackingKey` is present, we add `generatedReward`.
    // So I need to add `rewardTrackingKey` and `generatedReward` to `results` in `calculateResults`.

    // Retrying the edit for `calculateResults` to include these fields in the `results` push, 
    // AND `commitTransaction` to handle them.

    if (data.rewardTrackingKey && data.generatedReward > 0) {
        userProfile.usage[data.rewardTrackingKey] = (userProfile.usage[data.rewardTrackingKey] || 0) + data.generatedReward;
    } else if (trackingKey) {
        // Standard Spending Cap
        userProfile.usage[trackingKey] = (userProfile.usage[trackingKey] || 0) + amount;
    }

    if (guruRC > 0) userProfile.usage["guru_rc_used"] = (userProfile.usage["guru_rc_used"] || 0) + guruRC;
    const level = parseInt(userProfile.settings.guru_level);
    if (level > 0 && category === 'overseas') userProfile.usage["guru_spend_accum"] = (userProfile.usage["guru_spend_accum"] || 0) + amount;

    missionTags.forEach(tag => {
        if (tag.id === "winter_promo") {
            userProfile.usage["winter_total"] = (userProfile.usage["winter_total"] || 0) + amount;
            if (tag.eligible) userProfile.usage["winter_eligible"] = (userProfile.usage["winter_eligible"] || 0) + amount;
        }
        if (tag.id === "em_promo") {
            userProfile.usage["em_q1_total"] = (userProfile.usage["em_q1_total"] || 0) + amount;
            if (tag.eligible) userProfile.usage["em_q1_eligible"] = (userProfile.usage["em_q1_eligible"] || 0) + amount;
        }
    });
    saveUserData();
    return "";
}

function upgradeGuruLevel() {
    let current = parseInt(userProfile.settings.guru_level);
    if (current < 3) userProfile.settings.guru_level = current + 1;
    userProfile.usage["guru_spend_accum"] = 0; userProfile.usage["guru_rc_used"] = 0;
    saveUserData();
    return `成功升級！`;
}

