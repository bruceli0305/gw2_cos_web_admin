import {
  ModalForm,
  PageContainer,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { DeleteOutlined, EyeOutlined, KeyOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Modal,
  Popconfirm,
  Row,
  Space,
  Spin,
  Statistic,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import { useRef, useState } from 'react';
import { getDestructivePopconfirmProps } from '../../components/confirmProps';
import { PageNoticeAlert, PageRequestErrorAlert } from '../../components/listPageState';
import { getFilterAwareTableProps } from '../../components/tableState';
import { getErrorMessage, request } from '../../services/request';

type UserItem = {
  _id: string;
  username: string;
  isBanned: boolean;
  isAdmin: boolean;
  lastLoginAt?: string;
  createdAt: string;
};

type TableRequestParams = {
  current?: number;
  pageSize?: number;
  username?: string;
};

type UserListResponse = {
  items: UserItem[];
  total: number;
};

type UserApiKeyItem = {
  id: string;
  label?: string;
  maskedKey: string;
  tokenName?: string;
  permissions?: string[];
  accountName?: string;
  lastUsedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive: boolean;
  source: 'keyStore' | 'legacyUserField';
};

type UserApiKeyResponse = {
  user: {
    _id: string;
    username: string;
  };
  items: UserApiKeyItem[];
};

type CreateUserValues = {
  username: string;
  password: string;
};

type ResetPasswordValues = {
  newPassword: string;
};

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('zh-CN', { hour12: false });
}

export default function UserListPage() {
  const actionRef = useRef<ActionType>(null);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [apiKeyUser, setApiKeyUser] = useState<UserItem | null>(null);
  const [apiKeyItems, setApiKeyItems] = useState<UserApiKeyItem[]>([]);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeyErrorMessage, setApiKeyErrorMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearch, setHasSearch] = useState(false);
  const [tableSummary, setTableSummary] = useState({ total: 0, rows: 0, banned: 0, admins: 0 });
  const tableState = getFilterAwareTableProps({
    hasFilters: hasSearch,
    searchText: '搜索玩家账号',
    filteredEmptyText: '没有匹配当前筛选条件的玩家账号。',
    emptyText: '当前还没有创建任何前台玩家账号。',
  });

  async function loadUserApiKeys(user: UserItem) {
    setApiKeyUser(user);
    setApiKeyModalOpen(true);
    setApiKeyLoading(true);
    setApiKeyErrorMessage(null);
    setApiKeyItems([]);

    try {
      const response = await request<UserApiKeyResponse>(`/admin/v1/users/${user._id}/api-keys`);
      setApiKeyItems(response.items);
    } catch (error: unknown) {
      setApiKeyItems([]);
      setApiKeyErrorMessage(getErrorMessage(error, '加载绑定的 GW2 API Key 失败'));
    } finally {
      setApiKeyLoading(false);
    }
  }

  const columns: ProColumns<UserItem>[] = [
    {
      title: '用户名',
      dataIndex: 'username',
      copyable: true,
      fieldProps: { placeholder: '按用户名搜索' },
    },
    {
      title: '状态',
      dataIndex: 'isBanned',
      valueType: 'select',
      valueEnum: {
        false: { text: '正常', status: 'Success' },
        true: { text: '封禁', status: 'Error' },
      },
      render: (_, record) => (
        <Tag color={record.isBanned ? 'error' : 'success'}>
          {record.isBanned ? '封禁' : '正常'}
        </Tag>
      ),
    },
    {
      title: '最近登录',
      dataIndex: 'lastLoginAt',
      valueType: 'dateTime',
      search: false,
      width: 170,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      search: false,
      width: 170,
    },
    {
      title: '操作',
      key: 'action',
      valueType: 'option',
      width: 420,
      render: (_, record) => (
        <Space wrap>
          <Switch
            checkedChildren="封禁"
            unCheckedChildren="正常"
            size="small"
            checked={record.isBanned}
            onChange={async (checked) => {
              try {
                await request(`/admin/v1/users/${record._id}/ban`, {
                  method: 'PUT',
                  body: JSON.stringify({ isBanned: checked }),
                });
                message.success('玩家账号状态已更新');
                actionRef.current?.reload();
              } catch (error: unknown) {
                message.error(getErrorMessage(error, '更新玩家账号状态失败'));
              }
            }}
          />

          <Button type="link" onClick={() => void loadUserApiKeys(record)}>
            <EyeOutlined /> 查看 API Key
          </Button>

          <Button
            type="link"
            onClick={() => {
              setCurrentUser(record);
              setPasswordModalVisible(true);
            }}
          >
            <KeyOutlined /> 重置密码
          </Button>

          <Popconfirm
            {...getDestructivePopconfirmProps({
              title: '确定删除这个玩家账号吗？',
              description: '该账号会从前台用户系统中移除，删除后不可恢复。',
            })}
            onConfirm={async () => {
              try {
                await request(`/admin/v1/users/${record._id}`, { method: 'DELETE' });
                message.success('玩家账号已删除');
                actionRef.current?.reload();
              } catch (error: unknown) {
                message.error(getErrorMessage(error, '删除玩家账号失败'));
              }
            }}
          >
            <Button type="link" danger>
              <DeleteOutlined /> 删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="玩家账号" subTitle="管理前台玩家账号、访问状态、API Key 和密码重置。">
      <PageRequestErrorAlert
        message="无法加载玩家账号"
        description={errorMessage}
        onRetry={() => actionRef.current?.reload()}
      />

      <PageNoticeAlert
        type="info"
        message="本页可直接完成的管理动作"
        description={(
          <div>
            <div>1. 新建前台玩家账号，并查看账号当前是否处于封禁状态。</div>
            <div>2. 直接查看用户绑定的 GW2 API Key、重置密码或删除账号。</div>
            <div>3. 搜索用户名时，顶部摘要会切换为当前筛选结果视图。</div>
          </div>
        )}
        marginBottom={12}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title={hasSearch ? '筛选结果数' : '账号总量'} value={tableSummary.total} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>
              {hasSearch ? '当前搜索条件下的总匹配账号数。' : '当前前台玩家账号总量。'}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前页封禁数" value={tableSummary.banned} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>便于快速判断当前结果页是否存在异常账号。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前页管理标记" value={tableSummary.admins} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>用于识别带后台标记的特殊账号记录。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前视图" value={hasSearch ? '筛选中' : '全部账号'} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>
              当前页展示 {tableSummary.rows} 条记录，可继续查看 API Key 与账号操作。
            </div>
          </Card>
        </Col>
      </Row>

      <ProTable<UserItem>
        headerTitle="玩家账号列表"
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        {...tableState}
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            新建玩家账号
          </Button>,
        ]}
        request={async (params) => {
          const query = params as TableRequestParams;
          setHasSearch(Boolean(query.username));

          try {
            const res = await request<UserListResponse>('/admin/v1/users', {
              params: {
                page: query.current || 1,
                limit: query.pageSize || 20,
                q: query.username || '',
              },
            });
            setTableSummary({
              total: res.total,
              rows: res.items.length,
              banned: res.items.filter((item) => item.isBanned).length,
              admins: res.items.filter((item) => item.isAdmin).length,
            });
            setErrorMessage(null);
            return {
              data: res.items,
              success: true,
              total: res.total,
            };
          } catch (error: unknown) {
            setErrorMessage(getErrorMessage(error, '加载玩家账号失败'));
            throw error;
          }
        }}
        columns={columns}
      />

      <Modal
        title={`已绑定 API Key：${apiKeyUser?.username ?? ''}`}
        open={apiKeyModalOpen}
        width={760}
        footer={null}
        destroyOnClose
        onCancel={() => {
          setApiKeyModalOpen(false);
          setApiKeyUser(null);
          setApiKeyItems([]);
          setApiKeyErrorMessage(null);
        }}
      >
        {apiKeyLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Spin />
          </div>
        ) : (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {apiKeyErrorMessage ? (
              <Alert
                type="error"
                showIcon
                message="无法加载已绑定的 API Key"
                description={apiKeyErrorMessage}
                action={
                  apiKeyUser ? (
                    <Button size="small" onClick={() => void loadUserApiKeys(apiKeyUser)}>
                      重试
                    </Button>
                  ) : undefined
                }
              />
            ) : null}

            {!apiKeyErrorMessage && apiKeyItems.length === 0 ? (
              <Empty description="该玩家账号当前还没有绑定任何 API Key。" />
            ) : null}

            {!apiKeyErrorMessage &&
              apiKeyItems.map((item) => (
                <Card
                  key={item.id}
                  size="small"
                  title={item.label?.trim() || item.tokenName?.trim() || '未命名 API Key'}
                  extra={
                    <Space size={8}>
                      {item.source === 'legacyUserField' ? <Tag color="warning">旧版字段</Tag> : null}
                      <Tag color={item.isActive ? 'processing' : 'default'}>
                        {item.isActive ? '当前启用' : '已保存'}
                      </Tag>
                    </Space>
                  }
                >
                  <Descriptions size="small" column={2}>
                    <Descriptions.Item label="脱敏 Key">
                      <Typography.Text code>{item.maskedKey || '-'}</Typography.Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Token 名称">{item.tokenName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="GW2 账号">{item.accountName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="最近使用">{formatDateTime(item.lastUsedAt)}</Descriptions.Item>
                    <Descriptions.Item label="最近更新">{formatDateTime(item.updatedAt)}</Descriptions.Item>
                    <Descriptions.Item label="创建时间">{formatDateTime(item.createdAt)}</Descriptions.Item>
                    <Descriptions.Item label="权限范围" span={2}>
                      {item.permissions?.length ? (
                        <Space wrap size={[8, 8]}>
                          {item.permissions.map((permission) => (
                            <Tag key={permission}>{permission}</Tag>
                          ))}
                        </Space>
                      ) : (
                        '-'
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              ))}
          </Space>
        )}
      </Modal>

      <ModalForm<CreateUserValues>
        title="新建玩家账号"
        open={createOpen}
        onOpenChange={setCreateOpen}
        width={420}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          try {
            await request('/admin/v1/users', {
              method: 'POST',
              body: JSON.stringify({
                username: values.username,
                password: values.password,
              }),
            });
            message.success('玩家账号已创建');
            actionRef.current?.reload();
            return true;
          } catch (error: unknown) {
            message.error(getErrorMessage(error, '创建玩家账号失败'));
            return false;
          }
        }}
      >
        <ProFormText
          name="username"
          label="用户名"
          placeholder="至少 4 个字符"
          rules={[{ required: true, message: '必填' }, { min: 4, message: '至少 4 个字符' }]}
        />
        <ProFormText.Password
          name="password"
          label="初始密码"
          placeholder="至少 8 个字符"
          rules={[{ required: true, message: '必填' }, { min: 8, message: '至少 8 个字符' }]}
        />
      </ModalForm>

      <ModalForm<ResetPasswordValues>
        title={`重置账号密码：${currentUser?.username ?? ''}`}
        open={passwordModalVisible}
        onOpenChange={setPasswordModalVisible}
        width={400}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          if (!currentUser) return false;
          try {
            await request(`/admin/v1/users/${currentUser._id}/password`, {
              method: 'PUT',
              body: JSON.stringify({ password: values.newPassword }),
            });
            message.success('账号密码已重置');
            return true;
          } catch (error: unknown) {
            message.error(getErrorMessage(error, '重置账号密码失败'));
            return false;
          }
        }}
      >
        <ProFormText.Password
          name="newPassword"
          label="新密码"
          placeholder="至少 8 个字符"
          rules={[{ required: true, message: '必填' }, { min: 8, message: '至少 8 个字符' }]}
        />
      </ModalForm>
    </PageContainer>
  );
}
