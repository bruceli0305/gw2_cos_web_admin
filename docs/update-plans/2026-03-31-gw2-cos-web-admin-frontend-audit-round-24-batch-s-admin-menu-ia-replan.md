# GW2 COS Web Admin Frontend Audit - Round 24

Date: 2026-03-31
Scope: `gw2_cos_web_admin`
Batch: `S - admin menu IA replan`

## Goal

Restructure the admin navigation into clearer operator-facing domains without changing any real route paths, permission keys, or page ownership.

This batch is intentionally limited to menu information architecture.

## Root Cause

The menu had become confusing because it was growing along technical route history instead of current admin workflows.

The main symptoms were:

1. unrelated single pages were sitting at the top level side by side
2. `Content` existed as a single-child group, which wasted top-level space
3. `WvW Guilds`, `Users`, `Translations`, `Slang`, `RBAC`, and `Audit` were split by old implementation boundaries instead of operational domains
4. `Market Watch` was buried under generic data maintenance even though it behaves more like a live operations page

In short, the disorder came from route accretion, not from missing pages.

## Changes

### 1. Regrouped the top-level menu around admin domains

File:
- `src/layouts/BasicLayout.tsx`

New top-level structure:
- `Dashboard`
- `Community`
- `Localization`
- `Game Data`
- `Market Watch`
- `Security & Audit`

Key lines:
- `Community`: `src/layouts/BasicLayout.tsx:84`
- `Localization`: `src/layouts/BasicLayout.tsx:94`
- `Game Data`: `src/layouts/BasicLayout.tsx:103`
- `Market Watch`: `src/layouts/BasicLayout.tsx:115`
- `Security & Audit`: `src/layouts/BasicLayout.tsx:118`

### 2. Moved community-facing tools into one group

File:
- `src/layouts/BasicLayout.tsx`

Community now contains:
- `Users`
- `WvW Guilds`
- `Raid Recruitment`

Key lines:
- `Users`: `src/layouts/BasicLayout.tsx:87`
- `WvW Guilds`: `src/layouts/BasicLayout.tsx:88`
- `Raid Recruitment`: `src/layouts/BasicLayout.tsx:89`

### 3. Split localization away from general content

File:
- `src/layouts/BasicLayout.tsx`

Localization now contains:
- `Translations`
- `Slang Glossary`

Key lines:
- `Translations`: `src/layouts/BasicLayout.tsx:97`
- `Slang Glossary`: `src/layouts/BasicLayout.tsx:98`

### 4. Kept data maintenance grouped, but pulled out market operations

File:
- `src/layouts/BasicLayout.tsx`

Changes:
- renamed `Data` to `Game Data`
- kept resource/fractal/GW2 API maintenance pages together
- moved `Market Watch` to its own top-level slot so it stops competing with static data maintenance pages

Key lines:
- `Resource Directory`: `src/layouts/BasicLayout.tsx:106`
- `GW2 API Data`: `src/layouts/BasicLayout.tsx:112`
- standalone `Market Watch`: `src/layouts/BasicLayout.tsx:115`

### 5. Merged access control and audit into one operator boundary

File:
- `src/layouts/BasicLayout.tsx`

`Security & Audit` now contains:
- `Admin Users`
- `Roles`
- `Audit Logs`

Key lines:
- `Admin Users`: `src/layouts/BasicLayout.tsx:121`
- `Audit Logs`: `src/layouts/BasicLayout.tsx:123`

## Why This Change

This is the smallest safe replan because it only changes the menu tree inside the existing shell.

It does not change:

- actual route paths
- router declarations in `src/App.tsx`
- permission keys
- filtering logic
- page implementations
- backend contracts

The goal was to reduce menu noise by aligning the sidebar with how administrators think about work:

- community operations
- localization work
- game data maintenance
- live market operations
- security and audit

## Validation

Executed in `gw2_cos_web_admin` with `pnpm`:

- `pnpm.cmd validate`
  - `pnpm.cmd lint` passed
  - `pnpm.cmd build` passed

Current notable build output:
- `dist/assets/index-hE_xvp4M.js` `473.48 kB`
- `dist/assets/request-V0XvxNCC.js` `352.35 kB`
- `dist/assets/pro-form-runtime-CHItjY5q.js` `271.68 kB`
- `dist/assets/BasicLayout-D48klDR-.js` `118.26 kB`

Regression check:
- no `>500 kB` chunk warning regression
- no Rollup warning regression

## Residual Risks

1. This round only changes sidebar grouping. It does not change page-level headings or breadcrumbs, so some individual pages may still feel more technical than their new menu parent suggests.

2. `Market Watch` is now intentionally promoted to a top-level item. If the admin later grows more market tooling, it may become its own multi-page group instead of a single direct entry.

3. `gw2_cos_web_admin` still has no `test` script, so validation remains `lint + build` oriented through `pnpm.cmd validate`.

## Suggested Next Step

The next sensible follow-up is to align page titles and section language with the new menu IA, starting with:

- `src/pages/UserList/index.tsx`
- `src/pages/WvwGuilds/index.tsx`
- `src/pages/Translations/index.tsx`
- `src/pages/DataGw2Api/index.tsx`
