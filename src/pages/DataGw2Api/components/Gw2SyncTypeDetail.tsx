import { SyncOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Descriptions, Space, Tag, message } from 'antd';
import { runSafeFollowUp } from '../../../services/followUp';
import { getErrorMessage } from '../../../services/request';
import { backfillGw2ApiNameEn, syncGw2ApiTypes } from '../../../services/gw2Data';
import { getTypeMeta } from '../constants';
import type { Language, SyncState } from '../types';
import { formatDateTime, renderStatusTag } from '../utils';

type Props = {
  type: string;
  lang: Language;
  state?: SyncState;
  onSynced: () => Promise<unknown>;
};

export function Gw2SyncTypeDetail({ type, lang, state, onSynced }: Props) {
  const meta = getTypeMeta(type);

  async function syncCurrentType() {
    try {
      message.loading({ content: `${meta.title} 同步中...`, key: 'gw2-sync-current' });
      const res = await syncGw2ApiTypes({ types: [type], lang, prune: true });
      message.success({ content: `同步完成：${res.results?.[0]?.type || type}`, key: 'gw2-sync-current' });
      await runSafeFollowUp(onSynced);
    } catch (error: unknown) {
      message.error({ content: getErrorMessage(error, '同步失败'), key: 'gw2-sync-current' });
      await runSafeFollowUp(onSynced);
    }
  }

  async function backfillCurrentType() {
    try {
      message.loading({ content: `${meta.title} 英文名补全中...`, key: 'gw2-backfill-current' });
      const res = await backfillGw2ApiNameEn({ types: [type], lang });
      const first = res.results?.[0];
      message.success({
        content: `补全完成：匹配 ${first?.matched ?? 0}，更新 ${first?.updated ?? 0}`,
        key: 'gw2-backfill-current',
      });
      await runSafeFollowUp(onSynced);
    } catch (error: unknown) {
      message.error({ content: getErrorMessage(error, '补全英文名称失败'), key: 'gw2-backfill-current' });
    }
  }

  return (
    <Card
      title="类型明细"
      size="small"
      variant="borderless"
      style={{ marginBottom: 16, borderRadius: 8 }}
      extra={(
        <Space>
          <Button onClick={() => void backfillCurrentType()}>
            补全英文名
          </Button>
          <Button type="primary" icon={<SyncOutlined />} onClick={() => void syncCurrentType()}>
            同步当前类型
          </Button>
        </Space>
      )}
    >
      <Descriptions size="small" column={{ xs: 1, md: 2, xl: 4 }}>
        <Descriptions.Item label="类型">{meta.title}</Descriptions.Item>
        <Descriptions.Item label="内部标识">
          <Tag>{type}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="官方端点">{meta.endpoint}</Descriptions.Item>
        <Descriptions.Item label="语言">{lang}</Descriptions.Item>
        <Descriptions.Item label="状态">{renderStatusTag(state)}</Descriptions.Item>
        <Descriptions.Item label="Build">{state?.buildId || '-'}</Descriptions.Item>
        <Descriptions.Item label="缓存条目">{state?.itemsTotal ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="写入 / 删除">{`${state?.itemsUpserted ?? '-'} / ${state?.itemsDeleted ?? '-'}`}</Descriptions.Item>
        <Descriptions.Item label="开始时间">{formatDateTime(state?.startedAt)}</Descriptions.Item>
        <Descriptions.Item label="完成时间">{formatDateTime(state?.finishedAt)}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{formatDateTime(state?.updatedAt)}</Descriptions.Item>
        <Descriptions.Item label="说明">{meta.description}</Descriptions.Item>
      </Descriptions>

      {state?.status === 'error' && state.errorMessage ? (
        <Alert
          showIcon
          type="error"
          style={{ marginTop: 12 }}
          message="最近一次同步失败"
          description={<pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{state.errorMessage}</pre>}
        />
      ) : null}

      <Space style={{ marginTop: 12 }} wrap>
        {meta.stable === false ? <Tag color="warning">官方当前不可用</Tag> : null}
        <Tag>原始 payload 保存在 data 字段</Tag>
        <Tag>英文名保存在 nameEn 字段</Tag>
      </Space>
    </Card>
  );
}
