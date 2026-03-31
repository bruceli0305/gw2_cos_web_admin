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
import { Button, Card, Col, Row, Statistic, message, Popconfirm, Space, Tag } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { PageNoticeAlert } from '../../components/listPageState';
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
  const roleSummary = useMemo(() => {
    const superRoles = roles.filter((role) => role.isSuper).length;
    const directPermissionRoles = roles.filter((role) => !role.isSuper && (role.permissionKeys?.length || 0) > 0).length;
    const permissionModules = new Set(permissions.map((permission) => permission.module).filter(Boolean)).size;
    return {
      totalRoles: roles.length,
      superRoles,
      directPermissionRoles,
      permissionModules,
    };
  }, [permissions, roles]);

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
    let active = true;

    async function loadInitialData() {
      try {
        const [pRes, rRes] = await Promise.all([
          request<{ items: PermissionDef[] }>('/admin/v1/rbac/permissions'),
          request<{ items: RoleItem[] }>('/admin/v1/rbac/roles'),
        ]);

        if (!active) return;
        setPermissions(pRes.items);
        setRoles(rRes.items);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInitialData().catch(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const columns: ProColumns<RoleItem>[] = [
    { title: '角色名', dataIndex: 'name', width: 160 },
    {
      title: '类型',
      dataIndex: 'isSuper',
      width: 120,
      render: (_, r) => (r.isSuper ? <Tag color="gold">超级</Tag> : <Tag>普通</Tag>),
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
            description="删除后，已绑定此角色的管理员将失去这组权限定义。"
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
      subTitle="维护角色模板与权限组合，供管理员账号复用。"
      extra={[
        <Button key="create" type="primary" onClick={() => setCreateOpen(true)}>
          新建角色
        </Button>,
      ]}
    >
      <PageNoticeAlert
        type="info"
        message="本页维护后台角色模板"
        description={(
          <div>
            <div>1. 普通角色通过 permissionKeys 组合权限；超级角色不需要逐项配置权限。</div>
            <div>2. 删除角色前请确认没有管理员仍依赖这组权限定义。</div>
            <div>3. 这里维护的是角色模板，不直接修改管理员账号本身。</div>
          </div>
        )}
        marginBottom={12}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="角色总量" value={roleSummary.totalRoles} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前后台可分配的角色模板总数。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="超级角色" value={roleSummary.superRoles} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>拥有全量权限、无需逐项勾选的角色数量。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="已配权限角色" value={roleSummary.directPermissionRoles} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前已显式绑定 permissionKeys 的普通角色数量。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="权限模块" value={roleSummary.permissionModules} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前权限定义覆盖的模块数量。</div>
          </Card>
        </Col>
      </Row>

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
        modalProps={{ destroyOnClose: true, width: 860 }}
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
        <ProFormText
          name="name"
          label="角色名"
          rules={[{ required: true }]}
          fieldProps={{ placeholder: '例如：内容审核 / 战场公会运营 / 翻译缓存维护' }}
        />
        <ProFormText
          name="description"
          label="描述"
          fieldProps={{ placeholder: '简要说明这个角色适合哪类后台职责' }}
        />
        <ProFormSwitch name="isSuper" label="超级管理员" />

        <ProFormDependency name={['isSuper']}>
          {({ isSuper }) =>
            isSuper ? (
              <div style={{ color: '#888' }}>超级角色无需配置权限（自动放行）</div>
            ) : (
              <ProFormCheckbox.Group
                name="permissionKeys"
                label="权限"
                options={permOptions}
                extra="建议按后台职责分组授予权限，避免把无关模块堆进同一个角色。"
              />
            )
          }
        </ProFormDependency>
      </ModalForm>

      <ModalForm
        title={`编辑角色: ${current?.name || ''}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        modalProps={{ destroyOnClose: true, width: 860 }}
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
        <ProFormText
          name="name"
          label="角色名"
          rules={[{ required: true }]}
          fieldProps={{ placeholder: '例如：内容审核 / 战场公会运营 / 翻译缓存维护' }}
        />
        <ProFormText
          name="description"
          label="描述"
          fieldProps={{ placeholder: '简要说明这个角色适合哪类后台职责' }}
        />
        <ProFormSwitch name="isSuper" label="超级管理员" />

        <ProFormDependency name={['isSuper']}>
          {({ isSuper }) =>
            isSuper ? (
              <div style={{ color: '#888' }}>超级角色无需配置权限（自动放行）</div>
            ) : (
              <ProFormCheckbox.Group
                name="permissionKeys"
                label="权限"
                options={permOptions}
                extra="修改后会直接影响所有绑定此角色的管理员账号可见菜单和可用操作。"
              />
            )
          }
        </ProFormDependency>
      </ModalForm>
    </PageContainer>
  );
}
