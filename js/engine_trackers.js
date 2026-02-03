// js/engine_trackers.js - Tracker evaluation

function evaluateTrackers(cardId, ctx, userProfile, data) {
    if (!data || !data.cards || !data.trackers) return { missionTags: [], effects: [] };
    const card = data.cards.find(c => c.id === cardId);
    if (!card || !Array.isArray(card.modules)) return { missionTags: [], effects: [] };

    const resolvedCategory = resolveCategory(cardId, ctx.category);
    const isOnline = !!ctx.isOnline;
    const isMobilePay = !!ctx.isMobilePay;
    const paymentMethod = ctx.paymentMethod;

    const missionTags = [];
    const effects = [];

    card.modules.forEach((modId) => {
        const tracker = data.trackers[modId];
        if (!tracker || tracker.type !== "mission_tracker") return;
        if (tracker.setting_key && userProfile.settings[tracker.setting_key] === false) return;

        // Keep behavior aligned with reward modules: respect validity windows (valid_from/to, days, holiday).
        if (typeof checkValidity === "function" && !checkValidity(tracker, ctx.txDate, !!ctx.isHoliday)) return;

        let match = true;
        if (tracker.match) {
            match = isCategoryOrOnlineMatch(tracker.match, resolvedCategory, isOnline);
        }
        let eligible = match;
        if (match && typeof tracker.eligible_check === "function") {
            eligible = !!tracker.eligible_check(resolvedCategory, { isOnline, isMobilePay, paymentMethod });
        }

        missionTags.push({ id: tracker.mission_id, eligible, desc: tracker.desc });

        if (eligible && tracker.req_mission_key) {
            effects.push({ key: tracker.req_mission_key, amount: ctx.amount });
        }
    });

    return { missionTags, effects };
}
