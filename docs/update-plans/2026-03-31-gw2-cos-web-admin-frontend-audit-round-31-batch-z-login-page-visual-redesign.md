# 2026-03-31 gw2_cos_web_admin Frontend Audit Round 31 / Batch Z

## Scope

- Target project: `gw2_cos_web_admin`
- Target page: `src/pages/Login/index.tsx`
- Goal: redesign the admin login page so it feels intentional and branded instead of a generic split form

## Root Cause

The existing login page was functionally correct but visually flat. It used a basic two-column arrangement, temporary-feeling composition, and weak visual hierarchy, so the real COS branding and GW2 EU admin context were not carrying enough weight at the entry point.

## Constraints Kept

- Authentication request path remained `/admin/v1/auth/login`
- Existing token storage remained unchanged
- Existing error handling remained unchanged
- Existing redirect to `/` after login remained unchanged
- No new dependencies

## Changes

1. Rebuilt the page shell into a more deliberate hero + glass-panel composition.
2. Kept `LoginForm` as the actual form primitive and only redesigned the surrounding visual system.
3. Promoted the existing `public/logo.svg` asset into the hero and form header.
4. Added a branded left-side control-room panel with:
   - clear GW2 EU admin positioning
   - capability cards for localization, data, and operations
   - stronger security context copy
5. Reworked the sign-in card with:
   - stronger hierarchy
   - clearer access framing
   - upgraded primary CTA styling
   - consistent glass treatment and gradient accents
6. Added lightweight CSS-only motion and responsive fallback without changing routing or auth behavior.

## Validation

Ran:

```powershell
pnpm.cmd validate
```

Result:

- `lint` passed
- `build` passed
- largest chunk remained stable at `dist/assets/index-CocNr2SD.js` `473.48 kB`
- no `>500 kB` warning regression
- no previously removed Rollup warning regressed

## Risks

- This round is intentionally visual-heavy; the login page now leans more strongly into the current English admin shell language.
- Responsive behavior was adjusted with CSS media fallback and flex wrapping, but there is still no browser screenshot regression suite in this project.
- Admin still has no `test` script, so verification remains at `lint + build` via `validate`.
