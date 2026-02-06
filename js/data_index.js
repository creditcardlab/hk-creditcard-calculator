// js/data_index.js - Data bootstrapper

(function bootstrapData() {
    const hasWindow = typeof window !== "undefined";
    const root = hasWindow ? window : global;

    if (typeof categoriesDB === "undefined") {
        console.error("[data] categoriesDB missing. Check script order.");
        return;
    }

    const redHotCategories = {
        dining: [],
        world: [],
        home: [],
        enjoyment: [],
        style: []
    };

    const categoryHierarchy = {};
    Object.keys(categoriesDB).forEach((key) => {
        const c = categoriesDB[key];
        if (c.red_hot && redHotCategories[c.red_hot]) redHotCategories[c.red_hot].push(key);
        if (c.parent) {
            if (!categoryHierarchy[key]) categoryHierarchy[key] = [];
            categoryHierarchy[key].push(c.parent);
        }
    });

    if (typeof DATA_RULES !== "undefined") {
        DATA_RULES.categoryHierarchy = categoryHierarchy;
    }

    const rawCards = (typeof cardsDB !== "undefined") ? cardsDB : [];
    const rawModules = (typeof modulesDB !== "undefined") ? modulesDB : {};
    const rawTrackers = (typeof trackersDB !== "undefined") ? trackersDB : {};

    const normalizeCards = (cards) => {
        if (!Array.isArray(cards)) return [];
        return cards.map((c) => ({
            ...(c || {}),
            rewardModules: Array.isArray(c && c.rewardModules) ? c.rewardModules : [],
            trackers: Array.isArray(c && c.trackers) ? c.trackers : []
        }));
    };

    const data = {
        cards: normalizeCards(rawCards),
        categories: categoriesDB,
        modules: rawModules,
        conversions: (typeof conversionDB !== "undefined") ? conversionDB : [],
        trackers: rawTrackers,
        campaigns: (typeof CAMPAIGNS !== "undefined") ? CAMPAIGNS : [],
        campaignRegistry: (typeof CAMPAIGN_REGISTRY !== "undefined") ? CAMPAIGN_REGISTRY : {},
        rules: (typeof DATA_RULES !== "undefined") ? DATA_RULES : {},
        redHotCategories,
        periodDefaults: {
            month: { type: "month", startDay: 1 },
            quarter: { type: "quarter", startMonth: 1, startDay: 1 },
            year: { type: "year", startMonth: 1, startDay: 1 }
        }
    };

    const applyCoreOverrides = (core) => {
        if (!core || typeof core !== "object") return;

        const applyFields = (target, src, allowed) => {
            if (!target || !src) return;
            (allowed || Object.keys(src)).forEach((key) => {
                const val = src[key];
                if (val === undefined || val === null) return;
                if (typeof val === "string" && val === "") return;
                if (Array.isArray(val) && val.length === 0) return; // avoid accidental clears
                target[key] = val;
            });
        };

        // Intentionally conservative for existing entities; allow full object insert for new dynamic entities.
        const allowedCardCoreFields = ["name", "currency", "type", "fcf"];
        const allowedModuleCoreFields = [
            "desc",
            "rate",
            "rate_per_x",
            "multiplier",
            "mode",
            "match",
            "retroactive",
            "promo_end",
            "valid_from",
            "valid_to",
            "cap_mode",
            "cap_limit",
            "cap_key",
            "secondary_cap_limit",
            "secondary_cap_key",
            "min_spend",
            "min_single_spend",
            "req_mission_spend",
            "req_mission_key"
        ];
        const allowedTrackerCoreFields = [
            "type",
            "desc",
            "match",
            "setting_key",
            "req_mission_key",
            "mission_id",
            "promo_end",
            "valid_from",
            "valid_to",
            "effects_on_match",
            "effects_on_eligible",
            "counter",
            "retroactive"
        ];
        const allowedCampaignCoreFields = ["period_policy"];

        if (core.modules && data.modules) {
            Object.keys(core.modules).forEach((id) => {
                const mod = data.modules[id];
                if (!mod) {
                    const next = core.modules[id];
                    if (next && typeof next === "object" && !Array.isArray(next)) {
                        data.modules[id] = { ...next };
                    }
                    return;
                }
                applyFields(mod, core.modules[id], allowedModuleCoreFields);
            });
        }

        if (core.cards && data.cards) {
            Object.keys(core.cards).forEach((id) => {
                const card = data.cards.find(c => c && c.id === id);
                if (!card) return;
                applyFields(card, core.cards[id], allowedCardCoreFields);
                const cardPatch = core.cards[id] || {};
                const rewardAdd = Array.isArray(cardPatch.reward_modules_add) ? cardPatch.reward_modules_add : [];
                const trackerAdd = Array.isArray(cardPatch.trackers_add) ? cardPatch.trackers_add : [];
                if (!Array.isArray(card.rewardModules)) card.rewardModules = [];
                if (!Array.isArray(card.trackers)) card.trackers = [];
                rewardAdd.forEach((moduleId) => {
                    if (moduleId && !card.rewardModules.includes(moduleId)) card.rewardModules.push(moduleId);
                });
                trackerAdd.forEach((trackerId) => {
                    if (trackerId && !card.trackers.includes(trackerId)) card.trackers.push(trackerId);
                });
            });
        }

        if (core.trackers && data.trackers) {
            Object.keys(core.trackers).forEach((id) => {
                const patch = core.trackers[id];
                if (!patch || typeof patch !== "object" || Array.isArray(patch)) return;
                if (!data.trackers[id]) {
                    data.trackers[id] = { ...patch };
                    return;
                }
                applyFields(data.trackers[id], patch, allowedTrackerCoreFields);
            });
        }

        if (core.campaigns && data.campaigns) {
            Object.keys(core.campaigns).forEach((id) => {
                const campaign = data.campaigns.find(c => c && c.id === id);
                if (!campaign) return;
                applyFields(campaign, core.campaigns[id], allowedCampaignCoreFields);
            });
        }
    };

    const applyOverrides = (overrides) => {
        if (!overrides || typeof overrides !== "object") return;

        const applyFields = (target, src, allowed) => {
            if (!target || !src) return;
            allowed.forEach((key) => {
                if (src[key] === undefined || src[key] === null || src[key] === "") return;
                target[key] = src[key];
            });
        };

        const cardFields = ["display_name_zhhk", "note_zhhk", "status", "last_verified_at", "source_url", "source_title"];
        const moduleFields = ["display_name_zhhk", "note_zhhk", "status", "last_verified_at", "source_url", "source_title", "unit_override"];
        const campaignFields = ["display_name_zhhk", "note_zhhk", "status", "last_verified_at", "source_url", "source_title"];
        const conversionFields = ["note_zhhk", "last_verified_at", "source_url", "source_title"];

        if (overrides.cards && data.cards) {
            Object.keys(overrides.cards).forEach((id) => {
                const card = data.cards.find(c => c && c.id === id);
                if (!card) return;
                applyFields(card, overrides.cards[id], cardFields);
            });
        }

        if (overrides.modules && data.modules) {
            Object.keys(overrides.modules).forEach((id) => {
                const mod = data.modules[id];
                if (!mod) return;
                applyFields(mod, overrides.modules[id], moduleFields);
            });
        }

        if (overrides.campaigns && data.campaigns) {
            overrides.campaigns && Object.keys(overrides.campaigns).forEach((id) => {
                const camp = data.campaigns.find(c => c && c.id === id);
                if (!camp) return;
                applyFields(camp, overrides.campaigns[id], campaignFields);
            });
        }

        if (overrides.campaignSections && data.campaigns) {
            Object.keys(overrides.campaignSections).forEach((key) => {
                const [campId, idxStr] = String(key).split("#");
                const idx = Number(idxStr);
                if (!campId || !Number.isFinite(idx) || idx < 1) return;
                const camp = data.campaigns.find(c => c && c.id === campId);
                if (!camp || !Array.isArray(camp.sections)) return;
                const sec = camp.sections[idx - 1];
                if (!sec) return;
                const override = overrides.campaignSections[key] || {};
                if (override.label_zhhk !== undefined && override.label_zhhk !== "") {
                    sec.label_zhhk = override.label_zhhk;
                    sec.label = override.label_zhhk;
                }
            });
        }

        if (overrides.conversions && Array.isArray(data.conversions)) {
            Object.keys(overrides.conversions).forEach((src) => {
                const conv = data.conversions.find(c => c && c.src === src);
                if (!conv) return;
                applyFields(conv, overrides.conversions[src], conversionFields);
            });
        }
    };

    if (typeof NOTION_CORE_OVERRIDES !== "undefined") {
        applyCoreOverrides(NOTION_CORE_OVERRIDES);
    }

    if (typeof NOTION_OVERRIDES !== "undefined") {
        applyOverrides(NOTION_OVERRIDES);
    }

    if (typeof compilePeriodPolicies === "function") {
        data.periodPolicy = compilePeriodPolicies(data);
    } else {
        data.periodPolicy = { byCampaignId: {}, warnings: [] };
    }

    // Build derived registries after core overrides are applied, so caps/keys are consistent.
    if (typeof buildCountersRegistry === "function") {
        data.countersRegistry = buildCountersRegistry(data);
    } else {
        data.countersRegistry = {};
    }

    data.debug = { validate: true };

    root.DATA = data;
})();
