// js/engine_trackers.js - Tracker evaluation

function evaluateTrackers(cardId, ctx, userProfile, data) {
    if (!data || !data.cards || !data.trackers) return { missionTags: [], effects: [] };
    const card = data.cards.find(c => c.id === cardId);
    if (!card || !Array.isArray(card.trackers)) return { missionTags: [], effects: [] };

    const resolvedCategory = resolveCategory(cardId, ctx.category);
    const isOnline = !!ctx.isOnline;
    const isMobilePay = !!ctx.isMobilePay;
    const paymentMethod = ctx.paymentMethod;

    const missionTags = [];
    const effects = [];

    const pushEffectList = (list, trackerCtx) => {
        if (!Array.isArray(list)) return;
        list.forEach((e) => {
            if (!e || !e.key) return;
            let amt = 0;
            if (typeof e.amount === "function") {
                amt = Number(e.amount(resolvedCategory, trackerCtx || {})) || 0;
            } else if (e.amount === "tx_amount" || e.amount === undefined || e.amount === null) {
                amt = ctx.amount;
            } else {
                amt = Number(e.amount) || 0;
            }
            if (!amt) return;
            effects.push({ key: e.key, amount: amt });
        });
    };

    card.trackers.forEach((trackerId) => {
        const tracker = data.trackers[trackerId];
        if (!tracker || tracker.type !== "mission_tracker") return;
        if (tracker.setting_key && userProfile.settings[tracker.setting_key] === false) return;

        // Keep behavior aligned with reward modules: respect validity windows (valid_from/to, days, holiday).
        if (typeof checkValidity === "function" && !checkValidity(tracker, ctx.txDate, !!ctx.isHoliday)) return;

        let match = true;
        if (tracker.match) {
            match = isCategoryOrOnlineMatch(tracker.match, resolvedCategory, isOnline);
        }
        const trackerCtx = {
            category: resolvedCategory,
            amount: Number(ctx.amount) || 0,
            isOnline,
            isMobilePay,
            paymentMethod,
            txDate: ctx.txDate || "",
            // Usage accessor includes effects already accumulated in this evaluation pass.
            getUsage: (key) => {
                const base = Number((userProfile && userProfile.usage && userProfile.usage[key]) || 0);
                const delta = effects
                    .filter((ef) => ef && ef.key === key)
                    .reduce((sum, ef) => sum + (Number(ef.amount) || 0), 0);
                return base + delta;
            }
        };

        let eligible = match;
        if (match && typeof tracker.eligible_check === "function") {
            eligible = !!tracker.eligible_check(resolvedCategory, trackerCtx);
        }

        missionTags.push({
            id: tracker.mission_id,
            eligible,
            desc: tracker.desc,
            hideInEquation: tracker.hide_in_equation === true
        });

        if (match) pushEffectList(tracker.effects_on_match, trackerCtx);
        if (eligible) {
            pushEffectList(tracker.effects_on_eligible, trackerCtx);
            // Legacy behavior: req_mission_key increments on eligible.
            if (tracker.req_mission_key) {
                effects.push({ key: tracker.req_mission_key, amount: ctx.amount });
            }
        }
    });

    return { missionTags, effects };
}
