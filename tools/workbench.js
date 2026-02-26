#!/usr/bin/env node
"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawnSync } = require("child_process");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_EXPORT_PATH = path.resolve(ROOT, "tools", "workbench_db.json");
const DEFAULT_AUDIT_PATH = path.resolve(ROOT, "reports", "workbench_audit.md");
const DEFAULT_HTML_PATH = path.resolve(ROOT, "reports", "workbench.html");
const DEFAULT_CORE_OVERRIDES_PATH = path.resolve(ROOT, "js", "data_overrides.js");
const HISTORY_DIR = path.resolve(ROOT, "tools", "overrides_history");
const MAX_HISTORY_VERSIONS = 20;

const DATA_SCRIPT_ORDER = [
  "js/data_cards.js",
  "js/data_categories.js",
  "js/data_modules.js",
  "js/data_trackers.js",
  "js/data_conversions.js",
  "js/data_rules.js",
  "js/data_campaigns.js",
  "js/data_counters.js",
  "js/period_policy.js",
  "js/data_overrides.js",
  "js/data_index.js"
];

const { ALLOWED_FIELDS } = require("./lib/allowed_fields");

// ── Version history helpers ──────────────────────────────────────────────────

function backupOverrides(overridesPath) {
  if (!fs.existsSync(overridesPath)) return null;
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
  const content = fs.readFileSync(overridesPath, "utf8");
  // Determine version from existing overrides
  let version = 1;
  try {
    const m = content.match(/"version"\s*:\s*(\d+)/);
    if (m) version = parseInt(m[1], 10);
  } catch (_) {}
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupName = `v${version}_${ts}.js`;
  const backupPath = path.resolve(HISTORY_DIR, backupName);
  fs.writeFileSync(backupPath, content, "utf8");
  // Prune old backups beyond MAX_HISTORY_VERSIONS
  const files = fs.readdirSync(HISTORY_DIR)
    .filter((f) => f.endsWith(".js"))
    .sort()
    .reverse();
  if (files.length > MAX_HISTORY_VERSIONS) {
    files.slice(MAX_HISTORY_VERSIONS).forEach((f) => {
      try { fs.unlinkSync(path.resolve(HISTORY_DIR, f)); } catch (_) {}
    });
  }
  return backupPath;
}

function listHistory() {
  if (!fs.existsSync(HISTORY_DIR)) return [];
  return fs.readdirSync(HISTORY_DIR)
    .filter((f) => f.endsWith(".js"))
    .sort()
    .reverse();
}

function rollbackOverrides(versionStr, overridesPath) {
  const files = listHistory();
  const target = files.find((f) => f.startsWith(`v${versionStr}_`) || f === versionStr);
  if (!target) {
    console.error(`Version not found: ${versionStr}`);
    console.log("Available versions:");
    files.forEach((f) => console.log(`  ${f}`));
    process.exit(1);
  }
  const src = path.resolve(HISTORY_DIR, target);
  const content = fs.readFileSync(src, "utf8");
  // Backup current before rollback
  backupOverrides(overridesPath);
  fs.writeFileSync(overridesPath, content, "utf8");
  return target;
}

// ── Cap conflict detection ──────────────────────────────────────────────────

function detectCapConflicts(modules) {
  const capKeyMap = {};
  const conflicts = [];
  Object.keys(modules).forEach((id) => {
    const mod = modules[id];
    if (!mod || !mod.cap_key) return;
    const key = mod.cap_key;
    const mode = mod.cap_mode || "spending";
    if (!capKeyMap[key]) capKeyMap[key] = [];
    capKeyMap[key].push({ moduleId: id, cap_mode: mode });
  });
  Object.keys(capKeyMap).forEach((key) => {
    const entries = capKeyMap[key];
    if (entries.length < 2) return;
    const modes = new Set(entries.map((e) => e.cap_mode));
    if (modes.size > 1) {
      conflicts.push({
        type: "cap_mode_mismatch",
        severity: "error",
        capKey: key,
        modules: entries,
        message: `cap_key "${key}" has mixed cap_modes: ${entries.map((e) => `${e.moduleId}(${e.cap_mode})`).join(", ")}`
      });
    }
  });
  return conflicts;
}

function detectPromoOverlaps(cards, modules) {
  const overlaps = [];
  const cardModuleMap = {};
  (Array.isArray(cards) ? cards : []).forEach((card) => {
    if (!card || !card.id) return;
    cardModuleMap[card.id] = Array.isArray(card.rewardModules) ? card.rewardModules : [];
  });

  // Known intentional overlap patterns (weekday/holiday, pre-cap/post-cap, tier pairs)
  const isIntentionalPair = (idA, idB) => {
    const pair = [idA, idB].sort();
    const joined = pair.join("|");
    // weekday vs holiday pattern
    if (/weekday/.test(pair[0]) && /holiday/.test(pair[1])) return "weekday_holiday";
    if (/weekday/.test(pair[1]) && /holiday/.test(pair[0])) return "weekday_holiday";
    // precap vs postcap pattern
    if (/precap/.test(pair[0]) && /postcap/.test(pair[1])) return "precap_postcap";
    if (/precap/.test(pair[1]) && /postcap/.test(pair[0])) return "precap_postcap";
    // tier1 vs tier2 pattern
    if (/tier1/.test(pair[0]) && /tier2/.test(pair[1])) return "tier_pair";
    // Same base module with different category suffixes (e.g., _dining vs _fx)
    const baseA = idA.replace(/_(dining|fx|travel|online|overseas|selected|transport|bonus).*$/, "");
    const baseB = idB.replace(/_(dining|fx|travel|online|overseas|selected|transport|bonus).*$/, "");
    if (baseA === baseB && idA !== idB) return "same_base_different_aspect";
    // Stacking patterns: bonus module stacks with base (mode=add)
    const modA = modules[idA] || {};
    const modB = modules[idB] || {};
    if ((modA.mode === "add" || modB.mode === "add") && (modA.mode !== modB.mode)) return "stacking";
    return null;
  };

  Object.keys(cardModuleMap).forEach((cardId) => {
    const moduleIds = cardModuleMap[cardId];
    const promos = [];
    moduleIds.forEach((mid) => {
      const mod = modules[mid];
      if (!mod) return;
      const from = mod.valid_from || mod.promo_start;
      const to = mod.valid_to || mod.promo_end;
      if (!from || !to) return;
      promos.push({ moduleId: mid, from, to, match: mod.match || [] });
    });
    // Check pairwise overlaps for same-category modules
    for (let i = 0; i < promos.length; i++) {
      for (let j = i + 1; j < promos.length; j++) {
        const a = promos[i];
        const b = promos[j];
        // Check if they target the same category
        const aSet = new Set(a.match);
        const bSet = new Set(b.match);
        const sharedCats = [...aSet].filter((c) => bSet.has(c));
        if (sharedCats.length === 0) continue;
        // Check date overlap
        if (a.from <= b.to && b.from <= a.to) {
          const pattern = isIntentionalPair(a.moduleId, b.moduleId);
          overlaps.push({
            type: "promo_overlap",
            severity: pattern ? "info" : "warning",
            intentional: !!pattern,
            pattern: pattern || "",
            cardId,
            moduleA: a.moduleId,
            moduleB: b.moduleId,
            categories: sharedCats,
            dateA: `${a.from}~${a.to}`,
            dateB: `${b.from}~${b.to}`,
            message: `${cardId}: modules ${a.moduleId} and ${b.moduleId} overlap on [${sharedCats.join(",")}] (${a.from}~${a.to} vs ${b.from}~${b.to})`
          });
        }
      }
    }
  });
  return overlaps;
}

function detectOrphanMissionKeys(modules, trackers) {
  const issues = [];
  const trackerCounterKeys = new Set();
  const trackerKeyWriters = {}; // key → [tracker ids]
  Object.entries(trackers || {}).forEach(([tid, t]) => {
    if (!t) return;
    if (t.counter && t.counter.key) {
      trackerCounterKeys.add(t.counter.key);
      if (!trackerKeyWriters[t.counter.key]) trackerKeyWriters[t.counter.key] = [];
      trackerKeyWriters[t.counter.key].push(tid);
    }
    if (t.req_mission_key) trackerCounterKeys.add(t.req_mission_key);
    (t.effects_on_eligible || []).forEach((eff) => {
      if (eff && eff.key) {
        trackerCounterKeys.add(eff.key);
        if (!trackerKeyWriters[eff.key]) trackerKeyWriters[eff.key] = [];
        trackerKeyWriters[eff.key].push(tid);
      }
    });
    (t.effects_on_match || []).forEach((eff) => {
      if (eff && eff.key) {
        trackerCounterKeys.add(eff.key);
        if (!trackerKeyWriters[eff.key]) trackerKeyWriters[eff.key] = [];
        trackerKeyWriters[eff.key].push(tid);
      }
    });
  });

  // Check for modules that use counter (self-tracking pattern)
  const moduleCounterKeys = new Set();
  Object.entries(modules || {}).forEach(([mid, mod]) => {
    if (mod && mod.counter && mod.counter.key) {
      moduleCounterKeys.add(mod.counter.key);
    }
  });

  // Group by mission key for explanation
  const keyToModules = {};
  Object.keys(modules || {}).forEach((id) => {
    const mod = modules[id];
    if (!mod || !mod.req_mission_key) return;
    const key = mod.req_mission_key;
    if (!keyToModules[key]) keyToModules[key] = [];
    keyToModules[key].push(id);
  });

  Object.keys(modules || {}).forEach((id) => {
    const mod = modules[id];
    if (!mod || !mod.req_mission_key) return;
    const key = mod.req_mission_key;
    if (!trackerCounterKeys.has(key)) {
      // Determine if the key is written by module counters or by app.js direct increment
      const hasModuleCounter = moduleCounterKeys.has(key);
      const relatedModules = (keyToModules[key] || []).filter((mid) => mid !== id);
      issues.push({
        type: "orphan_mission_key",
        severity: hasModuleCounter ? "info" : "warning",
        moduleId: id,
        key,
        hasModuleCounter,
        relatedModules,
        message: `module ${id}: req_mission_key "${key}" not written by any tracker`
      });
    }
  });
  return issues;
}

// ── Usage key map builder ───────────────────────────────────────────────────

function buildUsageKeyMap(modules, trackers, campaigns) {
  const keyMap = {};
  const ensure = (key) => {
    if (!keyMap[key]) keyMap[key] = { key, capModules: [], missionModules: [], trackerWriters: [], campaignDisplays: [], intentional: false };
    return keyMap[key];
  };
  Object.keys(modules || {}).forEach((id) => {
    const mod = modules[id];
    if (!mod) return;
    if (mod.cap_key) ensure(mod.cap_key).capModules.push(id);
    if (mod.secondary_cap_key) ensure(mod.secondary_cap_key).capModules.push(id);
    if (mod.req_mission_key) ensure(mod.req_mission_key).missionModules.push(id);
    if (mod.usage_key) ensure(mod.usage_key).capModules.push(id);
  });
  Object.keys(trackers || {}).forEach((id) => {
    const t = trackers[id];
    if (!t) return;
    if (t.counter && t.counter.key) ensure(t.counter.key).trackerWriters.push(id);
    (t.effects_on_eligible || []).forEach((eff) => {
      if (eff && eff.key) ensure(eff.key).trackerWriters.push(id);
    });
    (t.effects_on_match || []).forEach((eff) => {
      if (eff && eff.key) ensure(eff.key).trackerWriters.push(id);
    });
  });
  (Array.isArray(campaigns) ? campaigns : []).forEach((campaign) => {
    if (!campaign || !campaign.id) return;
    (campaign.sections || []).forEach((sec) => {
      if (sec.usageKey) ensure(sec.usageKey).campaignDisplays.push(campaign.id);
      if (sec.unlockKey) ensure(sec.unlockKey).campaignDisplays.push(campaign.id);
      (sec.usageKeys || []).forEach((k) => { if (k) ensure(k).campaignDisplays.push(campaign.id); });
    });
    (campaign.capKeys || []).forEach((k) => { if (k) ensure(k).campaignDisplays.push(campaign.id); });
  });
  // Mark intentional duplicates (key used by both cap and mission for coordinated tracking)
  Object.values(keyMap).forEach((entry) => {
    const totalRefs = entry.capModules.length + entry.missionModules.length + entry.trackerWriters.length;
    if (totalRefs > 1) {
      entry.intentional = entry.capModules.length > 0 && entry.missionModules.length > 0;
    }
  });
  return keyMap;
}

// ── Relationship graph builder ──────────────────────────────────────────────

function buildRelationshipGraph(data, rel) {
  const cards = Array.isArray(data.cards) ? data.cards : [];
  const modules = data.modules || {};
  const trackers = data.trackers || {};
  const campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
  const today = new Date().toISOString().slice(0, 10);

  const getModuleStatus = (mod) => {
    if (!mod) return "missing";
    if (mod.valid_to && mod.valid_to < today) return "expired";
    if (mod.promo_end && mod.promo_end < today) return "expired";
    if (mod.valid_from && mod.valid_from > today) return "upcoming";
    return "active";
  };

  const graph = cards.filter((c) => c && c.id).map((card) => {
    const moduleNodes = (card.rewardModules || []).map((mid) => {
      const mod = modules[mid] || {};
      const status = getModuleStatus(mod);
      const caps = [];
      if (mod.cap_key) caps.push({ key: mod.cap_key, mode: mod.cap_mode || "spending", limit: mod.cap_limit });
      if (mod.secondary_cap_key) caps.push({ key: mod.secondary_cap_key, mode: mod.cap_mode || "spending", limit: mod.secondary_cap_limit });
      return {
        id: mid,
        desc: mod.desc || "",
        type: mod.type || "",
        rate: mod.rate || mod.rate_per_x || null,
        mode: mod.mode || "",
        status,
        caps,
        missionKey: mod.req_mission_key || "",
        missionSpend: mod.req_mission_spend || 0,
        validFrom: mod.valid_from || "",
        validTo: mod.valid_to || mod.promo_end || "",
        campaignSections: rel.moduleToCampaignSections[mid] || []
      };
    });

    const trackerNodes = (card.trackers || []).map((tid) => {
      const t = trackers[tid] || {};
      return {
        id: tid,
        desc: t.desc || "",
        counterKey: (t.counter && t.counter.key) || "",
        missionKey: t.req_mission_key || "",
        status: getModuleStatus(t)
      };
    });

    const relatedCampaigns = campaigns
      .filter((c) => c && c.cards && c.cards.includes(card.id))
      .map((c) => ({ id: c.id, name: c.name || "" }));

    return {
      id: card.id,
      name: card.name || "",
      bank: card.bank || "",
      modules: moduleNodes,
      trackers: trackerNodes,
      campaigns: relatedCampaigns
    };
  });

  return graph;
}

function printUsage() {
  console.log(`Usage:
  node tools/workbench.js audit [--out <path>]
  node tools/workbench.js export [--out <path>] [--audit-out <path>]
  node tools/workbench.js html [--out <path>]
  node tools/workbench.js apply --edits <path|-> [--out <path>] [--dry-run]
  node tools/workbench.js serve [--port <number>] [--host <host>]
  node tools/workbench.js history
  node tools/workbench.js rollback <version>
  node tools/workbench.js verify-allowlists
`);
}

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const key = arg;
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    i += 1;
  }
  return { positional, flags };
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function stableObject(input) {
  if (Array.isArray(input)) return input.map(stableObject);
  if (input && typeof input === "object") {
    const out = {};
    Object.keys(input).sort().forEach((k) => {
      out[k] = stableObject(input[k]);
    });
    return out;
  }
  return input;
}

function normalizeForExport(input) {
  if (typeof input === "function") return "[Function]";
  if (Array.isArray(input)) return input.map(normalizeForExport);
  if (input && typeof input === "object") {
    const out = {};
    Object.keys(input).sort().forEach((k) => {
      out[k] = normalizeForExport(input[k]);
    });
    return out;
  }
  return input;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonInput(pathOrDash) {
  if (pathOrDash === "-") {
    const raw = fs.readFileSync(0, "utf8");
    return JSON.parse(raw || "{}");
  }
  return readJson(pathOrDash);
}

function writeJson(filePath, value) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function runScriptInContext(ctx, absPath) {
  const code = fs.readFileSync(absPath, "utf8");
  vm.runInContext(code, ctx, { filename: absPath });
}

function loadData(repoRoot) {
  const ctx = {
    console,
    window: null,
    global: null
  };
  ctx.window = ctx;
  ctx.global = ctx;
  vm.createContext(ctx);

  DATA_SCRIPT_ORDER.forEach((rel) => runScriptInContext(ctx, path.resolve(repoRoot, rel)));
  return ctx.DATA || {};
}

function loadCoreOverrides(repoRoot, overridesPath) {
  const absPath = path.resolve(repoRoot, overridesPath);
  if (!fs.existsSync(absPath)) {
    return { version: 1, cards: {}, categories: {}, modules: {}, trackers: {}, campaigns: {} };
  }

  const ctx = { console, window: null, global: null, globalThis: null };
  ctx.window = ctx;
  ctx.global = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  runScriptInContext(ctx, absPath);
  // data_overrides.js declares `const CORE_OVERRIDES = ...`,
  // which is a lexical binding and not always exposed as a context property.
  // Read it explicitly from the same VM global lexical scope.
  let loaded = ctx.CORE_OVERRIDES;
  if (!loaded) {
    try {
      loaded = vm.runInContext(
        "(typeof CORE_OVERRIDES !== 'undefined') ? CORE_OVERRIDES : undefined",
        ctx
      );
    } catch (_) {
      loaded = undefined;
    }
  }
  loaded = loaded || {};
  return {
    version: 1,
    cards: loaded.cards && typeof loaded.cards === "object" ? loaded.cards : {},
    categories: loaded.categories && typeof loaded.categories === "object" ? loaded.categories : {},
    modules: loaded.modules && typeof loaded.modules === "object" ? loaded.modules : {},
    trackers: loaded.trackers && typeof loaded.trackers === "object" ? loaded.trackers : {},
    campaigns: loaded.campaigns && typeof loaded.campaigns === "object" ? loaded.campaigns : {},
    campaignRegistry: loaded.campaignRegistry && typeof loaded.campaignRegistry === "object" ? loaded.campaignRegistry : {}
  };
}

function getSectionModuleRefs(section) {
  if (!section || typeof section !== "object") return [];
  const refs = [];
  [
    "capModule",
    "rateModule",
    "missionModule",
    "unlockModule"
  ].forEach((key) => {
    const id = section[key];
    if (typeof id === "string" && id) refs.push(id);
  });
  ["missionModules", "unlockModules"].forEach((key) => {
    const list = section[key];
    if (!Array.isArray(list)) return;
    list.forEach((id) => {
      if (typeof id === "string" && id) refs.push(id);
    });
  });
  return Array.from(new Set(refs));
}

function getSectionCapLimit(section, modules) {
  if (!section || typeof section !== "object") return null;
  const sectionCap = Number(section.cap);
  if (Number.isFinite(sectionCap) && sectionCap > 0) return sectionCap;
  if (section.capModule && modules && modules[section.capModule]) {
    const moduleCap = Number(modules[section.capModule].cap_limit);
    if (Number.isFinite(moduleCap) && moduleCap > 0) return moduleCap;
  }
  return null;
}

function inferCampaignPromoType(campaign, modules) {
  const sections = Array.isArray(campaign && campaign.sections) ? campaign.sections : [];
  let missionCount = 0;
  let capCount = 0;
  let capRateCount = 0;
  let tierCount = 0;
  let uncappedCapLikeCount = 0;

  sections.forEach((sec) => {
    if (!sec || typeof sec !== "object") return;
    if (sec.type === "mission") missionCount += 1;
    if (sec.type === "cap") {
      capCount += 1;
      if (getSectionCapLimit(sec, modules) === null) uncappedCapLikeCount += 1;
    }
    if (sec.type === "cap_rate") {
      capRateCount += 1;
      if (getSectionCapLimit(sec, modules) === null) uncappedCapLikeCount += 1;
    }
    if (sec.type === "tier_cap") tierCount += 1;
  });

  if (tierCount > 0) return "tiered_cap";
  if (missionCount > 0 && capRateCount > 0) {
    if ((capCount + capRateCount) === uncappedCapLikeCount) return "mission_uncapped";
    return "mission_cap_rate";
  }
  if (missionCount > 0 && (capCount + capRateCount) > 0) {
    if ((capCount + capRateCount) === uncappedCapLikeCount) return "mission_uncapped";
    if ((capCount + capRateCount) > 1) return "mission_multi_cap";
    return "mission_cap";
  }
  if (missionCount > 0 && sections.length === 1) return "mission_only";
  return "custom";
}

function buildRelationships(data) {
  const cards = Array.isArray(data.cards) ? data.cards : [];
  const campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
  const modules = data.modules && typeof data.modules === "object" ? data.modules : {};
  const trackers = data.trackers && typeof data.trackers === "object" ? data.trackers : {};

  const moduleToCards = {};
  const trackerToCards = {};
  cards.forEach((card) => {
    if (!card || !card.id) return;
    (Array.isArray(card.rewardModules) ? card.rewardModules : []).forEach((moduleId) => {
      if (!moduleToCards[moduleId]) moduleToCards[moduleId] = [];
      moduleToCards[moduleId].push(card.id);
    });
    (Array.isArray(card.trackers) ? card.trackers : []).forEach((trackerId) => {
      if (!trackerToCards[trackerId]) trackerToCards[trackerId] = [];
      trackerToCards[trackerId].push(card.id);
    });
  });
  Object.keys(moduleToCards).forEach((id) => moduleToCards[id].sort());
  Object.keys(trackerToCards).forEach((id) => trackerToCards[id].sort());

  const moduleToCampaignSections = {};
  campaigns.forEach((campaign) => {
    if (!campaign || !campaign.id) return;
    (Array.isArray(campaign.sections) ? campaign.sections : []).forEach((section, idx) => {
      getSectionModuleRefs(section).forEach((moduleId) => {
        if (!moduleToCampaignSections[moduleId]) moduleToCampaignSections[moduleId] = [];
        moduleToCampaignSections[moduleId].push(`${campaign.id}#${idx + 1}`);
      });
    });
  });
  Object.keys(moduleToCampaignSections).forEach((id) => moduleToCampaignSections[id].sort());

  const knownUsageKeys = new Set();
  Object.values(modules).forEach((mod) => {
    if (!mod || typeof mod !== "object") return;
    ["cap_key", "secondary_cap_key", "usage_key", "req_mission_key"].forEach((key) => {
      if (mod[key]) knownUsageKeys.add(mod[key]);
    });
  });
  Object.values(trackers).forEach((tracker) => {
    if (!tracker || typeof tracker !== "object") return;
    if (tracker.req_mission_key) knownUsageKeys.add(tracker.req_mission_key);
    if (tracker.counter && tracker.counter.key) knownUsageKeys.add(tracker.counter.key);
  });

  return { moduleToCards, trackerToCards, moduleToCampaignSections, knownUsageKeys };
}

function buildAudit(data, rel) {
  const cards = Array.isArray(data.cards) ? data.cards : [];
  const campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
  const offers = Array.isArray(data.offers) ? data.offers : [];
  const modules = data.modules && typeof data.modules === "object" ? data.modules : {};
  const trackers = data.trackers && typeof data.trackers === "object" ? data.trackers : {};
  const specialPromoModels = (data.specialPromoModels && typeof data.specialPromoModels === "object")
    ? data.specialPromoModels
    : {};

  const moduleIds = Object.keys(modules).sort();
  const trackerIds = Object.keys(trackers).sort();
  const orphanModules = moduleIds.filter((id) => !rel.moduleToCards[id] || rel.moduleToCards[id].length === 0);
  const orphanTrackers = trackerIds.filter((id) => !rel.trackerToCards[id] || rel.trackerToCards[id].length === 0);

  const sectionMissingRefs = [];
  const sectionDrift = [];
  const promoTypeIssues = [];
  const specialPromoIssues = [];
  const allowedPromoTypes = new Set([
    "mission_cap",
    "mission_cap_rate",
    "mission_multi_cap",
    "tiered_cap",
    "mission_uncapped",
    "mission_only",
    "level_lifecycle",
    "custom"
  ]);
  campaigns.forEach((campaign) => {
    if (campaign && campaign.id) {
      const declaredType = (typeof campaign.promo_type === "string" && campaign.promo_type.trim())
        ? campaign.promo_type.trim()
        : "";
      const inferredType = inferCampaignPromoType(campaign, modules);
      if (!declaredType) {
        promoTypeIssues.push({
          campaignId: campaign.id,
          issue: "missing",
          declared: "",
          inferred: inferredType,
          suggestedFix: inferredType,
          message: `${campaign.id}: missing promo_type (inferred=${inferredType})`
        });
      } else if (!allowedPromoTypes.has(declaredType)) {
        // Map unsupported types to their best fix
        let suggestedFix = "custom";
        if (declaredType === "cap") suggestedFix = "custom";
        else if (declaredType === "multi_cap") suggestedFix = inferredType;
        promoTypeIssues.push({
          campaignId: campaign.id,
          issue: "unsupported",
          declared: declaredType,
          inferred: inferredType,
          suggestedFix,
          message: `${campaign.id}: unsupported promo_type=${declaredType}`
        });
      } else if (declaredType !== inferredType && declaredType !== "custom") {
        promoTypeIssues.push({
          campaignId: campaign.id,
          issue: "mismatch",
          declared: declaredType,
          inferred: inferredType,
          suggestedFix: inferredType,
          message: `${campaign.id}: promo_type=${declaredType} but inferred=${inferredType}`
        });
      }
    }

    (Array.isArray(campaign.sections) ? campaign.sections : []).forEach((section, idx) => {
      const sectionId = `${campaign.id}#${idx + 1}`;
      getSectionModuleRefs(section).forEach((moduleId) => {
        if (!modules[moduleId]) {
          sectionMissingRefs.push(`${sectionId}: missing module ${moduleId}`);
        }
      });

      if (section.type === "mission") {
        const refs = [];
        if (typeof section.missionModule === "string" && section.missionModule) refs.push(section.missionModule);
        if (Array.isArray(section.missionModules)) refs.push(...section.missionModules.filter(Boolean));
        if (refs.length > 0) {
          const keys = Array.from(new Set(refs.map((id) => modules[id] && modules[id].req_mission_key).filter(Boolean)));
          const targets = Array.from(new Set(refs.map((id) => Number(modules[id] && modules[id].req_mission_spend)).filter((n) => Number.isFinite(n))));
          if (section.usageKey && keys.length === 1 && section.usageKey !== keys[0]) {
            sectionDrift.push(`${sectionId}: mission usageKey=${section.usageKey} vs module req_mission_key=${keys[0]}`);
          }
          if (typeof section.target === "number" && targets.length === 1 && Number(section.target) !== Number(targets[0])) {
            sectionDrift.push(`${sectionId}: mission target=${section.target} vs module req_mission_spend=${targets[0]}`);
          }
        }
      }

      if (section.type === "cap" || section.type === "cap_rate") {
        const refs = [];
        if (typeof section.unlockModule === "string" && section.unlockModule) refs.push(section.unlockModule);
        if (Array.isArray(section.unlockModules)) refs.push(...section.unlockModules.filter(Boolean));
        if (refs.length > 0) {
          const keys = Array.from(new Set(refs.map((id) => modules[id] && modules[id].req_mission_key).filter(Boolean)));
          const targets = Array.from(new Set(refs.map((id) => Number(modules[id] && modules[id].req_mission_spend)).filter((n) => Number.isFinite(n))));
          if (section.unlockKey && keys.length === 1 && section.unlockKey !== keys[0]) {
            sectionDrift.push(`${sectionId}: unlockKey=${section.unlockKey} vs module req_mission_key=${keys[0]}`);
          }
          if (typeof section.unlockTarget === "number" && targets.length === 1 && Number(section.unlockTarget) !== Number(targets[0])) {
            sectionDrift.push(`${sectionId}: unlockTarget=${section.unlockTarget} vs module req_mission_spend=${targets[0]}`);
          }
        }
      }
    });
  });

  Object.keys(specialPromoModels).forEach((modelId) => {
    const model = specialPromoModels[modelId] || {};
    const type = (typeof model.promo_type === "string" && model.promo_type.trim()) ? model.promo_type.trim() : "";
    if (!type) specialPromoIssues.push(`${modelId}: missing promo_type`);
    if (type === "level_lifecycle") {
      if (!model.module || !modules[model.module]) {
        specialPromoIssues.push(`${modelId}: missing module ${model.module || ""}`.trim());
      } else if (modules[model.module].type !== "guru_capped") {
        specialPromoIssues.push(`${modelId}: module ${model.module} is not guru_capped`);
      }
    }
  });

  // Extended conflict detection
  const capConflicts = detectCapConflicts(modules);
  const promoOverlaps = detectPromoOverlaps(cards, modules);
  const orphanMissionKeys = detectOrphanMissionKeys(modules, trackers);

  return {
    counts: {
      cards: cards.length,
      modules: moduleIds.length,
      trackers: trackerIds.length,
      offers: offers.length,
      campaigns: campaigns.length,
      specialPromoModels: Object.keys(specialPromoModels).length,
      categories: Object.keys(data.categories || {}).length
    },
    orphanModules,
    orphanTrackers,
    sectionMissingRefs: sectionMissingRefs.sort(),
    sectionDrift: sectionDrift.sort(),
    promoTypeIssues: promoTypeIssues.sort((a, b) => (a.campaignId || "").localeCompare(b.campaignId || "")),
    specialPromoIssues: specialPromoIssues.sort(),
    capConflicts,
    promoOverlaps,
    orphanMissionKeys
  };
}

function writeAuditReport(audit, outPath) {
  const lines = [];
  lines.push("# Workbench Audit");
  lines.push("");
  lines.push("## Counts");
  lines.push(`- Cards: ${audit.counts.cards}`);
  lines.push(`- Modules: ${audit.counts.modules}`);
  lines.push(`- Trackers: ${audit.counts.trackers}`);
  lines.push(`- Offers: ${audit.counts.offers || 0}`);
  lines.push(`- Campaigns: ${audit.counts.campaigns}`);
  lines.push(`- Special Promo Models: ${audit.counts.specialPromoModels}`);
  lines.push(`- Categories: ${audit.counts.categories}`);
  lines.push("");
  lines.push("## Orphans");
  lines.push(`- Unused modules (${audit.orphanModules.length})`);
  if (audit.orphanModules.length > 0) lines.push(`  ${audit.orphanModules.join(", ")}`);
  lines.push(`- Unused trackers (${audit.orphanTrackers.length})`);
  if (audit.orphanTrackers.length > 0) lines.push(`  ${audit.orphanTrackers.join(", ")}`);
  lines.push("");
  lines.push("## Campaign Binding Issues");
  lines.push(`- Missing module refs (${audit.sectionMissingRefs.length})`);
  if (audit.sectionMissingRefs.length > 0) audit.sectionMissingRefs.forEach((m) => lines.push(`  ${m}`));
  lines.push(`- Section drift vs module mission/unlock fields (${audit.sectionDrift.length})`);
  if (audit.sectionDrift.length > 0) audit.sectionDrift.forEach((m) => lines.push(`  ${m}`));
  lines.push(`- Promo type issues (${(audit.promoTypeIssues || []).length})`);
  if ((audit.promoTypeIssues || []).length > 0) audit.promoTypeIssues.forEach((m) => lines.push(`  ${typeof m === "string" ? m : m.message}`));
  lines.push(`- Special promo issues (${(audit.specialPromoIssues || []).length})`);
  if ((audit.specialPromoIssues || []).length > 0) audit.specialPromoIssues.forEach((m) => lines.push(`  ${m}`));
  lines.push("");
  lines.push("## Data Conflicts");
  lines.push(`- Cap mode mismatches (${(audit.capConflicts || []).length})`);
  if ((audit.capConflicts || []).length > 0) audit.capConflicts.forEach((c) => lines.push(`  ${c.message}`));
  lines.push(`- Promo date overlaps (${(audit.promoOverlaps || []).length})`);
  if ((audit.promoOverlaps || []).length > 0) audit.promoOverlaps.forEach((c) => lines.push(`  ${c.message}`));
  lines.push(`- Orphan mission keys (${(audit.orphanMissionKeys || []).length})`);
  if ((audit.orphanMissionKeys || []).length > 0) audit.orphanMissionKeys.forEach((c) => lines.push(`  ${c.message}`));
  lines.push("");

  ensureDir(outPath);
  fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
}

function buildExportPayload(data, rel, audit) {
  const campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
  const offers = Array.isArray(data.offers) ? data.offers : [];
  const cards = Array.isArray(data.cards) ? data.cards : [];
  const modules = data.modules && typeof data.modules === "object" ? data.modules : {};
  const trackers = data.trackers && typeof data.trackers === "object" ? data.trackers : {};
  const specialPromoModels = (data.specialPromoModels && typeof data.specialPromoModels === "object")
    ? data.specialPromoModels
    : {};

  const modulesOut = Object.keys(modules).sort().map((id) => {
    const mod = modules[id] || {};
    return {
      id,
      cards: rel.moduleToCards[id] || [],
      campaignSections: rel.moduleToCampaignSections[id] || [],
      data: normalizeForExport(mod)
    };
  });

  const trackersOut = Object.keys(trackers).sort().map((id) => ({
    id,
    cards: rel.trackerToCards[id] || [],
    data: normalizeForExport(trackers[id] || {})
  }));

  return stableObject({
    meta: {
      exported_at: new Date().toISOString(),
      source: "tools/workbench.js"
    },
    summary: audit,
    cards: normalizeForExport(cards),
    offers: normalizeForExport(offers),
    campaigns: normalizeForExport(campaigns),
    specialPromoModels: normalizeForExport(specialPromoModels),
    modules: modulesOut,
    trackers: trackersOut
  });
}

function buildHtmlPayload(data, rel, audit) {
  const cards = Array.isArray(data.cards) ? data.cards : [];
  const campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
  const offers = Array.isArray(data.offers) ? data.offers : [];
  const categories = data.categories && typeof data.categories === "object" ? data.categories : {};
  const modules = data.modules && typeof data.modules === "object" ? data.modules : {};
  const trackers = data.trackers && typeof data.trackers === "object" ? data.trackers : {};
  const specialPromoModels = (data.specialPromoModels && typeof data.specialPromoModels === "object")
    ? data.specialPromoModels
    : {};

  const moduleRows = Object.keys(modules).sort().map((id) => {
    const mod = modules[id] || {};
    const capLimit = mod.cap_limit;
    const capMode = mod.cap_mode || "";
    const mission = (mod.req_mission_key && Number.isFinite(Number(mod.req_mission_spend)))
      ? `${mod.req_mission_key} >= ${mod.req_mission_spend}`
      : (mod.req_mission_key || "");
    const reward = Number.isFinite(Number(mod.rate)) ? `rate=${mod.rate}` :
      (Number.isFinite(Number(mod.rate_per_x)) ? `rate_per_x=${mod.rate_per_x}` :
        (Number.isFinite(Number(mod.multiplier)) ? `multiplier=${mod.multiplier}` : ""));
    return {
      id,
      desc: mod.desc || "",
      reward,
      cap: (capLimit !== undefined && capLimit !== null) ? `${capMode || "spending"}:${capLimit}` : "",
      mission,
      cards: rel.moduleToCards[id] || [],
      campaignSections: rel.moduleToCampaignSections[id] || [],
      valid: [mod.valid_from || "", mod.valid_to || ""].filter(Boolean).join(" -> ")
    };
  });

  const sectionRows = [];
  campaigns.forEach((campaign) => {
    if (!campaign || !campaign.id) return;
    const declaredPromoType = (typeof campaign.promo_type === "string" && campaign.promo_type.trim())
      ? campaign.promo_type.trim()
      : "";
    const inferredPromoType = inferCampaignPromoType(campaign, modules);
    (Array.isArray(campaign.sections) ? campaign.sections : []).forEach((section, idx) => {
      const missionRefs = [];
      if (section.missionModule) missionRefs.push(section.missionModule);
      if (Array.isArray(section.missionModules)) missionRefs.push(...section.missionModules.filter(Boolean));
      const unlockRefs = [];
      if (section.unlockModule) unlockRefs.push(section.unlockModule);
      if (Array.isArray(section.unlockModules)) unlockRefs.push(...section.unlockModules.filter(Boolean));
      sectionRows.push({
        id: `${campaign.id}#${idx + 1}`,
        campaignId: campaign.id,
        campaignName: campaign.name || "",
        promoType: declaredPromoType,
        promoTypeInferred: inferredPromoType,
        type: section.type || "",
        label: section.label || "",
        missionRefs: Array.from(new Set(missionRefs)),
        unlockRefs: Array.from(new Set(unlockRefs)),
        capModule: section.capModule || "",
        rateModule: section.rateModule || "",
        usageKey: section.usageKey || "",
        usageKeys: Array.isArray(section.usageKeys) ? section.usageKeys : [],
        unlockKey: section.unlockKey || "",
        unlockTarget: section.unlockTarget || "",
        target: section.target || ""
      });
    });
  });

  const cardRows = cards
    .filter((card) => card && card.id)
    .map((card) => ({
      id: card.id,
      name: card.name || "",
      bank: card.bank || "",
      currency: card.currency || "",
      rewardModules: Array.isArray(card.rewardModules) ? card.rewardModules : [],
      trackers: Array.isArray(card.trackers) ? card.trackers : []
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const categoryRows = Object.keys(categories).sort().map((id) => {
    const c = categories[id] || {};
    return {
      id,
      label: c.label || "",
      parent: c.parent || "",
      hidden: !!c.hidden
    };
  });

  const campaignRows = campaigns
    .filter((campaign) => campaign && campaign.id)
    .map((campaign) => {
      const policy = campaign.period_policy && typeof campaign.period_policy === "object"
        ? campaign.period_policy
        : null;
      const policySummary = policy
        ? `${policy.mode || ""}${policy.period && policy.period.type ? `:${policy.period.type}` : ""}`
        : "";
      return {
        id: campaign.id,
        name: campaign.name || "",
        promoType: campaign.promo_type || "",
        theme: campaign.theme || "",
        cards: Array.isArray(campaign.cards) ? campaign.cards : [],
        sections: Array.isArray(campaign.sections) ? campaign.sections.length : 0,
        periodPolicy: policySummary
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const offerRows = offers
    .filter((offer) => offer && offer.id)
    .map((offer) => {
      const cardsList = Array.isArray(offer.cards) ? offer.cards : [];
      const moduleRefs = Array.isArray(offer.moduleRefs) ? offer.moduleRefs : [];
      let editBucket = "";
      let editId = "";
      if (offer.sourceType === "campaign") {
        editBucket = "campaigns";
        editId = offer.id;
      } else if (offer.sourceType === "module_rule") {
        editBucket = "modules";
        editId = offer.moduleId || (moduleRefs[0] || "");
      } else if (offer.sourceType === "special_model") {
        if (moduleRefs[0]) {
          editBucket = "modules";
          editId = moduleRefs[0];
        }
      }
      return {
        id: offer.id,
        sourceType: offer.sourceType || "",
        renderType: offer.renderType || "",
        offerType: offer.offerType || "",
        title: offer.title || offer.name || offer.id,
        settingKey: offer.settingKey || "",
        cards: cardsList,
        moduleRefs,
        sections: Array.isArray(offer.sections) ? offer.sections.length : 0,
        editBucket,
        editId
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const trackerRows = Object.keys(trackers).sort().map((id) => {
    const t = trackers[id] || {};
    return {
      id,
      desc: t.desc || "",
      reqMissionKey: t.req_mission_key || "",
      missionId: t.mission_id || "",
      cards: rel.trackerToCards[id] || [],
      match: Array.isArray(t.match) ? t.match : []
    };
  });

  const specialPromoRows = Object.keys(specialPromoModels).sort().map((id) => {
    const model = specialPromoModels[id] || {};
    const usage = model.usage || {};
    return {
      id,
      promoType: model.promo_type || "",
      module: model.module || "",
      spendKey: usage.spendKey || "",
      rewardKey: usage.rewardKey || "",
      cards: Array.isArray(model.cards) ? model.cards : [],
      levels: model.levels && typeof model.levels === "object" && !Array.isArray(model.levels)
        ? Object.keys(model.levels).sort().map((k) => `${k}:${(model.levels[k] && model.levels[k].targetSpend) || "-"} / ${(model.levels[k] && model.levels[k].rewardCap) || "-"}`)
        : []
    };
  });

  const campaignRegistryData = (data.campaignRegistry && typeof data.campaignRegistry === "object")
    ? data.campaignRegistry
    : {};

  const editableEntities = {
    cards: {},
    categories: {},
    modules: {},
    trackers: {},
    campaigns: {},
    campaignRegistry: {}
  };

  cards.forEach((card) => {
    if (!card || !card.id) return;
    editableEntities.cards[card.id] = normalizeForExport(card);
  });
  Object.keys(categories).forEach((id) => {
    editableEntities.categories[id] = normalizeForExport(categories[id]);
  });
  Object.keys(modules).forEach((id) => {
    editableEntities.modules[id] = normalizeForExport(modules[id]);
  });
  Object.keys(trackers).forEach((id) => {
    editableEntities.trackers[id] = normalizeForExport(trackers[id]);
  });
  campaigns.forEach((campaign) => {
    if (!campaign || !campaign.id) return;
    editableEntities.campaigns[campaign.id] = normalizeForExport(campaign);
  });
  Object.keys(campaignRegistryData).forEach((id) => {
    editableEntities.campaignRegistry[id] = normalizeForExport(campaignRegistryData[id]);
  });

  const allowedFields = {};
  Object.keys(ALLOWED_FIELDS).forEach((bucket) => {
    allowedFields[bucket] = Array.from(ALLOWED_FIELDS[bucket]).sort();
  });

  // Build relationship graph
  const relationshipGraph = buildRelationshipGraph(data, rel);

  // Build usage key map
  const usageKeyMap = buildUsageKeyMap(
    data.modules || {},
    data.trackers || {},
    Array.isArray(data.campaigns) ? data.campaigns : []
  );
  const usageKeyRows = Object.values(usageKeyMap).sort((a, b) => a.key.localeCompare(b.key));

  // Version history
  const historyFiles = listHistory();

  return stableObject({
    summary: audit,
    cards: cardRows,
    categories: categoryRows,
    offers: offerRows,
    trackers: trackerRows,
    relationshipGraph,
    usageKeyMap: usageKeyRows,
    historyFiles,
    editor: {
      allowedFields,
      entities: editableEntities
    }
  });
}

function buildHtmlReport(payload) {
  const safeJson = JSON.stringify(payload).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="zh-HK">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Workbench Report</title>
  <style>
    :root {
      --bg: #f7fafc;
      --panel: #ffffff;
      --ink: #1f2937;
      --muted: #6b7280;
      --line: #e5e7eb;
      --accent: #0f766e;
      --pill: #e6fffa;
      --shadow: 0 1px 2px rgba(0,0,0,0.06);
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--ink); font-family: "SF Pro Text", "PingFang TC", "Helvetica Neue", Arial, sans-serif; }
    .wrap { max-width: 1400px; margin: 24px auto; padding: 0 16px 32px; }
    .head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 16px; }
    .title { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 0.2px; }
    .sub { color: var(--muted); font-size: 13px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-bottom: 16px; }
    .card { background: var(--panel); border: 1px solid var(--line); box-shadow: var(--shadow); border-radius: 12px; padding: 10px 12px; }
    .k { color: var(--muted); font-size: 12px; margin-bottom: 6px; }
    .v { font-size: 22px; font-weight: 700; }
    .issues { margin-bottom: 16px; }
    .issues h2 { margin: 0 0 10px; font-size: 18px; font-weight: 700; }
    .audit-summary-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .audit-chip { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 4px 12px; font-size: 12px; font-weight: 500; border: 1px solid var(--line); background: var(--panel); }
    .audit-chip .chip-count { font-weight: 700; font-size: 14px; }
    .audit-chip.has-issues { border-color: #fecdd3; background: #fff1f2; color: #9f1239; }
    .audit-chip.all-ok { border-color: #a7f3d0; background: #dcfce7; color: #065f46; }
    .audit-group { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow); margin-bottom: 10px; overflow: hidden; }
    .audit-group-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; cursor: pointer; user-select: none; }
    .audit-group-header:hover { background: #f9fafb; }
    .audit-group-title { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .audit-group-title .group-icon { font-size: 16px; }
    .audit-group-count { font-size: 12px; color: var(--muted); }
    .audit-group-actions { display: flex; gap: 6px; align-items: center; }
    .audit-group-body { padding: 0 14px 12px; display: none; }
    .audit-group.open .audit-group-body { display: block; }
    .audit-group.open .audit-group-header .group-chevron { transform: rotate(90deg); }
    .group-chevron { transition: transform .15s; font-size: 10px; color: var(--muted); }
    .audit-explanation { font-size: 12px; color: #4b5563; background: #f9fafb; border: 1px solid var(--line); border-radius: 8px; padding: 8px 12px; margin-bottom: 10px; line-height: 1.5; }
    .audit-explanation code { background: #e5e7eb; padding: 1px 4px; border-radius: 3px; font-size: 11px; }
    .audit-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; gap: 8px; }
    .audit-item:last-child { border-bottom: none; }
    .audit-item-left { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-width: 0; }
    .audit-item-id { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace; font-weight: 500; white-space: nowrap; }
    .audit-item-detail { color: var(--muted); font-size: 11px; }
    .audit-item-right { flex-shrink: 0; }
    .audit-fix-btn { border: 1px solid #a7f3d0; background: #dcfce7; color: #065f46; border-radius: 6px; padding: 3px 8px; font-size: 11px; cursor: pointer; white-space: nowrap; }
    .audit-fix-btn:hover { background: #a7f3d0; }
    .audit-fix-btn.queued { border-color: #c4b5fd; background: #ede9fe; color: #5b21b6; cursor: default; }
    .audit-fix-all-btn { border: 1px solid #0f766e; background: #0f766e; color: white; border-radius: 8px; padding: 5px 12px; font-size: 12px; cursor: pointer; font-weight: 500; }
    .audit-fix-all-btn:hover { background: #0d6560; }
    .audit-fix-all-btn:disabled { opacity: .5; cursor: default; }
    .audit-subgroup { margin-bottom: 8px; }
    .audit-subgroup-title { font-size: 11px; text-transform: uppercase; color: var(--muted); letter-spacing: .3px; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 6px; }
    .audit-subgroup-title .subgroup-badge { font-size: 10px; padding: 1px 6px; border-radius: 4px; }
    /* Card Editor */
    .ce-card-meta { font-size: 13px; margin-bottom: 12px; color: var(--muted); }
    .ce-card-meta strong { color: var(--ink); }
    .ce-module { border: 1px solid var(--line); border-radius: 10px; padding: 12px; margin-bottom: 10px; background: #f9fafb; }
    .ce-module.ce-expired { opacity: .6; border-color: #d1d5db; }
    .ce-module-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .ce-module-title { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
    .ce-module-id { font-size: 11px; color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace; }
    .ce-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
    .ce-dot-active { background: #059669; }
    .ce-dot-expired { background: #9ca3af; }
    .ce-dot-upcoming { background: #f59e0b; }
    .ce-fields { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 6px 12px; }
    .ce-field { display: flex; flex-direction: column; gap: 2px; }
    .ce-field-label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .2px; font-weight: 500; }
    .ce-field-value { font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 4px; }
    .ce-field-value .ce-editable { cursor: pointer; border-bottom: 1px dashed #94a3b8; padding-bottom: 1px; }
    .ce-field-value .ce-editable:hover { border-color: var(--accent); color: var(--accent); }
    .ce-field-input { border: 1px solid var(--accent); border-radius: 6px; padding: 4px 6px; font-size: 12px; width: 100%; max-width: 160px; font-family: inherit; }
    .ce-field-input:focus { outline: none; box-shadow: 0 0 0 2px rgba(15,118,110,0.15); }
    .ce-cats { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px; }
    .ce-cat { font-size: 10px; background: var(--pill); color: var(--accent); border: 1px solid #99f6e4; border-radius: 999px; padding: 1px 6px; }
    .ce-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--line); }
    .ce-action { border: 1px solid var(--line); background: #fff; border-radius: 6px; padding: 4px 8px; font-size: 11px; cursor: pointer; }
    .ce-action:hover { border-color: var(--accent); background: #f0fdfa; }
    .ce-action.ce-warn { border-color: #fecdd3; background: #fff1f2; color: #9f1239; }
    .ce-pending-box { border: 1px solid #c4b5fd; background: #f5f3ff; border-radius: 10px; padding: 10px 12px; }
    .ce-pending-title { font-size: 12px; font-weight: 600; color: #5b21b6; margin-bottom: 6px; }
    .ce-pending-item { font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace; padding: 2px 0; display: flex; gap: 6px; }
    .ce-pending-item .ce-old { color: #9ca3af; text-decoration: line-through; }
    .ce-pending-item .ce-new { color: #059669; font-weight: 500; }
    .ce-section-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; color: var(--muted); margin: 12px 0 6px; padding-bottom: 4px; border-bottom: 1px solid var(--line); }
    .ce-field-pending .ce-field-label { color: #7c3aed; }
    .ce-field-pending .ce-field-value .ce-editable { border-color: #7c3aed; color: #5b21b6; }
    .ce-pending-dot { color: #7c3aed; font-size: 8px; vertical-align: middle; }
    .ce-add-placeholder { color: #9ca3af !important; border-bottom-color: #d1d5db !important; font-style: italic; }
    .ce-add-placeholder:hover { color: var(--accent) !important; border-color: var(--accent) !important; }
    .ce-field-group { margin-top: 6px; }
    .ce-field-group-title { font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .3px; margin-bottom: 3px; padding-top: 4px; border-top: 1px dashed #e5e7eb; }
    .ce-field-readonly { opacity: .5; }
    .ce-field-readonly .ce-field-value { font-style: italic; cursor: default; }
    .ce-field-value .ce-link { color: var(--accent); text-decoration: underline; word-break: break-all; font-size: 11px; }
    .ce-field-value .ce-link:hover { color: #115e59; }
    .ce-registry { border: 1px solid #ddd6fe; border-radius: 10px; padding: 12px; margin-bottom: 10px; background: #faf5ff; }
    .ce-registry-title { font-size: 13px; font-weight: 600; color: #6d28d9; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
    /* Wizard */
    .wizard-panel { border: 1px solid var(--line); border-radius: 10px; padding: 16px; margin-bottom: 10px; background: #fff; }
    .wizard-step { display: none; }
    .wizard-step.active { display: block; }
    .wizard-step-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
    .wizard-form-row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
    .wizard-form-row label { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; }
    .wizard-form-row input, .wizard-form-row select, .wizard-form-row textarea { border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; font-size: 12px; font-family: inherit; }
    .wizard-form-row input:focus, .wizard-form-row select:focus, .wizard-form-row textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 2px rgba(15,118,110,0.15); }
    .wizard-actions { display: flex; gap: 8px; margin-top: 16px; }
    .wizard-nav { display: flex; gap: 6px; margin-bottom: 16px; }
    .wizard-nav-step { font-size: 11px; padding: 4px 10px; border-radius: 999px; background: #f3f4f6; color: #6b7280; font-weight: 500; }
    .wizard-nav-step.active { background: var(--accent); color: #fff; }
    .wizard-nav-step.done { background: #d1fae5; color: #065f46; }
    .wizard-cat-grid { display: flex; flex-wrap: wrap; gap: 4px; max-height: 120px; overflow-y: auto; }
    .wizard-cat-chip { font-size: 10px; padding: 2px 8px; border: 1px solid var(--line); border-radius: 999px; cursor: pointer; background: #fff; }
    .wizard-cat-chip.selected { background: var(--accent); color: #fff; border-color: var(--accent); }
    .wizard-preview { background: #f9fafb; border: 1px solid var(--line); border-radius: 8px; padding: 10px; font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace; max-height: 200px; overflow: auto; white-space: pre-wrap; }
    /* Batch ops */
    .batch-section { border: 1px solid var(--line); border-radius: 10px; padding: 12px; margin-bottom: 10px; background: #f9fafb; }
    .batch-section-title { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
    .batch-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; font-size: 12px; }
    .batch-count { font-weight: 600; color: var(--accent); }
    .batch-btn { border: 1px solid var(--line); background: #fff; border-radius: 6px; padding: 5px 10px; font-size: 12px; cursor: pointer; }
    .batch-btn:hover { border-color: var(--accent); background: #f0fdfa; }
    .batch-btn.primary { background: #0f766e; color: white; border-color: #0f766e; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
    .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 12px; box-shadow: var(--shadow); }
    .panel h3 { margin: 0 0 10px; font-size: 16px; }
    .toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .toolbar input { width: 100%; max-width: 340px; border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; font-size: 13px; }
    .toolbar .count { color: var(--muted); font-size: 12px; }
    .toolbar button { border: 1px solid var(--line); background: #fff; border-radius: 8px; padding: 6px 10px; font-size: 12px; cursor: pointer; }
    .table-wrap { overflow: auto; border: 1px solid var(--line); border-radius: 10px; }
    table { width: 100%; border-collapse: collapse; min-width: 840px; background: #fff; }
    th, td { border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; padding: 8px 10px; font-size: 12px; }
    th { position: sticky; top: 0; background: #f9fafb; z-index: 1; font-size: 11px; text-transform: uppercase; letter-spacing: .3px; color: #4b5563; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace; }
    .pill { display: inline-block; background: var(--pill); color: var(--accent); border: 1px solid #99f6e4; border-radius: 999px; font-size: 11px; padding: 2px 8px; margin: 0 4px 4px 0; white-space: nowrap; }
    .small { color: var(--muted); font-size: 11px; }
    .edit-btn { border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 6px; padding: 4px 8px; font-size: 11px; cursor: pointer; }
    .edit-btn:hover { background: #e2e8f0; }
    .editor-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; margin-bottom: 10px; }
    .editor-grid > div { display: flex; flex-direction: column; gap: 4px; }
    .editor-grid label { color: var(--muted); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .2px; }
    .editor-grid select, .editor-grid textarea, .editor-grid input[type="text"] {
      border: 1px solid var(--line);
      border-radius: 8px;
      font-size: 12px;
      padding: 8px;
      background: #fff;
      width: 100%;
    }
    .editor-grid textarea { min-height: 110px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace; }
    .editor-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
    .editor-actions button, .editor-actions label {
      border: 1px solid var(--line);
      background: #fff;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .editor-actions button.primary { background: #0f766e; color: white; border-color: #0f766e; }
    .editor-actions button.warn { background: #fff1f2; border-color: #fecdd3; color: #9f1239; }
    .editor-actions button.ghost { background: #f8fafc; }
    .editor-actions input[type="file"] { display: none; }
    .editor-hint { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
    .editor-steps { margin: 0 0 8px; padding-left: 18px; color: #374151; font-size: 12px; }
    .editor-steps li { margin: 3px 0; }
    .editor-advanced { margin-bottom: 8px; }
    .editor-advanced summary { cursor: pointer; font-size: 12px; color: var(--muted); }
    .editor-advanced .editor-actions { margin-top: 8px; margin-bottom: 0; }
    .quick-box { margin-bottom: 10px; }
    #editor-quick-table { min-width: 0; }
    #editor-quick-table th, #editor-quick-table td { font-size: 11px; padding: 6px 8px; }
    #editor-quick-table .q-actions { white-space: nowrap; }
    #editor-entry-patch { min-height: 90px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace; }
    .editor-split { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 10px; }
    .editor-split pre {
      margin: 0;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #f8fafc;
      padding: 10px;
      font-size: 11px;
      line-height: 1.35;
      overflow: auto;
      max-height: 260px;
    }
    .status { font-size: 12px; margin-bottom: 8px; }
    .status.ok { color: #065f46; }
    .status.err { color: #9f1239; }
    .review-meta { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
    .review-meta .mono { color: var(--ink); }
    .review-block { border: 1px solid var(--line); border-radius: 10px; padding: 10px; background: #fff; margin-bottom: 10px; }
    .review-block h4 { margin: 0 0 8px; font-size: 13px; }
    .review-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; }
    .review-item { border: 1px solid var(--line); border-radius: 8px; padding: 8px; display: grid; gap: 4px; background: #f9fafb; }
    .review-item-top { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
    .review-item-title { font-size: 12px; font-weight: 600; color: var(--ink); }
    .review-item-sub { font-size: 11px; color: var(--muted); }
    .review-empty { font-size: 12px; color: var(--muted); }
    .review-group-title { margin: 0 0 8px; font-size: 12px; color: #374151; text-transform: uppercase; letter-spacing: .2px; }
    .review-entity { border: 1px solid var(--line); border-radius: 8px; background: #f9fafb; margin-bottom: 8px; }
    .review-entity summary { cursor: pointer; padding: 8px; list-style: none; }
    .review-entity summary::-webkit-details-marker { display: none; }
    .review-entity-body { padding: 0 8px 8px; }
    .review-entity-body .table-wrap { border-radius: 8px; }
    .review-table { min-width: 0; }
    .review-table th, .review-table td { font-size: 11px; padding: 6px 8px; }
    .review-actions { white-space: nowrap; }
    /* Graph styles */
    .graph-card { border: 1px solid var(--line); border-radius: 10px; margin-bottom: 10px; background: #f9fafb; }
    .graph-card summary { cursor: pointer; padding: 10px 12px; font-weight: 600; font-size: 13px; list-style: none; display: flex; align-items: center; gap: 8px; }
    .graph-card summary::-webkit-details-marker { display: none; }
    .graph-card summary::before { content: "\\25B6"; font-size: 10px; color: var(--muted); transition: transform .15s; }
    .graph-card[open] summary::before { transform: rotate(90deg); }
    .graph-body { padding: 0 12px 12px; }
    .graph-group { margin-bottom: 8px; }
    .graph-group-title { font-size: 11px; text-transform: uppercase; color: var(--muted); letter-spacing: .3px; margin-bottom: 4px; }
    .graph-node { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--line); border-radius: 8px; padding: 4px 10px; margin: 0 4px 4px 0; font-size: 11px; background: #fff; cursor: pointer; transition: border-color .15s; }
    .graph-node:hover { border-color: var(--accent); }
    .graph-node .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .graph-node .dot.active { background: #059669; }
    .graph-node .dot.expired { background: #9ca3af; }
    .graph-node .dot.upcoming { background: #f59e0b; }
    .graph-node .dot.missing { background: #ef4444; }
    .graph-node .dot.orphan { background: #ef4444; }
    .graph-node-detail { color: var(--muted); font-size: 10px; }
    .graph-arrow { color: var(--muted); font-size: 10px; margin: 0 2px; }
    .graph-link-group { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; margin-bottom: 4px; }
    /* Diff preview */
    .diff-add { background: #dcfce7; color: #166534; }
    .diff-change { background: #fef9c3; color: #854d0e; }
    .diff-remove { background: #fee2e2; color: #991b1b; text-decoration: line-through; }
    .diff-table { font-size: 11px; min-width: 0; }
    .diff-table th, .diff-table td { padding: 4px 8px; }
    /* History */
    .history-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--line); font-size: 12px; }
    .history-item:last-child { border-bottom: none; }
    /* Severity badges */
    .badge-error { display: inline-block; background: #fee2e2; color: #991b1b; border-radius: 4px; font-size: 10px; padding: 1px 6px; }
    .badge-warning { display: inline-block; background: #fef9c3; color: #854d0e; border-radius: 4px; font-size: 10px; padding: 1px 6px; }
    .badge-info { display: inline-block; background: #dbeafe; color: #1e40af; border-radius: 4px; font-size: 10px; padding: 1px 6px; }
    .badge-ok { display: inline-block; background: #dcfce7; color: #166534; border-radius: 4px; font-size: 10px; padding: 1px 6px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <h1 class="title">Credit Card Workbench</h1>
      <div class="sub" id="generatedAt"></div>
    </div>
    <div class="cards" id="summaryCards"></div>
    <div class="issues">
      <h2>Audit Alerts</h2>
      <div class="audit-summary-row" id="auditSummaryRow"></div>
      <div id="auditGroups"></div>
    </div>
    <div class="grid">
      <section class="panel" id="panel-graph">
        <h3>Relationship Graph</h3>
        <div class="toolbar">
          <select id="graph-card-select"></select>
          <button id="graph-expand-all" type="button">Expand All</button>
          <button id="graph-collapse-all" type="button">Collapse All</button>
        </div>
        <div id="graph-content" style="font-size:13px;"></div>
      </section>
      <section class="panel" id="panel-usage-keys">
        <h3>Usage Key Map</h3>
        <div class="toolbar">
          <input id="q-usage-keys" placeholder="Search usage key / module / tracker / campaign ...">
          <span class="count" id="count-usage-keys"></span>
        </div>
        <div class="table-wrap"><table id="table-usage-keys"></table></div>
      </section>
      <section class="panel" id="panel-history">
        <h3>Version History</h3>
        <div id="history-content" style="font-size:13px;"></div>
      </section>
    </div>
    <div class="grid">
      <section class="panel panel-editor" id="panel-card-editor">
        <h3>&#9997; 信用卡編輯器</h3>
        <div class="toolbar">
          <select id="card-editor-select"></select>
          <button id="card-editor-prev" type="button">&#9664; 上一張</button>
          <button id="card-editor-next" type="button">下一張 &#9654;</button>
        </div>
        <div id="card-editor-meta" class="review-meta"></div>
        <div id="editorStatus" class="status ok">Ready.</div>
        <div id="card-editor-content"></div>
        <div id="card-editor-pending" style="margin-top:12px;"></div>
        <div class="editor-actions" style="margin-top:10px;">
          <button id="editor-save-repo" class="primary" type="button">&#128190; 儲存到 Repo</button>
          <button id="editor-save-repo-golden" class="ghost" type="button">&#128190; 儲存 + 跑 Golden</button>
          <button id="editor-reset" class="warn" type="button">&#128465; 重設所有修改</button>
        </div>
      </section>
      <section class="panel" id="panel-batch-ops">
        <h3>&#9889; 批量操作</h3>
        <div id="batch-ops-content"></div>
      </section>
      <section class="panel panel-editor" id="panel-wizard">
        <h3>&#10024; 新增推廣</h3>
        <div class="wizard-nav" id="wizard-nav"></div>
        <div id="wizard-content"></div>
      </section>
      <section class="panel">
        <h3>Unified Offers</h3>
        <div class="toolbar">
          <input id="q-offers" placeholder="Search offer id / title / source / type / card / module ...">
          <span class="count" id="count-offers"></span>
        </div>
        <div class="table-wrap"><table id="table-offers"></table></div>
      </section>
      <section class="panel">
        <h3>Cards</h3>
        <div class="toolbar">
          <input id="q-cards" placeholder="Search card / module / tracker ...">
          <span class="count" id="count-cards"></span>
        </div>
        <div class="table-wrap"><table id="table-cards"></table></div>
      </section>
      <section class="panel">
        <h3>Categories</h3>
        <div class="toolbar">
          <input id="q-categories" placeholder="Search category id / label / parent ...">
          <span class="count" id="count-categories"></span>
        </div>
        <div class="table-wrap"><table id="table-categories"></table></div>
      </section>
      <section class="panel">
        <h3>Trackers</h3>
        <div class="toolbar">
          <input id="q-trackers" placeholder="Search tracker / mission / card ...">
          <span class="count" id="count-trackers"></span>
        </div>
        <div class="table-wrap"><table id="table-trackers"></table></div>
      </section>
    </div>
    <details class="panel" style="margin-top:14px;" id="panel-advanced-editor">
      <summary style="cursor:pointer;font-size:14px;font-weight:600;padding:10px 0;">&#128295; Advanced Developer Editor</summary>
      <div style="padding:10px 0;">
        <div class="editor-hint">Developer mode: Bucket &#8594; Entity &#8594; Field &#8594; JSON value.</div>
        <div class="editor-grid">
          <div><label for="editor-bucket">Bucket</label><select id="editor-bucket"></select></div>
          <div><label for="editor-id">Entity ID</label><select id="editor-id"></select></div>
          <div><label for="editor-field">Field</label><select id="editor-field"></select></div>
          <div style="grid-column: 1 / -1;">
            <label for="editor-value">Value (JSON)</label>
            <textarea id="editor-value" placeholder='0.06, "text", {"type":"month"}'></textarea>
          </div>
        </div>
        <input type="checkbox" id="editor-delete-field" hidden>
        <div class="editor-actions">
          <button id="editor-load" class="ghost" type="button">Reload</button>
          <button id="editor-set" class="primary" type="button">Save Field</button>
          <button id="editor-delete-field-btn" class="warn" type="button">Delete</button>
          <button id="editor-clear-entry" class="ghost" type="button">Clear Entry</button>
        </div>
        <div class="quick-box">
          <div class="small" style="margin-bottom:4px;">Quick Edit Fields</div>
          <div class="table-wrap"><table id="editor-quick-table"></table></div>
        </div>
        <div class="quick-box">
          <div class="small" style="margin-bottom:4px;">Bulk Patch JSON</div>
          <textarea id="editor-entry-patch" placeholder='{"rate":0.06,"cap_limit":500}'></textarea>
          <div class="editor-actions" style="margin-top:8px;">
            <button id="editor-load-entry" class="ghost" type="button">Load</button>
            <button id="editor-merge-entry" class="primary" type="button">Merge</button>
          </div>
        </div>
        <div class="editor-split">
          <div><div class="small" style="margin-bottom:4px;">Entity Snapshot</div><pre id="editor-current"></pre></div>
          <div><div class="small" style="margin-bottom:4px;">Pending JSON (<span id="editor-patch-count" class="mono">0</span>)</div><pre id="editor-pending"></pre></div>
        </div>
      </div>
    </details>
  </div>
<script>
const WB = ${safeJson};
const generated = new Date();
document.getElementById("generatedAt").textContent = "Generated: " + generated.toLocaleString();
const IS_APP_MODE = (window.location.protocol === "http:" || window.location.protocol === "https:");

function esc(input) {
  return String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function pills(values) {
  if (!Array.isArray(values) || values.length === 0) return '<span class="small">-</span>';
  return values.map(v => '<span class="pill mono">' + esc(v) + '</span>').join("");
}
function text(v) { return (v === null || v === undefined || v === "") ? '<span class="small">-</span>' : esc(v); }

const sum = WB.summary || {};
const summaryCardsEl = document.getElementById("summaryCards");
[
  ["Cards", sum.counts?.cards ?? 0],
  ["Offers", sum.counts?.offers ?? 0],
  ["Trackers", sum.counts?.trackers ?? 0],
  ["Categories", sum.counts?.categories ?? 0]
].forEach(([k, v]) => {
  const div = document.createElement("div");
  div.className = "card";
  div.innerHTML = '<div class="k">' + esc(k) + '</div><div class="v mono">' + esc(v) + '</div>';
  summaryCardsEl.appendChild(div);
});

// ── Actionable Audit System ─────────────────────────────────────────────
function queuePromoTypeFix(campaignId, newType) {
  ensureBucketPatch("campaigns");
  if (!PENDING_EDITS.campaigns[campaignId]) PENDING_EDITS.campaigns[campaignId] = {};
  PENDING_EDITS.campaigns[campaignId].promo_type = newType;
  refreshPendingPreview();
}

function renderAuditGroups() {
  const container = document.getElementById("auditGroups");
  const summaryRow = document.getElementById("auditSummaryRow");
  if (!container || !summaryRow) return;

  const promoTypeIssues = sum.promoTypeIssues || [];
  const promoOverlaps = sum.promoOverlaps || [];
  const orphanMissionKeys = sum.orphanMissionKeys || [];
  const capConflicts = sum.capConflicts || [];
  const orphanModules = sum.orphanModules || [];
  const orphanTrackers = sum.orphanTrackers || [];
  const sectionMissingRefs = sum.sectionMissingRefs || [];
  const sectionDrift = sum.sectionDrift || [];
  const specialPromoIssues = sum.specialPromoIssues || [];

  const totalIssues = promoTypeIssues.length + promoOverlaps.length + orphanMissionKeys.length
    + capConflicts.length + orphanModules.length + orphanTrackers.length
    + sectionMissingRefs.length + sectionDrift.length + specialPromoIssues.length;

  // Summary chips
  const chips = [
    { label: "Promo Types", count: promoTypeIssues.length },
    { label: "Overlaps", count: promoOverlaps.length },
    { label: "Orphan Keys", count: orphanMissionKeys.length },
    { label: "Cap Conflicts", count: capConflicts.length },
    { label: "Missing Refs", count: sectionMissingRefs.length },
    { label: "Drift", count: sectionDrift.length },
    { label: "Orphan Modules", count: orphanModules.length }
  ];
  summaryRow.innerHTML = chips.map(c =>
    '<span class="audit-chip ' + (c.count > 0 ? "has-issues" : "all-ok") + '">'
    + '<span class="chip-count">' + c.count + '</span> ' + esc(c.label) + '</span>'
  ).join("");

  if (totalIssues === 0) {
    container.innerHTML = '<div style="padding:16px;text-align:center;color:#065f46;font-size:14px;"><span class="badge-ok">OK</span> All checks passed. No findings.</div>';
    return;
  }

  var html = [];
  function h(s) { html.push(s); }

  function groupHeader(icon, title, badges, groupId, startOpen) {
    h('<div class="audit-group' + (startOpen ? ' open' : '') + '" data-group="' + esc(groupId) + '">');
    h('<div class="audit-group-header" data-action="toggle-group">');
    h('<div class="audit-group-title"><span class="group-icon">' + icon + '</span> ' + title + ' ' + badges + '</div>');
    h('<div class="audit-group-actions"><span class="group-chevron">&#9654;</span></div>');
    h('</div>');
    h('<div class="audit-group-body">');
  }

  function groupEnd() { h('</div></div>'); }

  function explanation(text) { h('<div class="audit-explanation">' + text + '</div>'); }

  function subgroupTitle(badge, label, count) {
    h('<div class="audit-subgroup"><div class="audit-subgroup-title">' + badge + ' ' + label + (count != null ? ' (' + count + ')' : '') + '</div>');
  }

  function auditRow(id, detail, actionHtml) {
    h('<div class="audit-item">');
    h('<div class="audit-item-left">');
    h('<span class="audit-item-id">' + esc(id) + '</span>');
    if (detail) h('<span class="audit-item-detail">' + detail + '</span>');
    h('</div>');
    if (actionHtml) h('<div class="audit-item-right">' + actionHtml + '</div>');
    h('</div>');
  }

  // ── Group 1: Promo Type Issues ──────────────────────────────────────────
  if (promoTypeIssues.length > 0) {
    var unsupported = promoTypeIssues.filter(function(p) { return p.issue === "unsupported"; });
    var mismatches = promoTypeIssues.filter(function(p) { return p.issue === "mismatch"; });
    var pmissing = promoTypeIssues.filter(function(p) { return p.issue === "missing"; });

    groupHeader("&#127991;", "Promo Type Issues", '<span class="badge-info">' + promoTypeIssues.length + '</span>', "promo-type", true);

    explanation(
      '<strong>什麼是 promo_type?</strong><br>'
      + 'Campaign 的 <code>promo_type</code> 是 metadata 標籤，用於分類和搜索。'
      + '它<strong>不影響</strong>計算引擎 — 實際渲染由 section 的 <code>type</code> 控制。'
      + '<br><br>'
      + '<strong>修正方法：</strong> 將不在允許列表的 type (例如 <code>cap</code>, <code>multi_cap</code>) '
      + '改為最接近的允許值。點擊右側按鈕自動修正，或按「全部修正」一次處理。'
    );

    if (IS_APP_MODE) {
      h('<div style="margin-bottom:10px;">');
      h('<button class="audit-fix-all-btn" id="fix-all-promo-types" data-action="fix-all-promo-types">修正全部 ' + promoTypeIssues.length + ' 個 promo_type</button>');
      h('</div>');
    }

    if (unsupported.length > 0) {
      subgroupTitle('<span class="subgroup-badge badge-info">unsupported</span>', '不在允許列表', unsupported.length);
      unsupported.forEach(function(p) {
        var btn = IS_APP_MODE ? '<button class="audit-fix-btn" data-action="fix-promo" data-campaign="' + esc(p.campaignId) + '" data-fix="' + esc(p.suggestedFix) + '">修正為 ' + esc(p.suggestedFix) + '</button>' : '';
        auditRow(p.campaignId, esc(p.declared) + ' &#8594; ' + esc(p.suggestedFix), btn);
      });
      h('</div>');
    }

    if (mismatches.length > 0) {
      subgroupTitle('<span class="subgroup-badge badge-warning">mismatch</span>', '與推斷不符', mismatches.length);
      mismatches.forEach(function(p) {
        var btn = IS_APP_MODE ? '<button class="audit-fix-btn" data-action="fix-promo" data-campaign="' + esc(p.campaignId) + '" data-fix="' + esc(p.suggestedFix) + '">修正為 ' + esc(p.suggestedFix) + '</button>' : '';
        auditRow(p.campaignId, 'declared: ' + esc(p.declared) + ', inferred: ' + esc(p.inferred), btn);
      });
      h('</div>');
    }

    if (pmissing.length > 0) {
      subgroupTitle('<span class="subgroup-badge badge-warning">missing</span>', '缺少 promo_type', pmissing.length);
      pmissing.forEach(function(p) {
        var btn = IS_APP_MODE ? '<button class="audit-fix-btn" data-action="fix-promo" data-campaign="' + esc(p.campaignId) + '" data-fix="' + esc(p.suggestedFix) + '">設定為 ' + esc(p.suggestedFix) + '</button>' : '';
        auditRow(p.campaignId, 'inferred: ' + esc(p.inferred), btn);
      });
      h('</div>');
    }

    groupEnd();
  }

  // ── Group 2: Promo Overlaps ─────────────────────────────────────────────
  if (promoOverlaps.length > 0) {
    var intentional = promoOverlaps.filter(function(o) { return o.intentional; });
    var suspicious = promoOverlaps.filter(function(o) { return !o.intentional; });
    var badgesOl = '';
    if (suspicious.length > 0) badgesOl += '<span class="badge-warning">' + suspicious.length + ' 需檢查</span> ';
    if (intentional.length > 0) badgesOl += '<span class="badge-ok">' + intentional.length + ' 正常</span>';

    groupHeader("&#128197;", "Promo Date Overlaps", badgesOl, "overlaps", suspicious.length > 0);

    explanation(
      '<strong>什麼是 Promo Overlap?</strong><br>'
      + '同一張卡的兩個 module 在相同日期範圍內對相同消費類別提供獎賞。'
      + '<br><br>'
      + '<strong>正常情況：</strong> 平日/假日 module pair、pre-cap/post-cap pair、'
      + '堆疊 bonus (mode=add) 都是設計上預期的 overlap。'
      + '<br>'
      + '<strong>需檢查：</strong> 找不到已知模式的 overlap，可能是重複設定或遺漏的 valid_to 日期。'
    );

    if (suspicious.length > 0) {
      subgroupTitle('<span class="subgroup-badge badge-warning">&#9888;&#65039; 需檢查</span>', '', suspicious.length);
      suspicious.forEach(function(o) {
        auditRow(o.cardId, esc(o.moduleA) + ' &#8596; ' + esc(o.moduleB) + ' — [' + esc(o.categories.join(", ")) + ']<br><span class="audit-item-detail">' + esc(o.dateA) + ' / ' + esc(o.dateB) + '</span>');
      });
      h('</div>');
    }

    if (intentional.length > 0) {
      subgroupTitle('<span class="subgroup-badge badge-ok">&#10003; 正常 (設計預期)</span>', '', intentional.length);
      var byPattern = {};
      intentional.forEach(function(o) { var p = o.pattern || "other"; if (!byPattern[p]) byPattern[p] = []; byPattern[p].push(o); });
      var patternLabels = {
        weekday_holiday: "平日 / 假日 配對",
        precap_postcap: "達標前 / 達標後 配對",
        tier_pair: "級別配對",
        same_base_different_aspect: "同一 base module 不同面向",
        stacking: "堆疊獎賞 (mode=add)"
      };
      Object.keys(byPattern).forEach(function(pattern) {
        var items = byPattern[pattern];
        h('<div style="margin-bottom:4px;font-size:11px;color:#6b7280;font-weight:500;">' + esc(patternLabels[pattern] || pattern) + ' (' + items.length + ')</div>');
        items.forEach(function(o) { auditRow(o.cardId, esc(o.moduleA) + ' &#8596; ' + esc(o.moduleB)); });
      });
      h('</div>');
    }

    groupEnd();
  }

  // ── Group 3: Orphan Mission Keys ────────────────────────────────────────
  if (orphanMissionKeys.length > 0) {
    var byKey = {};
    orphanMissionKeys.forEach(function(o) { if (!byKey[o.key]) byKey[o.key] = []; byKey[o.key].push(o); });

    groupHeader("&#128273;", "Orphan Mission Keys", '<span class="badge-info">' + orphanMissionKeys.length + '</span>', "orphan-keys", false);

    explanation(
      '<strong>什麼是 Orphan Mission Key?</strong><br>'
      + 'Module 設定了 <code>req_mission_key</code>（需要消費達標才解鎖），'
      + '但找不到任何 tracker 會寫入這個 key。'
      + '<br><br>'
      + '<strong>常見情況：</strong> 這些 module 通常使用「module counter」模式 — '
      + '由 core.js 內的計算引擎在處理同一張卡的消費時自動累計，不需要獨立 tracker。'
      + '這種模式下出現在此清單是<strong>正常的</strong>。'
      + '<br><br>'
      + '<strong>需要關注：</strong> 如果模組應該使用 tracker 但沒有設定，'
      + '需要在 <code>data_trackers.js</code> 或 <code>data_campaigns.js</code> 中新增對應 tracker。'
    );

    Object.keys(byKey).sort().forEach(function(key) {
      var items = byKey[key];
      var allModuleCounter = items.every(function(i) { return i.hasModuleCounter; });
      h('<div class="audit-subgroup"><div class="audit-subgroup-title">');
      h('<code>' + esc(key) + '</code>');
      if (allModuleCounter) {
        h(' <span class="subgroup-badge badge-ok">module counter 模式 — 正常</span>');
      } else {
        h(' <span class="subgroup-badge badge-warning">可能需要新增 tracker</span>');
      }
      h(' (' + items.length + ' modules)</div>');
      items.forEach(function(o) {
        var detail = (o.relatedModules && o.relatedModules.length > 0) ? '同 key: ' + esc(o.relatedModules.join(", ")) : '';
        auditRow(o.moduleId, detail);
      });
      h('</div>');
    });

    groupEnd();
  }

  // ── Group 4: Cap Conflicts ──────────────────────────────────────────────
  if (capConflicts.length > 0) {
    groupHeader("&#9889;", "Cap Mode Conflicts", '<span class="badge-error">' + capConflicts.length + '</span>', "cap-conflicts", true);
    explanation(
      '<strong>什麼是 Cap Conflict?</strong><br>'
      + '兩個 module 使用同一個 <code>cap_key</code>，但它們的 <code>cap_mode</code> 不同 '
      + '(一個用 <code>spending</code>、另一個用 <code>reward</code>)。'
      + '這會導致計算引擎用錯誤的單位計算上限。<strong>必須修正。</strong>'
    );
    capConflicts.forEach(function(c) { auditRow(c.message); });
    groupEnd();
  }

  // ── Group 5: Missing Refs & Drift ────────────────────────────────────────
  if (sectionMissingRefs.length > 0 || sectionDrift.length > 0) {
    var bindBadges = '';
    if (sectionMissingRefs.length > 0) bindBadges += '<span class="badge-error">' + sectionMissingRefs.length + ' missing</span> ';
    if (sectionDrift.length > 0) bindBadges += '<span class="badge-warning">' + sectionDrift.length + ' drift</span>';
    groupHeader("&#128279;", "Campaign Binding", bindBadges, "binding", sectionMissingRefs.length > 0);
    explanation(
      '<strong>什麼是 Binding Issue?</strong><br>'
      + '<code>Missing ref</code>: Campaign section 引用了一個不存在的 module ID。<br>'
      + '<code>Drift</code>: Campaign section 裡的 usageKey/target 與 module 的 req_mission_key/req_mission_spend 不一致。'
    );
    if (sectionMissingRefs.length > 0) {
      subgroupTitle('<span class="subgroup-badge badge-error">Missing Refs</span>', '', null);
      sectionMissingRefs.forEach(function(r) { auditRow(r); });
      h('</div>');
    }
    if (sectionDrift.length > 0) {
      subgroupTitle('<span class="subgroup-badge badge-warning">Drift</span>', '', null);
      sectionDrift.forEach(function(d) { auditRow(d); });
      h('</div>');
    }
    groupEnd();
  }

  // ── Group 6: Orphan Modules/Trackers ──────────────────────────────────
  if (orphanModules.length > 0 || orphanTrackers.length > 0) {
    groupHeader("&#128123;", "Unused Entities", '<span class="badge-warning">' + (orphanModules.length + orphanTrackers.length) + '</span>', "orphans", false);
    explanation('Module 或 Tracker 存在於資料檔中，但沒有被任何卡片引用。可能是已棄用的舊規則，或是新增後忘記連結到卡片。');
    if (orphanModules.length > 0) {
      subgroupTitle('<span class="subgroup-badge badge-warning">Unused Modules</span>', '', orphanModules.length);
      orphanModules.forEach(function(m) { auditRow(m); });
      h('</div>');
    }
    if (orphanTrackers.length > 0) {
      subgroupTitle('<span class="subgroup-badge badge-warning">Unused Trackers</span>', '', orphanTrackers.length);
      orphanTrackers.forEach(function(t) { auditRow(t); });
      h('</div>');
    }
    groupEnd();
  }

  // ── Group 7: Special Promo Issues ────────────────────────────────────
  if (specialPromoIssues.length > 0) {
    groupHeader("&#11088;", "Special Promo Issues", '<span class="badge-info">' + specialPromoIssues.length + '</span>', "special-promo", false);
    explanation('Special Promo Model (例如 Travel Guru) 的設定問題。');
    specialPromoIssues.forEach(function(s) { auditRow(typeof s === "string" ? s : (s.message || String(s))); });
    groupEnd();
  }

  container.innerHTML = html.join("");

  // ── Event delegation for all audit actions (no inline onclick needed) ───
  container.addEventListener("click", function(e) {
    var target = e.target;
    var action = target.getAttribute("data-action");
    if (!action) {
      // Check parent for header click
      var header = target.closest("[data-action]");
      if (header) { action = header.getAttribute("data-action"); target = header; }
    }
    if (action === "toggle-group") {
      var group = target.closest(".audit-group");
      if (group) group.classList.toggle("open");
    }
    if (action === "fix-promo") {
      var cid = target.getAttribute("data-campaign");
      var fix = target.getAttribute("data-fix");
      if (cid && fix) {
        queuePromoTypeFix(cid, fix);
        target.textContent = "已排隊";
        target.classList.add("queued");
      }
    }
    if (action === "fix-all-promo-types") {
      var issues = sum.promoTypeIssues || [];
      issues.forEach(function(p) {
        if (p && p.campaignId && p.suggestedFix) queuePromoTypeFix(p.campaignId, p.suggestedFix);
      });
      container.querySelectorAll(".audit-fix-btn[data-campaign]").forEach(function(btn) {
        btn.textContent = "已排隊";
        btn.classList.add("queued");
      });
      target.textContent = "✓ 已全部排隊";
      target.disabled = true;
      setEditorStatus("已排隊 " + issues.length + " 個 promo_type 修正。按 Save To Repo 套用。", false);
    }
  });
}

renderAuditGroups();

// ── Field Labels (Chinese + English) ──────────────────────────────────────
var FIELD_LABELS = {
  rate: "回贈率 (rate)", cap_limit: "回贈上限 (cap)", cap_mode: "上限模式 (cap_mode)",
  cap_key: "上限 Key", secondary_cap_limit: "次上限", secondary_cap_key: "次上限 Key",
  desc: "描述 (desc)", mode: "模式 (mode)", type: "類型 (type)",
  valid_from: "開始日期", valid_to: "結束日期", promo_start: "推廣開始",
  promo_end: "推廣結束", match: "消費類別 (match)", req_mission_key: "達標 Key",
  req_mission_spend: "達標門檻", rate_per_x: "每X元回贈", multiplier: "倍數",
  name: "名稱", bank: "銀行", currency: "回贈幣種", promo_type: "推廣類型",
  usage_key: "使用量 Key", min_single_spend: "最低單筆消費", min_spend: "最低消費",
  display_name_zhhk: "顯示名稱", note_zhhk: "備註", setting_key: "設定 Key",
  tnc_url: "條款連結", promo_url: "推廣連結", source_url: "資料來源連結", source_title: "資料來源標題",
  registration_url: "登記連結", registration_start: "登記開始", registration_end: "登記結束",
  registration_note: "登記備註", last_verified_at: "最後驗證日期",
  valid_days: "有效日 (星期)", valid_on_red_day: "假日有效", retroactive: "追溯",
  icon: "圖標", theme: "主題色", cards: "適用卡", sections: "推廣段落",
  capKeys: "上限 Keys", warningOnly: "僅警告",
  settingKey: "設定 Key", warningTitle: "警告標題", warningDesc: "警告描述",
  sourceUrl: "資料來源連結", sourceTitle: "資料來源標題",
  tncUrl: "條款連結", promoUrl: "推廣連結", registrationUrl: "登記連結",
  registrationStart: "登記開始", registrationEnd: "登記結束",
  registrationNote: "登記備註", implementationNote: "實作備註"
};
var CAP_MODE_LABELS = { spending: "以消費額計", reward: "以回贈額計" };
var MODE_LABELS = { replace: "取代基本", add: "疊加" };
var BUCKET_LABELS = { cards: "信用卡", modules: "模組", trackers: "追蹤器", campaigns: "推廣活動", categories: "消費類別", campaignRegistry: "推廣註冊資訊" };

function fieldLabel(field) { return FIELD_LABELS[field] || field; }

// ── Card Editor ──────────────────────────────────────────────────────────
function getModuleStatus(mod) {
  if (!mod) return "expired";
  var today = new Date().toISOString().slice(0, 10);
  var end = mod.valid_to || mod.promo_end;
  if (end && end < today) return "expired";
  var start = mod.valid_from || mod.promo_start;
  if (start && start > today) return "upcoming";
  return "active";
}
var STATUS_LABELS = { active: "&#9679; 生效中", expired: "&#9679; 已過期", upcoming: "&#9679; 即將開始" };
var STATUS_COLORS = { active: "ce-dot-active", expired: "ce-dot-expired", upcoming: "ce-dot-upcoming" };

// Field type inference for inline editing
var FIELD_TYPES = {
  rate: "number", rate_per_x: "number", multiplier: "number", cap_limit: "number",
  secondary_cap_limit: "number", min_spend: "number", min_single_spend: "number",
  req_mission_spend: "number",
  valid_from: "date", valid_to: "date", promo_end: "date", promo_start: "date",
  registration_start: "date", registration_end: "date", last_verified_at: "date",
  registrationStart: "date", registrationEnd: "date",
  tnc_url: "url", promo_url: "url", source_url: "url", registration_url: "url",
  sourceUrl: "url", tncUrl: "url", promoUrl: "url", registrationUrl: "url",
  valid_days: "json", valid_on_red_day: "boolean", retroactive: "boolean",
  warningOnly: "boolean", match: "json", sections: "json", cards: "json",
  capKeys: "json", period_policy: "json", effects_on_match: "json",
  effects_on_eligible: "json", counter: "json", cap: "json", config: "json"
};

// Field group definitions for modules
var MODULE_FIELD_GROUPS = [
  { key: "core", label: "&#9881; 核心", fields: ["rate", "rate_per_x", "multiplier", "cap_limit", "cap_mode", "cap_key", "secondary_cap_limit", "secondary_cap_key", "mode", "type"] },
  { key: "dates", label: "&#128197; 日期", fields: ["valid_from", "valid_to", "promo_end", "valid_days", "valid_on_red_day"] },
  { key: "links", label: "&#128279; 連結", fields: ["tnc_url", "promo_url", "source_url", "registration_url", "registration_start", "registration_end", "registration_note"] },
  { key: "mission", label: "&#127919; 達標", fields: ["req_mission_key", "req_mission_spend", "min_spend", "min_single_spend"] },
  { key: "meta", label: "&#128196; 資訊", fields: ["desc", "display_name_zhhk", "note_zhhk", "setting_key", "usage_key", "last_verified_at", "retroactive"] }
];

// Allowed module/registry fields set — initialized lazily via getter (EDITOR_ALLOWED defined later)
var _ALLOWED_MODULE_SET = null;
var _ALLOWED_REGISTRY_SET = null;

function getFieldInputType(field) {
  return FIELD_TYPES[field] || "text";
}

function formatFieldDisplay(field, value) {
  if (value == null || value === "") return "—";
  var ftype = getFieldInputType(field);
  if (ftype === "url") return value;
  if (ftype === "boolean") return value ? "&#10003; Yes" : "&#10007; No";
  if (field === "rate") return (value * 100).toFixed(2) + "%";
  if (field === "cap_limit" || field === "secondary_cap_limit") return "$" + value;
  if (field === "min_spend" || field === "min_single_spend" || field === "req_mission_spend") return "$" + value;
  if (field === "cap_mode") return CAP_MODE_LABELS[value] || value;
  if (field === "mode") return MODE_LABELS[value] || value;
  if (ftype === "json") {
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === "object") return JSON.stringify(value);
  }
  return String(value);
}

function getPendingValue(bucket, id, field) {
  // Returns the pending-edited value if one exists, otherwise undefined.
  var bp = PENDING_EDITS[bucket];
  if (!bp || !bp[id]) return undefined;
  var patch = bp[id];
  if (!Object.prototype.hasOwnProperty.call(patch, field)) return undefined;
  return patch[field];
}

function effectiveValue(bucket, id, field, originalValue) {
  // Merge pending edit on top of original so re-render shows the queued change.
  var pending = getPendingValue(bucket, id, field);
  return pending !== undefined ? pending : originalValue;
}

function renderModuleField(mid, field, value, isEditable, h) {
  // Use pending edit if present so the field doesn't flash back to original after commit.
  var effectiveVal = isEditable ? effectiveValue("modules", mid, field, value) : value;
  var hasPending = isEditable && getPendingValue("modules", mid, field) !== undefined;
  var ftype = getFieldInputType(field);
  var displayVal = formatFieldDisplay(field, effectiveVal);
  var cls = isEditable ? "ce-field" : "ce-field ce-field-readonly";
  if (hasPending) cls += " ce-field-pending";
  h('<div class="' + cls + '">');
  h('<div class="ce-field-label">' + fieldLabel(field) + (hasPending ? ' <span class="ce-pending-dot">&#9679;</span>' : '') + '</div>');
  if (isEditable && ftype !== "json" && ftype !== "boolean") {
    var curStr = (effectiveVal != null) ? String(effectiveVal) : "";
    var dtype = ftype === "url" ? "text" : ftype;
    if (ftype === "url" && effectiveVal) {
      h('<div class="ce-field-value"><span class="ce-editable" data-action="inline-edit" data-bucket="modules" data-id="' + esc(mid) + '" data-field="' + esc(field) + '" data-current="' + esc(curStr) + '" data-type="' + esc(dtype) + '"><a class="ce-link" href="' + esc(effectiveVal) + '" target="_blank" title="' + esc(effectiveVal) + '">' + esc(curStr.length > 40 ? curStr.slice(0, 37) + "..." : curStr) + '</a></span></div>');
    } else {
      h('<div class="ce-field-value"><span class="ce-editable" data-action="inline-edit" data-bucket="modules" data-id="' + esc(mid) + '" data-field="' + esc(field) + '" data-current="' + esc(curStr) + '" data-type="' + esc(dtype) + '">' + esc(displayVal) + '</span></div>');
    }
  } else if (isEditable && ftype === "json") {
    var jsonStr = (effectiveVal != null) ? JSON.stringify(effectiveVal) : "";
    h('<div class="ce-field-value"><span class="ce-editable" data-action="inline-edit" data-bucket="modules" data-id="' + esc(mid) + '" data-field="' + esc(field) + '" data-current="' + esc(jsonStr) + '" data-type="text">' + esc(displayVal.length > 50 ? displayVal.slice(0, 47) + "..." : displayVal) + '</span></div>');
  } else if (ftype === "url" && effectiveVal) {
    h('<div class="ce-field-value"><a class="ce-link" href="' + esc(effectiveVal) + '" target="_blank" title="' + esc(effectiveVal) + '">' + esc(String(effectiveVal).length > 40 ? String(effectiveVal).slice(0, 37) + "..." : String(effectiveVal)) + '</a></div>');
  } else {
    h('<div class="ce-field-value">' + displayVal + '</div>');
  }
  h('</div>');
}

function renderCardEditorContent(cardId) {
  var container = document.getElementById("card-editor-content");
  var metaEl = document.getElementById("card-editor-meta");
  if (!container) return;
  var card = (WB.cards || []).find(function(c) { return c.id === cardId; });
  if (!card) { container.innerHTML = '<div class="small">未找到信用卡。</div>'; return; }

  var entities = (WB.editor && WB.editor.entities) || {};
  var modules = entities.modules || {};
  var trackers = entities.trackers || {};
  var campaignRegistry = entities.campaignRegistry || {};
  var campaigns = entities.campaigns || {};

  // Meta
  if (metaEl) {
    metaEl.innerHTML = '<strong>' + esc(card.name || card.id) + '</strong> '
      + '<span class="mono small">' + esc(card.id) + '</span> '
      + (card.bank ? '<span class="small">&#183; ' + esc(card.bank) + '</span> ' : '')
      + (card.currency ? '<span class="small">&#183; ' + esc(card.currency) + '</span>' : '');
  }

  var html = [];
  function h(s) { html.push(s); }

  // Modules
  h('<div class="ce-section-title">&#128204; 模組 Modules (' + (card.rewardModules || []).length + ')</div>');
  (card.rewardModules || []).forEach(function(mid) {
    var mod = modules[mid];
    if (!mod) { h('<div class="ce-module"><div class="ce-module-title"><span class="ce-dot ce-dot-expired"></span> ' + esc(mid) + ' <span class="small">(missing)</span></div></div>'); return; }
    var status = getModuleStatus(mod);
    h('<div class="ce-module' + (status === "expired" ? ' ce-expired' : '') + '" data-module-id="' + esc(mid) + '">');

    // Header
    h('<div class="ce-module-header">');
    h('<div class="ce-module-title"><span class="ce-dot ' + STATUS_COLORS[status] + '"></span> ' + esc(mod.display_name_zhhk || mod.desc || mid) + ' <span class="small">' + esc(STATUS_LABELS[status]) + '</span></div>');
    h('<div class="ce-module-id">' + esc(mid) + '</div>');
    h('</div>');

    // Render field groups
    var renderedFields = new Set();
    MODULE_FIELD_GROUPS.forEach(function(group) {
      // For links group: always show all editable URL fields (even empty) so user can add them
      var isLinksGroup = group.key === "links";
      var groupFields = group.fields.filter(function(f) {
        var effVal = effectiveValue("modules", mid, f, mod[f]);
        var hasValue = effVal != null && effVal !== "";
        var isEditable = _ALLOWED_MODULE_SET.has(f);
        // Always include in links group if editable (even if empty, to allow adding)
        return hasValue || (isLinksGroup && isEditable);
      });
      if (groupFields.length === 0) return;
      h('<div class="ce-field-group">');
      h('<div class="ce-field-group-title">' + group.label + '</div>');
      h('<div class="ce-fields">');
      groupFields.forEach(function(field) {
        renderedFields.add(field);
        var isEditable = _ALLOWED_MODULE_SET.has(field);
        var effVal = effectiveValue("modules", mid, field, mod[field]);
        var isEmpty = effVal == null || effVal === "";
        if (isEmpty && isEditable) {
          // Show as "click to add" placeholder
          var ftype = getFieldInputType(field);
          var dtype = ftype === "url" ? "text" : (ftype === "date" ? "date" : "text");
          h('<div class="ce-field">');
          h('<div class="ce-field-label">' + fieldLabel(field) + '</div>');
          h('<div class="ce-field-value"><span class="ce-editable ce-add-placeholder" data-action="inline-edit" data-bucket="modules" data-id="' + esc(mid) + '" data-field="' + esc(field) + '" data-current="" data-type="' + esc(dtype) + '">&#10133; 點擊新增</span></div>');
          h('</div>');
        } else {
          renderModuleField(mid, field, mod[field], isEditable, h);
        }
      });
      h('</div></div>');
    });

    // Categories (special rendering)
    if (mod.match && mod.match.length > 0) {
      h('<div class="ce-cats">');
      mod.match.forEach(function(cat) { h('<span class="ce-cat">' + esc(cat) + '</span>'); });
      h('</div>');
      renderedFields.add("match");
    }

    // Remaining fields not in any group (catch-all)
    var otherFields = Object.keys(mod).filter(function(f) {
      return !renderedFields.has(f) && f !== "match" && f !== "id" && mod[f] != null && mod[f] !== "";
    });
    if (otherFields.length > 0) {
      h('<div class="ce-field-group">');
      h('<div class="ce-field-group-title">&#128736; 其他 Other</div>');
      h('<div class="ce-fields">');
      otherFields.forEach(function(field) {
        var isEditable = _ALLOWED_MODULE_SET.has(field);
        renderModuleField(mid, field, mod[field], isEditable, h);
      });
      h('</div></div>');
    }

    // Quick actions
    var vTo = mod.valid_to || mod.promo_end || "";
    if (IS_APP_MODE && vTo) {
      h('<div class="ce-actions">');
      h('<button class="ce-action" data-action="extend-promo" data-id="' + esc(mid) + '" data-field="' + esc(mod.valid_to != null ? "valid_to" : "promo_end") + '" data-current="' + esc(vTo) + '" data-months="3">+3 個月</button>');
      h('<button class="ce-action" data-action="extend-promo" data-id="' + esc(mid) + '" data-field="' + esc(mod.valid_to != null ? "valid_to" : "promo_end") + '" data-current="' + esc(vTo) + '" data-months="6">+6 個月</button>');
      h('<button class="ce-action ce-warn" data-action="expire-now" data-id="' + esc(mid) + '" data-field="' + esc(mod.valid_to != null ? "valid_to" : "promo_end") + '">立即過期</button>');
      h('</div>');
    }

    h('</div>'); // ce-module
  });

  // Trackers
  if (card.trackers && card.trackers.length > 0) {
    h('<div class="ce-section-title">&#128269; 追蹤器 Trackers (' + card.trackers.length + ')</div>');
    card.trackers.forEach(function(tid) {
      var trk = trackers[tid];
      h('<div class="ce-module">');
      h('<div class="ce-module-header"><div class="ce-module-title">' + esc(trk && trk.desc ? trk.desc : tid) + '</div>');
      h('<div class="ce-module-id">' + esc(tid) + '</div></div>');
      if (trk) {
        h('<div class="ce-fields">');
        if (trk.req_mission_key) h('<div class="ce-field"><div class="ce-field-label">Mission Key</div><div class="ce-field-value">' + esc(trk.req_mission_key) + '</div></div>');
        if (trk.mission_id) h('<div class="ce-field"><div class="ce-field-label">Mission ID</div><div class="ce-field-value">' + esc(trk.mission_id) + '</div></div>');
        if (trk.counter && trk.counter.key) h('<div class="ce-field"><div class="ce-field-label">Counter Key</div><div class="ce-field-value">' + esc(trk.counter.key) + '</div></div>');
        h('</div>');
      }
      h('</div>');
    });
  }

  // Campaign registry for this card (Part 6)
  var relatedCampaigns = [];
  Object.keys(campaigns).forEach(function(cid) {
    var camp = campaigns[cid];
    if (!camp) return;
    var campCards = Array.isArray(camp.cards) ? camp.cards : [];
    if (campCards.indexOf(card.id) >= 0) {
      relatedCampaigns.push({ id: cid, campaign: camp, registry: campaignRegistry[cid] || {} });
    }
  });

  if (relatedCampaigns.length > 0) {
    h('<div class="ce-section-title">&#128204; 相關推廣 Campaigns (' + relatedCampaigns.length + ')</div>');
    relatedCampaigns.forEach(function(item) {
      var reg = item.registry;
      var camp = item.campaign;
      h('<div class="ce-registry">');
      h('<div class="ce-registry-title">');
      if (camp.icon) h('<span>' + esc(camp.icon) + '</span> ');
      h(esc(camp.name || item.id));
      h(' <span class="mono small">' + esc(item.id) + '</span>');
      h('</div>');

      h('<div class="ce-fields">');
      // Campaign fields
      var campEditFields = ["promo_type", "name", "display_name_zhhk", "icon", "theme"];
      var allowedCampSet = new Set(EDITOR_ALLOWED.campaigns || []);
      campEditFields.forEach(function(field) {
        var rawVal = camp[field];
        var effVal = allowedCampSet.has(field) ? effectiveValue("campaigns", item.id, field, rawVal) : rawVal;
        if (effVal == null || effVal === "") return;
        var isEditable = allowedCampSet.has(field);
        var hasPending = isEditable && getPendingValue("campaigns", item.id, field) !== undefined;
        var cls = isEditable ? "ce-field" : "ce-field ce-field-readonly";
        if (hasPending) cls += " ce-field-pending";
        h('<div class="' + cls + '">');
        h('<div class="ce-field-label">' + fieldLabel(field) + (hasPending ? ' <span class="ce-pending-dot">&#9679;</span>' : '') + '</div>');
        if (isEditable) {
          h('<div class="ce-field-value"><span class="ce-editable" data-action="inline-edit" data-bucket="campaigns" data-id="' + esc(item.id) + '" data-field="' + esc(field) + '" data-current="' + esc(String(effVal)) + '" data-type="text">' + esc(String(effVal)) + '</span></div>');
        } else {
          h('<div class="ce-field-value">' + esc(String(effVal)) + '</div>');
        }
        h('</div>');
      });

      // Registry fields
      var regFields = ["settingKey", "tncUrl", "promoUrl", "registrationUrl", "registrationStart", "registrationEnd", "registrationNote", "warningTitle", "warningDesc", "implementationNote"];
      regFields.forEach(function(field) {
        var rawVal = reg[field];
        var isEditable = _ALLOWED_REGISTRY_SET.has(field);
        var effVal = isEditable ? effectiveValue("campaignRegistry", item.id, field, rawVal) : rawVal;
        if (effVal == null || effVal === "") return;
        var hasPending = isEditable && getPendingValue("campaignRegistry", item.id, field) !== undefined;
        var ftype = getFieldInputType(field);
        var cls = isEditable ? "ce-field" : "ce-field ce-field-readonly";
        if (hasPending) cls += " ce-field-pending";
        h('<div class="' + cls + '">');
        h('<div class="ce-field-label">' + fieldLabel(field) + (hasPending ? ' <span class="ce-pending-dot">&#9679;</span>' : '') + '</div>');
        if (isEditable) {
          if (ftype === "url") {
            h('<div class="ce-field-value"><span class="ce-editable" data-action="inline-edit" data-bucket="campaignRegistry" data-id="' + esc(item.id) + '" data-field="' + esc(field) + '" data-current="' + esc(String(effVal)) + '" data-type="text"><a class="ce-link" href="' + esc(effVal) + '" target="_blank">' + esc(String(effVal).length > 40 ? String(effVal).slice(0, 37) + "..." : String(effVal)) + '</a></span></div>');
          } else {
            h('<div class="ce-field-value"><span class="ce-editable" data-action="inline-edit" data-bucket="campaignRegistry" data-id="' + esc(item.id) + '" data-field="' + esc(field) + '" data-current="' + esc(String(effVal)) + '" data-type="' + (ftype === "date" ? "date" : "text") + '">' + esc(String(effVal)) + '</span></div>');
          }
        } else {
          h('<div class="ce-field-value">' + esc(String(effVal)) + '</div>');
        }
        h('</div>');
      });

      // Add empty editable registry fields for easy additions
      if (IS_APP_MODE) {
        var missingRegFields = regFields.filter(function(f) {
          var effVal2 = effectiveValue("campaignRegistry", item.id, f, reg[f]);
          return (effVal2 == null || effVal2 === "") && _ALLOWED_REGISTRY_SET.has(f);
        });
        if (missingRegFields.length > 0) {
          h('<div class="ce-field-group">');
          h('<div class="ce-field-group-title">&#10133; 新增欄位</div>');
          h('<div class="ce-fields">');
          missingRegFields.forEach(function(field) {
            var ftype = getFieldInputType(field);
            var dtype = ftype === "url" ? "text" : (ftype === "date" ? "date" : "text");
            h('<div class="ce-field">');
            h('<div class="ce-field-label">' + fieldLabel(field) + '</div>');
            h('<div class="ce-field-value"><span class="ce-editable" data-action="inline-edit" data-bucket="campaignRegistry" data-id="' + esc(item.id) + '" data-field="' + esc(field) + '" data-current="" data-type="' + dtype + '">&#10133; 點擊新增</span></div>');
            h('</div>');
          });
          h('</div></div>');
        }
      }

      h('</div>'); // ce-fields
      h('</div>'); // ce-registry
    });
  }

  container.innerHTML = html.join("");
  renderPendingChanges();
}

function renderPendingChanges() {
  var box = document.getElementById("card-editor-pending");
  if (!box) return;
  var exported = buildExportEdits();
  var total = 0;
  var items = [];
  Object.keys(exported).forEach(function(bucket) {
    Object.keys(exported[bucket] || {}).forEach(function(id) {
      var patch = exported[bucket][id];
      Object.keys(patch).forEach(function(field) {
        total++;
        var entity = getCurrentEntity(bucket, id);
        var oldVal = entity ? entity[field] : undefined;
        var newVal = patch[field];
        items.push({
          bucket: bucket,
          id: id,
          field: field,
          oldVal: oldVal,
          newVal: newVal
        });
      });
    });
  });
  if (total === 0) {
    box.innerHTML = "";
    return;
  }
  var html = [];
  html.push('<div class="ce-pending-box">');
  html.push('<div class="ce-pending-title">&#9998; 待套用的修改 (' + total + ')</div>');
  items.forEach(function(item) {
    var oldStr = item.oldVal != null ? String(typeof item.oldVal === "object" ? JSON.stringify(item.oldVal) : item.oldVal) : "—";
    var newStr = item.newVal != null ? String(typeof item.newVal === "object" ? JSON.stringify(item.newVal) : item.newVal) : "null";
    html.push('<div class="ce-pending-item">' + esc(BUCKET_LABELS[item.bucket] || item.bucket) + '.' + esc(item.id) + '.' + esc(fieldLabel(item.field)) + ': <span class="ce-old">' + esc(oldStr) + '</span> &#8594; <span class="ce-new">' + esc(newStr) + '</span></div>');
  });
  html.push('</div>');
  box.innerHTML = html.join("");
}

function extendDate(dateStr, months) {
  if (!dateStr) return "";
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function initCardEditor() {
  var sel = document.getElementById("card-editor-select");
  if (!sel) return;
  var cards = WB.cards || [];
  sel.innerHTML = cards.map(function(c) {
    return '<option value="' + esc(c.id) + '">' + esc((c.bank ? c.bank + " " : "") + (c.name || c.id)) + '</option>';
  }).join("");
  if (cards.length > 0) sel.value = cards[0].id;

  sel.addEventListener("change", function() { renderCardEditorContent(sel.value); });
  document.getElementById("card-editor-prev").addEventListener("click", function() {
    var idx = sel.selectedIndex;
    if (idx > 0) { sel.selectedIndex = idx - 1; renderCardEditorContent(sel.value); }
  });
  document.getElementById("card-editor-next").addEventListener("click", function() {
    var idx = sel.selectedIndex;
    if (idx < sel.options.length - 1) { sel.selectedIndex = idx + 1; renderCardEditorContent(sel.value); }
  });

  // Event delegation for card editor
  var content = document.getElementById("card-editor-content");
  if (content) content.addEventListener("click", function(e) {
    var target = e.target.closest("[data-action]");
    if (!target) return;
    var action = target.getAttribute("data-action");

    if (action === "inline-edit") {
      var bucket = target.getAttribute("data-bucket");
      var id = target.getAttribute("data-id");
      var field = target.getAttribute("data-field");
      var current = target.getAttribute("data-current") || "";
      var dtype = target.getAttribute("data-type") || "number";

      // Create inline input
      var input = document.createElement("input");
      input.className = "ce-field-input";
      input.type = dtype === "date" ? "date" : (dtype === "text" ? "text" : "text");
      input.value = current;
      target.replaceWith(input);
      input.focus();
      input.select();

      function commit() {
        var val = input.value.trim();
        if (val === current) {
          // Unchanged — just re-render without queuing anything
          renderCardEditorContent(sel.value);
          return;
        }
        // Parse value
        var parsed = val;
        if (dtype !== "date" && dtype !== "text") {
          var num = Number(val);
          if (!isNaN(num)) parsed = num;
        }
        // Queue edit
        ensureBucketPatch(bucket);
        if (!PENDING_EDITS[bucket][id]) PENDING_EDITS[bucket][id] = {};
        PENDING_EDITS[bucket][id][field] = parsed;
        refreshPendingPreview();
        renderCardEditorContent(sel.value);
        setEditorStatus("已修改 " + esc(id) + "." + esc(field), false);
      }

      input.addEventListener("blur", commit);
      input.addEventListener("keydown", function(ev) {
        if (ev.key === "Enter") { ev.preventDefault(); input.blur(); }
        if (ev.key === "Escape") { renderCardEditorContent(sel.value); }
      });
    }

    if (action === "extend-promo") {
      var mid = target.getAttribute("data-id");
      var fld = target.getAttribute("data-field");
      var cur = target.getAttribute("data-current");
      var months = parseInt(target.getAttribute("data-months"));
      var newDate = extendDate(cur, months);
      if (newDate && newDate !== cur) {
        ensureBucketPatch("modules");
        if (!PENDING_EDITS.modules[mid]) PENDING_EDITS.modules[mid] = {};
        PENDING_EDITS.modules[mid][fld] = newDate;
        refreshPendingPreview();
        renderCardEditorContent(sel.value);
        setEditorStatus("已延長 " + esc(mid) + " 至 " + newDate, false);
      }
    }

    if (action === "expire-now") {
      var mid2 = target.getAttribute("data-id");
      var fld2 = target.getAttribute("data-field");
      var today = new Date().toISOString().slice(0, 10);
      ensureBucketPatch("modules");
      if (!PENDING_EDITS.modules[mid2]) PENDING_EDITS.modules[mid2] = {};
      PENDING_EDITS.modules[mid2][fld2] = today;
      refreshPendingPreview();
      renderCardEditorContent(sel.value);
      setEditorStatus("已設定 " + esc(mid2) + " 過期", false);
    }
  });

  renderCardEditorContent(sel.value);
}

// ── Batch Operations ─────────────────────────────────────────────────────
function renderBatchOps() {
  var container = document.getElementById("batch-ops-content");
  if (!container) return;
  var entities = (WB.editor && WB.editor.entities) || {};
  var modules = entities.modules || {};
  var today = new Date().toISOString().slice(0, 10);

  // Find modules with promo end dates
  var promoModules = [];
  Object.keys(modules).forEach(function(mid) {
    var mod = modules[mid];
    if (!mod) return;
    var end = mod.valid_to || mod.promo_end;
    if (end) promoModules.push({ id: mid, end: end, field: mod.valid_to != null ? "valid_to" : "promo_end", desc: mod.desc || mid });
  });
  promoModules.sort(function(a, b) { return a.end.localeCompare(b.end); });

  // Group by quarter
  var expiringSoon = promoModules.filter(function(m) { return m.end >= today && m.end <= extendDate(today, 3); });
  var expired = promoModules.filter(function(m) { return m.end < today; });

  var html = [];
  function h(s) { html.push(s); }

  // Promo management
  h('<div class="batch-section">');
  h('<div class="batch-section-title">&#128197; 推廣日期管理</div>');

  if (expiringSoon.length > 0) {
    h('<div class="batch-row">');
    h('<span class="batch-count">' + expiringSoon.length + '</span> 個模組將在 3 個月內到期');
    if (IS_APP_MODE) {
      h('<button class="batch-btn" data-action="batch-extend" data-months="3" data-scope="expiring">全部延長 +3 月</button>');
      h('<button class="batch-btn" data-action="batch-extend" data-months="6" data-scope="expiring">全部延長 +6 月</button>');
    }
    h('</div>');
    h('<div style="font-size:11px;color:#6b7280;max-height:80px;overflow:auto;">');
    expiringSoon.forEach(function(m) {
      h('<div>' + esc(m.id) + ' — ' + esc(m.end) + '</div>');
    });
    h('</div>');
  }

  if (expired.length > 0) {
    h('<div class="batch-row" style="margin-top:8px;">');
    h('<span style="color:#9f1239;font-weight:600;">' + expired.length + '</span> 個模組已過期');
    h('</div>');
  }

  if (expiringSoon.length === 0 && expired.length === 0) {
    h('<div class="batch-row"><span class="small">所有推廣都在有效期內。</span></div>');
  }
  h('</div>');

  // Audit quick fixes
  var promoTypeIssues = (sum.promoTypeIssues || []);
  if (promoTypeIssues.length > 0) {
    h('<div class="batch-section">');
    h('<div class="batch-section-title">&#127991; Audit 快速修正</div>');
    h('<div class="batch-row">');
    h('<span class="batch-count">' + promoTypeIssues.length + '</span> 個 campaign 的 promo_type 需修正');
    if (IS_APP_MODE) {
      h('<button class="batch-btn primary" data-action="fix-all-promo-types">一鍵修正全部</button>');
    }
    h('</div>');
    h('</div>');
  }

  container.innerHTML = html.join("");

  // Batch event delegation
  container.addEventListener("click", function(e) {
    var target = e.target.closest("[data-action]");
    if (!target) return;
    var action = target.getAttribute("data-action");

    if (action === "batch-extend") {
      var months = parseInt(target.getAttribute("data-months"));
      var scope = target.getAttribute("data-scope");
      var targets = scope === "expiring" ? expiringSoon : promoModules;
      var count = 0;
      targets.forEach(function(m) {
        var newDate = extendDate(m.end, months);
        if (newDate && newDate !== m.end) {
          ensureBucketPatch("modules");
          if (!PENDING_EDITS.modules[m.id]) PENDING_EDITS.modules[m.id] = {};
          PENDING_EDITS.modules[m.id][m.field] = newDate;
          count++;
        }
      });
      refreshPendingPreview();
      var sel = document.getElementById("card-editor-select");
      if (sel) renderCardEditorContent(sel.value);
      setEditorStatus("已排隊延長 " + count + " 個模組 +" + months + " 個月。按儲存套用。", false);
      target.textContent = "&#10003; 已排隊 " + count + " 個";
      target.disabled = true;
    }

    if (action === "fix-all-promo-types") {
      promoTypeIssues.forEach(function(p) {
        if (p && p.campaignId && p.suggestedFix) queuePromoTypeFix(p.campaignId, p.suggestedFix);
      });
      target.textContent = "&#10003; 已排隊";
      target.disabled = true;
      setEditorStatus("已排隊 " + promoTypeIssues.length + " 個 promo_type 修正。", false);
    }
  });
}

const EDITOR_ALLOWED = (WB.editor && WB.editor.allowedFields) ? WB.editor.allowedFields : {};
const EDITOR_ENTITIES = (WB.editor && WB.editor.entities) ? WB.editor.entities : {};
// Now that EDITOR_ALLOWED is defined, initialize the field sets
_ALLOWED_MODULE_SET = new Set(EDITOR_ALLOWED.modules || []);
_ALLOWED_REGISTRY_SET = new Set(EDITOR_ALLOWED.campaignRegistry || []);

function makeEmptyPatch() {
  const out = {};
  Object.keys(EDITOR_ALLOWED).forEach((bucket) => { out[bucket] = {}; });
  return out;
}

let PENDING_EDITS = makeEmptyPatch();

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function setEditorStatus(msg, isErr) {
  const el = document.getElementById("editorStatus");
  if (!el) return;
  el.className = "status " + (isErr ? "err" : "ok");
  el.textContent = msg;
}

function initAppModeActions() {
  const saveBtn = document.getElementById("editor-save-repo");
  const saveGoldenBtn = document.getElementById("editor-save-repo-golden");
  if (!saveBtn || !saveGoldenBtn) return;
  if (IS_APP_MODE) return;
  saveBtn.disabled = true;
  saveGoldenBtn.disabled = true;
  saveBtn.title = "Use app mode: node tools/workbench.js serve";
  saveGoldenBtn.title = "Use app mode: node tools/workbench.js serve";
}

function jsStr(input) {
  return "'" + String(input ?? "")
    .replaceAll("\\\\", "\\\\\\\\")
    .replaceAll("'", "\\'")
    + "'";
}

function toJsonPreview(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (_) {
    return String(value);
  }
}

function ensureBucketPatch(bucket) {
  if (!PENDING_EDITS[bucket] || typeof PENDING_EDITS[bucket] !== "object" || Array.isArray(PENDING_EDITS[bucket])) {
    PENDING_EDITS[bucket] = {};
  }
  return PENDING_EDITS[bucket];
}

function clearEmptyEntry(bucket, id) {
  const bucketPatch = ensureBucketPatch(bucket);
  const patch = bucketPatch[id];
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    delete bucketPatch[id];
    return;
  }
  if (Object.keys(patch).length === 0) delete bucketPatch[id];
}

function buildExportEdits() {
  const out = {};
  Object.keys(EDITOR_ALLOWED).forEach((bucket) => {
    const bucketPatch = PENDING_EDITS[bucket];
    if (!bucketPatch || typeof bucketPatch !== "object" || Array.isArray(bucketPatch)) return;
    const ids = Object.keys(bucketPatch).filter((id) => {
      const patch = bucketPatch[id];
      return patch && typeof patch === "object" && !Array.isArray(patch) && Object.keys(patch).length > 0;
    });
    if (ids.length === 0) return;
    out[bucket] = {};
    ids.forEach((id) => {
      out[bucket][id] = bucketPatch[id];
    });
  });
  return out;
}

function refreshPendingPreview() {
  const pre = document.getElementById("editor-pending");
  const countEl = document.getElementById("editor-patch-count");
  if (!pre || !countEl) return;
  const exported = buildExportEdits();
  let count = 0;
  Object.keys(exported).forEach((bucket) => { count += Object.keys(exported[bucket] || {}).length; });
  countEl.textContent = String(count);
  pre.textContent = count > 0 ? toJsonPreview(exported) : "{}";
}

function getBucketIds(bucket) {
  const entities = EDITOR_ENTITIES[bucket];
  if (!entities || typeof entities !== "object" || Array.isArray(entities)) return [];
  return Object.keys(entities).sort();
}

function getAllowedFields(bucket) {
  const fields = EDITOR_ALLOWED[bucket];
  return Array.isArray(fields) ? fields.slice() : [];
}

function getCurrentEntity(bucket, id) {
  const entities = EDITOR_ENTITIES[bucket];
  if (!entities || typeof entities !== "object") return null;
  const obj = entities[id];
  return (obj && typeof obj === "object") ? obj : null;
}

function refreshEditorCurrentPreview() {
  const pre = document.getElementById("editor-current");
  const bucketSel = document.getElementById("editor-bucket");
  const idSel = document.getElementById("editor-id");
  if (!pre || !bucketSel || !idSel) return;
  const entity = getCurrentEntity(bucketSel.value, idSel.value);
  pre.textContent = entity ? toJsonPreview(entity) : "{}";
}

function formatInlineValue(v) {
  if (v === undefined) return '<span class="small">-</span>';
  if (v === null) return '<span class="mono">null</span>';
  let raw = (typeof v === "string") ? v : toJsonPreview(v);
  raw = raw.replaceAll("\\n", " ").replaceAll("\\r", " ").replaceAll("\\t", " ");
  raw = raw.trim();
  if (raw.length > 90) raw = raw.slice(0, 87) + "...";
  return '<span class="mono">' + esc(raw) + '</span>';
}

function getEntryPatch(bucket, id) {
  const bucketPatch = PENDING_EDITS[bucket];
  if (!bucketPatch || typeof bucketPatch !== "object" || Array.isArray(bucketPatch)) return {};
  const entryPatch = bucketPatch[id];
  if (!entryPatch || typeof entryPatch !== "object" || Array.isArray(entryPatch)) return {};
  return entryPatch;
}

function renderQuickFieldTable() {
  const table = document.getElementById("editor-quick-table");
  const bucketSel = document.getElementById("editor-bucket");
  const idSel = document.getElementById("editor-id");
  if (!table || !bucketSel || !idSel) return;
  const bucket = bucketSel.value;
  const id = idSel.value;
  const fields = getAllowedFields(bucket);
  const entity = getCurrentEntity(bucket, id) || {};
  const entryPatch = getEntryPatch(bucket, id);
  const thead = "<thead><tr><th>Field</th><th>Current</th><th>Pending</th><th>Actions</th></tr></thead>";
  const body = fields.map((field) => {
    const hasPending = Object.prototype.hasOwnProperty.call(entryPatch, field);
    const pendingVal = hasPending ? entryPatch[field] : undefined;
    return "<tr>"
      + '<td><span class="mono">' + esc(field) + "</span></td>"
      + "<td>" + formatInlineValue(entity[field]) + "</td>"
      + "<td>" + formatInlineValue(pendingVal) + "</td>"
      + '<td class="q-actions">'
      + '<button class="edit-btn" onclick="quickSetField(' + jsStr(field) + ')">Set</button> '
      + '<button class="edit-btn" onclick="quickDeleteField(' + jsStr(field) + ')">Delete</button>'
      + "</td>"
      + "</tr>";
  }).join("");
  table.innerHTML = thead + "<tbody>" + body + "</tbody>";
}

function refreshIdOptions(preferredId) {
  const bucketSel = document.getElementById("editor-bucket");
  const idSel = document.getElementById("editor-id");
  if (!bucketSel || !idSel) return;
  const bucket = bucketSel.value;
  const ids = getBucketIds(bucket);
  const nextId = (preferredId && ids.includes(preferredId))
    ? preferredId
    : (ids.includes(idSel.value) ? idSel.value : (ids[0] || ""));
  idSel.innerHTML = ids.map((id) => '<option value="' + esc(id) + '">' + esc(id) + '</option>').join("");
  idSel.value = nextId || "";
}

function refreshFieldOptions(preferredField) {
  const bucketSel = document.getElementById("editor-bucket");
  const fieldSel = document.getElementById("editor-field");
  if (!bucketSel || !fieldSel) return;
  const bucket = bucketSel.value;
  const fields = getAllowedFields(bucket);
  const nextField = (preferredField && fields.includes(preferredField))
    ? preferredField
    : (fields.includes(fieldSel.value) ? fieldSel.value : (fields[0] || ""));
  fieldSel.innerHTML = fields.map((field) => '<option value="' + esc(field) + '">' + esc(field) + '</option>').join("");
  fieldSel.value = nextField || "";
}

function parseEditorValue(rawInput) {
  const raw = String(rawInput ?? "");
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  const jsonLike = /^[\\[{"]/.test(trimmed)
    || trimmed === "true"
    || trimmed === "false"
    || trimmed === "null"
    || /^-?\\d+(\\.\\d+)?([eE][+-]?\\d+)?$/.test(trimmed);
  if (!jsonLike) return raw;
  try {
    return JSON.parse(trimmed);
  } catch (err) {
    throw new Error("JSON parse failed: " + err.message);
  }
}

function loadCurrentFieldValue() {
  const bucketSel = document.getElementById("editor-bucket");
  const idSel = document.getElementById("editor-id");
  const fieldSel = document.getElementById("editor-field");
  const valueEl = document.getElementById("editor-value");
  if (!bucketSel || !idSel || !fieldSel || !valueEl) return;
  const entity = getCurrentEntity(bucketSel.value, idSel.value);
  const val = entity ? entity[fieldSel.value] : undefined;
  if (val === undefined) {
    valueEl.value = "";
    setEditorStatus("Current value is empty.", false);
    return;
  }
  valueEl.value = (typeof val === "string") ? val : toJsonPreview(val);
  setEditorStatus("Loaded current value.", false);
}

function queueFieldPatch() {
  const bucketSel = document.getElementById("editor-bucket");
  const idSel = document.getElementById("editor-id");
  const fieldSel = document.getElementById("editor-field");
  const valueEl = document.getElementById("editor-value");
  const deleteFieldEl = document.getElementById("editor-delete-field");
  if (!bucketSel || !idSel || !fieldSel || !valueEl || !deleteFieldEl) return;
  const bucket = bucketSel.value;
  const id = idSel.value;
  const field = fieldSel.value;
  if (!bucket || !id || !field) {
    setEditorStatus("Bucket/ID/Field is required.", true);
    return;
  }
  const allowed = getAllowedFields(bucket);
  if (!allowed.includes(field)) {
    setEditorStatus("Field is not allowed for this bucket.", true);
    return;
  }

  const bucketPatch = ensureBucketPatch(bucket);
  if (!bucketPatch[id] || typeof bucketPatch[id] !== "object" || Array.isArray(bucketPatch[id])) {
    bucketPatch[id] = {};
  }
  if (bucketPatch[id].__delete === true) delete bucketPatch[id].__delete;

  if (deleteFieldEl.checked) {
    bucketPatch[id][field] = null;
  } else {
    let parsed;
    try {
      parsed = parseEditorValue(valueEl.value);
    } catch (err) {
      setEditorStatus(String(err.message || err), true);
      return;
    }
    bucketPatch[id][field] = parsed;
  }
  clearEmptyEntry(bucket, id);
  refreshPendingPreview();
  renderQuickFieldTable();
  refreshCardReviewIfVisible();
  setEditorStatus(deleteFieldEl.checked ? "Field delete queued (set to null)." : "Field patch queued.", false);
  deleteFieldEl.checked = false;
}

function queueDeleteFieldPatch() {
  const deleteFieldEl = document.getElementById("editor-delete-field");
  if (!deleteFieldEl) return;
  deleteFieldEl.checked = true;
  queueFieldPatch();
}

function loadEntryPatchJson() {
  const bucketSel = document.getElementById("editor-bucket");
  const idSel = document.getElementById("editor-id");
  const input = document.getElementById("editor-entry-patch");
  if (!bucketSel || !idSel || !input) return;
  const entryPatch = getEntryPatch(bucketSel.value, idSel.value);
  const out = {};
  Object.keys(entryPatch).forEach((field) => {
    if (field === "__delete") return;
    out[field] = entryPatch[field];
  });
  input.value = Object.keys(out).length > 0 ? toJsonPreview(out) : "{}";
  setEditorStatus("Loaded pending entry patch.", false);
}

function queueEntryPatchFromJson() {
  const bucketSel = document.getElementById("editor-bucket");
  const idSel = document.getElementById("editor-id");
  const input = document.getElementById("editor-entry-patch");
  if (!bucketSel || !idSel || !input) return;
  const bucket = bucketSel.value;
  const id = idSel.value;
  if (!bucket || !id) {
    setEditorStatus("Bucket/ID is required.", true);
    return;
  }
  const raw = String(input.value || "").trim();
  if (!raw) {
    setEditorStatus("Bulk patch JSON is empty.", true);
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    setEditorStatus("Bulk patch parse failed: " + (err.message || String(err)), true);
    return;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    setEditorStatus("Bulk patch must be a JSON object.", true);
    return;
  }

  const allowedSet = new Set(getAllowedFields(bucket));
  const bucketPatch = ensureBucketPatch(bucket);
  if (!bucketPatch[id] || typeof bucketPatch[id] !== "object" || Array.isArray(bucketPatch[id])) {
    bucketPatch[id] = {};
  }
  if (bucketPatch[id].__delete === true) delete bucketPatch[id].__delete;

  let applied = 0;
  const skipped = [];
  Object.keys(parsed).forEach((field) => {
    if (!allowedSet.has(field)) {
      skipped.push(field);
      return;
    }
    bucketPatch[id][field] = parsed[field];
    applied += 1;
  });

  clearEmptyEntry(bucket, id);
  refreshPendingPreview();
  renderQuickFieldTable();
  refreshCardReviewIfVisible();
  refreshEditorCurrentPreview();
  if (applied === 0) {
    setEditorStatus("No allowed fields in bulk patch.", true);
    return;
  }
  if (skipped.length > 0) {
    setEditorStatus("Bulk patch queued: " + applied + " field(s). Skipped: " + skipped.join(", "), false);
    return;
  }
  setEditorStatus("Bulk patch queued: " + applied + " field(s).", false);
}

function clearEntryPatch() {
  const bucketSel = document.getElementById("editor-bucket");
  const idSel = document.getElementById("editor-id");
  if (!bucketSel || !idSel) return;
  const bucketPatch = ensureBucketPatch(bucketSel.value);
  delete bucketPatch[idSel.value];
  refreshPendingPreview();
  renderQuickFieldTable();
  refreshCardReviewIfVisible();
  setEditorStatus("Entry patch cleared.", false);
}

function queueEntryDelete() {
  const bucketSel = document.getElementById("editor-bucket");
  const idSel = document.getElementById("editor-id");
  if (!bucketSel || !idSel) return;
  const bucketPatch = ensureBucketPatch(bucketSel.value);
  bucketPatch[idSel.value] = { __delete: true };
  refreshPendingPreview();
  renderQuickFieldTable();
  refreshCardReviewIfVisible();
  setEditorStatus("Entry delete queued (__delete:true).", false);
}

function undoEntryDelete() {
  const bucketSel = document.getElementById("editor-bucket");
  const idSel = document.getElementById("editor-id");
  if (!bucketSel || !idSel) return;
  const bucketPatch = ensureBucketPatch(bucketSel.value);
  if (!bucketPatch[idSel.value] || typeof bucketPatch[idSel.value] !== "object") {
    setEditorStatus("No queued entry patch to undo.", false);
    return;
  }
  if (bucketPatch[idSel.value].__delete === true) {
    delete bucketPatch[idSel.value].__delete;
    clearEmptyEntry(bucketSel.value, idSel.value);
    refreshPendingPreview();
    renderQuickFieldTable();
    refreshCardReviewIfVisible();
    setEditorStatus("Entry delete removed.", false);
    return;
  }
  setEditorStatus("Selected entry is not marked for delete.", false);
}

function normalizeImportedPatch(raw) {
  const base = makeEmptyPatch();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  Object.keys(EDITOR_ALLOWED).forEach((bucket) => {
    const srcBucket = raw[bucket];
    if (!srcBucket || typeof srcBucket !== "object" || Array.isArray(srcBucket)) return;
    base[bucket] = {};
    Object.keys(srcBucket).forEach((id) => {
      const srcPatch = srcBucket[id];
      if (!srcPatch || typeof srcPatch !== "object" || Array.isArray(srcPatch)) return;
      const nextPatch = {};
      if (srcPatch.__delete === true) {
        nextPatch.__delete = true;
      } else {
        const allowedSet = new Set(getAllowedFields(bucket));
        Object.keys(srcPatch).forEach((field) => {
          if (!allowedSet.has(field)) return;
          nextPatch[field] = srcPatch[field];
        });
      }
      if (Object.keys(nextPatch).length > 0) {
        base[bucket][id] = nextPatch;
      }
    });
  });
  return base;
}

function downloadEditsJson() {
  const data = buildExportEdits();
  const text = toJsonPreview(data);
  const blob = new Blob([text + "\\\\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "workbench_edits.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  setEditorStatus("Downloaded workbench_edits.json.", false);
}

async function copyEditsJson() {
  const data = buildExportEdits();
  const text = toJsonPreview(data);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      setEditorStatus("Copied edits JSON to clipboard.", false);
      return;
    }
  } catch (_) {}
  setEditorStatus("Clipboard API unavailable. Please use Download.", true);
}

async function copyApplyCommand() {
  const cmd = "pbpaste | node tools/workbench.js apply --edits - && node tools/run_golden_cases.js";
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(cmd);
      setEditorStatus("Copied apply command for macOS.", false);
      return;
    }
  } catch (_) {}
  setEditorStatus("Clipboard API unavailable. Copy command manually.", true);
}

async function saveToRepo(runGolden) {
  if (!IS_APP_MODE) {
    setEditorStatus("Save To Repo requires app mode: node tools/workbench.js serve", true);
    return;
  }
  const edits = buildExportEdits();
  const saveBtn = document.getElementById("editor-save-repo");
  const saveGoldenBtn = document.getElementById("editor-save-repo-golden");
  if (saveBtn) saveBtn.disabled = true;
  if (saveGoldenBtn) saveGoldenBtn.disabled = true;
  setEditorStatus("Saving to repo...", false);
  try {
    const resp = await fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edits, runGolden: !!runGolden })
    });
    const payload = await resp.json();
    if (!resp.ok || !payload || payload.ok !== true) {
      const errMsg = (payload && payload.error) ? payload.error : "Unknown save failure";
      setEditorStatus("Save failed: " + errMsg, true);
      return;
    }
    const warnings = Array.isArray(payload.warnings) ? payload.warnings : [];
    if (payload.golden && payload.golden.ok === false) {
      setEditorStatus("Saved, but golden failed. Check terminal output.", true);
      return;
    }
    if (payload.golden && payload.golden.ok === true) {
      setEditorStatus("Saved (" + payload.touched + " entries) and golden passed.", false);
      return;
    }
    if (warnings.length > 0) {
      setEditorStatus("Saved (" + payload.touched + " entries) with " + warnings.length + " warning(s).", false);
      return;
    }
    setEditorStatus("Saved to repo (" + payload.touched + " entries).", false);
  } catch (err) {
    setEditorStatus("Save failed: " + (err && err.message ? err.message : String(err)), true);
  } finally {
    if (saveBtn) saveBtn.disabled = false;
    if (saveGoldenBtn) saveGoldenBtn.disabled = false;
  }
}

function handleImportEditsFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const raw = JSON.parse(String(ev.target && ev.target.result ? ev.target.result : "{}"));
      PENDING_EDITS = normalizeImportedPatch(raw);
      refreshPendingPreview();
      renderQuickFieldTable();
      refreshCardReviewIfVisible();
      setEditorStatus("Imported edits JSON.", false);
    } catch (err) {
      setEditorStatus("Import failed: " + (err.message || String(err)), true);
    }
  };
  reader.onerror = () => {
    setEditorStatus("Import failed: unable to read file.", true);
  };
  reader.readAsText(file);
}

function resetPendingEdits() {
  PENDING_EDITS = makeEmptyPatch();
  refreshPendingPreview();
  renderQuickFieldTable();
  refreshCardReviewIfVisible();
  setEditorStatus("Pending edits reset.", false);
}

window.quickSetField = function (field) {
  const fieldSel = document.getElementById("editor-field");
  const valueEl = document.getElementById("editor-value");
  const deleteFieldEl = document.getElementById("editor-delete-field");
  if (!fieldSel || !valueEl || !deleteFieldEl) return;
  fieldSel.value = String(field || "");
  loadCurrentFieldValue();
  const next = window.prompt("Set value for " + field + " (text or JSON)", valueEl.value);
  if (next === null) {
    setEditorStatus("Quick edit cancelled.", false);
    return;
  }
  valueEl.value = next;
  deleteFieldEl.checked = false;
  queueFieldPatch();
};

window.quickDeleteField = function (field) {
  const fieldSel = document.getElementById("editor-field");
  if (!fieldSel) return;
  fieldSel.value = String(field || "");
  queueDeleteFieldPatch();
};

function setEditorTarget(bucket, id, field) {
  const bucketSel = document.getElementById("editor-bucket");
  if (!bucketSel) return false;
  const bucketKey = String(bucket || "");
  if (!EDITOR_ALLOWED[bucketKey]) {
    setEditorStatus("Unknown bucket: " + bucketKey, true);
    return false;
  }
  bucketSel.value = bucketKey;
  refreshIdOptions(String(id || ""));
  refreshFieldOptions(field ? String(field) : undefined);
  refreshEditorCurrentPreview();
  loadCurrentFieldValue();
  renderQuickFieldTable();
  return true;
}

window.reviewSetField = function (bucket, id, field) {
  if (!setEditorTarget(bucket, id, field)) return;
  const valueEl = document.getElementById("editor-value");
  const deleteFieldEl = document.getElementById("editor-delete-field");
  if (!valueEl || !deleteFieldEl) return;
  const next = window.prompt(
    "Set " + String(field || "") + " (" + String(bucket || "") + ":" + String(id || "") + ")",
    valueEl.value
  );
  if (next === null) {
    setEditorStatus("Review edit cancelled.", false);
    return;
  }
  valueEl.value = next;
  deleteFieldEl.checked = false;
  queueFieldPatch();
};

window.reviewDeleteField = function (bucket, id, field) {
  if (!setEditorTarget(bucket, id, field)) return;
  const deleteFieldEl = document.getElementById("editor-delete-field");
  if (!deleteFieldEl) return;
  const ok = window.confirm("Delete field " + String(field || "") + " from " + String(bucket || "") + ":" + String(id || "") + "?");
  if (!ok) return;
  deleteFieldEl.checked = true;
  queueFieldPatch();
};

window.openEditor = function (bucket, id, shouldScroll) {
  const bucketSel = document.getElementById("editor-bucket");
  if (!bucketSel) return;
  const bucketKey = String(bucket || "");
  if (!EDITOR_ALLOWED[bucketKey]) {
    setEditorStatus("Unknown bucket: " + bucketKey, true);
    return;
  }
  bucketSel.value = bucketKey;
  refreshIdOptions(String(id || ""));
  refreshFieldOptions();
  refreshEditorCurrentPreview();
  loadCurrentFieldValue();
  renderQuickFieldTable();
  setEditorStatus("Selected " + bucketKey + ":" + id + ".", false);
  const idSel = document.getElementById("editor-id");
  if (shouldScroll !== false && idSel) idSel.scrollIntoView({ behavior: "smooth", block: "center" });
};

function initEditor() {
  const bucketSel = document.getElementById("editor-bucket");
  if (!bucketSel) return;
  const buckets = Object.keys(EDITOR_ALLOWED);
  bucketSel.innerHTML = buckets.map((bucket) => '<option value="' + esc(bucket) + '">' + esc(bucket) + "</option>").join("");
  if (buckets.length > 0) bucketSel.value = buckets[0];
  refreshIdOptions();
  refreshFieldOptions();
  refreshEditorCurrentPreview();
  loadCurrentFieldValue();
  refreshPendingPreview();
  renderQuickFieldTable();
  initAppModeActions();

  bucketSel.addEventListener("change", () => {
    refreshIdOptions();
    refreshFieldOptions();
    refreshEditorCurrentPreview();
    loadCurrentFieldValue();
    renderQuickFieldTable();
  });
  document.getElementById("editor-id").addEventListener("change", () => {
    refreshEditorCurrentPreview();
    loadCurrentFieldValue();
    renderQuickFieldTable();
  });
  document.getElementById("editor-field").addEventListener("change", () => {
    loadCurrentFieldValue();
  });
  document.getElementById("editor-load").addEventListener("click", loadCurrentFieldValue);
  document.getElementById("editor-set").addEventListener("click", queueFieldPatch);
  document.getElementById("editor-delete-field-btn").addEventListener("click", queueDeleteFieldPatch);
  document.getElementById("editor-clear-entry").addEventListener("click", clearEntryPatch);
  document.getElementById("editor-save-repo").addEventListener("click", () => saveToRepo(false));
  document.getElementById("editor-save-repo-golden").addEventListener("click", () => saveToRepo(true));
  document.getElementById("editor-load-entry").addEventListener("click", loadEntryPatchJson);
  document.getElementById("editor-merge-entry").addEventListener("click", queueEntryPatchFromJson);
  document.getElementById("editor-reset").addEventListener("click", resetPendingEdits);
}

function toArray(input) {
  return Array.isArray(input) ? input : [];
}

function cardLabel(card) {
  if (!card) return "";
  const name = String(card.name || card.id || "");
  const bank = String(card.bank || "");
  return bank ? (name + " (" + bank + ")") : name;
}

function renderReviewEntityFieldTable(bucket, id) {
  const allowed = getAllowedFields(bucket);
  const entity = getCurrentEntity(bucket, id) || {};
  const entryPatch = getEntryPatch(bucket, id);
  if (!Array.isArray(allowed) || allowed.length === 0) {
    return '<div class="review-empty">No editable fields.</div>';
  }
  const rows = allowed.map((field) => {
    const hasPending = Object.prototype.hasOwnProperty.call(entryPatch, field);
    const pendingVal = hasPending ? entryPatch[field] : undefined;
    return "<tr>"
      + '<td><span class="mono">' + esc(field) + "</span></td>"
      + "<td>" + formatInlineValue(entity[field]) + "</td>"
      + "<td>" + formatInlineValue(pendingVal) + "</td>"
      + '<td class="review-actions">'
      + '<button class="edit-btn" onclick="reviewSetField(' + jsStr(bucket) + ',' + jsStr(id) + ',' + jsStr(field) + ')">Set</button> '
      + '<button class="edit-btn" onclick="reviewDeleteField(' + jsStr(bucket) + ',' + jsStr(id) + ',' + jsStr(field) + ')">Delete</button>'
      + "</td>"
      + "</tr>";
  }).join("");
  return '<div class="table-wrap"><table class="review-table">'
    + "<thead><tr><th>Field</th><th>Current</th><th>Pending</th><th>Actions</th></tr></thead>"
    + "<tbody>" + rows + "</tbody>"
    + "</table></div>";
}

function buildCardReviewGroups(card, offers) {
  const moduleEntities = (WB.editor && WB.editor.entities && WB.editor.entities.modules) ? WB.editor.entities.modules : {};
  const trackerEntities = (WB.editor && WB.editor.entities && WB.editor.entities.trackers) ? WB.editor.entities.trackers : {};
  const trackerMap = {};
  toArray(WB.trackers).forEach((t) => { if (t && t.id) trackerMap[t.id] = t; });

  const groups = {
    card: [],
    modules: [],
    trackers: [],
    offerSources: []
  };
  const seen = {};
  const pushEntity = (groupKey, bucket, id, title, subtitle) => {
    if (!bucket || !id || !EDITOR_ALLOWED[bucket]) return;
    const key = bucket + ":" + id;
    if (seen[key]) return;
    seen[key] = true;
    groups[groupKey].push({
      bucket,
      id,
      title: title || id,
      subtitle: subtitle || ""
    });
  };

  pushEntity("card", "cards", card.id, card.id, cardLabel(card));

  toArray(card.rewardModules).forEach((id) => {
    const mod = moduleEntities[id] || {};
    const rate = Number.isFinite(Number(mod.rate)) ? ("rate=" + mod.rate)
      : (Number.isFinite(Number(mod.rate_per_x)) ? ("rate_per_x=" + mod.rate_per_x)
        : (Number.isFinite(Number(mod.multiplier)) ? ("multiplier=" + mod.multiplier) : ""));
    const cap = Number.isFinite(Number(mod.cap_limit)) ? ("cap=" + mod.cap_limit) : "";
    const mission = mod.req_mission_key
      ? (mod.req_mission_key + (Number.isFinite(Number(mod.req_mission_spend)) ? (">=" + mod.req_mission_spend) : ""))
      : "";
    const subtitle = [mod.desc || "", rate, cap, mission].filter(Boolean).join(" | ");
    pushEntity("modules", "modules", id, id, subtitle);
  });

  toArray(card.trackers).forEach((id) => {
    const t = trackerMap[id] || trackerEntities[id] || {};
    const subtitle = [t.desc || "", t.reqMissionKey || t.req_mission_key || "", t.missionId || t.mission_id || ""].filter(Boolean).join(" | ");
    pushEntity("trackers", "trackers", id, id, subtitle);
  });

  toArray(offers).forEach((offer) => {
    const bucket = offer.editBucket || "";
    const id = offer.editId || "";
    if (!bucket || !id) return;
    const subtitle = [offer.id || "", offer.title || "", offer.sourceType || "", offer.offerType || ""].filter(Boolean).join(" | ");
    pushEntity("offerSources", bucket, id, (offer.id || (bucket + ":" + id)) + " -> " + bucket + ":" + id, subtitle);
  });

  return groups;
}

function renderReviewEntityItem(entity) {
  const head = '<summary><div class="review-item-top">'
    + '<span class="review-item-title mono">' + esc(entity.title) + "</span>"
    + '<button class="edit-btn" onclick="openEditor(' + jsStr(entity.bucket) + ',' + jsStr(entity.id) + ')">Open Editor</button>'
    + "</div>"
    + '<div class="review-item-sub">' + esc(entity.subtitle || (entity.bucket + ":" + entity.id)) + "</div>"
    + "</summary>";
  const body = '<div class="review-entity-body">' + renderReviewEntityFieldTable(entity.bucket, entity.id) + "</div>";
  return '<details class="review-entity" open>' + head + body + "</details>";
}

function renderReviewGroup(title, entities) {
  const body = (!Array.isArray(entities) || entities.length === 0)
    ? '<div class="review-empty">None</div>'
    : entities.map((entity) => renderReviewEntityItem(entity)).join("");
  return '<div class="review-block">'
    + '<h4 class="review-group-title">' + esc(title) + ' <span class="small">(' + esc((entities || []).length) + ")</span></h4>"
    + body
    + "</div>";
}

function renderCardReviewSections(card) {
  const contentEl = document.getElementById("card-review-content");
  if (!contentEl) return;
  if (!card) {
    contentEl.innerHTML = '<div class="review-empty">No card selected.</div>';
    return;
  }

  const offers = toArray(WB.offers).filter((offer) => toArray(offer.cards).includes(card.id));
  const groups = buildCardReviewGroups(card, offers);
  contentEl.innerHTML = [
    renderReviewGroup("Card", groups.card),
    renderReviewGroup("Modules", groups.modules),
    renderReviewGroup("Trackers", groups.trackers),
    renderReviewGroup("Offer Sources", groups.offerSources)
  ].join("");
}

function renderCardReviewMeta(card) {
  const metaEl = document.getElementById("card-review-meta");
  if (!metaEl) return;
  if (!card) {
    metaEl.innerHTML = "No card selected.";
    return;
  }
  const modulesCount = toArray(card.rewardModules).length;
  const trackersCount = toArray(card.trackers).length;
  const offersCount = toArray(WB.offers).filter((offer) => toArray(offer.cards).includes(card.id)).length;
  metaEl.innerHTML = 'Card <span class="mono">' + esc(card.id) + '</span> | Modules: <span class="mono">' +
    esc(modulesCount) + '</span> | Trackers: <span class="mono">' + esc(trackersCount) +
    '</span> | Related Offers: <span class="mono">' + esc(offersCount) + '</span>';
}

function getSelectedCardId() {
  const sel = document.getElementById("card-review-select");
  return sel ? String(sel.value || "") : "";
}

function refreshCardReviewIfVisible() {
  const sel = document.getElementById("card-review-select");
  if (!sel || !sel.value) return;
  renderCardReview(sel.value);
}

function getCardById(cardId) {
  return toArray(WB.cards).find((c) => c && c.id === cardId) || null;
}

function renderCardReview(cardId) {
  const sel = document.getElementById("card-review-select");
  if (!sel) return;
  const id = cardId || getSelectedCardId();
  if (id) sel.value = id;
  const card = getCardById(sel.value);
  renderCardReviewMeta(card);
  renderCardReviewSections(card);
}

window.reviewCard = function (cardId) {
  const sel = document.getElementById("card-review-select");
  if (!sel) return;
  if (cardId) sel.value = cardId;
  renderCardReview(sel.value);
  sel.scrollIntoView({ behavior: "smooth", block: "center" });
};

function stepCardReview(delta) {
  const sel = document.getElementById("card-review-select");
  if (!sel) return;
  const opts = toArray(Array.from(sel.options || []));
  const cur = opts.findIndex((o) => o.value === sel.value);
  if (cur < 0 || opts.length === 0) return;
  const next = Math.max(0, Math.min(opts.length - 1, cur + delta));
  sel.value = opts[next].value;
  renderCardReview(sel.value);
}

function initCardReview() {
  const sel = document.getElementById("card-review-select");
  if (!sel) return;
  const cards = toArray(WB.cards);
  sel.innerHTML = cards
    .map((card) => '<option value="' + esc(card.id) + '">' + esc(cardLabel(card)) + '</option>')
    .join("");
  if (cards.length > 0) sel.value = cards[0].id;

  sel.addEventListener("change", () => renderCardReview(sel.value));
  document.getElementById("card-review-prev").addEventListener("click", () => stepCardReview(-1));
  document.getElementById("card-review-next").addEventListener("click", () => stepCardReview(1));
  document.getElementById("card-review-edit-card").addEventListener("click", () => {
    const id = getSelectedCardId();
    if (!id) return;
    openEditor("cards", id);
  });
  renderCardReview(sel.value);
}

function setupTable({ inputId, tableId, countId, rows, columns, toSearch }) {
  const input = document.getElementById(inputId);
  const table = document.getElementById(tableId);
  const count = document.getElementById(countId);
  if (!input || !table || !count) return;
  const thead = "<thead><tr>" + columns.map(c => "<th>" + esc(c.title) + "</th>").join("") + "</tr></thead>";
  const render = () => {
    const q = (input.value || "").trim().toLowerCase();
    const filtered = rows.filter(r => toSearch(r).includes(q));
    const body = filtered.map((r) => "<tr>" + columns.map(c => "<td>" + c.render(r) + "</td>").join("") + "</tr>").join("");
    table.innerHTML = thead + "<tbody>" + body + "</tbody>";
    count.textContent = filtered.length + " / " + rows.length;
  };
  input.addEventListener("input", render);
  render();
}

setupTable({
  inputId: "q-offers",
  tableId: "table-offers",
  countId: "count-offers",
  rows: WB.offers || [],
  columns: [
    { title: "Offer", render: r => '<span class="mono">' + esc(r.id) + "</span>" },
    { title: "Edit", render: r => (r.editBucket && r.editId) ? ('<button class="edit-btn" onclick="openEditor(' + jsStr(r.editBucket) + ',' + jsStr(r.editId) + ')">Edit</button>') : '<span class="small">-</span>' },
    { title: "Title", render: r => text(r.title) },
    { title: "Source", render: r => text(r.sourceType) },
    { title: "Render", render: r => text(r.renderType) },
    { title: "Type", render: r => text(r.offerType) },
    { title: "Setting Key", render: r => text(r.settingKey) },
    { title: "Cards", render: r => pills(r.cards) },
    { title: "Module Refs", render: r => pills(r.moduleRefs) },
    { title: "Sections", render: r => text(r.sections) }
  ],
  toSearch: r => [
    r.id, r.title, r.sourceType, r.renderType, r.offerType, r.settingKey, r.sections,
    (r.cards || []).join(" "), (r.moduleRefs || []).join(" ")
  ].join(" ").toLowerCase()
});

setupTable({
  inputId: "q-cards",
  tableId: "table-cards",
  countId: "count-cards",
  rows: WB.cards || [],
  columns: [
    { title: "Card", render: r => '<span class="mono">' + esc(r.id) + "</span>" },
    { title: "Edit", render: r => '<button class="edit-btn" onclick="openEditor(' + jsStr("cards") + ',' + jsStr(r.id) + ')">Edit</button>' },
    { title: "Review", render: r => '<button class="ghost" onclick="reviewCard(' + jsStr(r.id) + ')">Review</button>' },
    { title: "Name", render: r => text(r.name) },
    { title: "Bank", render: r => text(r.bank) },
    { title: "Currency", render: r => text(r.currency) },
    { title: "Modules", render: r => pills(r.rewardModules) },
    { title: "Trackers", render: r => pills(r.trackers) }
  ],
  toSearch: r => [
    r.id, r.name, r.bank, r.currency, (r.rewardModules || []).join(" "), (r.trackers || []).join(" ")
  ].join(" ").toLowerCase()
});

setupTable({
  inputId: "q-categories",
  tableId: "table-categories",
  countId: "count-categories",
  rows: WB.categories || [],
  columns: [
    { title: "Category", render: r => '<span class="mono">' + esc(r.id) + "</span>" },
    { title: "Edit", render: r => '<button class="edit-btn" onclick="openEditor(' + jsStr("categories") + ',' + jsStr(r.id) + ')">Edit</button>' },
    { title: "Label", render: r => text(r.label) },
    { title: "Parent", render: r => text(r.parent) },
    { title: "Hidden", render: r => text(r.hidden ? "true" : "") }
  ],
  toSearch: r => [
    r.id, r.label, r.parent, r.hidden ? "true" : ""
  ].join(" ").toLowerCase()
});

setupTable({
  inputId: "q-trackers",
  tableId: "table-trackers",
  countId: "count-trackers",
  rows: WB.trackers || [],
  columns: [
    { title: "Tracker", render: r => '<span class="mono">' + esc(r.id) + "</span>" },
    { title: "Edit", render: r => '<button class="edit-btn" onclick="openEditor(' + jsStr("trackers") + ',' + jsStr(r.id) + ')">Edit</button>' },
    { title: "Desc", render: r => text(r.desc) },
    { title: "Req Mission Key", render: r => text(r.reqMissionKey) },
    { title: "Mission ID", render: r => text(r.missionId) },
    { title: "Cards", render: r => pills(r.cards) },
    { title: "Match", render: r => pills(r.match) }
  ],
  toSearch: r => [
    r.id, r.desc, r.reqMissionKey, r.missionId, (r.cards || []).join(" "), (r.match || []).join(" ")
  ].join(" ").toLowerCase()
});

initEditor();
initCardEditor();
renderBatchOps();

// ── New Promotion Wizard ──────────────────────────────────────────────────
function initWizard() {
  var navEl = document.getElementById("wizard-nav");
  var contentEl = document.getElementById("wizard-content");
  if (!navEl || !contentEl || !IS_APP_MODE) {
    if (contentEl) contentEl.innerHTML = '<div class="small" style="padding:8px;">Wizard requires app mode (node tools/workbench.js serve).</div>';
    return;
  }

  var categories = WB.categories || [];
  var cards = WB.cards || [];
  var modules = (WB.editor && WB.editor.entities && WB.editor.entities.modules) || {};

  var STEPS = ["選擇信用卡", "模組設定", "推廣活動 (選填)", "預覽 & 套用"];
  var currentStep = 0;

  // Wizard state
  var wiz = {
    cardId: cards.length > 0 ? cards[0].id : "",
    moduleId: "",
    desc: "",
    displayNameZhhk: "",
    rate: "",
    capLimit: "",
    capMode: "spending",
    matchCats: [],
    validFrom: new Date().toISOString().slice(0, 10),
    validTo: "",
    mode: "add",
    reqMissionKey: "",
    reqMissionSpend: "",
    tncUrl: "",
    promoUrl: "",
    createCampaign: false,
    campaignId: "",
    campaignName: "",
    campaignIcon: "fa-tag",
    campaignTheme: "#0d9488",
    promoType: "cap",
    regTncUrl: "",
    regPromoUrl: "",
    regRegistrationUrl: "",
    regRegistrationStart: "",
    regRegistrationEnd: ""
  };

  var ICONS = ["fa-tag", "fa-fire", "fa-plane", "fa-utensils", "fa-cart-shopping", "fa-gift", "fa-star", "fa-bolt", "fa-percent", "fa-globe"];
  var THEMES = ["#0d9488", "#7c3aed", "#dc2626", "#2563eb", "#d97706", "#059669", "#be185d", "#4f46e5"];

  function renderNav() {
    navEl.innerHTML = STEPS.map(function(s, i) {
      var cls = "wizard-nav-step";
      if (i === currentStep) cls += " active";
      else if (i < currentStep) cls += " done";
      return '<span class="' + cls + '">' + (i + 1) + '. ' + esc(s) + '</span>';
    }).join("");
  }

  function autoModuleId() {
    if (!wiz.cardId) return "";
    var suffix = wiz.matchCats.length > 0 ? wiz.matchCats[0] : "promo";
    var base = wiz.cardId + "_" + suffix + "_bonus";
    // Ensure unique
    var id = base;
    var n = 2;
    while (modules[id]) { id = base + "_" + n; n++; }
    return id;
  }

  function autoCampaignId() {
    if (!wiz.cardId) return "";
    var base = wiz.cardId + "_promo";
    var id = base;
    var campaigns = (WB.editor && WB.editor.entities && WB.editor.entities.campaigns) || {};
    var n = 2;
    while (campaigns[id]) { id = base + "_" + n; n++; }
    return id;
  }

  function inferPromoType() {
    if (wiz.reqMissionKey && wiz.capLimit) return "mission_cap";
    if (wiz.reqMissionKey) return "mission";
    if (wiz.capLimit) return "cap";
    return "custom";
  }

  function renderStep() {
    renderNav();
    var html = [];
    function h(s) { html.push(s); }

    if (currentStep === 0) {
      // Step 1: Select Card
      h('<div class="wizard-panel">');
      h('<div class="wizard-step-title">&#9312; 選擇信用卡</div>');
      h('<div class="wizard-form-row">');
      h('<label>信用卡</label>');
      h('<select id="wiz-card">');
      cards.forEach(function(c) {
        h('<option value="' + esc(c.id) + '"' + (c.id === wiz.cardId ? ' selected' : '') + '>' + esc((c.bank ? c.bank + " " : "") + (c.name || c.id)) + '</option>');
      });
      h('</select>');
      h('</div>');
      h('<div class="wizard-actions">');
      h('<button class="primary" data-action="wiz-next">下一步 &#9654;</button>');
      h('</div>');
      h('</div>');
    }

    if (currentStep === 1) {
      // Step 2: Module Details
      wiz.moduleId = wiz.moduleId || autoModuleId();
      h('<div class="wizard-panel">');
      h('<div class="wizard-step-title">&#9313; 模組設定</div>');

      h('<div class="wizard-form-row">');
      h('<label>模組 ID</label>');
      h('<input type="text" id="wiz-module-id" value="' + esc(wiz.moduleId) + '" placeholder="auto-generated">');
      h('</div>');

      h('<div class="wizard-form-row">');
      h('<label>描述 (desc)</label>');
      h('<input type="text" id="wiz-desc" value="' + esc(wiz.desc) + '" placeholder="e.g. 海外消費額外5%回贈">');
      h('</div>');

      h('<div class="wizard-form-row">');
      h('<label>顯示名稱 (中文)</label>');
      h('<input type="text" id="wiz-display-name" value="' + esc(wiz.displayNameZhhk) + '" placeholder="Optional Chinese display name">');
      h('</div>');

      h('<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">');
      h('<div class="wizard-form-row">');
      h('<label>回贈率 (rate)</label>');
      h('<input type="number" id="wiz-rate" value="' + esc(wiz.rate) + '" step="0.001" placeholder="e.g. 0.05 for 5%">');
      h('</div>');
      h('<div class="wizard-form-row">');
      h('<label>回贈上限 (cap_limit)</label>');
      h('<input type="number" id="wiz-cap-limit" value="' + esc(wiz.capLimit) + '" placeholder="e.g. 500">');
      h('</div>');
      h('</div>');

      h('<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">');
      h('<div class="wizard-form-row">');
      h('<label>上限模式 (cap_mode)</label>');
      h('<select id="wiz-cap-mode">');
      h('<option value="spending"' + (wiz.capMode === "spending" ? ' selected' : '') + '>以消費額計 (spending)</option>');
      h('<option value="reward"' + (wiz.capMode === "reward" ? ' selected' : '') + '>以回贈額計 (reward)</option>');
      h('</select>');
      h('</div>');
      h('<div class="wizard-form-row">');
      h('<label>模式 (mode)</label>');
      h('<select id="wiz-mode">');
      h('<option value="add"' + (wiz.mode === "add" ? ' selected' : '') + '>疊加 (add)</option>');
      h('<option value="replace"' + (wiz.mode === "replace" ? ' selected' : '') + '>取代基本 (replace)</option>');
      h('</select>');
      h('</div>');
      h('</div>');

      h('<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">');
      h('<div class="wizard-form-row">');
      h('<label>開始日期</label>');
      h('<input type="date" id="wiz-valid-from" value="' + esc(wiz.validFrom) + '">');
      h('</div>');
      h('<div class="wizard-form-row">');
      h('<label>結束日期</label>');
      h('<input type="date" id="wiz-valid-to" value="' + esc(wiz.validTo) + '">');
      h('</div>');
      h('</div>');

      h('<div class="wizard-form-row">');
      h('<label>消費類別 (match)</label>');
      h('<div class="wizard-cat-grid" id="wiz-cat-grid">');
      categories.forEach(function(c) {
        var sel = wiz.matchCats.indexOf(c.id) >= 0 ? " selected" : "";
        h('<span class="wizard-cat-chip' + sel + '" data-action="wiz-toggle-cat" data-cat="' + esc(c.id) + '">' + esc(c.label || c.id) + '</span>');
      });
      h('</div>');
      h('</div>');

      h('<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">');
      h('<div class="wizard-form-row">');
      h('<label>達標 Key (optional)</label>');
      h('<input type="text" id="wiz-mission-key" value="' + esc(wiz.reqMissionKey) + '" placeholder="e.g. spend_card_total">');
      h('</div>');
      h('<div class="wizard-form-row">');
      h('<label>達標門檻 (optional)</label>');
      h('<input type="number" id="wiz-mission-spend" value="' + esc(wiz.reqMissionSpend) + '" placeholder="e.g. 3000">');
      h('</div>');
      h('</div>');

      h('<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">');
      h('<div class="wizard-form-row">');
      h('<label>條款連結 (tnc_url)</label>');
      h('<input type="url" id="wiz-tnc-url" value="' + esc(wiz.tncUrl) + '" placeholder="https://...">');
      h('</div>');
      h('<div class="wizard-form-row">');
      h('<label>推廣連結 (promo_url)</label>');
      h('<input type="url" id="wiz-promo-url" value="' + esc(wiz.promoUrl) + '" placeholder="https://...">');
      h('</div>');
      h('</div>');

      h('<div class="wizard-actions">');
      h('<button class="ghost" data-action="wiz-prev">&#9664; 上一步</button>');
      h('<button class="primary" data-action="wiz-next">下一步 &#9654;</button>');
      h('</div>');
      h('</div>');
    }

    if (currentStep === 2) {
      // Step 3: Campaign (optional)
      wiz.promoType = inferPromoType();
      wiz.campaignId = wiz.campaignId || autoCampaignId();
      h('<div class="wizard-panel">');
      h('<div class="wizard-step-title">&#9314; 推廣活動 (選填)</div>');

      h('<div class="wizard-form-row">');
      h('<label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="wiz-create-campaign"' + (wiz.createCampaign ? ' checked' : '') + '> 為此模組建立推廣活動</label>');
      h('</div>');

      h('<div id="wiz-campaign-fields" style="' + (wiz.createCampaign ? '' : 'display:none;') + '">');

      h('<div class="wizard-form-row">');
      h('<label>推廣 ID</label>');
      h('<input type="text" id="wiz-campaign-id" value="' + esc(wiz.campaignId) + '">');
      h('</div>');

      h('<div class="wizard-form-row">');
      h('<label>推廣名稱</label>');
      h('<input type="text" id="wiz-campaign-name" value="' + esc(wiz.campaignName) + '" placeholder="e.g. 海外消費額外回贈">');
      h('</div>');

      h('<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">');
      h('<div class="wizard-form-row">');
      h('<label>圖標</label>');
      h('<div style="display:flex;flex-wrap:wrap;gap:4px;">');
      ICONS.forEach(function(icon) {
        var sel = icon === wiz.campaignIcon ? ' style="background:var(--accent);color:#fff;border-color:var(--accent);"' : '';
        h('<span class="wizard-cat-chip" data-action="wiz-set-icon" data-icon="' + esc(icon) + '"' + sel + '>' + esc(icon) + '</span>');
      });
      h('</div>');
      h('</div>');
      h('<div class="wizard-form-row">');
      h('<label>主題色</label>');
      h('<div style="display:flex;flex-wrap:wrap;gap:4px;">');
      THEMES.forEach(function(color) {
        var sel = color === wiz.campaignTheme ? ';outline:2px solid #000;outline-offset:1px;' : '';
        h('<span style="width:24px;height:24px;border-radius:6px;background:' + esc(color) + ';cursor:pointer;display:inline-block' + sel + '" data-action="wiz-set-theme" data-theme="' + esc(color) + '"></span>');
      });
      h('</div>');
      h('</div>');
      h('</div>');

      h('<div class="wizard-form-row">');
      h('<label>推廣類型 (auto: ' + esc(wiz.promoType) + ')</label>');
      h('<select id="wiz-promo-type">');
      ["cap", "mission", "mission_cap", "multi_cap", "mission_multi_cap", "custom"].forEach(function(t) {
        h('<option value="' + esc(t) + '"' + (t === wiz.promoType ? ' selected' : '') + '>' + esc(t) + '</option>');
      });
      h('</select>');
      h('</div>');

      h('<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">');
      h('<div class="wizard-form-row">');
      h('<label>登記連結</label>');
      h('<input type="url" id="wiz-reg-url" value="' + esc(wiz.regRegistrationUrl) + '" placeholder="https://...">');
      h('</div>');
      h('<div class="wizard-form-row">');
      h('<label>登記開始</label>');
      h('<input type="date" id="wiz-reg-start" value="' + esc(wiz.regRegistrationStart) + '">');
      h('</div>');
      h('</div>');

      h('</div>'); // wiz-campaign-fields

      h('<div class="wizard-actions">');
      h('<button class="ghost" data-action="wiz-prev">&#9664; 上一步</button>');
      h('<button class="primary" data-action="wiz-next">下一步 &#9654;</button>');
      h('</div>');
      h('</div>');
    }

    if (currentStep === 3) {
      // Step 4: Preview & Apply
      wiz.moduleId = wiz.moduleId || autoModuleId();
      var preview = buildWizardPatch();
      h('<div class="wizard-panel">');
      h('<div class="wizard-step-title">&#9315; 預覽 & 套用</div>');
      h('<div class="wizard-form-row">');
      h('<label>將產生以下 Override 修改:</label>');
      h('<div class="wizard-preview">' + esc(JSON.stringify(preview, null, 2)) + '</div>');
      h('</div>');
      h('<div class="wizard-actions">');
      h('<button class="ghost" data-action="wiz-prev">&#9664; 上一步</button>');
      h('<button class="primary" data-action="wiz-apply">&#10003; 加入待套用</button>');
      h('</div>');
      h('</div>');
    }

    contentEl.innerHTML = html.join("");
  }

  function collectStepData() {
    if (currentStep === 0) {
      var el = document.getElementById("wiz-card");
      if (el) wiz.cardId = el.value;
    }
    if (currentStep === 1) {
      var fields = {
        "wiz-module-id": "moduleId", "wiz-desc": "desc", "wiz-display-name": "displayNameZhhk",
        "wiz-rate": "rate", "wiz-cap-limit": "capLimit", "wiz-cap-mode": "capMode",
        "wiz-mode": "mode", "wiz-valid-from": "validFrom", "wiz-valid-to": "validTo",
        "wiz-mission-key": "reqMissionKey", "wiz-mission-spend": "reqMissionSpend",
        "wiz-tnc-url": "tncUrl", "wiz-promo-url": "promoUrl"
      };
      Object.keys(fields).forEach(function(elId) {
        var el = document.getElementById(elId);
        if (el) wiz[fields[elId]] = el.value;
      });
    }
    if (currentStep === 2) {
      var cb = document.getElementById("wiz-create-campaign");
      if (cb) wiz.createCampaign = cb.checked;
      var fields2 = {
        "wiz-campaign-id": "campaignId", "wiz-campaign-name": "campaignName",
        "wiz-promo-type": "promoType",
        "wiz-reg-url": "regRegistrationUrl", "wiz-reg-start": "regRegistrationStart"
      };
      Object.keys(fields2).forEach(function(elId) {
        var el = document.getElementById(elId);
        if (el) wiz[fields2[elId]] = el.value;
      });
    }
  }

  function buildWizardPatch() {
    var patch = {};

    // Module
    var moduleObj = { type: "category", mode: wiz.mode };
    if (wiz.desc) moduleObj.desc = wiz.desc;
    if (wiz.displayNameZhhk) moduleObj.display_name_zhhk = wiz.displayNameZhhk;
    if (wiz.rate) moduleObj.rate = Number(wiz.rate);
    if (wiz.capLimit) { moduleObj.cap_limit = Number(wiz.capLimit); moduleObj.cap_mode = wiz.capMode; moduleObj.cap_key = wiz.moduleId + "_usage"; }
    if (wiz.matchCats.length > 0) moduleObj.match = wiz.matchCats.slice();
    if (wiz.validFrom) moduleObj.valid_from = wiz.validFrom;
    if (wiz.validTo) moduleObj.valid_to = wiz.validTo;
    if (wiz.reqMissionKey) moduleObj.req_mission_key = wiz.reqMissionKey;
    if (wiz.reqMissionSpend) moduleObj.req_mission_spend = Number(wiz.reqMissionSpend);
    if (wiz.tncUrl) moduleObj.tnc_url = wiz.tncUrl;
    if (wiz.promoUrl) moduleObj.promo_url = wiz.promoUrl;

    patch.modules = {};
    patch.modules[wiz.moduleId] = moduleObj;

    // Link module to card
    patch.cards = {};
    patch.cards[wiz.cardId] = { reward_modules_add: [wiz.moduleId] };

    // Campaign (optional)
    if (wiz.createCampaign) {
      var sectionType = "cap";
      if (wiz.reqMissionKey && wiz.capLimit) sectionType = "mission";
      else if (wiz.reqMissionKey) sectionType = "mission";

      var section = { type: sectionType, label: wiz.desc || wiz.moduleId };
      if (wiz.capLimit) { section.capModule = wiz.moduleId; section.capKey = moduleObj.cap_key; section.cap = Number(wiz.capLimit); }
      if (wiz.reqMissionKey) { section.missionModule = wiz.moduleId; section.usageKey = wiz.reqMissionKey; section.target = Number(wiz.reqMissionSpend) || 0; }

      patch.campaigns = {};
      patch.campaigns[wiz.campaignId] = {
        name: wiz.campaignName || wiz.desc || wiz.campaignId,
        icon: wiz.campaignIcon,
        theme: wiz.campaignTheme,
        promo_type: wiz.promoType,
        cards: [wiz.cardId],
        sections: [section],
        capKeys: moduleObj.cap_key ? [moduleObj.cap_key] : []
      };

      // Campaign registry
      var regObj = {};
      if (wiz.tncUrl || wiz.regRegistrationUrl) {
        if (wiz.tncUrl) regObj.tncUrl = wiz.tncUrl;
        if (wiz.promoUrl) regObj.promoUrl = wiz.promoUrl;
        if (wiz.regRegistrationUrl) regObj.registrationUrl = wiz.regRegistrationUrl;
        if (wiz.regRegistrationStart) regObj.registrationStart = wiz.regRegistrationStart;
        patch.campaignRegistry = {};
        patch.campaignRegistry[wiz.campaignId] = regObj;
      }
    }

    return patch;
  }

  // Event delegation
  contentEl.addEventListener("click", function(e) {
    var target = e.target.closest("[data-action]");
    if (!target) return;
    var action = target.getAttribute("data-action");

    if (action === "wiz-next") {
      collectStepData();
      if (currentStep < STEPS.length - 1) { currentStep++; renderStep(); }
    }
    if (action === "wiz-prev") {
      collectStepData();
      if (currentStep > 0) { currentStep--; renderStep(); }
    }
    if (action === "wiz-toggle-cat") {
      var cat = target.getAttribute("data-cat");
      var idx = wiz.matchCats.indexOf(cat);
      if (idx >= 0) { wiz.matchCats.splice(idx, 1); target.classList.remove("selected"); }
      else { wiz.matchCats.push(cat); target.classList.add("selected"); }
      // Update auto module ID if no custom one
      wiz.moduleId = autoModuleId();
    }
    if (action === "wiz-set-icon") {
      wiz.campaignIcon = target.getAttribute("data-icon");
      collectStepData();
      renderStep();
    }
    if (action === "wiz-set-theme") {
      wiz.campaignTheme = target.getAttribute("data-theme");
      collectStepData();
      renderStep();
    }
    if (action === "wiz-apply") {
      var patch = buildWizardPatch();
      // Merge into PENDING_EDITS
      Object.keys(patch).forEach(function(bucket) {
        ensureBucketPatch(bucket);
        Object.keys(patch[bucket]).forEach(function(id) {
          if (!PENDING_EDITS[bucket][id]) PENDING_EDITS[bucket][id] = {};
          var fields = patch[bucket][id];
          Object.keys(fields).forEach(function(f) {
            PENDING_EDITS[bucket][id][f] = fields[f];
          });
        });
      });
      refreshPendingPreview();
      var sel = document.getElementById("card-editor-select");
      if (sel) {
        sel.value = wiz.cardId;
        renderCardEditorContent(wiz.cardId);
      }
      setEditorStatus("已新增推廣 " + esc(wiz.moduleId) + "。按儲存到 Repo 套用。", false);
      // Reset wizard
      currentStep = 0;
      wiz.moduleId = "";
      wiz.desc = "";
      wiz.displayNameZhhk = "";
      wiz.matchCats = [];
      wiz.createCampaign = false;
      wiz.campaignId = "";
      renderStep();
    }
  });

  // Toggle campaign fields
  contentEl.addEventListener("change", function(e) {
    if (e.target.id === "wiz-create-campaign") {
      var fields = document.getElementById("wiz-campaign-fields");
      if (fields) fields.style.display = e.target.checked ? "" : "none";
      wiz.createCampaign = e.target.checked;
    }
  });

  renderStep();
}
initWizard();

// ── Relationship Graph ──────────────────────────────────────────────────────

function initGraph() {
  const sel = document.getElementById("graph-card-select");
  const content = document.getElementById("graph-content");
  if (!sel || !content) return;
  const graph = WB.relationshipGraph || [];
  sel.innerHTML = '<option value="__all__">All Cards</option>' +
    graph.map(c => '<option value="' + esc(c.id) + '">' + esc(c.name || c.id) + '</option>').join("");

  function renderNode(node, type) {
    const statusClass = node.status || "active";
    const detail = [];
    if (type === "module") {
      if (node.rate) detail.push("rate=" + node.rate);
      if (node.caps && node.caps.length > 0) detail.push(node.caps.map(c => c.mode + ":" + c.limit).join(","));
      if (node.missionKey) detail.push("mission=" + node.missionKey + ">=" + (node.missionSpend || "?"));
      if (node.validTo) detail.push("~" + node.validTo);
    }
    if (type === "tracker") {
      if (node.counterKey) detail.push("counter=" + node.counterKey);
    }
    const detailHtml = detail.length > 0 ? ' <span class="graph-node-detail">(' + esc(detail.join(" | ")) + ')</span>' : "";
    var dataBucket = type === "module" ? "modules" : (type === "tracker" ? "trackers" : "");
    var dataAttr = dataBucket ? ' data-action="open-editor" data-bucket="' + dataBucket + '" data-id="' + esc(node.id) + '"' : "";
    return '<span class="graph-node"' + dataAttr + '><span class="dot ' + statusClass + '"></span><span class="mono">' + esc(node.id) + '</span>' + detailHtml + '</span>';
  }

  function renderCard(card) {
    let html = '<details class="graph-card" open><summary>' + esc(card.name || card.id);
    if (card.bank) html += ' <span class="small">(' + esc(card.bank) + ')</span>';
    html += ' <span class="badge-info">' + card.modules.length + ' modules</span>';
    html += '</summary><div class="graph-body">';

    if (card.modules.length > 0) {
      html += '<div class="graph-group"><div class="graph-group-title">Reward Modules</div>';
      card.modules.forEach(mod => {
        html += '<div class="graph-link-group">';
        html += renderNode(mod, "module");
        if (mod.caps.length > 0) {
          mod.caps.forEach(cap => {
            html += '<span class="graph-arrow">&#8594;</span><span class="pill mono">' + esc(cap.key) + '</span>';
          });
        }
        if (mod.missionKey) {
          html += '<span class="graph-arrow">&#x1F512;</span><span class="pill mono">' + esc(mod.missionKey) + '</span>';
        }
        if (mod.campaignSections.length > 0) {
          html += '<span class="graph-arrow">&#128200;</span>';
          mod.campaignSections.forEach(cs => { html += '<span class="pill">' + esc(cs) + '</span>'; });
        }
        html += '</div>';
      });
      html += '</div>';
    }

    if (card.trackers.length > 0) {
      html += '<div class="graph-group"><div class="graph-group-title">Trackers</div>';
      card.trackers.forEach(t => { html += renderNode(t, "tracker"); });
      html += '</div>';
    }

    if (card.campaigns.length > 0) {
      html += '<div class="graph-group"><div class="graph-group-title">Campaigns</div>';
      card.campaigns.forEach(c => { html += '<span class="pill">' + esc(c.id) + ' (' + esc(c.name) + ')</span>'; });
      html += '</div>';
    }

    html += '</div></details>';
    return html;
  }

  function render() {
    const selected = sel.value;
    const filtered = selected === "__all__" ? graph : graph.filter(c => c.id === selected);
    content.innerHTML = filtered.map(c => renderCard(c)).join("");
  }

  sel.addEventListener("change", render);
  document.getElementById("graph-expand-all").addEventListener("click", () => {
    content.querySelectorAll("details.graph-card").forEach(d => d.open = true);
  });
  document.getElementById("graph-collapse-all").addEventListener("click", () => {
    content.querySelectorAll("details.graph-card").forEach(d => d.open = false);
  });
  // Event delegation for graph node clicks
  content.addEventListener("click", function(e) {
    var target = e.target.closest("[data-action]");
    if (!target) return;
    if (target.getAttribute("data-action") === "open-editor") {
      var bucket = target.getAttribute("data-bucket");
      var id = target.getAttribute("data-id");
      if (bucket && id) openEditor(bucket, id, true);
    }
  });
  render();
}
initGraph();

// ── Usage Key Map ───────────────────────────────────────────────────────────

setupTable({
  inputId: "q-usage-keys",
  tableId: "table-usage-keys",
  countId: "count-usage-keys",
  rows: WB.usageKeyMap || [],
  columns: [
    { title: "Usage Key", render: r => '<span class="mono">' + esc(r.key) + '</span>' },
    { title: "Cap Modules", render: r => pills(r.capModules) },
    { title: "Mission Modules", render: r => pills(r.missionModules) },
    { title: "Tracker Writers", render: r => pills(r.trackerWriters) },
    { title: "Campaign Displays", render: r => pills(r.campaignDisplays) },
    { title: "Status", render: r => {
      const total = (r.capModules || []).length + (r.missionModules || []).length + (r.trackerWriters || []).length;
      if (total <= 1) return '<span class="badge-ok">unique</span>';
      if (r.intentional) return '<span class="badge-info">coordinated</span>';
      return '<span class="badge-warning">shared</span>';
    }}
  ],
  toSearch: r => [
    r.key,
    (r.capModules || []).join(" "),
    (r.missionModules || []).join(" "),
    (r.trackerWriters || []).join(" "),
    (r.campaignDisplays || []).join(" ")
  ].join(" ").toLowerCase()
});

// ── Version History ─────────────────────────────────────────────────────────

function initHistory() {
  const content = document.getElementById("history-content");
  if (!content) return;
  const files = WB.historyFiles || [];
  if (files.length === 0) {
    content.innerHTML = '<div class="review-empty">No version history. History is created on each apply.</div>';
    return;
  }
  const html = files.map((f, i) => {
    const parts = f.replace(".js", "").split("_");
    const version = parts[0] || "";
    const date = parts.slice(1).join("_").replace(/T/g, " ") || "";
    return '<div class="history-item">'
      + '<div><span class="mono">' + esc(version) + '</span> <span class="small">' + esc(date) + '</span></div>'
      + '<div><span class="small mono">' + esc(f) + '</span>'
      + (IS_APP_MODE && i > 0 ? ' <button class="edit-btn" data-action="rollback" data-file="' + esc(f) + '">Rollback</button>' : '')
      + '</div></div>';
  }).join("");
  content.innerHTML = html;
}

window.rollbackTo = async function(filename) {
  if (!IS_APP_MODE) return;
  if (!window.confirm("Rollback to " + filename + "? Current overrides will be backed up first.")) return;
  try {
    const resp = await fetch("/api/rollback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename })
    });
    const result = await resp.json();
    if (result.ok) {
      setEditorStatus("Rolled back to " + filename + ". Reload page to see changes.", false);
    } else {
      setEditorStatus("Rollback failed: " + (result.error || "unknown"), true);
    }
  } catch (err) {
    setEditorStatus("Rollback failed: " + (err.message || String(err)), true);
  }
};

initHistory();

// Event delegation for history rollback
(function() {
  var historyEl = document.getElementById("history-content");
  if (historyEl) historyEl.addEventListener("click", function(e) {
    var target = e.target.closest("[data-action]");
    if (target && target.getAttribute("data-action") === "rollback") {
      var file = target.getAttribute("data-file");
      if (file) window.rollbackTo(file);
    }
  });
})();

// ── Diff Preview (enhanced save) ────────────────────────────────────────────

function buildDiffPreview() {
  const exported = buildExportEdits();
  const buckets = Object.keys(exported);
  if (buckets.length === 0) return '<div class="review-empty">No pending changes.</div>';
  let html = '';
  buckets.forEach(bucket => {
    const entries = exported[bucket];
    Object.keys(entries).forEach(id => {
      const patch = entries[id];
      if (!patch || typeof patch !== "object") return;
      const entity = getCurrentEntity(bucket, id) || {};
      html += '<div style="margin-bottom:8px;"><span class="mono" style="font-weight:600;">' + esc(bucket) + ':' + esc(id) + '</span></div>';
      html += '<table class="diff-table"><thead><tr><th>Field</th><th>Current</th><th>New</th></tr></thead><tbody>';
      Object.keys(patch).forEach(field => {
        const cur = entity[field];
        const next = patch[field];
        const curStr = cur === undefined ? '-' : (typeof cur === "string" ? cur : JSON.stringify(cur));
        const nextStr = next === null ? '(deleted)' : (typeof next === "string" ? next : JSON.stringify(next));
        const cls = cur === undefined ? 'diff-add' : (next === null ? 'diff-remove' : 'diff-change');
        html += '<tr class="' + cls + '"><td class="mono">' + esc(field) + '</td><td>' + esc(curStr) + '</td><td>' + esc(nextStr) + '</td></tr>';
      });
      html += '</tbody></table>';
    });
  });
  return html;
}

// Intercept the save button to show diff preview first
const origSaveRepo = saveToRepo;
const diffModal = document.createElement("div");
diffModal.id = "diff-modal";
diffModal.style.cssText = "display:none;position:fixed;inset:0;z-index:999;background:rgba(0,0,0,.4);overflow:auto;";
diffModal.innerHTML = '<div style="max-width:800px;margin:60px auto;background:#fff;border-radius:16px;padding:20px;box-shadow:0 8px 32px rgba(0,0,0,.15);max-height:80vh;overflow:auto;">'
  + '<h3 style="margin:0 0 12px;">Diff Preview</h3>'
  + '<div id="diff-content"></div>'
  + '<div style="display:flex;gap:8px;margin-top:16px;">'
  + '<button id="diff-confirm" class="primary" style="border:1px solid #0f766e;background:#0f766e;color:white;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer;">Confirm Save</button>'
  + '<button id="diff-confirm-golden" style="border:1px solid var(--line);background:#fff;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer;">Confirm + Run Golden</button>'
  + '<button id="diff-cancel" style="border:1px solid var(--line);background:#fff;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer;">Cancel</button>'
  + '</div></div>';
document.body.appendChild(diffModal);

function showDiffModal(runGolden) {
  const content = document.getElementById("diff-content");
  if (content) content.innerHTML = buildDiffPreview();
  diffModal.style.display = "block";
  document.getElementById("diff-confirm").onclick = () => { diffModal.style.display = "none"; origSaveRepo(false); };
  document.getElementById("diff-confirm-golden").onclick = () => { diffModal.style.display = "none"; origSaveRepo(true); };
  document.getElementById("diff-cancel").onclick = () => { diffModal.style.display = "none"; };
}

// Re-bind save buttons to show diff first
document.getElementById("editor-save-repo").removeEventListener("click", () => {});
document.getElementById("editor-save-repo-golden").removeEventListener("click", () => {});
document.getElementById("editor-save-repo").addEventListener("click", (e) => { e.stopImmediatePropagation(); showDiffModal(false); }, true);
document.getElementById("editor-save-repo-golden").addEventListener("click", (e) => { e.stopImmediatePropagation(); showDiffModal(true); }, true);
</script>
</body>
</html>
`;
}

function mergePatch(target, patch, allowSet, scopeLabel, warnings) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return target;
  const out = { ...(target || {}) };
  Object.keys(patch).forEach((field) => {
    if (field === "__delete") return;
    if (!allowSet.has(field)) {
      warnings.push(`[warn] ${scopeLabel}: field '${field}' is not allowed and was skipped`);
      return;
    }
    const val = patch[field];
    if (val === null) {
      delete out[field];
      return;
    }
    out[field] = val;
  });
  return out;
}

function applyEdits(existing, edits) {
  const next = {
    version: 1,
    cards: { ...(existing.cards || {}) },
    categories: { ...(existing.categories || {}) },
    modules: { ...(existing.modules || {}) },
    trackers: { ...(existing.trackers || {}) },
    campaigns: { ...(existing.campaigns || {}) },
    campaignRegistry: { ...(existing.campaignRegistry || {}) }
  };
  const warnings = [];
  let touched = 0;

  Object.keys(ALLOWED_FIELDS).forEach((bucket) => {
    const incomingBucket = edits && edits[bucket];
    if (!incomingBucket || typeof incomingBucket !== "object" || Array.isArray(incomingBucket)) return;
    Object.keys(incomingBucket).forEach((id) => {
      const patch = incomingBucket[id];
      if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
        warnings.push(`[warn] ${bucket}:${id}: patch is not an object, skipped`);
        return;
      }
      if (patch.__delete === true) {
        if (next[bucket][id]) {
          delete next[bucket][id];
          touched += 1;
        }
        return;
      }
      const merged = mergePatch(next[bucket][id], patch, ALLOWED_FIELDS[bucket], `${bucket}:${id}`, warnings);
      if (Object.keys(merged).length === 0) {
        delete next[bucket][id];
        touched += 1;
        return;
      }
      next[bucket][id] = merged;
      touched += 1;
    });
  });

  return { next: stableObject(next), warnings, touched };
}

function buildCoreOverridesJs(overrides) {
  const header = [
    "// js/data_overrides.js",
    "// Generated by tools/workbench.js apply",
    "// Core overrides are higher risk: validate with golden cases before merge."
  ];
  return `${header.join("\n")}\nconst CORE_OVERRIDES = ${JSON.stringify(overrides, null, 2)};\n`;
}

function runAudit(repoRoot, outPath) {
  const data = loadData(repoRoot);
  const rel = buildRelationships(data);
  const audit = buildAudit(data, rel);
  writeAuditReport(audit, outPath);
  console.log(`Audit report written to ${outPath}`);
}

function runExport(repoRoot, exportPath, auditPath) {
  const data = loadData(repoRoot);
  const rel = buildRelationships(data);
  const audit = buildAudit(data, rel);
  const payload = buildExportPayload(data, rel, audit);
  writeJson(exportPath, payload);
  writeAuditReport(audit, auditPath);
  console.log(`Workbench export written to ${exportPath}`);
  console.log(`Audit report written to ${auditPath}`);
}

function runHtml(repoRoot, outPath) {
  const data = loadData(repoRoot);
  const rel = buildRelationships(data);
  const audit = buildAudit(data, rel);
  const payload = buildHtmlPayload(data, rel, audit);
  ensureDir(outPath);
  fs.writeFileSync(outPath, buildHtmlReport(payload), "utf8");
  console.log(`Workbench HTML written to ${outPath}`);
}

function applyAndMaybeWrite(repoRoot, edits, outPath, dryRun) {
  const existing = loadCoreOverrides(repoRoot, path.relative(repoRoot, outPath));
  const result = applyEdits(existing, edits);

  if (!dryRun) {
    // Auto-backup current overrides before writing
    const backupPath = backupOverrides(outPath);
    if (backupPath) {
      result.backupPath = backupPath;
    }
    // Increment version
    result.next.version = (existing.version || 0) + 1;
    ensureDir(outPath);
    fs.writeFileSync(outPath, buildCoreOverridesJs(result.next), "utf8");
  }
  return result;
}

function runApply(repoRoot, editsPath, outPath, dryRun) {
  const edits = readJsonInput(editsPath);
  const result = applyAndMaybeWrite(repoRoot, edits, outPath, dryRun);

  result.warnings.forEach((w) => console.warn(w));
  if (dryRun) {
    console.log(`[dry-run] Would update ${result.touched} override entries`);
    return;
  }
  console.log(`Updated core overrides: ${outPath}`);
  console.log(`Touched entries: ${result.touched}`);
}

function runGoldenCases(repoRoot) {
  const proc = spawnSync(process.execPath, [path.join("tools", "run_golden_cases.js")], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  return {
    ok: proc.status === 0,
    status: Number.isFinite(proc.status) ? proc.status : 1,
    stdout: proc.stdout || "",
    stderr: proc.stderr || ""
  };
}

function runServe(repoRoot, port, host) {
  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const sendJson = (status, payload) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      });
      res.end(JSON.stringify(payload));
    };
    const sendHtml = (status, html) => {
      res.writeHead(status, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      });
      res.end(html);
    };

    if (req.method === "GET" && (reqUrl.pathname === "/" || reqUrl.pathname === "/reports/workbench.html")) {
      try {
        const data = loadData(repoRoot);
        const rel = buildRelationships(data);
        const audit = buildAudit(data, rel);
        const payload = buildHtmlPayload(data, rel, audit);
        sendHtml(200, buildHtmlReport(payload));
      } catch (err) {
        sendHtml(500, `<pre>Failed to render workbench: ${String(err && err.stack ? err.stack : err)}</pre>`);
      }
      return;
    }

    if (req.method === "POST" && reqUrl.pathname === "/api/apply") {
      let raw = "";
      req.on("data", (chunk) => {
        raw += chunk;
        if (raw.length > 5 * 1024 * 1024) req.destroy();
      });
      req.on("end", () => {
        try {
          const body = raw ? JSON.parse(raw) : {};
          const edits = (body && body.edits && typeof body.edits === "object") ? body.edits : body;
          const dryRun = !!(body && body.dryRun);
          const runGolden = !!(body && body.runGolden);
          const out = path.resolve(repoRoot, DEFAULT_CORE_OVERRIDES_PATH);
          const result = applyAndMaybeWrite(repoRoot, edits || {}, out, dryRun);
          const response = {
            ok: true,
            touched: result.touched,
            warnings: result.warnings,
            dryRun
          };
          if (runGolden && !dryRun) {
            response.golden = runGoldenCases(repoRoot);
          }
          sendJson(200, response);
        } catch (err) {
          sendJson(400, { ok: false, error: String(err && err.message ? err.message : err) });
        }
      });
      return;
    }

    if (req.method === "POST" && reqUrl.pathname === "/api/rollback") {
      let raw = "";
      req.on("data", (chunk) => {
        raw += chunk;
        if (raw.length > 1024 * 1024) req.destroy();
      });
      req.on("end", () => {
        try {
          const body = raw ? JSON.parse(raw) : {};
          const filename = body && body.filename;
          if (!filename || typeof filename !== "string") {
            sendJson(400, { ok: false, error: "filename is required" });
            return;
          }
          const out = path.resolve(repoRoot, DEFAULT_CORE_OVERRIDES_PATH);
          const restored = rollbackOverrides(filename.replace(".js", "").split("_")[0], out);
          sendJson(200, { ok: true, restored });
        } catch (err) {
          sendJson(400, { ok: false, error: String(err && err.message ? err.message : err) });
        }
      });
      return;
    }

    sendJson(404, { ok: false, error: "Not found" });
  });

  server.listen(port, host, () => {
    console.log(`Workbench server running at http://${host}:${port}/`);
    console.log("Use Save To Repo button directly in the page.");
  });
  server.on("error", (err) => {
    console.error("Failed to start workbench server:", err && err.message ? err.message : String(err));
    process.exit(1);
  });
}

function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  if (positional.length === 0 || flags["--help"]) {
    printUsage();
    process.exit(positional.length === 0 ? 1 : 0);
  }

  const cmd = positional[0];
  if (cmd === "audit") {
    const out = path.resolve(ROOT, flags["--out"] || DEFAULT_AUDIT_PATH);
    runAudit(ROOT, out);
    return;
  }

  if (cmd === "export") {
    const out = path.resolve(ROOT, flags["--out"] || DEFAULT_EXPORT_PATH);
    const auditOut = path.resolve(ROOT, flags["--audit-out"] || DEFAULT_AUDIT_PATH);
    runExport(ROOT, out, auditOut);
    return;
  }

  if (cmd === "html") {
    const out = path.resolve(ROOT, flags["--out"] || DEFAULT_HTML_PATH);
    runHtml(ROOT, out);
    return;
  }

  if (cmd === "apply") {
    const editsPath = flags["--edits"];
    if (!editsPath || typeof editsPath !== "string") {
      console.error("Missing required flag: --edits <path>");
      process.exit(1);
    }
    const out = path.resolve(ROOT, flags["--out"] || DEFAULT_CORE_OVERRIDES_PATH);
    const resolvedEdits = editsPath === "-" ? "-" : path.resolve(ROOT, editsPath);
    runApply(ROOT, resolvedEdits, out, !!flags["--dry-run"]);
    return;
  }

  if (cmd === "serve") {
    const host = (typeof flags["--host"] === "string" && flags["--host"]) ? String(flags["--host"]) : "127.0.0.1";
    const portNum = Number(flags["--port"] || 8788);
    const port = Number.isFinite(portNum) && portNum > 0 ? Math.floor(portNum) : 8788;
    runServe(ROOT, port, host);
    return;
  }

  if (cmd === "history") {
    const files = listHistory();
    if (files.length === 0) {
      console.log("No override history found.");
    } else {
      console.log(`Override history (${files.length} versions, newest first):`);
      files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    }
    return;
  }

  if (cmd === "rollback") {
    const version = positional[1];
    if (!version) {
      console.error("Usage: node tools/workbench.js rollback <version>");
      console.log("Use 'node tools/workbench.js history' to list versions.");
      process.exit(1);
    }
    const out = path.resolve(ROOT, flags["--out"] || DEFAULT_CORE_OVERRIDES_PATH);
    const restored = rollbackOverrides(version, out);
    console.log(`Rolled back to: ${restored}`);
    console.log(`Current overrides backed up before rollback.`);
    console.log(`Run: node tools/run_golden_cases.js to verify.`);
    return;
  }

  if (cmd === "verify-allowlists") {
    const { verifyAllowlistSync, getAllowedFieldsMap } = require("./lib/allowed_fields");
    // Read the inline allowlist from data_index.js by parsing for the field arrays
    const dataIndexPath = path.resolve(ROOT, "js/data_index.js");
    const dataIndexContent = fs.readFileSync(dataIndexPath, "utf8");
    // Extract the inline allowlist names from data_index.js
    const extractList = (varName) => {
      const re = new RegExp(`const\\s+${varName}\\s*=\\s*\\[([^\\]]+)\\]`, "s");
      const m = dataIndexContent.match(re);
      if (!m) return null;
      return m[1].match(/"([^"]+)"/g)?.map((s) => s.replace(/"/g, "")) || [];
    };
    const inline = {
      cards: extractList("allowedCardCoreFields"),
      categories: extractList("allowedCategoryCoreFields"),
      modules: extractList("allowedModuleCoreFields"),
      trackers: extractList("allowedTrackerCoreFields"),
      campaigns: extractList("allowedCampaignCoreFields")
    };
    // Workbench has cards with extra fields (redemption, reward_modules_add, trackers_add)
    // which data_index.js handles separately, so we only verify the core field lists.
    const canonical = getAllowedFieldsMap();
    let ok = true;
    Object.keys(inline).forEach((bucket) => {
      if (!inline[bucket]) {
        console.warn(`  [warn] Could not extract ${bucket} allowlist from data_index.js`);
        return;
      }
      const expected = canonical[bucket].slice().sort();
      const actual = inline[bucket].slice().sort();
      // data_index.js won't have redemption/reward_modules_add/trackers_add for cards
      const filtered = expected.filter((f) => !["redemption", "reward_modules_add", "trackers_add"].includes(f) || bucket !== "cards");
      const actualFiltered = actual.filter((f) => !["redemption", "reward_modules_add", "trackers_add"].includes(f) || bucket !== "cards");
      if (JSON.stringify(filtered) !== JSON.stringify(actualFiltered)) {
        const missing = filtered.filter((f) => !actualFiltered.includes(f));
        const extra = actualFiltered.filter((f) => !filtered.includes(f));
        if (missing.length > 0) console.error(`  [${bucket}] missing in data_index.js: ${missing.join(", ")}`);
        if (extra.length > 0) console.error(`  [${bucket}] extra in data_index.js: ${extra.join(", ")}`);
        ok = false;
      }
    });
    if (ok) {
      console.log("Allowlists are in sync.");
    } else {
      console.error("Allowlist mismatch detected. Update tools/lib/allowed_fields.js or js/data_index.js.");
      process.exit(1);
    }
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  printUsage();
  process.exit(1);
}

main();
