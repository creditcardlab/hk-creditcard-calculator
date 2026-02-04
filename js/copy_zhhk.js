// js/copy_zhhk.js - Centralized copy (Traditional Chinese, Hong Kong)
//
// This file is intentionally plain script (no bundler/ESM) and exposes `COPY_ZHHK` on `window`.

(function () {
    const COPY_ZHHK = {
        warning: {
            needRegister: "需登記以賺取回贈",
        },
        status: {
            locked: "未解鎖",
            capped: "已封頂",
            inProgress: "進行中",
            remainingPrefix: "尚餘",
            met: "已達標",
        },
        calc: {
            unsupportedMode: "不支援此模式",
        },
        progress: {
            missionThreshold: "任務門檻",
            rewardCap: "回贈上限",
        }
    };

    window.COPY_ZHHK = COPY_ZHHK;
})();

