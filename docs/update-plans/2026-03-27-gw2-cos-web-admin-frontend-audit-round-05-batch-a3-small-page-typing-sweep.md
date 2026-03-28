# GW2 COS Web Admin Frontend Audit - Round 05

Date: 2026-03-27
Scope: `Batch A3 / Small Page Typing Sweep`
Status: Completed

## Goal

Clear the remaining smaller admin pages with concentrated `no-explicit-any` debt before moving into the heavier data-maintenance screens.

## Files Touched

1. `src/pages/Dashboard/index.tsx`
2. `src/pages/Login/index.tsx`
3. `src/pages/RbacAdminUsers/index.tsx`
4. `src/pages/Translations/index.tsx`
5. `src/pages/WvwGuilds/index.tsx`

## What Changed

### Small Page Rebuilds

All five target pages were rewritten into typed, lint-clean versions while preserving routing, API endpoints, and primary user flows.

Common cleanup pattern:

1. removed local `any` from request params and response handling
2. added explicit form value and response types
3. preserved current request endpoints and action semantics
4. normalized several labels to stable English text because the previous source contained encoding-corrupted copy

### Specific Outcomes

#### `Dashboard`

1. removed the remaining `system.memory: any`
2. kept the same dashboard metric structure

#### `Login`

1. typed login form values and response payload
2. routed errors through shared `getErrorMessage`

#### `RbacAdminUsers`

1. typed roles/admin-user list responses
2. typed create/edit/reset-password form payloads
3. removed the last local `any` in role loading and table requests

#### `Translations`

1. typed list/edit/create request shapes
2. removed the remaining table-request `any`

#### `WvwGuilds`

1. typed filter params and list response
2. kept preview/edit/delete behavior unchanged

## Validation

### Targeted Validation

The five Batch A3 files now pass:

1. `eslint`
2. `tsc -b`

### `pnpm lint`

Still fails repo-wide, but improved again:

1. previous state: `29` errors
2. current state: `21` errors

Remaining lint debt now exists only in five data-maintenance pages:

1. `src/pages/DataFractalDailies/index.tsx`
2. `src/pages/DataLegendaryBlueprints/index.tsx`
3. `src/pages/DataMarketWatch/index.tsx`
4. `src/pages/DataMistlockInstabilities/index.tsx`
5. `src/pages/DataMistlockRotations/index.tsx`

That remaining debt is entirely `@typescript-eslint/no-explicit-any`.

### `pnpm build`

Passes.

Bundle observation:

1. `dist/assets/index-DCYIKhOg.js` `2314.38 kB`

The large main chunk remains unchanged in practice and is still a later optimization target.

## Decision

The repo is no longer broadly noisy. The admin lint backlog is now concentrated into the larger data pages only, which makes the next cleanup phase much more predictable.

## Recommended Next Step

### Batch A4: Data Maintenance Page Typing Sweep

Prioritize in this order:

1. `src/pages/DataFractalDailies/index.tsx`
2. `src/pages/DataResourcesRecommended/index.tsx`
3. `src/pages/DataMistlockInstabilities/index.tsx`
4. `src/pages/DataMistlockRotations/index.tsx`
5. `src/pages/DataLegendaryBlueprints/index.tsx`
6. `src/pages/DataMarketWatch/index.tsx`

Reason:

1. these are the only remaining lint blockers
2. they all share the same `any`-cleanup pattern
3. clearing them should produce the first full `pnpm lint` pass for the admin frontend

## Risks

1. Several rewritten pages now use normalized English labels instead of preserving encoding-damaged source strings.
2. The request layer still intentionally supports legacy untyped callers by default; that compatibility remains useful until the larger data pages finish migration.

## Outcome

The admin frontend lint backlog dropped again, from `29` to `21`, and the remaining debt is now isolated to a small cluster of larger data pages.
