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
    "sc_cathay_cxuo_tracker": {
        type: "mission_tracker",
        match: ["cathay_hkexpress"],
        desc: "✈️ CX/UO 累積簽賬",
        hide_in_equation: true,
        mission_id: "sc_cathay_cxuo_bonus",
        promo_end: "2026-06-30",
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        effects_on_eligible: [{ key: "sc_cathay_cxuo_spend", amount: "tx_amount" }],
        counter: {
            key: "sc_cathay_cxuo_spend",
            period: { type: "quarter", startMonth: 1, startDay: 1 }
        }
    },
    "sc_smart_monthly_tracker": {
        type: "mission_tracker",
        desc: "💳 Smart 每月合資格簽賬",
        hide_in_equation: true,
        mission_id: "sc_smart_monthly",
        effects_on_eligible: [{ key: "sc_smart_monthly_eligible", amount: "tx_amount" }],
        counter: { key: "sc_smart_monthly_eligible", period: "month" }
    },
    // BOC Cheers 2026 H1 mission threshold (per card, per month)
    "boc_cheers_vi_mission_tracker": {
        type: "mission_tracker",
        desc: "🎯 Cheers VI 每月合資格簽賬",
        hide_in_equation: true,
        mission_id: "boc_cheers_vi_2026h1",
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            const excludedCats = new Set(["alipay", "wechat"]);
            const pm = ctx && ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            if (excludedCats.has(cat)) return false;
            if (pm === "omycard") return false;
            return true;
        },
        effects_on_eligible: [{ key: "spend_boc_cheers_vi_qual", amount: "tx_amount" }],
        counter: { key: "spend_boc_cheers_vi_qual", period: "month" }
    },
    "boc_cheers_vs_mission_tracker": {
        type: "mission_tracker",
        desc: "🎯 Cheers VS 每月合資格簽賬",
        hide_in_equation: true,
        mission_id: "boc_cheers_vs_2026h1",
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            const excludedCats = new Set(["alipay", "wechat"]);
            const pm = ctx && ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            if (excludedCats.has(cat)) return false;
            if (pm === "omycard") return false;
            return true;
        },
        effects_on_eligible: [{ key: "spend_boc_cheers_vs_qual", amount: "tx_amount" }],
        counter: { key: "spend_boc_cheers_vs_qual", period: "month" }
    },
    "boc_amazing_vi_local_mission_tracker": {
        type: "mission_tracker",
        setting_key: "boc_amazing_enabled",
        desc: "🔥 狂賞派 VI 本地簽賬門檻",
        hide_in_equation: true,
        mission_id: "boc_amazing",
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            if (!ctx || ctx.isOnline) return false;
            if (Number(ctx.amount) < 500) return false;
            if (cat === "alipay" || cat === "wechat") return false;
            if (String(cat || "").startsWith("overseas")) return false;
            const pm = ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            if (pm === "unionpay_cloud") return false;
            return true;
        },
        effects_on_eligible: [{ key: "spend_boc_amazing_local", amount: "tx_amount" }],
        counter: { key: "spend_boc_amazing_local", period: "month" }
    },
    "boc_amazing_vs_local_mission_tracker": {
        type: "mission_tracker",
        setting_key: "boc_amazing_enabled",
        desc: "🔥 狂賞派 VS 本地簽賬門檻",
        hide_in_equation: true,
        mission_id: "boc_amazing",
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            if (!ctx || ctx.isOnline) return false;
            if (Number(ctx.amount) < 500) return false;
            if (cat === "alipay" || cat === "wechat") return false;
            if (String(cat || "").startsWith("overseas")) return false;
            const pm = ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            if (pm === "unionpay_cloud") return false;
            return true;
        },
        effects_on_eligible: [{ key: "spend_boc_amazing_local", amount: "tx_amount" }],
        counter: { key: "spend_boc_amazing_local", period: "month" }
    },
    "boc_fly_vi_cn_tracker": {
        type: "mission_tracker",
        setting_key: "boc_amazing_enabled",
        match: ["overseas_cn", "overseas_mo"],
        desc: "✈️ 狂賞飛 VI 中澳階段簽賬",
        hide_in_equation: true,
        mission_id: "boc_amazing_fly",
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => !!ctx && !ctx.isOnline && Number(ctx.amount) >= 500,
        effects_on_eligible: [{ key: "spend_boc_fly_cn_stage", amount: "tx_amount" }],
        counter: { key: "spend_boc_fly_cn_stage", period: { type: "quarter", startMonth: 1, startDay: 1 } }
    },
    "boc_fly_vi_other_tracker": {
        type: "mission_tracker",
        setting_key: "boc_amazing_enabled",
        match: ["overseas_jkt", "overseas_jpkr", "overseas_th", "overseas_tw", "overseas_uk_eea", "overseas_other"],
        desc: "✈️ 狂賞飛 VI 海外階段簽賬",
        hide_in_equation: true,
        mission_id: "boc_amazing_fly",
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => !!ctx && !ctx.isOnline && Number(ctx.amount) >= 500,
        effects_on_eligible: [{ key: "spend_boc_fly_other_stage", amount: "tx_amount" }],
        counter: { key: "spend_boc_fly_other_stage", period: { type: "quarter", startMonth: 1, startDay: 1 } }
    },
    "boc_fly_vs_cn_tracker": {
        type: "mission_tracker",
        setting_key: "boc_amazing_enabled",
        match: ["overseas_cn", "overseas_mo"],
        desc: "✈️ 狂賞飛 VS 中澳階段簽賬",
        hide_in_equation: true,
        mission_id: "boc_amazing_fly",
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => !!ctx && !ctx.isOnline && Number(ctx.amount) >= 500,
        effects_on_eligible: [{ key: "spend_boc_fly_cn_stage", amount: "tx_amount" }],
        counter: { key: "spend_boc_fly_cn_stage", period: { type: "quarter", startMonth: 1, startDay: 1 } }
    },
    "boc_fly_vs_other_tracker": {
        type: "mission_tracker",
        setting_key: "boc_amazing_enabled",
        match: ["overseas_jkt", "overseas_jpkr", "overseas_th", "overseas_tw", "overseas_uk_eea", "overseas_other"],
        desc: "✈️ 狂賞飛 VS 海外階段簽賬",
        hide_in_equation: true,
        mission_id: "boc_amazing_fly",
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => !!ctx && !ctx.isOnline && Number(ctx.amount) >= 500,
        effects_on_eligible: [{ key: "spend_boc_fly_other_stage", amount: "tx_amount" }],
        counter: { key: "spend_boc_fly_other_stage", period: { type: "quarter", startMonth: 1, startDay: 1 } }
    },
    "boc_chill_mission_tracker": {
        type: "mission_tracker",
        desc: "🎯 Chill 每月合資格實體簽賬",
        hide_in_equation: true,
        mission_id: "boc_chill_offer",
        valid_from: "2025-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            if (!ctx || ctx.isOnline) return false;
            const excludedCats = new Set(["alipay", "wechat", "payme", "oepay", "tuition", "charity"]);
            if (excludedCats.has(cat)) return false;
            const pm = ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            if (pm === "omycard") return false;
            return true;
        },
        effects_on_eligible: [{ key: "spend_boc_chill_monthly", amount: "tx_amount" }],
        counter: { key: "spend_boc_chill_monthly", period: "month" }
    },
    "boc_go_platinum_mission_tracker": {
        type: "mission_tracker",
        desc: "🎯 Go Platinum 每月簽賬任務",
        hide_in_equation: true,
        mission_id: "boc_go_offer_platinum",
        valid_from: "2025-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            const excludedCats = new Set(["alipay", "wechat", "payme", "oepay", "tuition", "charity"]);
            if (excludedCats.has(cat)) return false;
            return true;
        },
        effects_on_eligible: [{ key: "spend_boc_go_platinum_monthly", amount: "tx_amount" }],
        counter: { key: "spend_boc_go_platinum_monthly", period: "month" }
    },
    // DBS Black World 2026 promo:
    // - Mission spend uses qualified retail spending
    // - E-wallet spending only counts up to HK$5,000 per month toward mission threshold
    "dbs_black_qual_non_ewallet_tracker": {
        type: "mission_tracker",
        setting_key: "dbs_black_promo_enabled",
        desc: "💎 DBS Black 每月合資格簽賬（非電子錢包）",
        hide_in_equation: true,
        mission_id: "dbs_black_promo",
        valid_from: "2026-01-01",
        valid_to: "2026-12-31",
        eligible_check: (cat, ctx) => {
            const ewalletCats = new Set(["alipay", "wechat", "payme", "oepay"]);
            return !(ctx && (ctx.isMobilePay || ewalletCats.has(cat)));
        },
        effects_on_eligible: [{ key: "spend_dbs_black_qual", amount: "tx_amount" }],
        counter: { key: "spend_dbs_black_qual", period: "month" }
    },
    "dbs_black_qual_ewallet_tracker": {
        type: "mission_tracker",
        setting_key: "dbs_black_promo_enabled",
        desc: "💎 DBS Black 每月合資格簽賬（電子錢包首$5,000）",
        hide_in_equation: true,
        mission_id: "dbs_black_promo",
        valid_from: "2026-01-01",
        valid_to: "2026-12-31",
        eligible_check: (cat, ctx) => {
            const ewalletCats = new Set(["alipay", "wechat", "payme", "oepay"]);
            return !!(ctx && (ctx.isMobilePay || ewalletCats.has(cat)));
        },
        effects_on_eligible: [
            {
                key: "spend_dbs_black_qual",
                amount: (cat, ctx) => {
                    const used = (ctx && typeof ctx.getUsage === "function") ? Number(ctx.getUsage("spend_dbs_black_ewallet_qual")) || 0 : 0;
                    const remaining = Math.max(0, 5000 - used);
                    const txAmt = Number(ctx && ctx.amount) || 0;
                    return Math.max(0, Math.min(txAmt, remaining));
                }
            },
            {
                key: "spend_dbs_black_ewallet_qual",
                amount: (cat, ctx) => {
                    const used = (ctx && typeof ctx.getUsage === "function") ? Number(ctx.getUsage("spend_dbs_black_ewallet_qual")) || 0 : 0;
                    const remaining = Math.max(0, 5000 - used);
                    const txAmt = Number(ctx && ctx.amount) || 0;
                    return Math.max(0, Math.min(txAmt, remaining));
                }
            }
        ],
        counter: { key: "spend_dbs_black_ewallet_qual", period: "month" }
    },

    // --- Fubon iN ---
    "fubon_in_eligible_spend_tracker": {
        type: "mission_tracker",
        desc: "🎯 Fubon iN 每月合資格簽賬",
        hide_in_equation: true,
        mission_id: "fubon_in_promo",
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        eligible_check: (cat, ctx) => {
            const excludedCats = new Set(["alipay", "wechat", "payme", "oepay", "tuition", "charity"]);
            if (excludedCats.has(cat)) return false;
            const pm = ctx && ctx.paymentMethod ? String(ctx.paymentMethod) : "physical";
            if (pm === "omycard") return false;
            return true;
        },
        effects_on_eligible: [{ key: "fubon_in_monthly_eligible_spend", amount: "tx_amount" }],
        counter: { key: "fubon_in_monthly_eligible_spend", period: "month" }
    },
    "fubon_infinite_upgrade_tracker": {
        type: "mission_tracker",
        match: ["fubon_upgrade_online"],
        desc: "🎯 Fubon Infinite 指定本地網購月簽進度",
        hide_in_equation: true,
        mission_id: "fubon_infinite_upgrade_promo",
        valid_from: "2026-01-01",
        valid_to: "2026-06-30",
        effects_on_eligible: [{ key: "fubon_infinite_upgrade_monthly_spend", amount: "tx_amount" }],
        counter: { key: "fubon_infinite_upgrade_monthly_spend", period: "month" }
    },

    // --- sim Credit ---
    "sim_non_online_tracker": {
        type: "mission_tracker", req_mission_key: "sim_non_online_spend",
        match: ["general", "dining", "nfc_payment", "overseas", "alipay", "wechat", "payme", "oepay", "grocery", "sportswear", "medical", "transport", "travel", "entertainment", "apparel", "health_beauty", "telecom", "other", "moneyback_merchant", "moneyback_pns_watsons", "moneyback_fortress", "tuition", "chill_merchant", "go_merchant"],
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
