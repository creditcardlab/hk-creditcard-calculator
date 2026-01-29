// js/data_cards.js

const cardsDB = [
    // --- HSBC Series ---
    {
        id: "hsbc_everymile", name: "HSBC EveryMile", currency: "HSBC_RC_EM", type: "master", fcf: 0.0195,
        // [UPDATED] Added em_overseas_bonus for Calculator
        modules: ["em_base", "em_designated", "em_grocery_low", "em_overseas_mission", "em_overseas_bonus", "travel_guru_v2"],
        redemption: { unit: "RC", min: 40, fee: "免費", ratio: "1 RC = 20 里" }
    },
    {
        id: "hsbc_vs", name: "HSBC Visa Signature", currency: "HSBC_RC", type: "visa", fcf: 0.0195,
        modules: ["vs_base", "vs_red_hot_bonus", "red_hot_variable", "travel_guru_v2", "winter_tracker"],
        redemption: { unit: "RC", min: 40, fee: "免費", ratio: "1 RC = 10 里" }
    },
    { id: "hsbc_red", name: "HSBC Red Card", currency: "HSBC_RC", type: "master", fcf: 0.0195, modules: ["red_base", "red_online", "red_designated_bonus", "red_category_bonus", "travel_guru_v2", "winter_tracker"] },
    { id: "hsbc_pulse", name: "HSBC Pulse 銀聯鑽石", currency: "HSBC_RC", type: "unionpay", fcf: 0, modules: ["hsbc_std_base", "red_hot_variable", "pulse_china_bonus", "travel_guru_v2", "winter_tracker"] },
    { id: "hsbc_unionpay_std", name: "HSBC 銀聯雙幣 (標準)", currency: "HSBC_RC", type: "unionpay", fcf: 0, modules: ["hsbc_std_base", "red_hot_variable", "travel_guru_v2", "winter_tracker"] },
    { id: "hsbc_easy", name: "HSBC Easy Card (白金)", currency: "HSBC_RC", type: "visa", fcf: 0.0195, modules: ["hsbc_std_base", "red_hot_variable", "easy_moneyback_bonus", "travel_guru_v2", "winter_tracker"] },
    { id: "hsbc_gold_student", name: "HSBC 金卡 (學生)", currency: "HSBC_RC", type: "visa", fcf: 0.0195, modules: ["hsbc_std_base", "red_hot_variable", "student_tuition_bonus", "travel_guru_v2", "winter_tracker"] },
    { id: "hsbc_gold", name: "HSBC 滙財金卡", currency: "HSBC_RC", type: "visa", fcf: 0.0195, modules: ["hsbc_std_base", "red_hot_variable", "travel_guru_v2", "winter_tracker"] },
    { id: "hsbc_premier", name: "HSBC Premier (卓越理財)", currency: "HSBC_RC", type: "master", fcf: 0.0195, modules: ["hsbc_std_base", "red_hot_variable", "travel_guru_v2", "winter_tracker"] },

    // --- Standard Chartered Series ---
    // SC Cathay 直接入里數，無須兌換設定
    { id: "sc_cathay_std", name: "SC 國泰 Mastercard", currency: "AM_Direct", type: "master", fcf: 0.0195, modules: ["sc_cathay_base", "sc_cathay_dining_hotel", "sc_cathay_overseas_std", "sc_cathay_airlines"] },
    { id: "sc_cathay_priority", name: "SC 國泰 (優先理財)", currency: "AM_Direct", type: "master", fcf: 0.0195, modules: ["sc_cathay_base", "sc_cathay_dining_hotel", "sc_cathay_overseas_priority", "sc_cathay_airlines"] },
    { id: "sc_cathay_private", name: "SC 國泰 (優先私人)", currency: "AM_Direct", type: "master", fcf: 0.0195, modules: ["sc_cathay_base", "sc_cathay_dining_hotel", "sc_cathay_overseas_private", "sc_cathay_airlines"] },
    { id: "sc_simply_cash", name: "SC Simply Cash Visa", currency: "CASH_Direct", type: "visa", fcf: 0.0195, modules: ["sc_simply_cash_base", "sc_simply_cash_foreign"] },
    { id: "sc_smart", name: "SC Smart Card", currency: "CASH_Direct", type: "visa", fcf: 0, modules: ["sc_smart_base", "sc_smart_designated"] },

    // --- Citibank Series ---
    {
        id: "citi_pm", name: "Citi PremierMiles", currency: "CITI_PM_PTS", type: "master", fcf: 0.0195,
        modules: ["citi_pm_base", "citi_pm_overseas"],
        redemption: { unit: "積分", min: 12000, fee: "免費", ratio: "12分 = 1里" }
    },
    {
        id: "citi_prestige", name: "Citi Prestige", currency: "CITI_PM_PTS", type: "master", fcf: 0.0195,
        modules: ["citi_prestige_base", "citi_prestige_overseas"],
        redemption: { unit: "積分", min: 12000, fee: "免費", ratio: "12分 = 1里" }
    },
    {
        id: "citi_rewards", name: "Citi Rewards", currency: "CITI_R_PTS", type: "master", fcf: 0.0195,
        modules: ["citi_rewards_base", "citi_rewards_mobile", "citi_rewards_shopping"],
        // 加入手續費提示
        redemption: { unit: "積分", min: 18000, fee: "HK$200/兌換", ratio: "15分 = 1里" }
    },
    { id: "citi_club", name: "Citi The Club", currency: "CLUB_PTS", type: "master", fcf: 0.0195, modules: ["citi_club_base", "citi_club_designated"] },
    { id: "citi_cashback", name: "Citi Cash Back", currency: "CASH_Direct", type: "visa", fcf: 0.0195, modules: ["citi_cb_base", "citi_cb_special"] },
    { id: "citi_octopus", name: "Citi Octopus 白金", currency: "CASH_Direct", type: "visa", fcf: 0.0195, modules: ["citi_octopus_base", "citi_octopus_transport", "citi_octopus_tunnel"] },

    // --- Other Banks ---
    // --- DBS Series ---
    {
        id: "dbs_black", name: "DBS Black World", currency: "DBS_Dollar", type: "master", fcf: 0.0195,
        modules: ["dbs_black_overseas_promo", "dbs_black_overseas_std", "dbs_black_base"],
        redemption: { unit: "DBS$", min: 0, fee: "免費 (Black專享)", ratio: "DBS$48 = 1,000里" }
    },
    {
        id: "dbs_eminent", name: "DBS Eminent Visa", currency: "DBS_Dollar_Others", type: "visa", fcf: 0.0195,
        modules: ["dbs_eminent_bonus", "dbs_eminent_base"],
        redemption: { unit: "DBS$", min: 0, fee: "HK$100/5,000里", ratio: "DBS$72 = 1,000里 或 DBS$1 = $1" }
    },
    {
        id: "dbs_compass", name: "DBS COMPASS VISA", currency: "COMPASS_Dollar", type: "visa", fcf: 0.0195,
        modules: ["dbs_compass_grocery_wed", "dbs_compass_ewallet", "dbs_compass_base"],
        redemption: { unit: "CD", min: 0, fee: "HK$100/5,000里", ratio: "$100 CD = 1,000里 或 $1 CD = $1" }
    },
    {
        id: "dbs_live_fresh", name: "DBS Live Fresh", currency: "DBS_Dollar_Others", type: "master", fcf: 0.0195,
        modules: ["dbs_live_fresh_selected", "dbs_live_fresh_online_foreign", "dbs_live_fresh_base"],
        redemption: { unit: "DBS$", min: 0, fee: "HK$100/5,000里", ratio: "DBS$72 = 1,000里 或 DBS$1 = $1" }
    },

    // --- Hang Seng Series (V10.13) ---
    {
        id: "hangseng_mmpower", name: "Hang Seng MMPower", currency: "Fun_Dollars", type: "master", fcf: 0.0195,
        modules: ["hangseng_base", "mmpower_overseas_bonus", "mmpower_online_bonus", "mmpower_selected_bonus"],
        redemption: { unit: "+FUN Dollar", min: 0, fee: "免費", ratio: "$1 +FUN = $1" }
    },
    {
        id: "hangseng_travel_plus", name: "Hang Seng Travel+", currency: "Fun_Dollars", type: "visa", fcf: 0.0195,
        modules: ["hangseng_base", "travel_plus_tier1_bonus", "travel_plus_tier2_bonus", "travel_plus_dining_bonus"],
        redemption: { unit: "+FUN Dollar", min: 0, fee: "免費", ratio: "$1 +FUN = $1" }
    },
    {
        id: "hangseng_university", name: "Hang Seng University", currency: "Fun_Dollars", type: "visa", fcf: 0.0195,
        modules: ["hangseng_base", "university_tuition"],
        redemption: { unit: "+FUN Dollar", min: 0, fee: "免費", ratio: "$1 +FUN = $1" }
    },
    {
        id: "hangseng_enjoy", name: "Hang Seng enJoy", currency: "YUU_Points", type: "visa", fcf: 0.0195, // Using YUU Points
        modules: ["enjoy_base", "enjoy_dining", "enjoy_retail"],
        redemption: { unit: "YUU", min: 0, fee: "免費", ratio: "200分 = $1" }
    },

    // --- BOC Series ---
    {
        id: "boc_cheers_vi", name: "中銀 Cheers Visa Infinite", currency: "BOC_Points", type: "visa", fcf: 0.0195,
        modules: ["boc_cheers_base", "boc_cheers_dining", "boc_cheers_travel", "boc_amazing_fly_cn", "boc_amazing_fly_other", "boc_cheers_overseas", "boc_amazing_weekday", "boc_amazing_holiday", "boc_amazing_online_weekday", "boc_amazing_online_holiday"],
        redemption: {
            unit: "積分", min: 0, fee: "免手續費 ✅",
            ratio: "15分 = 1里 | 餐飲: 10X (Cap 100k) | 旅遊/外幣: 10X (Cap 250k)"
        }
    },
    {
        id: "boc_cheers_vs", name: "中銀 Cheers Visa Signature", currency: "BOC_Points", type: "visa", fcf: 0.0195,
        modules: ["boc_cheers_base", "boc_cheers_dining_vs", "boc_cheers_travel_vs", "boc_amazing_fly_cn_vs", "boc_amazing_fly_other_vs", "boc_cheers_overseas_vs", "boc_amazing_weekday_vs", "boc_amazing_holiday_vs", "boc_amazing_online_weekday_vs", "boc_amazing_online_holiday_vs"],
        redemption: {
            unit: "積分", min: 0, fee: "免手續費 ✅",
            ratio: "15分 = 1里 | 餐飲: 8X (Cap 60k) | 旅遊/外幣: 8X (Cap 150k)"
        }
    },
    {
        id: "boc_chill", name: "中銀 Chill Card", currency: "BOC_Points", type: "master", fcf: 0.0195,
        modules: ["boc_chill_base", "boc_chill_merchant", "boc_chill_online_overseas"],
        redemption: {
            unit: "積分", min: 0, fee: "$50/5K里（最低$100，最高$300）",
            ratio: "15分 = 1里 | Chill商戶: 10X | 網購/海外: 5X | 共用 15k分/月上限"
        }
    },
    {
        id: "boc_go_diamond", name: "中銀 Go UnionPay Diamond", currency: "BOC_Points", type: "unionpay", fcf: 0,
        modules: ["boc_go_base", "boc_go_mobile", "boc_go_merchant"],
        redemption: {
            unit: "積分", min: 0, fee: "$50/5K里（最低$100，最高$300）",
            ratio: "15分 = 1里 | 手機支付: 4X (上限10k分/月) | Go商戶: 5X (上限10k分/月)"
        }
    },

    // --- American Express Series ---
    {
        id: "ae_explorer", name: "AE Explorer", currency: "AE_MR", type: "ae", fcf: 0.02,
        modules: ["ae_explorer_base", "ae_explorer_overseas", "ae_explorer_selected"],
        redemption: {
            unit: "積分", min: 0, fee: "免費",
            ratio: "18分 = 1里 | 海外: 10.75X | 指定旅遊: 12X"
        }
    },
    {
        id: "ae_platinum", name: "AE Platinum (細頭)", currency: "AE_MR", type: "ae", fcf: 0.02,
        modules: ["ae_plat_base", "ae_plat_overseas", "ae_plat_travel", "ae_plat_daily"],
        redemption: {
            unit: "積分", min: 0, fee: "免費",
            ratio: "18分 = 1里 | Turbo: 2X | Accelerator: +5X/7X"
        }
    },
    {
        id: "ae_platinum_credit", name: "AE Platinum Credit (大頭)", currency: "AE_MR", type: "ae", fcf: 0.02,
        modules: ["ae_pcc_base", "ae_pcc_special"],
        redemption: {
            unit: "積分", min: 0, fee: "免費",
            ratio: "18分 = 1里 | 超市/油站: 6X (Double Points)"
        }
    },
    {
        id: "ae_blue_cash", name: "AE Blue Cash", currency: "CASH_Direct", type: "ae", fcf: 0.02,
        modules: ["ae_blue_cash_base"],
        redemption: { unit: "現金", min: 0, fee: "免費", ratio: "1.2% 回贈" }
    },

    // --- Fubon Series ---
    {
        id: "fubon_in_platinum", name: "Fubon iN Visa Platinum", currency: "Fubon_Points", type: "visa", fcf: 0.0195,
        modules: ["fubon_in_base", "fubon_in_online"],
        redemption: { unit: "積分", min: 0, fee: "HK$50/5000里", ratio: "15分 = 1里 | 250分 = $1" }
    },
    {
        id: "fubon_travel", name: "Fubon Platinum/Titanium", currency: "Fubon_Points", type: "master", fcf: 0.0195,
        modules: ["fubon_travel_base", "fubon_travel_tw", "fubon_travel_jpkr", "fubon_travel_euro"],
        redemption: { unit: "積分", min: 0, fee: "HK$50/5000里", ratio: "15分 = 1里 | 20X = $1.33/里" }
    },

    // --- Others ---
    {
        id: "sim_credit", name: "sim Credit Card", currency: "CASH_Direct", type: "master", fcf: 0.0195,
        modules: ["sim_base", "sim_online", "sim_non_online_tracker"],
        redemption: { unit: "現金", min: 0, fee: "免費", ratio: "網購 8% (需非網購$500)" }
    },
    {
        id: "aeon_wakuwaku", name: "AEON WAKUWAKU", currency: "CASH_Direct", type: "master", fcf: 0.0195,
        modules: ["aeon_waku_base", "aeon_waku_online", "aeon_waku_japan"],
        redemption: { unit: "現金", min: 0, fee: "免費", ratio: "網購 6% | 日本 3%" }
    },
    {
        id: "wewa", name: "安信 WeWa UnionPay", currency: "CASH_Direct", type: "unionpay", fcf: 0,
        modules: ["wewa_base", "wewa_bonus"],
        redemption: { unit: "現金", min: 0, fee: "免費", ratio: "旅遊/主題公園 4%" }
    },
    { id: "earnmore", name: "EarnMORE 銀聯", currency: "CASH_Direct", type: "unionpay", fcf: 0, modules: ["earnmore_base"] },
    { id: "mox_credit", name: "Mox Credit", currency: "CASH_Direct", type: "master", fcf: 0.0195, modules: ["mox_base", "mox_task_bonus", "mox_supermarket"] },

];

// ... (redHotCategories & modulesDB 保持不變) ...
// ... (modulesDB 中 citi_rewards_mobile 已在 V10.6 改為 2.7X，保持該版本即可) ...
