import { PageContainer, ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, Popconfirm, Space, Tag, message } from 'antd';
import { useRef } from 'react';
import { request } from '../../services/request';

type RaidItem = {
  _id: string;
  title: string;
  description: string;
  joinMethod: string;
  startTime: string;
  createdAtMs: number;
  creator: string;
  signupCount: number;
};

type TableRequestParams = {
  current?: number;
  pageSize?: number;
  q?: string;
};

type RaidListResponse = {
  items: RaidItem[];
  total: number;
};

export default function ContentRaidsPage() {
  const actionRef = useRef<ActionType>(null);

  const columns: ProColumns<RaidItem>[] = [
    { title: 'Keyword', dataIndex: 'q', hideInTable: true },
    { title: 'Title', dataIndex: 'title', ellipsis: true },
    { title: 'Creator', dataIndex: 'creator', width: 120, render: (_, record) => <Tag>{record.creator}</Tag> },
    { title: 'Start Time', dataIndex: 'startTime', valueType: 'dateTime', width: 170, search: false },
    {
      title: 'Created At',
      dataIndex: 'createdAtMs',
      valueType: 'dateTime',
      width: 170,
      search: false,
      renderText: (_, record) => new Date(record.createdAtMs).toISOString(),
    },
    { title: 'Signups', dataIndex: 'signupCount', width: 80, search: false },
    {
      title: 'Actions',
      valueType: 'option',
      width: 120,
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="Delete this raid recruitment entry?"
            onConfirm={async () => {
              await request(`/admin/v1/raids/${record._id}`, { method: 'DELETE' });
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
    <PageContainer title="Raid Recruitment" subTitle="List, search, and force-delete entries">
      <ProTable<RaidItem>
        actionRef={actionRef}
        rowKey="_id"
        columns={columns}
        cardBordered
        request={async (params) => {
          const query = params as TableRequestParams;
          const res = await request<RaidListResponse>('/admin/v1/raids', {
            params: { page: query.current || 1, limit: query.pageSize || 20, q: query.q || '' },
          });
          return { data: res.items, total: res.total, success: true };
        }}
      />
    </PageContainer>
  );
}
