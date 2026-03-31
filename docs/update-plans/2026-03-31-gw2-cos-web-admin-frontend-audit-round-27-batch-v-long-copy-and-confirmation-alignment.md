# GW2 COS Web Admin Frontend Audit - Round 27

Date: 2026-03-31
Scope: `gw2_cos_web_admin`
Batch: `V - long copy and confirmation alignment`

## Goal

Finish the next layer of IA polish after the menu regrouping and helper-copy cleanup by aligning:

- delete confirmation body text
- longer explanatory page copy
- advanced modal guidance

This batch stays entirely at the operator-language level.

## Root Cause

The admin was already more coherent at the menu, page-header, and empty-state layers, but several high-impact workflows still lacked explicit operator guidance:

- destructive actions still used short generic confirmations
- complex pages still assumed the operator already knew the page's exact responsibility
- advanced forms exposed implementation toggles without enough explanation

So the remaining confusion was no longer navigation-level. It was decision-level: what exactly happens if I click this?

## Changes

### 1. Clarified destructive account deletion

File:
- `src/pages/UserList/index.tsx`

Changes:
- expanded the delete confirmation body so it explicitly states that the frontend player account will be removed from the user system and cannot be recovered

Key lines:
- delete confirmation description: `src/pages/UserList/index.tsx:131`

### 2. Clarified destructive WvW directory deletion

File:
- `src/pages/WvwGuilds/index.tsx`

Changes:
- expanded the delete confirmation so it explicitly frames the action as removing the public guild recruitment entry and landing page from the community directory

Key lines:
- landing-page action context: `src/pages/WvwGuilds/index.tsx:107`
- delete confirmation description: `src/pages/WvwGuilds/index.tsx:111`

### 3. Clarified translation-cache deletion and manual entry semantics

File:
- `src/pages/Translations/index.tsx`

Changes:
- expanded the delete confirmation to explain that the cached translation pair can be recreated by future upstream translation flows
- added source-text helper copy so manual editors know the cache matches exact source phrases
- added overwrite guidance on the manual entry form

Key lines:
- delete confirmation description: `src/pages/Translations/index.tsx:125`
- source-text helper copy: `src/pages/Translations/index.tsx:244`
- overwrite tooltip: `src/pages/Translations/index.tsx:259`

### 4. Added an explicit usage guide to the GW2 API sync workspace

File:
- `src/pages/DataGw2Api/index.tsx`

Changes:
- added a top-level informational alert explaining:
  - how to use the language/type selectors
  - when to use focused sync vs advanced sync
  - that the payload viewer shows cached admin-side entities, not live upstream responses
- renamed the advanced modal to `Advanced Sync Plan`
- renamed `Prune Missing Items` to `Delete Missing Cache Records`
- expanded the toggle tooltip so operators know exactly what will be removed

Key lines:
- usage alert message: `src/pages/DataGw2Api/index.tsx:259`
- usage alert description: `src/pages/DataGw2Api/index.tsx:260`
- modal title: `src/pages/DataGw2Api/index.tsx:380`
- prune label: `src/pages/DataGw2Api/index.tsx:425`
- prune tooltip: `src/pages/DataGw2Api/index.tsx:426`

## Why This Change

This remains a minimal, high-confidence IA follow-up:

- no route changes
- no permission changes
- no API changes
- no workflow changes
- no new dependencies

The objective is to reduce hesitation around destructive or batch actions by making operator intent explicit at the last possible decision point.

## Validation

Executed in `gw2_cos_web_admin` with `pnpm`:

- `pnpm.cmd validate`
  - `pnpm.cmd lint` passed
  - `pnpm.cmd build` passed

Current notable build output:
- `dist/assets/index-BJRjSAd8.js` `473.48 kB`
- `dist/assets/request-0lDD__cI.js` `352.35 kB`
- `dist/assets/pro-form-runtime-aLHpGEed.js` `271.68 kB`
- `dist/assets/BasicLayout-Cl9Sqq84.js` `118.26 kB`

Regression check:
- no `>500 kB` chunk warning regression
- no Rollup warning regression

## Residual Risks

1. This round clarifies destructive and batch-action language, but it does not yet standardize confirmation-dialog style across the entire admin. Other pages still use shorter confirmations.

2. `DataGw2Api` now has a clearer top-level usage guide, but the page still uses multiple independent inline error alerts instead of a more unified multi-state summary block.

3. `gw2_cos_web_admin` still has no `test` script, so validation remains `lint + build` oriented through `pnpm.cmd validate`.

## Suggested Next Step

The next sensible step is to stop polishing isolated pages and extract one small shared confirmation/notice pattern for admin operations pages, then migrate the remaining destructive flows onto it selectively.
