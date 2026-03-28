# Round 11 / Batch F

## Goal

Remove the last remaining Rollup warning in `gw2_cos_web_admin` without rewriting table pages and without re-introducing oversized vendor chunks.

## What I Inspected First

1. Re-ran the current admin build after Round 10 and confirmed the only remaining warning was library-internal:
   - `@ant-design/pro-table/es/utils/cellRenderToFromItem.js`
2. Traced the import chain inside installed packages and confirmed:
   - `ProTable` core code imports `ProForm` from bare `@ant-design/pro-form`
   - the warning was caused by `@ant-design/pro-form` root re-exporting `ProForm` through `layouts/index.js`
   - this was no longer caused by application code after the `WvwGuildEdit` fix in Round 10
3. Verified that `cellRenderToFromItem` is not an `EditableProTable`-only path:
   - `columnRender.js` imports it
   - normal `ProTable` rendering depends on that path too

## Failed Direction And Rollback

I explicitly tested narrow `manualChunks` rules that tried to keep `pro-table` and the `pro-form` bridge modules in the same chunk.

Result:

- the warning disappeared
- but the build produced a new `2 MB+` shared chunk
- this regressed the packaging result worse than the original warning

So that chunk-forcing approach was fully removed from the final code.

## Root Cause

The remaining warning was caused by package-level runtime indirection:

- `@ant-design/pro-table` imports from bare `@ant-design/pro-form`
- bare `@ant-design/pro-form` re-exports `ProForm` through `layouts/index.js`
- Rollup split those modules across chunks
- the re-export chain created the unsupported circular chunk warning

Because this lived inside third-party package entrypoints, continuing to patch individual pages would not solve the real problem.

## Final Changes Kept

### 1. Add an exact Vite alias for bare `@ant-design/pro-form`

Updated [vite.config.ts](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/vite.config.ts) to alias only the exact bare import:

- `@ant-design/pro-form` -> local runtime shim

Important detail:

- deep imports such as `@ant-design/pro-form/es/...` are **not** rewritten
- the existing narrow `@ant-design/icons` split stays unchanged

### 2. Add a local runtime shim that exports `ProForm` directly

Added [pro-form-runtime.ts](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/src/vendor/pro-form-runtime.ts).

This shim preserves the current app-needed/runtime-needed surface while avoiding the problematic root re-export chain:

- exports `ProForm` directly from `es/layouts/ProForm`
- re-exports current component symbols from `es/components`
- re-exports the current layout entrypoints directly
- keeps the compatibility style imports that existed in the original package root

This keeps the fix at the bundler/runtime boundary instead of spreading work across all admin pages that use `ProTable`.

## Validation

Executed with `pnpm`:

- `pnpm.cmd lint`
- `pnpm.cmd build`

Both passed.

## Current Build Result

Top chunks after the final change:

- `index-u4j_Kfid.js` `473.50 kB`
- `request-R0ARbgVt.js` `319.06 kB`
- `pro-form-runtime-CmHf4-As.js` `271.71 kB`
- `index-CkKDZieq.js` `231.92 kB`
- `index-BGJ_pJb1.js` `229.41 kB`
- `ant-design-icons-DGxAepVh.js` `145.89 kB`

Important outcome:

- the final remaining Rollup warning is gone
- the previous `>500 kB` chunk-size warning remains absent
- no large replacement vendor chunk was introduced

## Risks / Notes

- The shim mirrors the current `gw2_cos_web_admin` usage surface plus the current `pro-table` runtime requirements. If future code starts depending on rarely used `@ant-design/pro-form` root exports that are not currently mirrored, the shim will need to be extended explicitly.
- I intentionally did **not** keep the `manualChunks` experiments because they solved the warning by making packaging worse.
- `gw2_cos_web_admin` still has no `test` script, so this round was validated with `lint` and `build` only.
