# Round 37 - Batch AF - 中文化收尾与 WvW 单权限菜单入口修复

## 背景

用户提出两条明确问题：

1. 后台仍有一批页面保留英文可见文案，需要继续统一为中文。
2. 当新管理员只被分配 `wvwGuilds.read` 这类单个子页面权限时，侧边栏没有可进入的战场公会菜单入口。

这轮继续遵守既有约束：

- 最小改动
- 不新增依赖
- 保持现有路由、权限键、接口契约和页面结构不变

## 根因

### 1. WvW 单权限用户无法从菜单进入页面

问题不在 RBAC 权限本身，而在后台菜单分组的呈现方式：

- 侧边栏按“社区内容 / 翻译与词典 / 游戏数据 / 权限与审计”做了父级分组。
- 经过权限过滤后，如果某个分组只剩一个可访问子页面，当前结构仍然保留父分组节点。
- 对于只持有 `wvwGuilds.read` 这类单权限的新用户，父分组会留下，但不会形成稳定、直接可点击的最终入口，导致看起来“没有子菜单可进”。

### 2. 后台中英混用

根因不是单个页面漏改，而是前几轮语言统一主要覆盖了：

- 登录页 / 改密页
- 壳层菜单
- 首页看板
- 部分高频列表页

但仍有一些菜单直达页、详情页和状态提示保留历史英文文案，特别是：

- WvW 公会目录
- 管理员账号
- 交易所观察
- 推荐资源 / 黑话词典 / 角色权限中的零散提示词

## 本轮改动

### 1. 修复单权限菜单入口

文件：

- `src/layouts/BasicLayout.tsx`

处理方式：

- 保留当前按业务域分组的菜单架构。
- 在权限过滤后，若某个父分组没有自身路由、没有自身权限要求、且只剩一个可访问子页面，则直接将该子页面提升为最终菜单项。

结果：

- 只拥有 `wvwGuilds.read` 的用户，不再被卡在空分组上。
- 菜单仍然兼容多权限用户的分组展示。
- 没有改任何权限键，也没有改路由路径。

### 2. 继续把高频可见文案改成中文

本轮累计收口到中文的页面与壳层包括：

- `src/App.tsx`
- `src/layouts/BasicLayout.tsx`
- `src/pages/UserList/index.tsx`
- `src/pages/Audit/index.tsx`
- `src/pages/ContentRaids/index.tsx`
- `src/pages/ContentPvp/index.tsx`
- `src/pages/Translations/index.tsx`
- `src/pages/DataResourcesDirectory/index.tsx`
- `src/pages/DataMarketWatch/index.tsx`
- `src/pages/DataResourcesRecommended/index.tsx`
- `src/pages/RbacAdminUsers/index.tsx`
- `src/pages/RbacRoles/index.tsx`
- `src/pages/Slang/index.tsx`
- `src/pages/WvwGuilds/index.tsx`
- `src/pages/WvwGuildEdit/index.tsx`

重点变化：

- 管理员账号页改为完整中文状态、按钮、弹窗、错误提示。
- 战场公会目录页改为完整中文标题、筛选、表格列、操作与删除确认。
- 交易所观察页改为完整中文标题、操作按钮、说明区、错误提示、任务记录、弹窗和候选项说明。
- WvW 公会编辑页把仍残留的字段标签如 `Slug / Tag / Region / Hero / FAQ` 收为中文。
- 推荐资源、黑话词典、角色权限页中残留的 `Unable to load...`、`Super / Normal`、`Tags / HOT` 等可见词也一并收口。

## 为什么这样改

- 菜单问题优先修根因，不去碰 RBAC，也不去新增“专门给单权限用户的特殊菜单”分支。
- 中文化继续沿用现有页面结构，只替换可见文案，不改字段名、不改接口、不改表单提交流程。
- 对编码历史较重、`apply_patch` 难以稳定命中的个别文件，使用最窄的 UTF-8 字符串替换完成文案修正，避免扩大改动面。

## 验证

已执行：

- `pnpm.cmd validate`

结果：

- `pnpm lint` 通过
- `pnpm build` 通过

当前构建结果：

- 最大 chunk：`dist/assets/index-BjNyeXIc.js` `469.76 kB`
- 没有重新触发 `>500 kB` 告警

## 残余风险

1. 本轮已经覆盖菜单直达页和高频页面，但后台仍可能存在少量深层页面保留英文技术词，例如 `GW2 API`、`JSON`、`URL`、`RSS`、`EU/NA`、`WvW/PvP` 这类业务或技术缩写；这些本轮未强行去英文。
2. 菜单单子页提升逻辑是前端展示层修复，依赖当前 `ProLayout` 的路由渲染行为；虽然构建通过，但仍建议用“只授予 `wvwGuilds.read` 的测试账号”做一次人工菜单回归。
3. `gw2_cos_web_admin` 目前仍无自动化 `test` 脚本，这轮验证仍以 `lint + build` 为主。
