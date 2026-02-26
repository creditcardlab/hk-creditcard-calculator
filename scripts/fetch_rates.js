#!/usr/bin/env node
// scripts/fetch_rates.js
// Fetches exchange rates from multiple sources and writes data/rates.json.
// Designed to run in GitHub Actions (Node 20+, native fetch).
// Can also be run locally: node scripts/fetch_rates.js

const fs = require("fs");
const path = require("path");

const CURRENCIES = [
    "JPY", "KRW", "THB", "TWD", "CNY", "MOP",
    "GBP", "EUR", "USD", "SGD", "AUD", "CAD",
    "NZD", "CHF", "SEK", "NOK", "DKK"
];

const TODAY = getISODate(new Date());
const YESTERDAY = getISODate(new Date(Date.now() - 86400000));

// ── Helpers ─────────────────────────────────────────────────────────────

function getISODate(d) {
    return d.toISOString().slice(0, 10);
}

function toVisaDate(iso) {
    const [y, m, d] = iso.split("-");
    return `${m}/${d}/${y}`;
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function fetchJSON(url, retries = 2) {
    for (let i = 0; i <= retries; i++) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
            if (res.ok) return await res.json();
            if (i === retries) console.warn(`  HTTP ${res.status} for ${url}`);
        } catch (e) {
            if (i === retries) console.warn(`  Fetch error for ${url}: ${e.message}`);
        }
        if (i < retries) await sleep(1000 * (i + 1));
    }
    return null;
}

// ── Reference Rates (bulk, all currencies at once) ──────────────────────

async function fetchReferenceRates() {
    console.log("[Reference] Fetching from open.er-api.com...");

    // Primary: open.er-api.com (free, no key, covers 150+ currencies including TWD/MOP)
    try {
        const json = await fetchJSON("https://open.er-api.com/v6/latest/HKD");
        if (json && json.result === "success" && json.rates) {
            const result = {};
            let count = 0;
            for (const curr of CURRENCIES) {
                const fxRate = json.rates[curr];
                if (fxRate && fxRate > 0) {
                    // API returns 1 HKD = X foreign → invert to 1 foreign = Y HKD
                    result[curr] = {
                        rate: +(1 / fxRate).toFixed(6),
                        date: TODAY,
                        source: "open.er-api"
                    };
                    count++;
                }
            }
            console.log(`  Got ${count}/${CURRENCIES.length} currencies from open.er-api.com`);
            return result;
        }
    } catch (e) {
        console.warn("  open.er-api.com failed:", e.message);
    }

    // Fallback: Frankfurter (ECB) — won't have TWD/MOP
    console.log("[Reference] Falling back to Frankfurter (ECB)...");
    try {
        const json = await fetchJSON("https://api.frankfurter.app/latest?from=HKD");
        if (json && json.rates) {
            const result = {};
            let count = 0;
            for (const curr of CURRENCIES) {
                const fxRate = json.rates[curr];
                if (fxRate && fxRate > 0) {
                    result[curr] = {
                        rate: +(1 / fxRate).toFixed(6),
                        date: TODAY,
                        source: "ecb"
                    };
                    count++;
                }
            }
            console.log(`  Got ${count}/${CURRENCIES.length} currencies from ECB`);
            return result;
        }
    } catch (e) {
        console.warn("  Frankfurter API failed:", e.message);
    }

    console.warn("[Reference] All reference sources failed!");
    return {};
}

// ── Mastercard Rates (per currency) ─────────────────────────────────────

async function fetchMCRate(currency) {
    for (const date of [TODAY, YESTERDAY]) {
        const url = "https://www.mastercard.com/settlement/currencyrate/conversion-rate" +
            "?fxDate=" + encodeURIComponent(date) +
            "&transCurr=" + encodeURIComponent(currency) +
            "&crdhldBillCurr=HKD&bankFee=0&transAmt=1";
        try {
            const json = await fetchJSON(url, 1);
            if (json && json.data && json.data.conversionRate) {
                return { rate: Number(json.data.conversionRate), date };
            }
        } catch (_) { /* continue */ }
    }
    return null;
}

// ── Visa Rates (per currency) ───────────────────────────────────────────

async function fetchVisaRate(currency) {
    for (const date of [TODAY, YESTERDAY]) {
        const visaDate = toVisaDate(date);
        const url = "https://usa.visa.com/cmsapi/fx/rates" +
            "?amount=1&fee=0" +
            "&utcConvertedDate=" + encodeURIComponent(visaDate) +
            "&exchangedate=" + encodeURIComponent(visaDate) +
            "&fromCurr=" + encodeURIComponent(currency) +
            "&toCurr=HKD";
        try {
            const json = await fetchJSON(url, 1);
            if (json && json.convertedAmount) {
                return { rate: Number(json.convertedAmount), date };
            }
        } catch (_) { /* continue */ }
    }
    return null;
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
    console.log(`Fetching exchange rates for ${CURRENCIES.length} currencies...`);
    console.log(`Today: ${TODAY}, Yesterday: ${YESTERDAY}\n`);

    // 1. Fetch reference rates (bulk)
    const refRates = await fetchReferenceRates();
    console.log();

    // 2. Fetch MC and Visa rates per currency
    console.log("[Mastercard] Fetching per-currency rates...");
    const mcRates = {};
    for (const curr of CURRENCIES) {
        mcRates[curr] = await fetchMCRate(curr);
        if (mcRates[curr]) {
            process.stdout.write(`  ${curr}: ${mcRates[curr].rate} (${mcRates[curr].date})\n`);
        } else {
            process.stdout.write(`  ${curr}: null\n`);
        }
        // Small delay to be polite to the API
        await sleep(200);
    }
    console.log();

    console.log("[Visa] Fetching per-currency rates...");
    const visaRates = {};
    for (const curr of CURRENCIES) {
        visaRates[curr] = await fetchVisaRate(curr);
        if (visaRates[curr]) {
            process.stdout.write(`  ${curr}: ${visaRates[curr].rate} (${visaRates[curr].date})\n`);
        } else {
            process.stdout.write(`  ${curr}: null\n`);
        }
        await sleep(200);
    }
    console.log();

    // 3. Assemble output
    const rates = {};
    for (const curr of CURRENCIES) {
        rates[curr] = {
            mastercard: mcRates[curr] || null,
            visa: visaRates[curr] || null,
            reference: refRates[curr] || null
        };
    }

    const output = {
        schema_version: 1,
        generated_at: new Date().toISOString(),
        base: "HKD",
        rates
    };

    // 4. Write file
    const outPath = path.join(__dirname, "..", "data", "rates.json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
    console.log(`Written to: ${outPath}`);

    // 5. Summary
    let covered = 0;
    let warnings = [];
    for (const c of CURRENCIES) {
        const r = rates[c];
        const hasAny = (r.mastercard || r.visa || r.reference);
        if (hasAny) {
            covered++;
        } else {
            warnings.push(c);
        }
    }
    console.log(`\nCoverage: ${covered}/${CURRENCIES.length} currencies`);
    if (warnings.length > 0) {
        console.warn("WARNING: No rate available for: " + warnings.join(", "));
    }
    console.log("Done!");
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
