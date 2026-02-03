# Phase 5 Handoff (GPT-5.2 Medium)

This worktree is checked out on branch `codex/phase5-refactor`.

## Goal
Reduce confusion between `modules` vs `promotions` by introducing a clearer separation:
- **Reward rules**: affect per-transaction rebate calculation.
- **Trackers**: decide which usage keys to increment for campaign/counter progress.
- **Campaigns**: purely UI/dashboard aggregation of counters (no rebate math).
- **Counters/Periods**: period/bucket logic already exists (Phase 4) and should be consumed consistently.

## Current Baseline (Already In main)
- Data bootstrap: `js/data_index.js` builds `DATA`.
- Validation: `js/validate.js` (non-strict by default; strict available via `DATA.debug.strictPeriods=true`).
- Period helpers: `js/periods.js` with `getBucketKey()` and `legacyMonthToBucketKey()`.
- Reset-by-key buckets: `js/app.js` uses `_counter_periods.byKey` and `DATA.countersRegistry`.
- Golden tests: `tools/run_golden_cases.js` + `tools/golden_cases.json` (includes `period_cases`).

## Work Items (Implement In This Branch)
1. Introduce a new data file `js/data_trackers.js` (or similar) for tracker-only definitions.
   - Move all `type: "mission_tracker"` modules out of `js/data_modules.js`.
   - Preserve behavior: `missionTags` and any usage increments must remain the same.

2. Introduce a `js/data_campaigns.js` to replace `js/data_promotions.js` semantics:
   - Campaigns should reference usage keys/caps and display metadata only.
   - Campaigns must not re-encode rebate math (no rates in campaigns).
   - Keep existing UI working by mapping campaigns into the current render path (temporary adapter is OK).

3. Add a small engine layer (minimal, not full rewrite yet):
   - Create `js/engine_trackers.js` with a function like:
     - `evaluateTrackers(cardId, ctx, userProfile, DATA) -> { missionTags, effects }`
   - Hook it into `core.js` where mission trackers were previously processed.

4. Counters/Periods cleanup (scalable, low-risk):
   - Ensure keys that are actually monthly/quarterly/promo are annotated in data.
   - Keep non-reset keys as period `none` and do not warn in non-strict validation.

## Acceptance Criteria
- `node tools/run_golden_cases.js` passes.
- UI dashboard still shows promo/campaign cards correctly.
- No duplicate sources of truth: campaign display does not contain rebate rules.
- No regression in mission tracking / pending unlock behavior.

## Commands
Run tests:
```bash
node tools/run_golden_cases.js
```

Optional: strict period warnings:
Set `DATA.debug.strictPeriods = true` in `js/data_index.js` and refresh; or adjust temporarily for debugging.

