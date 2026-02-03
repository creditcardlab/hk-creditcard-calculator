#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const CASES_PATH = path.resolve(__dirname, "golden_cases.json");

function createLocalStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

function loadScript(filePath) {
  const code = fs.readFileSync(filePath, "utf8");
  vm.runInThisContext(code, { filename: filePath });
}

function bootAppContext() {
  global.window = global;
  global.document = {};
  global.localStorage = createLocalStorage();
  global.fetch = async () => { throw new Error("fetch not available in golden runner"); };

  const scripts = [
    "data_cards.js",
    "data_categories.js",
    "data_modules.js",
    "data_conversions.js",
    "data_rules.js",
    "data_promotions.js",
    "data_counters.js",
    "data_index.js",
    "core.js",
    "periods.js"
  ].map((file) => path.resolve(ROOT, "js", file));

  scripts.forEach(loadScript);

  if (typeof HolidayManager !== "undefined" && typeof STATIC_HOLIDAYS !== "undefined") {
    HolidayManager.holidays = Array.isArray(STATIC_HOLIDAYS) ? [...STATIC_HOLIDAYS] : [];
  }
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function buildProfile(input) {
  const base = deepClone(global.userProfile || {});
  const profile = {
    ownedCards: Array.isArray(input.ownedCards) ? [...input.ownedCards] : (base.ownedCards || []),
    settings: { ...(base.settings || {}), ...(input.settings || {}) },
    usage: { ...(base.usage || {}), ...(input.usage || {}) },
    stats: deepClone(base.stats || { totalSpend: 0, totalVal: 0, txCount: 0 }),
    transactions: []
  };

  if (profile.settings.deduct_fcf_ranking === undefined) profile.settings.deduct_fcf_ranking = false;
  if (!profile.settings.red_hot_allocation) {
    profile.settings.red_hot_allocation = { dining: 5, world: 0, home: 0, enjoyment: 0, style: 0 };
  }

  return profile;
}

function roundTo(value, digits) {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function extractFlags(breakdown) {
  const flags = { hasLocked: false, hasCapped: false, hasPartial: false };
  if (!Array.isArray(breakdown)) return flags;

  breakdown.forEach((entry) => {
    if (typeof entry === "string") {
      if (entry.includes("🔒")) flags.hasLocked = true;
      if (entry.includes("爆Cap") || entry.includes("line-through") || entry.includes("🚫")) flags.hasCapped = true;
      if (entry.includes("(部分)")) flags.hasPartial = true;
      return;
    }
    const text = (entry && entry.text) ? String(entry.text) : "";
    const eFlags = entry && entry.flags ? entry.flags : {};
    if (eFlags.locked || text.includes("🔒")) flags.hasLocked = true;
    if (eFlags.capped || eFlags.strike || text.includes("爆Cap") || text.includes("🚫")) flags.hasCapped = true;
    if (eFlags.partial || text.includes("(部分)")) flags.hasPartial = true;
  });

  return flags;
}

function computeExpected(input) {
  const displayMode = input.displayMode || "cash";
  const isOnline = !!input.isOnline;
  const paymentMethod = input.paymentMethod || "physical";
  // Match app.js semantics: anything not "physical" counts as mobile pay unless explicitly overridden.
  const isMobilePay = input.isMobilePay !== undefined ? !!input.isMobilePay : paymentMethod !== "physical";
  const profile = buildProfile(input);
  const isHoliday = typeof HolidayManager !== "undefined" && typeof HolidayManager.isHoliday === "function"
    ? HolidayManager.isHoliday(input.date)
    : false;

  const results = calculateResults(
    Number(input.amount),
    input.category,
    displayMode,
    profile,
    input.date,
    isHoliday,
    {
      deductFcfForRanking: !!profile.settings.deduct_fcf_ranking && displayMode === "cash",
      isOnline,
      isMobilePay,
      paymentMethod
    }
  );

  if (!results || results.length === 0) {
    return {
      topCardId: null,
      topValue: 0,
      breakdownFlags: { hasLocked: false, hasCapped: false, hasPartial: false }
    };
  }

  const top = results[0];
  const topValueRaw = displayMode === "miles" ? Number(top.estMiles || 0) : Number(top.estCash || 0);
  const topValue = roundTo(topValueRaw, 6);

  return {
    topCardId: top.cardId,
    topValue,
    breakdownFlags: extractFlags(top.breakdown)
  };
}

function main() {
  bootAppContext();

  const raw = fs.readFileSync(CASES_PATH, "utf8");
  const payload = JSON.parse(raw);
  const cases = payload.cases || [];
  const periodCases = payload.period_cases || [];

  const shouldUpdate = process.argv.includes("--update");

  let failures = 0;
  const updatedCases = cases.map((c) => {
    const expected = computeExpected(c.input || {});

    if (shouldUpdate) {
      return { ...c, expected };
    }

    const exp = c.expected || {};
    const mismatches = [];

    if (exp.topCardId !== expected.topCardId) {
      mismatches.push(`topCardId expected ${exp.topCardId}, got ${expected.topCardId}`);
    }

    if (typeof exp.topValue === "number") {
      const delta = Math.abs(exp.topValue - expected.topValue);
      if (delta > 1e-6) mismatches.push(`topValue expected ${exp.topValue}, got ${expected.topValue}`);
    } else {
      mismatches.push("topValue missing in expected");
    }

    const expFlags = exp.breakdownFlags || {};
    const flags = expected.breakdownFlags || {};
    ["hasLocked", "hasCapped", "hasPartial"].forEach((key) => {
      if (expFlags[key] !== flags[key]) {
        mismatches.push(`${key} expected ${expFlags[key]}, got ${flags[key]}`);
      }
    });

    if (mismatches.length > 0) {
      failures += 1;
      console.log(`❌ ${c.id}: ${mismatches.join("; ")}`);
    } else {
      console.log(`✅ ${c.id}`);
    }

    return c;
  });

  if (shouldUpdate) {
    const next = { ...payload, cases: updatedCases };
    fs.writeFileSync(CASES_PATH, JSON.stringify(next, null, 2));
    console.log(`\nUpdated expected results for ${updatedCases.length} cases.`);
    return;
  }

  if (periodCases.length > 0) {
    periodCases.forEach((c) => {
      const periodType = c.periodType;
      const anchor = c.anchor || null;
      const id = periodType === "promo" ? (c.promoId || "promo") : (c.id || "period");
      const date = c.date;
      const bucketKey = getBucketKey(date, periodType, anchor, id);
      const didReset = c.prevBucketKey !== bucketKey;

      const mismatches = [];
      if (c.expectedBucketKey !== bucketKey) {
        mismatches.push(`bucket expected ${c.expectedBucketKey}, got ${bucketKey}`);
      }
      if (c.expectReset !== didReset) {
        mismatches.push(`reset expected ${c.expectReset}, got ${didReset}`);
      }

      if (mismatches.length > 0) {
        failures += 1;
        console.log(`❌ ${c.id}: ${mismatches.join("; ")}`);
      } else {
        console.log(`✅ ${c.id}`);
      }
    });
  }

  if (failures > 0) {
    console.log(`\n${failures} case(s) failed.`);
    process.exit(1);
  }

  console.log(`\nAll ${cases.length} cases passed.`);
}

main();
