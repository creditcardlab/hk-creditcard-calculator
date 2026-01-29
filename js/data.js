// js/data.js - V10.7 (Redemption Details)

// 1. 卡片配置
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
const redHotCategories = {
    "dining": ["dining"],
    "world": ["overseas", "china_consumption"],
    "home": ["grocery", "telecom", "electronics", "moneyback_merchant"],
    "enjoyment": ["transport", "entertainment", "travel"],
    "style": ["apparel", "department_store", "health_beauty"]
};

// 2. 模組邏輯
const modulesDB = {
    // --- HSBC ---
    "hsbc_std_base": { type: "always", rate: 0.004, desc: "基本 (0.4%)" },
    "vs_base": { type: "always", rate: 0.004, desc: "基本 (0.4%)" },
    "red_hot_variable": { type: "red_hot_allocation", rate_per_x: 0.004, desc: "最紅自主", setting_key: "red_hot_rewards_enabled" },
    "vs_red_hot_bonus": { type: "red_hot_fixed_bonus", multiplier: 3, rate_per_x: 0.004, desc: "VS專屬賞 (1.2%)" },
    "easy_moneyback_bonus": { type: "category", match: ["moneyback_merchant"], rate: 0.024, desc: "易賞錢6倍 (約2.4%)" },
    "student_tuition_bonus": { type: "category", match: ["tuition"], rate: 0.024, desc: "學費回贈 (2.4%)", cap_limit: 8333, cap_key: "student_tuition_cap" },
    "pulse_china_bonus": { type: "category", match: ["china_consumption"], rate: 0.02, desc: "內地/澳門手機支付 (+2%)" },
    "em_base": { type: "always", rate: 0.01, desc: "基本 (1%)" },
    "em_designated": { type: "category", match: ["transport", "streaming", "em_designated_spend"], rate: 0.025, desc: "指定 $2/里 (2.5%)", mode: "replace" },
    "em_grocery_low": { type: "category", match: ["grocery"], rate: 0.004, desc: "超市 (0.4%)", mode: "replace" },
    "red_base": { type: "always", rate: 0.004, desc: "基本 (0.4%)" },
    "red_online": { type: "category", match: ["online"], rate: 0.04, desc: "網購 (4%)", mode: "replace", cap_limit: 10000, cap_key: "red_online_cap" },
    "red_designated_bonus": { type: "category", match: ["red_designated"], rate: 0.076, desc: "指定商戶加碼 (7.6%)", cap_limit: 1250, cap_key: "red_designated_cap" },
    "red_category_bonus": { type: "category", match: ["grocery", "overseas", "overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other"], rate: 0.01, desc: "超市/海外 (1%)", mode: "replace" },
    "em_overseas_mission": { type: "mission_tracker", setting_key: "em_promo_enabled", match: ["overseas", "overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other"], desc: "🌏 EM推廣", mission_id: "em_promo", promo_end: "2026-03-31", valid_to: "2026-03-31" },
    // [NEW] Actual Calculation Module for EveryMile Promo
    // Base 1% + Bonus 1.5% = 2.5% ($2/mile). Req $12,000 spend.
    "em_overseas_bonus": {
        type: "category", match: ["overseas", "overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other"], rate: 0.015, desc: "EM推廣 (+1.5%)",
        mode: "add", setting_key: "em_promo_enabled",
        req_mission_spend: 12000, req_mission_key: "em_q1_total",
        cap_mode: "reward", cap_limit: 225, cap_key: "em_promo_cap" // $225 RC cap (approx $15,000 usage capped at bonus?) No, wait.
        // User said: "Math.floor(pot) / 225". Limit is $225 RC.
        // 1.5% of $15,000 = $225. So Cap is indeed $225 Reward.
    },
    "winter_tracker": { type: "mission_tracker", setting_key: "winter_promo_enabled", match: ["dining", "overseas", "overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other", "travel"], desc: "❄️ 冬日賞", mission_id: "winter_promo", promo_end: "2026-02-28", valid_to: "2026-02-28" },
    "travel_guru_v2": { type: "guru_capped", category: "overseas", config: { 1: { rate: 0.03, cap_rc: 500, desc: "GO級 (+3%)" }, 2: { rate: 0.04, cap_rc: 1200, desc: "GING級 (+4%)" }, 3: { rate: 0.06, cap_rc: 2200, desc: "GURU級 (+6%)" } }, usage_key: "guru_rc_used" },

    // --- SC ---
    "sc_cathay_base": { type: "always", rate: 0.1666, desc: "基本 $6/里" },
    "sc_cathay_dining_hotel": { type: "category", match: ["dining", "hotel"], rate: 0.0834, desc: "食肆/酒店 $4/里" },
    "sc_cathay_overseas_std": { type: "category", match: ["overseas", "overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other"], rate: 0.0834, desc: "海外 $4/里" },
    "sc_cathay_overseas_priority": { type: "category", match: ["overseas", "overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other"], rate: 0.1667, desc: "優先理財: 海外 $3/里" },
    "sc_cathay_private": { type: "category", match: ["overseas", "overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other"], rate: 0.3334, desc: "優先私人: 海外 $2/里" },
    "sc_cathay_airlines": { type: "category", match: ["cathay_hkexpress"], rate: 0.3334, desc: "CX/UO 加碼至 $2/里" },
    "sc_simply_cash_base": { type: "always", rate: 0.015, desc: "本地 1.5%" },
    "sc_simply_cash_foreign": { type: "category", match: ["overseas", "overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other"], rate: 0.02, desc: "外幣 2%", mode: "replace" },
    "sc_smart_base": { type: "always", rate: 0.0055, desc: "基本 0.55%" },
    "sc_smart_designated": { type: "category", match: ["smart_designated"], rate: 0.05, desc: "指定商戶 5%", mode: "replace", cap_limit: 60000, cap_key: "sc_smart_cap" },

    // --- Citi ---
    "citi_pm_base": { type: "always", rate: 1.5, desc: "基本 1.5X ($8/里)" },
    "citi_pm_overseas": { type: "category", match: ["overseas", "overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other"], rate: 3, desc: "海外 3X ($4/里)", mode: "replace" },
    "citi_prestige_base": { type: "always", rate: 2, desc: "基本 2X ($6/里)" },
    "citi_prestige_overseas": { type: "category", match: ["overseas", "overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other"], rate: 3, desc: "海外 3X ($4/里)", mode: "replace" },

    // Rewards 2026 Rules
    "citi_rewards_base": { type: "always", rate: 1, desc: "基本 1X積分" },
    "citi_rewards_mobile": {
        type: "category",
        match: ["dining", "grocery", "transport", "telecom", "general", "moneyback_merchant", "smart_designated", "citi_club_merchant"],
        rate: 2.7,
        desc: "手機支付 2.7X (HK$5.5/里)",
        mode: "replace"
    },
    "citi_rewards_shopping": {
        type: "category",
        match: ["department_store", "apparel", "entertainment"],
        rate: 8.1,
        desc: "購物/娛樂 8.1X (HK$1.85/里!)",
        mode: "replace"
    },

    "citi_club_base": { type: "always", rate: 0.05, desc: "基本 1%" },
    "citi_club_designated": { type: "category", match: ["citi_club_merchant"], rate: 0.2, desc: "Club商戶 4%", mode: "replace" },
    "citi_cb_base": { type: "always", rate: 0.01, desc: "基本 (1%)" },
    "citi_cb_special": { type: "category", match: ["dining", "hotel", "overseas", "overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other"], rate: 0.02, desc: "特選類別 (2%)", mode: "replace" },
    "citi_octopus_base": { type: "always", rate: 0.005, desc: "基本 0.5%" },

    // 交通 15% (Merged into standard "transport" category)
    "citi_octopus_transport": {
        type: "category",
        match: ["transport"], // <--- 改這裡：直接匹配標準交通類別
        rate: 0.15,
        desc: "交通 15% (需月簽$4k*)",
        mode: "replace",
        cap_limit: 2000,
        cap_key: "citi_oct_transport_cap"
    },

    // 隧道 5% (保留，但在 transport 類別下，由於 15% 排在前面且 mode:replace，通常會優先顯示 15% 的計算結果，這符合用戶期望)
    "citi_octopus_tunnel": {
        type: "category",
        match: ["transport"],
        rate: 0.05,
        desc: "隧道/泊車 5% (需月簽$10k)",
        mode: "replace"
    },

    // --- Other Banks ---
    "dbs_black_base": { type: "always", rate: 0.008, desc: "本地 ($6/里)" }, // 1/125 = 0.008 DBS$ (approx) if $125=$1DBS$. Wait, $6=1Mile. DBS$48=1000Mile. 1Mile=0.048DBS$. 0.048/6 = 0.008. Correct.
    "dbs_black_overseas_std": { type: "category", match: ["overseas", "overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other"], rate: 0.012, desc: "海外 ($4/里)", mode: "replace" }, // 0.048/4 = 0.012
    "dbs_black_overseas_promo": {
        type: "category", match: ["overseas", "overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other"], rate: 0.024, desc: "海外 ($2/里)", mode: "replace",
        setting_key: "dbs_black_promo_enabled", req_mission_key: "spend_dbs_black", req_mission_spend: 20000
    },

    "dbs_eminent_bonus": {
        type: "category", match: ["dining", "gym", "sportswear", "medical"], rate: 0.05, desc: "指定類別 (5%)", mode: "replace",
        min_spend: 300, cap_limit: 8000, cap_key: "dbs_eminent_bonus_cap"
    },
    "dbs_eminent_base": { type: "always", rate: 0.01, desc: "其他零售 (1%)", cap_limit: 20000, cap_key: "dbs_eminent_base_cap" },

    "dbs_compass_grocery_wed": {
        type: "category", match: ["grocery"], rate: 0.08, desc: "超市 (8% 只限週三)", mode: "replace",
        min_spend: 300 // Note: Should strictly check date, but core.js doesn't support date check yet. Display warning?
        // User requested: "Desc: 超市 8% (只限週三)". This serves as the warning.
    },
    "dbs_compass_ewallet": {
        type: "category", match: ["alipay", "wechat"], rate: 0.03, desc: "電子錢包 (3%)", mode: "replace",
        min_spend: 300
    },
    "dbs_compass_base": { type: "always", rate: 0.004, desc: "基本 (0.4%)" }, // 1/250 = 0.004

    "dbs_live_fresh_selected": {
        type: "category", match: ["live_fresh_selected"], rate: 0.05, desc: "自選類別 (5%) ⚠️ 只限網上", mode: "replace",
        min_spend: 300, cap_mode: "reward", cap_limit: 150, cap_key: "dbs_live_fresh_cap" // Cap 150 DBS$
    },
    "dbs_live_fresh_online_foreign": {
        type: "category", match: ["overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other"], rate: 0.01, desc: "網上外幣 (1%)", mode: "replace"
        // 只限外幣網上簽賬（海外交易），非自選類別時適用
    },
    "dbs_live_fresh_base": { type: "always", rate: 0.004, desc: "基本 (0.4%)" },

    // --- Hang Seng Modules (V10.13) ---
    "hangseng_base": { type: "always", rate: 0.004, desc: "基本 (0.4%)" },

    // MMPower (Base 0.4% + Bonus)
    // Overseas: 6% Total => 5.6% Bonus. Cap $500 Reward.
    "mmpower_overseas_bonus": {
        type: "category", match: ["overseas", "overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other"], rate: 0.056, desc: "MMP+海外 (5.6%)",
        mode: "add", setting_key: "mmpower_promo_enabled",
        cap_mode: "reward", cap_limit: 500, cap_key: "mmpower_reward_cap",
        req_mission_spend: 5000, req_mission_key: "spend_hangseng_mmpower"
    },
    // Online: 5% Total => 4.6% Bonus. Cap $500 Reward (Shared).
    "mmpower_online_bonus": {
        type: "category", match: ["online"], rate: 0.046, desc: "MMP+網購 (4.6%)",
        mode: "add", setting_key: "mmpower_promo_enabled",
        cap_mode: "reward", cap_limit: 500, cap_key: "mmpower_reward_cap",
        req_mission_spend: 5000, req_mission_key: "spend_hangseng_mmpower"
    },
    // Selected: 1% Total => 0.6% Bonus. (Assuming 1% is the goal for selected categories like entertainment)
    // However, user said "1% (low rebate, non-main)".
    // If it's 1%, and base is 0.4%, bonus is 0.6%.
    // Match: dining, electronics, entertainment
    "mmpower_selected_bonus": {
        type: "category", match: ["dining", "electronics", "entertainment"], rate: 0.006, desc: "MMP+自選 (0.6%)",
        mode: "add", setting_key: "mmpower_promo_enabled",
        cap_mode: "reward", cap_limit: 500, cap_key: "mmpower_reward_cap",
        req_mission_spend: 5000, req_mission_key: "spend_hangseng_mmpower"
    },

    // Travel+ (Base 0.4% + Bonus)
    // Tier 1 Foreign (Japan, Korea, Thai, Aus, Euro, UK...): 7% Total => 6.6% Bonus.
    // Need new category tag `designated_action_foreign` or just map countries?
    // Simplified: match `designated_foreign_currencies` or just `overseas` if specific.
    // User listed:日、韓、泰、澳、歐、英.
    // I need to add these currencies to `js/data.js` or assume `overseas` covers it?
    // User requested "Designated Foreign" vs "Other Foreign".
    // I will assume `designated_foreign` is a category tag I need to ensure exists or logic maps.
    // For now, I will use `travel_plus_tier1` and `overseas`.
    "travel_plus_tier1_bonus": {
        type: "category", match: ["travel_plus_tier1"], rate: 0.066, desc: "T+指定外幣 (6.6%)",
        mode: "add", setting_key: "travel_plus_promo_enabled",
        cap_mode: "reward", cap_limit: 500, cap_key: "travel_plus_reward_cap",
        req_mission_spend: 6000, req_mission_key: "spend_hangseng_travel_plus"
    },
    // Tier 2 Foreign (Other Overseas): 5% Total => 4.6% Bonus.
    "travel_plus_tier2_bonus": {
        type: "category", match: ["overseas", "overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other"], rate: 0.046, desc: "T+其他外幣 (4.6%)",
        mode: "add", setting_key: "travel_plus_promo_enabled",
        cap_mode: "reward", cap_limit: 500, cap_key: "travel_plus_reward_cap",
        req_mission_spend: 6000, req_mission_key: "spend_hangseng_travel_plus"
    },
    // Dining: 5% Total => 4.6% Bonus.
    "travel_plus_dining_bonus": {
        type: "category", match: ["dining"], rate: 0.046, desc: "T+餐飲 (4.6%)",
        mode: "add", setting_key: "travel_plus_promo_enabled",
        cap_mode: "reward", cap_limit: 500, cap_key: "travel_plus_reward_cap",
        req_mission_spend: 6000, req_mission_key: "spend_hangseng_travel_plus"
    },

    // University
    // Tuition: 2.4% Total. Base 0.4%?
    // User said "2.4%". Usually Affinity cards have base.
    // Assuming Base 0.4% + Bonus 2.0%?
    // Or plain 2.4%? User: "Tuition ... 2.4%".
    // Cap: $200 Reward per phase.
    // Since cap is specific to Tuition, I can use Spending Cap if rate is fixed.
    // $200 / 2.4% = $8333.
    // I will implementation as replacement for simplicity OR separate module.
    // Since University card probably has 0.4% base elsewhere, let's use Base + Bonus.
    // Bonus = 2.0%. Cap $200 Reward.
    "university_tuition": {
        type: "category", match: ["tuition"], rate: 0.02, desc: "大學學費 (2%)",
        cap_limit: 8333, cap_key: "university_tuition_cap" // Spending cap is easier ($8333 * 2.4% ~= $200)
        // Wait, if I use spending cap on Bonus (2%), $8333 * 2% = $166.
        // Total rate 2.4%. $8333 * 2.4% = $199.99.
        // The cap is $200 total reward?
        // User: "max rebate $200".
        // If I use Spending Cap 8333 on the BONUS module:
        // Tx $8333. Base $33. Bonus $166. Total $199.
        // It fits.
    },

    // enJoy
    // Points system.
    "enjoy_base": { type: "always", rate: 0.005, desc: "基本 (0.5%)" }, // 1X
    "enjoy_dining": { type: "category", match: ["dining_enjoy"], rate: 0.015, desc: "指定食肆 (+1.5%)" }, // 4X Total (2%)
    "enjoy_retail": { type: "category", match: ["retail_enjoy"], rate: 0.01, desc: "指定零售 (+1%)" },  // 3X Total (1.5%)

    // --- BOC Modules ---
    // Cheers VI
    "boc_cheers_base": { type: "always", rate: 1, desc: "基本 (1X積分)" },
    "boc_cheers_dining": {
        type: "category", match: ["dining"], rate: 10, desc: "餐飲 10X積分",
        mode: "replace", setting_key: "boc_amazing_enabled", req_mission_key: "spend_boc_cheers_vi", req_mission_spend: 5000,
        cap_mode: "reward", cap_limit: 100000, cap_key: "boc_cheers_dining_cap",
        secondary_cap_key: "boc_cheers_total_cap_vi", secondary_cap_limit: 300000 // VI Total 300k
    },
    "boc_cheers_travel": {
        type: "category", match: ["travel", "cathay_hkexpress"], rate: 10, desc: "旅遊 10X積分",
        mode: "replace", setting_key: "boc_amazing_enabled", req_mission_key: "spend_boc_cheers_vi", req_mission_spend: 5000,
        cap_mode: "reward", cap_limit: 250000, cap_key: "boc_cheers_travel_cap",
        secondary_cap_key: "boc_cheers_total_cap_vi", secondary_cap_limit: 300000
    },
    // Cheers VS
    "boc_cheers_dining_vs": {
        type: "category", match: ["dining"], rate: 8, desc: "餐飲 8X積分",
        mode: "replace", setting_key: "boc_amazing_enabled", req_mission_key: "spend_boc_cheers_vs", req_mission_spend: 5000,
        cap_mode: "reward", cap_limit: 60000, cap_key: "boc_cheers_dining_cap_vs",
        secondary_cap_key: "boc_cheers_total_cap_vs", secondary_cap_limit: 180000 // VS Total 180k
    },
    "boc_cheers_travel_vs": {
        type: "category", match: ["travel", "cathay_hkexpress"], rate: 8, desc: "旅遊 8X積分",
        mode: "replace", setting_key: "boc_amazing_enabled", req_mission_key: "spend_boc_cheers_vs", req_mission_spend: 5000,
        cap_mode: "reward", cap_limit: 150000, cap_key: "boc_cheers_travel_cap_vs",
        secondary_cap_key: "boc_cheers_total_cap_vs", secondary_cap_limit: 180000
    },

    // Cheers 海外簽賬
    "boc_cheers_overseas": {
        type: "category", match: ["overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other", "overseas"], rate: 9, desc: "外幣 +9X積分",
        cap_mode: "reward", cap_limit: 250000, cap_key: "boc_cheers_travel_cap",
        secondary_cap_key: "boc_cheers_total_cap_vi", secondary_cap_limit: 300000
    },
    "boc_cheers_overseas_vs": {
        type: "category", match: ["overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other", "overseas"], rate: 9, desc: "外幣 +9X積分",
        cap_mode: "reward", cap_limit: 150000, cap_key: "boc_cheers_travel_cap_vs",
        secondary_cap_key: "boc_cheers_total_cap_vs", secondary_cap_limit: 180000
    },

    // 狂賞派 (Amazing Rewards) - 只限7大本地消費類別
    "boc_amazing_weekday": {
        type: "category", match: ["dining", "travel", "entertainment", "telecom", "medical", "apparel", "hotel"],
        rate: 0.02, desc: "🔥 狂賞派 (平日 2%)", valid_on_red_day: false,
        setting_key: "boc_amazing_enabled", min_single_spend: 500, req_mission_key: "spend_boc_cheers_vi", req_mission_spend: 5000,
        cap_mode: "reward", cap_limit: 120, cap_key: "boc_amazing_local_weekday_cap"
    },
    "boc_amazing_holiday": {
        type: "category", match: ["dining", "travel", "entertainment", "telecom", "medical", "apparel", "hotel"],
        rate: 0.05, desc: "🔥 狂賞派 (紅日/星期日 5%)", valid_on_red_day: true,
        setting_key: "boc_amazing_enabled", min_single_spend: 500, req_mission_key: "spend_boc_cheers_vi", req_mission_spend: 5000,
        cap_mode: "reward", cap_limit: 300, cap_key: "boc_amazing_local_holiday_cap"
    },
    "boc_amazing_online_weekday": {
        type: "category", match: ["online"],
        rate: 0.02, desc: "🔥 狂賞派網購 (平日 2%)", valid_on_red_day: false,
        setting_key: "boc_amazing_enabled", req_mission_key: "spend_boc_cheers_vi", req_mission_spend: 5000,
        cap_mode: "reward", cap_limit: 60, cap_key: "boc_amazing_online_weekday_cap"
    },
    "boc_amazing_online_holiday": {
        type: "category", match: ["online"],
        rate: 0.05, desc: "🔥 狂賞派網購 (紅日/星期日 5%)", valid_on_red_day: true,
        setting_key: "boc_amazing_enabled", req_mission_key: "spend_boc_cheers_vi", req_mission_spend: 5000,
        cap_mode: "reward", cap_limit: 200, cap_key: "boc_amazing_online_holiday_cap"
    },

    // 狂賞派 (Amazing Rewards) - VS Version
    "boc_amazing_weekday_vs": {
        type: "category", match: ["dining", "travel", "entertainment", "telecom", "medical", "apparel", "hotel"],
        rate: 0.02, desc: "🔥 狂賞派 (平日 2%)", valid_on_red_day: false,
        setting_key: "boc_amazing_enabled", min_single_spend: 500, req_mission_key: "spend_boc_cheers_vs", req_mission_spend: 5000,
        cap_mode: "reward", cap_limit: 120, cap_key: "boc_amazing_local_weekday_cap"
    },
    "boc_amazing_holiday_vs": {
        type: "category", match: ["dining", "travel", "entertainment", "telecom", "medical", "apparel", "hotel"],
        rate: 0.05, desc: "🔥 狂賞派 (紅日/星期日 5%)", valid_on_red_day: true,
        setting_key: "boc_amazing_enabled", min_single_spend: 500, req_mission_key: "spend_boc_cheers_vs", req_mission_spend: 5000,
        cap_mode: "reward", cap_limit: 300, cap_key: "boc_amazing_local_holiday_cap"
    },
    "boc_amazing_online_weekday_vs": {
        type: "category", match: ["online"],
        rate: 0.02, desc: "🔥 狂賞派網購 (平日 2%)", valid_on_red_day: false,
        setting_key: "boc_amazing_enabled", req_mission_key: "spend_boc_cheers_vs", req_mission_spend: 5000,
        cap_mode: "reward", cap_limit: 60, cap_key: "boc_amazing_online_weekday_cap"
    },
    "boc_amazing_online_holiday_vs": {
        type: "category", match: ["online"],
        rate: 0.05, desc: "🔥 狂賞派網購 (紅日/星期日 5%)", valid_on_red_day: true,
        setting_key: "boc_amazing_enabled", req_mission_key: "spend_boc_cheers_vs", req_mission_spend: 5000,
        cap_mode: "reward", cap_limit: 200, cap_key: "boc_amazing_online_holiday_cap"
    },

    // 狂賞飛 (Amazing Fly)
    "boc_amazing_fly_cn": { type: "category", match: ["overseas_cn"], rate: 12, desc: "✈️ 狂賞飛 - 中澳 (+12X積分)", setting_key: "boc_amazing_enabled", req_mission_key: "spend_boc_cheers_vi", req_mission_spend: 5000, cap_mode: "reward", cap_limit: 60000, cap_key: "boc_amazing_fly_cn_cap" },
    "boc_amazing_fly_other": { type: "category", match: ["overseas_jkt", "overseas_tw", "overseas_other"], rate: 6, desc: "✈️ 狂賞飛 - 其他 (+6X積分)", setting_key: "boc_amazing_enabled", req_mission_key: "spend_boc_cheers_vi", req_mission_spend: 5000, cap_mode: "reward", cap_limit: 60000, cap_key: "boc_amazing_fly_other_cap" },
    "boc_amazing_fly_cn_vs": { type: "category", match: ["overseas_cn"], rate: 12, desc: "✈️ 狂賞飛 - 中澳 (+12X積分)", setting_key: "boc_amazing_enabled", req_mission_key: "spend_boc_cheers_vs", req_mission_spend: 5000, cap_mode: "reward", cap_limit: 60000, cap_key: "boc_amazing_fly_cn_cap" },
    "boc_amazing_fly_other_vs": { type: "category", match: ["overseas_jkt", "overseas_tw", "overseas_other"], rate: 6, desc: "✈️ 狂賞飛 - 其他 (+6X積分)", setting_key: "boc_amazing_enabled", req_mission_key: "spend_boc_cheers_vs", req_mission_spend: 5000, cap_mode: "reward", cap_limit: 60000, cap_key: "boc_amazing_fly_other_cap" },

    // Chill Card
    "boc_chill_base": { type: "always", rate: 0.5, desc: "基本 (0.5X積分)" },
    "boc_chill_merchant": {
        type: "category", match: ["chill_merchant"], rate: 10, desc: "Chill商戶 10X積分 (10%) ⚠️ 需實體零售$1,500",
        mode: "replace", setting_key: "boc_amazing_enabled", req_mission_key: "spend_boc_chill", req_mission_spend: 1500,
        cap_mode: "reward", cap_limit: 15000, cap_key: "boc_chill_cap"
    },
    "boc_chill_online_overseas": {
        type: "category", match: ["online", "overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other"],
        rate: 5, desc: "網購/海外 5X積分 (5%)", mode: "replace",
        cap_mode: "reward", cap_limit: 15000, cap_key: "boc_chill_cap"
    },

    // Go Card
    "boc_go_base": { type: "always", rate: 0.5, desc: "基本 (0.5X積分)" },
    "boc_go_mobile": {
        type: "category", match: ["alipay", "wechat"], rate: 4, desc: "手機支付 4X積分 (4%)",
        mode: "replace", cap_mode: "reward", cap_limit: 10000, cap_key: "boc_go_mobile_cap"
    },
    "boc_go_merchant": {
        type: "category", match: ["go_merchant"], rate: 5, desc: "Go商戶 5X積分 (5%)",
        mode: "replace", cap_mode: "reward", cap_limit: 10000, cap_key: "boc_go_merchant_cap"
    },

    // --- American Express Modules ---
    "ae_explorer_base": { type: "always", rate: 3, desc: "基本 3X" },
    "ae_explorer_overseas": {
        type: "category", match: ["overseas", "overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other", "online", "travel", "airline"], rate: 0.272, desc: "海外/網上/旅遊 ($3.6/里)", mode: "replace"
    },
    "ae_explorer_selected": {
        type: "category", match: ["travel", "cathay_hkexpress", "online", "entertainment", "electronics"], rate: 9, desc: "指定 +9X",
        cap_mode: "spending", cap_limit: 10000, cap_key: "ae_explorer_q_selected_cap"
    },

    // AE Platinum (Fine Head)
    "ae_plat_base": { type: "always", rate: 2, desc: "Turbo 2X" },
    "ae_plat_overseas": {
        type: "category", match: ["overseas", "overseas_jkt", "overseas_tw", "online_foreign"], rate: 6, desc: "海外 +6X",
        cap_mode: "spending", cap_limit: 15000, cap_key: "ae_plat_overseas_cap"
    },
    "ae_plat_travel": {
        type: "category", match: ["travel", "cathay_hkexpress"], rate: 7, desc: "旅遊 +7X",
        cap_mode: "spending", cap_limit: 15000, cap_key: "ae_plat_travel_cap"
    },
    "ae_plat_daily": {
        type: "category", match: ["grocery", "department_store"], rate: 7, desc: "日常 +7X",
        cap_mode: "spending", cap_limit: 15000, cap_key: "ae_plat_daily_cap"
    },

    // AE Platinum Credit (Big Head)
    "ae_pcc_base": { type: "always", rate: 1, desc: "基本 1X" },
    "ae_pcc_special": {
        type: "category", match: ["grocery", "gas"], rate: 5, desc: "超市/油站 +5X",
        cap_mode: "reward", cap_limit: 30000, cap_key: "ae_pcc_double_cap"
    },

    // AE Blue Cash
    "ae_blue_cash_base": { type: "always", rate: 0.012, desc: "回贈 1.2%" },

    // --- Fubon Series ---
    "fubon_in_base": { type: "always", rate: 1, desc: "基本 1X (0.4%)" },
    "fubon_in_online": {
        type: "category", match: ["online"], rate: 19, desc: "網購 +19X (8%)",
        mode: "add", setting_key: "fubon_in_promo_enabled", req_mission_key: "spend_fubon_in_platinum", req_mission_spend: 1000,
        cap_mode: "reward", cap_limit: 62500, cap_key: "fubon_in_bonus_cap" // $250 = 62,500 pts
    },
    // Fubon Travel
    "fubon_travel_base": { type: "always", rate: 1, desc: "基本 1X" },
    "fubon_travel_tw": { type: "category", match: ["overseas_tw"], rate: 19, desc: "台灣 +19X (20X)", mode: "add" },
    "fubon_travel_jpkr": { type: "category", match: ["overseas_jkt"], rate: 9, desc: "日韓泰 +9X (10X)", mode: "add" },
    // "fubon_travel_tw": I can't trigger this without new UI.
    // I'll omit separate TW module for now and assume 10X is good baseline.
    "fubon_travel_euro": { type: "category", match: ["overseas_other"], rate: 4, desc: "歐美 +4X (5X)", mode: "add" },

    // --- sim Credit ---
    "sim_base": { type: "always", rate: 0.004, desc: "基本 0.4%" },
    "sim_online": {
        type: "category", match: ["online"], rate: 0.076, desc: "網購 +7.6% (8%)",
        mode: "add", setting_key: "sim_promo_enabled", req_mission_key: "sim_non_online_spend", req_mission_spend: 500,
        cap_mode: "reward", cap_limit: 200, cap_key: "sim_online_cap"
    },
    "sim_non_online_tracker": {
        type: "mission_tracker", req_mission_key: "sim_non_online_spend",
        match: ["general", "dining", "nfc_payment", "overseas", "overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other", "alipay", "wechat", "payme", "oepay", "grocery", "sportswear", "medical", "transport", "travel", "entertainment", "apparel", "health_beauty", "telecom", "other", "moneyback_merchant", "tuition", "chill_merchant", "go_merchant"],
        desc: "Sim Credit 非網購 ($500)", mission_id: "sim_non_online",
        eligible_check: (cat) => cat !== 'online' && cat !== 'online_foreign'
    },

    // --- Mox Credit ---
    "mox_base": { type: "always", rate: 0.01, desc: "基本 1%" },
    "mox_task_bonus": {
        type: "always", rate: 0.01, desc: "+1% (活期任務)", mode: "add",
        setting_key: "mox_deposit_task_enabled"
    },
    "mox_supermarket": {
        type: "category", match: ["grocery", "supermarket"], rate: 0.03, desc: "超市 3%",
        mode: "replace"
    },

    // --- AEON WAKUWAKU ---
    "aeon_waku_base": { type: "always", rate: 0.005, desc: "基本 0.5%" },
    "aeon_waku_online": {
        type: "category", match: ["online"], rate: 0.055, desc: "網購 +5.5% (6%)",
        mode: "add", cap_mode: "reward", cap_limit: 300, cap_key: "aeon_waku_cap"
    },
    "aeon_waku_japan": {
        type: "category", match: ["overseas_jktt"], rate: 0.025, desc: "日本 +2.5% (3%)", // Includes JP
        mode: "add", cap_mode: "reward", cap_limit: 300, cap_key: "aeon_waku_cap"
    },

    // --- WeWa / EarnMORE ---
    "wewa_base": { type: "always", rate: 0.004, desc: "基本 0.4%" },
    "wewa_bonus": {
        type: "category", match: ["travel", "entertainment", "apparel" /*Theme park?*/], rate: 0.036, desc: "旅遊/玩樂 +3.6% (4%)",
        mode: "add", cap_mode: "reward", cap_limit: 2000, cap_key: "wewa_annual_cap"
    },
    "earnmore_base": {
        type: "always", rate: 0.02, desc: "全線 2%",
        cap_mode: "spending", cap_limit: 150000, cap_key: "earnmore_annual_spend"
    }

};

// ... (conversionDB 保持 V10.3) ...
const conversionDB = [
    { src: "HSBC_RC_EM", miles_rate: 20, cash_rate: 1 },
    { src: "HSBC_RC", miles_rate: 10, cash_rate: 1 },
    { src: "AM_Direct", miles_rate: 1, cash_rate: 0 },
    { src: "CASH_Direct", miles_rate: 0, cash_rate: 1 },
    { src: "DBS_Black_Points", miles_rate: 1, cash_rate: 0.1 },
    { src: "Fun_Dollars", miles_rate: 0, cash_rate: 1 },
    { src: "CITI_PM_PTS", miles_rate: 1 / 12, cash_rate: 0.004 }, // 12分=1里
    { src: "CITI_R_PTS", miles_rate: 1 / 15, cash_rate: 0.004 },  // 15分=1里
    { src: "CLUB_PTS", miles_rate: 0, cash_rate: 0.2 },
    { src: "YUU_Points", miles_rate: 0, cash_rate: 0.005 },
    { src: "DBS_Dollar", miles_rate: 1000 / 48, cash_rate: 1 }, // DBS Black: $48 = 1000 Miles
    { src: "DBS_Dollar_Others", miles_rate: 1000 / 72, cash_rate: 1 }, // Eminent/Live Fresh: $72 = 1000 Miles
    { src: "COMPASS_Dollar", miles_rate: 10, cash_rate: 1 }   // $100 = 1000 Miles => $1 = 10 Miles
];
// BOC Points conversion
const bocPointsConversion = { src: "BOC_Points", miles_rate: 1 / 15, cash_rate: 0.004 }; // 15分=1里 | 250分=$1 (Updated to std rate)
conversionDB.push(bocPointsConversion);// BOC Points added
conversionDB.push({ src: "AE_MR", miles_rate: 1 / 18, cash_rate: 1 / 300 }); // 18分=1里 | 300分=$1
conversionDB.push({ src: "Fubon_Points", miles_rate: 1 / 15, cash_rate: 1 / 200 }); // 15分=1里 | 200分=$1
