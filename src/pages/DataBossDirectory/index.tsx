import {
  ModalForm,
  PageContainer,
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { Button, Card, Col, Popconfirm, Row, Space, Statistic, Tag, message } from 'antd';
import { useMemo, useRef, useState } from 'react';
import { PageNoticeAlert } from '../../components/listPageState';
import { getErrorMessage, request } from '../../services/request';

type Item = {
  _id: string;
  code: string;
  name: string;
  line: string;
  contentType: 'raid' | 'strike';
  isPermanentMissing: boolean;
  sortOrder: number;
  updatedAt?: string | null;
};

type ListResp = {
  items: Item[];
};

type ImportResp = {
  itemsInserted: number;
  skipped: number;
};

type FormValues = {
  code?: string;
  name?: string;
  line?: string;
  contentType?: 'raid' | 'strike';
  isPermanentMissing?: boolean;
  sortOrder?: number;
};

const CONTENT_TYPE_OPTIONS = [
  { label: '十人本', value: 'raid' },
  { label: '进攻本', value: 'strike' },
];

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('zh-CN', { hour12: false });
}

export default function DataBossDirectoryPage() {
  const actionRef = useRef<ActionType>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [current, setCurrent] = useState<Item | null>(null);

  const summary = useMemo(() => {
    const raidCount = items.filter((item) => item.contentType === 'raid').length;
    const strikeCount = items.filter((item) => item.contentType === 'strike').length;
    const permanentCount = items.filter((item) => item.isPermanentMissing).length;

    return {
      total: items.length,
      raidCount,
      strikeCount,
      permanentCount,
    };
  }, [items]);

  const columns: ProColumns<Item>[] = [
    { title: 'Code', dataIndex: 'code', width: 180, search: false, copyable: true },
    { title: '名称', dataIndex: 'name', ellipsis: true, search: false },
    { title: '线路 / 分组', dataIndex: 'line', width: 160, search: false },
    {
      title: '类型',
      dataIndex: 'contentType',
      width: 100,
      search: false,
      render: (_, record) => (
        <Tag color={record.contentType === 'raid' ? 'blue' : 'purple'}>
          {record.contentType === 'raid' ? '十人本' : '进攻本'}
        </Tag>
      ),
    },
    {
      title: '常驻未覆盖',
      dataIndex: 'isPermanentMissing',
      width: 120,
      search: false,
      render: (_, record) =>
        record.isPermanentMissing ? <Tag color="red">是</Tag> : <Tag>否</Tag>,
    },
    { title: '排序', dataIndex: 'sortOrder', width: 90, search: false },
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
            title="确定删除这条 Boss 目录记录吗？"
            description="如果该 Boss 仍被轮换表引用，后端会拒绝删除。"
            onConfirm={async () => {
              await request(`/admin/v1/data/boss-directory/items/${record._id}`, { method: 'DELETE' });
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
      title="副本 Boss 目录"
      subTitle="维护 raid + strike 共用的 Boss 基础资料，并用稳定 code 作为轮换关联键。"
      extra={[
        <Button key="create" type="primary" onClick={() => setCreateOpen(true)}>
          新增条目
        </Button>,
        <Button key="import" onClick={() => setImportOpen(true)}>
          导入 JSON（全量替换）
        </Button>,
      ]}
    >
      <PageNoticeAlert
        type="info"
        message="本页维护副本 Boss 基础目录"
        description={(
          <div>
            <div>1. `code` 是轮换表关联用的稳定内部键，默认会自动生成。</div>
            <div>2. 修改名称不会影响已改造的轮换数据；如果显式修改 code，后端会同步改写轮换表里的引用。</div>
            <div>3. 删除和全量导入都会检查是否仍有轮换数据依赖该 Boss，避免把现有轮换关系打断。</div>
          </div>
        )}
        marginBottom={12}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="Boss 总量" value={summary.total} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前目录中已录入的副本 Boss 总数。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="十人本" value={summary.raidCount} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>归类为 raid 的 Boss 条目数量。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="进攻本" value={summary.strikeCount} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>归类为 strike 的 Boss 条目数量。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="常驻未覆盖" value={summary.permanentCount} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>固定标记为常驻缺失的 Boss 数量。</div>
          </Card>
        </Col>
      </Row>

      <ProTable<Item>
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        search={false}
        columns={columns}
        request={async () => {
          const res = await request<ListResp>('/admin/v1/data/boss-directory');
          const nextItems = res.items || [];
          setItems(nextItems);
          return { data: nextItems, success: true };
        }}
      />

      <ModalForm<FormValues>
        title="新增 Boss 目录条目"
        open={createOpen}
        onOpenChange={setCreateOpen}
        modalProps={{ destroyOnHidden: true, width: 680 }}
        initialValues={{ contentType: 'raid', isPermanentMissing: false }}
        onFinish={async (values) => {
          await request('/admin/v1/data/boss-directory/items', {
            method: 'POST',
            body: JSON.stringify(values),
          });
          message.success('条目已创建');
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText
          name="code"
          label="Code"
          extra="可留空，后端会按类型和名称自动生成稳定 code。"
        />
        <ProFormText name="name" label="名称" rules={[{ required: true }]} />
        <ProFormText
          name="line"
          label="线路 / 分组"
          rules={[{ required: true }]}
          extra="例如 1线、2线、冰巢传说、巨龙绝境。"
        />
        <ProFormSelect name="contentType" label="类型" rules={[{ required: true }]} options={CONTENT_TYPE_OPTIONS} />
        <ProFormDigit name="sortOrder" label="排序" extra="留空时自动追加到当前末尾。" />
        <ProFormSwitch name="isPermanentMissing" label="常驻未覆盖" />
      </ModalForm>

      <ModalForm<FormValues>
        title={`编辑 Boss 条目：${current?.name || ''}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        modalProps={{ destroyOnHidden: true, width: 680 }}
        initialValues={{
          code: current?.code,
          name: current?.name,
          line: current?.line,
          contentType: current?.contentType,
          isPermanentMissing: current?.isPermanentMissing,
          sortOrder: current?.sortOrder,
        }}
        onFinish={async (values) => {
          if (!current) return false;
          await request(`/admin/v1/data/boss-directory/items/${current._id}`, {
            method: 'PUT',
            body: JSON.stringify(values),
          });
          message.success('条目已更新');
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText
          name="code"
          label="Code"
          extra="修改 code 会同步更新轮换表中的 bossCodes 引用。"
        />
        <ProFormText name="name" label="名称" rules={[{ required: true }]} />
        <ProFormText name="line" label="线路 / 分组" rules={[{ required: true }]} />
        <ProFormSelect name="contentType" label="类型" rules={[{ required: true }]} options={CONTENT_TYPE_OPTIONS} />
        <ProFormDigit name="sortOrder" label="排序" />
        <ProFormSwitch name="isPermanentMissing" label="常驻未覆盖" />
      </ModalForm>

      <ModalForm<{ jsonText?: string }>
        title="导入 Boss 目录（JSON，全量替换）"
        open={importOpen}
        onOpenChange={setImportOpen}
        modalProps={{ destroyOnHidden: true, width: 760 }}
        onFinish={async (values) => {
          try {
            const json = JSON.parse(values.jsonText || '');
            const res = await request<ImportResp>('/admin/v1/data/boss-directory/import', {
              method: 'POST',
              body: JSON.stringify(json),
            });
            message.success(`导入成功：写入 ${res.itemsInserted} 条，跳过 ${res.skipped} 条`);
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
          extra='支持数组或 { "items": [...] }；每项字段可为 code / name / line / contentType / isPermanentMissing / sortOrder。未提供 code 时，会优先保留同名 Boss 的既有 code。'
        />
      </ModalForm>
    </PageContainer>
  );
}
