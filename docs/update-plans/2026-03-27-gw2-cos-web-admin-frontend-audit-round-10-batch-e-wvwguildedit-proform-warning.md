# Round 10 / Batch E

## Goal

Remove the remaining app-owned Rollup re-export warning in `gw2_cos_web_admin` without rewriting `WvwGuildEdit` or widening the bundler split strategy.

## What I Inspected First

1. Re-ran `pnpm.cmd build` to confirm the exact warning source after Round 09.
2. Verified that the app-owned warning pointed specifically at [index.tsx](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/src/pages/WvwGuildEdit/index.tsx).
3. Inspected the installed `@ant-design/pro-form` package and confirmed:
   - `ProForm` is defined in `es/layouts/ProForm/index.js`
   - the package root re-exports it through `es/layouts/index.js`
   - the warning was caused by that re-export chain crossing chunks
4. Confirmed `WvwGuildEdit` only uses `<ProForm>` as a wrapper and does not rely on `ProForm` static members, so an import-level fix was sufficient.

## Root Cause

`WvwGuildEdit` imported `ProForm` from `@ant-design/pro-components`, which re-exported through `@ant-design/pro-form`, then through `layouts/index`, and finally back to the real `layouts/ProForm` module.

Under the current Vite/Rollup chunk graph, that app-owned re-export chain created the warning about circular chunk execution order.

## Final Changes Kept

### 1. Normalize `@ant-design/pro-form` as a direct dependency

Updated [package.json](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/package.json) to declare `@ant-design/pro-form` explicitly.

Reason:

- the package was already present transitively via `@ant-design/pro-components`
- importing it directly from app code is the stable fix
- this avoids brittle deep filesystem imports into `.pnpm` layout

### 2. Split `WvwGuildEdit` imports by ownership

Updated [index.tsx](/D:/project/AI/CollegeOfSynergetics/gw2_cos_web_admin/src/pages/WvwGuildEdit/index.tsx):

- keep `PageContainer` and `ProCard` from `@ant-design/pro-components`
- move `ProFormText`, `ProFormTextArea`, `ProFormSelect`, `ProFormSwitch`, `ProFormList` to `@ant-design/pro-form`
- import `ProForm` directly from `@ant-design/pro-form/es/layouts/ProForm`

This preserves the page structure, field names, submit flow, and request contract. Only the import path changed.

## Validation

Executed with `pnpm`:

- `pnpm.cmd install`
- `pnpm.cmd lint`
- `pnpm.cmd build`

Results:

- `pnpm.cmd lint` passed
- `pnpm.cmd build` passed
- the app-owned warning for `WvwGuildEdit` is gone

## Current Build Result

Top chunks after the change:

- `index-CeDJT5RM.js` `473.50 kB`
- `request-B_oGCvDD.js` `319.06 kB`
- `index-DZdbViQx.js` `271.71 kB`
- `index-BgJJrhcF.js` `231.92 kB`
- `index-DoqfHCHB.js` `229.40 kB`
- `ant-design-icons-DGxAepVh.js` `145.89 kB`

Important outcome:

- the app-owned `ProForm` warning path has been removed
- the `>500 kB` chunk-size warning remains absent

## Remaining Warning

`pnpm.cmd build` still reports one library-internal Rollup warning:

- `@ant-design/pro-table/es/utils/cellRenderToFromItem.js`

This warning is no longer caused by application code in `gw2_cos_web_admin`.

## Risks / Notes

- `pnpm.cmd install` reports existing peer warnings because the current stack uses `antd@6.2.2` while the installed `@ant-design/pro-*` packages still declare peer ranges up to Ant Design 5. This is pre-existing and not introduced by this round.
- I did not widen `manualChunks` or rewrite `WvwGuildEdit` to plain `antd Form`, because that would increase blast radius without being necessary for the confirmed root cause.
- `gw2_cos_web_admin` still has no `test` script, so this round was validated with `lint` and `build` only.
