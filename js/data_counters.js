// data_counters.js - Counter registry (period metadata + validation helper)

function buildCountersRegistry() {
    const registry = {};

    const addKey = (key, source, period) => {
        if (!key) return;
        if (!registry[key]) {
            registry[key] = { period: period || "none", source: source || "" };
        }
    };

    // From modulesDB
    if (typeof modulesDB !== "undefined") {
        Object.keys(modulesDB).forEach((k) => {
            const mod = modulesDB[k] || {};
            addKey(mod.cap_key, `module:${k}.cap_key`);
            addKey(mod.secondary_cap_key, `module:${k}.secondary_cap_key`);
            addKey(mod.usage_key, `module:${k}.usage_key`);
            addKey(mod.req_mission_key, `module:${k}.req_mission_key`);
        });
    }

    // From promotions
    if (typeof PROMOTIONS !== "undefined") {
        (PROMOTIONS || []).forEach((p) => {
            const promoId = p && p.id ? p.id : "promo";
            (p.capKeys || []).forEach((k) => addKey(k, `promo:${promoId}.capKeys`));
            (p.sections || []).forEach((s, i) => {
                const secId = `${promoId}.section${i + 1}`;
                if (s.usageKey) addKey(s.usageKey, `${secId}.usageKey`);
                if (Array.isArray(s.usageKeys)) s.usageKeys.forEach((k) => addKey(k, `${secId}.usageKeys`));
                if (s.unlockKey) addKey(s.unlockKey, `${secId}.unlockKey`);
                if (s.totalKey) addKey(s.totalKey, `${secId}.totalKey`);
                if (s.eligibleKey) addKey(s.eligibleKey, `${secId}.eligibleKey`);
            });
        });
    }

    // Manual period overrides (match current reset behavior)
    const monthlyKeys = [
        "red_online_cap",
        "red_designated_cap",
        "bea_goal_cap",
        "bea_goal_mission",
        "bea_world_cap",
        "bea_world_mission",
        "bea_ititanium_cap",
        "bea_ititanium_mission",
        "bea_unionpay_cap",
        "boc_sogo_mobile_cap",
        "wewa_mobile_pay_cap",
        "wewa_mobile_mission",
        "bea_goal_mobile_cap"
    ];
    monthlyKeys.forEach((k) => {
        if (!registry[k]) registry[k] = { period: "month", source: "manual:monthly" };
        else registry[k].period = "month";
    });

    // Misc usage keys not captured in data files
    addKey("guru_spend_accum", "manual:misc", "none");

    return registry;
}

const COUNTERS_REGISTRY = buildCountersRegistry();
