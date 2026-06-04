import { request } from './request';
import type {
  EntityListResponse,
  Language,
  SyncResponse,
  SyncState,
  SyncStatesResponse,
} from '../pages/DataGw2Api/types';

export async function fetchGw2ApiTypes() {
  const res = await request<{ items: string[] }>('/admin/v1/data/gw2-api/types');
  return res.items || [];
}

export async function fetchGw2ApiSyncStates(lang: Language) {
  const res = await request<SyncStatesResponse>('/admin/v1/data/gw2-api/sync-states', {
    params: { lang },
  });
  return res.items || [];
}

export async function fetchGw2ApiEntities(params: {
  type: string;
  lang: Language;
  page: number;
  limit: number;
  q?: string;
}) {
  return request<EntityListResponse>('/admin/v1/data/gw2-api/entities', {
    params,
  });
}

export async function fetchGw2ApiEntityPayload(params: {
  type: string;
  gw2Id: string;
  lang: Language;
}) {
  return request<unknown>(
    `/admin/v1/data/gw2-api/entities/${encodeURIComponent(params.type)}/${encodeURIComponent(params.gw2Id)}`,
    { params: { lang: params.lang } },
  );
}

export async function syncGw2ApiTypes(params: {
  types: string[];
  lang: Language;
  prune: boolean;
  strategy?: 'full' | 'incremental';
}) {
  return request<SyncResponse>('/admin/v1/data/gw2-api/sync', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function syncGw2ApiEntity(params: {
  type: string;
  gw2Id: string;
  lang: Language;
}) {
  return request<{
    success: boolean;
    result?: { type: string; lang: Language; gw2Id: string; updated: boolean };
  }>(
    `/admin/v1/data/gw2-api/entities/${encodeURIComponent(params.type)}/${encodeURIComponent(params.gw2Id)}/sync`,
    {
      method: 'POST',
      body: JSON.stringify({ lang: params.lang }),
    },
  );
}

export async function backfillGw2ApiNameEn(params: {
  types: string[];
  lang: Language;
}) {
  return request<{
    success: boolean;
    results?: Array<{ type: string; matched: number; updated: number }>;
  }>('/admin/v1/data/gw2-api/backfill-name-en', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function buildSyncStateMap(items: SyncState[]) {
  const map = new Map<string, SyncState>();
  for (const item of items) map.set(item.type, item);
  return map;
}
