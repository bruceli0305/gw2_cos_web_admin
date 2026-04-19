import {
  PageContainer,
  ProTable,
  type ProColumns,
  type ActionType,
  ModalForm,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Alert, Button, Card, Col, Modal, Row, Space, Statistic, Tag, message } from 'antd';
import { useRef, useState } from 'react';
import { PageNoticeAlert } from '../../components/listPageState';
import { getErrorMessage, request } from '../../services/request';

type Item = {
  blueprintId: string;
  schemaVersion: string;
  updatedAtUtc?: string;
  name: string;
  category: string;
  generation: string;
  iconItemId: number;
  tags: string[];
  outputType?: string;
  outputItemId?: number;
  outputQty?: number;
};

type BlueprintPayload = Record<string, unknown>;

type BlueprintListParams = {
  current?: number;
  pageSize?: number;
  q?: string;
  category?: string;
  generation?: string;
  tag?: string;
};

type BlueprintListResp = {
  items: Item[];
  total: number;
};

type BlueprintImportResp = {
  itemsInserted: number;
  skipped: number;
};

type BlueprintWriteResp = {
  mode?: string;
  blueprintId: string;
  warnings?: string[];
};

type TableSummary = {
  total: number;
  categories: number;
  generations: number;
  currentView: string;
};

export default function DataLegendaryBlueprintsPage() {
  const actionRef = useRef<ActionType>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [singleImportOpen, setSingleImportOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>('');
  const [editingJsonText, setEditingJsonText] = useState<string>('');

  const [payloadOpen, setPayloadOpen] = useState(false);
  const [payload, setPayload] = useState<BlueprintPayload | null>(null);
  const [tableSummary, setTableSummary] = useState<TableSummary>({
    total: 0,
    categories: 0,
    generations: 0,
    currentView: '全部蓝图',
  });

  const columns: ProColumns<Item>[] = [
    { title: '关键词', dataIndex: 'q', hideInTable: true },
    { title: '分类', dataIndex: 'category', hideInTable: true },
    { title: '世代', dataIndex: 'generation', hideInTable: true },
    { title: '标签', dataIndex: 'tag', hideInTable: true },

    { title: '蓝图 ID', dataIndex: 'blueprintId', width: 200, ellipsis: true, copyable: true },
    { title: '名称', dataIndex: 'name', ellipsis: true },
    { title: '分类', dataIndex: 'category', width: 140, search: false },
    { title: '世代', dataIndex: 'generation', width: 120, search: false },
    {
      title: '标签',
      dataIndex: 'tags',
      search: false,
      render: (_, record) => (
        <Space wrap>
          {(record.tags || []).slice(0, 6).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </Space>
      ),
    },
    { title: '更新时间', dataIndex: 'updatedAtUtc', valueType: 'dateTime', width: 170, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            onClick={async () => {
              const res = await request<BlueprintPayload>(
                `/admin/v1/data/legendary-blueprints/${encodeURIComponent(record.blueprintId)}`
              );
              setPayload(res);
              setPayloadOpen(true);
            }}
          >
            查看 JSON
          </Button>
          <Button
            type="link"
            onClick={async () => {
              const res = await request<BlueprintPayload>(
                `/admin/v1/data/legendary-blueprints/${encodeURIComponent(record.blueprintId)}`
              );
              setEditingId(record.blueprintId);
              setEditingJsonText(JSON.stringify(res, null, 2));
              setEditOpen(true);
            }}
          >
            编辑 JSON
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="传奇蓝图"
      subTitle="查看蓝图详情，支持单条导入 / 覆盖保存，以及危险的全量 JSON 重建。"
      extra={[
        <Button key="singleImport" onClick={() => setSingleImportOpen(true)}>
          导入单条（覆盖 / 新增）
        </Button>,
        <Button key="import" type="primary" onClick={() => setImportOpen(true)}>
          导入（全量覆盖）
        </Button>,
      ]}
    >
      <PageNoticeAlert
        type="info"
        message="本页维护传奇蓝图 JSON 数据"
        description={(
          <div>
            <div>1. “查看 JSON” 只读查看原始蓝图内容；“编辑 JSON” 会直接覆盖当前 blueprintId 对应记录。</div>
            <div>2. “导入单条” 按 blueprintId 执行新增或覆盖，适合单条修复和增量维护。</div>
            <div>3. “导入（全量覆盖）” 会清空现有蓝图后重建，仅适合整包基线更新。</div>
          </div>
        )}
        marginBottom={12}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="蓝图总量" value={tableSummary.total} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前查询结果对应的蓝图总数。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前页分类数" value={tableSummary.categories} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前页结果里涉及的蓝图分类数量。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前页世代数" value={tableSummary.generations} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前页结果覆盖的传奇世代数量。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前视图" value={tableSummary.currentView} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>筛选器会直接影响当前页看到的蓝图范围。</div>
          </Card>
        </Col>
      </Row>

      <ProTable<Item>
        actionRef={actionRef}
        rowKey="blueprintId"
        cardBordered
        columns={columns}
        request={async (params) => {
          const { current, pageSize, q, category, generation, tag } = params as BlueprintListParams;
          const res = await request<BlueprintListResp>('/admin/v1/data/legendary-blueprints', {
            params: {
              page: current || 1,
              limit: pageSize || 20,
              q: q || '',
              category: category || '',
              generation: generation || '',
              tag: tag || '',
            },
          });

          setTableSummary({
            total: res.total,
            categories: new Set(res.items.map((item) => item.category).filter(Boolean)).size,
            generations: new Set(res.items.map((item) => item.generation).filter(Boolean)).size,
            currentView: q || category || generation || tag ? '筛选中' : '全部蓝图',
          });

          return { data: res.items, total: res.total, success: true };
        }}
      />

      <Modal
        title="蓝图 JSON"
        open={payloadOpen}
        onCancel={() => setPayloadOpen(false)}
        onOk={() => setPayloadOpen(false)}
        width={920}
      >
        <pre style={{ maxHeight: 520, overflow: 'auto', background: '#f6f6f6', padding: 12 }}>
          {JSON.stringify(payload, null, 2)}
        </pre>
      </Modal>

      <ModalForm
        title="导入传奇蓝图（JSON，全量覆盖）"
        open={importOpen}
        onOpenChange={setImportOpen}
        modalProps={{ destroyOnHidden: true, width: 780 }}
        onFinish={async (values) => {
          return new Promise<boolean>((resolve) => {
            Modal.confirm({
              title: '确认执行全量覆盖？',
              content: '这会先清空当前全部传奇蓝图，再按导入内容重建。建议先完成数据库备份。',
              okText: '继续覆盖',
              okButtonProps: { danger: true },
              cancelText: '取消',
              onOk: async () => {
                try {
                  const json = JSON.parse(values.jsonText || '');
                  const res = await request<BlueprintImportResp>('/admin/v1/data/legendary-blueprints/import', {
                    method: 'POST',
                    body: JSON.stringify(json),
                  });
                  message.success(`导入成功：写入 ${res.itemsInserted} 条，跳过 ${res.skipped} 条`);
                  actionRef.current?.reload();
                  resolve(true);
                } catch (error: unknown) {
                  const e = { message: getErrorMessage(error, 'JSON 导入失败') };
                  message.error(e.message || 'JSON 解析或导入失败');
                  resolve(false);
                }
              },
              onCancel: () => resolve(false),
            });
          });
        }}
      >
        <Alert
          type="warning"
          showIcon
          title="危险操作"
          description="该导入会清空所有传奇蓝图，再执行整包写入。除非你明确需要全量重建，否则请优先使用“导入单条（覆盖 / 新增）”。"
          style={{ marginBottom: 12 }}
        />
        <ProFormTextArea
          name="jsonText"
          label="JSON 内容"
          placeholder='粘贴 JSON：可以是数组 []，也可以是 { "items": [] }'
          extra="导入前请确认 schemaVersion、blueprintId 和产出结构已经与当前蓝图基线一致。"
          fieldProps={{ rows: 14 }}
          rules={[{ required: true, message: '请先粘贴 JSON 内容' }]}
        />
      </ModalForm>

      <ModalForm
        title="导入单条传奇蓝图（JSON，按 blueprintId 覆盖 / 新增）"
        open={singleImportOpen}
        onOpenChange={setSingleImportOpen}
        modalProps={{ destroyOnHidden: true, width: 760 }}
        onFinish={async (values) => {
          try {
            const json = JSON.parse(values.jsonText || '');
            const res = await request<BlueprintWriteResp>('/admin/v1/data/legendary-blueprints/upsert', {
              method: 'POST',
              body: JSON.stringify(json),
            });
            message.success(`已${res.mode === 'insert' ? '新增' : '覆盖'}：${res.blueprintId}`);
            if (Array.isArray(res.warnings) && res.warnings.length) {
              message.warning(res.warnings.slice(0, 3).join('；'));
            }
            actionRef.current?.reload();
            return true;
          } catch (error: unknown) {
            const e = { message: getErrorMessage(error, 'JSON 导入失败') };
            message.error(e.message || 'JSON 解析或导入失败');
            return false;
          }
        }}
      >
        <ProFormTextArea
          name="jsonText"
          label="单个蓝图 JSON"
          placeholder="粘贴一个蓝图对象，且必须包含 blueprintId。"
          extra="单条导入适合定点修复；如果 blueprintId 已存在会覆盖，不存在则新增。"
          fieldProps={{ rows: 14 }}
          rules={[{ required: true, message: '请先粘贴 JSON 内容' }]}
        />
      </ModalForm>

      <ModalForm
        title={`编辑蓝图 JSON（覆盖保存）${editingId ? `：${editingId}` : ''}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        modalProps={{ destroyOnHidden: true, width: 840 }}
        initialValues={{ jsonText: editingJsonText }}
        onFinish={async (values) => {
          try {
            const json = JSON.parse(values.jsonText || '');
            const res = await request<BlueprintWriteResp>(
              `/admin/v1/data/legendary-blueprints/${encodeURIComponent(editingId)}`,
              {
                method: 'PUT',
                body: JSON.stringify(json),
              }
            );
            message.success(`已保存：${res.blueprintId}`);
            if (Array.isArray(res.warnings) && res.warnings.length) {
              message.warning(res.warnings.slice(0, 3).join('；'));
            }
            actionRef.current?.reload();
            return true;
          } catch (error: unknown) {
            const e = { message: getErrorMessage(error, 'JSON 保存失败') };
            message.error(e.message || 'JSON 解析或保存失败');
            return false;
          }
        }}
      >
        <ProFormTextArea
          name="jsonText"
          label="蓝图 JSON"
          extra="编辑保存会直接覆盖当前 blueprintId 对应记录，请保留必要字段并确认 JSON 可被后端完整解析。"
          fieldProps={{ rows: 16 }}
          rules={[{ required: true, message: '此项必填' }]}
        />
      </ModalForm>
    </PageContainer>
  );
}
