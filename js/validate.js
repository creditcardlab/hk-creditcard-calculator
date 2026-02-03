// js/validate.js - Data validation helpers

function validateData(data) {
    if (!data) {
        console.error("[data] DATA missing. Cannot validate.");
        return false;
    }

    const errors = [];
    const warnings = [];

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
            if (!modules[modId]) {
                addError(`[data] card ${card.id} references missing module: ${modId}`);
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
