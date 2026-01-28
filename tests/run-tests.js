/* Minimal test runner for core.js logic (no deps) */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "js", "data.js");
const corePath = path.join(root, "js", "core.js");

const context = {
  console,
  setTimeout,
  clearTimeout,
  localStorage: {
    _store: {},
    getItem(key) {
      return this._store[key] || null;
    },
    setItem(key, value) {
      this._store[key] = String(value);
    },
  },
  fetch: async () => ({
    ok: false,
    json: async () => ({}),
  }),
};

vm.createContext(context);

const dataSrc = fs.readFileSync(dataPath, "utf8");
const coreSrc = fs.readFileSync(corePath, "utf8");
vm.runInContext(dataSrc, context, { filename: "data.js" });
vm.runInContext(coreSrc, context, { filename: "core.js" });

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

// --- Tests ---
test("Category hierarchy matches overseas variants", () => {
  const ok = context.isCategoryMatch(["overseas"], "overseas_jkt");
  assert(ok === true, "overseas_jkt should match parent 'overseas'");
});

test("Red day validity passes when holiday", () => {
  const mod = { valid_on_red_day: true };
  const ok = context.checkValidity(mod, "2026-01-28", true);
  assert(ok === true, "red-day module should pass on holiday");
});

test("Build card result returns estimate", () => {
  const profile = JSON.parse(JSON.stringify(context.userProfile));
  profile.ownedCards = ["hsbc_red"];
  profile.settings.red_hot_rewards_enabled = true;

  const card = context.cardsDB.find((c) => c.id === "hsbc_red");
  const res = context.buildCardResult(card, 1000, "online", "cash", profile, "2026-01-28", false);
  assert(res && res.cardId === "hsbc_red", "should return result for hsbc_red");
  assert(typeof res.estCash === "number", "estCash should be a number");
});

test("calculateResults returns sorted results", () => {
  const profile = JSON.parse(JSON.stringify(context.userProfile));
  profile.ownedCards = ["hsbc_red", "hsbc_vs"];
  profile.settings.red_hot_rewards_enabled = true;

  const results = context.calculateResults(1000, "online", "cash", profile, "2026-01-28", false);
  assert(Array.isArray(results), "results should be an array");
  assert(results.length === 2, "results should include both cards");
});

// --- Runner ---
let failed = 0;
for (const t of tests) {
  try {
    t.fn();
    console.log(`PASS: ${t.name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL: ${t.name}`);
    console.error(`  ${err.message}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}

console.log("\nAll tests passed.");
