# 2026-03-31 gw2_cos_web_admin Frontend Audit Round 35 / Batch AD

## Scope

- Target projects:
  - `gw2_cos_web_admin`
  - `gw2_cos_nodejs`
- Target files:
  - `src/pages/UserList/index.tsx`
  - `src/routes/adminv1/users.ts`

## Goal

Add a read-only way for admins to inspect which GW2 API keys are currently bound to each frontend user account.

## Root Cause

The missing capability was not only a frontend action gap. The admin user list had no "view API keys" entry, but more importantly the admin backend did not expose any read-only per-user API key detail route. The actual source of truth also lives in `UserGw2ApiKeyModel`, not only in the legacy `User.gw2ApiKey` field, so a UI-only patch would have shown incomplete or misleading data.

## Changes

### 1. Added an admin read-only API key detail route

- Added `GET /admin/v1/users/:id/api-keys` in `src/routes/adminv1/users.ts`.
- Read the bound key list from `UserGw2ApiKeyModel`.
- Marked the active key by comparing against `activeGw2ApiKeyId`, with a fallback to the legacy single-key field.
- Returned masked key previews only, not raw full API keys.
- Added a transparent legacy fallback entry when a user still has only the old `gw2ApiKey` field but no migrated key documents yet.

### 2. Added a viewer action in admin user management

- Added a `View API Keys` action to the user management table in `src/pages/UserList/index.tsx`.
- Added a read-only modal that shows:
  - masked key
  - label
  - token name
  - account name
  - permissions
  - active state
  - created / updated / last used timestamps
- Added loading, empty, and retry states for the modal so the failure mode is explicit instead of silent.

## Validation

Ran:

```powershell
npm.cmd run build
pnpm.cmd validate
```

Result:

- `gw2_cos_nodejs` `build` passed
- `gw2_cos_web_admin` `validate` passed
- during the first admin validation run, Vite failed with `EBUSY` while copying `public/favicon.ico` into `dist`; removing the locked `dist` directory and rerunning fixed it
- admin build still passes without reintroducing the previous `>500 kB` warning
- current largest admin chunk is `dist/assets/index-Bod7goTq.js` `469.76 kB`

## Risks

- The admin modal intentionally shows masked key previews only. That is safer for operations, but it means this feature is for inspection, not for exporting raw secrets.
- The legacy fallback item is only used when a user still has `User.gw2ApiKey` but no `UserGw2ApiKey` records yet. It is transparent, but it also signals that historical data migration is still incomplete for some accounts.
- `gw2_cos_web_admin` has many pre-existing dirty files in the working tree unrelated to this task; this round only changed `src/pages/UserList/index.tsx` on the admin side.
- Admin still has no `test` script, so verification remains `lint + build` via `validate`.
