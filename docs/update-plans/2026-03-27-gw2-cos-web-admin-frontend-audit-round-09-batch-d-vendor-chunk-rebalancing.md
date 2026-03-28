# Round 09 / Batch D

## Goal

Continue the `gw2_cos_web_admin` performance line after route lazy loading, focusing on the remaining oversized shared vendor chunk reported by Vite build output.

## What I Inspected First

1. Re-checked the previous build output and identified the largest shared chunk as `CopyOutlined-*.js`, originally above `500 kB`.
2. Traced admin-side `copyable: true` usage across table pages and verified that many pages were importing the same chunk through ProTable copyable cells.
3. Confirmed through build artifact inspection that this chunk name was misleading:
   - it was not just a "copy icon" bundle
   - it already contained a large mixed vendor graph
   - page-level `copyable` removal alone did not reduce the oversized chunk
4. Stopped that path, rolled the experiment back, and re-centered on the real root cause: shared vendor chunk composition.

## Failed Hypothesis And Rollback

I briefly replaced `copyable: true` table cells with a local lightweight copy renderer to test whether the oversized chunk was primarily caused by copyable columns.

Result:

- `pnpm.cmd lint` passed
- `pnpm.cmd build` passed
- but the oversized shared chunk still remained
- the change added UI churn without solving the root problem

So that experiment was fully rolled back. No copy-interaction behavior changes are kept in the final code.

## Final Changes Kept

### 1. Narrow vendor split for Ant Design icons

Updated [vite.config.ts](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/vite.config.ts) to add a minimal `manualChunks` rule for:

- `@ant-design/icons`
- `@ant-design/icons-svg`

This keeps the split narrow and avoids touching application routing or business logic.

### 2. Remove one direct `ProForm` re-export pressure point

Rebuilt [index.tsx](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/src/pages/ChangePassword/index.tsx) from `ProForm` to plain `antd` `Form` while preserving:

- same route
- same field names
- same `/admin/v1/auth/change-password` request
- same token refresh logic
- same post-submit redirect to `/dashboard`

This reduces one app-owned `ProForm` usage on a simple page and removes the previous build warning that pointed at `ChangePassword`.

## Validation

Executed with `pnpm`:

- `pnpm.cmd lint`
- `pnpm.cmd build`

Both passed.

## Current Build Result

Top chunks after the final change:

- `index-XDs6_z1f.js` `462.41 kB`
- `request-BLZ4xILQ.js` `311.58 kB`
- `index-wTR7vmmn.js` `265.34 kB`
- `ant-design-icons-DGxAepVh.js` `142.47 kB`
- `Table-CUqWq88D.js` `119.47 kB`
- `BasicLayout-sMA80tDY.js` `113.23 kB`

Important outcome:

- the previous `>500 kB` chunk-size warning is gone
- the icon-heavy shared vendor moved into its own explicit `ant-design-icons` chunk

## Remaining Warnings

`pnpm.cmd build` still reports two Rollup re-export warnings:

1. app-owned path:
   - [index.tsx](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/src/pages/WvwGuildEdit/index.tsx)
2. library-internal path:
   - `@ant-design/pro-table/es/utils/cellRenderToFromItem.js`

These are no longer chunk-size failures, but they still indicate `ProForm` re-export coupling inside the current ProComponents stack.

## Risks / Notes

- The new chunk rule is intentionally narrow. It only targets Ant Design icons packages and does not try to manually split all `@ant-design/pro-*` modules.
- I explicitly tested a broader `@ant-design/pro-*` chunk split and rejected it because it produced a very large `ant-design-pro` chunk and circular chunk warnings.
- `WvwGuildEdit` remains the clearest app-owned next target if we want to reduce remaining `ProForm` re-export warnings without widening the bundler rule set.
