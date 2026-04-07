import {
  ModalForm,
  PageContainer,
  ProFormSwitch,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { Button, Popconfirm, Space, Tag, message } from 'antd';
import { useRef, useState } from 'react';
import { getDestructivePopconfirmProps } from '../../components/confirmProps';
import { PageNoticeAlert, PageRequestErrorAlert } from '../../components/listPageState';
import { getErrorMessage, request } from '../../services/request';

type FortunePosterItem = {
  _id: string;
  version: string;
  status: 'live' | 'archived';
  brandTitle: string;
  brandSubtitle?: string;
  footerText?: string;
  qrCodeImageUrl?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type FortunePosterListResponse = {
  items: FortunePosterItem[];
};

type FortunePosterFormValues = {
  version?: string;
  brandTitle: string;
  brandSubtitle?: string;
  footerText?: string;
  qrCodeImageUrl?: string;
  enabled?: boolean;
};

function renderStatusTag(status: FortunePosterItem['status']) {
  return status === 'live' ? <Tag color="green">live</Tag> : <Tag>archived</Tag>;
}

export default function FortunePosterPage() {
  const actionRef = useRef<ActionType>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FortunePosterItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const columns: ProColumns<FortunePosterItem>[] = [
    {
      title: '版本',
      dataIndex: 'version',
      width: 160,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (_, record) => renderStatusTag(record.status),
    },
    {
      title: '海报标题',
      dataIndex: 'brandTitle',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>{record.brandTitle}</span>
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>{record.brandSubtitle || '-'}</span>
        </Space>
      ),
    },
    {
      title: '二维码',
      dataIndex: 'qrCodeImageUrl',
      ellipsis: true,
      render: (_, record) => record.qrCodeImageUrl || '-',
    },
    {
      title: '导出状态',
      dataIndex: 'enabled',
      width: 100,
      render: (_, record) => (record.enabled ? <Tag color="green">启用</Tag> : <Tag>关闭</Tag>),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      width: 170,
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
              setEditing(record);
              setFormOpen(true);
            }}
          >
            编辑
          </Button>

          <Popconfirm
            {...getDestructivePopconfirmProps({
              title: '确认发布这个海报配置吗？',
              description: '发布后小程序海报页会切换到该品牌文案和固定二维码配置。',
            })}
            disabled={record.status === 'live'}
            onConfirm={async () => {
              await request(`/admin/v1/fortune/poster-config/${record._id}/publish`, {
                method: 'PUT',
              });
              message.success('海报配置已发布');
              actionRef.current?.reload();
            }}
          >
            <Button type="link" disabled={record.status === 'live'}>
              发布
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="海报配置"
      subTitle="维护海报品牌文案、固定小程序码图片地址和导出开关。"
      extra={[
        <Button
          key="create"
          type="primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          新建版本
        </Button>,
      ]}
    >
      <PageNoticeAlert
        type="info"
        message="本页管理小程序海报固定资源"
        description={(
          <div>
            <div>1. `qrCodeImageUrl` 对应固定小程序码资源，不走后端动态生成。</div>
            <div>2. `enabled=false` 时前端可据此隐藏正式导出入口或提示未配置。</div>
            <div>3. 发布后只影响后续海报读取，不影响历史结果本身。</div>
          </div>
        )}
        marginBottom={12}
      />

      <PageRequestErrorAlert
        message="无法加载海报配置版本"
        description={errorMessage}
        onRetry={() => actionRef.current?.reload()}
      />

      <ProTable<FortunePosterItem>
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        search={false}
        pagination={false}
        columns={columns}
        request={async () => {
          try {
            const res = await request<FortunePosterListResponse>('/admin/v1/fortune/poster-config');
            setErrorMessage(null);
            return { data: res.items, success: true };
          } catch (error: unknown) {
            setErrorMessage(getErrorMessage(error, '加载海报配置版本失败'));
            throw error;
          }
        }}
      />

      <ModalForm<FortunePosterFormValues>
        title={editing ? '编辑海报配置' : '新建海报配置'}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        modalProps={{ destroyOnClose: true }}
        initialValues={{
          version: editing?.version,
          brandTitle: editing?.brandTitle,
          brandSubtitle: editing?.brandSubtitle,
          footerText: editing?.footerText,
          qrCodeImageUrl: editing?.qrCodeImageUrl,
          enabled: editing?.enabled ?? true,
        }}
        onFinish={async (values) => {
          const payload = {
            ...(editing ? {} : { version: values.version }),
            brandTitle: values.brandTitle,
            brandSubtitle: values.brandSubtitle || undefined,
            footerText: values.footerText || undefined,
            qrCodeImageUrl: values.qrCodeImageUrl || undefined,
            enabled: values.enabled !== false,
          };

          if (editing) {
            await request(`/admin/v1/fortune/poster-config/${editing._id}`, {
              method: 'PUT',
              body: JSON.stringify(payload),
            });
            message.success('海报配置已更新');
          } else {
            await request('/admin/v1/fortune/poster-config', {
              method: 'POST',
              body: JSON.stringify(payload),
            });
            message.success('海报配置已创建');
          }

          actionRef.current?.reload();
          return true;
        }}
      >
        {!editing ? (
          <ProFormText
            name="version"
            label="版本号"
            rules={[{ required: true, message: '必填' }]}
          />
        ) : null}

        <ProFormText
          name="brandTitle"
          label="海报标题"
          rules={[{ required: true, message: '必填' }]}
        />

        <ProFormText name="brandSubtitle" label="副标题" />
        <ProFormText name="footerText" label="底部文案" />
        <ProFormText name="qrCodeImageUrl" label="固定二维码图片地址" />
        <ProFormSwitch name="enabled" label="启用导出" />
      </ModalForm>
    </PageContainer>
  );
}
