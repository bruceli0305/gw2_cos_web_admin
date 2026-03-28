# gw2_cos_web_admin 前端审查 Round 07

- 日期: 2026-03-27
- 范围: `Batch B - route code splitting`
- 目标: 以最小改动降低 admin 首入口包，优先从路由层拆分，不动业务页面内部逻辑

## 本轮改了什么

本轮只修改了：

- `src/App.tsx`

改动策略保持在入口层：

- 把原来在 `App.tsx` 顶层同步导入的页面，改成 `React.lazy(...)`
- 保留 `BasicLayout` 同步加载，避免为了拆包让导航壳层跟着抖动
- 在路由元素上统一包了一层 `Suspense`
- 新增了一个基于现有 `antd` `Spin` 风格的最小路由 fallback
- 没有改动任何路由路径、权限校验、页面参数或页面内部业务逻辑

## 根因

这轮之前 admin 的主入口包过大，直接根因不是某一个页面异常，而是：

- 所有页面组件都在 `src/App.tsx` 里同步静态导入
- Vite 在入口阶段就必须把整站大部分页面代码一起装入入口共享图
- 即使用户只访问 `/login` 或 `/dashboard`，也会把大量数据页和管理页代码一并带进来

所以这轮优先修入口装载方式，而不是继续局部优化单个页面。

## 验证

执行并通过：

- `pnpm.cmd lint`
- `pnpm.cmd build`

稳定版构建结果：

- 入口脚本变为 `dist/assets/index-CxsI6rIY.js` `0.07 kB`
- 其余页面按路由拆成多个小 chunk
- 当前仍有 3 个较大的共享 chunk：
  - `dist/assets/index-BTeUshJp.js` `828.92 kB`
  - `dist/assets/index-Ewnafi8q.js` `928.23 kB`
  - `dist/assets/Table-C-ACGQOR.js` `323.32 kB`

相比上一轮：

- 不再是单个 `2.3 MB+` 主入口包
- 首入口装载压力明显下降
- 共享依赖仍然偏重，告警未完全消失

## 试验与回退

本轮中途试过在 `vite.config.ts` 里加一版窄范围 `manualChunks`，试图把 `react`、`antd`、`@ant-design/pro-*` 再拆细。

结果确认不适合当前项目，原因是：

- 会把现有的 ProComponents 共享依赖推成明确的 chunk 循环
- 构建提示变成 `pro-components -> antd-vendor -> pro-components`
- 这比原先的“共享 chunk 偏大”更危险

因此该试验已经回退，没有保留到最终代码。

## 风险与残余问题

- `@ant-design/pro-components` / `antd` 仍形成较大的共享 chunk，`>500 kB` 告警还在
- 构建仍提示 `ProForm` 相关跨 chunk re-export 风险，涉及：
  - `src/pages/ChangePassword/index.tsx`
  - `@ant-design/pro-table` 内部依赖链
- 由于 `@ant-design/pro-form` 不是当前项目的直接依赖，在 `pnpm` 结构下不能安全地直接改成单独包导入，因此这轮没有做脆弱的深路径绕行
- 项目仍然没有 `test` 脚本，本轮验证依然只有 `lint + build`

## 下一步建议

下一步不要再硬调简单 `manualChunks` 规则，而是先做更有把握的一轮依赖分层审查：

1. 识别 `antd`、`@ant-design/pro-components`、`@ant-design/pro-table` 各自对大共享 chunk 的贡献
2. 判断哪些页面真的需要 `ProTable / ModalForm / ProForm`
3. 再决定是否值得做更细的按能力拆分，或者接受当前 route splitting 作为第一阶段稳定版本
