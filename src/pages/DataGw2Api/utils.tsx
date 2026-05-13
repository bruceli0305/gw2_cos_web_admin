import { Tag } from 'antd';
import type { SyncState } from './types';

export function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('zh-CN', { hour12: false });
}

export function renderStatusTag(state?: SyncState) {
  if (!state) return <Tag>未同步</Tag>;
  if (state.status === 'running') return <Tag color="processing">运行中</Tag>;
  if (state.status === 'success') return <Tag color="success">成功</Tag>;
  if (state.status === 'error') return <Tag color="error">失败</Tag>;
  return <Tag>空闲</Tag>;
}

export function summarizeStates(types: string[], stateMap: Map<string, SyncState>) {
  const summary = {
    total: types.length,
    success: 0,
    error: 0,
    running: 0,
    idle: 0,
    itemsTotal: 0,
    latestUpdatedAt: '',
  };

  for (const type of types) {
    const state = stateMap.get(type);
    if (!state) {
      summary.idle += 1;
      continue;
    }
    if (state.status === 'success') summary.success += 1;
    else if (state.status === 'error') summary.error += 1;
    else if (state.status === 'running') summary.running += 1;
    else summary.idle += 1;

    if (typeof state.itemsTotal === 'number') summary.itemsTotal += state.itemsTotal;
    if (state.updatedAt && (!summary.latestUpdatedAt || state.updatedAt > summary.latestUpdatedAt)) {
      summary.latestUpdatedAt = state.updatedAt;
    }
  }

  return summary;
}
