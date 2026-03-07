// js/data_campaigns.js - Campaign display layout + module/tracker bindings

const CAMPAIGN_REGISTRY = {
    em_promo: {
        settingKey: "em_promo_enabled",
        warningTitle: "EveryMile 海外推廣",
        warningDesc: "需登記以賺取回贈",
        tncUrl: "https://www.redhotoffers.hsbc.com.hk/tc/latest-offers/everymile-spending-offer/terms-and-conditions/",
        promoUrl: "https://www.redhotoffers.hsbc.com.hk/tc/latest-offers/everymile-spending-offer/",
        registrationUrl: "https://www.hsbc.com.hk/rewardplus/",
        registrationStart: "2026-01-01",
        registrationEnd: "2026-06-30",
        registrationNote: "需於 HSBC Reward+ 應用程式登記",
        implementationNote: "計算器做法：推廣分兩期獨立計算（2026-01-01 至 2026-03-31、2026-04-01 至 2026-06-30）。每期先累積合資格外幣簽賬滿 $12,000，達標後按額外 1.5% 計算（連基本約 2.5%，約 $2/里），每期額外回贈上限 225 RC。"
    },
    winter_promo: {
        settingKey: "winter_promo_enabled",
        warningTitle: "HSBC 最紅冬日賞",
        warningDesc: "只限專屬客戶；需登記。部分指定商戶交易不計入合資格簽賬。",
        tncUrl: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/2025-winter-exclusive-spend.pdf",
        promoUrl: "",
        registrationUrl: "https://www.hsbc.com.hk/rewardplus/",
        registrationStart: "2025-12-01",
        registrationEnd: "2026-02-28",
        registrationNote: "只限專屬客戶，並需於 HSBC Reward+ 應用程式登記",
        implementationNote: "計算器做法：此優惠只限專屬客戶。達 $20,000 後按 3% 計（上限 $250）；達 $40,000 後按 6% 計（上限 $800）。合資格簽賬按條款排除指定商戶交易（SOGO〔含 sogo.com.hk〕、百老匯〔含 broadwaylifestyle.com〕、萬寧/Mannings Plus/Mannings Baby〔含 mannings.com.hk〕及 GNC 指定期間交易）。"
    },
    easy_additional_offer: {
        warningTitle: "HSBC Visa Platinum 指定商戶 3X",
        warningDesc: "只限專屬客戶及指定交易條件",
        tncUrl: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/visa-platinum-exclusive-additional-offers.pdf",
        promoUrl: "https://www.hsbc.com.hk/zh-hk/credit-cards/offers-and-promotions/",
        implementationNote: "計算器做法：只映射條款列明商戶。由於 3HK/SUPREME、hutchgo、Harbour Plaza 涉及指定服務/年票/套餐等條件，系統無法自動辨識，需手動判斷是否屬合資格交易。"
    },
    red_mcd_stamp: {
        settingKey: "red_mcd_stamp_enabled",
        warningTitle: "HSBC Red x 麥當勞電子印花卡",
        warningDesc: "需於 HSBC Reward+ 登記",
        tncUrl: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/red/terms-and-conditions-mcdonald.pdf",
        promoUrl: "https://www.hsbc.com.hk/zh-hk/credit-cards/rewards/your-choice/",
        registrationUrl: "https://www.hsbc.com.hk/rewardplus/",
        registrationStart: "2026-02-16",
        registrationEnd: "2026-12-31",
        registrationNote: "需於 HSBC Reward+ 應用程式登記「麥當勞電子印花卡獎賞」",
        implementationNote: "計算器做法：選擇商戶「McDonald's 麥當勞」後，按條款計算印花。每滿4個印花可獲$15；每日最多1個、每月最多8個、推廣期最多96個。"
    },
    sc_cathay_overseas_spending_offer_2026q2: {
        settingKey: "sc_cathay_overseas_spending_offer_enabled",
        warningTitle: "渣打國泰海外簽賬獎賞",
        warningDesc: "需先登記（首30,000位）",
        tncUrl: "https://av.sc.com/hk/content/docs/hk-cc-cx-overseas-spending-offer-tnc.pdf",
        promoUrl: "https://www.sc.com/hk/campaign/cathay-mastercard-spending-rewards-promotion/",
        registrationUrl: "https://www.sc.com/hk/campaign/cathay-mastercard-spending-rewards-promotion/apply/",
        registrationStart: "2025-12-16",
        registrationEnd: "2026-03-03",
        registrationNote: "需以渣打網上理財或SC Mobile完成登記",
        implementationNote: "計算器做法：推廣期（2025-12-16 至 2026-03-03）內，海外簽賬累積達$10,000後，派一次額外2,500里數（等效首$10,000額外 +0.25 里/港元；連基本海外$4/里約為$2/里）。首30,000位限制、只限同一張已登記卡及不合資格交易名單未能自動核實。"
    },
    boc_go_pmq126_offer: {
        settingKey: "boc_go_pmq126_enabled",
        warningTitle: "中銀 Go「Go！機」手機簽賬額外積分",
        warningDesc: "需先登記",
        tncUrl: "https://www.bochk.com/dam/boccreditcard/gopmq126/tnc_tc.pdf",
        promoUrl: "https://www.bochk.com/tc/creditcard/offer-and-incentive/gocard.html",
        registrationNote: "計算器未能核實：首30,000位成功登記客戶限制及條款列明之不合資格交易",
        implementationNote: "計算器做法：已登記時，2026-01-09 至 2026-03-31 按本地/內地手機簽賬加計額外積分，並套用每月額外積分上限25,000分。首30,000位限制及交易細項（如交易地點/渠道細則）未能自動核實。"
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
        warningTitle: "sim Credit 現金回贈推廣",
        warningDesc: "需登記以賺取回贈"
    },
    sim_world_promo: {
        settingKey: "sim_world_promo_enabled",
        warningTitle: "sim World 現金回贈推廣",
        warningDesc: "需登記以賺取回贈"
    },
    wewa_overseas_5pct_2026q1: {
        settingKey: "wewa_overseas_5pct_enabled",
        warningTitle: "WeWa 海外額外 +5%",
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
        warningDesc: "需登記以賺取回贈",
        tncUrl: "https://www.americanexpress.com/content/dam/amex/hk/ch/staticassets/pdf/cards/explorer-credit-card/MRTnC_CHI.pdf"
    },
    ae_explorer_online_2026: {
        settingKey: "ae_explorer_online_5x_enabled",
        warningTitle: "AE Explorer 指定網上 5X",
        warningDesc: "需登記以賺取回贈",
        promoUrl: "https://www.americanexpress.com/zh-hk/benefits/offers/shopping/5x-offer/index.html",
        registrationUrl: "https://www.americanexpress.com/zh-hk/benefits/offers/shopping/5x-offer/index.html"
    },
    ae_platinum_9x_2026h1: {
        settingKey: "ae_platinum_9x_enabled",
        warningTitle: "AE Platinum 高達9X",
        warningDesc: "需登記以賺取回贈",
        tncUrl: "https://www.americanexpress.com/content/dam/amex/hk/benefits/pdf/TnCs_platinum-membership-rewards-accelerator.pdf"
    },
    bea_world_flying_2025_2026h1: {
        settingKey: "bea_world_flying_miles_enabled",
        warningTitle: "BEA World BEA Flying Miles",
        warningDesc: "需登記 BEA Flying Miles 計劃"
    },
    bea_ititanium_2025_2026: {
        settingKey: "bea_ititanium_bonus_enabled",
        warningTitle: "BEA i-Titanium 網上零售/手機支付",
        warningDesc: "需登記 BEA Spending Points 計劃"
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
            mode: "composite",
            windows: [
                {
                    id: "window_1",
                    priority: 1,
                    startDate: "2026-01-01",
                    endDate: "2026-03-31",
                    period: { type: "promo", startDate: "2026-01-01", endDate: "2026-03-31" }
                },
                {
                    id: "window_2",
                    startDate: "2026-04-01",
                    endDate: "2026-06-30",
                    period: { type: "promo", startDate: "2026-04-01", endDate: "2026-06-30", startDay: 1 }
                }
            ]
        },
        cards: ["hsbc_everymile"],
        info_lines: [
            { icon: "fas fa-tag", text: "適用：海外簽賬" },
            { icon: "fas fa-coins", text: "額外 1.5%（連基本約 2.5%，約 $2/里）" },
            { icon: "fas fa-bullseye", text: "需先每期累積合資格簽賬 $12,000（達標後會補回先前簽賬）" }
        ],
        sections: [
            { type: "mission", label: "🎯 簽賬任務進度", missionModule: "em_overseas_bonus" },
            { type: "cap_rate", label: "💰 回贈進度", usageKey: "em_q1_eligible", capModule: "em_overseas_bonus", rateModule: "em_overseas_bonus", unit: "RC", unlockModule: "em_overseas_bonus" }
        ],
        capKeys: ["em_promo_cap"]
    },
    {
        id: "sc_cathay_overseas_spending_offer_2026q2",
        promo_type: "mission_cap_rate",
        name: "渣打國泰海外簽賬獎賞",
        icon: "fas fa-plane-departure",
        theme: "blue",
        period_policy: {
            mode: "fixed",
            period: { type: "promo", startDate: "2025-12-16", endDate: "2026-03-03" }
        },
        cards: ["sc_cathay_std", "sc_cathay_priority", "sc_cathay_private"],
        sections: [
            { type: "mission", label: "🎯 海外簽賬任務進度", missionModule: "sc_cathay_overseas_spending_offer_2026q2" },
            { type: "cap_rate", label: "✈️ 額外里數進度", usageKey: "sc_cathay_overseas_spend_offer_spend", capModule: "sc_cathay_overseas_spending_offer_2026q2", rateModule: "sc_cathay_overseas_spending_offer_2026q2", unit: "里", unlockModule: "sc_cathay_overseas_spending_offer_2026q2" }
        ],
        capKeys: ["sc_cathay_overseas_spend_offer_bonus_cap"]
    },
    {
        id: "winter_promo",
        promo_type: "tiered_cap",
        name: "HSBC 最紅冬日賞",
        icon: "fas fa-gift",
        theme: "red",
        period_policy: {
            mode: "fixed",
            period: { type: "promo", startDate: "2025-12-01", endDate: "2026-02-28" }
        },
        cards: ["hsbc_vs", "hsbc_red", "hsbc_pulse", "hsbc_unionpay_std", "hsbc_easy", "hsbc_gold_student", "hsbc_gold", "hsbc_premier"],
        info_lines: [
            { icon: "fas fa-receipt", text: "適用：合資格信用卡之本地及海外簽賬（按條款列明之不合資格交易除外）" },
            { icon: "fas fa-ban", text: "門檻計算：除 SOGO、百老匯、萬寧/Mannings Plus/Mannings Baby、GNC 指定期間交易外，其餘合資格簽賬可計入" },
            { icon: "fas fa-coins", text: "回贈級別：第1級 3%（上限 $250）；第2級 6%（上限 $800）｜回贈只按餐飲及海外簽賬計算" }
        ],
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
        id: "easy_additional_offer",
        promo_type: "custom",
        name: "HSBC Visa Platinum 指定商戶 3X",
        icon: "fas fa-tags",
        theme: "red",
        warningOnly: true,
        period_policy: {
            mode: "fixed",
            period: { type: "promo", startDate: "2025-05-19", endDate: "2026-02-28" }
        },
        cards: ["hsbc_easy"],
        sections: []
    },
    {
        id: "red_mcd_stamp",
        promo_type: "custom",
        name: "HSBC Red x 麥當勞電子印花卡",
        icon: "fas fa-hamburger",
        theme: "red",
        warningOnly: true,
        period_policy: {
            mode: "fixed",
            period: { type: "promo", startDate: "2026-02-16", endDate: "2026-12-31" }
        },
        cards: ["hsbc_red"],
        capKeys: ["red_mcd_reward_cap"],
        sections: []
    },
    {
        id: "sc_smart_monthly",
        promo_type: "custom",
        name: "渣打 Smart 每月回贈",
        icon: "fas fa-credit-card",
        theme: "blue",
        period_policy: {
            mode: "recurring",
            period: { type: "month", startDay: 1 }
        },
        cards: ["sc_smart"],
        info_lines: [
            { icon: "fas fa-tag", text: "適用：Smart 指定商戶（指定商戶維持 5%）" },
            { icon: "fas fa-bullseye", text: "需先月簽 $4,000 啟動回贈" }
        ],
        sections: [
            { type: "cap_rate", label: "💰 基本回贈 0.56%", rateModule: "sc_smart_base", usageKey: "sc_smart_monthly_eligible", unlockKey: "sc_smart_monthly_eligible", unlockTarget: 4000 },
            { type: "cap_rate", label: "⭐ 高階基本 +0.64%（合共 1.2%）", rateModule: "sc_smart_base_tier2_bonus", usageKey: "sc_smart_monthly_eligible", unlockKey: "sc_smart_monthly_eligible", unlockTarget: 15000 },
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
            { type: "cap", label: "💰 額外回贈進度", capKey: "boc_chill_bonus_cap_2026", cap: 37500, unit: "積分" }
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
        promo_type: "cap",
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
            { type: "cap", label: "🛍️ Go 指定商戶額外回贈進度", capModule: "boc_go_platinum_merchant", unit: "積分" },
            { type: "cap", label: "📱 手機簽賬額外回贈進度", capModule: "boc_go_platinum_mobile", unit: "積分" }
        ],
        capKeys: ["boc_go_platinum_merchant_bonus_cap_2026", "boc_go_platinum_mobile_bonus_cap_2026"]
    },
    {
        id: "boc_go_pmq126_offer",
        promo_type: "cap",
        name: "中銀 Go「Go！機」手機簽賬額外積分",
        icon: "fas fa-mobile-alt",
        theme: "blue",
        period_policy: {
            mode: "fixed",
            startDate: "2026-01-09",
            endDate: "2026-03-31",
            period: { type: "month", startDay: 1 }
        },
        cards: ["boc_go_diamond"],
        sections: [
            { type: "cap", label: "📱 本地/內地手機簽賬額外積分進度", capModule: "boc_go_pmq126_local_mobile_2026q1", unit: "積分" }
        ],
        capKeys: ["boc_go_pmq126_bonus_cap_2026q1"]
    },
    {
        id: "boc_go_pmq126_offer_platinum",
        promo_type: "cap",
        name: "中銀 Go Platinum「Go！機」手機簽賬額外積分",
        icon: "fas fa-mobile-alt",
        theme: "blue",
        period_policy: {
            mode: "fixed",
            startDate: "2026-01-09",
            endDate: "2026-03-31",
            period: { type: "month", startDay: 1 }
        },
        cards: ["boc_go_platinum"],
        sections: [
            { type: "cap", label: "📱 本地/內地手機簽賬額外積分進度", capModule: "boc_go_platinum_pmq126_local_mobile_2026q1", unit: "積分" }
        ],
        capKeys: ["boc_go_platinum_pmq126_bonus_cap_2026q1"]
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
        id: "wewa_cash_rebate_program",
        promo_type: "mission_cap",
        name: "WeWa 自選現金回贈",
        icon: "fas fa-wallet",
        theme: "yellow",
        period_policy: {
            mode: "recurring",
            startDate: "2025-07-01",
            endDate: "2026-06-30",
            period: { type: "month", startDay: 1 }
        },
        cards: ["wewa"],
        sections: [
            { type: "mission", label: "🎯 簽賬任務進度", missionModule: "wewa_selected_bonus" },
            { type: "cap", label: "💰 回贈進度", capModule: "wewa_selected_bonus", unit: "元", unlockModule: "wewa_selected_bonus" }
        ],
        capKeys: ["wewa_selected_bonus_cap"]
    },
    {
        id: "wewa_overseas_5pct_2026q1",
        promo_type: "mission_cap",
        name: "WeWa 海外額外 +5%",
        icon: "fas fa-globe-asia",
        theme: "yellow",
        period_policy: {
            mode: "composite",
            windows: [
                {
                    id: "stage_1",
                    startDate: "2026-01-05",
                    endDate: "2026-01-31",
                    period: { type: "promo", startDate: "2026-01-05", endDate: "2026-01-31" }
                },
                {
                    id: "stage_2",
                    startDate: "2026-02-01",
                    endDate: "2026-02-28",
                    period: { type: "promo", startDate: "2026-02-01", endDate: "2026-02-28" }
                },
                {
                    id: "stage_3",
                    startDate: "2026-03-01",
                    endDate: "2026-03-31",
                    period: { type: "promo", startDate: "2026-03-01", endDate: "2026-03-31" }
                }
            ]
        },
        cards: ["wewa"],
        sections: [
            { type: "mission", label: "🎯 階段簽賬任務進度", missionModule: "wewa_overseas_extra_2026q1" },
            { type: "cap", label: "💰 回贈進度", capModule: "wewa_overseas_extra_2026q1", unit: "元", unlockModule: "wewa_overseas_extra_2026q1" }
        ],
        capKeys: ["wewa_overseas_stage_bonus_cap"]
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
        id: "bea_goal_2025_2026h1",
        promo_type: "mission_cap",
        name: "BEA GOAL 額外現金回贈",
        icon: "fas fa-bullseye",
        theme: "gray",
        period_policy: {
            mode: "recurring",
            startDate: "2025-01-01",
            endDate: "2026-06-30",
            period: { type: "month", startDay: 1 }
        },
        cards: ["bea_goal"],
        sections: [
            { type: "mission", label: "🎯 簽賬任務進度", missionModule: "bea_goal_travel_transport" },
            { type: "cap", label: "💰 額外回贈進度", capModule: "bea_goal_travel_transport", unit: "$", unlockModule: "bea_goal_travel_transport" }
        ],
        capKeys: ["bea_goal_cap"]
    },
    {
        id: "bea_world_spending_2025_2026h1",
        promo_type: "mission_cap",
        name: "BEA World Spending Points 12.5X",
        icon: "fas fa-globe-asia",
        theme: "gray",
        period_policy: {
            mode: "recurring",
            startDate: "2025-01-01",
            endDate: "2026-06-30",
            period: { type: "month", startDay: 1 }
        },
        cards: ["bea_world", "bea_world_privilege"],
        sections: [
            { type: "mission", label: "🎯 簽賬任務進度", missionModule: "bea_world_bonus" },
            { type: "cap", label: "💰 額外積分進度", capModule: "bea_world_bonus", unit: "BEA分", unlockModule: "bea_world_bonus" }
        ],
        capKeys: ["bea_world_cap"]
    },
    {
        id: "bea_world_flying_2025_2026h1",
        promo_type: "mission_cap",
        name: "BEA World BEA Flying Miles",
        icon: "fas fa-plane",
        theme: "gray",
        period_policy: {
            mode: "recurring",
            startDate: "2025-01-01",
            endDate: "2026-06-30",
            period: { type: "month", startDay: 1 }
        },
        cards: ["bea_world", "bea_world_privilege"],
        sections: [
            { type: "mission", label: "🎯 簽賬任務進度", missionModule: "bea_world_flying_overseas" },
            { type: "cap", label: "✈️ 飛行里數積分進度", capModule: "bea_world_flying_overseas", unit: "BEA分", unlockModule: "bea_world_flying_overseas" }
        ],
        capKeys: ["bea_world_flying_cap"]
    },
    {
        id: "bea_ititanium_2025_2026",
        promo_type: "mission_cap",
        name: "BEA i-Titanium 網上零售/手機支付",
        icon: "fas fa-mobile-alt",
        theme: "gray",
        period_policy: {
            mode: "recurring",
            startDate: "2025-01-01",
            endDate: "2026-12-31",
            period: { type: "month", startDay: 1 }
        },
        cards: ["bea_ititanium"],
        sections: [
            { type: "mission", label: "🎯 簽賬任務進度", missionModule: "bea_ititanium_online_mobile" },
            { type: "cap", label: "💰 額外回贈進度", capModule: "bea_ititanium_online_mobile", unit: "i-Dollar", unlockModule: "bea_ititanium_online_mobile" }
        ],
        capKeys: ["bea_ititanium_cap"]
    },
    {
        id: "bea_unionpay_diamond_2025_2026h1",
        promo_type: "cap",
        name: "BEA 銀聯雙幣鑽石 額外積分",
        icon: "fas fa-gem",
        theme: "gray",
        period_policy: {
            mode: "recurring",
            startDate: "2025-01-01",
            endDate: "2026-06-30",
            period: { type: "month", startDay: 1 }
        },
        cards: ["bea_unionpay_diamond"],
        sections: [
            { type: "cap", label: "💰 額外積分進度", capModule: "bea_unionpay_rmb", unit: "BEA分" }
        ],
        capKeys: ["bea_unionpay_cap"]
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
        promo_type: "multi_cap",
        name: "sim Credit 現金回贈推廣",
        icon: "fas fa-percent",
        theme: "green",
        period_policy: {
            mode: "fixed",
            startDate: "2026-02-01",
            endDate: "2026-04-30",
            period: { type: "month", startDay: 1 }
        },
        cards: ["sim_credit"],
        sections: [
            { type: "mission", label: "🎯 簽賬任務進度", missionModule: "sim_online" },
            { type: "cap", label: "💰 每月額外回贈進度", capModule: "sim_online", unit: "元", unlockModule: "sim_online" },
            { type: "cap", label: "🧮 推廣期額外回贈進度", capKey: "sim_promo_cap_total", cap: 600, unit: "元", unlockModule: "sim_online" }
        ],
        capKeys: ["sim_promo_cap_monthly"]
    },
    {
        id: "sim_world_promo",
        promo_type: "multi_cap",
        name: "sim World 現金回贈推廣",
        icon: "fas fa-globe-asia",
        theme: "green",
        period_policy: {
            mode: "fixed",
            startDate: "2026-02-01",
            endDate: "2026-04-30",
            period: { type: "month", startDay: 1 }
        },
        cards: ["sim_world"],
        sections: [
            { type: "mission", label: "🎯 簽賬任務進度", missionModule: "sim_world_online" },
            { type: "cap", label: "💰 每月額外回贈進度", capModule: "sim_world_online", unit: "元", unlockModule: "sim_world_online" },
            { type: "cap", label: "🧮 推廣期額外回贈進度", capKey: "sim_world_promo_cap_total", cap: 600, unit: "元", unlockModule: "sim_world_online" }
        ],
        capKeys: ["sim_world_promo_cap_monthly"]
    },
    {
        id: "aeon_wakuwaku_2025_2026",
        promo_type: "cap",
        name: "AEON WAKUWAKU 額外回贈",
        icon: "fas fa-star",
        theme: "purple",
        period_policy: {
            mode: "fixed",
            startDate: "2025-05-01",
            endDate: "2026-02-28",
            period: { type: "month", startDay: 1 }
        },
        cards: ["aeon_wakuwaku"],
        sections: [
            { type: "cap", label: "💰 每月額外回贈進度", capModule: "aeon_waku_online", unit: "元" }
        ],
        capKeys: ["aeon_waku_bonus_cap"]
    },
    {
        id: "aeon_upi_travel_2026",
        promo_type: "multi_cap",
        name: "AEON銀聯卡．「賞」遊世界",
        icon: "fas fa-globe-asia",
        theme: "purple",
        period_policy: {
            mode: "fixed",
            startDate: "2026-02-01",
            endDate: "2026-04-30",
            period: { type: "month", startDay: 1 }
        },
        cards: ["aeon_purple_unionpay", "aeon_premium_unionpay"],
        sections: [
            { type: "cap", label: "🇨🇳 內地/澳門/台灣 額外回贈進度", capKey: "aeon_upi_cn_mo_tw_bonus_cap", cap: 100, unit: "元" },
            { type: "cap", label: "🌍 其他海外/外幣 額外回贈進度", capKey: "aeon_upi_overseas_bonus_cap", cap: 100, unit: "元" }
        ],
        capKeys: ["aeon_upi_cn_mo_tw_bonus_cap", "aeon_upi_overseas_bonus_cap"]
    },
    {
        id: "aeon_jcb_japan_promo_2026",
        promo_type: "cap",
        name: "AEON JCB賞瀛．《「日」常有賞》",
        icon: "fas fa-yen-sign",
        theme: "purple",
        period_policy: {
            mode: "fixed",
            startDate: "2026-03-01",
            endDate: "2026-08-31",
            period: { type: "promo", startDate: "2026-03-01", endDate: "2026-08-31" }
        },
        cards: ["aeon_purple_jcb"],
        sections: [
            { type: "cap", label: "🇯🇵 日本簽賬免手續費進度（推廣期）", capKey: "aeon_jcb_jpy_fcf_waiver_cap", cap: 117, unit: "元" }
        ],
        capKeys: ["aeon_jcb_jpy_fcf_waiver_cap"]
    }
];

// Special lifecycle models rendered by dedicated UI blocks (not standard campaign sections yet).
const SPECIAL_PROMO_MODELS = {
    travel_guru: {
        id: "travel_guru",
        promo_type: "level_lifecycle",
        module: "travel_guru_v2",
        registrationSettingKey: "travel_guru_registered",
        tncUrl: "https://www.redhotoffers.hsbc.com.hk/media/100531673/TC_TC_Spending-Requirements-and-Offers-for-Travel-Guru-Membership-Programme_20260101.pdf",
        promoUrl: "https://www.redhotoffers.hsbc.com.hk/tc/latest-offers/travel-guru/",
        registrationUrl: "https://forms.hsbc.com.hk/en-hk/travelgururegistration/",
        registrationStart: "2025-06-16",
        registrationEnd: "2025-10-31",
        registrationNote: "分階段登記：2025-06-16至07-03、09-01至09-30、10-01至10-31",
        implementationNote: "計算器做法：登記後可啟動 GO 級，之後海外合資格簽賬按等級計算（GO 額外 3% 上限 500 RC、GING 額外 4% 上限 1,200 RC、GURU 額外 6% 上限 2,200 RC）；每級累積簽賬達升級門檻（GO 30,000；GING 70,000）可升下一級，升級後會重置該級進度。",
        unlockSpend: 8000,
        unlockSpendKey: "spend_guru_unlock",
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
