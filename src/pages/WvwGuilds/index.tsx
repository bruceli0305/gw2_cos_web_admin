import { PageContainer, ProTable, type ProColumns, type ActionType } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space, Tag } from 'antd';
import { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../../services/request';

type Item = {
  _id: string;
  slug: string;
  name: string;
  tag: string;
  region: 'NA' | 'EU';
  server: string;
  isRecruiting: boolean;
  primeTimeCET: string;
  primeTimeBJ: string;
  tags: string[];
  updatedAt: string;
};

export default function WvwGuildsPage() {
  const actionRef = useRef<ActionType>(null);
  const nav = useNavigate();

  const regionEnum = useMemo(
    () => ({
      EU: { text: 'EU' },
      NA: { text: 'NA' },
    }),
    []
  );

  const recruitingEnum = useMemo(
    () => ({
      true: { text: '招募中' },
      false: { text: '暂停招募' },
    }),
    []
  );

  const columns: ProColumns<Item>[] = [
    { title: '关键词', dataIndex: 'q', hideInTable: true },
    { title: 'Region', dataIndex: 'region', valueType: 'select', valueEnum: regionEnum, hideInTable: true },
    { title: '招募状态', dataIndex: 'recruiting', valueType: 'select', valueEnum: recruitingEnum, hideInTable: true },

    { title: '名称', dataIndex: 'name', ellipsis: true },
    { title: 'Tag', dataIndex: 'tag', width: 80, search: false },
    {
      title: '状态',
      dataIndex: 'isRecruiting',
      width: 90,
      search: false,
      render: (_, r) =>
        r.isRecruiting ? <Tag color="green">招募中</Tag> : <Tag>暂停</Tag>,
    },
    { title: 'Slug', dataIndex: 'slug', copyable: true, width: 200, search: false },
    { title: 'CET/CEST', dataIndex: 'primeTimeCET', width: 140, search: false },
    { title: '北京时间', dataIndex: 'primeTimeBJ', width: 140, search: false },
    {
      title: '标签',
      dataIndex: 'tags',
      search: false,
      render: (_, r) => (
        <Space size={[4, 4]} wrap>
          {(r.tags || []).slice(0, 6).map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </Space>
      ),
    },
    { title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime', width: 170, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 240,
      render: (_, r) => (
        <Space>
          <Button type="link" onClick={() => nav(`/wvw-guilds/${r._id}`)}>
            编辑
          </Button>
          <Button
            type="link"
            onClick={() => {
              const url = `/#/wvw/guilds/${encodeURIComponent(r.slug)}`;
              window.open(url, '_blank');
            }}
          >
            预览
          </Button>
          <Popconfirm
            title="确定删除该工会？"
            onConfirm={async () => {
              await request(`/admin/v1/wvw-guilds/${r._id}`, { method: 'DELETE' });
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
      title="WvW 工会招募"
      subTitle="管理工会列表与招募单页内容（黑曜石攻城战报）"
      extra={[
        <Button key="create" type="primary" onClick={() => nav('/wvw-guilds/new')}>
          新增工会
        </Button>,
      ]}
    >
      <ProTable<Item>
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        columns={columns}
        request={async (params) => {
          const { q, region, recruiting } = params as any;
          const res = await request<{ items: Item[]; total: number }>('/admin/v1/wvw-guilds', {
            params: {
              q: q || '',
              region: region || '',
              recruiting: recruiting === undefined ? '' : recruiting,
            },
          });
          return { data: res.items, total: res.total, success: true };
        }}
      />
    </PageContainer>
  );
}
