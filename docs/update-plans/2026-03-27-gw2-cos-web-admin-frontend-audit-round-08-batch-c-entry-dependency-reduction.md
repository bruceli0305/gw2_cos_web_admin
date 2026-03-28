# gw2_cos_web_admin 前端审查 Round 08

- 日期: 2026-03-27
- 范围: `Batch C - entry dependency reduction`
- 目标: 继续压缩 admin 首屏装载图，优先拆掉根入口里的同步重依赖

## 本轮改了什么

本轮只改了两个文件：

- `src/App.tsx`
- `src/services/request.ts`

具体改动：

- 把 `BasicLayout` 从根入口同步导入改成 `React.lazy(...)`
- 把 `RouteFallback` 从 `antd` `Spin` 改成轻量原生 loading UI，避免根入口静态依赖 `antd`
- 保持现有路由结构、`ProtectedRoute`、路径和权限壳层不变
- 把 `request.ts` 里对 `antd/message` 的同步导入改成按需动态加载
- 保留原有错误提示语义，只有在真正发生请求错误时才加载 `message`

## 根因

上一轮路由懒加载后，admin 仍然有明显的入口共享依赖负担。进一步检查后，根因集中在两个点：

1. `src/App.tsx` 仍然同步依赖 `BasicLayout`
   - `BasicLayout` 会带入 `ProLayout`、菜单图标和壳层相关依赖
   - 这让登录页之外的后台壳层代码继续参与入口装载

2. `src/services/request.ts` 同步依赖 `antd` 的 `message`
   - `request.ts` 被大量页面和壳层复用
   - 这会把通知 UI 依赖传播成共享 chunk，而不只是网络工具本身

## 验证

执行并通过：

- `pnpm.cmd lint`
- `pnpm.cmd build`

本轮构建结果：

- HTML 直载入口脚本: `dist/assets/index-uTRpM9yl.js` `232.67 kB`
- 当前最大的几个 JS chunk:
  - `dist/assets/CopyOutlined-hH8au5aW.js` `542.94 kB`
  - `dist/assets/request-F0RXdNsX.js` `357.30 kB`
  - `dist/assets/index-CSoGVxtC.js` `266.88 kB`
  - `dist/assets/index-CVWV1Mhi.js` `231.00 kB`
  - `dist/assets/index-DmKNh43u.js` `190.47 kB`
  - `dist/assets/BasicLayout-B2mrZC6b.js` `128.04 kB`
  - `dist/assets/Table-Btt59yzV.js` `125.77 kB`

和上一轮相比：

- 不再出现 `800 kB+ / 900 kB+` 的超大共享 chunk
- 最大 chunk 上限已降到 `542.94 kB`
- `BasicLayout` 已独立成单独路由级 chunk

## 风险与残余问题

- 仍有一个 `>500 kB` 的 chunk：`CopyOutlined-hH8au5aW.js`
- 构建仍提示 `ProForm` 相关跨 chunk re-export 风险，涉及：
  - `src/pages/ChangePassword/index.tsx`
  - `@ant-design/pro-table` 内部依赖链
- `request.ts` 的错误提示改成按需加载，用户侧行为基本不变，但提示会从“同步可用”变成“错误发生时异步拉起 message”
- 项目依然没有 `test` 脚本，本轮验证仍只有 `lint + build`

## 下一步建议

下一步不建议继续盲调 `manualChunks`，而是聚焦剩余最大块的真实来源：

1. 重点检查哪些页面或能力链路触发了 `CopyOutlined` / `Typography copyable` / `ProTable copyable`
2. 评估这些 copy 能力是否都必须进入共享层
3. 再决定是否做一轮“复制能力与表格能力的依赖收缩”
