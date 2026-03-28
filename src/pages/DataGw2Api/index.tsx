import {
  PageContainer,
  ProTable,
  type ProColumns,
  type ActionType,
  ModalForm,
  ProFormSelect,
  ProFormSwitch,
} from '@ant-design/pro-components';
import { Alert, Button, Modal, Select, Space, Tag, message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
          setTypesErrorMessage(getErrorMessage(error, 'Failed to load GW2 API entity types'));
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
          setSyncStatesErrorMessage(getErrorMessage(error, 'Failed to load sync status'));
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

  const columns: ProColumns<EntityItem>[] = [
    { title: 'Keyword', dataIndex: 'q', hideInTable: true },
    { title: 'GW2 ID', dataIndex: 'gw2Id', width: 160, copyable: true },
    { title: 'Name', dataIndex: 'name', ellipsis: true },
    { title: 'Updated At', dataIndex: 'updatedAt', valueType: 'dateTime', width: 170, search: false },
    {
      title: 'Actions',
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
          View JSON
        </Button>
      ),
    },
  ];

  function renderStatusTag(state?: SyncState) {
    if (!state) return null;
    if (state.status === 'running') return <Tag color="processing">Running</Tag>;
    if (state.status === 'success') return <Tag color="success">Success</Tag>;
    if (state.status === 'error') return <Tag color="error">Error</Tag>;
    return <Tag>Idle</Tag>;
  }

  return (
    <PageContainer
      title="GW2 API Data"
      subTitle="Sync official GW2 data into the admin database for downstream tooling."
      extra={[
        <Space key="controls">
          <span>Language:</span>
          <Select<Language>
            value={lang}
            style={{ width: 120 }}
            options={[
              { label: 'Chinese (zh)', value: 'zh' },
              { label: 'English (en)', value: 'en' },
            ]}
            onChange={(value) => {
              setLang(value);
              actionRef.current?.reload();
            }}
          />

          <span>Type:</span>
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
                message.loading({ content: 'Sync in progress...', key: 'sync' });
                const res = await request<SyncResponse>('/admin/v1/data/gw2-api/sync', {
                  method: 'POST',
                  body: JSON.stringify({ types: [type], lang, prune: true }),
                });
                message.success({ content: `Sync completed: ${res.results?.[0]?.type || type}`, key: 'sync' });
                await runSafeFollowUp(() => refreshStates(lang));
                actionRef.current?.reload();
              } catch (error: unknown) {
                message.error({ content: getErrorMessage(error, 'Sync failed'), key: 'sync' });
                await runSafeFollowUp(() => refreshStates(lang));
              }
            }}
          >
            Sync Current Type
          </Button>

          <Button onClick={() => setSyncOpen(true)}>Advanced Sync</Button>
        </Space>,
      ]}
    >
      {typesErrorMessage ? (
        <Alert
          showIcon
          type="error"
          style={{ marginBottom: 16 }}
          message="Unable to load GW2 API entity types"
          description={typesErrorMessage}
          action={(
            <Button size="small" onClick={() => void loadTypes().catch(() => undefined)}>
              Retry
            </Button>
          )}
        />
      ) : null}

      {syncStatesErrorMessage ? (
        <Alert
          showIcon
          type="error"
          style={{ marginBottom: 16 }}
          message="Unable to load sync status"
          description={syncStatesErrorMessage}
          action={(
            <Button size="small" onClick={() => void refreshStates(lang).catch(() => undefined)}>
              Retry
            </Button>
          )}
        />
      ) : null}

      {tableErrorMessage ? (
        <Alert
          showIcon
          type="error"
          style={{ marginBottom: 16 }}
          message="Unable to load GW2 API entities"
          description={tableErrorMessage}
          action={(
            <Button size="small" onClick={() => actionRef.current?.reload()}>
              Retry
            </Button>
          )}
        />
      ) : null}

      <div style={{ marginBottom: 12 }}>
        <Space wrap>
          {renderStatusTag(currentState)}
          {typeof currentState?.buildId === 'number' ? <Tag>build: {currentState.buildId}</Tag> : null}
          {typeof currentState?.itemsTotal === 'number' ? <Tag>total: {currentState.itemsTotal}</Tag> : null}
          {typeof currentState?.itemsUpserted === 'number' ? <Tag>changed: {currentState.itemsUpserted}</Tag> : null}
          {typeof currentState?.itemsDeleted === 'number' ? <Tag>deleted: {currentState.itemsDeleted}</Tag> : null}
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
          searchText: 'Search entities',
          resetText: 'Clear filters',
        }}
        locale={{
          emptyText: hasSearch
            ? 'No cached entities match the current search.'
            : 'No cached GW2 API entities found for the selected type and language.',
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
            setTableErrorMessage(getErrorMessage(error, 'Failed to load GW2 API entities'));
            throw error;
          }
        }}
      />

      <Modal
        title="Raw JSON"
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
        title="Advanced Sync"
        open={syncOpen}
        onOpenChange={setSyncOpen}
        modalProps={{ destroyOnClose: true }}
        initialValues={{ lang, prune: true, types: types.length ? [type] : [] }}
        onFinish={async (values) => {
          try {
            message.loading({ content: 'Sync in progress...', key: 'sync2' });
            await request('/admin/v1/data/gw2-api/sync', {
              method: 'POST',
              body: JSON.stringify({
                lang: values.lang,
                prune: values.prune !== false,
                types: values.types || [],
              }),
            });
            message.success({ content: 'Sync completed', key: 'sync2' });
            setLang(values.lang);
            await runSafeFollowUp(() => refreshStates(values.lang));
            actionRef.current?.reload();
            return true;
          } catch (error: unknown) {
            message.error({ content: getErrorMessage(error, 'Sync failed'), key: 'sync2' });
            return false;
          }
        }}
      >
        <ProFormSelect
          name="lang"
          label="Language"
          options={[
            { label: 'Chinese (zh)', value: 'zh' },
            { label: 'English (en)', value: 'en' },
          ]}
          rules={[{ required: true }]}
        />
        <ProFormSelect
          name="types"
          label="Types"
          mode="multiple"
          options={typeOptions}
          rules={[{ required: true, message: 'Select at least one type' }]}
        />
        <ProFormSwitch
          name="prune"
          label="Prune Missing Items"
          tooltip="Delete records that are missing from the current upstream sync result."
        />
      </ModalForm>
    </PageContainer>
  );
}
