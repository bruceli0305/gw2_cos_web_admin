# GW2 COS Web Admin Frontend Audit - Round 21

Date: 2026-03-27
Scope: `gw2_cos_web_admin`
Batch: `P - shared list state expansion`

## Goal

Extend the shared list-state foundation from Round 20 into the next tier of more complex admin pages without over-abstracting their page-local logic.

Target pages:

- `src/pages/RbacAdminUsers/index.tsx`
- `src/pages/DataResourcesDirectory/index.tsx`
- `src/pages/Slang/index.tsx`

## Root Cause

Round 20 covered the simplest repeated list pages. The next three pages were still partially stuck in the old pattern:

1. `RbacAdminUsers`
   - still had duplicated inline `Alert + Retry` markup for both role-loading failure and table-loading failure

2. `DataResourcesDirectory`
   - still duplicated the same inline alert block twice
   - still had page-local repeated filter-aware `search + locale.emptyText` config

3. `Slang`
   - still duplicated the inline request error alerts for shared group failure and term-table failure
   - still kept its term table on repeated page-local filter-aware search/empty-state config

The root issue was no longer missing UX semantics. It was that the new shared foundation had not yet been pushed into the first set of multi-state pages.

## Changes

### 1. `RbacAdminUsers`

File:
- `src/pages/RbacAdminUsers/index.tsx`

Changes:
- replaced the two duplicated inline alert blocks with `PageRequestErrorAlert`
- preserved page-local role-fetch and table-fetch behavior exactly as-is

Key lines:
- shared alert import: `src/pages/RbacAdminUsers/index.tsx:13`
- role error alert usage: `src/pages/RbacAdminUsers/index.tsx:190`
- table error alert usage: `src/pages/RbacAdminUsers/index.tsx:196`

### 2. `DataResourcesDirectory`

File:
- `src/pages/DataResourcesDirectory/index.tsx`

Changes:
- replaced overview/table inline alerts with `PageRequestErrorAlert`
- replaced repeated filter-aware table `search + emptyText` object with `getFilterAwareTableProps`
- preserved page-local overview fetch, safe post-mutation refresh behavior, and table request semantics

Key lines:
- shared imports: `src/pages/DataResourcesDirectory/index.tsx:13`
- shared table-state config: `src/pages/DataResourcesDirectory/index.tsx:73`
- overview error alert usage: `src/pages/DataResourcesDirectory/index.tsx:204`
- table error alert usage: `src/pages/DataResourcesDirectory/index.tsx:210`
- table wiring with shared state: `src/pages/DataResourcesDirectory/index.tsx:216`

### 3. `Slang`

File:
- `src/pages/Slang/index.tsx`

Changes:
- replaced group-load and term-table inline alerts with `PageRequestErrorAlert`
- replaced term-table filter-aware `search + emptyText` object with `getFilterAwareTableProps`
- kept group-table request logic and mutation follow-up refresh flow page-local

Key lines:
- shared imports: `src/pages/Slang/index.tsx:14`
- shared term-table config: `src/pages/Slang/index.tsx:54`
- group error alert usage: `src/pages/Slang/index.tsx:252`
- term error alert usage: `src/pages/Slang/index.tsx:258`
- term table wiring with shared state: `src/pages/Slang/index.tsx:272`

## Why This Change

This stays within the project constraints:

- minimal changes
- no new dependencies
- no route or API changes
- no request-flow changes
- no broad refactor of page-local state machines

The abstraction line was kept intentionally narrow:

- shared only what had already proven stable
- left multi-source fetch orchestration in each page
- avoided introducing a generic “smart list controller” abstraction

## Validation

Executed in `gw2_cos_web_admin` with `pnpm`:

- `pnpm.cmd validate`
  - `pnpm.cmd lint` passed
  - `pnpm.cmd build` passed

Current notable build output:
- `dist/assets/index-CRmcASkd.js` `473.48 kB`
- `dist/assets/request-BNJGyuIw.js` `352.35 kB`
- `dist/assets/pro-form-runtime-By4OBIng.js` `271.68 kB`
- `dist/assets/listPageState-BbmH4yls.js` `0.37 kB`
- `dist/assets/tableState-CkmDg9Gq.js` `0.20 kB`

Regression check:
- no `>500 kB` chunk warning regression
- no Rollup warning regression

## Residual Risks

1. The app still has dual error surfacing:
   - global request toast
   - inline page alert

   This batch deliberately preserved that behavior.

2. More complex pages such as `DataGw2Api` and `DataMarketWatch` still keep page-local multi-alert logic and are only partially covered by the shared foundation.

3. `gw2_cos_web_admin` still has no `test` script, so verification remains `lint + typecheck/build` rather than interaction-test coverage.

## Suggested Next Step

At this point the shared list-state foundation is established enough to choose between two directions:

1. Continue expanding the same shared pattern into:
   - `src/pages/DataGw2Api/index.tsx`
   - `src/pages/DataMarketWatch/index.tsx`

2. Stop expanding breadth-first and instead standardize one more small shared primitive for “safe post-mutation refresh” so pages like `Slang` and `DataResourcesDirectory` stop repeating `await refresh().catch(() => undefined)`.
