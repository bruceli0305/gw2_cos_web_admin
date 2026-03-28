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
  SafetyOutlined,
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

  const hasPerm = useCallback((perm?: string) => {
    if (!perm) return true;
    if (!me) return false;
    if (me.isSuper) return true;
    return me.permissions.includes(perm);
  }, [me]);

  const roleSummary = useMemo(() => {
    if (!me) return 'Admin workspace';
    if (me.isSuper) return 'Super Admin';
    if (me.roleNames.length > 0) return me.roleNames.join(', ');
    return 'Scoped Admin';
  }, [me]);

  const permissionCount = me?.permissions.length ?? 0;
  const avatarSeed = (me?.username || 'admin').trim().slice(0, 2).toUpperCase();

  const routeConfig = useMemo(() => {
    const raw: RouteItem[] = [
      { path: '/dashboard', name: 'Dashboard', icon: <DashboardOutlined />, requiredPerm: 'dashboard.read' },
      { path: '/users', name: 'Users', icon: <UserOutlined />, requiredPerm: 'users.read' },
      { path: '/translations', name: 'Translations', icon: <TranslationOutlined />, requiredPerm: 'translations.read' },
      { path: '/slang', name: 'Slang Glossary', icon: <TranslationOutlined />, requiredPerm: 'slang.read' },
      {
        path: '/content',
        name: 'Content',
        icon: <TeamOutlined />,
        routes: [
          { path: '/content/raids', name: 'Raid Recruitment', icon: <TrophyOutlined />, requiredPerm: 'raids.read' },
        ],
      },
      { path: '/wvw-guilds', name: 'WvW Guilds', icon: <FlagOutlined />, requiredPerm: 'wvwGuilds.read' },
      {
        path: '/data',
        name: 'Data',
        icon: <DatabaseOutlined />,
        routes: [
          { path: '/data/resources-directory', name: 'Resource Directory', icon: <AppstoreOutlined />, requiredPerm: 'resources.read' },
          { path: '/data/resources-recommended', name: 'Recommended Resources', icon: <LinkOutlined />, requiredPerm: 'resources.read' },
          { path: '/data/legendary-blueprints', name: 'Legendary Blueprints', icon: <AppstoreOutlined />, requiredPerm: 'legendary.read' },
          { path: '/data/fractal-dailies', name: 'Fractal Dailies', icon: <AppstoreOutlined />, requiredPerm: 'fractals.read' },
          { path: '/data/mistlock-instabilities', name: 'Mistlock Instabilities', icon: <AppstoreOutlined />, requiredPerm: 'fractals.read' },
          { path: '/data/mistlock-rotations', name: 'Mistlock Rotations', icon: <AppstoreOutlined />, requiredPerm: 'fractals.read' },
          { path: '/data/gw2-api', name: 'GW2 API Data', icon: <AppstoreOutlined />, requiredPerm: 'gw2data.read' },
          { path: '/data/market-watch', name: 'Market Watch', icon: <LineChartOutlined />, requiredPerm: 'market.read' },
        ],
      },
      {
        path: '/rbac',
        name: 'Permissions',
        icon: <SafetyOutlined />,
        routes: [
          { path: '/rbac/admin-users', name: 'Admin Users', icon: <SafetyOutlined />, requiredPerm: 'rbac.read' },
          { path: '/rbac/roles', name: 'Roles', icon: <SafetyOutlined />, requiredPerm: 'rbac.read' },
        ],
      },
      { path: '/audit', name: 'Audit Logs', icon: <FileSearchOutlined />, requiredPerm: 'audit.read' },
    ];

    const filterRoutes = (list: RouteItem[]): RouteItem[] =>
      list
        .map((item) => {
          const children = item.routes ? filterRoutes(item.routes) : undefined;
          const allowedSelf = hasPerm(item.requiredPerm);
          const allowedByChildren = !!(children && children.length > 0);

          if (!allowedSelf && !allowedByChildren) return null;
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
    message.success('Signed out');
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Space direction="vertical" size={12} align="center">
          <Spin size="large" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#1f1f1f', fontSize: 16, fontWeight: 600 }}>Loading admin workspace</div>
            <div style={{ color: '#8c8c8c', fontSize: 13 }}>Checking account permissions and shell context...</div>
          </div>
        </Space>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh' }}>
      <ProLayout
        style={{ height: '100%' }}
        contentStyle={{ overflow: 'auto' }}
        title="COS Admin"
        logo={(
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              background: 'linear-gradient(135deg, #1677ff 0%, #0f766e 100%)',
              boxShadow: '0 10px 20px rgba(22, 119, 255, 0.18)',
            }}
          >
            GW2
          </div>
        )}
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
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid #f0f0f0',
                background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
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
                Current Admin
              </div>
              <div style={{ marginTop: 8, color: '#1f1f1f', fontSize: 14, fontWeight: 600 }}>{me.username}</div>
              <div style={{ marginTop: 4, color: '#8c8c8c', fontSize: 12 }}>{roleSummary}</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Tag color={me.isSuper ? 'gold' : 'blue'} style={{ marginInlineEnd: 0 }}>
                  {me.isSuper ? 'Super Admin' : 'Role Scoped'}
                </Tag>
                <Tag style={{ marginInlineEnd: 0 }}>{permissionCount} perms</Tag>
                {me.mustChangePassword ? (
                  <Tag color="warning" style={{ marginInlineEnd: 0 }}>
                    Password reset required
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
                    label: 'Change password',
                    onClick: () => navigate('/change-password'),
                  },
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: 'Sign out',
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
                    <span style={{ color: '#1f1f1f', fontSize: 13, fontWeight: 600 }}>
                      {me?.username || 'Admin'}
                    </span>
                    <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                      {me?.isSuper ? 'Super Admin' : roleSummary}
                    </span>
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
