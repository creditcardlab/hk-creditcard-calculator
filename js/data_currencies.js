// js/data_currencies.js
// Currency definitions for overseas spending — maps ISO codes to internal overseas categories.

const currenciesDB = {
    HKD: { label: "🇭🇰 港幣 (HKD)", category: null, symbol: "$", order: 0 },
    JPY: { label: "🇯🇵 日圓 (JPY)", category: "overseas_jp", symbol: "¥", order: 1 },
    KRW: { label: "🇰🇷 韓圜 (KRW)", category: "overseas_jpkr", symbol: "₩", order: 2 },
    THB: { label: "🇹🇭 泰銖 (THB)", category: "overseas_th", symbol: "฿", order: 3 },
    TWD: { label: "🇹🇼 新台幣 (TWD)", category: "overseas_tw", symbol: "NT$", order: 4 },
    CNY: { label: "🇨🇳 人民幣 (CNY)", category: "overseas_cn", symbol: "¥", order: 5 },
    MOP: { label: "🇲🇴 澳門幣 (MOP)", category: "overseas_mo", symbol: "MOP$", order: 6 },
    GBP: { label: "🇬🇧 英鎊 (GBP)", category: "overseas_uk_eea", symbol: "£", order: 7 },
    EUR: { label: "🇪🇺 歐元 (EUR)", category: "overseas_uk_eea", symbol: "€", order: 8 },
    USD: { label: "🇺🇸 美元 (USD)", category: "overseas_other", symbol: "$", order: 9 },
    SGD: { label: "🇸🇬 新加坡元 (SGD)", category: "overseas_other", symbol: "S$", order: 10 },
    AUD: { label: "🇦🇺 澳元 (AUD)", category: "overseas_other", symbol: "A$", order: 11 },
    CAD: { label: "🇨🇦 加元 (CAD)", category: "overseas_other", symbol: "C$", order: 12 },
    NZD: { label: "🇳🇿 紐元 (NZD)", category: "overseas_other", symbol: "NZ$", order: 13 },
    CHF: { label: "🇨🇭 瑞士法郎 (CHF)", category: "overseas_uk_eea", symbol: "CHF", order: 14 },
    SEK: { label: "🇸🇪 瑞典克朗 (SEK)", category: "overseas_uk_eea", symbol: "kr", order: 15 },
    NOK: { label: "🇳🇴 挪威克朗 (NOK)", category: "overseas_uk_eea", symbol: "kr", order: 16 },
    DKK: { label: "🇩🇰 丹麥克朗 (DKK)", category: "overseas_uk_eea", symbol: "kr", order: 17 },
    _OTHER: { label: "🌍 其他外幣", category: "overseas_other", symbol: "$", order: 99 },
};
