# GW2 COS Web Admin Frontend Audit - Round 26

Date: 2026-03-31
Scope: `gw2_cos_web_admin`
Batch: `U - helper copy and empty-state alignment`

## Goal

Align the first layer of page helper copy with the new admin menu information architecture, without changing page logic, data flow, or permissions.

This batch is limited to:

- filter/search copy
- empty-state wording
- inline error wording
- top-level modal/button labels
- small status-summary wording

## Root Cause

After the menu regrouping and page-header alignment, several pages still spoke in the old flat page language through:

- generic search labels like `Search users` or `Apply filters`
- empty states that no longer matched the new section meaning
- modal titles and action text that were technically correct, but inconsistent with the page's current role in the menu

So the sidebar and page header had already moved forward, but the helper copy directly below them was still lagging behind.

## Changes

### 1. Aligned community user copy with the new `Community` section

File:
- `src/pages/UserList/index.tsx`

Changes:
- `Search users` -> `Search player accounts`
- empty/error/modal wording now consistently uses `player account`
- clarified create/reset/delete feedback so it matches the page's account-management role

Key lines:
- table-state copy: `src/pages/UserList/index.tsx:54`
- error alert: `src/pages/UserList/index.tsx:157`
- create action: `src/pages/UserList/index.tsx:170`
- create modal: `src/pages/UserList/index.tsx:200`
- reset modal: `src/pages/UserList/index.tsx:238`

### 2. Aligned WvW guild helper copy with the new directory framing

File:
- `src/pages/WvwGuilds/index.tsx`

Changes:
- `Apply filters` -> `Filter guild directory`
- empty state now refers to `WvW guild directory entries`
- `Preview` -> `Open Landing Page`
- delete/error wording now uses `guild directory entry`

Key lines:
- table-state copy: `src/pages/WvwGuilds/index.tsx:41`
- landing-page action: `src/pages/WvwGuilds/index.tsx:107`
- error alert: `src/pages/WvwGuilds/index.tsx:137`

### 3. Aligned translation tooling copy with the cache model

File:
- `src/pages/Translations/index.tsx`

Changes:
- `Search translations` -> `Search cache entries`
- search field label changed from `Keyword` to `Source / Translation`
- modal and delete/success wording now consistently uses `cache entry`

Key lines:
- table-state copy: `src/pages/Translations/index.tsx:60`
- search field label: `src/pages/Translations/index.tsx:65`
- primary action: `src/pages/Translations/index.tsx:146`
- error alert: `src/pages/Translations/index.tsx:151`
- edit modal: `src/pages/Translations/index.tsx:185`
- create modal: `src/pages/Translations/index.tsx:210`

### 4. Aligned GW2 API sync helper copy with the integration workflow

File:
- `src/pages/DataGw2Api/index.tsx`

Changes:
- search label changed from `Keyword` to `Name / GW2 ID`
- `View JSON` -> `View Payload`
- `Sync Current Type` -> `Sync Selected Type`
- table empty state now explicitly describes missing cached entities for the selected type/language
- summary tags now use readable admin labels: `Build`, `Cached`, `Upserted`, `Deleted`
- `Raw JSON` modal -> `Entity Payload`

Key lines:
- search field label: `src/pages/DataGw2Api/index.tsx:165`
- row action: `src/pages/DataGw2Api/index.tsx:185`
- sync action: `src/pages/DataGw2Api/index.tsx:248`
- state tags: `src/pages/DataGw2Api/index.tsx:303`
- search/empty state: `src/pages/DataGw2Api/index.tsx:322`
- payload modal: `src/pages/DataGw2Api/index.tsx:354`

## Why This Change

This is still a minimal IA follow-up:

- no route changes
- no schema changes
- no request/response changes
- no table behavior changes
- no new dependencies

The only purpose is to keep operator-facing language coherent across three layers:

- sidebar grouping
- page header
- first actionable page copy

## Validation

Executed in `gw2_cos_web_admin` with `pnpm`:

- `pnpm.cmd validate`
  - `pnpm.cmd lint` passed
  - `pnpm.cmd build` passed

Current notable build output:
- `dist/assets/index-kwTQyJXq.js` `473.48 kB`
- `dist/assets/request-f98kbvkT.js` `352.35 kB`
- `dist/assets/pro-form-runtime-D79Bxh92.js` `271.68 kB`
- `dist/assets/BasicLayout-lYuk2VlD.js` `118.26 kB`

Regression check:
- no `>500 kB` chunk warning regression
- no Rollup warning regression

## Residual Risks

1. This round updates the first layer of helper copy only. Deeper modal descriptions, confirmation bodies, and long-form explanatory alerts are not yet fully normalized across the admin.

2. `DataGw2Api` still uses page-local `Alert` blocks instead of the shared inline-error component pattern used in simpler list pages. That is unchanged here because the page has more than one independent loading surface.

3. `gw2_cos_web_admin` still has no `test` script, so validation remains `lint + build` oriented through `pnpm.cmd validate`.

## Suggested Next Step

The next sensible follow-up is to align longer explanatory copy and confirmation text for the same admin areas, especially:

- `src/pages/DataGw2Api/index.tsx`
- `src/pages/WvwGuilds/index.tsx`
- `src/pages/Translations/index.tsx`
