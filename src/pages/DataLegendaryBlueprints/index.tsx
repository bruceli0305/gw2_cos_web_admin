import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { PageContainer, ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
  type SelectProps,
} from 'antd';
import type { UIEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage, request } from '../../services/request';

type BlueprintListItem = {
  blueprintId: string;
  schemaVersion: string;
  updatedAtUtc?: string;
  name: string;
  groupKey?: string;
  groupName?: string;
  groupOrder?: number;
  generation?: string;
  iconItemId: number;
  tags: string[];
  branchCount: number;
  nodeCount: number;
  outputItemId?: number;
  outputQty?: number;
};

type BlueprintNodeForm = {
  nodeId?: string;
  itemId?: number;
  qty?: number;
  note?: string;
  children?: BlueprintNodeForm[];
};

type BlueprintBranchForm = {
  branchId?: string;
  name?: string;
  order?: number;
  description?: string;
  nodes?: BlueprintNodeForm[];
};

type BlueprintFormValues = {
  blueprintId?: string;
  name?: string;
  group?: {
    key?: string;
  };
  generation?: string;
  tags?: string[];
  output?: {
    itemId?: number;
    qty?: number;
  };
  branches?: BlueprintBranchForm[];
};

type BlueprintGroup = {
  key: string;
  name: string;
  order?: number;
  description?: string;
  count?: number;
};

type BlueprintListParams = {
  current?: number;
  pageSize?: number;
  q?: string;
  groupKey?: string;
  generation?: string;
  tag?: string;
};

type BlueprintListResp = {
  items: BlueprintListItem[];
  total: number;
};

type BlueprintWriteResp = {
  mode?: string;
  blueprintId: string;
};

type LegacyConvertResp = {
  oldScanned: number;
  inserted: number;
  updated: number;
  skipped: number;
  warningCount: number;
};

type LegacyDeleteResp = {
  deletedCount: number;
};

type Gw2ApiEntity = {
  gw2Id: string;
  name?: string;
  nameEn?: string;
  data?: {
    name?: string;
    icon?: string;
  };
};

type Gw2EntityListResp = {
  items: Gw2ApiEntity[];
  total: number;
  page: number;
  limit: number;
};

type Gw2EntityLookupResp = {
  items: Gw2ApiEntity[];
};

type ItemSelectOption = NonNullable<SelectProps<number>['options']>[number] & {
  value: number;
};

type TableSummary = {
  total: number;
  groups: number;
  currentView: string;
};

type ItemOptionPage = {
  options: ItemSelectOption[];
  total: number;
  page: number;
  limit: number;
};

const EMPTY_BRANCH: BlueprintBranchForm = {
  order: 1,
  nodes: [{ qty: 1, children: [] }],
};

const EMPTY_BLUEPRINT: BlueprintFormValues = {
  output: { qty: 1 },
  branches: [EMPTY_BRANCH],
};

const ITEM_PAGE_SIZE = 30;
const ITEM_OPTION_PAGE_CACHE = new Map<string, ItemOptionPage>();
const ITEM_OPTION_PAGE_IN_FLIGHT = new Map<string, Promise<ItemOptionPage>>();
const ITEM_OPTION_BY_ID = new Map<number, ItemSelectOption>();
const ITEM_OPTION_RESOLVED_IDS = new Set<number>();

function makeItemOption(entity: Gw2ApiEntity): ItemSelectOption | null {
  const itemId = Number(entity.gw2Id);
  if (!Number.isInteger(itemId) || itemId <= 0) return null;

  const name = entity.name || entity.data?.name || `#${itemId}`;
  const nameEn = entity.nameEn || '';
  const icon = entity.data?.icon;

  return {
    value: itemId,
    label: (
      <Space size={8}>
        {icon ? <img src={icon} alt="" style={{ width: 20, height: 20 }} /> : null}
        <span>{name}</span>
        <Typography.Text type="secondary">#{itemId}</Typography.Text>
        {nameEn ? <Typography.Text type="secondary">{nameEn}</Typography.Text> : null}
      </Space>
    ),
  };
}

function makeItemPlaceholderOption(itemId: number): ItemSelectOption {
  const cached = ITEM_OPTION_BY_ID.get(itemId);
  if (cached) return cached;
  const option = { value: itemId, label: `#${itemId}` };
  ITEM_OPTION_BY_ID.set(itemId, option);
  return option;
}

function mergeOptions(base: ItemSelectOption[], next: ItemSelectOption[]) {
  const map = new Map<number, ItemSelectOption>();
  [...base, ...next].forEach((option) => {
    map.set(Number(option.value), option);
  });
  return [...map.values()];
}

function rememberItemOptions(options: ItemSelectOption[]) {
  options.forEach((option) => {
    const itemId = Number(option.value);
    ITEM_OPTION_BY_ID.set(itemId, option);
    ITEM_OPTION_RESOLVED_IDS.add(itemId);
  });
}

async function loadItemOptionPage(search: string, page: number): Promise<ItemOptionPage> {
  const normalizedSearch = search.trim();
  const cacheKey = `${normalizedSearch}::${page}`;
  const cached = ITEM_OPTION_PAGE_CACHE.get(cacheKey);
  if (cached) return cached;

  const inFlight = ITEM_OPTION_PAGE_IN_FLIGHT.get(cacheKey);
  if (inFlight) return inFlight;

  const promise = request<Gw2EntityListResp>('/admin/v1/data/gw2-api/entities', {
    params: {
      type: 'items',
      lang: 'zh',
      q: normalizedSearch,
      page,
      limit: ITEM_PAGE_SIZE,
    },
  }).then((res) => {
    const options = res.items.map(makeItemOption).filter((option): option is ItemSelectOption => !!option);
    rememberItemOptions(options);
    const pageData = {
      options,
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
    ITEM_OPTION_PAGE_CACHE.set(cacheKey, pageData);
    return pageData;
  }).finally(() => {
    ITEM_OPTION_PAGE_IN_FLIGHT.delete(cacheKey);
  });

  ITEM_OPTION_PAGE_IN_FLIGHT.set(cacheKey, promise);
  return promise;
}

async function loadItemOptionsByIds(itemIds: number[]) {
  const ids = [...new Set(itemIds)]
    .filter((itemId) => Number.isInteger(itemId) && itemId > 0)
    .filter((itemId) => !ITEM_OPTION_RESOLVED_IDS.has(itemId));

  if (!ids.length) return;

  const res = await request<Gw2EntityLookupResp>('/admin/v1/data/gw2-api/entities/lookup', {
    params: {
      type: 'items',
      lang: 'zh',
      ids: ids.join(','),
    },
  });
  const options = res.items.map(makeItemOption).filter((option): option is ItemSelectOption => !!option);
  rememberItemOptions(options);
}

function collectNodeItemIds(nodes?: BlueprintNodeForm[]): number[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.flatMap((node) => [
    ...(typeof node.itemId === 'number' ? [node.itemId] : []),
    ...collectNodeItemIds(node.children),
  ]);
}

function collectBlueprintItemIds(values: BlueprintFormValues) {
  return [
    ...(typeof values.output?.itemId === 'number' ? [values.output.itemId] : []),
    ...(values.branches || []).flatMap((branch) => collectNodeItemIds(branch.nodes)),
  ];
}

function ItemSelect({ value, onChange }: { value?: number; onChange?: (value: number | undefined) => void }) {
  const [options, setOptions] = useState<ItemSelectOption[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const searchedRef = useRef(false);
  const searchTimerRef = useRef<number | null>(null);

  const loadOptions = useCallback(async (nextSearch: string, nextPage: number, replace: boolean) => {
    setLoading(true);
    try {
      const pageData = await loadItemOptionPage(nextSearch, nextPage);
      setOptions((current) => (replace ? pageData.options : mergeOptions(current, pageData.options)));
      setHasMore(pageData.page * pageData.limit < pageData.total);
      setPage(pageData.page);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!value) return;
    setOptions((current) => mergeOptions([makeItemPlaceholderOption(value)], current));
  }, [value]);

  const handleSearch = (nextSearch: string) => {
    setSearch(nextSearch);
    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = window.setTimeout(() => {
      searchedRef.current = true;
      void loadOptions(nextSearch, 1, true);
    }, 250);
  };

  const handlePopupScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    if (!hasMore || loading) return;
    if (target.scrollTop + target.offsetHeight < target.scrollHeight - 24) return;
    void loadOptions(search, page + 1, false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open || searchedRef.current) return;
    searchedRef.current = true;
    void loadOptions(search, 1, true);
  };

  return (
    <Select<number>
      showSearch
      allowClear
      value={value}
      options={options}
      loading={loading}
      filterOption={false}
      onSearch={handleSearch}
      onPopupScroll={handlePopupScroll}
      onOpenChange={handleOpenChange}
      onChange={(nextValue) => onChange?.(typeof nextValue === 'number' ? nextValue : undefined)}
      placeholder="输入中文名称或物品 ID"
    />
  );
}

const MAX_NODE_LEVEL = 5;
const NODE_LEVEL_STYLES = [
  { tagColor: 'blue', background: '#f8fafc', borderColor: '#d6e4ff' },
  { tagColor: 'green', background: '#f6ffed', borderColor: '#b7eb8f' },
  { tagColor: 'gold', background: '#fffbe6', borderColor: '#ffe58f' },
  { tagColor: 'cyan', background: '#e6fffb', borderColor: '#87e8de' },
  { tagColor: 'purple', background: '#f9f0ff', borderColor: '#d3adf7' },
];

function NodeTreeFields({ level = 0, name }: { level?: number; name: (string | number)[] }) {
  const displayLevel = level + 1;
  const levelStyle = NODE_LEVEL_STYLES[level] || NODE_LEVEL_STYLES[NODE_LEVEL_STYLES.length - 1];
  const canAddChild = displayLevel < MAX_NODE_LEVEL;

  return (
    <Form.List name={name}>
      {(nodeFields, nodeOps) => (
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          {nodeFields.map((nodeField, nodeIndex) => {
            return (
              <Card
                key={nodeField.key}
                size="small"
                title={(
                  <Space>
                    <Tag color={levelStyle.tagColor}>{`子节点 L${displayLevel}`}</Tag>
                    <Typography.Text type="secondary">#{nodeIndex + 1}</Typography.Text>
                  </Space>
                )}
                style={{
                  marginLeft: level * 24,
                  borderRadius: 8,
                  background: levelStyle.background,
                  borderColor: levelStyle.borderColor,
                }}
                extra={(
                  <Space>
                    <Button icon={<PlusOutlined />} onClick={() => nodeOps.add({ qty: 1, children: [] }, nodeIndex + 1)}>
                      同级节点
                    </Button>
                    <Button danger type="text" icon={<DeleteOutlined />} onClick={() => nodeOps.remove(nodeField.name)}>
                      删除
                    </Button>
                  </Space>
                )}
              >
                <Row gutter={8} align="middle">
                  <Col span={11}>
                    <Form.Item
                      name={[nodeField.name, 'itemId']}
                      label="节点物品"
                      rules={[{ required: true, message: '请选择节点物品' }]}
                    >
                      <ItemSelect />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item
                      name={[nodeField.name, 'qty']}
                      label="数量"
                      rules={[{ required: true, message: '请填写数量' }]}
                    >
                      <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={9}>
                    <Form.Item name={[nodeField.name, 'note']} label="备注">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>

                {canAddChild ? (
                  <NodeTreeFields level={level + 1} name={[nodeField.name, 'children']} />
                ) : (
                  <Typography.Text type="secondary">最多支持 5 级节点</Typography.Text>
                )}
              </Card>
            );
          })}
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => nodeOps.add({ qty: 1, children: [] })} block>
            {`添加子节点 L${displayLevel}`}
          </Button>
        </Space>
      )}
    </Form.List>
  );
}

export default function DataLegendaryBlueprintsPage() {
  const actionRef = useRef<ActionType>(null);
  const [form] = Form.useForm<BlueprintFormValues>();
  const [groupForm] = Form.useForm<BlueprintGroup>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>('');
  const [payloadOpen, setPayloadOpen] = useState(false);
  const [payload, setPayload] = useState<BlueprintFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [legacyConverting, setLegacyConverting] = useState(false);
  const [legacyDeleting, setLegacyDeleting] = useState(false);
  const [groups, setGroups] = useState<BlueprintGroup[]>([]);
  const [tableSummary, setTableSummary] = useState<TableSummary>({
    total: 0,
    groups: 0,
    currentView: '全部蓝图',
  });

  const loadGroups = useCallback(async () => {
    const res = await request<{ items: BlueprintGroup[] }>('/admin/v1/data/legendary-blueprints/groups');
    setGroups(res.items || []);
  }, []);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const openCreate = () => {
    setEditingId('');
    form.setFieldsValue(EMPTY_BLUEPRINT);
    setEditorOpen(true);
  };

  const openEditor = async (blueprintId: string) => {
    const res = await request<BlueprintFormValues>(`/admin/v1/data/legendary-blueprints/${encodeURIComponent(blueprintId)}`);
    const nextValues = {
      ...res,
      output: { qty: 1, ...res.output },
      branches: Array.isArray(res.branches) && res.branches.length ? res.branches : [EMPTY_BRANCH],
    };
    try {
      await loadItemOptionsByIds(collectBlueprintItemIds(nextValues));
    } catch (error) {
      message.warning(getErrorMessage(error, '本地物品信息加载失败，仅显示物品 ID'));
    }
    setEditingId(blueprintId);
    form.setFieldsValue(nextValues);
    setEditorOpen(true);
  };

  const handleSaveGroup = async () => {
    const values = await groupForm.validateFields();
    try {
      await request('/admin/v1/data/legendary-blueprints/groups', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      message.success(`已保存分组：${values.name}`);
      setGroupOpen(false);
      groupForm.resetFields();
      await loadGroups();
    } catch (error) {
      message.error(getErrorMessage(error, '分组保存失败'));
    }
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const url = editingId
        ? `/admin/v1/data/legendary-blueprints/${encodeURIComponent(editingId)}`
        : '/admin/v1/data/legendary-blueprints/upsert';
      const res = await request<BlueprintWriteResp>(url, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(values),
      });
      message.success(`${editingId ? '已保存' : res.mode === 'insert' ? '已新增' : '已更新'}：${res.blueprintId}`);
      setEditorOpen(false);
      actionRef.current?.reload();
      await loadGroups();
    } catch (error) {
      message.error(getErrorMessage(error, '蓝图保存失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleConvertLegacy = () => {
    Modal.confirm({
      title: '确认转换旧版蓝图？',
      content: '系统会保留旧数据，并按新版结构生成或更新 V3 蓝图。可重复执行，用于把旧数据重新转换到新版。',
      okText: '开始转换',
      cancelText: '取消',
      onOk: async () => {
        setLegacyConverting(true);
        try {
          const res = await request<LegacyConvertResp>('/admin/v1/data/legendary-blueprints/legacy/convert', {
            method: 'POST',
            body: JSON.stringify({ dryRun: false }),
          });
          message.success(
            `旧数据转换完成：扫描 ${res.oldScanned} 条，新增 ${res.inserted} 条，更新 ${res.updated} 条，跳过 ${res.skipped} 条，警告 ${res.warningCount} 条`
          );
          actionRef.current?.reload();
          await loadGroups();
        } catch (error) {
          message.error(getErrorMessage(error, '旧数据转换失败'));
        } finally {
          setLegacyConverting(false);
        }
      },
    });
  };

  const handleDeleteLegacy = () => {
    Modal.confirm({
      title: '确认删除旧版蓝图？',
      content: '只会删除 schemaVersion 不是 3.0 的旧版记录，新版蓝图不会被删除。删除前请确认新版转换结果已经检查完毕。',
      okText: '删除旧数据',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setLegacyDeleting(true);
        try {
          const res = await request<LegacyDeleteResp>('/admin/v1/data/legendary-blueprints/legacy', {
            method: 'DELETE',
          });
          message.success(`旧版蓝图已删除：${res.deletedCount} 条`);
          actionRef.current?.reload();
          await loadGroups();
        } catch (error) {
          message.error(getErrorMessage(error, '旧数据删除失败'));
        } finally {
          setLegacyDeleting(false);
        }
      },
    });
  };

  const columns: ProColumns<BlueprintListItem>[] = [
    { title: '关键词', dataIndex: 'q', hideInTable: true },
    { title: '分组标识', dataIndex: 'groupKey', hideInTable: true },
    { title: '世代', dataIndex: 'generation', hideInTable: true },
    { title: '标签', dataIndex: 'tag', hideInTable: true },
    { title: '蓝图 ID', dataIndex: 'blueprintId', width: 220, ellipsis: true, copyable: true, search: false },
    { title: '名称', dataIndex: 'name', ellipsis: true, search: false },
    {
      title: '版本',
      dataIndex: 'schemaVersion',
      width: 90,
      search: false,
      render: (_, record) => (
        <Tag color={record.schemaVersion === '3.0' ? 'green' : 'default'}>{record.schemaVersion || '-'}</Tag>
      ),
    },
    {
      title: '分组',
      dataIndex: 'groupName',
      width: 150,
      search: false,
      render: (_, record) => record.groupName ? <Tag color="blue">{record.groupName}</Tag> : '-',
    },
    { title: '世代', dataIndex: 'generation', width: 120, search: false, renderText: (value) => value || '-' },
    {
      title: '结构',
      search: false,
      width: 150,
      render: (_, record) => `${record.branchCount || 0} 分支 / ${record.nodeCount || 0} 节点`,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      search: false,
      render: (_, record) => (
        <Space wrap>
          {(record.tags || []).slice(0, 4).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </Space>
      ),
    },
    { title: '更新', dataIndex: 'updatedAtUtc', valueType: 'dateTime', width: 170, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 170,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={async () => {
              const res = await request<BlueprintFormValues>(
                `/admin/v1/data/legendary-blueprints/${encodeURIComponent(record.blueprintId)}`
              );
              setPayload(res);
              setPayloadOpen(true);
            }}
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            disabled={record.schemaVersion !== '3.0'}
            onClick={() => void openEditor(record.blueprintId)}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="传奇蓝图"
      subTitle="结构化维护新版传奇蓝图、分组、分支与多级节点。"
      extra={[
        <Button key="convertLegacy" loading={legacyConverting} onClick={handleConvertLegacy}>
          旧数据转换
        </Button>,
        <Button key="deleteLegacy" danger loading={legacyDeleting} onClick={handleDeleteLegacy}>
          旧数据删除
        </Button>,
        <Button key="group" icon={<PlusOutlined />} onClick={() => setGroupOpen(true)}>
          新增分组
        </Button>,
        <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增蓝图
        </Button>,
      ]}
    >
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic title="蓝图总量" value={tableSummary.total} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic title="分组数量" value={groups.length} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic title="当前视图" value={tableSummary.currentView} />
          </Card>
        </Col>
      </Row>

      <ProTable<BlueprintListItem>
        actionRef={actionRef}
        rowKey="blueprintId"
        cardBordered
        columns={columns}
        request={async (params) => {
          const { current, pageSize, q, groupKey, generation, tag } = params as BlueprintListParams;
          const res = await request<BlueprintListResp>('/admin/v1/data/legendary-blueprints', {
            params: {
              page: current || 1,
              limit: pageSize || 20,
              q: q || '',
              groupKey: groupKey || '',
              generation: generation || '',
              tag: tag || '',
            },
          });

          setTableSummary({
            total: res.total,
            groups: new Set(res.items.map((item) => item.groupKey).filter(Boolean)).size,
            currentView: q || groupKey || generation || tag ? '筛选中' : '全部蓝图',
          });

          return { data: res.items, total: res.total, success: true };
        }}
      />

      <Drawer
        title={editingId ? `编辑蓝图：${editingId}` : '新增传奇蓝图'}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        width={1060}
        destroyOnHidden
        extra={(
          <Space>
            <Button onClick={() => setEditorOpen(false)}>取消</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => void handleSave()}>
              保存
            </Button>
          </Space>
        )}
      >
        <Form form={form} layout="vertical" initialValues={EMPTY_BLUEPRINT}>
          <Card title="基本信息" size="small" style={{ marginBottom: 12, borderRadius: 8 }}>
            <Row gutter={12}>
              <Col span={editingId ? 12 : 24}>
                <Form.Item name="name" label="传奇名称" rules={[{ required: true, message: '请填写传奇名称' }]}>
                  <Input placeholder="例如：永恒" />
                </Form.Item>
              </Col>
              {editingId ? (
                <Col span={12}>
                  <Form.Item label="蓝图 ID">
                    <Typography.Text copyable>{editingId}</Typography.Text>
                  </Form.Item>
                </Col>
              ) : null}
              <Col span={12}>
                <Form.Item name={['group', 'key']} label="传奇分组" rules={[{ required: true, message: '请选择传奇分组' }]}>
                  <Select
                    placeholder="选择已维护的分组"
                    options={groups.map((group) => ({
                      value: group.key,
                      label: `${group.name} (${group.key})`,
                    }))}
                    dropdownRender={(menu) => (
                      <>
                        {menu}
                        <div style={{ padding: 8 }}>
                          <Button type="link" icon={<PlusOutlined />} onClick={() => setGroupOpen(true)}>
                            新增分组
                          </Button>
                        </div>
                      </>
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="generation" label="世代">
                  <Input placeholder="Gen 1 / Gen 2 / PvE 护甲" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="tags" label="标签">
                  <Select mode="tags" tokenSeparators={[',', '，', ' ']} placeholder="输入后回车" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="产出物品" size="small" style={{ marginBottom: 12, borderRadius: 8 }}>
            <Row gutter={12}>
              <Col span={18}>
                <Form.Item name={['output', 'itemId']} label="物品" rules={[{ required: true, message: '请选择产出物品' }]}>
                  <ItemSelect />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name={['output', 'qty']} label="数量" rules={[{ required: true, message: '请填写数量' }]}>
                  <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Form.List name="branches">
            {(branchFields, branchOps) => (
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                {branchFields.map((branchField, branchIndex) => (
                  <Card
                    key={branchField.key}
                    title={`分支 ${branchIndex + 1}`}
                    size="small"
                    style={{ borderRadius: 8 }}
                    extra={(
                      <Button danger type="text" icon={<DeleteOutlined />} onClick={() => branchOps.remove(branchField.name)}>
                        删除分支
                      </Button>
                    )}
                  >
                    <Row gutter={12}>
                      <Col span={8}>
                        <Form.Item
                          name={[branchField.name, 'name']}
                          label="分支名称"
                          rules={[{ required: true, message: '请填写分支名称' }]}
                        >
                          <Input placeholder="例如：前置 / 礼赠 / 货币" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name={[branchField.name, 'branchId']} label="分支标识">
                          <Input placeholder="precursor" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name={[branchField.name, 'order']} label="排序">
                          <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={24}>
                        <Form.Item name={[branchField.name, 'description']} label="备注">
                          <Input.TextArea rows={2} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <NodeTreeFields name={[branchField.name, 'nodes']} />
                  </Card>
                ))}
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => branchOps.add({ order: branchFields.length + 1, nodes: [{ qty: 1, children: [] }] })}
                  block
                >
                  添加分支
                </Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Drawer>

      <Modal
        title="新增 / 更新传奇分组"
        open={groupOpen}
        onCancel={() => setGroupOpen(false)}
        onOk={() => void handleSaveGroup()}
        okText="保存"
        destroyOnHidden
      >
        <Form form={groupForm} layout="vertical">
          <Form.Item name="name" label="分组名称" rules={[{ required: true, message: '请填写分组名称' }]}>
            <Input placeholder="例如：传奇武器" />
          </Form.Item>
          <Form.Item name="key" label="分组标识">
            <Input placeholder="legendary-weapons；不填时后端按名称生成" />
          </Form.Item>
          <Form.Item name="order" label="排序">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新版蓝图 JSON"
        open={payloadOpen}
        onCancel={() => setPayloadOpen(false)}
        onOk={() => setPayloadOpen(false)}
        width={920}
      >
        <pre style={{ maxHeight: 560, overflow: 'auto', background: '#f6f6f6', padding: 12 }}>
          {JSON.stringify(payload, null, 2)}
        </pre>
      </Modal>
    </PageContainer>
  );
}
