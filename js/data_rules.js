// js/data_rules.js - V1 (Data Rules Layer)

const DATA_RULES = {
    zeroRewardByCardPrefix: {
        hsbc: ["alipay", "wechat"]
    },
    categoryAliases: {
        citysuper: {
            default: "grocery",
            byPrefix: { hsbc: "style" },
            byCardId: { mox_credit: "grocery" }
        },
        fastfood: {
            // Most cards treat fast food as dining; MMPower excludes it from the selected dining bonus.
            default: "dining",
            byCardId: { hangseng_mmpower: "fastfood" }
        },
        // Keep behavior backward-compatible while allowing finer merchant tagging.
        ott_streaming: {
            default: "streaming"
        },
        saas_subscription: {
            default: "general"
        }
    },
    cardCategoryOverrides: {
        dbs_live_fresh: {
            preferenceKey: "live_fresh_pref",
            preferences: {
                online_foreign: {
                    matches: ["overseas", "overseas_jkt", "overseas_jp", "overseas_jpkr", "overseas_th", "overseas_tw", "overseas_cn", "overseas_mo", "overseas_uk_eea", "overseas_other", "online_foreign"],
                    mapTo: "live_fresh_selected"
                },
                travel: {
                    matches: ["travel", "travel_agency", "travel_ticket", "entertainment", "streaming", "cathay_hkexpress", "airline", "hotel", "live_fresh_travel_designated"],
                    mapTo: "live_fresh_selected"
                },
                fashion: {
                    matches: ["apparel", "health_beauty", "live_fresh_fashion_designated"],
                    mapTo: "live_fresh_selected"
                },
                charity: {
                    matches: ["charity", "live_fresh_charity_designated"],
                    mapTo: "live_fresh_selected"
                }
            }
        },
        hsbc_pulse: {
            map: { overseas_cn: "china_consumption" }
        },
        hangseng_travel_plus: {
            map: {
                overseas_cn: "travel_plus_tier1",
                overseas_jkt: "travel_plus_tier1",
                overseas_jp: "travel_plus_tier1",
                overseas_jpkr: "travel_plus_tier1",
                overseas_th: "travel_plus_tier1",
                overseas_tw: "travel_plus_tier1",
                overseas_mo: "travel_plus_tier1"
            }
        }
    }
};
