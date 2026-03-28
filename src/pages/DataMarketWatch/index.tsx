import {
  PageContainer,
  ProTable,
  type ProColumns,
  type ActionType,
  ModalForm,
  ProFormText,
  ProFormSwitch,
  ProCard,
} from '@ant-design/pro-components';
import { Alert, Button, message, Popconfirm, Space, Tag, Modal } from 'antd';
import { useMemo, useRef, useState } from 'react';
import { PageRequestErrorAlert } from '../../components/listPageState';
import { getFilterAwareTableProps } from '../../components/tableState';
import { getErrorMessage, request } from '../../services/request';

type PoolItem = {
  itemId: number;
  nameZh?: string;
  nameEn?: string;
  pinned: boolean;
  followerCount: number;
  lastSnapshotAt?: string;
  snapshotStatus?: 'OK' | 'ERROR';
  snapshotError?: string;
  historySyncStatus?: 'NONE' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  historyLastDate?: string;
  historyError?: string;
  createdAt?: string;
  updatedAt?: string;
  note?: string;
};

type LowFreqReasonValue = string | number | boolean | null;

type LowFreqReason = {
  type: string;
  value?: LowFreqReasonValue;
  threshold?: LowFreqReasonValue;
};

type LowFreqPoolItem = PoolItem & {
  reasons?: LowFreqReason[];
};

type TaskRun = {
  _id: string;
  taskName: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  targetCount: number;
  successCount: number;
  failCount: number;
  failSample?: Array<{ itemId: number; reason: string }>;
};

type PoolListResp = {
  items: PoolItem[];
  total: number;
  page: number;
  limit: number;
  max: number;
};

type LowFreqResp = {
  items: LowFreqPoolItem[];
  limit: number;
  followerMax: number;
};

type RunNowResp = {
  skipped: boolean;
  runId?: string;
  status?: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  ts?: string;
  targetCount?: number;
  successCount?: number;
  failCount?: number;
  failSample?: Array<{ itemId: number; reason: string }>;
};

type FailPayload = {
  title: string;
  data: unknown;
};

type PoolQueryParams = {
  current?: number;
  pageSize?: number;
  itemId?: number | string;
  pinned?: boolean | string;
};

type TaskQueryParams = {
  taskName?: string;
};

type AddPoolFormValues = {
  itemId?: string;
  pinned?: boolean;
};

function formatRunSummary(actionLabel: string, result: RunNowResp) {
  const parts: string[] = [];
  if (result.status) parts.push(result.status);

  const counts: string[] = [];
  if (typeof result.successCount === 'number') counts.push(`ok ${result.successCount}`);
  if (typeof result.failCount === 'number') counts.push(`failed ${result.failCount}`);
  if (counts.length) parts.push(counts.join(' / '));

  return parts.length ? `${actionLabel} finished: ${parts.join(' | ')}` : `${actionLabel} finished`;
}

function formatLowFrequencyReason(reason: LowFreqReason) {
  if (reason.type === 'LOW_FOLLOWER') {
    return `Follower count <= ${reason.threshold} (current ${reason.value})`;
  }

  return reason.type;
}

export default function DataMarketWatchPage() {
  const poolActionRef = useRef<ActionType>(null);
  const taskActionRef = useRef<ActionType>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [failOpen, setFailOpen] = useState(false);
  const [failPayload, setFailPayload] = useState<FailPayload | null>(null);

  const [poolMeta, setPoolMeta] = useState<{ total: number; max: number } | null>(null);

  const [lowfreqOpen, setLowfreqOpen] = useState(false);
  const [lowfreqRows, setLowfreqRows] = useState<LowFreqPoolItem[]>([]);
  const [lowfreqSelected, setLowfreqSelected] = useState<number[]>([]);
  const [lowfreqLoading, setLowfreqLoading] = useState(false);
  const [snapshotRunLoading, setSnapshotRunLoading] = useState(false);
  const [metaSyncLoading, setMetaSyncLoading] = useState(false);
  const [historySyncItemId, setHistorySyncItemId] = useState<number | null>(null);
  const [poolErrorMessage, setPoolErrorMessage] = useState<string | null>(null);
  const [taskErrorMessage, setTaskErrorMessage] = useState<string | null>(null);
  const [lowfreqErrorMessage, setLowfreqErrorMessage] = useState<string | null>(null);
  const [hasPoolFilters, setHasPoolFilters] = useState(false);

  async function loadLowfreq() {
    setLowfreqLoading(true);
    try {
      const res = await request<LowFreqResp>('/admin/v1/data/market-watch/pool/lowfreq', {
        params: { limit: 100, followerMax: 2 },
      });
      setLowfreqRows(res.items);
      setLowfreqSelected([]);
      setLowfreqErrorMessage(null);
    } catch (error: unknown) {
      setLowfreqErrorMessage(getErrorMessage(error, 'Failed to load low-frequency candidates'));
    } finally {
      setLowfreqLoading(false);
    }
  }

  const poolColumns: ProColumns<PoolItem>[] = [
    { title: 'ItemID', dataIndex: 'itemId', width: 120, copyable: true },
    {
      title: 'Name',
      dataIndex: 'nameZh',
      search: false,
      ellipsis: true,
      render: (_, record) => record.nameZh || record.nameEn || '-',
    },
    {
      title: 'Pinned',
      dataIndex: 'pinned',
      width: 90,
      valueType: 'select',
      valueEnum: {
        true: { text: 'Yes' },
        false: { text: 'No' },
      },
      render: (_, record) => (record.pinned ? <Tag color="gold">Pinned</Tag> : <Tag>Standard</Tag>),
    },
    { title: 'Followers', dataIndex: 'followerCount', width: 90, search: false },
    {
      title: 'Snapshot',
      dataIndex: 'snapshotStatus',
      width: 110,
      search: false,
      render: (_, record) => {
        if (record.snapshotStatus === 'ERROR') return <Tag color="red">ERROR</Tag>;
        if (record.snapshotStatus === 'OK') return <Tag color="green">OK</Tag>;
        return <Tag>Unknown</Tag>;
      },
    },
    {
      title: 'Last Snapshot',
      dataIndex: 'lastSnapshotAt',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    {
      title: 'Snapshot Error',
      dataIndex: 'snapshotError',
      ellipsis: true,
      search: false,
      render: (_, record) => {
        if (!record.snapshotError) return '-';
        return (
          <Button
            type="link"
            onClick={() => {
              setFailPayload({
                title: `Snapshot error · ItemID ${record.itemId}`,
                data: { snapshotError: record.snapshotError },
              });
              setFailOpen(true);
            }}
          >
            View
          </Button>
        );
      },
    },
    {
      title: 'History Sync',
      dataIndex: 'historySyncStatus',
      width: 120,
      search: false,
      render: (_, record) => {
        const status = record.historySyncStatus || 'NONE';
        if (status === 'SUCCESS') return <Tag color="green">Synced</Tag>;
        if (status === 'RUNNING') return <Tag color="blue">Running</Tag>;
        if (status === 'FAILED') return <Tag color="red">Failed</Tag>;
        return <Tag>Not started</Tag>;
      },
    },
    { title: 'Updated At', dataIndex: 'updatedAt', valueType: 'dateTime', width: 170, search: false },
    {
      title: 'Actions',
      valueType: 'option',
      width: 220,
      render: (_, record) => (
        <Space wrap>
          <Button
            type="link"
            loading={historySyncItemId === record.itemId}
            onClick={async () => {
              setHistorySyncItemId(record.itemId);
              try {
                const res = await request<RunNowResp>(`/admin/v1/data/market-watch/history/sync/${record.itemId}`, {
                  method: 'POST',
                  params: { days: 365 },
                });
                message.success(formatRunSummary('History sync', res));
                poolActionRef.current?.reload();
                taskActionRef.current?.reload();
              } finally {
                setHistorySyncItemId(null);
              }
            }}
          >
            Sync History
          </Button>

          <Button
            type="link"
            onClick={async () => {
              await request(`/admin/v1/data/market-watch/pool/${record.itemId}`, {
                method: 'PATCH',
                body: JSON.stringify({ pinned: !record.pinned }),
              });
              message.success(record.pinned ? 'Item unpinned' : 'Item pinned');
              poolActionRef.current?.reload();
            }}
          >
            {record.pinned ? 'Unpin' : 'Pin'}
          </Button>

          <Popconfirm
            title="Remove this item from the watch pool?"
            description="Scheduled snapshots for this item will stop. User follow relationships are not deleted."
            okText="Remove"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
            onConfirm={async () => {
              await request(`/admin/v1/data/market-watch/pool/${record.itemId}`, { method: 'DELETE' });
              message.success('Item removed from pool');
              poolActionRef.current?.reload();
            }}
          >
            <Button type="link" danger>
              Remove
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const taskColumns: ProColumns<TaskRun>[] = useMemo(
    () => [
      {
        title: 'Task',
        dataIndex: 'taskName',
        hideInTable: true,
        valueType: 'select',
        valueEnum: {
          snapshot_10m: { text: '10-minute snapshot collection' },
        },
      },
      { title: 'Started At', dataIndex: 'startedAt', valueType: 'dateTime', width: 180, search: false },
      { title: 'Ended At', dataIndex: 'endedAt', valueType: 'dateTime', width: 180, search: false },
      {
        title: 'Status',
        dataIndex: 'status',
        width: 110,
        valueType: 'select',
        valueEnum: {
          SUCCESS: { text: 'SUCCESS' },
          PARTIAL: { text: 'PARTIAL' },
          FAILED: { text: 'FAILED' },
        },
        render: (_, record) => {
          if (record.status === 'SUCCESS') return <Tag color="green">SUCCESS</Tag>;
          if (record.status === 'PARTIAL') return <Tag color="orange">PARTIAL</Tag>;
          return <Tag color="red">FAILED</Tag>;
        },
      },
      { title: 'Target', dataIndex: 'targetCount', width: 80, search: false },
      { title: 'Success', dataIndex: 'successCount', width: 80, search: false },
      { title: 'Failed', dataIndex: 'failCount', width: 80, search: false },
      {
        title: 'Failure Details',
        dataIndex: 'failSample',
        search: false,
        render: (_, record) => {
          const list = Array.isArray(record.failSample) ? record.failSample : [];
          if (!list.length) return '-';
          return (
            <Button
              type="link"
              onClick={() => {
                setFailPayload({ title: `Failure details · ${record.startedAt}`, data: list });
                setFailOpen(true);
              }}
            >
              View ({list.length})
            </Button>
          );
        },
      },
    ],
    []
  );

  const lowfreqColumns: ProColumns<LowFreqPoolItem>[] = [
    { title: 'ItemID', dataIndex: 'itemId', width: 120 },
    { title: 'Followers', dataIndex: 'followerCount', width: 90 },
    {
      title: 'Last Snapshot',
      dataIndex: 'lastSnapshotAt',
      valueType: 'dateTime',
      width: 170,
    },
    {
      title: 'Suggested Reason',
      dataIndex: 'reasons',
      search: false,
      render: (_, record) => {
        const reasons = Array.isArray(record.reasons) ? record.reasons : [];
        if (!reasons.length) return '-';
        return reasons.map(formatLowFrequencyReason).join('; ');
      },
    },
  ];

  const poolTableStateProps = getFilterAwareTableProps({
    hasFilters: hasPoolFilters,
    searchText: 'Apply filters',
    filteredEmptyText: 'No monitored items match the current filters.',
    emptyText: 'No items are currently in the market watch pool.',
  });

  return (
    <PageContainer
      title="Market Watch Monitor"
      subTitle={
        poolMeta
          ? `Pool usage ${poolMeta.total}/${poolMeta.max} · 10-minute snapshot monitoring`
          : 'Pool management and 10-minute snapshot monitoring'
      }
      extra={[
        <Button
          key="refresh"
          onClick={() => {
            poolActionRef.current?.reload();
            taskActionRef.current?.reload();
          }}
        >
          Refresh
        </Button>,
        <Button
          key="run"
          loading={snapshotRunLoading}
          onClick={async () => {
            setSnapshotRunLoading(true);
            try {
              const res = await request<RunNowResp>('/admin/v1/data/market-watch/run/snapshot10m', { method: 'POST' });
              message.success(formatRunSummary('Snapshot collection', res));
              poolActionRef.current?.reload();
              taskActionRef.current?.reload();
              if (res.failSample?.length) {
                setFailPayload({
                  title: `Snapshot collection failures · ${res.ts || 'latest run'}`,
                  data: res.failSample,
                });
                setFailOpen(true);
              }
            } finally {
              setSnapshotRunLoading(false);
            }
          }}
        >
          Run Snapshot Now
        </Button>,
        <Button
          key="sync-meta"
          loading={metaSyncLoading}
          onClick={async () => {
            setMetaSyncLoading(true);
            try {
              const res = await request<RunNowResp>('/admin/v1/data/market-watch/pool/sync-item-meta', {
                method: 'POST',
                body: JSON.stringify({ force: false }),
              });
              message.success(formatRunSummary('Item metadata sync', res));
              poolActionRef.current?.reload();
              taskActionRef.current?.reload();
              if (res.failSample?.length) {
                setFailPayload({ title: 'Item metadata sync failures', data: res.failSample });
                setFailOpen(true);
              }
            } finally {
              setMetaSyncLoading(false);
            }
          }}
        >
          Sync Names & Icons
        </Button>,
        <Button
          key="lowfreq"
          onClick={async () => {
            setLowfreqOpen(true);
            await loadLowfreq();
          }}
        >
          Low-Frequency Candidates
        </Button>,
        <Button key="add" type="primary" onClick={() => setAddOpen(true)}>
          Add to Pool
        </Button>,
      ]}
    >
      <Alert
        type="info"
        showIcon
        message="What this page manages"
        description={
          <div>
            <div>1. Items in this pool are polled from the official `commerce/prices` endpoint every 10 minutes and stored as snapshots.</div>
            <div>2. The pool allows up to 1000 unique item IDs. Remove low-frequency items before adding more when the pool is full.</div>
            <div>3. &quot;Run Snapshot Now&quot; still respects the backend task lock. If another run is active, the request fails instead of running concurrently.</div>
          </div>
        }
        style={{ marginBottom: 12 }}
      />

      <PageRequestErrorAlert
        message="Unable to load market watch pool"
        description={poolErrorMessage}
        onRetry={() => poolActionRef.current?.reload()}
        marginBottom={12}
      />

      <PageRequestErrorAlert
        message="Unable to load market watch task history"
        description={taskErrorMessage}
        onRetry={() => taskActionRef.current?.reload()}
        marginBottom={12}
      />

      <ProCard
        tabs={{
          type: 'card',
        }}
      >
        <ProCard.TabPane key="pool" tab="Pool">
          <ProTable<PoolItem>
            actionRef={poolActionRef}
            rowKey="itemId"
            cardBordered
            columns={poolColumns}
            {...poolTableStateProps}
            request={async (params) => {
              const { current, pageSize, itemId, pinned } = params as PoolQueryParams;
              setHasPoolFilters(
                (itemId !== undefined && String(itemId) !== '') ||
                  (pinned !== undefined && String(pinned) !== '')
              );

              try {
                const res = await request<PoolListResp>('/admin/v1/data/market-watch/pool', {
                  params: {
                    page: current || 1,
                    limit: pageSize || 20,
                    itemId: itemId || '',
                    pinned: pinned === undefined ? '' : String(pinned),
                  },
                });
                setPoolMeta({ total: res.total, max: res.max });
                setPoolErrorMessage(null);
                return { data: res.items, total: res.total, success: true };
              } catch (error: unknown) {
                setPoolErrorMessage(getErrorMessage(error, 'Failed to load market watch pool'));
                throw error;
              }
            }}
          />
        </ProCard.TabPane>

        <ProCard.TabPane key="tasks" tab="Task Runs">
          <ProTable<TaskRun>
            actionRef={taskActionRef}
            rowKey="_id"
            cardBordered
            columns={taskColumns}
            locale={{ emptyText: 'No market watch task runs have been recorded yet.' }}
            request={async (params) => {
              const { taskName } = params as TaskQueryParams;
              try {
                const res = await request<{ items: TaskRun[] }>('/admin/v1/data/market-watch/task-runs', {
                  params: {
                    taskName: taskName || 'snapshot_10m',
                    limit: 50,
                  },
                });
                setTaskErrorMessage(null);
                return { data: res.items, total: res.items.length, success: true };
              } catch (error: unknown) {
                setTaskErrorMessage(getErrorMessage(error, 'Failed to load market watch task history'));
                throw error;
              }
            }}
            pagination={false}
            search={{ labelWidth: 'auto', searchText: 'Apply filters', resetText: 'Clear filters' }}
          />
        </ProCard.TabPane>
      </ProCard>

      <ModalForm<AddPoolFormValues>
        title="Add Item to Pool"
        open={addOpen}
        onOpenChange={setAddOpen}
        modalProps={{ destroyOnClose: true }}
        initialValues={{ pinned: false }}
        onFinish={async (values) => {
          const raw = String(values.itemId || '').trim();
          if (!raw) {
            message.error('Enter an item ID');
            return false;
          }
          if (!/^\d+$/.test(raw)) {
            message.error('Item ID must be numeric');
            return false;
          }
          await request('/admin/v1/data/market-watch/pool', {
            method: 'POST',
            body: JSON.stringify({ itemId: Number(raw), pinned: !!values.pinned }),
          });
          message.success('Item added to pool');
          poolActionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText
          name="itemId"
          label="ItemID"
          placeholder="Example: 19721"
          rules={[{ required: true, message: 'Enter an item ID' }]}
        />
        <ProFormSwitch name="pinned" label="Pinned" />
      </ModalForm>

      <Modal
        title={failPayload?.title || 'Details'}
        open={failOpen}
        onCancel={() => setFailOpen(false)}
        onOk={() => setFailOpen(false)}
        width={900}
      >
        <pre style={{ maxHeight: 520, overflow: 'auto', background: '#f6f6f6', padding: 12 }}>
          {JSON.stringify(failPayload?.data ?? null, null, 2)}
        </pre>
      </Modal>

      <Modal
        title="Low-Frequency Candidates"
        open={lowfreqOpen}
        onCancel={() => setLowfreqOpen(false)}
        width={980}
        footer={[
          <Button
            key="refresh"
            loading={lowfreqLoading}
            onClick={async () => {
              await loadLowfreq();
            }}
          >
            Refresh Candidates
          </Button>,
          <Button
            key="remove"
            danger
            disabled={lowfreqSelected.length === 0}
            onClick={async () => {
              const ids = [...lowfreqSelected];
              Modal.confirm({
                title: `Remove ${ids.length} selected item IDs from the pool?`,
                content:
                  'Scheduled snapshots for these items will stop. User follow relationships are not deleted.',
                okText: 'Remove',
                okButtonProps: { danger: true },
                cancelText: 'Cancel',
                onOk: async () => {
                  const res = await request<{ success: true; deletedCount: number }>(
                    '/admin/v1/data/market-watch/pool/batch-remove',
                    {
                      method: 'POST',
                      body: JSON.stringify({ itemIds: ids }),
                    }
                  );
                  message.success(`Removed ${res.deletedCount} pool records`);
                  poolActionRef.current?.reload();
                  await loadLowfreq();
                },
              });
            }}
          >
            Remove Selected
          </Button>,
          <Button key="close" type="primary" onClick={() => setLowfreqOpen(false)}>
            Close
          </Button>,
        ]}
      >
        <Alert
          type="warning"
          showIcon
          message="Candidate rules"
          description={
            <div>
              Current candidates are non-pinned items with follower count less than or equal to 2, sorted by ascending follower count.
              Pinned items never appear in this list.
            </div>
          }
          style={{ marginBottom: 12 }}
        />

        <PageRequestErrorAlert
          message="Unable to load low-frequency candidates"
          description={lowfreqErrorMessage}
          onRetry={() => void loadLowfreq()}
          marginBottom={12}
        />

        <ProTable<LowFreqPoolItem>
          rowKey="itemId"
          columns={lowfreqColumns}
          dataSource={lowfreqRows}
          loading={lowfreqLoading}
          search={false}
          pagination={{ pageSize: 20 }}
          rowSelection={{
            selectedRowKeys: lowfreqSelected,
            onChange: (keys) => setLowfreqSelected(keys as number[]),
          }}
          toolBarRender={false}
        />
      </Modal>
    </PageContainer>
  );
}
