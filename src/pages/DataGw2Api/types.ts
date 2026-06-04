import type { ActionType } from '@ant-design/pro-components';
import type { RefObject } from 'react';

export type Language = 'zh' | 'en';

export type EntityItem = {
  _id: string;
  type: string;
  lang: string;
  gw2Id: string;
  name: string;
  nameEn?: string;
  updatedAt: string;
};

export type SyncState = {
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

export type Gw2ApiTypeMeta = {
  type: string;
  title: string;
  endpoint: string;
  description: string;
  stable?: boolean;
};

export type Gw2ApiTypeGroup = {
  key: string;
  title: string;
  description: string;
  types: string[];
  syncable?: boolean;
};

export type TableRequestParams = {
  current?: number;
  pageSize?: number;
  q?: string;
};

export type EntityListResponse = {
  items: EntityItem[];
  total: number;
};

export type SyncStatesResponse = {
  items: SyncState[];
};

export type SyncResponse = {
  results?: Array<{
    type?: string;
    strategy?: 'full' | 'incremental';
    itemsTotal?: number;
    itemsUpserted?: number;
    itemsDeleted?: number;
    itemsSkipped?: number;
  }>;
};

export type SyncFormValues = {
  lang: Language;
  prune?: boolean;
  types?: string[];
};

export type SharedGw2ApiPageProps = {
  lang: Language;
  type: string;
  types: string[];
  stateMap: Map<string, SyncState>;
  actionRef: RefObject<ActionType | null>;
  refreshStates: (lang: Language) => Promise<SyncState[]>;
};
