import { Card, Col, Row, Statistic } from 'antd';
import { GW2_API_TYPE_GROUPS } from '../constants';
import type { SyncState } from '../types';
import { formatDateTime, summarizeStates } from '../utils';

type Props = {
  types: string[];
  stateMap: Map<string, SyncState>;
};

export function Gw2ApiOverview({ types, stateMap }: Props) {
  const knownTypes = types.length ? types : GW2_API_TYPE_GROUPS.flatMap((group) => group.types);
  const summary = summarizeStates(knownTypes, stateMap);
  const latestBuildId = Array.from(stateMap.values()).find((state) => typeof state.buildId === 'number')?.buildId;

  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
      <Col xs={24} sm={12} xl={6}>
        <Card size="small" variant="borderless" style={{ height: '100%', borderRadius: 8 }}>
          <Statistic title="同步类型" value={summary.total} />
        </Card>
      </Col>
      <Col xs={24} sm={12} xl={6}>
        <Card size="small" variant="borderless" style={{ height: '100%', borderRadius: 8 }}>
          <Statistic title="成功 / 失败 / 运行中" value={`${summary.success} / ${summary.error} / ${summary.running}`} />
        </Card>
      </Col>
      <Col xs={24} sm={12} xl={6}>
        <Card size="small" variant="borderless" style={{ height: '100%', borderRadius: 8 }}>
          <Statistic title="缓存条目" value={summary.itemsTotal || '-'} />
        </Card>
      </Col>
      <Col xs={24} sm={12} xl={6}>
        <Card size="small" variant="borderless" style={{ height: '100%', borderRadius: 8 }}>
          <Statistic title="Build / 最近更新" value={latestBuildId || '-'} />
          <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>{formatDateTime(summary.latestUpdatedAt)}</div>
        </Card>
      </Col>
    </Row>
  );
}
