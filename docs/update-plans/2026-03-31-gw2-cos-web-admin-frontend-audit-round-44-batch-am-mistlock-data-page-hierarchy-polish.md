# gw2_cos_web_admin Frontend Audit - Round 44

## Scope

- `src/pages/DataMistlockInstabilities/index.tsx`
- `src/pages/DataMistlockRotations/index.tsx`

## Root Cause

- 这两页都不是单纯的“表格 + 按钮”页面，而是同时承担：
  - 上游同步
  - 离线 JSON 更新
  - 手工补字段
  - 手工覆盖轮换
  - 自动校准
- 但首屏没有先解释这些入口各自的边界，用户一进页面就直接落到表格或弹窗里，必须先读代码语义才知道该点哪个按钮。
- 两页还残留大量历史编码损坏文案，导致标题、按钮、成功提示、错误提示和弹窗说明都不可维护。

## Changes

### 1. 碎层词缀页首屏信息前置

- 为 `DataMistlockInstabilities` 增加页内说明，明确：
  - 同步 Invisi 的作用
  - 后台编辑只补充中文字段和图标
  - 粘贴 JSON 更新只用于离线同步
- 增加 4 张摘要卡，前置展示：
  - 词缀总量
  - 当前启用
  - 图标已补全
  - 当前视图
- 编辑弹窗补了字段级说明；离线 JSON 弹窗补了明确的输入边界提示。

### 2. 碎层词缀轮换页首屏信息前置

- 为 `DataMistlockRotations` 增加页内说明，明确：
  - 同步 Invisi 会跳过 `manual`
  - 自动校准的输入与用途
  - 粘贴 JSON 更新的定位
- 增加 4 张摘要卡，前置展示：
  - 当前页条目数
  - 手动覆盖数量
  - `rotationOffset`
  - 当前视图
- 自动校准、手工覆盖、离线同步 3 个弹窗都补了说明和风险提示。

### 3. 历史乱码文案清理

- 两页的高频可见文案已统一成稳定中文，包括：
  - 页面标题 / 副标题
  - 表格列标题
  - 操作按钮
  - 同步反馈
  - 校准反馈
  - JSON 校验失败提示
  - 弹窗说明

## Validation

- `pnpm.cmd validate`
  - passed
- `lint`
  - passed
- `build`
  - passed
- current largest chunk
  - `dist/assets/index-DPGdz5Ih.js` `469.76 kB`

## Risks

- 这轮没有做浏览器级视觉回归，只做了 `lint + build` 级验证。
- 词缀 / 轮换页的摘要卡展示的是当前页面上下文，不是新增后端统计口径。
- `gw2_cos_web_admin` 仍然没有 `test` 脚本。
