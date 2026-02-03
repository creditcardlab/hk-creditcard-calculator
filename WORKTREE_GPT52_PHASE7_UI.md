# Phase 7 (Worktree): Progress UI Consistency + Data Accuracy Workflow

Worktree branch: `codex/ui-consistency`

Goal (user pain):
- All progress bars/cards look consistent: stripes vs not, lock icon, greys, tier separators, border colors.
- Make it easy to *audit data accuracy* (export + report + optional Notion visualization), but keep JS data as the single source of truth.

Non-goals:
- No Vite/ESM migration in this phase.
- No changes to the “database” (DATA schema) unless strictly needed for UI consistency (prefer UI mapping).

## Current Reality (What You’re Refactoring)
Progress UI is mostly rendered by:
- `js/ui.js`: `renderPromoSections()`, `renderPromoOverlay()`, `createProgressCard()`
- `css/style.css`: `progress-stripe` (only shared styling)

The model objects rendered are already standardized (no legacy section fallback):
- Section shape: `{ kind, label, valueText, progress, state, lockedReason, overlayModel, markers, meta }`
- States used: `active | locked | capped` (plus any future values)

## Deliverable A: One Canonical Progress Bar Component
### 1) Introduce a “single renderer”
In `js/ui.js`, implement **one** function responsible for the bar DOM:
- `renderProgressBar({ progress, state, ui, overlayModel, markers }) => string`

Where `ui` is resolved by a mapping function:
- `getSectionUi(sec, theme) => {`
  - `trackClass`
  - `fillClass`
  - `striped: boolean`
  - `showLock: boolean`
  - `lockClass`
  - `showTierSeparators: boolean`
  - `separatorPositions?: number[]` (0-100)
  - `separatorClass`
  - `subText?: string`
  - `subTextClass`
`}`

### 2) Define consistent visual rules (important)
Make these rules global (not per-card ad-hoc):
- Locked always:
  - Same gray palette everywhere (track/fill/text)
  - Always shows the same lock overlay (same icon, size, placement)
  - No stripes
- Active always:
  - Uses theme-aware fill (or fixed green/blue depending on `kind`, but consistent)
  - Optional stripes: decide by `kind` (not random), see below
- Capped always:
  - Same “capped” treatment (e.g., red fill + “Capped” subtext), no stripes

Recommended stripes rule (simple + consistent):
- Striped only when `state === 'active'` AND `kind` is one of:
  - `cap` (usage-to-cap bars)
  - `tier_cap` (tiered cap usage)
- Non-striped for:
  - `mission` (unlock state)
  - any section with `overlayModel` (avoid muddy layering)

### 3) Tier separators must be consistent
When `sec.kind === 'tier_cap'`:
- Always show separators if tier info exists
- Use one consistent separator style (thin line, low-opacity)
- Never special-case “some have / some don’t”

Implementation suggestion:
- If `sec.markers` is array-of-objects with `{ pos }`, use those `pos` as separators.
- Otherwise, if `sec.meta.tierBreaks` exists, use it.
- Else: show none (but be consistent).

### 4) Refactor `renderPromoSections()`
Change it to:
- Compute text/header (`label`, `valueText`)
- Compute `ui = getSectionUi(sec, theme)`
- Render `renderProgressBar(...)`
- Render subtext + markers in a consistent layout

Also ensure Travel Guru + “remaining cap cards” are not bypassing the same renderer.

## Deliverable B: CSS Tokens (Stop Random Tailwind Mixing)
In `css/style.css` add a small “design tokens” section:
- `.pc-track` baseline track styles
- `.pc-fill` baseline fill styles
- `.pc-lock` baseline lock overlay styles
- `.pc-sep` baseline separator styles
- Keep `.progress-stripe` but allow `renderProgressBar` to apply it deterministically.

Do not rewrite the whole UI; just make progress bars consistent.

## Deliverable C: Data Accuracy Checks (Report + Export)
Add two tools (minimal, no Notion required):

### 1) JSON export (stable, diff-friendly)
Add `tools/export_data.js`:
- Loads DATA via `js/data_index.js` (same method as golden runner)
- Emits `tools/data_export.json`
- Sorts object keys for stable diffs (cards/modules/trackers/campaigns registries)

Command:
- `node tools/export_data.js`

### 2) Audit report (human-readable)
Add `tools/report_data_quality.js`:
- Reads DATA via the same loader
- Outputs `reports/data_quality.md`
- Includes:
  - counts (cards/modules/trackers/campaigns/categories)
  - orphan IDs (unused modules/trackers/campaigns)
  - invalid references (unknown IDs)
  - duplicated keys that might collide in counters/period buckets

Command:
- `node tools/report_data_quality.js`

Note:
- Notion is for visualization only. Editing should happen in JS data, then regenerate export/report.

## Tests / Definition of Done
Must pass:
- `node tools/run_golden_cases.js`

Manual sanity (optional but recommended):
- Open `index.html` and spot-check: locked/active/capped bars + tier bars look identical across cards.

## Files You Will Touch
- `js/ui.js`
- `css/style.css`
- `tools/export_data.js` (new)
- `tools/report_data_quality.js` (new)
- `reports/data_quality.md` (generated; OK to commit if small and stable)

## Guardrails
- Don’t change DATA schema in this phase.
- Don’t add new UI variants unless you also define the global rule for it.
- Prefer deleting ad-hoc inline bar HTML once it’s covered by the unified renderer.

