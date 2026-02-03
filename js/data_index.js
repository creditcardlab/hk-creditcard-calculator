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

    const getCampaignRateMap = (id) => {
        if (id === "winter_promo") return [0.03, 0.06];
        return null;
    };

    const adaptCampaignsToPromotions = (campaigns, modules) => {
        if (!Array.isArray(campaigns)) return [];
        return campaigns.map(c => {
            const clone = { ...c };
            clone.sections = (c.sections || []).map(sec => {
                const next = { ...sec };
                if (sec.type === "cap_rate" && (sec.rate === undefined || sec.rate === null)) {
                    const mod = sec.rateModule ? modules[sec.rateModule] : null;
                    next.rate = mod && typeof mod.rate === "number" ? mod.rate : 0;
                }
                if (sec.type === "tier_cap") {
                    const rates = getCampaignRateMap(c.id);
                    if (rates && Array.isArray(next.tiers)) {
                        next.tiers = next.tiers.map((t, i) => ({ ...t, rate: rates[i] }));
                    }
                }
                return next;
            });
            return clone;
        });
    };

    const data = {
        cards: (typeof cardsDB !== "undefined") ? cardsDB : [],
        categories: categoriesDB,
        modules: (typeof modulesDB !== "undefined") ? modulesDB : {},
        conversions: (typeof conversionDB !== "undefined") ? conversionDB : [],
        trackers: (typeof trackersDB !== "undefined") ? trackersDB : {},
        campaigns: (typeof CAMPAIGNS !== "undefined") ? CAMPAIGNS : [],
        campaignRegistry: (typeof CAMPAIGN_REGISTRY !== "undefined") ? CAMPAIGN_REGISTRY : {},
        promotions: (typeof CAMPAIGNS !== "undefined") ? adaptCampaignsToPromotions(CAMPAIGNS, (typeof modulesDB !== "undefined") ? modulesDB : {}) : ((typeof PROMOTIONS !== "undefined") ? PROMOTIONS : []),
        promoRegistry: (typeof CAMPAIGN_REGISTRY !== "undefined") ? CAMPAIGN_REGISTRY : ((typeof PROMO_REGISTRY !== "undefined") ? PROMO_REGISTRY : {}),
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
