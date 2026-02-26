// js/exchange_rate.js
// Fetches and caches exchange rates from Mastercard / Visa / ECB (fallback).

const ExchangeRateService = {
    _cache: {},
    _staticRatesCache: null,
    CACHE_TTL_MS: 4 * 60 * 60 * 1000, // 4 hours

    // ── helpers ──────────────────────────────────────────────────────────

    _networkForCardType(cardType) {
        const map = { visa: "visa", master: "mastercard", amex: "amex", unionpay: "unionpay" };
        return map[String(cardType).toLowerCase()] || "mastercard";
    },

    _todayISO() {
        const d = new Date();
        return d.getFullYear() + "-" +
            String(d.getMonth() + 1).padStart(2, "0") + "-" +
            String(d.getDate()).padStart(2, "0");
    },

    _yesterdayISO() {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.getFullYear() + "-" +
            String(d.getMonth() + 1).padStart(2, "0") + "-" +
            String(d.getDate()).padStart(2, "0");
    },

    _toVisaDate(iso) {
        const [y, m, d] = iso.split("-");
        return `${m}/${d}/${y}`;
    },

    _cacheKey(network, currency, date) {
        return `fx_${network}_${currency}_${date}`;
    },

    // ── cache ────────────────────────────────────────────────────────────

    _getFromCache(key) {
        const mem = this._cache[key];
        if (mem && (Date.now() - mem.timestamp < this.CACHE_TTL_MS)) return mem;
        try {
            const raw = sessionStorage.getItem(key);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && (Date.now() - parsed.timestamp < this.CACHE_TTL_MS)) {
                    this._cache[key] = parsed;
                    return parsed;
                }
            }
        } catch (_) { /* ignore */ }
        return null;
    },

    _setCache(key, data) {
        this._cache[key] = data;
        try { sessionStorage.setItem(key, JSON.stringify(data)); } catch (_) { /* ignore */ }
    },

    clearCache() {
        this._cache = {};
        try {
            const keys = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const k = sessionStorage.key(i);
                if (k && k.startsWith("fx_")) keys.push(k);
            }
            keys.forEach(k => sessionStorage.removeItem(k));
        } catch (_) { /* ignore */ }
    },

    // ── fetch helpers ────────────────────────────────────────────────────

    _createTimeoutSignal(ms) {
        // AbortSignal.timeout is available in modern browsers but NOT iOS Safari ≤15
        if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
            return AbortSignal.timeout(ms);
        }
        const controller = new AbortController();
        setTimeout(() => controller.abort(), ms);
        return controller.signal;
    },

    async _fetchWithFallback(url) {
        // Try direct first
        try {
            const res = await fetch(url, { signal: this._createTimeoutSignal(5000) });
            if (res.ok) return res;
        } catch (_) { /* CORS or network error */ }

        // Try CORS proxy
        const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(url);
        const res2 = await fetch(proxyUrl, { signal: this._createTimeoutSignal(8000) });
        if (res2.ok) return res2;
        throw new Error("Both direct and proxy fetch failed for " + url);
    },

    // ── network-specific fetchers ────────────────────────────────────────

    async _fetchMastercardRate(currency, date) {
        const url = "https://www.mastercard.com/settlement/currencyrate/conversion-rate" +
            "?fxDate=" + encodeURIComponent(date) +
            "&transCurr=" + encodeURIComponent(currency) +
            "&crdhldBillCurr=HKD&bankFee=0&transAmt=1";
        const res = await this._fetchWithFallback(url);
        const json = await res.json();
        // MC response: { data: { conversionRate: <number> } }
        if (json && json.data && json.data.conversionRate) {
            return Number(json.data.conversionRate);
        }
        throw new Error("Invalid Mastercard response");
    },

    async _fetchVisaRate(currency, date) {
        const visaDate = this._toVisaDate(date);
        const url = "https://usa.visa.com/cmsapi/fx/rates" +
            "?amount=1&fee=0" +
            "&utcConvertedDate=" + encodeURIComponent(visaDate) +
            "&exchangedate=" + encodeURIComponent(visaDate) +
            "&fromCurr=" + encodeURIComponent(currency) +
            "&toCurr=HKD";
        const res = await this._fetchWithFallback(url);
        const json = await res.json();
        if (json && json.convertedAmount) {
            return Number(json.convertedAmount);
        }
        throw new Error("Invalid Visa response");
    },

    async _fetchFallbackRate(currency) {
        const url = "https://api.frankfurter.app/latest?amount=1&from=" +
            encodeURIComponent(currency) + "&to=HKD";
        const res = await this._fetchWithFallback(url);
        const json = await res.json();
        if (json && json.rates && json.rates.HKD) {
            return Number(json.rates.HKD);
        }
        throw new Error("Fallback rate fetch failed");
    },

    // ── static rates (from data/rates.json, updated by GitHub Actions) ──

    async _fetchStaticRates(currency, network) {
        if (!this._staticRatesCache) {
            try {
                const res = await fetch("data/rates.json", { signal: this._createTimeoutSignal(5000) });
                if (res.ok) {
                    this._staticRatesCache = await res.json();
                } else {
                    this._staticRatesCache = { _failed: true };
                }
            } catch (e) {
                console.warn("[FX] Static rates fetch failed:", e.message);
                this._staticRatesCache = { _failed: true };
                return null;
            }
        }

        const data = this._staticRatesCache;
        if (!data || data._failed || !data.rates || !data.rates[currency]) return null;

        const currRates = data.rates[currency];
        // Map network: mastercard/visa use their own key, everything else uses "reference"
        const staticKey = (network === "mastercard" || network === "visa") ? network : "reference";
        let entry = currRates[staticKey];

        // If network-specific rate is null, fall back to reference
        if ((!entry || !entry.rate) && staticKey !== "reference") {
            entry = currRates.reference;
        }
        if (!entry || !entry.rate) return null;

        const sourceName = (staticKey === "reference" || !currRates[staticKey] || !currRates[staticKey].rate)
            ? (entry.source || "參考匯率")
            : (staticKey === "mastercard" ? "Mastercard" : "Visa");

        return {
            rate: entry.rate,
            source: sourceName,
            date: entry.date || data.generated_at,
            timestamp: Date.now(),
            isStatic: true
        };
    },

    // ── public API ───────────────────────────────────────────────────────

    /**
     * Get exchange rate: how many HKD per 1 unit of foreign currency.
     * Resolution order: cache → static rates.json → live MC/Visa → live ECB → null
     * @param {string} currency  ISO 4217 code (e.g. "JPY")
     * @param {string} cardType  Card network type ("visa", "master", "amex", "unionpay")
     * @param {string} [date]    YYYY-MM-DD (defaults to today)
     * @returns {Promise<{rate:number, source:string, date:string, timestamp:number}|null>}
     */
    async getRate(currency, cardType, date) {
        if (!currency || currency === "HKD" || currency === "_OTHER") return null;
        if (!date) date = this._todayISO();

        const network = this._networkForCardType(cardType);
        const key = this._cacheKey(network, currency, date);

        // 1. Check in-memory / sessionStorage cache
        const cached = this._getFromCache(key);
        if (cached) return cached;

        // 2. Try static rates (data/rates.json, updated daily by GitHub Actions)
        try {
            const staticResult = await this._fetchStaticRates(currency, network);
            if (staticResult && staticResult.rate) {
                this._setCache(key, staticResult);
                return staticResult;
            }
        } catch (e) {
            console.warn("[FX] Static rate lookup failed:", e.message);
        }

        // 3. Try live network-specific API (with today→yesterday retry for timezone issues)
        let rate = null;
        let source = "";
        const datesToTry = [date];
        if (date === this._todayISO()) {
            datesToTry.push(this._yesterdayISO());
        }

        for (const tryDate of datesToTry) {
            try {
                if (network === "mastercard") {
                    rate = await this._fetchMastercardRate(currency, tryDate);
                    source = "Mastercard";
                } else if (network === "visa") {
                    rate = await this._fetchVisaRate(currency, tryDate);
                    source = "Visa";
                }
                if (rate !== null) break;
            } catch (e) {
                console.warn("[FX] " + network + " rate fetch failed for " + currency + " on " + tryDate + ":", e.message);
            }
        }

        // 4. Fallback to ECB/Frankfurter (for amex, unionpay, or when live fails)
        if (rate === null) {
            try {
                rate = await this._fetchFallbackRate(currency);
                source = "ECB (參考)";
            } catch (e2) {
                console.warn("[FX] Fallback rate also failed for " + currency + ":", e2.message);
                return null;
            }
        }

        const result = { rate: rate, source: source, date: date, timestamp: Date.now() };
        this._setCache(key, result);
        return result;
    },

    /**
     * Batch-fetch rates for multiple card types at once (deduplicates).
     * Returns a Map<string, rateResult> keyed by card type.
     */
    async getRatesForCardTypes(currency, cardTypes, date) {
        if (!currency || currency === "HKD" || currency === "_OTHER") return new Map();
        const seen = new Map(); // network -> promise
        const results = new Map(); // cardType -> result

        for (const ct of cardTypes) {
            const network = this._networkForCardType(ct);
            if (!seen.has(network)) {
                seen.set(network, this.getRate(currency, ct, date));
            }
        }

        // Resolve all unique fetches
        const resolved = new Map();
        for (const [network, promise] of seen) {
            resolved.set(network, await promise);
        }

        // Map back to card types
        for (const ct of cardTypes) {
            const network = this._networkForCardType(ct);
            results.set(ct, resolved.get(network));
        }
        return results;
    }
};
