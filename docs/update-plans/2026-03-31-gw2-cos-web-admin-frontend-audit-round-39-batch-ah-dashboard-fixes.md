# 2026-03-31 gw2_cos_web_admin Frontend Audit Round 39

## Scope

- Fix the admin shell menu regression found in Round 38
- Fix dashboard page issues found from screenshot review
- Keep existing routing, permissions, stats contract, and shell architecture unchanged

## Root Causes

1. `BasicLayout.tsx`
   - Grouped menu nodes were given synthetic parent paths to recover rendering in `ProLayout`, but the existing "single child flatten" rule still only matched pathless groups.
   - Result: after restoring parent paths, accounts with only one child permission could lose the direct menu entry.

2. `Dashboard/index.tsx`
   - The page still used browser-default `toLocaleString()` and `toLocaleDateString()`, so a Chinese UI could render English-style `AM/PM` timestamps.
   - Card height relied on `height: 100%` alone, which was not enough to guarantee equal-height cards in the current flex layout.
   - The fourth KPI mixed two different concepts: card title used raid recruitment semantics, while meta text used total content semantics.

## Changes

### 1. Menu access fix

File:
- `src/layouts/BasicLayout.tsx`

Changes:
- Kept the grouped parent menu nodes with synthetic paths.
- Adjusted the single-child flatten condition from `!item.path` to `item.routes && !item.requiredPerm`.

Why:
- This preserves grouped menu rendering for multi-permission accounts.
- It also preserves direct-entry behavior for single-child permission accounts such as `wvwGuilds.read`.

### 2. Dashboard formatting and layout fixes

File:
- `src/pages/Dashboard/index.tsx`

Changes:
- Replaced browser-default time formatting with fixed `zh-CN` date and datetime formatters.
- Corrected `formatUptime` and `formatBytes` falsy handling so zero values are not treated as missing.
- Added `flex: 1` and `width: 100%` to the shared dashboard card style so cards stretch consistently inside the current grid.
- Changed the fourth KPI from "raid-only" semantics to "content inventory" semantics:
  - main value = total content count
  - meta value = raid recruitment count
- Kept the same backend request and the same stats shape from `/admin/v1/dashboard/stats`.

Why:
- The page issues were presentation and layout problems, not API contract problems.
- Fixing them at the page layer is the smallest root-cause repair without changing backend stats or menu architecture.

## Validation

Executed in `gw2_cos_web_admin`:

- `pnpm.cmd validate`

Result:
- `lint` passed
- `build` passed
- Largest emitted chunk: `dist/assets/index-BYXlSw2-.js` `469.76 kB`
- No `>500 kB` chunk warning regression

## Residual Risks

1. This round was validated by `lint + build`, not by automated UI screenshot tests.
2. Menu rendering and single-child permission access should still be manually spot-checked with:
   - a super admin account
   - an account that only has `wvwGuilds.read`
3. `gw2_cos_web_admin` still has no `test` script, so there is no component-level regression coverage for this dashboard page yet.
