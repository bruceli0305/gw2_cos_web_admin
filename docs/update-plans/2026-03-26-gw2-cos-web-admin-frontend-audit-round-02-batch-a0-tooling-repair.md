# GW2 COS Web Admin Frontend Audit - Round 02

Date: 2026-03-26
Scope: `Batch A0 / Tooling Repair`
Status: Completed

## Goal

Repair the local `pnpm` install for `gw2_cos_web_admin` so the project has a trustworthy `lint/build` baseline before any frontend optimization work starts.

## Root Cause

The admin package was not blocked by application code first. It was blocked by stale Windows junctions in `node_modules` pointing at an old workspace path:

1. `D:\project\AI\react\gw2_cos_web_admin\...`

Because of that:

1. `pnpm lint` could not resolve `eslint`
2. `pnpm build` could not resolve `typescript`

## Repair

The dependency graph was rebuilt in place with:

1. `pnpm install --force`

After the rebuild, the root `node_modules` junctions now point back into the current workspace:

1. `D:\project\AI\CollegeOfSynergetics\gw2_cos_web_admin\node_modules\.pnpm\...`

## Validation

### `pnpm lint`

No longer fails on missing binaries. It now runs and reports real repository issues:

1. `69` total findings
2. `66` errors
3. `3` warnings

Main categories:

1. pervasive `@typescript-eslint/no-explicit-any`
2. `react-hooks/set-state-in-effect`
3. `react-hooks/exhaustive-deps`
4. `react-hooks/preserve-manual-memoization`
5. `no-empty`

This is the correct post-repair state: tooling works, and code-quality debt is now visible.

### `pnpm build`

Build now passes successfully.

Observed bundle result:

1. `dist/assets/index-BHoEb0s6.js` `2313.33 kB`

That triggers a large-chunk warning and confirms bundle size is a real optimization target for the admin frontend.

## Decision

`gw2_cos_web_admin` is now ready to enter actual optimization work.

The entry blocker is resolved. The next phase should not be "fix install again". It should be a real frontend cleanup pass driven by the now-working validation loop.

## Recommended Next Step

### Batch A1: Baseline Cleanup

Start with the highest-leverage repo-level issues:

1. remove or narrow unnecessary `any`
2. fix `set-state-in-effect` violations
3. fix stale hook dependency and memoization warnings
4. keep `pnpm lint` and `pnpm build` green as the gating loop

### Batch A2: Bundle and UX Audit

After lint debt is reduced:

1. inspect route/layout structure for code splitting
2. inspect shared layout and Ant Design usage for frontend quality issues
3. target the `2.3 MB` main chunk

## What This Batch Changed

1. No runtime code changed.
2. No source files changed.
3. The local `pnpm` dependency tree was rebuilt.
4. The admin project now has a working build path and a real lint signal.

## Outcome

`gw2_cos_web_admin` has crossed from "tooling broken" to "optimization-ready". The immediate next work should be code-quality cleanup, not environment repair.
