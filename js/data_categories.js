// js/data_categories.js

// Single source of truth for categories
// - label: UI display
// - parent: hierarchy for matching (e.g. overseas_* -> overseas)
// - red_hot: HSBC Red Hot group
// - hidden: exclude from UI dropdown
// - req: card dependency (string id) or function(ownedCards)
// - order: UI ordering
const categoriesDB = {
    // Core / UI
    general: { label: "本地零售 (Local Retail)", order: 1 },
    dining: { label: "🍽️ 餐飲 (Dining)", order: 2, red_hot: "dining" },
    fastfood: { label: "🍔 快餐店 (Fast Food)", order: 2.1 },
    online: { label: "💻 網上購物 (Online)", order: 3, hidden: true },

    overseas: { label: "🌍 海外 (母類)", hidden: true, red_hot: "world" },
    overseas_jpkr: { label: "🇰🇷 海外 (韓國)", order: 4, parent: "overseas", red_hot: "world" },
    overseas_jp: { label: "🇯🇵 海外 (日本)", order: 4.2, parent: "overseas", red_hot: "world" },
    overseas_th: { label: "🇹🇭 海外 (泰國)", order: 4.5, parent: "overseas", red_hot: "world" },
    // Legacy combined bucket kept for backward compatibility with existing transactions/rules.
    overseas_jkt: { label: "🇯🇵🇰🇷🇹🇭 海外 (日韓泰-舊)", hidden: true, parent: "overseas", red_hot: "world" },
    overseas_tw: { label: "🇹🇼 海外 (台灣)", order: 5, parent: "overseas", red_hot: "world" },
    overseas_cn: { label: "🇨🇳 海外 (中國)", order: 6, parent: "overseas", red_hot: "world" },
    overseas_mo: { label: "🇲🇴 海外 (澳門)", order: 7, parent: "overseas", red_hot: "world" },
    overseas_uk_eea: { label: "🇬🇧🇪🇺 海外 (英國/歐洲經濟區 EEA)", order: 8, parent: "overseas", red_hot: "world" },
    overseas_other: { label: "🌍 海外 (其他)", order: 9, parent: "overseas", red_hot: "world" },

    alipay: { label: "📱 Alipay / WeChat Pay", order: 9 },
    gym: { label: "🏋️‍♂️ 健身/運動", order: 10 },
    sportswear: { label: "👟 運動服飾 (Sportswear)", order: 16.5 },
    medical: { label: "🏥 醫療/保健", order: 11 },
    transport: { label: "🚇 交通 (Transport)", order: 12 },
    tunnel: { label: "🛣️ 隧道/泊車 (Tunnel/Parking)", order: 12.5, parent: "transport" },
    grocery: { label: "🧺 超市 (Grocery)", order: 13 },
    travel: { label: "✈️ 旅遊 (Travel)", order: 14 },
    entertainment: { label: "🎟️ 娛樂 (Entertainment)", order: 15, red_hot: "enjoyment" },
    apparel: { label: "👗 服飾/百貨 (Apparel/Dept)", order: 16 },
    health_beauty: { label: "💄 美容/藥妝 (Beauty/Watsons)", order: 17 },
    electronics: { label: "🔌 電器/電子產品", order: 18 },
    telecom: { label: "📞 電訊繳費", order: 19 },

    // Hidden / internal categories used by modules or rules
    china_consumption: { label: "🇨🇳 中國/澳門消費", hidden: true, parent: "overseas", red_hot: "world" },
    department_store: { label: "🏬 百貨公司", order: 16.2, red_hot: "style" },
    hotel: { label: "🏨 酒店", order: 14.2 },
    airline: { label: "✈️ 航空公司", order: 14.3 },
    supermarket: { label: "🛒 超級市場", order: 13.2, red_hot: "home" },
    nfc_payment: { label: "📳 NFC/手機支付", hidden: true },
    payme: { label: "💬 PayMe", hidden: true },
    oepay: { label: "💬 O!Pay", hidden: true },
    other: { label: "❓ 其他", hidden: true },
    online_foreign: { label: "🌐 網上外幣", hidden: true, parent: "overseas" },
    overseas_jktt: { label: "🇯🇵 海外 (日本-舊)", hidden: true, parent: "overseas" }, // legacy typo
    travel_plus_tier1: { label: "✈️ Travel+ Tier1", hidden: true, parent: "overseas" },
    charity: { label: "❤️ 慈善", hidden: true },
    streaming: { label: "🎬 串流/訂閱", order: 15.2 },
    wechat: { label: "💬 WeChat Pay", hidden: true },
    gas: { label: "⛽ 油站", order: 12.2 },

    live_fresh_selected: { label: "DBS Live Fresh Selected", hidden: true },

    // Card-specific / UI gated
    // Easy Card「易賞錢」指定商戶：不同商戶有不同基本賺分（$5=1分 / $10=1分）。
    // 保留舊 key 以支援已記帳交易，但從 dropdown 隱藏，避免繼續新增到「不明確」桶。
    moneyback_merchant: { label: "🏠 易賞錢指定商戶（舊）", order: 100, red_hot: "home", req: "hsbc_easy", hidden: true },
    moneyback_pns_watsons: { label: "🏠 易賞錢：百佳/屈臣氏", order: 100, red_hot: "home", req: "hsbc_easy", hidden: true },
    moneyback_fortress: { label: "🏠 易賞錢：豐澤", order: 101, red_hot: "home", req: "hsbc_easy", hidden: true },
    easy_additional_3x: { label: "🏷️ Easy 指定商戶 3X", order: 101.5, req: "hsbc_easy", hidden: true },
    tuition: { label: "🎓 學費", order: 102, req: "hsbc_gold_student" },
    red_designated: { label: "🟥 Red 指定商戶 (8%)", order: 103, req: "hsbc_red", hidden: true },
    em_designated_spend: { label: "🌐 EveryMile 指定 ($2/里)", order: 104, req: "hsbc_everymile", hidden: true },
    smart_designated: { label: "💳 Smart 指定商戶 (5%)", order: 105, req: "sc_smart", hidden: true },
    cathay_hkexpress: { label: "✈️ CX/UO (HK Express)", order: 106, req: (cards) => cards.some(id => id.startsWith("sc_cathay")), hidden: true },
    citi_club_merchant: { label: "🛍️ The Club 指定商戶 (4%)", order: 107, req: "citi_club", hidden: true },
    club_shopping: { label: "🛒 Club Shopping (額外 1%)", order: 108, req: "citi_club", hidden: true },
    citi_club_telecom: { label: "📶 The Club 電訊 (csl/1010/Now TV/網上行)", order: 109, req: "citi_club", hidden: true },
    chill_merchant: { label: "🎟️ Chill 指定商戶（按官方名單）", order: 110, req: "boc_chill" },
    go_merchant: { label: "🛍️ Go 指定商戶（按官方名單）", order: 111, req: (cards) => cards.includes("boc_go_diamond") || cards.includes("boc_go_platinum") },
    sogo_merchant: { label: "🛍️ SOGO 指定商戶/產品（5%）", order: 112, req: "boc_sogo" },
    ae_online_travel_designated: { label: "✈️ AE 指定網上旅遊商戶", order: 113, req: "ae_explorer", parent: "online" },
    ae_online_designated: { label: "🛒 AE 指定網上商戶（5X）", order: 114, req: "ae_explorer", parent: "online" },
    ae_plat_travel_designated: { label: "✈️ AE 白金指定旅遊商戶（+7X）", order: 115, req: "ae_platinum" },
    ae_plat_daily_designated: { label: "🛒 AE 白金指定日常商戶（+7X）", order: 116, req: "ae_platinum" },
    ae_pcc_designated: { label: "🏬 AE 大頭指定商戶（Double Points）", order: 117, req: "ae_platinum_credit" },
    enjoy_4x: { label: "🟡 enJoy 指定商戶 4X（2%）", order: 118, req: "hangseng_enjoy" },
    enjoy_3x: { label: "🟠 enJoy 指定商戶 3X（1.5%）", order: 119, req: "hangseng_enjoy" },
    enjoy_2x: { label: "🔵 enJoy 指定商戶 2X（1%）", order: 120, req: "hangseng_enjoy" },
    // Legacy compatibility bucket. New transactions should use isOnline + non-overseas instead.
    fubon_upgrade_online: { label: "🛒 Fubon 指定本地網購（舊）", order: 121, req: (cards) => cards.includes("fubon_travel") || cards.includes("fubon_infinite"), parent: "online", hidden: true },
    sim_designated_merchant: {
        label: "🛍️ sim 指定商戶（3%）",
        order: 122,
        req: (cards) => cards.includes("sim_credit") || cards.includes("sim_world")
    },
    sim_billpay: {
        label: "🧾 sim App 指定繳費（2%）",
        order: 123,
        req: (cards) => cards.includes("sim_credit") || cards.includes("sim_world")
    },

    // Enjoy-specific (hidden)
    dining_enjoy: { label: "🍽️ enJoy 指定餐飲（舊）", hidden: true },
    retail_enjoy: { label: "🛍️ enJoy 指定零售（舊）", hidden: true }
};
