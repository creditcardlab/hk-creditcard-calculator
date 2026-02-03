// js/data_trackers.js - Tracker-only definitions

const trackersDB = {
    // --- HSBC ---
    "em_overseas_mission": {
        type: "mission_tracker",
        setting_key: "em_promo_enabled",
        match: ["overseas"],
        desc: "🌏 EM推廣",
        mission_id: "em_promo",
        promo_end: "2026-03-31",
        valid_to: "2026-03-31",
        // Keep app.js free of special-cases: tracker defines which usage keys to increment.
        effects_on_match: [{ key: "em_q1_total", amount: "tx_amount" }],
        effects_on_eligible: [{ key: "em_q1_eligible", amount: "tx_amount" }]
    },
    "winter_tracker": {
        type: "mission_tracker",
        setting_key: "winter_promo_enabled",
        match: ["dining", "overseas"],
        desc: "❄️ 冬日賞",
        mission_id: "winter_promo",
        promo_end: "2026-02-28",
        valid_to: "2026-02-28",
        eligible_check: (cat, ctx) => !ctx || !ctx.isOnline,
        effects_on_eligible: [
            { key: "winter_total", amount: "tx_amount" },
            { key: "winter_eligible", amount: "tx_amount" }
        ]
    },

    // --- sim Credit ---
    "sim_non_online_tracker": {
        type: "mission_tracker", req_mission_key: "sim_non_online_spend",
        match: ["general", "dining", "nfc_payment", "overseas", "alipay", "wechat", "payme", "oepay", "grocery", "sportswear", "medical", "transport", "travel", "entertainment", "apparel", "health_beauty", "telecom", "other", "moneyback_merchant", "tuition", "chill_merchant", "go_merchant"],
        desc: "Sim Credit 非網購 ($500)", mission_id: "sim_non_online",
        eligible_check: (cat) => cat !== 'online' && cat !== 'online_foreign'
    },

    // --- WeWa / EarnMORE ---
    "wewa_mobile_mission": {
        type: "mission_tracker", req_mission_key: "wewa_mobile_mission", counter: { key: "wewa_mobile_mission", period: "month" },
        desc: "WeWa 每月簽賬門檻", mission_id: "wewa_mobile",
        eligible_check: (cat, ctx) => !!(ctx && ["apple_pay", "omycard", "mobile"].includes(ctx.paymentMethod))
    },

    // --- BEA 東亞 ---
    "bea_goal_mission": { type: "mission_tracker", desc: "BEA GOAL 月簽門檻", mission_id: "bea_goal", req_mission_key: "bea_goal_mission", counter: { key: "bea_goal_mission", period: "month" } },
    "bea_world_mission": { type: "mission_tracker", desc: "BEA World 月簽門檻", mission_id: "bea_world", req_mission_key: "bea_world_mission", counter: { key: "bea_world_mission", period: "month" } },
    "bea_ititanium_mission": { type: "mission_tracker", desc: "BEA i-Titanium 月簽門檻", mission_id: "bea_ititanium", req_mission_key: "bea_ititanium_mission", counter: { key: "bea_ititanium_mission", period: "month" } }
};
