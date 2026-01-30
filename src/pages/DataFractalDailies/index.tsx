import {
  PageContainer,
  ProTable,
  type ProColumns,
  type ActionType,
  ModalForm,
  ProFormDigit,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space } from 'antd';
import { useRef, useState } from 'react';
import { request } from '../../services/request';

type Item = {
  _id: string;
  scale: number;
  id: number;
  name: string;
};

export default function DataFractalDailiesPage() {
  const actionRef = useRef<ActionType>(null);
  const [importOpen, setImportOpen] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<Item | null>(null);

  const columns: ProColumns<Item>[] = [
    { title: '层级', dataIndex: 'scale', width: 90, search: false },
    { title: '成就ID', dataIndex: 'id', width: 110, search: false },
    { title: '名称', dataIndex: 'name', ellipsis: true, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      render: (_, r) => (
        <Space>
          <Button
            type="link"
            onClick={() => {
              setCurrent(r);
              setEditOpen(true);
            }}
          >
            编辑
          </Button>

          <Popconfirm
            title="确定删除该条日常？"
            onConfirm={async () => {
              await request(`/admin/v1/data/fractal-dailies/items/${r._id}`, { method: 'DELETE' });
              message.success('已删除');
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
      title="碎层日常"
      subTitle="查看 / 新增编辑删除 / 导入（覆盖）"
      extra={[
        <Button key="create" type="primary" onClick={() => setCreateOpen(true)}>
          新增
        </Button>,
        <Button key="import" onClick={() => setImportOpen(true)}>
          导入（覆盖）
        </Button>,
      ]}
    >
      <ProTable<Item>
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        search={false}
        columns={columns}
        request={async () => {
          const res = await request('/admin/v1/data/fractal-dailies');
          return { data: res.items, success: true };
        }}
      />

      {/* 新增 */}
      <ModalForm
        title="新增碎层日常"
        open={createOpen}
        onOpenChange={setCreateOpen}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          await request('/admin/v1/data/fractal-dailies/items', {
            method: 'POST',
            body: JSON.stringify({
              scale: values.scale,
              id: values.id,
              name: values.name,
            }),
          });
          message.success('创建成功');
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormDigit name="scale" label="层级(scale)" rules={[{ required: true }]} />
        <ProFormDigit name="id" label="成就ID(id)" rules={[{ required: true }]} />
        <ProFormText name="name" label="名称" rules={[{ required: true }]} />
      </ModalForm>

      {/* 编辑 */}
      <ModalForm
        title={`编辑：${current?.name || ''}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        modalProps={{ destroyOnClose: true }}
        initialValues={{
          scale: current?.scale,
          id: current?.id,
          name: current?.name,
        }}
        onFinish={async (values) => {
          if (!current) return false;
          await request(`/admin/v1/data/fractal-dailies/items/${current._id}`, {
            method: 'PUT',
            body: JSON.stringify({
              scale: values.scale,
              id: values.id,
              name: values.name,
            }),
          });
          message.success('更新成功');
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormDigit name="scale" label="层级(scale)" rules={[{ required: true }]} />
        <ProFormDigit name="id" label="成就ID(id)" rules={[{ required: true }]} />
        <ProFormText name="name" label="名称" rules={[{ required: true }]} />
      </ModalForm>

      {/* 导入 */}
      <ModalForm
        title="导入碎层日常（JSON，覆盖全量）"
        open={importOpen}
        onOpenChange={setImportOpen}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          try {
            const json = JSON.parse(values.jsonText || '');
            const res = await request('/admin/v1/data/fractal-dailies/import', {
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