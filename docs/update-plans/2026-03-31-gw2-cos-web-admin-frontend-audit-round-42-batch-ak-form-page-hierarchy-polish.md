# gw2_cos_web_admin Frontend Audit - Round 42

## Scope

- `src/pages/WvwGuildEdit/index.tsx`
- `src/pages/DataResourcesDirectory/index.tsx`

## Root Cause

- `WvwGuildEdit` 直接进入大表单，编辑者需要先阅读多个分区才知道当前页面是在新建还是编辑、是否招募中、团表与 FAQ 规模如何。
- `DataResourcesDirectory` 的创建 / 编辑 / 导入入口虽然功能完整，但字段级说明不足，分类、标签与全量 JSON 导入的影响边界不够前置。
- `DataResourcesDirectory` 还残留历史编码损坏字符串；这次在继续补表单说明时把原本就脆弱的坏行彻底暴露成了语法错误。

## Changes

### 1. WvW 招募编辑页补首屏上下文

- 在 `WvwGuildEdit` 首屏增加页内说明，明确区分：
  - 基础信息
  - 单页内容
  - 要求 / 团表 / 常见问题
- 增加 4 张摘要卡，前置展示：
  - 编辑模式
  - 招募状态
  - 团表 / FAQ 数量
  - 语音平台 / 行动卡数量

### 2. 资源目录页弹窗入口收口

- 创建、编辑、导入 3 个弹窗统一加宽：
  - create/edit `760`
  - import `820`
- 为资源目录弹窗补充字段级提示：
  - 分类字段说明归档影响
  - 标签字段说明搜索与展示影响
  - 导入 JSON 明确提示“全量替换”边界

### 3. 资源目录页历史乱码清理

- 直接修复了 `DataResourcesDirectory` 中从表格列到 3 个弹窗的损坏字符串。
- 同步把相关提示、删除确认、成功反馈、导入反馈和错误文案统一成稳定中文。
- 处理方式是只改可见文案和弹窗说明，不改：
  - 接口路径
  - 请求参数
  - CRUD 流程
  - `runSafeFollowUp` 跟随刷新逻辑

## Validation

- `pnpm.cmd validate`
  - passed
- `lint`
  - passed
- `build`
  - passed
- current largest chunk
  - `dist/assets/index-5wV1BAb9.js` `469.76 kB`

## Risks

- 这轮没有做浏览器级视觉回归，只做了 `lint + build` 级验证。
- `DataResourcesDirectory` 历史上存在较多编码噪声；本轮已修复当前编辑链路上的坏字符串，但仓库其它旧页仍可能残留同类问题。
- `gw2_cos_web_admin` 仍然没有 `test` 脚本。
