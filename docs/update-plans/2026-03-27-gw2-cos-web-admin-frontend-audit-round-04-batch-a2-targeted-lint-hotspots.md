# GW2 COS Web Admin Frontend Audit - Round 04

Date: 2026-03-27
Scope: `Batch A2 / Targeted Lint Hotspots`
Status: Completed

## Goal

Continue reducing the repo-wide admin frontend lint backlog by clearing the smallest, highest-confidence hotspot files first.

## Files Touched

1. `src/pages/Audit/index.tsx`
2. `src/pages/ContentPvp/index.tsx`
3. `src/pages/ContentRaids/index.tsx`
4. `src/pages/UserList/index.tsx`
5. `src/pages/WvwGuildEdit/index.tsx`

## What Changed

### Small Page Rebuilds

The following smaller pages were rebuilt into typed, lint-clean equivalents while preserving behavior:

1. `Audit`
2. `ContentPvp`
3. `ContentRaids`
4. `UserList`

Common cleanup pattern:

1. removed `any` from table request params and response handling
2. replaced empty `catch {}` blocks with explicit error reporting where needed
3. normalized local modal/detail state typing
4. kept route structure and request endpoints unchanged

### Wvw Guild Edit

`WvwGuildEdit` was not fully rewritten. It received targeted structural fixes only:

1. replaced broad `any` aliases with explicit document/form helper types
2. converted the initial load effect into an async loader pattern
3. removed the synchronous `setLoading(true)` effect path flagged by React hooks linting
4. narrowed operation-card mapping types in both initial-value shaping and payload creation

This keeps the page behavior stable while reducing risk in a historically messy file.

## Validation

### Targeted Validation

The following targeted files now pass lint and typecheck together:

1. `Audit`
2. `ContentPvp`
3. `ContentRaids`
4. `UserList`
5. `WvwGuildEdit`

### `pnpm lint`

Still fails repo-wide, but improved again:

1. previous state: `45` errors
2. current state: `29` errors

Remaining errors are now concentrated in:

1. `Dashboard`
2. `DataFractalDailies`
3. `DataLegendaryBlueprints`
4. `DataMarketWatch`
5. `DataMistlockInstabilities`
6. `DataMistlockRotations`
7. `DataResourcesRecommended`
8. `Login`
9. `RbacAdminUsers`
10. `Translations`
11. `WvwGuilds`

The remaining debt is now almost entirely `no-explicit-any`.

### `pnpm build`

Passes.

Bundle observation:

1. `dist/assets/index-ByD5CsJ1.js` `2314.41 kB`

The large main chunk remains unresolved and should be handled after the lint/type cleanup phase is further reduced.

## Decision

This batch confirms the right strategy: keep removing the smaller hotspot pages first, because the repo is now shedding lint debt in concentrated chunks without destabilizing the build.

## Recommended Next Step

### Batch A3: Data Page Typing Sweep

Prioritize the next files in this order:

1. `src/pages/Dashboard/index.tsx`
2. `src/pages/Login/index.tsx`
3. `src/pages/RbacAdminUsers/index.tsx`
4. `src/pages/Translations/index.tsx`
5. `src/pages/WvwGuilds/index.tsx`

Reason:

1. they are smaller than the larger data-maintenance pages
2. they continue the same `no-explicit-any` cleanup pattern
3. they should reduce the global lint count quickly before entering the heavier data pages

## Risks

1. `Audit`, `ContentPvp`, `ContentRaids`, and `UserList` now use normalized English copy in several admin labels because the previous source strings were already encoding-corrupted.
2. `WvwGuildEdit` still contains encoding-damaged copy in untouched parts of the file; this batch focused on type and effect stability only.

## Outcome

The admin frontend lint backlog has dropped from `45` to `29` without breaking the build. The project is still in a controlled cleanup phase, and the remaining work is now concentrated in a smaller set of mostly type-only files.
