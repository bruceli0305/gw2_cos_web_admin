# gw2_cos_web_admin Frontend Audit Round 49

Date: 2026-03-31
Scope: final high-frequency Chinese copy sweep

## Context

The previous rounds had already cleaned most high-frequency admin pages, but one core account-management page still lagged behind the current Chinese admin baseline:

- `src/pages/RbacAdminUsers/index.tsx`

I also re-checked:

- `src/pages/DataMarketWatch/index.tsx`

The root cause was no longer request flow or page structure. It was stale visible-layer text debt on the admin account page:

- historical mojibake
- incomplete Chinese wording in modal titles and summaries
- inconsistent destructive-flow copy
- weak field hints compared with the current shell and dashboard baseline

`DataMarketWatch` was inspected in the same pass, but its visible layer is already aligned enough with the current Chinese baseline, so no runtime change was made there.

## Changes

### 1. Administrator account page copy stabilization

Updated `src/pages/RbacAdminUsers/index.tsx`:

- replaced broken visible copy with stable Chinese wording
- kept all existing flows intact:
  - role loading
  - admin user list loading
  - create admin user
  - edit active state and role bindings
  - reset password
  - delete admin user
- localized:
  - page title / subtitle
  - summary cards
  - role loading error / table loading error alerts
  - notice block
  - table headers
  - action labels
  - create / edit / reset-password modal titles
  - field labels
  - validation messages
  - success toasts
  - delete confirmation copy

### 2. Market watch re-check

Reviewed `src/pages/DataMarketWatch/index.tsx` in the same round.

Conclusion:

- visible copy is already on the current Chinese baseline
- no additional runtime change was justified

This keeps the round minimal and avoids unnecessary churn.

## Validation

Executed:

- `pnpm.cmd validate`

Result:

- `lint` passed
- `build` passed

Current largest chunk:

- `dist/assets/index-v9cw2aNB.js` `469.76 kB`

No `>500 kB` warning regression was introduced.

## Risks / Remaining Gaps

- Validation is still `lint + build` only; `gw2_cos_web_admin` still has no `test` script.
- Some technical terms remain intentionally untranslated, such as RBAC-related identifiers and backend path semantics, because they belong to the existing admin product language rather than leftover English UI copy.
- This round intentionally stayed narrow. Lower-frequency pages may still contain isolated wording inconsistencies, but the main high-frequency management surfaces are now substantially aligned with the current Chinese shell baseline.
