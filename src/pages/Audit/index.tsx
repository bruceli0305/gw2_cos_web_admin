import { PageContainer, ProTable, type ProColumns, type ActionType } from '@ant-design/pro-components';
import { Button, Modal } from 'antd';
import { useRef, useState } from 'react';
import { request } from '../../services/request';

type AuditItem = {
  _id: string;
  adminUsername: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ip?: string;
  ua?: string;
  detail?: any;
  createdAt: string;
};

export default function AuditPage() {
  const actionRef = useRef<ActionType>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  const columns: ProColumns<AuditItem>[] = [
    { title: 'action', dataIndex: 'action', hideInTable: true },
    { title: 'resourceType', dataIndex: 'resourceType', hideInTable: true },
    { title: 'adminUserId', dataIndex: 'adminUserId', hideInTable: true },
    {
      title: '时间范围',
      dataIndex: 'createdAtRange',
      valueType: 'dateTimeRange',
      hideInTable: true,
      search: {
        transform: (v: any) => ({ from: v?.[0], to: v?.[1] }),
      },
    },

    { title: '时间', dataIndex: 'createdAt', valueType: 'dateTime', width: 170, search: false },
    { title: '管理员', dataIndex: 'adminUsername', width: 140, search: false },
    { title: '动作', dataIndex: 'action', width: 180, search: false },
    { title: '资源', dataIndex: 'resourceType', width: 120, search: false },
    { title: '资源ID', dataIndex: 'resourceId', width: 220, search: false, ellipsis: true },
    { title: 'IP', dataIndex: 'ip', width: 140, search: false },
    {
      title: '详情',
      valueType: 'option',
      width: 120,
      render: (_, r) => (
        <Button
          type="link"
          onClick={() => {
            setDetail(r.detail || null);
            setDetailOpen(true);
          }}
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <PageContainer title="审计日志" subTitle="追踪管理端写操作">
      <ProTable<AuditItem>
        actionRef={actionRef}
        rowKey="_id"
        columns={columns}
        cardBordered
        request={async (params) => {
          const { current, pageSize, action, resourceType, adminUserId, from, to } = params as any;
          const res = await request('/admin/v1/audit', {
            params: {
              page: current || 1,
              limit: pageSize || 20,
              action: action || '',
              resourceType: resourceType || '',
              adminUserId: adminUserId || '',
              from: from || '',
              to: to || '',
            },
          });
          return { data: res.items, total: res.total, success: true };
        }}
      />

      <Modal
        title="审计详情"
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