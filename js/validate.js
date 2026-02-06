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
        } else if (anchor.type === "year") {
            const day = Number(anchor.startDay ?? 1);
            if (!(day >= 1 && day <= 28)) {
                addError(`[data] ${sourceLabel} invalid year startDay: ${anchor.startDay}`);
            }
            const sm = Number(anchor.startMonth ?? 1);
            if (!(sm >= 1 && sm <= 12)) {
                addError(`[data] ${sourceLabel} invalid year startMonth: ${anchor.startMonth}`);
            }
        } else {
            addWarning(`[data] ${sourceLabel} unknown period type: ${anchor.type}`);
        }
    };

    const validateRecurrence = (recurrence, sourceLabel) => {
        if (!recurrence || typeof recurrence !== "object" || Array.isArray(recurrence)) return;
        const freq = recurrence.freq ? String(recurrence.freq).toLowerCase() : "";
        if (!freq) {
            addError(`[data] ${sourceLabel} recurrence missing freq`);
            return;
        }
        const allowedFreq = new Set(["daily", "weekly", "monthly", "quarterly", "yearly"]);
        if (!allowedFreq.has(freq)) {
            addError(`[data] ${sourceLabel} recurrence freq unsupported: ${recurrence.freq}`);
        }
        if (recurrence.interval !== undefined) {
            const interval = Number(recurrence.interval);
            if (!Number.isFinite(interval) || interval <= 0) {
                addError(`[data] ${sourceLabel} recurrence interval invalid: ${recurrence.interval}`);
            }
        }
        if (recurrence.until && !isValidDate(recurrence.until)) {
            addError(`[data] ${sourceLabel} recurrence until is not YYYY-MM-DD: ${recurrence.until}`);
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

    // Cards -> reward modules / trackers
    cards.forEach((card) => {
        if (!card || !card.id) return;
        if (Array.isArray(card.rewardModules)) {
            card.rewardModules.forEach((modId) => {
                if (!modules[modId]) {
                    addError(`[data] card ${card.id} rewardModules missing: ${modId}`);
                }
            });
        }
        if (Array.isArray(card.trackers)) {
            card.trackers.forEach((trackerId) => {
                if (!trackers[trackerId]) {
                    addError(`[data] card ${card.id} trackers missing: ${trackerId}`);
                }
            });
        }
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
        if (mod.valid_from && !isValidDate(mod.valid_from)) {
            addWarning(`[data] module ${modId} valid_from is not YYYY-MM-DD: ${mod.valid_from}`);
        }
        if (mod.valid_to && !isValidDate(mod.valid_to)) {
            addWarning(`[data] module ${modId} valid_to is not YYYY-MM-DD: ${mod.valid_to}`);
        }
        if (mod.promo_end && !isValidDate(mod.promo_end)) {
            addWarning(`[data] module ${modId} promo_end is not YYYY-MM-DD: ${mod.promo_end}`);
        }
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

    campaigns.forEach((campaign) => {
        if (!campaign || !campaign.id) return;
        if (campaign.period_policy && typeof campaign.period_policy === "object" && !Array.isArray(campaign.period_policy)) {
            const policy = campaign.period_policy;
            const mode = policy.mode ? String(policy.mode).toLowerCase() : "";
            const allowedModes = new Set(["fixed", "recurring", "user_relative", "composite"]);
            if (mode && !allowedModes.has(mode)) {
                addError(`[data] campaign ${campaign.id} period_policy mode unsupported: ${policy.mode}`);
            }

            const rawWindows = Array.isArray(policy.windows) ? policy.windows : [policy];
            let validWindowCount = 0;
            rawWindows.forEach((windowSpec, idx) => {
                if (!windowSpec || typeof windowSpec !== "object" || Array.isArray(windowSpec)) {
                    addError(`[data] campaign ${campaign.id} period_policy window #${idx + 1} is not an object`);
                    return;
                }

                const start = windowSpec.startDate || windowSpec.start || windowSpec.startAt || windowSpec.start_at || windowSpec.valid_from || "";
                const end = windowSpec.endDate || windowSpec.end || windowSpec.endAt || windowSpec.end_at || windowSpec.valid_to || "";
                const startDate = start ? String(start) : "";
                const endDate = end ? String(end) : "";
                if (startDate && !isValidDate(startDate)) {
                    addError(`[data] campaign ${campaign.id} period_policy window #${idx + 1} start date invalid: ${startDate}`);
                }
                if (endDate && !isValidDate(endDate)) {
                    addError(`[data] campaign ${campaign.id} period_policy window #${idx + 1} end date invalid: ${endDate}`);
                }
                if (startDate && endDate && startDate > endDate) {
                    addError(`[data] campaign ${campaign.id} period_policy window #${idx + 1} end before start: ${startDate} > ${endDate}`);
                }

                if (windowSpec.period) {
                    const periodSpec = normalizePeriodSpec(windowSpec.period);
                    const anchor = periodSpec.anchorRef || defaults[periodSpec.periodType];
                    validateAnchor({ ...anchor, type: periodSpec.periodType }, `campaign:${campaign.id}.period_policy.window${idx + 1}.period`);
                }
                if (windowSpec.recurrence) {
                    validateRecurrence(windowSpec.recurrence, `campaign:${campaign.id}.period_policy.window${idx + 1}`);
                }
                if (startDate || endDate || windowSpec.period || windowSpec.recurrence) validWindowCount += 1;
            });
            if (validWindowCount === 0) {
                addError(`[data] campaign ${campaign.id} period_policy has no valid windows`);
            }
            if (policy.recurrence) {
                validateRecurrence(policy.recurrence, `campaign:${campaign.id}.period_policy`);
            }
        } else if (campaign.period_policy !== undefined) {
            addError(`[data] campaign ${campaign.id} period_policy must be an object`);
        } else {
            addError(`[data] campaign ${campaign.id} missing period_policy`);
        }

        if (campaign.period !== undefined) {
            addWarning(`[data] campaign ${campaign.id} has deprecated field: period (ignored)`);
        }
        if (campaign.badge !== undefined) {
            addWarning(`[data] campaign ${campaign.id} has deprecated field: badge (ignored)`);
        }
    });

    if (data.periodPolicy && Array.isArray(data.periodPolicy.warnings)) {
        data.periodPolicy.warnings.forEach((msg) => {
            if (msg) addWarning(String(msg));
        });
    }

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
