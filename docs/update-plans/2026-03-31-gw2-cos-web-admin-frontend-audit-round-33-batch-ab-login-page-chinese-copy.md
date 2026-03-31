# 2026-03-31 gw2_cos_web_admin Frontend Audit Round 33 / Batch AB

## Scope

- Target project: `gw2_cos_web_admin`
- Target page: `src/pages/Login/index.tsx`
- Goal: translate the login-page interface copy to Chinese while preserving the newly redesigned visual layout

## Root Cause

The previous login-page redesign improved the visual hierarchy, but it kept the visible interface copy in English. That conflicted with the current operator expectation for this project, where admin-facing product copy should default to Chinese unless there is a strong reason not to.

## Constraints Kept

- Layout and motion design remained unchanged
- Request path remained `/admin/v1/auth/login`
- Existing token storage remained unchanged
- Existing login redirect remained unchanged
- No new dependencies

## Changes

1. Translated all visible login-page copy to Chinese, including:
   - hero section labels and description
   - capability cards
   - security notice copy
   - login card title and subtitle
   - placeholders and validation messages
   - error alert title
   - submit button label
   - login success and fallback failure messages
2. Kept GW2 / 欧服 / 协同学院 semantics explicit in the Chinese wording.
3. Did not change any authentication logic, styling structure, or component hierarchy.

## Validation

Ran:

```powershell
pnpm.cmd validate
```

Result:

- `lint` passed
- `build` passed
- largest chunk remained stable at `dist/assets/index-BDW7K7jl.js` `473.48 kB`
- no `>500 kB` warning regression
- no previously removed Rollup warning regressed

## Risks

- This round only localized the login page; the redesigned change-password page still follows the current English security-update copy.
- Terminal output in the current PowerShell session may display Chinese text with mojibake, but the file itself passed lint/build after the update.
- Admin still has no `test` script, so verification remains at `lint + build` via `validate`.
