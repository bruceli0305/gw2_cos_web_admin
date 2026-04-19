import {
  ModalForm,
  PageContainer,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { Button, Card, Col, Popconfirm, Row, Space, Statistic, Tag, message } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageNoticeAlert } from '../../components/listPageState';
import { getErrorMessage, request } from '../../services/request';

type BossDirectoryItem = {
  _id: string;
  code: string;
  name: string;
  line: string;
  contentType: 'raid' | 'strike';
  isPermanentMissing: boolean;
  sortOrder: number;
};

type RotationBoss = Omit<BossDirectoryItem, '_id'>;

type Item = {
  _id: string;
  rotationIndex: number;
  bossCodes: string[];
  bossNames: string[];
  bosses: RotationBoss[];
  unresolvedBossCodes?: string[];
  unresolvedBossNames?: string[];
  updatedAt?: string | null;
};

type RotationConfig = {
  key: string;
  baseDate: string;
  weekStart: 'monday';
  cycleLength: number;
  updatedAt?: string | null;
};

type ListResp = {
  items: Item[];
};

type DirectoryResp = {
  items: BossDirectoryItem[];
};

type ImportResp = {
  itemsInserted: number;
  skipped: number;
};

type RotationFormValues = {
  rotationIndex?: number;
  bossCodes?: string[];
};

type ConfigFormValues = {
  baseDate?: string;
  weekStart?: 'monday';
  cycleLength?: number;
};

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('zh-CN', { hour12: false });
}

export default function DataBossRotationsPage() {
  const actionRef = useRef<ActionType>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [directoryItems, setDirectoryItems] = useState<BossDirectoryItem[]>([]);
  const [config, setConfig] = useState<RotationConfig | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [current, setCurrent] = useState<Item | null>(null);

  const fetchConfig = async () => request<RotationConfig>('/admin/v1/data/boss-rotations/config');
  const fetchDirectory = async () => request<DirectoryResp>('/admin/v1/data/boss-directory');

  const refreshConfig = async () => {
    const res = await fetchConfig();
    setConfig(res || null);
    return res;
  };

  const refreshDirectory = async () => {
    const res = await fetchDirectory();
    const nextItems = res.items || [];
    setDirectoryItems(nextItems);
    return nextItems;
  };

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        const [nextConfig, nextDirectory] = await Promise.all([fetchConfig(), fetchDirectory()]);
        if (!active) return;
        setConfig(nextConfig || null);
        setDirectoryItems(nextDirectory.items || []);
      } catch {
        if (!active) return;
        setConfig(null);
        setDirectoryItems([]);
      }
    }

    void loadInitialData();

    return () => {
      active = false;
    };
  }, []);

  const bossOptions = useMemo(
    () =>
      directoryItems.map((item) => ({
        label: `${item.name} (${item.code})`,
        value: item.code,
      })),
    [directoryItems]
  );

  const summary = useMemo(() => {
    const uniqueBossCodes = new Set<string>();
    for (const item of items) {
      for (const bossCode of item.bossCodes || []) uniqueBossCodes.add(bossCode);
    }

    return {
      total: items.length,
      cycleLength: config?.cycleLength ?? '-',
      uniqueBosses: uniqueBossCodes.size,
      baseDate: config?.baseDate ?? '-',
    };
  }, [config, items]);

  const columns: ProColumns<Item>[] = [
    { title: '轮换序号', dataIndex: 'rotationIndex', width: 100, search: false },
    {
      title: 'Boss 列表',
      dataIndex: 'bossCodes',
      search: false,
      render: (_, record) => (
        <Space size={[4, 4]} wrap>
          {(record.bosses || []).map((boss) => (
            <Tag key={`${record._id}-${boss.code}`} color={boss.contentType === 'raid' ? 'blue' : 'purple'}>
              {boss.name}
            </Tag>
          ))}
          {(record.unresolvedBossCodes || []).map((code) => (
            <Tag key={`${record._id}-missing-code-${code}`} color="error">
              未解析 code: {code}
            </Tag>
          ))}
          {(record.unresolvedBossNames || []).map((name) => (
            <Tag key={`${record._id}-missing-name-${name}`} color="error">
              未解析名称: {name}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Boss 数量',
      dataIndex: 'bossCount',
      width: 100,
      search: false,
      render: (_, record) => record.bossCodes?.length || 0,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 180,
      search: false,
      render: (_, record) => formatDateTime(record.updatedAt),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            onClick={() => {
              setCurrent(record);
              setEditOpen(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这条轮换记录吗？"
            description="删除后，该 rotationIndex 将不再参与后续周常计算。"
            onConfirm={async () => {
              await request(`/admin/v1/data/boss-rotations/items/${record._id}`, { method: 'DELETE' });
              message.success('条目已删除');
              actionRef.current?.reload();
            }}
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="副本 Boss 轮换"
      subTitle="维护 raid + strike 共用的轮换表和基准配置，当前主存储字段为 bossCodes。"
      extra={[
        <Button key="config" onClick={() => setConfigOpen(true)}>
          编辑配置
        </Button>,
        <Button key="create" type="primary" disabled={!directoryItems.length} onClick={() => setCreateOpen(true)}>
          新增轮换日
        </Button>,
        <Button key="import" onClick={() => setImportOpen(true)}>
          导入 JSON（全量替换）
        </Button>,
      ]}
    >
      <PageNoticeAlert
        type="info"
        message="本页维护副本 Boss 轮换规则"
        description={(
          <div>
            <div>1. 轮换项现在按 `bossCodes` 保存，目录名称改动不会打断已有轮换关系。</div>
            <div>2. 兼容旧导入格式：JSON 仍可传 `bossNames`，后端会按当前 Boss 目录解析成稳定 code。</div>
            <div>3. `weekStart` 目前固定为欧服语义的 `monday`，继续沿用你当前这套第三方规则。</div>
          </div>
        )}
        marginBottom={12}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="轮换条目" value={summary.total} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前轮换表中已录入的 rotationIndex 条目数。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="周期长度" value={summary.cycleLength} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>用于约束 rotationIndex 上限的循环周期长度。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="覆盖 Boss 数" value={summary.uniqueBosses} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前轮换表中涉及到的唯一 bossCodes 数量。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="基准日期" value={summary.baseDate} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>后续计算 rotationIndex 时使用的起始日期。</div>
          </Card>
        </Col>
      </Row>

      <Card size="small" variant="borderless" style={{ marginBottom: 16, borderRadius: 20 }}>
        <Space size={12} wrap>
          <Tag color="blue">key: {config?.key || 'boss-weekly'}</Tag>
          <Tag color="gold">weekStart: {config?.weekStart || 'monday'}</Tag>
          <Tag color="purple">cycleLength: {config?.cycleLength ?? '-'}</Tag>
          <Tag color="green">baseDate: {config?.baseDate ?? '-'}</Tag>
          <Tag>Boss 目录条目: {directoryItems.length}</Tag>
          <span style={{ color: '#64748b' }}>最后更新：{formatDateTime(config?.updatedAt)}</span>
        </Space>
      </Card>

      <ProTable<Item>
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        search={false}
        columns={columns}
        request={async () => {
          const res = await request<ListResp>('/admin/v1/data/boss-rotations');
          const nextItems = res.items || [];
          setItems(nextItems);
          return { data: nextItems, success: true };
        }}
      />

      <ModalForm<ConfigFormValues>
        title="编辑轮换配置"
        open={configOpen}
        onOpenChange={setConfigOpen}
        modalProps={{ destroyOnHidden: true, width: 640 }}
        initialValues={{
          baseDate: config?.baseDate,
          weekStart: config?.weekStart || 'monday',
          cycleLength: config?.cycleLength,
        }}
        onFinish={async (values) => {
          await request('/admin/v1/data/boss-rotations/config', {
            method: 'PUT',
            body: JSON.stringify(values),
          });
          message.success('配置已更新');
          await refreshConfig();
          return true;
        }}
      >
        <ProFormText
          name="baseDate"
          label="基准日期"
          rules={[{ required: true }]}
          extra="使用 YYYY-MM-DD，例如 2026-03-25。"
        />
        <ProFormSelect
          name="weekStart"
          label="周起始"
          rules={[{ required: true }]}
          options={[{ label: '周一（欧服）', value: 'monday' }]}
        />
        <ProFormDigit
          name="cycleLength"
          label="周期长度"
          rules={[{ required: true }]}
          min={1}
          max={366}
          extra="当前第三方规则是 12 天循环。"
        />
      </ModalForm>

      <ModalForm<RotationFormValues>
        title="新增轮换条目"
        open={createOpen}
        onOpenChange={setCreateOpen}
        modalProps={{ destroyOnHidden: true, width: 720 }}
        onFinish={async (values) => {
          if (!values.bossCodes?.length) {
            message.error('请至少选择一个 Boss');
            return false;
          }
          await request('/admin/v1/data/boss-rotations/items', {
            method: 'POST',
            body: JSON.stringify({
              rotationIndex: values.rotationIndex,
              bossCodes: values.bossCodes,
            }),
          });
          message.success('条目已创建');
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormDigit
          name="rotationIndex"
          label="轮换序号"
          rules={[{ required: true }]}
          min={0}
          max={Math.max(0, (config?.cycleLength ?? 12) - 1)}
          extra="当前使用 0 基序号，例如 0..11。"
        />
        <ProFormSelect
          name="bossCodes"
          label="Boss 列表"
          mode="multiple"
          rules={[{ required: true, message: '请至少选择一个 Boss' }]}
          options={bossOptions}
          fieldProps={{
            showSearch: true,
            optionFilterProp: 'label',
          }}
          extra="按 Boss 目录中的稳定 code 保存，名称改动不会打断现有轮换。"
        />
      </ModalForm>

      <ModalForm<RotationFormValues>
        title={`编辑轮换条目：${current?.rotationIndex ?? ''}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        modalProps={{ destroyOnHidden: true, width: 720 }}
        initialValues={{
          rotationIndex: current?.rotationIndex,
          bossCodes: current?.bossCodes,
        }}
        onFinish={async (values) => {
          if (!current) return false;
          if (!values.bossCodes?.length) {
            message.error('请至少选择一个 Boss');
            return false;
          }
          await request(`/admin/v1/data/boss-rotations/items/${current._id}`, {
            method: 'PUT',
            body: JSON.stringify({
              rotationIndex: values.rotationIndex,
              bossCodes: values.bossCodes,
            }),
          });
          message.success('条目已更新');
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormDigit
          name="rotationIndex"
          label="轮换序号"
          rules={[{ required: true }]}
          min={0}
          max={Math.max(0, (config?.cycleLength ?? 12) - 1)}
        />
        <ProFormSelect
          name="bossCodes"
          label="Boss 列表"
          mode="multiple"
          rules={[{ required: true, message: '请至少选择一个 Boss' }]}
          options={bossOptions}
          fieldProps={{
            showSearch: true,
            optionFilterProp: 'label',
          }}
        />
      </ModalForm>

      <ModalForm<{ jsonText?: string }>
        title="导入 Boss 轮换（JSON，全量替换）"
        open={importOpen}
        onOpenChange={setImportOpen}
        modalProps={{ destroyOnHidden: true, width: 760 }}
        onFinish={async (values) => {
          try {
            const json = JSON.parse(values.jsonText || '');
            const res = await request<ImportResp>('/admin/v1/data/boss-rotations/import', {
              method: 'POST',
              body: JSON.stringify(json),
            });
            message.success(`导入成功：写入 ${res.itemsInserted} 条，跳过 ${res.skipped} 条`);
            await refreshDirectory();
            actionRef.current?.reload();
            return true;
          } catch (error: unknown) {
            message.error(getErrorMessage(error, 'JSON 导入失败'));
            return false;
          }
        }}
      >
        <ProFormTextArea
          name="jsonText"
          label="JSON 内容"
          rules={[{ required: true }]}
          fieldProps={{ rows: 16 }}
          extra='支持数组或 { "items": [...] }；每项字段可为 rotationIndex / bossCodes，也兼容旧格式的 bossNames。'
        />
      </ModalForm>
    </PageContainer>
  );
}
