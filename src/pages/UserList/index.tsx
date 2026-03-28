import {
  PageContainer,
  ProTable,
  type ActionType,
  type ProColumns,
  ModalForm,
  ProFormText,
} from '@ant-design/pro-components';
import { DeleteOutlined, KeyOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Switch, Tag, message } from 'antd';
import { useRef, useState } from 'react';
import { PageRequestErrorAlert } from '../../components/listPageState';
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

type CreateUserValues = {
  username: string;
  password: string;
};

type ResetPasswordValues = {
  newPassword: string;
};

export default function UserListPage() {
  const actionRef = useRef<ActionType>(null);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearch, setHasSearch] = useState(false);
  const tableState = getFilterAwareTableProps({
    hasFilters: hasSearch,
    searchText: 'Search users',
    filteredEmptyText: 'No users match the current search.',
    emptyText: 'No frontend users found yet.',
  });

  const columns: ProColumns<UserItem>[] = [
    {
      title: 'Username',
      dataIndex: 'username',
      copyable: true,
      fieldProps: { placeholder: 'Search by username' },
    },
    {
      title: 'Status',
      dataIndex: 'isBanned',
      valueType: 'select',
      valueEnum: {
        false: { text: 'Active', status: 'Success' },
        true: { text: 'Banned', status: 'Error' },
      },
      render: (_, record) => (
        <Tag color={record.isBanned ? 'error' : 'success'}>
          {record.isBanned ? 'Banned' : 'Active'}
        </Tag>
      ),
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLoginAt',
      valueType: 'dateTime',
      search: false,
      width: 170,
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      search: false,
      width: 170,
    },
    {
      title: 'Actions',
      key: 'action',
      valueType: 'option',
      width: 260,
      render: (_, record) => (
        <Space>
          <Switch
            checkedChildren="Ban"
            unCheckedChildren="OK"
            size="small"
            checked={record.isBanned}
            onChange={async (checked) => {
              try {
                await request(`/admin/v1/users/${record._id}/ban`, {
                  method: 'PUT',
                  body: JSON.stringify({ isBanned: checked }),
                });
                message.success('User status updated');
                actionRef.current?.reload();
              } catch (error: unknown) {
                message.error(getErrorMessage(error, 'Failed to update user status'));
              }
            }}
          />

          <a
            onClick={() => {
              setCurrentUser(record);
              setPasswordModalVisible(true);
            }}
          >
            <KeyOutlined /> Reset Password
          </a>

          <Popconfirm
            title="Delete this user?"
            description="This action cannot be undone."
            onConfirm={async () => {
              try {
                await request(`/admin/v1/users/${record._id}`, { method: 'DELETE' });
                message.success('User deleted');
                actionRef.current?.reload();
              } catch (error: unknown) {
                message.error(getErrorMessage(error, 'Failed to delete user'));
              }
            }}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <a style={{ color: '#ff4d4f' }}>
              <DeleteOutlined /> Delete
            </a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="Users" subTitle="Manage frontend users">
      <PageRequestErrorAlert
        message="Unable to load users"
        description={errorMessage}
        onRetry={() => actionRef.current?.reload()}
      />

      <ProTable<UserItem>
        headerTitle="User Records"
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        {...tableState}
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Create User
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
            setErrorMessage(null);
            return {
              data: res.items,
              success: true,
              total: res.total,
            };
          } catch (error: unknown) {
            setErrorMessage(getErrorMessage(error, 'Failed to load users'));
            throw error;
          }
        }}
        columns={columns}
      />

      <ModalForm<CreateUserValues>
        title="Create Frontend User"
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
            message.success('User created');
            actionRef.current?.reload();
            return true;
          } catch (error: unknown) {
            message.error(getErrorMessage(error, 'Failed to create user'));
            return false;
          }
        }}
      >
        <ProFormText
          name="username"
          label="Username"
          placeholder="At least 4 characters"
          rules={[{ required: true, message: 'Required' }, { min: 4, message: 'At least 4 characters' }]}
        />
        <ProFormText.Password
          name="password"
          label="Initial Password"
          placeholder="At least 8 characters"
          rules={[{ required: true, message: 'Required' }, { min: 8, message: 'At least 8 characters' }]}
        />
      </ModalForm>

      <ModalForm<ResetPasswordValues>
        title={`Reset Password: ${currentUser?.username ?? ''}`}
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
            message.success('Password reset');
            return true;
          } catch (error: unknown) {
            message.error(getErrorMessage(error, 'Failed to reset password'));
            return false;
          }
        }}
      >
        <ProFormText.Password
          name="newPassword"
          label="New Password"
          placeholder="At least 8 characters"
          rules={[{ required: true, message: 'Required' }, { min: 8, message: 'At least 8 characters' }]}
        />
      </ModalForm>
    </PageContainer>
  );
}
