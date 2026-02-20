# Workbench Audit

## Counts
- Cards: 52
- Modules: 181
- Trackers: 25
- Offers: 220
- Campaigns: 38
- Special Promo Models: 1
- Categories: 71

## Orphans
- Unused modules (1)
  sc_cathay_private
- Unused trackers (0)

## Campaign Binding Issues
- Missing module refs (0)
- Section drift vs module mission/unlock fields (0)
- Promo type issues (16)
  ae_explorer_2026h1: unsupported promo_type=cap
  ae_explorer_online_2026: unsupported promo_type=cap
  ae_pcc_double_points_2026: unsupported promo_type=cap
  ae_pcc_program_3x_2026: unsupported promo_type=cap
  ae_platinum_9x_2026h1: unsupported promo_type=cap
  aeon_wakuwaku_2025_2026: unsupported promo_type=cap
  bea_unionpay_diamond_2025_2026h1: unsupported promo_type=cap
  boc_go_offer: unsupported promo_type=cap
  boc_go_offer_platinum: promo_type=mission_cap but inferred=mission_multi_cap
  boc_sogo_mobile_offer: unsupported promo_type=cap
  citi_rewards_bonus: unsupported promo_type=cap
  fubon_infinite_overseas_2026: unsupported promo_type=multi_cap
  fubon_travel_overseas_2026: unsupported promo_type=multi_cap
  fubon_travel_upgrade_promo: unsupported promo_type=cap
  sim_promo: unsupported promo_type=multi_cap
  sim_world_promo: unsupported promo_type=multi_cap
- Special promo issues (0)

## Data Conflicts
- Cap mode mismatches (0)
- Promo date overlaps (22)
  dbs_live_fresh: modules dbs_live_fresh_selected and dbs_live_fresh_online_foreign overlap on [live_fresh_selected] (2026-01-01~2026-06-30 vs 2026-01-01~2026-12-31)
  boc_cheers_vi: modules boc_cheers_vi_dining_2026h1 and boc_amazing_weekday overlap on [dining] (2026-01-01~2026-06-30 vs 2026-01-01~2026-06-30)
  boc_cheers_vi: modules boc_cheers_vi_dining_2026h1 and boc_amazing_holiday overlap on [dining] (2026-01-01~2026-06-30 vs 2026-01-01~2026-06-30)
  boc_cheers_vi: modules boc_cheers_vi_fx_2026h1 and boc_amazing_weekday overlap on [travel] (2026-01-01~2026-06-30 vs 2026-01-01~2026-06-30)
  boc_cheers_vi: modules boc_cheers_vi_fx_2026h1 and boc_amazing_holiday overlap on [travel] (2026-01-01~2026-06-30 vs 2026-01-01~2026-06-30)
  boc_cheers_vi: modules boc_amazing_weekday and boc_amazing_holiday overlap on [dining,travel,entertainment,telecom,medical,apparel,hotel] (2026-01-01~2026-06-30 vs 2026-01-01~2026-06-30)
  boc_cheers_vi: modules boc_amazing_online_weekday and boc_amazing_online_holiday overlap on [online] (2026-01-01~2026-06-30 vs 2026-01-01~2026-06-30)
  boc_cheers_vs: modules boc_cheers_vs_dining_2026h1 and boc_amazing_weekday_vs overlap on [dining] (2026-01-01~2026-06-30 vs 2026-01-01~2026-06-30)
  boc_cheers_vs: modules boc_cheers_vs_dining_2026h1 and boc_amazing_holiday_vs overlap on [dining] (2026-01-01~2026-06-30 vs 2026-01-01~2026-06-30)
  boc_cheers_vs: modules boc_cheers_vs_fx_2026h1 and boc_amazing_weekday_vs overlap on [travel] (2026-01-01~2026-06-30 vs 2026-01-01~2026-06-30)
  boc_cheers_vs: modules boc_cheers_vs_fx_2026h1 and boc_amazing_holiday_vs overlap on [travel] (2026-01-01~2026-06-30 vs 2026-01-01~2026-06-30)
  boc_cheers_vs: modules boc_amazing_weekday_vs and boc_amazing_holiday_vs overlap on [dining,travel,entertainment,telecom,medical,apparel,hotel] (2026-01-01~2026-06-30 vs 2026-01-01~2026-06-30)
  boc_cheers_vs: modules boc_amazing_online_weekday_vs and boc_amazing_online_holiday_vs overlap on [online] (2026-01-01~2026-06-30 vs 2026-01-01~2026-06-30)
  ae_explorer: modules ae_explorer_fx_travel_bonus_075_2026h1 and ae_explorer_fx_7x_bonus_2026h1 overlap on [overseas] (2026-01-02~2026-06-30 vs 2026-01-02~2026-06-30)
  ae_explorer: modules ae_explorer_fx_travel_bonus_075_2026h1 and ae_explorer_travel_7x_bonus_2026h1 overlap on [travel,cathay_hkexpress,ae_online_travel_designated] (2026-01-02~2026-06-30 vs 2026-01-02~2026-06-30)
  ae_explorer: modules ae_explorer_fx_travel_bonus_075_2026h1 and ae_explorer_online_5x_bonus_2026 overlap on [ae_online_travel_designated] (2026-01-02~2026-06-30 vs 2026-01-02~2026-12-31)
  ae_explorer: modules ae_explorer_travel_7x_bonus_2026h1 and ae_explorer_online_5x_bonus_2026 overlap on [ae_online_travel_designated] (2026-01-02~2026-06-30 vs 2026-01-02~2026-12-31)
  ae_platinum_credit: modules ae_pcc_double_extra_3x_precap and ae_pcc_double_extra_1x_postcap overlap on [ae_pcc_designated] (2025-01-01~2026-12-31 vs 2025-01-01~2026-12-31)
  bea_world: modules bea_world_bonus and bea_world_flying_overseas overlap on [overseas] (2025-01-01~2026-06-30 vs 2025-01-01~2026-06-30)
  bea_world: modules bea_world_bonus and bea_world_flying_designated_local overlap on [dining,electronics,sportswear,gym,medical] (2025-01-01~2026-06-30 vs 2025-01-01~2026-06-30)
  bea_world_privilege: modules bea_world_bonus and bea_world_flying_overseas overlap on [overseas] (2025-01-01~2026-06-30 vs 2025-01-01~2026-06-30)
  bea_world_privilege: modules bea_world_bonus and bea_world_flying_designated_local overlap on [dining,electronics,sportswear,gym,medical] (2025-01-01~2026-06-30 vs 2025-01-01~2026-06-30)
- Orphan mission keys (14)
  module travel_guru_v2: req_mission_key "spend_guru_unlock" not written by any tracker
  module citi_octopus_transport_tier2: req_mission_key "spend_citi_octopus" not written by any tracker
  module citi_octopus_transport_tier1: req_mission_key "spend_citi_octopus" not written by any tracker
  module citi_octopus_tunnel: req_mission_key "spend_citi_octopus" not written by any tracker
  module mmpower_overseas_bonus: req_mission_key "spend_hangseng_mmpower" not written by any tracker
  module mmpower_online_bonus: req_mission_key "spend_hangseng_mmpower" not written by any tracker
  module mmpower_selected_bonus: req_mission_key "spend_hangseng_mmpower" not written by any tracker
  module travel_plus_tier1_bonus: req_mission_key "spend_hangseng_travel_plus" not written by any tracker
  module travel_plus_tier2_bonus: req_mission_key "spend_hangseng_travel_plus" not written by any tracker
  module travel_plus_dining_bonus: req_mission_key "spend_hangseng_travel_plus" not written by any tracker
  module boc_cheers_dining: req_mission_key "spend_boc_cheers_vi" not written by any tracker
  module boc_cheers_travel: req_mission_key "spend_boc_cheers_vi" not written by any tracker
  module boc_cheers_dining_vs: req_mission_key "spend_boc_cheers_vs" not written by any tracker
  module boc_cheers_travel_vs: req_mission_key "spend_boc_cheers_vs" not written by any tracker

