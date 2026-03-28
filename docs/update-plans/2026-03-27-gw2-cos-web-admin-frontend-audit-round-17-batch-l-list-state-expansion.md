# GW2 COS Web Admin Frontend Audit - Round 17

Date: 2026-03-27
Scope: `gw2_cos_web_admin`
Batch: `L - list state expansion`

## Goal

Continue the page-level request-state cleanup started in Round 16 and extend it to adjacent list-heavy admin pages without changing APIs, table structure, or page routing.

## Root Cause

Two adjacent pages still had the same state-clarity gap:

1. `Translations` only surfaced failures through the global request toast and used the default generic table empty state, so operators could not tell the difference between:
   - request failure
   - empty cache
   - filtered no-match

2. `DataGw2Api` had a stronger version of the same problem:
   - type loading failure was effectively treated as “no types”
   - sync-state loading failure was effectively treated as “no sync history”
   - entity-list failure was only visible through the global toast

That behavior violates the current admin cleanup goal and risks fake-correct empty screens.

## Changes

### 1. `Translations` list-state clarity

File:
- `src/pages/Translations/index.tsx`

Changes:
- Added inline page-level error alert above the table.
- Added contextual search actions and empty-state copy.
- Tracked whether a search keyword is active.
- Preserved request failure as a real failure by rethrowing after storing the page-level error message.

Key lines:
- inline alert: `src/pages/Translations/index.tsx:143`
- custom search controls: `src/pages/Translations/index.tsx:162`
- contextual empty state: `src/pages/Translations/index.tsx:168`
- request failure handling: `src/pages/Translations/index.tsx:172`

### 2. `DataGw2Api` state separation

File:
- `src/pages/DataGw2Api/index.tsx`

Changes:
- Split page errors into three explicit channels:
  - entity type load failure
  - sync-status load failure
  - entity table load failure
- Replaced the old “catch and return empty array” pattern with explicit page-level error state.
- Added retry actions for metadata and sync-status loading.
- Added contextual search/empty-state copy for the cached entity list.
- Kept existing sync flows, but stopped treating “status refresh failed after sync” as “sync itself failed”.

Key lines:
- type/sync/table error state: `src/pages/DataGw2Api/index.tsx:70`
- pure fetch helpers and stateful refresh helpers: `src/pages/DataGw2Api/index.tsx:81`
- initial type load handling: `src/pages/DataGw2Api/index.tsx:109`
- initial sync-status load handling: `src/pages/DataGw2Api/index.tsx:132`
- sync button refresh isolation: `src/pages/DataGw2Api/index.tsx:239`
- inline alerts: `src/pages/DataGw2Api/index.tsx:254`
- contextual table search and empty state: `src/pages/DataGw2Api/index.tsx:319`
- entity list request failure handling: `src/pages/DataGw2Api/index.tsx:329`

## Why This Change

This stays within the current admin cleanup strategy:

- minimal change
- no new dependencies
- no API contract change
- no route change
- no table schema change

The fix is scoped to the real problem: page-level state semantics were unclear, and in `DataGw2Api` some failures were being collapsed into fake-empty states.

## Validation

Executed in `gw2_cos_web_admin` with `pnpm`:

- `pnpm.cmd validate`
  - `pnpm.cmd lint` passed
  - `pnpm.cmd build` passed

Current notable build output:
- `dist/assets/index-4A1z9y2F.js` `473.48 kB`
- `dist/assets/request-DHf0gaMG.js` `352.35 kB`
- `dist/assets/pro-form-runtime-CKfk0eVW.js` `271.68 kB`

Regression check:
- no `>500 kB` chunk warning regression
- no Rollup warning regression

## Residual Risks

1. Errors are still surfaced in two channels on these pages:
   - global request toast
   - inline page alert

   This is intentional for operator clarity, but it is still duplicated behavior until the admin app adopts a shared page-level request-state pattern.

2. `gw2_cos_web_admin` still has no `test` script, so verification remains `lint + typecheck/build` oriented rather than interaction-test oriented.

3. `DataResourcesDirectory` and other data maintenance pages still have older empty/error-state behavior and should be normalized in later batches.

## Suggested Next Step

Continue the same pattern on the remaining list-heavy maintenance pages, starting with:

- `src/pages/DataResourcesDirectory/index.tsx`
- `src/pages/DataResourcesRecommended/index.tsx`
- `src/pages/RbacAdminUsers/index.tsx`
