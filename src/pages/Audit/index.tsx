import { PageContainer, ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, Modal } from 'antd';
import { useRef, useState } from 'react';
import { PageRequestErrorAlert } from '../../components/listPageState';
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
    searchText: 'Apply filters',
    filteredEmptyText: 'No audit logs match the current filters.',
    emptyText: 'No audit logs yet. New admin write operations will appear here.',
  });

  const columns: ProColumns<AuditItem>[] = [
    { title: 'Action', dataIndex: 'action', hideInTable: true },
    { title: 'Resource Type', dataIndex: 'resourceType', hideInTable: true },
    { title: 'Admin User ID', dataIndex: 'adminUserId', hideInTable: true },
    {
      title: 'Created Range',
      dataIndex: 'createdAtRange',
      valueType: 'dateTimeRange',
      hideInTable: true,
      search: {
        transform: (value?: AuditRangeValue) => ({ from: value?.[0], to: value?.[1] }),
      },
    },
    { title: 'Created At', dataIndex: 'createdAt', valueType: 'dateTime', width: 170, search: false },
    { title: 'Admin', dataIndex: 'adminUsername', width: 140, search: false },
    { title: 'Action', dataIndex: 'action', width: 180, search: false },
    { title: 'Resource', dataIndex: 'resourceType', width: 120, search: false },
    { title: 'Resource ID', dataIndex: 'resourceId', width: 220, search: false, ellipsis: true },
    { title: 'IP', dataIndex: 'ip', width: 140, search: false },
    {
      title: 'Detail',
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
          View
        </Button>
      ),
    },
  ];

  return (
    <PageContainer title="Audit Logs" subTitle="Track administrative write operations">
      <PageRequestErrorAlert
        message="Unable to load audit logs"
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
            setErrorMessage(getErrorMessage(error, 'Failed to load audit logs'));
            throw error;
          }
        }}
      />

      <Modal
        title="Audit Detail"
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
