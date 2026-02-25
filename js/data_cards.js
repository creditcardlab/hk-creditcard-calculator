// js/data_cards.js

const cardsDB = [
    {
        id: "hsbc_everymile",
        name: "HSBC EveryMile",
        currency: "HSBC_RC_EM",
        type: "master",
        fcf: 0.0195,
        last_verified_at: "2026-02-12",
        source_url: "https://www.redhotoffers.hsbc.com.hk/tc/latest-offers/everymile-spending-offer/, https://www.hsbc.com.hk/content/dam/hsbc/hk/docs/credit-cards/everymile/everymile-everyday-spend.pdf",
        rewardModules: ["em_base", "em_designated", "em_grocery_low", "em_overseas_bonus", "travel_guru_v2"],
        trackers: ["em_overseas_mission"],
        redemption: {
          unit: "RC",
          min: 40,
          fee: "免費",
          ratio: "1 RC = 20 里 | 基本 1% | 主要額外：串流/訂閱/EveryMile 指定 2.5% + 超市 0.4% | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "hsbc_vs",
        name: "HSBC Visa Signature",
        currency: "HSBC_RC",
        type: "visa",
        fcf: 0.0195,
        last_verified_at: "2026-02-05",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/docs/credit-cards/visa-signature/special-reward-tnc.pdf",
        rewardModules: ["vs_base", "vs_red_hot_bonus", "red_hot_variable", "travel_guru_v2"],
        trackers: ["winter_tracker"],
        redemption: {
          unit: "RC",
          min: 40,
          fee: "免費",
          ratio: "1 RC = 10 里 | 基本 0.4% | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "hsbc_red",
        name: "HSBC Red Card",
        currency: "HSBC_RC",
        type: "master",
        fcf: 0.0195,
        last_verified_at: "2026-02-06",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/reward-scheme-terms-and-conditions.pdf",
        rewardModules: ["red_base", "red_online", "red_designated_bonus", "red_designated_online_overflow_bonus", "red_mcd_stamp_cashback", "travel_guru_v2"],
        trackers: ["winter_tracker", "red_mcd_stamp_tracker"],
        redemption: {
          unit: "RC",
          min: 40,
          fee: "免費",
          ratio: "1 RC = 10 里 | 基本 0.4% | 任務/上限/重置見進度卡"
        }
    },
    {
      id: "hsbc_pulse",
      name: "HSBC Pulse 銀聯鑽石",
      currency: "HSBC_RC",
      type: "unionpay",
      fcf: 0.01,
      note_zhhk: "人民幣、港幣及澳門幣以外簽賬收取 1% 外幣手續費；中國內地及澳門簽賬視作豁免類別",
      last_verified_at: "2026-02-06",
      source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/unionpay-dual-currency/diamond-card-terms-and-conditions.pdf",
      // Mainland China + Macau are fee-free; other foreign spend uses the card's fcf.
      fcf_exempt_categories: ["overseas_cn", "overseas_mo", "china_consumption"],
      rewardModules: ["hsbc_std_base", "red_hot_variable", "pulse_china_bonus", "travel_guru_v2"],
      trackers: ["winter_tracker"],
      redemption: {
        unit: "RC",
        min: 40,
        fee: "免費",
        ratio: "1 RC = 10 里 | 基本 0.4% | 任務/上限/重置見進度卡"
      }
    },
    {
      id: "hsbc_unionpay_std",
      name: "HSBC 銀聯雙幣 (標準)",
      currency: "HSBC_RC",
      type: "unionpay",
      fcf: 0.01,
      note_zhhk: "港幣及人民幣以外簽賬收取 1% 外幣手續費；中國內地簽賬視作豁免類別",
      last_verified_at: "2026-02-06",
      source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/unionpay-dual-currency/diamond-card-terms-and-conditions.pdf",
      // Mainland China is fee-free; other foreign spend (including Macau bucket) uses the card's fcf.
      fcf_exempt_categories: ["overseas_cn", "china_consumption"],
      rewardModules: ["hsbc_std_base", "red_hot_variable", "travel_guru_v2"],
      trackers: ["winter_tracker"],
      redemption: {
        unit: "RC",
        min: 40,
        fee: "免費",
        ratio: "1 RC = 10 里 | 基本 0.4% | 任務/上限/重置見進度卡"
      }
    },
    {
        id: "hsbc_easy",
        name: "HSBC Easy Card (白金)",
        currency: "HSBC_RC",
        type: "visa",
        fcf: 0.0195,
        last_verified_at: "2026-02-06",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/visa-platinum-card-exclusive-offers.pdf, https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/visa-platinum-exclusive-additional-offers.pdf",
        rewardModules: [
            "hsbc_std_base",
            "red_hot_variable",
            "easy_moneyback_pns_watsons_4x",
            "easy_moneyback_pns_watsons_6x",
            "easy_moneyback_fortress_4x",
            "easy_moneyback_fortress_6x",
            "easy_additional_offer_3x",
            "easy_moneyback_bonus", // legacy: support already-recorded transactions
            "travel_guru_v2"
        ],
        trackers: ["winter_tracker"],
        redemption: {
          unit: "RC",
          min: 40,
          fee: "免費",
          ratio: "1 RC = 10 里 | 基本 0.4% | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "hsbc_gold_student",
        name: "HSBC 金卡 (學生)",
        currency: "HSBC_RC",
        type: "visa",
        fcf: 0.0195,
        last_verified_at: "2026-02-06",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/reward-scheme-terms-and-conditions.pdf",
        rewardModules: ["hsbc_std_base", "red_hot_variable", "student_tuition_bonus", "travel_guru_v2"],
        trackers: ["winter_tracker"],
        redemption: {
          unit: "RC",
          min: 40,
          fee: "免費",
          ratio: "1 RC = 10 里 | 基本 0.4% | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "hsbc_gold",
        name: "HSBC 滙財金卡",
        currency: "HSBC_RC",
        type: "visa",
        fcf: 0.0195,
        last_verified_at: "2026-02-06",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/reward-scheme-terms-and-conditions.pdf",
        rewardModules: ["hsbc_std_base", "red_hot_variable", "travel_guru_v2"],
        trackers: ["winter_tracker"],
        redemption: {
          unit: "RC",
          min: 40,
          fee: "免費",
          ratio: "1 RC = 10 里 | 基本 0.4% | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "hsbc_premier",
        name: "HSBC Premier (卓越理財)",
        currency: "HSBC_RC",
        type: "master",
        fcf: 0.0195,
        last_verified_at: "2026-02-06",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/reward-scheme-terms-and-conditions.pdf",
        rewardModules: ["hsbc_std_base", "red_hot_variable", "travel_guru_v2"],
        trackers: ["winter_tracker"],
        redemption: {
          unit: "RC",
          min: 40,
          fee: "免費",
          ratio: "1 RC = 10 里 | 基本 0.4% | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "sc_cathay_std",
        name: "SC 國泰 Mastercard",
        currency: "AM_Direct",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["sc_cathay_base", "sc_cathay_dining_hotel", "sc_cathay_overseas_std", "sc_cathay_overseas_spending_offer_2026q2", "sc_cathay_airlines"],
        trackers: ["sc_cathay_cxuo_tracker", "sc_cathay_overseas_spend_offer_tracker_2026q2"],
        redemption: {
          unit: "里",
          min: 0,
          fee: "免費",
          ratio: "基本 $6/里 | 主要額外：餐飲/酒店/海外 $4/里 + 國泰/HK Express 額外每 $8,000 +2,667 里 | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "sc_cathay_priority",
        name: "SC 國泰 (優先理財)",
        currency: "AM_Direct",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["sc_cathay_base", "sc_cathay_dining_hotel", "sc_cathay_overseas_priority", "sc_cathay_overseas_spending_offer_2026q2", "sc_cathay_airlines"],
        trackers: ["sc_cathay_cxuo_tracker", "sc_cathay_overseas_spend_offer_tracker_2026q2"],
        redemption: {
          unit: "里",
          min: 0,
          fee: "免費",
          ratio: "基本 $6/里 | 主要額外：餐飲/酒店 $4/里 + 海外 $3/里 + 國泰/HK Express 額外每 $8,000 +2,667 里 | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "sc_cathay_private",
        name: "SC 國泰 (優先私人)",
        currency: "AM_Direct",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["sc_cathay_base", "sc_cathay_dining_hotel", "sc_cathay_overseas_private", "sc_cathay_overseas_spending_offer_2026q2", "sc_cathay_airlines"],
        trackers: ["sc_cathay_cxuo_tracker", "sc_cathay_overseas_spend_offer_tracker_2026q2"],
        redemption: {
          unit: "里",
          min: 0,
          fee: "免費",
          ratio: "基本 $6/里 | 主要額外：餐飲/酒店 $4/里 + 海外 $2/里 + 國泰/HK Express 額外每 $8,000 +2,667 里 | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "sc_simply_cash",
        name: "SC Simply Cash Visa",
        currency: "CASH_Direct",
        type: "visa",
        fcf: 0.0195,
        rewardModules: ["sc_simply_cash_base", "sc_simply_cash_foreign"],
        trackers: [],
        redemption: {
          unit: "$",
          min: 0,
          fee: "免費",
          ratio: "基本 1.5% | 主要額外：外幣 2% | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "sc_smart",
        name: "SC Smart Card",
        currency: "CASH_Direct",
        type: "visa",
        fcf: 0,
        rewardModules: ["sc_smart_base", "sc_smart_base_tier2_bonus", "sc_smart_designated", "sc_smart_designated_tier2_adjust"],
        trackers: ["sc_smart_monthly_tracker"],
        redemption: {
          unit: "$",
          min: 0,
          fee: "免費",
          ratio: "基本 0.56% | 主要額外：指定商戶額外 4.4% + 月簽滿 $15,000 額外 0.64% | 任務/上限/重置見進度卡"
        }
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
          ratio: "12分 = 1里 | 基本每 $1 賺 1.5 積分 (0.6%) | 主要額外：海外每 $1 賺 3 積分 | 任務/上限/重置見進度卡"
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
          ratio: "12分 = 1里 | 基本每 $1 賺 2 積分 (0.8%) | 主要額外：海外每 $1 賺 3 積分 | 任務/上限/重置見進度卡"
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
          ratio: "15分 = 1里 | 基本每 $1 賺 1 積分 (0.4%) | 主要額外：購物/娛樂額外每 $1 +7.1 積分 + 流動支付額外每 $1 +1.7 積分 | 任務/上限/重置見進度卡"
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
          ratio: "5積分 = HK$1 | 基本 1% | 主要額外：The Club 指定商戶額外 3% + The Club 電訊 總回贈 3% | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "citi_cashback",
        name: "Citi Cash Back",
        currency: "CASH_Direct",
        type: "visa",
        fcf: 0.0195,
        rewardModules: ["citi_cb_base", "citi_cb_special"],
        trackers: [],
        redemption: {
          unit: "$",
          min: 0,
          fee: "免費",
          ratio: "基本 1% | 主要額外：餐飲/酒店/海外 2%（英國/歐洲經濟區實體簽賬除外） | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "citi_octopus",
        name: "Citi Octopus 白金",
        currency: "CASH_Direct",
        type: "visa",
        fcf: 0.0195,
        rewardModules: ["citi_octopus_base", "citi_octopus_transport_tier2", "citi_octopus_transport_tier1", "citi_octopus_tunnel"],
        trackers: [],
        redemption: {
          unit: "$",
          min: 0,
          fee: "免費",
          ratio: "基本 0.5% | 主要額外：交通 15%（月簽滿 $4,000／$10,000）+ 隧道/泊車 5%（月簽滿 $10,000） | 任務/上限/重置見進度卡"
        }
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
          ratio: "DBS$48 = 1,000里 | 基本 0.8% | 主要額外：海外 1.2% + 海外推廣額外 1.2% | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "dbs_eminent",
        name: "DBS Eminent Signature",
        currency: "DBS_Dollar_Others",
        type: "visa",
        variant: "signature",
        fcf: 0.0195,
        rewardModules: ["dbs_eminent_bonus", "dbs_eminent_other_bonus", "dbs_eminent_base"],
        trackers: [],
        redemption: {
          unit: "DBS$",
          min: 0,
          fee: "HK$100/5,000里",
          ratio: "DBS$72 = 1,000里 或 DBS$1 = $1 | 基本 0.4% | 主要額外：指定類別額外 4.6% + 其他零售額外 0.6% | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "dbs_eminent_platinum",
        name: "DBS Eminent Platinum",
        currency: "DBS_Dollar_Others",
        type: "visa",
        variant: "platinum",
        fcf: 0.0195,
        rewardModules: ["dbs_eminent_bonus_platinum", "dbs_eminent_other_bonus_platinum", "dbs_eminent_base"],
        trackers: [],
        redemption: {
          unit: "DBS$",
          min: 0,
          fee: "HK$100/5,000里",
          ratio: "DBS$72 = 1,000里 或 DBS$1 = $1 | 基本 0.4% | 主要額外：指定類別額外 4.6% + 其他零售額外 0.6% | 任務/上限/重置見進度卡"
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
          ratio: "$100 CD = 1,000里 或 $1 CD = $1 | 基本 0.4% | 主要額外：四圍簽，好 COM 賺 電子錢包額外 2.6% + Super Wednesday 超市額外 7.6% | 任務/上限/重置見進度卡"
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
          ratio: "DBS$72 = 1,000里 或 DBS$1 = $1 | 基本 0.4% | 主要額外：DBS Live Fresh 網上外幣簽賬 1% + DBS Live Fresh 一簽即賞額外 5% | 任務/上限/重置見進度卡"
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
          ratio: "$1 +FUN = $1 | 基本 0.4% | 主要額外：+FUN Dollars 獎賞計劃 海外簽賬額外 5.6% + +FUN Dollars 獎賞計劃 網上簽賬額外 4.6% | 任務/上限/重置見進度卡"
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
          ratio: "$1 +FUN = $1 | 基本 0.4% | 主要額外：Travel+ 指定外幣額外 6.6% + Travel+ 其他外幣額外 4.6% | 任務/上限/重置見進度卡"
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
          ratio: "$1 +FUN = $1 | 基本 0.4% | 主要額外：大學學費額外 2% | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "hangseng_enjoy",
        name: "Hang Seng enJoy",
        currency: "YUU_Points",
        type: "visa",
        fcf: 0.0195,
        rewardModules: [
            "enjoy_base",
            "enjoy_bank_bonus_4x",
            "enjoy_merchant_bonus_4x",
            "enjoy_bank_bonus_3x",
            "enjoy_merchant_bonus_3x",
            "enjoy_bank_bonus_2x",
            "enjoy_shell_merchant_bonus",
            "enjoy_dining",
            "enjoy_retail"
        ],
        trackers: [],
        redemption: {
          unit: "YUU",
          min: 0,
          fee: "免費",
          ratio: "200分 = $1 | 基本每 $1 賺 1 YUU (0.5%) | 主要額外：指定商戶銀行部分額外每 $1 +1 YUU | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "boc_cheers_vi",
        name: "中銀 Cheers Visa Infinite",
        currency: "BOC_Points",
        type: "visa",
        fcf: 0.0195,
        rewardModules: [
            "boc_cheers_base",
            "boc_cheers_vi_dining_2026h1",
            "boc_cheers_vi_fx_2026h1",
            "boc_cheers_dining",
            "boc_cheers_travel",
            "boc_cheers_overseas",
            "boc_amazing_fly_cn",
            "boc_amazing_fly_other",
            "boc_amazing_weekday",
            "boc_amazing_holiday",
            "boc_amazing_online_weekday",
            "boc_amazing_online_holiday"
        ],
        trackers: [
          "boc_cheers_vi_mission_tracker",
          "boc_amazing_vi_local_mission_tracker",
          "boc_fly_vi_cn_tracker",
          "boc_fly_vi_other_tracker"
        ],
        redemption: {
          unit: "積分",
          min: 0,
          fee: "免手續費 ✅",
          ratio: "15分 = 1里 | 基本每 $1 賺 1 積分 (0.4%) | 主要額外：中銀 Cheers Visa Infinite 餐飲每 $1 賺 10 積分 + 中銀 Cheers Visa Infinite 外幣簽賬每 $1 賺 10 積分 | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "boc_cheers_vs",
        name: "中銀 Cheers Visa Signature",
        currency: "BOC_Points",
        type: "visa",
        fcf: 0.0195,
        rewardModules: [
            "boc_cheers_base",
            "boc_cheers_vs_dining_2026h1",
            "boc_cheers_vs_fx_2026h1",
            "boc_cheers_dining_vs",
            "boc_cheers_travel_vs",
            "boc_cheers_overseas_vs",
            "boc_amazing_fly_cn_vs",
            "boc_amazing_fly_other_vs",
            "boc_amazing_weekday_vs",
            "boc_amazing_holiday_vs",
            "boc_amazing_online_weekday_vs",
            "boc_amazing_online_holiday_vs"
        ],
        trackers: [
          "boc_cheers_vs_mission_tracker",
          "boc_amazing_vs_local_mission_tracker",
          "boc_fly_vs_cn_tracker",
          "boc_fly_vs_other_tracker"
        ],
        redemption: {
          unit: "積分",
          min: 0,
          fee: "免手續費 ✅",
          ratio: "15分 = 1里 | 基本每 $1 賺 1 積分 (0.4%) | 主要額外：中銀 Cheers Visa Signature 餐飲每 $1 賺 8 積分 + 中銀 Cheers Visa Signature 外幣簽賬每 $1 賺 8 積分 | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "boc_chill",
        name: "中銀 Chill Card",
        currency: "BOC_Points",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["boc_chill_base", "boc_chill_merchant", "boc_chill_online_overseas"],
        trackers: ["boc_chill_mission_tracker"],
        redemption: {
          unit: "積分",
          min: 0,
          fee: "$50/5,000里（最低$100，最高$300）",
          ratio: "15分 = 1里 | 基本每 $1 賺 1 積分 (0.4%) | 主要額外：Chill 指定商戶額外每 $1 +25 積分 + 網上/外幣額外每 $1 +12.5 積分 | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "boc_go_diamond",
        name: "中銀 Go UnionPay Diamond",
        currency: "BOC_Points",
        type: "unionpay",
        fcf: 0,
        rewardModules: ["boc_go_base", "boc_go_mobile", "boc_go_pmq126_local_mobile_2026q1", "boc_go_pmq126_mainland_mobile_2026q1", "boc_go_merchant", "boc_go_overseas"],
        trackers: [],
        redemption: {
          unit: "積分",
          min: 0,
          fee: "$50/5,000里（最低$100，最高$300）",
          ratio: "15分 = 1里 | 基本每 $1 賺 1 積分 (0.4%) | 主要額外：Go 指定商戶額外每 $1 +11.5 積分 + 全球手機簽賬額外每 $1 +2 積分 | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "boc_go_platinum",
        name: "中銀 Go UnionPay Platinum",
        currency: "BOC_Points",
        type: "unionpay",
        fcf: 0,
        rewardModules: ["boc_go_platinum_base", "boc_go_platinum_mobile", "boc_go_platinum_pmq126_local_mobile_2026q1", "boc_go_platinum_pmq126_mainland_mobile_2026q1", "boc_go_platinum_merchant", "boc_go_platinum_overseas"],
        trackers: [],
        redemption: {
          unit: "積分",
          min: 0,
          fee: "$50/5,000里（最低$100，最高$300）",
          ratio: "15分 = 1里 | 基本每 $1 賺 1 積分 (0.4%) | 主要額外：Go 指定商戶額外每 $1 +11.5 積分 + 全球手機簽賬額外每 $1 +1 積分 | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "boc_sogo",
        name: "中銀 Sogo Visa Signature",
        currency: "CASH_Direct",
        type: "visa",
        fcf: 0.0195,
        rewardModules: ["boc_sogo_base", "boc_sogo_designated", "boc_sogo_mobile_pay"],
        trackers: [],
        redemption: {
          unit: "元",
          min: 0,
          fee: "N/A",
          ratio: "基本 0.4% | 主要額外：崇光及指定商戶/產品 5% + 手機支付額外 5% | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "ae_explorer",
        name: "AE Explorer",
        currency: "AE_MR",
        type: "ae",
        fcf: 0.02,
        rewardModules: [
            "ae_explorer_base",
            "ae_explorer_fx_travel_bonus_075_2026h1",
            "ae_explorer_fx_7x_bonus_2026h1",
            "ae_explorer_travel_7x_bonus_2026h1",
            "ae_explorer_online_5x_bonus_2026"
        ],
        trackers: [],
        redemption: {
          unit: "積分",
          min: 0,
          fee: "免費",
          ratio: "18分 = 1里 | 基本每 $1 賺 3 積分 (1%) | 主要額外：指定網上商戶額外每 $1 +2 積分 + 海外額外每 $1 +7 積分 | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "ae_platinum",
        name: "AE Platinum (細頭)",
        currency: "AE_MR",
        type: "ae",
        fcf: 0.02,
        rewardModules: ["ae_plat_base", "ae_plat_accelerator_bonus", "ae_plat_overseas", "ae_plat_fx_5x_promo_2026h1", "ae_plat_travel", "ae_plat_daily"],
        trackers: [],
        redemption: {
          unit: "積分",
          min: 0,
          fee: "免費",
          ratio: "18分 = 1里 | 基本每 $1 賺 1 積分 (0.33%) | 主要額外：外幣簽賬額外每 $1 +2 積分 + 指定旅遊商戶額外每 $1 +7 積分 | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "ae_platinum_credit",
        name: "AE Platinum Credit (大頭)",
        currency: "AE_MR",
        type: "ae",
        fcf: 0.02,
        rewardModules: ["ae_pcc_base", "ae_pcc_program_bonus_2x", "ae_pcc_double_extra_3x_precap", "ae_pcc_double_extra_1x_postcap"],
        trackers: [],
        redemption: {
          unit: "積分",
          min: 0,
          fee: "免費",
          ratio: "18分 = 1里 | 基本每 $1 賺 1 積分 (0.33%) | 主要額外：指定商戶額外每 $1 +3 積分 + 指定商戶額外每 $1 +1 積分 | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "fubon_in_platinum",
        name: "富邦iN VISA白金卡",
        currency: "Fubon_Points",
        type: "visa",
        fcf: 0.0195,
        rewardModules: ["fubon_in_base", "fubon_in_online"],
        trackers: ["fubon_in_eligible_spend_tracker"],
        redemption: {
          unit: "積分",
          min: 0,
          fee: "HK$50/5000里",
          ratio: "15分 = 1里 | 基本每 $1 賺 1 積分 (0.5%) | 主要額外：網上簽賬額外每 $1 +19 積分 | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "fubon_travel",
        name: "富邦Visa白金卡",
        currency: "Fubon_Points_Std",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["fubon_travel_base", "fubon_travel_tw", "fubon_travel_jpkr", "fubon_travel_fx_other", "fubon_travel_local_weekend", "fubon_travel_upgrade_online"],
        trackers: [],
        redemption: {
          unit: "積分",
          min: 0,
          fee: "HK$50/5000里",
          ratio: "15分 = 1里 | 基本每 $1 賺 1 積分 (0.4%) | 主要額外：台灣額外每 $1 +19 積分 + 日本/韓國額外每 $1 +9 積分 | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "fubon_infinite",
        name: "富邦Visa Infinite卡",
        currency: "Fubon_Points",
        type: "visa",
        fcf: 0.0195,
        rewardModules: [
          "fubon_infinite_base",
          "fubon_infinite_fx_other",
          "fubon_infinite_jpkr_bonus",
          "fubon_infinite_twd_bonus",
          "fubon_infinite_local_weekend",
          "fubon_infinite_upgrade_online"
        ],
        trackers: ["fubon_infinite_upgrade_tracker"],
        redemption: {
          unit: "積分",
          min: 0,
          fee: "HK$50/5000里",
          ratio: "15分 = 1里 | 基本每 $1 賺 1 積分 (0.5%) | 主要額外：台灣每 $1 賺 20 積分 + 日本/韓國每 $1 賺 10 積分 | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "sim_credit",
        name: "sim Credit Card",
        currency: "CASH_Direct",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["sim_base", "sim_online", "sim_transport", "sim_designated_merchant", "sim_billpay"],
        trackers: ["sim_non_online_tracker"],
        redemption: {
          unit: "$",
          min: 0,
          fee: "免費",
          ratio: "基本 0.4% | 主要額外：網上零售額外 7.6% + 指定本地交通額外 7.6% | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "sim_world",
        name: "sim World Mastercard",
        currency: "CASH_Direct",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["sim_base", "sim_world_online", "sim_world_overseas", "sim_world_designated_merchant", "sim_world_billpay"],
        trackers: ["sim_world_non_online_tracker"],
        redemption: {
          unit: "$",
          min: 0,
          fee: "免費",
          ratio: "基本 0.4% | 主要額外：sim World 網上零售額外 7.6% + sim World 海外簽賬額外 7.6% | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "aeon_wakuwaku",
        name: "AEON WAKUWAKU",
        currency: "CASH_Direct",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["aeon_waku_base", "aeon_waku_online", "aeon_waku_japan", "aeon_waku_dining"],
        trackers: [],
        redemption: {
          unit: "$",
          min: 0,
          fee: "免費",
          ratio: "基本 0.4% | 主要額外：網上簽賬額外 5.6% + 日本海外簽賬額外 2.6% | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "wewa",
        name: "安信 WeWa UnionPay",
        currency: "CASH_Direct",
        type: "unionpay",
        fcf: 0,
        rewardModules: ["wewa_base", "wewa_selected_bonus", "wewa_overseas_extra_2026q1"],
        trackers: ["wewa_monthly_mission_tracker", "wewa_overseas_stage_tracker"],
        redemption: {
          unit: "$",
          min: 0,
          fee: "免費",
          ratio: "基本 0.4% | 主要額外：自選類別額外 3.6% + 海外指定地區額外 5% | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "earnmore",
        name: "EarnMORE 銀聯",
        currency: "CASH_Direct",
        type: "unionpay",
        fcf: 0,
        rewardModules: ["earnmore_base", "earnmore_bonus_2026q1"],
        trackers: [],
        redemption: {
          unit: "$",
          min: 0,
          fee: "免費",
          ratio: "基本 1% | 主要額外：推廣期額外 1% | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "mox_credit",
        name: "Mox Credit",
        currency: "CASH_Direct",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["mox_base", "mox_task_bonus", "mox_supermarket", "mox_miles_unlock", "mox_miles_base_promo", "mox_miles_base_regular"],
        trackers: [],
        redemption: {
          unit: "$",
          min: 0,
          fee: "免費",
          ratio: "基本 1% | 主要額外：任務達標額外 1% + 超市 3% + 指定類別 10%（里數模式） | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "bea_goal",
        name: "BEA GOAL",
        currency: "CASH_Direct",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["bea_goal_base", "bea_goal_travel_transport", "bea_goal_entertainment", "bea_goal_online_mobile"],
        trackers: ["bea_goal_mission"],
        redemption: {
          unit: "$",
          min: 0,
          fee: "免費",
          ratio: "基本 0.4% | 主要額外：旅遊/公共交通工具額外 6% + 娛樂額外 5% + 網上/手機支付額外 4%（需先月簽滿 $2,000） | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "bea_world",
        name: "BEA World Mastercard",
        currency: "BEA_Points",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["bea_world_base", "bea_world_bonus", "bea_world_flying_overseas", "bea_world_flying_designated_local"],
        trackers: ["bea_world_mission"],
        redemption: {
          unit: "BEA分",
          min: 0,
          fee: "無",
          ratio: "250分 = $1 | 基本每 $1 賺 1 BEA分 (0.4%) | 主要額外：BEA Spending Points 指定類別每 $1 賺 12.5 BEA分 + BEA Flying Miles 海外簽賬每 $1 賺 2 BEA分 | 任務/上限/重置見進度卡"
        }
    },
    {
        id: "bea_world_privilege",
        name: "BEA 顯卓理財 World Mastercard",
        currency: "BEA_Points",
        type: "master",
        fcf: 0.0195,
        rewardModules: ["bea_world_base", "bea_world_bonus", "bea_world_flying_overseas", "bea_world_flying_designated_local"],
        trackers: ["bea_world_mission"],
        redemption: {
          unit: "BEA分",
          min: 0,
          fee: "無",
          ratio: "250分 = $1 | 基本每 $1 賺 1 BEA分 (0.4%) | 主要額外：BEA Spending Points 指定類別每 $1 賺 12.5 BEA分 + BEA Flying Miles 海外簽賬每 $1 賺 2 BEA分 | 任務/上限/重置見進度卡"
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
          ratio: "1 i-Dollar = $1 | 基本 0.4% | 主要額外：網上零售/手機支付 3.6% | 任務/上限/重置見進度卡"
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
          ratio: "250分 = $1 | 基本每 $1 賺 1 BEA分 (0.4%) | 主要額外：人民幣簽賬每 $1 賺 13 BEA分 + 外幣簽賬每 $1 賺 11 BEA分 | 任務/上限/重置見進度卡"
        }
    }
];
