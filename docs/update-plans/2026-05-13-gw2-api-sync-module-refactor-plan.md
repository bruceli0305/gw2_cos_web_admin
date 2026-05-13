# GW2官方数据库模块精细化改版方案

## 背景

`GW2官方数据库` 是管理后台的数据运维入口，负责把 Guild Wars 2 官方 `/v2/*` 数据同步到本站后端缓存。本站业务可以消费这些缓存，但业务应用场景不作为数据采集、同步分组和管理视图的设计依据。

当前页面已具备基础能力：

- 查看可同步实体类型。
- 按 `type + lang` 查看同步状态。
- 按 `type + lang + q` 浏览本地缓存实体。
- 手动同步当前类型或多类型。
- 查看单条实体原始载荷。

但当前页面仍偏“接口调试页”，不适合作为长期数据运维工作台。后续需要在不破坏现有接口和数据契约的前提下，重构为面向运营和维护的精细化模块。

## 一、需求文档

### 1.1 目标用户

- 管理员：负责维护本站 GW2 官方数据缓存。
- 数据管理员：需要按官方数据域查看、同步和诊断本地缓存。
- 开发维护者：需要诊断某个 GW2 ID 的缓存内容、语言版本、同步批次和错误状态。

### 1.2 数据运维目标

1. 降低同步操作门槛，避免管理员直接面对无分组的英文类型列表。
2. 按官方 API 数据内容和维护特征组织类型，不让站内业务应用反向影响数据采集。
3. 增强同步状态可读性，能快速判断缺失、失败、运行中和过期数据。
4. 增加英文名称字段，仅作为现有缓存数据的补充展示和检索字段。
5. 保持现有 `Gw2ApiEntity.data` 为官方 API 原始响应，不把补充信息混入官方 payload。
6. 保持现有 RBAC 权限：读取走 `gw2data.read`，同步写入走 `gw2data.write`。

### 1.3 范围

本次规划覆盖：

- 管理台 `src/pages/DataGw2Api` 页面重构。
- 管理台 GW2 API 数据服务封装。
- 后端 `Gw2ApiEntity` 增加英文名称派生字段。
- 后端同步服务写入英文名称。
- 后端实体列表接口支持英文名称展示和检索。
- 历史中文缓存数据的英文名称补齐策略。

不覆盖：

- 不重写 GW2 API 官方网关 `/gw2v2/*`。
- 不改现有 `data` 原始载荷结构。
- 不实现游戏内 Tooltip 的完整客户端规则模拟。
- 不新增 npm 依赖。
- 不改变小程序、主站现有接口消费契约，除非后续明确需要展示英文名。

### 1.4 核心功能需求

#### R1 页面总览

页面顶部提供数据运维总览：

- 当前语言：`zh / en`
- 官方 build id。
- 总同步类型数。
- 已成功类型数。
- 失败类型数。
- 运行中类型数。
- 最近成功同步时间。
- 关键数据域缓存量：角色与战斗规则、物品与装备属性、PvP 基础配置。

#### R2 类型分组

同步分组只按官方 API 数据域划分，不按攻略、构筑、市场等站内业务页面划分。每个类型只属于一个主分组，业务应用不能改变采集范围和同步策略。

当前同步类型规划为 3 个分组：

- 角色与战斗规则：`professions`、`specializations`、`traits`、`skills`、`pets`、`legends`
- 物品与装备属性：`items`、`itemstats`
- PvP 基础配置：`pvp-amulets`、`pvp-heroes`、`pvp-ranks`
- PvP 官方不可用端点：`pvp-runes`、`pvp-sigils`、`pvp-rewardtracks`，仅诊断展示，不参与稳定一键同步。

每组展示：

- 组内类型数量。
- 成功 / 失败 / 未同步 / 运行中数量。
- 最近更新时间。
- 组级操作：同步整组、重试失败项。

#### R3 类型明细

选中一个类型后展示：

- 类型名。
- 官方端点和数据域说明。
- 当前语言。
- 状态：`idle / running / success / error`
- build id。
- startedAt / finishedAt / updatedAt。
- itemsTotal / itemsUpserted / itemsDeleted。
- errorMessage 完整内容。
- 操作：同步当前类型、查看实体、刷新状态。

#### R4 同步预设

提供明确按钮：

- 同步角色与战斗规则。
- 同步物品与装备属性。
- 同步 PvP 基础配置。
- 同步当前类型。
- 同步全部当前语言。
- 重试失败类型。

`prune` 选项必须保留，但需要显式说明：

- 开启后会删除当前 `type + lang` 下本次官方返回结果中不存在的旧缓存记录。
- 只影响本次选择的类型和语言。
- 默认行为保持与现有实现一致，避免改变历史运维习惯。

#### R5 实体浏览

实体浏览从页面附属表格升级为独立区域：

- 支持按 `type`、`lang`、`q` 筛选。
- `q` 同时搜索 `gw2Id`、`name`、`nameEn`。
- 表格展示：GW2 ID、名称、英文名称、类型、语言、更新时间。
- 单条查看使用 Drawer 展示 JSON。
- Drawer 中明确拆分元字段和原始 `data` 字段。

#### R6 英文名称

在现有数据基础上增加英文名称，仅用于辅助展示和检索：

- 新增字段：`nameEn?: string`
- `name` 仍表示当前 `lang` 的名称。
- `data` 仍保存官方 API 当前语言原始响应。
- 中文记录中 `nameEn` 保存同一 `type + gw2Id` 的英文名称。
- 英文记录中 `nameEn` 可等于 `name`。
- 不允许把英文名写入中文记录的 `name`。
- 不允许把英文名塞入 `data.name`。

### 1.5 验收标准

- 管理员能从页面上按官方数据域判断缓存是否齐全。
- 管理员能一键同步角色与战斗规则、物品与装备属性、PvP 基础配置。
- 管理员能看到当前类型中文名和英文名。
- 搜索 `主管古物`、`Relic of the Director`、`109351` 都能定位同一物品记录。
- 同步中文 `items` 后，中文记录包含 `nameEn`。
- `Gw2ApiEntity.data` 仍保持官方中文 payload。
- 现有 `/admin/v1/data/gw2-api/entities` 消费方不因新增字段而破坏。

## 二、设计文档

### 2.1 信息架构

页面重构为四个主区：

1. `Overview`
   - 只看整体健康度。
2. `Sync Plan`
   - 按官方 API 数据域分组执行同步。
3. `Type Detail`
   - 选中类型的状态和操作。
4. `Entity Browser`
   - 浏览、搜索、诊断本地缓存实体。

页面结构示意：

```text
----------------------------------------------------+
| GW2官方数据库                                      |
| [语言切换] [刷新状态] [高级同步]                 |
+----------------------------------------------------+
| Overview: build / success / error / running / ... |
+----------------------------------------------------+
| Sync Plan                                         |
| 角色与战斗规则 | 物品与装备属性 | PvP 基础配置       |
+----------------------------------------------------+
| Type Detail                                       |
| 当前类型状态、统计、错误、同步按钮                |
+----------------------------------------------------+
| Entity Browser                                    |
| 筛选 + 表格 + JSON Drawer                         |
+----------------------------------------------------+
```

### 2.2 前端模块拆分

建议拆分：

```text
src/pages/DataGw2Api/
  index.tsx
  components/
    Gw2ApiOverview.tsx
    Gw2SyncPlanPanel.tsx
    Gw2SyncTypeDetail.tsx
    Gw2EntityBrowser.tsx
    Gw2PayloadDrawer.tsx
  constants.ts
  types.ts
```

可选服务封装：

```text
src/services/gw2Data.ts
```

职责：

- `index.tsx`：状态编排、当前语言、当前类型、刷新。
- `constants.ts`：类型元数据、数据域分组、同步预设。
- `types.ts`：页面 DTO 类型。
- `Gw2ApiOverview`：全局统计。
- `Gw2SyncPlanPanel`：分组同步入口。
- `Gw2SyncTypeDetail`：单类型状态和操作。
- `Gw2EntityBrowser`：实体列表、搜索、分页。
- `Gw2PayloadDrawer`：JSON 详情查看。

### 2.3 官方 API 数据域分析

当前后端同步服务支持的类型来自 Guild Wars 2 官方 `/v2/*` 端点，按数据内容可以分为三类：

| 数据域 | 类型 | 官方端点 | 管理视角 |
| --- | --- | --- | --- |
| 角色与战斗规则 | `professions` | `/v2/professions` | 职业基础定义，数量少，适合和专精、技能、特性一起查看。 |
| 角色与战斗规则 | `specializations` | `/v2/specializations` | 专精定义，和职业、特性强相关。 |
| 角色与战斗规则 | `traits` | `/v2/traits` | 特性定义，数量中等，管理员需要按 ID、名称、职业关系检索。 |
| 角色与战斗规则 | `skills` | `/v2/skills` | 技能定义，数量较大，管理员需要重点查看名称、本地化和原始 payload。 |
| 角色与战斗规则 | `pets` | `/v2/pets` | Ranger 宠物定义，数量小，属于角色战斗规则补充。 |
| 角色与战斗规则 | `legends` | `/v2/legends` | Revenant 传奇姿态定义，数量小，属于角色战斗规则补充。 |
| 物品与装备属性 | `items` | `/v2/items` | 全量物品库，体量最大，应独立管理，避免被其他轻量同步误触发。 |
| 物品与装备属性 | `itemstats` | `/v2/itemstats` | 装备属性组合，数量小，但和物品装备数据属于同一查看域。 |
| PvP 基础配置 | `pvp-amulets` | `/v2/pvp/amulets` | PvP 护符配置，数量小，官方端点稳定可用。 |
| PvP 基础配置 | `pvp-heroes` | `/v2/pvp/heroes` | PvP 英雄与皮肤配置，官方端点稳定可用。 |
| PvP 基础配置 | `pvp-ranks` | `/v2/pvp/ranks` | PvP 等级和终结技配置，官方端点稳定可用。 |
| PvP 官方不可用端点 | `pvp-runes` | `/v2/pvp/runes` | 官方暴露但当前实测返回 503，仅诊断展示。 |
| PvP 官方不可用端点 | `pvp-sigils` | `/v2/pvp/sigils` | 官方暴露但当前实测返回 503，仅诊断展示。 |
| PvP 官方不可用端点 | `pvp-rewardtracks` | `/v2/pvp/rewardtracks` | 官方暴露但当前实测返回 503，仅诊断展示。 |

基于 2026-05-13 对官方 ID 列表的抽样请求，`items` 明显是最大数据集，`skills` 次之，`professions / pets / legends / pvp-amulets / pvp-heroes / pvp-ranks` 等属于小体量数据。`pvp-runes / pvp-sigils / pvp-rewardtracks` 抽样时官方端点返回 503，因此不纳入稳定一键同步。

结论：

- 不保留以站内页面或站内功能命名的同步分组。
- 不按站内使用场景拆分同步入口。
- 管理页只展示官方数据域、端点、同步状态、实体数量、更新时间和错误。
- `items` 必须独立于角色战斗规则分组，避免大体量物品库影响轻量数据同步。
- 稳定可用的 PvP 公共端点属于同一个独立分组；当前 503 的 PvP 端点只作为诊断项展示。

### 2.4 类型分组设计

分组原则：

- 以官方 API 数据域为主，不以站内页面为主。
- 每个同步类型只归属一个主分组。
- 站内业务应用不能决定数据采集范围、分组和同步策略。
- `items` 数据量最大，必须从角色与战斗规则中拆出，避免每次同步轻量战斗规则数据时误触发大体量物品同步。

```ts
type Gw2ApiTypeGroup = {
  key: string;
  title: string;
  description: string;
  types: Gw2ApiType[];
  syncable?: boolean;
};
```

初始分组：

```ts
const GW2_API_TYPE_GROUPS = [
  {
    key: 'characters-combat',
    title: '角色与战斗规则',
    description: '职业、专精、特性、技能，以及 Ranger 宠物和 Revenant 传奇，属于角色战斗规则数据。',
    types: ['professions', 'specializations', 'traits', 'skills', 'pets', 'legends'],
  },
  {
    key: 'items-equipment',
    title: '物品与装备属性',
    description: '全量物品库和装备属性组合。items 体量最大，应作为独立数据域重点管理。',
    types: ['items', 'itemstats'],
  },
  {
    key: 'pvp-config',
    title: 'PvP 基础配置',
    description: '官方当前稳定可获取的 PvP 公共配置。',
    types: ['pvp-amulets', 'pvp-heroes', 'pvp-ranks'],
  },
  {
    key: 'pvp-unavailable',
    title: 'PvP 官方不可用端点',
    description: '官方目录暴露但当前返回 503，仅用于查看和诊断，不参与一键同步。',
    types: ['pvp-runes', 'pvp-sigils', 'pvp-rewardtracks'],
    syncable: false,
  }
];
```

### 2.5 数据模型设计

后端模型 `Gw2ApiEntity` 增加：

```ts
nameEn?: string;
```

Mongoose schema：

```ts
nameEn: { type: String, default: '', index: true, trim: true }
```

索引：

```ts
Gw2ApiEntitySchema.index({ type: 1, lang: 1, nameEn: 1 });
```

保持不变：

- `type`
- `lang`
- `gw2Id`
- `name`
- `syncRunId`
- `data`

### 2.6 同步服务设计

同步 `lang=zh` 时：

1. 请求 ID 列表。
2. 按 chunk 请求中文详情。
3. 同一 chunk 请求英文详情。
4. 构建 `gw2Id -> englishName` map。
5. bulkWrite 中文记录：

```ts
{
  name: zhName,
  nameEn: enName,
  data: zhPayload
}
```

同步 `lang=en` 时：

```ts
{
  name: enName,
  nameEn: enName,
  data: enPayload
}
```

注意：

- 英文详情请求失败时，同步应显式失败，不能静默写空英文名。
- 如果官方英文 payload 中确实没有 name，可写空字符串，但需要保留同步成功。
- `items` 数量大，英文详情必须沿用 chunk 请求，不允许逐条请求。

### 2.7 接口设计

现有接口保留：

```text
GET  /admin/v1/data/gw2-api/types
GET  /admin/v1/data/gw2-api/sync-states
GET  /admin/v1/data/gw2-api/entities
GET  /admin/v1/data/gw2-api/entities/:type/:id
POST /admin/v1/data/gw2-api/sync
```

增强 `entities` 返回字段：

```ts
type EntityItem = {
  _id: string;
  type: string;
  lang: string;
  gw2Id: string;
  name: string;
  nameEn?: string;
  updatedAt: string;
};
```

增强 `entities` 搜索：

```ts
filter.$or = [
  { name: re },
  { nameEn: re },
  { gw2Id: re },
];
```

后续可新增聚合接口：

```text
GET  /admin/v1/data/gw2-api/overview
POST /admin/v1/data/gw2-api/sync-group
POST /admin/v1/data/gw2-api/retry-failed
POST /admin/v1/data/gw2-api/backfill-name-en
```

第一阶段不强制新增聚合接口，优先复用现有接口完成页面重构。

### 2.8 历史数据补齐设计

新增英文名称后，历史中文缓存需要补齐。

方案：

- 服务函数：`backfillGw2ApiEntityEnglishNames(type, lang = 'zh')`
- 查询当前 `type + lang=zh` 记录。
- 按 `gw2Id` 分批请求英文详情。
- 只更新 `nameEn`。
- 不更新 `name`。
- 不更新 `data`。
- 不更新 `syncRunId`。

管理台可提供动作：

```text
补全当前类型英文名称
补全当前分组英文名称
```

### 2.9 权限设计

保持现有 RBAC：

- 查看总览、状态、实体：`gw2data.read`
- 执行同步、补齐英文名：`gw2data.write`

前端只隐藏不可用操作，后端仍必须校验权限。

## 三、开发文档

### 3.1 开发顺序

#### Phase 1：前端布局重构

目标：不改后端同步核心逻辑。

任务：

1. 新增 `src/pages/DataGw2Api/constants.ts`。
2. 新增 `src/pages/DataGw2Api/types.ts`。
3. 抽出 `Gw2ApiOverview`。
4. 抽出 `Gw2SyncPlanPanel`。
5. 抽出 `Gw2SyncTypeDetail`。
6. 抽出 `Gw2EntityBrowser`。
7. 抽出 `Gw2PayloadDrawer`。
8. 保留现有接口调用。
9. 页面仍使用 `/admin/v1/data/gw2-api/*`。

验证：

```bash
npm.cmd run lint
npm.cmd run build
```

#### Phase 2：英文名称字段

后端任务：

1. `Gw2ApiEntity` schema 增加 `nameEn`。
2. `syncGw2ApiType` 在 chunk 内同时获取英文详情。
3. bulkWrite 写入 `nameEn`。
4. `/entities` select 增加 `nameEn`。
5. `/entities` 搜索增加 `nameEn`。
6. `/entities/:type/:id` 返回中自然包含 `nameEn`。

管理台任务：

1. `EntityItem` 增加 `nameEn`。
2. 实体表格展示英文名称列。
3. 搜索说明更新为“名称 / 英文名称 / GW2 ID”。
4. JSON Drawer 元字段区展示 `nameEn`。

验证：

```bash
# gw2_cos_nodejs
npm.cmd run build

# gw2_cos_web_admin
npm.cmd run lint
npm.cmd run build
```

数据验证：

1. 同步 `items / zh`。
2. 查询 `109351`。
3. 预期：

```json
{
  "name": "主管古物",
  "nameEn": "Relic of the Director",
  "data": {
    "name": "主管古物"
  }
}
```

#### Phase 3：历史数据补齐

后端任务：

1. 新增补齐服务函数。
2. 新增管理接口：

```text
POST /admin/v1/data/gw2-api/backfill-name-en
```

请求：

```json
{
  "types": ["items", "skills", "traits"],
  "lang": "zh"
}
```

响应：

```json
{
  "success": true,
  "results": [
    {
      "type": "items",
      "matched": 1000,
      "updated": 1000
    }
  ]
}
```

要求：

- 只更新 `nameEn`。
- 不更新 `data`。
- 不删除记录。
- 失败要返回明确错误。

管理台任务：

1. 增加“补全英文名称”操作。
2. 支持当前类型补齐。
3. 支持当前数据域分组补齐。

第一版实现约束：

- 补齐接口只查询本地已有 `type + lang` 记录的 `gw2Id`。
- 只更新 `nameEn`。
- 不修改 `name`、`data`、`syncRunId`。
- 当前官方返回 503 的 PvP 端点不参与分组补齐。

#### Phase 4：后端聚合接口

可选增强：

```text
GET /admin/v1/data/gw2-api/overview?lang=zh
```

返回：

```ts
type Gw2ApiOverview = {
  lang: 'zh' | 'en';
  buildId?: number;
  totalTypes: number;
  successTypes: number;
  errorTypes: number;
  runningTypes: number;
  staleTypes: number;
  keyCounts: Record<string, number>;
  updatedAt?: string;
};
```

该阶段不是第一版重构的阻塞项。

### 3.2 兼容策略

- 新增字段 `nameEn` 是可选字段，旧数据缺失时前端显示 `-`。
- 原有 `name` 字段含义不变。
- 原有接口路径不变。
- 原有同步请求体不变。
- 原有 `data` 结构不变。

### 3.3 风险与处理

| 风险 | 处理 |
| --- | --- |
| `items` 同步量大，英文详情请求使耗时增加 | 继续使用 chunk，请求间隔沿用现有 `chunkDelayMs` |
| 英文 API 临时失败导致中文同步失败 | 显式失败并记录 `errorMessage`，不写半成品 |
| 历史数据没有 `nameEn` | 提供补齐动作，前端缺失显示 `-` |
| `nameEn` 搜索慢 | 增加 `{ type, lang, nameEn }` 索引 |
| 管理员误开 prune | 页面明确提示影响范围 |

### 3.4 最小回归清单

后端：

- `npm.cmd run build`
- `GET /types`
- `GET /sync-states?lang=zh`
- `GET /entities?type=items&lang=zh&q=109351`
- `GET /entities?type=items&lang=zh&q=Relic`
- `POST /sync` 单类型同步

管理台：

- `npm.cmd run lint`
- `npm.cmd run build`
- 语言切换后状态刷新。
- 类型切换后实体表刷新。
- 分组同步按钮只提交预期类型。
- JSON Drawer 可打开和关闭。
- 英文名称缺失时不报错。

### 3.5 不做事项

- 不新增通用任务队列。
- 不把同步改成后台异步任务。
- 不引入虚假默认英文名。
- 不把英文名写入中文 `data.name`。
- 不在 UI 层硬编码某个物品的英文名。
