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
    const periodPolicyMap = (data && data.periodPolicy && data.periodPolicy.byCampaignId) ? data.periodPolicy.byCampaignId : {};

    const normalizePeriodSpec = (spec) => {
        if (!spec) return { periodType: "none", anchorRef: null };
        if (typeof spec === "string") return { periodType: spec, anchorRef: null };
        if (typeof spec === "object") return { periodType: spec.type || "none", anchorRef: spec };
        return { periodType: "none", anchorRef: null };
    };
    const getModuleRefs = (section, singleKey, listKey) => {
        const refs = [];
        const single = section && section[singleKey];
        if (typeof single === "string" && single) refs.push(single);
        const list = section && section[listKey];
        if (Array.isArray(list)) {
            list.forEach((id) => {
                if (typeof id === "string" && id) refs.push(id);
            });
        }
        return Array.from(new Set(refs));
    };
    const getMissionKeysFromModuleRefs = (section, singleKey, listKey) => {
        const keys = [];
        getModuleRefs(section, singleKey, listKey).forEach((moduleId) => {
            const mod = modules[moduleId] || null;
            if (!mod || !mod.req_mission_key) return;
            keys.push(mod.req_mission_key);
        });
        return Array.from(new Set(keys));
    };

    // From modules
    if (modules) {
        Object.keys(modules).forEach((k) => {
            const mod = modules[k] || {};
            addKey(mod.cap_key, `module:${k}.cap_key`, "none", null, 0, "module", k);
            addKey(mod.secondary_cap_key, `module:${k}.secondary_cap_key`, "none", null, 0, "module", k);
            addKey(mod.usage_key, `module:${k}.usage_key`, "none", null, 0, "module", k);
            addKey(mod.req_mission_key, `module:${k}.req_mission_key`, "none", null, 0, "module", k);
            addKey(mod.progress_mission_key, `module:${k}.progress_mission_key`, "none", null, 0, "module", k);

            if (mod.cap && mod.cap.period) {
                const capKey = mod.cap.key || mod.cap_key;
                const periodSpec = normalizePeriodSpec(mod.cap.period);
                addKey(capKey, `module:${k}.cap`, periodSpec.periodType, periodSpec.anchorRef, 2, "module", k);
            }
            if (mod.counter && mod.counter.period) {
                const counterKey = mod.counter.key || mod.req_mission_key || mod.usage_key;
                const periodSpec = normalizePeriodSpec(mod.counter.period);
                addKey(counterKey, `module:${k}.counter`, periodSpec.periodType, periodSpec.anchorRef, 2, "module", k);
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
                const periodSpec = normalizePeriodSpec(t.counter.period);
                addKey(counterKey, `tracker:${k}.counter`, periodSpec.periodType, periodSpec.anchorRef, 2, "tracker", k);
            }
        });
    }

    // From campaigns (period_policy is the single source for campaign counter periods)
    (campaigns || []).forEach((c) => {
        const campaignId = c && c.id ? c.id : "campaign";
        const compiled = periodPolicyMap[campaignId] || null;
        const periodSpec = normalizePeriodSpec(compiled && compiled.counterPeriod ? compiled.counterPeriod : null);
        const anchor = periodSpec.anchorRef ? { ...periodSpec.anchorRef, promoId: campaignId } : null;
        const priority = periodSpec.periodType !== "none" ? 3 : 0;

        const campaignCapKeys = new Set(Array.isArray(c.capKeys) ? c.capKeys : []);
        (c.sections || []).forEach((s) => {
            if (!s || !s.capModule) return;
            const capMod = modules[s.capModule] || null;
            if (capMod && capMod.cap_key) campaignCapKeys.add(capMod.cap_key);
        });
        Array.from(campaignCapKeys).forEach((k) => addKey(k, `campaign:${campaignId}.capKeys`, periodSpec.periodType, anchor, priority, "campaign", campaignId));

        (c.sections || []).forEach((s, i) => {
            const secId = `${campaignId}.section${i + 1}`;
            if (s.usageKey) addKey(s.usageKey, `${secId}.usageKey`, periodSpec.periodType, anchor, priority, "campaign", campaignId);
            if (Array.isArray(s.usageKeys)) s.usageKeys.forEach((k) => addKey(k, `${secId}.usageKeys`, periodSpec.periodType, anchor, priority, "campaign", campaignId));
            if (s.unlockKey) addKey(s.unlockKey, `${secId}.unlockKey`, periodSpec.periodType, anchor, priority, "campaign", campaignId);
            if (s.totalKey) addKey(s.totalKey, `${secId}.totalKey`, periodSpec.periodType, anchor, priority, "campaign", campaignId);
            if (s.eligibleKey) addKey(s.eligibleKey, `${secId}.eligibleKey`, periodSpec.periodType, anchor, priority, "campaign", campaignId);
            if (s.capModule) {
                const capMod = modules[s.capModule] || null;
                if (capMod && capMod.cap_key) addKey(capMod.cap_key, `${secId}.capModule`, periodSpec.periodType, anchor, priority, "campaign", campaignId);
            }

            const missionKeys = getMissionKeysFromModuleRefs(s, "missionModule", "missionModules");
            missionKeys.forEach((k) => addKey(k, `${secId}.missionModule`, periodSpec.periodType, anchor, priority, "campaign", campaignId));
            const unlockKeys = getMissionKeysFromModuleRefs(s, "unlockModule", "unlockModules");
            unlockKeys.forEach((k) => addKey(k, `${secId}.unlockModule`, periodSpec.periodType, anchor, priority, "campaign", campaignId));
        });
    });

    // Misc usage keys not captured in data files
    addKey("guru_spend_accum", "manual:misc", "none", null, 0, null, null);

    return registry;
}
