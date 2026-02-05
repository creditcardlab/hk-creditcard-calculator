// js/periods.js - Period and bucket helpers

function parseDateInput(dateInput) {
    if (!dateInput) return null;
    if (dateInput instanceof Date) return new Date(dateInput.getTime());
    if (typeof dateInput === "string") {
        const parts = dateInput.split("-").map(n => parseInt(n, 10));
        if (parts.length >= 3 && parts.every(n => Number.isFinite(n))) {
            const [y, m, d] = parts;
            return new Date(y, m - 1, d);
        }
    }
    return null;
}

function formatDateKey(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function normalizeStartDay(startDay) {
    const d = Number(startDay);
    if (!Number.isFinite(d)) return 1;
    return Math.min(28, Math.max(1, Math.floor(d)));
}

function addMonths(dateObj, deltaMonths) {
    const d = new Date(dateObj.getTime());
    const year = d.getFullYear();
    const month = d.getMonth();
    const target = new Date(year, month + deltaMonths, 1);
    const day = d.getDate();
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(day, lastDay));
    return target;
}

function getMonthBucketStart(dateObj, startDay) {
    const day = normalizeStartDay(startDay);
    const d = new Date(dateObj.getTime());
    const curDay = d.getDate();
    if (curDay < day) {
        d.setDate(1);
        const prev = addMonths(d, -1);
        prev.setDate(day);
        return prev;
    }
    d.setDate(day);
    return d;
}

function getQuarterBucketStart(dateObj, anchor) {
    const startDay = normalizeStartDay(anchor && anchor.startDay);
    const startMonth = Number(anchor && anchor.startMonth) || 1;
    const date = new Date(dateObj.getTime());
    let year = date.getFullYear();
    let month = date.getMonth() + 1;

    if (month < startMonth) {
        month += 12;
        year -= 1;
    }

    const offset = month - startMonth;
    const qIndex = Math.floor(offset / 3);
    let qStartMonth = startMonth + qIndex * 3;
    if (qStartMonth > 12) {
        qStartMonth -= 12;
        year += 1;
    }

    let bucketStart = new Date(year, qStartMonth - 1, startDay);
    if ((date.getMonth() + 1) === qStartMonth && date.getDate() < startDay) {
        bucketStart = addMonths(bucketStart, -3);
    }

    return bucketStart;
}

function normalizeStartMonth(startMonth, fallback) {
    const m = Number(startMonth);
    if (!Number.isFinite(m)) return fallback;
    return Math.min(12, Math.max(1, Math.floor(m)));
}

function getYearBucketStart(dateObj, anchor) {
    const startDay = normalizeStartDay(anchor && anchor.startDay);
    const startMonth = normalizeStartMonth(anchor && anchor.startMonth, 1);
    const date = new Date(dateObj.getTime());

    let bucketStart = new Date(date.getFullYear(), startMonth - 1, startDay);
    if ((date.getMonth() + 1) < startMonth || ((date.getMonth() + 1) === startMonth && date.getDate() < startDay)) {
        bucketStart = new Date(date.getFullYear() - 1, startMonth - 1, startDay);
    }
    return bucketStart;
}

function getBucketKey(dateInput, periodType, anchor, id) {
    const dateObj = parseDateInput(dateInput) || new Date();
    if (periodType === "month") {
        const start = getMonthBucketStart(dateObj, anchor && anchor.startDay);
        return formatDateKey(start);
    }
    if (periodType === "quarter") {
        const start = getQuarterBucketStart(dateObj, anchor || {});
        return formatDateKey(start);
    }
    if (periodType === "year") {
        const start = getYearBucketStart(dateObj, anchor || {});
        return formatDateKey(start);
    }
    if (periodType === "promo") {
        const startDate = anchor && anchor.startDate ? anchor.startDate : null;
        if (!startDate) return null;
        const endDate = anchor && anchor.endDate ? anchor.endDate : null;
        const keyBase = `promo:${id || "promo"}@${startDate}`;
        if (endDate) {
            // Compare by YYYY-MM-DD so endDate is inclusive regardless of time-of-day.
            const dateStr = formatDateKey(dateObj);
            if (dateStr > endDate) return `${keyBase}:ended`;
        }
        return keyBase;
    }
    return null;
}

function legacyMonthToBucketKey(legacyMonthKey, anchor) {
    if (!legacyMonthKey) return null;
    const parts = legacyMonthKey.split("-");
    if (parts.length < 2) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
    const startDay = normalizeStartDay(anchor && anchor.startDay);
    const dateObj = new Date(y, m - 1, startDay);
    return formatDateKey(dateObj);
}

function legacyQuarterToBucketKey(legacyQuarterKey, anchor) {
    if (!legacyQuarterKey) return null;
    const parts = legacyQuarterKey.split("-");
    if (parts.length < 2) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
    const startDay = normalizeStartDay(anchor && anchor.startDay);
    const dateObj = new Date(y, m - 1, startDay);
    return formatDateKey(dateObj);
}
