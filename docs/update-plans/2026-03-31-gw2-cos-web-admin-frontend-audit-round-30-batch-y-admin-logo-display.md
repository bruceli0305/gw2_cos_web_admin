# 2026-03-31 gw2_cos_web_admin Frontend Audit Round 30 / Batch Y

## Scope

- Target project: `gw2_cos_web_admin`
- Target asset: `public/logo.svg`
- Target surfaces:
  - `src/layouts/BasicLayout.tsx`
  - `src/pages/Login/index.tsx`

## Root Cause

The square SVG logo already existed in `public/logo.svg`, but the admin shell and login entry still rendered temporary text-based placeholders (`GW2` / `COS`) instead of the real brand asset. This was an integration gap, not an asset-generation problem.

## Changes

1. Replaced the temporary `ProLayout` logo block in `src/layouts/BasicLayout.tsx` with the real `/logo.svg` image.
2. Replaced the decorative text square in the login hero panel with the same `/logo.svg`.
3. Replaced the `LoginForm` logo placeholder with `/logo.svg`.

## Why This Fix

- Minimal change: only touched the already intended branding entry points.
- High confidence: no route, auth, request, or layout structure changed.
- Backward compatible: the logo is served from Vite `public/`, so no dependency or asset pipeline change was needed.

## Validation

Ran:

```powershell
pnpm.cmd validate
```

Result:

- `lint` passed
- `build` passed
- largest chunk remained stable at `dist/assets/index-vmg4XG5c.js` `473.48 kB`
- no `>500 kB` warning regression
- no previously removed Rollup warning regressed

## Risks

- This round assumes `public/logo.svg` is the intended production logo asset and does not modify the SVG itself.
- If the team wants the same logo propagated to additional places such as `index.html` metadata or browser tab branding, that still needs a separate follow-up.
- Admin still has no `test` script, so verification remains at `lint + build` via `validate`.
