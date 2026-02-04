#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.resolve(ROOT, "reports");
const OUT_PATH = path.resolve(OUT_DIR, "copy_quality.md");

const EXPECTED = {
  warningNeedRegister: "需登記以賺取回贈",
};

function loadScript(filePath) {
  const code = fs.readFileSync(filePath, "utf8");
  vm.runInThisContext(code, { filename: filePath });
}

function createLocalStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
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
    "data_index.js",
  ].map((file) => path.resolve(ROOT, "js", file));

  scripts.forEach(loadScript);
  return global.DATA || {};
}

function walkJsFiles(dirPath) {
  const out = [];
  for (const ent of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const p = path.resolve(dirPath, ent.name);
    if (ent.isDirectory()) {
      out.push(...walkJsFiles(p));
    } else if (ent.isFile() && ent.name.endsWith(".js")) {
      out.push(p);
    }
  }
  return out.sort();
}

function scanFiles(files, patterns) {
  const hits = [];
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const text = fs.readFileSync(file, "utf8");
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (trimmed.startsWith("//")) continue;
      for (const p of patterns) {
        if (p.re.test(line)) {
          hits.push({
            file: rel,
            line: i + 1,
            pattern: p.label,
            snippet: line.trim().slice(0, 220),
          });
        }
      }
    }
  }
  return hits;
}

function main() {
  const data = loadData();
  const reg = data.campaignRegistry || {};

  const warningMismatches = [];
  Object.entries(reg).forEach(([id, entry]) => {
    if (!entry) return;
    const desc = String(entry.warningDesc || "").trim();
    if (desc && desc !== EXPECTED.warningNeedRegister) {
      warningMismatches.push({ id, warningDesc: desc });
    }
  });

  const jsFiles = walkJsFiles(path.resolve(ROOT, "js"));
  const patterns = [
    { label: "English: Mission Progress", re: /\bMission Progress\b/ },
    { label: "English: Reward Progress", re: /\bReward Progress\b/ },
    { label: "English: In Progress", re: /\bIn Progress\b/ },
    { label: "English: Remaining", re: /\bRemaining\b/ },
    { label: "English: Locked", re: /\bLocked\b/ },
    { label: "English: Capped", re: /\bCapped\b/ },
    { label: "English: No Reward", re: /\bNo Reward\b/ },
  ];

  const hits = scanFiles(jsFiles, patterns);

  const lines = [];
  lines.push("# Copy Quality Report");
  lines.push("");
  lines.push("## Campaign Registry Warning Desc Mismatches");
  if (warningMismatches.length === 0) {
    lines.push(`- None (expected: ${EXPECTED.warningNeedRegister})`);
  } else {
    warningMismatches
      .sort((a, b) => a.id.localeCompare(b.id))
      .forEach((m) => lines.push(`- ${m.id}: ${m.warningDesc}`));
  }
  lines.push("");

  lines.push("## English / Legacy Copy Hits (JS)");
  if (hits.length === 0) {
    lines.push("- None");
  } else {
    hits.forEach((h) => {
      lines.push(`- ${h.pattern}: ${h.file}:${h.line} \`${h.snippet}\``);
    });
  }
  lines.push("");

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, lines.join("\n"));
  console.log(`Report written to ${OUT_PATH}`);
}

main();
