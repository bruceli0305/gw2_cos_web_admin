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
import { request } from '../../services/request';

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

type LowFreqPoolItem = PoolItem & {
  reasons?: Array<{ type: string; value: any; threshold?: any }>;
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

export default function DataMarketWatchPage() {
  const poolActionRef = useRef<ActionType>(null);
  const taskActionRef = useRef<ActionType>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [failOpen, setFailOpen] = useState(false);
  const [failPayload, setFailPayload] = useState<{ title: string; data: any } | null>(null);

  const [poolMeta, setPoolMeta] = useState<{ total: number; max: number } | null>(null);

  const [lowfreqOpen, setLowfreqOpen] = useState(false);
  const [lowfreqRows, setLowfreqRows] = useState<LowFreqPoolItem[]>([]);
  const [lowfreqSelected, setLowfreqSelected] = useState<number[]>([]);
  const [lowfreqLoading, setLowfreqLoading] = useState(false);
  const [metaSyncLoading, setMetaSyncLoading] = useState(false);
  const [historySyncItemId, setHistorySyncItemId] = useState<number | null>(null);

  async function loadLowfreq() {
    setLowfreqLoading(true);
    try {
      const res = await request<LowFreqResp>('/admin/v1/data/market-watch/pool/lowfreq', {
        params: { limit: 100, followerMax: 2 },
      });
      setLowfreqRows(res.items);
      setLowfreqSelected([]);
    } finally {
      setLowfreqLoading(false);
    }
  }

  const poolColumns: ProColumns<PoolItem>[] = [
    { title: 'ItemID', dataIndex: 'itemId', width: 120, copyable: true },
    {
      title: '名称',
      dataIndex: 'nameZh',
      search: false,
      ellipsis: true,
      render: (_, r) => r.nameZh || r.nameEn || '-',
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
      render: (_, r) => (r.pinned ? <Tag color="gold">置顶</Tag> : <Tag>否</Tag>),
    },
    { title: '关注数', dataIndex: 'followerCount', width: 90, search: false },
    {
      title: '快照状态',
      dataIndex: 'snapshotStatus',
      width: 110,
      search: false,
      render: (_, r) => {
        if (r.snapshotStatus === 'ERROR') return <Tag color="red">ERROR</Tag>;
        if (r.snapshotStatus === 'OK') return <Tag color="green">OK</Tag>;
        return <Tag>未知</Tag>;
      },
    },
    {
      title: '最近快照',
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
      render: (_, r) => {
        if (!r.snapshotError) return '-';
        return (
          <Button
            type="link"
            onClick={() => {
              setFailPayload({ title: `快照错误 · ItemID ${r.itemId}`, data: { snapshotError: r.snapshotError } });
              setFailOpen(true);
            }}
          >
            查看
          </Button>
        );
      },
    },
    {
      title: '日线同步',
      dataIndex: 'historySyncStatus',
      width: 120,
      search: false,
      render: (_, r) => {
        const v = r.historySyncStatus || 'NONE';
        if (v === 'SUCCESS') return <Tag color="green">已同步</Tag>;
        if (v === 'RUNNING') return <Tag color="blue">同步中</Tag>;
        if (v === 'FAILED') return <Tag color="red">失败</Tag>;
        return <Tag>未同步</Tag>;
      },
    },
    { title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime', width: 170, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      render: (_, r) => (
        <Space wrap>
          <Button
            type="link"
            loading={historySyncItemId === r.itemId}
            onClick={async () => {
              setHistorySyncItemId(r.itemId);
              try {
                const res = await request<RunNowResp>(`/admin/v1/data/market-watch/history/sync/${r.itemId}`, {
                  method: 'POST',
                  params: { days: 365 },
                });
                message.success(`历史同步完成：${res.status}（ok ${res.successCount} / fail ${res.failCount}）`);
                poolActionRef.current?.reload();
                taskActionRef.current?.reload();
              } finally {
                setHistorySyncItemId(null);
              }
            }}
          >
            同步历史数据
          </Button>

          <Button
            type="link"
            onClick={async () => {
              await request(`/admin/v1/data/market-watch/pool/${r.itemId}`, {
                method: 'PATCH',
                body: JSON.stringify({ pinned: !r.pinned }),
              });
              message.success(r.pinned ? '已取消置顶' : '已置顶');
              poolActionRef.current?.reload();
            }}
          >
            {r.pinned ? '取消置顶' : '置顶'}
          </Button>

          <Popconfirm
            title="移除该物品出采集池？"
            description="移除后将停止定时采集该 itemId 的快照数据。"
            okText="移除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={async () => {
              await request(`/admin/v1/data/market-watch/pool/${r.itemId}`, { method: 'DELETE' });
              message.success('已移除');
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
          snapshot_10m: { text: '10分钟快照采集' },
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
          SUCCESS: { text: 'SUCCESS' },
          PARTIAL: { text: 'PARTIAL' },
          FAILED: { text: 'FAILED' },
        },
        render: (_, r) => {
          if (r.status === 'SUCCESS') return <Tag color="green">SUCCESS</Tag>;
          if (r.status === 'PARTIAL') return <Tag color="orange">PARTIAL</Tag>;
          return <Tag color="red">FAILED</Tag>;
        },
      },
      { title: '目标', dataIndex: 'targetCount', width: 80, search: false },
      { title: '成功', dataIndex: 'successCount', width: 80, search: false },
      { title: '失败', dataIndex: 'failCount', width: 80, search: false },
      {
        title: '失败详情',
        dataIndex: 'failSample',
        search: false,
        render: (_, r) => {
          const list = Array.isArray(r.failSample) ? r.failSample : [];
          if (!list.length) return '-';
          return (
            <Button
              type="link"
              onClick={() => {
                setFailPayload({ title: `失败详情 · ${r.startedAt}`, data: list });
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
    { title: 'ItemID', dataIndex: 'itemId', width: 120 },
    { title: '关注数', dataIndex: 'followerCount', width: 90 },
    {
      title: '最近快照',
      dataIndex: 'lastSnapshotAt',
      valueType: 'dateTime',
      width: 170,
    },
    {
      title: '建议原因',
      dataIndex: 'reasons',
      search: false,
      render: (_, r) => {
        const reasons = Array.isArray(r.reasons) ? r.reasons : [];
        if (!reasons.length) return '-';
        return reasons
          .map((x) => {
            if (x.type === 'LOW_FOLLOWER') return `关注数≤${x.threshold}（当前${x.value}）`;
            return x.type;
          })
          .join('；');
      },
    },
  ];

  return (
    <PageContainer
      title="交易所监控"
      subTitle={poolMeta ? `采集池 ${poolMeta.total}/${poolMeta.max} · 10分钟快照采集` : '采集池（上限 1000）与 10 分钟快照采集任务'}
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
          onClick={async () => {
            const res = await request<RunNowResp>('/admin/v1/data/market-watch/run/snapshot10m', { method: 'POST' });
            message.success(`已触发：${res.status}（ok ${res.successCount} / fail ${res.failCount}）`);
            poolActionRef.current?.reload();
            taskActionRef.current?.reload();
            if (res.failSample?.length) {
              setFailPayload({
                title: `本次失败详情 · ts ${res.ts}`,
                data: res.failSample,
              });
              setFailOpen(true);
            }
          }}
        >
          立即采集一次
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
              message.success(`名称同步完成：${res.status}（ok ${res.successCount} / fail ${res.failCount}）`);
              poolActionRef.current?.reload();
              taskActionRef.current?.reload();
              if (res.failSample?.length) {
                setFailPayload({ title: `名称同步失败详情`, data: res.failSample });
                setFailOpen(true);
              }
            } finally {
              setMetaSyncLoading(false);
            }
          }}
        >
          同步名称/图标
        </Button>,
        <Button
          key="lowfreq"
          onClick={async () => {
            setLowfreqOpen(true);
            await loadLowfreq();
          }}
        >
          低频候选 / 批量移除
        </Button>,
        <Button key="add" type="primary" onClick={() => setAddOpen(true)}>
          添加到采集池
        </Button>,
      ]}
    >
      <Alert
        type="info"
        showIcon
        message="第一阶段只做数据正确入库"
        description={
          <div>
            <div>1）采集池内的 itemId 会被定时任务每 10 分钟抓取官方 commerce/prices 并写入快照表。</div>
            <div>2）采集池唯一 itemId 上限 1000；满了需要先移除低频物品。</div>
            <div>3）“立即采集一次”会尝试获取任务锁；若正在运行会直接报错，不会并发执行。</div>
          </div>
        }
        style={{ marginBottom: 12 }}
      />

      <ProCard
        tabs={{
          type: 'card',
        }}
      >
        <ProCard.TabPane key="pool" tab="采集池">
          <ProTable<PoolItem>
            actionRef={poolActionRef}
            rowKey="itemId"
            cardBordered
            columns={poolColumns}
            request={async (params) => {
              const { current, pageSize, itemId, pinned } = params as any;
              const res = await request<PoolListResp>('/admin/v1/data/market-watch/pool', {
                params: {
                  page: current || 1,
                  limit: pageSize || 20,
                  itemId: itemId || '',
                  pinned: pinned === undefined ? '' : String(pinned),
                },
              });
              setPoolMeta({ total: res.total, max: res.max });
              return { data: res.items, total: res.total, success: true };
            }}
          />
        </ProCard.TabPane>

        <ProCard.TabPane key="tasks" tab="任务记录">
          <ProTable<TaskRun>
            actionRef={taskActionRef}
            rowKey="_id"
            cardBordered
            columns={taskColumns}
            request={async (params) => {
              const { taskName } = params as any;
              const res = await request<{ items: TaskRun[] }>('/admin/v1/data/market-watch/task-runs', {
                params: {
                  taskName: taskName || 'snapshot_10m',
                  limit: 50,
                },
              });
              return { data: res.items, total: res.items.length, success: true };
            }}
            pagination={false}
            search={{ labelWidth: 80 }}
          />
        </ProCard.TabPane>
      </ProCard>

      <ModalForm
        title="添加到采集池"
        open={addOpen}
        onOpenChange={setAddOpen}
        modalProps={{ destroyOnClose: true }}
        initialValues={{ pinned: false }}
        onFinish={async (values) => {
          const raw = String(values.itemId || '').trim();
          if (!raw) {
            message.error('请输入 ItemID');
            return false;
          }
          if (!/^\d+$/.test(raw)) {
            message.error('ItemID 必须是数字');
            return false;
          }
          await request('/admin/v1/data/market-watch/pool', {
            method: 'POST',
            body: JSON.stringify({ itemId: Number(raw), pinned: !!values.pinned }),
          });
          message.success('已添加');
          poolActionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText
          name="itemId"
          label="ItemID"
          placeholder="例如：19721"
          rules={[{ required: true, message: '请输入 ItemID' }]}
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
        title="低频候选 / 批量移除"
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
            刷新候选
          </Button>,
          <Button
            key="remove"
            danger
            disabled={lowfreqSelected.length === 0}
            onClick={async () => {
              const ids = [...lowfreqSelected];
              Modal.confirm({
                title: `确认移除选中的 ${ids.length} 个 itemId？`,
                content: '移除后将停止定时采集这些物品的快照数据。用户关注关系不会删除。',
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
                  message.success(`已移除 ${res.deletedCount} 条采集池记录`);
                  poolActionRef.current?.reload();
                  await loadLowfreq();
                },
              });
            }}
          >
            批量移除所选
          </Button>,
          <Button key="close" type="primary" onClick={() => setLowfreqOpen(false)}>
            关闭
          </Button>,
        ]}
      >
        <Alert
          type="warning"
          showIcon
          message="候选规则"
          description={<div>当前候选：未置顶且关注数≤2（按关注数升序排序）。置顶物品不会出现在候选中。</div>}
          style={{ marginBottom: 12 }}
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
