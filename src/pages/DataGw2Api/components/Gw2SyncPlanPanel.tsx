import { ReloadOutlined, SyncOutlined } from '@ant-design/icons';
import { Button, Card, Col, Row, Space, Tag, message } from 'antd';
import { runSafeFollowUp } from '../../../services/followUp';
import { getErrorMessage } from '../../../services/request';
import { backfillGw2ApiNameEn, syncGw2ApiTypes } from '../../../services/gw2Data';
import { GW2_API_TYPE_GROUPS, getTypeMeta } from '../constants';
import type { Language, SyncState } from '../types';
import { formatDateTime, summarizeStates } from '../utils';

type Props = {
  lang: Language;
  availableTypes: string[];
  stateMap: Map<string, SyncState>;
  onSelectType: (type: string) => void;
  onSynced: () => Promise<unknown>;
};

export function Gw2SyncPlanPanel({ lang, availableTypes, stateMap, onSelectType, onSynced }: Props) {
  async function syncGroup(title: string, types: string[], strategy: 'full' | 'incremental') {
    try {
      message.loading({ content: `${title} 同步中...`, key: 'gw2-sync-group' });
      const res = await syncGw2ApiTypes({ types, lang, prune: strategy === 'full', strategy });
      const added = res.results?.reduce((sum, item) => sum + (item.itemsUpserted ?? 0), 0) ?? 0;
      const skipped = res.results?.reduce((sum, item) => sum + (item.itemsSkipped ?? 0), 0) ?? 0;
      const deleted = res.results?.reduce((sum, item) => sum + (item.itemsDeleted ?? 0), 0) ?? 0;
      const content = strategy === 'incremental'
        ? `${title} 增量同步完成：新增 ${added}，已存在 ${skipped}`
        : `${title} 全量更新完成：写入 ${added}，删除 ${deleted}`;
      message.success({ content: `${title} 同步完成`, key: 'gw2-sync-group' });
      message.success({ content, key: 'gw2-sync-group' });
      await runSafeFollowUp(onSynced);
    } catch (error: unknown) {
      message.error({ content: getErrorMessage(error, `${title} 同步失败`), key: 'gw2-sync-group' });
      await runSafeFollowUp(onSynced);
    }
  }

  async function backfillGroup(title: string, types: string[]) {
    try {
      message.loading({ content: `${title} 英文名补全中...`, key: 'gw2-backfill-group' });
      const res = await backfillGw2ApiNameEn({ types, lang });
      const matched = res.results?.reduce((sum, item) => sum + item.matched, 0) ?? 0;
      const updated = res.results?.reduce((sum, item) => sum + item.updated, 0) ?? 0;
      message.success({ content: `补全完成：匹配 ${matched}，更新 ${updated}`, key: 'gw2-backfill-group' });
      await runSafeFollowUp(onSynced);
    } catch (error: unknown) {
      message.error({ content: getErrorMessage(error, `${title} 补全英文名失败`), key: 'gw2-backfill-group' });
    }
  }

  return (
    <Card
      title="同步计划"
      size="small"
      variant="borderless"
      style={{ marginBottom: 16, borderRadius: 8 }}
      extra={<span style={{ color: '#64748b', fontSize: 12 }}>按官方 API 数据域组织</span>}
    >
      <Row gutter={[12, 12]}>
        {GW2_API_TYPE_GROUPS.map((group) => {
          const groupTypes = group.types.filter((type) => availableTypes.includes(type));
          const summary = summarizeStates(groupTypes, stateMap);
          const syncable = group.syncable !== false && groupTypes.length > 0;

          return (
            <Col xs={24} lg={12} xl={6} key={group.key}>
              <Card size="small" style={{ height: '100%', borderRadius: 8 }}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Space align="start" style={{ justifyContent: 'space-between', width: '100%' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{group.title}</div>
                      <div style={{ marginTop: 4, color: '#64748b', fontSize: 12 }}>{group.description}</div>
                    </div>
                    {syncable ? <Tag color="blue">可同步</Tag> : <Tag>诊断</Tag>}
                  </Space>

                  <Space wrap>
                    <Tag>类型 {summary.total}</Tag>
                    <Tag color="success">成功 {summary.success}</Tag>
                    {summary.error ? <Tag color="error">失败 {summary.error}</Tag> : null}
                    {summary.running ? <Tag color="processing">运行 {summary.running}</Tag> : null}
                  </Space>

                  <div style={{ color: '#64748b', fontSize: 12 }}>
                    最近更新：{formatDateTime(summary.latestUpdatedAt)}
                  </div>

                  <Space wrap>
                    {group.types.map((type) => {
                      const meta = getTypeMeta(type);
                      const available = availableTypes.includes(type);
                      return (
                        <Button
                          key={type}
                          size="small"
                          disabled={!available}
                          onClick={() => onSelectType(type)}
                        >
                          {meta.title}
                        </Button>
                      );
                    })}
                  </Space>

                  <Space.Compact block>
                    <Button
                      style={{ width: '33.33%' }}
                      disabled={!syncable}
                      onClick={() => void backfillGroup(group.title, groupTypes)}
                    >
                      补全英文名
                    </Button>
                    <Button
                      style={{ width: '33.33%' }}
                      icon={syncable ? <SyncOutlined /> : <ReloadOutlined />}
                      disabled={!syncable}
                      onClick={() => void syncGroup(group.title, groupTypes, 'full')}
                    >
                      全量更新
                    </Button>
                    <Button
                      style={{ width: '33.33%' }}
                      type="primary"
                      icon={syncable ? <SyncOutlined /> : <ReloadOutlined />}
                      disabled={!syncable}
                      onClick={() => void syncGroup(group.title, groupTypes, 'incremental')}
                    >
                      同步本组
                    </Button>
                  </Space.Compact>
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Card>
  );
}
