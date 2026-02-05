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
            quarter: { type: "quarter", startMonth: 1, startDay: 1 }
        }
    };

    const applyCoreOverrides = (core) => {
        if (!core || typeof core !== "object") return;

        const applyFields = (target, src) => {
            if (!target || !src) return;
            Object.keys(src).forEach((key) => {
                const val = src[key];
                if (val === undefined || val === null) return;
                if (typeof val === "string" && val === "") return;
                if (Array.isArray(val) && val.length === 0) return; // avoid accidental clears
                target[key] = val;
            });
        };

        if (core.modules && data.modules) {
            Object.keys(core.modules).forEach((id) => {
                const mod = data.modules[id];
                if (!mod) return;
                applyFields(mod, core.modules[id]);
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

    // Build derived registries after core overrides are applied, so caps/keys are consistent.
    if (typeof buildCountersRegistry === "function") {
        data.countersRegistry = buildCountersRegistry(data);
    } else {
        data.countersRegistry = {};
    }

    data.debug = { validate: true };

    root.DATA = data;
})();
