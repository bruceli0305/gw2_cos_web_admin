# GW2 COS Web Admin Frontend Audit - Round 19

Date: 2026-03-27
Scope: `gw2_cos_web_admin`
Batch: `N - monitoring and dictionary state clarity`

## Goal

Continue the admin request-state normalization work on the next three list-heavy pages:

- `WvwGuilds`
- `Slang`
- `DataMarketWatch`

The scope stayed limited to page-level request semantics. No API contract, route, or data model changes were made.

## Root Cause

These pages still had the same structural admin-UX gap as earlier rounds:

1. `WvwGuilds`
   - request failures only surfaced through the global request toast
   - empty state did not distinguish “no entries yet” from filtered no-match

2. `Slang`
   - group loading failure was still swallowed during initial mount
   - term-table failure only showed as a transient toast
   - group refresh after successful mutations could make the mutation look failed if the follow-up refresh request broke

3. `DataMarketWatch`
   - pool/task table failures only surfaced through transient toasts
   - pool filters had no contextual empty state
   - low-frequency candidate loading had no persistent page/modal-level failure signal

The common defect was unchanged: real request failures were still being flattened into generic emptiness or disappearing after a toast.

## Changes

### 1. `WvwGuilds`

File:
- `src/pages/WvwGuilds/index.tsx`

Changes:
- added inline page-level error alert
- added filter-aware empty-state copy
- added explicit search action labels
- preserved request failure by rethrowing after storing page-level error state

Key lines:
- error state: `src/pages/WvwGuilds/index.tsx:35`
- inline alert: `src/pages/WvwGuilds/index.tsx:129`
- search controls: `src/pages/WvwGuilds/index.tsx:148`
- contextual empty state: `src/pages/WvwGuilds/index.tsx:154`
- request failure handling: `src/pages/WvwGuilds/index.tsx:158`

### 2. `Slang`

File:
- `src/pages/Slang/index.tsx`

Changes:
- split shared group-loading failure from term-table failure
- replaced initial silent group-load swallow with explicit page-level error state
- added retry action for group loading
- added filter-aware empty-state copy for term records
- added explicit empty state for group management
- isolated post-mutation group refresh so a successful create/edit/delete does not get misrepresented as failed when only the follow-up refresh breaks

Key lines:
- group/term error state: `src/pages/Slang/index.tsx:39`
- group fetch + refresh helpers: `src/pages/Slang/index.tsx:53`
- initial group load handling: `src/pages/Slang/index.tsx:66`
- group delete follow-up refresh isolation: `src/pages/Slang/index.tsx:147`
- page-level alerts: `src/pages/Slang/index.tsx:244`
- term table search + empty state: `src/pages/Slang/index.tsx:287`
- term request failure handling: `src/pages/Slang/index.tsx:302`
- group table empty state and request handling: `src/pages/Slang/index.tsx:450`
- create/edit follow-up refresh isolation: `src/pages/Slang/index.tsx:483`, `src/pages/Slang/index.tsx:524`

### 3. `DataMarketWatch`

File:
- `src/pages/DataMarketWatch/index.tsx`

Changes:
- added separate page-level failure states for:
  - market watch pool
  - task history
  - low-frequency candidate modal
- added filter-aware empty-state copy for the pool table
- added persistent empty-state copy for task history
- kept low-frequency loading behavior intact, but exposed failures in the modal instead of relying only on toasts

Key lines:
- page/modal error state: `src/pages/DataMarketWatch/index.tsx:114`
- low-frequency load handling: `src/pages/DataMarketWatch/index.tsx:119`
- pool/task alerts: `src/pages/DataMarketWatch/index.tsx:434`
- pool table search + empty state: `src/pages/DataMarketWatch/index.tsx:475`
- pool request failure handling: `src/pages/DataMarketWatch/index.tsx:485`
- task table empty state + request failure handling: `src/pages/DataMarketWatch/index.tsx:518`
- low-frequency modal alert: `src/pages/DataMarketWatch/index.tsx:642`

## Why This Change

The batch remains within the current project constraints:

- minimal changes
- high-confidence
- no new dependencies
- no API contract changes
- no routing changes
- no data-shape changes

The work only clarifies existing request state semantics and prevents real failures from masquerading as “just empty”.

## Validation

Executed in `gw2_cos_web_admin` with `pnpm`:

- `pnpm.cmd validate`
  - `pnpm.cmd lint` passed
  - `pnpm.cmd build` passed

Current notable build output:
- `dist/assets/index-BFGVFjnl.js` `473.48 kB`
- `dist/assets/request-DH_iDT6E.js` `352.35 kB`
- `dist/assets/pro-form-runtime-CkUM1Ol7.js` `271.68 kB`

Regression check:
- no `>500 kB` chunk warning regression
- no Rollup warning regression

## Residual Risks

1. These pages still surface errors in two channels:
   - global request toast
   - inline page/modal alert

   This is intentional for operator clarity but still duplicated until a shared admin page-state primitive exists.

2. `DataMarketWatch` and `Slang` still contain older mojibake/encoding-damaged Chinese copy. This batch intentionally avoided broad copy rewriting and only changed request-state behavior.

3. `gw2_cos_web_admin` still has no `test` script, so validation remains `lint + typecheck/build` rather than interaction-test coverage.

## Suggested Next Step

The remaining high-value cleanup path is to stop doing this page-by-page and extract a shared admin pattern for:

- inline request error alert
- filter-aware empty state
- safe post-mutation refresh handling

If the work should stay page-local for now, the next candidates are:

- `src/pages/Audit/index.tsx`
- `src/pages/UserList/index.tsx`
- `src/pages/Translations/index.tsx`

to evaluate whether the duplicated toast + inline alert behavior should be normalized into a shared helper.
