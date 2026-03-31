# 2026-03-31 gw2_cos_web_admin Frontend Audit Round 32 / Batch AA

## Scope

- Target project: `gw2_cos_web_admin`
- Target page: `src/pages/ChangePassword/index.tsx`
- Goal: align the forced password update page with the new login-page visual language without changing the password update flow

## Root Cause

The change-password page was still functionally correct but visually behind the redesigned login experience. It rendered as a plain form card inside `PageContainer`, so the admin security flow felt disconnected from the stronger COS control-room entry language.

## Constraints Kept

- Request path remained `/admin/v1/auth/change-password`
- Existing token refresh behavior remained unchanged
- Existing `window.location.href = '/dashboard'` post-success behavior remained unchanged
- Existing validation rules remained unchanged
- No new dependencies

## Changes

1. Kept `PageContainer` and the same route position inside `BasicLayout`.
2. Rebuilt the inner page body into a two-panel security update layout:
   - a branded left panel that explains the forced update context
   - a right-side glass form card for the actual password action
3. Reused `public/logo.svg` to visually align the page with the new login experience.
4. Preserved the warning/info/error alerts, but integrated them into the upgraded form card.
5. Added clearer password guidance copy and stronger CTA styling while keeping the same submission behavior.

## Validation

Ran:

```powershell
pnpm.cmd validate
```

Result:

- `lint` passed
- `build` passed
- largest chunk remained stable at `dist/assets/index-DosK9bnk.js` `473.48 kB`
- no `>500 kB` warning regression
- no previously removed Rollup warning regressed

## Risks

- This round is intentionally visual-heavy and keeps following the current English admin shell language.
- The icon bundle grew slightly because this page now uses a few more Ant Design icons, but the overall largest chunk remained unchanged.
- Admin still has no `test` script, so verification remains at `lint + build` via `validate`.
