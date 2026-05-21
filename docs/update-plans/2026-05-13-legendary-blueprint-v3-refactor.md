# 传奇蓝图 V3 重构说明

## 目标

传奇蓝图从旧版自动展开 JSON 升级为管理员可手动维护的轻量结构。新版只服务后续数据维护和迁移，不兼容旧版蓝图结构。

## 分组模型

传奇分组独立维护，不再只从蓝图里派生。

```json
{
  "key": "legendary-weapons",
  "name": "传奇武器",
  "order": 10,
  "description": "可选说明"
}
```

管理台可以手动新增或更新分组。蓝图保存时必须选择一个已存在分组，避免因为手误产生散乱分组。

## 蓝图结构

```json
{
  "schemaVersion": "3.0",
  "blueprintId": "legendary.weapon.example",
  "type": "LEGENDARY_BLUEPRINT",
  "updatedAtUtc": "2026-05-13T00:00:00.000Z",
  "name": "传奇名称",
  "group": {
    "key": "legendary-weapons",
    "name": "传奇武器",
    "order": 10
  },
  "generation": "Gen 1",
  "tags": ["weapon"],
  "output": {
    "type": "item",
    "itemId": 30698,
    "qty": 1
  },
  "branches": [
    {
      "branchId": "precursor",
      "name": "前置",
      "order": 1,
      "description": "可选备注",
      "nodes": [
        {
          "nodeId": "precursor:item:29185:1",
          "itemId": 29185,
          "qty": 1,
          "note": "可选备注",
          "children": [
            {
              "nodeId": "precursor:item:19721:1.1",
              "itemId": 19721,
              "qty": 250,
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

## 规则

- `name`、`group.key`、`output.itemId`、`branches[]` 必填。
- 新增蓝图时 `blueprintId` 由系统生成，格式为 `legendary.<groupKey>.<outputItemId>`；管理台不提供手动录入。
- `group.key` 必须对应已维护的传奇分组。
- 分支至少包含一个子节点。
- 节点支持多级 `children` 嵌套，最多 5 级。
- 节点只保存管理员维护所需字段：`itemId`、`qty`、可选 `note`、可选 `children`。
- 后端会递归校验 `output.itemId` 和所有节点 `itemId` 是否存在于本站 `items/zh` 官方数据库。
- 后端会递归统计 `nodeCount`。
- 旧版 `root`、旧版扁平 `nodes`、`recipe`、`sources`、`stages` 等派生字段不再进入新版结构。

## 管理台变更

- 传奇蓝图页改为结构化维护表单。
- 支持手动新增或更新传奇分组。
- 蓝图表单中分组通过下拉选择，不能随意输入未维护分组。
- 蓝图 ID 不允许手动录入；编辑时只读展示当前系统 ID。
- 支持新增、编辑、查看新版 JSON。
- 支持按蓝图 ID、名称、分组筛选。
- 支持设置世代、标签、产出物品、分支。
- 分支节点改为递归树形编辑器。
- 所有节点统一称为子节点，不再区分上层节点命名。
- 不同层级子节点通过缩进、背景色和 `子节点 L1-L5` 标签区分。
- 产出物品与节点物品使用本站 `GW2 官方数据库` 的 items 数据搜索。
- 物品下拉支持输入中文名或物品 ID，并在滚动到底部时继续加载下一页。

## 后端变更

- 新增 `LegendaryBlueprintGroup` 分组集合。
- `LegendaryBlueprint` 增加：
  - `groupKey`
  - `groupName`
  - `groupOrder`
  - `branchCount`
  - `nodeCount`
- `GET /admin/v1/data/legendary-blueprints/groups` 返回已维护分组和每组蓝图数量。
- `POST /admin/v1/data/legendary-blueprints/groups` 新增或更新分组。
- `PUT /admin/v1/data/legendary-blueprints/:id` 只接受新版结构。
- `POST /admin/v1/data/legendary-blueprints/upsert` 只接受新版结构。
- `POST /admin/v1/data/legendary-blueprints/import` 只接受新版结构数组或 `{ "items": [] }`，且空数组不会清空现有蓝图。

## 后续迁移

旧版数据迁移不在本次兼容范围内。后续迁移脚本应把每个旧蓝图转换为新版结构：

1. 先生成或维护目标传奇分组。
2. 根据旧 `display.name` 或输出物品生成 `name`。
3. 根据旧 `display.category`、`display.generation` 或人工规则映射 `group.key`。
4. 根据旧根节点的一层或人工配置生成 `branches`。
5. 需要体现制作层级时，把节点写入递归 `children`，不要恢复旧版冗余派生树。
6. 只保留管理员需要维护的节点物品、数量和备注。
7. 导入前先确保 `GW2 官方数据库` 已同步完整 `items/zh`。

## 已执行转换

本地 MongoDB 已执行：

```bash
npm run migrate:legendary:v3
```

执行结果：

- 旧版蓝图扫描：202 条
- 新版 V3 蓝图生成：202 条
- 旧版蓝图保留：202 条
- 当前新旧共存总数：404 条
- 自动创建分组：7 个

转换脚本会保留旧记录，新增或更新系统生成 ID 的 V3 记录。V3 ID 格式为：

```text
legendary.<groupKey>.<outputItemId>
```

管理台列表会同时展示旧版和新版。旧版记录只允许查看 JSON，不允许用 V3 表单编辑；新版记录可编辑。后续确认 V3 数据无误后，再单独执行旧版批量清理。

转换警告主要来自：

- 旧树超过 5 级，按当前后台限制停止继续展开。
- 旧版货币、成就等非物品节点被跳过。
