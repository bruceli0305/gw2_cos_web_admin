# 2026-03-31 gw2_cos_web_admin Frontend Audit Round 34 / Batch AC

## Scope

- Target project: `gw2_cos_web_admin`
- Target files:
  - `src/pages/ChangePassword/index.tsx`
  - `src/layouts/BasicLayout.tsx`
  - `src/pages/Dashboard/index.tsx`

## Goal

Continue the style unification after the redesigned login page so the admin experience no longer feels like two unrelated products before and after sign-in.

## Root Cause

The login page had already been upgraded into a stronger branded entrance, but the post-login admin experience still fell back to the older shell and a relatively thin dashboard. That created two visible problems:

1. language drift: login had moved to Chinese, while `ChangePassword` and shell microcopy still lagged
2. product drift: the first in-app screen did not carry the same visual weight or information density as the redesigned entry surface

## Changes

### 1. ChangePassword Chinese alignment

- Translated the forced password update page into Chinese.
- Kept the existing request path, token refresh behavior, and `/dashboard` reload intact.
- Preserved all form rules and only changed visible copy.

### 2. BasicLayout shell polish

- Updated high-frequency shell microcopy to Chinese:
  - loading state
  - shell title
  - current-admin info card
  - avatar dropdown actions
  - logout feedback
- Added a soft branded shell background so the post-login workspace keeps the same material direction as the new auth surfaces.
- Kept route structure, permission filtering, and avatar behavior unchanged.

### 3. Dashboard enrichment

- Rebuilt the dashboard into a more useful admin homepage using existing data only from `/admin/v1/dashboard/stats`.
- Reorganized the page into:
  - branded hero summary
  - top KPI cards
  - content inventory distribution
  - system status block
  - readiness timeline
  - snapshot summary
- Used existing `antd` / `pro-components` only, with no API expansion and no new dependencies.

## Validation

Ran:

```powershell
pnpm.cmd validate
```

Result:

- `lint` passed
- `build` passed
- largest chunk is now `dist/assets/index-C6PH3aLQ.js` `469.76 kB`
- still no `>500 kB` warning regression
- no previously removed Rollup warning regressed

## Risks

- Chinese copy displays as mojibake in the current PowerShell output, but the files still passed lint and build after the changes.
- The shell microcopy is now more aligned with the Chinese login surface, but left-nav route names are still mostly English, so there is still a residual language mismatch deeper in the app.
- The dashboard is richer, but it still depends on the same existing stats contract; no new backend dimensions were introduced.
- Admin still has no `test` script, so verification remains at `lint + build` via `validate`.
