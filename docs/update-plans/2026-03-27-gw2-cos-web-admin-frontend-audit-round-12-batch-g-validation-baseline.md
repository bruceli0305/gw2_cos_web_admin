# Round 12 / Batch G

## Goal

Turn the current `gw2_cos_web_admin` checks into an explicit, repeatable validation baseline so future work no longer depends on manually remembering the correct `pnpm` command sequence.

## What I Inspected First

1. Checked the current script surface in [package.json](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/package.json).
2. Confirmed the project already had:
   - `lint`
   - `build`
3. Confirmed `build` already runs `tsc -b` before Vite build, so type safety is already part of the current build path.
4. Confirmed there is still no `test` script, so the smallest safe baseline today is:
   - lint
   - typecheck
   - build

## Root Cause

The admin project had become technically stable again, but its verification entrypoints were still incomplete:

- no standalone `typecheck` script
- no single `validate` script for normal regression checks

That makes routine verification easy to apply inconsistently across future rounds.

## Final Changes Kept

Updated [package.json](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/package.json):

- added `typecheck: "tsc -b"`
- added `validate: "pnpm lint && pnpm build"`

Why `validate` uses `lint + build` instead of `lint + typecheck + build`:

- `build` already includes `tsc -b`
- keeping `validate` aligned with the current production build path avoids unnecessary duplicate compile work

No runtime code changed in this round.

## Validation

Executed with `pnpm`:

- `pnpm.cmd typecheck`
- `pnpm.cmd validate`

Both passed.

`validate` expanded to:

- `pnpm.cmd lint`
- `pnpm.cmd build`

and both sub-steps also passed.

## Current Build Result

Top chunks remain stable after this round:

- `index-u4j_Kfid.js` `473.50 kB`
- `request-R0ARbgVt.js` `319.06 kB`
- `pro-form-runtime-CmHf4-As.js` `271.71 kB`
- `index-CkKDZieq.js` `231.92 kB`
- `index-BGJ_pJb1.js` `229.41 kB`
- `ant-design-icons-DGxAepVh.js` `145.89 kB`

Important outcome:

- no Rollup warning regression
- no `>500 kB` chunk-size warning regression

## Risks / Notes

- `gw2_cos_web_admin` still has no `test` script, so the validation baseline is stronger than before but still stops at `lint + typecheck + build`.
- I intentionally did not change the existing `build` behavior. This round only made the current verification flow explicit and reusable.
