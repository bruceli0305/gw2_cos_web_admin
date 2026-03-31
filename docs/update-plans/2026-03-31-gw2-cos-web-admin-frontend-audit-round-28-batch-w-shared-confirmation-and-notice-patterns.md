# GW2 COS Web Admin Frontend Audit - Round 28

Date: 2026-03-31
Scope: `gw2_cos_web_admin`
Batch: `W - shared confirmation and notice patterns`

## Goal

Stop repeating the same admin operation language by extracting two very small shared primitives:

- a destructive `Popconfirm` props helper
- a reusable page-level notice alert

This batch only targets the clearest repeated cases already touched by the menu/IA cleanup.

## Root Cause

The remaining drift was no longer about page structure. It was about repeated implementation details:

1. destructive `Popconfirm` flows kept rewriting the same `title / description / okText / cancelText / danger` shape page by page
2. informational `Alert` blocks on operations pages kept re-declaring the same `showIcon + type + marginBottom` wrapper

That made the wording harder to keep consistent and increased the chance of low-value regressions during copy cleanup.

## Changes

### 1. Added a shared destructive `Popconfirm` props helper

File:
- `src/components/confirmProps.ts`

New helper:
- `getDestructivePopconfirmProps`

Purpose:
- standardize `title`
- standardize optional `description`
- standardize confirm/cancel labels
- always keep the confirm button in danger mode

Key lines:
- helper definition: `src/components/confirmProps.ts:8`

### 2. Added a shared page-level notice component

File:
- `src/components/listPageState.tsx`

New component:
- `PageNoticeAlert`

Purpose:
- standardize info/warning notices that sit above operations tables
- keep `showIcon` and spacing consistent with the existing inline error alert pattern

Key lines:
- component props: `src/components/listPageState.tsx:37`
- component definition: `src/components/listPageState.tsx:44`

### 3. Migrated the clearest destructive flows onto the shared helper

Files:
- `src/pages/UserList/index.tsx`
- `src/pages/WvwGuilds/index.tsx`
- `src/pages/Translations/index.tsx`
- `src/pages/DataMarketWatch/index.tsx`

Changes:
- replaced page-local destructive `Popconfirm` boilerplate with `getDestructivePopconfirmProps(...)`
- preserved each page's existing `onConfirm` behavior and page-specific descriptions
- preserved button labels and action routing

Key lines:
- player-account delete: `src/pages/UserList/index.tsx:131`
- guild-directory delete: `src/pages/WvwGuilds/index.tsx:111`
- translation-cache delete: `src/pages/Translations/index.tsx:125`
- market-watch pool remove: `src/pages/DataMarketWatch/index.tsx:282`

### 4. Migrated page-level info/warning notices onto the shared notice component

Files:
- `src/pages/DataGw2Api/index.tsx`
- `src/pages/DataMarketWatch/index.tsx`

Changes:
- replaced the page-local info/warning `Alert` wrappers with `PageNoticeAlert`
- preserved existing descriptions and page-specific messaging

Key lines:
- GW2 API sync usage notice: `src/pages/DataGw2Api/index.tsx:256`
- market-watch top info notice: `src/pages/DataMarketWatch/index.tsx:466`
- market-watch low-frequency warning: `src/pages/DataMarketWatch/index.tsx:657`

## Why This Change

This is still a minimal, high-confidence cleanup:

- no route changes
- no API changes
- no permission changes
- no workflow changes
- no new dependencies

The shared layer is intentionally narrow. It only captures repeated presentation semantics that were already stable in the codebase.

## Validation

Executed in `gw2_cos_web_admin` with `pnpm`:

- `pnpm.cmd validate`
  - `pnpm.cmd lint` passed
  - `pnpm.cmd build` passed

Current notable build output:
- `dist/assets/index-C5scN_mE.js` `473.48 kB`
- `dist/assets/request-CoSUGXkg.js` `352.35 kB`
- `dist/assets/pro-form-runtime-YcRkp0LR.js` `271.68 kB`
- `dist/assets/BasicLayout-BJs6i3IQ.js` `118.26 kB`
- `dist/assets/confirmProps-CDcGUvo6.js` `0.18 kB`
- `dist/assets/listPageState-D_WVoRKY.js` `0.53 kB`

Regression note:
- the first `validate` run failed on one unused `Alert` import left behind in `DataMarketWatch` after the notice-component migration
- the import was removed immediately and the second `validate` run passed cleanly

Regression check:
- no `>500 kB` chunk warning regression
- no Rollup warning regression

## Residual Risks

1. The new shared helper only covers `Popconfirm`-based destructive actions. `Modal.confirm` flows such as batch destructive actions still remain page-local by design.

2. The new shared notice component only wraps static info/warning alerts. It does not unify complex multi-state summaries or inline action blocks.

3. `gw2_cos_web_admin` still has no `test` script, so validation remains `lint + build` oriented through `pnpm.cmd validate`.

## Suggested Next Step

The next sensible step is to decide whether batch destructive flows are worth a second shared primitive. If not, the safer alternative is to stop abstracting and move back to concrete page cleanup in the remaining untranslated data-maintenance pages.
