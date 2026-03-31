# gw2_cos_web_admin Frontend Audit - Round 46

## Scope

- `src/pages/WvwGuilds/index.tsx`
- `src/pages/DataResourcesRecommended/index.tsx`

## Root Cause

- `WvwGuilds` 仍残留整段历史编码损坏文案，导致筛选提示、表格列、操作文案和删除确认都不可维护。
- `DataResourcesRecommended` 还停留在旧的泛化页面语义里：
  - 副标题过于笼统
  - 删除确认缺少影响说明
  - 导入弹窗没有明确“覆盖当前推荐位”的风险边界
- 这两页都还缺少与当前后台壳层一致的首屏说明和摘要层，用户进入页面后需要先读表格和弹窗才能理解页面职责。

## Changes

### 1. WvW 公会目录页一致性收口

- 重写 `WvwGuilds` 的可见文案为稳定中文，包括：
  - 筛选提示
  - 表格列标题
  - 按钮文案
  - 删除确认
  - 页头文案
- 增加页内说明，明确：
  - 这里维护的是社区公开招募目录
  - 编辑页和前台落地页的关系
  - 删除条目的实际影响
- 增加 4 张摘要卡，前置展示：
  - 目录总量
  - 招募中数量
  - 欧服条目数量
  - 当前视图

### 2. 推荐资源页确认框 / 导入语义收口

- 为 `DataResourcesRecommended` 增加页内说明，明确：
  - 这里维护的是前台推荐资源区块
  - 单条编辑和整包导入的使用边界
  - 删除 / 覆盖导入会直接影响前台推荐位
- 增加 4 张摘要卡，前置展示：
  - 推荐总量
  - 热门条目数
  - 资源类型数
  - 当前视图
- 为删除确认补充影响说明。
- 为创建 / 编辑 / 导入弹窗补充字段说明、导入警告和更清晰的中文文案。

## Validation

- `pnpm.cmd validate`
  - passed
- `lint`
  - passed
- `build`
  - passed
- current largest chunk
  - `dist/assets/index-BzOykQVX.js` `469.76 kB`

## Risks

- 这轮没有做浏览器级视觉回归，只做了 `lint + build` 级验证。
- 两页摘要卡展示的是当前查询结果对应的上下文，不是新增的全局统计接口。
- `gw2_cos_web_admin` 仍然没有 `test` 脚本。
