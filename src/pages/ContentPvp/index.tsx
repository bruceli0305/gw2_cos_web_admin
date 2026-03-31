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
    { title: '关键词', dataIndex: 'q', hideInTable: true },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '模式', dataIndex: 'mode', width: 110, search: false },
    { title: '地区', dataIndex: 'region', width: 110, search: false },
    { title: '创建者', dataIndex: 'creator', width: 120, render: (_, record) => <Tag>{record.creator}</Tag> },
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
            title="确认删除这个 PvP 招募条目吗？"
            onConfirm={async () => {
              await request(`/admin/v1/pvp/${record._id}`, { method: 'DELETE' });
              message.success('删除成功');
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
    <PageContainer title="PvP 招募" subTitle="查看、搜索和强制删除前台 PvP 招募条目。">
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
