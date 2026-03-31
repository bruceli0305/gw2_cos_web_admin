import { PageContainer } from '@ant-design/pro-components';
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  FieldTimeOutlined,
  LineChartOutlined,
  ReloadOutlined,
  TeamOutlined,
  TranslationOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Col, Descriptions, Progress, Row, Space, Statistic, Tag, Timeline } from 'antd';
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage, request } from '../../services/request';

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

type OverviewCardItem = {
  key: string;
  title: string;
  value: number | string;
  icon: ReactNode;
  metaLabel: string;
  metaValue: string | number;
  helper: string;
  progressPercent?: number;
  progressColor?: string;
};

const zhDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const zhDateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function formatUptime(seconds?: number) {
  if (seconds == null) return '-';

  const safeSeconds = Math.max(0, Math.floor(seconds));
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (days > 0) return `${days} 天 ${hours} 小时`;
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟`;
  return `${minutes} 分钟`;
}

function formatBytes(bytes?: number) {
  if (bytes == null) return '-';

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = Math.max(0, bytes);
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatTimestamp(value: Date | null) {
  if (!value) return '尚未刷新';
  return zhDateTimeFormatter.format(value);
}

function formatCalendarDate(value: Date) {
  return zhDateFormatter.format(value);
}

function statValue(ready: boolean, value?: number) {
  return ready ? value ?? 0 : '-';
}

const dashboardCardStyle = {
  borderRadius: 24,
  height: '100%',
  width: '100%',
  flex: 1,
} satisfies CSSProperties;

const dashboardCardBodyStyle = {
  height: '100%',
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
} satisfies CSSProperties;

const summaryFooterStyle = {
  marginTop: 'auto',
  minHeight: 92,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  gap: 12,
} satisfies CSSProperties;

export default function DashboardPage() {
  const navigate = useNavigate();
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
      setErrorMessage(getErrorMessage(error, '首页看板数据加载失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const hasData = !!data;
  const contentTotal = (data?.content.directory ?? 0) + (data?.content.legendary ?? 0) + (data?.content.raid ?? 0);
  const userGrowthPercent =
    hasData && (data?.users.total ?? 0) > 0
      ? Math.min(100, Math.round(((data?.users.today ?? 0) / (data?.users.total ?? 1)) * 100))
      : 0;
  const heapPercent =
    hasData && (data?.system.memory?.heapUsed ?? 0) > 0 && (data?.system.memory?.heapTotal ?? 0) > 0
      ? Math.min(100, Math.round(((data?.system.memory?.heapUsed ?? 0) / (data?.system.memory?.heapTotal ?? 1)) * 100))
      : 0;

  const heroStatusTag = errorMessage ? (
    <Tag color="error">数据不可用</Tag>
  ) : (
    <Tag color={loading ? 'processing' : 'success'}>{loading ? '刷新中' : '实时状态'}</Tag>
  );

  const overviewCards = useMemo<OverviewCardItem[]>(() => {
    return [
      {
        key: 'users',
        title: '前台玩家账号',
        value: statValue(hasData, data?.users.total),
        icon: <UserOutlined style={{ color: '#1677ff' }} />,
        metaLabel: '今日新增',
        metaValue: statValue(hasData, data?.users.today),
        helper: '当前前台玩家账号总数，以及今天新增的注册量。',
        progressPercent: userGrowthPercent,
        progressColor: '#1677ff',
      },
      {
        key: 'admins',
        title: '管理员账号',
        value: statValue(hasData, data?.admins.total),
        icon: <TeamOutlined style={{ color: '#722ed1' }} />,
        metaLabel: '权限体系',
        metaValue: 'RBAC',
        helper: '当前可登录后台的管理员账号数量。',
      },
      {
        key: 'translations',
        title: '翻译调用次数',
        value: statValue(hasData, data?.translations.usage),
        icon: <TranslationOutlined style={{ color: '#13c2c2' }} />,
        metaLabel: '缓存条目',
        metaValue: hasData ? `${data?.translations.count ?? 0} 条` : '-',
        helper: '累计翻译调用量与翻译缓存规模。',
      },
      {
        key: 'content',
        title: '内容库存',
        value: statValue(hasData, contentTotal),
        icon: <DatabaseOutlined style={{ color: '#fa8c16' }} />,
        metaLabel: '团本招募',
        metaValue: hasData ? `${data?.content.raid ?? 0} 条` : '-',
        helper: '当前统计返回的资源页、传奇蓝图与团本招募总量。',
      },
    ];
  }, [contentTotal, data, hasData, userGrowthPercent]);

  const timelineItems = useMemo(() => {
    if (errorMessage) {
      return [
        {
          color: 'red',
          dot: <WarningOutlined />,
          children: '统计接口暂时不可用，请稍后重试。',
        },
      ];
    }

    return [
      {
        color: hasData ? 'green' : 'blue',
        dot: hasData ? <CheckCircleOutlined /> : undefined,
        children: `后台账号：${hasData ? `${data?.admins.total ?? 0} 个` : '加载中'}`,
      },
      {
        color: hasData ? 'green' : 'blue',
        dot: hasData ? <CheckCircleOutlined /> : undefined,
        children: `玩家账号：${hasData ? `${data?.users.total ?? 0} 个，今日新增 ${data?.users.today ?? 0}` : '加载中'}`,
      },
      {
        color: hasData ? 'green' : 'blue',
        dot: hasData ? <CheckCircleOutlined /> : undefined,
        children: `翻译缓存：${hasData ? `${data?.translations.count ?? 0} 条，累计调用 ${data?.translations.usage ?? 0}` : '加载中'}`,
      },
      {
        color: hasData ? 'green' : 'blue',
        dot: hasData ? <CheckCircleOutlined /> : undefined,
        children: `内容库存：${hasData ? `资源目录 ${data?.content.directory ?? 0} / 传奇 ${data?.content.legendary ?? 0} / 招募 ${data?.content.raid ?? 0}` : '加载中'}`,
      },
      {
        color: hasData ? 'green' : 'blue',
        dot: hasData ? <CheckCircleOutlined /> : undefined,
        children: `系统运行：${hasData ? `已运行 ${formatUptime(data?.system.uptime)}，RSS ${formatBytes(data?.system.memory?.rss)}` : '加载中'}`,
      },
    ];
  }, [data, errorMessage, hasData]);

  return (
    <PageContainer
      title="首页看板"
      subTitle="协同学院 GW2 欧服管理后台总览"
      extra={[
        <Button key="refresh" icon={<ReloadOutlined />} loading={loading} onClick={() => void loadStats()}>
          刷新数据
        </Button>,
      ]}
      content={
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 28,
            padding: '24px 26px',
            background:
              'radial-gradient(circle at top left, rgba(126,247,242,0.16), transparent 24%), radial-gradient(circle at right center, rgba(230,107,255,0.14), transparent 28%), linear-gradient(145deg, rgba(5, 15, 28, 0.96) 0%, rgba(12, 28, 51, 0.94) 52%, rgba(14, 72, 92, 0.92) 100%)',
            color: '#f8fafc',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 60px rgba(2, 6, 23, 0.24)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -48,
              right: -20,
              width: 220,
              height: 220,
              borderRadius: 28,
              transform: 'rotate(18deg)',
              border: '1px solid rgba(255,255,255,0.08)',
              opacity: 0.45,
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  boxShadow: '0 18px 44px rgba(4, 14, 29, 0.28)',
                }}
              >
                <img src="/logo.svg" alt="协同学院" style={{ width: 46, height: 46, display: 'block' }} />
              </div>

              <div>
                <div
                  style={{
                    color: 'rgba(248,250,252,0.72)',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 1.6,
                    textTransform: 'uppercase',
                  }}
                >
                  协同学院
                </div>
                <div style={{ marginTop: 6, fontSize: 28, fontWeight: 700 }}>GW2 欧服后台总览</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
              {['运营首页', '实时统计', '后台工作区'].map((label) => (
                <span
                  key={label}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.14)',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(248,250,252,0.86)',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {label}
                </span>
              ))}
              {heroStatusTag}
            </div>

            <div style={{ marginTop: 20, maxWidth: 720, color: 'rgba(226,232,240,0.76)', fontSize: 15, lineHeight: 1.8 }}>
              这里展示协同学院后台最核心的运营状态，包括玩家增长、翻译缓存、内容库存和服务运行情况。后端统计契约不变，只把现有数据重新组织成更清晰、可读、可刷新的首页看板。
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ color: 'rgba(248,250,252,0.72)', fontSize: 12, fontWeight: 700, letterSpacing: 1.2 }}>常用入口</div>
              <Space wrap style={{ marginTop: 10 }}>
                <Button ghost icon={<UserOutlined />} onClick={() => navigate('/users')}>
                  玩家账号
                </Button>
                <Button ghost icon={<TranslationOutlined />} onClick={() => navigate('/translations')}>
                  翻译缓存
                </Button>
                <Button ghost icon={<AppstoreOutlined />} onClick={() => navigate('/data/gw2-api')}>
                  GW2 API 同步
                </Button>
                <Button ghost icon={<LineChartOutlined />} onClick={() => navigate('/data/market-watch')}>
                  交易所观察
                </Button>
              </Space>
            </div>

            <Space size={18} wrap style={{ marginTop: 18, color: 'rgba(226,232,240,0.8)' }}>
              <span>今天：{formatCalendarDate(new Date())}</span>
              <span>最近刷新：{formatTimestamp(lastUpdatedAt)}</span>
              <span>运行时长：{hasData ? formatUptime(data?.system.uptime) : '加载中'}</span>
            </Space>
          </div>
        </div>
      }
    >
      {errorMessage ? (
        <Alert
          showIcon
          type="error"
          style={{ marginBottom: 24, borderRadius: 16 }}
          message="首页看板暂时不可用"
          description={errorMessage}
          action={(
            <Button size="small" onClick={() => void loadStats()}>
              重试
            </Button>
          )}
        />
      ) : null}

      <Row gutter={[16, 16]} style={{ marginBottom: 8 }}>
        {overviewCards.map((item) => (
          <Col key={item.key} xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
            <Card bordered={false} loading={loading && !hasData} style={dashboardCardStyle} styles={{ body: dashboardCardBodyStyle }}>
              <Statistic title={item.title} value={item.value} prefix={item.icon} />

              <div style={summaryFooterStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 12 }}>
                  <span>{item.metaLabel}</span>
                  <span>{item.metaValue}</span>
                </div>

                {typeof item.progressPercent === 'number' ? (
                  <Progress percent={item.progressPercent} strokeColor={item.progressColor} showInfo={false} />
                ) : (
                  <div style={{ height: 8, borderRadius: 999, background: '#f1f5f9' }} />
                )}

                <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.7 }}>{item.helper}</div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12} style={{ display: 'flex' }}>
          <Card
            bordered={false}
            loading={loading && !hasData}
            title="内容库存分布"
            extra={<Tag color="blue">内容面</Tag>}
            style={dashboardCardStyle}
            styles={{ body: dashboardCardBodyStyle }}
          >
            <Space direction="vertical" size={18} style={{ width: '100%' }}>
              {[
                { label: '资源黄页', value: data?.content.directory ?? 0, color: '#1677ff' },
                { label: '传奇蓝图', value: data?.content.legendary ?? 0, color: '#722ed1' },
                { label: '团本招募', value: data?.content.raid ?? 0, color: '#fa8c16' },
              ].map((item) => {
                const percent = contentTotal > 0 ? Math.round((item.value / contentTotal) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: '#0f172a', fontWeight: 600 }}>{item.label}</span>
                      <span style={{ color: '#64748b' }}>{hasData ? `${item.value} 条` : '-'}</span>
                    </div>
                    <Progress percent={percent} strokeColor={item.color} showInfo={false} />
                  </div>
                );
              })}
            </Space>

            <Descriptions
              column={1}
              size="small"
              style={{ marginTop: 24 }}
              items={[
                { key: 'contentTotal', label: '内容总量', children: hasData ? `${contentTotal} 条` : '-' },
                { key: 'directory', label: '资源目录', children: hasData ? `${data?.content.directory ?? 0} 条` : '-' },
                { key: 'legendary', label: '传奇蓝图', children: hasData ? `${data?.content.legendary ?? 0} 条` : '-' },
                { key: 'raid', label: '团本招募', children: hasData ? `${data?.content.raid ?? 0} 条` : '-' },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} xl={12} style={{ display: 'flex' }}>
          <Card
            bordered={false}
            loading={loading && !hasData}
            title="系统状态"
            extra={<Tag color={errorMessage ? 'error' : loading ? 'processing' : 'success'}>{errorMessage ? '异常' : loading ? '刷新中' : '正常'}</Tag>}
            style={dashboardCardStyle}
            styles={{ body: dashboardCardBodyStyle }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card size="small" bordered={false} style={{ borderRadius: 18, background: '#f8fafc' }}>
                  <Statistic title="运行时长" value={hasData ? formatUptime(data?.system.uptime) : '-'} prefix={<FieldTimeOutlined />} />
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card size="small" bordered={false} style={{ borderRadius: 18, background: '#f8fafc' }}>
                  <Statistic title="RSS 内存" value={hasData ? formatBytes(data?.system.memory?.rss) : '-'} prefix={<CloudServerOutlined />} />
                </Card>
              </Col>
            </Row>

            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>Heap 使用率</span>
                <span style={{ color: '#64748b' }}>
                  {hasData ? `${formatBytes(data?.system.memory?.heapUsed)} / ${formatBytes(data?.system.memory?.heapTotal)}` : '-'}
                </span>
              </div>
              <Progress percent={heapPercent} strokeColor={heapPercent > 85 ? '#ff4d4f' : '#13c2c2'} />
            </div>

            <Descriptions
              column={1}
              size="small"
              style={{ marginTop: 18 }}
              items={[
                { key: 'refreshAt', label: '最近刷新', children: formatTimestamp(lastUpdatedAt) },
                { key: 'service', label: '服务状态', children: errorMessage ? '等待下一次成功刷新' : '接口响应正常' },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} xl={12} style={{ display: 'flex' }}>
          <Card
            bordered={false}
            loading={loading && !hasData}
            title="数据就绪情况"
            extra={<Tag color="cyan">运维视角</Tag>}
            style={dashboardCardStyle}
            styles={{ body: dashboardCardBodyStyle }}
          >
            <div style={{ flex: 1 }}>
              <Timeline items={timelineItems} />
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={12} style={{ display: 'flex' }}>
          <Card
            bordered={false}
            loading={loading && !hasData}
            title="当前快照"
            extra={<Tag color="purple">摘要</Tag>}
            style={dashboardCardStyle}
            styles={{ body: dashboardCardBodyStyle }}
          >
            <Descriptions
              column={1}
              size="middle"
              items={[
                { key: 'today', label: '今天日期', children: formatCalendarDate(new Date()) },
                { key: 'lastUpdated', label: '看板刷新时间', children: formatTimestamp(lastUpdatedAt) },
                { key: 'usersToday', label: '今日新增玩家', children: statValue(hasData, data?.users.today) },
                { key: 'translationUsage', label: '翻译调用次数', children: statValue(hasData, data?.translations.usage) },
                { key: 'contentTotal', label: '内容总量', children: statValue(hasData, contentTotal) },
                { key: 'admins', label: '管理员账号', children: statValue(hasData, data?.admins.total) },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
