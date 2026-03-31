import {
  ModalForm,
  PageContainer,
  ProFormSelect,
  ProFormSwitch,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { Alert, Button, Card, Col, Modal, Row, Select, Space, Statistic, Tag, message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageNoticeAlert } from '../../components/listPageState';
import { runSafeFollowUp } from '../../services/followUp';
import { getErrorMessage, request } from '../../services/request';

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

type Language = 'zh' | 'en';

type TableRequestParams = {
  current?: number;
  pageSize?: number;
  q?: string;
};

type EntityListResponse = {
  items: EntityItem[];
  total: number;
};

type SyncStatesResponse = {
  items: SyncState[];
};

type SyncResponse = {
  results?: Array<{ type?: string }>;
};

type SyncFormValues = {
  lang: Language;
  prune?: boolean;
  types?: string[];
};

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('zh-CN', { hour12: false });
}

export default function DataGw2ApiPage() {
  const actionRef = useRef<ActionType>(null);

  const [types, setTypes] = useState<string[]>([]);
  const [type, setType] = useState<string>('professions');
  const [lang, setLang] = useState<Language>('zh');
  const [typesErrorMessage, setTypesErrorMessage] = useState<string | null>(null);
  const [syncStatesErrorMessage, setSyncStatesErrorMessage] = useState<string | null>(null);
  const [tableErrorMessage, setTableErrorMessage] = useState<string | null>(null);
  const [hasSearch, setHasSearch] = useState(false);

  const [syncOpen, setSyncOpen] = useState(false);
  const [syncStates, setSyncStates] = useState<SyncState[]>([]);

  const [payloadOpen, setPayloadOpen] = useState(false);
  const [payload, setPayload] = useState<unknown>(null);

  const fetchTypes = useCallback(async () => {
    const res = await request<{ items: string[] }>('/admin/v1/data/gw2-api/types');
    return res.items || [];
  }, []);

  const loadTypes = useCallback(async () => {
    const nextTypes = await fetchTypes();
    setTypes(nextTypes);
    setType((currentType) => (nextTypes.length && !nextTypes.includes(currentType) ? nextTypes[0] : currentType));
    setTypesErrorMessage(null);
    return nextTypes;
  }, [fetchTypes]);

  const fetchSyncStates = useCallback(async (nextLang: Language) => {
    const res = await request<SyncStatesResponse>('/admin/v1/data/gw2-api/sync-states', {
      params: { lang: nextLang },
    });
    return res.items || [];
  }, []);

  const refreshStates = useCallback(async (nextLang: Language) => {
    const nextStates = await fetchSyncStates(nextLang);
    setSyncStates(nextStates);
    setSyncStatesErrorMessage(null);
    return nextStates;
  }, [fetchSyncStates]);

  useEffect(() => {
    let active = true;

    async function loadInitialTypes() {
      try {
        const nextTypes = await fetchTypes();
        if (!active) return;
        setTypes(nextTypes);
        setType((currentType) => (nextTypes.length && !nextTypes.includes(currentType) ? nextTypes[0] : currentType));
        setTypesErrorMessage(null);
      } catch (error: unknown) {
        if (active) {
          setTypesErrorMessage(getErrorMessage(error, '加载 GW2 API 实体类型失败'));
        }
      }
    }

    void loadInitialTypes();

    return () => {
      active = false;
    };
  }, [fetchTypes]);

  useEffect(() => {
    let active = true;

    async function loadStates() {
      try {
        const nextStates = await fetchSyncStates(lang);
        if (active) setSyncStates(nextStates);
        if (active) setSyncStatesErrorMessage(null);
      } catch (error: unknown) {
        if (active) {
          setSyncStatesErrorMessage(getErrorMessage(error, '加载同步状态失败'));
        }
      }
    }

    void loadStates();
    return () => {
      active = false;
    };
  }, [fetchSyncStates, lang]);

  const typeOptions = useMemo(() => types.map((item) => ({ label: item, value: item })), [types]);

  const stateMap = useMemo(() => {
    const nextStateMap = new Map<string, SyncState>();
    for (const item of syncStates) nextStateMap.set(item.type, item);
    return nextStateMap;
  }, [syncStates]);

  const currentState = stateMap.get(type);
  const currentLangLabel = lang === 'zh' ? '中文' : '英文';

  const columns: ProColumns<EntityItem>[] = [
    { title: '名称 / GW2 ID', dataIndex: 'q', hideInTable: true },
    { title: 'GW2 ID', dataIndex: 'gw2Id', width: 160, copyable: true },
    { title: '名称', dataIndex: 'name', ellipsis: true },
    { title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime', width: 170, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      render: (_, record) => (
        <Button
          type="link"
          onClick={async () => {
            const res = await request<unknown>(
              `/admin/v1/data/gw2-api/entities/${encodeURIComponent(type)}/${encodeURIComponent(record.gw2Id)}`,
              { params: { lang } },
            );
            setPayload(res);
            setPayloadOpen(true);
          }}
        >
          查看载荷
        </Button>
      ),
    },
  ];

  function renderStatusTag(state?: SyncState) {
    if (!state) return null;
    if (state.status === 'running') return <Tag color="processing">运行中</Tag>;
    if (state.status === 'success') return <Tag color="success">成功</Tag>;
    if (state.status === 'error') return <Tag color="error">失败</Tag>;
    return <Tag>空闲</Tag>;
  }

  return (
    <PageContainer
      title="GW2 API 同步"
      subTitle="把官方 GW2 API 实体同步到后台数据工作区，供其它管理工具继续使用。"
      extra={[
        <Space key="controls">
          <span>语言：</span>
          <Select<Language>
            value={lang}
            style={{ width: 120 }}
            options={[
              { label: '中文 (zh)', value: 'zh' },
              { label: '英文 (en)', value: 'en' },
            ]}
            onChange={(value) => {
              setLang(value);
              actionRef.current?.reload();
            }}
          />

          <span>类型：</span>
          <Select
            value={type}
            style={{ width: 220 }}
            options={typeOptions}
            onChange={(value) => {
              setType(value);
              actionRef.current?.reload();
            }}
          />

          <Button
            type="primary"
            onClick={async () => {
              try {
                message.loading({ content: '同步进行中...', key: 'sync' });
                const res = await request<SyncResponse>('/admin/v1/data/gw2-api/sync', {
                  method: 'POST',
                  body: JSON.stringify({ types: [type], lang, prune: true }),
                });
                message.success({ content: `同步完成：${res.results?.[0]?.type || type}`, key: 'sync' });
                await runSafeFollowUp(() => refreshStates(lang));
                actionRef.current?.reload();
              } catch (error: unknown) {
                message.error({ content: getErrorMessage(error, '同步失败'), key: 'sync' });
                await runSafeFollowUp(() => refreshStates(lang));
              }
            }}
          >
            同步当前类型
          </Button>

          <Button onClick={() => setSyncOpen(true)}>高级同步</Button>
        </Space>,
      ]}
    >
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前实体类型" value={type || '-'} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>上方筛选和同步操作都会基于当前实体类型执行。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="语言版本" value={currentLangLabel} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前列表和同步状态都按选中的语言维度展示。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="缓存条目" value={typeof currentState?.itemsTotal === 'number' ? currentState.itemsTotal : '-'} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前实体类型在本地缓存中的记录总数。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>同步状态</div>
            <div style={{ marginTop: 10 }}>{renderStatusTag(currentState) || <Tag>未加载</Tag>}</div>
            <div style={{ marginTop: 12, color: '#64748b', fontSize: 12 }}>
              最后更新：{formatDateTime(currentState?.updatedAt)}
            </div>
          </Card>
        </Col>
      </Row>

      <PageNoticeAlert
        type="info"
        message="如何使用这个同步工作区"
        description={(
          <div>
            <div>1. 先用语言和实体类型选择器查看某个上游域当前的缓存数据。</div>
            <div>2. “同步当前类型”适合单类型刷新；需要一次同步多种实体时再使用“高级同步”。</div>
            <div>3. “查看载荷”展示的是后台缓存记录，不是实时的上游官方响应。</div>
          </div>
        )}
        marginBottom={16}
      />

      {typesErrorMessage ? (
        <Alert
          showIcon
          type="error"
          style={{ marginBottom: 16 }}
          message="无法加载 GW2 API 实体类型"
          description={typesErrorMessage}
          action={(
            <Button size="small" onClick={() => void loadTypes().catch(() => undefined)}>
              重试
            </Button>
          )}
        />
      ) : null}

      {syncStatesErrorMessage ? (
        <Alert
          showIcon
          type="error"
          style={{ marginBottom: 16 }}
          message="无法加载同步状态"
          description={syncStatesErrorMessage}
          action={(
            <Button size="small" onClick={() => void refreshStates(lang).catch(() => undefined)}>
              重试
            </Button>
          )}
        />
      ) : null}

      {tableErrorMessage ? (
        <Alert
          showIcon
          type="error"
          style={{ marginBottom: 16 }}
          message="无法加载 GW2 API 实体"
          description={tableErrorMessage}
          action={(
            <Button size="small" onClick={() => actionRef.current?.reload()}>
              重试
            </Button>
          )}
        />
      ) : null}

      <div style={{ marginBottom: 12 }}>
        <Space wrap>
          {renderStatusTag(currentState)}
          {typeof currentState?.buildId === 'number' ? <Tag>版本号：{currentState.buildId}</Tag> : null}
          {typeof currentState?.itemsTotal === 'number' ? <Tag>缓存条目：{currentState.itemsTotal}</Tag> : null}
          {typeof currentState?.itemsUpserted === 'number' ? <Tag>写入条目：{currentState.itemsUpserted}</Tag> : null}
          {typeof currentState?.itemsDeleted === 'number' ? <Tag>删除条目：{currentState.itemsDeleted}</Tag> : null}
          {currentState?.status === 'error' && currentState.errorMessage ? (
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
        search={{
          labelWidth: 'auto',
          searchText: '搜索缓存实体',
          resetText: '清空筛选',
        }}
        locale={{
          emptyText: hasSearch
            ? '没有匹配当前搜索条件的缓存实体。'
            : '当前所选类型和语言还没有可用的缓存实体。',
        }}
        request={async (params) => {
          const query = params as TableRequestParams;
          setHasSearch(Boolean(query.q));

          try {
            const res = await request<EntityListResponse>('/admin/v1/data/gw2-api/entities', {
              params: {
                type,
                lang,
                page: query.current || 1,
                limit: query.pageSize || 20,
                q: query.q || '',
              },
            });
            setTableErrorMessage(null);
            return { data: res.items, total: res.total, success: true };
          } catch (error: unknown) {
            setTableErrorMessage(getErrorMessage(error, '加载 GW2 API 实体失败'));
            throw error;
          }
        }}
      />

      <Modal
        title="实体载荷"
        open={payloadOpen}
        onCancel={() => setPayloadOpen(false)}
        onOk={() => setPayloadOpen(false)}
        width={900}
      >
        <pre style={{ maxHeight: 520, overflow: 'auto', background: '#f6f6f6', padding: 12 }}>
          {JSON.stringify(payload, null, 2)}
        </pre>
      </Modal>

      <ModalForm<SyncFormValues>
        title="高级同步计划"
        open={syncOpen}
        onOpenChange={setSyncOpen}
        modalProps={{ destroyOnClose: true }}
        initialValues={{ lang, prune: true, types: types.length ? [type] : [] }}
        onFinish={async (values) => {
          try {
            message.loading({ content: '同步进行中...', key: 'sync2' });
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
            await runSafeFollowUp(() => refreshStates(values.lang));
            actionRef.current?.reload();
            return true;
          } catch (error: unknown) {
            message.error({ content: getErrorMessage(error, '同步失败'), key: 'sync2' });
            return false;
          }
        }}
      >
        <ProFormSelect
          name="lang"
          label="语言"
          options={[
            { label: '中文 (zh)', value: 'zh' },
            { label: '英文 (en)', value: 'en' },
          ]}
          rules={[{ required: true }]}
        />
        <ProFormSelect
          name="types"
          label="实体类型"
          mode="multiple"
          options={typeOptions}
          rules={[{ required: true, message: '至少选择一个类型' }]}
        />
        <ProFormSwitch
          name="prune"
          label="删除缺失缓存记录"
          tooltip="删除当前上游同步结果中已不存在的缓存记录，仅对所选实体类型生效。"
        />
      </ModalForm>
    </PageContainer>
  );
}
