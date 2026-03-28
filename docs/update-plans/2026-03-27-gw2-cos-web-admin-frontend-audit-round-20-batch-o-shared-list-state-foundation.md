# GW2 COS Web Admin Frontend Audit - Round 20

Date: 2026-03-27
Scope: `gw2_cos_web_admin`
Batch: `O - shared list state foundation`

## Goal

Stop repeating the same admin list-state markup page by page and extract the smallest shared foundation that preserves current behavior:

- inline page-level request error alert
- filter-aware table search + empty-state config

This batch intentionally did not try to abstract every multi-state page. It only created the smallest reusable base and migrated the simplest repeated consumers first.

## Root Cause

After the previous rounds, the same pattern was being copied across multiple pages:

- `Alert + Retry` block above `ProTable`
- `searchText / resetText / labelWidth`
- `locale.emptyText` switching based on `hasSearch` / `hasFilters`

That duplication had already spread across:

- `Audit`
- `UserList`
- `Translations`
- `DataResourcesRecommended`
- `WvwGuilds`

At that point the problem was no longer just UX inconsistency. It had become maintenance drift risk: any wording or behavior change would have to be edited by hand in many files.

## Changes

### 1. Added shared page-level request error component

File:
- `src/components/listPageState.tsx`

New shared primitive:
- `PageRequestErrorAlert`

What it does:
- renders a standardized inline admin error alert
- keeps the existing “Retry” action pattern
- renders nothing when there is no error message

Key lines:
- component definition: `src/components/listPageState.tsx:11`

### 2. Added shared filter-aware table-state helper

File:
- `src/components/tableState.ts`

New helper:
- `getFilterAwareTableProps`

What it does:
- standardizes table search config
- standardizes “filtered no-match” vs “no data yet” empty-state switching
- keeps per-page wording configurable while removing repeated object literals

Key lines:
- helper definition: `src/components/tableState.ts:9`

### 3. Migrated the first repeated consumers

Files:
- `src/pages/Audit/index.tsx`
- `src/pages/UserList/index.tsx`
- `src/pages/Translations/index.tsx`
- `src/pages/DataResourcesRecommended/index.tsx`
- `src/pages/WvwGuilds/index.tsx`

What changed:
- replaced local inline alert markup with `PageRequestErrorAlert`
- replaced repeated `search + locale.emptyText` objects with `getFilterAwareTableProps(...)`
- preserved all existing request behavior and page-specific copy

Key lines:
- `Audit`: `src/pages/Audit/index.tsx:45`, `src/pages/Audit/index.tsx:91`
- `UserList`: `src/pages/UserList/index.tsx:52`, `src/pages/UserList/index.tsx:156`
- `Translations`: `src/pages/Translations/index.tsx:58`, `src/pages/Translations/index.tsx:150`
- `DataResourcesRecommended`: `src/pages/DataResourcesRecommended/index.tsx:56`, `src/pages/DataResourcesRecommended/index.tsx:137`
- `WvwGuilds`: `src/pages/WvwGuilds/index.tsx:39`, `src/pages/WvwGuilds/index.tsx:136`

## Why This Change

This is the smallest version of a shared admin pattern that still has real value:

- no new dependencies
- no route or API changes
- no request-flow changes
- no behavior change to retry semantics
- no forced abstraction on the more complex multi-alert pages

The work only removes duplicated presentation/state-config code where the pattern was already obviously stable.

## Implementation Note

During validation, the first version put both the component and the table helper in the same `.tsx` file. That tripped the existing `react-refresh/only-export-components` lint rule. The final version splits them into:

- `src/components/listPageState.tsx`
- `src/components/tableState.ts`

This keeps Fast Refresh constraints intact without changing runtime behavior.

## Validation

Executed in `gw2_cos_web_admin` with `pnpm`:

- `pnpm.cmd validate`
  - `pnpm.cmd lint` passed
  - `pnpm.cmd build` passed

Current notable build output:
- `dist/assets/index-BgB7GlWz.js` `473.48 kB`
- `dist/assets/request-B-BzHIFU.js` `352.35 kB`
- `dist/assets/pro-form-runtime-Y_UFEYQ6.js` `271.68 kB`
- `dist/assets/tableState-BAMzlZRE.js` `0.57 kB`

Regression check:
- no `>500 kB` chunk warning regression
- no Rollup warning regression

## Residual Risks

1. The shared pattern currently covers only the simplest list pages.
   Multi-source pages such as `DataGw2Api`, `DataResourcesDirectory`, `Slang`, and `DataMarketWatch` still have page-local request-state code.

2. The admin app still has duplicated global toast + inline alert behavior. This batch did not attempt to centralize or suppress one of those channels.

3. `gw2_cos_web_admin` still has no `test` script, so validation remains `lint + typecheck/build` oriented.

## Suggested Next Step

Extend the same shared foundation to the next tier of pages with multiple alert channels, starting with:

- `src/pages/RbacAdminUsers/index.tsx`
- `src/pages/DataResourcesDirectory/index.tsx`
- `src/pages/Slang/index.tsx`

That would keep the abstraction narrow while removing the next highest block of repeated admin request-state markup.
