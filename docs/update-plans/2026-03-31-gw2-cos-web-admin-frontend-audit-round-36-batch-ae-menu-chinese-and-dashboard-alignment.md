# 2026-03-31 gw2_cos_web_admin Frontend Audit Round 36 / Batch AE

## Scope

- Target project: `gw2_cos_web_admin`
- Target files:
  - `src/layouts/BasicLayout.tsx`
  - `src/pages/Dashboard/index.tsx`

## Goal

Unify the admin shell navigation into Chinese and tighten the dashboard card layout so the homepage no longer feels visually uneven.

## Root Cause

Two separate presentation problems were still visible in the admin shell:

1. the left navigation still mixed the new Chinese shell with older English route labels
2. the dashboard top KPI cards were built one-by-one with different footer structures, so their lower content blocks did not align consistently

This was not a data-contract problem. The backend stats shape already worked. The issue was purely in information architecture and card composition.

## Changes

### 1. Converted left-nav menu groups and child items to Chinese

- Updated the route names in `src/layouts/BasicLayout.tsx`.
- Kept all existing paths, permission keys, grouping structure, and routing behavior unchanged.
- The main groups are now:
  - `首页看板`
  - `社区内容`
  - `翻译与词典`
  - `游戏数据`
  - `交易所观察`
  - `权限与审计`

### 2. Rebuilt the dashboard card composition on the same stats contract

- Rebuilt `src/pages/Dashboard/index.tsx` on the same `/admin/v1/dashboard/stats` response.
- Kept the same data domains:
  - admins
  - users
  - translations
  - content
  - system memory / uptime
- Reorganized the top four summary cards into a shared mapped structure with a consistent footer area.
- Added `height: 100%` and shared body layout rules so cards align inside the grid instead of drifting based on different text lengths.
- Preserved the hero, content distribution, system status, readiness timeline, and snapshot sections, but rewrote the copy into a clean Chinese dashboard language.

## Validation

Ran:

```powershell
pnpm.cmd validate
```

Result:

- `lint` passed
- `build` passed
- current largest chunk is `dist/assets/index-Bdwr9rp5.js` `469.76 kB`
- no `>500 kB` warning regression

## Risks

- This round rewrote the dashboard page structure, but only against the existing stats contract. No backend API expansion was introduced.
- The card alignment fix is layout-level, so exact visual balance on every viewport still needs browser QA if pixel-perfect parity matters.
- The admin project still has no `test` script, so verification remains `lint + build` via `validate`.
