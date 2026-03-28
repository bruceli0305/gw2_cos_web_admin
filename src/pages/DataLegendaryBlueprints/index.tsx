import { PageContainer, ProTable, type ProColumns, type ActionType, ModalForm, ProFormTextArea } from '@ant-design/pro-components';
import { Button, Modal, Tag, message, Space, Alert } from 'antd';
import { useRef, useState } from 'react';
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

export default function DataLegendaryBlueprintsPage() {
  const actionRef = useRef<ActionType>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [singleImportOpen, setSingleImportOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>('');
  const [editingJsonText, setEditingJsonText] = useState<string>('');

  const [payloadOpen, setPayloadOpen] = useState(false);
  const [payload, setPayload] = useState<BlueprintPayload | null>(null);

  const columns: ProColumns<Item>[] = [
    { title: '关键词', dataIndex: 'q', hideInTable: true },
    { title: '分类', dataIndex: 'category', hideInTable: true },
    { title: '世代', dataIndex: 'generation', hideInTable: true },
    { title: 'Tag', dataIndex: 'tag', hideInTable: true },

    { title: 'ID', dataIndex: 'blueprintId', width: 200, ellipsis: true, copyable: true },
    { title: '名称', dataIndex: 'name', ellipsis: true },
    { title: '分类', dataIndex: 'category', width: 140, search: false },
    { title: '世代', dataIndex: 'generation', width: 120, search: false },
    {
      title: 'Tags',
      dataIndex: 'tags',
      search: false,
      render: (_, r) => (
        <Space wrap>
          {(r.tags || []).slice(0, 6).map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </Space>
      ),
    },
    { title: '更新时间', dataIndex: 'updatedAtUtc', valueType: 'dateTime', width: 170, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      render: (_, r) => (
        <Space>
          <Button
            type="link"
            onClick={async () => {
              const res = await request<BlueprintPayload>(
                `/admin/v1/data/legendary-blueprints/${encodeURIComponent(r.blueprintId)}`
              );
              setPayload(res);
              setPayloadOpen(true);
            }}
          >
            查看JSON
          </Button>
          <Button
            type="link"
            onClick={async () => {
              const res = await request<BlueprintPayload>(
                `/admin/v1/data/legendary-blueprints/${encodeURIComponent(r.blueprintId)}`
              );
              setEditingId(r.blueprintId);
              setEditingJsonText(JSON.stringify(res, null, 2));
              setEditOpen(true);
            }}
          >
            编辑JSON
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="传奇蓝图"
      subTitle="列表/查看/单条导入与编辑覆盖/全量导入（危险）"
      extra={[
        <Button key="singleImport" onClick={() => setSingleImportOpen(true)}>
          导入单条（覆盖）
        </Button>,
        <Button key="import" type="primary" onClick={() => setImportOpen(true)}>
          导入（覆盖）
        </Button>,
      ]}
    >
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
          return { data: res.items, total: res.total, success: true };
        }}
      />

      <Modal
        title="蓝图 JSON"
        open={payloadOpen}
        onCancel={() => setPayloadOpen(false)}
        onOk={() => setPayloadOpen(false)}
        width={900}
      >
        <pre style={{ maxHeight: 520, overflow: 'auto', background: '#f6f6f6', padding: 12 }}>
          {JSON.stringify(payload, null, 2)}
        </pre>
      </Modal>

      <ModalForm
        title="导入传奇蓝图（JSON，覆盖全量）"
        open={importOpen}
        onOpenChange={setImportOpen}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          return new Promise<boolean>((resolve) => {
            Modal.confirm({
              title: '确认执行全量覆盖？',
              content: '此操作会删除当前所有传奇蓝图后重新导入。建议先备份数据库。',
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
                  message.success(`导入成功：写入 ${res.itemsInserted}，跳过 ${res.skipped}`);
                  actionRef.current?.reload();
                  resolve(true);
                } catch (error: unknown) {
                  const e = { message: getErrorMessage(error, 'JSON import failed') };
                  message.error(e?.message || 'JSON 解析/导入失败');
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
          message="危险操作"
          description="该导入会清空所有传奇蓝图（deleteMany），再全量写入。除非你明确需要全量重建，否则请优先使用“导入单条（覆盖）”。"
          style={{ marginBottom: 12 }}
        />
        <ProFormTextArea
          name="jsonText"
          label="JSON 内容"
          placeholder="粘贴 JSON：可以是数组 []，或 { items: [] }"
          fieldProps={{ rows: 14 }}
          rules={[{ required: true, message: '请粘贴 JSON' }]}
        />
      </ModalForm>

      <ModalForm
        title="导入单条传奇蓝图（JSON，按 blueprintId 覆盖/新增）"
        open={singleImportOpen}
        onOpenChange={setSingleImportOpen}
        modalProps={{ destroyOnClose: true }}
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
            const e = { message: getErrorMessage(error, 'JSON import failed') };
            message.error(e?.message || 'JSON 解析/导入失败');
            return false;
          }
        }}
      >
        <ProFormTextArea
          name="jsonText"
          label="单个蓝图 JSON"
          placeholder="粘贴一个蓝图对象（必须包含 blueprintId）"
          fieldProps={{ rows: 14 }}
          rules={[{ required: true, message: '请粘贴 JSON' }]}
        />
      </ModalForm>

      <ModalForm
        title={`编辑蓝图 JSON（覆盖保存）${editingId ? `：${editingId}` : ''}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        modalProps={{ destroyOnClose: true }}
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
            const e = { message: getErrorMessage(error, 'JSON save failed') };
            message.error(e?.message || 'JSON 解析/保存失败');
            return false;
          }
        }}
      >
        <ProFormTextArea
          name="jsonText"
          label="蓝图 JSON"
          fieldProps={{ rows: 16 }}
          rules={[{ required: true, message: '必填' }]}
        />
      </ModalForm>
    </PageContainer>
  );
}
