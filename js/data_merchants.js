// js/data_merchants.js - Merchant database
//
// Each merchant maps to a default category and optionally overrides
// the category per card (byCardId) or per bank prefix (byPrefix).
//
// Fields:
//   name           – display name (bilingual)
//   aliases        – lowercase search terms for autocomplete
//   defaultCategory – fallback category ID (must exist in categoriesDB)
//   byCardId       – { cardId: categoryId } per-card overrides
//   byPrefix       – { bankPrefix: categoryId } per-bank overrides
//
// Resolution order: byCardId → byPrefix → defaultCategory
// (mirrors categoryAliases pattern in data_rules.js)

const merchantsDB = {
    // Starter catalog. Keep mappings conservative; only add designated buckets
    // where we have stable, high-confidence mapping in existing card rules.

    // --- HSBC phase 1 (high-confidence mappings) ---
    // Easy: official split buckets (PNS/Watsons/Fortress)
    // EveryMile: streaming services map to streaming for designated earn.
    // Red designated list is dynamic; entries below are from the currently published list.
    "parknshop": {
        name: "PARKnSHOP 百佳",
        aliases: [
            "parknshop", "pns", "百佳", "百佳超級市場", "superstore",
            "fusion", "taste", "great food hall", "international", "food le parc",
            "便利佳", "百佳冷凍食品", "百佳網店", "parknshop online"
        ],
        defaultCategory: "grocery",
        byCardId: { "hsbc_easy": "moneyback_pns_watsons", "sc_smart": "smart_designated" }
    },
    "watsons": {
        name: "Watsons 屈臣氏",
        aliases: ["watsons", "屈臣氏", "watsons eshop", "屈臣氏網店"],
        defaultCategory: "health_beauty",
        byCardId: { "hsbc_easy": "moneyback_pns_watsons", "sc_smart": "smart_designated" }
    },
    "fortress": {
        name: "Fortress 豐澤",
        aliases: ["fortress", "豐澤", "fortress eshop", "techlife by fortress", "techlife"],
        defaultCategory: "electronics",
        byCardId: { "hsbc_easy": "moneyback_fortress" }
    },

    // HSBC Red (source: hsbc.com.hk Red card page designated merchant section, checked 2026-02-21)
    "sushiro_hk": {
        name: "Sushiro Hong Kong 壽司郎",
        aliases: ["sushiro", "sushiro hong kong", "壽司郎"],
        defaultCategory: "dining",
        byCardId: { "hsbc_red": "red_designated" }
    },
    "tamjai_samgor": {
        name: "TamJai SamGor Mixian 譚仔三哥",
        aliases: ["tamjai samgor", "譚仔三哥", "samgor mixian"],
        defaultCategory: "dining",
        byCardId: { "hsbc_red": "red_designated" }
    },
    "tamjai_yunnan": {
        name: "TamJai Yunnan Mixian 譚仔雲南米線",
        aliases: ["tamjai yunnan", "譚仔雲南", "譚仔雲南米線"],
        defaultCategory: "dining",
        byCardId: { "hsbc_red": "red_designated" }
    },
    "the_coffee_academics": {
        name: "The Coffee Academics",
        aliases: ["the coffee academics", "coffee academics"],
        defaultCategory: "dining",
        byCardId: { "hsbc_red": "red_designated" }
    },
    "gu": {
        name: "GU",
        aliases: ["gu"],
        defaultCategory: "apparel",
        byCardId: { "hsbc_red": "red_designated" }
    },
    "decathlon_hk": {
        name: "Decathlon Hong Kong",
        aliases: ["decathlon", "decathlon hong kong"],
        defaultCategory: "sportswear",
        byCardId: { "hsbc_red": "red_designated" }
    },
    "lululemon": {
        name: "lululemon",
        aliases: ["lululemon"],
        defaultCategory: "sportswear",
        byCardId: { "hsbc_red": "red_designated" }
    },
    "namco": {
        name: "NAMCO",
        aliases: ["namco"],
        defaultCategory: "entertainment",
        byCardId: { "hsbc_red": "red_designated" }
    },
    "taito_station": {
        name: "TAITO STATION",
        aliases: ["taito station", "taito"],
        defaultCategory: "entertainment",
        byCardId: { "hsbc_red": "red_designated" }
    },
    "csl": {
        name: "csl",
        aliases: ["csl", "電訊盈科", "pccw mobile"],
        defaultCategory: "telecom",
        byCardId: { "citi_club": "citi_club_telecom" }
    },
    "china_mobile_hk": {
        name: "中國移動香港 China Mobile Hong Kong",
        aliases: ["中國移動香港", "china mobile hong kong", "cmhk", "中國移動"],
        defaultCategory: "telecom",
        byCardId: { "sc_smart": "smart_designated" }
    },
    "s_ash": {
        name: "s/ash",
        aliases: ["s/ash", "sash", "s ash"],
        defaultCategory: "telecom",
        byCardId: { "sc_smart": "smart_designated" }
    },
    "one_o_one_zero": {
        name: "1010",
        aliases: ["1010", "one2free 1010"],
        defaultCategory: "telecom",
        byCardId: { "citi_club": "citi_club_telecom" }
    },
    "now_tv": {
        name: "Now TV",
        aliases: ["now tv", "nowtv"],
        defaultCategory: "telecom",
        byCardId: { "citi_club": "citi_club_telecom" }
    },
    "netvigator": {
        name: "網上行 Netvigator",
        aliases: ["netvigator", "網上行", "pccw broadband"],
        defaultCategory: "telecom",
        byCardId: { "citi_club": "citi_club_telecom" }
    },
    "the_club": {
        name: "The Club",
        aliases: ["the club", "club hkt", "hkt club"],
        defaultCategory: "citi_club_merchant",
        byCardId: { "citi_club": "citi_club_merchant" }
    },
    "the_club_shopping": {
        name: "The Club Shopping",
        aliases: ["club shopping", "the club shopping", "theclub shopping"],
        defaultCategory: "online",
        byCardId: { "citi_club": "club_shopping" }
    },
    "sogo": {
        name: "SOGO 崇光",
        aliases: ["sogo", "崇光", "崇光百貨", "銅鑼灣崇光", "啟德崇光"],
        defaultCategory: "apparel",
        byCardId: { "boc_sogo": "sogo_merchant" },
        byPrefix: { "hsbc": "department_store" }
    },

    // HSBC 最紅自主「賞享受」- 健身中心（2026-02-21 list）
    "be_earth": {
        name: "Be Earth",
        aliases: ["be earth"],
        defaultCategory: "gym",
        byPrefix: { "hsbc": "entertainment" }
    },
    "go24_fitness": {
        name: "Go24 Fitness",
        aliases: ["go24 fitness", "go24"],
        defaultCategory: "gym",
        byPrefix: { "hsbc": "entertainment" }
    },
    "pure_group": {
        name: "PURE Group",
        aliases: ["pure group", "pure fitness", "pure yoga"],
        defaultCategory: "gym",
        byPrefix: { "hsbc": "entertainment" }
    },
    "snap_fitness": {
        name: "Snap Fitness",
        aliases: ["snap fitness"],
        defaultCategory: "gym",
        byPrefix: { "hsbc": "entertainment" }
    },
    "square_fitness": {
        name: "Square Fitness",
        aliases: ["square fitness"],
        defaultCategory: "gym",
        byPrefix: { "hsbc": "entertainment" }
    },

    // --- Dining / fast food ---
    "mcdonalds": {
        name: "McDonald's 麥當勞",
        aliases: ["mcd", "mcdonalds", "mcdonald's", "麥當勞"],
        defaultCategory: "fastfood",
        byCardId: { "sc_smart": "smart_designated" }
    },
    "kfc": {
        name: "KFC 肯德基",
        aliases: ["kfc", "肯德基"],
        defaultCategory: "fastfood"
    },
    "pizza_hut": {
        name: "Pizza Hut 必勝客",
        aliases: ["pizza hut", "必勝客"],
        defaultCategory: "fastfood"
    },
    "cafe_de_coral": {
        name: "Cafe de Coral 大家樂",
        aliases: ["cafe de coral", "大家樂"],
        defaultCategory: "dining"
    },
    "fairwood": {
        name: "Fairwood 大快活",
        aliases: ["fairwood", "大快活"],
        defaultCategory: "dining"
    },
    "yoshinoya": {
        name: "Yoshinoya 吉野家",
        aliases: ["yoshinoya", "吉野家"],
        defaultCategory: "fastfood"
    },
    // HSBC EveryMile designated merchants:
    // Source: https://www.hsbc.com.hk/content/dam/hsbc/hk/docs/credit-cards/everymile/everymile-everyday-spend.pdf
    // Checked: 2026-02-21
    "starbucks": {
        name: "Starbucks 星巴克",
        aliases: ["starbucks", "星巴克"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "tenren_tea": {
        name: "TenRen's Tea 天仁茗茶",
        aliases: ["tenren", "tenren's tea", "天仁茗茶", "天仁"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "pacific_coffee": {
        name: "Pacific Coffee",
        aliases: ["pacific coffee"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "arabica": {
        name: "% Arabica",
        aliases: ["% arabica", "arabica coffee", "arabica"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "apt_coffee": {
        name: "APT. Coffee",
        aliases: ["apt coffee", "apt. coffee"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "basao_tea": {
        name: "BASAO Tea",
        aliases: ["basao tea", "basao"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "blue_bottle_coffee": {
        name: "Blue Bottle Coffee",
        aliases: ["blue bottle", "blue bottle coffee"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "chun_shui_tang": {
        name: "Chun Shui Tang 春水堂",
        aliases: ["chun shui tang", "春水堂"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "cupping_room": {
        name: "Cupping Room Coffee Roasters",
        aliases: ["cupping room", "cupping room coffee roasters"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "dazzling_cafe": {
        name: "Dazzling Café",
        aliases: ["dazzling cafe", "dazzling café"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "flippers": {
        name: "FLIPPER's",
        aliases: ["flippers", "flipper's"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "green_common": {
        name: "Green Common",
        aliases: ["green common"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "cafe_habitu": {
        name: "HABITU / Cafe Habitu",
        aliases: ["habitu", "cafe habitu"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "inn_im_not_nothing": {
        name: "INN – I'm Not Nothing",
        aliases: ["inn i'm not nothing", "inn im not nothing"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "lady_m": {
        name: "Lady M",
        aliases: ["lady m"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "mother_pearl": {
        name: "Mother Pearl",
        aliases: ["mother pearl", "圓貝"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "ninetys": {
        name: "NINETYs",
        aliases: ["ninetys", "ninetys"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "noc": {
        name: "NOC",
        aliases: ["noc"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "pret_a_manger": {
        name: "Pret A Manger",
        aliases: ["pret a manger", "pret"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "sensory_zero": {
        name: "sensory ZERO",
        aliases: ["sensory zero"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "tea_wg": {
        name: "Tea WG Salon & Boutique",
        aliases: ["tea wg", "tea wg salon"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "urban_coffee_roaster": {
        name: "Urban Coffee Roaster",
        aliases: ["urban coffee roaster", "ucr"],
        defaultCategory: "dining",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "be_your_own_baker": {
        name: "焙著你烘焙",
        aliases: ["焙著你烘焙", "be your own baker"],
        defaultCategory: "entertainment"
    },
    "maxims": {
        name: "Maxim's 美心集團",
        aliases: ["maxims", "maxim's", "美心", "美心集團"],
        defaultCategory: "dining"
    },
    "foodpanda": {
        name: "foodpanda",
        aliases: ["foodpanda", "富胖達"],
        defaultCategory: "dining",
        byCardId: { "sc_smart": "smart_designated" }
    },
    "deliveroo": {
        name: "Deliveroo 戶戶送",
        aliases: ["deliveroo", "戶戶送"],
        defaultCategory: "dining"
    },
    "uber_eats": {
        name: "Uber Eats",
        aliases: ["uber eats"],
        defaultCategory: "dining"
    },

    // --- Grocery / daily retail ---
    "wellcome": {
        name: "Wellcome 惠康",
        aliases: ["wellcome", "惠康"],
        defaultCategory: "grocery"
    },
    "market_place": {
        name: "Market Place by Jasons",
        aliases: ["market place", "jasons", "market place by jasons"],
        defaultCategory: "grocery"
    },
    "aeon_store": {
        name: "AEON",
        aliases: ["aeon", "永旺"],
        defaultCategory: "grocery",
        byPrefix: { "hsbc": "department_store" }
    },
    "donki": {
        name: "DON DON DONKI",
        aliases: ["donki", "don don donki"],
        defaultCategory: "grocery"
    },
    "store_759": {
        name: "759 阿信屋",
        aliases: ["759", "759阿信屋", "阿信屋"],
        defaultCategory: "grocery"
    },
    "big_c": {
        name: "Big C",
        aliases: ["big c"],
        defaultCategory: "grocery"
    },
    "diary_store": {
        name: "日記士多",
        aliases: ["日記士多"],
        defaultCategory: "grocery"
    },
    "ds_groceries": {
        name: "大生生活超市",
        aliases: ["大生生活超市", "ds groceries", "大生"],
        defaultCategory: "grocery"
    },
    "fresh_life": {
        name: "新鮮生活",
        aliases: ["新鮮生活", "fresh life"],
        defaultCategory: "grocery"
    },
    "greenprice": {
        name: "GreenPrice",
        aliases: ["greenprice"],
        defaultCategory: "grocery"
    },
    "hont_bay_aquatic": {
        name: "本灣水產",
        aliases: ["本灣水產"],
        defaultCategory: "grocery"
    },
    "fusion": {
        name: "FUSION",
        aliases: ["fusion"],
        defaultCategory: "grocery"
    },
    "taste": {
        name: "TASTE",
        aliases: ["taste"],
        defaultCategory: "grocery"
    },
    "taste_x_fresh": {
        name: "TASTE x FRESH",
        aliases: ["taste x fresh", "tastexfresh"],
        defaultCategory: "grocery"
    },
    "international": {
        name: "INTERNATIONAL",
        aliases: ["international supermarket", "international"],
        defaultCategory: "grocery"
    },
    "food_le_parc": {
        name: "food le parc",
        aliases: ["food le parc", "foodleparc"],
        defaultCategory: "grocery"
    },
    "gourmet_store": {
        name: "GOURMET",
        aliases: ["gourmet"],
        defaultCategory: "grocery"
    },
    "great_food_hall": {
        name: "GREAT FOOD HALL",
        aliases: ["great food hall"],
        defaultCategory: "grocery"
    },
    "dolaimai": {
        name: "多來買",
        aliases: ["多來買"],
        defaultCategory: "grocery"
    },
    "citysuper": {
        name: "city'super",
        aliases: ["citysuper", "city'super"],
        defaultCategory: "grocery",
        byPrefix: { "hsbc": "department_store" }
    },
    "seven_eleven": {
        name: "7-Eleven",
        aliases: ["7-eleven", "7 eleven", "seven eleven", "7仔"],
        defaultCategory: "grocery"
    },
    "circle_k": {
        name: "Circle K OK便利店",
        aliases: ["circle k", "ok 便利店", "ok便利店", "ok store"],
        defaultCategory: "grocery",
        byCardId: { "sc_smart": "smart_designated" }
    },
    "hktvmall": {
        name: "HKTVmall",
        aliases: ["hktvmall", "香港電視mall", "香港電視 mall"],
        defaultCategory: "online",
        byPrefix: { "hsbc": "department_store" },
        byCardId: { "sc_smart": "smart_designated" }
    },

    // HSBC 最紅自主「賞家居」- 家居用品
    "at_home_hk": {
        name: "at.home",
        aliases: ["at.home", "athome"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "supermarket" }
    },
    "living_proposal": {
        name: "生活提案",
        aliases: ["生活提案"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "supermarket" }
    },
    "living_workshop": {
        name: "生活工房",
        aliases: ["生活工房"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "supermarket" }
    },
    "jhc": {
        name: "日本城",
        aliases: ["日本城", "jhc"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "supermarket" }
    },
    "keychain_pay": {
        name: "KeyChain Pay",
        aliases: ["keychain pay", "keychainpay"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "supermarket" }
    },
    "house_life_store": {
        name: "生活館",
        aliases: ["生活館"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "supermarket" }
    },
    "living_plaza": {
        name: "生活廊",
        aliases: ["生活廊", "living plaza"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "supermarket" }
    },
    "simmons": {
        name: "Simmons 蓆夢思",
        aliases: ["simmons", "蓆夢思"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "supermarket" }
    },
    "eurotherm": {
        name: "歐化寶",
        aliases: ["歐化寶", "eurotherm"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "supermarket" }
    },
    "european_furniture": {
        name: "歐化傢俬",
        aliases: ["歐化傢俬", "european furniture"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "supermarket" }
    },

    // HSBC 最紅自主「賞家居」- 電器
    "living_audio_video": {
        name: "生活影音",
        aliases: ["生活影音"],
        defaultCategory: "electronics"
    },
    "broadway_hk": {
        name: "百老滙 Broadway",
        aliases: ["百老滙", "broadway"],
        defaultCategory: "electronics"
    },
    "bruno_hk": {
        name: "BRUNO",
        aliases: ["bruno"],
        defaultCategory: "electronics"
    },
    "chung_yuen": {
        name: "中原電器",
        aliases: ["中原電器", "chung yuen"],
        defaultCategory: "electronics"
    },
    "j_select": {
        name: "J SELECT",
        aliases: ["j select", "jselect"],
        defaultCategory: "electronics"
    },
    "ninki_denki": {
        name: "人気電器店",
        aliases: ["人気電器店", "ninki denki"],
        defaultCategory: "electronics"
    },
    "panasonic_showroom": {
        name: "Panasonic 陳列室",
        aliases: ["panasonic 陳列室", "panasonic showroom"],
        defaultCategory: "electronics"
    },
    "price_hk": {
        name: "Price 網購",
        aliases: ["price", "price網購", "price hk"],
        defaultCategory: "electronics"
    },
    "suning_hk": {
        name: "蘇寧 Suning",
        aliases: ["蘇寧", "suning"],
        defaultCategory: "electronics"
    },
    "wai_ming_electric": {
        name: "偉明電業",
        aliases: ["偉明電業"],
        defaultCategory: "electronics"
    },
    "w_mall_whirlpool": {
        name: "W-Mall 惠而浦網上商店",
        aliases: ["w-mall", "w mall", "惠而浦網上商店", "whirlpool w-mall"],
        defaultCategory: "electronics"
    },
    "wilson_comm": {
        name: "衛訊 Wilson",
        aliases: ["衛訊", "wilson"],
        defaultCategory: "electronics"
    },
    "yoho": {
        name: "友和 YOHO",
        aliases: ["友和", "yoho"],
        defaultCategory: "electronics"
    },

    // HSBC 最紅自主「賞購物」
    // 百貨公司
    "aeon_style": {
        name: "AEON STYLE",
        aliases: ["aeon style"],
        defaultCategory: "department_store",
        byPrefix: { "hsbc": "department_store" }
    },
    "aeon_supermarket": {
        name: "AEON SUPERMARKET",
        aliases: ["aeon supermarket"],
        defaultCategory: "department_store",
        byPrefix: { "hsbc": "department_store" }
    },
    "apita": {
        name: "APITA",
        aliases: ["apita"],
        defaultCategory: "department_store",
        byPrefix: { "hsbc": "department_store" }
    },
    "bento_express_aeon": {
        name: "Bento Express by AEON",
        aliases: ["bento express by aeon", "bento express"],
        defaultCategory: "department_store",
        byPrefix: { "hsbc": "department_store" }
    },
    "chinese_arts_hk": {
        name: "中藝（香港）",
        aliases: ["中藝", "中藝香港", "chinese arts hk"],
        defaultCategory: "department_store",
        byPrefix: { "hsbc": "department_store" }
    },
    "c_life_hk": {
        name: "C生活",
        aliases: ["c生活", "c life"],
        defaultCategory: "department_store",
        byPrefix: { "hsbc": "department_store" }
    },
    "citistore": {
        name: "千色 Citistore",
        aliases: ["citistore", "千色", "千色citistore"],
        defaultCategory: "department_store",
        byPrefix: { "hsbc": "department_store" }
    },
    "citysuper_neighbourhood": {
        name: "city'super neighbourhood",
        aliases: ["citysuper neighbourhood", "city'super neighbourhood"],
        defaultCategory: "department_store",
        byPrefix: { "hsbc": "department_store" }
    },
    "citysuper_log_on": {
        name: "city'super LOG-ON",
        aliases: ["citysuper log-on", "city'super log-on"],
        defaultCategory: "department_store",
        byPrefix: { "hsbc": "department_store" }
    },
    "guk_san": {
        name: "谷辰",
        aliases: ["谷辰", "guk san"],
        defaultCategory: "department_store",
        byPrefix: { "hsbc": "department_store" }
    },
    "harvey_nichols": {
        name: "HARVEY NICHOLS",
        aliases: ["harvey nichols"],
        defaultCategory: "department_store",
        byPrefix: { "hsbc": "department_store" }
    },
    "living_plaza_aeon": {
        name: "Living PLAZA by AEON",
        aliases: ["living plaza by aeon"],
        defaultCategory: "department_store",
        byPrefix: { "hsbc": "department_store" }
    },
    "log_on": {
        name: "LOG-ON",
        aliases: ["log-on", "log on"],
        defaultCategory: "department_store",
        byPrefix: { "hsbc": "department_store" }
    },
    "marks_and_spencer": {
        name: "MARKS & SPENCER",
        aliases: ["marks & spencer", "marks and spencer", "m&s"],
        defaultCategory: "department_store",
        byPrefix: { "hsbc": "department_store" }
    },
    "mono_mono": {
        name: "Mono Mono",
        aliases: ["mono mono"],
        defaultCategory: "department_store",
        byPrefix: { "hsbc": "department_store" }
    },
    "sincere_department_store": {
        name: "先施百貨",
        aliases: ["先施百貨", "sincere"],
        defaultCategory: "department_store",
        byPrefix: { "hsbc": "department_store" }
    },
    "uny_life": {
        name: "UNY 生活創富",
        aliases: ["uny", "uny 生活創富", "生活創富"],
        defaultCategory: "department_store",
        byPrefix: { "hsbc": "department_store" }
    },
    "wing_on_department_store": {
        name: "永安百貨",
        aliases: ["永安百貨", "wing on department store"],
        defaultCategory: "department_store",
        byPrefix: { "hsbc": "department_store" }
    },
    "yata": {
        name: "一田 YATA",
        aliases: ["一田", "yata"],
        defaultCategory: "department_store",
        byPrefix: { "hsbc": "department_store" }
    },

    // 書店
    "chung_hwa_bookstore": {
        name: "中華書局",
        aliases: ["中華書局", "chung hwa"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "department_store" }
    },
    "eslite_bookstore": {
        name: "誠品書店",
        aliases: ["誠品書店", "eslite"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "department_store" }
    },
    "joint_publishing": {
        name: "三聯書店",
        aliases: ["三聯書店", "joint publishing"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "department_store" }
    },
    "commercial_press": {
        name: "商務印書館",
        aliases: ["商務印書館", "commercial press"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "department_store" }
    },

    // 潮流服飾 / 配件
    "seven_for_all_mankind": {
        name: "7 For All Mankind",
        aliases: ["7 for all mankind", "seven for all mankind"],
        defaultCategory: "apparel"
    },
    "agnes_b": {
        name: "agnes b.",
        aliases: ["agnes b", "agnès b", "agnes b."],
        defaultCategory: "apparel"
    },
    "birkenstock": {
        name: "BIRKENSTOCK",
        aliases: ["birkenstock"],
        defaultCategory: "apparel"
    },
    "brooks_brothers": {
        name: "Brooks Brothers",
        aliases: ["brooks brothers"],
        defaultCategory: "apparel"
    },
    "club_monaco": {
        name: "Club Monaco",
        aliases: ["club monaco"],
        defaultCategory: "apparel"
    },
    "columbia": {
        name: "Columbia",
        aliases: ["columbia"],
        defaultCategory: "sportswear"
    },
    "crocs": {
        name: "Crocs",
        aliases: ["crocs"],
        defaultCategory: "apparel"
    },
    "ecco": {
        name: "ECCO",
        aliases: ["ecco"],
        defaultCategory: "apparel"
    },
    "egg_optical": {
        name: "eGG Optical Boutique",
        aliases: ["egg optical boutique", "egg optical"],
        defaultCategory: "apparel"
    },
    "go_wild": {
        name: "Go Wild",
        aliases: ["go wild"],
        defaultCategory: "sportswear"
    },
    "misch_masch": {
        name: "MISCH MASCH",
        aliases: ["misch masch"],
        defaultCategory: "apparel"
    },
    "nical": {
        name: "NICAL",
        aliases: ["nical"],
        defaultCategory: "apparel"
    },
    "optical_88": {
        name: "眼鏡88",
        aliases: ["眼鏡88", "optical 88"],
        defaultCategory: "apparel"
    },
    "oriental_traffic": {
        name: "ORiental Traffic",
        aliases: ["oriental traffic", "oriental traffic"],
        defaultCategory: "apparel"
    },
    "wa_oriental_traffic": {
        name: "WA ORiental Traffic",
        aliases: ["wa oriental traffic"],
        defaultCategory: "apparel"
    },
    "rockport": {
        name: "ROCKPORT",
        aliases: ["rockport"],
        defaultCategory: "apparel"
    },
    "skechers": {
        name: "SKECHERS",
        aliases: ["skechers"],
        defaultCategory: "sportswear"
    },
    "sport_b": {
        name: "SPORT b.",
        aliases: ["sport b", "sport b."],
        defaultCategory: "apparel"
    },
    "teva": {
        name: "Teva",
        aliases: ["teva"],
        defaultCategory: "apparel"
    },
    "theory": {
        name: "Theory",
        aliases: ["theory"],
        defaultCategory: "apparel"
    },
    "twist_hk": {
        name: "TWIST",
        aliases: ["twist"],
        defaultCategory: "apparel"
    },
    "ugg": {
        name: "UGG",
        aliases: ["ugg"],
        defaultCategory: "apparel"
    },
    "uniqlo": {
        name: "UNIQLO",
        aliases: ["uniqlo"],
        defaultCategory: "apparel"
    },
    "zalora": {
        name: "ZALORA",
        aliases: ["zalora"],
        defaultCategory: "apparel"
    },
    "zoff": {
        name: "Zoff",
        aliases: ["zoff"],
        defaultCategory: "apparel"
    },

    // 護膚美妝 / 保健護理
    "atcosme_store": {
        name: "@cosme STORE",
        aliases: ["@cosme store", "cosme store", "atcosme"],
        defaultCategory: "health_beauty"
    },
    "beauty_avenue": {
        name: "BEAUTY AVENUE",
        aliases: ["beauty avenue"],
        defaultCategory: "health_beauty"
    },
    "guerlain": {
        name: "法國嬌蘭 GUERLAIN",
        aliases: ["嬌蘭", "guerlain", "法國嬌蘭"],
        defaultCategory: "health_beauty"
    },
    "ipsa": {
        name: "IPSA",
        aliases: ["ipsa"],
        defaultCategory: "health_beauty"
    },
    "joyce_beauty": {
        name: "JOYCE BEAUTY",
        aliases: ["joyce beauty"],
        defaultCategory: "health_beauty"
    },
    "mtm_labo": {
        name: "mtm labo",
        aliases: ["mtm labo"],
        defaultCategory: "health_beauty"
    },
    "time_by_mtm_labo": {
        name: "TIME by mtm labo",
        aliases: ["time by mtm labo"],
        defaultCategory: "health_beauty"
    },
    "spa_by_mtm_labo": {
        name: "SPA by mtm labo",
        aliases: ["spa by mtm labo"],
        defaultCategory: "health_beauty"
    },
    "nars": {
        name: "NARS",
        aliases: ["nars"],
        defaultCategory: "health_beauty"
    },
    "sasa": {
        name: "莎莎 Sa Sa",
        aliases: ["莎莎", "sasa", "sa sa"],
        defaultCategory: "health_beauty",
        byCardId: { "sc_smart": "smart_designated" }
    },
    "serge_lutens": {
        name: "Serge Lutens",
        aliases: ["serge lutens"],
        defaultCategory: "health_beauty"
    },
    "shiseido": {
        name: "SHISEIDO",
        aliases: ["shiseido"],
        defaultCategory: "health_beauty"
    },
    "sulwhasoo": {
        name: "雪花秀 Sulwhasoo",
        aliases: ["雪花秀", "sulwhasoo"],
        defaultCategory: "health_beauty"
    },
    "nam_pei_hong": {
        name: "南北行",
        aliases: ["南北行", "nam pei hong"],
        defaultCategory: "health_beauty"
    },
    "osim": {
        name: "OSIM",
        aliases: ["osim"],
        defaultCategory: "health_beauty"
    },
    "oto": {
        name: "OTO",
        aliases: ["oto"],
        defaultCategory: "health_beauty"
    },
    "slowood": {
        name: "SLOWOOD",
        aliases: ["slowood"],
        defaultCategory: "health_beauty"
    },
    "vita_green": {
        name: "維特健靈 Vita Green",
        aliases: ["維特健靈", "vita green"],
        defaultCategory: "health_beauty"
    },
    "wai_yuen_tong": {
        name: "位元堂 Wai Yuen Tong",
        aliases: ["位元堂", "wai yuen tong"],
        defaultCategory: "health_beauty"
    },

    // 其他
    "agnes_b_fleuriste": {
        name: "agnes b. FLEURISTE",
        aliases: ["agnes b fleuriste", "agnès b fleuriste"],
        defaultCategory: "apparel"
    },
    "cantevole": {
        name: "Cantevole",
        aliases: ["cantevole"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "department_store" }
    },
    "casetify": {
        name: "CASETiFY",
        aliases: ["casetify"],
        defaultCategory: "apparel"
    },
    "la_boheme": {
        name: "La Bohéme",
        aliases: ["la boheme", "la bohéme"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "department_store" }
    },
    "royce": {
        name: "ROYCE'",
        aliases: ["royce", "royce'"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "department_store" }
    },
    "watsons_wine": {
        name: "屈臣氏酒窖 Watson's Wine",
        aliases: ["屈臣氏酒窖", "watson's wine", "watsons wine"],
        defaultCategory: "grocery",
        byCardId: { "hsbc_easy": "easy_additional_3x" },
        byPrefix: { "hsbc": "department_store" }
    },

    // --- Transport / travel ---
    "mtr": {
        name: "港鐵 MTR",
        aliases: ["mtr", "港鐵"],
        defaultCategory: "transport",
        byCardId: { "hsbc_everymile": "em_designated_spend" },
        byPrefix: { "hsbc": "supermarket" }
    },
    "kmb": {
        name: "九巴 KMB",
        aliases: ["kmb", "九巴"],
        defaultCategory: "transport",
        byCardId: { "hsbc_everymile": "em_designated_spend" },
        byPrefix: { "hsbc": "supermarket" }
    },
    "citybus": {
        name: "城巴 Citybus",
        aliases: ["citybus", "城巴"],
        defaultCategory: "transport",
        byCardId: { "hsbc_everymile": "em_designated_spend" },
        byPrefix: { "hsbc": "supermarket" }
    },
    "hong_kong_tramways": {
        name: "Hong Kong Tramways 香港電車",
        aliases: ["hong kong tramways", "香港電車", "電車", "tram", "ding ding"],
        defaultCategory: "transport",
        byCardId: { "hsbc_everymile": "em_designated_spend" },
        byPrefix: { "hsbc": "supermarket" }
    },
    "uber": {
        name: "Uber",
        aliases: ["uber", "優步"],
        defaultCategory: "transport",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "china_railway_12306": {
        name: "12306 China Railway",
        aliases: ["12306", "china railway 12306", "中國鐵路12306"],
        defaultCategory: "travel",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "eternal_east_tours": {
        name: "Eternal East Tours 永東旅行社",
        aliases: ["eternal east tours", "永東旅行社", "eternal east"],
        defaultCategory: "travel",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "cts_hk": {
        name: "CTS Hong Kong 中旅社",
        aliases: ["cts", "cts hk", "china travel service", "中旅社", "中旅"],
        defaultCategory: "travel",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "gobybus_hk": {
        name: "GoByBus.hk",
        aliases: ["gobybus", "gobybus.hk", "go巴出行"],
        defaultCategory: "transport",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "kwoon_chung_bus": {
        name: "Kwoon Chung Bus 冠忠巴士",
        aliases: ["kwoon chung bus", "冠忠巴士", "冠忠"],
        defaultCategory: "transport",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "esso": {
        name: "Esso 埃索",
        aliases: ["esso", "埃索"],
        defaultCategory: "transport",
        byCardId: { "hsbc_everymile": "em_designated_spend" },
        byPrefix: { "hsbc": "supermarket" }
    },
    "petrochina": {
        name: "PetroChina 中國石油",
        aliases: ["petrochina", "中國石油"],
        defaultCategory: "transport",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "sinopec": {
        name: "Sinopec 中石化",
        aliases: ["sinopec", "中石化"],
        defaultCategory: "transport",
        byCardId: { "hsbc_everymile": "em_designated_spend" },
        byPrefix: { "hsbc": "supermarket" }
    },
    "shell": {
        name: "Shell 蜆殼",
        aliases: ["shell", "蜆殼"],
        defaultCategory: "transport",
        byCardId: { "hsbc_everymile": "em_designated_spend" },
        byPrefix: { "hsbc": "supermarket" }
    },
    "caltex": {
        name: "Caltex 加德士",
        aliases: ["caltex", "加德士"],
        defaultCategory: "transport",
        byCardId: { "hsbc_everymile": "em_designated_spend" },
        byPrefix: { "hsbc": "supermarket" }
    },
    "tesla_supercharger": {
        name: "Tesla SuperCharger",
        aliases: ["tesla supercharger", "tesla charger"],
        defaultCategory: "transport",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "everymile_carparks": {
        name: "EveryMile 停車場／車位（類別）",
        aliases: ["everymile 停車場", "carparks", "parking spaces", "停車場", "車位"],
        defaultCategory: "transport",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "everymile_tunnel_toll": {
        name: "EveryMile 隧道收費站（類別）",
        aliases: ["everymile 隧道費", "road tunnel toll plaza", "隧道收費站", "隧道費"],
        defaultCategory: "tunnel",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "amigo_taxi": {
        name: "Amigo",
        aliases: ["amigo taxi", "amigo"],
        defaultCategory: "transport",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "big_bee": {
        name: "Big Bee 大黃蜂",
        aliases: ["big bee", "大黃蜂", "big bee大黃蜂愛心車隊"],
        defaultCategory: "transport",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "dash_taxi": {
        name: "Dash",
        aliases: ["dash taxi", "dash"],
        defaultCategory: "transport",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "joie_taxi": {
        name: "Joie 樂行",
        aliases: ["joie taxi", "joie", "樂行"],
        defaultCategory: "transport",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "syncab": {
        name: "SynCab 星群的士",
        aliases: ["syncab", "星群的士"],
        defaultCategory: "transport",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "trip_com": {
        name: "Trip.com",
        aliases: ["trip.com", "trip com", "攜程"],
        defaultCategory: "travel"
    },
    "hutchgo": {
        name: "hutchgo",
        aliases: ["hutchgo"],
        defaultCategory: "travel",
        byCardId: { "hsbc_easy": "easy_additional_3x" }
    },
    "hutchgo_mall": {
        name: "hutchgo mall",
        aliases: ["hutchgo mall", "hutchgomall"],
        defaultCategory: "travel"
    },
    "harbour_plaza_8_degrees": {
        name: "Harbour Plaza 8 Degrees 八度海逸酒店",
        aliases: ["harbour plaza 8 degrees", "八度海逸酒店", "8度海逸酒店"],
        defaultCategory: "hotel",
        byCardId: { "hsbc_easy": "easy_additional_3x" }
    },
    "harbour_grand_kowloon": {
        name: "Harbour Grand Kowloon 九龍海逸君綽酒店",
        aliases: ["harbour grand kowloon", "九龍海逸君綽酒店"],
        defaultCategory: "hotel",
        byCardId: { "hsbc_easy": "easy_additional_3x" }
    },
    "harbour_grand_hong_kong": {
        name: "Harbour Grand Hong Kong 港島海逸君綽酒店",
        aliases: ["harbour grand hong kong", "港島海逸君綽酒店"],
        defaultCategory: "hotel",
        byCardId: { "hsbc_easy": "easy_additional_3x" }
    },
    "harbour_plaza_metropolis": {
        name: "Harbour Plaza Metropolis 都會海逸酒店",
        aliases: ["harbour plaza metropolis", "都會海逸酒店"],
        defaultCategory: "hotel",
        byCardId: { "hsbc_easy": "easy_additional_3x" }
    },
    "harbour_plaza_north_point": {
        name: "Harbour Plaza North Point 北角海逸酒店",
        aliases: ["harbour plaza north point", "北角海逸酒店"],
        defaultCategory: "hotel",
        byCardId: { "hsbc_easy": "easy_additional_3x" }
    },
    "harbour_plaza_resort_city": {
        name: "Harbour Plaza Resort City 嘉湖海逸酒店",
        aliases: ["harbour plaza resort city", "嘉湖海逸酒店"],
        defaultCategory: "hotel",
        byCardId: { "hsbc_easy": "easy_additional_3x" }
    },
    "rambler_garden_hotel": {
        name: "Rambler Garden Hotel 青逸酒店",
        aliases: ["rambler garden hotel", "青逸酒店", "harbour plaza the hunch"],
        defaultCategory: "hotel",
        byCardId: { "hsbc_easy": "easy_additional_3x" }
    },
    "hotel_alexandra": {
        name: "Hotel Alexandra 歷山酒店",
        aliases: ["hotel alexandra", "歷山酒店"],
        defaultCategory: "hotel",
        byCardId: { "hsbc_easy": "easy_additional_3x" }
    },
    "the_kowloon_hotel": {
        name: "The Kowloon Hotel 九龍酒店",
        aliases: ["the kowloon hotel", "kowloon hotel", "九龍酒店"],
        defaultCategory: "hotel",
        byCardId: { "hsbc_easy": "easy_additional_3x" }
    },
    "kowloon_harbourfront_hotel": {
        name: "Kowloon Harbourfront Hotel 九龍海灣酒店",
        aliases: ["kowloon harbourfront hotel", "九龍海灣酒店"],
        defaultCategory: "hotel",
        byCardId: { "hsbc_easy": "easy_additional_3x" }
    },
    "kkday": {
        name: "KKday",
        aliases: ["kkday", "kk day"],
        defaultCategory: "travel",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "klook": {
        name: "Klook",
        aliases: ["klook", "客路"],
        defaultCategory: "travel",
        byCardId: { "hsbc_everymile": "em_designated_spend", "sc_smart": "smart_designated" }
    },
    "booking_com": {
        name: "Booking.com",
        aliases: ["booking.com", "booking com"],
        defaultCategory: "travel"
    },
    "agoda": {
        name: "Agoda",
        aliases: ["agoda"],
        defaultCategory: "travel"
    },
    "expedia": {
        name: "Expedia",
        aliases: ["expedia"],
        defaultCategory: "travel"
    },
    "avis": {
        name: "AVIS",
        aliases: ["avis"],
        defaultCategory: "travel",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "hertz": {
        name: "HERTZ 赫茲",
        aliases: ["hertz", "赫茲"],
        defaultCategory: "travel",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "tocoo_car_rental": {
        name: "Tocoo Car Rental",
        aliases: ["tocoo", "tocoo car rental", "tocoo租車"],
        defaultCategory: "travel",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "toyota_rent_a_car": {
        name: "TOYOTA Rent a Car",
        aliases: ["toyota rent a car", "豐田租車"],
        defaultCategory: "travel",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "miramar_travel": {
        name: "Miramar Travel 美麗華旅遊",
        aliases: ["miramar travel", "美麗華旅遊"],
        defaultCategory: "travel"
    },
    "sunflower_travel": {
        name: "Sunflower Travel 新華旅遊",
        aliases: ["sunflower travel", "新華旅遊"],
        defaultCategory: "travel"
    },
    "wing_on_travel": {
        name: "Wing On Travel 永安旅遊",
        aliases: ["wing on travel", "永安旅遊"],
        defaultCategory: "travel"
    },
    "ymt_travel": {
        name: "YMT Travel 油麻地旅遊",
        aliases: ["ymt travel", "油麻地旅遊", "yau ma tei travel"],
        defaultCategory: "travel"
    },
    "airsim": {
        name: "AirSIM",
        aliases: ["airsim", "air sim"],
        defaultCategory: "travel",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "cotai_water_jet": {
        name: "Cotai Water Jet 金光飛航",
        aliases: ["cotai water jet", "金光飛航", "cotai jet"],
        defaultCategory: "travel",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "turbojet": {
        name: "TurboJET 噴射飛航",
        aliases: ["turbojet", "turbo jet", "噴射飛航"],
        defaultCategory: "travel",
        byCardId: { "hsbc_everymile": "em_designated_spend" }
    },
    "cathay_pacific": {
        name: "Cathay Pacific 國泰航空",
        aliases: ["cathay", "cathay pacific", "國泰", "國泰航空"],
        defaultCategory: "airline"
    },
    "hk_express": {
        name: "HK Express 香港快運",
        aliases: ["hk express", "hong kong express", "香港快運"],
        defaultCategory: "cathay_hkexpress"
    },

    // --- Entertainment / subscription ---
    "cgv_cinemas": {
        name: "CGV Cinemas",
        aliases: ["cgv cinemas", "cgv"],
        defaultCategory: "entertainment"
    },
    "emperor_cinemas": {
        name: "英皇戲院 Emperor Cinemas",
        aliases: ["英皇戲院", "emperor cinemas"],
        defaultCategory: "entertainment"
    },
    "festival_grand_cinema": {
        name: "Festival Grand Cinema",
        aliases: ["festival grand cinema"],
        defaultCategory: "entertainment"
    },
    "kornhill_cinema": {
        name: "康怡戲院",
        aliases: ["康怡戲院", "kornhill cinema"],
        defaultCategory: "entertainment"
    },
    "palace_cinema": {
        name: "皇室戲院",
        aliases: ["皇室戲院", "palace cinema"],
        defaultCategory: "entertainment"
    },
    "k11_art_house": {
        name: "K11 Art House",
        aliases: ["k11 art house"],
        defaultCategory: "entertainment"
    },
    "mcl_cinemas": {
        name: "MCL 院線",
        aliases: ["mcl", "mcl cinemas", "mcl 院線"],
        defaultCategory: "entertainment"
    },
    "movie_town": {
        name: "Movie Town",
        aliases: ["movie town"],
        defaultCategory: "entertainment"
    },
    "star_cinema": {
        name: "STAR Cinema",
        aliases: ["star cinema"],
        defaultCategory: "entertainment"
    },
    "cityline_hk": {
        name: "購票通 Cityline",
        aliases: ["購票通", "cityline"],
        defaultCategory: "entertainment"
    },
    "cityplaza_ice_palace": {
        name: "太古城中心冰上皇宮",
        aliases: ["太古城中心冰上皇宮", "cityplaza ice palace", "ice palace"],
        defaultCategory: "entertainment"
    },
    "ef_english_centers": {
        name: "EF English Centers",
        aliases: ["ef english centers", "ef english", "ef"],
        defaultCategory: "entertainment"
    },
    "greenery_music": {
        name: "青苗琴行",
        aliases: ["青苗琴行", "greenery music"],
        defaultCategory: "entertainment"
    },
    "hkticketing": {
        name: "快達票 HK Ticketing",
        aliases: ["快達票", "hk ticketing", "hkticketing"],
        defaultCategory: "entertainment",
        byCardId: { "sc_smart": "smart_designated" }
    },
    "kkbox": {
        name: "KKBOX",
        aliases: ["kkbox"],
        defaultCategory: "entertainment"
    },
    "kktix": {
        name: "KKTix",
        aliases: ["kktix"],
        defaultCategory: "entertainment"
    },
    "moov": {
        name: "MOOV",
        aliases: ["moov"],
        defaultCategory: "entertainment"
    },
    "neway_ceo": {
        name: "Neway CEO Karaoke",
        aliases: ["neway ceo", "neway karaoke", "neway"],
        defaultCategory: "entertainment"
    },
    "lcsd_leisure_link": {
        name: "康體通 Leisure Link",
        aliases: ["康體通", "leisure link", "lcsd leisure"],
        defaultCategory: "entertainment"
    },
    "tom_lee_music": {
        name: "通利琴行 Tom Lee Music",
        aliases: ["通利琴行", "tom lee music", "tom lee"],
        defaultCategory: "entertainment"
    },
    "netflix": {
        name: "Netflix",
        aliases: ["netflix"],
        defaultCategory: "entertainment"
    },
    "disney_plus": {
        name: "Disney+",
        aliases: ["disney+", "disney plus"],
        defaultCategory: "entertainment"
    },
    "spotify": {
        name: "Spotify",
        aliases: ["spotify"],
        defaultCategory: "entertainment"
    },
    "youtube_premium": {
        name: "YouTube Premium",
        aliases: ["youtube premium"],
        defaultCategory: "entertainment"
    },

    // --- Telecom ---
    "hkt": {
        name: "HKT 香港電訊",
        aliases: ["hkt", "香港電訊", "pccw", "hkt 家居電話", "家居電話"],
        defaultCategory: "telecom",
        byCardId: { "citi_club": "citi_club_telecom" }
    },
    "club_sim": {
        name: "Club Sim",
        aliases: ["club sim", "clubsim"],
        defaultCategory: "telecom"
    },
    "mu_guan": {
        name: "沐館",
        aliases: ["沐館"],
        defaultCategory: "health_beauty",
        byPrefix: { "hsbc": "entertainment" }
    },
    "jing_massage": {
        name: "靜",
        aliases: ["靜"],
        defaultCategory: "health_beauty",
        byPrefix: { "hsbc": "entertainment" }
    },
    "sun_moon_massage": {
        name: "日月按摩",
        aliases: ["日月按摩"],
        defaultCategory: "health_beauty",
        byPrefix: { "hsbc": "entertainment" }
    },
    "toni_and_guy_hk": {
        name: "TONI&GUY Hong Kong",
        aliases: ["toni&guy", "toni and guy", "toni&guy hong kong"],
        defaultCategory: "health_beauty",
        byPrefix: { "hsbc": "entertainment" }
    },
    "zi_massage_wellness": {
        name: "梔 Zi Massage & Wellness",
        aliases: ["梔", "zi massage", "zi massage & wellness"],
        defaultCategory: "health_beauty",
        byPrefix: { "hsbc": "entertainment" }
    },
    "smartone": {
        name: "SmarTone 數碼通",
        aliases: ["smartone", "數碼通"],
        defaultCategory: "telecom"
    },
    "three_hk": {
        name: "3HK",
        aliases: ["3hk", "three hk", "3香港", "和記電訊"],
        defaultCategory: "telecom",
        byCardId: { "hsbc_easy": "easy_additional_3x" }
    },
    "supreme": {
        name: "SUPREME",
        aliases: ["supreme telecom", "supreme"],
        defaultCategory: "telecom",
        byCardId: { "hsbc_easy": "easy_additional_3x" }
    },
    "etoll": {
        name: "易通行 eToll",
        aliases: ["易通行", "etoll", "e toll"],
        defaultCategory: "tunnel",
        byPrefix: { "hsbc": "supermarket" }
    },
    "pit": {
        name: "PIT",
        aliases: ["pit"],
        defaultCategory: "transport",
        byPrefix: { "hsbc": "supermarket" }
    },
    "shell_recharge": {
        name: "Shell Recharge",
        aliases: ["shell recharge"],
        defaultCategory: "transport",
        byPrefix: { "hsbc": "supermarket" }
    },
    "tesla": {
        name: "Tesla",
        aliases: ["tesla"],
        defaultCategory: "transport",
        byPrefix: { "hsbc": "supermarket" }
    },
    "pet_line_hk": {
        name: "寵寵線",
        aliases: ["寵寵線", "pet line"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "supermarket" }
    },
    "petmium": {
        name: "Petmium 寵物百貨",
        aliases: ["petmium", "寵物百貨"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "supermarket" }
    },
    "q_pets": {
        name: "Q-Pets",
        aliases: ["q-pets", "q pets"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "supermarket" }
    },
    "red_carrot_pet": {
        name: "紅蘿蔔",
        aliases: ["紅蘿蔔", "red carrot pet"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "supermarket" }
    },
    "the_dogs_garden": {
        name: "The Dog's Garden",
        aliases: ["the dog's garden", "the dogs garden"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "supermarket" }
    },
    "three_little_meow": {
        name: "Three Little Meow",
        aliases: ["three little meow"],
        defaultCategory: "general",
        byPrefix: { "hsbc": "supermarket" }
    }
};
