// js/data_cards.js

const cardsDB = [
    {
        id: "hsbc_everymile",
        name: "HSBC EveryMile",
        currency: "HSBC_RC_EM",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["em_base", "em_designated", "em_grocery_low", "em_overseas_bonus", "travel_guru_v2"],
        trackers: ["em_overseas_mission"],
        redemption: {
          unit: "RC",
          min: 40,
          fee: "免費",
          ratio: "1 RC = 20 里"
        }
    },
    {
        id: "hsbc_vs",
        name: "HSBC Visa Signature",
        currency: "HSBC_RC",
        type: "visa",
        fcf: 0.0195,
        rewardModules: ["vs_base", "vs_red_hot_bonus", "red_hot_variable", "travel_guru_v2"],
        trackers: ["winter_tracker"],
        redemption: {
          unit: "RC",
          min: 40,
          fee: "免費",
          ratio: "1 RC = 10 里"
        }
    },
    {
        id: "hsbc_red",
        name: "HSBC Red Card",
        currency: "HSBC_RC",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["red_base", "red_online", "red_designated_bonus", "travel_guru_v2"],
        trackers: ["winter_tracker"]
    },
    {
      id: "hsbc_pulse",
      name: "HSBC Pulse 銀聯鑽石",
      currency: "HSBC_RC",
      type: "unionpay",
      fcf: 0,
      // Mainland China + Macau are fee-free; other foreign spend uses the card's fcf.
      fcf_exempt_categories: ["overseas_cn", "overseas_mo", "china_consumption"],
      rewardModules: ["hsbc_std_base", "red_hot_variable", "pulse_china_bonus", "travel_guru_v2"],
      trackers: ["winter_tracker"]
    },
    {
      id: "hsbc_unionpay_std",
      name: "HSBC 銀聯雙幣 (標準)",
      currency: "HSBC_RC",
      type: "unionpay",
      fcf: 0,
      // Mainland China + Macau are fee-free; other foreign spend uses the card's fcf.
      fcf_exempt_categories: ["overseas_cn", "overseas_mo", "china_consumption"],
      rewardModules: ["hsbc_std_base", "red_hot_variable", "travel_guru_v2"],
      trackers: ["winter_tracker"]
    },
    {
        id: "hsbc_easy",
        name: "HSBC Easy Card (白金)",
        currency: "HSBC_RC",
        type: "visa",
        fcf: 0.0195,
        rewardModules: [
            "hsbc_std_base",
            "red_hot_variable",
            "easy_moneyback_pns_watsons_6x",
            "easy_moneyback_fortress_6x",
            "easy_moneyback_bonus", // legacy: support already-recorded transactions
            "travel_guru_v2"
        ],
        trackers: ["winter_tracker"]
    },
    {
        id: "hsbc_gold_student",
        name: "HSBC 金卡 (學生)",
        currency: "HSBC_RC",
        type: "visa",
        fcf: 0.0195,
        rewardModules: ["hsbc_std_base", "red_hot_variable", "student_tuition_bonus", "travel_guru_v2"],
        trackers: ["winter_tracker"]
    },
    {
        id: "hsbc_gold",
        name: "HSBC 滙財金卡",
        currency: "HSBC_RC",
        type: "visa",
        fcf: 0.0195,
        rewardModules: ["hsbc_std_base", "red_hot_variable", "travel_guru_v2"],
        trackers: ["winter_tracker"]
    },
    {
        id: "hsbc_premier",
        name: "HSBC Premier (卓越理財)",
        currency: "HSBC_RC",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["hsbc_std_base", "red_hot_variable", "travel_guru_v2"],
        trackers: ["winter_tracker"]
    },
    {
        id: "sc_cathay_std",
        name: "SC 國泰 Mastercard",
        currency: "AM_Direct",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["sc_cathay_base", "sc_cathay_dining_hotel", "sc_cathay_overseas_std", "sc_cathay_airlines"],
        trackers: ["sc_cathay_cxuo_tracker"]
    },
    {
        id: "sc_cathay_priority",
        name: "SC 國泰 (優先理財)",
        currency: "AM_Direct",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["sc_cathay_base", "sc_cathay_dining_hotel", "sc_cathay_overseas_priority", "sc_cathay_airlines"],
        trackers: ["sc_cathay_cxuo_tracker"]
    },
    {
        id: "sc_cathay_private",
        name: "SC 國泰 (優先私人)",
        currency: "AM_Direct",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["sc_cathay_base", "sc_cathay_dining_hotel", "sc_cathay_overseas_private", "sc_cathay_airlines"],
        trackers: ["sc_cathay_cxuo_tracker"]
    },
    {
        id: "sc_simply_cash",
        name: "SC Simply Cash Visa",
        currency: "CASH_Direct",
        type: "visa",
        fcf: 0.0195,
        rewardModules: ["sc_simply_cash_base", "sc_simply_cash_foreign"],
        trackers: []
    },
    {
        id: "sc_smart",
        name: "SC Smart Card",
        currency: "CASH_Direct",
        type: "visa",
        fcf: 0,
        rewardModules: ["sc_smart_base", "sc_smart_base_tier2_bonus", "sc_smart_designated", "sc_smart_designated_tier2_adjust"],
        trackers: ["sc_smart_monthly_tracker"]
    },
    {
        id: "citi_pm",
        name: "Citi PremierMiles",
        currency: "CITI_PM_PTS",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["citi_pm_base", "citi_pm_overseas"],
        trackers: [],
        redemption: {
          unit: "積分",
          min: 12000,
          fee: "免費",
          ratio: "12分 = 1里"
        }
    },
    {
        id: "citi_prestige",
        name: "Citi Prestige",
        currency: "CITI_PM_PTS",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["citi_prestige_base", "citi_prestige_overseas", "citi_prestige_annual_bonus"],
        trackers: [],
        redemption: {
          unit: "積分",
          min: 12000,
          fee: "免費",
          ratio: "12分 = 1里"
        }
    },
    {
        id: "citi_rewards",
        name: "Citi Rewards",
        currency: "CITI_R_PTS",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["citi_rewards_base", "citi_rewards_mobile", "citi_rewards_shopping"],
        trackers: [],
        redemption: {
          unit: "積分",
          min: 18000,
          fee: "HK$200/兌換",
          ratio: "15分 = 1里"
        }
    },
    {
        id: "citi_club",
        name: "Citi The Club",
        currency: "CLUB_PTS",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["citi_club_base", "citi_club_designated", "citi_club_shopping_bonus", "citi_club_telecom_autopay"],
        trackers: [],
        redemption: {
          unit: "The Club積分",
          min: 5,
          fee: "免費",
          ratio: "5積分 = HK$1"
        }
    },
    {
        id: "citi_cashback",
        name: "Citi Cash Back",
        currency: "CASH_Direct",
        type: "visa",
        fcf: 0.0195,
        rewardModules: ["citi_cb_base", "citi_cb_special"],
        trackers: []
    },
    {
        id: "citi_octopus",
        name: "Citi Octopus 白金",
        currency: "CASH_Direct",
        type: "visa",
        fcf: 0.0195,
        rewardModules: ["citi_octopus_base", "citi_octopus_transport_tier2", "citi_octopus_transport_tier1", "citi_octopus_tunnel"],
        trackers: []
    },
    {
        id: "dbs_black",
        name: "DBS Black World",
        currency: "DBS_Dollar",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["dbs_black_overseas_promo", "dbs_black_overseas_std", "dbs_black_base"],
        trackers: ["dbs_black_qual_non_ewallet_tracker", "dbs_black_qual_ewallet_tracker"],
        redemption: {
          unit: "DBS$",
          min: 0,
          fee: "免費 (Black專享)",
          ratio: "DBS$48 = 1,000里"
        }
    },
    {
        id: "dbs_eminent",
        name: "DBS Eminent Visa",
        currency: "DBS_Dollar_Others",
        type: "visa",
        fcf: 0.0195,
        rewardModules: ["dbs_eminent_bonus", "dbs_eminent_base"],
        trackers: [],
        redemption: {
          unit: "DBS$",
          min: 0,
          fee: "HK$100/5,000里",
          ratio: "DBS$72 = 1,000里 或 DBS$1 = $1"
        }
    },
    {
        id: "dbs_compass",
        name: "DBS COMPASS VISA",
        currency: "COMPASS_Dollar",
        type: "visa",
        fcf: 0.0195,
        rewardModules: ["dbs_compass_grocery_wed", "dbs_compass_ewallet", "dbs_compass_base"],
        trackers: [],
        redemption: {
          unit: "CD",
          min: 0,
          fee: "HK$100/5,000里",
          ratio: "$100 CD = 1,000里 或 $1 CD = $1"
        }
    },
    {
        id: "dbs_live_fresh",
        name: "DBS Live Fresh",
        currency: "DBS_Dollar_Others",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["dbs_live_fresh_selected", "dbs_live_fresh_online_foreign", "dbs_live_fresh_base"],
        trackers: [],
        redemption: {
          unit: "DBS$",
          min: 0,
          fee: "HK$100/5,000里",
          ratio: "DBS$72 = 1,000里 或 DBS$1 = $1"
        }
    },
    {
        id: "hangseng_mmpower",
        name: "Hang Seng MMPower",
        currency: "Fun_Dollars",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["hangseng_base", "mmpower_overseas_bonus", "mmpower_online_bonus", "mmpower_selected_bonus"],
        trackers: [],
        redemption: {
          unit: "+FUN Dollar",
          min: 0,
          fee: "免費",
          ratio: "$1 +FUN = $1"
        }
    },
    {
        id: "hangseng_travel_plus",
        name: "Hang Seng Travel+",
        currency: "Fun_Dollars",
        type: "visa",
        fcf: 0.0195,
        rewardModules: ["hangseng_base", "travel_plus_tier1_bonus", "travel_plus_tier2_bonus", "travel_plus_dining_bonus"],
        trackers: [],
        redemption: {
          unit: "+FUN Dollar",
          min: 0,
          fee: "免費",
          ratio: "$1 +FUN = $1"
        }
    },
    {
        id: "hangseng_university",
        name: "Hang Seng University",
        currency: "Fun_Dollars",
        type: "visa",
        fcf: 0.0195,
        rewardModules: ["hangseng_base", "university_tuition"],
        trackers: [],
        redemption: {
          unit: "+FUN Dollar",
          min: 0,
          fee: "免費",
          ratio: "$1 +FUN = $1"
        }
    },
    {
        id: "hangseng_enjoy",
        name: "Hang Seng enJoy",
        currency: "YUU_Points",
        type: "visa",
        fcf: 0.0195,
        rewardModules: ["enjoy_base", "enjoy_4x", "enjoy_3x", "enjoy_2x", "enjoy_dining", "enjoy_retail"],
        trackers: [],
        redemption: {
          unit: "YUU",
          min: 0,
          fee: "免費",
          ratio: "200分 = $1"
        }
    },
    {
        id: "boc_cheers_vi",
        name: "中銀 Cheers Visa Infinite",
        currency: "BOC_Points",
        type: "visa",
        fcf: 0.0195,
        rewardModules: ["boc_cheers_base", "boc_cheers_dining", "boc_cheers_travel", "boc_amazing_fly_cn", "boc_amazing_fly_other", "boc_cheers_overseas", "boc_amazing_weekday", "boc_amazing_holiday", "boc_amazing_online_weekday", "boc_amazing_online_holiday"],
        trackers: [],
        redemption: {
          unit: "積分",
          min: 0,
          fee: "免手續費 ✅",
          ratio: "15分 = 1里 | 餐飲: 10X (Cap 100k) | 旅遊/外幣: 10X (Cap 250k)"
        }
    },
    {
        id: "boc_cheers_vs",
        name: "中銀 Cheers Visa Signature",
        currency: "BOC_Points",
        type: "visa",
        fcf: 0.0195,
        rewardModules: ["boc_cheers_base", "boc_cheers_dining_vs", "boc_cheers_travel_vs", "boc_amazing_fly_cn_vs", "boc_amazing_fly_other_vs", "boc_cheers_overseas_vs", "boc_amazing_weekday_vs", "boc_amazing_holiday_vs", "boc_amazing_online_weekday_vs", "boc_amazing_online_holiday_vs"],
        trackers: [],
        redemption: {
          unit: "積分",
          min: 0,
          fee: "免手續費 ✅",
          ratio: "15分 = 1里 | 餐飲: 8X (Cap 60k) | 旅遊/外幣: 8X (Cap 150k)"
        }
    },
    {
        id: "boc_chill",
        name: "中銀 Chill Card",
        currency: "BOC_Points",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["boc_chill_base", "boc_chill_merchant", "boc_chill_online_overseas"],
        trackers: [],
        redemption: {
          unit: "積分",
          min: 0,
          fee: "$50/5K里（最低$100，最高$300）",
          ratio: "15分 = 1里 | Chill商戶: 10X | 網購/海外: 5X | 共用 15k分/月上限"
        }
    },
    {
        id: "boc_go_diamond",
        name: "中銀 Go UnionPay Diamond",
        currency: "BOC_Points",
        type: "unionpay",
        fcf: 0,
        rewardModules: ["boc_go_base", "boc_go_mobile", "boc_go_merchant"],
        trackers: [],
        redemption: {
          unit: "積分",
          min: 0,
          fee: "$50/5K里（最低$100，最高$300）",
          ratio: "15分 = 1里 | 手機支付: 4X (上限10k分/月) | Go商戶: 5X (上限10k分/月)"
        }
    },
    {
        id: "boc_sogo",
        name: "中銀 Sogo Visa Signature",
        currency: "CASH_Direct",
        type: "visa",
        fcf: 0.0195,
        rewardModules: ["boc_sogo_mobile_pay"],
        trackers: []
    },
    {
        id: "ae_explorer",
        name: "AE Explorer",
        currency: "AE_MR",
        type: "ae",
        fcf: 0.02,
        rewardModules: ["ae_explorer_base", "ae_explorer_overseas", "ae_explorer_selected"],
        trackers: [],
        redemption: {
          unit: "積分",
          min: 0,
          fee: "免費",
          ratio: "18分 = 1里 | 海外: 10.75X | 指定旅遊: 12X"
        }
    },
    {
        id: "ae_platinum",
        name: "AE Platinum (細頭)",
        currency: "AE_MR",
        type: "ae",
        fcf: 0.02,
        rewardModules: ["ae_plat_base", "ae_plat_overseas", "ae_plat_travel", "ae_plat_daily"],
        trackers: [],
        redemption: {
          unit: "積分",
          min: 0,
          fee: "免費",
          ratio: "18分 = 1里 | Turbo: 2X | Accelerator: +5X/7X"
        }
    },
    {
        id: "ae_platinum_credit",
        name: "AE Platinum Credit (大頭)",
        currency: "AE_MR",
        type: "ae",
        fcf: 0.02,
        rewardModules: ["ae_pcc_base", "ae_pcc_special"],
        trackers: [],
        redemption: {
          unit: "積分",
          min: 0,
          fee: "免費",
          ratio: "18分 = 1里 | 超市/油站: 6X (Double Points)"
        }
    },
    {
        id: "ae_blue_cash",
        name: "AE Blue Cash",
        currency: "CASH_Direct",
        type: "ae",
        fcf: 0.02,
        rewardModules: ["ae_blue_cash_base"],
        trackers: [],
        redemption: {
          unit: "現金",
          min: 0,
          fee: "免費",
          ratio: "1.2% 回贈"
        }
    },
    {
        id: "fubon_in_platinum",
        name: "Fubon iN Visa Platinum",
        currency: "Fubon_Points",
        type: "visa",
        fcf: 0.0195,
        rewardModules: ["fubon_in_base", "fubon_in_online"],
        trackers: [],
        redemption: {
          unit: "積分",
          min: 0,
          fee: "HK$50/5000里",
          ratio: "15分 = 1里 | 250分 = $1"
        }
    },
    {
        id: "fubon_travel",
        name: "Fubon Platinum/Titanium",
        currency: "Fubon_Points",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["fubon_travel_base", "fubon_travel_tw", "fubon_travel_jpkr", "fubon_travel_euro"],
        trackers: [],
        redemption: {
          unit: "積分",
          min: 0,
          fee: "HK$50/5000里",
          ratio: "15分 = 1里 | 20X = $1.33/里"
        }
    },
    {
        id: "sim_credit",
        name: "sim Credit Card",
        currency: "CASH_Direct",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["sim_base", "sim_online"],
        trackers: ["sim_non_online_tracker"],
        redemption: {
          unit: "現金",
          min: 0,
          fee: "免費",
          ratio: "網購 8% (需非網購$500)"
        }
    },
    {
        id: "aeon_wakuwaku",
        name: "AEON WAKUWAKU",
        currency: "CASH_Direct",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["aeon_waku_base", "aeon_waku_online", "aeon_waku_japan"],
        trackers: [],
        redemption: {
          unit: "現金",
          min: 0,
          fee: "免費",
          ratio: "網購 6% | 日本 3%"
        }
    },
    {
        id: "wewa",
        name: "安信 WeWa UnionPay",
        currency: "CASH_Direct",
        type: "unionpay",
        fcf: 0,
        rewardModules: ["wewa_base", "wewa_bonus", "wewa_mobile_pay"],
        trackers: ["wewa_mobile_mission"],
        redemption: {
          unit: "現金",
          min: 0,
          fee: "免費",
          ratio: "旅遊/主題公園 4%"
        }
    },
    {
        id: "earnmore",
        name: "EarnMORE 銀聯",
        currency: "CASH_Direct",
        type: "unionpay",
        fcf: 0,
        rewardModules: ["earnmore_base"],
        trackers: []
    },
    {
        id: "mox_credit",
        name: "Mox Credit",
        currency: "CASH_Direct",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["mox_base", "mox_task_bonus", "mox_supermarket"],
        trackers: []
    },
    {
        id: "bea_goal",
        name: "BEA GOAL",
        currency: "CASH_Direct",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["bea_goal_base", "bea_goal_travel_transport", "bea_goal_entertainment", "bea_goal_online_mobile"],
        trackers: ["bea_goal_mission"]
    },
    {
        id: "bea_world",
        name: "BEA World Mastercard",
        currency: "BEA_Points",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["bea_world_base", "bea_world_bonus"],
        trackers: ["bea_world_mission"],
        redemption: {
          unit: "BEA分",
          min: 0,
          fee: "無",
          ratio: "250分 = $1"
        }
    },
    {
        id: "bea_world_privilege",
        name: "BEA 顯卓理財 World Mastercard",
        currency: "BEA_Points",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["bea_world_base", "bea_world_bonus"],
        trackers: ["bea_world_mission"],
        redemption: {
          unit: "BEA分",
          min: 0,
          fee: "無",
          ratio: "250分 = $1"
        }
    },
    {
        id: "bea_ititanium",
        name: "BEA i-Titanium",
        currency: "BEA_iDollar",
        type: "visa",
        fcf: 0.0195,
        rewardModules: ["bea_ititanium_base", "bea_ititanium_online_mobile"],
        trackers: ["bea_ititanium_mission"],
        redemption: {
          unit: "i-Dollar",
          min: 0,
          fee: "無",
          ratio: "1 i-Dollar = $1"
        }
    },
    {
        id: "bea_unionpay_diamond",
        name: "BEA 銀聯雙幣鑽石",
        currency: "BEA_Points",
        type: "unionpay",
        fcf: 0,
        rewardModules: ["bea_unionpay_base", "bea_unionpay_rmb", "bea_unionpay_fx", "bea_unionpay_dining", "bea_unionpay_local"],
        trackers: [],
        redemption: {
          unit: "BEA分",
          min: 0,
          fee: "無",
          ratio: "250分 = $1"
        }
    }
];
