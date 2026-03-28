# Round 15 / Batch J

## Goal

Polish the admin authentication surfaces after shell cleanup, while preserving the existing login and forced-password-change flow.

## What I Inspected First

1. Reviewed [Login/index.tsx](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/src/pages/Login/index.tsx).
2. Reviewed [ChangePassword/index.tsx](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/src/pages/ChangePassword/index.tsx).
3. Re-checked the shell enforcement path in [BasicLayout.tsx](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/src/layouts/BasicLayout.tsx) to confirm:
   - `mustChangePassword` redirect behavior must stay unchanged
   - `/change-password` must still refresh back into the normal admin shell after success

## Root Cause

The auth pages had three concrete problems:

1. **Visual language drift**
   - the shell had already been normalized, but login/change-password were still on an older surface language

2. **Weak failure communication**
   - login only used transient toast feedback
   - change-password had no stable inline failure state

3. **Low-quality copy on the password update page**
   - the page still contained garbled legacy text from earlier encoding/history issues
   - this is especially bad on a mandatory security step

## Final Changes Kept

### 1. Rebuild login as a clearer admin entry surface

Updated [Login/index.tsx](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/src/pages/Login/index.tsx):

- kept the same `/admin/v1/auth/login` request
- kept the same token storage path
- kept the same post-login redirect to `/`
- added local submitting state
- added inline error alert inside the form surface
- added clear admin-only context and forced-password-update note
- replaced the flat white page with a branded but still lightweight split layout

### 2. Rebuild change-password as a proper forced-action form

Updated [ChangePassword/index.tsx](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/src/pages/ChangePassword/index.tsx):

- kept the same `/admin/v1/auth/change-password` request
- kept token replacement behavior
- kept the full page reload back to `/dashboard`
- added local submitting state
- added inline error state
- replaced garbled copy with explicit English security guidance
- clarified what happens after successful submission

## Why I Did Not Change The Auth Flow

I intentionally did **not** touch:

- token key name
- API routes
- request payload shape
- post-login redirect target
- password-change redirect mechanism
- shell-side `mustChangePassword` enforcement

This round was auth-surface polish, not auth-flow refactoring.

## Validation

Executed with `pnpm`:

- `pnpm.cmd validate`

This passed and includes:

- `pnpm.cmd lint`
- `pnpm.cmd build`

## Current Build Result

Top chunks after this change:

- `index-Coi4Xk4t.js` `473.48 kB`
- `request-C5s2VJQ2.js` `352.35 kB`
- `pro-form-runtime-DHVqDRTz.js` `271.68 kB`
- `index-Dt4prsfq.js` `231.93 kB`
- `index-CTdvWDKG.js` `229.43 kB`
- `ant-design-icons-BPuBUfYU.js` `144.32 kB`

Important outcome:

- validation stayed green
- the previous no-warning packaging state held
- no `>500 kB` chunk-size warning regressed

## Risks / Notes

- Login and password-change copy is now explicitly English, matching the normalized admin shell language from the previous round.
- The login page is visually richer than before, but it still uses the existing `LoginForm` primitive and does not introduce any new shared design system layer.
- `gw2_cos_web_admin` still has no `test` script, so this round remains validated through `lint + build` via `validate`.
