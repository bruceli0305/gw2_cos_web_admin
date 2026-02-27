import { PageContainer, ProTable, type ProColumns, type ActionType, ModalForm, ProFormTextArea, ProFormSelect, ProFormSwitch } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space, Tag } from 'antd';
import { useRef, useState } from 'react';
import { request } from '../../services/request';

type TranslationItem = {
  _id: string;
  direction: 'CN_TO_EN' | 'EN_TO_CN';
  sourceText: string;
  sourceTextNorm: string;
  translatedText: string;
  usageCount: number;
  providerId?: string;
  model?: string;
  updatedAt: string;
};

export default function TranslationsPage() {
  const actionRef = useRef<ActionType>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<TranslationItem | null>(null);

  const [createOpen, setCreateOpen] = useState(false);

  const columns: ProColumns<TranslationItem>[] = [
    {
      title: '关键词',
      dataIndex: 'q',
      hideInTable: true,
    },
    {
      title: '方向',
      dataIndex: 'direction',
      width: 110,
      valueEnum: {
        CN_TO_EN: { text: '中→英' },
        EN_TO_CN: { text: '英→中' },
      },
      render: (_, r) => <Tag>{r.direction === 'CN_TO_EN' ? '中→英' : '英→中'}</Tag>,
    },
    {
      title: '原文(归一化)',
      dataIndex: 'sourceTextNorm',
      ellipsis: true,
      copyable: true,
    },
    {
      title: '译文',
      dataIndex: 'translatedText',
      ellipsis: true,
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      width: 90,
      search: false,
    },
    {
      title: '模型',
      dataIndex: 'model',
      width: 140,
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
              setCurrent(record);
              setEditOpen(true);
            }}
          >
            编辑
          </Button>

          <Popconfirm
            title="确定删除该条语料？"
            onConfirm={async () => {
              await request(`/admin/v1/translations/${record._id}`, { method: 'DELETE' });
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
    <PageContainer
      title="翻译语料"
      subTitle="查看/修正/删除翻译缓存（支持手动新增）"
      extra={[
        <Button key="create" type="primary" onClick={() => setCreateOpen(true)}>
          新增语料
        </Button>,
      ]}
    >
      <ProTable<TranslationItem>
        actionRef={actionRef}
        rowKey="_id"
        columns={columns}
        cardBordered
        request={async (params) => {
          const { current, pageSize, q } = params as any;
          const res = await request('/admin/v1/translations', {
            params: {
              page: current || 1,
              limit: pageSize || 20,
              q: q || '',
              sort: 'hot',
            },
          });
          return { data: res.items, total: res.total, success: true };
        }}
      />

      <ModalForm
        title="编辑译文"
        open={editOpen}
        onOpenChange={setEditOpen}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          if (!current) return false;
          await request(`/admin/v1/translations/${current._id}`, {
            method: 'PUT',
            body: JSON.stringify({ translatedText: values.translatedText }),
          });
          message.success('已更新');
          actionRef.current?.reload();
          return true;
        }}
        initialValues={{ translatedText: current?.translatedText }}
      >
        <ProFormTextArea
          name="translatedText"
          label="译文"
          rules={[{ required: true, message: '必填' }]}
          fieldProps={{ rows: 6 }}
        />
      </ModalForm>

      <ModalForm
        title="新增翻译语料"
        open={createOpen}
        onOpenChange={setCreateOpen}
        modalProps={{ destroyOnClose: true }}
        initialValues={{ direction: 'EN_TO_CN', overwrite: true }}
        onFinish={async (values) => {
          await request('/admin/v1/translations', {
            method: 'POST',
            body: JSON.stringify({
              direction: values.direction,
              sourceText: values.sourceText,
              translatedText: values.translatedText,
              overwrite: values.overwrite,
            }),
          });
          message.success('已保存');
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormSelect
          name="direction"
          label="方向"
          valueEnum={{
            CN_TO_EN: { text: '中→英' },
            EN_TO_CN: { text: '英→中' },
          }}
          rules={[{ required: true, message: '必选' }]}
        />

        <ProFormTextArea
          name="sourceText"
          label="原文"
          rules={[{ required: true, message: '必填' }]}
          fieldProps={{ rows: 4 }}
        />

        <ProFormTextArea
          name="translatedText"
          label="译文"
          rules={[{ required: true, message: '必填' }]}
          fieldProps={{ rows: 6 }}
        />

        <ProFormSwitch
          name="overwrite"
          label="若已存在则覆盖"
        />
      </ModalForm>
    </PageContainer>
  );
}