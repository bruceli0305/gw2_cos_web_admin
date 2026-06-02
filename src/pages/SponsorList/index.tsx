/**
 * 管理端：打赏记录管理
 */

import { PageContainer, ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, Form, Input, Modal, message, Popconfirm, Switch } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
import { getErrorMessage, request } from '../../services/request';

type SponsorItem = {
  _id: string;
  name: string;
  amount: string;
  message: string;
  date: string;
  sortOrder: number;
  isActive: boolean;
};

type SponsorListResponse = {
  items: SponsorItem[];
  total: number;
  page: number;
  limit: number;
};

export default function SponsorListPage() {
  const actionRef = useRef<ActionType>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ sortOrder: 0, isActive: true });
    setModalOpen(true);
  };

  const openEdit = (record: SponsorItem) => {
    setEditingId(record._id);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (editingId) {
        await request(`/admin/v1/sponsors/${encodeURIComponent(editingId)}`, {
          method: 'PUT',
          body: JSON.stringify(values),
        });
        message.success('已更新');
      } else {
        await request('/admin/v1/sponsors', {
          method: 'POST',
          body: JSON.stringify(values),
        });
        message.success('已新增');
      }

      setModalOpen(false);
      actionRef.current?.reload();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(getErrorMessage(err, '操作失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await request(`/admin/v1/sponsors/${encodeURIComponent(id)}`, { method: 'DELETE' });
      message.success('已删除');
      actionRef.current?.reload();
    } catch (err) {
      message.error(getErrorMessage(err, '删除失败'));
    }
  };

  const columns: ProColumns<SponsorItem>[] = [
    { title: '昵称', dataIndex: 'name', width: 140 },
    { title: '金额', dataIndex: 'amount', width: 100, render: (_, r) => r.amount || '-' },
    { title: '留言', dataIndex: 'message', width: 200, ellipsis: true, render: (_, r) => r.message || '-' },
    { title: '日期', dataIndex: 'date', width: 120, render: (_, r) => r.date || '-' },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      width: 80,
      align: 'center',
    },
    {
      title: '显示',
      dataIndex: 'isActive',
      width: 70,
      align: 'center',
      render: (_, r) => (
        <Switch
          checked={r.isActive}
          size="small"
          onChange={async (checked) => {
            try {
              await request(`/admin/v1/sponsors/${encodeURIComponent(r._id)}`, {
                method: 'PUT',
                body: JSON.stringify({ name: r.name, isActive: checked }),
              });
              actionRef.current?.reload();
            } catch (err) {
              message.error(getErrorMessage(err, '操作失败'));
            }
          }}
        />
      ),
    },
    {
      title: '操作',
      width: 140,
      render: (_, r) => (
        <>
          <Button type="link" size="small" onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r._id)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '打赏记录',
        extra: [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增
          </Button>,
        ],
      }}
    >
      <ProTable<SponsorItem>
        actionRef={actionRef}
        columns={columns}
        rowKey="_id"
        search={false}
        request={async (params) => {
          const page = params.current || 1;
          const limit = params.pageSize || 20;
          const data = await request<SponsorListResponse>('/admin/v1/sponsors', {
            params: { page, limit },
          });
          return {
            data: data.items,
            total: data.total,
            success: true,
          };
        }}
      />

      <Modal
        title={editingId ? '编辑记录' : '新增记录'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="昵称" rules={[{ required: true, message: '请输入昵称' }]}>
            <Input maxLength={64} />
          </Form.Item>
          <Form.Item name="amount" label="金额">
            <Input maxLength={32} placeholder="如 ¥20" />
          </Form.Item>
          <Form.Item name="message" label="留言">
            <Input.TextArea maxLength={256} rows={2} />
          </Form.Item>
          <Form.Item name="date" label="日期">
            <Input maxLength={32} placeholder="如 2025-01-01" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序（越大越后）">
            <Input type="number" />
          </Form.Item>
          <Form.Item name="isActive" label="前台显示" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
