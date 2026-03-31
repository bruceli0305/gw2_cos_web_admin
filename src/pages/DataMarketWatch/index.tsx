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
import { Button, Card, Col, Modal, Popconfirm, Progress, Row, Space, Statistic, Tag, message } from 'antd';
import { useMemo, useRef, useState } from 'react';
import { getDestructivePopconfirmProps } from '../../components/confirmProps';
import { PageNoticeAlert, PageRequestErrorAlert } from '../../components/listPageState';
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
  if (result.status) {
    const statusLabelMap: Record<NonNullable<RunNowResp['status']>, string> = {
      SUCCESS: '成功',
      FAILED: '失败',
      PARTIAL: '部分失败',
    };
    parts.push(statusLabelMap[result.status]);
  }

  const counts: string[] = [];
  if (typeof result.successCount === 'number') counts.push(`成功 ${result.successCount}`);
  if (typeof result.failCount === 'number') counts.push(`失败 ${result.failCount}`);
  if (counts.length) parts.push(counts.join(' / '));

  return parts.length ? `${actionLabel}完成：${parts.join(' | ')}` : `${actionLabel}完成`;
}

function formatLowFrequencyReason(reason: LowFreqReason) {
  if (reason.type === 'LOW_FOLLOWER') {
    return `关注人数 <= ${reason.threshold}（当前 ${reason.value}）`;
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
      setLowfreqErrorMessage(getErrorMessage(error, '加载低频候选项失败'));
    } finally {
      setLowfreqLoading(false);
    }
  }

  const poolColumns: ProColumns<PoolItem>[] = [
    { title: '物品 ID', dataIndex: 'itemId', width: 120, copyable: true },
    {
      title: '名称',
      dataIndex: 'nameZh',
      search: false,
      ellipsis: true,
      render: (_, record) => record.nameZh || record.nameEn || '-',
    },
    {
      title: '置顶',
      dataIndex: 'pinned',
      width: 90,
      valueType: 'select',
      valueEnum: {
        true: { text: '是' },
        false: { text: '否' },
      },
      render: (_, record) => (record.pinned ? <Tag color="gold">已置顶</Tag> : <Tag>普通</Tag>),
    },
    { title: '关注人数', dataIndex: 'followerCount', width: 90, search: false },
    {
      title: '快照状态',
      dataIndex: 'snapshotStatus',
      width: 110,
      search: false,
      render: (_, record) => {
        if (record.snapshotStatus === 'ERROR') return <Tag color="red">异常</Tag>;
        if (record.snapshotStatus === 'OK') return <Tag color="green">正常</Tag>;
        return <Tag>未知</Tag>;
      },
    },
    {
      title: '最近快照时间',
      dataIndex: 'lastSnapshotAt',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    {
      title: '快照错误',
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
                title: `快照错误 · 物品 ID ${record.itemId}`,
                data: { snapshotError: record.snapshotError },
              });
              setFailOpen(true);
            }}
          >
            查看
          </Button>
        );
      },
    },
    {
      title: '历史同步',
      dataIndex: 'historySyncStatus',
      width: 120,
      search: false,
      render: (_, record) => {
        const status = record.historySyncStatus || 'NONE';
        if (status === 'SUCCESS') return <Tag color="green">已完成</Tag>;
        if (status === 'RUNNING') return <Tag color="blue">运行中</Tag>;
        if (status === 'FAILED') return <Tag color="red">失败</Tag>;
        return <Tag>未开始</Tag>;
      },
    },
    { title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime', width: 170, search: false },
    {
      title: '操作',
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
                message.success(formatRunSummary('历史同步', res));
                poolActionRef.current?.reload();
                taskActionRef.current?.reload();
              } finally {
                setHistorySyncItemId(null);
              }
            }}
          >
            同步历史
          </Button>

          <Button
            type="link"
            onClick={async () => {
              await request(`/admin/v1/data/market-watch/pool/${record.itemId}`, {
                method: 'PATCH',
                body: JSON.stringify({ pinned: !record.pinned }),
              });
              message.success(record.pinned ? '已取消置顶' : '已置顶');
              poolActionRef.current?.reload();
            }}
          >
            {record.pinned ? '取消置顶' : '置顶'}
          </Button>

          <Popconfirm
            {...getDestructivePopconfirmProps({
              title: '确认把这个物品移出监控池吗？',
              description: '移除后会停止这个物品的定时快照采集，但不会删除用户关注关系。',
              confirmLabel: '移除',
            })}
            onConfirm={async () => {
              await request(`/admin/v1/data/market-watch/pool/${record.itemId}`, { method: 'DELETE' });
              message.success('物品已移出监控池');
              poolActionRef.current?.reload();
            }}
          >
            <Button type="link" danger>
              移除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const taskColumns: ProColumns<TaskRun>[] = useMemo(
    () => [
      {
        title: '任务',
        dataIndex: 'taskName',
        hideInTable: true,
        valueType: 'select',
        valueEnum: {
          snapshot_10m: { text: '10 分钟快照采集' },
        },
      },
      { title: '开始时间', dataIndex: 'startedAt', valueType: 'dateTime', width: 180, search: false },
      { title: '结束时间', dataIndex: 'endedAt', valueType: 'dateTime', width: 180, search: false },
      {
        title: '状态',
        dataIndex: 'status',
        width: 110,
        valueType: 'select',
        valueEnum: {
          SUCCESS: { text: '成功' },
          PARTIAL: { text: '部分失败' },
          FAILED: { text: '失败' },
        },
        render: (_, record) => {
          if (record.status === 'SUCCESS') return <Tag color="green">成功</Tag>;
          if (record.status === 'PARTIAL') return <Tag color="orange">部分失败</Tag>;
          return <Tag color="red">失败</Tag>;
        },
      },
      { title: '目标数', dataIndex: 'targetCount', width: 80, search: false },
      { title: '成功数', dataIndex: 'successCount', width: 80, search: false },
      { title: '失败数', dataIndex: 'failCount', width: 80, search: false },
      {
        title: '失败详情',
        dataIndex: 'failSample',
        search: false,
        render: (_, record) => {
          const list = Array.isArray(record.failSample) ? record.failSample : [];
          if (!list.length) return '-';
          return (
            <Button
              type="link"
              onClick={() => {
                setFailPayload({ title: `失败详情 · ${record.startedAt}`, data: list });
                setFailOpen(true);
              }}
            >
              查看（{list.length}）
            </Button>
          );
        },
      },
    ],
    []
  );

  const lowfreqColumns: ProColumns<LowFreqPoolItem>[] = [
    { title: '物品 ID', dataIndex: 'itemId', width: 120 },
    { title: '关注人数', dataIndex: 'followerCount', width: 90 },
    {
      title: '最近快照时间',
      dataIndex: 'lastSnapshotAt',
      valueType: 'dateTime',
      width: 170,
    },
    {
      title: '建议原因',
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
    searchText: '应用筛选',
    filteredEmptyText: '当前筛选条件下没有匹配的监控物品。',
    emptyText: '当前监控池中还没有任何物品。',
  });
  const poolTotal = poolMeta?.total ?? 0;
  const poolMax = poolMeta?.max ?? 0;
  const remainingCapacity = poolMeta ? Math.max(poolMeta.max - poolMeta.total, 0) : 0;
  const poolUsagePercent = poolMeta && poolMeta.max > 0 ? Math.min(100, Math.round((poolMeta.total / poolMeta.max) * 100)) : 0;

  return (
    <PageContainer
      title="交易所观察"
      subTitle={
        poolMeta
          ? `监控池使用情况 ${poolMeta.total}/${poolMeta.max} · 10 分钟快照采集`
          : '管理监控池，并执行 10 分钟市场快照采集'
      }
      extra={[
        <Button
          key="refresh"
          onClick={() => {
            poolActionRef.current?.reload();
            taskActionRef.current?.reload();
          }}
        >
          刷新
        </Button>,
        <Button
          key="run"
          loading={snapshotRunLoading}
          onClick={async () => {
            setSnapshotRunLoading(true);
            try {
              const res = await request<RunNowResp>('/admin/v1/data/market-watch/run/snapshot10m', { method: 'POST' });
              message.success(formatRunSummary('快照采集', res));
              poolActionRef.current?.reload();
              taskActionRef.current?.reload();
              if (res.failSample?.length) {
                setFailPayload({
                  title: `快照采集失败项 · ${res.ts || '最近一次运行'}`,
                  data: res.failSample,
                });
                setFailOpen(true);
              }
            } finally {
              setSnapshotRunLoading(false);
            }
          }}
        >
          立即采集快照
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
              message.success(formatRunSummary('物品元数据同步', res));
              poolActionRef.current?.reload();
              taskActionRef.current?.reload();
              if (res.failSample?.length) {
                setFailPayload({ title: '物品元数据同步失败项', data: res.failSample });
                setFailOpen(true);
              }
            } finally {
              setMetaSyncLoading(false);
            }
          }}
        >
          同步名称与图标
        </Button>,
        <Button
          key="lowfreq"
          onClick={async () => {
            setLowfreqOpen(true);
            await loadLowfreq();
          }}
        >
          低频候选项
        </Button>,
        <Button key="add" type="primary" onClick={() => setAddOpen(true)}>
          添加到监控池
        </Button>,
      ]}
    >
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="监控池规模" value={poolMeta ? poolTotal : '-'} suffix={poolMeta ? `/ ${poolMax}` : undefined} />
            <div style={{ marginTop: 8 }}>
              <Progress percent={poolUsagePercent} showInfo={false} strokeColor="#1677ff" />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="剩余容量" value={poolMeta ? remainingCapacity : '-'} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>池满前还可继续加入的唯一物品数量。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="采集节奏" value="10 分钟" />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>监控池物品按固定节奏执行官方价格快照采集。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前视图" value={hasPoolFilters ? '筛选中' : '全部监控'} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>上方操作区覆盖手动采集、元数据同步和低频清理。</div>
          </Card>
        </Col>
      </Row>

      <PageNoticeAlert
        type="info"
        message="本页管理内容"
        description={
          <div>
            <div>1. 监控池内的物品会每 10 分钟从官方 `commerce/prices` 接口拉取一次并落库存储为快照。</div>
            <div>2. 监控池最多允许 1000 个唯一物品 ID。池满时，请先移除低频物品再继续添加。</div>
            <div>3. “立即采集快照”仍受后端任务锁保护；若已有任务运行中，请求会直接失败，不会并发执行。</div>
          </div>
        }
        marginBottom={12}
      />

      <PageRequestErrorAlert
        message="无法加载交易所监控池"
        description={poolErrorMessage}
        onRetry={() => poolActionRef.current?.reload()}
        marginBottom={12}
      />

      <PageRequestErrorAlert
        message="无法加载交易所监控任务记录"
        description={taskErrorMessage}
        onRetry={() => taskActionRef.current?.reload()}
        marginBottom={12}
      />

      <ProCard
        tabs={{
          type: 'card',
        }}
      >
        <ProCard.TabPane key="pool" tab="监控池">
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
                setPoolErrorMessage(getErrorMessage(error, '加载交易所监控池失败'));
                throw error;
              }
            }}
          />
        </ProCard.TabPane>

        <ProCard.TabPane key="tasks" tab="任务记录">
          <ProTable<TaskRun>
            actionRef={taskActionRef}
            rowKey="_id"
            cardBordered
            columns={taskColumns}
            locale={{ emptyText: '当前还没有任何交易所监控任务记录。' }}
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
                setTaskErrorMessage(getErrorMessage(error, '加载交易所监控任务记录失败'));
                throw error;
              }
            }}
            pagination={false}
            search={{ labelWidth: 'auto', searchText: '应用筛选', resetText: '清空筛选' }}
          />
        </ProCard.TabPane>
      </ProCard>

      <ModalForm<AddPoolFormValues>
        title="添加物品到监控池"
        open={addOpen}
        onOpenChange={setAddOpen}
        modalProps={{ destroyOnClose: true }}
        initialValues={{ pinned: false }}
        onFinish={async (values) => {
          const raw = String(values.itemId || '').trim();
          if (!raw) {
            message.error('请输入物品 ID');
            return false;
          }
          if (!/^\d+$/.test(raw)) {
            message.error('物品 ID 必须是数字');
            return false;
          }
          await request('/admin/v1/data/market-watch/pool', {
            method: 'POST',
            body: JSON.stringify({ itemId: Number(raw), pinned: !!values.pinned }),
          });
          message.success('物品已加入监控池');
          poolActionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText
          name="itemId"
          label="物品 ID"
          placeholder="例如：19721"
          rules={[{ required: true, message: '请输入物品 ID' }]}
        />
        <ProFormSwitch name="pinned" label="置顶" />
      </ModalForm>

      <Modal
        title={failPayload?.title || '详情'}
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
        title="低频候选项"
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
            刷新候选项
          </Button>,
          <Button
            key="remove"
            danger
            disabled={lowfreqSelected.length === 0}
            onClick={async () => {
              const ids = [...lowfreqSelected];
              Modal.confirm({
                title: `确认将 ${ids.length} 个选中物品移出监控池吗？`,
                content: '移除后会停止这些物品的定时快照采集，但不会删除用户关注关系。',
                okText: '移除',
                okButtonProps: { danger: true },
                cancelText: '取消',
                onOk: async () => {
                  const res = await request<{ success: true; deletedCount: number }>(
                    '/admin/v1/data/market-watch/pool/batch-remove',
                    {
                      method: 'POST',
                      body: JSON.stringify({ itemIds: ids }),
                    }
                  );
                  message.success(`已移除 ${res.deletedCount} 条监控池记录`);
                  poolActionRef.current?.reload();
                  await loadLowfreq();
                },
              });
            }}
          >
            移除选中项
          </Button>,
          <Button key="close" type="primary" onClick={() => setLowfreqOpen(false)}>
            关闭
          </Button>,
        ]}
      >
        <PageNoticeAlert
          type="warning"
          message="候选规则"
          description={
            <div>
              当前候选项为未置顶、关注人数小于等于 2 的物品，并按关注人数升序排序。置顶物品不会出现在这里。
            </div>
          }
          marginBottom={12}
        />

        <PageRequestErrorAlert
          message="无法加载低频候选项"
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
