import { PageContainer, ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, Modal } from 'antd';
import { useRef, useState } from 'react';
import { PageNoticeAlert, PageRequestErrorAlert } from '../../components/listPageState';
import { getFilterAwareTableProps } from '../../components/tableState';
import { getErrorMessage, request } from '../../services/request';

type AuditDetail = Record<string, unknown> | null;

type AuditItem = {
  _id: string;
  adminUsername: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ip?: string;
  ua?: string;
  detail?: AuditDetail;
  createdAt: string;
};

type AuditQueryParams = {
  current?: number;
  pageSize?: number;
  action?: string;
  resourceType?: string;
  adminUserId?: string;
  from?: string;
  to?: string;
};

type AuditRangeValue = [string | undefined, string | undefined] | undefined;

type AuditListResponse = {
  items: AuditItem[];
  total: number;
};

export default function AuditPage() {
  const actionRef = useRef<ActionType>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<AuditDetail>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasFilters, setHasFilters] = useState(false);
  const tableState = getFilterAwareTableProps({
    hasFilters,
    searchText: '应用筛选',
    filteredEmptyText: '没有匹配当前筛选条件的审计日志。',
    emptyText: '当前还没有审计日志，新的后台操作记录会显示在这里。',
  });

  const columns: ProColumns<AuditItem>[] = [
    { title: '操作类型', dataIndex: 'action', hideInTable: true },
    { title: '资源类型', dataIndex: 'resourceType', hideInTable: true },
    { title: '管理员 ID', dataIndex: 'adminUserId', hideInTable: true },
    {
      title: '创建时间范围',
      dataIndex: 'createdAtRange',
      valueType: 'dateTimeRange',
      hideInTable: true,
      search: {
        transform: (value?: AuditRangeValue) => ({ from: value?.[0], to: value?.[1] }),
      },
    },
    { title: '创建时间', dataIndex: 'createdAt', valueType: 'dateTime', width: 170, search: false },
    { title: '管理员', dataIndex: 'adminUsername', width: 140, search: false },
    { title: '操作', dataIndex: 'action', width: 180, search: false },
    { title: '资源', dataIndex: 'resourceType', width: 120, search: false },
    { title: '资源 ID', dataIndex: 'resourceId', width: 220, search: false, ellipsis: true },
    { title: 'IP', dataIndex: 'ip', width: 140, search: false },
    {
      title: '详情',
      valueType: 'option',
      width: 120,
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => {
            setDetail(record.detail || null);
            setDetailOpen(true);
          }}
        >
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <PageContainer title="审计日志" subTitle="追踪后台关键操作和敏感变更记录。">
      <PageNoticeAlert
        type="info"
        message="如何使用审计日志"
        description={(
          <div>
            <div>1. 可以按操作类型、资源类型、管理员 ID 和时间范围筛选后台动作。</div>
            <div>2. “详情”会展示这次操作关联的结构化载荷，便于排查变更来源。</div>
            <div>3. 如果需要追查异常写入链路，优先结合创建时间、资源 ID 和管理员账号交叉定位。</div>
          </div>
        )}
        marginBottom={16}
      />

      <PageRequestErrorAlert
        message="无法加载审计日志"
        description={errorMessage}
        onRetry={() => actionRef.current?.reload()}
      />

      <ProTable<AuditItem>
        actionRef={actionRef}
        rowKey="_id"
        columns={columns}
        cardBordered
        {...tableState}
        request={async (params) => {
          const query = params as AuditQueryParams;

          setHasFilters(Boolean(query.action || query.resourceType || query.adminUserId || query.from || query.to));

          try {
            const res = await request<AuditListResponse>('/admin/v1/audit', {
              params: {
                page: query.current || 1,
                limit: query.pageSize || 20,
                action: query.action || '',
                resourceType: query.resourceType || '',
                adminUserId: query.adminUserId || '',
                from: query.from || '',
                to: query.to || '',
              },
            });
            setErrorMessage(null);
            return { data: res.items, total: res.total, success: true };
          } catch (error: unknown) {
            setErrorMessage(getErrorMessage(error, '加载审计日志失败'));
            throw error;
          }
        }}
      />

      <Modal
        title="审计详情 JSON"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        onOk={() => setDetailOpen(false)}
        width={800}
      >
        <pre style={{ maxHeight: 500, overflow: 'auto', background: '#f6f6f6', padding: 12 }}>
          {JSON.stringify(detail, null, 2)}
        </pre>
      </Modal>
    </PageContainer>
  );
}
