import {
  PageContainer,
  ProTable,
  type ProColumns,
  type ActionType,
  ModalForm,
  ProFormSelect,
  ProFormSwitch,
} from '@ant-design/pro-components';
import { Button, Modal, Space, message, Select, Tag } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { request } from '../../services/request';

type EntityItem = {
  _id: string;
  type: string;
  lang: string;
  gw2Id: string;
  name: string;
  updatedAt: string;
};

type SyncState = {
  type: string;
  lang: string;
  buildId?: number;
  status: 'idle' | 'running' | 'success' | 'error';
  startedAt?: string;
  finishedAt?: string;
  itemsTotal?: number;
  itemsUpserted?: number;
  itemsDeleted?: number;
  errorMessage?: string;
  updatedAt: string;
};

export default function DataGw2ApiPage() {
  const actionRef = useRef<ActionType>(null);

  const [types, setTypes] = useState<string[]>([]);
  const [type, setType] = useState<string>('professions');
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

  const [syncOpen, setSyncOpen] = useState(false);
  const [syncStates, setSyncStates] = useState<SyncState[]>([]);

  const [payloadOpen, setPayloadOpen] = useState(false);
  const [payload, setPayload] = useState<any>(null);

  useEffect(() => {
    request<{ items: string[] }>('/admin/v1/data/gw2-api/types')
      .then((res) => {
        const list = res.items || [];
        setTypes(list);
        if (list.length && !list.includes(type)) setType(list[0]);
      })
      .catch(() => {
        setTypes([]);
      });
  }, []);

  const refreshStates = async (nextLang = lang) => {
    try {
      const res = await request<{ items: SyncState[] }>('/admin/v1/data/gw2-api/sync-states', {
        params: { lang: nextLang },
      });
      setSyncStates(res.items || []);
    } catch {
      setSyncStates([]);
    }
  };

  useEffect(() => {
    refreshStates(lang);
  }, [lang]);

  const typeOptions = useMemo(() => (types || []).map((t) => ({ label: t, value: t })), [types]);

  const stateMap = useMemo(() => {
    const m = new Map<string, SyncState>();
    for (const s of syncStates) m.set(s.type, s);
    return m;
  }, [syncStates]);

  const currentState = stateMap.get(type);

  const columns: ProColumns<EntityItem>[] = [
    { title: '关键词', dataIndex: 'q', hideInTable: true },

    { title: 'GW2 ID', dataIndex: 'gw2Id', width: 160, copyable: true },
    { title: '名称', dataIndex: 'name', ellipsis: true },
    { title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime', width: 170, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      render: (_, r) => (
        <Button
          type="link"
          onClick={async () => {
            const res = await request(`/admin/v1/data/gw2-api/entities/${encodeURIComponent(type)}/${encodeURIComponent(r.gw2Id)}`,
              { params: { lang } }
            );
            setPayload(res?.data ?? res);
            setPayloadOpen(true);
          }}
        >
          查看JSON
        </Button>
      ),
    },
  ];

  const statusTag = (s?: SyncState) => {
    if (!s) return null;
    if (s.status === 'running') return <Tag color="processing">同步中</Tag>;
    if (s.status === 'success') return <Tag color="success">已同步</Tag>;
    if (s.status === 'error') return <Tag color="error">同步失败</Tag>;
    return <Tag>未知</Tag>;
  };

  return (
    <PageContainer
      title="GW2 官方数据"
      subTitle="从 api.guildwars2.com 拉取并入库（可多语言），用于 Build Editor 等功能"
      extra={[
        <Space key="controls">
          <span>语言：</span>
          <Select
            value={lang}
            style={{ width: 120 }}
            options={[
              { label: '中文(zh)', value: 'zh' },
              { label: 'English(en)', value: 'en' },
            ]}
            onChange={(v) => {
              setLang(v);
              actionRef.current?.reload();
            }}
          />

          <span>类型：</span>
          <Select
            value={type}
            style={{ width: 200 }}
            options={typeOptions}
            onChange={(v) => {
              setType(v);
              actionRef.current?.reload();
            }}
          />

          <Button
            type="primary"
            onClick={async () => {
              try {
                message.loading({ content: '正在同步，请稍候…', key: 'sync' });
                const res = await request('/admin/v1/data/gw2-api/sync', {
                  method: 'POST',
                  body: JSON.stringify({ types: [type], lang, prune: true }),
                });
                message.success({ content: `同步完成：${res?.results?.[0]?.type || type}`, key: 'sync' });
                refreshStates(lang);
                actionRef.current?.reload();
              } catch (e: any) {
                message.error({ content: e?.message || '同步失败', key: 'sync' });
                refreshStates(lang);
              }
            }}
          >
            同步当前类型
          </Button>

          <Button onClick={() => setSyncOpen(true)}>高级同步…</Button>
        </Space>,
      ]}
    >
      <div style={{ marginBottom: 12 }}>
        <Space wrap>
          {statusTag(currentState)}
          {typeof currentState?.buildId === 'number' ? <Tag>build: {currentState.buildId}</Tag> : null}
          {typeof currentState?.itemsTotal === 'number' ? <Tag>total: {currentState.itemsTotal}</Tag> : null}
          {typeof currentState?.itemsUpserted === 'number' ? <Tag>changed: {currentState.itemsUpserted}</Tag> : null}
          {typeof currentState?.itemsDeleted === 'number' ? <Tag>deleted: {currentState.itemsDeleted}</Tag> : null}
          {currentState?.status === 'error' && currentState?.errorMessage ? (
            <Tag color="error" style={{ maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentState.errorMessage}
            </Tag>
          ) : null}
        </Space>
      </div>

      <ProTable<EntityItem>
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        columns={columns}
        request={async (params) => {
          const { current, pageSize, q } = params as any;
          const res = await request('/admin/v1/data/gw2-api/entities', {
            params: {
              type,
              lang,
              page: current || 1,
              limit: pageSize || 20,
              q: q || '',
            },
          });
          return { data: res.items, total: res.total, success: true };
        }}
      />

      <Modal
        title="原始 JSON"
        open={payloadOpen}
        onCancel={() => setPayloadOpen(false)}
        onOk={() => setPayloadOpen(false)}
        width={900}
      >
        <pre style={{ maxHeight: 520, overflow: 'auto', background: '#f6f6f6', padding: 12 }}>
          {JSON.stringify(payload, null, 2)}
        </pre>
      </Modal>

      <ModalForm
        title="高级同步"
        open={syncOpen}
        onOpenChange={setSyncOpen}
        modalProps={{ destroyOnClose: true }}
        initialValues={{ lang, prune: true, types: types.length ? [type] : [] }}
        onFinish={async (values) => {
          try {
            message.loading({ content: '正在同步，请稍候…', key: 'sync2' });
            await request('/admin/v1/data/gw2-api/sync', {
              method: 'POST',
              body: JSON.stringify({
                lang: values.lang,
                prune: values.prune !== false,
                types: values.types || [],
              }),
            });
            message.success({ content: '同步完成', key: 'sync2' });
            setLang(values.lang);
            refreshStates(values.lang);
            actionRef.current?.reload();
            return true;
          } catch (e: any) {
            message.error({ content: e?.message || '同步失败', key: 'sync2' });
            return false;
          }
        }}
      >
        <ProFormSelect
          name="lang"
          label="语言"
          options={[
            { label: '中文(zh)', value: 'zh' },
            { label: 'English(en)', value: 'en' },
          ]}
          rules={[{ required: true }]}
        />
        <ProFormSelect
          name="types"
          label="同步类型"
          mode="multiple"
          options={typeOptions}
          rules={[{ required: true, message: '至少选择一个类型' }]}
        />
        <ProFormSwitch name="prune" label="清理旧数据" tooltip="开启后会删除本次同步未出现的旧记录（建议保持开启）" />
      </ModalForm>
    </PageContainer>
  );
}
