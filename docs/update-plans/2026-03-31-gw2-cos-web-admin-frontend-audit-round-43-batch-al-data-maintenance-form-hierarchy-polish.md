# gw2_cos_web_admin Frontend Audit - Round 43

## Scope

- `src/pages/DataFractalDailies/index.tsx`
- `src/pages/DataLegendaryBlueprints/index.tsx`

## Root Cause

- 这两页都已经具备完整的数据维护能力，但用户进入页面后会直接掉进表格和弹窗，首屏没有先说明：
  - 当前页面维护的是什么数据
  - 单条维护和整包导入分别适合什么场景
  - 哪些操作属于危险覆盖
- 两页同时残留了大量历史编码损坏文案，导致标题、按钮、弹窗、提示语和确认语义都不可维护。

## Changes

### 1. 碎层日常页首屏层级重建

- 为 `DataFractalDailies` 增加页内说明，明确：
  - 表格记录的是碎层层级与成就 ID 的映射
  - 单条新增 / 编辑适合小修
  - JSON 导入是整包覆盖
- 增加 4 张摘要卡，前置展示：
  - 日常条目数
  - 覆盖层级
  - 层级区间
  - 当前视图
- 为新增 / 编辑 / 导入 3 个弹窗增加更明确的字段说明、导入警告和稳定中文文案。

### 2. 传奇蓝图页首屏层级重建

- 为 `DataLegendaryBlueprints` 增加页内说明，明确区分：
  - 查看 JSON
  - 编辑 JSON
  - 导入单条（覆盖 / 新增）
  - 导入（全量覆盖）
- 增加 4 张摘要卡，前置展示：
  - 蓝图总量
  - 当前页分类数
  - 当前页世代数
  - 当前视图
- 重写相关弹窗和确认文案：
  - 全量覆盖确认
  - 单条导入说明
  - 编辑保存说明
  - JSON 校验失败提示

### 3. 历史乱码文案清理

- 两页的高频可见文案已统一成稳定中文，包括：
  - 页面标题 / 副标题
  - 表格列标题
  - 操作按钮
  - 成功 / 失败反馈
  - 导入说明
  - 校验提示

## Validation

- `pnpm.cmd validate`
  - passed
- `lint`
  - passed
- `build`
  - passed
- current largest chunk
  - `dist/assets/index-Bz-qiO7W.js` `469.76 kB`

## Risks

- 这轮没有做浏览器级视觉回归，只做了 `lint + build` 级验证。
- 这两页的摘要卡展示的是当前页面上下文，不是新增的后端统计口径。
- `gw2_cos_web_admin` 仍然没有 `test` 脚本。
