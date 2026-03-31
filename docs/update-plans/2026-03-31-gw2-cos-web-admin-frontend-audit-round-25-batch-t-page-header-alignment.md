# GW2 COS Web Admin Frontend Audit - Round 25

Date: 2026-03-31
Scope: `gw2_cos_web_admin`
Batch: `T - page header alignment`

## Goal

Align the most visible page headers with the new admin menu information architecture, without changing any page behavior, routing, or data flow.

This batch only updates page-level framing:

- titles
- subtitles
- one table header label
- two primary action labels

## Root Cause

After the sidebar regrouping in Round 24, several high-traffic pages still described themselves using the old flatter menu model.

That created a new mismatch:

- the sidebar now communicates domain-based admin areas
- the page headers still speak in isolated legacy page names

The result is subtle but real navigation friction: users arrive through a clearer menu structure, then immediately lose that context once the page loads.

## Changes

### 1. Reframed the user list as a community-admin page

File:
- `src/pages/UserList/index.tsx`

Changes:
- `Users` -> `Community Users`
- clarified the subtitle around player accounts, access status, and password reset operations
- `User Records` -> `Player Accounts`

Key lines:
- page header: `src/pages/UserList/index.tsx:155`
- table header: `src/pages/UserList/index.tsx:163`

### 2. Reframed WvW guild management as a directory surface

File:
- `src/pages/WvwGuilds/index.tsx`

Changes:
- `WvW Guild Recruitment` -> `WvW Guild Directory`
- clarified that this page manages community-facing recruitment entries and landing pages
- `Create Guild` -> `Create Guild Entry`

Key lines:
- page header: `src/pages/WvwGuilds/index.tsx:127`
- primary action label: `src/pages/WvwGuilds/index.tsx:132`

### 3. Reframed translations as localization cache operations

File:
- `src/pages/Translations/index.tsx`

Changes:
- `Translations` -> `Translation Cache`
- subtitle now emphasizes localization cache entries, manual corrections, and direction-specific term pairs
- `Create Entry` -> `Create Cache Entry`

Key lines:
- page header: `src/pages/Translations/index.tsx:141`
- primary action label: `src/pages/Translations/index.tsx:146`

### 4. Reframed GW2 API maintenance as a sync/integration surface

File:
- `src/pages/DataGw2Api/index.tsx`

Changes:
- `GW2 API Data` -> `GW2 API Sync`
- subtitle now explicitly describes this page as a game-data ingestion surface for downstream admin tooling

Key lines:
- page header: `src/pages/DataGw2Api/index.tsx:200`

## Why This Change

This is the smallest coherent follow-up to the menu regrouping:

- no route changes
- no permission changes
- no API changes
- no table behavior changes
- no modal logic changes

The only goal is to keep the operator-facing language consistent between:

- the new sidebar grouping
- the first screenful of each page

## Validation

Executed in `gw2_cos_web_admin` with `pnpm`:

- `pnpm.cmd validate`
  - `pnpm.cmd lint` passed
  - `pnpm.cmd build` passed

Current notable build output:
- `dist/assets/index-BE9ISa7u.js` `473.48 kB`
- `dist/assets/request-B4wC-3cZ.js` `352.35 kB`
- `dist/assets/pro-form-runtime-DoyaJv93.js` `271.68 kB`
- `dist/assets/BasicLayout-DuCnTHOB.js` `118.26 kB`

Regression check:
- no `>500 kB` chunk warning regression
- no Rollup warning regression

## Residual Risks

1. This round only aligns page headers. It does not yet align deeper copy such as filter placeholders, modal descriptions, or empty-state explanations with the new menu grouping.

2. The admin currently uses an English shell direction. If that direction changes later, these headers should be updated as part of the same system rather than page by page.

3. `gw2_cos_web_admin` still has no `test` script, so validation remains `lint + build` oriented through `pnpm.cmd validate`.

## Suggested Next Step

The next highest-signal follow-up is to align page-level helper copy and empty-state wording for the same areas, starting with:

- `src/pages/UserList/index.tsx`
- `src/pages/Translations/index.tsx`
- `src/pages/DataGw2Api/index.tsx`
