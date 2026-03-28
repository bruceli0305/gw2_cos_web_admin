# GW2 COS Web Admin Frontend Audit - Round 18

Date: 2026-03-27
Scope: `gw2_cos_web_admin`
Batch: `M - list state normalization`

## Goal

Extend the page-level request-state clarity pattern from earlier rounds to the next adjacent admin maintenance pages without changing APIs, routes, or table structure.

## Root Cause

Three maintenance pages still had unresolved state-semantics gaps:

1. `DataResourcesRecommended`
   - request failures only surfaced through the global request toast
   - default table empty state did not distinguish “no data” from “search returned nothing”

2. `RbacAdminUsers`
   - role options were loaded in an effect and failures were silently swallowed
   - the user list itself still only had toast-level failure feedback

3. `DataResourcesDirectory`
   - overview loading failure was swallowed during initial mount
   - overview refresh after create/edit/delete/import could incorrectly make a successful mutation look failed
   - table empty state did not distinguish “no data” from filtered no-match

These are all variants of the same admin-UX defect: real failures were being flattened into generic empty states or hidden behind transient toast messages.

## Changes

### 1. `DataResourcesRecommended`

File:
- `src/pages/DataResourcesRecommended/index.tsx`

Changes:
- added inline page-level error alert
- added explicit search action labels
- added contextual empty-state copy
- preserved request failure by rethrowing after storing page-level error state

Key lines:
- inline alert: `src/pages/DataResourcesRecommended/index.tsx:130`
- search controls: `src/pages/DataResourcesRecommended/index.tsx:149`
- contextual empty state: `src/pages/DataResourcesRecommended/index.tsx:155`
- request failure handling: `src/pages/DataResourcesRecommended/index.tsx:159`

### 2. `RbacAdminUsers`

File:
- `src/pages/RbacAdminUsers/index.tsx`

Changes:
- split “role option loading failure” from “admin user list failure”
- replaced the silent role-load swallow with explicit page-level error state
- added retry action for role option loading
- added explicit empty-state copy for the admin user list
- preserved request failure on the table path by rethrowing after storing page-level error state

Key lines:
- role/table error state: `src/pages/RbacAdminUsers/index.tsx:57`
- role fetch/load helpers: `src/pages/RbacAdminUsers/index.tsx:68`
- initial role load handling: `src/pages/RbacAdminUsers/index.tsx:80`
- role/table alerts: `src/pages/RbacAdminUsers/index.tsx:189`
- empty state copy: `src/pages/RbacAdminUsers/index.tsx:223`
- table request failure handling: `src/pages/RbacAdminUsers/index.tsx:257`

### 3. `DataResourcesDirectory`

File:
- `src/pages/DataResourcesDirectory/index.tsx`

Changes:
- separated overview loading failure from table loading failure
- replaced swallowed overview-load failure with explicit page-level error state
- added retry action for overview loading
- added filter-aware empty-state copy for the table
- stopped letting overview refresh failures after successful mutations masquerade as mutation failures

Key lines:
- overview/table error state: `src/pages/DataResourcesDirectory/index.tsx:62`
- overview fetch/reload helpers: `src/pages/DataResourcesDirectory/index.tsx:72`
- initial overview load handling: `src/pages/DataResourcesDirectory/index.tsx:84`
- mutation follow-up refresh isolation: `src/pages/DataResourcesDirectory/index.tsx:160`
- alerts: `src/pages/DataResourcesDirectory/index.tsx:196`
- search/empty-state handling: `src/pages/DataResourcesDirectory/index.tsx:231`
- table request failure handling: `src/pages/DataResourcesDirectory/index.tsx:241`

## Why This Change

The batch stays inside the current hard constraints:

- minimal changes
- no new dependencies
- no API contract changes
- no routing changes
- no schema or table-structure changes

The fixes only clarify existing request states and remove fake-empty outcomes caused by swallowed failures.

## Validation

Executed in `gw2_cos_web_admin` with `pnpm`:

- `pnpm.cmd validate`
  - `pnpm.cmd lint` passed
  - `pnpm.cmd build` passed

Current notable build output:
- `dist/assets/index-DL5fkE5A.js` `473.48 kB`
- `dist/assets/request-nxp_bOpv.js` `352.35 kB`
- `dist/assets/pro-form-runtime-83kOGMr2.js` `271.68 kB`

Regression check:
- no `>500 kB` chunk warning regression
- no Rollup warning regression

## Residual Risks

1. These pages still surface errors through both:
   - the global request toast
   - the new inline page alert

   That duplication is currently intentional, but it should eventually be standardized into a shared admin page-state pattern.

2. Several older data pages still contain mojibake/encoding-damaged Chinese copy; this batch deliberately avoided broad copy rewrites and focused only on request-state clarity.

3. `gw2_cos_web_admin` still has no `test` script, so validation remains `lint + typecheck/build` rather than interaction-test coverage.

## Suggested Next Step

Continue the same normalization pattern on the remaining list-heavy pages with mixed legacy copy, especially:

- `src/pages/DataMarketWatch/index.tsx`
- `src/pages/Slang/index.tsx`
- `src/pages/WvwGuilds/index.tsx`
