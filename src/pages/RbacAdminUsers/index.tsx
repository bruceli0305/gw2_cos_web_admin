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
import { Button, Card, Col, Popconfirm, Row, Space, Statistic, Tag, message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageNoticeAlert, PageRequestErrorAlert } from '../../components/listPageState';
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
  const [pageRows, setPageRows] = useState<AdminUserItem[]>([]);
  const [tableTotal, setTableTotal] = useState(0);
  const roleOptions = useMemo(
    () => roles.map((role) => ({ label: role.isSuper ? `${role.name}（超级）` : role.name, value: role._id })),
    [roles],
  );
  const roleMap = useMemo(() => new Map(roles.map((role) => [role._id, role])), [roles]);
  const adminSummary = useMemo(
    () => ({
      total: tableTotal,
      rows: pageRows.length,
      active: pageRows.filter((item) => item.isActive).length,
      superRoleUsers: pageRows.filter((item) => item.roleIds.some((roleId) => roleMap.get(roleId)?.isSuper)).length,
    }),
    [pageRows, roleMap, tableTotal],
  );

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
          setRolesErrorMessage(getErrorMessage(error, '加载角色选项失败'));
        }
      }
    }

    void loadInitialRoles();
    return () => {
      active = false;
    };
  }, [fetchRoles]);

  const columns: ProColumns<AdminUserItem>[] = [
    { title: '账号名', dataIndex: 'username', copyable: true },
    {
      title: '状态',
      dataIndex: 'isActive',
      width: 120,
      render: (_, record) => (record.isActive ? <Tag color="success">启用</Tag> : <Tag color="error">停用</Tag>),
    },
    {
      title: '角色',
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
    { title: '最近登录', dataIndex: 'lastLoginAt', valueType: 'dateTime', width: 170, search: false },
    { title: '创建时间', dataIndex: 'createdAt', valueType: 'dateTime', width: 170, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 280,
      render: (_, record) => (
        <Space wrap>
          <ModalForm<AdminUserEditValues>
            title={`编辑管理员账号：${record.username}`}
            trigger={<Button type="link">编辑</Button>}
            modalProps={{ destroyOnClose: true }}
            initialValues={{ isActive: record.isActive, roleIds: record.roleIds }}
            onFinish={async (values) => {
              await request(`/admin/v1/rbac/admin-users/${record._id}`, {
                method: 'PUT',
                body: JSON.stringify({ isActive: !!values.isActive, roleIds: values.roleIds || [] }),
              });
              message.success('管理员账号已更新');
              actionRef.current?.reload();
              return true;
            }}
          >
            <ProFormSwitch name="isActive" label="启用账号" />
            <ProFormSelect
              name="roleIds"
              label="角色"
              mode="multiple"
              options={roleOptions}
              rules={[{ required: true, message: '请至少选择一个角色' }]}
            />
          </ModalForm>

          <Button
            type="link"
            onClick={() => {
              setPwdUser(record);
              setPwdOpen(true);
            }}
          >
            重置密码
          </Button>

          <Popconfirm
            title="确认删除这个管理员账号吗？"
            description="删除后这个后台账号将无法继续登录管理台，但不会改写角色模板定义。"
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={async () => {
              await request(`/admin/v1/rbac/admin-users/${record._id}`, { method: 'DELETE' });
              message.success('管理员账号已删除');
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
    <PageContainer title="管理员账号" subTitle="创建后台账号、分配角色、控制访问状态，并处理密码重置。">
      <PageRequestErrorAlert
        message="无法加载角色选项"
        description={rolesErrorMessage}
        onRetry={() => void loadRoles().catch(() => undefined)}
      />

      <PageRequestErrorAlert
        message="无法加载管理员账号列表"
        description={tableErrorMessage}
        onRetry={() => actionRef.current?.reload()}
      />

      <PageNoticeAlert
        type="info"
        message="本页管理后台登录账号与角色边界"
        description={(
          <div>
            <div>1. 在这里创建后台管理员账号、分配角色，并控制账号启停状态。</div>
            <div>2. 顶部摘要会同时展示账号规模、当前页启用数和超级角色关联情况。</div>
            <div>3. 角色模板数量来自上游 RBAC 角色表，账号列表本身不会改写角色定义。</div>
          </div>
        )}
        marginBottom={12}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="管理员总量" value={adminSummary.total} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前后台可管理的管理员账号总数。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前页启用数" value={adminSummary.active} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前结果页里处于启用状态的管理员账号数。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="超级角色关联" value={adminSummary.superRoleUsers} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前结果页里挂载超级角色的管理员账号数。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="角色模板数" value={roles.length} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>
              当前页展示 {adminSummary.rows} 条账号记录，可直接继续编辑角色或重置密码。
            </div>
          </Card>
        </Col>
      </Row>

      <ProTable<AdminUserItem>
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        locale={{ emptyText: '当前还没有创建任何管理员账号。' }}
        toolBarRender={() => [
          <ModalForm<AdminUserCreateValues>
            key="create"
            title="新建管理员账号"
            trigger={<Button type="primary">新建管理员账号</Button>}
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
              message.success('管理员账号已创建');
              actionRef.current?.reload();
              return true;
            }}
          >
            <ProFormText
              name="username"
              label="账号名"
              placeholder="至少 3 个字符"
              rules={[{ required: true, message: '必填' }, { min: 3, message: '至少 3 个字符' }]}
            />
            <ProFormText.Password
              name="password"
              label="密码"
              placeholder="至少 10 个字符"
              rules={[{ required: true, message: '必填' }, { min: 10, message: '至少 10 个字符' }]}
            />
            <ProFormSwitch name="isActive" label="启用账号" initialValue />
            <ProFormSelect
              name="roleIds"
              label="角色"
              mode="multiple"
              options={roleOptions}
              rules={[{ required: true, message: '请至少选择一个角色' }]}
            />
          </ModalForm>,
        ]}
        request={async (params) => {
          const query = params as TableRequestParams;
          try {
            const res = await request<AdminUserListResponse>('/admin/v1/rbac/admin-users', {
              params: { page: query.current || 1, limit: query.pageSize || 20 },
            });
            setPageRows(res.items);
            setTableTotal(res.total);
            setTableErrorMessage(null);
            return { data: res.items, total: res.total, success: true };
          } catch (error: unknown) {
            setTableErrorMessage(getErrorMessage(error, '加载管理员账号列表失败'));
            throw error;
          }
        }}
        columns={columns}
      />

      <ModalForm<ResetPasswordValues>
        title={`重置密码：${pwdUser?.username || ''}`}
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
        <ProFormText.Password
          name="password"
          label="新密码"
          placeholder="至少 10 个字符"
          rules={[{ required: true, message: '必填' }, { min: 10, message: '至少 10 个字符' }]}
        />
      </ModalForm>
    </PageContainer>
  );
}
