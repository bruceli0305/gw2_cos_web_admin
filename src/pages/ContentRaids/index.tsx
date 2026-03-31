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
    { title: '关键词', dataIndex: 'q', hideInTable: true },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '发起人', dataIndex: 'creator', width: 120, render: (_, record) => <Tag>{record.creator}</Tag> },
    { title: '开始时间', dataIndex: 'startTime', valueType: 'dateTime', width: 170, search: false },
    {
      title: '创建时间',
      dataIndex: 'createdAtMs',
      valueType: 'dateTime',
      width: 170,
      search: false,
      renderText: (_, record) => new Date(record.createdAtMs).toISOString(),
    },
    { title: '报名数', dataIndex: 'signupCount', width: 80, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="确定删除该团本招募条目？"
            onConfirm={async () => {
              await request(`/admin/v1/raids/${record._id}`, { method: 'DELETE' });
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
    <PageContainer title="团本招募" subTitle="查看、搜索和强制删除前台招募条目。">
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
