import { PageContainer, ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, Popconfirm, Space, Tag, message } from 'antd';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    searchText: 'Apply filters',
    filteredEmptyText: 'No WvW guild entries match the current filters.',
    emptyText: 'No WvW guild recruitment entries have been created yet.',
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
      true: { text: 'Recruiting' },
      false: { text: 'Paused' },
    }),
    [],
  );

  const columns: ProColumns<Item>[] = [
    { title: 'Keyword', dataIndex: 'q', hideInTable: true },
    { title: 'Region', dataIndex: 'region', valueType: 'select', valueEnum: regionEnum, hideInTable: true },
    { title: 'Recruiting', dataIndex: 'recruiting', valueType: 'select', valueEnum: recruitingEnum, hideInTable: true },
    { title: 'Name', dataIndex: 'name', ellipsis: true },
    { title: 'Tag', dataIndex: 'tag', width: 80, search: false },
    {
      title: 'Status',
      dataIndex: 'isRecruiting',
      width: 90,
      search: false,
      render: (_, record) => (record.isRecruiting ? <Tag color="green">Recruiting</Tag> : <Tag>Paused</Tag>),
    },
    { title: 'Slug', dataIndex: 'slug', copyable: true, width: 200, search: false },
    { title: 'CET/CEST', dataIndex: 'primeTimeCET', width: 140, search: false },
    { title: 'Beijing Time', dataIndex: 'primeTimeBJ', width: 140, search: false },
    {
      title: 'Tags',
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
    { title: 'Updated At', dataIndex: 'updatedAt', valueType: 'dateTime', width: 170, search: false },
    {
      title: 'Actions',
      valueType: 'option',
      width: 240,
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => navigate(`/wvw-guilds/${record._id}`)}>
            Edit
          </Button>
          <Button
            type="link"
            onClick={() => {
              const url = `/#/wvw/guilds/${encodeURIComponent(record.slug)}`;
              window.open(url, '_blank');
            }}
          >
            Preview
          </Button>
          <Popconfirm
            title="Delete this guild entry?"
            onConfirm={async () => {
              await request(`/admin/v1/wvw-guilds/${record._id}`, { method: 'DELETE' });
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
    <PageContainer
      title="WvW Guild Recruitment"
      subTitle="Manage guild entries and recruitment landing pages"
      extra={[
        <Button key="create" type="primary" onClick={() => navigate('/wvw-guilds/new')}>
          Create Guild
        </Button>,
      ]}
    >
      <PageRequestErrorAlert
        message="Unable to load WvW guild entries"
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
            setErrorMessage(getErrorMessage(error, 'Failed to load WvW guild entries'));
            throw error;
          }
        }}
      />
    </PageContainer>
  );
}
