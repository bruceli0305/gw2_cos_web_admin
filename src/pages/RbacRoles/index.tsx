import {
  PageContainer,
  ProTable,
  type ProColumns,
  ModalForm,
  ProFormText,
  ProFormSwitch,
  ProFormCheckbox,
  ProFormDependency,
} from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space, Tag } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { request } from '../../services/request';

type PermissionDef = { key: string; name: string; module: string };
type RoleItem = { _id: string; name: string; description?: string; isSuper: boolean; permissionKeys: string[] };

export default function RbacRolesPage() {
  const [permissions, setPermissions] = useState<PermissionDef[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<RoleItem | null>(null);

  const permOptions = useMemo(
    () => permissions.map((p) => ({ label: `${p.module} / ${p.name} (${p.key})`, value: p.key })),
    [permissions]
  );

  async function reload() {
    setLoading(true);
    const [pRes, rRes] = await Promise.all([
      request<{ items: PermissionDef[] }>('/admin/v1/rbac/permissions'),
      request<{ items: RoleItem[] }>('/admin/v1/rbac/roles'),
    ]);
    setPermissions(pRes.items);
    setRoles(rRes.items);
    setLoading(false);
  }

  useEffect(() => {
    reload().catch(() => setLoading(false));
  }, []);

  const columns: ProColumns<RoleItem>[] = [
    { title: '角色名', dataIndex: 'name', width: 160 },
    {
      title: '类型',
      dataIndex: 'isSuper',
      width: 120,
      render: (_, r) => (r.isSuper ? <Tag color="gold">Super</Tag> : <Tag>Normal</Tag>),
    },
    {
      title: '权限数',
      dataIndex: 'permissionKeys',
      width: 100,
      render: (_, r) => (r.isSuper ? '-' : r.permissionKeys?.length || 0),
    },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
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
            title="删除该角色？"
            onConfirm={async () => {
              await request(`/admin/v1/rbac/roles/${r._id}`, { method: 'DELETE' });
              message.success('已删除');
              reload();
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
      title="角色管理"
      subTitle="创建/编辑角色与权限"
      extra={[
        <Button key="create" type="primary" onClick={() => setCreateOpen(true)}>
          新建角色
        </Button>,
      ]}
    >
      <ProTable<RoleItem>
        rowKey="_id"
        loading={loading}
        search={false}
        toolBarRender={false}
        dataSource={roles}
        columns={columns}
        cardBordered
      />

      <ModalForm
        title="新建角色"
        open={createOpen}
        onOpenChange={setCreateOpen}
        modalProps={{ destroyOnClose: true }}
        initialValues={{ isSuper: false, permissionKeys: [] }}
        onFinish={async (values) => {
          const payload = {
            name: values.name,
            description: values.description || '',
            isSuper: !!values.isSuper,
            permissionKeys: values.isSuper ? [] : (values.permissionKeys || []),
          };
          await request('/admin/v1/rbac/roles', { method: 'POST', body: JSON.stringify(payload) });
          message.success('创建成功');
          reload();
          return true;
        }}
      >
        <ProFormText name="name" label="角色名" rules={[{ required: true }]} />
        <ProFormText name="description" label="描述" />
        <ProFormSwitch name="isSuper" label="超级管理员" />

        <ProFormDependency name={['isSuper']}>
          {({ isSuper }) =>
            isSuper ? (
              <div style={{ color: '#888' }}>Super 角色无需配置权限（自动放行）</div>
            ) : (
              <ProFormCheckbox.Group name="permissionKeys" label="权限" options={permOptions} />
            )
          }
        </ProFormDependency>
      </ModalForm>

      <ModalForm
        title={`编辑角色: ${current?.name || ''}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        modalProps={{ destroyOnClose: true }}
        initialValues={{
          name: current?.name,
          description: current?.description,
          isSuper: current?.isSuper,
          permissionKeys: current?.permissionKeys || [],
        }}
        onFinish={async (values) => {
          if (!current) return false;
          const payload = {
            name: values.name,
            description: values.description || '',
            isSuper: !!values.isSuper,
            permissionKeys: values.isSuper ? [] : (values.permissionKeys || []),
          };
          await request(`/admin/v1/rbac/roles/${current._id}`, { method: 'PUT', body: JSON.stringify(payload) });
          message.success('更新成功');
          reload();
          return true;
        }}
      >
        <ProFormText name="name" label="角色名" rules={[{ required: true }]} />
        <ProFormText name="description" label="描述" />
        <ProFormSwitch name="isSuper" label="超级管理员" />

        <ProFormDependency name={['isSuper']}>
          {({ isSuper }) =>
            isSuper ? (
              <div style={{ color: '#888' }}>Super 角色无需配置权限（自动放行）</div>
            ) : (
              <ProFormCheckbox.Group name="permissionKeys" label="权限" options={permOptions} />
            )
          }
        </ProFormDependency>
      </ModalForm>
    </PageContainer>
  );
}