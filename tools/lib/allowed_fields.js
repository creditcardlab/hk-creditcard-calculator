// tools/lib/allowed_fields.js
// Single source of truth for override-allowed fields.
// Used by: tools/workbench.js, js/data_index.js (via sync check).
"use strict";

const ALLOWED_FIELDS = {
  cards: new Set([
    "name",
    "currency",
    "type",
    "fcf",
    "bank",
    "status",
    "hidden",
    "redemption",
    "reward_modules_add",
    "trackers_add"
  ]),
  categories: new Set(["label", "parent", "hidden"]),
  modules: new Set([
    "desc",
    "display_name_zhhk",
    "note_zhhk",
    "rate",
    "rate_per_x",
    "multiplier",
    "mode",
    "match",
    "retroactive",
    "promo_end",
    "valid_from",
    "valid_to",
    "valid_days",
    "valid_on_red_day",
    "cap_mode",
    "cap_limit",
    "cap_key",
    "secondary_cap_limit",
    "secondary_cap_key",
    "min_spend",
    "min_single_spend",
    "req_mission_spend",
    "req_mission_key",
    "setting_key",
    "usage_key",
    "tnc_url",
    "promo_url",
    "source_url",
    "registration_url",
    "registration_start",
    "registration_end",
    "registration_note",
    "last_verified_at"
  ]),
  trackers: new Set([
    "type",
    "desc",
    "match",
    "setting_key",
    "req_mission_key",
    "mission_id",
    "promo_end",
    "valid_from",
    "valid_to",
    "effects_on_match",
    "effects_on_eligible",
    "counter",
    "retroactive"
  ]),
  campaigns: new Set(["name", "period_policy", "promo_type", "icon", "theme", "cards", "sections", "capKeys", "warningOnly", "display_name_zhhk"]),
  campaignRegistry: new Set([
    "settingKey",
    "warningTitle",
    "warningDesc",
    "tncUrl",
    "promoUrl",
    "registrationUrl",
    "registrationStart",
    "registrationEnd",
    "registrationNote",
    "implementationNote"
  ])
};

// Export as sorted arrays (for JSON serialization and display).
function getAllowedFieldsMap() {
  const map = {};
  Object.keys(ALLOWED_FIELDS).forEach((bucket) => {
    map[bucket] = Array.from(ALLOWED_FIELDS[bucket]).sort();
  });
  return map;
}

// Verify that an inline copy matches the canonical definition.
// Returns { ok, mismatches[] }.
function verifyAllowlistSync(inlineCopy) {
  const mismatches = [];
  const canonical = getAllowedFieldsMap();
  const buckets = new Set([...Object.keys(canonical), ...Object.keys(inlineCopy || {})]);
  buckets.forEach((bucket) => {
    const expected = (canonical[bucket] || []).slice().sort();
    const actual = (inlineCopy[bucket] || []).slice().sort();
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      mismatches.push({
        bucket,
        expected,
        actual,
        missing: expected.filter((f) => !actual.includes(f)),
        extra: actual.filter((f) => !expected.includes(f))
      });
    }
  });
  return { ok: mismatches.length === 0, mismatches };
}

module.exports = { ALLOWED_FIELDS, getAllowedFieldsMap, verifyAllowlistSync };
