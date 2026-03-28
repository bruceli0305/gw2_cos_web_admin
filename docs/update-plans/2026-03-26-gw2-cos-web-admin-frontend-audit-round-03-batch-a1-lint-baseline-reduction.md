# GW2 COS Web Admin Frontend Audit - Round 03

Date: 2026-03-26
Scope: `Batch A1 / Lint Baseline Reduction`
Status: Completed

## Goal

Start the first real admin-frontend cleanup pass after tooling repair, focusing on high-leverage, low-risk lint issues in shared layers and maintained entry pages.

## Files Touched

1. `src/services/request.ts`
2. `src/layouts/BasicLayout.tsx`
3. `src/pages/DataGw2Api/index.tsx`
4. `src/pages/DataResourcesDirectory/index.tsx`
5. `src/pages/RbacRoles/index.tsx`
6. `src/pages/Slang/index.tsx`

## What Changed

### Shared Request Layer

`request.ts` was hardened so it no longer relies on raw `any` in its internal parsing and error handling path.

Changes:

1. added typed envelope parsing
2. added `getErrorMessage`
3. kept a compatibility default for legacy callers that still omit response generics

This preserves current repository behavior while allowing page-by-page type tightening.

### Layout Layer

`BasicLayout.tsx` now:

1. uses `useCallback` for permission checks
2. fixes the stale `useMemo` dependency pattern
3. removes the remaining local `any` from `menuItemRender`

That clears the React Compiler memoization warning on the layout shell.

### Page-Level Cleanup

`DataGw2Api` was rebuilt to a stable, typed version because the previous source had heavy text-encoding damage and scattered `any` usage.

`DataResourcesDirectory`, `RbacRoles`, and `Slang` received smaller structural fixes:

1. converted initialization effects to async loader patterns
2. removed local `any` from request parameter handling
3. reduced catch-path typing issues

## Validation

### `pnpm build`

Passes.

Bundle observation:

1. `dist/assets/index-ZZ0pjjiM.js` `2314.12 kB`

The large main chunk remains a real optimization target.

### `pnpm lint`

Still fails, but the baseline improved substantially:

1. previous state: `69` problems (`66` errors, `3` warnings)
2. current state: `45` errors, `0` warnings

Net effect:

1. removed all current warnings
2. reduced total findings by `24`

Remaining lint debt is now concentrated in:

1. `no-explicit-any` across older page modules
2. one remaining `react-hooks/set-state-in-effect` case in `WvwGuildEdit`
3. two `no-empty` blocks in `UserList`

## Decision

`gw2_cos_web_admin` is now in an active cleanup phase, not just a repaired-tooling phase.

The next best move is to continue reducing the page-level lint backlog before switching to bundle splitting or visual polish.

## Recommended Next Step

### Batch A2: Remaining Lint Hotspots

Prioritize:

1. `src/pages/WvwGuildEdit/index.tsx`
2. `src/pages/UserList/index.tsx`
3. `src/pages/Audit/index.tsx`
4. `src/pages/ContentPvp/index.tsx`
5. `src/pages/ContentRaids/index.tsx`

Reason:

1. they are small enough to close quickly
2. they continue the same high-confidence cleanup pattern
3. they further reduce the repo-wide `any` concentration before larger data pages

## Risks

1. `DataGw2Api` now uses English UI strings in the admin page because the previous source text was already encoding-corrupted; behavior was preserved, but copy was normalized rather than kept byte-for-byte.
2. The compatibility default in `request.ts` is intentional debt. It keeps the repo buildable while older pages are still migrated to explicit response generics.

## Outcome

The admin frontend is no longer just "ready to optimize". It has now completed its first real cleanup batch, with build still green and lint debt materially reduced.
