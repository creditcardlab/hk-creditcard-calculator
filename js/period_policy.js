// js/period_policy.js - Compile campaign period_policy metadata (policy-first, backward-safe)

(function periodPolicyBootstrap() {
    const hasWindow = typeof window !== "undefined";
    const root = hasWindow ? window : global;

    function isPlainObject(value) {
        return !!value && typeof value === "object" && !Array.isArray(value);
    }

    function normalizeDate(value) {
        if (typeof value !== "string" || !value) return "";
        const parts = value.split("-").map((n) => parseInt(n, 10));
        if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return "";
        const [year, month, day] = parts;
        const dt = new Date(year, month - 1, day);
        if (dt.getFullYear() !== year || (dt.getMonth() + 1) !== month || dt.getDate() !== day) return "";
        const mm = String(month).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        return `${year}-${mm}-${dd}`;
    }

    function normalizePeriodSpec(spec, fallbackStartDate, fallbackEndDate) {
        if (!spec) return null;
        let out = null;
        if (typeof spec === "string") out = { type: spec };
        else if (isPlainObject(spec)) out = { ...spec };
        if (!out) return null;
        if (!out.type && typeof out.periodType === "string") out.type = out.periodType;
        if (!out.type) return null;

        if (out.type === "promo") {
            const start = normalizeDate(out.startDate || fallbackStartDate || "");
            const end = normalizeDate(out.endDate || fallbackEndDate || "");
            if (start) out.startDate = start;
            if (end) out.endDate = end;
        }
        return out;
    }

    function normalizeBadgeSpec(spec) {
        if (!spec) return null;
        if (typeof spec === "string") return { type: spec };
        if (!isPlainObject(spec)) return null;
        const out = { ...spec };
        if (!out.type && typeof out.kind === "string") out.type = out.kind;
        if (!out.type) return null;
        if (out.endDate) out.endDate = normalizeDate(out.endDate);
        if (out.date) out.date = normalizeDate(out.date);
        return out;
    }

    function normalizeRecurrence(spec) {
        if (!isPlainObject(spec)) return null;
        const freq = typeof spec.freq === "string" ? spec.freq.toLowerCase() : "";
        if (!freq) return null;
        const out = { freq };
        const interval = Number(spec.interval);
        if (Number.isFinite(interval) && interval > 0) out.interval = Math.floor(interval);
        if (Array.isArray(spec.byDay)) out.byDay = spec.byDay.filter((d) => typeof d === "string" && d);
        const until = normalizeDate(spec.until);
        if (until) out.until = until;
        return out;
    }

    function inferPeriodFromRecurrence(recurrence, startDate) {
        if (!recurrence || !recurrence.freq) return null;
        const freq = String(recurrence.freq).toLowerCase();
        if (freq === "monthly") {
            const day = startDate ? Number(startDate.split("-")[2]) : 1;
            return { type: "month", startDay: Number.isFinite(day) ? Math.max(1, Math.min(28, day)) : 1 };
        }
        if (freq === "yearly") {
            if (startDate) {
                const parts = startDate.split("-").map((n) => Number(n));
                const month = Number.isFinite(parts[1]) ? Math.max(1, Math.min(12, parts[1])) : 1;
                const day = Number.isFinite(parts[2]) ? Math.max(1, Math.min(28, parts[2])) : 1;
                return { type: "year", startMonth: month, startDay: day };
            }
            return { type: "year", startMonth: 1, startDay: 1 };
        }
        if (freq === "quarterly") {
            if (startDate) {
                const parts = startDate.split("-").map((n) => Number(n));
                const monthRaw = Number.isFinite(parts[1]) ? parts[1] : 1;
                const qStart = Math.floor((monthRaw - 1) / 3) * 3 + 1;
                const day = Number.isFinite(parts[2]) ? Math.max(1, Math.min(28, parts[2])) : 1;
                return { type: "quarter", startMonth: qStart, startDay: day };
            }
            return { type: "quarter", startMonth: 1, startDay: 1 };
        }
        return null;
    }

    function normalizeWindow(windowSpec, index) {
        if (!isPlainObject(windowSpec)) return null;

        const startDate = normalizeDate(
            windowSpec.startDate ||
            windowSpec.start ||
            windowSpec.startAt ||
            windowSpec.start_at ||
            windowSpec.valid_from
        );
        const endDate = normalizeDate(
            windowSpec.endDate ||
            windowSpec.end ||
            windowSpec.endAt ||
            windowSpec.end_at ||
            windowSpec.valid_to
        );

        const out = {
            id: windowSpec.id ? String(windowSpec.id) : `window_${index + 1}`,
            startDate: startDate || "",
            endDate: endDate || "",
            priority: Number.isFinite(Number(windowSpec.priority)) ? Math.floor(Number(windowSpec.priority)) : (index + 1)
        };

        const recurrence = normalizeRecurrence(windowSpec.recurrence);
        if (recurrence) {
            out.recurrence = recurrence;
            if (!out.endDate && recurrence.until) out.endDate = recurrence.until;
        }

        let period = normalizePeriodSpec(windowSpec.period, startDate, endDate);
        if (!period) {
            period = inferPeriodFromRecurrence(recurrence, out.startDate || startDate);
        }
        if (period) {
            out.period = period;
            if (period.type === "promo") {
                if (!out.startDate && period.startDate) out.startDate = period.startDate;
                if (!out.endDate && period.endDate) out.endDate = period.endDate;
            }
        }

        const badge = normalizeBadgeSpec(windowSpec.badge);
        if (badge) out.badge = badge;

        if (typeof windowSpec.audienceRule === "string" && windowSpec.audienceRule) out.audienceRule = windowSpec.audienceRule;
        else if (typeof windowSpec.audience_rule === "string" && windowSpec.audience_rule) out.audienceRule = windowSpec.audience_rule;

        if (isPlainObject(windowSpec.targets)) out.targets = { ...windowSpec.targets };

        return out;
    }

    function buildPolicyWindows(policy) {
        const windows = [];
        const rawWindows = Array.isArray(policy.windows) ? policy.windows : [];
        rawWindows.forEach((windowSpec, index) => {
            const normalized = normalizeWindow(windowSpec, index);
            if (normalized) windows.push(normalized);
        });

        if (windows.length > 0) return windows;

        const fallbackWindow = normalizeWindow(policy, 0);
        return fallbackWindow ? [fallbackWindow] : [];
    }

    function isWithinWindow(dateKey, windowSpec) {
        if (!windowSpec) return false;
        if (windowSpec.startDate && dateKey < windowSpec.startDate) return false;
        if (windowSpec.endDate && dateKey > windowSpec.endDate) return false;
        return true;
    }

    function pickActiveWindow(windows, dateKey) {
        if (!Array.isArray(windows) || windows.length === 0) return null;
        const active = windows.filter((windowSpec) => isWithinWindow(dateKey, windowSpec));
        if (active.length === 0) return null;
        active.sort((a, b) => {
            if (a.priority !== b.priority) return b.priority - a.priority;
            if (a.startDate !== b.startDate) return String(b.startDate).localeCompare(String(a.startDate));
            return String(b.id).localeCompare(String(a.id));
        });
        return active[0];
    }

    function pickReferenceWindow(windows) {
        if (!Array.isArray(windows) || windows.length === 0) return null;
        const copied = windows.slice();
        copied.sort((a, b) => {
            if (a.endDate !== b.endDate) return String(b.endDate).localeCompare(String(a.endDate));
            if (a.startDate !== b.startDate) return String(b.startDate).localeCompare(String(a.startDate));
            if (a.priority !== b.priority) return b.priority - a.priority;
            return String(b.id).localeCompare(String(a.id));
        });
        return copied[0];
    }

    function inferBadge(policy, activeWindow, refWindow, counterPeriod) {
        const explicit = (activeWindow && activeWindow.badge) || normalizeBadgeSpec(policy.badge) || (refWindow && refWindow.badge) || null;
        if (explicit) {
            const out = { ...explicit };
            if (out.type === "promo_end" && !out.endDate) {
                out.endDate = (activeWindow && activeWindow.endDate) || (refWindow && refWindow.endDate) || "";
            }
            return out;
        }

        const endDate = (activeWindow && activeWindow.endDate) || (refWindow && refWindow.endDate) || "";
        if (endDate) return { type: "promo_end", endDate };

        const p = counterPeriod || null;
        if (!p || !p.type) return null;
        if (p.type === "promo" && p.endDate) return { type: "promo_end", endDate: p.endDate, period: p };
        return { type: "period_end", period: p };
    }

    function normalizeMode(mode, windows) {
        if (typeof mode === "string" && mode) return mode;
        if (Array.isArray(windows) && windows.length > 1) return "composite";
        return "fixed";
    }

    function compileSinglePolicy(campaign, todayKey) {
        if (!campaign || !isPlainObject(campaign.period_policy)) return null;
        const policy = campaign.period_policy;
        const windows = buildPolicyWindows(policy);
        const activeWindow = pickActiveWindow(windows, todayKey);
        const refWindow = activeWindow || pickReferenceWindow(windows);
        const hasDateWindows = windows.some((w) => !!(w.startDate || w.endDate));
        const basePeriod = normalizePeriodSpec(policy.period, policy.startDate || policy.valid_from, policy.endDate || policy.valid_to);
        const activePeriod = activeWindow ? normalizePeriodSpec(activeWindow.period, activeWindow.startDate, activeWindow.endDate) : null;
        const counterPeriod = activePeriod || basePeriod || null;
        const recurrence = normalizeRecurrence(policy.recurrence);
        const badge = inferBadge(policy, activeWindow, refWindow, counterPeriod);

        return {
            mode: normalizeMode(policy.mode, windows),
            timezone: typeof policy.timezone === "string" && policy.timezone ? policy.timezone : "",
            windows,
            hasDateWindows,
            isActive: !hasDateWindows || !!activeWindow,
            activeWindowId: activeWindow ? activeWindow.id : "",
            activeWindow,
            counterPeriod,
            badge,
            recurrence,
            userAnchor: isPlainObject(policy.user_anchor) ? { ...policy.user_anchor } : (isPlainObject(policy.userAnchor) ? { ...policy.userAnchor } : null),
            targets: isPlainObject(policy.targets) ? { ...policy.targets } : null
        };
    }

    function compilePeriodPolicies(data) {
        const campaigns = data && Array.isArray(data.campaigns) ? data.campaigns : [];
        const today = new Date();
        const todayKey = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, "0"),
            String(today.getDate()).padStart(2, "0")
        ].join("-");
        const byCampaignId = {};
        const warnings = [];

        campaigns.forEach((campaign) => {
            if (!campaign || !campaign.id) return;
            const compiled = compileSinglePolicy(campaign, todayKey);
            if (!compiled) return;
            byCampaignId[campaign.id] = compiled;
            if (compiled.windows.length === 0) warnings.push(`[period_policy] campaign ${campaign.id} has period_policy but no valid windows`);
        });

        return { byCampaignId, warnings };
    }

    root.compilePeriodPolicies = compilePeriodPolicies;
})();
