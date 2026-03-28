# GW2 COS Web Admin Frontend Audit - Round 23

Date: 2026-03-27
Scope: `gw2_cos_web_admin`
Batch: `R - market watch copy and state polish`

## Goal

Do the smallest high-confidence cleanup on `DataMarketWatch` after the shared helper batches:

- remove the remaining encoded legacy copy
- align this page with the admin's current English shell language
- reuse the shared inline error/table-state primitives where they already fit
- improve the highest-frequency action affordance without changing API contracts

## Root Cause

`DataMarketWatch` had become the clearest outlier in the admin after the previous rounds.

The page still carried a full layer of mojibake/encoding-damaged legacy copy, which created two real problems:

1. primary admin actions were hard to parse even when the data itself was correct
2. the page still used one-off inline error blocks instead of the new shared request-state pattern already established elsewhere

This was not a backend or schema issue. The core data flow was already sound. The problem was that the operator-facing surface was still inconsistent and partially unreadable.

## Changes

### 1. Rebuilt `DataMarketWatch` copy into stable operator-facing language

File:
- `src/pages/DataMarketWatch/index.tsx`

Changes:
- replaced the damaged legacy strings in page title, subtitle, alerts, tabs, table columns, action buttons, modal titles, confirmations, and success messages
- kept the existing request paths, task flow, table structure, modal structure, and backend contract unchanged

Key lines:
- page title: `src/pages/DataMarketWatch/index.tsx:387`
- page explainer alert: `src/pages/DataMarketWatch/index.tsx:468`
- add-to-pool modal title: `src/pages/DataMarketWatch/index.tsx:562`
- low-frequency modal title: `src/pages/DataMarketWatch/index.tsx:608`

### 2. Moved page-level error alerts onto the shared admin pattern

File:
- `src/pages/DataMarketWatch/index.tsx`

Changes:
- replaced the page-local pool/task/low-frequency error alert markup with `PageRequestErrorAlert`
- reused `getFilterAwareTableProps` for the pool table so filter-aware empty state stays consistent with the other normalized list pages

Key lines:
- shared alert import: `src/pages/DataMarketWatch/index.tsx:13`
- shared pool table props: `src/pages/DataMarketWatch/index.tsx:378`
- pool error alert: `src/pages/DataMarketWatch/index.tsx:479`
- task history error alert: `src/pages/DataMarketWatch/index.tsx:486`
- low-frequency error alert: `src/pages/DataMarketWatch/index.tsx:670`

### 3. Added a loading guard to the highest-risk top-level action

File:
- `src/pages/DataMarketWatch/index.tsx`

Changes:
- introduced `snapshotRunLoading` for the top-level "Run Snapshot Now" action
- kept backend locking authoritative, but now the UI also prevents rapid duplicate clicks from the same page session

Key lines:
- loading state: `src/pages/DataMarketWatch/index.tsx:139`
- action button: `src/pages/DataMarketWatch/index.tsx:405`
- button label: `src/pages/DataMarketWatch/index.tsx:425`

### 4. Normalized success/failure summaries without fabricating missing data

File:
- `src/pages/DataMarketWatch/index.tsx`

Changes:
- added `formatRunSummary` for snapshot/history/meta-sync success messages
- preserved the optional nature of `status`, `successCount`, and `failCount`
- avoided inventing fake defaults just to keep the string shape stable

Key lines:
- summary formatter: `src/pages/DataMarketWatch/index.tsx:105`
- history sync success: `src/pages/DataMarketWatch/index.tsx:255`
- snapshot run success: `src/pages/DataMarketWatch/index.tsx:410`
- metadata sync success: `src/pages/DataMarketWatch/index.tsx:437`

## Why This Change

This batch stays inside the root-cause boundary:

- no new dependencies
- no route changes
- no API changes
- no schema or response-shape changes
- no task flow rewrite

The page was already functionally correct enough to operate. What was broken was the operator surface:

- damaged copy made the interface harder to trust
- repeated inline state blocks were drifting away from the admin baseline
- the highest-frequency manual action still had no local loading guard

Rewriting the single page file was the safest way to remove the damaged text cleanly without trying to patch mojibake fragments in place.

## Validation

Executed in `gw2_cos_web_admin` with `pnpm`:

- `pnpm.cmd validate`
  - `pnpm.cmd lint` passed
  - `pnpm.cmd build` passed

Current notable build output:
- `dist/assets/index-C2jpokwa.js` `473.48 kB`
- `dist/assets/request-C4fLFMLZ.js` `352.35 kB`
- `dist/assets/pro-form-runtime-DYofU29i.js` `271.68 kB`
- `dist/assets/listPageState-BwntgCSY.js` `0.37 kB`
- `dist/assets/tableState-CkmDg9Gq.js` `0.20 kB`

Regression check:
- no `>500 kB` chunk warning regression
- no Rollup warning regression

## Residual Risks

1. This round intentionally normalized the page to English, matching the current admin shell direction. If the admin later reintroduces a deliberate Chinese copy strategy, this page should follow the same system rather than drift again.

2. `DataMarketWatch` still uses both global request toasts and inline page alerts. That dual-channel error model remains unchanged in this batch.

3. `gw2_cos_web_admin` still has no `test` script, so validation remains `lint + build` oriented through `pnpm.cmd validate`.

## Suggested Next Step

The next highest-signal admin page to clean is still `src/pages/DataGw2Api/index.tsx`.

That page is no longer structurally noisy, but it still has room for a similar operator-surface pass:

- action/result phrasing
- sync status presentation density
- modal and retry affordance consistency
