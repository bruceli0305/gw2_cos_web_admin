# Round 13 / Batch H

## Goal

Polish the admin home surface with the smallest safe change set, focusing on the real UX issue in the current dashboard instead of doing broad shell restyling.

## What I Inspected First

1. Reviewed [BasicLayout.tsx](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/src/layouts/BasicLayout.tsx) and [Dashboard/index.tsx](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/src/pages/Dashboard/index.tsx).
2. Cross-checked the dashboard UI against the backend producer in [dashboard.ts](/D:/project/AI/CollegeOfSynergetics/gw2_cos_nodejs/src/routes/adminv1/dashboard.ts).
3. Verified the current admin information architecture in the shell:
   - `Content` only exposes `Raid`
   - `Data` exposes resource/legendary/fractal/market maintenance
4. Confirmed the highest-confidence issue was not the shell itself, but dashboard drift from the actual stats contract.

## Root Cause

The dashboard had two real problems:

1. **Contract drift**
   - the page type and card copy still assumed `content.pvp`
   - the backend no longer returns `pvp` at all
   - the page also ignored available stats like `admins.total` and `content.legendary`

2. **Failure state was disguised as real zero data**
   - the page rendered `0` via `|| 0` even when the request failed or data had never loaded
   - that made an unavailable dashboard look like a valid “all zero” dashboard

This was the wrong kind of fallback for an admin overview page.

## Final Changes Kept

Updated [Dashboard/index.tsx](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/src/pages/Dashboard/index.tsx) only.

### 1. Align the page with the real backend contract

- removed the stale `pvp` expectation from the local `StatsData`
- used actual backend fields:
  - `admins.total`
  - `content.directory`
  - `content.legendary`
  - `content.raid`
  - `system.memory`

### 2. Replace misleading zero fallbacks with explicit dashboard state

- added `errorMessage`
- added `lastUpdatedAt`
- added a `Refresh` action
- added a visible `Alert` + `Retry` path when stats cannot be loaded
- only show numeric values when real data exists; otherwise show `-`

This prevents backend/request failure from being rendered as fake “0” business metrics.

### 3. Tighten the information hierarchy

The top row now shows the four highest-signal admin metrics:

- frontend users
- admin accounts
- translation usage
- raid recruitment

The second row now matches the current admin scope:

- content inventory: resource directory + legendary blueprints + raid listings
- system status: uptime + heap/RSS memory usage

## Why I Did Not Change The Shell

[BasicLayout.tsx](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/src/layouts/BasicLayout.tsx) is still plain, but it was not the root problem in this pass. The dashboard had a higher-severity mismatch between UI semantics and real data, so I kept the change set narrow and left the shell untouched.

## Validation

Executed with `pnpm`:

- `pnpm.cmd validate`

This passed and includes:

- `pnpm.cmd lint`
- `pnpm.cmd build`

## Current Build Result

Top chunks after this change:

- `index-X9L6OeBk.js` `473.48 kB`
- `request-xVH-IA25.js` `352.35 kB`
- `pro-form-runtime-1bJEwvEp.js` `271.68 kB`
- `index-CftZBIZ9.js` `231.93 kB`
- `index-D8MtiRYy.js` `229.42 kB`
- `ant-design-icons-BPuBUfYU.js` `144.32 kB`

Important outcome:

- validation remained green
- the previous no-warning packaging state held
- no `>500 kB` chunk-size warning regressed

## Risks / Notes

- `request` chunk size increased somewhat because the new dashboard now imports more Ant Design UI elements (`Alert`, `Tag`, `Button`), but it still remains well below the previous threshold problem.
- The page now accurately distinguishes “no stats loaded” from real zero values, but there is still no historical trend or server-side timestamp in the API; `lastUpdatedAt` is client-side refresh time only.
- `gw2_cos_web_admin` still has no `test` script, so this round remains validated by `lint + build` through `validate`.
