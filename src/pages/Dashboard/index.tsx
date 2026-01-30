// src/pages/Dashboard/index.tsx
import { PageContainer, StatisticCard } from '@ant-design/pro-components';
import {
  UserOutlined,
  TranslationOutlined,
  FireOutlined,
  CloudServerOutlined,
  FieldTimeOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { request } from '../../services/request';

const { Statistic, Divider } = StatisticCard;

type StatsData = {
  admins?: { total: number };
  users: { total: number; today: number };
  translations: { count: number; usage: number };
  content: { raid: number; pvp: number; directory: number; legendary?: number };
  system: { uptime: number; memory?: any };
};

function formatUptime(seconds: number) {
  if (!seconds) return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}天 ${hours}小时`;
  return `${hours}小时 ${minutes}分`;
}

export default function DashboardPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request<StatsData>('/admin/v1/dashboard/stats')
      .then((res) => setData(res))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageContainer
      title="仪表盘"
      subTitle="系统运行状态概览"
      content={<div style={{ color: '#666' }}>欢迎管理员，今天是 {new Date().toLocaleDateString()}。</div>}
    >
      <StatisticCard.Group direction="row" loading={loading} style={{ marginBottom: 24 }}>
        <StatisticCard
          statistic={{
            title: '总用户数',
            value: data?.users.total || 0,
            icon: <UserOutlined style={{ color: '#1890ff', fontSize: '24px' }} />,
            description: (
              <Statistic
                title="今日新增"
                value={data?.users.today || 0}
                trend={data?.users.today ? 'up' : undefined}
              />
            ),
          }}
        />
        <Divider />
        <StatisticCard
          statistic={{
            title: '翻译接口调用',
            value: data?.translations.usage || 0,
            icon: <TranslationOutlined style={{ color: '#52c41a', fontSize: '24px' }} />,
            description: <Statistic title="语料库条目" value={data?.translations.count || 0} />,
          }}
        />
        <Divider />
        <StatisticCard
          statistic={{
            title: '活跃招募 (Raid + PvP)',
            value: (data?.content.raid || 0) + (data?.content.pvp || 0),
            icon: <FireOutlined style={{ color: '#faad14', fontSize: '24px' }} />,
          }}
        />
      </StatisticCard.Group>

      <StatisticCard.Group direction="row" loading={loading}>
        <StatisticCard
          title="内容统计"
          colSpan={12}
          statistic={{
            value: data?.content.directory || 0,
            title: '资源黄页条目',
            icon: <FileTextOutlined />,
          }}
          chart={
            <div style={{ display: 'flex', gap: 32, marginTop: 16 }}>
              <Statistic title="Raid 招募" value={data?.content.raid || 0} />
              <Statistic title="PvP 招募" value={data?.content.pvp || 0} />
            </div>
          }
        />
        <Divider />
        <StatisticCard
          title="系统状态"
          colSpan={12}
          statistic={{
            title: '运行时间',
            value: formatUptime(data?.system.uptime || 0),
            icon: <FieldTimeOutlined />,
          }}
          chart={
            <div style={{ display: 'flex', gap: 16, marginTop: 16, alignItems: 'center' }}>
              <CloudServerOutlined style={{ fontSize: 20, color: '#1890ff' }} />
              <span>服务运行正常</span>
            </div>
          }
        />
      </StatisticCard.Group>
    </PageContainer>
  );
}