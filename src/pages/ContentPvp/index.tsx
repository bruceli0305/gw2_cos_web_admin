import { PageContainer, ProTable, type ProColumns, type ActionType } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space, Tag } from 'antd';
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

export default function ContentPvpPage() {
  const actionRef = useRef<ActionType>(null);

  const columns: ProColumns<PvpItem>[] = [
    { title: '关键词', dataIndex: 'q', hideInTable: true },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '模式', dataIndex: 'mode', width: 110, search: false },
    { title: '地区', dataIndex: 'region', width: 110, search: false },
    { title: '发起人', dataIndex: 'creator', width: 120, render: (_, r) => <Tag>{r.creator}</Tag> },
    { title: '开始时间', dataIndex: 'startTime', valueType: 'dateTime', width: 170, search: false },
    {
      title: '创建时间',
      dataIndex: 'createdAtMs',
      valueType: 'dateTime',
      width: 170,
      search: false,
      renderText: (_, r) => new Date(r.createdAtMs).toISOString(),
    },
    { title: '报名数', dataIndex: 'signupCount', width: 80, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="强制删除该 PvP 招募？"
            onConfirm={async () => {
              await request(`/admin/v1/pvp/${record._id}`, { method: 'DELETE' });
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
    <PageContainer title="PvP 招募管理" subTitle="列表/搜索/强制删除">
      <ProTable<PvpItem>
        actionRef={actionRef}
        rowKey="_id"
        columns={columns}
        cardBordered
        request={async (params) => {
          const { current, pageSize, q } = params as any;
          const res = await request('/admin/v1/pvp', {
            params: { page: current || 1, limit: pageSize || 20, q: q || '' },
          });
          return { data: res.items, total: res.total, success: true };
        }}
      />
    </PageContainer>
  );
}