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
    general: { label: "一般 本地零售 (Local Retail)", order: 1 },
    dining: { label: "🍽️ 餐飲 (Dining)", order: 2, red_hot: "dining" },
    online: { label: "💻 網上購物 (Online)", order: 3, hidden: true },

    overseas: { label: "🌍 海外 (母類)", hidden: true, red_hot: "world" },
    overseas_jkt: { label: "🇯🇵🇰🇷🇹🇭 海外 (日韓泰)", order: 4, parent: "overseas", red_hot: "world" },
    overseas_tw: { label: "🇹🇼 海外 (台灣)", order: 5, parent: "overseas", red_hot: "world" },
    overseas_cn: { label: "🇨🇳 海外 (中國)", order: 6, parent: "overseas", red_hot: "world" },
    overseas_mo: { label: "🇲🇴 海外 (澳門)", order: 7, parent: "overseas", red_hot: "world" },
    overseas_other: { label: "🌍 海外 (其他)", order: 8, parent: "overseas", red_hot: "world" },

    alipay: { label: "📱 Alipay / WeChat Pay", order: 9 },
    gym: { label: "🏋️‍♂️ 健身/運動", order: 10 },
    sportswear: { label: "👟 運動服飾", hidden: true },
    medical: { label: "🏥 醫療/保健", order: 11 },
    transport: { label: "🚇 交通 (Transport)", order: 12, red_hot: "enjoyment" },
    grocery: { label: "🧺 超市 (Grocery)", order: 13, red_hot: "home" },
    travel: { label: "✈️ 旅遊 (Travel)", order: 14, red_hot: "enjoyment" },
    entertainment: { label: "🎟️ 娛樂 (Entertainment)", order: 15, red_hot: "enjoyment" },
    apparel: { label: "👗 服飾/百貨 (Apparel/Dept)", order: 16, red_hot: "style" },
    health_beauty: { label: "💄 美容/藥妝 (Beauty/Watsons)", order: 17, red_hot: "style" },
    electronics: { label: "🔌 電器/電子產品", order: 18, red_hot: "home" },
    telecom: { label: "📞 電訊繳費", order: 19, red_hot: "home" },

    // Hidden / internal categories used by modules or rules
    china_consumption: { label: "🇨🇳 中國/澳門消費", hidden: true, parent: "overseas", red_hot: "world" },
    department_store: { label: "🏬 百貨公司", hidden: true, red_hot: "style" },
    hotel: { label: "🏨 酒店", hidden: true },
    airline: { label: "✈️ 航空公司", hidden: true },
    supermarket: { label: "🛒 超級市場", hidden: true, red_hot: "home" },
    nfc_payment: { label: "📳 NFC/手機支付", hidden: true },
    payme: { label: "💬 PayMe", hidden: true },
    oepay: { label: "💬 O!Pay", hidden: true },
    other: { label: "❓ 其他", hidden: true },
    online_foreign: { label: "🌐 網上外幣", hidden: true, parent: "overseas" },
    overseas_jktt: { label: "🇯🇵 海外 (日本-舊)", hidden: true, parent: "overseas" }, // legacy typo
    travel_plus_tier1: { label: "✈️ Travel+ Tier1", hidden: true },
    charity: { label: "❤️ 慈善", hidden: true },
    streaming: { label: "🎬 串流/訂閱", hidden: true },
    wechat: { label: "💬 WeChat Pay", hidden: true },
    gas: { label: "⛽ 油站", hidden: true },

    live_fresh_selected: { label: "DBS Live Fresh Selected", hidden: true },

    // Card-specific / UI gated
    // Easy Card「易賞錢」指定商戶：不同商戶有不同基本賺分（$5=1分 / $10=1分）。
    // 保留舊 key 以支援已記帳交易，但從 dropdown 隱藏，避免繼續新增到「不明確」桶。
    moneyback_merchant: { label: "🏠 易賞錢指定商戶（舊）", order: 100, red_hot: "home", req: "hsbc_easy", hidden: true },
    moneyback_pns_watsons: { label: "🏠 易賞錢：百佳/屈臣氏", order: 100, red_hot: "home", req: "hsbc_easy" },
    moneyback_fortress: { label: "🏠 易賞錢：豐澤", order: 101, red_hot: "home", req: "hsbc_easy" },
    tuition: { label: "🎓 學費", order: 102, req: "hsbc_gold_student" },
    red_designated: { label: "🟥 Red 指定商戶 (8%)", order: 103, req: "hsbc_red" },
    em_designated_spend: { label: "🌐 EveryMile 指定 ($2/里)", order: 104, req: "hsbc_everymile" },
    smart_designated: { label: "💳 Smart 指定商戶 (5%)", order: 105, req: "sc_smart" },
    cathay_hkexpress: { label: "✈️ CX/UO (HK Express)", order: 106, req: (cards) => cards.some(id => id.startsWith("sc_cathay")) },
    citi_club_merchant: { label: "🛍️ The Club 指定商戶 (4%)", order: 107, req: "citi_club" },
    chill_merchant: { label: "🎟️ Chill 指定商戶", order: 108, req: "boc_chill" },
    go_merchant: { label: "🛍️ Go 指定商戶", order: 109, req: "boc_go_diamond" },

    // Enjoy-specific (hidden)
    dining_enjoy: { label: "🍽️ enJoy 指定餐飲", hidden: true },
    retail_enjoy: { label: "🛍️ enJoy 指定零售", hidden: true }
};
