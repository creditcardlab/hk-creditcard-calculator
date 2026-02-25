// js/ui.js - V10.10 (Fix Winter Promo Reward Bar)

function escapeHtml(input) {
    return String(input)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normalizeInfoText(input, maxLen = 120) {
    const raw = String(input || "").replace(/\s+/g, " ").trim();
    if (!raw) return "";
    if (raw.length <= maxLen) return raw;
    return `${raw.slice(0, Math.max(1, maxLen - 1)).trimEnd()}…`;
}

function isRedundantDescriptionForTitle(title, description) {
    const clean = (input) => String(input || "")
        .toLowerCase()
        .replace(/[()\[\]{}%＋+:/.,，。'"`~!@#$^&*_\-\s]/g, "")
        .trim();
    const t = clean(title);
    const d = clean(description);
    if (!t || !d) return false;
    return t === d || t.includes(d) || d.includes(t);
}

function getPrimarySourceUrl(raw) {
    const text = String(raw || "").trim();
    if (!text) return "";
    const matches = text.match(/https?:\/\/[^\s,]+/gi);
    if (!matches || matches.length === 0) return "";
    return String(matches[0]).replace(/[)\].,;]+$/, "");
}

function renderSourceLink(sourceUrl, sourceTitle, className, label) {
    const url = getPrimarySourceUrl(sourceUrl);
    if (!url) return "";
    const safeClass = className || "text-[10px] text-stone-600 hover:text-stone-800 underline underline-offset-2";
    const safeLabel = normalizeInfoText(label || "官方條款", 40);
    const safeTitle = normalizeInfoText(sourceTitle || "", 120);
    const titleAttr = safeTitle ? ` title="${escapeHtml(safeTitle)}"` : "";
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="${safeClass}"${titleAttr}>
        <i class="fas fa-arrow-up-right-from-square mr-1"></i>${escapeHtml(safeLabel)}
    </a>`;
}

function parseSourceUrls(raw) {
    const text = String(raw || "").trim();
    if (!text) return [];
    const matches = text.match(/https?:\/\/[^\s,]+/gi) || [];
    const cleaned = matches.map((u) => String(u).replace(/[)\].,;]+$/, "")).filter(Boolean);
    return Array.from(new Set(cleaned));
}

function isLikelyTncUrl(url) {
    const u = String(url || "").toLowerCase();
    if (!u) return false;
    return (
        u.includes(".pdf") ||
        u.includes("tnc") ||
        u.includes("term") ||
        u.includes("條款")
    );
}

function buildReferenceMeta(meta) {
    const raw = (meta && typeof meta === "object") ? meta : {};
    const hasOwn = (k) => Object.prototype.hasOwnProperty.call(raw, k);
    const getOwnRaw = (camelKey, snakeKey) => {
        if (hasOwn(camelKey)) return raw[camelKey];
        if (hasOwn(snakeKey)) return raw[snakeKey];
        return undefined;
    };
    const isNonEmpty = (v) => String(v || "").trim().length > 0;
    const sourceUrls = parseSourceUrls(raw.sourceUrl || raw.source_url || "");
    const tncRaw = getOwnRaw("tncUrl", "tnc_url");
    const promoRaw = getOwnRaw("promoUrl", "promo_url");
    const registrationRaw = getOwnRaw("registrationUrl", "registration_url");
    let tncUrl = getPrimarySourceUrl(tncRaw || "");
    let promoUrl = getPrimarySourceUrl(promoRaw || "");
    let registrationUrl = getPrimarySourceUrl(registrationRaw || "");
    const hasExplicitTnc = isNonEmpty(tncRaw);
    const hasExplicitPromo = isNonEmpty(promoRaw);
    const hasExplicitRegistration = isNonEmpty(registrationRaw);
    const registrationStart = String(
        raw.registrationStart || raw.registration_start || ""
    ).trim();
    const registrationEnd = String(
        raw.registrationEnd || raw.registration_end || ""
    ).trim();
    const registrationNote = normalizeInfoText(
        raw.registrationNote || raw.registration_note || raw.registrationChannel || raw.registration_channel || "",
        180
    );

    if (!tncUrl && !hasExplicitTnc) {
        const inferredTnc = sourceUrls.find((u) => isLikelyTncUrl(u)) || "";
        tncUrl = inferredTnc || (sourceUrls.length === 1 ? sourceUrls[0] : "");
    }
    if (!promoUrl && !hasExplicitPromo) {
        const nonTncSources = sourceUrls.filter((u) => !!u && u !== tncUrl && !isLikelyTncUrl(u));
        if (nonTncSources.length > 0) promoUrl = nonTncSources[0];
        else if (sourceUrls.length > 1) promoUrl = sourceUrls.find((u) => !!u && u !== tncUrl) || "";
    }
    if (!registrationUrl && !hasExplicitRegistration) registrationUrl = "";

    return {
        sourceUrl: sourceUrls.length > 0 ? sourceUrls[0] : "",
        tncUrl,
        promoUrl,
        registrationUrl,
        registrationStart,
        registrationEnd,
        registrationNote,
        sourceTitle: raw.sourceTitle || raw.source_title || "",
        implementationNote: raw.implementationNote || raw.implementation_note || ""
    };
}

function isCurrencyLikeUnit(unit) {
    const clean = String(unit || "").trim();
    return !clean || clean === "$" || clean === "HKD" || clean === "元" || clean === "HK$" || clean === "現金";
}

function formatTrimmedNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
    const abs = Math.abs(n);
    const decimals = abs >= 10 ? 1 : 2;
    return n.toFixed(decimals).replace(/\.?0+$/, "");
}

function formatRatePercent(rate) {
    const n = Number(rate);
    if (!Number.isFinite(n)) return "";
    const pct = n * 100;
    const rounded = pct >= 10 ? pct.toFixed(1) : pct.toFixed(2);
    return `${rounded.replace(/\.?0+$/, "")}%`;
}

function formatMilesCostPerMile(rate) {
    const n = Number(rate);
    if (!Number.isFinite(n) || n <= 0) return "";
    const cost = 1 / n;
    const numText = formatTrimmedNumber(cost);
    if (!numText) return "";
    return `$${numText}/里`;
}

function getCardRewardUnit(card) {
    const c = (card && typeof card === "object") ? card : {};
    const unit = c.redemption && c.redemption.unit ? String(c.redemption.unit).trim() : "";
    return unit || "";
}

function formatRateHint(rate, opts) {
    const n = Number(rate);
    if (!Number.isFinite(n)) return "";
    const options = opts || {};
    const mode = String(options.mode || "").trim();
    const unit = String(options.unit || "").trim();

    if (unit === "里") {
        const milesCost = formatMilesCostPerMile(n);
        if (!milesCost) return "";
        if (mode === "add") return `額外 ${milesCost}`;
        if (mode === "replace") return `${milesCost}（取代基本）`;
        return milesCost;
    }

    const showNative = !!unit && !isCurrencyLikeUnit(unit) && n >= 1;

    if (showNative) {
        const numText = formatTrimmedNumber(n);
        if (!numText) return "";
        if (mode === "add") return `每 $1 額外賺 ${numText} ${unit}`;
        if (mode === "replace") return `每 $1 賺 ${numText} ${unit}（取代基本）`;
        return `每 $1 賺 ${numText} ${unit}`;
    }

    const pctText = formatRatePercent(n);
    if (!pctText) return "";
    if (mode === "add") return `額外 ${pctText}`;
    if (mode === "replace") return `回贈 ${pctText}（取代基本）`;
    return `回贈 ${pctText}`;
}

function formatCapHint(cap, opts) {
    const options = opts || {};
    const fmtMoney = options.fmtMoney;
    if (typeof fmtMoney !== "function") return "";
    const n = Number(cap);
    if (!Number.isFinite(n)) return "";

    const capMode = String(options.capMode || "").trim();
    if (capMode === "spending") {
        const spendText = fmtMoney(n, "$");
        return spendText ? `每期最多計算 ${spendText} 合資格簽賬` : "";
    }

    const capText = fmtMoney(n, options.unit || "");
    if (!capText) return "";
    if (capMode === "reward") return `每期最多派發 ${capText}`;
    return `每期上限 ${capText}`;
}

function formatPeriodHint(mod) {
    const m = (mod && typeof mod === "object") ? mod : {};
    const parts = [];
    const capPeriod = (m.cap && m.cap.period) ? m.cap.period : null;
    const counterPeriod = (m.counter && m.counter.period) ? m.counter.period : null;
    const period = capPeriod || counterPeriod;
    if (period) {
        if (typeof period === "string") {
            if (period === "month") parts.push("每月重置");
            else if (period === "quarter") parts.push("每季重置");
            else if (period === "year") parts.push("每年重置");
        } else if (typeof period === "object" && period.type) {
            if (period.type === "month") parts.push("每月重置");
            else if (period.type === "quarter") parts.push("每季重置");
            else if (period.type === "year") parts.push("每年重置");
            else if (period.type === "promo") {
                const end = String(period.endDate || "").trim();
                if (end) parts.push(`推廣期至 ${end}`);
                else parts.push("推廣期內有效");
            }
        }
    }
    const validTo = String(m.valid_to || m.promo_end || "").trim();
    if (validTo && !parts.some(p => p.includes(validTo))) {
        parts.push(`至 ${validTo}`);
    }
    return parts.join(" · ");
}

function formatRetroactiveHint(mod) {
    const m = (mod && typeof mod === "object") ? mod : {};
    if (typeof m.retroactive === "undefined" || m.retroactive === null) return "";
    if (!m.req_mission_spend || !m.req_mission_key) return "";
    if (m.retroactive === true) return "達標後會補回先前簽賬";
    if (m.retroactive === false) return "達標前簽賬不計入";
    return "";
}

function buildModuleInfoLines(mod, card, profile) {
    const m = (mod && typeof mod === "object") ? mod : {};
    const cardRef = (card && typeof card === "object") ? card : {};
    const p = (profile && typeof profile === "object")
        ? profile
        : ((typeof userProfile !== "undefined" && userProfile) ? userProfile : null);
    const rewardUnit = getCardRewardUnit(cardRef);
    const lines = [];
    const isHsbcCard = String(cardRef.id || "").startsWith("hsbc_");
    const suppressMetaHints = (
        m.type === "red_hot_allocation" ||
        m.type === "red_hot_fixed_bonus" ||
        m.hide_meta_hints === true ||
        isHsbcCard
    );
    const categoryLabel = (key) => {
        if (!key) return "";
        const cat = (typeof DATA !== "undefined" && DATA && DATA.categories) ? DATA.categories[key] : null;
        if (!cat || !cat.label) return String(key);
        return String(cat.label).replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
    };
    const fmtAmount = (value, unit) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return "";
        const rounded = Math.floor(n).toLocaleString();
        const cleanUnit = String(unit || "").trim();
        if (!cleanUnit || isCurrencyLikeUnit(cleanUnit)) return `$${rounded}`;
        return `${rounded} ${cleanUnit}`;
    };
    const redHotGroupLabel = (key) => {
        if (key === "dining") return "賞滋味";
        if (key === "world") return "賞世界";
        if (key === "enjoyment") return "賞享受";
        if (key === "home") return "賞家居";
        if (key === "style") return "賞購物";
        return String(key || "");
    };

    if (m.type === "red_hot_allocation") {
        lines.push({ icon: "fas fa-tag", text: "適用：最紅自主類別（賞滋味/賞世界/賞享受/賞家居/賞購物）" });
        const perX = Number(m.rate_per_x) || 0;
        if (perX > 0) {
            lines.push({ icon: "fas fa-coins", text: `每 1X = 額外 ${formatRatePercent(perX)}` });
        }
        const alloc = (p && p.settings && p.settings.red_hot_allocation && typeof p.settings.red_hot_allocation === "object")
            ? p.settings.red_hot_allocation
            : null;
        if (alloc) {
            const keys = ["dining", "world", "enjoyment", "home", "style"];
            const parts = keys
                .map((k) => {
                    const x = Number(alloc[k]) || 0;
                    if (x <= 0) return "";
                    return `${redHotGroupLabel(k)} ${x}X`;
                })
                .filter(Boolean);
            if (parts.length > 0) {
                lines.push({ icon: "fas fa-sliders-h", text: `目前分配：${parts.join("；")}` });
            } else {
                lines.push({ icon: "fas fa-sliders-h", text: "目前分配：尚未分配 5X 權重" });
            }
        }
    } else if (m.type === "red_hot_fixed_bonus") {
        lines.push({ icon: "fas fa-tag", text: "適用：最紅自主類別" });
        const perX = Number(m.rate_per_x) || 0;
        const mul = Number(m.multiplier) || 0;
        if (perX > 0 && mul > 0) {
            lines.push({ icon: "fas fa-coins", text: `固定額外 ${formatRatePercent(perX * mul)}` });
        }
    } else {
        // 1. Trigger condition (only for non-trivial modules)
        if (m.type !== "always") {
            const match = Array.isArray(m.match) ? m.match.filter(Boolean) : [];
            const triggerLabels = [];
            if (match.length > 0) {
                const labels = match.slice(0, 3).map((k) => categoryLabel(k));
                const suffix = match.length > 3 ? ` 等${match.length}類` : "";
                triggerLabels.push(`${labels.join("、")}${suffix}`);
            }

            const eligibleSrc = (typeof m.eligible_check === "function")
                ? String(m.eligible_check)
                : "";
            const textForMobileHint = `${String(m.display_name_zhhk || "")} ${String(m.desc || "")}`;
            const requiresMobilePay = /手機/.test(textForMobileHint)
                || (/paymentMethod/.test(eligibleSrc) && (
                    /!==\s*["']physical["']/.test(eligibleSrc)
                    || /!=\s*["']physical["']/.test(eligibleSrc)
                    || /(apple_pay|google_pay|samsung_pay|unionpay_cloud|omycard)/.test(eligibleSrc)
                ));
            if (requiresMobilePay) {
                triggerLabels.push("手機支付");
            }

            const triggerDisplay = Array.from(new Set(triggerLabels.filter(Boolean)));
            if (triggerDisplay.length > 0) {
                lines.push({ icon: "fas fa-tag", text: `適用：${triggerDisplay.join("、")}` });
            }
        }

        // 2. Rate
        if (Number.isFinite(Number(m.rate))) {
            const rateHint = formatRateHint(m.rate, { unit: rewardUnit, mode: m.mode || "" });
            if (rateHint) lines.push({ icon: "fas fa-coins", text: rateHint });
        } else if (Number.isFinite(Number(m.rate_per_x)) && Number.isFinite(Number(m.multiplier))) {
            const perX = Number(m.rate_per_x);
            const mul = Number(m.multiplier);
            const pctText = formatRatePercent(perX * mul);
            if (pctText) lines.push({ icon: "fas fa-coins", text: `${mul}X × ${formatRatePercent(perX)} = ${pctText}` });
        }
    }

    // 3. Mission
    if (Number.isFinite(Number(m.req_mission_spend)) && m.req_mission_key) {
        const target = Math.floor(Number(m.req_mission_spend));
        let missionText = `需先月簽 $${target.toLocaleString()}`;
        const retroHint = formatRetroactiveHint(m);
        if (retroHint) missionText += `（${retroHint}）`;
        lines.push({ icon: "fas fa-bullseye", text: missionText });
    }

    // 4/5. Cap + period hints are intentionally hidden on progress cards.
    // They are already represented by the section progress bars and badge/subtitle.

    if (lines.length === 0) {
        lines.push({ icon: "fas fa-info-circle", text: "按此模組的門檻、比率及上限計算" });
    }

    return lines;
}

function buildCampaignInfoLines(campaign) {
    const c = (campaign && typeof campaign === "object") ? campaign : {};
    const manualInfoLines = Array.isArray(c.info_lines)
        ? c.info_lines
            .map((line) => {
                if (typeof line === "string") {
                    const text = String(line || "").trim();
                    return text ? { icon: "fas fa-info-circle", text } : null;
                }
                if (!line || typeof line !== "object") return null;
                const text = String(line.text || "").trim();
                if (!text) return null;
                return {
                    icon: String(line.icon || "fas fa-info-circle").trim() || "fas fa-info-circle",
                    text
                };
            })
            .filter(Boolean)
        : [];
    if (manualInfoLines.length > 0) return manualInfoLines;

    const lines = [];
    const modules = (typeof DATA !== "undefined" && DATA && DATA.modules) ? DATA.modules : {};
    const cards = (typeof DATA !== "undefined" && DATA && Array.isArray(DATA.cards)) ? DATA.cards : [];
    const cardById = {};
    cards.forEach((card) => { if (card && card.id) cardById[card.id] = card; });

    const campaignCardIds = Array.isArray(c.cards) ? c.cards : [];
    const campaignModuleEntries = [];
    const seenIds = new Set();
    campaignCardIds.forEach((cardId) => {
        const card = cardById[cardId] || null;
        const modIds = Array.isArray(card && card.rewardModules) ? card.rewardModules : [];
        modIds.forEach((modId) => {
            if (!modId || seenIds.has(modId)) return;
            const mod = modules[modId] || null;
            if (!mod) return;
            seenIds.add(modId);
            campaignModuleEntries.push({ id: modId, mod });
        });
    });

    // Get reward unit from first campaign card
    let rewardUnit = "";
    for (let i = 0; i < campaignCardIds.length; i++) {
        const card = cardById[campaignCardIds[i]];
        const u = getCardRewardUnit(card);
        if (u) { rewardUnit = u; break; }
    }

    // Collect unique rate hints from campaign modules (non-always, non-base)
    const categoryLabel = (key) => {
        if (!key) return "";
        const cat = (typeof DATA !== "undefined" && DATA && DATA.categories) ? DATA.categories[key] : null;
        if (!cat || !cat.label) return String(key);
        return String(cat.label).replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
    };
    // Short label for rate prefixes — strip emojis, parenthetical notes (both ASCII and fullwidth)
    const categoryShort = (key) => {
        if (!key) return "";
        const cat = (typeof DATA !== "undefined" && DATA && DATA.categories) ? DATA.categories[key] : null;
        if (!cat || !cat.label) return String(key);
        return String(cat.label)
            .replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/gu, "")
            .replace(/\s*[（(][^）)]*[）)]\s*/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    };
    const isOverseasCategory = (key) => {
        if (!key) return false;
        const cats = (typeof DATA !== "undefined" && DATA && DATA.categories) ? DATA.categories : {};
        let current = String(key);
        for (let i = 0; i < 6; i += 1) {
            if (current === "overseas") return true;
            const cat = cats[current];
            if (!cat || !cat.parent) break;
            current = String(cat.parent);
        }
        return String(key).startsWith("overseas");
    };
    const overseasShort = (key) => {
        if (!key || key === "overseas") return "海外";
        if (key === "overseas_cn" || key === "china_consumption") return "中國海外";
        if (key === "overseas_mo") return "澳門海外";
        const cat = (typeof DATA !== "undefined" && DATA && DATA.categories) ? DATA.categories[key] : null;
        const raw = String((cat && cat.label) || "");
        const m = raw.match(/[（(]([^）)]+)[）)]/);
        if (m && m[1]) {
            const region = String(m[1]).replace(/-舊/g, "").replace(/\s+/g, " ").trim();
            if (region && region !== "母類") return region === "其他" ? "其他海外" : `${region}海外`;
        }
        return "海外";
    };

    const rateEntries = []; // { cats: ["label", ...], hint: "每 $1 額外 25 積分" }
    const triggerLabels = [];
    const seenTriggers = new Set();
    let hasMission = false;
    let missionSpend = 0;
    let retroactive = null;

    // Filter to modules relevant to this campaign's sections
    const sectionCapKeys = new Set();
    const sectionModuleIds = new Set();
    const secs = Array.isArray(c.sections) ? c.sections : [];
    secs.forEach((sec) => {
        if (!sec) return;
        if (sec.capKey) sectionCapKeys.add(sec.capKey);
        if (sec.capModule) sectionModuleIds.add(sec.capModule);
        if (sec.rateModule) sectionModuleIds.add(sec.rateModule);
        if (sec.missionModule) sectionModuleIds.add(sec.missionModule);
        if (sec.unlockModule) sectionModuleIds.add(sec.unlockModule);
        if (Array.isArray(sec.missionModules)) sec.missionModules.forEach(id => sectionModuleIds.add(id));
        if (Array.isArray(sec.unlockModules)) sec.unlockModules.forEach(id => sectionModuleIds.add(id));
    });

    let relevantModules = campaignModuleEntries
        .filter((entry) => {
            const mod = entry && entry.mod ? entry.mod : null;
            if (!mod || mod.type === "always") return false;
            const capKey = String(mod.cap_key || "").trim();
            if (entry.id && sectionModuleIds.has(entry.id)) return true;
            return capKey && sectionCapKeys.has(capKey);
        })
        .map((entry) => entry.mod);

    const hasSectionRefs = sectionCapKeys.size > 0 || sectionModuleIds.size > 0;
    if (relevantModules.length === 0 && hasSectionRefs) {
        relevantModules = campaignModuleEntries
            .map((entry) => entry.mod)
            .filter((mod) => {
                if (!mod || mod.type === "always") return false;
                if (Number.isFinite(Number(mod.rate))) return true;
                if (Number.isFinite(Number(mod.req_mission_spend)) && mod.req_mission_key) return true;
                if (Number.isFinite(Number(mod.cap_limit)) && mod.cap_key) return true;
                return false;
            });
    }

    relevantModules.forEach((mod) => {
        // Trigger categories
        const match = Array.isArray(mod.match) ? mod.match.filter(Boolean) : [];
        const matchUnique = Array.from(new Set(match));
        const modCatShorts = [];
        const inferredTriggerLabels = [];
        const descText = String(mod.desc || "");
        const isAllOverseas = matchUnique.length > 0 && matchUnique.every(isOverseasCategory);

        if (match.length === 0) {
            if (/本地.*手機|手機.*本地/.test(descText)) inferredTriggerLabels.push("本地手機簽賬");
            if (/內地.*手機|手機.*內地|中國.*手機/.test(descText)) inferredTriggerLabels.push("內地手機簽賬");
            if (inferredTriggerLabels.length === 0 && /手機/.test(descText)) inferredTriggerLabels.push("手機簽賬");
        }

        if (isAllOverseas) {
            const overseasTriggerKey = "category:overseas";
            if (!seenTriggers.has(overseasTriggerKey)) {
                seenTriggers.add(overseasTriggerKey);
                triggerLabels.push("海外");
            }
            const hasCn = matchUnique.includes("overseas_cn") || matchUnique.includes("china_consumption");
            const hasMo = matchUnique.includes("overseas_mo");
            if (/中澳/.test(descText)) {
                modCatShorts.push("中澳海外");
            } else if (/其他海外/.test(descText)) {
                modCatShorts.push("其他海外");
            } else if (hasCn && hasMo && matchUnique.length === 2) {
                modCatShorts.push("中澳海外");
            } else if (matchUnique.length >= 3) {
                modCatShorts.push("海外");
            } else {
                matchUnique.forEach((k) => {
                    modCatShorts.push(overseasShort(k));
                });
            }
        } else {
            matchUnique.forEach((k) => {
                modCatShorts.push(categoryShort(k));
                if (!seenTriggers.has(k)) {
                    seenTriggers.add(k);
                    triggerLabels.push(categoryLabel(k));
                }
            });
        }
        inferredTriggerLabels.forEach((label) => {
            if (!label) return;
            modCatShorts.push(label);
            const triggerKey = `inferred:${label}`;
            if (!seenTriggers.has(triggerKey)) {
                seenTriggers.add(triggerKey);
                triggerLabels.push(label);
            }
        });
        const uniqueModCatShorts = Array.from(new Set(modCatShorts.filter(Boolean)));

        // Rate hints — associate with this module's short category labels
        if (Number.isFinite(Number(mod.rate))) {
            const hint = formatRateHint(mod.rate, { unit: rewardUnit, mode: mod.mode || "" });
            if (hint) {
                const dayType = (mod.valid_on_red_day === true)
                    ? "red_day"
                    : (mod.valid_on_red_day === false ? "weekday" : "");
                rateEntries.push({ cats: uniqueModCatShorts, hint, dayType });
            }
        }

        // Mission
        if (Number.isFinite(Number(mod.req_mission_spend)) && mod.req_mission_key) {
            hasMission = true;
            missionSpend = Math.max(missionSpend, Number(mod.req_mission_spend));
            if (typeof mod.retroactive !== "undefined") retroactive = mod.retroactive;
        }
    });

    // 1. Trigger
    if (triggerLabels.length > 0) {
        const display = triggerLabels.slice(0, 4);
        const suffix = triggerLabels.length > 4 ? ` 等${triggerLabels.length}類` : "";
        lines.push({ icon: "fas fa-tag", text: `適用：${display.join("、")}${suffix}` });
    }

    // 2. Rates
    const dayAwareEntries = rateEntries.filter((e) => e && e.dayType);
    if (dayAwareEntries.length > 0) {
        const dayLabels = { weekday: "平日", red_day: "紅日" };
        const dayParts = [];
        ["weekday", "red_day"].forEach((dayType) => {
            const entries = dayAwareEntries.filter((e) => e.dayType === dayType);
            if (entries.length === 0) return;
            const uniqueHintsByDay = [...new Set(entries.map((e) => e.hint))];
            if (uniqueHintsByDay.length === 1) {
                dayParts.push(`${dayLabels[dayType]}：${uniqueHintsByDay[0]}`);
                return;
            }
            const parts = entries.slice(0, 3).map((e) => {
                const catPrefix = e.cats.length > 0 ? e.cats.join("/") + "：" : "";
                return catPrefix + e.hint;
            });
            dayParts.push(`${dayLabels[dayType]}：${parts.join("；")}`);
        });
        if (dayParts.length > 0) {
            lines.push({ icon: "fas fa-coins", text: dayParts.join("；") });
        }
    } else {
        const uniqueHints = [...new Set(rateEntries.map(e => e.hint))];
        if (uniqueHints.length === 1) {
            // All modules share the same rate — no need for per-category labels
            lines.push({ icon: "fas fa-coins", text: uniqueHints[0] });
        } else if (rateEntries.length > 0) {
            // Different rates — prefix each with short category label
            const parts = rateEntries.slice(0, 3).map(e => {
                const catPrefix = e.cats.length > 0 ? e.cats.join("/") + "：" : "";
                return catPrefix + e.hint;
            });
            lines.push({ icon: "fas fa-coins", text: parts.join("；") });
        }
    }

    // 3. Mission
    if (hasMission && missionSpend > 0) {
        let missionText = `需先月簽 $${Math.floor(missionSpend).toLocaleString()}`;
        if (retroactive === true) missionText += "（達標後會補回先前簽賬）";
        else if (retroactive === false) missionText += "（達標前簽賬不計入）";
        lines.push({ icon: "fas fa-bullseye", text: missionText });
    }

    if (lines.length === 0) {
        lines.push({ icon: "fas fa-info-circle", text: "按此推廣的門檻、比率及上限計算" });
    }

    return lines;
}

function buildCampaignImplementationNote(campaign) {
    const c = (campaign && typeof campaign === "object") ? campaign : {};
    if (c.implementation_note && String(c.implementation_note).trim()) {
        return String(c.implementation_note).trim();
    }
    const modules = (typeof DATA !== "undefined" && DATA && DATA.modules) ? DATA.modules : {};
    const cards = (typeof DATA !== "undefined" && DATA && Array.isArray(DATA.cards)) ? DATA.cards : [];
    const cardById = {};
    cards.forEach((card) => {
        if (card && card.id) cardById[card.id] = card;
    });
    const toNum = (v) => {
        if (v === null || v === undefined || v === "") return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    };
    const fmtMoney = (value, unit) => {
        const n = toNum(value);
        if (n === null) return "";
        const cleanUnit = String(unit || "").trim();
        if (!cleanUnit || isCurrencyLikeUnit(cleanUnit)) return `$${Math.floor(n).toLocaleString()}`;
        return `${Math.floor(n).toLocaleString()} ${cleanUnit}`;
    };
    const fmtPct = (rate) => formatRatePercent(rate);
    const getModule = (id) => {
        if (!id) return null;
        return modules[id] || null;
    };
    const campaignCardIds = Array.isArray(c.cards) ? c.cards : [];
    const campaignModuleEntries = [];
    const seenCampaignModuleIds = new Set();
    campaignCardIds.forEach((cardId) => {
        const card = cardById[cardId] || null;
        const moduleIds = Array.isArray(card && card.rewardModules) ? card.rewardModules : [];
        moduleIds.forEach((moduleId) => {
            if (!moduleId || seenCampaignModuleIds.has(moduleId)) return;
            const mod = getModule(moduleId);
            if (!mod) return;
            seenCampaignModuleIds.add(moduleId);
            campaignModuleEntries.push({ id: moduleId, mod });
        });
    });
    const getCampaignModulesByCapKey = (capKey) => {
        const key = String(capKey || "").trim();
        if (!key) return [];
        return campaignModuleEntries
            .filter((entry) => entry && entry.mod && String(entry.mod.cap_key || "").trim() === key)
            .map((entry) => entry.mod);
    };
    const getCampaignRewardUnit = () => {
        for (let i = 0; i < campaignCardIds.length; i += 1) {
            const card = cardById[campaignCardIds[i]];
            const unit = getCardRewardUnit(card);
            if (unit) return unit;
        }
        return "";
    };
    const campaignRewardUnit = getCampaignRewardUnit();
    const getModuleRefs = (sec, singleKey, listKey) => {
        const refs = [];
        const single = sec && sec[singleKey];
        if (typeof single === "string" && single) refs.push(single);
        const list = sec && sec[listKey];
        if (Array.isArray(list)) {
            list.forEach((id) => {
                if (typeof id === "string" && id) refs.push(id);
            });
        }
        return Array.from(new Set(refs));
    };
    const getMissionTargetFromSection = (sec) => {
        const explicit = toNum(sec && sec.target);
        if (explicit !== null) return explicit;
        const refs = getModuleRefs(sec, "missionModule", "missionModules");
        for (let i = 0; i < refs.length; i += 1) {
            const mod = getModule(refs[i]);
            const target = toNum(mod && mod.req_mission_spend);
            if (target !== null) return target;
        }
        return null;
    };
    const getUnlockTargetFromSection = (sec) => {
        const explicit = toNum(sec && sec.unlockTarget);
        if (explicit !== null) return explicit;
        const refs = getModuleRefs(sec, "unlockModule", "unlockModules");
        for (let i = 0; i < refs.length; i += 1) {
            const mod = getModule(refs[i]);
            const target = toNum(mod && mod.req_mission_spend);
            if (target !== null) return target;
        }
        return null;
    };
    const getCapLimitFromSection = (sec) => {
        const explicit = toNum(sec && sec.cap);
        if (explicit !== null) return explicit;
        const capModule = sec && sec.capModule ? getModule(sec.capModule) : null;
        return toNum(capModule && capModule.cap_limit);
    };
    const getCapModeFromSection = (sec) => {
        const explicit = sec && typeof sec.capMode === "string" ? String(sec.capMode).trim() : "";
        if (explicit) return explicit;
        const capModule = sec && sec.capModule ? getModule(sec.capModule) : null;
        if (capModule && capModule.cap_mode) return String(capModule.cap_mode).trim();
        const capKey = sec && sec.capKey ? String(sec.capKey).trim() : "";
        if (!capKey) return "";
        const modes = Array.from(new Set(
            getCampaignModulesByCapKey(capKey)
                .map((mod) => String((mod && mod.cap_mode) || "").trim())
                .filter(Boolean)
        ));
        if (modes.length === 1) return modes[0];
        return "";
    };
    const getRateUnitFromSection = (sec) => {
        const sectionUnit = String((sec && sec.unit) || "").trim();
        if (sectionUnit && !isCurrencyLikeUnit(sectionUnit)) return sectionUnit;
        if (campaignRewardUnit && !isCurrencyLikeUnit(campaignRewardUnit)) return campaignRewardUnit;
        return sectionUnit || campaignRewardUnit || "";
    };
    const getRateHintsForSection = (sec) => {
        const hints = [];
        const seenHints = new Set();
        const rateUnit = getRateUnitFromSection(sec);
        const pushRateHint = (rateValue, modeValue) => {
            const rateNum = toNum(rateValue);
            if (rateNum === null) return;
            const hint = formatRateHint(rateNum, { unit: rateUnit, mode: modeValue || "" });
            if (!hint || seenHints.has(hint)) return;
            seenHints.add(hint);
            hints.push(hint);
        };

        const explicitRate = toNum(sec && sec.rate);
        if (explicitRate !== null) {
            pushRateHint(explicitRate, sec && sec.mode ? sec.mode : "");
            return hints;
        }

        const rateModule = sec && sec.rateModule ? getModule(sec.rateModule) : null;
        if (rateModule) pushRateHint(rateModule.rate, rateModule.mode || "");

        const capModule = sec && sec.capModule ? getModule(sec.capModule) : null;
        if (capModule) pushRateHint(capModule.rate, capModule.mode || "");

        if (hints.length > 0) return hints;

        const capKey = sec && sec.capKey ? String(sec.capKey).trim() : "";
        if (!capKey) return hints;
        getCampaignModulesByCapKey(capKey).forEach((mod) => {
            pushRateHint(mod && mod.rate, mod && mod.mode ? mod.mode : "");
        });
        return hints;
    };
    const sections = Array.isArray(c.sections) ? c.sections : [];
    const parts = [];
    const missionTargets = [];

    sections.forEach((sec) => {
        if (!sec || !sec.type) return;
        const label = normalizeProgressLabel(sec.type, String(sec.label_zhhk || sec.label || ""));
        if (sec.type === "mission") {
            const target = getMissionTargetFromSection(sec);
            if (target !== null) {
                missionTargets.push(target);
                parts.push(`先完成${label ? `「${label}」` : "任務"}（累積滿 ${fmtMoney(target)}）`);
            } else {
                parts.push(`先完成${label ? `「${label}」` : "簽賬任務"}後再計回贈`);
            }
            return;
        }

        if (sec.type === "cap_rate") {
            const unlockTarget = getUnlockTargetFromSection(sec);
            const fallbackTarget = missionTargets.length > 0 ? missionTargets[0] : null;
            const target = unlockTarget !== null ? unlockTarget : fallbackTarget;
            const rateHints = getRateHintsForSection(sec);
            const cap = getCapLimitFromSection(sec);
            const capMode = getCapModeFromSection(sec);
            const capUnit = capMode === "reward"
                ? (String(sec.unit || "").trim() || campaignRewardUnit || "$")
                : "$";
            const steps = [];
            if (target !== null) steps.push(`達 ${fmtMoney(target)} 後`);
            if (rateHints.length === 1) steps.push(rateHints[0]);
            else if (rateHints.length > 1) steps.push(`適用比率：${rateHints.join(" / ")}`);
            if (cap !== null) {
                const capHint = formatCapHint(cap, { capMode, unit: capUnit, fmtMoney });
                if (capHint) steps.push(capHint);
            }
            if (steps.length > 0) {
                parts.push(`${label ? `「${label}」` : "回贈"}：${steps.join("，")}`);
            }
            return;
        }

        if (sec.type === "tier_cap" && Array.isArray(sec.tiers) && sec.tiers.length > 0) {
            const tierText = sec.tiers
                .map((tier) => {
                    const threshold = fmtMoney(tier && tier.threshold);
                    const rate = fmtPct(tier && tier.rate);
                    const cap = fmtMoney(tier && tier.cap, sec.unit || "");
                    const bits = [];
                    if (threshold) bits.push(`達 ${threshold}`);
                    if (rate) bits.push(`回贈 ${rate}`);
                    if (cap) bits.push(`上限 ${cap}`);
                    return bits.join("，");
                })
                .filter(Boolean)
                .join("；");
            if (tierText) parts.push(`${label ? `「${label}」` : "分層回贈"}：${tierText}`);
            return;
        }

        if (sec.type === "cap") {
            const target = getUnlockTargetFromSection(sec);
            const fallbackTarget = missionTargets.length > 0 ? missionTargets[0] : null;
            const effectiveTarget = target !== null ? target : fallbackTarget;
            const rateHints = getRateHintsForSection(sec);
            const cap = getCapLimitFromSection(sec);
            const capMode = getCapModeFromSection(sec);
            const capUnit = capMode === "reward"
                ? (String(sec.unit || "").trim() || campaignRewardUnit || "$")
                : "$";
            const bits = [];
            if (effectiveTarget !== null) bits.push(`達 ${fmtMoney(effectiveTarget)} 後`);
            if (rateHints.length === 1) bits.push(rateHints[0]);
            else if (rateHints.length > 1) bits.push(`適用比率：${rateHints.join(" / ")}`);
            if (cap !== null) {
                const capHint = formatCapHint(cap, { capMode, unit: capUnit, fmtMoney });
                if (capHint) bits.push(capHint);
            }
            if (bits.length > 0) parts.push(`${label ? `「${label}」` : "上限進度"}：${bits.join("，")}`);
        }
    });

    const periodMeta = c.id ? getCampaignPeriodMeta(c.id) : null;
    const windows = (periodMeta && Array.isArray(periodMeta.windows)) ? periodMeta.windows : [];
    const windowRanges = windows
        .map((w) => {
            const start = String((w && w.startDate) || "").trim();
            const end = String((w && w.endDate) || "").trim();
            return (start && end) ? `${start} 至 ${end}` : "";
        })
        .filter(Boolean);
    if (windowRanges.length > 1) {
        parts.push(`各期獨立計算（${windowRanges.join("；")}）`);
    }

    if (!parts.length) parts.push("按此推廣的門檻、比率及上限計算");
    return `計算器做法：${parts.join("；")}。`;
}

function buildModuleImplementationNote(mod, card, title) {
    const m = (mod && typeof mod === "object") ? mod : {};
    const cardRef = (card && typeof card === "object") ? card : {};
    const rewardUnit = getCardRewardUnit(cardRef);
    const pct = (value) => formatRatePercent(value);
    const money = (value, unit) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return "";
        const cleanUnit = String(unit || "").trim();
        if (!cleanUnit || isCurrencyLikeUnit(cleanUnit)) return `$${Math.floor(n).toLocaleString()}`;
        return `${Math.floor(n).toLocaleString()} ${cleanUnit}`;
    };
    const spendMoney = (value) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return "";
        return `$${Math.floor(n).toLocaleString()}`;
    };
    const categoryLabel = (key) => {
        if (!key) return "";
        const cat = (typeof DATA !== "undefined" && DATA && DATA.categories) ? DATA.categories[key] : null;
        if (!cat || !cat.label) return String(key);
        return String(cat.label)
            .replace(/\s*\([^)]*\)\s*/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    };

    const parts = [];
    const match = Array.isArray(m.match) ? m.match.filter(Boolean) : [];
    if (match.length > 0) {
        const labels = match.slice(0, 3).map((k) => categoryLabel(k));
        const suffix = match.length > 3 ? ` 等 ${match.length} 類` : "";
        parts.push(`適用類別：${labels.join("、")}${suffix}`);
    }

    if (m.type === "red_hot_allocation") {
        const perX = pct(m.rate_per_x);
        if (perX) parts.push(`先分配最紅 5X，當中每 1X 對應額外 ${perX}`);
        parts.push("實際回贈 = 基本回贈 + 最紅加成");
    } else if (m.type === "red_hot_fixed_bonus") {
        const perX = Number(m.rate_per_x);
        const mul = Number(m.multiplier);
        if (Number.isFinite(perX) && Number.isFinite(mul)) {
            parts.push(`固定額外 ${pct(perX * mul)}`);
        }
    } else if (Number.isFinite(Number(m.rate))) {
        const rateHint = formatRateHint(m.rate, { unit: rewardUnit, mode: m.mode || "" });
        if (rateHint) parts.push(rateHint);
    } else if (Number.isFinite(Number(m.rate_per_x)) && Number.isFinite(Number(m.multiplier))) {
        const perX = Number(m.rate_per_x);
        const mul = Number(m.multiplier);
        parts.push(`比率：${mul}X × ${pct(perX)} = ${pct(perX * mul)}`);
    }

    if (Number.isFinite(Number(m.req_mission_spend)) && m.req_mission_key) {
        let missionPart = `需先累積門檻簽賬 ${spendMoney(m.req_mission_spend)} 才生效`;
        const retroHint = formatRetroactiveHint(m);
        if (retroHint) missionPart += `（${retroHint}）`;
        parts.push(missionPart);
    }

    if (Number.isFinite(Number(m.cap_limit)) && m.cap_key) {
        if (m.cap_mode === "spending") parts.push(`每期最多計算 ${spendMoney(m.cap_limit)} 合資格簽賬`);
        else parts.push(`每期最多派發 ${money(m.cap_limit, rewardUnit || "$")}`);
    }

    const periodHint = formatPeriodHint(m);
    if (periodHint) parts.push(periodHint);

    if (parts.length === 0) {
        const label = normalizeInfoText(title || m.desc || "此推廣", 60);
        return `計算器做法：按「${label}」的條款、門檻及上限計算。`;
    }
    return `計算器做法：${parts.join("；")}。`;
}

function buildCardImplementationNote(cardId) {
    if (!cardId || typeof DATA === "undefined" || !DATA || !Array.isArray(DATA.cards)) return "";
    const card = DATA.cards.find((c) => c && c.id === cardId) || null;
    if (!card) return "";
    const moduleIds = Array.isArray(card.rewardModules) ? card.rewardModules : [];
    const modules = moduleIds
        .map((id) => (DATA.modules && DATA.modules[id]) ? DATA.modules[id] : null)
        .filter(Boolean);

    if (modules.length === 0) {
        return "計算器做法：按此卡已啟用回贈規則計算，詳情可於個別推廣卡查看。";
    }

    const baseCount = modules.filter((m) => m.type === "always").length;
    const replaceCount = modules.filter((m) => m.mode === "replace").length;
    const addCount = modules.filter((m) => m.mode === "add").length;
    const capCount = modules.filter((m) => Number.isFinite(Number(m.cap_limit)) && m.cap_key).length;
    const missionCount = modules.filter((m) => Number.isFinite(Number(m.req_mission_spend)) && m.req_mission_key).length;
    const parts = [];

    if (baseCount > 0) parts.push("先計基本回贈");
    if (replaceCount > 0) parts.push(`有 ${replaceCount} 項指定類別會改用較高比率（replace）`);
    if (addCount > 0) parts.push(`有 ${addCount} 項推廣屬額外加成（add）`);
    if (missionCount > 0) parts.push(`有 ${missionCount} 項需先達簽賬門檻才生效`);
    if (capCount > 0) parts.push(`有 ${capCount} 項設有每期上限`);

    if (parts.length === 0) parts.push(`此卡由 ${modules.length} 項回贈規則組成`);
    parts.push("詳細比率、門檻與上限已顯示於推廣卡資訊列");
    return `計算器做法：${parts.join("；")}。`;
}

window.showImplementationHint = function (rawText) {
    const text = normalizeInfoText(rawText || "計算器做法：按此優惠的門檻、比率及上限計算。", 500);
    if (typeof window.showToast === "function") {
        window.showToast(text, "info", 4200);
        return;
    }
    alert(text);
};

function renderImplementationHintButton(note, className) {
    const clean = normalizeInfoText(note || "", 500);
    if (!clean) return "";
    const safe = escapeJsSingleQuoted(clean);
    const cls = className || "text-[10px] text-stone-600 hover:text-stone-800 underline underline-offset-2";
    return `<button type="button" onclick="showImplementationHint('${safe}')" class="${cls}">? 點樣計</button>`;
}

function renderReferenceActions(meta, options) {
    const opts = options || {};
    const m = buildReferenceMeta(meta || {});
    const links = [];
    const linkClass = opts.linkClass || "text-[10px] text-stone-600 hover:text-stone-800 underline underline-offset-2";

    if (opts.showPromo !== false && m.promoUrl && m.promoUrl !== m.tncUrl) {
        links.push(renderSourceLink(m.promoUrl, m.sourceTitle, linkClass, "推廣頁"));
    }
    if (opts.showTnc !== false && m.tncUrl && m.tncUrl !== m.promoUrl) {
        links.push(renderSourceLink(m.tncUrl, m.sourceTitle, linkClass, "條款"));
    }
    if (links.length === 0 && m.sourceUrl) {
        links.push(renderSourceLink(m.sourceUrl, m.sourceTitle, linkClass, "來源"));
    }

    const implBtn = opts.showImplementation === false
        ? ""
        : renderImplementationHintButton(m.implementationNote, opts.implClass || linkClass);

    const content = [...links.filter(Boolean), implBtn].filter(Boolean);
    if (content.length === 0) return "";
    return `<div class="mt-1 flex flex-wrap items-center gap-2">${content.join("")}</div>`;
}

function getCardReferenceMeta(cardId) {
    if (!cardId || typeof DATA === "undefined" || !DATA) return {};
    const card = Array.isArray(DATA.cards) ? DATA.cards.find((c) => c && c.id === cardId) : null;
    const urls = [];
    const tncUrls = [];
    const promoUrls = [];
    const registrationUrls = [];
    const registrationStarts = [];
    const registrationEnds = [];
    const registrationNotes = [];
    const titles = [];
    const pushUrl = (u) => {
        parseSourceUrls(u).forEach((x) => urls.push(x));
    };
    const pushPrimaryUrl = (u, target) => {
        const primary = getPrimarySourceUrl(u);
        if (primary) target.push(primary);
    };
    const pushRegDate = (v, target) => {
        const text = String(v || "").trim();
        if (text) target.push(text);
    };
    const pushTitle = (t) => {
        const clean = normalizeInfoText(t || "", 120);
        if (clean) titles.push(clean);
    };

    if (card) {
        pushUrl(card.source_url || "");
        pushPrimaryUrl(card.tnc_url || "", tncUrls);
        pushPrimaryUrl(card.promo_url || "", promoUrls);
        pushPrimaryUrl(card.registration_url || "", registrationUrls);
        pushRegDate(card.registration_start, registrationStarts);
        pushRegDate(card.registration_end, registrationEnds);
        if (card.registration_note) registrationNotes.push(card.registration_note);
        pushTitle(card.source_title || "");
        (Array.isArray(card.rewardModules) ? card.rewardModules : []).forEach((moduleId) => {
            const mod = DATA.modules && DATA.modules[moduleId] ? DATA.modules[moduleId] : null;
            if (!mod) return;
            pushUrl(mod.source_url || "");
            pushPrimaryUrl(mod.tnc_url || "", tncUrls);
            pushPrimaryUrl(mod.promo_url || "", promoUrls);
            pushPrimaryUrl(mod.registration_url || "", registrationUrls);
            pushRegDate(mod.registration_start, registrationStarts);
            pushRegDate(mod.registration_end, registrationEnds);
            if (mod.registration_note) registrationNotes.push(mod.registration_note);
            pushTitle(mod.source_title || "");
        });
    }

    const fallback = getCardReferenceFallback(cardId);
    parseSourceUrls(fallback.sourceUrl || "").forEach((u) => urls.push(u));
    pushPrimaryUrl(fallback.tncUrl || "", tncUrls);
    pushPrimaryUrl(fallback.promoUrl || "", promoUrls);
    pushPrimaryUrl(fallback.registrationUrl || "", registrationUrls);
    pushRegDate(fallback.registrationStart || "", registrationStarts);
    pushRegDate(fallback.registrationEnd || "", registrationEnds);
    if (fallback.registrationNote) registrationNotes.push(fallback.registrationNote);
    if (fallback.sourceTitle) pushTitle(fallback.sourceTitle);

    const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
    const sourceUrl = uniqueUrls.join(", ");
    const sourceTitle = Array.from(new Set(titles.filter(Boolean))).join(" | ");
    const firstUnique = (arr) => {
        const unique = Array.from(new Set((arr || []).filter(Boolean)));
        return unique.length > 0 ? unique[0] : "";
    };
    const minDate = (arr) => {
        const vals = Array.from(new Set((arr || []).filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")))));
        vals.sort();
        return vals.length > 0 ? vals[0] : "";
    };
    const maxDate = (arr) => {
        const vals = Array.from(new Set((arr || []).filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")))));
        vals.sort();
        return vals.length > 0 ? vals[vals.length - 1] : "";
    };
    return {
        sourceUrl,
        sourceTitle,
        tncUrl: firstUnique(tncUrls),
        promoUrl: firstUnique(promoUrls),
        registrationUrl: firstUnique(registrationUrls),
        registrationStart: minDate(registrationStarts),
        registrationEnd: maxDate(registrationEnds),
        registrationNote: firstUnique(registrationNotes)
    };
}

// Helper: Calculate days remaining
function getDaysLeft(dateStr) {
    if (!dateStr) return null;
    const end = new Date(dateStr);
    const now = new Date();
    const diff = end - now;
    if (diff < 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Helper: Standard Date Display (YYYY-MM-DD (剩 X 日))
function formatDateWithDaysLeft(dateStr) {
    if (!dateStr) return "";
    const days = getDaysLeft(dateStr);
    return `${dateStr} (剩 ${days} 日)`;
}

// Helper: Reset Date Display (重置於 YYYY-MM-DD (剩 X 日))
function formatResetDate(dateStr, periodType) {
    if (!dateStr) return "";
    const days = getDaysLeft(dateStr);
    const periodLabel = periodType === "month" ? "每月" : periodType === "quarter" ? "每季" : periodType === "year" ? "每年" : "";
    const prefix = periodLabel ? `${periodLabel} · ` : "";
    return `${prefix}於 ${dateStr} 重置 (剩 ${days} 日)`;
}

// Helper: Promo End Date Display (推廣期至 YYYY-MM-DD (剩 X 日))
function formatPromoDate(dateStr) {
    if (!dateStr) return "";
    const days = getDaysLeft(dateStr);
    return `推廣期至 ${dateStr} (剩 ${days} 日)`;
}

function getCampaignPeriodMeta(campaignId) {
    if (!campaignId || typeof DATA === "undefined") return null;
    const byCampaignId = DATA.periodPolicy && DATA.periodPolicy.byCampaignId ? DATA.periodPolicy.byCampaignId : null;
    return byCampaignId ? (byCampaignId[campaignId] || null) : null;
}

function formatPeriodEndBadge(periodSpec, campaignId) {
    if (!periodSpec || !periodSpec.type) return "";
    if (periodSpec.type === "promo") {
        const endDate = periodSpec.endDate || "";
        return endDate ? formatPromoDate(endDate) : "";
    }

    const today = new Date();
    const bucketKey = getBucketKey(today, periodSpec.type, periodSpec, campaignId || null);
    if (!bucketKey) return "";
    const startDate = parseDateInput(bucketKey);
    if (!startDate) return "";

    let nextStart = null;
    if (periodSpec.type === "month") nextStart = addMonths(startDate, 1);
    else if (periodSpec.type === "quarter") nextStart = addMonths(startDate, 3);
    else if (periodSpec.type === "year") nextStart = addMonths(startDate, 12);
    if (!nextStart) return "";

    const resetDate = new Date(nextStart.getTime());
    resetDate.setDate(resetDate.getDate() - 1);
    return formatResetDate(formatDateKey(resetDate), periodSpec.type);
}

function getCampaignBadgeText(campaign) {
    if (!campaign || !campaign.id) return "";
    const meta = getCampaignPeriodMeta(campaign.id);
    if (meta && meta.badge) {
        const badge = meta.badge;
        if (badge.type === "promo_end") return badge.endDate ? formatPromoDate(badge.endDate) : "推廣期至 待設定";
        // "重置於" 一律放 subtitle；badge 只保留推廣期資訊。
        if (badge.type === "period_end" && badge.period) return "";
        if (badge.type === "month_end") return "";
        if (badge.type === "quarter_end") return "";
        if (badge.type === "year_end") return "";
        if (badge.type === "static_date") return badge.date ? formatPromoDate(badge.date) : "推廣期至 待設定";
        if (badge.type === "text") return badge.text ? String(badge.text) : "";
    }

    // Fallback: infer from campaign period_policy dates.
    const policy = (campaign && campaign.period_policy) ? campaign.period_policy : null;
    const endFromPolicy = (policy && typeof policy.endDate === "string" && policy.endDate.trim())
        ? policy.endDate.trim()
        : ((policy && policy.period && typeof policy.period.endDate === "string" && policy.period.endDate.trim())
            ? policy.period.endDate.trim()
            : "");
    if (endFromPolicy) return formatPromoDate(endFromPolicy);

    // If still missing, force explicit data hygiene signal.
    return "推廣期至 待設定";
}

function getCampaignResetSubTitle(campaign) {
    if (!campaign || !campaign.id) return "";
    const meta = getCampaignPeriodMeta(campaign.id);
    if (!meta || !meta.counterPeriod || !meta.counterPeriod.type) return "";
    const p = meta.counterPeriod;
    if (p.type !== "month" && p.type !== "quarter" && p.type !== "year") return "";
    return formatPeriodEndBadge(p, campaign.id);
}

function getCampaignOffers() {
    if (typeof DATA === "undefined" || !DATA) return [];
    const legacyCampaigns = Array.isArray(DATA.campaigns) ? DATA.campaigns : [];
    const orderMap = {};
    const campaignById = {};
    legacyCampaigns.forEach((campaign, idx) => {
        if (campaign && campaign.id) {
            orderMap[campaign.id] = idx;
            campaignById[campaign.id] = campaign;
        }
    });

    const offers = (Array.isArray(DATA.offers) ? DATA.offers : [])
        .filter((offer) => offer && offer.renderType === "campaign_sections" && offer.id)
        .map((offer) => {
            const raw = campaignById[offer.id] || {};
            const reg = (DATA.campaignRegistry && DATA.campaignRegistry[offer.id]) ? DATA.campaignRegistry[offer.id] : {};
            const hasOwn = (obj, key) => !!obj && Object.prototype.hasOwnProperty.call(obj, key);
            const firstNonEmpty = (values) => {
                const found = (values || []).find((v) => String(v || "").trim().length > 0);
                return found ? String(found).trim() : "";
            };
            const hasExplicitEmpty = (pairs) => (pairs || []).some(([obj, key]) => hasOwn(obj, key) && String(obj[key] || "").trim() === "");
            const refs = Array.isArray(offer.moduleRefs) ? offer.moduleRefs : [];
            const firstRefModule = refs
                .map((id) => (DATA.modules && DATA.modules[id]) ? DATA.modules[id] : null)
                .find((mod) => !!mod);
            const cardIds = Array.isArray(offer.cards) ? offer.cards : (Array.isArray(raw.cards) ? raw.cards : []);
            const firstCardId = cardIds.find((id) => !!id) || "";
            const firstCard = cardIds
                .map((id) => (Array.isArray(DATA.cards) ? DATA.cards.find((c) => c && c.id === id) : null))
                .find((card) => !!card);
            const firstCardMeta = firstCardId ? getCardReferenceMeta(firstCardId) : {};
            const explicitNoTnc = hasExplicitEmpty([
                [offer, "tnc_url"],
                [raw, "tnc_url"],
                [reg, "tncUrl"],
                [reg, "tnc_url"]
            ]);
            const explicitNoPromo = hasExplicitEmpty([
                [offer, "promo_url"],
                [raw, "promo_url"],
                [reg, "promoUrl"],
                [reg, "promo_url"]
            ]);
            const explicitNoRegUrl = hasExplicitEmpty([
                [offer, "registration_url"],
                [raw, "registration_url"],
                [reg, "registrationUrl"],
                [reg, "registration_url"]
            ]);
            const fallbackSourceUrl = firstNonEmpty([
                firstRefModule ? firstRefModule.source_url : "",
                firstCard ? firstCard.source_url : "",
                firstCardMeta.sourceUrl
            ]);
            const fallbackSourceTitle = firstNonEmpty([
                firstRefModule ? firstRefModule.source_title : "",
                firstCard ? firstCard.source_title : "",
                firstCardMeta.sourceTitle
            ]);
            const fallbackTncUrl = firstNonEmpty([
                firstRefModule ? firstRefModule.tnc_url : "",
                firstCard ? firstCard.tnc_url : "",
                firstCardMeta.tncUrl
            ]);
            const fallbackPromoUrl = firstNonEmpty([
                firstRefModule ? firstRefModule.promo_url : "",
                firstCard ? firstCard.promo_url : "",
                firstCardMeta.promoUrl
            ]);
            const fallbackRegistrationUrl = firstNonEmpty([
                firstRefModule ? firstRefModule.registration_url : "",
                firstCard ? firstCard.registration_url : "",
                firstCardMeta.registrationUrl
            ]);
            const fallbackRegistrationStart = firstNonEmpty([
                firstRefModule ? firstRefModule.registration_start : "",
                firstCard ? firstCard.registration_start : "",
                firstCardMeta.registrationStart
            ]);
            const fallbackRegistrationEnd = firstNonEmpty([
                firstRefModule ? firstRefModule.registration_end : "",
                firstCard ? firstCard.registration_end : "",
                firstCardMeta.registrationEnd
            ]);
            const fallbackRegistrationNote = firstNonEmpty([
                firstRefModule ? firstRefModule.registration_note : "",
                firstCard ? firstCard.registration_note : "",
                firstCardMeta.registrationNote
            ]);
            const resolvedCampaignModel = (raw && raw.id) ? raw : offer;
            const normalizeInfoLines = (arr) => {
                if (!Array.isArray(arr)) return [];
                return arr
                    .map((line) => {
                        if (typeof line === "string") {
                            const text = String(line || "").trim();
                            return text ? { icon: "fas fa-info-circle", text } : null;
                        }
                        if (!line || typeof line !== "object") return null;
                        const text = String(line.text || "").trim();
                        if (!text) return null;
                        return {
                            icon: String(line.icon || "fas fa-info-circle").trim() || "fas fa-info-circle",
                            text
                        };
                    })
                    .filter(Boolean);
            };
            return {
                ...offer,
                display_name_zhhk: offer.display_name_zhhk || raw.display_name_zhhk || "",
                name: offer.name || raw.name || "",
                note_zhhk: offer.note_zhhk || raw.note_zhhk || (firstRefModule ? (firstRefModule.note_zhhk || "") : ""),
                info_lines: normalizeInfoLines(offer.info_lines || raw.info_lines),
                source_url: firstNonEmpty([offer.source_url, raw.source_url, fallbackSourceUrl]),
                source_title: firstNonEmpty([offer.source_title, raw.source_title, fallbackSourceTitle]),
                tnc_url: firstNonEmpty([offer.tnc_url, raw.tnc_url, reg.tncUrl, explicitNoTnc ? "" : fallbackTncUrl]),
                promo_url: firstNonEmpty([offer.promo_url, raw.promo_url, reg.promoUrl, explicitNoPromo ? "" : fallbackPromoUrl]),
                registration_url: firstNonEmpty([offer.registration_url, raw.registration_url, reg.registrationUrl, explicitNoRegUrl ? "" : fallbackRegistrationUrl]),
                registration_start: firstNonEmpty([offer.registration_start, raw.registration_start, reg.registrationStart, fallbackRegistrationStart]),
                registration_end: firstNonEmpty([offer.registration_end, raw.registration_end, reg.registrationEnd, fallbackRegistrationEnd]),
                registration_note: firstNonEmpty([offer.registration_note, raw.registration_note, reg.registrationNote, fallbackRegistrationNote]),
                implementation_note: firstNonEmpty([
                    offer.implementation_note,
                    raw.implementation_note,
                    reg.implementationNote,
                    buildCampaignImplementationNote(resolvedCampaignModel)
                ])
            };
        });
    offers.sort((a, b) => {
        const ai = Object.prototype.hasOwnProperty.call(orderMap, a.id) ? orderMap[a.id] : Number.MAX_SAFE_INTEGER;
        const bi = Object.prototype.hasOwnProperty.call(orderMap, b.id) ? orderMap[b.id] : Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        return String(a.id).localeCompare(String(b.id));
    });
    return offers;
}

function resolveAnchorForKeyUi(key, entry, userProfile) {
    const defaults = (typeof DATA !== "undefined" && DATA.periodDefaults) ? DATA.periodDefaults : {};
    const overrides = (userProfile && userProfile.settings && userProfile.settings.periodOverrides) ? userProfile.settings.periodOverrides : {};

    let override = null;
    if (overrides.byKey && overrides.byKey[key]) {
        override = overrides.byKey[key];
    }
    if (!override && entry && entry.refType === "module" && overrides.modules && overrides.modules[entry.refId]) {
        override = overrides.modules[entry.refId];
    }
    if (!override && entry && (entry.refType === "promo" || entry.refType === "campaign") && overrides.byCampaignId && overrides.byCampaignId[entry.refId]) {
        override = overrides.byCampaignId[entry.refId];
    }
    if (!override && entry && entry.refType === "promo" && overrides.promos && overrides.promos[entry.refId]) {
        override = overrides.promos[entry.refId];
    }

    const base = override || (entry ? entry.anchorRef : null) || (entry && entry.periodType ? defaults[entry.periodType] : null) || null;
    if (!base) return null;
    const normalized = { ...base };
    if (entry && entry.periodType && !normalized.type) normalized.type = entry.periodType;
    if (entry && (entry.refType === "promo" || entry.refType === "campaign") && entry.refId) normalized.promoId = entry.refId;
    return normalized;
}

function getResetBadgeForKey(key, userProfile) {
    if (typeof DATA === "undefined" || !DATA.countersRegistry) return "";
    const entry = DATA.countersRegistry[key];
    if (!entry || !entry.periodType) return "";

    // Non-resettable counters have no reset subtitle.
    if (entry.periodType === "none") {
        return "";
    }

    const anchor = resolveAnchorForKeyUi(key, entry, userProfile);
    if (entry.periodType === "promo") return "";

    const today = new Date();
    const bucketKey = getBucketKey(today, entry.periodType, anchor, anchor && anchor.promoId);
    if (!bucketKey) return "";
    const startDate = parseDateInput(bucketKey);
    if (!startDate) return "";

    let nextStart = null;
    if (entry.periodType === "month") nextStart = addMonths(startDate, 1);
    else if (entry.periodType === "quarter") nextStart = addMonths(startDate, 3);
    else if (entry.periodType === "year") nextStart = addMonths(startDate, 12);
    if (!nextStart) return "";

    const resetDate = new Date(nextStart.getTime());
    resetDate.setDate(resetDate.getDate() - 1);
    return formatResetDate(formatDateKey(resetDate), entry.periodType);
}

function getPromoBadgeForModule(mod) {
    if (!mod || typeof mod !== "object") return "推廣期至 待設定";
    const endDate = (typeof mod.promo_end === "string" && mod.promo_end.trim())
        ? mod.promo_end.trim()
        : ((typeof mod.valid_to === "string" && mod.valid_to.trim()) ? mod.valid_to.trim() : "");
    return endDate ? formatPromoDate(endDate) : "推廣期至 待設定";
}

function getTxDateForUi(tx) {
    if (tx && tx.txDate) {
        const parts = String(tx.txDate).split('-').map(n => parseInt(n, 10));
        if (parts.length === 3 && parts.every(n => Number.isFinite(n))) {
            const [yy, mm, dd] = parts;
            const d = new Date(yy, mm - 1, dd);
            if (!Number.isNaN(d.getTime())) return d;
        }
    }
    if (tx && tx.date) {
        const d = new Date(tx.date);
        if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
}

function getDashboardPeriodRange(periodKey) {
    const now = new Date();
    const key = String(periodKey || "month");
    if (key === "all") return { start: null, endExclusive: null };

    if (key === "year") {
        const start = new Date(now.getFullYear(), 0, 1);
        const endExclusive = new Date(now.getFullYear() + 1, 0, 1);
        return { start, endExclusive };
    }

    if (key === "quarter") {
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        const start = new Date(now.getFullYear(), quarterStartMonth, 1);
        const endExclusive = new Date(now.getFullYear(), quarterStartMonth + 3, 1);
        return { start, endExclusive };
    }

    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const endExclusive = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, endExclusive };
}

function isDateInDashboardPeriod(date, periodRange) {
    if (!date || Number.isNaN(date.getTime())) return false;
    if (!periodRange || !periodRange.start || !periodRange.endExclusive) return true;
    return date >= periodRange.start && date < periodRange.endExclusive;
}

function parseNativeRewardFromText(rebateText) {
    const raw = String(rebateText || "").trim();
    if (!raw) return null;
    const numberMatch = raw.match(/-?\d[\d,]*(?:\.\d+)?/);
    if (!numberMatch) return null;
    const value = Number(String(numberMatch[0]).replace(/,/g, ""));
    if (!Number.isFinite(value)) return null;

    if (raw.includes("$") || /^HK\$/i.test(raw)) {
        return { value, unit: "$" };
    }

    const unitRaw = raw.replace(numberMatch[0], "").replace(/[()]/g, "").trim();
    const unit = unitRaw || "點數";
    return { value, unit };
}

function getTxForeignFeeForDashboard(tx, settings) {
    const t = (tx && typeof tx === "object") ? tx : {};
    const cardId = String(t.cardId || "").trim();
    const category = String(t.category || "").trim();
    const amount = Number(t.amount) || 0;
    if (!cardId || !category || amount <= 0) return 0;
    if (typeof DATA === "undefined" || !DATA || !Array.isArray(DATA.cards)) return 0;

    const card = DATA.cards.find((c) => c && c.id === cardId) || null;
    if (!card) return 0;

    const isForeign = (typeof isForeignCategory === "function")
        ? isForeignCategory(category)
        : (category === "overseas" || category === "foreign");
    if (!isForeign) return 0;

    const txDate = (typeof t.txDate === "string" && t.txDate.trim())
        ? t.txDate.trim()
        : "";
    if (!txDate) return 0;

    let feeRate = 0;
    if (typeof getForeignFeeRate === "function") {
        feeRate = Number(getForeignFeeRate(card, category, { settings: settings || {}, txDate })) || 0;
    } else {
        const base = Number(card.fcf) || 0;
        const exempt = Array.isArray(card.fcf_exempt_categories) ? card.fcf_exempt_categories : [];
        feeRate = exempt.includes(category) ? 0 : base;
    }
    if (feeRate <= 0) return 0;
    return amount * feeRate;
}

function getTxMemberDayDiscountForDashboard(tx, settings) {
    const t = (tx && typeof tx === "object") ? tx : {};
    const stored = Number(t.memberDayDiscount);
    if (Number.isFinite(stored) && stored > 0) return stored;
    const cardId = String(t.cardId || "").trim();
    const category = String(t.category || "").trim();
    const amount = Number(t.amount) || 0;
    const merchantId = String(t.merchantId || "").trim();
    if (!cardId || !category || amount <= 0 || !merchantId) return 0;
    if (typeof DATA === "undefined" || !DATA || !Array.isArray(DATA.cards)) return 0;

    const card = DATA.cards.find((c) => c && c.id === cardId) || null;
    if (!card) return 0;

    const txDate = (typeof t.txDate === "string" && t.txDate.trim())
        ? t.txDate.trim()
        : "";
    if (!txDate) return 0;
    const isOnline = !!t.isOnline;
    if (typeof getHsbcEasyMemberDayDiscount !== "function") return 0;
    return Number(getHsbcEasyMemberDayDiscount(card, amount, category, {
        settings: settings || {},
        txDate,
        merchantId,
        isOnline
    })) || 0;
}

function getDashboardTotalsByPeriod(transactions, periodKey, profile) {
    if (!Array.isArray(transactions)) {
        return { spend: 0, rewardCash: 0, count: 0, nativeByUnit: {} };
    }
    const settings = (profile && profile.settings)
        ? profile.settings
        : ((typeof userProfile !== "undefined" && userProfile && userProfile.settings) ? userProfile.settings : {});
    const periodRange = getDashboardPeriodRange(periodKey);
    let spend = 0;
    let rewardCash = 0;
    let count = 0;
    const nativeByUnit = {};

    transactions.forEach((tx) => {
        const txDate = getTxDateForUi(tx);
        if (!isDateInDashboardPeriod(txDate, periodRange)) return;
        spend += Number(tx.amount) || 0;
        count += 1;

        const foreignFee = getTxForeignFeeForDashboard(tx, settings);
        if (foreignFee > 0) rewardCash -= foreignFee;
        const memberDayDiscount = getTxMemberDayDiscountForDashboard(tx, settings);
        if (memberDayDiscount > 0) rewardCash += memberDayDiscount;

        const parsed = parseNativeRewardFromText(tx.rebateText);
        if (!parsed) return;
        if (parsed.unit === "$") {
            rewardCash += Number(parsed.value) || 0;
            return;
        }
        nativeByUnit[parsed.unit] = (Number(nativeByUnit[parsed.unit]) || 0) + parsed.value;
    });

    return { spend, rewardCash, count, nativeByUnit };
}

function formatNativeRewardSummary(nativeByUnit) {
    const entries = Object.entries(nativeByUnit || {}).filter((entry) => Number(entry[1]) > 0);
    if (entries.length === 0) return "—";
    entries.sort((a, b) => Number(b[1]) - Number(a[1]));
    return entries.slice(0, 3).map(([unit, value]) => `${Math.floor(Number(value)).toLocaleString()} ${unit}`).join("＋");
}

function getDashboardPeriodLabel(periodKey) {
    if (periodKey === "quarter") return "本季";
    if (periodKey === "year") return "今年";
    if (periodKey === "all") return "全部";
    return "本月";
}

function getCardBankKey(cardId) {
    const id = String(cardId || "");
    if (id.startsWith("hsbc_")) return "hsbc";
    if (id.startsWith("sc_")) return "sc";
    if (id.startsWith("citi_")) return "citi";
    if (id.startsWith("dbs_")) return "dbs";
    if (id.startsWith("hangseng_")) return "hangseng";
    if (id.startsWith("boc_")) return "boc";
    if (id.startsWith("ae_")) return "ae";
    if (id.startsWith("fubon_")) return "fubon";
    if (id.startsWith("bea_")) return "bea";
    if (id.startsWith("sim_")) return "sim";
    if (id.startsWith("aeon_")) return "aeon";
    if (id.startsWith("wewa")) return "wewa";
    if (id.startsWith("mox_")) return "mox";
    if (id.startsWith("earnmore")) return "earnmore";
    return "other";
}

const BANK_REFERENCE_FALLBACKS = {
    hsbc: {
        sourceTitle: "HSBC 信用卡官方資料",
        tncUrl: "https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/reward-scheme-terms-and-conditions.pdf",
        promoUrl: "https://www.hsbc.com.hk/zh-hk/credit-cards/"
    },
    sc: {
        sourceTitle: "渣打信用卡官方資料",
        tncUrl: "https://av.sc.com/hk/content/docs/hk-cxuo-bonus-miles-tnc.pdf",
        promoUrl: "https://www.sc.com/hk/zh/credit-cards/"
    },
    citi: {
        sourceTitle: "Citi 信用卡官方資料",
        tncUrl: "https://www.citibank.com.hk/english/credit-cards/pdf/rewards-card/faq.pdf",
        promoUrl: "https://www.citibank.com.hk/chinese/credit-cards/"
    },
    dbs: {
        sourceTitle: "DBS 信用卡官方資料",
        tncUrl: "https://www.dbs.com.hk/iwov-resources/pdf/creditcards/DBS-rewards-master-tnc-201709.pdf",
        promoUrl: "https://www.dbs.com.hk/personal-zh/cards/"
    },
    hangseng: {
        sourceTitle: "恒生信用卡官方資料",
        tncUrl: "https://www.hangseng.com/content/dam/wpb/hase/rwd/personal/cards/pdfs/everyday_tnc_tc.pdf",
        promoUrl: "https://www.hangseng.com/zh-hk/personal/cards/"
    },
    boc: {
        sourceTitle: "中銀信用卡官方資料",
        tncUrl: "https://www.bochk.com/dam/boccreditcard/latestpromotions/rewards2601/tnc_tc.pdf",
        promoUrl: "https://www.bochk.com/tc/creditcard/promotions/offers/"
    },
    ae: {
        sourceTitle: "American Express 官方資料",
        tncUrl: "https://www.americanexpress.com/content/dam/amex/hk/ch/staticassets/pdf/cards/explorer-credit-card/MRTnC_CHI.pdf",
        promoUrl: "https://www.americanexpress.com/zh-hk/benefits/offers/"
    },
    fubon: {
        sourceTitle: "富邦信用卡官方資料",
        tncUrl: "https://www.fubonbank.com.hk/tc/cards/bonus-points-program/extra-reward.html#box-tnc",
        promoUrl: "https://www.fubonbank.com.hk/tc/cards/"
    },
    bea: {
        sourceTitle: "東亞信用卡官方資料",
        tncUrl: "https://www.hkbea.com/pdf/tc/credit-card/master-reward-tnc_tc.pdf",
        promoUrl: "https://www.hkbea.com/html/tc/bea-credit-card/"
    },
    sim: {
        sourceTitle: "sim 信用卡官方資料",
        tncUrl: "https://cdn.thesim.com/88_sim_Credit_Card_Terms_and_Conditions_of_Cash_Back_Promotion_TC_final_922dadcd98.pdf?updated_at=2026-01-30T09:07:02.934Z",
        promoUrl: "https://www.thesim.com/"
    },
    aeon: {
        sourceTitle: "AEON 信用卡官方資料",
        tncUrl: "https://www.aeon.com.hk/tc/pdf/credit-card/AEONCARDWAKUWAKU_RBBD_TC.pdf",
        promoUrl: "https://www.aeon.com.hk/tc/"
    },
    wewa: {
        sourceTitle: "WeWa 信用卡官方資料",
        tncUrl: "https://www.wewacard.com/wp-content/uploads/2025/04/WeWa-Cash-Rebate-Program-Terms-Conditions_Eff-20250701.pdf",
        promoUrl: "https://www.wewacard.com/overseas-cash-rebate/"
    },
    mox: {
        sourceTitle: "Mox Credit 官方資料",
        tncUrl: "https://mox.com/static/0_Foreign_Currencies_and_Overseas_Merchant_Spending_Fees_Promotion_TnC.pdf",
        promoUrl: "https://mox.com/zh/features/mox-credit/"
    },
    earnmore: {
        sourceTitle: "安信 EarnMORE 官方資料",
        tncUrl: "https://www.primecredit.com/wp-content/uploads/2026/01/C20251153_EarnMORE2026Q1_MKTWEB_300_01022026.pdf",
        promoUrl: "https://www.primecredit.com/"
    }
};

const CARD_REFERENCE_FALLBACKS = {
    sc_smart: {
        tncUrl: "https://av.sc.com/hk/zh/content/docs/hk-promo-smart-tnc.pdf"
    },
    citi_club: {
        tncUrl: "https://www.citibank.com.hk/chinese/credit-cards/cititheclub/merchants.pdf"
    },
    dbs_black: {
        tncUrl: "https://www.dbs.com.hk/iwov-resources/pdf/creditcards/BlackMC_CVP_2026_TnC_CN.pdf"
    },
    dbs_eminent: {
        tncUrl: "https://www.dbs.com.hk/iwov-resources/pdf/creditcards/eminent-tnc-5percent-rebate2026-zh.pdf"
    },
    dbs_eminent_platinum: {
        tncUrl: "https://www.dbs.com.hk/iwov-resources/pdf/creditcards/eminent-tnc-5percent-rebate2026-zh.pdf"
    },
    dbs_compass: {
        tncUrl: "https://www.dbs.com.hk/iwov-resources/pdf/creditcards/TnC_CV_COMtoSpend_2026_zh.pdf",
        promoUrl: "https://www.dbs.com.hk/personal-zh/cards/tnc/20240101-cv-tnc-superwed_supmarketlist-zh.html"
    },
    dbs_live_fresh: {
        tncUrl: "https://www.dbs.com.hk/iwov-resources/pdf/creditcards/Live_Fresh_5_SIR_TC_2026_chi.pdf",
        promoUrl: "https://www.dbs.com.hk/iwov-resources/pdf/creditcards/LF_5_2026list_chi.pdf"
    },
    boc_chill: {
        tncUrl: "https://www.bochk.com/dam/boccreditcard/chillcard/chill_offer_tnc_tc.pdf",
        promoUrl: "https://www.bochk.com/tc/creditcard/promotions/offers/chillmerchants.html"
    },
    boc_go_diamond: {
        tncUrl: "https://www.bochk.com/dam/boccreditcard/gocard/gocardoffer_TC.pdf",
        promoUrl: "https://www.bochk.com/tc/creditcard/promotions/offers/gomerchants.html"
    },
    boc_go_platinum: {
        tncUrl: "https://www.bochk.com/dam/boccreditcard/gocard/gocardoffer_TC.pdf",
        promoUrl: "https://www.bochk.com/tc/creditcard/promotions/offers/gomerchants.html"
    },
    boc_sogo: {
        tncUrl: "https://www.bochk.com/dam/boccreditcard/sogo_doc/sogocard_tnc_tc.pdf"
    },
    ae_platinum: {
        tncUrl: "https://www.americanexpress.com/content/dam/amex/hk/benefits/pdf/TnCs_platinum-membership-rewards-accelerator.pdf"
    },
    ae_platinum_credit: {
        tncUrl: "https://www.americanexpress.com/content/dam/amex/hk/benefits/shopping/offers/pdf/Double_Point_Plat_G_2026_TnC.pdf"
    },
    fubon_in_platinum: {
        promoUrl: "https://www.fubonbank.com.hk/tc/cards/credit-card-products/incard.html"
    },
    fubon_travel: {
        promoUrl: "https://www.fubonbank.com.hk/tc/cards/credit-card-products/fubon-credit-card.html"
    },
    fubon_infinite: {
        promoUrl: "https://www.fubonbank.com.hk/tc/cards/credit-card-products/visa-infinite-card.html"
    },
    sim_world: {
        tncUrl: "https://cdn.thesim.com/89_sim_World_Mastercard_Terms_and_Conditions_of_Cash_Back_Promotion_TC_final_da2d7dba35.pdf?updated_at=2026-01-30T09:07:02.858Z"
    },
    hangseng_travel_plus: {
        tncUrl: "https://www.hangseng.com/content/dam/wpb/hase/rwd/personal/cards/pdfs/travelplus_fundollars_tnc_tc.pdf"
    },
    hangseng_enjoy: {
        promoUrl: "https://cms.hangseng.com/cms/emkt/pmo/grp06/p13/chi/index.html#Points4X"
    }
};

function getCardReferenceFallback(cardId) {
    const id = String(cardId || "").trim();
    const bankKey = getCardBankKey(id);
    const bankFallback = BANK_REFERENCE_FALLBACKS[bankKey] || {};
    const cardFallback = CARD_REFERENCE_FALLBACKS[id] || {};
    return {
        sourceUrl: cardFallback.sourceUrl || bankFallback.sourceUrl || "",
        sourceTitle: cardFallback.sourceTitle || bankFallback.sourceTitle || "",
        tncUrl: cardFallback.tncUrl || bankFallback.tncUrl || "",
        promoUrl: cardFallback.promoUrl || bankFallback.promoUrl || "",
        registrationUrl: cardFallback.registrationUrl || bankFallback.registrationUrl || "",
        registrationStart: cardFallback.registrationStart || bankFallback.registrationStart || "",
        registrationEnd: cardFallback.registrationEnd || bankFallback.registrationEnd || "",
        registrationNote: cardFallback.registrationNote || bankFallback.registrationNote || ""
    };
}

function getBankLabelByKey(bankKey) {
    const key = String(bankKey || "");
    if (key === "hsbc") return "HSBC";
    if (key === "sc") return "SC";
    if (key === "citi") return "Citi";
    if (key === "dbs") return "DBS";
    if (key === "hangseng") return "Hang Seng";
    if (key === "boc") return "BOC";
    if (key === "ae") return "AE";
    if (key === "fubon") return "Fubon";
    if (key === "bea") return "BEA";
    if (key === "sim") return "sim";
    if (key === "aeon") return "AEON";
    if (key === "wewa") return "WeWa";
    if (key === "mox") return "Mox";
    if (key === "earnmore") return "EarnMORE";
    return "銀行";
}

function resolveOwnedOfferScope(cardIds, ownedSet) {
    const ownedCardIds = Array.isArray(cardIds)
        ? cardIds.filter((id) => ownedSet && ownedSet.has(id))
        : [];
    if (ownedCardIds.length === 0) return { type: "none", ownedCardIds: [] };
    if (ownedCardIds.length === 1) return { type: "card", ownedCardIds, cardId: ownedCardIds[0] };
    const bankKeys = Array.from(new Set(ownedCardIds.map((id) => getCardBankKey(id)).filter(Boolean)));
    if (bankKeys.length === 1) {
        return { type: "bank_shared", ownedCardIds, bankKey: bankKeys[0] };
    }
    return { type: "cross_bank_shared", ownedCardIds };
}

// Helper: Render Warning Card (Yellow/Black for Not Registered)
function renderWarningCard(title, icon, description, settingKey, cardId, infoMeta) {
    const settingArg = escapeJsSingleQuoted(settingKey || "");
    const cardArg = cardId ? `, '${escapeJsSingleQuoted(cardId)}'` : "";
    const info = (infoMeta && typeof infoMeta === "object") ? infoMeta : {};
    const detailText = normalizeInfoText(info.detail || "", 120);
    const detailHtml = detailText ? `<div class="text-[10px] text-stone-600 mb-2">${escapeHtml(detailText)}</div>` : "";
    const refsHtml = renderReferenceActions({
        sourceUrl: info.sourceUrl || "",
        sourceTitle: info.sourceTitle || "",
        tncUrl: info.tncUrl || "",
        promoUrl: info.promoUrl || "",
        registrationUrl: info.registrationUrl || "",
        registrationStart: info.registrationStart || "",
        registrationEnd: info.registrationEnd || "",
        registrationNote: info.registrationNote || "",
        implementationNote: info.implementationNote || ""
    }, {
        linkClass: "text-[10px] text-stone-600 hover:text-stone-800 underline underline-offset-2",
        implClass: "text-[10px] text-stone-600 hover:text-stone-800 underline underline-offset-2",
        showRegistration: true,
        showPromo: true,
        showTnc: true,
        showImplementation: true
    });
    const sourceHtml = refsHtml ? `<div class="mb-2">${refsHtml}</div>` : "";
    return `<div class="bg-stone-50 border-l-4 border-stone-300 p-4 rounded-r-xl shadow-sm mb-4">
        <div class="flex items-start">
            <div class="flex-shrink-0">
                <i class="fas fa-exclamation-triangle text-stone-600 text-xl mt-1"></i>
            </div>
            <div class="ml-3 w-full">
                <h3 class="text-sm font-bold text-stone-800">${title}</h3>
                <div class="mt-1 text-xs text-stone-700 font-bold mb-2">
                    ⚠️ 尚未登記 (NOT REGISTERED)
                </div>
                <div class="text-[10px] text-stone-600 mb-2">${description || "請先完成官方登記，再到設定頁標記已登記。"}</div>
                ${detailHtml}
                ${sourceHtml}
                <div class="flex items-center gap-2">
                    <button onclick="toggleRegistrationFromDashboard('${settingArg}')" class="text-xs bg-stone-700 hover:bg-stone-800 text-white px-3 py-1.5 rounded-lg font-bold transition-colors">
                        立即登記 ✓
                    </button>
                    <button onclick="openSettingsForRegistration('${settingArg}'${cardArg})" class="text-xs bg-stone-200 hover:bg-stone-300 text-stone-800 px-3 py-1.5 rounded-lg font-bold transition-colors">
                        前往設定
                    </button>
                </div>
            </div>
        </div>
    </div>`;
}

function getPromoToggleThemeClasses(theme) {
    return { row: "bg-[#fcfcfc]", border: "border-[#e9e9e7]", checked: "peer-checked:bg-gray-700" };
}

function escapeJsSingleQuoted(input) {
    return String(input || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function renderSettingsToggle(options) {
    const opts = options || {};
    const id = opts.id ? String(opts.id) : "";
    const checked = !!opts.checked;
    const onchange = opts.onchange ? String(opts.onchange) : "";
    const ariaLabel = opts.ariaLabel ? ` aria-label="${escapeHtml(opts.ariaLabel)}"` : "";
    const checkedClass = opts.checkedClass ? String(opts.checkedClass) : "peer-checked:bg-gray-700";
    const idAttr = id ? ` id="${escapeHtml(id)}"` : "";
    const onclickAttr = onchange ? ` onclick="${onchange}"` : "";
    const checkedBgClass = checkedClass
        .split(/\s+/)
        .map((cls) => cls.replace(/^peer-checked:/, ""))
        .filter(Boolean)
        .join(" ");
    const trackClass = checked
        ? (checkedBgClass || "bg-gray-700")
        : "bg-gray-200";
    const knobClass = checked ? "translate-x-4" : "translate-x-0";

    return `<button type="button"${idAttr}${onclickAttr} role="switch" aria-checked="${checked ? "true" : "false"}"${ariaLabel} class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${trackClass}">
        <span class="absolute top-[2px] left-[2px] h-4 w-4 rounded-full border border-gray-300 bg-white transition-transform ${knobClass}"></span>
    </button>`;
}

function getCampaignToggleDefinitions() {
    if (typeof DATA === "undefined") return [];
    const campaigns = getCampaignOffers();
    const registry = (DATA.campaignRegistry && typeof DATA.campaignRegistry === "object") ? DATA.campaignRegistry : {};
    const bySettingKey = {};
    const priorityOrder = [
        "winter_promo_enabled",
        "boc_amazing_enabled",
        "boc_go_pmq126_enabled",
        "dbs_black_promo_enabled",
        "mmpower_promo_enabled",
        "travel_plus_promo_enabled",
        "fubon_travel_upgrade_enabled",
        "fubon_infinite_upgrade_enabled",
        "wewa_overseas_5pct_enabled",
        "sim_promo_enabled",
        "sim_world_promo_enabled",
        "ae_explorer_075x_enabled",
        "ae_explorer_7x_enabled",
        "ae_explorer_online_5x_enabled",
        "ae_platinum_9x_enabled",
        "bea_world_flying_miles_enabled",
        "bea_ititanium_bonus_enabled",
        "em_promo_enabled"
    ];
    const priorityMap = {};
    priorityOrder.forEach((k, idx) => { priorityMap[k] = idx; });

    campaigns.forEach((campaign, idx) => {
        if (!campaign || !campaign.id) return;
        const reg = registry[campaign.id] || {};
        const settingKey = String(campaign.settingKey || reg.settingKey || "").trim();
        if (!settingKey) return;
        if (!bySettingKey[settingKey]) {
            bySettingKey[settingKey] = {
                settingKey,
                labels: [],
                descriptions: [],
                sourceUrls: [],
                sourceTitles: [],
                tncUrls: [],
                promoUrls: [],
                registrationUrls: [],
                registrationStarts: [],
                registrationEnds: [],
                registrationNotes: [],
                implementationNotes: [],
                themes: [],
                cards: [],
                order: idx
            };
        }
        const fromDisplay = (typeof campaign.display_name_zhhk === "string" && campaign.display_name_zhhk.trim()) ? campaign.display_name_zhhk.trim() : "";
        const fromName = (typeof campaign.name === "string" && campaign.name.trim()) ? campaign.name.trim() : "";
        const fromRegistry = (typeof reg.warningTitle === "string" && reg.warningTitle.trim()) ? reg.warningTitle.trim() : "";
        bySettingKey[settingKey].labels.push(fromDisplay || fromName || fromRegistry || campaign.id);
        const description = (typeof campaign.note_zhhk === "string" && campaign.note_zhhk.trim())
            ? campaign.note_zhhk.trim()
            : ((typeof reg.warningDesc === "string" && reg.warningDesc.trim()) ? reg.warningDesc.trim() : "");
        if (description) bySettingKey[settingKey].descriptions.push(description);
        if (campaign.source_url) bySettingKey[settingKey].sourceUrls.push(campaign.source_url);
        if (campaign.source_title) bySettingKey[settingKey].sourceTitles.push(campaign.source_title);
        if (campaign.tnc_url) bySettingKey[settingKey].tncUrls.push(campaign.tnc_url);
        if (campaign.promo_url) bySettingKey[settingKey].promoUrls.push(campaign.promo_url);
        if (campaign.registration_url) bySettingKey[settingKey].registrationUrls.push(campaign.registration_url);
        if (campaign.registration_start) bySettingKey[settingKey].registrationStarts.push(campaign.registration_start);
        if (campaign.registration_end) bySettingKey[settingKey].registrationEnds.push(campaign.registration_end);
        if (campaign.registration_note) bySettingKey[settingKey].registrationNotes.push(campaign.registration_note);
        if (reg.tncUrl) bySettingKey[settingKey].tncUrls.push(reg.tncUrl);
        if (reg.promoUrl) bySettingKey[settingKey].promoUrls.push(reg.promoUrl);
        if (reg.registrationUrl) bySettingKey[settingKey].registrationUrls.push(reg.registrationUrl);
        if (reg.registrationStart) bySettingKey[settingKey].registrationStarts.push(reg.registrationStart);
        if (reg.registrationEnd) bySettingKey[settingKey].registrationEnds.push(reg.registrationEnd);
        if (reg.registrationNote) bySettingKey[settingKey].registrationNotes.push(reg.registrationNote);
        const implNote = campaign.implementation_note || reg.implementationNote || buildCampaignImplementationNote(campaign);
        if (implNote) bySettingKey[settingKey].implementationNotes.push(implNote);
        bySettingKey[settingKey].themes.push(campaign.theme || "");
        if (Array.isArray(campaign.cards)) {
            campaign.cards.forEach((cardId) => {
                if (cardId) bySettingKey[settingKey].cards.push(cardId);
            });
        }
        bySettingKey[settingKey].order = Math.min(bySettingKey[settingKey].order, idx);
    });

    return Object.values(bySettingKey).map((entry) => {
        const labels = Array.from(new Set((entry.labels || []).filter(Boolean)));
        const descriptions = Array.from(new Set((entry.descriptions || []).filter(Boolean)));
        const sourceUrls = Array.from(new Set((entry.sourceUrls || []).filter(Boolean)));
        const sourceTitles = Array.from(new Set((entry.sourceTitles || []).filter(Boolean)));
        const tncUrls = Array.from(new Set((entry.tncUrls || []).filter(Boolean)));
        const promoUrls = Array.from(new Set((entry.promoUrls || []).filter(Boolean)));
        const registrationUrls = Array.from(new Set((entry.registrationUrls || []).filter(Boolean)));
        const registrationStarts = Array.from(new Set((entry.registrationStarts || []).filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""))))).sort();
        const registrationEnds = Array.from(new Set((entry.registrationEnds || []).filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""))))).sort();
        const registrationNotes = Array.from(new Set((entry.registrationNotes || []).filter(Boolean)));
        const implementationNotes = Array.from(new Set((entry.implementationNotes || []).filter(Boolean)));
        return {
            settingKey: entry.settingKey,
            label: labels.join(" / "),
            description: descriptions.length > 0 ? descriptions[0] : "",
            sourceUrl: sourceUrls.length > 0 ? sourceUrls[0] : "",
            sourceTitle: sourceTitles.length > 0 ? sourceTitles[0] : "",
            tncUrl: tncUrls.length > 0 ? tncUrls[0] : "",
            promoUrl: promoUrls.length > 0 ? promoUrls[0] : "",
            registrationUrl: registrationUrls.length > 0 ? registrationUrls[0] : "",
            registrationStart: registrationStarts.length > 0 ? registrationStarts[0] : "",
            registrationEnd: registrationEnds.length > 0 ? registrationEnds[registrationEnds.length - 1] : "",
            registrationNote: registrationNotes.length > 0 ? registrationNotes[0] : "",
            implementationNote: implementationNotes.length > 0 ? implementationNotes[0] : "",
            theme: (entry.themes || []).find(Boolean) || "gray",
            cards: Array.from(new Set((entry.cards || []).filter(Boolean))),
            order: entry.order,
            priority: Object.prototype.hasOwnProperty.call(priorityMap, entry.settingKey)
                ? priorityMap[entry.settingKey]
                : 1000
        };
    }).sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (a.order !== b.order) return a.order - b.order;
        return a.settingKey.localeCompare(b.settingKey);
    });
}

function renderCampaignToggleRows(userProfile, options) {
    const opts = options || {};
    const excludedKeys = new Set(Array.isArray(opts.excludeSettingKeys) ? opts.excludeSettingKeys : []);
    const baseDefs = Array.isArray(opts.defs) ? opts.defs : getCampaignToggleDefinitions();
    const defs = baseDefs.filter((def) => !excludedKeys.has(def.settingKey));
    if (defs.length === 0) return "";

    return defs.map((def) => {
        const classes = getPromoToggleThemeClasses(def.theme);
        const checked = !!(userProfile && userProfile.settings && userProfile.settings[def.settingKey]);
        const toggleSettingKey = escapeJsSingleQuoted(def.settingKey);
        const inputId = `st-${def.settingKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
        const descText = normalizeInfoText(def.description || "", 90);
        const refsHtml = renderReferenceActions({
            sourceUrl: def.sourceUrl,
            sourceTitle: def.sourceTitle,
            tncUrl: def.tncUrl,
            promoUrl: def.promoUrl,
            registrationUrl: def.registrationUrl,
            registrationStart: def.registrationStart || "",
            registrationEnd: def.registrationEnd || "",
            registrationNote: def.registrationNote || "",
            implementationNote: def.implementationNote
        }, {
            linkClass: "text-[10px] text-stone-600 hover:text-stone-800 underline underline-offset-2",
            implClass: "text-[10px] text-stone-600 hover:text-stone-800 underline underline-offset-2",
            showRegistration: true,
            showPromo: true,
            showTnc: true,
            showImplementation: true
        });
        const metaHtml = (descText || refsHtml) ? `<div class="mt-1 flex flex-wrap items-center gap-2">
            ${descText ? `<span class="text-[10px] text-stone-600">${escapeHtml(descText)}</span>` : ""}
            ${refsHtml}
        </div>` : "";
        return `<div data-setting-key="${escapeHtml(def.settingKey)}" class="${classes.row} p-2 rounded border ${classes.border}">
            <div class="flex justify-between items-start gap-3">
                <div class="min-w-0">
                    <div class="text-xs font-bold text-stone-800">${escapeHtml(def.label)}</div>
                    ${metaHtml}
                </div>
                ${renderSettingsToggle({ id: inputId, checked, onchange: `toggleSetting('${toggleSettingKey}')` })}
            </div>
        </div>`;
    }).join("");
}

function renderPromoOverlay(overlayModel) {
    if (!overlayModel || !overlayModel.type) return "";

    if (overlayModel.type === "winter_mission") {
        const t1 = Number(overlayModel.tier1) || 0;
        const t2 = Math.max(t1, Number(overlayModel.tier2) || 0);
        const spend = Number(overlayModel.spend) || 0;
        const totalCap = t2 || 1;
        const seg1Width = (t1 / totalCap) * 100;
        const seg2Width = 100 - seg1Width;
        const seg1Fill = t1 > 0 ? Math.min(1, spend / t1) * seg1Width : 0;
        const seg2Fill = t2 > t1 ? Math.min(1, Math.max(0, spend - t1) / (t2 - t1)) * seg2Width : 0;
        const seg1WidthSafe = Math.max(0, Math.min(100, seg1Width));
        const seg2WidthSafe = Math.max(0, Math.min(100, seg2Width));

        return `<div class="absolute inset-0">
            <div class="absolute inset-0 flex">
                <div style="width:${seg1WidthSafe}%" class="h-3"></div>
                <div style="width:${seg2WidthSafe}%" class="bg-gray-200 h-3"></div>
            </div>
            <div class="absolute inset-0 flex">
                <div style="width:${seg1Fill}%" class="bg-blue-500 h-3"></div>
                <div style="width:${seg2Fill}%" class="bg-blue-400 h-3"></div>
            </div>
            <div class="absolute top-0 bottom-0" style="left:${seg1WidthSafe}%; width:1px; background:rgba(0,0,0,0.08)"></div>
        </div>`;
    }

    if (overlayModel.type === "winter_reward" || overlayModel.type === "tier_reward") {
        const cap1 = Number(overlayModel.cap1) || 0;
        const cap2 = Math.max(cap1, Number(overlayModel.cap2) || 0);
        const rewardTier1 = Number(overlayModel.rewardTier1) || 0;
        const rewardTier2 = Number(overlayModel.rewardTier2) || 0;
        const tier1Unlocked = !!overlayModel.tier1Unlocked;
        const tier2Unlocked = !!overlayModel.tier2Unlocked;

        const capTotal = cap2 || 1;
        const seg1Width = (cap1 / capTotal) * 100;
        const seg2Width = 100 - seg1Width;
        const seg1Ratio = cap1 > 0 ? Math.min(1, rewardTier1 / cap1) : 0;
        const seg2Ratio = cap2 > cap1 ? Math.min(1, Math.max(0, rewardTier2 - cap1) / (cap2 - cap1)) : 0;
        const seg1Fill = tier1Unlocked ? seg1Ratio * seg1Width : 0;
        const seg2Fill = tier2Unlocked ? seg2Ratio * seg2Width : 0;
        const seg1Preview = !tier1Unlocked ? seg1Ratio * seg1Width : 0;
        const seg2Preview = (tier1Unlocked && !tier2Unlocked) ? seg2Ratio * seg2Width : 0;
        const seg1WidthSafe = Math.max(0, Math.min(100, seg1Width));
        const seg2WidthSafe = Math.max(0, Math.min(100, seg2Width));

        return `<div class="absolute inset-0">
            <div class="absolute inset-0 flex">
                <div style="width:${seg1WidthSafe}%" class="h-3"></div>
                <div style="width:${seg2WidthSafe}%" class="bg-gray-200 h-3"></div>
            </div>
            <div class="absolute inset-0 flex">
                <div style="width:${seg1Preview}%; background:repeating-linear-gradient(135deg, rgba(16,185,129,0.40) 0, rgba(16,185,129,0.40) 6px, rgba(16,185,129,0.22) 6px, rgba(16,185,129,0.22) 12px)" class="h-3"></div>
                <div style="width:${seg2Preview}%; background:repeating-linear-gradient(135deg, rgba(5,150,105,0.40) 0, rgba(5,150,105,0.40) 6px, rgba(5,150,105,0.22) 6px, rgba(5,150,105,0.22) 12px)" class="h-3"></div>
            </div>
            <div class="absolute inset-0 flex">
                <div style="width:${seg1Fill}%" class="bg-green-500 h-3"></div>
                <div style="width:${seg2Fill}%" class="bg-green-600 h-3"></div>
            </div>
            <div class="absolute top-0 bottom-0" style="left:${seg1WidthSafe}%; width:1px; background:rgba(0,0,0,0.08)"></div>
        </div>`;
    }

    return "";
}

function renderPromoMarkers(markers) {
    if (!markers) return "";
    if (typeof markers === "string") {
        return `<div class="flex justify-between text-[8px] text-gray-400 mt-0.5 px-1">${markers}</div>`;
    }
    if (Array.isArray(markers) && markers.length > 0 && typeof markers[0] === "object") {
        const items = markers.map(m => {
            const pos = Math.max(0, Math.min(100, Number(m.pos) || 0));
            const align = pos === 0 ? 'left' : (pos === 100 ? 'right' : 'center');
            const translate = align === 'center' ? 'translateX(-50%)' : (align === 'right' ? 'translateX(-100%)' : 'translateX(0)');
            const label = escapeHtml(m.label || "");
            return `<span style="left:${pos}%; transform:${translate}" class="absolute text-[8px] text-gray-400">${label}</span>`;
        }).join('');
        return `<div class="relative h-3 mt-0.5 px-1">${items}</div>`;
    }
    if (Array.isArray(markers)) {
        const items = markers.map(m => {
            const label = (typeof m === "number") ? m.toLocaleString() : String(m);
            return `<span>${escapeHtml(label)}</span>`;
        }).join('');
        return `<div class="flex justify-between text-[8px] text-gray-400 mt-0.5 px-1">${items}</div>`;
    }
    return "";
}

function clampPercent(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.min(100, num));
}

function cget(path, fallback) {
    const root = (typeof COPY_ZHHK !== "undefined" && COPY_ZHHK) ? COPY_ZHHK : (window.COPY_ZHHK || {});
    const parts = String(path || "").split(".").filter(Boolean);
    let cur = root;
    for (const p of parts) {
        if (!cur || typeof cur !== "object" || !(p in cur)) return fallback;
        cur = cur[p];
    }
    return (cur === undefined || cur === null) ? fallback : cur;
}

function normalizeProgressLabel(kind, label) {
    const raw = (label || "").trim();
    if (!raw) {
        if (kind === "mission") return cget("progress.missionThreshold", "任務門檻");
        if (kind === "cap" || kind === "cap_rate" || kind === "tier_cap") return cget("progress.rewardCap", "回贈上限");
        return "";
    }

    // Normalize common variants but preserve any prefix emoji / qualifiers.
    const mission = cget("progress.missionThreshold", "簽賬任務進度");
    const reward = cget("progress.rewardCap", "回贈進度");

    let out = raw;
    if (out === "Mission Progress") out = mission;
    if (out === "Reward Progress") out = reward;

    const hasMission = out.includes(mission);
    const hasReward = out.includes(reward);

    if (!hasMission) {
        out = out
            .replaceAll("簽賬門檻", mission)
            .replaceAll("任務門檻", mission)
            .replaceAll("任務進度", mission)
            .replaceAll("門檻任務", mission);
    }
    if (!hasReward) {
        out = out.replaceAll("回贈上限", reward);
    }

    // If someone already typed the new terms, keep them.
    return out;
}

function getSectionUi(sec, theme) {
    const state = sec.state || "active";
    const kind = sec.kind || "cap";
    const meta = sec.meta || {};
    const hasOverlay = !!sec.overlayModel;

    const ui = {
        trackClass: "pc-track",
        fillClass: theme && theme.bar ? theme.bar : "bg-green-500",
        striped: false,
        showLock: state === "locked",
        lockClass: "pc-lock",
        showTierSeparators: false,
        separatorPositions: [],
        separatorClass: "pc-sep",
        subText: "",
        subTextClass: "text-gray-500"
    };

	    if (kind === "mission") {
        // Mission progress is informational; do not render lock overlay even if unmet.
        ui.showLock = false;
        ui.striped = false;

        const met = !!meta.unlocked;
        if (hasOverlay) {
            ui.fillClass = "bg-gray-200";
        } else {
            ui.fillClass = met ? "bg-green-500" : "bg-blue-500";
        }

	        if (met) {
	            ui.subText = meta.unlockedText || cget("status.met", "已達標");
	            ui.subTextClass = "text-green-600 font-bold";
	        } else {
	            ui.subText = sec.lockedReason || cget("status.inProgress", "進行中");
	            ui.subTextClass = "text-gray-500";
	        }

        return ui;
    }

	    if (state === "locked") {
        ui.trackClass = "pc-track pc-track-locked";
        ui.fillClass = "bg-gray-300";
        ui.striped = false;
	        ui.subText = sec.lockedReason || cget("status.locked", "未解鎖");
	        ui.subTextClass = "text-gray-400";
	    } else if (state === "capped") {
        ui.fillClass = "bg-red-500";
        ui.striped = false;
	        ui.subText = cget("status.capped", "已封頂");
	        ui.subTextClass = "text-red-500";
	    } else {
        if (typeof meta.remaining === "number" && meta.cap > 0) {
            const prefix = meta.prefix || "";
            const unit = meta.unit || "";
	            ui.subText = `${cget("status.remainingPrefix", "尚餘")} ${prefix}${Math.max(0, Math.floor(meta.remaining)).toLocaleString()}${unit}`;
	        } else if (meta.unlocked && (!meta.cap || meta.cap === 0)) {
	            ui.subText = "✓ 不設上限";
	            ui.subTextClass = "text-green-600 font-bold";
	        } else {
	            ui.subText = cget("status.inProgress", "進行中");
	        }
        ui.subTextClass = ui.subTextClass || "text-gray-500";
    }

    if (hasOverlay) {
        ui.fillClass = state === "locked" ? "bg-gray-300" : "bg-gray-200";
        ui.striped = false;
    }

    if (state === "active") {
        ui.striped = (kind === "cap" || kind === "tier_cap") && !hasOverlay;
    }

    if (kind === "tier_cap") {
        ui.showTierSeparators = true;
        if (Array.isArray(sec.markers) && sec.markers.length > 0 && typeof sec.markers[0] === "object") {
            ui.separatorPositions = sec.markers
                .map(m => Number(m.pos))
                .filter(n => Number.isFinite(n));
        } else if (meta && Array.isArray(meta.tierBreaks)) {
            ui.separatorPositions = meta.tierBreaks
                .map(n => Number(n))
                .filter(n => Number.isFinite(n));
        }

        // Avoid "random border" look by not rendering separators at the bar edges.
        ui.separatorPositions = Array.from(new Set(ui.separatorPositions))
            .filter(pos => pos > 0 && pos < 100)
            .sort((a, b) => a - b);
    }

    return ui;
}

function renderProgressBar({ progress, state, ui, overlayModel }) {
    const width = overlayModel ? 100 : clampPercent(progress);
    const fillClass = `pc-fill ${ui.fillClass}${ui.striped ? " progress-stripe" : ""}`;
    const overlay = renderPromoOverlay(overlayModel);
    const separators = ui.showTierSeparators && Array.isArray(ui.separatorPositions)
        ? ui.separatorPositions.map(pos => {
            const safe = clampPercent(pos);
            return `<div class="${ui.separatorClass}" style="left:${safe}%"></div>`;
        }).join("")
        : "";
    const lockHtml = ui.showLock ? `<div class="${ui.lockClass}"><i class="fas fa-lock"></i></div>` : "";

    return `<div class="${ui.trackClass}" role="progressbar" aria-valuenow="${Math.round(width)}" aria-valuemin="0" aria-valuemax="100" aria-label="進度">
        <div class="${fillClass}" style="width:${width}%"></div>
        ${separators}
        ${overlay}
        ${lockHtml}
    </div>`;
}

function renderPromoSections(sections, theme) {
    if (!sections) return "";
    return sections.map(sec => {
        if (!sec) return "";
        if (!sec.kind) return "";

        const label = escapeHtml(normalizeProgressLabel(sec.kind, sec.label));
        const valueText = escapeHtml(sec.valueText || "");
        const progress = Number.isFinite(sec.progress) ? sec.progress : 0;

        const ui = getSectionUi(sec, theme);
        if (sec.overlayModel && (sec.overlayModel.type === "winter_reward" || sec.overlayModel.type === "tier_reward") && sec.lockedReason && sec.state !== "capped") {
            // Winter tier bars can be "active" but still have a meaningful lockedReason
            // (e.g. "Tier 2 Locked ..."). Prefer showing it over generic Remaining/In Progress.
            ui.subText = sec.lockedReason;
            ui.subTextClass = (sec.state === "locked") ? "text-gray-400" : "text-gray-500";
        }

        const barHtml = renderProgressBar({
            progress,
            state: sec.state || "active",
            ui,
            overlayModel: sec.overlayModel
        });
        const markersHtml = renderPromoMarkers(sec.markers);
        const subTextHtml = ui.subText ? `<div class="text-[10px] text-right mt-1 ${ui.subTextClass}">${escapeHtml(ui.subText)}</div>` : '';

        return `<div>
            <div class="flex justify-between text-xs mb-1">
                <span class="${theme.text} font-bold">${label}</span>
                <span class="text-gray-500 font-mono">${valueText}</span>
            </div>
            ${barHtml}
            ${markersHtml}
            ${subTextHtml}
        </div>`;
    }).join('');
}

function renderRedMcdStampProgressBody(userProfile) {
    const usage = (userProfile && userProfile.usage && typeof userProfile.usage === "object") ? userProfile.usage : {};
    const totalCap = 96;
    const monthlyCap = 8;
    const stampsPerReward = 4;
    const rewardPerSet = 15;

    const totalRaw = Math.max(0, Math.floor(Number(usage.red_mcd_stamp_total) || 0));
    const monthlyRaw = Math.max(0, Math.floor(Number(usage.red_mcd_stamp_month) || 0));
    const totalStamps = Math.min(totalCap, totalRaw);
    const monthlyStamps = Math.min(monthlyCap, monthlyRaw);
    const completedSets = Math.floor(totalStamps / stampsPerReward);
    const cycleStamps = totalStamps % stampsPerReward;
    const filledDots = cycleStamps === 0 && totalStamps > 0 ? stampsPerReward : cycleStamps;
    const remainingStamps = Math.max(0, stampsPerReward - filledDots);
    const promoCapped = totalStamps >= totalCap;
    const monthCapped = monthlyStamps >= monthlyCap;
    const rewardGranted = Math.max(0, Number(usage.red_mcd_reward_cap) || 0);
    const rewardText = Number.isInteger(rewardGranted)
        ? rewardGranted.toLocaleString()
        : rewardGranted.toFixed(1);

    const dotsHtml = Array.from({ length: stampsPerReward }, (_, idx) => {
        const cls = idx < filledDots ? "stamp-dot stamp-dot-filled" : "stamp-dot";
        return `<span class="${cls}" aria-hidden="true"></span>`;
    }).join("");

    let hint = "";
    if (promoCapped) hint = `已達推廣上限 ${totalCap} 個印花。`;
    else if (remainingStamps === 0) hint = `本輪已集齊 ${stampsPerReward} 個印花，下一宗合資格簽賬會開始新一輪。`;
    else hint = `再儲 ${remainingStamps} 個印花可獲下一個 $${rewardPerSet}。`;
    if (monthCapped && !promoCapped) hint += ` 本月已達 ${monthlyCap} 個印花上限。`;

    return `<div class="space-y-2">
        <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-[#37352f]">印花卡進度</span>
            <span class="text-[11px] text-gray-500">${filledDots}/${stampsPerReward}</span>
        </div>
        <div class="stamp-dot-row" role="img" aria-label="本輪印花 ${filledDots} / ${stampsPerReward}">
            ${dotsHtml}
        </div>
        <div class="grid grid-cols-3 gap-2 text-[11px]">
            <div class="rounded border border-stone-200 bg-stone-50 px-2 py-1">
                <div class="text-[10px] text-stone-500">印花總數</div>
                <div class="font-semibold text-stone-800">${totalStamps}/${totalCap}</div>
            </div>
            <div class="rounded border border-stone-200 bg-stone-50 px-2 py-1">
                <div class="text-[10px] text-stone-500">本月印花</div>
                <div class="font-semibold text-stone-800">${monthlyStamps}/${monthlyCap}</div>
            </div>
            <div class="rounded border border-stone-200 bg-stone-50 px-2 py-1">
                <div class="text-[10px] text-stone-500">已獲獎賞</div>
                <div class="font-semibold text-stone-800">$${rewardText}</div>
            </div>
        </div>
        <div class="text-[10px] text-gray-500">已完成 ${completedSets} 張印花卡。${hint}</div>
    </div>`;
}

function breakdownToneClass(tone, flags, meta) {
    const classes = [];
    const safeTone = tone || "normal";
    const isLockedOrCapped = !!(flags && (flags.locked || flags.capped || flags.strike));
    const isModuleEntry = !!(meta && (meta.modType || meta.modMode));
    if (isLockedOrCapped) classes.push("text-gray-400");
    else if (isModuleEntry && meta.modType === "always") classes.push("text-stone-500");
    else if (isModuleEntry) classes.push("text-emerald-600");
    else if (safeTone === "muted") classes.push("text-gray-400");
    else if (safeTone === "warning") classes.push("text-yellow-600");
    else if (safeTone === "accent") classes.push("text-purple-600");
    else if (safeTone === "danger") classes.push("text-red-500");
    else if (safeTone === "success") classes.push("text-green-600");
    else classes.push("text-gray-500");
    if (flags && flags.strike) classes.push("line-through");
    if (flags && flags.bold) classes.push("font-bold");
    return classes.join(" ");
}

function renderBreakdown(entries, res) {
    if (!Array.isArray(entries) || entries.length === 0) return "基本回贈";
    const fmtPct = (v) => formatRatePercent(v / 100);
    const isMilesOnlyCard = !!(res && res.supportsMiles && !res.supportsCash);

    // Extract % for each entry
    const parsed = entries.map(entry => {
        if (typeof entry === "string") return { text: escapeHtml(entry), cls: "", pct: "" };
        const text = escapeHtml(entry.text || "");
        const meta = entry.meta || null;
        const cls = breakdownToneClass(entry.tone, entry.flags, meta);
        // Derive cash % — skip if text already contains one
        let pct = "";
        const textHasPct = /\d+(\.\d+)?%/.test(text);
        if (meta && Number.isFinite(meta.rate) && meta.rate > 0) {
            const cashRate = Number(meta.cashRate);
            if (isMilesOnlyCard && (!Number.isFinite(cashRate) || cashRate <= 0)) {
                pct = formatMilesCostPerMile(meta.rate);
            } else if (Number.isFinite(cashRate) && cashRate > 0) {
                const cashPct = meta.rate * cashRate * 100; // already in %
                pct = fmtPct(cashPct);
            }
        } else if (textHasPct) {
            // Extract the last percentage from text for alignment
            const m = text.match(/(\d+(?:\.\d+)?%)/g);
            if (m) pct = m[m.length - 1];
        }
        return { text, cls, pct, textHasPct };
    });

    // Build rows: two-column with right-aligned %
    const rows = parsed.map(p => {
        // Strip inline % from text if we're showing it in the right column
        let displayText = p.text;
        if (p.textHasPct && p.pct && /%$/.test(p.pct)) {
            // Remove the trailing (X%) or just X% we extracted
            displayText = displayText.replace(/\s*[\(（]\d+(?:\.\d+)?%[\)）]\s*$/, "").replace(/\s*\d+(?:\.\d+)?%\s*$/, "").trim();
        }
        if (isMilesOnlyCard && p.pct && /\/里$/.test(String(p.pct).trim())) {
            // For miles-only cards, keep "$X/里" only on the right column.
            displayText = displayText
                .replace(/\s*\$[0-9]+(?:\.[0-9]+)?\/里(?=\s*[（(]部分[）)]?\s*$)/, "")
                .replace(/\s*[（(]?\$[0-9]+(?:\.[0-9]+)?\/里[）)]?\s*$/, "")
                .replace(/[：:]\s*$/, "")
                .trim();
            if (!displayText) displayText = p.text;
        }
        const pctHtml = p.pct ? `<span class="tabular-nums whitespace-nowrap">${p.pct}</span>` : "";
        return `<div class="flex justify-between gap-2 ${p.cls}"><span>${displayText}</span>${pctHtml}</div>`;
    });

    // Total line — only show current unlocked total
    const totalPct = res && Number.isFinite(res.totalCashPercent) ? res.totalCashPercent : 0;
    if (totalPct > 0) {
        rows.push(`<div class="flex justify-between gap-2 text-stone-700 font-medium border-t border-stone-200 mt-0.5 pt-0.5"><span>合共</span><span class="tabular-nums">${fmtPct(totalPct)}</span></div>`);
    } else if (isMilesOnlyCard) {
        const amountNum = Number(res && res.amount);
        const nativeNum = Number(res && res.nativeVal);
        const totalRate = (Number.isFinite(amountNum) && amountNum > 0 && Number.isFinite(nativeNum)) ? (nativeNum / amountNum) : 0;
        const totalMilesCost = formatMilesCostPerMile(totalRate);
        if (totalMilesCost) {
            rows.push(`<div class="flex justify-between gap-2 text-stone-700 font-medium border-t border-stone-200 mt-0.5 pt-0.5"><span>合共</span><span class="tabular-nums">${totalMilesCost}</span></div>`);
        }
    }
    return rows.join("");
}

// Helper: Toggle Collapsible Section
function toggleCollapsible(id) {
    const content = document.getElementById(id);
    const icon = document.getElementById(id + '-icon');
    if (content && icon) {
        content.classList.toggle('expanded');
        icon.classList.toggle('expanded');
    }
}

function getCategoryList(ownedCards) {
    if (typeof DATA === 'undefined' || !DATA.categories) return [];
    return Object.entries(DATA.categories)
        .map(([id, c]) => ({ id, ...c }))
        .filter(c => !c.hidden)
        .filter(c => {
            if (!c.req) return true;
            if (typeof c.req === 'function') return c.req(ownedCards);
            return ownedCards.includes(c.req);
        })
        .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
}

function updateCategoryDropdown(ownedCards) {
    const select = document.getElementById('category');
    const currentVal = select.value;

    const options = getCategoryList(ownedCards);
    const visibleIds = new Set(options.map(o => o.id));
    const parentGroups = {};
    const ungrouped = [];
    options.forEach(o => {
        if (o.parent) {
            if (!parentGroups[o.parent]) parentGroups[o.parent] = [];
            parentGroups[o.parent].push(o);
        } else {
            ungrouped.push(o);
        }
    });
    let htmlParts = [];
    const renderedParents = new Set();
    options.forEach(o => {
        if (o.parent && visibleIds.has(o.parent)) {
            htmlParts.push(`<option value="${o.id}">↳ ${o.label}</option>`);
            return;
        }
        if (o.parent) {
            if (!renderedParents.has(o.parent)) {
                renderedParents.add(o.parent);
                const parentDef = DATA.categories[o.parent];
                const parentLabel = parentDef ? parentDef.label.replace(/^[\p{Emoji}\uFE0F\u200D]+\s*/u, "").replace(/\s*\(母類\)\s*/, "") : o.parent;
                const groupItems = parentGroups[o.parent];
                htmlParts.push(`<optgroup label="${escapeHtml(parentLabel)}">${groupItems.map(g => `<option value="${g.id}">${g.label}</option>`).join("")}</optgroup>`);
            }
        } else {
            htmlParts.push(`<option value="${o.id}">${o.label}</option>`);
        }
    });
    select.innerHTML = htmlParts.join("");
    if (options.some(o => o.id === currentVal)) select.value = currentVal;
    else select.value = "general";

    toggleCategoryHelp();
}

function toggleCategoryHelp() {
    const cat = document.getElementById('category').value;
    const helpBtn = document.getElementById('cat-help-btn');

    const helpMap = {
        'red_designated': showRedMerchantList,
        'em_designated_spend': showEveryMileMerchantList,
        'grocery': showSupermarketList,
        'fastfood': showFastfoodTips,
        'tunnel': showOctopusTips,
        'china_consumption': showChinaTips,
        'smart_designated': showSmartMerchantList,
        'citi_club_merchant': showClubMerchantList,
        'chill_merchant': showChillMerchantList,
        'go_merchant': showGoMerchantList,
        'sogo_merchant': showSogoMerchantList,
        'ae_online_designated': showAeExplorerOnlineMerchantList,
        'ae_online_travel_designated': showAeExplorerOfferInfo,
        'ae_plat_travel_designated': showAePlatinumOfferInfo,
        'ae_plat_daily_designated': showAePlatinumOfferInfo,
        'ae_pcc_designated': showAePccOfferInfo,
        'club_shopping': showClubShoppingTips,
        'citi_club_telecom': showClubTelecomTips,
        'sim_designated_merchant': showSimMerchantDetails,
        'sim_billpay': showSimBillpayDetails,
        'enjoy_4x': showEnjoy4xInfo,
        'enjoy_3x': showEnjoy3xInfo,
        'enjoy_2x': showEnjoy2xInfo
    };

    let handler = helpMap[cat];
    if (cat === 'transport' && userProfile.ownedCards.includes('citi_octopus')) {
        handler = showOctopusTips;
    }

    if (handler) {
        helpBtn.classList.remove('hidden');
        helpBtn.onclick = handler;
    } else {
        helpBtn.classList.add('hidden');
    }
}

function showClubMerchantList() {
    const pdfUrl = "https://www.citibank.com.hk/chinese/credit-cards/cititheclub/merchants.pdf";
    const msg = "【Citi The Club 指定商戶】\n\n✅ 指定商戶總回贈 4%（基本1% + 額外3%）\n✅ 額外3%每月上限 1,500 Club積分\n\n📄 商戶清單以 Citi 官方 PDF 為準。";
    const shouldOpen = confirm(`${msg}\n\n按「確定」開啟官方商戶清單 PDF。`);
    if (shouldOpen) window.open(pdfUrl, "_blank", "noopener");
}
function showGoMerchantList() {
    const url = "https://www.bochk.com/tc/creditcard/promotions/offers/gomerchants.html";
    const msg = "【中銀 Go 指定商戶】\n\n✅ Go 指定商戶類別以中銀官方名單為準\n✅ 如唔肯定商戶是否合資格，請先查官方頁面";
    const shouldOpen = confirm(`${msg}\n\n按「確定」開啟官方指定商戶名單。`);
    if (shouldOpen) window.open(url, "_blank", "noopener");
}
function showChillMerchantList() {
    const url = "https://www.bochk.com/tc/creditcard/promotions/offers/chillmerchants.html";
    const msg = "【中銀 Chill 指定商戶】\n\n✅ Chill 指定商戶類別以中銀官方名單為準\n✅ 如唔肯定商戶是否合資格，請先查官方頁面";
    const shouldOpen = confirm(`${msg}\n\n按「確定」開啟官方指定商戶名單。`);
    if (shouldOpen) window.open(url, "_blank", "noopener");
}
function getSimTermsUrlByOwnedCard() {
    const creditUrl = "https://cdn.thesim.com/88_sim_Credit_Card_Terms_and_Conditions_of_Cash_Back_Promotion_TC_final_922dadcd98.pdf?updated_at=2026-01-30T09:07:02.934Z";
    const worldUrl = "https://cdn.thesim.com/89_sim_World_Mastercard_Terms_and_Conditions_of_Cash_Back_Promotion_TC_final_da2d7dba35.pdf?updated_at=2026-01-30T09:07:02.858Z";
    const hasWorld = !!(userProfile && Array.isArray(userProfile.ownedCards) && userProfile.ownedCards.includes("sim_world"));
    const hasCredit = !!(userProfile && Array.isArray(userProfile.ownedCards) && userProfile.ownedCards.includes("sim_credit"));

    if (hasWorld && !hasCredit) return worldUrl;
    if (hasCredit && !hasWorld) return creditUrl;
    if (hasWorld && hasCredit) {
        const openWorld = confirm("你同時持有 sim Credit 同 sim World。\n\n按「確定」開 sim World 條款；按「取消」開 sim Credit 條款。");
        return openWorld ? worldUrl : creditUrl;
    }
    return worldUrl;
}
function showSimMerchantDetails() {
    const url = getSimTermsUrlByOwnedCard();
    const msg = "【sim 指定商戶（3%）】\n\n✅ 指定商戶名單以 sim 官方條款 PDF 為準\n✅ 不確定商戶是否合資格，請先查閱條款";
    const shouldOpen = confirm(`${msg}\n\n按「確定」開啟官方條款 PDF。`);
    if (shouldOpen) window.open(url, "_blank", "noopener");
}
function showSimBillpayDetails() {
    const url = getSimTermsUrlByOwnedCard();
    const msg = "【sim App 指定繳費（2%）】\n\n✅ 合資格繳費項目以 sim 官方條款 PDF 為準\n✅ 請按條款列明渠道/商戶為準";
    const shouldOpen = confirm(`${msg}\n\n按「確定」開啟官方條款 PDF。`);
    if (shouldOpen) window.open(url, "_blank", "noopener");
}
function showSogoMerchantList() {
    const url = "https://www.bochk.com/dam/boccreditcard/sogo_doc/sogocard_tnc_tc.pdf";
    const msg = "【中銀 SOGO 指定商戶/產品】\n\n✅ SOGO 5% 只限官方指定商戶/產品\n✅ 以官方條款及崇光公布名單為準";
    const shouldOpen = confirm(`${msg}\n\n按「確定」開啟官方條款 PDF。`);
    if (shouldOpen) window.open(url, "_blank", "noopener");
}
function showAeExplorerOfferInfo() {
    const url = "https://www.americanexpress.com/content/dam/amex/hk/ch/staticassets/pdf/cards/explorer-credit-card/MRTnC_CHI.pdf";
    const msg = "【AE Explorer 指定網上/旅遊商戶】\n\n✅ 指定商戶/旅遊商戶以 AE 官方條款及商戶名單為準\n✅ 2026 推廣需登記；第三方電子錢包交易不適用於額外積分";
    const shouldOpen = confirm(`${msg}\n\n按「確定」開啟官方條款 PDF。`);
    if (shouldOpen) window.open(url, "_blank", "noopener");
}
function showAeExplorerOnlineMerchantList() {
    const url = "https://www.americanexpress.com/zh-hk/benefits/offers/shopping/5x-offer/index.html";
    const msg = "【AE Explorer 指定網上商戶（5X）】\n\n✅ 指定網上商戶名單以 AE 官方 5X Offer 頁面為準\n✅ 最終資格及細則以官方條款為準";
    const shouldOpen = confirm(`${msg}\n\n按「確定」開啟 AE 指定網上商戶頁。`);
    if (shouldOpen) window.open(url, "_blank", "noopener");
}
function showAePlatinumOfferInfo() {
    const url = "https://www.americanexpress.com/content/dam/amex/hk/benefits/pdf/TnCs_platinum-membership-rewards-accelerator.pdf";
    const msg = "【AE Platinum（細頭）高達9X】\n\n✅ 外幣額外 5X + 指定旅遊/指定日常額外 7X（每季各首$15,000）\n✅ 推廣需登記，指定商戶以官方條款名單為準";
    const shouldOpen = confirm(`${msg}\n\n按「確定」開啟官方條款 PDF。`);
    if (shouldOpen) window.open(url, "_blank", "noopener");
}
function showAePccOfferInfo() {
    const url = "https://www.americanexpress.com/content/dam/amex/hk/benefits/shopping/offers/pdf/Double_Point_Plat_G_2026_TnC.pdf";
    const msg = "【AE Platinum Credit（大頭）Double Points】\n\n✅ 指定商戶以官方名單為準（超市/百貨/便利店/個人護理/油站等）\n✅ 額外積分每月上限 30,000；推廣期內 Program 封頂後，指定商戶由6X變2X";
    const shouldOpen = confirm(`${msg}\n\n按「確定」開啟官方條款 PDF。`);
    if (shouldOpen) window.open(url, "_blank", "noopener");
}
function showClubShoppingTips() {
    alert("【Club Shopping】\n\n✅ 總回贈 2%（基本1% + 額外1%）\n✅ 額外1%每月上限 500 Club積分\n\n提示：商戶清單可按「The Club 指定商戶」類別旁 ? 查看官方 PDF。");
}
function showClubTelecomTips() {
    alert("【The Club 電訊】\n\n適用：csl / 1010 / Now TV / 網上行\n\n✅ 目前以總回贈 3% 計算（replace）\n⚠️ 若你之後想細分條款（例如特定付款方式），可以再加子分類。");
}
function showOctopusTips() { alert("【Citi Octopus 交通神卡攻略 (15%)】\n\n🚌 適用：九巴、港鐵、渡輪、電車\n\n💰 門檻/上限：\n1. 月簽 $4,000：回贈上限 $300 (即交通簽 $2,000)\n2. 月簽 $10,000：回贈上限 $500\n\n⚡ 0成本達標大法：\n每月增值電子錢包 (PayMe/Alipay/WeChat) 各 $1,000，輕鬆達標 $3,000！\n\n🎁 疊加政府補貼：可賺高達 30%+ 回贈！"); }
function showSmartMerchantList() {
    const url = "https://av.sc.com/hk/zh/content/docs/hk-promo-smart-tnc.pdf";
    const msg = "【SC Smart 指定商戶 (5%)】\n\n✅ 以渣打 Smart 推廣條款內指定商戶名單為準\n⚠️ 指定商戶每月可計回贈簽賬上限 HK$5,000";
    const shouldOpen = confirm(`${msg}\n\n按「確定」開啟官方條款 PDF。`);
    if (shouldOpen) window.open(url, "_blank", "noopener");
}
function showSupermarketList() { alert("【🥦 超市類別定義】\n\n✅ 認可：百佳, Donki, 759, AEON\n⚠️ HSBC陷阱：❌ 不包惠康, Market Place, 萬寧"); }
function showRedMerchantList() {
    const url = "https://www.hsbc.com.hk/zh-hk/credit-cards/rewards/your-choice/#3";
    const msg = "【HSBC Red 指定商戶】\n\n✅ Red 指定商戶/類別以 HSBC 最紅自主獎賞頁面及條款為準";
    const shouldOpen = confirm(`${msg}\n\n按「確定」開啟 HSBC 官方頁面。`);
    if (shouldOpen) window.open(url, "_blank", "noopener");
}
function showEveryMileMerchantList() {
    const url = "https://www.hsbc.com.hk/content/dam/hsbc/hk/docs/credit-cards/everymile/everymile-everyday-spend.pdf";
    const msg = "【HSBC EveryMile 指定】\n\n✅ 指定簽賬/商戶以 EveryMile 官方推廣條款 PDF 為準";
    const shouldOpen = confirm(`${msg}\n\n按「確定」開啟官方條款 PDF。`);
    if (shouldOpen) window.open(url, "_blank", "noopener");
}
function showChinaTips() { alert("【🇨🇳 中國內地/澳門】\n\n推薦：Pulse (手機支付+2%)、EveryMile ($2/里)、MMPower (6%)"); }
function showFastfoodTips() { alert("【快餐店 (Fast Food)】\n\n💡 呢個分類主要俾 MMPower 用作「餐飲自選不包括快餐店」。\n\n- 一般其他卡：系統會當作 Dining 處理\n- Hang Seng MMPower：只計基本回贈，不食自選額外 1%"); }
function showEnjoyPoints4xGuide(tierLabel) {
    const url = "https://cms.hangseng.com/cms/emkt/pmo/grp06/p13/chi/index.html#Points4X";
    const msg = `【Hang Seng enJoy ${tierLabel}】\n\n` +
        "換算（本工具）：\n" +
        "- 4X = 2%\n" +
        "- 3X = 1.5%\n" +
        "- 2X = 1%\n" +
        "- 其他簽賬 = 1X = 0.5%\n\n" +
        "計法（按條款簡化）：\n" +
        "- 銀行部分：指定商戶多數為 2X（其他一般商戶 1X）\n" +
        "- 商戶部分：需 yuu 綁定先計（4X/3X/Shell 2X 由此組成）\n\n" +
        "⚠️ 如唔肯定商戶屬於邊一檔，先用較保守檔位或一般簽賬；最終以官方列表為準。";
    if (confirm(`${msg}\n\n按「確定」開啟恒生官方 Points4X 頁面。`)) {
        window.open(url, "_blank", "noopener");
    }
}
function showEnjoy4xInfo() { showEnjoyPoints4xGuide("4X（2%）"); }
function showEnjoy3xInfo() { showEnjoyPoints4xGuide("3X（1.5%）"); }
function showEnjoy2xInfo() { showEnjoyPoints4xGuide("2X（1%）"); }

// Helper: Create Progress Card Component
function createProgressCard(config) {
    const {
        title, icon, badge, subTitle, sections, warning, actionButton, description,
        sourceUrl, sourceTitle, tncUrl, promoUrl, registrationUrl, registrationStart, registrationEnd, registrationNote,
        implementationNote, daysLeft, customBodyHtml, infoLines
    } = config;

    // Use pure flat design instead of themes
    const badgeHtml = badge ? `<span class="bg-[#f7f7f5] text-gray-600 border border-[#e9e9e7] text-[10px] px-1.5 py-0.5 rounded">${badge}</span>` : '';
    const subTitleHtml = subTitle ? `<span class="text-[10px] text-gray-500">${subTitle}</span>` : '';
    const warningHtml = warning ? `<div class="mt-2">${warning}</div>` : '';
    const dedupedDescription = isRedundantDescriptionForTitle(title || "", description || "") ? "" : (description || "");
    const descriptionText = normalizeInfoText(dedupedDescription, 140);
    const refsHtml = renderReferenceActions({
        sourceUrl: sourceUrl || "",
        sourceTitle: sourceTitle || "",
        tncUrl: tncUrl || "",
        promoUrl: promoUrl || "",
        registrationUrl: registrationUrl || "",
        registrationStart: registrationStart || "",
        registrationEnd: registrationEnd || "",
        registrationNote: registrationNote || "",
        implementationNote: implementationNote || ""
    }, {
        linkClass: "text-[10px] text-gray-500 hover:text-gray-700 underline underline-offset-2",
        implClass: "text-[10px] text-gray-500 hover:text-gray-700 underline underline-offset-2",
        showRegistration: true,
        showPromo: true,
        showTnc: true,
        showImplementation: false
    });
    const infoHtml = (descriptionText || refsHtml) ? `<div class="flex flex-wrap items-center gap-2">
        ${descriptionText ? `<span class="text-[11px] text-gray-500">${escapeHtml(descriptionText)}</span>` : ""}
        ${refsHtml}
    </div>` : "";

    // Simplistic action button
    const actionButtonHtml = actionButton ? `<div class="mt-3 pt-3 border-t border-[#e9e9e7]">
        <button onclick="${actionButton.onClick}" class="w-full bg-[#f7f7f5] hover:bg-[#efefed] text-[#37352f] border border-[#e9e9e7] font-medium py-1.5 px-4 rounded transition-colors text-sm flex items-center justify-center gap-2">
            ${actionButton.icon ? `<i class="${actionButton.icon}"></i>` : ''}${actionButton.label}
        </button>
    </div>` : '';

    const customBodySection = customBodyHtml ? `<div>${customBodyHtml}</div>` : '';
    const sectionsHtml = sections ? renderPromoSections(sections, { text: 'text-[#37352f]', bar: 'bg-[#37352f]' }) : '';

    const safeInfoLines = Array.isArray(infoLines) ? infoLines.filter(l => l && l.text) : [];
    const infoLinesHtml = safeInfoLines.length > 0
        ? `<div class="pc-info-lines">${safeInfoLines.map(l =>
            `<div class="pc-info-line"><i class="${escapeHtml(l.icon || "fas fa-info-circle")} pc-info-icon"></i><span>${escapeHtml(l.text)}</span></div>`
        ).join("")}</div>`
        : "";

    return `<div class="bg-white border border-[#e9e9e7] rounded-md overflow-hidden mb-3">
        <div class="p-3 border-b border-[#e9e9e7] flex justify-between items-start bg-[#fcfcfc]">
            <div class="flex flex-col">
                <h3 class="text-[#37352f] font-semibold text-sm flex items-center gap-1.5">
                    <i class="${icon} text-gray-400"></i>${title}
                </h3>
                ${subTitleHtml}
            </div>
            ${badgeHtml}
        </div>
        <div class="p-3 space-y-3">
            ${infoHtml}
            ${warningHtml}
            ${customBodySection}
            ${infoLinesHtml}
            ${sectionsHtml}
            ${actionButtonHtml}
        </div>
    </div>`;
}

// Helper: Create Calculator Result Card
function createResultCard(res, dataStr, mainValHtml, redemptionHtml) {
    const safeCardNameForAction = escapeJsSingleQuoted(res.cardName);
    return `<div class="card-enter bg-white p-3 rounded-md border border-[#e9e9e7] hover:bg-[#fcfcfc] transition-colors flex justify-between items-start mb-2 group">
        <div class="w-2/3 pr-2">
            <div class="font-medium text-[#37352f] text-sm truncate">${res.cardName}</div>
            <div class="text-[11px] mt-0.5 leading-relaxed">${renderBreakdown(res.breakdown, res)}</div>
        </div>
        <div class="text-right w-1/3 flex flex-col items-end">
            ${mainValHtml}
            ${redemptionHtml}
            <button type="button" onclick="handleRecord('${safeCardNameForAction}','${dataStr}')"
                class="text-[10px] text-gray-600 mt-2 bg-white border border-[#e9e9e7] hover:bg-[#f7f7f5] px-2 py-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 sm:opacity-100">
                記帳
            </button>
        </div>
    </div>`;
}

function renderDashboard(userProfile) {
    const container = document.getElementById('dashboard-container');
    const renderedCaps = new Set();
    const ownedCards = Array.isArray(userProfile.ownedCards) ? userProfile.ownedCards.slice() : [];
    const ownedSet = new Set(ownedCards);
    const cardById = {};
    (DATA.cards || []).forEach((card) => {
        if (card && card.id) cardById[card.id] = card;
    });
    const cardGroups = {};
    const globalBlocks = [];

    const ensureCardGroup = (cardId) => {
        if (!cardId || !ownedSet.has(cardId)) return null;
        if (!cardGroups[cardId]) {
            const card = cardById[cardId] || null;
            cardGroups[cardId] = {
                cardId,
                cardName: card ? String(card.name || cardId) : String(cardId),
                items: []
            };
        }
        return cardGroups[cardId];
    };
    const pushBlock = (cardId, blockHtml, sortMeta) => {
        if (!blockHtml) return;
        const item = { html: blockHtml, sortMeta: sortMeta || { daysLeft: Infinity, state: "active" } };
        const group = ensureCardGroup(cardId);
        if (group) group.items.push(item);
        else globalBlocks.push(item);
    };

    const capKeyCounts = {};
    const periodKey = String((userProfile.settings && userProfile.settings.dashboard_period) || "month");
    const totals = getDashboardTotalsByPeriod(userProfile.transactions, periodKey, userProfile);
    const totalSpend = totals.spend;
    const totalCash = totals.rewardCash;
    const txCount = totals.count;
    const nativeSummary = formatNativeRewardSummary(totals.nativeByUnit);
    const cashRounded = Math.floor(totalCash);
    const cashText = cashRounded < 0
        ? `-$${Math.abs(cashRounded).toLocaleString()}`
        : `$${cashRounded.toLocaleString()}`;
    const nativeText = nativeSummary === "—" ? "—" : nativeSummary;
    const periodLabel = getDashboardPeriodLabel(periodKey);

    let html = `<div class="bg-[#f7f4ee] border border-stone-200 text-stone-800 p-5 rounded-2xl shadow-sm mb-4">
        <div class="flex items-end justify-between gap-3">
            <div>
                <h2 class="text-stone-500 text-xs font-bold uppercase tracking-wider">${periodLabel}總簽賬</h2>
                <div class="text-3xl font-bold mt-1">$${Math.floor(totalSpend).toLocaleString()}</div>
            </div>
            <div class="text-right">
                <label class="text-[10px] text-stone-500 font-bold block mb-1">統計期間</label>
                <select onchange="saveDrop('dashboard_period', this.value)" class="text-xs text-gray-800 bg-white rounded-lg px-2 py-1 border border-stone-300">
                    <option value="month" ${periodKey === "month" ? "selected" : ""}>本月</option>
                    <option value="quarter" ${periodKey === "quarter" ? "selected" : ""}>本季</option>
                    <option value="year" ${periodKey === "year" ? "selected" : ""}>今年</option>
                    <option value="all" ${periodKey === "all" ? "selected" : ""}>全部</option>
                </select>
            </div>
        </div>
        <div class="mt-4 pt-4 border-t border-stone-300">
            <div class="text-stone-500 text-[11px] tracking-wider mb-2">回贈總覽</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div class="bg-white border border-stone-200 rounded-xl px-3 py-2">
                    <div class="text-[10px] text-stone-500 uppercase tracking-wider">里數 / 積分</div>
                    <div class="text-stone-800 font-bold text-base mt-1 break-words">${escapeHtml(nativeText)}</div>
                </div>
                <div class="bg-white border border-stone-200 rounded-xl px-3 py-2">
                    <div class="text-[10px] text-stone-500 uppercase tracking-wider">現金回贈（已扣手續費）</div>
                    <div class="text-stone-800 font-bold text-base mt-1">${escapeHtml(cashText)}</div>
                </div>
            </div>
        </div>
        <div class="mt-3 text-xs text-stone-500">期間內已記錄 ${txCount} 筆</div>
    </div>`;

    // 1. Special promo models with lifecycle (e.g. Travel Guru)
    if (typeof getLevelLifecycleModelIds === "function" && typeof getLevelLifecycleState === "function") {
        const lifecycleIds = getLevelLifecycleModelIds();
        lifecycleIds.forEach((modelId) => {
            const state = getLevelLifecycleState(modelId, userProfile);
            if (!state || !state.eligible || !state.active) return;
            const scope = resolveOwnedOfferScope(state.model && state.model.cards, ownedSet);
            if (scope.type === "none") return;
            const scopeLabel = scope.type === "bank_shared"
                ? `${getBankLabelByKey(scope.bankKey)} 多卡共用`
                : (scope.type === "cross_bank_shared" ? "跨銀行共用" : "");
            const scopedTitle = scopeLabel ? `${scopeLabel}｜${state.title}` : state.title;
            const stateModel = (state && state.model && typeof state.model === "object") ? state.model : {};
            const blockHtml = createProgressCard({
                title: scopedTitle,
                icon: state.icon,
                theme: state.theme,
                badge: state.badge,
                description: state.description || "",
                sourceUrl: state.sourceUrl || stateModel.sourceUrl || stateModel.source_url || "",
                sourceTitle: state.sourceTitle || stateModel.sourceTitle || stateModel.source_title || "",
                tncUrl: state.tncUrl || stateModel.tncUrl || stateModel.tnc_url || "",
                promoUrl: state.promoUrl || stateModel.promoUrl || stateModel.promo_url || "",
                registrationUrl: state.registrationUrl || stateModel.registrationUrl || stateModel.registration_url || "",
                registrationStart: state.registrationStart || stateModel.registrationStart || stateModel.registration_start || "",
                registrationEnd: state.registrationEnd || stateModel.registrationEnd || stateModel.registration_end || "",
                registrationNote: state.registrationNote || stateModel.registrationNote || stateModel.registration_note || "",
                implementationNote: state.implementationNote || "",
                sections: state.sections || [],
                actionButton: state.actionButton || null,
                infoLines: state.infoLines || []
            });
            if (scope.type === "card") {
                pushBlock(scope.cardId, blockHtml);
            } else if (scope.type === "bank_shared") {
                scope.ownedCardIds.forEach((cardId) => pushBlock(cardId, blockHtml));
            } else {
                pushBlock(null, blockHtml);
            }
        });
    }

    // Campaigns (data-driven)
    const unregisteredPromos = [];
    if (typeof DATA !== 'undefined') {
        const campaignOffers = getCampaignOffers();
        campaignOffers.forEach(campaign => {
            const status = (typeof buildPromoStatus === "function") ? buildPromoStatus(campaign, userProfile, DATA.modules) : null;
            const campaignTitle = (campaign.display_name_zhhk && String(campaign.display_name_zhhk).trim())
                ? String(campaign.display_name_zhhk).trim()
                : (campaign.name || campaign.id);
            const scope = resolveOwnedOfferScope(campaign.cards, ownedSet);
            if (scope.type === "none") return;
            const primaryCardForSettings = (scope.ownedCardIds && scope.ownedCardIds[0]) ? scope.ownedCardIds[0] : null;
            const scopeLabel = scope.type === "bank_shared"
                ? `${getBankLabelByKey(scope.bankKey)} 多卡共用`
                : (scope.type === "cross_bank_shared" ? "跨銀行共用" : "");
            const scopedCampaignTitle = scope.type === "card"
                ? campaignTitle
                : `${scopeLabel}｜${campaignTitle}`;

            const reg = (DATA.campaignRegistry && campaign && campaign.id) ? DATA.campaignRegistry[campaign.id] : null;
	        if (reg && reg.settingKey && userProfile.settings[reg.settingKey] === false) {
                if (!status || !status.eligible) return;
                unregisteredPromos.push({
                    title: scopedCampaignTitle,
                    settingKey: reg.settingKey,
                    cardId: primaryCardForSettings,
                    icon: campaign.icon || "fas fa-gift"
                });
                const warningHtml = renderWarningCard(
	                reg.warningTitle || scopedCampaignTitle,
	                campaign.icon,
	                reg.warningDesc || cget("warning.needRegister", "需登記以賺取回贈"),
	                reg.settingKey,
                    primaryCardForSettings,
                    {
                        detail: campaign.note_zhhk || "",
                        sourceUrl: campaign.source_url || "",
                        sourceTitle: campaign.source_title || "",
                        tncUrl: campaign.tnc_url || "",
                        promoUrl: campaign.promo_url || "",
                        registrationUrl: campaign.registration_url || "",
                        registrationStart: campaign.registration_start || "",
                        registrationEnd: campaign.registration_end || "",
                        registrationNote: campaign.registration_note || "",
                        implementationNote: campaign.implementation_note || buildCampaignImplementationNote(campaign)
                    }
	            );
                const warnSortMeta = { daysLeft: 0, state: "warning" };
                if (scope.type === "card") {
                    pushBlock(scope.cardId, warningHtml, warnSortMeta);
                } else if (scope.type === "bank_shared") {
                    scope.ownedCardIds.forEach((cardId) => pushBlock(cardId, warningHtml, warnSortMeta));
                } else {
                    pushBlock(null, warningHtml, warnSortMeta);
                }
	            // Prevent duplicate rendering in the "Remaining Caps" section.
	            if (status.renderedCaps) status.renderedCaps.forEach(k => renderedCaps.add(k));
	            else if (campaign.capKeys) campaign.capKeys.forEach(k => renderedCaps.add(k));
	            return;
	        }

            if (!status || !status.eligible) return;
            const badgeText = getCampaignBadgeText(campaign);
            const resetSubTitle = getCampaignResetSubTitle(campaign);
            const subTitle = [scopeLabel, resetSubTitle].filter(Boolean).join(" · ");
            const campaignEndDate = (() => {
                const meta = getCampaignPeriodMeta(campaign.id);
                if (meta && meta.badge) {
                    if (meta.badge.endDate) return meta.badge.endDate;
                    if (meta.badge.date) return meta.badge.date;
                }
                const pp = campaign.period_policy;
                if (pp && pp.endDate) return pp.endDate;
                if (pp && pp.period && pp.period.endDate) return pp.period.endDate;
                return "";
            })();
            const campaignDaysLeft = campaignEndDate ? getDaysLeft(campaignEndDate) : null;

            if (campaign.id === "red_mcd_stamp") {
                const stampCardHtml = createProgressCard({
                    title: scopedCampaignTitle, icon: campaign.icon, theme: campaign.theme, badge: badgeText, subTitle,
                    customBodyHtml: renderRedMcdStampProgressBody(userProfile), daysLeft: campaignDaysLeft,
                    description: campaign.note_zhhk || "",
                    sourceUrl: campaign.source_url || "",
                    sourceTitle: campaign.source_title || "",
                    tncUrl: campaign.tnc_url || "",
                    promoUrl: campaign.promo_url || "",
                    registrationUrl: campaign.registration_url || "",
                    registrationStart: campaign.registration_start || "",
                    registrationEnd: campaign.registration_end || "",
                    registrationNote: campaign.registration_note || "",
                    implementationNote: campaign.implementation_note || buildCampaignImplementationNote(campaign)
                });
                renderedCaps.add("red_mcd_reward_cap");
                const campaignSortMeta = { daysLeft: (typeof campaignDaysLeft === "number" && Number.isFinite(campaignDaysLeft)) ? campaignDaysLeft : Infinity, state: "active" };
                if (scope.type === "card") {
                    pushBlock(scope.cardId, stampCardHtml, campaignSortMeta);
                } else if (scope.type === "bank_shared") {
                    scope.ownedCardIds.forEach((cardId) => pushBlock(cardId, stampCardHtml, campaignSortMeta));
                } else {
                    pushBlock(null, stampCardHtml, campaignSortMeta);
                }
                return;
            }

            if (campaign.warningOnly) return;

            const sections = status.sections || [];
            if (status.renderedCaps) status.renderedCaps.forEach(k => renderedCaps.add(k));
            if (status.capKeys) status.capKeys.forEach(k => renderedCaps.add(k));
            const progressHtml = createProgressCard({
                title: scopedCampaignTitle, icon: campaign.icon, theme: campaign.theme, badge: badgeText, subTitle,
                sections: sections, daysLeft: campaignDaysLeft,
                description: campaign.note_zhhk || "",
                sourceUrl: campaign.source_url || "",
                sourceTitle: campaign.source_title || "",
                tncUrl: campaign.tnc_url || "",
                promoUrl: campaign.promo_url || "",
                registrationUrl: campaign.registration_url || "",
                registrationStart: campaign.registration_start || "",
                registrationEnd: campaign.registration_end || "",
                registrationNote: campaign.registration_note || "",
                implementationNote: campaign.implementation_note || buildCampaignImplementationNote(campaign),
                infoLines: buildCampaignInfoLines(campaign)
            });

            const campaignSortMeta = { daysLeft: (typeof campaignDaysLeft === "number" && Number.isFinite(campaignDaysLeft)) ? campaignDaysLeft : Infinity, state: "active" };
            if (scope.type === "card") {
                pushBlock(scope.cardId, progressHtml, campaignSortMeta);
            } else if (scope.type === "bank_shared") {
                scope.ownedCardIds.forEach((cardId) => pushBlock(cardId, progressHtml, campaignSortMeta));
            } else {
                pushBlock(null, progressHtml, campaignSortMeta);
            }
        });
    }

    // 5. Remaining Caps as Promotion Cards (no separate cap monitors)
    (DATA.cards || []).forEach(card => {
        if (!card || !Array.isArray(card.rewardModules)) return;
        card.rewardModules.forEach(modId => {
            const mod = DATA.modules[modId];
            if (!mod || !mod.cap_limit || !mod.cap_key) return;
            if (String(mod.cap_key).startsWith('boc_amazing_')) return;
            capKeyCounts[mod.cap_key] = (capKeyCounts[mod.cap_key] || 0) + 1;
        });
    });

    ownedCards.forEach(cardId => {
        const card = cardById[cardId] || null;
        if (!card || !Array.isArray(card.rewardModules)) return;
        const cardReferenceMeta = getCardReferenceMeta(cardId);
        card.rewardModules.forEach(modId => {
            const mod = DATA.modules[modId];
            if (!mod || !mod.cap_limit || !mod.cap_key) return;
            if (String(mod.cap_key).startsWith('boc_amazing_')) return;
            if (renderedCaps.has(mod.cap_key)) return;
	        if (mod.setting_key && userProfile.settings[mod.setting_key] === false) {
                const title = (mod.display_name_zhhk && String(mod.display_name_zhhk).trim())
                    ? String(mod.display_name_zhhk).trim()
                    : String(mod.desc || mod.id || "").trim();

	            pushBlock(cardId, renderWarningCard(
	                title,
	                "fas fa-exclamation-triangle",
	                cget("warning.needRegister", "需登記以賺取回贈"),
	                mod.setting_key,
                    cardId,
                    {
                        detail: mod.note_zhhk || mod.desc || "",
                        sourceUrl: mod.source_url || (card && card.source_url) || (cardReferenceMeta.sourceUrl || ""),
                        sourceTitle: mod.source_title || (card && card.source_title) || (cardReferenceMeta.sourceTitle || ""),
                        tncUrl: mod.tnc_url || (card && card.tnc_url) || (cardReferenceMeta.tncUrl || ""),
                        promoUrl: mod.promo_url || (card && card.promo_url) || (cardReferenceMeta.promoUrl || ""),
                        registrationUrl: mod.registration_url || (card && card.registration_url) || (cardReferenceMeta.registrationUrl || ""),
                        registrationStart: mod.registration_start || (card && card.registration_start) || (cardReferenceMeta.registrationStart || ""),
                        registrationEnd: mod.registration_end || (card && card.registration_end) || (cardReferenceMeta.registrationEnd || ""),
                        registrationNote: mod.registration_note || (card && card.registration_note) || (cardReferenceMeta.registrationNote || ""),
                        implementationNote: buildModuleImplementationNote(mod, card, title)
                    }
	            ));
	            renderedCaps.add(mod.cap_key);
	            return;
	        }

            const title = (mod.display_name_zhhk && String(mod.display_name_zhhk).trim())
                ? String(mod.display_name_zhhk).trim()
                : String(mod.desc || mod.id || "").trim();
            const progressLabel = (mod.progress_label_zhhk && String(mod.progress_label_zhhk).trim())
                ? String(mod.progress_label_zhhk).trim()
                : "💰 回贈進度";

            renderedCaps.add(mod.cap_key);

            const rawUsage = Number(userProfile.usage[mod.cap_key]) || 0;
            const isRewardCap = mod.cap_mode === 'reward';
            const spendingCap = Number(mod.cap_limit) || 0;
            const hasMissionGate = !!(mod.req_mission_spend && mod.req_mission_key);
            const thresholdTarget = hasMissionGate ? (Number(mod.req_mission_spend) || 0) : 0;
            const thresholdSpend = hasMissionGate ? (Number(userProfile.usage[mod.req_mission_key]) || 0) : 0;
            const progressSpendKey = (hasMissionGate && mod.progress_mission_key) ? mod.progress_mission_key : (hasMissionGate ? mod.req_mission_key : null);
            const progressSpend = progressSpendKey ? (Number(userProfile.usage[progressSpendKey]) || 0) : thresholdSpend;
            let unlockMet = !hasMissionGate || thresholdSpend >= thresholdTarget;

            let displayPrefix = '$';
            let displayUnit = '';
            let displayCurrentVal = rawUsage;
            let displayMaxVal = spendingCap;

            let rewardUnit = (card.redemption && card.redemption.unit) ? String(card.redemption.unit) : '';
            if (!rewardUnit && typeof DATA !== "undefined" && DATA && Array.isArray(DATA.conversions)) {
                const conv = DATA.conversions.find((c) => c && c.src === card.currency) || null;
                if (conv) {
                    const milesRate = Number(conv.miles_rate) || 0;
                    const cashRate = Number(conv.cash_rate) || 0;
                    if (milesRate > 0 && cashRate === 0) rewardUnit = "里";
                }
            }
            const rewardIsCurrency = (rewardUnit === "" || rewardUnit === "$" || rewardUnit === "HKD" || rewardUnit === "元" || rewardUnit === "HK$" || rewardUnit === "現金");

            if (isRewardCap) {
                displayPrefix = rewardIsCurrency ? '$' : '';
                displayUnit = rewardIsCurrency ? '' : rewardUnit;

                if (!unlockMet && hasMissionGate && mod.retroactive !== false) {
                    let projectedRate = NaN;
                    if (Number.isFinite(Number(mod.rate))) projectedRate = Number(mod.rate);
                    else if (Number.isFinite(Number(mod.rate_per_x)) && Number.isFinite(Number(mod.multiplier))) {
                        projectedRate = Number(mod.rate_per_x) * Number(mod.multiplier);
                    }
                    if (Number.isFinite(projectedRate) && projectedRate > 0) {
                        displayCurrentVal = Math.min(displayMaxVal, progressSpend * projectedRate);
                    }
                }
            } else {
                let nativeRate = NaN;
                if (Number.isFinite(Number(mod.rate))) nativeRate = Number(mod.rate);
                else if (Number.isFinite(Number(mod.rate_per_x)) && Number.isFinite(Number(mod.multiplier))) {
                    nativeRate = Number(mod.rate_per_x) * Number(mod.multiplier);
                }

                if (Number.isFinite(nativeRate) && nativeRate > 0) {
                    displayPrefix = rewardIsCurrency ? '$' : '';
                    displayUnit = rewardIsCurrency ? '' : rewardUnit;
                    displayCurrentVal = rawUsage * nativeRate;
                    displayMaxVal = spendingCap * nativeRate;
                }
            }

            const pct = displayMaxVal > 0 ? Math.min(100, (displayCurrentVal / displayMaxVal) * 100) : 0;
            const remaining = Math.max(0, displayMaxVal - displayCurrentVal);

	            const sections = [];

	            if (hasMissionGate) {
	                const thresholdPct = thresholdTarget > 0 ? Math.min(100, (thresholdSpend / thresholdTarget) * 100) : 0;
	                const thresholdMet = unlockMet;
	                sections.push({
	                    kind: "mission",
	                    label: "🎯 簽賬任務進度",
	                    valueText: `$${thresholdSpend.toLocaleString()} / $${thresholdTarget.toLocaleString()}`,
	                    progress: thresholdPct,
	                    state: "active",
	                    lockedReason: thresholdMet ? null : `尚差 $${Math.max(0, thresholdTarget - thresholdSpend).toLocaleString()}`,
	                    markers: null,
	                    overlayModel: null,
	                    meta: { spend: thresholdSpend, target: thresholdTarget, unlocked: thresholdMet }
	                });
	            }

	            const rewardState = rawUsage >= spendingCap ? "capped" : (unlockMet ? "active" : "locked");
	            sections.push({
	                kind: "cap",
	                label: progressLabel,
	                valueText: `${displayPrefix}${Math.floor(displayCurrentVal).toLocaleString()}${displayUnit} / ${displayPrefix}${Math.floor(displayMaxVal).toLocaleString()}${displayUnit}`,
	                progress: pct,
	                state: rewardState,
	                lockedReason: unlockMet ? null : cget("status.locked", "未解鎖"),
	                markers: null,
	                overlayModel: null,
	                meta: {
	                    used: displayCurrentVal,
	                    cap: displayMaxVal,
	                    remaining: Math.max(0, remaining),
	                    prefix: displayPrefix,
	                    unit: displayUnit,
	                    unlocked: unlockMet
	                }
	            });

            pushBlock(cardId, createProgressCard({
                title,
                icon: "fas fa-chart-line",
                theme: "gray",
                badge: getPromoBadgeForModule(mod),
                subTitle: getResetBadgeForKey(mod.cap_key, userProfile),
                description: mod.note_zhhk || "",
                sourceUrl: mod.source_url || (card && card.source_url) || (cardReferenceMeta.sourceUrl || ""),
                sourceTitle: mod.source_title || (card && card.source_title) || (cardReferenceMeta.sourceTitle || ""),
                tncUrl: mod.tnc_url || (card && card.tnc_url) || (cardReferenceMeta.tncUrl || ""),
                promoUrl: mod.promo_url || (card && card.promo_url) || (cardReferenceMeta.promoUrl || ""),
                registrationUrl: mod.registration_url || (card && card.registration_url) || (cardReferenceMeta.registrationUrl || ""),
                registrationStart: mod.registration_start || (card && card.registration_start) || (cardReferenceMeta.registrationStart || ""),
                registrationEnd: mod.registration_end || (card && card.registration_end) || (cardReferenceMeta.registrationEnd || ""),
                registrationNote: mod.registration_note || (card && card.registration_note) || (cardReferenceMeta.registrationNote || ""),
                implementationNote: buildModuleImplementationNote(mod, card, title),
                sections: sections,
                infoLines: buildModuleInfoLines(mod, card, userProfile)
            }));
        });
    });

    // B3: Sort items within each card group by urgency
    const sortItems = (items) => {
        const stateOrder = { warning: 0, active: 1, capped: 2 };
        return items.slice().sort((a, b) => {
            const sa = (a.sortMeta && stateOrder[a.sortMeta.state] !== undefined) ? stateOrder[a.sortMeta.state] : 1;
            const sb = (b.sortMeta && stateOrder[b.sortMeta.state] !== undefined) ? stateOrder[b.sortMeta.state] : 1;
            if (sa !== sb) return sa - sb;
            const da = (a.sortMeta && typeof a.sortMeta.daysLeft === "number") ? a.sortMeta.daysLeft : Infinity;
            const db = (b.sortMeta && typeof b.sortMeta.daysLeft === "number") ? b.sortMeta.daysLeft : Infinity;
            return da - db;
        });
    };
    Object.values(cardGroups).forEach(g => { g.items = sortItems(g.items); });
    globalBlocks.sort((a, b) => {
        const stateOrder = { warning: 0, active: 1, capped: 2 };
        const sa = (a.sortMeta && stateOrder[a.sortMeta.state] !== undefined) ? stateOrder[a.sortMeta.state] : 1;
        const sb = (b.sortMeta && stateOrder[b.sortMeta.state] !== undefined) ? stateOrder[b.sortMeta.state] : 1;
        if (sa !== sb) return sa - sb;
        const da = (a.sortMeta && typeof a.sortMeta.daysLeft === "number") ? a.sortMeta.daysLeft : Infinity;
        const db = (b.sortMeta && typeof b.sortMeta.daysLeft === "number") ? b.sortMeta.daysLeft : Infinity;
        return da - db;
    });

    // B1: Missing registrations banner
    if (unregisteredPromos.length > 0) {
        const chips = unregisteredPromos.map(p => {
            const safeKey = escapeJsSingleQuoted(p.settingKey);
            return `<button type="button" onclick="toggleRegistrationFromDashboard('${safeKey}')" class="inline-flex items-center gap-1 text-[10px] bg-white border border-amber-300 text-amber-800 px-2 py-1 rounded-full hover:bg-amber-100 transition-colors">
                <i class="${escapeHtml(p.icon)} text-[8px]"></i>${escapeHtml(p.title)}
            </button>`;
        }).join("");
        html += `<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <div class="text-xs font-bold text-amber-800 mb-1">\u26A0\uFE0F ${unregisteredPromos.length} 個推廣尚未登記</div>
            <div class="text-[10px] text-amber-700">登記後即可追蹤進度及計算回贈</div>
            <div class="flex flex-wrap gap-2 mt-2">${chips}</div>
        </div>`;
    }

    const orderedCardGroups = ownedCards
        .map((cardId) => cardGroups[cardId])
        .filter((group) => group && group.items.length > 0);
    const getCardBankTag = (cardId) => {
        const id = String(cardId || "");
        if (id.startsWith("hsbc_")) return "HSBC";
        if (id.startsWith("sc_")) return "SC";
        if (id.startsWith("citi_")) return "Citi";
        if (id.startsWith("dbs_")) return "DBS";
        if (id.startsWith("hangseng_")) return "Hang Seng";
        if (id.startsWith("boc_")) return "BOC";
        if (id.startsWith("ae_")) return "AE";
        if (id.startsWith("fubon_")) return "Fubon";
        if (id.startsWith("bea_")) return "BEA";
        if (id.startsWith("sim_")) return "sim";
        if (id.startsWith("aeon_")) return "AEON";
        if (id.startsWith("wewa")) return "WeWa";
        if (id.startsWith("mox_")) return "Mox";
        if (id.startsWith("earnmore")) return "EarnMORE";
        return "Card";
    };
    const getCardToneClass = (cardId) => {
        const id = String(cardId || "");
        if (id.startsWith("hsbc_")) return "wallet-tone-hsbc";
        if (id.startsWith("sc_")) return "wallet-tone-sc";
        if (id.startsWith("citi_")) return "wallet-tone-citi";
        if (id.startsWith("dbs_")) return "wallet-tone-dbs";
        if (id.startsWith("hangseng_")) return "wallet-tone-hangseng";
        if (id.startsWith("boc_")) return "wallet-tone-boc";
        if (id.startsWith("ae_")) return "wallet-tone-ae";
        if (id.startsWith("fubon_")) return "wallet-tone-fubon";
        if (id.startsWith("bea_")) return "wallet-tone-bea";
        if (id.startsWith("sim_")) return "wallet-tone-sim";
        if (id.startsWith("aeon_")) return "wallet-tone-aeon";
        if (id.startsWith("wewa")) return "wallet-tone-wewa";
        if (id.startsWith("mox_")) return "wallet-tone-mox";
        return "wallet-tone-default";
    };

    const hasAnyProgress = orderedCardGroups.length > 0 || globalBlocks.length > 0;
    const focusRaw = String((userProfile.settings && userProfile.settings.dashboard_focus_card) || "");
    const isValidFocus = focusRaw === "__shared__"
        ? globalBlocks.length > 0
        : ownedSet.has(focusRaw);
    const fallbackFocus = orderedCardGroups[0]
        ? orderedCardGroups[0].cardId
        : (globalBlocks.length > 0 ? "__shared__" : (ownedCards[0] || ""));
    const focusedCardId = isValidFocus ? focusRaw : fallbackFocus;
    const detailMode = !!(userProfile.settings && userProfile.settings.dashboard_detail_mode && focusedCardId);

    if (!detailMode) {
        html += `<div class="notion-panel rounded-2xl p-5">
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold text-gray-800">簽帳/回贈進度總覽</h3>
                <span class="text-[10px] text-gray-500">${hasAnyProgress ? "點擊卡面查看詳情" : "未有可追蹤項目"}</span>
            </div>`;

        if (!hasAnyProgress) {
            html += `<div class="bg-white rounded-xl border border-gray-200 p-5 text-center text-gray-500 text-sm">
                暫時未有可追蹤的優惠進度，先去「設定」揀選你持有的信用卡。
            </div>`;
        } else {
            html += `<div class="grid grid-cols-1 gap-3">`;
            ownedCards.forEach((cardId) => {
                const count = (cardGroups[cardId] && Array.isArray(cardGroups[cardId].items)) ? cardGroups[cardId].items.length : 0;
                const card = cardById[cardId] || null;
                const cardName = card ? String(card.name || cardId) : String(cardId);
                const bankTag = getCardBankTag(cardId);
                const toneClass = getCardToneClass(cardId);
                const activeClass = focusedCardId === cardId ? "wallet-cover-active" : "";
                if (count > 0) {
                    html += `<button type="button" onclick="openDashboardCardDetail('${escapeJsSingleQuoted(cardId)}')" class="wallet-cover ${toneClass} ${activeClass}">
                    <div class="wallet-cover-chip"></div>
                    <div class="wallet-cover-meta">${escapeHtml(bankTag)}</div>
                    <div class="wallet-cover-title">${escapeHtml(cardName)}</div>
                    <div class="wallet-cover-foot">${count > 0 ? `${count} 項可追蹤進度` : "暫無進度項目"}</div>
                </button>`;
                } else {
                    html += `<div class="wallet-cover ${toneClass} opacity-80">
                        <div class="wallet-cover-chip"></div>
                        <div class="wallet-cover-meta">${escapeHtml(bankTag)}</div>
                        <div class="wallet-cover-title">${escapeHtml(cardName)}</div>
                        <div class="wallet-cover-foot">暫無進度項目</div>
                    </div>`;
                }
            });
            if (globalBlocks.length > 0) {
                const activeClass = focusedCardId === "__shared__" ? "wallet-cover-active" : "";
                html += `<button type="button" onclick="openDashboardCardDetail('__shared__')" class="wallet-cover wallet-tone-default ${activeClass}">
                    <div class="wallet-cover-chip"></div>
                    <div class="wallet-cover-meta">Shared</div>
                    <div class="wallet-cover-title">跨卡共用優惠</div>
                    <div class="wallet-cover-foot">${globalBlocks.length} 項可追蹤進度</div>
                </button>`;
            }
            html += `</div>`;
        }
        html += `</div>`;
        container.innerHTML = html;
        return;
    }

    const focusGroup = focusedCardId === "__shared__" ? null : cardGroups[focusedCardId];
    const focusItems = focusedCardId === "__shared__"
        ? globalBlocks
        : ((focusGroup && Array.isArray(focusGroup.items)) ? focusGroup.items : []);
    const focusTitle = focusedCardId === "__shared__"
        ? "跨卡共用優惠"
        : ((focusGroup && focusGroup.cardName) || String(focusedCardId || ""));
    const focusCount = Array.isArray(focusItems) ? focusItems.length : 0;

    html += `<div class="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <div class="flex items-center justify-between gap-3">
            <div>
                <div class="text-[10px] uppercase tracking-wider text-gray-500">Progress Detail</div>
                <div class="text-sm font-bold text-gray-800 mt-1">${escapeHtml(focusTitle)}</div>
            </div>
            <button type="button" onclick="closeDashboardCardDetail()" class="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                返回總覽
            </button>
        </div>
    </div>`;

    if (focusCount === 0) {
        html += `<div class="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-500 text-sm">
            呢張卡暫時未有可追蹤的優惠進度。
        </div>`;
    } else {
        html += `<div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-bold text-gray-800">進度項目</h3>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">${focusCount} 項</span>
        </div>`;
        html += focusItems.map(item => typeof item === "string" ? item : item.html).join("");
    }

    container.innerHTML = html;
}

function renderCalculatorResults(results, currentMode) {
    let html = "";
    const onlineToggle = document.getElementById('tx-online');
    const isOnline = onlineToggle ? !!onlineToggle.checked : false;
    const paymentSelect = document.getElementById('tx-payment');
    const paymentMethod = paymentSelect ? paymentSelect.value : "physical";
    const isMobilePay = paymentMethod !== "physical";

    results.forEach((res, index) => {
	        const unsupportedMode = currentMode === "miles" ? !res.supportsMiles : !res.supportsCash;

            const formatValueText = (val, unit) => {
                const v = String(val ?? "");
                const u = String(unit ?? "");
                if (u === "$") return `$${v}`;
                if (u === "里") return `${v}里`;
                if (u === "RC") return `${v} RC`;
                if (u === "分") return `${v}分`;
                // Fallback: keep old behavior.
                if (u === "HKD" || u === "元" || u === "現金") return `$${v}`;
                return u ? `${v} ${u}` : v;
            };
            const renderPrimaryValue = (val, unit, className) => {
                const v = String(val ?? "");
                const u = String(unit ?? "");
                const safeV = escapeHtml(v);
                const safeU = escapeHtml(u);
                if (u === "$" || u === "HKD" || u === "元" || u === "現金") {
                    return `<div class="text-xl ${className}">$${safeV}</div>`;
                }
                if (!u) return `<div class="text-xl ${className}">${safeV}</div>`;
                return `<div class="text-xl ${className}">${safeV} <span class="text-xs text-gray-400">${safeU}</span></div>`;
            };

	        // Prepare Rebate Text (User specific request)
	        // Miles -> "400里", Cash -> "$40", RC -> "400 RC"
	        let resultText = "";
	        const u = res.displayUnit;
	        const v = res.displayVal;

	        resultText = formatValueText(v, u);

        // Net value adjustment (foreign fee / merchant discount)
        let feeNetValue = null;
        let feeNetPotential = null;
        let feeLineHtml = '';
        const showFeeEquation = currentMode === 'cash' && userProfile && userProfile.settings && userProfile.settings.deduct_fcf_ranking;
        const allowFeeNet = showFeeEquation && res.supportsCash;
        const foreignFee = Math.max(0, Number(res.foreignFee) || 0);
        const memberDayDiscount = Math.max(0, Number(res.memberDayDiscount) || 0);
        const hasNetImpact = foreignFee > 0 || memberDayDiscount > 0;
        const selectedMerchantId = (typeof window !== "undefined" && typeof window.getEffectiveMerchantId === "function")
            ? String(window.getEffectiveMerchantId() || "")
            : ((typeof window !== "undefined" && window.__selectedMerchantId) ? String(window.__selectedMerchantId) : "");
        const showMemberDayLine = !showFeeEquation
            && !!selectedMerchantId
            && (res.cardId === "hsbc_easy" || res.cardId === "boc_sogo" || res.cardId === "ae_platinum_credit");
        const adjustmentBits = [];
        if (!showFeeEquation && foreignFee > 0) {
            adjustmentBits.push(`<div class="text-xs text-amber-600 mt-0.5"><i class="fas fa-money-bill-wave mr-1"></i>外幣手續費: -$${foreignFee.toFixed(1)}</div>`);
        }
        if (showMemberDayLine) {
            const toneClass = memberDayDiscount > 0 ? "text-green-700" : "text-gray-500";
            adjustmentBits.push(`<div class="text-xs ${toneClass} mt-0.5"><i class="fas fa-percent mr-1"></i>商戶折扣: +$${memberDayDiscount.toFixed(1)}</div>`);
        }
        feeLineHtml = adjustmentBits.join('');
        if (hasNetImpact) {
            const net = Number(res.estCashNet);
            const netPotential = Number(res.estCashNetPotential);
            if (Number.isFinite(net)) feeNetValue = Math.floor(net).toLocaleString();
            if (Number.isFinite(netPotential)) feeNetPotential = Math.floor(netPotential).toLocaleString();
        }

		        const txDateInput = document.getElementById('tx-date');
		        const txDate = txDateInput ? txDateInput.value : "";
			        const dataStr = encodeURIComponent(JSON.stringify({
		            amount: res.amount, trackingKey: res.trackingKey, estValue: res.estValue,
	                grossAmount: Number(res.grossAmount) || Number(res.amount) || 0,
	                memberDayDiscount: Number(res.memberDayDiscount) || 0,
		            guruRC: res.guruRC, missionTags: res.missionTags, category: res.category,
		            cardId: res.cardId,
		            merchantId: selectedMerchantId || null,
		            rewardTrackingKey: res.rewardTrackingKey,
		            secondaryRewardTrackingKey: res.secondaryRewardTrackingKey,
		            generatedReward: res.generatedReward,
	            resultText: resultText,
	            unsupportedMode,
	            pendingUnlocks: res.pendingUnlocks || [],
	            isOnline,
	            isMobilePay,
	            paymentMethod,
	            txDate
	        }));
	        let displayVal = res.displayVal;
	        let displayUnit = res.displayUnit;
	        let valClass = unsupportedMode ? 'text-gray-400 font-medium' : 'text-stone-800 font-bold';

	        if (allowFeeNet && hasNetImpact && feeNetValue !== null) {
	            displayVal = feeNetValue;
	            displayUnit = "$";
	            valClass = 'text-blue-600 font-bold';
	        }

		        let mainValHtml = renderPrimaryValue(displayVal, displayUnit, valClass);
		        if (unsupportedMode) {
		            mainValHtml += `<div class="text-[10px] text-gray-400 mt-0.5">${escapeHtml(cget("calc.unsupportedMode", "不支援此模式"))}</div>`;
		        }
	        let potentialHtml = "";
	        const lockedNonModulePotentialNative = Array.isArray(res.breakdown)
	            ? res.breakdown.reduce((sum, entry) => {
	                if (!entry || typeof entry !== "object") return sum;
	                const text = String(entry.text || "");
	                const flags = entry.flags || {};
	                if (!(flags.locked || text.includes("🔒"))) return sum;
	                const meta = entry.meta || {};
	                if (meta.modType || meta.modMode) return sum;
	                const rate = Number(meta.rate);
	                if (!Number.isFinite(rate) || rate <= 0) return sum;
	                return sum + ((Number(res.amount) || 0) * rate);
	            }, 0)
	            : 0;
	        const lockedNonModulePotentialDisplayAddon = (() => {
	            if (!(lockedNonModulePotentialNative > 0)) return 0;
	            const nativePot = Number(res.nativeValPotential) || 0;
	            const nativeNow = Number(res.nativeVal) || 0;
	            const milesPerNative = nativePot > 0
	                ? ((Number(res.estMilesPotential) || 0) / nativePot)
	                : (nativeNow > 0 ? ((Number(res.estMiles) || 0) / nativeNow) : 0);
	            const cashPerNative = nativePot > 0
	                ? ((Number(res.estCashPotential) || 0) / nativePot)
	                : (nativeNow > 0 ? ((Number(res.estCash) || 0) / nativeNow) : 0);
	            if (currentMode === "miles") return lockedNonModulePotentialNative * milesPerNative;
	            return lockedNonModulePotentialNative * cashPerNative;
	        })();
	        const hasPendingUnlock = Array.isArray(res.pendingUnlocks) && res.pendingUnlocks.length > 0;
	        const hasPotentialDelta = (Number(res.nativeValPotential) || 0) > ((Number(res.nativeVal) || 0) + 1e-9);
	        const hasLockedBreakdown = Array.isArray(res.breakdown) && res.breakdown.some((entry) => {
	            const text = typeof entry === "string" ? entry : String((entry && entry.text) || "");
	            const flags = (entry && typeof entry === "object" && entry.flags) ? entry.flags : {};
	            return !!flags.locked || text.includes("🔒");
	        });
	        if (res.displayValPotential && (res.displayValPotential !== res.displayVal || hasPotentialDelta || hasPendingUnlock || hasLockedBreakdown)) {
	            let potentialVal = res.displayValPotential;
	            let potentialUnit = res.displayUnitPotential;
	            if (allowFeeNet && hasNetImpact && feeNetPotential !== null) {
	                potentialVal = feeNetPotential;
	                potentialUnit = "$";
	            }
	            const parsedPotential = Number(String(potentialVal).replace(/,/g, ""));
	            if (Number.isFinite(parsedPotential) && lockedNonModulePotentialDisplayAddon > 0) {
	                potentialVal = Math.floor(Math.max(0, parsedPotential + lockedNonModulePotentialDisplayAddon)).toLocaleString();
	            }
	            potentialHtml = `<div class="text-[10px] text-gray-500 mt-0.5">🔓 解鎖後：${escapeHtml(formatValueText(potentialVal, potentialUnit))}</div>`;
	        }
        let redemptionHtml = "";
        if (potentialHtml && !res.redemptionConfig) {
            mainValHtml += potentialHtml;
        }

	        if (res.redemptionConfig) {
	            const rd = res.redemptionConfig;
                const nativeRounded = Math.floor(Number(res.nativeVal) || 0);
                const displayRounded = Math.floor(Number(String(displayVal).replace(/,/g, "")) || 0);
                const primaryUnit = String(displayUnit || "").trim();
                const nativeUnit = String(rd.unit || "").trim();
                const showNativeLine = !(primaryUnit && nativeUnit && primaryUnit === nativeUnit && displayRounded === nativeRounded);
                const nativeLineHtml = showNativeLine
                    ? `<div class="text-xs text-gray-500 mt-0.5 font-mono">${nativeRounded.toLocaleString()} ${escapeHtml(nativeUnit)}</div>`
                    : "";
	            if (!unsupportedMode) {
	                mainValHtml = `
	                    ${renderPrimaryValue(displayVal, displayUnit, valClass)}
	                    ${nativeLineHtml}
	                    ${potentialHtml}
	                `;
		            } else {
		                mainValHtml = `
		                    ${renderPrimaryValue(0, displayUnit, valClass)}
		                    <div class="text-[10px] text-gray-400 mt-0.5">${escapeHtml(cget("calc.unsupportedMode", "不支援此模式"))}</div>
		                    <div class="text-xs text-gray-500 mt-0.5 font-mono">${Math.floor(res.nativeVal).toLocaleString()} ${rd.unit}</div>
		                    ${potentialHtml}
		                `;
		            }

	            const feeStr = (rd.fee || "").replace(/✅/g, "").trim();
	            const feeCore = feeStr.replace(/\s*[（(][^）)]*[）)]\s*$/g, "").trim();
	            const feeNorm = feeCore.toLowerCase().replace(/\s+/g, "");
	            const isFree = !feeCore || /^(免費|免手續費|無|n\/a|na|free)$/i.test(feeNorm);
	            if (!isFree && currentMode === "miles") {
	                const shortFee = escapeHtml(feeCore);
	                redemptionHtml = `
	                    <div class="mt-1 flex justify-end">
	                        <span class="text-[10px] text-amber-600">⚠️ 手續費 ${shortFee}</span>
	                    </div>`;
	            }
	        }

	        // Add top result styling for top 3
	        const isTop = index < 3 && !unsupportedMode;
	        const topClass = isTop ? ' top-result relative' : '';
	        const topBadge = index === 0 && !unsupportedMode ? '<span class="top-result-badge">🏆 最佳</span>' : '';

        const safeCardNameForAction = escapeJsSingleQuoted(res.cardName);
	        html += `<div class="card-enter bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start mb-3${topClass}">
	            ${topBadge}
	            <div class="w-2/3 pr-2">
	                <div class="font-bold text-gray-800 text-sm truncate">${res.cardName}</div>
	                <div class="text-xs mt-1 leading-relaxed">${renderBreakdown(res.breakdown, res)}</div>
	                ${feeLineHtml}
	            </div>
	            <div class="text-right w-1/3 flex flex-col items-end">
	                ${mainValHtml}
	                ${redemptionHtml}
	                <button type="button" onclick="handleRecord('${safeCardNameForAction}','${dataStr}')" class="text-[10px] text-blue-600 font-bold mt-2 bg-blue-50 inline-block px-2 py-1 rounded-full border border-blue-100 hover:bg-blue-100 transition-colors">記帳</button>
	            </div>
	        </div>`;
	    });

    if (results.length === 0) html = `<div class="text-center text-gray-400 py-10 text-sm">請先在「設定」頁面新增卡片</div>`;
    document.getElementById('calc-results').innerHTML = html;
}

function renderSettings(userProfile) {
    const list = document.getElementById('settings-container');
    const bankGroups = [
        { key: "hsbc", name: "🦁 HSBC 滙豐", filter: id => id.startsWith('hsbc_') },
        { key: "sc", name: "🔵 Standard Chartered 渣打", filter: id => id.startsWith('sc_') },
        { key: "citi", name: "🏦 Citi 花旗", filter: id => id.startsWith('citi_') },
        { key: "dbs", name: "⚫ DBS 星展", filter: id => id.startsWith('dbs_') },
        { key: "hangseng", name: "🌿 Hang Seng 恒生", filter: id => id.startsWith('hangseng_') },
        { key: "boc", name: "🏛️ BOC 中銀", filter: id => id.startsWith('boc_') },
        { key: "ae", name: "🏛️ American Express", filter: id => id.startsWith('ae_') },
        { key: "fubon", name: "🏦 Fubon 富邦", filter: id => id.startsWith('fubon_') },
        { key: "bea", name: "🏦 BEA 東亞", filter: id => id.startsWith('bea_') },
        { key: "alt", name: "💳 sim / AEON / WeWa", filter: id => id.startsWith('sim_') || id.startsWith('aeon_') || id.startsWith('wewa') || id.startsWith('earnmore') || id.startsWith('mox_') },
        { key: "others", name: "💎 Others 其他", filter: id => !id.startsWith('hsbc_') && !id.startsWith('sc_') && !id.startsWith('citi_') && !id.startsWith('dbs_') && !id.startsWith('hangseng_') && !id.startsWith('boc_') && !id.startsWith('ae_') && !id.startsWith('fubon_') && !id.startsWith('bea_') && !id.startsWith('sim_') && !id.startsWith('aeon_') && !id.startsWith('wewa') && !id.startsWith('earnmore') && !id.startsWith('mox_') }
    ];
    const ownedCards = Array.isArray(userProfile.ownedCards) ? userProfile.ownedCards.slice() : [];
    const ownedSet = new Set(ownedCards);
    const cardsById = {};
    (DATA.cards || []).forEach((card) => {
        if (card && card.id) cardsById[card.id] = card;
    });

    const getCardName = (cardId) => {
        const card = cardsById[cardId];
        return card ? String(card.name || cardId) : String(cardId || "未知卡片");
    };
    const getCardBankTag = (cardId) => {
        const id = String(cardId || "");
        if (id.startsWith("hsbc_")) return "HSBC";
        if (id.startsWith("sc_")) return "SC";
        if (id.startsWith("citi_")) return "Citi";
        if (id.startsWith("dbs_")) return "DBS";
        if (id.startsWith("hangseng_")) return "Hang Seng";
        if (id.startsWith("boc_")) return "BOC";
        if (id.startsWith("ae_")) return "AE";
        if (id.startsWith("fubon_")) return "Fubon";
        if (id.startsWith("bea_")) return "BEA";
        if (id.startsWith("sim_")) return "sim";
        if (id.startsWith("aeon_")) return "AEON";
        if (id.startsWith("wewa")) return "WeWa";
        if (id.startsWith("mox_")) return "Mox";
        if (id.startsWith("earnmore")) return "EarnMORE";
        return "Card";
    };
    const getCardToneClass = (cardId) => {
        const id = String(cardId || "");
        if (id.startsWith("hsbc_")) return "wallet-tone-hsbc";
        if (id.startsWith("sc_")) return "wallet-tone-sc";
        if (id.startsWith("citi_")) return "wallet-tone-citi";
        if (id.startsWith("dbs_")) return "wallet-tone-dbs";
        if (id.startsWith("hangseng_")) return "wallet-tone-hangseng";
        if (id.startsWith("boc_")) return "wallet-tone-boc";
        if (id.startsWith("ae_")) return "wallet-tone-ae";
        if (id.startsWith("fubon_")) return "wallet-tone-fubon";
        if (id.startsWith("bea_")) return "wallet-tone-bea";
        if (id.startsWith("sim_")) return "wallet-tone-sim";
        if (id.startsWith("aeon_")) return "wallet-tone-aeon";
        if (id.startsWith("wewa")) return "wallet-tone-wewa";
        if (id.startsWith("mox_")) return "wallet-tone-mox";
        return "wallet-tone-default";
    };
    const findFirstOwnedCard = (ids) => {
        if (!Array.isArray(ids)) return null;
        return ids.find((id) => ownedSet.has(id)) || null;
    };
    const ownedCardsByModule = (moduleId) => {
        if (!moduleId) return [];
        return ownedCards.filter((cardId) => {
            const card = cardsById[cardId];
            return !!(card && Array.isArray(card.rewardModules) && card.rewardModules.includes(moduleId));
        });
    };
    const cardsWithSettingEntries = new Set();
    const markCardsByScope = (cardIds) => {
        const scope = resolveOwnedOfferScope(cardIds, ownedSet);
        if (scope.type === "card" && scope.cardId) {
            cardsWithSettingEntries.add(scope.cardId);
            return;
        }
        if (scope.type === "bank_shared" && scope.bankKey) {
            ownedCards.forEach((cardId) => {
                if (getCardBankKey(cardId) === scope.bankKey) cardsWithSettingEntries.add(cardId);
            });
            return;
        }
        if (scope.type === "cross_bank_shared") {
            ownedCards.forEach((cardId) => cardsWithSettingEntries.add(cardId));
        }
    };
    // Campaign/module-driven settings (generic scope resolution).
    getCampaignToggleDefinitions().forEach((def) => {
        if (!def || !Array.isArray(def.cards)) return;
        markCardsByScope(def.cards);
    });
    // Non-campaign feature settings.
    markCardsByScope(ownedCardsByModule("travel_guru_v2"));
    markCardsByScope(ownedCardsByModule("red_hot_variable"));
    if (ownedSet.has("dbs_live_fresh")) cardsWithSettingEntries.add("dbs_live_fresh");
    if (ownedSet.has("wewa")) cardsWithSettingEntries.add("wewa");
    if (ownedSet.has("mox_credit")) cardsWithSettingEntries.add("mox_credit");
    if (ownedSet.has("hangseng_mmpower")) cardsWithSettingEntries.add("hangseng_mmpower");
    if (ownedSet.has("hangseng_enjoy")) cardsWithSettingEntries.add("hangseng_enjoy");
    if (ownedSet.has("citi_prestige")) cardsWithSettingEntries.add("citi_prestige");
    let focusedCardId = String((userProfile.settings && userProfile.settings.settings_focus_card) || "");
    if (!ownedSet.has(focusedCardId)) focusedCardId = ownedCards[0] || "";
    const focusedCardName = focusedCardId ? getCardName(focusedCardId) : "";
    const detailMode = !!(userProfile.settings && userProfile.settings.settings_detail_mode && focusedCardId);
    const editMode = !!(userProfile.settings && userProfile.settings.settings_wallet_edit_mode);
    const addCardsOpen = !!(userProfile.settings && userProfile.settings.settings_wallet_add_open);
    const remainingCardsCount = Math.max(0, (DATA.cards || []).length - ownedCards.length);
    const addGroupOpenMap = (userProfile.settings && typeof userProfile.settings.settings_wallet_add_groups === "object" && userProfile.settings.settings_wallet_add_groups)
        ? userProfile.settings.settings_wallet_add_groups
        : {};
    const focusedCardEsc = escapeJsSingleQuoted(focusedCardId);
    const focusedBankKey = focusedCardId ? getCardBankKey(focusedCardId) : "";
    const ensureBucket = (map, key) => {
        const safeKey = key || "__shared__";
        if (!map[safeKey]) map[safeKey] = [];
        return map[safeKey];
    };
    const renderPerCardSettingsBlocks = (blocksByCard, sharedBlocks, emptyText, cardIcon, cardTheme, focusCardId) => {
        let out = "";
        const cardOrder = focusCardId ? [focusCardId] : ownedCards;
        cardOrder.forEach((cardId) => {
            const blocks = blocksByCard[cardId] || [];
            if (blocks.length === 0) return;
            out += `<section class="rounded-xl border ${cardTheme.border} bg-white p-3">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-xs font-bold ${cardTheme.title} flex items-center gap-2">
                        <i class="${cardIcon}"></i>${escapeHtml(getCardName(cardId))}
                    </h3>
                    <span class="text-[10px] ${cardTheme.badge} px-2 py-0.5 rounded-full">${blocks.length} 項</span>
                </div>
                <div class="space-y-3">${blocks.join("")}</div>
            </section>`;
        });
        if (Array.isArray(sharedBlocks) && sharedBlocks.length > 0) {
            out += `<section class="rounded-xl border border-purple-100 bg-purple-50 p-3">
                <div class="text-xs font-bold text-purple-700 mb-2 flex items-center gap-2">
                    <i class="fas fa-layer-group"></i>跨卡共用設定
                </div>
                <div class="space-y-3">${sharedBlocks.join("")}</div>
            </section>`;
        }
        if (!out) out = `<div class="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-xl p-3">${escapeHtml(emptyText)}</div>`;
        return out;
    };
    const renderRegistrationRow = (def) => {
        const classes = getPromoToggleThemeClasses(def.theme);
        const checked = !!(userProfile && userProfile.settings && userProfile.settings[def.settingKey]);
        const toggleSettingKey = escapeJsSingleQuoted(def.settingKey);
        const inputId = `st-${def.settingKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
        const descText = normalizeInfoText(def.description || "", 90);
        const refsHtml = renderReferenceActions({
            sourceUrl: def.sourceUrl,
            sourceTitle: def.sourceTitle,
            tncUrl: def.tncUrl,
            promoUrl: def.promoUrl,
            registrationUrl: def.registrationUrl,
            registrationStart: def.registrationStart || "",
            registrationEnd: def.registrationEnd || "",
            registrationNote: def.registrationNote || "",
            implementationNote: def.implementationNote
        }, {
            linkClass: "text-[10px] text-stone-600 hover:text-stone-800 underline underline-offset-2",
            implClass: "text-[10px] text-stone-600 hover:text-stone-800 underline underline-offset-2",
            showRegistration: true,
            showPromo: true,
            showTnc: true,
            showImplementation: true
        });
        const metaHtml = (descText || refsHtml) ? `<div class="mt-1 flex flex-wrap items-center gap-2">
            ${descText ? `<span class="text-[10px] text-stone-600">${escapeHtml(descText)}</span>` : ""}
            ${refsHtml}
        </div>` : "";
        const detailsOpen = checked ? "" : " open";
        return `<div data-setting-key="${escapeHtml(def.settingKey)}" class="${classes.row} p-2 rounded border ${classes.border}">
            <details${detailsOpen}>
                <summary class="flex justify-between items-start gap-3 cursor-pointer list-none" style="list-style:none">
                    <div class="min-w-0">
                        <div class="text-xs font-bold text-stone-800">${escapeHtml(def.label)}</div>
                    </div>
                    <div onclick="event.stopPropagation()" class="flex-shrink-0">
                        ${renderSettingsToggle({ id: inputId, checked, onchange: `toggleSetting('${toggleSettingKey}')` })}
                    </div>
                </summary>
                ${metaHtml}
            </details>
        </div>`;
    };

    // Data Management Section
    let html = "";
    // B5: Batch review mode
    if (!detailMode && settingsBatchReviewMode) {
        const toggleDefs = (typeof getCampaignToggleDefinitions === "function") ? getCampaignToggleDefinitions() : [];
        const registrationDefs = toggleDefs.filter(d => {
            if (!d || !d.settingKey) return false;
            const scopedCards = [];
            if (typeof DATA !== "undefined" && Array.isArray(DATA.offers)) {
                DATA.offers.forEach(offer => {
                    if (offer && offer.settingKey === d.settingKey && Array.isArray(offer.cards)) {
                        offer.cards.forEach(cid => { if (ownedSet.has(cid)) scopedCards.push(cid); });
                    }
                });
            }
            return scopedCards.length > 0;
        });
        html += `<div class="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
            <div class="flex items-center justify-between mb-3">
                <h2 class="text-sm font-bold text-gray-800">批量檢視推廣登記</h2>
                <button type="button" onclick="toggleBatchReviewMode()" class="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">返回卡片檢視</button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-xs">
                    <thead><tr class="bg-gray-50">
                        <th class="text-left p-2 font-bold text-gray-600">推廣名稱</th>
                        <th class="text-center p-2 font-bold text-gray-600">狀態</th>
                        <th class="text-center p-2 font-bold text-gray-600">登記</th>
                    </tr></thead>
                    <tbody>`;
        registrationDefs.forEach(d => {
            const checked = !!(userProfile.settings[d.settingKey]);
            const statusIcon = checked ? `<span class="text-green-600">✅</span>` : `<span class="text-red-500">❌</span>`;
            const toggleKey = escapeJsSingleQuoted(d.settingKey);
            const inputId = `batch-${d.settingKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
            html += `<tr class="border-t border-gray-100">
                <td class="p-2 text-gray-800">${escapeHtml(d.label || d.settingKey)}</td>
                <td class="p-2 text-center">${statusIcon}</td>
                <td class="p-2 text-center">${renderSettingsToggle({ id: inputId, checked, onchange: `toggleSetting('${toggleKey}')` })}</td>
            </tr>`;
        });
        html += `</tbody></table></div></div>`;
        html += `</div>`;
        list.innerHTML = html;
        return;
    }

    // B5: Batch review mode toggle button (shown in non-detail wallet view)
    if (!detailMode && ownedCards.length > 0) {
        html += `<div class="flex justify-end mb-2">
            <button type="button" onclick="toggleBatchReviewMode()" class="text-xs px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100">
                <i class="fas fa-table-list mr-1"></i>批量檢視
            </button>
        </div>`;
    }

    if (!detailMode) html += `<div class="bg-[#f7f4ee] p-5 rounded-2xl shadow-sm border border-stone-200 mb-4">
        <h2 class="text-sm font-bold text-stone-800 uppercase mb-3 flex items-center gap-2">
            <i class="fas fa-database"></i> 數據管理
        </h2>
        <div class="grid grid-cols-2 gap-3">
            <button onclick="exportData()" 
                class="bg-stone-700 hover:bg-stone-800 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                <i class="fas fa-download"></i> 匯出數據
            </button>
            <label class="bg-stone-600 hover:bg-stone-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer">
                <i class="fas fa-upload"></i> 匯入數據
                <input type="file" accept=".json" onchange="importData(event)" class="hidden">
            </label>
        </div>
        <p class="text-xs text-stone-700 mt-3 bg-stone-100 p-2 rounded-lg">
            💡 建議定期匯出數據作備份，以免瀏覽器清除數據時遺失記錄。
        </p>
    </div>`;

    if (!detailMode) {
    html += `<div class="notion-panel p-5 rounded-2xl shadow-sm">
        <div class="flex items-center justify-between mb-3 border-b pb-2">
            <h2 class="text-sm font-bold text-gray-800 uppercase">我的銀包</h2>
            <div class="flex items-center gap-2">
                <button type="button" onclick="toggleWalletAddCardsPanel()" class="text-xs px-3 py-1.5 rounded-lg border ${addCardsOpen ? "border-stone-600 bg-stone-700 text-white" : "border-stone-300 text-stone-700 hover:bg-stone-100"}">
                    ＋ 加入新卡 <span class="${addCardsOpen ? "text-stone-100" : "text-stone-500"}">${remainingCardsCount}</span>
                </button>
                ${ownedCards.length > 0
                    ? `<button type="button" onclick="toggleWalletEditMode()" class="text-xs px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100">${editMode ? "完成" : "編輯"}</button>`
                    : ""}
            </div>
        </div>
        ${editMode ? `<div class="text-[11px] text-stone-600 mb-3">可拖曳排序，按右上角 X 刪除卡片。</div>` : ""}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 ${editMode ? 'wallet-edit-mode' : ''}">`;
    ownedCards.forEach((cardId) => {
        const cardName = getCardName(cardId);
        const toneClass = getCardToneClass(cardId);
        const bankTag = getCardBankTag(cardId);
        const searchText = `${bankTag} ${cardName}`.toLowerCase();
        const isFocused = focusedCardId === cardId;
        const canOpenSettingsDetail = cardsWithSettingEntries.has(cardId);
        if (editMode) {
            html += `<div data-wallet-cover data-wallet-card="${escapeHtml(searchText)}" draggable="true"
                ondragstart="walletDragStart(event, '${escapeJsSingleQuoted(cardId)}')"
                ondragend="walletDragEnd()"
                ondragover="walletDragOver(event)"
                ondrop="walletDrop(event, '${escapeJsSingleQuoted(cardId)}')"
                class="wallet-cover wallet-edit-item ${toneClass}">
                <button type="button" onclick="event.stopPropagation(); removeWalletCard('${escapeJsSingleQuoted(cardId)}')" class="wallet-delete-btn" aria-label="移除卡片">×</button>
                <div class="wallet-cover-chip"></div>
                <div class="wallet-cover-meta">${escapeHtml(bankTag)}</div>
                <div class="wallet-cover-title">${escapeHtml(cardName)}</div>
                <div class="wallet-cover-foot">拖曳排序</div>
                <div class="wallet-drag-hint"><i class="fas fa-grip-lines"></i></div>
            </div>`;
        } else if (canOpenSettingsDetail) {
            html += `<button type="button" data-wallet-cover data-wallet-card="${escapeHtml(searchText)}" onclick="openWalletCardDetail('${escapeJsSingleQuoted(cardId)}')" class="wallet-cover ${toneClass} ${isFocused ? 'wallet-cover-active' : ''}">
            <div class="wallet-cover-chip"></div>
            <div class="wallet-cover-meta">${escapeHtml(bankTag)}</div>
            <div class="wallet-cover-title">${escapeHtml(cardName)}</div>
            <div class="wallet-cover-foot">${isFocused ? "正在查看" : "點擊查看設定"}</div>
        </button>`;
        } else {
            html += `<div data-wallet-cover data-wallet-card="${escapeHtml(searchText)}" class="wallet-cover ${toneClass} opacity-80">
                <div class="wallet-cover-chip"></div>
                <div class="wallet-cover-meta">${escapeHtml(bankTag)}</div>
                <div class="wallet-cover-title">${escapeHtml(cardName)}</div>
                <div class="wallet-cover-foot">暫無可設定項目</div>
            </div>`;
        }
    });
    html += `<div id="wallet-cover-empty" class="${ownedCards.length > 0 ? 'hidden' : ''} col-span-full text-xs text-gray-500 border border-dashed border-gray-300 rounded-xl p-4 bg-gray-50">
            銀包未有卡。請按右上「＋加入新卡」。
        </div>
        </div>`;
    if (addCardsOpen) {
        html += `<div class="border border-gray-200 rounded-xl bg-white px-3 py-2">
            <div class="text-[11px] text-gray-500 py-1">可連續加入多張卡，完成後再收起。</div>
            <div class="space-y-3 mt-1">`;
        bankGroups.forEach(group => {
            const groupCards = DATA.cards.filter(c => group.filter(c.id) && !ownedSet.has(c.id));
            if (groupCards.length > 0) {
                const groupKey = String(group.key || "");
                const groupKeyEsc = escapeJsSingleQuoted(groupKey);
                html += `<details data-wallet-group data-wallet-total="${groupCards.length}" class="bg-gray-50 rounded-xl px-3 py-1 border border-gray-100" ${(addGroupOpenMap[groupKey]) ? "open" : ""} ontoggle="setWalletAddGroupOpen('${groupKeyEsc}', this.open)">
                    <summary class="list-none cursor-pointer py-2 flex items-center justify-between">
                        <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">${group.name}</span>
                        <span class="text-[10px] text-gray-400"><span data-wallet-match-count>${groupCards.length}</span> 張</span>
                    </summary>`;
                groupCards.forEach(c => {
                    const searchableText = `${group.name} ${c.name}`.toLowerCase();
                    html += `<div data-wallet-card="${escapeHtml(searchableText)}" class="flex justify-between items-center py-3 border-b border-gray-200 last:border-0 gap-3">
                        <div class="min-w-0">
                            <div class="text-sm text-gray-700 font-medium truncate">${escapeHtml(c.name)}</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="toggleCard('${escapeJsSingleQuoted(c.id)}', { fromAddList: true, groupKey: '${groupKeyEsc}' })" class="text-xs px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100">加入</button>
                        </div>
                    </div>`;
                });
                html += `</details>`;
            }
        });
        if ((DATA.cards || []).length === ownedCards.length) {
            html += `<div class="text-xs text-gray-500 border border-dashed border-gray-300 rounded-xl p-3 bg-gray-50">已加入全部卡。</div>`;
        }
        html += `</div></div>`;
    }
    html += `</div>`;
    list.innerHTML = html;
    return;
    }

    const cardReferenceMeta = focusedCardId ? getCardReferenceMeta(focusedCardId) : {};
    const cardImplementationNote = focusedCardId ? buildCardImplementationNote(focusedCardId) : "";
    const cardReferenceLinks = renderReferenceActions({
        sourceUrl: cardReferenceMeta.sourceUrl || "",
        sourceTitle: cardReferenceMeta.sourceTitle || "",
        tncUrl: cardReferenceMeta.tncUrl || "",
        promoUrl: cardReferenceMeta.promoUrl || "",
        implementationNote: cardImplementationNote
    }, {
        linkClass: "text-[10px] text-stone-600 hover:text-stone-800 underline underline-offset-2",
        showRegistration: false,
        showPromo: true,
        showTnc: true,
        showImplementation: true
    });
    const cardReferenceHtml = cardReferenceLinks
        ? `<div class="mt-1">${cardReferenceLinks}</div>`
        : `<div class="mt-1 text-[10px] text-stone-400">來源連結待補</div>`;

    const prevCardId = ownedCards.length > 1 ? ownedCards[(ownedCards.indexOf(focusedCardId) - 1 + ownedCards.length) % ownedCards.length] : "";
    const nextCardId = ownedCards.length > 1 ? ownedCards[(ownedCards.indexOf(focusedCardId) + 1) % ownedCards.length] : "";
    const prevBtn = prevCardId ? `<button type="button" onclick="navigateSettingsCard('${escapeJsSingleQuoted(prevCardId)}')" class="text-gray-400 hover:text-gray-700 px-1" aria-label="上一張卡">◀</button>` : "";
    const nextBtn = nextCardId ? `<button type="button" onclick="navigateSettingsCard('${escapeJsSingleQuoted(nextCardId)}')" class="text-gray-400 hover:text-gray-700 px-1" aria-label="下一張卡">▶</button>` : "";
    html += `<div class="bg-white rounded-2xl border border-gray-200 p-4 mb-4 sticky top-0 z-10 shadow-sm">
        <div class="flex items-center justify-between gap-3">
            <div class="min-w-0 flex items-center gap-1">
                ${prevBtn}
                <div>
                    <div class="text-sm font-bold text-gray-800 truncate">${escapeHtml(focusedCardName || "卡片設定")}</div>
                    <div class="text-[10px] text-gray-500 mt-0.5">${escapeHtml(getCardBankTag(focusedCardId))}</div>
                    ${cardReferenceHtml}
                </div>
                ${nextBtn}
            </div>
            <button type="button" onclick="closeWalletCardDetail()" class="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                返回銀包
            </button>
        </div>
    </div>`;

    html += `<div id="card-detail-panel" class="bg-white p-5 rounded-2xl shadow-sm mt-4"><div class="space-y-4">`;

    const preferenceBlocksByCard = {};
    const sharedPreferenceBlocks = [];
    const bankSharedPreferenceRows = [];
    const getOwnedCardsForSetting = (settingKey) => {
        if (!settingKey || typeof DATA === "undefined" || !Array.isArray(DATA.offers)) return [];
        const hit = [];
        DATA.offers.forEach((offer) => {
            if (!offer || offer.settingKey !== settingKey || !Array.isArray(offer.cards)) return;
            offer.cards.forEach((cardId) => {
                if (ownedSet.has(cardId)) hit.push(cardId);
            });
        });
        return Array.from(new Set(hit));
    };
    const pushScopedSettingRow = (settingKey, rowHtml, fallbackCardId) => {
        const scopedCards = getOwnedCardsForSetting(settingKey);
        const scoped = resolveOwnedOfferScope(scopedCards, ownedSet);
        if (scoped.type === "card") {
            ensureBucket(preferenceBlocksByCard, scoped.cardId).push(rowHtml);
            return;
        }
        if (scoped.type === "bank_shared") {
            if (!focusedCardId || scoped.bankKey === focusedBankKey) bankSharedPreferenceRows.push(rowHtml);
            return;
        }
        if (scoped.type === "cross_bank_shared") {
            sharedPreferenceBlocks.push(rowHtml);
            return;
        }
        if (fallbackCardId && ownedSet.has(fallbackCardId)) {
            ensureBucket(preferenceBlocksByCard, fallbackCardId).push(rowHtml);
            return;
        }
    };

    const guruLevels = (typeof getTravelGuruLevelMap === "function")
        ? getTravelGuruLevelMap()
        : { 1: { name: "GO級" }, 2: { name: "GING級" }, 3: { name: "GURU級" } };
    const guruOptions = Object.keys(guruLevels)
        .map((key) => Number(key))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b)
        .map((lv) => `<option value="${lv}">${escapeHtml((guruLevels[lv] && guruLevels[lv].name) || `${lv}級`)}</option>`)
        .join("");
    const guruRegistered = !!userProfile.settings.travel_guru_registered;
    const guruModel = (typeof getLevelLifecycleModel === "function") ? getLevelLifecycleModel("travel_guru") : null;
    const guruRawModel = (typeof DATA !== "undefined" && DATA && DATA.specialPromoModels && DATA.specialPromoModels.travel_guru)
        ? DATA.specialPromoModels.travel_guru
        : null;
    const guruCandidates = (guruModel && Array.isArray(guruModel.cards) && guruModel.cards.length > 0)
        ? guruModel.cards
        : ((guruRawModel && Array.isArray(guruRawModel.cards) && guruRawModel.cards.length > 0)
            ? guruRawModel.cards
            : ownedCardsByModule("travel_guru_v2"));
    const guruFallbackCardId = findFirstOwnedCard(guruCandidates);
    const guruSourceMeta = guruFallbackCardId ? getCardReferenceMeta(guruFallbackCardId) : {};
    const guruRefMeta = guruRawModel || guruModel || {};
    const guruTncUrl = (guruRefMeta && Object.prototype.hasOwnProperty.call(guruRefMeta, "tncUrl"))
        ? String(guruRefMeta.tncUrl || "")
        : (guruSourceMeta.tncUrl || "");
    const guruPromoUrl = (guruRefMeta && Object.prototype.hasOwnProperty.call(guruRefMeta, "promoUrl"))
        ? String(guruRefMeta.promoUrl || "")
        : (guruSourceMeta.promoUrl || "");
    const guruRegistrationUrl = (guruRefMeta && Object.prototype.hasOwnProperty.call(guruRefMeta, "registrationUrl"))
        ? String(guruRefMeta.registrationUrl || "")
        : (guruSourceMeta.registrationUrl || "");
    const guruRegistrationStart = (guruRefMeta && Object.prototype.hasOwnProperty.call(guruRefMeta, "registrationStart"))
        ? String(guruRefMeta.registrationStart || "")
        : (guruSourceMeta.registrationStart || "");
    const guruRegistrationEnd = (guruRefMeta && Object.prototype.hasOwnProperty.call(guruRefMeta, "registrationEnd"))
        ? String(guruRefMeta.registrationEnd || "")
        : (guruSourceMeta.registrationEnd || "");
    const guruRegistrationNote = (guruRefMeta && Object.prototype.hasOwnProperty.call(guruRefMeta, "registrationNote"))
        ? String(guruRefMeta.registrationNote || "")
        : (guruSourceMeta.registrationNote || "");
    const guruImplementationNote = (guruRefMeta && (guruRefMeta.implementationNote || guruRefMeta.implementation_note))
        ? String(guruRefMeta.implementationNote || guruRefMeta.implementation_note)
        : "計算器做法：登記後可啟動 GO 級；其後海外合資格簽賬按等級計算（GO 額外 3% 上限 500 RC、GING 額外 4% 上限 1,200 RC、GURU 額外 6% 上限 2,200 RC），每級達升級門檻後可升級並重置該級進度。";
    const guruRefsHtml = renderReferenceActions({
        sourceUrl: guruSourceMeta.sourceUrl || "",
        sourceTitle: guruSourceMeta.sourceTitle || "",
        tncUrl: guruTncUrl,
        promoUrl: guruPromoUrl,
        registrationUrl: guruRegistrationUrl,
        registrationStart: guruRegistrationStart,
        registrationEnd: guruRegistrationEnd,
        registrationNote: guruRegistrationNote,
        implementationNote: guruImplementationNote
    }, {
        linkClass: "text-[10px] text-stone-600 hover:text-stone-800 underline underline-offset-2",
        implClass: "text-[10px] text-stone-600 hover:text-stone-800 underline underline-offset-2",
        showRegistration: true,
        showPromo: true,
        showTnc: true,
        showImplementation: true
    });
    const guruRowHtml = `<div data-setting-key="travel_guru_registered" class="border p-3 rounded-xl bg-stone-50 border-stone-200">
        <div class="flex justify-between items-center mb-2">
            <label class="text-xs font-bold text-stone-800">Travel Guru</label>
            ${renderSettingsToggle({ id: "st-guru-enabled", checked: guruRegistered, onchange: "toggleSetting('travel_guru_registered')" })}
        </div>
        ${guruRefsHtml}
        <select id="st-guru" class="w-full p-2 bg-white rounded border border-stone-200 text-sm" onchange="saveDrop('guru_level',this.value)">
            <option value="0">無</option>${guruOptions}
        </select>
    </div>`;
    pushScopedSettingRow("travel_guru_registered", guruRowHtml, guruFallbackCardId);

    const hasLiveFresh = ownedSet.has("dbs_live_fresh");
    if (hasLiveFresh) ensureBucket(preferenceBlocksByCard, "dbs_live_fresh").push(`<div class="border p-3 rounded-md bg-[#fcfcfc] border-[#e9e9e7]">
        <label class="text-xs font-semibold text-[#37352f] block mb-2">DBS Live Fresh 自選類別 (4選1)</label>
        <select id="st-live-fresh" class="w-full p-2 bg-white rounded border border-[#e9e9e7] text-sm" onchange="saveDrop('live_fresh_pref',this.value)">
            <option value="none">未設定</option>
            <option value="online_foreign">網上外幣簽賬 (Online Foreign Currency Spending)</option>
            <option value="travel">網上旅遊商戶、娛樂及指定服務訂閱</option>
            <option value="fashion">網上美容、時尚服飾及指定網上商戶</option>
            <option value="charity">指定商戶及網上慈善捐款</option>
        </select>
    </div>`);

    const wewaSelected = String(userProfile.settings.wewa_selected_category || "mobile_pay");
    if (ownedSet.has("wewa")) ensureBucket(preferenceBlocksByCard, "wewa").push(`<div class="border p-3 rounded-md bg-[#fcfcfc] border-[#e9e9e7]">
        <label class="text-xs font-semibold text-[#37352f] block mb-2">WeWa 自選回贈類別（4選1）</label>
        <select id="st-wewa-selected" class="w-full p-2 bg-white rounded border border-[#e9e9e7] text-sm" onchange="saveDrop('wewa_selected_category',this.value)">
            <option value="mobile_pay">📱 流動支付</option>
            <option value="travel">✈️ 旅遊簽賬</option>
            <option value="overseas">🌍 海外簽賬</option>
            <option value="online_entertainment">🎬 網上娛樂簽賬</option>
        </select>
    </div>`);

    if (ownedSet.has("hsbc_easy")) ensureBucket(preferenceBlocksByCard, "hsbc_easy").push(`<div class="border p-3 rounded-md bg-[#fcfcfc] border-[#e9e9e7]">
        <div class="text-xs font-semibold text-[#37352f] mb-2">HSBC Easy：會員等級與會員日</div>
        <div class="space-y-2 text-xs">
            <div class="flex justify-between items-center bg-white border border-[#e9e9e7] rounded p-2">
                <span>VIP 會員（百佳/屈臣氏/豐澤按 6X 計）</span>
                ${renderSettingsToggle({ id: "st-hsbc-easy-vip", checked: !!userProfile.settings.hsbc_easy_is_vip, onchange: "toggleSetting('hsbc_easy_is_vip')" })}
            </div>
        </div>
        <div class="mt-2 text-[11px] text-gray-500">
            會員日折扣已自動套用（需配合商戶選擇）；只按條款可判斷條件（未覆蓋所有貨品/服務排除）。
            <a href="https://www.hsbc.com.hk/content/dam/hsbc/hk/tc/docs/credit-cards/visa-platinum-card-exclusive-offers.pdf" target="_blank" rel="noopener" class="underline underline-offset-2">條款</a>
        </div>
    </div>`);

    if (ownedSet.has("boc_sogo")) ensureBucket(preferenceBlocksByCard, "boc_sogo").push(`<div class="border p-3 rounded-md bg-[#fcfcfc] border-[#e9e9e7]">
        <div class="text-xs font-semibold text-[#37352f] mb-2">中銀 SOGO：商戶折扣（非迎新）</div>
        <div class="mt-1 text-[11px] text-gray-500">
            已按商戶 + 交易日期自動計算可量化折扣（Freshmart 逢星期一、和三昧、日本 SOGO/SEIBU）。計算只覆蓋可由系統判斷條件，並以你選擇的商戶為準。
            <a href="https://www.bochk.com/dam/boccreditcard/sogo_doc/sogocard_tnc_tc.pdf" target="_blank" rel="noopener" class="underline underline-offset-2">條款</a>
        </div>
    </div>`);
    if (ownedSet.has("ae_platinum_credit")) ensureBucket(preferenceBlocksByCard, "ae_platinum_credit").push(`<div class="border p-3 rounded-md bg-[#fcfcfc] border-[#e9e9e7]">
        <div class="text-xs font-semibold text-[#37352f] mb-2">AE 大頭：指定商戶 97 折</div>
        <div class="mt-1 text-[11px] text-gray-500">
            已按商戶自動計算 97 折（city'super、LOG-ON、cookedDeli、city'super EKI、味蔵、iza'bis、cafe ToGather）。
            只覆蓋可由系統判斷條件，未核實「指定正價貨品/食品及飲品」等細項排除。
            <a href="https://www.americanexpress.com/content/dam/amex/hk/benefits/pdf/TnCs_platinum-membership-rewards-accelerator.pdf" target="_blank" rel="noopener" class="underline underline-offset-2">條款</a>
        </div>
    </div>`);

    const moxMode = String(userProfile.settings.mox_reward_mode || "cashback");
    if (ownedSet.has("mox_credit")) pushScopedSettingRow("mox_deposit_task_enabled", `<div class="border p-3 rounded-md bg-[#fcfcfc] border-[#e9e9e7]">
        <label class="text-xs font-semibold text-[#37352f] block mb-2">Mox Credit 獎賞模式</label>
        <select id="st-mox-mode" class="w-full p-2 bg-white rounded border border-[#e9e9e7] text-sm" onchange="saveDrop('mox_reward_mode',this.value)">
            <option value="cashback">CashBack（回贈）</option>
            <option value="miles">Asia Miles（里數）</option>
        </select>
        <div class="mt-2 flex justify-between items-center bg-white border border-[#e9e9e7] rounded p-2">
            <span class="text-xs font-semibold text-[#37352f]">已達解鎖條件（$250k結餘 或 合資格出糧$25k）</span>
            ${renderSettingsToggle({ id: "st-mox", checked: !!userProfile.settings.mox_deposit_task_enabled, onchange: "toggleSetting('mox_deposit_task_enabled')" })}
        </div>
    </div>`, "mox_credit");

    const mmpowerSelected = Array.isArray(userProfile.settings.mmpower_selected_categories)
        ? userProfile.settings.mmpower_selected_categories
        : ["dining", "electronics"];
    const mmpowerSet = new Set(mmpowerSelected);
    if (ownedSet.has("hangseng_mmpower")) ensureBucket(preferenceBlocksByCard, "hangseng_mmpower").push(`<div class="border p-3 rounded-md bg-[#fcfcfc] border-[#e9e9e7]">
        <div class="text-xs font-semibold text-[#37352f] mb-2">MMPower 自選簽賬類別（3選2）</div>
        <div class="space-y-2 text-xs">
            <label class="flex justify-between items-center bg-white border border-[#e9e9e7] rounded p-2">
                <span>🍽️ 餐飲（不包括快餐店）</span>
                <input type="checkbox" ${mmpowerSet.has("dining") ? 'checked' : ''} onchange="toggleMmpowerSelected('dining', this.checked)">
            </label>
            <label class="flex justify-between items-center bg-white border border-[#e9e9e7] rounded p-2">
                <span>🔌 電子產品</span>
                <input type="checkbox" ${mmpowerSet.has("electronics") ? 'checked' : ''} onchange="toggleMmpowerSelected('electronics', this.checked)">
            </label>
            <label class="flex justify-between items-center bg-white border border-[#e9e9e7] rounded p-2">
                <span>🎟️ 娛樂（含串流）</span>
                <input type="checkbox" ${mmpowerSet.has("entertainment") ? 'checked' : ''} onchange="toggleMmpowerSelected('entertainment', this.checked)">
            </label>
        </div>
        <div class="mt-2 text-[11px] text-gray-500">現已選：${mmpowerSelected.length}/2（最多 2 項）</div>
    </div>`);

    if (ownedSet.has("hangseng_enjoy")) pushScopedSettingRow("hangseng_enjoy_points4x_enabled", `<div class="border p-3 rounded-xl bg-amber-50 border-amber-100">
        <div class="flex justify-between items-center">
            <label class="text-xs font-bold text-amber-800">Hang Seng enJoy：已綁定 yuu（計入商戶積分）</label>
            ${renderSettingsToggle({ id: "st-enjoy-points4x", checked: !!userProfile.settings.hangseng_enjoy_points4x_enabled, onchange: "toggleSetting('hangseng_enjoy_points4x_enabled')" })}
        </div>
    </div>`, "hangseng_enjoy");

    const prestigeEnabled = !!userProfile.settings.citi_prestige_bonus_enabled;
    const prestigeYears = Math.max(1, parseInt(userProfile.settings.citi_prestige_tenure_years, 10) || 1);
    const prestigeWealth = !!userProfile.settings.citi_prestige_wealth_client;
    const prestigePct = (typeof getCitiPrestigeBonusPercentForSettings === "function")
        ? getCitiPrestigeBonusPercentForSettings({
            citi_prestige_bonus_enabled: prestigeEnabled,
            citi_prestige_tenure_years: prestigeYears,
            citi_prestige_wealth_client: prestigeWealth
        })
        : 0;
    if (ownedSet.has("citi_prestige")) ensureBucket(preferenceBlocksByCard, "citi_prestige").push(`<div class="border p-3 rounded-xl bg-blue-50 border-blue-100">
        <div class="flex justify-between items-center mb-2">
            <label class="text-xs font-bold text-blue-700">Citi Prestige 年資額外積分</label>
            ${renderSettingsToggle({ id: "st-prestige-bonus", checked: prestigeEnabled, onchange: "toggleSetting('citi_prestige_bonus_enabled')" })}
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
                <label class="block text-blue-700 font-bold mb-1">於花旗年期（年）</label>
                <input id="st-prestige-years" type="number" min="1" class="w-full p-2 rounded bg-white border border-blue-100" value="${prestigeYears}" onchange="savePrestigeTenureYears()">
            </div>
            <div class="flex items-end">
                <div class="w-full flex justify-between items-center bg-white border border-blue-100 rounded p-2">
                    <span class="text-blue-700 font-bold">Citigold/私人客戶</span>
                    ${renderSettingsToggle({ id: "st-prestige-wealth", checked: prestigeWealth, onchange: "toggleSetting('citi_prestige_wealth_client')" })}
                </div>
            </div>
        </div>
        <div class="mt-2 text-[11px] text-blue-700">現時對應年資獎賞：<span class="font-bold">${prestigePct}%</span>（以有效簽賬計）</div>
    </div>`);

    const rhEnabled = userProfile.settings.red_hot_rewards_enabled !== false;
    const redHotCandidates = ownedCardsByModule("red_hot_variable");
    const redHotCardId = findFirstOwnedCard(redHotCandidates);
    const redHotSource = (typeof DATA !== "undefined" && DATA.modules && DATA.modules.red_hot_variable)
        ? DATA.modules.red_hot_variable
        : null;
    const redHotRefsHtml = renderReferenceActions({
        sourceUrl: redHotSource ? (redHotSource.source_url || "") : "",
        sourceTitle: redHotSource ? (redHotSource.source_title || "") : "",
        tncUrl: redHotSource ? (redHotSource.tnc_url || "") : "",
        promoUrl: redHotSource ? (redHotSource.promo_url || "") : "",
        registrationUrl: redHotSource ? (redHotSource.registration_url || "") : "",
        registrationStart: redHotSource ? (redHotSource.registration_start || "") : "",
        registrationEnd: redHotSource ? (redHotSource.registration_end || "") : "",
        registrationNote: redHotSource ? (redHotSource.registration_note || "") : "",
        implementationNote: "計算器做法：先把 5X 權重分配到 5 個最紅類別（總和必須為 5）；每 1X = +0.4%，所以該類別總回贈 = 基本 0.4% + (X × 0.4%)。例如 5X 類別合共 2.4%。Visa Signature 會再有額外 +1.2%，並按各卡進度卡顯示的上限計算。"
    }, {
        linkClass: "text-[10px] text-stone-600 hover:text-stone-800 underline underline-offset-2",
        implClass: "text-[10px] text-stone-600 hover:text-stone-800 underline underline-offset-2",
        showRegistration: true,
        showPromo: true,
        showTnc: true,
        showImplementation: true
    });
    if (redHotCardId) pushScopedSettingRow("red_hot_rewards_enabled", `<div class="border p-3 rounded-xl bg-gray-50">
        <div class="flex justify-between items-center mb-2">
            <label class="text-xs font-bold text-amber-700">已登記「最紅自主獎賞」</label>
            ${renderSettingsToggle({ id: "st-rh-enabled", checked: rhEnabled, onchange: "toggleSetting('red_hot_rewards_enabled')" })}
        </div>
        ${redHotRefsHtml}
        <div id="rh-allocator-container" class="${rhEnabled ? '' : 'hidden'} space-y-2 transition-all">
            <div class="text-[10px] text-gray-400 mb-2">分配 5X 獎賞錢 (總和: <span id="rh-total" class="text-blue-600">5</span>/5)</div>
            ${renderAllocatorRow("dining", "賞滋味 (Dining)", userProfile.settings.red_hot_allocation.dining)}
            ${renderAllocatorRow("world", "賞世界 (World)", userProfile.settings.red_hot_allocation.world)}
            ${renderAllocatorRow("enjoyment", "賞享受 (Enjoyment)", userProfile.settings.red_hot_allocation.enjoyment)}
            ${renderAllocatorRow("home", "賞家居 (Home)", userProfile.settings.red_hot_allocation.home)}
            ${renderAllocatorRow("style", "賞購物 (Style)", userProfile.settings.red_hot_allocation.style)}
        </div>
    </div>`, redHotCardId);

    const allCampaignDefs = getCampaignToggleDefinitions();
    const winterDef = allCampaignDefs.find((def) => def.settingKey === "winter_promo_enabled") || null;
    const winterScope = winterDef ? resolveOwnedOfferScope(winterDef.cards, ownedSet) : { type: "none" };
    const winterCardId = winterDef ? findFirstOwnedCard(winterDef.cards) : null;
    const ownedCampaignDefs = allCampaignDefs.filter((def) => {
        if (!def || def.settingKey === "winter_promo_enabled") return false;
        return Array.isArray(def.cards) && def.cards.some((cardId) => ownedSet.has(cardId));
    });
    const defsWithScope = ownedCampaignDefs.map((def) => ({
        ...def,
        _scope: resolveOwnedOfferScope(def.cards, ownedSet)
    }));
    const visibleCardScopedDefs = defsWithScope.filter((def) => {
        if (!def._scope || def._scope.type !== "card") return false;
        if (!focusedCardId) return true;
        return def._scope.cardId === focusedCardId;
    });
    const visibleBankSharedDefs = defsWithScope.filter((def) => {
        if (!def._scope || def._scope.type !== "bank_shared") return false;
        if (!focusedCardId) return true;
        if (def._scope.bankKey !== focusedBankKey) return false;
        return Array.isArray(def.cards) && def.cards.includes(focusedCardId);
    });
    const visibleCrossBankDefs = defsWithScope.filter((def) => def._scope && def._scope.type === "cross_bank_shared");
    const registrationRowsByCard = {};
    const sharedRegistrationRows = [];
    const bankSharedRows = [...bankSharedPreferenceRows];

    visibleCardScopedDefs.forEach((def) => {
        const targetCardId = (def._scope && def._scope.cardId) ? def._scope.cardId : findFirstOwnedCard(def.cards);
        const rowHtml = renderRegistrationRow(def);
        if (targetCardId) ensureBucket(registrationRowsByCard, targetCardId).push(rowHtml);
        else sharedRegistrationRows.push(rowHtml);
    });
    visibleCrossBankDefs.forEach((def) => {
        sharedRegistrationRows.push(renderRegistrationRow(def));
    });
    visibleBankSharedDefs.forEach((def) => {
        bankSharedRows.push(renderRegistrationRow(def));
    });
    const includeWinterForFocus = !!(winterDef && (
        winterScope.type === "bank_shared"
            ? (winterScope.bankKey === focusedBankKey && (!focusedCardId || (Array.isArray(winterDef.cards) && winterDef.cards.includes(focusedCardId))))
            : (winterCardId && (!focusedCardId || winterCardId === focusedCardId))
    ));

    if (includeWinterForFocus) {
        const winterInfoText = normalizeInfoText((winterDef && winterDef.description) ? winterDef.description : "", 90);
        const winterRefLinks = winterDef
            ? renderReferenceActions({
                sourceUrl: winterDef.sourceUrl,
                sourceTitle: winterDef.sourceTitle,
                tncUrl: winterDef.tncUrl,
                promoUrl: winterDef.promoUrl,
                registrationUrl: winterDef.registrationUrl,
                registrationStart: winterDef.registrationStart || "",
                registrationEnd: winterDef.registrationEnd || "",
                registrationNote: winterDef.registrationNote || "",
                implementationNote: winterDef.implementationNote
            }, {
                linkClass: "text-[10px] text-stone-600 hover:text-stone-800 underline underline-offset-2",
                implClass: "text-[10px] text-stone-600 hover:text-stone-800 underline underline-offset-2",
                showRegistration: true,
                showPromo: true,
                showTnc: true,
                showImplementation: true
            })
            : "";
        const winterMetaHtml = (winterInfoText || winterRefLinks)
            ? `<div class="mt-1 mb-2 flex flex-wrap items-center gap-2">
                ${winterInfoText ? `<span class="text-[10px] text-stone-600">${escapeHtml(winterInfoText)}</span>` : ""}
                ${winterRefLinks}
            </div>`
            : "";
        const winterHtml = `<div data-setting-key="winter_promo_enabled" class="border p-3 rounded-xl bg-stone-50 border-stone-200">
        <div class="flex justify-between items-center mb-2">
            <label class="text-xs font-bold text-stone-800">HSBC 最紅冬日賞（專屬客戶）</label>
            ${renderSettingsToggle({ id: "st-winter", checked: !!userProfile.settings.winter_promo_enabled, onchange: "toggleSetting('winter_promo_enabled')" })}
        </div>
        ${winterMetaHtml}
        <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
                <label class="block text-stone-700 font-bold mb-1">Tier 1 門檻</label>
                <input id="st-winter-tier1" type="number" min="0" class="w-full p-2 rounded bg-white border border-stone-200" value="${Number(userProfile.settings.winter_tier1_threshold) || 0}" onchange="saveWinterThresholds()">
            </div>
            <div>
                <label class="block text-stone-700 font-bold mb-1">Tier 2 門檻</label>
                <input id="st-winter-tier2" type="number" min="0" class="w-full p-2 rounded bg-white border border-stone-200" value="${Number(userProfile.settings.winter_tier2_threshold) || 0}" onchange="saveWinterThresholds()">
            </div>
        </div>
    </div>`;
        if (winterScope.type === "bank_shared") {
            bankSharedRows.unshift(winterHtml);
        } else if (winterCardId) {
            ensureBucket(registrationRowsByCard, winterCardId).unshift(winterHtml);
        } else {
            sharedRegistrationRows.unshift(winterHtml);
        }
    }

    const focusedCardRows = focusedCardId ? (registrationRowsByCard[focusedCardId] || []) : [];
    const directRegistrationRows = [...focusedCardRows, ...sharedRegistrationRows];
    const focusedPreferenceRows = focusedCardId ? (preferenceBlocksByCard[focusedCardId] || []) : [];
    const allPreferenceRows = [...focusedPreferenceRows, ...sharedPreferenceBlocks];

    if (allPreferenceRows.length > 0) {
        html += `<div class="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div class="text-xs font-bold text-gray-600 mb-2">偏好設定</div>
            <div class="space-y-2">${allPreferenceRows.join("")}</div>
        </div>`;
    }
    if (directRegistrationRows.length > 0) {
        html += `<div class="rounded-xl border border-amber-200 bg-amber-50/50 p-3 mt-3">
            <div class="text-xs font-bold text-amber-700 mb-2">推廣登記</div>
            <div class="space-y-2">${directRegistrationRows.join("")}</div>
        </div>`;
    }
    if (bankSharedRows.length > 0) {
        html += `<div class="rounded-xl border border-stone-200 bg-stone-50 p-3 mt-3">
            <div class="text-xs font-bold text-stone-700 mb-2">同銀行共用設定</div>
            <div class="space-y-2">${bankSharedRows.join("")}</div>
        </div>`;
    }

    html += `</div></div>`;

    list.innerHTML = html;
    const guruSelect = document.getElementById('st-guru');
    if (guruSelect) guruSelect.value = userProfile.settings.guru_level;
    const liveFreshSelect = document.getElementById('st-live-fresh');
    if (liveFreshSelect) liveFreshSelect.value = userProfile.settings.live_fresh_pref || "none";
    const wewaSelect = document.getElementById('st-wewa-selected');
    if (wewaSelect) wewaSelect.value = wewaSelected;
    const moxModeSelect = document.getElementById('st-mox-mode');
    if (moxModeSelect) moxModeSelect.value = moxMode;
    if (rhEnabled && document.getElementById('rh-total')) updateAllocationTotal();
}

function renderAllocatorRow(key, label, value) {
    const safeValue = Number(value) || 0;
    return `<div class="flex justify-between items-center bg-white p-2 rounded border"><span class="text-xs font-bold text-gray-700">${label}</span><div class="flex items-center gap-3"><button class="w-6 h-6 bg-gray-200 rounded text-gray-600 font-bold" onclick="changeAllocation('${key}', -1)">-</button><span class="text-sm font-mono w-4 text-center" id="alloc-${key}">${safeValue}</span><button class="w-6 h-6 bg-gray-200 rounded text-gray-600 font-bold" onclick="changeAllocation('${key}', 1)">+</button></div></div>`;
}
function changeAllocation(key, delta) {
    const current = userProfile.settings.red_hot_allocation[key];
    const total = Object.values(userProfile.settings.red_hot_allocation).reduce((a, b) => a + b, 0);
    if (delta > 0 && total >= 5) return;
    if (delta < 0 && current <= 0) return;
    userProfile.settings.red_hot_allocation[key] += delta;
    saveUserData();
    document.getElementById(`alloc-${key}`).innerText = userProfile.settings.red_hot_allocation[key];
    updateAllocationTotal();
}
function updateAllocationTotal() { const total = Object.values(userProfile.settings.red_hot_allocation).reduce((a, b) => a + b, 0); const el = document.getElementById('rh-total'); if (el) { el.innerText = total; if (total === 5) el.className = "text-green-600 font-bold"; else el.className = "text-red-500 font-bold"; } }// --- LEDGER ---
let ledgerFilters = { cardId: "", category: "", dateFrom: "", dateTo: "" };
let settingsBatchReviewMode = false;

window.setLedgerFilter = function (key, value) {
    ledgerFilters[key] = value || "";
    renderLedger(userProfile.transactions);
};

window.clearLedgerFilters = function () {
    ledgerFilters = { cardId: "", category: "", dateFrom: "", dateTo: "" };
    renderLedger(userProfile.transactions);
};

window.renderLedger = function (transactions) {
    const container = document.getElementById('ledger-container');
    if (!transactions || transactions.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-400 mt-20">
                <i class="fas fa-receipt text-5xl mb-4 text-gray-200"></i>
                <p>暫無簽賬記錄</p>
                <button onclick="switchTab('calculator')" class="mt-4 text-blue-500 text-sm font-bold">立即去記賬 ></button>
            </div>`;
        return;
    }

    const filtered = transactions.filter(tx => {
        if (ledgerFilters.cardId && tx.cardId !== ledgerFilters.cardId) return false;
        if (ledgerFilters.category && tx.category !== ledgerFilters.category) return false;
        if (ledgerFilters.dateFrom && (tx.txDate || "") < ledgerFilters.dateFrom) return false;
        if (ledgerFilters.dateTo && (tx.txDate || "") > ledgerFilters.dateTo) return false;
        return true;
    });

    const ownedCards = Array.isArray(userProfile.ownedCards) ? userProfile.ownedCards : [];
    const cardOptions = (typeof DATA !== "undefined" && Array.isArray(DATA.cards))
        ? DATA.cards.filter(c => c && ownedCards.includes(c.id)).map(c => `<option value="${escapeHtml(c.id)}" ${ledgerFilters.cardId === c.id ? "selected" : ""}>${escapeHtml(c.name || c.id)}</option>`).join("")
        : "";
    const catOptions = (typeof getCategoryList === "function")
        ? getCategoryList(ownedCards).map(c => `<option value="${escapeHtml(c.id)}" ${ledgerFilters.category === c.id ? "selected" : ""}>${escapeHtml(c.label)}</option>`).join("")
        : "";
    const hasFilters = ledgerFilters.cardId || ledgerFilters.category || ledgerFilters.dateFrom || ledgerFilters.dateTo;
    const clearBtn = hasFilters ? `<button onclick="clearLedgerFilters()" class="text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">清除篩選</button>` : "";

    let html = `<div class="bg-white rounded-xl border border-gray-200 p-3 mb-3 space-y-2">
        <div class="grid grid-cols-2 gap-2">
            <select onchange="setLedgerFilter('cardId', this.value)" class="text-xs p-1.5 border border-gray-200 rounded-lg bg-white">
                <option value="">全部卡片</option>${cardOptions}
            </select>
            <select onchange="setLedgerFilter('category', this.value)" class="text-xs p-1.5 border border-gray-200 rounded-lg bg-white">
                <option value="">全部類別</option>${catOptions}
            </select>
        </div>
        <div class="grid grid-cols-2 gap-2">
            <input type="date" value="${escapeHtml(ledgerFilters.dateFrom)}" onchange="setLedgerFilter('dateFrom', this.value)" class="text-xs p-1.5 border border-gray-200 rounded-lg" placeholder="開始日期">
            <input type="date" value="${escapeHtml(ledgerFilters.dateTo)}" onchange="setLedgerFilter('dateTo', this.value)" class="text-xs p-1.5 border border-gray-200 rounded-lg" placeholder="結束日期">
        </div>
        ${clearBtn}
    </div>`;

    const showCount = filtered.length;
    const totalCount = transactions.length;
    const countLabel = hasFilters ? `顯示 ${showCount} / 共 ${totalCount}` : `${totalCount}`;

    html += `<div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-gray-800">最近記錄 (${countLabel})</h3>
        <button onclick="handleClearHistory()" class="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">清除所有</button>
    </div>
    <div class="space-y-3">`;

    filtered.forEach(tx => {
        // Prefer transaction date (txDate) over record timestamp (date).
        let dateStr = "";
        if (tx.txDate) {
            dateStr = String(tx.txDate);
        } else {
            const date = new Date(tx.date);
            dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        }
        // Try to get nice card name if possible, else use ID
        let cardName = tx.cardId;
        if (typeof DATA !== 'undefined' && Array.isArray(DATA.cards)) {
            const c = DATA.cards.find(x => x.id === tx.cardId);
            if (c) cardName = c.name;
        }

        const amountNum = Number(tx.amount) || 0;
        const rawRebateText = String(tx.rebateText || "").trim();
        const safeRebateText = (rawRebateText && /\d/.test(rawRebateText)) ? rawRebateText : "$0";
        const rebateText = escapeHtml(safeRebateText);
        const safeDateStr = escapeHtml(dateStr);
        const safeCardName = escapeHtml(cardName);

        html += `
            <div class="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">${safeDateStr}</span>
                        <span class="text-xs text-gray-500 truncate max-w-[120px]">${safeCardName}</span>
                    </div>
                     <div class="text-sm font-bold text-gray-800">
                        ${(() => {
                const def = (typeof DATA !== 'undefined' && DATA.categories) ? DATA.categories[tx.category] : null;
                const label = def ? def.label.split(' (')[0] : (tx.desc || tx.category);
                return escapeHtml(label);
            })()}
                    </div>
                </div>
                <div class="text-right flex items-center gap-2">
                    <div>
                        <div class="text-base font-bold">$${escapeHtml(amountNum.toLocaleString())}</div>
                        <div class="text-xs text-green-600 font-medium">+${rebateText}</div>
                    </div>
                    <button onclick="handleDeleteTx(${tx.id})" class="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded border border-gray-200" aria-label="刪除此筆交易">刪除</button>
                </div>
            </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

window.handleClearHistory = function () {
    if (confirm("確定要清除所有記帳記錄嗎？此操作無法復原。")) {
        userProfile.transactions = [];
        if (typeof clearUsageAndStats === 'function') {
            clearUsageAndStats();
        }
        saveUserData();
        refreshUI();
        renderLedger([]);
        if (typeof showToast === "function") showToast("已清除所有記帳記錄。", "info");
    }
}

// ───────── Merchant Search ─────────

let _merchantSearchIndex = null;
let _merchantFuse = null;

function normalizeMerchantQuery(text) {
    return String(text || "").trim().toLowerCase();
}

function merchantMatchesQuery(merchant, normalizedQuery) {
    if (!merchant || !normalizedQuery) return false;
    const candidates = [merchant.name || "", ...(Array.isArray(merchant.aliases) ? merchant.aliases : [])];
    return candidates.some((value) => normalizeMerchantQuery(value) === normalizedQuery);
}

function inferMerchantIdFromQuery(query) {
    const q = normalizeMerchantQuery(query);
    if (!q || q.length < 3) return null;
    const merchants = (typeof DATA !== "undefined" && DATA.merchants) ? DATA.merchants : {};
    let matchedId = null;
    for (const [id, merchant] of Object.entries(merchants)) {
        const candidates = [id, merchant.name || "", ...(Array.isArray(merchant.aliases) ? merchant.aliases : [])];
        const exact = candidates.some((value) => normalizeMerchantQuery(value) === q);
        if (!exact) continue;
        if (matchedId && matchedId !== id) return null; // ambiguous exact match
        matchedId = id;
    }
    return matchedId;
}

window.inferMerchantIdFromSearchInput = function () {
    if (window.__selectedMerchantId) return String(window.__selectedMerchantId);
    const searchInput = document.getElementById('merchant-search');
    return inferMerchantIdFromQuery(searchInput ? searchInput.value : "");
};

window.getEffectiveMerchantId = function () {
    if (window.__selectedMerchantId) return String(window.__selectedMerchantId);
    return window.inferMerchantIdFromSearchInput ? (window.inferMerchantIdFromSearchInput() || null) : null;
};

function buildMerchantSearchIndex() {
    const merchants = (typeof DATA !== "undefined" && DATA.merchants) ? DATA.merchants : {};
    _merchantSearchIndex = Object.entries(merchants).map(([id, m]) => ({
        id,
        name: m.name || id,
        searchText: [m.name || "", ...(m.aliases || [])].join(' ').toLowerCase(),
        defaultCategory: m.defaultCategory || "general"
    }));

    // Build Fuse.js index for fuzzy matching (graceful fallback if CDN fails)
    if (typeof Fuse !== "undefined") {
        _merchantFuse = new Fuse(_merchantSearchIndex, {
            keys: [
                { name: 'name', weight: 2 },
                { name: 'searchText', weight: 1 }
            ],
            threshold: 0.4,
            ignoreLocation: true,
            minMatchCharLength: 1,
            shouldSort: true
        });
    }
}

window.onMerchantSearch = function (query) {
    if (!_merchantSearchIndex) buildMerchantSearchIndex();
    const dropdown = document.getElementById('merchant-dropdown');
    if (!dropdown) return;
    const merchants = (typeof DATA !== "undefined" && DATA.merchants) ? DATA.merchants : {};
    const q = normalizeMerchantQuery(query);

    if (window.__selectedMerchantId) {
        const selected = merchants[window.__selectedMerchantId];
        if (!merchantMatchesQuery(selected, q)) {
            window.__selectedMerchantId = null;
            const clearBtn = document.getElementById('merchant-clear');
            if (clearBtn) clearBtn.classList.add('hidden');
        }
    }

    if (q.length < 1) {
        dropdown.classList.add('hidden');
        if (typeof runCalc === "function") runCalc();
        return;
    }

    let matches;
    if (_merchantFuse) {
        matches = _merchantFuse.search(q, { limit: 15 }).map(r => r.item);
    } else {
        matches = _merchantSearchIndex
            .filter(m => m.searchText.includes(q))
            .slice(0, 15);
    }

    if (matches.length === 0) {
        dropdown.innerHTML = '<div class="p-2 text-xs text-gray-400">找不到商戶</div>';
        dropdown.classList.remove('hidden');
        if (typeof runCalc === "function") runCalc();
        return;
    }

    const cats = (typeof DATA !== "undefined" && DATA.categories) ? DATA.categories : {};
    dropdown.innerHTML = matches.map(m => {
        const catDef = cats[m.defaultCategory];
        const catLabel = catDef ? catDef.label : m.defaultCategory;
        return `<div class="p-2 cursor-pointer hover:bg-[#f7f7f5] text-sm border-b border-[#e9e9e7] last:border-0"
                     onclick="selectMerchant('${m.id}')">
            <span class="font-medium">${escapeHtml(m.name)}</span>
            <span class="text-[10px] text-gray-400 ml-1">${escapeHtml(catLabel)}</span>
        </div>`;
    }).join('');
    dropdown.classList.remove('hidden');
    if (typeof runCalc === "function") runCalc();
};

window.selectMerchant = function (merchantId) {
    const merchants = (typeof DATA !== "undefined" && DATA.merchants) ? DATA.merchants : {};
    const merchant = merchants[merchantId];
    if (!merchant) return;

    const isOnlineLikeCategory = (categoryId) => {
        const id = String(categoryId || "").trim();
        if (!id) return false;
        const alwaysOnline = new Set([
            "club_shopping",
            "streaming",
            "ott_streaming",
            "saas_subscription",
            "live_fresh_travel_designated",
            "live_fresh_fashion_designated"
        ]);
        if (alwaysOnline.has(id)) return true;
        if (id === "online" || id.startsWith("online_") || id.includes("_online")) return true;

        const cats = (typeof DATA !== "undefined" && DATA.categories) ? DATA.categories : {};
        let cursor = id;
        const seen = new Set();
        while (cursor && !seen.has(cursor)) {
            if (cursor === "online") return true;
            seen.add(cursor);
            const def = cats[cursor];
            cursor = (def && def.parent) ? String(def.parent) : "";
        }
        return false;
    };

    const searchInput = document.getElementById('merchant-search');
    if (searchInput) searchInput.value = merchant.name || merchantId;

    const dropdown = document.getElementById('merchant-dropdown');
    if (dropdown) dropdown.classList.add('hidden');

    const clearBtn = document.getElementById('merchant-clear');
    if (clearBtn) clearBtn.classList.remove('hidden');

    window.__selectedMerchantId = merchantId;

    const categoryHints = [
        merchant.defaultCategory,
        ...Object.values(merchant.byCardId || {}),
        ...Object.values(merchant.byPrefix || {})
    ].filter(Boolean);
    const shouldAutoOnline = categoryHints.some(isOnlineLikeCategory);
    const onlineToggle = document.getElementById('tx-online');
    if (shouldAutoOnline && onlineToggle) onlineToggle.checked = true;

    // Auto-set category dropdown to merchant's default category
    const catSelect = document.getElementById('category');
    let categoryChanged = false;
    if (catSelect && merchant.defaultCategory) {
        const match = Array.from(catSelect.options).find(o => o.value === merchant.defaultCategory);
        if (match) {
            catSelect.value = merchant.defaultCategory;
            categoryChanged = true;
        } else if (shouldAutoOnline && catSelect.querySelector('option[value="general"]')) {
            catSelect.value = "general";
            categoryChanged = true;
        }
    }
    if (categoryChanged && typeof toggleCategoryHelp === "function") toggleCategoryHelp();

    if (typeof runCalc === "function") runCalc();
};

// Clear merchant UI state. If skipCalc=true, does not re-trigger runCalc
// (useful when called from category onchange which already calls runCalc).
function clearMerchantState(skipCalc) {
    window.__selectedMerchantId = null;
    const searchInput = document.getElementById('merchant-search');
    if (searchInput) searchInput.value = '';

    const clearBtn = document.getElementById('merchant-clear');
    if (clearBtn) clearBtn.classList.add('hidden');

    const dropdown = document.getElementById('merchant-dropdown');
    if (dropdown) dropdown.classList.add('hidden');

    const infoEl = document.getElementById('merchant-info');
    if (infoEl) infoEl.classList.add('hidden');

    if (!skipCalc && typeof runCalc === "function") runCalc();
}

window.clearMerchant = function () {
    clearMerchantState(false);
};

// Called from category dropdown onchange — clears merchant without re-triggering calc
window.onCategoryChange = function () {
    const categoryEl = document.getElementById('category');
    const onlineToggle = document.getElementById('tx-online');
    if (categoryEl && categoryEl.value === 'online') {
        if (categoryEl.querySelector('option[value="general"]')) {
            categoryEl.value = 'general';
        }
        if (onlineToggle) onlineToggle.checked = true;
    }

    if (window.__selectedMerchantId) clearMerchantState(true);
    if (typeof toggleCategoryHelp === "function") toggleCategoryHelp();
    if (typeof runCalc === "function") runCalc();
};

// Close merchant dropdown when clicking outside
document.addEventListener('click', function (e) {
    const dropdown = document.getElementById('merchant-dropdown');
    const searchInput = document.getElementById('merchant-search');
    if (dropdown && searchInput && !searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});
