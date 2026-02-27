import {
  PageContainer,
  ProTable,
  type ProColumns,
  type ActionType,
  ModalForm,
  ProFormText,
  ProFormTextArea,
  ProFormDigit,
  ProFormSelect,
} from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space, Tabs, Tag } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { request } from '../../services/request';

type SlangGroup = {
  _id: string;
  name: string;
  order: number;
  updatedAt: string;
};

type SlangTerm = {
  _id: string;
  groupId: string;
  groupName?: string;
  zh: string;
  en: string;
  note?: string;
  order: number;
  updatedAt: string;
};

export default function SlangPage() {
  const groupActionRef = useRef<ActionType>(null);
  const termActionRef = useRef<ActionType>(null);

  const [groups, setGroups] = useState<SlangGroup[]>([]);

  // ===== Group modals =====
  const [groupCreateOpen, setGroupCreateOpen] = useState(false);
  const [groupEditOpen, setGroupEditOpen] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<SlangGroup | null>(null);

  // ===== Term modals =====
  const [termCreateOpen, setTermCreateOpen] = useState(false);
  const [termEditOpen, setTermEditOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState<SlangTerm | null>(null);

  async function refreshGroups() {
    const res = await request<{ items: SlangGroup[] }>('/admin/v1/slang/groups');
    setGroups(res.items || []);
  }

  useEffect(() => {
    refreshGroups().catch(() => {});
  }, []);

  const groupValueEnum = useMemo(() => {
    const e: Record<string, { text: string }> = {};
    groups.forEach((g) => {
      e[g._id] = { text: g.name };
    });
    return e;
  }, [groups]);

  const groupColumns: ProColumns<SlangGroup>[] = [
    {
      title: '分组名',
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: '排序',
      dataIndex: 'order',
      width: 90,
      search: false,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      width: 170,
      search: false,
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
              setCurrentGroup(record);
              setGroupEditOpen(true);
            }}
          >
            编辑
          </Button>

          <Popconfirm
            title="确定删除该分组？（分组内仍有条目将无法删除）"
            onConfirm={async () => {
              await request(`/admin/v1/slang/groups/${record._id}`, { method: 'DELETE' });
              message.success('已删除');
              await refreshGroups();
              groupActionRef.current?.reload();
              termActionRef.current?.reload();
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

  const termColumns: ProColumns<SlangTerm>[] = [
    {
      title: '关键词',
      dataIndex: 'q',
      hideInTable: true,
    },
    {
      title: '分组',
      dataIndex: 'groupId',
      width: 140,
      valueType: 'select',
      valueEnum: groupValueEnum,
      render: (_, r) => <Tag>{r.groupName || groupValueEnum[r.groupId]?.text || '-'}</Tag>,
    },
    {
      title: '中文黑话',
      dataIndex: 'zh',
      ellipsis: true,
      copyable: true,
    },
    {
      title: '英文/缩写',
      dataIndex: 'en',
      ellipsis: true,
      copyable: true,
    },
    {
      title: '备注',
      dataIndex: 'note',
      ellipsis: true,
      search: false,
    },
    {
      title: '排序',
      dataIndex: 'order',
      width: 90,
      search: false,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      width: 170,
      search: false,
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
              setCurrentTerm(record);
              setTermEditOpen(true);
            }}
          >
            编辑
          </Button>

          <Popconfirm
            title="确定删除该条黑话？"
            onConfirm={async () => {
              await request(`/admin/v1/slang/terms/${record._id}`, { method: 'DELETE' });
              message.success('已删除');
              termActionRef.current?.reload();
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
      title="黑话词典"
      subTitle="录入/管理游戏内黑话（中文 → 英文/缩写），供前台/小程序快捷复制使用"
    >
      <Tabs
        defaultActiveKey="terms"
        items={[
          {
            key: 'terms',
            label: '黑话条目',
            children: (
              <>
                <ProTable<SlangTerm>
                  actionRef={termActionRef}
                  rowKey="_id"
                  columns={termColumns}
                  cardBordered
                  toolBarRender={() => [
                    <Button key="create" type="primary" onClick={() => setTermCreateOpen(true)}>
                      新增黑话
                    </Button>,
                  ]}
                  request={async (params) => {
                    const { current, pageSize, q, groupId } = params as any;
                    const res = await request('/admin/v1/slang/terms', {
                      params: {
                        page: current || 1,
                        limit: pageSize || 20,
                        q: q || '',
                        groupId: groupId || '',
                      },
                    });
                    return { data: res.items, total: res.total, success: true };
                  }}
                />

                <ModalForm
                  title="新增黑话"
                  open={termCreateOpen}
                  onOpenChange={setTermCreateOpen}
                  modalProps={{ destroyOnClose: true }}
                  initialValues={{ order: undefined, note: '' }}
                  onFinish={async (values) => {
                    await request('/admin/v1/slang/terms', {
                      method: 'POST',
                      body: JSON.stringify({
                        groupId: values.groupId,
                        zh: values.zh,
                        en: values.en,
                        note: values.note || '',
                        order: values.order,
                      }),
                    });
                    message.success('已保存');
                    termActionRef.current?.reload();
                    return true;
                  }}
                >
                  <ProFormSelect
                    name="groupId"
                    label="分组"
                    valueEnum={groupValueEnum}
                    rules={[{ required: true, message: '必选' }]}
                    fieldProps={{ placeholder: '选择分组' }}
                  />
                  <ProFormText
                    name="zh"
                    label="中文黑话"
                    rules={[{ required: true, message: '必填' }]}
                    fieldProps={{ placeholder: '例如：跳跳乐' }}
                  />
                  <ProFormText
                    name="en"
                    label="英文/缩写"
                    rules={[{ required: true, message: '必填' }]}
                    fieldProps={{ placeholder: '例如：JP' }}
                  />
                  <ProFormTextArea
                    name="note"
                    label="备注（可选）"
                    fieldProps={{ rows: 3, placeholder: '例如：Jumping Puzzle' }}
                  />
                  <ProFormDigit
                    name="order"
                    label="排序（可选）"
                    fieldProps={{ precision: 0, placeholder: '不填则自动生成' }}
                  />
                </ModalForm>

                <ModalForm
                  title="编辑黑话"
                  open={termEditOpen}
                  onOpenChange={setTermEditOpen}
                  modalProps={{ destroyOnClose: true }}
                  initialValues={
                    currentTerm
                      ? {
                          groupId: currentTerm.groupId,
                          zh: currentTerm.zh,
                          en: currentTerm.en,
                          note: currentTerm.note || '',
                          order: currentTerm.order,
                        }
                      : undefined
                  }
                  onFinish={async (values) => {
                    if (!currentTerm) return false;
                    await request(`/admin/v1/slang/terms/${currentTerm._id}`, {
                      method: 'PUT',
                      body: JSON.stringify({
                        groupId: values.groupId,
                        zh: values.zh,
                        en: values.en,
                        note: values.note || '',
                        order: values.order,
                      }),
                    });
                    message.success('已更新');
                    termActionRef.current?.reload();
                    return true;
                  }}
                >
                  <ProFormSelect
                    name="groupId"
                    label="分组"
                    valueEnum={groupValueEnum}
                    rules={[{ required: true, message: '必选' }]}
                  />
                  <ProFormText
                    name="zh"
                    label="中文黑话"
                    rules={[{ required: true, message: '必填' }]}
                  />
                  <ProFormText
                    name="en"
                    label="英文/缩写"
                    rules={[{ required: true, message: '必填' }]}
                  />
                  <ProFormTextArea
                    name="note"
                    label="备注（可选）"
                    fieldProps={{ rows: 3 }}
                  />
                  <ProFormDigit
                    name="order"
                    label="排序"
                    fieldProps={{ precision: 0 }}
                  />
                </ModalForm>
              </>
            ),
          },
          {
            key: 'groups',
            label: '分组管理',
            children: (
              <>
                <ProTable<SlangGroup>
                  actionRef={groupActionRef}
                  rowKey="_id"
                  columns={groupColumns}
                  cardBordered
                  search={false}
                  pagination={false}
                  toolBarRender={() => [
                    <Button key="create" type="primary" onClick={() => setGroupCreateOpen(true)}>
                      新增分组
                    </Button>,
                  ]}
                  request={async () => {
                    const res = await request<{ items: SlangGroup[] }>('/admin/v1/slang/groups');
                    setGroups(res.items || []);
                    return { data: res.items || [], success: true };
                  }}
                />

                <ModalForm
                  title="新增分组"
                  open={groupCreateOpen}
                  onOpenChange={setGroupCreateOpen}
                  modalProps={{ destroyOnClose: true }}
                  onFinish={async (values) => {
                    await request('/admin/v1/slang/groups', {
                      method: 'POST',
                      body: JSON.stringify({
                        name: values.name,
                        order: values.order,
                      }),
                    });
                    message.success('已保存');
                    await refreshGroups();
                    groupActionRef.current?.reload();
                    return true;
                  }}
                >
                  <ProFormText
                    name="name"
                    label="分组名"
                    rules={[{ required: true, message: '必填' }]}
                    fieldProps={{ placeholder: '例如：通用 / PVE / PVP / 职业' }}
                  />
                  <ProFormDigit
                    name="order"
                    label="排序（可选）"
                    fieldProps={{ precision: 0, placeholder: '不填则自动生成' }}
                  />
                </ModalForm>

                <ModalForm
                  title="编辑分组"
                  open={groupEditOpen}
                  onOpenChange={setGroupEditOpen}
                  modalProps={{ destroyOnClose: true }}
                  initialValues={
                    currentGroup
                      ? {
                          name: currentGroup.name,
                          order: currentGroup.order,
                        }
                      : undefined
                  }
                  onFinish={async (values) => {
                    if (!currentGroup) return false;
                    await request(`/admin/v1/slang/groups/${currentGroup._id}`, {
                      method: 'PUT',
                      body: JSON.stringify({
                        name: values.name,
                        order: values.order,
                      }),
                    });
                    message.success('已更新');
                    await refreshGroups();
                    groupActionRef.current?.reload();
                    termActionRef.current?.reload();
                    return true;
                  }}
                >
                  <ProFormText
                    name="name"
                    label="分组名"
                    rules={[{ required: true, message: '必填' }]}
                  />
                  <ProFormDigit
                    name="order"
                    label="排序"
                    fieldProps={{ precision: 0 }}
                  />
                </ModalForm>
              </>
            ),
          },
        ]}
      />
    </PageContainer>
  );
}
