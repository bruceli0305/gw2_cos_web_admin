import {
  ModalForm,
  PageContainer,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { Button, Popconfirm, Space, Tag, message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageRequestErrorAlert } from '../../components/listPageState';
import { getErrorMessage, request } from '../../services/request';

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

type TableRequestParams = {
  current?: number;
  pageSize?: number;
};

type AdminUserListResponse = {
  items: AdminUserItem[];
  total: number;
};

type AdminUserEditValues = {
  isActive?: boolean;
  roleIds?: string[];
};

type AdminUserCreateValues = {
  username: string;
  password: string;
  isActive?: boolean;
  roleIds?: string[];
};

type ResetPasswordValues = {
  password: string;
};

export default function RbacAdminUsersPage() {
  const actionRef = useRef<ActionType>(null);

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [rolesErrorMessage, setRolesErrorMessage] = useState<string | null>(null);
  const [tableErrorMessage, setTableErrorMessage] = useState<string | null>(null);
  const roleOptions = useMemo(
    () => roles.map((role) => ({ label: role.isSuper ? `${role.name} (Super)` : role.name, value: role._id })),
    [roles],
  );
  const roleMap = useMemo(() => new Map(roles.map((role) => [role._id, role])), [roles]);

  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdUser, setPwdUser] = useState<AdminUserItem | null>(null);

  const fetchRoles = useCallback(async () => {
    const res = await request<{ items: RoleItem[] }>('/admin/v1/rbac/roles');
    return res.items;
  }, []);

  const loadRoles = useCallback(async () => {
    const items = await fetchRoles();
    setRoles(items);
    setRolesErrorMessage(null);
    return items;
  }, [fetchRoles]);

  useEffect(() => {
    let active = true;

    async function loadInitialRoles() {
      try {
        const items = await fetchRoles();
        if (!active) return;
        setRoles(items);
        setRolesErrorMessage(null);
      } catch (error: unknown) {
        if (active) {
          setRolesErrorMessage(getErrorMessage(error, 'Failed to load role options'));
        }
      }
    }

    void loadInitialRoles();
    return () => {
      active = false;
    };
  }, [fetchRoles]);

  const columns: ProColumns<AdminUserItem>[] = [
    { title: 'Username', dataIndex: 'username', copyable: true },
    {
      title: 'Status',
      dataIndex: 'isActive',
      width: 120,
      render: (_, record) => (record.isActive ? <Tag color="success">Active</Tag> : <Tag color="error">Disabled</Tag>),
    },
    {
      title: 'Roles',
      dataIndex: 'roleIds',
      search: false,
      render: (_, record) => (
        <Space wrap>
          {(record.roleIds || []).map((roleId) => {
            const role = roleMap.get(roleId);
            return (
              <Tag key={roleId} color={role?.isSuper ? 'gold' : 'blue'}>
                {role?.name || roleId}
              </Tag>
            );
          })}
        </Space>
      ),
    },
    { title: 'Last Login', dataIndex: 'lastLoginAt', valueType: 'dateTime', width: 170, search: false },
    { title: 'Created At', dataIndex: 'createdAt', valueType: 'dateTime', width: 170, search: false },
    {
      title: 'Actions',
      valueType: 'option',
      width: 260,
      render: (_, record) => (
        <Space>
          <ModalForm<AdminUserEditValues>
            title={`Edit Admin User: ${record.username}`}
            trigger={<Button type="link">Edit</Button>}
            modalProps={{ destroyOnClose: true }}
            initialValues={{ isActive: record.isActive, roleIds: record.roleIds }}
            onFinish={async (values) => {
              await request(`/admin/v1/rbac/admin-users/${record._id}`, {
                method: 'PUT',
                body: JSON.stringify({ isActive: !!values.isActive, roleIds: values.roleIds || [] }),
              });
              message.success('Updated');
              actionRef.current?.reload();
              return true;
            }}
          >
            <ProFormSwitch name="isActive" label="Active" />
            <ProFormSelect
              name="roleIds"
              label="Roles"
              mode="multiple"
              options={roleOptions}
              rules={[{ required: true, message: 'Select at least one role' }]}
            />
          </ModalForm>

          <Button
            type="link"
            onClick={() => {
              setPwdUser(record);
              setPwdOpen(true);
            }}
          >
            Reset Password
          </Button>

          <Popconfirm
            title="Delete this admin user?"
            onConfirm={async () => {
              await request(`/admin/v1/rbac/admin-users/${record._id}`, { method: 'DELETE' });
              message.success('Deleted');
              actionRef.current?.reload();
            }}
          >
            <Button type="link" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="Admin Users" subTitle="Create, disable, assign roles, and reset passwords">
      <PageRequestErrorAlert
        message="Unable to load role options"
        description={rolesErrorMessage}
        onRetry={() => void loadRoles().catch(() => undefined)}
      />

      <PageRequestErrorAlert
        message="Unable to load admin users"
        description={tableErrorMessage}
        onRetry={() => actionRef.current?.reload()}
      />

      <ProTable<AdminUserItem>
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        locale={{ emptyText: 'No admin users have been created yet.' }}
        toolBarRender={() => [
          <ModalForm<AdminUserCreateValues>
            key="create"
            title="Create Admin User"
            trigger={<Button type="primary">Create Admin User</Button>}
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
              message.success('Created');
              actionRef.current?.reload();
              return true;
            }}
          >
            <ProFormText name="username" label="Username" rules={[{ required: true }, { min: 3 }]} />
            <ProFormText.Password name="password" label="Password" rules={[{ required: true }, { min: 10 }]} />
            <ProFormSwitch name="isActive" label="Active" initialValue />
            <ProFormSelect
              name="roleIds"
              label="Roles"
              mode="multiple"
              options={roleOptions}
              rules={[{ required: true, message: 'Select at least one role' }]}
            />
          </ModalForm>,
        ]}
        request={async (params) => {
          const query = params as TableRequestParams;
          try {
            const res = await request<AdminUserListResponse>('/admin/v1/rbac/admin-users', {
              params: { page: query.current || 1, limit: query.pageSize || 20 },
            });
            setTableErrorMessage(null);
            return { data: res.items, total: res.total, success: true };
          } catch (error: unknown) {
            setTableErrorMessage(getErrorMessage(error, 'Failed to load admin users'));
            throw error;
          }
        }}
        columns={columns}
      />

      <ModalForm<ResetPasswordValues>
        title={`Reset Password: ${pwdUser?.username || ''}`}
        open={pwdOpen}
        onOpenChange={setPwdOpen}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          if (!pwdUser) return false;
          await request(`/admin/v1/rbac/admin-users/${pwdUser._id}/password`, {
            method: 'PUT',
            body: JSON.stringify({ password: values.password }),
          });
          message.success('Password reset');
          return true;
        }}
      >
        <ProFormText.Password name="password" label="New Password" rules={[{ required: true }, { min: 10 }]} />
      </ModalForm>
    </PageContainer>
  );
}
