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
    const specialPromoModels = (data.specialPromoModels && typeof data.specialPromoModels === "object")
        ? data.specialPromoModels
        : {};
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
        addKnown(mod.progress_mission_key);
    });

    Object.keys(trackers).forEach((id) => {
        const tracker = trackers[id] || {};
        addKnown(tracker.req_mission_key);
    });

    const distinctEligibleByReqKey = {};
    Object.keys(trackers).forEach((id) => {
        const tracker = trackers[id] || {};
        const matchKeys = Array.isArray(tracker.effects_on_match)
            ? tracker.effects_on_match.map((e) => (e && e.key) ? e.key : null).filter(Boolean)
            : [];
        const eligibleKeys = Array.isArray(tracker.effects_on_eligible)
            ? tracker.effects_on_eligible.map((e) => (e && e.key) ? e.key : null).filter(Boolean)
            : [];
        matchKeys.forEach((reqKey) => {
            const distinct = eligibleKeys.filter((k) => k !== reqKey);
            if (distinct.length === 0) return;
            if (!distinctEligibleByReqKey[reqKey]) distinctEligibleByReqKey[reqKey] = new Set();
            distinct.forEach((k) => distinctEligibleByReqKey[reqKey].add(k));
        });
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

    // Category hierarchy cycle detection
    if (data.rules && data.rules.categoryHierarchy) {
        const hierarchy = data.rules.categoryHierarchy;
        Object.keys(hierarchy).forEach((catId) => {
            const visited = new Set();
            let cur = catId;
            while (cur && hierarchy[cur]) {
                if (visited.has(cur)) {
                    addError(`[data] category hierarchy cycle detected involving: ${catId}`);
                    break;
                }
                visited.add(cur);
                const parents = hierarchy[cur];
                cur = Array.isArray(parents) ? parents[0] : null;
            }
        });
    }

    const normalizePeriodSpec = (spec) => {
        if (!spec) return { periodType: "none", anchorRef: null };
        if (typeof spec === "string") return { periodType: spec, anchorRef: null };
        if (typeof spec === "object") return { periodType: spec.type || "none", anchorRef: spec };
        return { periodType: "none", anchorRef: null };
    };
    const getSectionModuleRefs = (section, singleKey, listKey) => {
        const out = [];
        if (!section || typeof section !== "object") return out;
        if (typeof section[singleKey] === "string" && section[singleKey]) out.push(section[singleKey]);
        if (Array.isArray(section[listKey])) {
            section[listKey].forEach((id) => {
                if (typeof id === "string" && id) out.push(id);
            });
        }
        return Array.from(new Set(out));
    };
    const getSectionCapLimit = (section) => {
        if (!section || typeof section !== "object") return null;
        const sectionCap = Number(section.cap);
        if (Number.isFinite(sectionCap) && sectionCap > 0) return sectionCap;
        if (section.capModule && modules[section.capModule]) {
            const moduleCap = Number(modules[section.capModule].cap_limit);
            if (Number.isFinite(moduleCap) && moduleCap > 0) return moduleCap;
        }
        return null;
    };
    const inferCampaignPromoType = (campaign) => {
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
                if (getSectionCapLimit(sec) === null) uncappedCapLikeCount += 1;
            }
            if (sec.type === "cap_rate") {
                capRateCount += 1;
                if (getSectionCapLimit(sec) === null) uncappedCapLikeCount += 1;
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
    };
    const campaignSectionStats = (campaign) => {
        const sections = Array.isArray(campaign && campaign.sections) ? campaign.sections : [];
        let mission = 0;
        let cap = 0;
        let capRate = 0;
        let tierCap = 0;
        let uncappedCapLike = 0;
        sections.forEach((sec) => {
            if (!sec || typeof sec !== "object") return;
            if (sec.type === "mission") mission += 1;
            if (sec.type === "cap") {
                cap += 1;
                if (getSectionCapLimit(sec) === null) uncappedCapLike += 1;
            }
            if (sec.type === "cap_rate") {
                capRate += 1;
                if (getSectionCapLimit(sec) === null) uncappedCapLike += 1;
            }
            if (sec.type === "tier_cap") tierCap += 1;
        });
        return { mission, cap, capRate, tierCap, capLike: cap + capRate, uncappedCapLike, sections };
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
        if (mod.valid_days) {
            if (!Array.isArray(mod.valid_days)) {
                addError(`[data] module ${modId} valid_days must be an array`);
            } else {
                mod.valid_days.forEach((day) => {
                    if (!Number.isInteger(day) || day < 0 || day > 6) {
                        addError(`[data] module ${modId} valid_days contains invalid value: ${day} (must be integer 0-6)`);
                    }
                });
            }
        }
        if (mod.cap && mod.cap.period) {
            const periodSpec = normalizePeriodSpec(mod.cap.period);
            const anchor = periodSpec.anchorRef || defaults[periodSpec.periodType];
            validateAnchor({ ...anchor, type: periodSpec.periodType }, `module:${modId}.cap`);
        } else if (mod.cap_key) {
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
        if (mod.req_mission_key && mod.req_mission_spend && !mod.progress_mission_key) {
            const distinct = distinctEligibleByReqKey[mod.req_mission_key];
            if (distinct && distinct.size > 0) {
                addWarning(`[data] module ${modId} mission has distinct eligible keys [${Array.from(distinct).join(", ")}] but progress_mission_key is missing`);
            }
        }
        if (mod.secondary_cap_key) {
            const found = Object.values(modules).some(
                (m) => m.cap_key === mod.secondary_cap_key
            );
            if (!found) {
                addWarning(`[data] module ${modId} secondary_cap_key "${mod.secondary_cap_key}" is not defined as cap_key in any module`);
            }
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

        const declaredPromoType = (typeof campaign.promo_type === "string" && campaign.promo_type.trim())
            ? campaign.promo_type.trim()
            : "";
        const inferredPromoType = inferCampaignPromoType(campaign);
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
        if (!declaredPromoType) {
            addWarning(`[data] campaign ${campaign.id} missing promo_type (inferred: ${inferredPromoType})`);
        } else if (!allowedPromoTypes.has(declaredPromoType)) {
            addError(`[data] campaign ${campaign.id} promo_type unsupported: ${declaredPromoType}`);
        } else if (declaredPromoType !== inferredPromoType && declaredPromoType !== "custom") {
            addWarning(`[data] campaign ${campaign.id} promo_type=${declaredPromoType} but inferred=${inferredPromoType}`);
        }

        const promoType = declaredPromoType || inferredPromoType;
        const stats = campaignSectionStats(campaign);
        const typeLabel = `campaign ${campaign.id} promo_type=${promoType}`;
        if (promoType === "mission_cap") {
            if (stats.mission < 1) addWarning(`[data] ${typeLabel} expects >=1 mission section`);
            if (stats.capLike < 1) addWarning(`[data] ${typeLabel} expects >=1 cap/cap_rate section`);
        }
        if (promoType === "mission_cap_rate") {
            if (stats.mission < 1) addWarning(`[data] ${typeLabel} expects >=1 mission section`);
            if (stats.capRate < 1) addWarning(`[data] ${typeLabel} expects >=1 cap_rate section`);
        }
        if (promoType === "mission_multi_cap") {
            if (stats.mission < 1) addWarning(`[data] ${typeLabel} expects >=1 mission section`);
            if (stats.capLike < 2) addWarning(`[data] ${typeLabel} expects >=2 cap/cap_rate sections`);
        }
        if (promoType === "tiered_cap") {
            if (stats.tierCap < 1) addWarning(`[data] ${typeLabel} expects >=1 tier_cap section`);
            stats.sections.forEach((sec, idx) => {
                if (sec.type !== "tier_cap") return;
                if (!Array.isArray(sec.tiers) || sec.tiers.length < 2) {
                    addError(`[data] campaign ${campaign.id}.section${idx + 1} tier_cap requires at least 2 tiers`);
                    return;
                }
                sec.tiers.forEach((tier, tierIdx) => {
                    if (!tier || typeof tier !== "object") {
                        addError(`[data] campaign ${campaign.id}.section${idx + 1} tier ${tierIdx + 1} is not an object`);
                        return;
                    }
                    if (!Number.isFinite(Number(tier.threshold))) {
                        addError(`[data] campaign ${campaign.id}.section${idx + 1} tier ${tierIdx + 1} missing threshold`);
                    }
                    if (!Number.isFinite(Number(tier.cap))) {
                        addError(`[data] campaign ${campaign.id}.section${idx + 1} tier ${tierIdx + 1} missing cap`);
                    }
                    if (!Number.isFinite(Number(tier.rate))) {
                        addError(`[data] campaign ${campaign.id}.section${idx + 1} tier ${tierIdx + 1} missing rate`);
                    }
                });
            });
        }
        if (promoType === "mission_uncapped") {
            if (stats.mission < 1) addWarning(`[data] ${typeLabel} expects >=1 mission section`);
            if (stats.capLike < 1) addWarning(`[data] ${typeLabel} expects >=1 cap/cap_rate section`);
            if (stats.capLike > stats.uncappedCapLike) {
                addWarning(`[data] ${typeLabel} has capped cap/cap_rate sections; expected uncapped only`);
            }
        }
        if (promoType === "mission_only" && stats.capLike > 0) {
            addWarning(`[data] ${typeLabel} should not include cap/cap_rate sections`);
        }

        if (campaign.period !== undefined) {
            addWarning(`[data] campaign ${campaign.id} has deprecated field: period (ignored)`);
        }
        if (campaign.badge !== undefined) {
            addWarning(`[data] campaign ${campaign.id} has deprecated field: badge (ignored)`);
        }
    });

    Object.keys(specialPromoModels).forEach((modelId) => {
        const model = specialPromoModels[modelId] || {};
        const promoType = (typeof model.promo_type === "string" && model.promo_type.trim()) ? model.promo_type.trim() : "";
        if (!promoType) {
            addWarning(`[data] specialPromoModels.${modelId} missing promo_type`);
            return;
        }
        if (promoType === "level_lifecycle") {
            if (!model.module || !modules[model.module]) {
                addError(`[data] specialPromoModels.${modelId} module missing: ${model.module}`);
            } else if (modules[model.module].type !== "guru_capped") {
                addWarning(`[data] specialPromoModels.${modelId} module ${model.module} is not guru_capped`);
            }

            const spendKey = model.usage && model.usage.spendKey;
            const rewardKey = model.usage && model.usage.rewardKey;
            if (!spendKey || !knownUsageKeys.has(spendKey)) {
                addError(`[data] specialPromoModels.${modelId} usage.spendKey missing/unknown: ${spendKey}`);
            }
            if (!rewardKey || !knownUsageKeys.has(rewardKey)) {
                addError(`[data] specialPromoModels.${modelId} usage.rewardKey missing/unknown: ${rewardKey}`);
            }

            if (!model.levels || typeof model.levels !== "object" || Array.isArray(model.levels)) {
                addError(`[data] specialPromoModels.${modelId} levels must be an object`);
            } else {
                Object.keys(model.levels).forEach((levelKey) => {
                    const level = model.levels[levelKey] || {};
                    if (!Number.isFinite(Number(level.targetSpend))) {
                        addError(`[data] specialPromoModels.${modelId} levels.${levelKey}.targetSpend invalid`);
                    }
                    if (!Number.isFinite(Number(level.rewardCap))) {
                        addError(`[data] specialPromoModels.${modelId} levels.${levelKey}.rewardCap invalid`);
                    }
                });
            }

            if (Array.isArray(model.cards)) {
                model.cards.forEach((cardId) => {
                    const card = cards.find((c) => c && c.id === cardId);
                    if (!card) {
                        addError(`[data] specialPromoModels.${modelId} card missing: ${cardId}`);
                        return;
                    }
                    if (model.module && Array.isArray(card.rewardModules) && !card.rewardModules.includes(model.module)) {
                        addWarning(`[data] specialPromoModels.${modelId} card ${cardId} missing module ${model.module}`);
                    }
                });
            }
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
            const allowedSectionTypes = new Set(["mission", "cap", "cap_rate", "tier_cap"]);
            if (!allowedSectionTypes.has(sec.type)) {
                addWarning(`[data] ${label} section type unsupported: ${sec.type}`);
            }
            if (sec.capModule && !modules[sec.capModule]) {
                addError(`[data] ${label} capModule missing: ${sec.capModule}`);
            }
            if (sec.rateModule && !modules[sec.rateModule]) {
                addError(`[data] ${label} rateModule missing: ${sec.rateModule}`);
            }
            if ((sec.type === "cap" || sec.type === "cap_rate") && sec.capModule && modules[sec.capModule]) {
                const moduleCap = Number(modules[sec.capModule].cap_limit);
                const sectionCap = Number(sec.cap);
                const hasCap = Number.isFinite(moduleCap) || Number.isFinite(sectionCap);
                if (!hasCap) {
                    addWarning(`[data] ${label} cap section has no cap_limit in module ${sec.capModule} and no sec.cap`);
                }
            }
            getSectionModuleRefs(sec, "missionModule", "missionModules").forEach((moduleId) => {
                if (!modules[moduleId]) addError(`[data] ${label} missionModule missing: ${moduleId}`);
            });
            getSectionModuleRefs(sec, "unlockModule", "unlockModules").forEach((moduleId) => {
                if (!modules[moduleId]) addError(`[data] ${label} unlockModule missing: ${moduleId}`);
            });
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
            if (
                sec.type === "mission" &&
                !sec.usageKey &&
                (!Array.isArray(sec.usageKeys) || sec.usageKeys.length === 0) &&
                getSectionModuleRefs(sec, "missionModule", "missionModules").length === 0
            ) {
                addWarning(`[data] ${label} mission section has no usageKey/usageKeys/missionModule`);
            }
            if (sec.type === "tier_cap") {
                if (!sec.totalKey) addWarning(`[data] ${label} tier_cap missing totalKey`);
                if (!sec.eligibleKey) addWarning(`[data] ${label} tier_cap missing eligibleKey`);
                if (!Array.isArray(sec.tiers) || sec.tiers.length < 2) {
                    addError(`[data] ${label} tier_cap requires at least 2 tiers`);
                }
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
