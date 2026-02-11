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
        }
    },
    cardCategoryOverrides: {
        dbs_live_fresh: {
            preferenceKey: "live_fresh_pref",
            preferences: {
                online_foreign: {
                    matches: ["overseas", "overseas_jkt", "overseas_tw", "overseas_cn", "overseas_other"],
                    mapTo: "live_fresh_selected"
                },
                travel: {
                    matches: ["travel", "entertainment", "streaming", "cathay_hkexpress"],
                    mapTo: "live_fresh_selected"
                },
                fashion: {
                    matches: ["apparel", "health_beauty", "online"],
                    mapTo: "live_fresh_selected"
                },
                charity: {
                    matches: ["charity", "general"],
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
                overseas_tw: "travel_plus_tier1",
                overseas_mo: "travel_plus_tier1"
            }
        }
    }
};
