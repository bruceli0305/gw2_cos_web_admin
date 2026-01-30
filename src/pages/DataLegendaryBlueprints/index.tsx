import { PageContainer, ProTable, type ProColumns, type ActionType, ModalForm, ProFormTextArea } from '@ant-design/pro-components';
import { Button, Modal, Tag, message, Space } from 'antd';
import { useRef, useState } from 'react';
import { request } from '../../services/request';

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

export default function DataLegendaryBlueprintsPage() {
  const actionRef = useRef<ActionType>(null);
  const [importOpen, setImportOpen] = useState(false);

  const [payloadOpen, setPayloadOpen] = useState(false);
  const [payload, setPayload] = useState<any>(null);

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
      width: 120,
      render: (_, r) => (
        <Button
          type="link"
          onClick={async () => {
            const res = await request(`/admin/v1/data/legendary-blueprints/${encodeURIComponent(r.blueprintId)}`);
            setPayload(res);
            setPayloadOpen(true);
          }}
        >
          查看JSON
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="传奇蓝图"
      subTitle="列表/查看/导入（覆盖）"
      extra={[
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
          const { current, pageSize, q, category, generation, tag } = params as any;
          const res = await request('/admin/v1/data/legendary-blueprints', {
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
          try {
            const json = JSON.parse(values.jsonText || '');
            const res = await request('/admin/v1/data/legendary-blueprints/import', {
              method: 'POST',
              body: JSON.stringify(json),
            });
            message.success(`导入成功：写入 ${res.itemsInserted}，跳过 ${res.skipped}`);
            actionRef.current?.reload();
            return true;
          } catch (e: any) {
            message.error(e?.message || 'JSON 解析/导入失败');
            return false;
          }
        }}
      >
        <ProFormTextArea
          name="jsonText"
          label="JSON 内容"
          placeholder="粘贴 JSON：可以是数组 []，或 { items: [] }"
          fieldProps={{ rows: 14 }}
          rules={[{ required: true, message: '请粘贴 JSON' }]}
        />
      </ModalForm>
    </PageContainer>
  );
}