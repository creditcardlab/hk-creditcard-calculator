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
const DEFAULT_CORE_OVERRIDES_PATH = path.resolve(ROOT, "js", "data_notion_core_overrides.js");

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
  "js/data_notion_core_overrides.js",
  "js/data_notion_overrides.js",
  "js/data_index.js"
];

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
    "rate",
    "rate_per_x",
    "multiplier",
    "mode",
    "match",
    "retroactive",
    "promo_end",
    "valid_from",
    "valid_to",
    "cap_mode",
    "cap_limit",
    "cap_key",
    "secondary_cap_limit",
    "secondary_cap_key",
    "min_spend",
    "min_single_spend",
    "req_mission_spend",
    "req_mission_key"
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
  campaigns: new Set(["name", "period_policy", "promo_type"])
};

function printUsage() {
  console.log(`Usage:
  node tools/workbench.js audit [--out <path>]
  node tools/workbench.js export [--out <path>] [--audit-out <path>]
  node tools/workbench.js html [--out <path>]
  node tools/workbench.js apply --edits <path|-> [--out <path>] [--dry-run]
  node tools/workbench.js serve [--port <number>] [--host <host>]
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
  // data_notion_core_overrides.js declares `const NOTION_CORE_OVERRIDES = ...`,
  // which is a lexical binding and not always exposed as a context property.
  // Read it explicitly from the same VM global lexical scope.
  let loaded = ctx.NOTION_CORE_OVERRIDES;
  if (!loaded) {
    try {
      loaded = vm.runInContext(
        "(typeof NOTION_CORE_OVERRIDES !== 'undefined') ? NOTION_CORE_OVERRIDES : undefined",
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
    campaigns: loaded.campaigns && typeof loaded.campaigns === "object" ? loaded.campaigns : {}
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
        promoTypeIssues.push(`${campaign.id}: missing promo_type (inferred=${inferredType})`);
      } else if (!allowedPromoTypes.has(declaredType)) {
        promoTypeIssues.push(`${campaign.id}: unsupported promo_type=${declaredType}`);
      } else if (declaredType !== inferredType && declaredType !== "custom") {
        promoTypeIssues.push(`${campaign.id}: promo_type=${declaredType} but inferred=${inferredType}`);
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
    promoTypeIssues: promoTypeIssues.sort(),
    specialPromoIssues: specialPromoIssues.sort()
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
  if ((audit.promoTypeIssues || []).length > 0) audit.promoTypeIssues.forEach((m) => lines.push(`  ${m}`));
  lines.push(`- Special promo issues (${(audit.specialPromoIssues || []).length})`);
  if ((audit.specialPromoIssues || []).length > 0) audit.specialPromoIssues.forEach((m) => lines.push(`  ${m}`));
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

  const editableEntities = {
    cards: {},
    categories: {},
    modules: {},
    trackers: {},
    campaigns: {}
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

  const allowedFields = {};
  Object.keys(ALLOWED_FIELDS).forEach((bucket) => {
    allowedFields[bucket] = Array.from(ALLOWED_FIELDS[bucket]).sort();
  });

  return stableObject({
    summary: audit,
    cards: cardRows,
    categories: categoryRows,
    offers: offerRows,
    trackers: trackerRows,
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
    .issues { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 12px; box-shadow: var(--shadow); margin-bottom: 16px; }
    .issues h2 { margin: 0 0 8px; font-size: 16px; }
    .issues ul { margin: 0; padding-left: 18px; }
    .issues li { margin: 4px 0; font-size: 13px; }
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
      <ul id="alerts"></ul>
    </div>
    <div class="grid">
      <section class="panel panel-editor" id="panel-editor">
        <h3>Core Overrides Editor</h3>
        <div class="editor-hint">
          建議由 Card Review 直接編輯，完成後按 Save。
        </div>
        <ol class="editor-steps">
          <li>揀 Bucket、Entity ID、Field。</li>
          <li>Value 會自動載入目前值，直接改。</li>
          <li>按「Save Field」，完成後按「Save + Run Golden」。</li>
        </ol>
        <div id="editorStatus" class="status ok">Ready.</div>
        <div class="editor-grid">
          <div>
            <label for="editor-bucket">Bucket</label>
            <select id="editor-bucket"></select>
          </div>
          <div>
            <label for="editor-id">Entity ID</label>
            <select id="editor-id"></select>
          </div>
          <div>
            <label for="editor-field">Field</label>
            <select id="editor-field"></select>
          </div>
          <div>
            <label>Current Selection</label>
            <div class="small">Use Save/Delete buttons below.</div>
          </div>
          <div style="grid-column: 1 / -1;">
            <label for="editor-value">Value (plain text or JSON)</label>
            <textarea id="editor-value" placeholder='Example: 0.06, "新描述", {"type":"month","startDay":1}'></textarea>
          </div>
        </div>
        <input type="checkbox" id="editor-delete-field" hidden>
        <div class="editor-actions">
          <button id="editor-load" class="ghost" type="button">Reload Current Value</button>
          <button id="editor-set" class="primary" type="button">Save Field</button>
          <button id="editor-delete-field-btn" class="warn" type="button">Delete Field</button>
          <button id="editor-clear-entry" class="ghost" type="button">Clear This Entry Patch</button>
        </div>
        <div class="editor-actions">
          <button id="editor-save-repo" class="primary" type="button">Save To Repo</button>
          <button id="editor-save-repo-golden" class="ghost" type="button">Save + Run Golden</button>
          <button id="editor-reset" class="warn" type="button">Reset Pending</button>
        </div>
        <div class="quick-box">
          <div class="small" style="margin-bottom:4px;">Quick Edit Fields (one column at a time)</div>
          <div class="table-wrap"><table id="editor-quick-table"></table></div>
        </div>
        <div class="quick-box">
          <div class="small" style="margin-bottom:4px;">Bulk Patch For Selected Entry (edit multiple fields at once)</div>
          <textarea id="editor-entry-patch" placeholder='{"rate":0.06,"cap_limit":500,"desc":"新描述"}'></textarea>
          <div class="editor-actions" style="margin-top:8px;">
            <button id="editor-load-entry" class="ghost" type="button">Load Pending Entry Patch</button>
            <button id="editor-merge-entry" class="primary" type="button">Queue Entry Patch (Merge)</button>
          </div>
        </div>
        <div class="editor-split">
          <div>
            <div class="small" style="margin-bottom:4px;">Selected Entity Snapshot</div>
            <pre id="editor-current"></pre>
          </div>
          <div>
            <div class="small" style="margin-bottom:4px;">Pending Edits JSON (<span id="editor-patch-count" class="mono">0</span>)</div>
            <pre id="editor-pending"></pre>
          </div>
        </div>
      </section>
      <section class="panel">
        <h3>Card Review</h3>
        <div class="toolbar">
          <select id="card-review-select"></select>
          <button id="card-review-prev" type="button">Prev</button>
          <button id="card-review-next" type="button">Next</button>
          <button id="card-review-edit-card" type="button">Edit Card</button>
        </div>
        <div id="card-review-meta" class="review-meta"></div>
        <div id="card-review-content"></div>
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
const cards = document.getElementById("summaryCards");
[
  ["Cards", sum.counts?.cards ?? 0],
  ["Offers", sum.counts?.offers ?? 0],
  ["Trackers", sum.counts?.trackers ?? 0],
  ["Categories", sum.counts?.categories ?? 0],
  ["Orphan Modules", (sum.orphanModules || []).length],
  ["Binding Drift", (sum.sectionDrift || []).length],
  ["Promo Type Issues", (sum.promoTypeIssues || []).length],
  ["Special Promo Issues", (sum.specialPromoIssues || []).length]
].forEach(([k, v]) => {
  const div = document.createElement("div");
  div.className = "card";
  div.innerHTML = '<div class="k">' + esc(k) + '</div><div class="v mono">' + esc(v) + '</div>';
  cards.appendChild(div);
});

const alerts = [];
if ((sum.orphanModules || []).length > 0) alerts.push("Unused modules: " + sum.orphanModules.join(", "));
if ((sum.orphanTrackers || []).length > 0) alerts.push("Unused trackers: " + sum.orphanTrackers.join(", "));
if ((sum.sectionMissingRefs || []).length > 0) alerts.push(...sum.sectionMissingRefs);
if ((sum.sectionDrift || []).length > 0) alerts.push(...sum.sectionDrift);
if ((sum.promoTypeIssues || []).length > 0) alerts.push(...sum.promoTypeIssues);
if ((sum.specialPromoIssues || []).length > 0) alerts.push(...sum.specialPromoIssues);
const alertUl = document.getElementById("alerts");
if (alerts.length === 0) {
  alertUl.innerHTML = "<li>No findings.</li>";
} else {
  alertUl.innerHTML = alerts.map(a => "<li>" + esc(a) + "</li>").join("");
}

const EDITOR_ALLOWED = (WB.editor && WB.editor.allowedFields) ? WB.editor.allowedFields : {};
const EDITOR_ENTITIES = (WB.editor && WB.editor.entities) ? WB.editor.entities : {};

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
initCardReview();
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
    campaigns: { ...(existing.campaigns || {}) }
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
    "// js/data_notion_core_overrides.js",
    "// Generated by tools/workbench.js apply",
    "// Core overrides are higher risk: validate with golden cases before merge."
  ];
  return `${header.join("\n")}\nconst NOTION_CORE_OVERRIDES = ${JSON.stringify(overrides, null, 2)};\n`;
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

  console.error(`Unknown command: ${cmd}`);
  printUsage();
  process.exit(1);
}

main();
