#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { ALLOWED_FIELDS } = require("./lib/allowed_fields");

const ROOT = path.resolve(__dirname, "..");
const WORKBENCH_PATH = path.resolve(ROOT, "tools", "workbench.js");

function printUsage() {
  console.log([
    "Usage:",
    "  node tools/import_urls.js --in <file.{tsv|csv|json}> [--out <edits.json>] [--apply] [--dry-run]",
    "",
    "Input row fields (table mode):",
    "  bucket, id, source_url, source_title, tnc_url, promo_url, registration_url,",
    "  registration_start, registration_end, registration_note, last_verified_at",
    "",
    "Supported buckets:",
    "  cards, modules, campaigns, campaignRegistry",
    "",
    "Examples:",
    "  node tools/import_urls.js --in tools/url_import.example.tsv --out /tmp/url.edits.json",
    "  node tools/import_urls.js --in tools/url_import.example.tsv --apply --dry-run",
    "  node tools/import_urls.js --in tools/url_import.example.tsv --apply"
  ].join("\n"));
}

function parseArgs(argv) {
  const out = { positional: [], flags: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token;
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) out.flags[key] = true;
      else {
        out.flags[key] = next;
        i += 1;
      }
    } else {
      out.positional.push(token);
    }
  }
  return out;
}

function stripBom(s) {
  if (typeof s !== "string") return "";
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function readText(filePath) {
  if (filePath === "-") return fs.readFileSync(0, "utf8");
  const abs = path.resolve(ROOT, filePath);
  return fs.readFileSync(abs, "utf8");
}

function writeJson(filePath, value) {
  const abs = path.resolve(ROOT, filePath);
  const dir = path.dirname(abs);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseDelimitedRows(text, delimiter) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuote = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    // Ignore a trailing completely-empty row from EOF newline.
    const nonEmpty = row.some((v) => String(v || "").trim() !== "");
    if (nonEmpty) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuote) {
      if (ch === "\"") {
        if (next === "\"") {
          cell += "\"";
          i += 1;
        } else {
          inQuote = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === "\"") {
      inQuote = true;
      continue;
    }
    if (ch === delimiter) {
      pushCell();
      continue;
    }
    if (ch === "\r") continue;
    if (ch === "\n") {
      pushCell();
      pushRow();
      continue;
    }
    cell += ch;
  }
  pushCell();
  pushRow();
  return rows;
}

function detectDelimiter(text) {
  const line = String(text || "").split(/\r?\n/).find((l) => String(l || "").trim() !== "") || "";
  if (line.includes("\t")) return "\t";
  return ",";
}

function normalizeBucket(value) {
  const key = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const map = {
    card: "cards",
    cards: "cards",
    module: "modules",
    modules: "modules",
    campaign: "campaigns",
    campaigns: "campaigns",
    campaignregistry: "campaignRegistry",
    campaign_registry: "campaignRegistry",
    registry: "campaignRegistry",
    reg: "campaignRegistry"
  };
  return map[key] || "";
}

function normalizeRowField(bucket, rawField) {
  const allowed = ALLOWED_FIELDS[bucket] || new Set();
  const f = String(rawField || "").trim();
  if (!f) return "";
  if (allowed.has(f)) return f;

  const slug = f.toLowerCase().replace(/[\s-]+/g, "_");
  if (allowed.has(slug)) return slug;

  if (bucket === "campaignRegistry") {
    const regMap = {
      setting_key: "settingKey",
      settingkey: "settingKey",
      warning_title: "warningTitle",
      warningtitle: "warningTitle",
      warning_desc: "warningDesc",
      warningdesc: "warningDesc",
      source_url: "sourceUrl",
      sourceurl: "sourceUrl",
      source_title: "sourceTitle",
      sourcetitle: "sourceTitle",
      tnc_url: "tncUrl",
      tncurl: "tncUrl",
      promo_url: "promoUrl",
      promourl: "promoUrl",
      registration_url: "registrationUrl",
      registrationurl: "registrationUrl",
      registration_start: "registrationStart",
      registrationstart: "registrationStart",
      registration_end: "registrationEnd",
      registrationend: "registrationEnd",
      registration_note: "registrationNote",
      registrationnote: "registrationNote",
      implementation_note: "implementationNote",
      implementationnote: "implementationNote"
    };
    return regMap[slug] || "";
  }

  const snakeMap = {
    sourceurl: "source_url",
    sourcetitle: "source_title",
    tncurl: "tnc_url",
    promourl: "promo_url",
    registrationurl: "registration_url",
    registrationstart: "registration_start",
    registrationend: "registration_end",
    registrationnote: "registration_note",
    lastverifiedat: "last_verified_at"
  };
  return snakeMap[slug] || "";
}

function coerceValue(raw) {
  const trimmed = String(raw == null ? "" : raw).trim();
  if (!trimmed) return { hasValue: false, value: undefined };
  if (trimmed === "__delete__" || trimmed === "__DELETE__") return { hasValue: true, value: null };
  return { hasValue: true, value: trimmed };
}

function parseRowsFromTable(text) {
  const delimiter = detectDelimiter(text);
  const matrix = parseDelimitedRows(stripBom(text), delimiter);
  let header = null;
  const rows = [];

  matrix.forEach((rawRow) => {
    const row = (rawRow || []).map((v) => String(v == null ? "" : v).trim());
    if (row.length === 0) return;
    const first = row[0] || "";
    if (!first) return;
    if (first.startsWith("#")) return;
    if (!header) {
      header = row;
      return;
    }
    const obj = {};
    header.forEach((h, idx) => {
      if (!h) return;
      obj[h] = row[idx] != null ? row[idx] : "";
    });
    rows.push(obj);
  });

  if (!header) throw new Error("No header row found in input table.");
  return rows;
}

function buildEditsFromRows(rows) {
  const edits = {
    cards: {},
    categories: {},
    modules: {},
    trackers: {},
    campaigns: {},
    campaignRegistry: {}
  };
  const warnings = [];
  let touchedRows = 0;

  rows.forEach((row, idx) => {
    const bucket = normalizeBucket(row.bucket || row.BUCKET || row.Bucket || "");
    const id = String(row.id || row.ID || row.Id || "").trim();
    if (!bucket) {
      warnings.push(`[warn] row ${idx + 2}: missing/unknown bucket`);
      return;
    }
    if (!id) {
      warnings.push(`[warn] row ${idx + 2}: missing id`);
      return;
    }
    if (!edits[bucket]) edits[bucket] = {};
    if (!edits[bucket][id]) edits[bucket][id] = {};

    const patch = edits[bucket][id];
    const allowed = ALLOWED_FIELDS[bucket] || new Set();
    let hasField = false;

    Object.keys(row).forEach((k) => {
      const lk = String(k || "").toLowerCase();
      if (lk === "bucket" || lk === "id") return;
      const field = normalizeRowField(bucket, k);
      if (!field) return;
      if (!allowed.has(field)) {
        warnings.push(`[warn] row ${idx + 2}: ${bucket}:${id} field '${field}' not allowed, skipped`);
        return;
      }
      const { hasValue, value } = coerceValue(row[k]);
      if (!hasValue) return;
      patch[field] = value;
      hasField = true;
    });

    if (!hasField) {
      delete edits[bucket][id];
      if (Object.keys(edits[bucket]).length === 0) delete edits[bucket];
      warnings.push(`[warn] row ${idx + 2}: ${bucket}:${id} has no URL fields to apply`);
      return;
    }
    touchedRows += 1;
  });

  return { edits, warnings, touchedRows };
}

function parseInputToEdits(filePath) {
  const raw = readText(filePath);
  const trimmed = stripBom(raw).trim();
  if (!trimmed) return { edits: {}, warnings: ["[warn] empty input"], touchedRows: 0 };

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return buildEditsFromRows(parsed);
    if (parsed && typeof parsed === "object" && parsed.rows && Array.isArray(parsed.rows)) {
      return buildEditsFromRows(parsed.rows);
    }
    // Already in workbench edits shape.
    return { edits: parsed || {}, warnings: [], touchedRows: -1 };
  }

  const rows = parseRowsFromTable(raw);
  return buildEditsFromRows(rows);
}

function countTouchedEntries(edits) {
  let count = 0;
  ["cards", "modules", "campaigns", "campaignRegistry", "trackers", "categories"].forEach((bucket) => {
    const b = edits[bucket];
    if (!b || typeof b !== "object") return;
    count += Object.keys(b).length;
  });
  return count;
}

function runWorkbenchApply(edits, dryRun) {
  const args = [WORKBENCH_PATH, "apply", "--edits", "-"];
  if (dryRun) args.push("--dry-run");
  const proc = spawnSync(process.execPath, args, {
    cwd: ROOT,
    input: JSON.stringify(edits),
    encoding: "utf8"
  });
  if (proc.stdout) process.stdout.write(proc.stdout);
  if (proc.stderr) process.stderr.write(proc.stderr);
  if (typeof proc.status === "number") process.exit(proc.status);
  process.exit(1);
}

function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  if (flags["--help"]) {
    printUsage();
    return;
  }

  const inPath = flags["--in"];
  if (!inPath || typeof inPath !== "string") {
    printUsage();
    process.exit(1);
  }

  const { edits, warnings, touchedRows } = parseInputToEdits(inPath);
  warnings.forEach((w) => console.warn(w));
  const touchedEntries = countTouchedEntries(edits);
  if (touchedEntries === 0) {
    console.log("No valid URL edits found.");
    return;
  }

  if (flags["--out"] && typeof flags["--out"] === "string") {
    writeJson(flags["--out"], edits);
    console.log(`Wrote edits JSON: ${path.resolve(ROOT, flags["--out"])}`);
  }

  const summaryRows = touchedRows >= 0 ? touchedRows : "n/a";
  console.log(`Prepared URL edits: ${touchedEntries} entries (rows used: ${summaryRows})`);

  if (flags["--apply"]) {
    runWorkbenchApply(edits, !!flags["--dry-run"]);
    return;
  }

  console.log("Next step:");
  console.log("  node tools/workbench.js apply --edits <your-edits.json>");
}

main();
