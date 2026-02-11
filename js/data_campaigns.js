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
        warningTitle: "中銀 狂賞派",
        warningDesc: "需登記以賺取回贈"
    },
    boc_amazing_fly: {
        settingKey: "boc_amazing_enabled",
        warningTitle: "中銀 狂賞飛",
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
    fubon_travel_upgrade_promo: {
        settingKey: "fubon_travel_upgrade_enabled",
        warningTitle: "Fubon Platinum 指定本地網購 10X",
        warningDesc: "需致電 2566-8181 登記"
    },
    fubon_infinite_upgrade_promo: {
        settingKey: "fubon_infinite_upgrade_enabled",
        warningTitle: "Fubon Infinite 指定本地網購 10X",
        warningDesc: "需致電 2566-8181 登記"
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
    },
    ae_explorer_075x_toggle: {
        settingKey: "ae_explorer_075x_enabled",
        warningTitle: "AE Explorer 海外/旅遊 +0.75X",
        warningDesc: "需登記以賺取回贈"
    },
    ae_explorer_2026h1: {
        settingKey: "ae_explorer_7x_enabled",
        warningTitle: "AE Explorer 海外/旅遊 +7X",
        warningDesc: "需登記以賺取回贈"
    },
    ae_explorer_online_2026: {
        settingKey: "ae_explorer_online_5x_enabled",
        warningTitle: "AE Explorer 指定網上 5X",
        warningDesc: "需登記以賺取回贈"
    },
    ae_platinum_9x_2026h1: {
        settingKey: "ae_platinum_9x_enabled",
        warningTitle: "AE Platinum 高達9X",
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
        name: "中銀 狂賞派",
        icon: "fas fa-fire",
        theme: "blue",
        period_policy: {
            mode: "recurring",
            startDate: "2026-01-01",
            endDate: "2026-06-30",
            period: { type: "month", startDay: 1 }
        },
        cards: ["boc_cheers_vi", "boc_cheers_vs"],
        sections: [
            { type: "mission", label: "🎯 本地簽賬任務進度", usageKey: "spend_boc_amazing_local", target: 5000 },
            { type: "cap", label: "💳 平日回贈進度", capModule: "boc_amazing_weekday", unit: "積分" },
            { type: "cap", label: "💳 紅日回贈進度", capModule: "boc_amazing_holiday", unit: "積分" },
            { type: "cap", label: "💳 網購平日回贈進度", capModule: "boc_amazing_online_weekday", unit: "積分" },
            { type: "cap", label: "💳 網購紅日回贈進度", capModule: "boc_amazing_online_holiday", unit: "積分" }
        ],
        capKeys: ["boc_amazing_local_weekday_cap", "boc_amazing_local_holiday_cap", "boc_amazing_online_weekday_cap", "boc_amazing_online_holiday_cap"]
    },
    {
        id: "boc_amazing_fly",
        promo_type: "mission_multi_cap",
        name: "中銀 狂賞飛 (外幣) 季度任務",
        icon: "fas fa-plane",
        theme: "blue",
        period_policy: {
            mode: "fixed",
            startDate: "2026-01-01",
            endDate: "2026-06-30",
            period: { type: "quarter", startMonth: 1, startDay: 1 }
        },
        cards: ["boc_cheers_vi", "boc_cheers_vs"],
        sections: [
            { type: "mission", label: "🎯 中澳門檻進度", missionModule: "boc_amazing_fly_cn" },
            { type: "mission", label: "🎯 其他海外門檻進度", missionModule: "boc_amazing_fly_other" },
            { type: "cap", label: "💰 回贈進度 (中澳)", capModule: "boc_amazing_fly_cn", unit: "積分" },
            { type: "cap", label: "💰 回贈進度 (其他)", capModule: "boc_amazing_fly_other", unit: "積分" }
        ],
        capKeys: ["boc_amazing_fly_cn_cap_stage", "boc_amazing_fly_other_cap_stage"]
    },
    {
        id: "boc_cheers_vi_2026h1",
        promo_type: "mission_multi_cap",
        name: "中銀 Cheers Visa Infinite 10X",
        icon: "fas fa-star",
        theme: "blue",
        period_policy: {
            mode: "fixed",
            startDate: "2026-01-01",
            endDate: "2026-06-30",
            period: { type: "month", startDay: 1 }
        },
        cards: ["boc_cheers_vi"],
        sections: [
            { type: "mission", label: "🎯 每月簽賬任務進度", missionModule: "boc_cheers_vi_dining_2026h1" },
            { type: "cap", label: "🍽️ 餐飲 10X 回贈進度", capModule: "boc_cheers_vi_dining_2026h1", unit: "積分", unlockModule: "boc_cheers_vi_dining_2026h1" },
            { type: "cap", label: "🌍 外幣 10X 回贈進度", capModule: "boc_cheers_vi_fx_2026h1", unit: "積分", unlockModule: "boc_cheers_vi_fx_2026h1" },
            { type: "cap", label: "🧮 10X 總額外積分進度", capKey: "boc_cheers_total_cap_vi", cap: 300000, unit: "積分", unlockModule: "boc_cheers_vi_dining_2026h1" }
        ],
        capKeys: ["boc_cheers_dining_cap", "boc_cheers_travel_cap", "boc_cheers_total_cap_vi"]
    },
    {
        id: "boc_cheers_vs_2026h1",
        promo_type: "mission_multi_cap",
        name: "中銀 Cheers Visa Signature 8X",
        icon: "fas fa-star",
        theme: "blue",
        period_policy: {
            mode: "fixed",
            startDate: "2026-01-01",
            endDate: "2026-06-30",
            period: { type: "month", startDay: 1 }
        },
        cards: ["boc_cheers_vs"],
        sections: [
            { type: "mission", label: "🎯 每月簽賬任務進度", missionModule: "boc_cheers_vs_dining_2026h1" },
            { type: "cap", label: "🍽️ 餐飲 8X 回贈進度", capModule: "boc_cheers_vs_dining_2026h1", unit: "積分", unlockModule: "boc_cheers_vs_dining_2026h1" },
            { type: "cap", label: "🌍 外幣 8X 回贈進度", capModule: "boc_cheers_vs_fx_2026h1", unit: "積分", unlockModule: "boc_cheers_vs_fx_2026h1" },
            { type: "cap", label: "🧮 8X 總額外積分進度", capKey: "boc_cheers_total_cap_vs", cap: 180000, unit: "積分", unlockModule: "boc_cheers_vs_dining_2026h1" }
        ],
        capKeys: ["boc_cheers_dining_cap_vs", "boc_cheers_travel_cap_vs", "boc_cheers_total_cap_vs"]
    },
    {
        id: "boc_chill_offer",
        promo_type: "mission_cap",
        name: "中銀 Chill Card 額外回贈",
        icon: "fas fa-snowflake",
        theme: "blue",
        period_policy: {
            mode: "recurring",
            startDate: "2025-01-01",
            endDate: "2026-06-30",
            period: { type: "month", startDay: 1 }
        },
        cards: ["boc_chill"],
        sections: [
            { type: "mission", label: "🎯 簽賬任務進度", usageKey: "spend_boc_chill_monthly", target: 1500 },
            { type: "cap", label: "💰 額外回贈進度（共用上限）", capKey: "boc_chill_bonus_cap_2026", cap: 37500, unit: "積分" }
        ],
        capKeys: ["boc_chill_bonus_cap_2026"]
    },
    {
        id: "boc_go_offer",
        promo_type: "cap",
        name: "中銀 Go Card 額外回贈",
        icon: "fas fa-mobile-alt",
        theme: "blue",
        period_policy: {
            mode: "fixed",
            startDate: "2025-01-01",
            endDate: "2026-06-30",
            period: { type: "month", startDay: 1 }
        },
        cards: ["boc_go_diamond"],
        sections: [
            { type: "cap", label: "🛍️ Go 指定商戶額外回贈進度", capModule: "boc_go_merchant", unit: "積分" },
            { type: "cap", label: "📱 手機簽賬額外回贈進度", capModule: "boc_go_mobile", unit: "積分" }
        ],
        capKeys: ["boc_go_merchant_bonus_cap_2026", "boc_go_mobile_bonus_cap_2026"]
    },
    {
        id: "boc_go_offer_platinum",
        promo_type: "mission_cap",
        name: "中銀 Go Card Platinum 額外回贈",
        icon: "fas fa-mobile-alt",
        theme: "blue",
        period_policy: {
            mode: "fixed",
            startDate: "2025-01-01",
            endDate: "2026-06-30",
            period: { type: "month", startDay: 1 }
        },
        cards: ["boc_go_platinum"],
        sections: [
            { type: "mission", label: "🎯 簽賬任務進度", usageKey: "spend_boc_go_platinum_monthly", target: 1000 },
            { type: "cap", label: "🛍️ Go 指定商戶額外回贈進度", capModule: "boc_go_platinum_merchant", unit: "積分" },
            { type: "cap", label: "📱 手機簽賬額外回贈進度", capModule: "boc_go_platinum_mobile", unit: "積分" }
        ],
        capKeys: ["boc_go_platinum_merchant_bonus_cap_2026", "boc_go_platinum_mobile_bonus_cap_2026"]
    },
    {
        id: "boc_sogo_mobile_offer",
        promo_type: "cap",
        name: "中銀 SOGO Visa Signature 手機支付額外回贈",
        icon: "fas fa-mobile-alt",
        theme: "blue",
        period_policy: {
            mode: "fixed",
            startDate: "2026-01-01",
            endDate: "2026-12-31",
            period: { type: "month", startDay: 1 }
        },
        cards: ["boc_sogo"],
        sections: [
            { type: "cap", label: "📱 手機支付額外回贈進度", capModule: "boc_sogo_mobile_pay", unit: "元" }
        ],
        capKeys: ["boc_sogo_mobile_bonus_cap_2026"]
    },
    {
        id: "ae_explorer_075x_toggle",
        promo_type: "custom",
        name: "AE Explorer 海外/旅遊額外 +0.75X",
        icon: "fas fa-globe-asia",
        theme: "blue",
        warningOnly: true,
        period_policy: {
            mode: "fixed",
            startDate: "2026-01-02",
            endDate: "2026-06-30",
            period: { type: "quarter", startMonth: 1, startDay: 1 }
        },
        // 只用作 settings toggle + 未登記 warning（分開登記），不在 dashboard 顯示進度卡。
        cards: ["ae_explorer"],
        sections: []
    },
    {
        id: "ae_explorer_2026h1",
        promo_type: "cap",
        name: "AE Explorer 海外/旅遊 2026H1",
        icon: "fas fa-globe-asia",
        theme: "blue",
        period_policy: {
            mode: "fixed",
            startDate: "2026-01-02",
            endDate: "2026-06-30",
            period: { type: "quarter", startMonth: 1, startDay: 1 }
        },
        cards: ["ae_explorer"],
        sections: [
            { type: "cap", label: "🌍 海外額外 7X（季度首$10,000）", capModule: "ae_explorer_fx_7x_bonus_2026h1", unit: "元" },
            { type: "cap", label: "✈️ 旅遊/機票額外 7X（季度首$10,000）", capModule: "ae_explorer_travel_7x_bonus_2026h1", unit: "元" }
        ],
        capKeys: ["ae_explorer_fx_7x_qcap_2026", "ae_explorer_travel_7x_qcap_2026"]
    },
    {
        id: "ae_explorer_online_2026",
        promo_type: "cap",
        name: "AE Explorer 指定網上商戶 5X",
        icon: "fas fa-shopping-cart",
        theme: "blue",
        period_policy: {
            mode: "fixed",
            startDate: "2026-01-02",
            endDate: "2026-12-31",
            period: { type: "quarter", startMonth: 1, startDay: 1 }
        },
        cards: ["ae_explorer"],
        sections: [
            { type: "cap", label: "🛒 額外積分進度（每季上限 90,000）", capModule: "ae_explorer_online_5x_bonus_2026", unit: "積分" }
        ],
        capKeys: ["ae_explorer_online_5x_bonus_qcap_2026"]
    },
    {
        id: "ae_platinum_9x_2026h1",
        promo_type: "cap",
        name: "AE Platinum 外幣/指定商戶高達9X",
        icon: "fas fa-gem",
        theme: "blue",
        period_policy: {
            mode: "fixed",
            startDate: "2025-08-20",
            endDate: "2026-06-30",
            period: { type: "quarter", startMonth: 1, startDay: 1 }
        },
        cards: ["ae_platinum"],
        sections: [
            { type: "cap", label: "🌍 外幣額外 5X（每季首$15,000）", capModule: "ae_plat_fx_5x_promo_2026h1", unit: "元" },
            { type: "cap", label: "✈️ 指定旅遊商戶額外 7X（每季首$15,000）", capModule: "ae_plat_travel", unit: "元" },
            { type: "cap", label: "🛒 指定日常商戶額外 7X（每季首$15,000）", capModule: "ae_plat_daily", unit: "元" }
        ],
        capKeys: ["ae_plat_fx_9x_cap", "ae_plat_travel_cap", "ae_plat_daily_cap"]
    },
    {
        id: "ae_pcc_program_3x_2026",
        promo_type: "cap",
        name: "AE Platinum Credit Program 3X 累積進度",
        icon: "fas fa-layer-group",
        theme: "blue",
        period_policy: {
            mode: "fixed",
            startDate: "2025-01-01",
            endDate: "2026-12-31",
            period: { type: "promo", startDate: "2025-01-01", endDate: "2026-12-31" }
        },
        cards: ["ae_platinum_credit"],
        sections: [
            { type: "cap", label: "🏁 Program 3X 累積簽賬進度（推廣期）", capModule: "ae_pcc_program_bonus_2x", unit: "元" }
        ],
        capKeys: ["ae_pcc_program_3x_cap"]
    },
    {
        id: "ae_pcc_double_points_2026",
        promo_type: "cap",
        name: "AE Platinum Credit 指定商戶 Double Points",
        icon: "fas fa-credit-card",
        theme: "blue",
        period_policy: {
            mode: "fixed",
            startDate: "2025-01-01",
            endDate: "2026-12-31",
            period: { type: "promo", startDate: "2025-01-01", endDate: "2026-12-31" }
        },
        cards: ["ae_platinum_credit"],
        sections: [
            { type: "cap", label: "🏬 指定商戶額外積分進度（每月上限 30,000）", capModule: "ae_pcc_double_extra_3x_precap", unit: "積分" }
        ],
        capKeys: ["ae_pcc_double_cap"]
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
            startDate: "2026-01-01",
            endDate: "2026-06-30",
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
        id: "fubon_travel_overseas_2026",
        promo_type: "multi_cap",
        name: "Fubon Platinum 海外額外積分",
        icon: "fas fa-plane",
        theme: "purple",
        cards: ["fubon_travel"],
        sections: [
            { type: "cap", label: "💰 海外額外積分進度（每月）", capModule: "fubon_travel_tw", unit: "分" },
            { type: "cap", label: "🧮 海外額外積分進度（全年）", capKey: "fubon_travel_bonus_annual_cap", cap: 240000, unit: "分" }
        ],
        capKeys: ["fubon_travel_bonus_monthly_cap", "fubon_travel_bonus_annual_cap"]
    },
    {
        id: "fubon_travel_upgrade_promo",
        promo_type: "cap",
        name: "Fubon Platinum 指定本地網購 10X",
        icon: "fas fa-shopping-bag",
        theme: "purple",
        period_policy: {
            mode: "recurring",
            startDate: "2026-01-01",
            endDate: "2026-06-30",
            period: { type: "month", startDay: 1 }
        },
        cards: ["fubon_travel"],
        sections: [
            { type: "cap", label: "💰 回贈進度", capModule: "fubon_travel_upgrade_online", unit: "分" }
        ],
        capKeys: ["fubon_travel_upgrade_online_cap"]
    },
    {
        id: "fubon_infinite_upgrade_promo",
        promo_type: "mission_cap",
        name: "Fubon Infinite 指定本地網購 10X",
        icon: "fas fa-crown",
        theme: "purple",
        period_policy: {
            mode: "recurring",
            startDate: "2026-01-01",
            endDate: "2026-06-30",
            period: { type: "month", startDay: 1 }
        },
        cards: ["fubon_infinite"],
        sections: [
            { type: "mission", label: "🎯 簽賬任務進度", missionModule: "fubon_infinite_upgrade_online" },
            { type: "cap", label: "💰 回贈進度", capModule: "fubon_infinite_upgrade_online", unit: "分", unlockModule: "fubon_infinite_upgrade_online" }
        ],
        capKeys: ["fubon_infinite_upgrade_online_cap"]
    },
    {
        id: "fubon_infinite_overseas_2026",
        promo_type: "multi_cap",
        name: "Fubon Infinite 海外額外積分",
        icon: "fas fa-plane",
        theme: "purple",
        cards: ["fubon_infinite"],
        sections: [
            { type: "cap", label: "💰 海外額外積分進度（每月）", capModule: "fubon_infinite_twd_bonus", unit: "分" },
            { type: "cap", label: "🧮 海外額外積分進度（全年）", capKey: "fubon_infinite_bonus_annual_cap", cap: 240000, unit: "分" }
        ],
        capKeys: ["fubon_infinite_bonus_monthly_cap", "fubon_infinite_bonus_annual_cap"]
    },
    {
        id: "dbs_black_promo",
        promo_type: "mission_cap",
        name: "DBS Black $2/里推廣",
        icon: "fas fa-gem",
        theme: "gray",
        period_policy: {
            mode: "recurring",
            startDate: "2026-01-01",
            endDate: "2026-12-31",
            period: { type: "month", startDay: 1 }
        },
        cards: ["dbs_black"],
        sections: [
            { type: "mission", label: "🎯 簽賬任務進度", missionModule: "dbs_black_overseas_promo" },
            { type: "cap", label: "💰 每月額外回贈進度", capModule: "dbs_black_overseas_promo", unit: "DBS$", unlockModule: "dbs_black_overseas_promo" }
        ],
        capKeys: ["dbs_black_bonus_cap_monthly"]
    },
    {
        id: "dbs_compass_superwed",
        promo_type: "custom",
        name: "DBS COMPASS 週三超市 8%",
        icon: "fas fa-shopping-basket",
        theme: "green",
        period_policy: {
            mode: "fixed",
            startDate: "2026-01-07",
            endDate: "2026-05-27",
            period: { type: "month", startDay: 1 }
        },
        cards: ["dbs_compass"],
        sections: [
            {
                type: "cap_rate",
                label: "💰 回贈進度",
                usageKey: "dbs_compass_superwed_cap",
                rate: 0.08,
                cap: 160,
                unit: "CD"
            }
        ],
        capKeys: ["dbs_compass_superwed_cap"]
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
