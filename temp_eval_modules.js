// js/data_modules.js

module.exports = {
    // --- HSBC ---
    "hsbc_std_base": { type: "always", rate: 0.004, desc: "基本 0.4%", last_verified_at: "2026-02-06", source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/reward-scheme-terms-and-conditions.pdf" },
    "vs_base": { type: "always", rate: 0.004, desc: "基本 0.4%", last_verified_at: "2026-02-06", source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/docs/credit-cards/visa-signature/special-reward-tnc.pdf" },
    "red_hot_variable": {
        type: "red_hot_allocation",
        rate_per_x: 0.004,
        desc: "最紅自主獎賞",
        display_name_zhhk: "HSBC 最紅自主獎賞",
        note_zhhk: "按你分配嘅 5X 最紅自主權重計算；每 1X = 額外 0.4%，只限最紅自主類別及條款列明合資格交易。",
        setting_key: "red_hot_rewards_enabled",
        last_verified_at: "2026-02-05",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/rewards/2026-red-hot-rewards-of-your-choice-terms-and-conditions.pdf, https://www.hsbc.com.hk/zh-hk/credit-cards/rewards/your-choice/#3",
        tnc_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/rewards/2026-red-hot-rewards-of-your-choice-terms-and-conditions.pdf",
        promo_url: "https://www.hsbc.com.hk/zh-hk/credit-cards/rewards/your-choice/",
        registration_url: "https://forms.hsbc.com.hk/en-hk/red-hot-rewards-of-your-choice/",
        registration_start: "2025-11-24",
        registration_end: "2026-10-31",
        registration_note: "可於 HSBC Reward+ 或網上表格登記；2026 年獎賞於 2026-01-01 生效",
        // 「最紅自主」通常以年度為週期（之後如要自訂週期，可用 periodOverrides.byKey/modules 擴展）。
        cap: { period: { type: "year", startMonth: 1, startDay: 1 } }
    },
    "vs_red_hot_bonus": {
        type: "red_hot_fixed_bonus",
        multiplier: 3,
        rate_per_x: 0.004,
        desc: "VS專屬賞",
        display_name_zhhk: "Visa Signature 特別獎賞",
        note_zhhk: "Visa Signature 於最紅自主類別之合資格簽賬，固定額外 1.2%，可與最紅自主分配同時生效。",
        last_verified_at: "2026-02-05",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/rewards/2026-red-hot-rewards-of-your-choice-terms-and-conditions.pdf, https://www.hsbc.com.hk/zh-hk/credit-cards/rewards/your-choice/#3"
    },
    // Easy Card「易賞錢」：百佳/屈臣氏 $5=1分；豐澤 $10=1分（同樣 6 倍會出現兩個不同回贈率）。
    // - 新交易請用細分 category；舊 category 仍保留以支援已記帳資料。
    "easy_moneyback_bonus": {
        type: "category", match: ["moneyback_merchant"], rate: 0.024, desc: "易賞錢指定商戶 6倍 2.4%", mode: "replace",
        note_zhhk: "基本「易賞錢」獎賞積分即於百佳及屈臣氏作每港幣 5 元簽賬相等於 1「易賞錢」積分或於豐澤作\n每港幣 10 元簽賬相等於 1「易賞錢」積分;6 倍「易賞錢」獎賞積分即於百佳及屈臣氏作每港幣 5 元\n簽賬相等於 6「易賞錢」 積分或於豐澤作每港幣 10 元簽賬相等於 6「易賞錢」積分;而 4 倍「易賞錢\n」獎賞積分即於百佳及屈臣氏作每港幣 5 元簽賬相等於 4「易賞錢」積分或於豐澤作每港幣 10 元簽\n賬相等於 4「易賞錢」積分。有關「易賞錢」積分的條款及細則請參閱「易賞錢」網頁",
        last_verified_at: "2026-02-06",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/visa-platinum-card-exclusive-offers.pdf"
    },
    "easy_moneyback_pns_watsons_4x": {
        type: "category",
        match: ["moneyback_pns_watsons"],
        rate: 0.016,
        desc: "易賞錢：百佳/屈臣氏 4倍 1.6%",
        mode: "replace",
        valid_from: "2025-05-19",
        valid_to: "2026-12-31",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/visa-platinum-card-exclusive-offers.pdf",
        eligible_check: (cat, ctx) => !((ctx && ctx.settings && ctx.settings.hsbc_easy_is_vip))
    },
    "easy_moneyback_pns_watsons_6x": {
        type: "category",
        match: ["moneyback_pns_watsons"],
        rate: 0.024,
        desc: "易賞錢：百佳/屈臣氏 6倍 2.4% (VIP)",
        mode: "replace",
        valid_from: "2025-05-19",
        valid_to: "2026-12-31",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/visa-platinum-card-exclusive-offers.pdf",
        eligible_check: (cat, ctx) => !!(ctx && ctx.settings && ctx.settings.hsbc_easy_is_vip)
    },
    "easy_moneyback_fortress_4x": {
        type: "category",
        match: ["moneyback_fortress"],
        rate: 0.008,
        desc: "易賞錢：豐澤 4倍 0.8%",
        mode: "replace",
        valid_from: "2025-05-19",
        valid_to: "2026-12-31",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/visa-platinum-card-exclusive-offers.pdf",
        eligible_check: (cat, ctx) => !((ctx && ctx.settings && ctx.settings.hsbc_easy_is_vip))
    },
    "easy_moneyback_fortress_6x": {
        type: "category",
        match: ["moneyback_fortress"],
        rate: 0.012,
        desc: "易賞錢：豐澤 6倍 1.2% (VIP)",
        mode: "replace",
        valid_from: "2025-05-19",
        valid_to: "2026-12-31",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/visa-platinum-card-exclusive-offers.pdf",
        eligible_check: (cat, ctx) => !!(ctx && ctx.settings && ctx.settings.hsbc_easy_is_vip)
    },
    "easy_additional_offer_3x": {
        type: "category",
        match: ["easy_additional_3x"],
        rate: 0.012,
        desc: "指定商戶 3X 易賞錢積分 1.2%",
        mode: "replace",
        valid_from: "2025-05-19",
        valid_to: "2026-02-28",
        last_verified_at: "2026-02-21",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/visa-platinum-exclusive-additional-offers.pdf",
        tnc_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/visa-platinum-exclusive-additional-offers.pdf",
        promo_url: "https://www.hsbc.com.hk/zh-hk/credit-cards/offers-and-promotions/",
        note_zhhk: "以「3X 即總共 3 倍易賞錢積分」計為 1.2%。hutchgo mall、3HK/SUPREME 指定服務、海逸指定年票/套餐等條件未能由系統自動識別，需手動判斷。"
    },
    // Reward cap is $200. Use reward-based cap to avoid 8333 * 2.4% => 199.992 rounding artifacts.
    "student_tuition_bonus": {
        type: "category",
        match: ["tuition"],
        rate: 0.024,
        desc: "學費回贈 2.4%",
        display_name_zhhk: "HSBC 學生卡學費回贈",
        last_verified_at: "2026-02-06",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/docs/credit-cards/tc/tuition-fee-payment-tcs1.pdf",
        cap_mode: "reward",
        cap_limit: 200,
        cap_key: "student_tuition_cap",
        tnc_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/docs/credit-cards/tc/tuition-fee-payment-tcs1.pdf"
    },
    "pulse_china_bonus": {
        type: "category",
        match: ["china_consumption"],
        rate: 0.02,
        desc: "內地/澳門手機支付額外 2%",
        display_name_zhhk: "HSBC Pulse 內地/澳門手機支付額外回贈",
        last_verified_at: "2026-02-06",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/unionpay-dual-currency/diamond-card-terms-and-conditions.pdf",
        mode: "add",
        eligible_check: (cat, ctx) => !!(ctx && ctx.paymentMethod && ctx.paymentMethod !== "physical")
    },
    "em_base": { type: "always", rate: 0.01, desc: "基本 1%", last_verified_at: "2026-02-05", source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/docs/credit-cards/everymile/everymile-everyday-spend.pdf" },
    "em_designated": { type: "category", match: ["streaming", "em_designated_spend"], rate: 0.025, desc: "EveryMile 指定商戶 2.5%", mode: "replace", last_verified_at: "2026-02-05", source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/docs/credit-cards/everymile/everymile-everyday-spend.pdf" },
    "em_grocery_low": { type: "category", match: ["grocery"], rate: 0.004, desc: "EveryMile 超市 0.4%", mode: "replace", last_verified_at: "2026-02-05", source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/docs/credit-cards/everymile/everymile-everyday-spend.pdf" },
    "red_base": {
        type: "always",
        rate: 0.004,
        desc: "基本 0.4%",
        last_verified_at: "2026-02-21",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/reward-scheme-terms-and-conditions.pdf"
    },
    "red_online": {
        type: "category",
        match: ["online"],
        rate: 0.036,
        desc: "網購額外 3.6%",
        display_name_zhhk: "HSBC Red 網上購物額外回贈",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 360,
        cap_key: "red_online_bonus_cap",
        cap: { key: "red_online_bonus_cap", period: "month" },
        last_verified_at: "2026-02-21",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/reward-scheme-terms-and-conditions.pdf",
        eligible_check: (cat, ctx) => !(ctx && ctx.isOnline && cat === "red_designated")
    },
    "red_designated_bonus": {
        type: "category",
        match: ["red_designated"],
        rate: 0.076,
        desc: "指定商戶額外 7.6%",
        display_name_zhhk: "HSBC Red 指定商戶額外回贈",
        mode: "add",
        cap_mode: "spending",
        cap_limit: 1250,
        cap_key: "red_designated_spend_cap",
        cap: { key: "red_designated_spend_cap", period: "month" },
        last_verified_at: "2026-02-21",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/reward-scheme-terms-and-conditions.pdf"
    },
    "red_designated_online_overflow_bonus": {
        type: "category_overflow_bonus",
        match: ["online"],
        rate: 0.036,
        desc: "網購額外 3.6%",
        display_name_zhhk: "HSBC Red 網上購物額外回贈（指定商戶封頂後）",
        mode: "add",
        overflow_after_cap_key: "red_designated_spend_cap",
        overflow_after_cap_limit: 1250,
        cap_mode: "reward",
        cap_limit: 360,
        cap_key: "red_online_bonus_cap",
        cap: { key: "red_online_bonus_cap", period: "month" },
        last_verified_at: "2026-02-21",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/reward-scheme-terms-and-conditions.pdf",
        eligible_check: (cat, ctx) => !!(ctx && ctx.isOnline && cat === "red_designated")
    },
    "red_mcd_stamp_cashback": {
        type: "stamp_cashback",
        desc: "麥當勞印花卡獎賞（每4個印花=$15）",
        setting_key: "red_mcd_stamp_enabled",
        stamp_progress_key: "red_mcd_stamp_total",
        stamps_per_reward: 4,
        reward_per_reward: 15,
        cap_mode: "reward",
        cap_limit: 360,
        cap_key: "red_mcd_reward_cap",
        cap: { key: "red_mcd_reward_cap", period: { type: "promo", startDate: "2026-02-16", endDate: "2026-12-31" } },
        counter: { key: "red_mcd_stamp_total", period: { type: "promo", startDate: "2026-02-16", endDate: "2026-12-31" } },
        valid_from: "2026-02-16",
        valid_to: "2026-12-31",
        last_verified_at: "2026-02-21",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/red/terms-and-conditions-mcdonald.pdf",
        tnc_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/red/terms-and-conditions-mcdonald.pdf",
        promo_url: "https://www.hsbc.com.hk/zh-hk/credit-cards/rewards/your-choice/",
        registration_url: "https://www.hsbc.com.hk/rewardplus/",
        registration_start: "2026-02-16",
        registration_end: "2026-12-31",
        registration_note: "需於 HSBC Reward+ 應用程式登記「麥當勞電子印花卡獎賞」",
        note_zhhk: "每宗合資格簽賬滿$30可賺1印花；每日最多1個、每月最多8個、推廣期最多96個；每累積4個印花可獲$15。"
    },
    // [NEW] Actual Calculation Module for EveryMile Promo
    // Base 1% + Bonus 1.5% = 2.5% ($2/mile). Req $12,000 spend.
    "em_overseas_bonus": {
        type: "category", match: ["overseas"], rate: 0.015, desc: "EveryMile 海外簽賬額外 1.5%",
        display_name_zhhk: "EveryMile 外幣簽賬優惠",
        mode: "add", setting_key: "em_promo_enabled",
        last_verified_at: "2026-02-12",
        source_url: "https://www.redhotoffers.hsbc.com.hk/tc/latest-offers/everymile-spending-offer/, https://www.hsbc.com.hk/content/dam/hsbc/hk/docs/credit-cards/everymile/everymile-everyday-spend.pdf",
        req_mission_spend: 12000, req_mission_key: "em_q1_total",
        progress_mission_key: "em_q1_eligible",
        cap_mode: "reward", cap_limit: 225, cap_key: "em_promo_cap", // $225 RC cap (approx $15,000 usage capped at bonus?) No, wait.
        tnc_url: "https://www.redhotoffers.hsbc.com.hk/tc/latest-offers/everymile-spending-offer/terms-and-conditions/",
        promo_url: "https://www.redhotoffers.hsbc.com.hk/tc/latest-offers/everymile-spending-offer/",
        registration_url: "https://www.hsbc.com.hk/rewardplus/",
        registration_start: "2026-01-01",
        registration_end: "2026-06-30",
        registration_note: "需於 HSBC Reward+ 應用程式登記"
        // User said: "Math.floor(pot) / 225". Limit is $225 RC.
        // 1.5% of $15,000 = $225. So Cap is indeed $225 Reward.
    },
    "travel_guru_v2": {
        type: "guru_capped",
        category: "overseas",
        setting_key: "travel_guru_registered",
        eligible_check: (cat, ctx) => !(ctx && ctx.isOnline),
        last_verified_at: "2026-02-05",
        source_url: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/everymile/everymile-rewards-scheme-travel-benefits.pdf",
        req_mission_spend: 8000,
        req_mission_key: "spend_guru_unlock",
        tnc_url: "https://www.redhotoffers.hsbc.com.hk/media/100531673/TC_TC_Spending-Requirements-and-Offers-for-Travel-Guru-Membership-Programme_20260101.pdf",
        promo_url: "https://www.redhotoffers.hsbc.com.hk/tc/latest-offers/travel-guru/",
        registration_url: "https://forms.hsbc.com.hk/en-hk/travelgururegistration/",
        registration_start: "2025-06-16",
        registration_end: "2025-10-31",
        registration_note: "分階段登記：2025-06-16至07-03、09-01至09-30、10-01至10-31",
        config: {
            1: { rate: 0.03, cap_rc: 500, desc: "Travel Guru GO級 3%" },
            2: { rate: 0.04, cap_rc: 1200, desc: "Travel Guru GING級 4%" },
            3: { rate: 0.06, cap_rc: 2200, desc: "Travel Guru GURU級 6%" }
        },
        usage_key: "guru_rc_used"
    },

    // --- SC ---
    "sc_cathay_base": { type: "always", rate: 1 / 6, desc: "基本" },
    "sc_cathay_dining_hotel": { type: "category", match: ["dining", "hotel"], rate: 0.25, desc: "餐飲/酒店 $4/里", mode: "replace" },
    "sc_cathay_overseas_std": { type: "category", match: ["overseas"], rate: 0.25, desc: "海外 $4/里", mode: "replace" },
    "sc_cathay_overseas_priority": { type: "category", match: ["overseas"], rate: 1 / 3, desc: "優先理財：海外 $3/里", mode: "replace" },
    "sc_cathay_private": { type: "category", match: ["overseas"], rate: 0.5, desc: "優先私人：海外 $2/里", mode: "replace" },
    "sc_cathay_overseas_spending_offer_2026q2": {
        type: "category",
        match: ["overseas"],
        rate: 0.25,
        desc: "海外簽賬推廣額外 $4/里",
        mode: "add",
        setting_key: "sc_cathay_overseas_spending_offer_enabled",
        req_mission_spend: 10000,
        req_mission_key: "sc_cathay_overseas_spend_offer_spend",
        cap_mode: "reward",
        cap_limit: 2500,
        cap_key: "sc_cathay_overseas_spend_offer_bonus_cap",
        cap: { key: "sc_cathay_overseas_spend_offer_bonus_cap", period: { type: "promo", startDate: "2025-12-16", endDate: "2026-03-03" } },
        valid_from: "2025-12-16",
        valid_to: "2026-03-03",
        last_verified_at: "2026-02-21",
        source_url: "https://av.sc.com/hk/content/docs/hk-cc-cx-overseas-spending-offer-tnc.pdf",
        tnc_url: "https://av.sc.com/hk/content/docs/hk-cc-cx-overseas-spending-offer-tnc.pdf",
        registration_url: "https://www.sc.com/hk/campaign/cathay-mastercard-spending-rewards-promotion/apply/",
        registration_start: "2025-12-16",
        registration_end: "2026-03-03",
        registration_note: "需先登記；條款註明先到先得（首30,000位）"
    },
    "sc_cathay_airlines": {
        type: "category",
        rate: 2667 / 8000,
        desc: "國泰/HK Express 額外每 $8,000 +2,667 里",
        display_name_zhhk: "SC 國泰指定航空額外里數",
        mode: "add",
        req_mission_spend: 8000,
        req_mission_key: "sc_cathay_cxuo_spend",
        cap_mode: "reward",
        cap_limit: 2667,
        cap_key: "sc_cathay_cxuo_bonus_cap",
        cap: { key: "sc_cathay_cxuo_bonus_cap", period: { type: "quarter", startMonth: 1, startDay: 1 } },
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        promo_end: "2026-06-30",
        eligible_check: (cat, ctx) => {
            const merchantId = String((ctx && ctx.merchantId) || "").trim();
            return merchantId === "cathay_pacific" || merchantId === "hk_express";
        }
    },
    "sc_simply_cash_base": { type: "always", rate: 0.015, desc: "基本 1.5%" },
    "sc_simply_cash_foreign": { type: "category", match: ["overseas"], rate: 0.02, desc: "外幣 2%", mode: "replace" },
    "sc_smart_base": {
        type: "always",
        rate: 0.0056,
        desc: "基本 0.56%",
        req_mission_spend: 4000,
        req_mission_key: "sc_smart_monthly_eligible"
    },
    "sc_smart_base_tier2_bonus": {
        type: "always",
        rate: 0.0064,
        desc: "月簽滿 $15,000 額外 0.64%",
        req_mission_spend: 15000,
        req_mission_key: "sc_smart_monthly_eligible"
    },
    "sc_smart_designated": {
        type: "category",
        match: ["smart_designated"],
        rate: 0.0444,
        desc: "指定商戶加碼額外 4.4%",
        mode: "add",
        req_mission_spend: 4000,
        req_mission_key: "sc_smart_monthly_eligible",
        eligible_check: (cat, ctx) => {
            const merchantId = String((ctx && ctx.merchantId) || "").trim();
            if (merchantId !== "hkticketing") return true;
            const txDate = String((ctx && ctx.txDate) || "");
            if (!txDate) return true;
            return txDate <= "2026-02-14";
        },
        cap_mode: "spending",
        cap_limit: 5000,
        cap_key: "sc_smart_cap",
        cap: { key: "sc_smart_cap", period: "month" }
    },
    "sc_smart_designated_tier2_adjust": {
        type: "category",
        match: ["smart_designated"],
        rate: -0.0064,
        desc: "指定商戶高階調整 -0.64%",
        mode: "add",
        req_mission_spend: 15000,
        req_mission_key: "sc_smart_monthly_eligible",
        eligible_check: (cat, ctx) => {
            const merchantId = String((ctx && ctx.merchantId) || "").trim();
            if (merchantId !== "hkticketing") return true;
            const txDate = String((ctx && ctx.txDate) || "");
            if (!txDate) return true;
            return txDate <= "2026-02-14";
        },
        cap_mode: "spending",
        cap_limit: 5000,
        cap_key: "sc_smart_cap",
        cap: { key: "sc_smart_cap", period: "month" }
    },

    "sc_cathay_overseas_private": { type: "category", match: ["overseas"], rate: 0.5, desc: "優先私人：海外 $2/里", mode: "replace" },

    // --- Citi ---
    "citi_pm_base": { type: "always", rate: 1.5, desc: "基本每 $1 賺 1.5 積分 (0.6%)" },
    "citi_pm_overseas": { type: "category", match: ["overseas"], rate: 3, desc: "海外每 $1 賺 3 積分", mode: "replace" },
    "citi_prestige_base": { type: "always", rate: 2, desc: "基本每 $1 賺 2 積分 (0.8%)" },
    "citi_prestige_overseas": { type: "category", match: ["overseas"], rate: 3, desc: "海外每 $1 賺 3 積分", mode: "replace" },
    "citi_prestige_annual_bonus": { type: "prestige_annual_bonus", desc: "Citi Prestige 高達額外年資獎賞" },

    // Citi Rewards: base + bonus model.
    "citi_rewards_base": { type: "always", rate: 1, desc: "基本每 $1 賺 1 積分 (0.4%)" },
    "citi_rewards_mobile": {
        type: "category",
        match: ["dining", "grocery", "transport", "telecom", "general", "moneyback_merchant", "moneyback_pns_watsons", "moneyback_fortress", "smart_designated", "citi_club_merchant"],
        rate: 1.7,
        desc: "流動支付額外每 $1 +1.7 積分",
        mode: "add",
        eligible_check: (cat, ctx) => !!(ctx && ["apple_pay", "google_pay", "samsung_pay"].includes(ctx.paymentMethod)),
        cap_mode: "reward",
        cap_limit: 113400,
        cap_key: "citi_rewards_bonus_cap",
        cap: { key: "citi_rewards_bonus_cap", period: "month" }
    },
    "citi_rewards_shopping": {
        type: "category",
        match: ["department_store", "apparel", "entertainment"],
        rate: 7.1,
        desc: "購物/娛樂額外每 $1 +7.1 積分",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 113400,
        cap_key: "citi_rewards_bonus_cap",
        cap: { key: "citi_rewards_bonus_cap", period: "month" }
    },

    "citi_club_base": { type: "always", rate: 0.05, desc: "基本 1%" },
    "citi_club_designated": {
        type: "category",
        match: ["citi_club_merchant"],
        rate: 0.15,
        desc: "The Club 指定商戶額外 3%",
        display_name_zhhk: "Citi The Club 指定商戶額外回贈",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 1500,
        cap_key: "citi_club_designated_bonus_cap",
        cap: { key: "citi_club_designated_bonus_cap", period: "month" }
    },
    "citi_club_shopping_bonus": {
        type: "category",
        match: ["club_shopping"],
        rate: 0.05,
        desc: "Club Shopping額外 1%",
        display_name_zhhk: "Citi The Club Club Shopping 額外回贈",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 500,
        cap_key: "citi_club_shopping_bonus_cap",
        cap: { key: "citi_club_shopping_bonus_cap", period: "month" }
    },
    "citi_club_telecom_autopay": {
        type: "category",
        match: ["citi_club_telecom"],
        rate: 0.15,
        desc: "The Club 電訊 總回贈 3%",
        mode: "replace"
    },
    "citi_cb_base": { type: "always", rate: 0.01, desc: "基本 1%" },
    "citi_cb_special": {
        type: "category",
        match: ["dining", "hotel", "overseas"],
        rate: 0.02,
        desc: "特選類別 ｜英國/歐洲經濟區 實體簽賬除外 2%",
        mode: "replace",
        eligible_check: (cat, ctx) => !(cat === "overseas_uk_eea" && !(ctx && ctx.isOnline))
    },
    "citi_octopus_base": { type: "always", rate: 0.005, desc: "基本 0.5%" },

    // Citi Octopus tiered model:
    // - 月簽 >= 4,000：交通 15%，共享回贈上限 $300
    // - 月簽 >= 10,000：交通 15% / 隧道5%，共享回贈上限 $500
    "citi_octopus_transport_tier2": {
        type: "category",
        match: ["transport"],
        rate: 0.15,
        desc: "交通 15%",
        mode: "replace",
        eligible_check: (cat, ctx) => {
            if (cat === "tunnel") return false;
            if (!ctx || typeof ctx.getMissionSpend !== "function") return true;
            return ctx.getMissionSpend("spend_citi_octopus") >= 10000;
        },
        req_mission_spend: 10000,
        req_mission_key: "spend_citi_octopus",
        cap_mode: "reward",
        cap_limit: 500,
        cap_key: "citi_octopus_reward_cap",
        cap: { key: "citi_octopus_reward_cap", period: "month" },
        counter: { key: "spend_citi_octopus", period: "month" }
    },
    "citi_octopus_transport_tier1": {
        type: "category",
        match: ["transport"],
        rate: 0.15,
        desc: "交通 15%",
        mode: "replace",
        eligible_check: (cat, ctx) => {
            if (cat === "tunnel") return false;
            if (!ctx || typeof ctx.getMissionSpend !== "function") return true;
            return ctx.getMissionSpend("spend_citi_octopus") < 10000;
        },
        req_mission_spend: 4000,
        req_mission_key: "spend_citi_octopus",
        cap_mode: "reward",
        cap_limit: 300,
        cap_key: "citi_octopus_reward_cap",
        cap: { key: "citi_octopus_reward_cap", period: "month" },
        counter: { key: "spend_citi_octopus", period: "month" }
    },

    // 隧道/泊車 5%（月簽 >= 10,000；與交通共享 Tier 2 回贈上限）
    "citi_octopus_tunnel": {
        type: "category",
        match: ["tunnel"],
        rate: 0.05,
        desc: "隧道/泊車 5%",
        mode: "replace",
        req_mission_spend: 10000,
        req_mission_key: "spend_citi_octopus",
        cap_mode: "reward",
        cap_limit: 500,
        cap_key: "citi_octopus_reward_cap",
        cap: { key: "citi_octopus_reward_cap", period: "month" },
        counter: { key: "spend_citi_octopus", period: "month" }
    },

    // --- Other Banks ---
    "dbs_black_base": { type: "always", rate: 0.008, desc: "基本 0.8%" },
    "dbs_black_overseas_std": { type: "category", match: ["overseas"], rate: 0.012, desc: "海外 1.2%", mode: "replace" },
    "dbs_black_overseas_promo": {
        type: "category", match: ["overseas"], rate: 0.012, desc: "海外推廣額外 1.2%", mode: "add",
        setting_key: "dbs_black_promo_enabled", req_mission_key: "spend_dbs_black_qual", req_mission_spend: 20000,
        valid_from: "2026-01-01", valid_to: "2026-12-31",
        cap_mode: "reward", cap_limit: 240, cap_key: "dbs_black_bonus_cap_monthly",
        cap: { key: "dbs_black_bonus_cap_monthly", period: "month" },
        secondary_cap_key: "dbs_black_bonus_cap_2026", secondary_cap_limit: 2880
    },

    // DBS Eminent 2026 (Signature cap model):
    // - Designated categories (single tx >= HK$300): 5% total = 0.4% base + 4.6% bonus
    // - Other retail (incl. designated < HK$300): 1% total = 0.4% base + 0.6% bonus
    "dbs_eminent_bonus": {
        type: "category", match: ["dining", "gym", "sportswear", "medical"], rate: 0.046, desc: "指定類別額外 4.6%",
        mode: "add", min_spend: 300,
        display_name_zhhk: "DBS Eminent Signature 指定類別額外回贈",
        cap_limit: 8000, cap_key: "dbs_eminent_bonus_cap",
        cap: { key: "dbs_eminent_bonus_cap", period: "month" }
    },
    "dbs_eminent_other_bonus": {
        type: "category",
        match: ["general", "dining", "gym", "sportswear", "medical", "transport", "grocery", "travel", "entertainment", "apparel", "health_beauty", "telecom", "electronics", "online", "overseas", "alipay", "wechat", "payme", "oepay", "streaming", "charity"],
        rate: 0.006, desc: "其他零售額外 0.6%",
        mode: "add",
        // For designated categories with single tx >= HK$300, only the 5% designated bucket should apply.
        eligible_check: (cat, ctx) => {
            const designated = new Set(["dining", "gym", "sportswear", "medical"]);
            if (!designated.has(cat)) return true;
            return Number((ctx && ctx.amount) || 0) < 300;
        },
        display_name_zhhk: "DBS Eminent Signature 其他零售額外回贈",
        cap_limit: 20000, cap_key: "dbs_eminent_base_cap",
        cap: { key: "dbs_eminent_base_cap", period: "month" }
    },
    // DBS Eminent Platinum 2026:
    // - Same rates/threshold as Signature, lower caps:
    //   designated cap HK$4,000 ; other retail cap HK$15,000 (monthly).
    "dbs_eminent_bonus_platinum": {
        type: "category", match: ["dining", "gym", "sportswear", "medical"], rate: 0.046, desc: "指定類別額外 4.6%",
        mode: "add", min_spend: 300,
        display_name_zhhk: "DBS Eminent Platinum 指定類別額外回贈",
        cap_limit: 4000, cap_key: "dbs_eminent_bonus_cap_platinum",
        cap: { key: "dbs_eminent_bonus_cap_platinum", period: "month" }
    },
    "dbs_eminent_other_bonus_platinum": {
        type: "category",
        match: ["general", "dining", "gym", "sportswear", "medical", "transport", "grocery", "travel", "entertainment", "apparel", "health_beauty", "telecom", "electronics", "online", "overseas", "alipay", "wechat", "payme", "oepay", "streaming", "charity"],
        rate: 0.006, desc: "其他零售額外 0.6%",
        mode: "add",
        eligible_check: (cat, ctx) => {
            const designated = new Set(["dining", "gym", "sportswear", "medical"]);
            if (!designated.has(cat)) return true;
            return Number((ctx && ctx.amount) || 0) < 300;
        },
        display_name_zhhk: "DBS Eminent Platinum 其他零售額外回贈",
        cap_limit: 15000, cap_key: "dbs_eminent_base_cap_platinum",
        cap: { key: "dbs_eminent_base_cap_platinum", period: "month" }
    },
    "dbs_eminent_base": { type: "always", rate: 0.004, desc: "基本 0.4%" },

    "dbs_compass_grocery_wed": {
        type: "category",
        match: ["grocery", "supermarket"],
        rate: 0.076,
        desc: "Super Wednesday 超市額外 7.6%",
        display_name_zhhk: "DBS COMPASS 週三超市 8%",
        mode: "add",
        min_spend: 300,
        valid_from: "2026-01-07",
        valid_to: "2026-05-27",
        valid_days: [3], // Wednesday
        cap_limit: 2000,
        cap_key: "dbs_compass_superwed_cap",
        cap: { key: "dbs_compass_superwed_cap", period: "month" },
        eligible_check: (cat, ctx) => {
            const pm = ctx && ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            return pm === "physical" || pm === "apple_pay" || pm === "google_pay" || pm === "samsung_pay";
        }
    },
    "dbs_compass_ewallet": {
        type: "category",
        match: ["alipay", "wechat"],
        rate: 0.026,
        desc: "四圍簽，好 COM 賺 電子錢包額外 2.6%",
        display_name_zhhk: "DBS COMPASS 電子錢包 3%（四圍簽，好 COM 賺）",
        mode: "add",
        min_spend: 300,
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        cap_mode: "reward",
        cap_limit: 200,
        cap_key: "dbs_compass_com_bonus_cap",
        cap: { key: "dbs_compass_com_bonus_cap", period: "month" }
    },
    "dbs_compass_base": { type: "always", rate: 0.004, desc: "基本 0.4%" }, // 1/250 = 0.004

    "dbs_live_fresh_selected": {
        type: "category",
        match: ["live_fresh_selected"],
        rate: 0.05,
        desc: "DBS Live Fresh 一簽即賞額外 5%",
        display_name_zhhk: "DBS Live Fresh 一簽即賞",
        mode: "add",
        min_spend: 300,
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        cap_mode: "reward",
        cap_limit: 200,
        cap_key: "dbs_live_fresh_cap",
        cap: { key: "dbs_live_fresh_cap", period: "month" },
        eligible_check: (cat, ctx) => {
            if (!ctx) return false;
            if (ctx.isOnline) return true;

            const pref = ctx.settings && ctx.settings.live_fresh_pref ? String(ctx.settings.live_fresh_pref) : "";
            const inputCategory = String(ctx.inputCategory || "");
            const merchantCategory = String(ctx.merchantCategory || "");

            // DBS LF 2026 list allows physical transactions for:
            // - Entertainment spending (travel preference)
            // - Designated service subscriptions (travel preference, designated merchants)
            // - Charity preference designated merchants (donations remain online-only)
            if (pref === "travel") {
                if (inputCategory === "entertainment") return true;
                if (merchantCategory === "live_fresh_travel_designated") return true;
                return false;
            }
            if (pref === "charity") {
                return merchantCategory === "live_fresh_charity_designated";
            }
            return false;
        }
    },
    "dbs_live_fresh_online_foreign": {
        type: "category",
        match: ["overseas", "live_fresh_selected"],
        rate: 0.01,
        desc: "DBS Live Fresh 網上外幣簽賬 1%",
        mode: "replace",
        valid_from: "2026-01-01",
        valid_to: "2026-12-31",
        eligible_check: (cat, ctx) => {
            if (!ctx || !ctx.isOnline) return false;
            if (cat === "live_fresh_selected") {
                const pref = ctx.settings && ctx.settings.live_fresh_pref ? String(ctx.settings.live_fresh_pref) : "";
                return pref === "online_foreign";
            }
            return true;
        }
    },
    "dbs_live_fresh_base": { type: "always", rate: 0.004, desc: "基本 0.4%" },

    // --- Hang Seng Modules (V10.13) ---
    "hangseng_base": { type: "always", rate: 0.004, desc: "基本 0.4%" },

    // MMPower (Base 0.4% + Bonus)
    // Overseas: 6% Total => 5.6% Bonus. Cap $500 Reward.
    "mmpower_overseas_bonus": {
        type: "category", match: ["overseas"], rate: 0.056, desc: "+FUN Dollars 獎賞計劃 海外簽賬額外 5.6%",
        mode: "add", setting_key: "mmpower_promo_enabled",
        cap_mode: "reward", cap_limit: 500, cap_key: "mmpower_reward_cap",
        req_mission_spend: 5000, req_mission_key: "spend_hangseng_mmpower",
        // T&C: overseas / online / selected are non-overlapping; online takes precedence for online transactions.
        eligible_check: (cat, ctx) => !(ctx && ctx.isOnline)
    },
    // Online: 5% Total => 4.6% Bonus. Cap $500 Reward (Shared).
    "mmpower_online_bonus": {
        type: "category", match: ["online"], rate: 0.046, desc: "+FUN Dollars 獎賞計劃 網上簽賬額外 4.6%",
        mode: "add", setting_key: "mmpower_promo_enabled",
        cap_mode: "reward", cap_limit: 500, cap_key: "mmpower_reward_cap",
        req_mission_spend: 5000, req_mission_key: "spend_hangseng_mmpower"
    },
    // Selected: 1% Total => 0.6% Bonus. (Assuming 1% is the goal for selected categories like entertainment)
    // However, user said "1% (low rebate, non-main)".
    // If it's 1%, and base is 0.4%, bonus is 0.6%.
    // Match: dining, electronics, entertainment
    "mmpower_selected_bonus": {
        type: "category", match: ["dining", "electronics", "entertainment", "streaming"], rate: 0.006, desc: "+FUN Dollars 獎賞計劃 自選類別額外 0.6%",
        mode: "add", setting_key: "mmpower_promo_enabled",
        cap_mode: "reward", cap_limit: 500, cap_key: "mmpower_reward_cap",
        req_mission_spend: 5000, req_mission_key: "spend_hangseng_mmpower",
        eligible_check: (cat, ctx) => {
            const settings = (ctx && ctx.settings) ? ctx.settings : {};
            const pickedRaw = Array.isArray(settings.mmpower_selected_categories)
                ? settings.mmpower_selected_categories
                : ["dining", "electronics"];
            const allow = new Set(["dining", "electronics", "entertainment"]);
            const picked = Array.from(new Set(pickedRaw.map(x => String(x)).filter(x => allow.has(x)))).slice(0, 2);
            const selected = picked.length > 0 ? picked : ["dining", "electronics"];
            if (ctx && ctx.isOnline) return false; // T&C: if online + selected, count as online only.
            const normalized = (cat === "streaming") ? "entertainment" : cat;
            return selected.includes(normalized);
        }
    },

    // Travel+ (2026 promo period: 2026-01-01 to 2026-12-31)
    // Base 0.4% + bonus modules below.
    // Tier 1 designated foreign: 7% total => +6.6% bonus.
    "travel_plus_tier1_bonus": {
        type: "category", match: ["travel_plus_tier1"], rate: 0.066, desc: "Travel+ 指定外幣額外 6.6%",
        mode: "add", setting_key: "travel_plus_promo_enabled",
        cap_mode: "reward", cap_limit: 500, cap_key: "travel_plus_reward_cap",
        req_mission_spend: 6000, req_mission_key: "spend_hangseng_travel_plus",
        valid_from: "2026-01-01", valid_to: "2026-12-31",
        eligible_check: (cat, ctx) => !ctx.isOnline // T&C: designated foreign spend is physical-store only.
    },
    // Tier 2 other foreign: 5% total => +4.6% bonus.
    "travel_plus_tier2_bonus": {
        type: "category", match: ["overseas"], rate: 0.046, desc: "Travel+ 其他外幣額外 4.6%",
        mode: "add", setting_key: "travel_plus_promo_enabled",
        cap_mode: "reward", cap_limit: 500, cap_key: "travel_plus_reward_cap",
        req_mission_spend: 6000, req_mission_key: "spend_hangseng_travel_plus",
        valid_from: "2026-01-01", valid_to: "2026-12-31",
        eligible_check: (cat, ctx) => !ctx.isOnline && cat !== "travel_plus_tier1" // Exclude designated tier1 bucket to avoid double-count.
    },
    // Dining: 5% Total => 4.6% Bonus.
    "travel_plus_dining_bonus": {
        type: "category", match: ["dining"], rate: 0.046, desc: "Travel+ 餐飲額外 4.6%",
        mode: "add", setting_key: "travel_plus_promo_enabled",
        cap_mode: "reward", cap_limit: 500, cap_key: "travel_plus_reward_cap",
        req_mission_spend: 6000, req_mission_key: "spend_hangseng_travel_plus",
        valid_from: "2026-01-01", valid_to: "2026-12-31"
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
        type: "category", match: ["tuition"], rate: 0.02, desc: "大學學費額外 2%",
        display_name_zhhk: "Hang Seng University 學費回贈",
        cap_limit: 8333, cap_key: "university_tuition_cap" // Spending cap is easier ($8333 * 2.4% ~= $200)
        // Wait, if I use spending cap on Bonus (2%), $8333 * 2% = $166.
        // Total rate 2.4%. $8333 * 2.4% = $199.99.
        // The cap is $200 total reward?
        // User: "max rebate $200".
        // If I use Spending Cap 8333 on the BONUS module:
        // Tx $8333. Base $33. Bonus $166. Total $199.
        // It fits.
    },

    // enJoy (yuu points):
    // - Base: 1 yuu/$1 on all retail spending.
    // - Some designated merchants have a bank-side uplift to 2 yuu/$1.
    // - Additional merchant-side yuu points require linked yuu membership.
    "enjoy_base": { type: "always", rate: 1, desc: "基本每 $1 賺 1 YUU (0.5%)" },
    "enjoy_bank_bonus_4x": {
        type: "category",
        match: ["enjoy_4x"],
        rate: 1,
        desc: "指定商戶銀行部分額外每 $1 +1 YUU",
        mode: "add"
    },
    "enjoy_merchant_bonus_4x": {
        type: "category",
        match: ["enjoy_4x"],
        rate: 2,
        desc: "指定商戶 yuu 商戶部分額外每 $1 +2 YUU",
        mode: "add",
        setting_key: "hangseng_enjoy_points4x_enabled"
    },
    "enjoy_bank_bonus_3x": {
        type: "category",
        match: ["enjoy_3x"],
        rate: 1,
        desc: "指定商戶銀行部分額外每 $1 +1 YUU",
        mode: "add"
    },
    "enjoy_merchant_bonus_3x": {
        type: "category",
        match: ["enjoy_3x"],
        rate: 1,
        desc: "指定商戶 yuu 商戶部分額外每 $1 +1 YUU",
        mode: "add",
        setting_key: "hangseng_enjoy_points4x_enabled"
    },
    "enjoy_bank_bonus_2x": {
        type: "category",
        match: ["enjoy_2x"],
        rate: 1,
        desc: "指定商戶銀行部分額外每 $1 +1 YUU",
        mode: "add"
    },
    "enjoy_shell_merchant_bonus": {
        type: "category",
        match: ["enjoy_shell_2x"],
        rate: 1,
        desc: "Shell yuu 商戶部分額外每 $1 +1 YUU",
        mode: "add",
        setting_key: "hangseng_enjoy_points4x_enabled"
    },
    // Legacy hidden categories (kept for existing ledger data)
    "enjoy_dining": {
        type: "category",
        match: ["dining_enjoy"],
        rate: 3,
        desc: "enJoy 指定餐飲額外每 $1 +3 YUU",
        setting_key: "hangseng_enjoy_points4x_enabled"
    },
    "enjoy_retail": {
        type: "category",
        match: ["retail_enjoy"],
        rate: 2,
        desc: "enJoy 指定零售額外每 $1 +2 YUU",
        setting_key: "hangseng_enjoy_points4x_enabled"
    },

    // --- BOC Modules ---
    // Cheers Base
    "boc_cheers_base": { type: "always", rate: 1, desc: "基本每 $1 賺 1 積分 (0.4%)" },

    // Cheers 2026 H1 (2026-01-01 to 2026-06-30)
    "boc_cheers_vi_dining_2026h1": {
        type: "category",
        match: ["dining"],
        rate: 10,
        desc: "中銀 Cheers Visa Infinite 餐飲每 $1 賺 10 積分",
        mode: "replace",
        req_mission_key: "spend_boc_cheers_vi_qual",
        req_mission_spend: 5000,
        cap_mode: "reward",
        cap_limit: 100000,
        cap_key: "boc_cheers_dining_cap",
        secondary_cap_key: "boc_cheers_total_cap_vi",
        secondary_cap_limit: 300000,
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            const pm = ctx && ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            const c = String(cat || "");
            if (pm === "omycard" || pm === "boc_pay") return false;
            if (c === "alipay" || c === "wechat") return false;
            return true;
        }
    },
    "boc_cheers_vi_fx_2026h1": {
        type: "category",
        match: ["overseas"],
        rate: 10,
        desc: "中銀 Cheers Visa Infinite 外幣簽賬每 $1 賺 10 積分",
        mode: "replace",
        req_mission_key: "spend_boc_cheers_vi_qual",
        req_mission_spend: 5000,
        cap_mode: "reward",
        cap_limit: 250000,
        cap_key: "boc_cheers_travel_cap",
        secondary_cap_key: "boc_cheers_total_cap_vi",
        secondary_cap_limit: 300000,
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            const pm = ctx && ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            const c = String(cat || "");
            if (pm === "omycard" || pm === "boc_pay") return false;
            if (c === "alipay" || c === "wechat") return false;
            return true;
        }
    },
    "boc_cheers_vs_dining_2026h1": {
        type: "category",
        match: ["dining"],
        rate: 8,
        desc: "中銀 Cheers Visa Signature 餐飲每 $1 賺 8 積分",
        mode: "replace",
        req_mission_key: "spend_boc_cheers_vs_qual",
        req_mission_spend: 5000,
        cap_mode: "reward",
        cap_limit: 60000,
        cap_key: "boc_cheers_dining_cap_vs",
        secondary_cap_key: "boc_cheers_total_cap_vs",
        secondary_cap_limit: 180000,
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            const pm = ctx && ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            const c = String(cat || "");
            if (pm === "omycard" || pm === "boc_pay") return false;
            if (c === "alipay" || c === "wechat") return false;
            return true;
        }
    },
    "boc_cheers_vs_fx_2026h1": {
        type: "category",
        match: ["overseas"],
        rate: 8,
        desc: "中銀 Cheers Visa Signature 外幣簽賬每 $1 賺 8 積分",
        mode: "replace",
        req_mission_key: "spend_boc_cheers_vs_qual",
        req_mission_spend: 5000,
        cap_mode: "reward",
        cap_limit: 150000,
        cap_key: "boc_cheers_travel_cap_vs",
        secondary_cap_key: "boc_cheers_total_cap_vs",
        secondary_cap_limit: 180000,
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            const pm = ctx && ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            const c = String(cat || "");
            if (pm === "omycard" || pm === "boc_pay") return false;
            if (c === "alipay" || c === "wechat") return false;
            return true;
        }
    },

    // Cheers Legacy (kept for historical ledger replay)
    "boc_cheers_dining": {
        type: "category", match: ["dining"], rate: 10, desc: "餐飲每 $1 賺 10 積分",
        mode: "replace", setting_key: "boc_amazing_enabled", req_mission_key: "spend_boc_cheers_vi", req_mission_spend: 5000,
        cap_mode: "reward", cap_limit: 100000, cap_key: "boc_cheers_dining_cap",
        secondary_cap_key: "boc_cheers_total_cap_vi", secondary_cap_limit: 300000, // VI Total 300k
        valid_to: "2025-12-31"
    },
    "boc_cheers_travel": {
        type: "category", match: ["travel", "cathay_hkexpress"], rate: 10, desc: "旅遊每 $1 賺 10 積分",
        mode: "replace", setting_key: "boc_amazing_enabled", req_mission_key: "spend_boc_cheers_vi", req_mission_spend: 5000,
        cap_mode: "reward", cap_limit: 250000, cap_key: "boc_cheers_travel_cap",
        secondary_cap_key: "boc_cheers_total_cap_vi", secondary_cap_limit: 300000,
        valid_to: "2025-12-31"
    },
    // Cheers VS
    "boc_cheers_dining_vs": {
        type: "category", match: ["dining"], rate: 8, desc: "餐飲每 $1 賺 8 積分",
        mode: "replace", setting_key: "boc_amazing_enabled", req_mission_key: "spend_boc_cheers_vs", req_mission_spend: 5000,
        cap_mode: "reward", cap_limit: 60000, cap_key: "boc_cheers_dining_cap_vs",
        secondary_cap_key: "boc_cheers_total_cap_vs", secondary_cap_limit: 180000, // VS Total 180k
        valid_to: "2025-12-31"
    },
    "boc_cheers_travel_vs": {
        type: "category", match: ["travel", "cathay_hkexpress"], rate: 8, desc: "旅遊每 $1 賺 8 積分",
        mode: "replace", setting_key: "boc_amazing_enabled", req_mission_key: "spend_boc_cheers_vs", req_mission_spend: 5000,
        cap_mode: "reward", cap_limit: 150000, cap_key: "boc_cheers_travel_cap_vs",
        secondary_cap_key: "boc_cheers_total_cap_vs", secondary_cap_limit: 180000,
        valid_to: "2025-12-31"
    },

    // Cheers 海外簽賬
    "boc_cheers_overseas": {
        type: "category", match: ["overseas"], rate: 9, desc: "外幣額外每 $1 +9 積分",
        cap_mode: "reward", cap_limit: 250000, cap_key: "boc_cheers_travel_cap",
        secondary_cap_key: "boc_cheers_total_cap_vi", secondary_cap_limit: 300000,
        valid_to: "2025-12-31"
    },
    "boc_cheers_overseas_vs": {
        type: "category", match: ["overseas"], rate: 9, desc: "外幣額外每 $1 +9 積分",
        cap_mode: "reward", cap_limit: 150000, cap_key: "boc_cheers_travel_cap_vs",
        secondary_cap_key: "boc_cheers_total_cap_vs", secondary_cap_limit: 180000,
        valid_to: "2025-12-31"
    },

    // 狂賞派 (Amazing Rewards) - 只限7大本地消費類別
    "boc_amazing_weekday": {
        type: "category", match: ["dining", "travel", "entertainment", "electronics", "medical", "apparel", "sportswear", "hotel", "pet"],
        rate: 5, desc: "🔥 狂賞派額外每 $1 +5 積分", valid_on_red_day: false,
        setting_key: "boc_amazing_enabled", min_single_spend: 500, req_mission_key: "spend_boc_amazing_local", req_mission_spend: 5000,
        cap_mode: "reward", cap_limit: 30000, cap_key: "boc_amazing_local_weekday_cap",
        secondary_cap_key: "boc_amazing_local_weekday_cap_2026h1", secondary_cap_limit: 180000,
        eligible_check: (cat, ctx) => !ctx || !ctx.isOnline,
        valid_from: "2026-01-01", valid_to: "2026-06-30"
    },
    "boc_amazing_holiday": {
        type: "category", match: ["dining", "travel", "entertainment", "electronics", "medical", "apparel", "sportswear", "hotel", "pet"],
        rate: 12.5, desc: "🔥 狂賞派額外每 $1 +12.5 積分", valid_on_red_day: true,
        setting_key: "boc_amazing_enabled", min_single_spend: 500, req_mission_key: "spend_boc_amazing_local", req_mission_spend: 5000,
        cap_mode: "reward", cap_limit: 75000, cap_key: "boc_amazing_local_holiday_cap",
        secondary_cap_key: "boc_amazing_local_holiday_cap_2026h1", secondary_cap_limit: 450000,
        eligible_check: (cat, ctx) => !ctx || !ctx.isOnline,
        valid_from: "2026-01-01", valid_to: "2026-06-30"
    },
    "boc_amazing_online_weekday": {
        type: "category", match: ["online"],
        rate: 5, desc: "🔥 狂賞派網購額外每 $1 +5 積分", valid_on_red_day: false,
        setting_key: "boc_amazing_enabled", min_single_spend: 500,
        cap_mode: "reward", cap_limit: 15000, cap_key: "boc_amazing_online_weekday_cap",
        secondary_cap_key: "boc_amazing_online_weekday_cap_2026h1", secondary_cap_limit: 90000,
        eligible_check: (cat, ctx) => !!(ctx && ctx.isOnline),
        valid_from: "2026-01-01", valid_to: "2026-06-30"
    },
    "boc_amazing_online_holiday": {
        type: "category", match: ["online"],
        rate: 12.5, desc: "🔥 狂賞派網購額外每 $1 +12.5 積分", valid_on_red_day: true,
        setting_key: "boc_amazing_enabled", min_single_spend: 500,
        cap_mode: "reward", cap_limit: 50000, cap_key: "boc_amazing_online_holiday_cap",
        secondary_cap_key: "boc_amazing_online_holiday_cap_2026h1", secondary_cap_limit: 300000,
        eligible_check: (cat, ctx) => !!(ctx && ctx.isOnline),
        valid_from: "2026-01-01", valid_to: "2026-06-30"
    },

    // 狂賞派 (Amazing Rewards) - VS Version
    "boc_amazing_weekday_vs": {
        type: "category", match: ["dining", "travel", "entertainment", "electronics", "medical", "apparel", "sportswear", "hotel", "pet"],
        rate: 5, desc: "🔥 狂賞派額外每 $1 +5 積分", valid_on_red_day: false,
        setting_key: "boc_amazing_enabled", min_single_spend: 500, req_mission_key: "spend_boc_amazing_local", req_mission_spend: 5000,
        cap_mode: "reward", cap_limit: 30000, cap_key: "boc_amazing_local_weekday_cap",
        secondary_cap_key: "boc_amazing_local_weekday_cap_2026h1", secondary_cap_limit: 180000,
        eligible_check: (cat, ctx) => !ctx || !ctx.isOnline,
        valid_from: "2026-01-01", valid_to: "2026-06-30"
    },
    "boc_amazing_holiday_vs": {
        type: "category", match: ["dining", "travel", "entertainment", "electronics", "medical", "apparel", "sportswear", "hotel", "pet"],
        rate: 12.5, desc: "🔥 狂賞派額外每 $1 +12.5 積分", valid_on_red_day: true,
        setting_key: "boc_amazing_enabled", min_single_spend: 500, req_mission_key: "spend_boc_amazing_local", req_mission_spend: 5000,
        cap_mode: "reward", cap_limit: 75000, cap_key: "boc_amazing_local_holiday_cap",
        secondary_cap_key: "boc_amazing_local_holiday_cap_2026h1", secondary_cap_limit: 450000,
        eligible_check: (cat, ctx) => !ctx || !ctx.isOnline,
        valid_from: "2026-01-01", valid_to: "2026-06-30"
    },
    "boc_amazing_online_weekday_vs": {
        type: "category", match: ["online"],
        rate: 5, desc: "🔥 狂賞派網購額外每 $1 +5 積分", valid_on_red_day: false,
        setting_key: "boc_amazing_enabled", min_single_spend: 500,
        cap_mode: "reward", cap_limit: 15000, cap_key: "boc_amazing_online_weekday_cap",
        secondary_cap_key: "boc_amazing_online_weekday_cap_2026h1", secondary_cap_limit: 90000,
        eligible_check: (cat, ctx) => !!(ctx && ctx.isOnline),
        valid_from: "2026-01-01", valid_to: "2026-06-30"
    },
    "boc_amazing_online_holiday_vs": {
        type: "category", match: ["online"],
        rate: 12.5, desc: "🔥 狂賞派網購額外每 $1 +12.5 積分", valid_on_red_day: true,
        setting_key: "boc_amazing_enabled", min_single_spend: 500,
        cap_mode: "reward", cap_limit: 50000, cap_key: "boc_amazing_online_holiday_cap",
        secondary_cap_key: "boc_amazing_online_holiday_cap_2026h1", secondary_cap_limit: 300000,
        eligible_check: (cat, ctx) => !!(ctx && ctx.isOnline),
        valid_from: "2026-01-01", valid_to: "2026-06-30"
    },

    // 狂賞飛 (Amazing Fly) 2026 H1
    "boc_amazing_fly_cn": {
        type: "category",
        match: ["overseas_cn", "overseas_mo"],
        rate: 15,
        desc: "✈️ 狂賞飛 中澳額外每 $1 +15 積分",
        mode: "add",
        setting_key: "boc_amazing_enabled",
        min_single_spend: 500,
        req_mission_key: "spend_boc_fly_cn_stage",
        req_mission_spend: 5000,
        cap_mode: "reward",
        cap_limit: 75000,
        cap_key: "boc_amazing_fly_cn_cap_stage",
        secondary_cap_key: "boc_amazing_fly_cn_cap_2026h1",
        secondary_cap_limit: 150000,
        eligible_check: (cat, ctx) => !ctx || !ctx.isOnline,
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        cap: { key: "boc_amazing_fly_cn_cap_stage", period: { type: "quarter", startMonth: 1, startDay: 1 } }
    },
    "boc_amazing_fly_other": {
        type: "category",
        match: ["overseas_jkt", "overseas_jp", "overseas_jpkr", "overseas_th", "overseas_tw", "overseas_uk_eea", "overseas_other"],
        rate: 7.5,
        desc: "✈️ 狂賞飛 其他海外額外每 $1 +7.5 積分",
        mode: "add",
        setting_key: "boc_amazing_enabled",
        min_single_spend: 500,
        req_mission_key: "spend_boc_fly_other_stage",
        req_mission_spend: 10000,
        cap_mode: "reward",
        cap_limit: 75000,
        cap_key: "boc_amazing_fly_other_cap_stage",
        secondary_cap_key: "boc_amazing_fly_other_cap_2026h1",
        secondary_cap_limit: 150000,
        eligible_check: (cat, ctx) => !ctx || !ctx.isOnline,
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        cap: { key: "boc_amazing_fly_other_cap_stage", period: { type: "quarter", startMonth: 1, startDay: 1 } }
    },
    "boc_amazing_fly_cn_vs": {
        type: "category",
        match: ["overseas_cn", "overseas_mo"],
        rate: 15,
        desc: "✈️ 狂賞飛 中澳額外每 $1 +15 積分",
        mode: "add",
        setting_key: "boc_amazing_enabled",
        min_single_spend: 500,
        req_mission_key: "spend_boc_fly_cn_stage",
        req_mission_spend: 5000,
        cap_mode: "reward",
        cap_limit: 75000,
        cap_key: "boc_amazing_fly_cn_cap_stage",
        secondary_cap_key: "boc_amazing_fly_cn_cap_2026h1",
        secondary_cap_limit: 150000,
        eligible_check: (cat, ctx) => !ctx || !ctx.isOnline,
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        cap: { key: "boc_amazing_fly_cn_cap_stage", period: { type: "quarter", startMonth: 1, startDay: 1 } }
    },
    "boc_amazing_fly_other_vs": {
        type: "category",
        match: ["overseas_jkt", "overseas_jp", "overseas_jpkr", "overseas_th", "overseas_tw", "overseas_uk_eea", "overseas_other"],
        rate: 7.5,
        desc: "✈️ 狂賞飛 其他海外額外每 $1 +7.5 積分",
        mode: "add",
        setting_key: "boc_amazing_enabled",
        min_single_spend: 500,
        req_mission_key: "spend_boc_fly_other_stage",
        req_mission_spend: 10000,
        cap_mode: "reward",
        cap_limit: 75000,
        cap_key: "boc_amazing_fly_other_cap_stage",
        secondary_cap_key: "boc_amazing_fly_other_cap_2026h1",
        secondary_cap_limit: 150000,
        eligible_check: (cat, ctx) => !ctx || !ctx.isOnline,
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        cap: { key: "boc_amazing_fly_other_cap_stage", period: { type: "quarter", startMonth: 1, startDay: 1 } }
    },

    // Chill Card (World Mastercard) 2025-01-01 to 2026-06-30
    "boc_chill_base": { type: "always", rate: 1, desc: "基本每 $1 賺 1 積分 (0.4%)" },
    "boc_chill_merchant": {
        type: "category",
        match: ["chill_merchant"],
        rate: 25,
        desc: "Chill 指定商戶額外每 $1 +25 積分",
        mode: "add",
        req_mission_key: "spend_boc_chill_monthly",
        req_mission_spend: 1500,
        cap_mode: "reward",
        cap_limit: 37500,
        cap_key: "boc_chill_bonus_cap_2026",
        cap: { key: "boc_chill_bonus_cap_2026", period: "month" },
        valid_from: "2025-01-01",
        valid_to: "2026-06-30"
    },
    "boc_chill_online_overseas": {
        type: "category",
        match: ["online", "overseas"],
        rate: 12.5,
        desc: "網上/外幣額外每 $1 +12.5 積分",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 37500,
        cap_key: "boc_chill_bonus_cap_2026",
        cap: { key: "boc_chill_bonus_cap_2026", period: "month" },
        valid_from: "2025-01-01",
        valid_to: "2026-06-30"
    },

    // Go Card
    "boc_go_base": { type: "always", rate: 1, desc: "基本每 $1 賺 1 積分 (0.4%)" },
    "boc_go_mobile": {
        type: "category",
        rate: 2,
        desc: "全球手機簽賬額外每 $1 +2 積分",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 25000,
        cap_key: "boc_go_mobile_bonus_cap_2026",
        cap: { key: "boc_go_mobile_bonus_cap_2026", period: "month" },
        valid_from: "2025-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            if (cat === "go_merchant") return false;
            if (!ctx) return false;
            const pm = ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            return pm === "apple_pay" || pm === "samsung_pay" || pm === "huawei_pay" || pm === "boc_pay" || pm === "unionpay_cloud";
        }
    },
    "boc_go_merchant": {
        type: "category",
        match: ["go_merchant"],
        rate: 11.5,
        desc: "Go 指定商戶額外每 $1 +11.5 積分",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 25000,
        cap_key: "boc_go_merchant_bonus_cap_2026",
        cap: { key: "boc_go_merchant_bonus_cap_2026", period: "month" },
        valid_from: "2025-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            if (!ctx) return true;
            const pm = ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            return pm === "physical" || pm === "apple_pay" || pm === "samsung_pay" || pm === "huawei_pay" || pm === "unionpay_cloud";
        }
    },
    "boc_go_pmq126_local_mobile_2026q1": {
        type: "category",
        rate: 7,
        desc: "Go！機本地手機簽賬額外每 $1 +7 積分",
        mode: "add",
        setting_key: "boc_go_pmq126_enabled",
        cap_mode: "reward",
        cap_limit: 25000,
        cap_key: "boc_go_pmq126_bonus_cap_2026q1",
        cap: { key: "boc_go_pmq126_bonus_cap_2026q1", period: "month" },
        valid_from: "2026-01-09",
        valid_to: "2026-03-31",
        tnc_url: "https://www.bochk.com/dam/boccreditcard/gopmq126/tnc_tc.pdf",
        source_url: "https://www.bochk.com/dam/boccreditcard/gopmq126/tnc_tc.pdf",
        registration_note: "需先登記；首30,000位成功登記客戶（系統未能自動核實）",
        eligible_check: (cat, ctx) => {
            if (!ctx) return false;
            if (cat === "go_merchant") return false;
            const pm = ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            const mobileOk = pm === "apple_pay" || pm === "samsung_pay" || pm === "huawei_pay" || pm === "boc_pay" || pm === "unionpay_cloud";
            if (!mobileOk) return false;
            const inputCat = String(ctx.inputCategory || cat || "");
            const isMainland = inputCat === "overseas_cn" || inputCat === "china_consumption";
            const isOverseas = inputCat === "overseas" || inputCat.startsWith("overseas_") || inputCat === "online_foreign" || inputCat === "china_consumption";
            return !isMainland && !isOverseas;
        }
    },
    "boc_go_pmq126_mainland_mobile_2026q1": {
        type: "category",
        rate: 17,
        desc: "Go！機內地手機簽賬額外每 $1 +17 積分",
        mode: "add",
        setting_key: "boc_go_pmq126_enabled",
        cap_mode: "reward",
        cap_limit: 25000,
        cap_key: "boc_go_pmq126_bonus_cap_2026q1",
        cap: { key: "boc_go_pmq126_bonus_cap_2026q1", period: "month" },
        valid_from: "2026-01-09",
        valid_to: "2026-03-31",
        tnc_url: "https://www.bochk.com/dam/boccreditcard/gopmq126/tnc_tc.pdf",
        source_url: "https://www.bochk.com/dam/boccreditcard/gopmq126/tnc_tc.pdf",
        registration_note: "需先登記；首30,000位成功登記客戶（系統未能自動核實）",
        eligible_check: (cat, ctx) => {
            if (!ctx) return false;
            if (cat === "go_merchant") return false;
            const pm = ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            const mobileOk = pm === "apple_pay" || pm === "samsung_pay" || pm === "huawei_pay" || pm === "boc_pay" || pm === "unionpay_cloud";
            if (!mobileOk) return false;
            const inputCat = String(ctx.inputCategory || cat || "");
            return inputCat === "overseas_cn" || inputCat === "china_consumption";
        }
    },
    "boc_go_overseas": {
        type: "category",
        match: ["overseas"],
        rate: 1,
        desc: "海外簽賬額外每 $1 +1 積分",
        mode: "add",
        valid_from: "2025-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            if (!ctx) return true;
            const pm = ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            return pm === "physical";
        }
    },
    "boc_go_platinum_base": { type: "always", rate: 1, desc: "基本每 $1 賺 1 積分 (0.4%)" },
    "boc_go_platinum_mobile": {
        type: "category",
        rate: 1,
        desc: "全球手機簽賬額外每 $1 +1 積分",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 25000,
        cap_key: "boc_go_platinum_mobile_bonus_cap_2026",
        cap: { key: "boc_go_platinum_mobile_bonus_cap_2026", period: "month" },
        valid_from: "2025-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            if (cat === "go_merchant") return false;
            if (!ctx) return false;
            const pm = ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            return pm === "apple_pay" || pm === "samsung_pay" || pm === "huawei_pay" || pm === "boc_pay" || pm === "unionpay_cloud";
        }
    },
    "boc_go_platinum_merchant": {
        type: "category",
        match: ["go_merchant"],
        rate: 11.5,
        desc: "Go 指定商戶額外每 $1 +11.5 積分",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 25000,
        cap_key: "boc_go_platinum_merchant_bonus_cap_2026",
        cap: { key: "boc_go_platinum_merchant_bonus_cap_2026", period: "month" },
        valid_from: "2025-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            if (!ctx) return true;
            const pm = ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            return pm === "physical" || pm === "apple_pay" || pm === "samsung_pay" || pm === "huawei_pay" || pm === "unionpay_cloud";
        }
    },
    "boc_go_platinum_pmq126_local_mobile_2026q1": {
        type: "category",
        rate: 3,
        desc: "Go！機本地手機簽賬額外每 $1 +3 積分",
        mode: "add",
        setting_key: "boc_go_pmq126_enabled",
        cap_mode: "reward",
        cap_limit: 25000,
        cap_key: "boc_go_platinum_pmq126_bonus_cap_2026q1",
        cap: { key: "boc_go_platinum_pmq126_bonus_cap_2026q1", period: "month" },
        valid_from: "2026-01-09",
        valid_to: "2026-03-31",
        tnc_url: "https://www.bochk.com/dam/boccreditcard/gopmq126/tnc_tc.pdf",
        source_url: "https://www.bochk.com/dam/boccreditcard/gopmq126/tnc_tc.pdf",
        registration_note: "需先登記；首30,000位成功登記客戶（系統未能自動核實）",
        eligible_check: (cat, ctx) => {
            if (!ctx) return false;
            if (cat === "go_merchant") return false;
            const pm = ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            const mobileOk = pm === "apple_pay" || pm === "samsung_pay" || pm === "huawei_pay" || pm === "boc_pay" || pm === "unionpay_cloud";
            if (!mobileOk) return false;
            const inputCat = String(ctx.inputCategory || cat || "");
            const isMainland = inputCat === "overseas_cn" || inputCat === "china_consumption";
            const isOverseas = inputCat === "overseas" || inputCat.startsWith("overseas_") || inputCat === "online_foreign" || inputCat === "china_consumption";
            return !isMainland && !isOverseas;
        }
    },
    "boc_go_platinum_pmq126_mainland_mobile_2026q1": {
        type: "category",
        rate: 8,
        desc: "Go！機內地手機簽賬額外每 $1 +8 積分",
        mode: "add",
        setting_key: "boc_go_pmq126_enabled",
        cap_mode: "reward",
        cap_limit: 25000,
        cap_key: "boc_go_platinum_pmq126_bonus_cap_2026q1",
        cap: { key: "boc_go_platinum_pmq126_bonus_cap_2026q1", period: "month" },
        valid_from: "2026-01-09",
        valid_to: "2026-03-31",
        tnc_url: "https://www.bochk.com/dam/boccreditcard/gopmq126/tnc_tc.pdf",
        source_url: "https://www.bochk.com/dam/boccreditcard/gopmq126/tnc_tc.pdf",
        registration_note: "需先登記；首30,000位成功登記客戶（系統未能自動核實）",
        eligible_check: (cat, ctx) => {
            if (!ctx) return false;
            if (cat === "go_merchant") return false;
            const pm = ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            const mobileOk = pm === "apple_pay" || pm === "samsung_pay" || pm === "huawei_pay" || pm === "boc_pay" || pm === "unionpay_cloud";
            if (!mobileOk) return false;
            const inputCat = String(ctx.inputCategory || cat || "");
            return inputCat === "overseas_cn" || inputCat === "china_consumption";
        }
    },
    "boc_go_platinum_overseas": {
        type: "category",
        match: ["overseas"],
        rate: 1,
        desc: "海外簽賬額外每 $1 +1 積分",
        mode: "add",
        valid_from: "2025-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            if (!ctx) return true;
            const pm = ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            return pm === "physical";
        }
    },
    "boc_sogo_base": {
        type: "always",
        rate: 0.004,
        desc: "基本 0.4%",
        last_verified_at: "2026-02-23",
        source_url: "https://www.bochk.com/dam/boccreditcard/sogo_doc/sogocard_tnc_tc.pdf"
    },
    "boc_sogo_designated": {
        type: "category",
        match: ["sogo_merchant"],
        rate: 0.05,
        desc: "崇光及指定商戶/產品 5%",
        mode: "replace",
        valid_from: "2026-01-01",
        valid_to: "2026-12-31",
        last_verified_at: "2026-02-23",
        source_url: "https://www.bochk.com/dam/boccreditcard/sogo_doc/sogocard_tnc_tc.pdf",
        tnc_url: "https://www.bochk.com/dam/boccreditcard/sogo_doc/sogocard_tnc_tc.pdf",
        eligible_check: (cat, ctx) => {
            if (!ctx) return true;
            const pm = ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            return pm === "physical" || pm === "apple_pay" || pm === "google_pay" || pm === "samsung_pay";
        }
    },
    "boc_sogo_mobile_pay": {
        type: "category",
        rate: 0.05,
        desc: "手機支付額外 5%",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 100,
        cap_key: "boc_sogo_mobile_bonus_cap_2026",
        cap: { key: "boc_sogo_mobile_bonus_cap_2026", period: "month" },
        valid_from: "2026-01-01",
        valid_to: "2026-12-31",
        last_verified_at: "2026-02-23",
        source_url: "https://www.bochk.com/dam/boccreditcard/sogo_doc/sogocard_tnc_tc.pdf",
        tnc_url: "https://www.bochk.com/dam/boccreditcard/sogo_doc/sogocard_tnc_tc.pdf",
        eligible_check: (cat, ctx) => !!(ctx && ["apple_pay", "google_pay", "samsung_pay"].includes(ctx.paymentMethod))
    },


    // --- American Express Modules ---
    "ae_explorer_base": { type: "always", rate: 3, desc: "基本每 $1 賺 3 積分 (1%)" },
    "ae_explorer_fx_travel_bonus_075_2026h1": {
        type: "category",
        match: ["overseas", "travel", "cathay_hkexpress", "ae_online_travel_designated"],
        rate: 0.75,
        desc: "海外/旅遊額外 0.25%",
        mode: "add",
        setting_key: "ae_explorer_075x_enabled",
        valid_from: "2026-01-02",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            const pm = (ctx && ctx.paymentMethod) ? String(ctx.paymentMethod) : "physical";
            return pm === "physical";
        }
    },
    "ae_explorer_fx_7x_bonus_2026h1": {
        type: "category",
        match: ["overseas"],
        rate: 7,
        desc: "海外額外每 $1 +7 積分",
        mode: "add",
        setting_key: "ae_explorer_7x_enabled",
        cap_mode: "spending",
        cap_limit: 10000,
        cap_key: "ae_explorer_fx_7x_qcap_2026",
        cap: { key: "ae_explorer_fx_7x_qcap_2026", period: "quarter" },
        valid_from: "2026-01-02",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            const pm = (ctx && ctx.paymentMethod) ? String(ctx.paymentMethod) : "physical";
            return pm === "physical";
        }
    },
    "ae_explorer_travel_7x_bonus_2026h1": {
        type: "category",
        match: ["travel", "cathay_hkexpress", "ae_online_travel_designated"],
        rate: 7,
        desc: "旅遊/機票額外每 $1 +7 積分",
        mode: "add",
        setting_key: "ae_explorer_7x_enabled",
        cap_mode: "spending",
        cap_limit: 10000,
        cap_key: "ae_explorer_travel_7x_qcap_2026",
        cap: { key: "ae_explorer_travel_7x_qcap_2026", period: "quarter" },
        valid_from: "2026-01-02",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            const pm = (ctx && ctx.paymentMethod) ? String(ctx.paymentMethod) : "physical";
            return pm === "physical";
        }
    },
    "ae_explorer_online_5x_bonus_2026": {
        type: "category",
        match: ["ae_online_designated"],
        rate: 2,
        desc: "指定網上商戶額外每 $1 +2 積分",
        mode: "add",
        setting_key: "ae_explorer_online_5x_enabled",
        cap_mode: "reward",
        cap_limit: 90000,
        cap_key: "ae_explorer_online_5x_bonus_qcap_2026",
        cap: { key: "ae_explorer_online_5x_bonus_qcap_2026", period: "quarter" },
        valid_from: "2026-01-02",
        valid_to: "2026-12-31",
        eligible_check: (cat, ctx) => {
            const pm = (ctx && ctx.paymentMethod) ? String(ctx.paymentMethod) : "physical";
            if (pm !== "physical") return false;
            return !!(ctx && ctx.isOnline);
        }
    },

    // AE Platinum (Fine Head)
    "ae_plat_base": {
        type: "always",
        rate: 1,
        desc: "基本每 $1 賺 1 積分 (0.33%)"
    },
    "ae_plat_accelerator_bonus": {
        type: "always",
        rate: 1,
        desc: "基本每 $1 賺 1 積分 (0.33%)",
        display_name_zhhk: "AE Platinum 年度積分加速獎賞",
        mode: "add",
        cap_mode: "spending",
        cap_limit: 160000,
        cap_key: "ae_plat_accelerator_cap",
        cap: { key: "ae_plat_accelerator_cap", period: "year" }
    },
    "ae_plat_overseas": {
        type: "category",
        match: ["overseas"],
        rate: 2,
        desc: "外幣簽賬額外每 $1 +2 積分",
        mode: "add"
    },
    "ae_plat_fx_5x_promo_2026h1": {
        type: "category",
        match: ["overseas"],
        rate: 5,
        desc: "外幣簽賬額外每 $1 +5 積分",
        mode: "add",
        setting_key: "ae_platinum_9x_enabled",
        cap_mode: "spending",
        cap_limit: 15000,
        cap_key: "ae_plat_fx_9x_cap",
        cap: { key: "ae_plat_fx_9x_cap", period: "quarter" },
        valid_from: "2025-08-20",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            const pm = (ctx && ctx.paymentMethod) ? String(ctx.paymentMethod) : "physical";
            return pm === "physical" || pm === "apple_pay" || pm === "google_pay" || pm === "samsung_pay";
        }
    },
    "ae_plat_travel": {
        type: "category",
        match: ["ae_plat_travel_designated"],
        rate: 7,
        desc: "指定旅遊商戶額外每 $1 +7 積分",
        mode: "add",
        setting_key: "ae_platinum_9x_enabled",
        cap_mode: "spending",
        cap_limit: 15000,
        cap_key: "ae_plat_travel_cap",
        cap: { key: "ae_plat_travel_cap", period: "quarter" },
        valid_from: "2025-08-20",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            const pm = (ctx && ctx.paymentMethod) ? String(ctx.paymentMethod) : "physical";
            const paymentOk = pm === "physical" || pm === "apple_pay" || pm === "google_pay" || pm === "samsung_pay";
            if (!paymentOk) return false;
            // T&C: 指定「網上」旅遊商戶。
            if (!(ctx && ctx.isOnline)) return false;
            const merchantId = String((ctx && ctx.merchantId) || "").trim();
            const designatedMerchants = new Set([
                "agoda",
                "amex_travel_online",
                "airbnb",
                "booking_com",
                "club_med",
                "expedia",
                "hotels_com",
                "hutchgo",
                "kaligo",
                "klook",
                "trip_com"
            ]);
            if (!designatedMerchants.has(merchantId)) return false;
            // HKD 結算條件系統未能直接讀取；以非 overseas 類別作近似判斷。
            const inputCat = String((ctx && ctx.inputCategory) || "");
            const isForeignLike = inputCat === "overseas"
                || inputCat.startsWith("overseas_")
                || inputCat === "online_foreign"
                || inputCat === "china_consumption";
            if (isForeignLike) return false;
            return true;
        }
    },
    "ae_plat_daily": {
        type: "category",
        match: ["ae_plat_daily_designated"],
        rate: 7,
        desc: "指定日常商戶額外每 $1 +7 積分",
        mode: "add",
        setting_key: "ae_platinum_9x_enabled",
        cap_mode: "spending",
        cap_limit: 15000,
        cap_key: "ae_plat_daily_cap",
        cap: { key: "ae_plat_daily_cap", period: "quarter" },
        valid_from: "2025-08-20",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            const pm = (ctx && ctx.paymentMethod) ? String(ctx.paymentMethod) : "physical";
            const paymentOk = pm === "physical" || pm === "apple_pay" || pm === "google_pay" || pm === "samsung_pay";
            if (!paymentOk) return false;
            // T&C: 日常清單大部分只限門市；現階段只放行「SOGO Freshmart」網店。
            if (ctx && ctx.isOnline) {
                const merchantId = String(ctx.merchantId || "").trim();
                return merchantId === "sogo_freshmart";
            }
            return true;
        }
    },

    // AE Platinum Credit (Big Head)
    "ae_pcc_base": {
        type: "always",
        rate: 1,
        desc: "基本每 $1 賺 1 積分 (0.33%)"
    },
    "ae_pcc_program_bonus_2x": {
        type: "always",
        rate: 2,
        desc: "基本每 $1 賺 2 積分 (0.67%)",
        mode: "add",
        cap_mode: "spending",
        cap_limit: 120000,
        cap_key: "ae_pcc_program_3x_cap",
        cap: { key: "ae_pcc_program_3x_cap", period: { type: "promo", startDate: "2025-01-01", endDate: "2026-12-31" } },
        valid_from: "2025-01-01",
        valid_to: "2026-12-31"
    },
    "ae_pcc_double_extra_3x_precap": {
        type: "category",
        match: ["ae_pcc_designated"],
        rate: 3,
        desc: "指定商戶額外每 $1 +3 積分",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 30000,
        cap_key: "ae_pcc_double_cap",
        cap: { key: "ae_pcc_double_cap", period: "month" },
        valid_from: "2025-01-01",
        valid_to: "2026-12-31",
        eligible_check: (cat, ctx) => {
            const merchantId = String((ctx && ctx.merchantId) || "").trim();
            const isOnline = !!(ctx && ctx.isOnline);
            // 條款：^ 商戶只限門市；崇光超市可門市及網店。
            if (isOnline && merchantId !== "sogo_freshmart") return false;
            const used = (typeof userProfile !== "undefined" && userProfile && userProfile.usage)
                ? (Number(userProfile.usage["ae_pcc_program_3x_cap"]) || 0)
                : 0;
            return used < 120000;
        }
    },
    "ae_pcc_double_extra_1x_postcap": {
        type: "category",
        match: ["ae_pcc_designated"],
        rate: 1,
        desc: "指定商戶額外每 $1 +1 積分",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 30000,
        cap_key: "ae_pcc_double_cap",
        cap: { key: "ae_pcc_double_cap", period: "month" },
        valid_from: "2025-01-01",
        valid_to: "2026-12-31",
        eligible_check: (cat, ctx) => {
            const merchantId = String((ctx && ctx.merchantId) || "").trim();
            const isOnline = !!(ctx && ctx.isOnline);
            // 條款：^ 商戶只限門市；崇光超市可門市及網店。
            if (isOnline && merchantId !== "sogo_freshmart") return false;
            const used = (typeof userProfile !== "undefined" && userProfile && userProfile.usage)
                ? (Number(userProfile.usage["ae_pcc_program_3x_cap"]) || 0)
                : 0;
            return used >= 120000;
        }
    },

    // --- Fubon Series ---
    "fubon_in_base": { type: "always", rate: 1, desc: "基本每 $1 賺 1 積分 (0.5%)" },
    "fubon_in_online": {
        type: "category", match: ["online"], rate: 19, desc: "網上簽賬額外每 $1 +19 積分",
        mode: "add",
        req_mission_key: "fubon_in_monthly_eligible_spend",
        req_mission_spend: 1000,
        cap_mode: "reward",
        cap_limit: 62500,
        cap_key: "fubon_in_bonus_cap",
        cap: { key: "fubon_in_bonus_cap", period: "month" },
        valid_from: "2026-01-01",
        valid_to: "2026-06-30"
    },
    // Fubon Platinum / Titanium
    // 2026 海外簽賬獎賞：台灣20X、日本/韓國10X、其他外幣5X。
    // 海外額外積分上限：每月 80,000 分；全年 240,000 分（共享）。
    "fubon_travel_base": { type: "always", rate: 1, desc: "基本每 $1 賺 1 積分 (0.4%)" },
    "fubon_travel_tw": {
        type: "category",
        match: ["overseas_tw"],
        rate: 19,
        desc: "台灣額外每 $1 +19 積分",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 80000,
        cap_key: "fubon_travel_bonus_monthly_cap",
        secondary_cap_key: "fubon_travel_bonus_annual_cap",
        secondary_cap_limit: 240000,
        cap: { key: "fubon_travel_bonus_monthly_cap", period: "month" },
        // Register annual cap counter reset at calendar year.
        counter: { key: "fubon_travel_bonus_annual_cap", period: { type: "year", startMonth: 1, startDay: 1 } },
        valid_from: "2026-01-01",
        valid_to: "2026-12-31"
    },
    "fubon_travel_jpkr": {
        type: "category",
        match: ["overseas_jkt", "overseas_jp", "overseas_jpkr"],
        rate: 9,
        desc: "日本/韓國額外每 $1 +9 積分",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 80000,
        cap_key: "fubon_travel_bonus_monthly_cap",
        secondary_cap_key: "fubon_travel_bonus_annual_cap",
        secondary_cap_limit: 240000,
        cap: { key: "fubon_travel_bonus_monthly_cap", period: "month" },
        valid_from: "2026-01-01",
        valid_to: "2026-12-31"
    },
    "fubon_travel_fx_other": {
        type: "category",
        match: ["overseas_cn", "overseas_mo", "overseas_th", "overseas_uk_eea", "overseas_other"],
        rate: 4,
        desc: "其他外幣額外每 $1 +4 積分",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 80000,
        cap_key: "fubon_travel_bonus_monthly_cap",
        secondary_cap_key: "fubon_travel_bonus_annual_cap",
        secondary_cap_limit: 240000,
        cap: { key: "fubon_travel_bonus_monthly_cap", period: "month" },
        valid_from: "2026-01-01",
        valid_to: "2026-12-31"
    },
    "fubon_travel_local_weekend": {
        type: "category",
        rate: 1,
        desc: "本地簽賬週末額外每 $1 +1 積分",
        mode: "add",
        valid_from: "2026-01-01",
        valid_to: "2026-12-31",
        eligible_check: (cat, ctx) => {
            const txDate = (ctx && ctx.txDate) ? String(ctx.txDate) : "";
            const d = txDate ? new Date(`${txDate}T00:00:00`) : new Date();
            const day = d.getDay();
            const isWeekend = (day === 0 || day === 6);
            if (!isWeekend) return false;
            if (cat === "fubon_upgrade_online") return false;
            if (typeof isCategoryMatch === "function") return !isCategoryMatch(["overseas"], cat);
            return !String(cat || "").startsWith("overseas");
        }
    },
    "fubon_travel_upgrade_online": {
        type: "category",
        match: ["online"],
        rate: 10,
        desc: "指定本地網購每 $1 賺 10 積分",
        mode: "replace",
        setting_key: "fubon_travel_upgrade_enabled",
        eligible_check: (cat, ctx) => {
            if (!ctx || !ctx.isOnline) return false;
            if (typeof isCategoryMatch === "function") return !isCategoryMatch(["overseas"], cat);
            return !String(cat || "").startsWith("overseas");
        },
        cap_mode: "reward",
        cap_limit: 62500,
        cap_key: "fubon_travel_upgrade_online_cap",
        cap: { key: "fubon_travel_upgrade_online_cap", period: "month" },
        valid_from: "2026-01-01",
        valid_to: "2026-06-30"
    },
    // Fubon Visa Infinite
    "fubon_infinite_base": { type: "always", rate: 1, desc: "基本每 $1 賺 1 積分 (0.5%)" },
    "fubon_infinite_fx_other": {
        type: "category",
        match: ["overseas_cn", "overseas_mo", "overseas_th", "overseas_uk_eea", "overseas_other"],
        rate: 5,
        desc: "其他外幣每 $1 賺 5 積分",
        mode: "replace",
        cap_mode: "reward",
        cap_limit: 80000,
        cap_key: "fubon_infinite_bonus_monthly_cap",
        secondary_cap_key: "fubon_infinite_bonus_annual_cap",
        secondary_cap_limit: 240000,
        cap: { key: "fubon_infinite_bonus_monthly_cap", period: "month" },
        valid_from: "2026-01-01",
        valid_to: "2026-06-30"
    },
    "fubon_infinite_jpkr_bonus": {
        type: "category",
        match: ["overseas_jkt", "overseas_jp", "overseas_jpkr"],
        rate: 10,
        desc: "日本/韓國每 $1 賺 10 積分",
        mode: "replace",
        cap_mode: "reward",
        cap_limit: 80000,
        cap_key: "fubon_infinite_bonus_monthly_cap",
        secondary_cap_key: "fubon_infinite_bonus_annual_cap",
        secondary_cap_limit: 240000,
        cap: { key: "fubon_infinite_bonus_monthly_cap", period: "month" },
        valid_from: "2026-01-01",
        valid_to: "2026-06-30"
    },
    "fubon_infinite_twd_bonus": {
        type: "category",
        match: ["overseas_tw"],
        rate: 20,
        desc: "台灣每 $1 賺 20 積分",
        mode: "replace",
        cap_mode: "reward",
        cap_limit: 80000,
        cap_key: "fubon_infinite_bonus_monthly_cap",
        secondary_cap_key: "fubon_infinite_bonus_annual_cap",
        secondary_cap_limit: 240000,
        cap: { key: "fubon_infinite_bonus_monthly_cap", period: "month" },
        counter: { key: "fubon_infinite_bonus_annual_cap", period: { type: "year", startMonth: 1, startDay: 1 } },
        valid_from: "2026-01-01",
        valid_to: "2026-06-30"
    },
    "fubon_infinite_local_weekend": {
        type: "category",
        rate: 1,
        desc: "本地簽賬 週末額外每 $1 +1 積分",
        mode: "add",
        min_single_spend: 300,
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            const txDate = (ctx && ctx.txDate) ? String(ctx.txDate) : "";
            const d = txDate ? new Date(`${txDate}T00:00:00`) : new Date();
            const day = d.getDay();
            const isWeekend = (day === 0 || day === 6);
            if (!isWeekend) return false;
            if (typeof isCategoryMatch === "function") return !isCategoryMatch(["overseas"], cat);
            return !String(cat || "").startsWith("overseas");
        }
    },
    "fubon_infinite_upgrade_online": {
        type: "category",
        match: ["online"],
        rate: 8,
        desc: "指定本地網購額外每 $1 +8 積分",
        mode: "add",
        setting_key: "fubon_infinite_upgrade_enabled",
        req_mission_key: "fubon_infinite_upgrade_monthly_spend",
        req_mission_spend: 1000,
        eligible_check: (cat, ctx) => {
            if (!ctx || !ctx.isOnline) return false;
            if (typeof isCategoryMatch === "function") return !isCategoryMatch(["overseas"], cat);
            return !String(cat || "").startsWith("overseas");
        },
        cap_mode: "reward",
        cap_limit: 80000,
        cap_key: "fubon_infinite_upgrade_online_cap",
        cap: { key: "fubon_infinite_upgrade_online_cap", period: "month" },
        valid_from: "2026-01-01",
        valid_to: "2026-06-30"
    },

    // --- sim Credit ---
    "sim_base": { type: "always", rate: 0.004, desc: "基本 0.4%" },
    "sim_online": {
        type: "category",
        match: ["online"],
        rate: 0.076,
        desc: "網上零售額外 7.6%",
        mode: "add",
        setting_key: "sim_promo_enabled",
        req_mission_key: "sim_non_online_spend",
        req_mission_spend: 1000,
        min_single_spend: 500,
        cap_mode: "reward",
        cap_limit: 200,
        cap_key: "sim_promo_cap_monthly",
        secondary_cap_key: "sim_promo_cap_total",
        secondary_cap_limit: 600,
        cap: { key: "sim_promo_cap_monthly", period: "month" },
        valid_from: "2026-02-01",
        valid_to: "2026-04-30"
    },
    "sim_transport": {
        type: "category",
        match: ["transport"],
        rate: 0.076,
        desc: "指定本地交通額外 7.6%",
        mode: "add",
        setting_key: "sim_promo_enabled",
        req_mission_key: "sim_non_online_spend",
        req_mission_spend: 1000,
        cap_mode: "reward",
        cap_limit: 200,
        cap_key: "sim_promo_cap_monthly",
        secondary_cap_key: "sim_promo_cap_total",
        secondary_cap_limit: 600,
        cap: { key: "sim_promo_cap_monthly", period: "month" },
        valid_from: "2026-02-01",
        valid_to: "2026-04-30",
        eligible_check: (cat, ctx) => !(ctx && ctx.isOnline)
    },
    "sim_designated_merchant": {
        type: "category",
        match: ["sim_designated_merchant"],
        rate: 0.026,
        desc: "指定商戶額外 2.6%",
        mode: "add",
        setting_key: "sim_promo_enabled",
        req_mission_key: "sim_non_online_spend",
        req_mission_spend: 1000,
        cap_mode: "reward",
        cap_limit: 200,
        cap_key: "sim_promo_cap_monthly",
        secondary_cap_key: "sim_promo_cap_total",
        secondary_cap_limit: 600,
        cap: { key: "sim_promo_cap_monthly", period: "month" },
        valid_from: "2026-02-01",
        valid_to: "2026-04-30",
        eligible_check: (cat, ctx) => !(ctx && ctx.isOnline)
    },
    "sim_billpay": {
        type: "category",
        match: ["sim_billpay", "utilities", "rates", "management_fee", "tuition", "debt_repayment"],
        rate: 0.016,
        desc: "指定繳費額外 1.6%",
        mode: "add",
        setting_key: "sim_promo_enabled",
        req_mission_key: "sim_non_online_spend",
        req_mission_spend: 1000,
        cap_mode: "reward",
        cap_limit: 200,
        cap_key: "sim_promo_cap_monthly",
        secondary_cap_key: "sim_promo_cap_total",
        secondary_cap_limit: 600,
        cap: { key: "sim_promo_cap_monthly", period: "month" },
        valid_from: "2026-02-01",
        valid_to: "2026-04-30"
    },
    "sim_world_online": {
        type: "category",
        match: ["online"],
        rate: 0.076,
        desc: "sim World 網上零售額外 7.6%",
        mode: "add",
        setting_key: "sim_world_promo_enabled",
        req_mission_key: "sim_world_non_online_spend",
        req_mission_spend: 1000,
        min_single_spend: 500,
        cap_mode: "reward",
        cap_limit: 200,
        cap_key: "sim_world_promo_cap_monthly",
        secondary_cap_key: "sim_world_promo_cap_total",
        secondary_cap_limit: 600,
        cap: { key: "sim_world_promo_cap_monthly", period: "month" },
        valid_from: "2026-02-01",
        valid_to: "2026-04-30"
    },
    "sim_world_overseas": {
        type: "category",
        match: ["overseas"],
        rate: 0.076,
        desc: "sim World 海外簽賬額外 7.6%",
        mode: "add",
        setting_key: "sim_world_promo_enabled",
        req_mission_key: "sim_world_non_online_spend",
        req_mission_spend: 1000,
        cap_mode: "reward",
        cap_limit: 200,
        cap_key: "sim_world_promo_cap_monthly",
        secondary_cap_key: "sim_world_promo_cap_total",
        secondary_cap_limit: 600,
        cap: { key: "sim_world_promo_cap_monthly", period: "month" },
        valid_from: "2026-02-01",
        valid_to: "2026-04-30",
        eligible_check: (cat, ctx) => !(ctx && ctx.isOnline)
    },
    "sim_world_designated_merchant": {
        type: "category",
        match: ["sim_designated_merchant"],
        rate: 0.026,
        desc: "sim World 指定商戶額外 2.6%",
        mode: "add",
        setting_key: "sim_world_promo_enabled",
        req_mission_key: "sim_world_non_online_spend",
        req_mission_spend: 1000,
        cap_mode: "reward",
        cap_limit: 200,
        cap_key: "sim_world_promo_cap_monthly",
        secondary_cap_key: "sim_world_promo_cap_total",
        secondary_cap_limit: 600,
        cap: { key: "sim_world_promo_cap_monthly", period: "month" },
        valid_from: "2026-02-01",
        valid_to: "2026-04-30",
        eligible_check: (cat, ctx) => !(ctx && ctx.isOnline)
    },
    "sim_world_billpay": {
        type: "category",
        match: ["sim_billpay", "utilities", "rates", "management_fee", "tuition", "debt_repayment"],
        rate: 0.016,
        desc: "sim World 指定繳費額外 1.6%",
        mode: "add",
        setting_key: "sim_world_promo_enabled",
        req_mission_key: "sim_world_non_online_spend",
        req_mission_spend: 1000,
        cap_mode: "reward",
        cap_limit: 200,
        cap_key: "sim_world_promo_cap_monthly",
        secondary_cap_key: "sim_world_promo_cap_total",
        secondary_cap_limit: 600,
        cap: { key: "sim_world_promo_cap_monthly", period: "month" },
        valid_from: "2026-02-01",
        valid_to: "2026-04-30"
    },

    // --- Mox Credit ---
    "mox_base": {
        type: "always",
        rate: 0.01,
        desc: "基本 1%",
        eligible_check: (cat, ctx) => !ctx || !ctx.settings || String(ctx.settings.mox_reward_mode || "cashback") !== "miles"
    },
    "mox_task_bonus": {
        type: "always",
        rate: 0.01,
        desc: "條件達成額外 1%",
        mode: "add",
        setting_key: "mox_deposit_task_enabled",
        valid_from: "2025-12-01",
        eligible_check: (cat, ctx) => !ctx || !ctx.settings || String(ctx.settings.mox_reward_mode || "cashback") !== "miles"
    },
    "mox_supermarket": {
        type: "category",
        match: ["grocery", "supermarket"],
        rate: 0.03,
        desc: "超市 3%",
        mode: "replace",
        valid_from: "2025-12-01",
        eligible_check: (cat, ctx) => !ctx || !ctx.settings || String(ctx.settings.mox_reward_mode || "cashback") !== "miles"
    },
    "mox_miles_unlock": {
        type: "category",
        rate: 1 / 4,
        desc: "Asia Miles $4/里（已達條件）",
        mode: "replace",
        setting_key: "mox_deposit_task_enabled",
        valid_from: "2025-12-01",
        eligible_check: (cat, ctx) => !!(ctx && ctx.settings && String(ctx.settings.mox_reward_mode || "cashback") === "miles")
    },
    "mox_miles_base_promo": {
        type: "category",
        rate: 1 / 8,
        desc: "Asia Miles $8/里（推廣期）",
        mode: "replace",
        valid_from: "2025-12-01",
        valid_to: "2026-03-31",
        eligible_check: (cat, ctx) => {
            const s = (ctx && ctx.settings) ? ctx.settings : {};
            return String(s.mox_reward_mode || "cashback") === "miles" && !s.mox_deposit_task_enabled;
        }
    },
    "mox_miles_base_regular": {
        type: "category",
        rate: 1 / 10,
        desc: "Asia Miles $10/里（常規）",
        mode: "replace",
        valid_from: "2026-04-01",
        eligible_check: (cat, ctx) => {
            const s = (ctx && ctx.settings) ? ctx.settings : {};
            return String(s.mox_reward_mode || "cashback") === "miles" && !s.mox_deposit_task_enabled;
        }
    },

    // --- AEON Purple / Premium ---
    "aeon_purple_base": {
        type: "always",
        rate: 0.004,
        desc: "基本 0.4%",
        valid_from: "2025-03-10",
        valid_to: "2026-08-31",
        last_verified_at: "2026-02-25",
        source_url: "https://www.aeon.com.hk/tc/privilege/promotion_purplepremium.html"
    },
    "aeon_purple_live_base_add": {
        type: "category",
        match: ["aeon_store"],
        rate: 0.004,
        desc: "「住」類基本額外 0.4%（2X）",
        mode: "add",
        valid_from: "2025-03-10",
        valid_to: "2026-08-31",
        last_verified_at: "2026-02-25",
        source_url: "https://www.aeon.com.hk/tc/privilege/promotion_purplepremium.html"
    },
    "aeon_purple_food_physical_bonus": {
        type: "category",
        match: ["dining"],
        rate: 0.016,
        desc: "「食」實體卡額外 1.6%",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 100,
        cap_key: "aeon_purplepremium_food_bonus_cap",
        cap: { key: "aeon_purplepremium_food_bonus_cap", period: "month" },
        valid_from: "2025-03-10",
        valid_to: "2026-08-31",
        last_verified_at: "2026-02-25",
        source_url: "https://www.aeon.com.hk/tc/privilege/promotion_purplepremium.html",
        eligible_check: (cat, ctx) => {
            const pm = String((ctx && ctx.paymentMethod) || "physical");
            return pm === "physical" && !(ctx && ctx.isOnline);
        }
    },
    "aeon_purple_food_mobile_bonus": {
        type: "category",
        match: ["dining"],
        rate: 0.056,
        desc: "「食」手機支付額外 5.6%",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 100,
        cap_key: "aeon_purplepremium_food_bonus_cap",
        cap: { key: "aeon_purplepremium_food_bonus_cap", period: "month" },
        valid_from: "2025-03-10",
        valid_to: "2026-08-31",
        last_verified_at: "2026-02-25",
        source_url: "https://www.aeon.com.hk/tc/privilege/promotion_purplepremium.html",
        eligible_check: (cat, ctx) => {
            if (ctx && ctx.isOnline) return false;
            const pm = String((ctx && ctx.paymentMethod) || "");
            return pm === "apple_pay" || pm === "google_pay" || pm === "unionpay_cloud";
        }
    },
    "aeon_purple_live_physical_bonus": {
        type: "category",
        match: ["aeon_store"],
        rate: 0.012,
        desc: "「住」實體卡額外 1.2%",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 100,
        cap_key: "aeon_purplepremium_live_bonus_cap",
        cap: { key: "aeon_purplepremium_live_bonus_cap", period: "month" },
        valid_from: "2025-03-10",
        valid_to: "2026-08-31",
        last_verified_at: "2026-02-25",
        source_url: "https://www.aeon.com.hk/tc/privilege/promotion_purplepremium.html",
        eligible_check: (cat, ctx) => String((ctx && ctx.paymentMethod) || "physical") === "physical"
    },
    "aeon_purple_live_mobile_bonus": {
        type: "category",
        match: ["aeon_store"],
        rate: 0.052,
        desc: "「住」手機支付額外 5.2%",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 100,
        cap_key: "aeon_purplepremium_live_bonus_cap",
        cap: { key: "aeon_purplepremium_live_bonus_cap", period: "month" },
        valid_from: "2025-03-10",
        valid_to: "2026-08-31",
        last_verified_at: "2026-02-25",
        source_url: "https://www.aeon.com.hk/tc/privilege/promotion_purplepremium.html",
        eligible_check: (cat, ctx) => {
            const pm = String((ctx && ctx.paymentMethod) || "");
            return pm === "apple_pay" || pm === "google_pay" || pm === "unionpay_cloud";
        }
    },
    "aeon_purple_ride_physical_bonus": {
        type: "category",
        match: ["public_transport", "tunnel"],
        rate: 0.016,
        desc: "「行」實體卡額外 1.6%",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 100,
        cap_key: "aeon_purplepremium_ride_bonus_cap",
        cap: { key: "aeon_purplepremium_ride_bonus_cap", period: "month" },
        valid_from: "2025-03-10",
        valid_to: "2026-08-31",
        last_verified_at: "2026-02-25",
        source_url: "https://www.aeon.com.hk/tc/privilege/promotion_purplepremium.html",
        eligible_check: (cat, ctx) => String((ctx && ctx.paymentMethod) || "physical") === "physical"
    },
    "aeon_purple_ride_mobile_bonus": {
        type: "category",
        match: ["public_transport", "tunnel"],
        rate: 0.056,
        desc: "「行」手機支付額外 5.6%",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 100,
        cap_key: "aeon_purplepremium_ride_bonus_cap",
        cap: { key: "aeon_purplepremium_ride_bonus_cap", period: "month" },
        valid_from: "2025-03-10",
        valid_to: "2026-08-31",
        last_verified_at: "2026-02-25",
        source_url: "https://www.aeon.com.hk/tc/privilege/promotion_purplepremium.html",
        eligible_check: (cat, ctx) => {
            const pm = String((ctx && ctx.paymentMethod) || "");
            return pm === "apple_pay" || pm === "google_pay" || pm === "unionpay_cloud";
        }
    },
    "aeon_purple_jcb_base": {
        type: "always",
        rate: 0.004,
        desc: "基本 0.4%（JCB）",
        valid_from: "2025-03-10",
        valid_to: "2026-08-31",
        last_verified_at: "2026-02-25",
        source_url: "https://www.aeon.com.hk/tc/privilege/creditcard-purplejcb.html"
    },
    "aeon_purple_jcb_live_base_add": {
        type: "category",
        match: ["aeon_store"],
        rate: 0.004,
        desc: "「住」類基本額外 0.4%（JCB, 2X）",
        mode: "add",
        valid_from: "2025-03-10",
        valid_to: "2026-08-31",
        last_verified_at: "2026-02-25",
        source_url: "https://www.aeon.com.hk/tc/privilege/creditcard-purplejcb.html"
    },
    "aeon_purple_jcb_food_physical_bonus": {
        type: "category",
        match: ["dining"],
        rate: 0.016,
        desc: "「食」實體卡額外 1.6%（JCB）",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 100,
        cap_key: "aeon_purple_jcb_food_bonus_cap",
        cap: { key: "aeon_purple_jcb_food_bonus_cap", period: "month" },
        valid_from: "2025-03-10",
        valid_to: "2026-08-31",
        last_verified_at: "2026-02-25",
        source_url: "https://www.aeon.com.hk/tc/privilege/creditcard-purplejcb.html",
        eligible_check: (cat, ctx) => {
            const pm = String((ctx && ctx.paymentMethod) || "physical");
            return pm === "physical" && !(ctx && ctx.isOnline);
        }
    },
    "aeon_purple_jcb_live_physical_bonus": {
        type: "category",
        match: ["aeon_store"],
        rate: 0.012,
        desc: "「住」實體卡額外 1.2%（JCB）",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 100,
        cap_key: "aeon_purple_jcb_live_bonus_cap",
        cap: { key: "aeon_purple_jcb_live_bonus_cap", period: "month" },
        valid_from: "2025-03-10",
        valid_to: "2026-08-31",
        last_verified_at: "2026-02-25",
        source_url: "https://www.aeon.com.hk/tc/privilege/creditcard-purplejcb.html",
        eligible_check: (cat, ctx) => String((ctx && ctx.paymentMethod) || "physical") === "physical"
    },
    "aeon_purple_jcb_ride_physical_bonus": {
        type: "category",
        match: ["public_transport", "tunnel"],
        rate: 0.016,
        desc: "「行」實體卡額外 1.6%（JCB）",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 100,
        cap_key: "aeon_purple_jcb_ride_bonus_cap",
        cap: { key: "aeon_purple_jcb_ride_bonus_cap", period: "month" },
        valid_from: "2025-03-10",
        valid_to: "2026-08-31",
        last_verified_at: "2026-02-25",
        source_url: "https://www.aeon.com.hk/tc/privilege/creditcard-purplejcb.html",
        eligible_check: (cat, ctx) => String((ctx && ctx.paymentMethod) || "physical") === "physical"
    },
    "aeon_premium_base": {
        type: "always",
        rate: 0.008,
        desc: "基本 0.8%",
        valid_from: "2025-03-10",
        valid_to: "2026-08-31",
        last_verified_at: "2026-02-25",
        source_url: "https://www.aeon.com.hk/tc/privilege/promotion_purplepremium.html"
    },
    "aeon_premium_live_base_add": {
        type: "category",
        match: ["aeon_store"],
        rate: 0.004,
        desc: "「住」類基本額外 0.4%（3X）",
        mode: "add",
        valid_from: "2025-03-10",
        valid_to: "2026-08-31",
        last_verified_at: "2026-02-25",
        source_url: "https://www.aeon.com.hk/tc/privilege/promotion_purplepremium.html"
    },
    "aeon_premium_food_physical_bonus": {
        type: "category",
        match: ["dining"],
        rate: 0.012,
        desc: "「食」實體卡額外 1.2%",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 100,
        cap_key: "aeon_purplepremium_food_bonus_cap",
        cap: { key: "aeon_purplepremium_food_bonus_cap", period: "month" },
        valid_from: "2025-03-10",
        valid_to: "2026-08-31",
        last_verified_at: "2026-02-25",
        source_url: "https://www.aeon.com.hk/tc/privilege/promotion_purplepremium.html",
        eligible_check: (cat, ctx) => {
            const pm = String((ctx && ctx.paymentMethod) || "physical");
            return pm === "physical" && !(ctx && ctx.isOnline);
        }
    },
    "aeon_premium_food_mobile_bonus": {
        type: "category",
        match: ["dining"],
        rate: 0.052,
        desc: "「食」手機支付額外 5.2%",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 100,
        cap_key: "aeon_purplepremium_food_bonus_cap",
        cap: { key: "aeon_purplepremium_food_bonus_cap", period: "month" },
        valid_from: "2025-03-10",
        valid_to: "2026-08-31",
        last_verified_at: "2026-02-25",
        source_url: "https://www.aeon.com.hk/tc/privilege/promotion_purplepremium.html",
        eligible_check: (cat, ctx) => {
            if (ctx && ctx.isOnline) return false;
            const pm = String((ctx && ctx.paymentMethod) || "");
            return pm === "apple_pay" || pm === "google_pay" || pm === "unionpay_cloud";
        }
    },
    "aeon_premium_live_physical_bonus": {
        type: "category",
        match: ["aeon_store"],
        rate: 0.008,
        desc: "「住」實體卡額外 0.8%",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 100,
        cap_key: "aeon_purplepremium_live_bonus_cap",
        cap: { key: "aeon_purplepremium_live_bonus_cap", period: "month" },
        valid_from: "2025-03-10",
        valid_to: "2026-08-31",
        last_verified_at: "2026-02-25",
        source_url: "https://www.aeon.com.hk/tc/privilege/promotion_purplepremium.html",
        eligible_check: (cat, ctx) => String((ctx && ctx.paymentMethod) || "physical") === "physical"
    },
    "aeon_premium_live_mobile_bonus": {
        type: "category",
        match: ["aeon_store"],
        rate: 0.048,
        desc: "「住」手機支付額外 4.8%",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 100,
        cap_key: "aeon_purplepremium_live_bonus_cap",
        cap: { key: "aeon_purplepremium_live_bonus_cap", period: "month" },
        valid_from: "2025-03-10",
        valid_to: "2026-08-31",
        last_verified_at: "2026-02-25",
        source_url: "https://www.aeon.com.hk/tc/privilege/promotion_purplepremium.html",
        eligible_check: (cat, ctx) => {
            const pm = String((ctx && ctx.paymentMethod) || "");
            return pm === "apple_pay" || pm === "google_pay" || pm === "unionpay_cloud";
        }
    },
    "aeon_premium_ride_physical_bonus": {
        type: "category",
        match: ["public_transport", "tunnel"],
        rate: 0.012,
        desc: "「行」實體卡額外 1.2%",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 100,
        cap_key: "aeon_purplepremium_ride_bonus_cap",
        cap: { key: "aeon_purplepremium_ride_bonus_cap", period: "month" },
        valid_from: "2025-03-10",
        valid_to: "2026-08-31",
        last_verified_at: "2026-02-25",
        source_url: "https://www.aeon.com.hk/tc/privilege/promotion_purplepremium.html",
        eligible_check: (cat, ctx) => String((ctx && ctx.paymentMethod) || "physical") === "physical"
    },
    "aeon_premium_ride_mobile_bonus": {
        type: "category",
        match: ["public_transport", "tunnel"],
        rate: 0.052,
        desc: "「行」手機支付額外 5.2%",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 100,
        cap_key: "aeon_purplepremium_ride_bonus_cap",
        cap: { key: "aeon_purplepremium_ride_bonus_cap", period: "month" },
        valid_from: "2025-03-10",
        valid_to: "2026-08-31",
        last_verified_at: "2026-02-25",
        source_url: "https://www.aeon.com.hk/tc/privilege/promotion_purplepremium.html",
        eligible_check: (cat, ctx) => {
            const pm = String((ctx && ctx.paymentMethod) || "");
            return pm === "apple_pay" || pm === "google_pay" || pm === "unionpay_cloud";
        }
    },

    // --- AEON WAKUWAKU ---
    "aeon_waku_base": { type: "always", rate: 0.004, desc: "基本 0.4%" },
    "aeon_waku_online": {
        type: "category",
        match: ["online"],
        rate: 0.056,
        desc: "網上簽賬額外 5.6%",
        mode: "add",
        min_single_spend: 500,
        cap_mode: "reward",
        cap_limit: 200,
        cap_key: "aeon_waku_bonus_cap",
        cap: { key: "aeon_waku_bonus_cap", period: "month" },
        valid_from: "2025-05-01",
        valid_to: "2026-02-28"
    },
    "aeon_waku_japan": {
        type: "category",
        match: ["overseas_jp"],
        rate: 0.026,
        desc: "日本海外簽賬額外 2.6%",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 200,
        cap_key: "aeon_waku_bonus_cap",
        cap: { key: "aeon_waku_bonus_cap", period: "month" },
        valid_from: "2025-05-01",
        valid_to: "2026-02-28",
        eligible_check: (cat, ctx) => !(ctx && ctx.isOnline)
    },
    "aeon_waku_dining": {
        type: "category",
        match: ["dining"],
        rate: 0.006,
        desc: "本地餐飲額外 0.6%",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 200,
        cap_key: "aeon_waku_bonus_cap",
        cap: { key: "aeon_waku_bonus_cap", period: "month" },
        valid_from: "2025-05-01",
        valid_to: "2026-02-28",
        eligible_check: (cat, ctx) => !(ctx && ctx.isOnline)
    },

    // --- WeWa / EarnMORE ---
    "wewa_base": { type: "always", rate: 0.004, desc: "基本 0.4%" },
    "wewa_selected_bonus": {
        type: "category",
        rate: 0.036,
        desc: "自選類別額外 3.6%",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 200,
        cap_key: "wewa_selected_bonus_cap",
        cap: { key: "wewa_selected_bonus_cap", period: "month" },
        req_mission_spend: 1500,
        req_mission_key: "wewa_monthly_eligible_spend",
        valid_from: "2025-07-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            const settings = (ctx && ctx.settings) ? ctx.settings : {};
            const selected = settings.wewa_selected_category ? String(settings.wewa_selected_category) : "mobile_pay";
            const pm = String((ctx && ctx.paymentMethod) || "");
            const mobileMethods = ["apple_pay", "google_pay", "samsung_pay", "unionpay_cloud", "omycard", "mobile"];
            const overseasSet = new Set([
                "overseas",
                "overseas_jkt",
                "overseas_jp",
                "overseas_jpkr",
                "overseas_th",
                "overseas_tw",
                "overseas_cn",
                "overseas_mo",
                "overseas_uk_eea",
                "overseas_other",
                "online_foreign",
                "china_consumption",
                "travel_plus_tier1"
            ]);

            if (selected === "mobile_pay") return mobileMethods.includes(pm);
            if (selected === "travel") return ["travel", "airline", "hotel", "cathay_hkexpress"].includes(cat);
            if (selected === "overseas") return overseasSet.has(String(cat || ""));
            if (selected === "online_entertainment") {
                return !!(ctx && ctx.isOnline) && ["entertainment", "streaming"].includes(String(cat || ""));
            }
            return false;
        }
    },
    "wewa_overseas_extra_2026q1": {
        type: "category",
        match: ["overseas_jkt", "overseas_jp", "overseas_jpkr", "overseas_th", "overseas_tw", "overseas_uk_eea", "overseas_other"],
        rate: 0.05,
        desc: "海外指定地區額外 5%",
        mode: "add",
        setting_key: "wewa_overseas_5pct_enabled",
        cap_mode: "reward",
        cap_limit: 500,
        cap_key: "wewa_overseas_stage_bonus_cap",
        req_mission_spend: 500,
        req_mission_key: "wewa_overseas_stage_spend",
        valid_from: "2026-01-05",
        valid_to: "2026-03-31",
        eligible_check: (cat, ctx) => {
            if (ctx && ctx.isOnline) return false;
            const pm = String((ctx && ctx.paymentMethod) || "");
            return ["physical", "apple_pay", "unionpay_cloud", "omycard", "mobile"].includes(pm);
        }
    },
    "earnmore_base": {
        type: "always",
        rate: 0.01,
        desc: "基本 1%"
    },
    "earnmore_bonus_2026q1": {
        type: "always",
        rate: 0.01,
        desc: "推廣期額外 1%",
        display_name_zhhk: "EarnMORE 推廣額外 +1%",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 800,
        cap_key: "earnmore_bonus_cap_2026q1",
        cap: {
            key: "earnmore_bonus_cap_2026q1",
            period: { type: "promo", startDate: "2026-01-01", endDate: "2026-06-30" }
        },
        valid_from: "2026-01-01",
        valid_to: "2026-06-30"
    },

    // --- BEA 東亞 ---
    "bea_goal_base": { type: "always", rate: 0.004, desc: "基本 0.4%" },
    "bea_goal_travel_transport": {
        type: "category",
        match: ["travel", "public_transport"],
        rate: 0.06,
        desc: "旅遊/公共交通工具額外 6%",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 200,
        cap_key: "bea_goal_cap",
        cap: { key: "bea_goal_cap", period: "month" },
        req_mission_spend: 2000,
        req_mission_key: "bea_goal_mission",
        valid_from: "2025-01-01",
        valid_to: "2026-06-30"
    },
    "bea_goal_entertainment": {
        type: "category",
        match: ["entertainment"],
        rate: 0.05,
        desc: "娛樂額外 5%",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 200,
        cap_key: "bea_goal_cap",
        cap: { key: "bea_goal_cap", period: "month" },
        req_mission_spend: 2000,
        req_mission_key: "bea_goal_mission",
        valid_from: "2025-01-01",
        valid_to: "2026-06-30"
    },
    "bea_goal_online_mobile": {
        type: "category",
        rate: 0.04,
        desc: "網上/手機支付額外 4%",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 200,
        cap_key: "bea_goal_cap",
        cap: { key: "bea_goal_cap", period: "month" },
        req_mission_spend: 2000,
        req_mission_key: "bea_goal_mission",
        valid_from: "2025-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            const c = String(cat || "");
            const isHighTierCategory = (typeof isCategoryMatch === "function")
                ? isCategoryMatch(["travel", "public_transport", "entertainment"], c)
                : (c === "travel" || c === "public_transport" || c === "entertainment");
            if (isHighTierCategory) return false;
            const isGroceryCategory = (typeof isCategoryMatch === "function")
                ? isCategoryMatch(["grocery", "supermarket"], c)
                : (c === "grocery" || c === "supermarket");
            if (isGroceryCategory) return false;
            const isMobilePm = !!(ctx && ["apple_pay", "google_pay", "mobile"].includes(ctx.paymentMethod));
            return !!(ctx && (ctx.isOnline || isMobilePm));
        }
    },

    "bea_world_base": { type: "always", rate: 1, desc: "基本每 $1 賺 1 BEA分 (0.4%)" },
    "bea_world_bonus": {
        type: "category",
        match: ["overseas", "dining", "electronics", "sportswear", "gym", "medical"],
        rate: 12.5,
        desc: "BEA Spending Points 指定類別每 $1 賺 12.5 BEA分",
        mode: "replace",
        cap_mode: "reward",
        cap_limit: 115000,
        cap_key: "bea_world_cap",
        cap: { key: "bea_world_cap", period: "month" },
        req_mission_spend: 4000,
        req_mission_key: "bea_world_mission",
        valid_from: "2025-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => !(ctx && ctx.settings && ctx.settings.bea_world_flying_miles_enabled)
    },
    "bea_world_flying_overseas": {
        type: "category",
        match: ["overseas"],
        rate: 2,
        desc: "BEA Flying Miles 海外簽賬每 $1 賺 2 BEA分",
        mode: "replace",
        setting_key: "bea_world_flying_miles_enabled",
        cap_mode: "reward",
        cap_limit: 100000,
        cap_key: "bea_world_flying_cap",
        cap: { key: "bea_world_flying_cap", period: "month" },
        req_mission_spend: 4000,
        req_mission_key: "bea_world_mission",
        valid_from: "2025-01-01",
        valid_to: "2026-06-30"
    },
    "bea_world_flying_designated_local": {
        type: "category",
        match: ["dining", "electronics", "sportswear", "gym", "medical"],
        rate: 1.6,
        desc: "BEA Flying Miles 本地指定商戶每 $1 賺 1.6 BEA分",
        mode: "replace",
        setting_key: "bea_world_flying_miles_enabled",
        cap_mode: "reward",
        cap_limit: 100000,
        cap_key: "bea_world_flying_cap",
        cap: { key: "bea_world_flying_cap", period: "month" },
        req_mission_spend: 4000,
        req_mission_key: "bea_world_mission",
        valid_from: "2025-01-01",
        valid_to: "2026-06-30"
    },

    "bea_ititanium_base": { type: "always", rate: 0.004, desc: "基本 0.4%" },
    "bea_ititanium_online_mobile": {
        type: "category",
        rate: 0.036,
        desc: "網上零售/手機支付 3.6%",
        mode: "replace",
        setting_key: "bea_ititanium_bonus_enabled",
        cap_mode: "reward",
        cap_limit: 300,
        cap_key: "bea_ititanium_cap",
        cap: { key: "bea_ititanium_cap", period: "month" },
        req_mission_spend: 2000,
        req_mission_key: "bea_ititanium_mission",
        valid_from: "2025-01-01",
        valid_to: "2026-12-31",
        eligible_check: (cat, ctx) => {
            const pm = String((ctx && ctx.paymentMethod) || "");
            const isWallet = pm === "apple_pay" || pm === "google_pay" || pm === "samsung_pay";
            return !!(ctx && (ctx.isOnline || isWallet));
        }
    },

    "bea_unionpay_base": { type: "always", rate: 1, desc: "基本每 $1 賺 1 BEA分 (0.4%)" },
    "bea_unionpay_rmb": {
        type: "category",
        match: ["overseas_cn"],
        rate: 13,
        desc: "人民幣簽賬每 $1 賺 13 BEA分",
        mode: "replace",
        cap_mode: "reward",
        cap_limit: 100000,
        cap_key: "bea_unionpay_cap",
        cap: { key: "bea_unionpay_cap", period: "month" },
        valid_from: "2025-01-01",
        valid_to: "2026-06-30"
    },
    "bea_unionpay_fx": {
        type: "category",
        match: ["overseas"],
        rate: 11,
        desc: "外幣簽賬每 $1 賺 11 BEA分",
        mode: "replace",
        cap_mode: "reward",
        cap_limit: 100000,
        cap_key: "bea_unionpay_cap",
        cap: { key: "bea_unionpay_cap", period: "month" },
        valid_from: "2025-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat) => String(cat || "") !== "overseas_cn"
    },
    "bea_unionpay_dining": {
        type: "category",
        match: ["dining"],
        rate: 4,
        desc: "本地食肆每 $1 賺 4 BEA分",
        mode: "replace",
        cap_mode: "reward",
        cap_limit: 100000,
        cap_key: "bea_unionpay_cap",
        cap: { key: "bea_unionpay_cap", period: "month" },
        valid_from: "2025-01-01",
        valid_to: "2026-06-30"
    },
    "bea_unionpay_local": {
        type: "category",
        match: ["general"],
        rate: 3,
        desc: "本地零售每 $1 賺 3 BEA分",
        mode: "replace",
        cap_mode: "reward",
        cap_limit: 100000,
        cap_key: "bea_unionpay_cap",
        cap: { key: "bea_unionpay_cap", period: "month" },
        valid_from: "2025-01-01",
        valid_to: "2026-06-30"
    },
    "aeon_premium_upi_cn_mo_tw_bonus": {
        type: "category",
        match: ["overseas_cn", "overseas_mo", "overseas_tw"],
        rate: 0.052,
        desc: "內地/澳門/台灣 簽賬額外 13X",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 100,
        cap_key: "aeon_upi_cn_mo_tw_bonus_cap",
        cap: { key: "aeon_upi_cn_mo_tw_bonus_cap", period: "month" },
        valid_from: "2026-02-01",
        valid_to: "2026-04-30",
        last_verified_at: "2026-03-04",
        source_url: "https://www.aeon.com.hk/tc/privilege/promotion_upi_0226.html"
    },
    "aeon_premium_upi_overseas_bonus": {
        type: "category",
        match: ["overseas"],
        rate: 0.052,
        desc: "其他外幣/海外 簽賬額外 13X",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 100,
        cap_key: "aeon_upi_overseas_bonus_cap",
        cap: { key: "aeon_upi_overseas_bonus_cap", period: "month" },
        valid_from: "2026-02-01",
        valid_to: "2026-04-30",
        last_verified_at: "2026-03-04",
        source_url: "https://www.aeon.com.hk/tc/privilege/promotion_upi_0226.html",
        eligible_check: (cat) => String(cat || "") !== "overseas_cn" && String(cat || "") !== "overseas_mo" && String(cat || "") !== "overseas_tw"
    },
    "aeon_std_upi_cn_mo_tw_bonus": {
        type: "category",
        match: ["overseas_cn", "overseas_mo", "overseas_tw"],
        rate: 0.056,
        desc: "內地/澳門/台灣 簽賬額外 14X",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 100,
        cap_key: "aeon_upi_cn_mo_tw_bonus_cap",
        cap: { key: "aeon_upi_cn_mo_tw_bonus_cap", period: "month" },
        valid_from: "2026-02-01",
        valid_to: "2026-04-30",
        last_verified_at: "2026-03-04",
        source_url: "https://www.aeon.com.hk/tc/privilege/promotion_upi_0226.html"
    },
    "aeon_std_upi_overseas_bonus": {
        type: "category",
        match: ["overseas"],
        rate: 0.056,
        desc: "其他外幣/海外 簽賬額外 14X",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 100,
        cap_key: "aeon_upi_overseas_bonus_cap",
        cap: { key: "aeon_upi_overseas_bonus_cap", period: "month" },
        valid_from: "2026-02-01",
        valid_to: "2026-04-30",
        last_verified_at: "2026-03-04",
        source_url: "https://www.aeon.com.hk/tc/privilege/promotion_upi_0226.html",
        eligible_check: (cat) => String(cat || "") !== "overseas_cn" && String(cat || "") !== "overseas_mo" && String(cat || "") !== "overseas_tw"
    },
    "aeon_jcb_jpy_fcf_waiver_2026": {
        type: "category",
        match: ["overseas"],
        rate: 0.0195,
        desc: "日本簽賬外幣手續費回贈 (1.95%)",
        mode: "add",
        cap_mode: "reward",
        cap_limit: 117,
        cap_key: "aeon_jcb_jpy_fcf_waiver_cap",
        cap: { key: "aeon_jcb_jpy_fcf_waiver_cap", period: { type: "promo", startDate: "2026-03-01", endDate: "2026-08-31" } },
        valid_from: "2026-03-01",
        valid_to: "2026-08-31",
        last_verified_at: "2026-03-04",
        source_url: "https://www.aeon.com.hk/tc/privilege/promotion_purplejcb.html",
        eligible_check: (cat, ctx) => String(ctx && ctx.currency || "").toUpperCase() === "JPY"
    }

};

// ... (conversionDB 保持 V10.3) ...
