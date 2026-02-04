// js/data_campaigns.js - Campaign definitions (display metadata only)

const CAMPAIGN_REGISTRY = {
    em_promo: {
        settingKey: "em_promo_enabled",
        warningTitle: "EveryMile 海外推廣",
        warningDesc: "需登記以賺取回贈"
    },
    winter_promo: {
        settingKey: "winter_promo_enabled",
        warningTitle: "最紅冬日賞",
        warningDesc: "需登記以賺取回贈"
    },
    boc_amazing: {
        settingKey: "boc_amazing_enabled",
        warningTitle: "狂賞派",
        warningDesc: "需登記以賺取回贈"
    },
    boc_amazing_fly: {
        settingKey: "boc_amazing_enabled",
        warningTitle: "狂賞飛",
        warningDesc: "需登記以賺取回贈"
    },
    mmpower_promo: {
        settingKey: "mmpower_promo_enabled",
        warningTitle: "MMPower",
        warningDesc: "需登記以賺取回贈"
    },
    travel_plus_promo: {
        settingKey: "travel_plus_promo_enabled",
        warningTitle: "Travel+",
        warningDesc: "需登記以賺取回贈"
    },
    fubon_in_promo: {
        settingKey: "fubon_in_promo_enabled",
        warningTitle: "Fubon iN",
        warningDesc: "需登記以賺取回贈"
    },
    dbs_black_promo: {
        settingKey: "dbs_black_promo_enabled",
        warningTitle: "DBS Black",
        warningDesc: "需登記以賺取回贈"
    },
    sim_promo: {
        settingKey: "sim_promo_enabled",
        warningTitle: "sim Credit",
        warningDesc: "需登記以賺取回贈"
    }
};

const CAMPAIGNS = [
    {
        id: "em_promo",
        name: "EveryMile 海外",
        icon: "fas fa-plane",
        theme: "purple",
        badge: { type: "promo_end", moduleKey: "em_overseas_mission", field: "promo_end" },
        cards: ["hsbc_everymile"],
        sections: [
            { type: "mission", label: "🎯 任務進度", usageKey: "em_q1_total", target: 12000 },
            { type: "cap_rate", label: "💰 回贈進度", usageKey: "em_q1_eligible", capModule: "em_overseas_bonus", rateModule: "em_overseas_bonus", unit: "RC", unlockKey: "em_q1_total", unlockTarget: 12000 }
        ],
        capKeys: ["em_promo_cap"]
    },
    {
        id: "winter_promo",
        name: "最紅冬日賞",
        icon: "fas fa-gift",
        theme: "red",
        badge: { type: "promo_end", moduleKey: "winter_tracker", field: "promo_end" },
        cards: ["hsbc_vs", "hsbc_red", "hsbc_pulse", "hsbc_unionpay_std", "hsbc_easy", "hsbc_gold_student", "hsbc_gold", "hsbc_premier"],
        sections: [
            { type: "mission", label: "🎯 任務進度", usageKey: "winter_total", target: 40000, markers: [20000, 40000] },
            {
                type: "tier_cap",
                label: "💰 回贈進度",
                totalKey: "winter_total",
                eligibleKey: "winter_eligible",
                tiers: [
                    { threshold: 20000, cap: 250, rate: 0.03 },
                    { threshold: 40000, cap: 800, rate: 0.06 }
                ],
                unit: ""
            }
        ]
    },
    {
        id: "boc_amazing",
        name: "狂賞派",
        icon: "fas fa-fire",
        theme: "blue",
        badge: { type: "month_end" },
        cards: ["boc_cheers_vi", "boc_cheers_vs"],
        sections: [
            { type: "mission", label: "🎯 任務進度", usageKeys: ["spend_boc_cheers_vi", "spend_boc_cheers_vs"], target: 6000 },
            { type: "cap", label: "💰 回贈上限 (平日)", capModule: "boc_amazing_weekday", unit: "元", unlockTarget: 6000 },
            { type: "cap", label: "💰 回贈上限 (紅日)", capModule: "boc_amazing_holiday", unit: "元", unlockTarget: 6000 },
            { type: "cap", label: "💰 網購回贈上限 (平日)", capModule: "boc_amazing_online_weekday", unit: "元", unlockTarget: 6000 },
            { type: "cap", label: "💰 網購回贈上限 (紅日)", capModule: "boc_amazing_online_holiday", unit: "元", unlockTarget: 6000 }
        ],
        capKeys: ["boc_amazing_local_weekday_cap", "boc_amazing_local_holiday_cap", "boc_amazing_online_weekday_cap", "boc_amazing_online_holiday_cap"]
    },
    {
        id: "boc_amazing_fly",
        name: "狂賞飛 (外幣) 季度任務",
        icon: "fas fa-plane",
        theme: "blue",
        badge: { type: "quarter_end" },
        cards: ["boc_cheers_vi", "boc_cheers_vs"],
        sections: [
            { type: "mission", label: "🎯 簽賬門檻", usageKeys: ["spend_boc_cheers_vi", "spend_boc_cheers_vs"], target: 5000 },
            { type: "cap", label: "💰 回贈上限 (中澳)", capModule: "boc_amazing_fly_cn", unit: "分", unlockTarget: 5000 },
            { type: "cap", label: "💰 回贈上限 (其他)", capModule: "boc_amazing_fly_other", unit: "分", unlockTarget: 5000 }
        ],
        capKeys: ["boc_amazing_fly_cn_cap", "boc_amazing_fly_other_cap"]
    },
    {
        id: "mmpower_promo",
        name: "MMPower +FUN Dollars",
        icon: "fas fa-bolt",
        theme: "yellow",
        badge: { type: "month_end" },
        cards: ["hangseng_mmpower"],
        sections: [
            { type: "mission", label: "🎯 簽賬門檻", usageKey: "spend_hangseng_mmpower", target: 5000 },
            { type: "cap", label: "💰 回贈上限", capModule: "mmpower_overseas_bonus", unit: "元", unlockTarget: 5000 }
        ],
        capKeys: ["mmpower_reward_cap"]
    },
    {
        id: "travel_plus_promo",
        name: "Travel+ 外幣回贈",
        icon: "fas fa-plane",
        theme: "purple",
        badge: { type: "month_end" },
        cards: ["hangseng_travel_plus"],
        sections: [
            { type: "mission", label: "🎯 簽賬門檻", usageKey: "spend_hangseng_travel_plus", target: 6000 },
            { type: "cap", label: "💰 回贈上限", capModule: "travel_plus_tier1_bonus", unit: "元", unlockTarget: 6000 }
        ],
        capKeys: ["travel_plus_reward_cap"]
    },
    {
        id: "fubon_in_promo",
        name: "Fubon iN 網購20X",
        icon: "fas fa-bolt",
        theme: "purple",
        badge: { type: "month_end" },
        cards: ["fubon_in_platinum"],
        sections: [
            { type: "mission", label: "🎯 簽賬門檻", usageKey: "spend_fubon_in_platinum", target: 1000 },
            { type: "cap", label: "💰 回贈上限", capModule: "fubon_in_online", unit: "分", unlockTarget: 1000 }
        ],
        capKeys: ["fubon_in_bonus_cap"]
    },
    {
        id: "dbs_black_promo",
        name: "DBS Black $2/里推廣",
        icon: "fas fa-gem",
        theme: "gray",
        badge: { type: "month_end" },
        cards: ["dbs_black"],
        sections: [
            { type: "mission", label: "🎯 簽賬門檻", usageKey: "spend_dbs_black", target: 20000 },
            { type: "cap", label: "💰 回贈上限", capModule: "dbs_black_overseas_promo", unit: "里", unlockTarget: 20000 }
        ]
    },
    {
        id: "sim_promo",
        name: "sim 8% 網購推廣",
        icon: "fas fa-percent",
        theme: "green",
        badge: { type: "month_end" },
        cards: ["sim_credit"],
        sections: [
            { type: "mission", label: "🎯 非網購門檻", usageKey: "sim_non_online_spend", target: 500 },
            { type: "cap", label: "💰 回贈上限", capModule: "sim_online", unit: "元", unlockTarget: 500 }
        ],
        capKeys: ["sim_online_cap"]
    }
];
