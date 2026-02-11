// js/data_campaigns.js - Campaign display layout + module/tracker bindings

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
        promo_type: "mission_cap_rate",
        name: "EveryMile 海外",
        icon: "fas fa-plane",
        theme: "purple",
        period_policy: {
            mode: "fixed",
            period: { type: "promo", startDate: "2026-01-01", endDate: "2026-03-31" }
        },
        cards: ["hsbc_everymile"],
        sections: [
            { type: "mission", label: "🎯 簽賬任務進度", missionModule: "em_overseas_bonus" },
            { type: "cap_rate", label: "💰 回贈進度", usageKey: "em_q1_eligible", capModule: "em_overseas_bonus", rateModule: "em_overseas_bonus", unit: "RC", unlockModule: "em_overseas_bonus" }
        ],
        capKeys: ["em_promo_cap"]
    },
    {
        id: "winter_promo",
        promo_type: "tiered_cap",
        name: "最紅冬日賞",
        icon: "fas fa-gift",
        theme: "red",
        period_policy: {
            mode: "fixed",
            period: { type: "promo", startDate: "2025-12-01", endDate: "2026-02-28" }
        },
        cards: ["hsbc_vs", "hsbc_red", "hsbc_pulse", "hsbc_unionpay_std", "hsbc_easy", "hsbc_gold_student", "hsbc_gold", "hsbc_premier"],
        sections: [
            { type: "mission", label: "🎯 簽賬任務進度", usageKey: "winter_total", target: 40000, markers: [20000, 40000] },
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
        id: "sc_smart_monthly",
        promo_type: "mission_cap",
        name: "渣打 Smart 每月回贈",
        icon: "fas fa-credit-card",
        theme: "blue",
        period_policy: {
            mode: "recurring",
            period: { type: "month", startDay: 1 }
        },
        cards: ["sc_smart"],
        sections: [
            { type: "mission", label: "🎯 合資格簽賬進度", usageKey: "sc_smart_monthly_eligible", target: 15000, markers: [4000, 15000] },
            { type: "cap", label: "💳 指定商戶簽賬上限", capModule: "sc_smart_designated", unlockKey: "sc_smart_monthly_eligible", unlockTarget: 4000, unit: "元" }
        ],
        capKeys: ["sc_smart_cap"]
    },
    {
        id: "citi_octopus_tier",
        promo_type: "tiered_cap",
        name: "Citi Octopus 交通/隧道回贈",
        icon: "fas fa-subway",
        theme: "blue",
        period_policy: {
            mode: "recurring",
            period: { type: "month", startDay: 1 }
        },
        cards: ["citi_octopus"],
        sections: [
            { type: "mission", label: "🎯 月簽任務進度", usageKey: "spend_citi_octopus", target: 10000, markers: [4000, 10000] },
            {
                type: "tier_cap",
                label: "💰 回贈進度",
                totalKey: "spend_citi_octopus",
                eligibleKey: "citi_octopus_reward_cap",
                tiers: [
                    { threshold: 4000, cap: 300, rate: 1 },
                    { threshold: 10000, cap: 500, rate: 1 }
                ],
                unit: "元"
            }
        ],
        capKeys: ["citi_octopus_reward_cap"]
    },
    {
        id: "citi_rewards_bonus",
        promo_type: "cap",
        name: "Citi Rewards Bonus 積分",
        icon: "fas fa-star",
        theme: "blue",
        period_policy: {
            mode: "recurring",
            period: { type: "month", startDay: 1 }
        },
        cards: ["citi_rewards"],
        sections: [
            { type: "cap", label: "💰 Bonus 積分進度", capModule: "citi_rewards_mobile", unit: "積分" }
        ],
        capKeys: ["citi_rewards_bonus_cap"]
    },
    {
        id: "boc_amazing",
        promo_type: "mission_multi_cap",
        name: "狂賞派",
        icon: "fas fa-fire",
        theme: "blue",
        period_policy: {
            mode: "recurring",
            period: { type: "month", startDay: 1 }
        },
        cards: ["boc_cheers_vi", "boc_cheers_vs"],
        sections: [
            { type: "mission", label: "🎯 簽賬任務進度", usageKeys: ["spend_boc_cheers_vi", "spend_boc_cheers_vs"], target: 6000 },
            { type: "cap", label: "💰 回贈進度 (平日)", capModule: "boc_amazing_weekday", unit: "元" },
            { type: "cap", label: "💰 回贈進度 (紅日)", capModule: "boc_amazing_holiday", unit: "元" },
            { type: "cap", label: "💰 網購回贈進度 (平日)", capModule: "boc_amazing_online_weekday", unit: "元" },
            { type: "cap", label: "💰 網購回贈進度 (紅日)", capModule: "boc_amazing_online_holiday", unit: "元" }
        ],
        capKeys: ["boc_amazing_local_weekday_cap", "boc_amazing_local_holiday_cap", "boc_amazing_online_weekday_cap", "boc_amazing_online_holiday_cap"]
    },
    {
        id: "boc_amazing_fly",
        promo_type: "mission_multi_cap",
        name: "狂賞飛 (外幣) 季度任務",
        icon: "fas fa-plane",
        theme: "blue",
        period_policy: {
            mode: "recurring",
            period: { type: "quarter", startMonth: 1, startDay: 1 }
        },
        cards: ["boc_cheers_vi", "boc_cheers_vs"],
        sections: [
            { type: "mission", label: "🎯 簽賬任務進度", missionModules: ["boc_amazing_fly_cn", "boc_amazing_fly_cn_vs"] },
            { type: "cap", label: "💰 回贈進度 (中澳)", capModule: "boc_amazing_fly_cn", unit: "分" },
            { type: "cap", label: "💰 回贈進度 (其他)", capModule: "boc_amazing_fly_other", unit: "分" }
        ],
        capKeys: ["boc_amazing_fly_cn_cap", "boc_amazing_fly_other_cap"]
    },
    {
        id: "mmpower_promo",
        promo_type: "mission_cap",
        name: "MMPower +FUN Dollars",
        icon: "fas fa-bolt",
        theme: "yellow",
        period_policy: {
            mode: "recurring",
            period: { type: "month", startDay: 1 }
        },
        cards: ["hangseng_mmpower"],
        sections: [
            { type: "mission", label: "🎯 簽賬任務進度", missionModule: "mmpower_overseas_bonus" },
            { type: "cap", label: "💰 回贈進度", capModule: "mmpower_overseas_bonus", unit: "元", unlockModule: "mmpower_overseas_bonus" }
        ],
        capKeys: ["mmpower_reward_cap"]
    },
    {
        id: "travel_plus_promo",
        promo_type: "mission_cap",
        name: "Travel+ 外幣回贈",
        icon: "fas fa-plane",
        theme: "purple",
        period_policy: {
            mode: "recurring",
            startDate: "2026-01-01",
            endDate: "2026-12-31",
            period: { type: "month", startDay: 1 }
        },
        cards: ["hangseng_travel_plus"],
        sections: [
            { type: "mission", label: "🎯 簽賬任務進度", missionModule: "travel_plus_tier1_bonus" },
            { type: "cap", label: "💰 回贈進度", capModule: "travel_plus_tier1_bonus", unit: "+FUN Dollars", unlockModule: "travel_plus_tier1_bonus" }
        ],
        capKeys: ["travel_plus_reward_cap"]
    },
    {
        id: "fubon_in_promo",
        promo_type: "mission_cap",
        name: "Fubon iN 網購20X",
        icon: "fas fa-bolt",
        theme: "purple",
        period_policy: {
            mode: "recurring",
            period: { type: "month", startDay: 1 }
        },
        cards: ["fubon_in_platinum"],
        sections: [
            { type: "mission", label: "🎯 簽賬任務進度", missionModule: "fubon_in_online" },
            { type: "cap", label: "💰 回贈進度", capModule: "fubon_in_online", unit: "分", unlockModule: "fubon_in_online" }
        ],
        capKeys: ["fubon_in_bonus_cap"]
    },
    {
        id: "dbs_black_promo",
        promo_type: "mission_uncapped",
        name: "DBS Black $2/里推廣",
        icon: "fas fa-gem",
        theme: "gray",
        period_policy: {
            mode: "recurring",
            period: { type: "month", startDay: 1 }
        },
        cards: ["dbs_black"],
        sections: [
            { type: "mission", label: "🎯 簽賬任務進度", missionModule: "dbs_black_overseas_promo" },
            { type: "cap", label: "💰 回贈進度", capModule: "dbs_black_overseas_promo", unit: "里", unlockModule: "dbs_black_overseas_promo" }
        ]
    },
    {
        id: "sim_promo",
        promo_type: "mission_cap",
        name: "sim 8% 網購推廣",
        icon: "fas fa-percent",
        theme: "green",
        period_policy: {
            mode: "recurring",
            period: { type: "month", startDay: 1 }
        },
        cards: ["sim_credit"],
        sections: [
            { type: "mission", label: "🎯 簽賬任務進度", missionModule: "sim_online" },
            { type: "cap", label: "💰 回贈進度", capModule: "sim_online", unit: "元", unlockModule: "sim_online" }
        ],
        capKeys: ["sim_online_cap"]
    }
];

// Special lifecycle models rendered by dedicated UI blocks (not standard campaign sections yet).
const SPECIAL_PROMO_MODELS = {
    travel_guru: {
        id: "travel_guru",
        promo_type: "level_lifecycle",
        module: "travel_guru_v2",
        usage: {
            spendKey: "guru_spend_accum",
            rewardKey: "guru_rc_used"
        },
        levels: {
            1: { name: "GO級", targetSpend: 30000, rewardCap: 500, nextName: "GING級" },
            2: { name: "GING級", targetSpend: 70000, rewardCap: 1200, nextName: "GURU級" },
            3: { name: "GURU級", targetSpend: 70000, rewardCap: 2200, nextName: "保級" }
        },
        cards: [
            "hsbc_everymile",
            "hsbc_vs",
            "hsbc_red",
            "hsbc_pulse",
            "hsbc_unionpay_std",
            "hsbc_easy",
            "hsbc_gold_student",
            "hsbc_gold",
            "hsbc_premier"
        ]
    }
};
