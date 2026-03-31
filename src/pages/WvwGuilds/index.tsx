import { PageContainer, ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, Popconfirm, Space, Tag, message } from 'antd';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDestructivePopconfirmProps } from '../../components/confirmProps';
import { PageRequestErrorAlert } from '../../components/listPageState';
import { getFilterAwareTableProps } from '../../components/tableState';
import { getErrorMessage, request } from '../../services/request';

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

type TableRequestParams = {
  q?: string;
  region?: 'NA' | 'EU';
  recruiting?: boolean;
};

type GuildListResponse = {
  items: Item[];
  total: number;
};

export default function WvwGuildsPage() {
  const actionRef = useRef<ActionType>(null);
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasFilters, setHasFilters] = useState(false);
  const tableState = getFilterAwareTableProps({
    hasFilters,
    searchText: '筛选工会目录',
    filteredEmptyText: '当前筛选条件下没有匹配的战场公会目录条目。',
    emptyText: '当前还没有创建任何战场公会目录条目。',
  });

  const regionEnum = useMemo(
    () => ({
      EU: { text: 'EU' },
      NA: { text: 'NA' },
    }),
    [],
  );

  const recruitingEnum = useMemo(
    () => ({
      true: { text: '招募中' },
      false: { text: '暂停招募' },
    }),
    [],
  );

  const columns: ProColumns<Item>[] = [
    { title: '关键词', dataIndex: 'q', hideInTable: true },
    { title: '地区', dataIndex: 'region', valueType: 'select', valueEnum: regionEnum, hideInTable: true },
    { title: '招募状态', dataIndex: 'recruiting', valueType: 'select', valueEnum: recruitingEnum, hideInTable: true },
    { title: '公会名称', dataIndex: 'name', ellipsis: true },
    { title: '标签', dataIndex: 'tag', width: 80, search: false },
    {
      title: '状态',
      dataIndex: 'isRecruiting',
      width: 90,
      search: false,
      render: (_, record) => (record.isRecruiting ? <Tag color="green">招募中</Tag> : <Tag>暂停招募</Tag>),
    },
    { title: '页面标识', dataIndex: 'slug', copyable: true, width: 200, search: false },
    { title: '活跃时间（CET/CEST）', dataIndex: 'primeTimeCET', width: 140, search: false },
    { title: '活跃时间（北京时间）', dataIndex: 'primeTimeBJ', width: 140, search: false },
    {
      title: '关键词标签',
      dataIndex: 'tags',
      search: false,
      render: (_, record) => (
        <Space size={[4, 4]} wrap>
          {(record.tags || []).slice(0, 6).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </Space>
      ),
    },
    { title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime', width: 170, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 240,
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => navigate(`/wvw-guilds/${record._id}`)}>
            编辑
          </Button>
          <Button
            type="link"
            onClick={() => {
              const url = `/#/wvw/guilds/${encodeURIComponent(record.slug)}`;
              window.open(url, '_blank');
            }}
          >
            打开落地页
          </Button>
          <Popconfirm
            {...getDestructivePopconfirmProps({
              title: '确认删除这个战场公会目录条目吗？',
              description: '删除后会同时移除社区目录中的公开招募条目和对应落地页。',
            })}
            onConfirm={async () => {
              await request(`/admin/v1/wvw-guilds/${record._id}`, { method: 'DELETE' });
              message.success('公会目录条目已删除');
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
      title="战场公会目录"
      subTitle="管理面向社区展示的 WvW 公会招募条目和落地页内容。"
      extra={[
        <Button key="create" type="primary" onClick={() => navigate('/wvw-guilds/new')}>
          新建公会条目
        </Button>,
      ]}
    >
      <PageRequestErrorAlert
        message="无法加载战场公会目录条目"
        description={errorMessage}
        onRetry={() => actionRef.current?.reload()}
      />

      <ProTable<Item>
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        columns={columns}
        {...tableState}
        request={async (params) => {
          const query = params as TableRequestParams;
          setHasFilters(Boolean(query.q || query.region || query.recruiting !== undefined));

          try {
            const res = await request<GuildListResponse>('/admin/v1/wvw-guilds', {
              params: {
                q: query.q || '',
                region: query.region || '',
                recruiting: query.recruiting === undefined ? '' : query.recruiting,
              },
            });
            setErrorMessage(null);
            return { data: res.items, total: res.total, success: true };
          } catch (error: unknown) {
            setErrorMessage(getErrorMessage(error, '加载战场公会目录条目失败'));
            throw error;
          }
        }}
      />
    </PageContainer>
  );
}
