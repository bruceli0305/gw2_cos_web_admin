import {
  PageContainer,
  ProTable,
  type ProColumns,
  type ActionType,
  ModalForm,
  ProFormText,
} from '@ant-design/pro-components';
import { Tag, Switch, message, Button, Popconfirm, Space } from 'antd';
import { useRef, useState } from 'react';
import { PlusOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import { request } from '../../services/request';

type UserItem = {
  _id: string;
  username: string;
  isBanned: boolean;
  isAdmin: boolean;
  lastLoginAt?: string;
  createdAt: string;
};

export default function UserListPage() {
  const actionRef = useRef<ActionType>(null);

  // 修改密码弹窗
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserItem | null>(null);

  // 新建用户弹窗
  const [createOpen, setCreateOpen] = useState(false);

  const columns: ProColumns<UserItem>[] = [
    {
      title: '用户名',
      dataIndex: 'username',
      copyable: true,
      fieldProps: { placeholder: '输入用户名搜索' },
    },
    {
      title: '状态',
      dataIndex: 'isBanned',
      valueType: 'select',
      valueEnum: {
        false: { text: '正常', status: 'Success' },
        true: { text: '已封禁', status: 'Error' },
      },
      render: (_, record) => (
        <Tag color={record.isBanned ? 'error' : 'success'}>
          {record.isBanned ? '已封禁' : '正常'}
        </Tag>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      valueType: 'dateTime',
      search: false,
      width: 170,
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      search: false,
      width: 170,
    },
    {
      title: '操作',
      key: 'action',
      valueType: 'option',
      width: 260,
      render: (_, record) => (
        <Space>
          <Switch
            checkedChildren="封"
            unCheckedChildren="正"
            size="small"
            checked={record.isBanned}
            onChange={async (checked) => {
              try {
                await request(`/admin/v1/users/${record._id}/ban`, {
                  method: 'PUT',
                  body: JSON.stringify({ isBanned: checked }),
                });
                message.success('状态更新成功');
                actionRef.current?.reload();
              } catch {}
            }}
          />

          <a
            onClick={() => {
              setCurrentUser(record);
              setPasswordModalVisible(true);
            }}
          >
            <KeyOutlined /> 改密
          </a>

          <Popconfirm
            title="确定要删除该用户吗？"
            description="此操作不可恢复！"
            onConfirm={async () => {
              try {
                await request(`/admin/v1/users/${record._id}`, { method: 'DELETE' });
                message.success('用户已删除');
                actionRef.current?.reload();
              } catch {}
            }}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <a style={{ color: '#ff4d4f' }}>
              <DeleteOutlined /> 删除
            </a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="用户列表" subTitle="管理前台用户">
      <ProTable<UserItem>
        headerTitle="用户数据"
        actionRef={actionRef}
        rowKey="_id"
        search={{ labelWidth: 'auto' }}
        cardBordered
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            新建用户
          </Button>,
        ]}
        request={async (params) => {
          const { current, pageSize, username } = params as any;
          const res = await request('/admin/v1/users', {
            params: {
              page: current || 1,
              limit: pageSize || 20,
              q: username || '',
            },
          });
          return {
            data: res.items,
            success: true,
            total: res.total,
          };
        }}
        columns={columns}
      />

      {/* 新建用户弹窗 */}
      <ModalForm
        title="新建前台用户"
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
            message.success('用户创建成功');
            actionRef.current?.reload();
            return true;
          } catch {
            return false;
          }
        }}
      >
        <ProFormText
          name="username"
          label="用户名"
          placeholder="至少4个字符"
          rules={[{ required: true, message: '必填' }, { min: 4, message: '至少4个字符' }]}
        />
        <ProFormText.Password
          name="password"
          label="初始密码"
          placeholder="至少8个字符"
          rules={[{ required: true, message: '必填' }, { min: 8, message: '至少8个字符' }]}
        />
      </ModalForm>

      {/* 修改密码弹窗 */}
      <ModalForm
        title={`重置密码: ${currentUser?.username}`}
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
            message.success('密码修改成功');
            return true;
          } catch {
            return false;
          }
        }}
      >
        <ProFormText.Password
          name="newPassword"
          label="新密码"
          placeholder="至少8个字符"
          rules={[{ required: true, message: '必填' }, { min: 8, message: '至少8个字符' }]}
        />
      </ModalForm>
    </PageContainer>
  );
}