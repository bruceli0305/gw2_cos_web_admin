import { PageContainer, ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Tag } from 'antd';
import { useRef, useState } from 'react';
import { PageNoticeAlert, PageRequestErrorAlert } from '../../components/listPageState';
import { getFilterAwareTableProps } from '../../components/tableState';
import { getErrorMessage, request } from '../../services/request';

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

type ApiLogItem = {
  _id: string;
  userId?: string | null;
  username?: string | null;
  authType: 'user' | 'anonymous';
  method: string;
  path: string;
  query?: string | null;
  statusCode: number;
  responseTimeMs: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  ip: string;
  userAgent?: string | null;
  createdAt: string;
};

type ApiLogQueryParams = {
  current?: number;
  pageSize?: number;
  userId?: string;
  username?: string;
  authType?: string;
  method?: string;
  path?: string;
  statusCodeMin?: number;
  errorCode?: string;
  from?: string;
  to?: string;
};

type DateTimeRangeValue = [string | undefined, string | undefined] | undefined;

type ApiLogListResponse = {
  items: ApiLogItem[];
  total: number;
};

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

const AUTH_TYPE_MAP: Record<string, { text: string }> = {
  user: { text: '已登录' },
  anonymous: { text: '匿名' },
};

const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'DELETE'];

const STATUS_CODE_OPTIONS: Record<number, { text: string }> = {
  200: { text: '200 成功' },
  400: { text: '400 请求错误' },
  401: { text: '401 未登录' },
  403: { text: '403 无权限' },
  404: { text: '404 不存在' },
  429: { text: '429 限流' },
  500: { text: '500 服务器错误' },
};

function statusColor(code: number): string {
  if (code < 300) return 'green';
  if (code < 400) return 'blue';
  if (code < 500) return 'orange';
  return 'red';
}

function methodColor(method: string): string {
  switch (method) {
    case 'GET': return 'blue';
    case 'POST': return 'green';
    case 'PUT': return 'orange';
    case 'DELETE': return 'red';
    default: return 'default';
  }
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ---------------------------------------------------------------------------
// 页面组件
// ---------------------------------------------------------------------------

export default function DataApiAccessLogPage() {
  const actionRef = useRef<ActionType>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasFilters, setHasFilters] = useState(false);
  const tableState = getFilterAwareTableProps({
    hasFilters,
    searchText: '应用筛选',
    filteredEmptyText: '没有匹配当前筛选条件的访问日志。',
    emptyText: '当前还没有访问日志，新的 API 请求会显示在这里。',
  });

  const columns: ProColumns<ApiLogItem>[] = [
    // ---- 搜索列（不在表格中显示） ----
    {
      title: '时间范围',
      dataIndex: 'createdAtRange',
      valueType: 'dateTimeRange',
      hideInTable: true,
      search: {
        transform: (value?: DateTimeRangeValue) => ({ from: value?.[0], to: value?.[1] }),
      },
    },
    { title: '用户 ID', dataIndex: 'userId', hideInTable: true },
    { title: '用户名', dataIndex: 'username', hideInTable: true },
    {
      title: '鉴权类型',
      dataIndex: 'authType',
      valueType: 'select',
      hideInTable: true,
      valueEnum: AUTH_TYPE_MAP,
    },
    {
      title: '方法',
      dataIndex: 'method',
      valueType: 'select',
      hideInTable: true,
      valueEnum: Object.fromEntries(METHOD_OPTIONS.map((m) => [m, { text: m }])),
    },
    { title: '路径', dataIndex: 'path', hideInTable: true, fieldProps: { placeholder: '如 /api/legendary' } },
    {
      title: '状态码',
      dataIndex: 'statusCodeMin',
      valueType: 'select',
      hideInTable: true,
      valueEnum: STATUS_CODE_OPTIONS,
    },
    { title: '错误码', dataIndex: 'errorCode', hideInTable: true, fieldProps: { placeholder: '如 UNAUTHORIZED' } },

    // ---- 展示列 ----
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    {
      title: '用户',
      dataIndex: 'username',
      width: 120,
      search: false,
      render: (_, record) => record.username || <span style={{ color: '#999' }}>匿名</span>,
    },
    {
      title: '鉴权',
      dataIndex: 'authType',
      width: 80,
      search: false,
      render: (_, record) => (
        <Tag color={record.authType === 'user' ? 'blue' : 'default'}>
          {record.authType === 'user' ? '登录' : '匿名'}
        </Tag>
      ),
    },
    {
      title: '方法',
      dataIndex: 'method',
      width: 80,
      search: false,
      render: (_, record) => <Tag color={methodColor(record.method)}>{record.method}</Tag>,
    },
    {
      title: '路径',
      dataIndex: 'path',
      width: 200,
      search: false,
      ellipsis: true,
      copyable: true,
    },
    {
      title: '状态码',
      dataIndex: 'statusCode',
      width: 90,
      search: false,
      render: (_, record) => <Tag color={statusColor(record.statusCode)}>{record.statusCode}</Tag>,
    },
    {
      title: '耗时',
      dataIndex: 'responseTimeMs',
      width: 80,
      search: false,
      render: (_, record) => formatMs(record.responseTimeMs),
    },
    {
      title: '错误码',
      dataIndex: 'errorCode',
      width: 140,
      search: false,
      render: (_, record) =>
        record.errorCode ? (
          <Tag color="red">{record.errorCode}</Tag>
        ) : (
          <span style={{ color: '#ccc' }}>—</span>
        ),
    },
    {
      title: '错误消息',
      dataIndex: 'errorMessage',
      width: 180,
      search: false,
      ellipsis: true,
      render: (_, record) =>
        record.errorMessage || <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      width: 140,
      search: false,
      copyable: true,
    },
  ];

  return (
    <PageContainer title="API 访问日志" subTitle="追踪公共 API 请求，用于排查用户报错和分析接口行为。">
      <PageNoticeAlert
        type="info"
        message="如何使用访问日志"
        description={(
          <div>
            <div>1. 可按时间范围、用户、鉴权类型、HTTP 方法、路径、状态码、错误码组合筛选。</div>
            <div>2. 状态码 4xx/5xx 的记录会在错误码和错误消息列展示具体原因，便于快速定位问题。</div>
            <div>3. 已登录用户会展示用户名；匿名请求标记为「匿名」。</div>
            <div>4. 成功日志保留 30 天，错误日志保留 90 天，到期自动清理。</div>
          </div>
        )}
        marginBottom={16}
      />

      <PageRequestErrorAlert
        message="无法加载访问日志"
        description={errorMessage}
        onRetry={() => actionRef.current?.reload()}
      />

      <ProTable<ApiLogItem>
        actionRef={actionRef}
        rowKey="_id"
        columns={columns}
        cardBordered
        {...tableState}
        request={async (params) => {
          const query = params as ApiLogQueryParams;

          setHasFilters(
            Boolean(
              query.userId ||
                query.username ||
                query.authType ||
                query.method ||
                query.path ||
                query.statusCodeMin ||
                query.errorCode ||
                query.from ||
                query.to,
            ),
          );

          try {
            const res = await request<ApiLogListResponse>('/admin/v1/data/api-access-log', {
              params: {
                page: query.current || 1,
                limit: query.pageSize || 20,
                userId: query.userId || '',
                username: query.username || '',
                authType: query.authType || '',
                method: query.method || '',
                path: query.path || '',
                statusCodeMin: query.statusCodeMin ?? undefined,
                errorCode: query.errorCode || '',
                from: query.from || '',
                to: query.to || '',
              },
            });
            setErrorMessage(null);
            return { data: res.items, total: res.total, success: true };
          } catch (error: unknown) {
            setErrorMessage(getErrorMessage(error, '加载访问日志失败'));
            throw error;
          }
        }}
      />
    </PageContainer>
  );
}
