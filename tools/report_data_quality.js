#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.resolve(ROOT, "reports");
const OUT_PATH = path.resolve(OUT_DIR, "data_quality.md");

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
    throw new Error("fetch not available in report script");
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
    "data_index.js"
  ].map((file) => path.resolve(ROOT, "js", file));

  scripts.forEach(loadScript);

  return global.DATA || {};
}

function listIds(data) {
  return Object.keys(data || {}).sort();
}

function listUsageKeysFromModule(mod) {
  const keys = [];
  if (!mod) return keys;
  if (mod.cap_key) keys.push(mod.cap_key);
  if (mod.secondary_cap_key) keys.push(mod.secondary_cap_key);
  if (mod.usage_key) keys.push(mod.usage_key);
  if (mod.req_mission_key) keys.push(mod.req_mission_key);
  if (mod.cap && mod.cap.key) keys.push(mod.cap.key);
  if (mod.counter && mod.counter.key) keys.push(mod.counter.key);
  return keys;
}

function listUsageKeysFromTracker(tracker) {
  const keys = [];
  if (!tracker) return keys;
  if (tracker.req_mission_key) keys.push(tracker.req_mission_key);
  if (tracker.counter && tracker.counter.key) keys.push(tracker.counter.key);
  return keys;
}

function listUsageKeysFromCampaign(campaign) {
  const keys = [];
  if (!campaign || !Array.isArray(campaign.sections)) return keys;
  campaign.sections.forEach((sec) => {
    if (!sec) return;
    ["usageKey", "totalKey", "eligibleKey", "unlockKey"].forEach((field) => {
      if (sec[field]) keys.push(sec[field]);
    });
  });
  return keys;
}

function unique(list) {
  return Array.from(new Set(list)).sort();
}

function main() {
  const data = loadData();
  const cards = Array.isArray(data.cards) ? data.cards : [];
  const modules = data.modules || {};
  const trackers = data.trackers || {};
  const campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
  const categories = data.categories || {};
  const campaignRegistry = data.campaignRegistry || {};
  const countersRegistry = data.countersRegistry || {};

  const moduleIds = listIds(modules);
  const trackerIds = listIds(trackers);
  const campaignIds = campaigns.map(c => c && c.id).filter(Boolean).sort();
  const categoryIds = listIds(categories);

  const usedModules = new Set();
  const usedTrackers = new Set();
  cards.forEach((card) => {
    if (!card) return;
    if (Array.isArray(card.rewardModules)) card.rewardModules.forEach((id) => usedModules.add(id));
    if (Array.isArray(card.trackers)) card.trackers.forEach((id) => usedTrackers.add(id));
  });

  const orphanModules = moduleIds.filter((id) => !usedModules.has(id));
  const orphanTrackers = trackerIds.filter((id) => !usedTrackers.has(id));

  const invalidModuleRefs = [];
  const invalidTrackerRefs = [];
  cards.forEach((card) => {
    if (!card) return;
    (card.rewardModules || []).forEach((id) => {
      if (!modules[id]) invalidModuleRefs.push(`${card.id}:${id}`);
    });
    (card.trackers || []).forEach((id) => {
      if (!trackers[id]) invalidTrackerRefs.push(`${card.id}:${id}`);
    });
  });

  const invalidCategoryRefs = [];
  Object.entries(modules).forEach(([id, mod]) => {
    if (!Array.isArray(mod.match)) return;
    mod.match.forEach((catId) => {
      if (catId === "online") return;
      if (!categories[catId]) invalidCategoryRefs.push(`module:${id}:${catId}`);
    });
  });
  Object.entries(trackers).forEach(([id, tracker]) => {
    if (!Array.isArray(tracker.match)) return;
    tracker.match.forEach((catId) => {
      if (catId === "online") return;
      if (!categories[catId]) invalidCategoryRefs.push(`tracker:${id}:${catId}`);
    });
  });

  const invalidCampaignRefs = [];
  campaigns.forEach((campaign) => {
    if (!campaign || !Array.isArray(campaign.sections)) return;
    campaign.sections.forEach((sec, idx) => {
      if (!sec || !sec.capModule) return;
      if (!modules[sec.capModule]) {
        invalidCampaignRefs.push(`${campaign.id}.section${idx + 1}:${sec.capModule}`);
      }
    });
  });

  const usageKeyMap = new Map();
  const addUsageKey = (key, source) => {
    if (!key) return;
    if (!usageKeyMap.has(key)) usageKeyMap.set(key, new Set());
    usageKeyMap.get(key).add(source);
  };

  Object.entries(modules).forEach(([id, mod]) => {
    listUsageKeysFromModule(mod).forEach((key) => addUsageKey(key, `module:${id}`));
  });
  Object.entries(trackers).forEach(([id, tracker]) => {
    listUsageKeysFromTracker(tracker).forEach((key) => addUsageKey(key, `tracker:${id}`));
  });
  campaigns.forEach((campaign) => {
    listUsageKeysFromCampaign(campaign).forEach((key) => addUsageKey(key, `campaign:${campaign.id}`));
  });

  const duplicateUsageKeys = [];
  usageKeyMap.forEach((sources, key) => {
    if (sources.size > 1) {
      duplicateUsageKeys.push({ key, sources: Array.from(sources).sort() });
    }
  });

  const registryKeys = Object.keys(countersRegistry || {}).sort();

  const lines = [];
  lines.push(`# Data Quality Report`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(``);
  lines.push(`## Counts`);
  lines.push(`- Cards: ${cards.length}`);
  lines.push(`- Modules: ${moduleIds.length}`);
  lines.push(`- Trackers: ${trackerIds.length}`);
  lines.push(`- Campaigns: ${campaignIds.length}`);
  lines.push(`- Categories: ${categoryIds.length}`);
  lines.push(`- Counters Registry Keys: ${registryKeys.length}`);
  lines.push(``);

  lines.push(`## Orphan IDs`);
  lines.push(`- Unused modules (${orphanModules.length})`);
  if (orphanModules.length) lines.push(`  ${orphanModules.join(", ")}`);
  lines.push(`- Unused trackers (${orphanTrackers.length})`);
  if (orphanTrackers.length) lines.push(`  ${orphanTrackers.join(", ")}`);
  lines.push(``);

  lines.push(`## Invalid References`);
  lines.push(`- Card -> modules (${invalidModuleRefs.length})`);
  if (invalidModuleRefs.length) lines.push(`  ${invalidModuleRefs.join(", ")}`);
  lines.push(`- Card -> trackers (${invalidTrackerRefs.length})`);
  if (invalidTrackerRefs.length) lines.push(`  ${invalidTrackerRefs.join(", ")}`);
  lines.push(`- Modules/Trackers -> categories (${invalidCategoryRefs.length})`);
  if (invalidCategoryRefs.length) lines.push(`  ${invalidCategoryRefs.join(", ")}`);
  lines.push(`- Campaign sections -> capModule (${invalidCampaignRefs.length})`);
  if (invalidCampaignRefs.length) lines.push(`  ${invalidCampaignRefs.join(", ")}`);
  lines.push(``);

  lines.push(`## Duplicate Usage Keys (Potential Collisions)`);
  if (duplicateUsageKeys.length === 0) {
    lines.push(`- None`);
  } else {
    duplicateUsageKeys.forEach((entry) => {
      lines.push(`- ${entry.key}: ${entry.sources.join(", ")}`);
    });
  }
  lines.push(``);

  lines.push(`## Campaign Registry Keys`);
  if (Object.keys(campaignRegistry).length === 0) {
    lines.push(`- None`);
  } else {
    Object.keys(campaignRegistry).sort().forEach((key) => {
      lines.push(`- ${key}`);
    });
  }
  lines.push(``);

  lines.push(`## Counters Registry Keys`);
  if (registryKeys.length === 0) {
    lines.push(`- None`);
  } else {
    registryKeys.forEach((key) => lines.push(`- ${key}`));
  }
  lines.push(``);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, lines.join("\n"));
  console.log(`Report written to ${OUT_PATH}`);
}

main();
