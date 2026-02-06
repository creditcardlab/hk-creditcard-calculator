#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const OUT_PATH = path.resolve(__dirname, "data_export.json");

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

function loadData() {
  global.window = global;
  global.__SKIP_INIT = true;
  global.document = {};
  global.localStorage = createLocalStorage();
  global.fetch = async () => {
    throw new Error("fetch not available in export script");
  };

  const scripts = [
    "data_cards.js",
    "data_categories.js",
    "data_modules.js",
    "data_trackers.js",
    "data_conversions.js",
    "data_rules.js",
    "data_campaigns.js",
    "data_counters.js",
    "period_policy.js",
    "data_notion_core_overrides.js",
    "data_index.js"
  ].map((file) => path.resolve(ROOT, "js", file));

  scripts.forEach(loadScript);

  return global.DATA || {};
}

function normalizeForExport(value) {
  if (typeof value === "function") return "[Function]";
  if (Array.isArray(value)) {
    const arr = value.map(normalizeForExport);
    if (arr.length > 0 && arr.every((v) => v && typeof v === "object" && Object.prototype.hasOwnProperty.call(v, "id"))) {
      arr.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    }
    return arr;
  }
  if (value && typeof value === "object") {
    const out = {};
    Object.keys(value).sort().forEach((key) => {
      out[key] = normalizeForExport(value[key]);
    });
    return out;
  }
  return value;
}

function main() {
  const data = loadData();

  const exportData = {
    cards: data.cards || [],
    modules: data.modules || {},
    trackers: data.trackers || {},
    campaigns: data.campaigns || [],
    categories: data.categories || {},
    campaignRegistry: data.campaignRegistry || {},
    countersRegistry: data.countersRegistry || {},
    periodPolicy: data.periodPolicy || {}
  };

  const normalized = normalizeForExport(exportData);
  fs.writeFileSync(OUT_PATH, JSON.stringify(normalized, null, 2));
  console.log(`Exported data to ${OUT_PATH}`);
}

main();
