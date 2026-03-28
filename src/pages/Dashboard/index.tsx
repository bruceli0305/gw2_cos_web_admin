import { PageContainer, StatisticCard } from '@ant-design/pro-components';
import {
  CloudServerOutlined,
  DatabaseOutlined,
  FieldTimeOutlined,
  ReloadOutlined,
  TeamOutlined,
  TranslationOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Alert, Button, Space, Tag } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage, request } from '../../services/request';

const { Statistic, Divider } = StatisticCard;

type MemoryStats = {
  rss?: number;
  heapUsed?: number;
  heapTotal?: number;
};

type StatsData = {
  admins: { total: number };
  users: { total: number; today: number };
  translations: { count: number; usage: number };
  content: { raid: number; directory: number; legendary: number };
  system: { uptime: number; memory?: MemoryStats };
};

function formatUptime(seconds?: number) {
  if (!seconds) return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatBytes(bytes?: number) {
  if (!bytes) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function displayStat(ready: boolean, value?: number) {
  return ready ? value ?? 0 : '-';
}

function formatTimestamp(value: Date | null) {
  if (!value) return 'Not loaded yet';
  return value.toLocaleString();
}

export default function DashboardPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await request<StatsData>('/admin/v1/dashboard/stats');
      setData(res);
      setLastUpdatedAt(new Date());
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Failed to load dashboard statistics'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const hasData = !!data;
  const statusTag = errorMessage
    ? <Tag color="error">Stats unavailable</Tag>
    : <Tag color={loading ? 'processing' : 'success'}>{loading ? 'Refreshing' : 'Live stats'}</Tag>;

  return (
    <PageContainer
      title="Dashboard"
      subTitle="Overview of admin traffic, content inventory, and service health"
      extra={[
        <Button key="refresh" icon={<ReloadOutlined />} loading={loading} onClick={() => void loadStats()}>
          Refresh
        </Button>,
      ]}
      content={(
        <Space size={16} wrap>
          <span style={{ color: '#666' }}>Today: {new Date().toLocaleDateString()}</span>
          <span style={{ color: '#666' }}>Last updated: {formatTimestamp(lastUpdatedAt)}</span>
          {statusTag}
        </Space>
      )}
    >
      {errorMessage ? (
        <Alert
          showIcon
          type="error"
          style={{ marginBottom: 24 }}
          message="Dashboard stats are temporarily unavailable"
          description={errorMessage}
          action={(
            <Button size="small" onClick={() => void loadStats()}>
              Retry
            </Button>
          )}
        />
      ) : null}

      <StatisticCard.Group direction="row" loading={loading && !hasData} style={{ marginBottom: 24 }}>
        <StatisticCard
          statistic={{
            title: 'Frontend Users',
            value: displayStat(hasData, data?.users.total),
            icon: <UserOutlined style={{ color: '#1677ff', fontSize: 24 }} />,
            description: (
              <Statistic
                title="New Today"
                value={displayStat(hasData, data?.users.today)}
                trend={hasData && (data?.users.today ?? 0) > 0 ? 'up' : undefined}
              />
            ),
          }}
        />
        <Divider />
        <StatisticCard
          statistic={{
            title: 'Admin Accounts',
            value: displayStat(hasData, data?.admins.total),
            icon: <TeamOutlined style={{ color: '#722ed1', fontSize: 24 }} />,
          }}
        />
        <Divider />
        <StatisticCard
          statistic={{
            title: 'Translation Usage',
            value: displayStat(hasData, data?.translations.usage),
            icon: <TranslationOutlined style={{ color: '#52c41a', fontSize: 24 }} />,
            description: (
              <Statistic
                title="Cached Entries"
                value={displayStat(hasData, data?.translations.count)}
              />
            ),
          }}
        />
        <Divider />
        <StatisticCard
          statistic={{
            title: 'Raid Recruitment',
            value: displayStat(hasData, data?.content.raid),
            icon: <DatabaseOutlined style={{ color: '#fa8c16', fontSize: 24 }} />,
          }}
        />
      </StatisticCard.Group>

      <StatisticCard.Group direction="row" loading={loading && !hasData}>
        <StatisticCard
          title="Content Inventory"
          colSpan={12}
          statistic={{
            title: 'Resource Directory',
            value: displayStat(hasData, data?.content.directory),
            icon: <DatabaseOutlined />,
          }}
          chart={(
            <div style={{ display: 'flex', gap: 32, marginTop: 16, flexWrap: 'wrap' }}>
              <Statistic title="Legendary Blueprints" value={displayStat(hasData, data?.content.legendary)} />
              <Statistic title="Raid Listings" value={displayStat(hasData, data?.content.raid)} />
            </div>
          )}
        />
        <Divider />
        <StatisticCard
          title="System Status"
          colSpan={12}
          statistic={{
            title: 'Uptime',
            value: hasData ? formatUptime(data?.system.uptime) : '-',
            icon: <FieldTimeOutlined />,
          }}
          chart={(
            <div style={{ display: 'flex', gap: 24, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <CloudServerOutlined style={{ fontSize: 20, color: '#1677ff' }} />
                <span>{errorMessage ? 'Waiting for a successful stats refresh' : 'Service responding normally'}</span>
              </div>
              <Statistic title="Heap Used" value={hasData ? formatBytes(data?.system.memory?.heapUsed) : '-'} />
              <Statistic title="RSS" value={hasData ? formatBytes(data?.system.memory?.rss) : '-'} />
            </div>
          )}
        />
      </StatisticCard.Group>
    </PageContainer>
  );
}
