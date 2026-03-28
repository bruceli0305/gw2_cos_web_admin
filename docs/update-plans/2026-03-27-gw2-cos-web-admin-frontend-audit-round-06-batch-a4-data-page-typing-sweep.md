# gw2_cos_web_admin 前端审查 Round 06

- 日期: 2026-03-27
- 范围: `Batch A4 - data page typing sweep`
- 目标: 清掉 admin 剩余数据维护页里的 `@typescript-eslint/no-explicit-any`，争取让全量 `pnpm lint` 首次通过

## 本轮改了什么

本轮先按计划清理了 5 个数据页：

- `src/pages/DataFractalDailies/index.tsx`
- `src/pages/DataLegendaryBlueprints/index.tsx`
- `src/pages/DataMarketWatch/index.tsx`
- `src/pages/DataMistlockInstabilities/index.tsx`
- `src/pages/DataMistlockRotations/index.tsx`

全量 lint 首次回跑时发现仍有 1 个漏网页还残留 2 个 `any`，于是顺手补完：

- `src/pages/DataResourcesRecommended/index.tsx`

本轮修改都保持在“局部类型收紧”范围内，没有改接口路径、字段名、请求结构、页面布局或业务流程：

- 给表格请求参数补了显式局部类型，移除 `params as any`
- 给列表/导入/同步/校准等接口补了最小响应类型
- 把 `catch (e: any)` 改成 `unknown + getErrorMessage(...)`
- 把 JSON 粘贴导入流程里的 `obj: any` 改成 `unknown -> Record<string, unknown>` 的显式收窄
- 把图片加载失败处理改成 `SyntheticEvent<HTMLImageElement>`，移除 DOM 事件里的 `any`
- 保留现有页面结构、ModalForm 组织方式和 admin 请求封装方式不变

## 根因

剩余 lint 失败已经不是架构或接口契约问题，而是旧数据页里存在一批历史遗留的宽松写法：

- ProTable 请求参数直接 `as any`
- 导入/同步流程直接 `catch (e: any)`
- 粘贴 JSON 后直接把解析结果落到 `any`
- 少数 DOM 事件处理直接 `as any`

这些问题分散在多个数据页里，导致前几轮虽然已经明显缩小了错误数，但还无法让全量 lint 闭环。

## 验证

本轮执行并通过：

- 定向 `pnpm.cmd exec eslint`：
  - `src/pages/DataFractalDailies/index.tsx`
  - `src/pages/DataLegendaryBlueprints/index.tsx`
  - `src/pages/DataMarketWatch/index.tsx`
  - `src/pages/DataMistlockInstabilities/index.tsx`
  - `src/pages/DataMistlockRotations/index.tsx`
- `pnpm.cmd exec tsc -b`
- `pnpm.cmd lint`
- `pnpm.cmd build`

构建结果：

- `dist/assets/index-CqdB7ETy.js` `2314.80 kB`
- 仍有 Vite 的 `chunk > 500 kB` 告警

当前状态：

- `gw2_cos_web_admin` 全量 lint 已首次通过
- `gw2_cos_web_admin` build 继续通过
- 项目仍然没有 `test` 脚本

## 风险与残余问题

- 本轮只清理类型债，没有处理 admin 首包过大的性能问题
- 多个旧页面的中文文案本身仍存在历史编码损坏，本轮没有触碰，避免扩大 UI 改动面
- 由于项目没有测试脚本，本轮验证仍以 `lint + tsc + build` 为主

## 下一步建议

下一步可以从“类型债清理”转到“性能与维护性”：

1. 先评估 `src/App.tsx` 和路由层是否适合做最小路由懒加载
2. 再看 Ant Design / Pro Components 重页面能否按路由拆 chunk
3. 如不准备动性能线，也可以先固化 admin 的验证基线和文档说明
