// src/layouts/BasicLayout.tsx
import { ProLayout } from '@ant-design/pro-components';
import { Dropdown, message, Spin } from 'antd';
import {
  LogoutOutlined,
  UserOutlined,
  DashboardOutlined,
  TranslationOutlined,
  TeamOutlined,
  SafetyOutlined,
  FileSearchOutlined,
  TrophyOutlined,
  DatabaseOutlined,
  LinkOutlined,
  AppstoreOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
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

  // 强制改密：拉到 me 后立即跳
  useEffect(() => {
    if (!me) return;
    if (me.mustChangePassword && location.pathname !== '/change-password') {
      navigate('/change-password', { replace: true });
    }
  }, [me, location.pathname, navigate]);

  const hasPerm = (perm?: string) => {
    if (!perm) return true;
    if (!me) return false;
    if (me.isSuper) return true;
    return me.permissions.includes(perm);
  };

  const routeConfig = useMemo(() => {
    const raw: RouteItem[] = [
      { path: '/dashboard', name: '仪表盘', icon: <DashboardOutlined />, requiredPerm: 'dashboard.read' },

      { path: '/users', name: '用户管理', icon: <UserOutlined />, requiredPerm: 'users.read' },
      { path: '/translations', name: '翻译语料', icon: <TranslationOutlined />, requiredPerm: 'translations.read' },
      { path: '/slang', name: '黑话词典', icon: <TranslationOutlined />, requiredPerm: 'slang.read' },

      {
        path: '/content',
        name: '内容管理',
        icon: <TeamOutlined />,
        routes: [
          { path: '/content/raids', name: 'Raid 招募', icon: <TrophyOutlined />, requiredPerm: 'raids.read' },
          { path: '/content/pvp', name: 'PvP 招募', icon: <TeamOutlined />, requiredPerm: 'pvp.read' },
        ],
      },

      {
        path: '/data',
        name: '数据管理',
        icon: <DatabaseOutlined />,
        routes: [
          { path: '/data/resources-directory', name: '资源黄页', icon: <AppstoreOutlined />, requiredPerm: 'resources.read' },
          { path: '/data/resources-recommended', name: '推荐资源', icon: <LinkOutlined />, requiredPerm: 'resources.read' },
          { path: '/data/legendary-blueprints', name: '传奇蓝图', icon: <AppstoreOutlined />, requiredPerm: 'legendary.read' },
          { path: '/data/fractal-dailies', name: '碎层日常', icon: <AppstoreOutlined />, requiredPerm: 'fractals.read' },
          { path: '/data/mistlock-instabilities', name: '迷雾异变', icon: <AppstoreOutlined />, requiredPerm: 'fractals.read' },
          { path: '/data/mistlock-rotations', name: '异变轮换', icon: <AppstoreOutlined />, requiredPerm: 'fractals.read' },
        ],
      },

      {
        path: '/rbac',
        name: '权限管理',
        icon: <SafetyOutlined />,
        routes: [
          { path: '/rbac/admin-users', name: '管理员', icon: <SafetyOutlined />, requiredPerm: 'rbac.read' },
          { path: '/rbac/roles', name: '角色管理', icon: <SafetyOutlined />, requiredPerm: 'rbac.read' },
        ],
      },

      { path: '/audit', name: '审计日志', icon: <FileSearchOutlined />, requiredPerm: 'audit.read' },
    ];

    const filterRoutes = (list: RouteItem[]): RouteItem[] =>
      list
        .map((it) => {
          const children = it.routes ? filterRoutes(it.routes) : undefined;
          const allowedSelf = hasPerm(it.requiredPerm);
          const allowedByChildren = !!(children && children.length > 0);
          if (!allowedSelf && !allowedByChildren) return null;
          return { ...it, routes: children };
        })
        .filter(Boolean) as RouteItem[];

    return {
      route: {
        path: '/',
        routes: filterRoutes(raw),
      },
    };
  }, [me]);

  const handleLogout = async () => {
    try {
      await request('/admin/v1/auth/logout-all', { method: 'POST' });
    } catch {
      // ignore
    }
    localStorage.removeItem(TOKEN_KEY);
    message.success('已退出登录');
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ height: '100vh' }}>
      <ProLayout
        style={{ height: '100%' }}
        contentStyle={{ overflow: 'auto' }}
        title="GW2 Admin"
        logo="https://wiki.guildwars2.com/images/d/df/Gw2-logo.png"
        layout="mix"
        splitMenus={false}
        fixSiderbar
        fixedHeader
        siderWidth={220}
        navTheme="light"
        contentWidth="Fluid"
        location={{ pathname: location.pathname }}
        route={routeConfig.route}
        menuItemRender={(item, dom) => {
          const anyItem = item as any;
          const hasChildren = Array.isArray(anyItem.routes) && anyItem.routes.length > 0;
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
          src: `https://api.dicebear.com/7.x/miniavs/svg?seed=${encodeURIComponent(me?.username || 'admin')}`,
          size: 'small',
          title: me?.username || '管理员',
          render: (_props, dom) => (
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
              <div style={{ cursor: 'pointer', padding: '0 8px' }}>{dom}</div>
            </Dropdown>
          ),
        }}
      >
        <Outlet />
      </ProLayout>
    </div>
  );
}