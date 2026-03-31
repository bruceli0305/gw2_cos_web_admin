# 2026-03-31 gw2_cos_web_admin Frontend Audit Round 41

## Scope

- Continue the first-screen information hierarchy cleanup for secondary high-frequency admin pages
- Target pages in this round:
  - `Translations`
  - `DataResourcesDirectory`
  - `RbacAdminUsers`
- Keep all existing CRUD flows, request contracts, and table behaviors unchanged

## Root Causes

1. `Translations`
   - The page still opened directly into the cache table, so operators had to infer current cache scale and direction split from the grid itself.
   - There was no first-screen explanation that this page manages persisted translation cache rather than live upstream responses.

2. `DataResourcesDirectory`
   - The page technically exposed an overview through `content`, but key signals such as category scale, largest category, and current filter scope were still not surfaced as scan-friendly summary blocks.

3. `RbacAdminUsers`
   - The page opened directly into role/account CRUD with no first-screen summary of account volume, active accounts on the current page, or super-role coverage.
   - Operators had to read the role chips in the grid to understand whether the current page contained privileged accounts.

## Changes

### 1. Translation cache overview strip

File:
- `src/pages/Translations/index.tsx`

Changes:
- Added a `PageNoticeAlert` explaining page scope and the difference between cache records and upstream translation responses.
- Added summary cards for:
  - total / filtered cache count
  - current-page accumulated usage count
  - current-page `CN_TO_EN` count
  - current-page `EN_TO_CN` count
- Derived all values from the existing table response with no API change.

### 2. Resource directory summary strip

File:
- `src/pages/DataResourcesDirectory/index.tsx`

Changes:
- Added a `PageNoticeAlert` explaining single-item maintenance vs full JSON import.
- Added summary cards for:
  - directory total count
  - category count
  - largest category
  - current view state
- Reused existing `overview` and `hasFilters` state with no request-path change.

### 3. Admin users summary strip

File:
- `src/pages/RbacAdminUsers/index.tsx`

Changes:
- Added a `PageNoticeAlert` explaining that this page manages backend login accounts and role assignment boundaries.
- Added summary cards for:
  - admin user total
  - current-page active count
  - current-page super-role coverage
  - role template count
- Captured the current page rows from the existing table request and derived summary values locally.

## Validation

Executed in `gw2_cos_web_admin`:

- `pnpm.cmd validate`

Result:
- `lint` passed
- `build` passed
- Largest emitted chunk: `dist/assets/index-Dg6balmb.js` `469.76 kB`
- No `>500 kB` chunk warning regression

## Residual Risks

1. These summary cards intentionally reflect existing page context and current result pages, not new global analytics APIs.
2. This round did not add browser-level visual regression coverage.
3. The admin project still has no `test` script, so validation remains `lint + build` based.
