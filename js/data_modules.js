// js/data_modules.js

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
    "em_designated": { type: "category", match: ["streaming", "em_designated_spend"], rate: 0.025, desc: "指定 $2/里 (2.5%)", mode: "replace" },
    "em_grocery_low": { type: "category", match: ["grocery"], rate: 0.004, desc: "超市 (0.4%)", mode: "replace" },
    "red_base": { type: "always", rate: 0.004, desc: "基本 (0.4%)" },
    "red_online": { type: "category", match: ["online"], rate: 0.04, desc: "網購 +3.6% (4%)", mode: "replace", cap_mode: "reward", cap_limit: 400, cap_key: "red_online_cap", cap: { key: "red_online_cap", period: "month" } },
    "red_designated_bonus": { type: "category", match: ["red_designated"], rate: 0.076, desc: "指定商戶 +7.6% (8%)", cap_mode: "reward", cap_limit: 100, cap_key: "red_designated_cap", cap: { key: "red_designated_cap", period: "month" } },
    // [NEW] Actual Calculation Module for EveryMile Promo
    // Base 1% + Bonus 1.5% = 2.5% ($2/mile). Req $12,000 spend.
    "em_overseas_bonus": {
        type: "category", match: ["overseas"], rate: 0.015, desc: "EM推廣 (+1.5%)",
        mode: "add", setting_key: "em_promo_enabled",
        req_mission_spend: 12000, req_mission_key: "em_q1_total",
        cap_mode: "reward", cap_limit: 225, cap_key: "em_promo_cap" // $225 RC cap (approx $15,000 usage capped at bonus?) No, wait.
        // User said: "Math.floor(pot) / 225". Limit is $225 RC.
        // 1.5% of $15,000 = $225. So Cap is indeed $225 Reward.
    },
    "travel_guru_v2": { type: "guru_capped", category: "overseas", config: { 1: { rate: 0.03, cap_rc: 500, desc: "GO級 (+3%)" }, 2: { rate: 0.04, cap_rc: 1200, desc: "GING級 (+4%)" }, 3: { rate: 0.06, cap_rc: 2200, desc: "GURU級 (+6%)" } }, usage_key: "guru_rc_used" },

    // --- SC ---
    "sc_cathay_base": { type: "always", rate: 0.1666, desc: "基本 $6/里" },
    "sc_cathay_dining_hotel": { type: "category", match: ["dining", "hotel"], rate: 0.0834, desc: "食肆/酒店 $4/里" },
    "sc_cathay_overseas_std": { type: "category", match: ["overseas"], rate: 0.0834, desc: "海外 $4/里" },
    "sc_cathay_overseas_priority": { type: "category", match: ["overseas"], rate: 0.1667, desc: "優先理財: 海外 $3/里" },
    "sc_cathay_private": { type: "category", match: ["overseas"], rate: 0.3334, desc: "優先私人: 海外 $2/里" },
    "sc_cathay_airlines": { type: "category", match: ["cathay_hkexpress"], rate: 0.3334, desc: "CX/UO 加碼至 $2/里" },
    "sc_simply_cash_base": { type: "always", rate: 0.015, desc: "本地 1.5%" },
    "sc_simply_cash_foreign": { type: "category", match: ["overseas"], rate: 0.02, desc: "外幣 2%", mode: "replace" },
    "sc_smart_base": { type: "always", rate: 0.0055, desc: "基本 0.55%" },
    "sc_smart_designated": { type: "category", match: ["smart_designated"], rate: 0.05, desc: "指定商戶 5%", mode: "replace", cap_limit: 60000, cap_key: "sc_smart_cap" },

"sc_cathay_overseas_private": { type: "category", match: ["overseas"], rate: 0.3334, desc: "Private: Overseas $2/mi" },

    // --- Citi ---
    "citi_pm_base": { type: "always", rate: 1.5, desc: "基本 1.5X ($8/里)" },
    "citi_pm_overseas": { type: "category", match: ["overseas"], rate: 3, desc: "海外 3X ($4/里)", mode: "replace" },
    "citi_prestige_base": { type: "always", rate: 2, desc: "基本 2X ($6/里)" },
    "citi_prestige_overseas": { type: "category", match: ["overseas"], rate: 3, desc: "海外 3X ($4/里)", mode: "replace" },

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
    "citi_cb_special": { type: "category", match: ["dining", "hotel", "overseas"], rate: 0.02, desc: "特選類別 (2%)", mode: "replace" },
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
    "dbs_black_overseas_std": { type: "category", match: ["overseas"], rate: 0.012, desc: "海外 ($4/里)", mode: "replace" }, // 0.048/4 = 0.012
    "dbs_black_overseas_promo": {
        type: "category", match: ["overseas"], rate: 0.024, desc: "海外 ($2/里)", mode: "replace",
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
        type: "category", match: ["overseas"], rate: 0.01, desc: "網上外幣 (1%)", mode: "replace"
        // 只限外幣網上簽賬（海外交易），非自選類別時適用
    },
    "dbs_live_fresh_base": { type: "always", rate: 0.004, desc: "基本 (0.4%)" },

    // --- Hang Seng Modules (V10.13) ---
    "hangseng_base": { type: "always", rate: 0.004, desc: "基本 (0.4%)" },

    // MMPower (Base 0.4% + Bonus)
    // Overseas: 6% Total => 5.6% Bonus. Cap $500 Reward.
    "mmpower_overseas_bonus": {
        type: "category", match: ["overseas"], rate: 0.056, desc: "MMP+海外 (5.6%)",
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
        type: "category", match: ["overseas"], rate: 0.046, desc: "T+其他外幣 (4.6%)",
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
        type: "category", match: ["overseas"], rate: 9, desc: "外幣 +9X積分",
        cap_mode: "reward", cap_limit: 250000, cap_key: "boc_cheers_travel_cap",
        secondary_cap_key: "boc_cheers_total_cap_vi", secondary_cap_limit: 300000
    },
    "boc_cheers_overseas_vs": {
        type: "category", match: ["overseas"], rate: 9, desc: "外幣 +9X積分",
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
        type: "category", match: ["online", "overseas"],
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
    "boc_sogo_mobile_pay": {
        type: "category", rate: 0.054, desc: "手機支付 5.4%",
        mode: "replace", cap_mode: "reward", cap_limit: 2000, cap_key: "boc_sogo_mobile_cap", cap: { key: "boc_sogo_mobile_cap", period: "month" },
        eligible_check: (cat, ctx) => !!(ctx && ["apple_pay", "google_pay", "samsung_pay", "mobile"].includes(ctx.paymentMethod))
    },


    // --- American Express Modules ---
    "ae_explorer_base": { type: "always", rate: 3, desc: "基本 3X" },
    "ae_explorer_overseas": {
        type: "category", match: ["overseas", "online", "travel", "airline"], rate: 0.272, desc: "海外/網上/旅遊 ($3.6/里)", mode: "replace"
    },
    "ae_explorer_selected": {
        type: "category", match: ["travel", "cathay_hkexpress", "online", "entertainment", "electronics"], rate: 9, desc: "指定 +9X",
        cap_mode: "spending", cap_limit: 10000, cap_key: "ae_explorer_q_selected_cap"
    },

    // AE Platinum (Fine Head)
    "ae_plat_base": { type: "always", rate: 2, desc: "Turbo 2X" },
    "ae_plat_overseas": {
        type: "category", match: ["overseas"], rate: 6, desc: "海外 +6X",
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
    "wewa_mobile_pay": {
        type: "category", rate: 0.04, desc: "手機支付 4%",
        mode: "replace", cap_mode: "spending", cap_limit: 5556, cap_key: "wewa_mobile_pay_cap", cap: { key: "wewa_mobile_pay_cap", period: "month" },
        req_mission_spend: 1500, req_mission_key: "wewa_mobile_mission",
        eligible_check: (cat, ctx) => !!(ctx && ["apple_pay", "omycard", "mobile"].includes(ctx.paymentMethod))
    },
    "earnmore_base": {
        type: "always", rate: 0.02, desc: "全線 2%",
        cap_mode: "spending", cap_limit: 150000, cap_key: "earnmore_annual_spend"
    },

    // --- BEA 東亞 ---
    "bea_goal_base": { type: "always", rate: 0.004, desc: "基本 0.4%" },
    "bea_goal_travel_transport": {
        type: "category", match: ["travel", "transport"], rate: 0.06, desc: "旅遊/交通 6%",
        mode: "replace", cap_mode: "reward", cap_limit: 200, cap_key: "bea_goal_cap", cap: { key: "bea_goal_cap", period: "month" },
        req_mission_spend: 2000, req_mission_key: "bea_goal_mission"
    },
    "bea_goal_entertainment": {
        type: "category", match: ["entertainment"], rate: 0.05, desc: "娛樂 5%",
        mode: "replace", cap_mode: "reward", cap_limit: 200, cap_key: "bea_goal_cap", cap: { key: "bea_goal_cap", period: "month" },
        req_mission_spend: 2000, req_mission_key: "bea_goal_mission"
    },
    "bea_goal_online_mobile": {
        type: "category", rate: 0.044, desc: "手機支付 4.4%",
        mode: "replace", cap_mode: "spending", cap_limit: 5000, cap_key: "bea_goal_mobile_cap", cap: { key: "bea_goal_mobile_cap", period: "month" },
        req_mission_spend: 2000, req_mission_key: "bea_goal_mission",
        eligible_check: (cat, ctx) => !!(ctx && ["apple_pay", "google_pay", "mobile"].includes(ctx.paymentMethod))
    },

    "bea_world_base": { type: "always", rate: 1, desc: "基本 1X" },
    "bea_world_bonus": {
        type: "category",
        match: ["dining", "overseas", "online", "electronics", "apparel", "gym", "medical"],
        rate: 12.5,
        desc: "指定類別 12.5X",
        mode: "replace", cap_mode: "reward", cap_limit: 115000, cap_key: "bea_world_cap", cap: { key: "bea_world_cap", period: "month" },
        req_mission_spend: 4000, req_mission_key: "bea_world_mission"
    },

    "bea_ititanium_base": { type: "always", rate: 0.004, desc: "基本 0.4%" },
    "bea_ititanium_online_mobile": {
        type: "category", rate: 0.036, desc: "網購/手機支付 3.6%",
        mode: "replace", cap_mode: "reward", cap_limit: 300, cap_key: "bea_ititanium_cap", cap: { key: "bea_ititanium_cap", period: "month" },
        req_mission_spend: 2000, req_mission_key: "bea_ititanium_mission",
        eligible_check: (cat, ctx) => !!(ctx && (ctx.isOnline || ctx.isMobilePay))
    },

    "bea_unionpay_base": { type: "always", rate: 1, desc: "基本 1X" },
    "bea_unionpay_rmb": {
        type: "category", match: ["overseas_cn"], rate: 12, desc: "人民幣簽賬 12X",
        mode: "replace", cap_mode: "reward", cap_limit: 100000, cap_key: "bea_unionpay_cap", cap: { key: "bea_unionpay_cap", period: "month" }
    },
    "bea_unionpay_fx": {
        type: "category", match: ["overseas"], rate: 10, desc: "外幣簽賬 10X",
        mode: "replace", cap_mode: "reward", cap_limit: 100000, cap_key: "bea_unionpay_cap", cap: { key: "bea_unionpay_cap", period: "month" }
    },
    "bea_unionpay_dining": {
        type: "category", match: ["dining"], rate: 3, desc: "本地食肆 3X",
        mode: "replace", cap_mode: "reward", cap_limit: 100000, cap_key: "bea_unionpay_cap", cap: { key: "bea_unionpay_cap", period: "month" }
    },
    "bea_unionpay_local": {
        type: "category", match: ["general"], rate: 2, desc: "本地零售 2X",
        mode: "replace", cap_mode: "reward", cap_limit: 100000, cap_key: "bea_unionpay_cap", cap: { key: "bea_unionpay_cap", period: "month" }
    }

};

// ... (conversionDB 保持 V10.3) ...
