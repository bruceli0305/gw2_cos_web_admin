# Round 16 / Batch K

## Goal

Improve list-state clarity on two high-frequency admin list pages first:

- [Audit/index.tsx](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/src/pages/Audit/index.tsx)
- [UserList/index.tsx](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/src/pages/UserList/index.tsx)

The target was not table refactoring. The target was clearer distinction between:

- request failure
- empty dataset
- filtered search with no matches

## What I Inspected First

1. Reviewed both pages and their `ProTable` request handlers.
2. Confirmed both pages already relied on shared request/toast behavior from [request.ts](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/src/services/request.ts).
3. Confirmed both pages had the same UI gap:
   - no stable inline error context
   - default table empty state did not explain whether there was no data or only no matches

## Root Cause

The current list experience depended too heavily on global toast feedback.

That created two UX problems:

1. **Request failure was easy to lose**
   - the user only saw a transient toast
   - the page itself did not explain why the table was empty or unavailable

2. **Empty states were semantically flat**
   - “empty system” and “filtered to zero results” both collapsed into the same generic empty table state

For admin data pages, that ambiguity is low quality.

## Final Changes Kept

### 1. Audit page

Updated [Audit/index.tsx](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/src/pages/Audit/index.tsx):

- added local `errorMessage`
- added local `hasFilters`
- kept request failure behavior explicit by:
  - setting inline page error state
  - rethrowing the request error instead of swallowing it
- added retry action through `actionRef.current?.reload()`
- added explicit filter button copy:
  - `Apply filters`
  - `Clear filters`
- split empty table copy into:
  - no logs yet
  - no logs match current filters

### 2. User list page

Updated [UserList/index.tsx](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/src/pages/UserList/index.tsx):

- added local `errorMessage`
- added local `hasSearch`
- kept request failure explicit by:
  - setting inline page error state
  - rethrowing the request error instead of returning fake empty data
- added retry action through `actionRef.current?.reload()`
- normalized search button copy:
  - `Search users`
  - `Clear filters`
- split empty table copy into:
  - no frontend users yet
  - no users match current search

## Why This Fix Stays Within Project Rules

I did **not** return fallback empty arrays on request failure.

Both pages still propagate real request errors. The change only adds better page-local explanation and a retry path.

That keeps the behavior aligned with the “no fake correctness / no silent fallback” rule in the workspace instructions.

## Validation

Executed with `pnpm`:

- `pnpm.cmd validate`

This passed and includes:

- `pnpm.cmd lint`
- `pnpm.cmd build`

## Current Build Result

Top chunks after this change:

- `index-C20S8AIE.js` `473.48 kB`
- `request-DffAMUsa.js` `352.35 kB`
- `pro-form-runtime-Dz037uJL.js` `271.68 kB`
- `index-BgyL8SWw.js` `231.93 kB`
- `index-Bh2dqdHP.js` `229.43 kB`
- `ant-design-icons-BPuBUfYU.js` `144.32 kB`

Important outcome:

- validation stayed green
- the previous no-warning packaging state held
- no `>500 kB` chunk-size warning regressed

## Risks / Notes

- Request failures now surface in two channels:
  - existing shared toast from [request.ts](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/src/services/request.ts)
  - new inline page alert

This is intentional for admin clarity, but it does mean duplicate failure surfacing until/unless the project later introduces a more centralized page-level request-state pattern.

- `gw2_cos_web_admin` still has no `test` script, so this round remains validated through `lint + build` via `validate`.
