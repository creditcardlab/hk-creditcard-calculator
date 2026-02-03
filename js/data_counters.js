// data_counters.js - Counter registry (period metadata + validation helper)

function buildCountersRegistry(data) {
    const registry = {};

    const addKey = (key, source, periodType, anchorRef, priority, refType, refId) => {
        if (!key) return;
        const next = {
            periodType: periodType || "none",
            anchorRef: anchorRef || null,
            source: source || "",
            refType: refType || null,
            refId: refId || null
        };
        if (!registry[key] || (priority || 0) > (registry[key].priority || 0)) {
            registry[key] = { ...next, priority: priority || 0 };
        }
    };

    const modules = data && data.modules ? data.modules : {};
    const trackers = data && data.trackers ? data.trackers : {};
    const campaigns = data && data.campaigns ? data.campaigns : [];
    const promotions = data && data.promotions ? data.promotions : [];

    // From modules
    if (modules) {
        Object.keys(modules).forEach((k) => {
            const mod = modules[k] || {};
            addKey(mod.cap_key, `module:${k}.cap_key`, "none", null, 0, "module", k);
            addKey(mod.secondary_cap_key, `module:${k}.secondary_cap_key`, "none", null, 0, "module", k);
            addKey(mod.usage_key, `module:${k}.usage_key`, "none", null, 0, "module", k);
            addKey(mod.req_mission_key, `module:${k}.req_mission_key`, "none", null, 0, "module", k);

            if (mod.cap && mod.cap.period) {
                const capKey = mod.cap.key || mod.cap_key;
                addKey(capKey, `module:${k}.cap`, mod.cap.period, mod.cap.anchor || null, 2, "module", k);
            }
            if (mod.counter && mod.counter.period) {
                const counterKey = mod.counter.key || mod.req_mission_key || mod.usage_key;
                addKey(counterKey, `module:${k}.counter`, mod.counter.period, mod.counter.anchor || null, 2, "module", k);
            }
        });
    }

    // From trackers
    if (trackers) {
        Object.keys(trackers).forEach((k) => {
            const t = trackers[k] || {};
            addKey(t.req_mission_key, `tracker:${k}.req_mission_key`, "none", null, 0, "tracker", k);
            if (t.counter && t.counter.period) {
                const counterKey = t.counter.key || t.req_mission_key;
                addKey(counterKey, `tracker:${k}.counter`, t.counter.period, t.counter.anchor || null, 2, "tracker", k);
            }
        });
    }

    const campaignSource = campaigns && campaigns.length > 0 ? campaigns : promotions;

    // From promotions
    if (campaignSource) {
        (campaignSource || []).forEach((p) => {
            const promoId = p && p.id ? p.id : "promo";
            const promoPeriod = p.period || null;
            const promoAnchor = promoPeriod ? { ...promoPeriod, promoId } : null;
            const promoPriority = promoPeriod ? 1 : 0;
            (p.capKeys || []).forEach((k) => addKey(k, `promo:${promoId}.capKeys`, promoPeriod ? promoPeriod.type : "none", promoAnchor, promoPriority, "promo", promoId));
            (p.sections || []).forEach((s, i) => {
                const secId = `${promoId}.section${i + 1}`;
                if (s.usageKey) addKey(s.usageKey, `${secId}.usageKey`, promoPeriod ? promoPeriod.type : "none", promoAnchor, promoPriority, "promo", promoId);
                if (Array.isArray(s.usageKeys)) s.usageKeys.forEach((k) => addKey(k, `${secId}.usageKeys`, promoPeriod ? promoPeriod.type : "none", promoAnchor, promoPriority, "promo", promoId));
                if (s.unlockKey) addKey(s.unlockKey, `${secId}.unlockKey`, promoPeriod ? promoPeriod.type : "none", promoAnchor, promoPriority, "promo", promoId);
                if (s.totalKey) addKey(s.totalKey, `${secId}.totalKey`, promoPeriod ? promoPeriod.type : "none", promoAnchor, promoPriority, "promo", promoId);
                if (s.eligibleKey) addKey(s.eligibleKey, `${secId}.eligibleKey`, promoPeriod ? promoPeriod.type : "none", promoAnchor, promoPriority, "promo", promoId);
            });
        });
    }

    // Misc usage keys not captured in data files
    addKey("guru_spend_accum", "manual:misc", "none", null, 0, null, null);

    return registry;
}
