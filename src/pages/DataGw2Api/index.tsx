import {
  PageContainer,
  type ActionType,
} from '@ant-design/pro-components';
import { Alert, Button } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageNoticeAlert } from '../../components/listPageState';
import { fetchGw2ApiSyncStates, fetchGw2ApiTypes, buildSyncStateMap } from '../../services/gw2Data';
import { getErrorMessage } from '../../services/request';
import { Gw2ApiOverview } from './components/Gw2ApiOverview';
import { Gw2EntityBrowser } from './components/Gw2EntityBrowser';
import { Gw2PayloadDrawer } from './components/Gw2PayloadDrawer';
import { Gw2SyncPlanPanel } from './components/Gw2SyncPlanPanel';
import { Gw2SyncTypeDetail } from './components/Gw2SyncTypeDetail';
import type { Language, SyncState } from './types';

export default function DataGw2ApiPage() {
  const actionRef = useRef<ActionType>(null);

  const [types, setTypes] = useState<string[]>([]);
  const [type, setType] = useState<string>('professions');
  const [lang] = useState<Language>('zh');
  const [typesErrorMessage, setTypesErrorMessage] = useState<string | null>(null);
  const [syncStatesErrorMessage, setSyncStatesErrorMessage] = useState<string | null>(null);
  const [tableErrorMessage, setTableErrorMessage] = useState<string | null>(null);
  const [hasSearch, setHasSearch] = useState(false);

  const [syncStates, setSyncStates] = useState<SyncState[]>([]);

  const [payloadOpen, setPayloadOpen] = useState(false);
  const [payload, setPayload] = useState<unknown>(null);

  const loadTypes = useCallback(async () => {
    const nextTypes = await fetchGw2ApiTypes();
    setTypes(nextTypes);
    setType((currentType) => (nextTypes.length && !nextTypes.includes(currentType) ? nextTypes[0] : currentType));
    setTypesErrorMessage(null);
    return nextTypes;
  }, []);

  const refreshStates = useCallback(async (nextLang: Language) => {
    const nextStates = await fetchGw2ApiSyncStates(nextLang);
    setSyncStates(nextStates);
    setSyncStatesErrorMessage(null);
    return nextStates;
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitialTypes() {
      try {
        const nextTypes = await fetchGw2ApiTypes();
        if (!active) return;
        setTypes(nextTypes);
        setType((currentType) => (nextTypes.length && !nextTypes.includes(currentType) ? nextTypes[0] : currentType));
        setTypesErrorMessage(null);
      } catch (error: unknown) {
        if (active) setTypesErrorMessage(getErrorMessage(error, '加载 GW2官方数据库类型失败'));
      }
    }

    void loadInitialTypes();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadStates() {
      try {
        const nextStates = await fetchGw2ApiSyncStates(lang);
        if (!active) return;
        setSyncStates(nextStates);
        setSyncStatesErrorMessage(null);
      } catch (error: unknown) {
        if (active) setSyncStatesErrorMessage(getErrorMessage(error, '加载同步状态失败'));
      }
    }

    void loadStates();
    return () => {
      active = false;
    };
  }, [lang]);

  const stateMap = useMemo(() => buildSyncStateMap(syncStates), [syncStates]);
  const currentState = stateMap.get(type);

  function openPayload(nextPayload: unknown) {
    setPayload(nextPayload);
    setPayloadOpen(true);
  }

  return (
    <PageContainer
      title="GW2官方数据库"
      subTitle="按官方 API 数据域查看、同步和诊断本站缓存。"
    >
      <Gw2ApiOverview types={types} stateMap={stateMap} />

      <PageNoticeAlert
        type="info"
        message="数据采集原则"
        description="本模块只按 Guild Wars 2 官方 API 数据域组织同步和查看；站内业务应用不决定采集范围、分组和同步策略。"
        marginBottom={16}
      />

      {typesErrorMessage ? (
        <Alert
          showIcon
          type="error"
          style={{ marginBottom: 16 }}
          message="无法加载 GW2官方数据库类型"
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
          message="无法加载 GW2官方数据库实体"
          description={tableErrorMessage}
          action={(
            <Button size="small" onClick={() => actionRef.current?.reload()}>
              重试
            </Button>
          )}
        />
      ) : null}

      <Gw2SyncPlanPanel
        lang={lang}
        availableTypes={types}
        stateMap={stateMap}
        onSelectType={(nextType) => {
          setType(nextType);
          actionRef.current?.reload();
        }}
        onSynced={async () => {
          await refreshStates(lang);
          actionRef.current?.reload();
        }}
      />

      <Gw2SyncTypeDetail
        type={type}
        lang={lang}
        state={currentState}
        onSynced={async () => {
          await refreshStates(lang);
          actionRef.current?.reload();
        }}
      />

      <Gw2EntityBrowser
        actionRef={actionRef}
        type={type}
        lang={lang}
        hasSearch={hasSearch}
        setHasSearch={setHasSearch}
        setTableErrorMessage={setTableErrorMessage}
        onOpenPayload={openPayload}
      />

      <Gw2PayloadDrawer open={payloadOpen} payload={payload} onClose={() => setPayloadOpen(false)} />
    </PageContainer>
  );
}
