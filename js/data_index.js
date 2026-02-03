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

    if (typeof buildCountersRegistry === "function") {
        data.countersRegistry = buildCountersRegistry(data);
    } else {
        data.countersRegistry = {};
    }

    data.debug = { validate: true };

    root.DATA = data;
})();
