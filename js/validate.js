// js/validate.js - Data validation helpers

function validateData(data) {
    if (!data) {
        console.error("[data] DATA missing. Cannot validate.");
        return false;
    }

    const errors = [];
    const warnings = [];
    const strictPeriods = !!(data.debug && data.debug.strictPeriods);

    const addError = (msg) => {
        errors.push(msg);
        console.error(msg);
    };

    const addWarning = (msg) => {
        warnings.push(msg);
        console.warn(msg);
    };

    const cards = Array.isArray(data.cards) ? data.cards : [];
    const modules = data.modules || {};
    const categories = data.categories || {};
    const promotions = Array.isArray(data.promotions) ? data.promotions : [];
    const campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
    const trackers = data.trackers || {};
    const defaults = data.periodDefaults || {};

    const isValidDate = (dateStr) => {
        if (!dateStr || typeof dateStr !== "string") return false;
        const parts = dateStr.split("-").map(n => parseInt(n, 10));
        if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return false;
        const [y, m, d] = parts;
        const dt = new Date(y, m - 1, d);
        return dt.getFullYear() === y && (dt.getMonth() + 1) === m && dt.getDate() === d;
    };

    const validateAnchor = (anchor, sourceLabel) => {
        if (!anchor || !anchor.type) return;
        if (anchor.type === "month") {
            const day = Number(anchor.startDay ?? 1);
            if (!(day >= 1 && day <= 28)) {
                addError(`[data] ${sourceLabel} invalid month startDay: ${anchor.startDay}`);
            }
        } else if (anchor.type === "quarter") {
            const day = Number(anchor.startDay ?? 1);
            if (!(day >= 1 && day <= 28)) {
                addError(`[data] ${sourceLabel} invalid quarter startDay: ${anchor.startDay}`);
            }
            const sm = Number(anchor.startMonth ?? 1);
            if (![1, 4, 7, 10].includes(sm)) {
                addError(`[data] ${sourceLabel} invalid quarter startMonth: ${anchor.startMonth}`);
            }
        } else if (anchor.type === "promo") {
            if (!isValidDate(anchor.startDate)) addError(`[data] ${sourceLabel} invalid promo startDate: ${anchor.startDate}`);
            if (anchor.endDate && !isValidDate(anchor.endDate)) addError(`[data] ${sourceLabel} invalid promo endDate: ${anchor.endDate}`);
        } else {
            addWarning(`[data] ${sourceLabel} unknown period type: ${anchor.type}`);
        }
    };

    // Build known usage keys (modules + manual list)
    const knownUsageKeys = new Set();
    const addKnown = (key) => {
        if (key) knownUsageKeys.add(key);
    };

    Object.keys(modules).forEach((id) => {
        const mod = modules[id] || {};
        addKnown(mod.cap_key);
        addKnown(mod.secondary_cap_key);
        addKnown(mod.usage_key);
        addKnown(mod.req_mission_key);
    });

    Object.keys(trackers).forEach((id) => {
        const tracker = trackers[id] || {};
        addKnown(tracker.req_mission_key);
    });

    // Manual usage keys referenced in app/core logic
    [
        "guru_spend_accum",
        "guru_rc_used",
        "winter_total",
        "winter_eligible",
        "em_q1_total",
        "em_q1_eligible"
    ].forEach(addKnown);

    // Cards -> modules
    cards.forEach((card) => {
        if (!card || !card.id) return;
        if (!Array.isArray(card.modules)) return;
        card.modules.forEach((modId) => {
            // In Phase 5 we allow cards to reference both reward modules and tracker modules via a shared `modules` list.
            if (!modules[modId] && !trackers[modId]) {
                addError(`[data] card ${card.id} references missing module/tracker: ${modId}`);
            }
        });
    });

    // Modules -> categories
    Object.keys(modules).forEach((modId) => {
        const mod = modules[modId] || {};
        if (!Array.isArray(mod.match)) return;
        mod.match.forEach((catId) => {
            if (catId === "online") return;
            if (!categories[catId]) {
                addError(`[data] module ${modId} match category missing: ${catId}`);
            }
        });
    });

    const normalizePeriodSpec = (spec) => {
        if (!spec) return { periodType: "none", anchorRef: null };
        if (typeof spec === "string") return { periodType: spec, anchorRef: null };
        if (typeof spec === "object") return { periodType: spec.type || "none", anchorRef: spec };
        return { periodType: "none", anchorRef: null };
    };

    // Period definitions on modules
    Object.keys(modules).forEach((modId) => {
        const mod = modules[modId] || {};
        if (mod.cap && mod.cap.period) {
            const periodSpec = normalizePeriodSpec(mod.cap.period);
            const anchor = periodSpec.anchorRef || defaults[periodSpec.periodType];
            validateAnchor({ ...anchor, type: periodSpec.periodType }, `module:${modId}.cap`);
        } else if (strictPeriods && mod.cap_key) {
            // Only warn in strict mode: many caps are intentionally non-resettable.
            addWarning(`[data] module ${modId} cap_key has no cap.period (defaults to none): ${mod.cap_key}`);
        }
        if (mod.counter && mod.counter.period) {
            const periodSpec = normalizePeriodSpec(mod.counter.period);
            const anchor = periodSpec.anchorRef || defaults[periodSpec.periodType];
            validateAnchor({ ...anchor, type: periodSpec.periodType }, `module:${modId}.counter`);
        } else if (strictPeriods && mod.req_mission_key) {
            // Only warn in strict mode: many mission keys are intended to be lifetime or promo-scoped.
            addWarning(`[data] module ${modId} req_mission_key has no counter.period (defaults to none): ${mod.req_mission_key}`);
        }
    });

    // Period definitions on trackers
    Object.keys(trackers).forEach((trackerId) => {
        const tracker = trackers[trackerId] || {};
        if (tracker.counter && tracker.counter.period) {
            const periodSpec = normalizePeriodSpec(tracker.counter.period);
            const anchor = periodSpec.anchorRef || defaults[periodSpec.periodType];
            validateAnchor({ ...anchor, type: periodSpec.periodType }, `tracker:${trackerId}.counter`);
        } else if (strictPeriods && tracker.req_mission_key) {
            addWarning(`[data] tracker ${trackerId} req_mission_key has no counter.period (defaults to none): ${tracker.req_mission_key}`);
        }
    });

    // Period definitions on promotions
    promotions.forEach((promo) => {
        if (!promo || !promo.id) return;
        if (promo.period) {
            const periodSpec = normalizePeriodSpec(promo.period);
            const anchor = periodSpec.anchorRef || defaults[periodSpec.periodType];
            validateAnchor({ ...anchor, type: periodSpec.periodType }, `promo:${promo.id}.period`);
            return;
        }

        // If UI badge implies a reset boundary, warn in strict mode when period metadata is missing.
        const badgeType = promo.badge && promo.badge.type ? String(promo.badge.type) : "";
        if (strictPeriods && (badgeType === "month_end" || badgeType === "quarter_end" || badgeType === "promo_end")) {
            addWarning(`[data] promo ${promo.id} badge=${badgeType} but missing promo.period`);
        }
    });

    campaigns.forEach((promo) => {
        if (!promo || !promo.id) return;
        if (promo.period) {
            const periodSpec = normalizePeriodSpec(promo.period);
            const anchor = periodSpec.anchorRef || defaults[periodSpec.periodType];
            validateAnchor({ ...anchor, type: periodSpec.periodType }, `campaign:${promo.id}.period`);
            return;
        }
        const badgeType = promo.badge && promo.badge.type ? String(promo.badge.type) : "";
        if (strictPeriods && (badgeType === "month_end" || badgeType === "quarter_end" || badgeType === "promo_end")) {
            addWarning(`[data] campaign ${promo.id} badge=${badgeType} but missing campaign.period`);
        }
    });

    // Trackers -> categories
    Object.keys(trackers).forEach((trackerId) => {
        const tracker = trackers[trackerId] || {};
        if (!Array.isArray(tracker.match)) return;
        tracker.match.forEach((catId) => {
            if (catId === "online") return;
            if (!categories[catId]) {
                addError(`[data] tracker ${trackerId} match category missing: ${catId}`);
            }
        });
    });

    // Promotions -> usage keys / cap modules
    promotions.forEach((promo) => {
        const promoId = promo && promo.id ? promo.id : "promo";
        const sections = Array.isArray(promo.sections) ? promo.sections : [];
        sections.forEach((sec, idx) => {
            const label = `${promoId}.section${idx + 1}`;
            if (sec.capModule && !modules[sec.capModule]) {
                addError(`[data] ${label} capModule missing: ${sec.capModule}`);
            }
            if (sec.usageKey && !knownUsageKeys.has(sec.usageKey)) {
                addError(`[data] ${label} usageKey missing: ${sec.usageKey}`);
            }
            if (sec.totalKey && !knownUsageKeys.has(sec.totalKey)) {
                addError(`[data] ${label} totalKey missing: ${sec.totalKey}`);
            }
            if (sec.eligibleKey && !knownUsageKeys.has(sec.eligibleKey)) {
                addError(`[data] ${label} eligibleKey missing: ${sec.eligibleKey}`);
            }
            if (sec.unlockKey && !knownUsageKeys.has(sec.unlockKey)) {
                addError(`[data] ${label} unlockKey missing: ${sec.unlockKey}`);
            }
            if (Array.isArray(sec.usageKeys)) {
                sec.usageKeys.forEach((k) => {
                    if (!knownUsageKeys.has(k)) {
                        addError(`[data] ${label} usageKeys missing: ${k}`);
                    }
                });
            }
        });
    });

    // Campaigns -> usage keys / cap modules
    campaigns.forEach((promo) => {
        const promoId = promo && promo.id ? promo.id : "campaign";
        const sections = Array.isArray(promo.sections) ? promo.sections : [];
        sections.forEach((sec, idx) => {
            const label = `${promoId}.section${idx + 1}`;
            if (sec.capModule && !modules[sec.capModule]) {
                addError(`[data] ${label} capModule missing: ${sec.capModule}`);
            }
            if (sec.rateModule && !modules[sec.rateModule]) {
                addError(`[data] ${label} rateModule missing: ${sec.rateModule}`);
            }
            if (sec.usageKey && !knownUsageKeys.has(sec.usageKey)) {
                addError(`[data] ${label} usageKey missing: ${sec.usageKey}`);
            }
            if (sec.totalKey && !knownUsageKeys.has(sec.totalKey)) {
                addError(`[data] ${label} totalKey missing: ${sec.totalKey}`);
            }
            if (sec.eligibleKey && !knownUsageKeys.has(sec.eligibleKey)) {
                addError(`[data] ${label} eligibleKey missing: ${sec.eligibleKey}`);
            }
            if (sec.unlockKey && !knownUsageKeys.has(sec.unlockKey)) {
                addError(`[data] ${label} unlockKey missing: ${sec.unlockKey}`);
            }
            if (Array.isArray(sec.usageKeys)) {
                sec.usageKeys.forEach((k) => {
                    if (!knownUsageKeys.has(k)) {
                        addError(`[data] ${label} usageKeys missing: ${k}`);
                    }
                });
            }
        });
    });

    // cap_key / usage_key collisions
    const keyRoles = new Map();
    const addRole = (key, role, source) => {
        if (!key) return;
        if (!keyRoles.has(key)) keyRoles.set(key, { roles: new Set(), sources: new Set() });
        const entry = keyRoles.get(key);
        entry.roles.add(role);
        entry.sources.add(source);
    };

    Object.keys(modules).forEach((id) => {
        const mod = modules[id] || {};
        addRole(mod.cap_key, "cap_key", `module:${id}.cap_key`);
        addRole(mod.secondary_cap_key, "cap_key", `module:${id}.secondary_cap_key`);
        addRole(mod.usage_key, "usage_key", `module:${id}.usage_key`);
        addRole(mod.req_mission_key, "usage_key", `module:${id}.req_mission_key`);
    });

    keyRoles.forEach((entry, key) => {
        if (entry.roles.has("cap_key") && entry.roles.has("usage_key")) {
            addWarning(`[data] key collision (cap_key vs usage_key): ${key} | ${Array.from(entry.sources).join(", ")}`);
        }
    });

    if (errors.length === 0) {
        console.log(`[data] validation OK${warnings.length ? ` with ${warnings.length} warning(s)` : ""}.`);
        return true;
    }

    console.error(`[data] validation failed with ${errors.length} error(s).`);
    return false;
}
