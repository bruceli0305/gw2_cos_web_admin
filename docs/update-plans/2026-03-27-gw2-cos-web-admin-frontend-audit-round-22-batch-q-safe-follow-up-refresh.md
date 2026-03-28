# GW2 COS Web Admin Frontend Audit - Round 22

Date: 2026-03-27
Scope: `gw2_cos_web_admin`
Batch: `Q - safe follow-up refresh`

## Goal

Standardize the narrow “primary action already succeeded, follow-up refresh is best-effort only” pattern that had started repeating across several admin pages.

This batch intentionally does not touch user-triggered retry behavior. It only targets post-success reconciliation refreshes.

## Root Cause

After the previous batches, the same pattern was still duplicated in several places:

- `await reloadOverview().catch(() => undefined);`
- `await refreshGroups().catch(() => undefined);`
- `await refreshStates(lang).catch(() => undefined);`

Those calls were not accidental. They were already expressing a real product decision:

- primary action succeeded
- follow-up refresh is helpful, but not allowed to overturn the success result

The problem was that the rule stayed implicit and repetitive instead of being expressed as a named shared behavior.

## Changes

### 1. Added a shared safe follow-up helper

File:
- `src/services/followUp.ts`

New helper:
- `runSafeFollowUp`

Purpose:
- run a post-success reconciliation refresh
- swallow follow-up failure intentionally
- keep the main success path authoritative

Key lines:
- helper definition: `src/services/followUp.ts:1`

### 2. Migrated `DataResourcesDirectory`

File:
- `src/pages/DataResourcesDirectory/index.tsx`

Changes:
- replaced all post-success `reloadOverview().catch(() => undefined)` calls with `runSafeFollowUp(reloadOverview)`
- preserved retry-button behavior as-is

Key lines:
- helper import: `src/pages/DataResourcesDirectory/index.tsx:15`
- delete follow-up: `src/pages/DataResourcesDirectory/index.tsx:169`
- create follow-up: `src/pages/DataResourcesDirectory/index.tsx:270`
- edit follow-up: `src/pages/DataResourcesDirectory/index.tsx:337`
- import follow-up: `src/pages/DataResourcesDirectory/index.tsx:380`

### 3. Migrated `Slang`

File:
- `src/pages/Slang/index.tsx`

Changes:
- replaced all post-success `refreshGroups().catch(() => undefined)` calls with `runSafeFollowUp(refreshGroups)`
- kept retry-button behavior page-local

Key lines:
- helper import: `src/pages/Slang/index.tsx:16`
- delete follow-up: `src/pages/Slang/index.tsx:156`
- create follow-up: `src/pages/Slang/index.tsx:465`
- edit follow-up: `src/pages/Slang/index.tsx:506`

### 4. Migrated `DataGw2Api`

File:
- `src/pages/DataGw2Api/index.tsx`

Changes:
- replaced post-sync `refreshStates(...).catch(() => undefined)` with `runSafeFollowUp(() => refreshStates(...))`
- kept retry-button behavior unchanged, because those are direct user retries rather than post-success reconciliation

Key lines:
- helper import: `src/pages/DataGw2Api/index.tsx:12`
- current-type sync success/failure follow-up: `src/pages/DataGw2Api/index.tsx:240`, `src/pages/DataGw2Api/index.tsx:244`
- advanced sync follow-up: `src/pages/DataGw2Api/index.tsx:384`

## Why This Change

This keeps the abstraction line intentionally narrow:

- no new dependencies
- no API or route changes
- no behavior change to retry buttons
- no conversion of all async flows into generic wrappers

The helper only names a rule that already existed in code:

- the refresh is real
- the refresh is useful
- the refresh must not negate a successful primary action

## Validation

Executed in `gw2_cos_web_admin` with `pnpm`:

- `pnpm.cmd validate`
  - `pnpm.cmd lint` passed
  - `pnpm.cmd build` passed

Current notable build output:
- `dist/assets/index-DAGS96wt.js` `473.48 kB`
- `dist/assets/request-18t4zPfG.js` `352.35 kB`
- `dist/assets/pro-form-runtime-CzxhGknk.js` `271.68 kB`
- `dist/assets/followUp-CfLQSO_N.js` `0.06 kB`

Regression check:
- no `>500 kB` chunk warning regression
- no Rollup warning regression

## Residual Risks

1. Retry buttons still use page-local `.catch(() => undefined)` in a few places. This is intentional for now because those flows are user retries, not post-success reconciliation refreshes.

2. The app still preserves dual error surfacing:
   - global request toast
   - inline page alert

3. `gw2_cos_web_admin` still has no `test` script, so validation remains `lint + typecheck/build` oriented.

## Suggested Next Step

The next reasonable shared primitive is not another list-state helper. It is a very small retry wrapper for page-local retry actions, but only if we can keep its semantics distinct from `runSafeFollowUp`.

If we stay conservative, the safer alternative is to stop expanding shared helpers for now and move back to concrete page cleanup on:

- `src/pages/DataGw2Api/index.tsx`
- `src/pages/DataMarketWatch/index.tsx`
