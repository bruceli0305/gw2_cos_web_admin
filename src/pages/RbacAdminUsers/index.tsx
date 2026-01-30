import {
  PageContainer,
  ProTable,
  type ProColumns,
  type ActionType,
  ModalForm,
  ProFormText,
  ProFormSwitch,
  ProFormSelect,
} from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space, Tag } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { request } from '../../services/request';

type RoleItem = { _id: string; name: string; isSuper: boolean };
type AdminUserItem = {
  _id: string;
  username: string;
  isActive: boolean;
  roleIds: string[];
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
};

export default function RbacAdminUsersPage() {
  const actionRef = useRef<ActionType>(null);

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const roleOptions = useMemo(
    () => roles.map((r) => ({ label: r.isSuper ? `${r.name} (Super)` : r.name, value: r._id })),
    [roles]
  );
  const roleMap = useMemo(() => new Map(roles.map((r) => [r._id, r])), [roles]);

  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdUser, setPwdUser] = useState<AdminUserItem | null>(null);

  useEffect(() => {
    request<{ items: any[] }>('/admin/v1/rbac/roles')
      .then((res) => setRoles(res.items))
      .catch(() => {});
  }, []);

  const columns: ProColumns<AdminUserItem>[] = [
    { title: '用户名', dataIndex: 'username', copyable: true },
    {
      title: '状态',
      dataIndex: 'isActive',
      width: 120,
      render: (_, r) => (r.isActive ? <Tag color="success">启用</Tag> : <Tag color="error">禁用</Tag>),
    },
    {
      title: '角色',
      dataIndex: 'roleIds',
      search: false,
      render: (_, r) => (
        <Space wrap>
          {(r.roleIds || []).map((id) => {
            const role = roleMap.get(id);
            return <Tag key={id} color={role?.isSuper ? 'gold' : 'blue'}>{role?.name || id}</Tag>;
          })}
        </Space>
      ),
    },
    { title: '最后登录', dataIndex: 'lastLoginAt', valueType: 'dateTime', width: 170, search: false },
    { title: '注册时间', dataIndex: 'createdAt', valueType: 'dateTime', width: 170, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 260,
      render: (_, r) => (
        <Space>
          <ModalForm
            title={`编辑管理员: ${r.username}`}
            trigger={<Button type="link">编辑</Button>}
            modalProps={{ destroyOnClose: true }}
            initialValues={{ isActive: r.isActive, roleIds: r.roleIds }}
            onFinish={async (values) => {
              await request(`/admin/v1/rbac/admin-users/${r._id}`, {
                method: 'PUT',
                body: JSON.stringify({ isActive: !!values.isActive, roleIds: values.roleIds || [] }),
              });
              message.success('更新成功');
              actionRef.current?.reload();
              return true;
            }}
          >
            <ProFormSwitch name="isActive" label="启用" />
            <ProFormSelect
              name="roleIds"
              label="角色"
              mode="multiple"
              options={roleOptions}
              rules={[{ required: true, message: '至少选择一个角色' }]}
            />
          </ModalForm>

          <Button
            type="link"
            onClick={() => {
              setPwdUser(r);
              setPwdOpen(true);
            }}
          >
            改密
          </Button>

          <Popconfirm
            title="删除该管理员？"
            onConfirm={async () => {
              await request(`/admin/v1/rbac/admin-users/${r._id}`, { method: 'DELETE' });
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
    <PageContainer title="管理员账号" subTitle="创建/禁用/分配角色/重置密码">
      <ProTable<AdminUserItem>
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        toolBarRender={() => [
          <ModalForm
            key="create"
            title="新建管理员"
            trigger={<Button type="primary">新建管理员</Button>}
            modalProps={{ destroyOnClose: true }}
            onFinish={async (values) => {
              await request('/admin/v1/rbac/admin-users', {
                method: 'POST',
                body: JSON.stringify({
                  username: values.username,
                  password: values.password,
                  isActive: values.isActive !== false,
                  roleIds: values.roleIds || [],
                }),
              });
              message.success('创建成功');
              actionRef.current?.reload();
              return true;
            }}
          >
            <ProFormText name="username" label="用户名" rules={[{ required: true }, { min: 3 }]} />
            <ProFormText.Password name="password" label="密码" rules={[{ required: true }, { min: 10 }]} />
            <ProFormSwitch name="isActive" label="启用" initialValue />
            <ProFormSelect
              name="roleIds"
              label="角色"
              mode="multiple"
              options={roleOptions}
              rules={[{ required: true, message: '至少选择一个角色' }]}
            />
          </ModalForm>,
        ]}
        request={async (params) => {
          const { current, pageSize } = params as any;
          const res = await request('/admin/v1/rbac/admin-users', {
            params: { page: current || 1, limit: pageSize || 20 },
          });
          return { data: res.items, total: res.total, success: true };
        }}
        columns={columns}
      />

      <ModalForm
        title={`重置密码: ${pwdUser?.username || ''}`}
        open={pwdOpen}
        onOpenChange={setPwdOpen}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          if (!pwdUser) return false;
          await request(`/admin/v1/rbac/admin-users/${pwdUser._id}/password`, {
            method: 'PUT',
            body: JSON.stringify({ password: values.password }),
          });
          message.success('密码已重置');
          return true;
        }}
      >
        <ProFormText.Password name="password" label="新密码" rules={[{ required: true }, { min: 10 }]} />
      </ModalForm>
    </PageContainer>
  );
}