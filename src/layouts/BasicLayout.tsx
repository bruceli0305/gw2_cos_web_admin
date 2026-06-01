import { ProLayout } from '@ant-design/pro-components';
import {
  AppstoreOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  FlagOutlined,
  KeyOutlined,
  LineChartOutlined,
  LinkOutlined,
  LogoutOutlined,
  ReadOutlined,
  SafetyOutlined,
  SettingOutlined,
  StarOutlined,
  TeamOutlined,
  TranslationOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Dropdown, message, Space, Spin, Tag } from 'antd';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TOKEN_KEY, request } from '../services/request';

type MeResp = {
  admin: {
    id: string;
    username: string;
    isSuper: boolean;
    roleNames: string[];
    permissions: string[];
    mustChangePassword: boolean;
  };
};

type RouteItem = {
  path?: string;
  name: string;
  icon?: ReactNode;
  requiredPerm?: string;
  routes?: RouteItem[];
};

export default function BasicLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [me, setMe] = useState<MeResp['admin'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request<MeResp>('/admin/v1/auth/me')
      .then((res) => setMe(res.admin))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!me) return;
    if (me.mustChangePassword && location.pathname !== '/change-password') {
      navigate('/change-password', { replace: true });
    }
  }, [location.pathname, me, navigate]);

  const hasPerm = useCallback(
    (perm?: string) => {
      if (!perm) return true;
      if (!me) return false;
      if (me.isSuper) return true;
      return me.permissions.includes(perm);
    },
    [me]
  );

  const roleSummary = useMemo(() => {
    if (!me) return '管理工作区';
    if (me.isSuper) return '超级管理员';
    if (me.roleNames.length > 0) return me.roleNames.join(', ');
    return '受限管理员';
  }, [me]);

  const permissionCount = me?.permissions.length ?? 0;
  const avatarSeed = (me?.username || 'admin').trim().slice(0, 2).toUpperCase();

  const routeConfig = useMemo(() => {
    const raw: RouteItem[] = [
      { path: '/dashboard', name: '首页看板', icon: <DashboardOutlined />, requiredPerm: 'dashboard.read' },
      {
        path: '/community',
        name: '社区内容',
        icon: <TeamOutlined />,
        routes: [
          { path: '/content/guides', name: '攻略文章', icon: <ReadOutlined />, requiredPerm: 'guides.read' },
          { path: '/content/guides/categories', name: '攻略分类', icon: <AppstoreOutlined />, requiredPerm: 'guides.read' },
          { path: '/content/guides/topics', name: '攻略专题', icon: <LinkOutlined />, requiredPerm: 'guides.read' },
          { path: '/users', name: '玩家账号', icon: <UserOutlined />, requiredPerm: 'users.read' },
          { path: '/wvw-guilds', name: 'WvW 公会', icon: <FlagOutlined />, requiredPerm: 'wvwGuilds.read' },
          { path: '/content/raids', name: '团本招募', icon: <TrophyOutlined />, requiredPerm: 'raids.read' },
        ],
      },
      {
        path: '/localization',
        name: '翻译与词典',
        icon: <TranslationOutlined />,
        routes: [
          { path: '/translations', name: '翻译缓存', icon: <TranslationOutlined />, requiredPerm: 'translations.read' },
          { path: '/slang', name: '黑话词典', icon: <TranslationOutlined />, requiredPerm: 'slang.read' },
        ],
      },
      {
        path: '/fortune',
        name: '娱乐占签',
        icon: <StarOutlined />,
        routes: [
          { path: '/fortune/records', name: '结果记录', icon: <FileSearchOutlined />, requiredPerm: 'fortune.read' },
          { path: '/fortune/prompts', name: '提示词版本', icon: <TranslationOutlined />, requiredPerm: 'fortune.read' },
          { path: '/fortune/content', name: '内容池', icon: <AppstoreOutlined />, requiredPerm: 'fortune.read' },
          { path: '/fortune/poster', name: '海报配置', icon: <LinkOutlined />, requiredPerm: 'fortune.read' },
        ],
      },
      {
        path: '/data',
        name: '游戏数据',
        icon: <DatabaseOutlined />,
        routes: [
          { path: '/data/resources-directory', name: '资源黄页', icon: <AppstoreOutlined />, requiredPerm: 'resources.read' },
          { path: '/data/resources-recommended', name: '推荐资源', icon: <LinkOutlined />, requiredPerm: 'resources.read' },
          { path: '/data/legendary-blueprints', name: '传奇蓝图', icon: <AppstoreOutlined />, requiredPerm: 'legendary.read' },
          { path: '/data/fractal-dailies', name: '碎层日常', icon: <AppstoreOutlined />, requiredPerm: 'fractals.read' },
          { path: '/data/mistlock-instabilities', name: '碎层词缀', icon: <AppstoreOutlined />, requiredPerm: 'fractals.read' },
          { path: '/data/mistlock-rotations', name: '碎层轮换', icon: <AppstoreOutlined />, requiredPerm: 'fractals.read' },
          { path: '/data/boss-directory', name: '副本 Boss 目录', icon: <AppstoreOutlined />, requiredPerm: 'bosses.read' },
          { path: '/data/boss-rotations', name: '副本 Boss 轮换', icon: <AppstoreOutlined />, requiredPerm: 'bosses.read' },
          { path: '/data/gw2-api', name: 'GW2官方数据库', icon: <AppstoreOutlined />, requiredPerm: 'gw2data.read' },
        ],
      },
      { path: '/data/market-watch', name: '交易所观察', icon: <LineChartOutlined />, requiredPerm: 'market.read' },
      {
        path: '/system',
        name: '系统设置',
        icon: <SettingOutlined />,
        routes: [
          { path: '/system/smtp', name: '邮件配置（SMTP）', icon: <SettingOutlined /> },
        ],
      },
      {
        path: '/security',
        name: '权限与审计',
        icon: <SafetyOutlined />,
        routes: [
          { path: '/rbac/admin-users', name: '管理员账号', icon: <SafetyOutlined />, requiredPerm: 'rbac.read' },
          { path: '/rbac/roles', name: '角色权限', icon: <SafetyOutlined />, requiredPerm: 'rbac.read' },
          { path: '/audit', name: '审计日志', icon: <FileSearchOutlined />, requiredPerm: 'audit.read' },
        ],
      },
    ];

    const filterRoutes = (list: RouteItem[]): RouteItem[] =>
      list
        .map((item) => {
          const children = item.routes ? filterRoutes(item.routes) : undefined;
          const allowedSelf = hasPerm(item.requiredPerm);
          const allowedByChildren = !!(children && children.length > 0);

          if (!allowedSelf && !allowedByChildren) return null;
          if (item.routes && !item.requiredPerm && children?.length === 1) {
            return children[0];
          }
          return { ...item, routes: children };
        })
        .filter(Boolean) as RouteItem[];

    return {
      route: {
        path: '/',
        routes: filterRoutes(raw),
      },
    };
  }, [hasPerm]);

  const handleLogout = async () => {
    try {
      await request('/admin/v1/auth/logout-all', { method: 'POST' });
    } catch {
      // ignore logout-all failures and still clear local session
    }

    localStorage.removeItem(TOKEN_KEY);
    message.success('已退出登录');
    navigate('/login');
  };

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at top left, rgba(126,247,242,0.12), transparent 26%), linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)',
        }}
      >
        <Space orientation="vertical" size={12} align="center">
          <Spin size="large" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#1f1f1f', fontSize: 16, fontWeight: 600 }}>正在加载管理后台</div>
            <div style={{ color: '#8c8c8c', fontSize: 13 }}>正在校验账号权限与后台上下文...</div>
          </div>
        </Space>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(126,247,242,0.08), transparent 24%), radial-gradient(circle at top right, rgba(122,169,255,0.08), transparent 26%), linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)',
      }}
    >
      <ProLayout
        style={{ height: '100%' }}
        contentStyle={{ overflow: 'auto', background: 'transparent' }}
        title="协同学院后台"
        logo={
          <img
            src="/logo.svg"
            alt="协同学院"
            style={{
              width: 32,
              height: 32,
              display: 'block',
            }}
          />
        }
        layout="mix"
        splitMenus={false}
        fixSiderbar
        fixedHeader
        siderWidth={220}
        navTheme="light"
        contentWidth="Fluid"
        location={{ pathname: location.pathname }}
        route={routeConfig.route}
        menuFooterRender={(props) => {
          if (props?.collapsed || !me) return null;

          return (
            <div
              style={{
                margin: 12,
                padding: '14px 16px',
                borderRadius: 18,
                border: '1px solid rgba(148, 163, 184, 0.16)',
                background:
                  'radial-gradient(circle at top left, rgba(126,247,242,0.14), transparent 26%), linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
                boxShadow: '0 14px 28px rgba(15, 23, 42, 0.04)',
              }}
            >
              <div
                style={{
                  color: '#8c8c8c',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                }}
              >
                当前管理员
              </div>
              <div style={{ marginTop: 8, color: '#1f1f1f', fontSize: 14, fontWeight: 600 }}>{me.username}</div>
              <div style={{ marginTop: 4, color: '#8c8c8c', fontSize: 12 }}>{roleSummary}</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Tag color={me.isSuper ? 'gold' : 'blue'} style={{ marginInlineEnd: 0 }}>
                  {me.isSuper ? '超级管理员' : '角色受限'}
                </Tag>
                <Tag style={{ marginInlineEnd: 0 }}>{me.isSuper ? '全量权限' : `${permissionCount} 项权限`}</Tag>
                {me.mustChangePassword ? (
                  <Tag color="warning" style={{ marginInlineEnd: 0 }}>
                    需要修改密码
                  </Tag>
                ) : null}
              </div>
            </div>
          );
        }}
        menuItemRender={(item, dom) => {
          const routeItem = item as RouteItem;
          const hasChildren = Array.isArray(routeItem.routes) && routeItem.routes.length > 0;

          return (
            <div
              onClick={() => {
                if (hasChildren) return;
                if (item.path) navigate(item.path);
              }}
            >
              {dom}
            </div>
          );
        }}
        avatarProps={{
          size: 'small',
          render: () => (
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'changePassword',
                    icon: <KeyOutlined />,
                    label: '修改密码',
                    onClick: () => navigate('/change-password'),
                  },
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: '退出登录',
                    onClick: handleLogout,
                  },
                ],
              }}
            >
              <div style={{ cursor: 'pointer', padding: '0 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                      background: me?.isSuper
                        ? 'linear-gradient(135deg, #faad14 0%, #d46b08 100%)'
                        : 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
                    }}
                  >
                    {avatarSeed}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                    <span style={{ color: '#1f1f1f', fontSize: 13, fontWeight: 600 }}>{me?.username || '管理员'}</span>
                    <span style={{ color: '#8c8c8c', fontSize: 12 }}>{me?.isSuper ? '超级管理员' : roleSummary}</span>
                  </div>
                </div>
              </div>
            </Dropdown>
          ),
        }}
      >
        <Outlet />
      </ProLayout>
    </div>
  );
}
