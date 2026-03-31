# 2026-03-31 gw2_cos_web_admin Frontend Audit Round 29 / Batch X

## Scope

- Target project: `gw2_cos_web_admin`
- Target page: `src/pages/DataResourcesDirectory/index.tsx`
- Goal: return from shared abstraction work to concrete page cleanup, starting with the resource directory page

## Root Cause

The remaining problem on `DataResourcesDirectory` was not request flow, table state, or admin API contract drift. The page had pervasive operator-facing copy corruption from damaged encoding history, which made the screen hard to operate even though the underlying behavior was already aligned with the current admin foundation.

## Why This Page First

- It already used the current shared request-state patterns and safe follow-up refresh flow.
- The damage was concentrated in visible copy, so a minimal rewrite could produce a high-confidence improvement without touching the page architecture.
- It was a clearer next target than pages that still mix content cleanup with heavier interaction complexity.

## Changes

1. Rewrote the visible operator copy in `src/pages/DataResourcesDirectory/index.tsx` to consistent English admin language.
2. Kept all existing request paths, state flow, follow-up refresh behavior, and table/filter logic unchanged.
3. Normalized:
   - page title, subtitle, and overview summary
   - table filter labels and column labels
   - action button labels
   - create/edit/import modal titles
   - field labels, placeholders, validation copy, and success/error messages
4. Moved the delete confirmation on this page onto the existing shared destructive confirmation helper from `src/components/confirmProps.ts`.

## Validation

Ran:

```powershell
pnpm.cmd validate
```

Result:

- `lint` passed
- `build` passed
- largest chunk remained stable at `dist/assets/index-BlKS8s0q.js` `473.48 kB`
- no `>500 kB` warning regression
- no previously removed Rollup warning regressed

## Risks

- This round only cleaned the resource directory page; other data-maintenance pages may still contain damaged legacy copy.
- The page now follows the current English admin shell language, so visible copy changed intentionally.
- Admin still has no `test` script, so verification remains at `lint + build` via `validate`.
