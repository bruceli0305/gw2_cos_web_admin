import { PageContainer, ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, Popconfirm, Space, Tag, message } from 'antd';
import { useRef } from 'react';
import { request } from '../../services/request';

type PvpItem = {
  _id: string;
  title: string;
  mode: string;
  region: string;
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

type PvpListResponse = {
  items: PvpItem[];
  total: number;
};

export default function ContentPvpPage() {
  const actionRef = useRef<ActionType>(null);

  const columns: ProColumns<PvpItem>[] = [
    { title: 'Keyword', dataIndex: 'q', hideInTable: true },
    { title: 'Title', dataIndex: 'title', ellipsis: true },
    { title: 'Mode', dataIndex: 'mode', width: 110, search: false },
    { title: 'Region', dataIndex: 'region', width: 110, search: false },
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
            title="Delete this PvP recruitment entry?"
            onConfirm={async () => {
              await request(`/admin/v1/pvp/${record._id}`, { method: 'DELETE' });
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
    <PageContainer title="PvP Recruitment" subTitle="List, search, and force-delete entries">
      <ProTable<PvpItem>
        actionRef={actionRef}
        rowKey="_id"
        columns={columns}
        cardBordered
        request={async (params) => {
          const query = params as TableRequestParams;
          const res = await request<PvpListResponse>('/admin/v1/pvp', {
            params: { page: query.current || 1, limit: query.pageSize || 20, q: query.q || '' },
          });
          return { data: res.items, total: res.total, success: true };
        }}
      />
    </PageContainer>
  );
}
