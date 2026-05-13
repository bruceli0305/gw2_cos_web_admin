import {
  DatabaseOutlined,
  LineChartOutlined,
  LockOutlined,
  SafetyOutlined,
  TranslationOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { Alert, Space, message } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TOKEN_KEY, getErrorMessage, request } from '../../services/request';

type LoginValues = {
  username: string;
  password: string;
};

type LoginResponse = {
  token: string;
  admin: {
    id: string;
    username: string;
  };
};

const capabilityCards = [
  {
    icon: <TranslationOutlined />,
    eyebrow: '本地词库',
    title: '翻译缓存与黑话词典',
    description: '在统一后台维护双语缓存与社区黑话映射，减少运营切换成本。',
  },
  {
    icon: <DatabaseOutlined />,
    eyebrow: '游戏数据',
    title: '黄页与同步工具',
    description: '统一管理资源黄页、传奇蓝图、碎层轮换数据，以及 GW2官方数据库。',
  },
  {
    icon: <LineChartOutlined />,
    eyebrow: '运营协作',
    title: '交易所监控与内容管理',
    description: '查看监控池、快照任务和面向 GW2 欧服玩家的内容运营链路。',
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (values: LoginValues) => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await request<LoginResponse>('/admin/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });

      localStorage.setItem(TOKEN_KEY, res.token);
      message.success('登录成功');
      navigate('/');
      return true;
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, '登录失败'));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="admin-login-shell"
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        padding: '32px 20px',
        background:
          'radial-gradient(circle at top left, rgba(126, 247, 242, 0.2), transparent 28%), radial-gradient(circle at top right, rgba(230, 107, 255, 0.2), transparent 32%), linear-gradient(180deg, #06111f 0%, #0a1730 45%, #f1f5f9 45%, #edf4ff 100%)',
      }}
    >
      <style>
        {`
          @keyframes adminLoginFloat {
            0% { transform: translate3d(0, 0, 0) scale(1); }
            50% { transform: translate3d(18px, -16px, 0) scale(1.04); }
            100% { transform: translate3d(0, 0, 0) scale(1); }
          }

          @keyframes adminLoginPulse {
            0% { opacity: 0.58; transform: scale(1); }
            50% { opacity: 0.88; transform: scale(1.08); }
            100% { opacity: 0.58; transform: scale(1); }
          }

          .admin-login-shell::before,
          .admin-login-shell::after {
            content: '';
            position: absolute;
            border-radius: 999px;
            filter: blur(40px);
            pointer-events: none;
          }

          .admin-login-shell::before {
            top: 72px;
            left: -96px;
            width: 280px;
            height: 280px;
            background: rgba(126, 247, 242, 0.14);
            animation: adminLoginFloat 14s ease-in-out infinite;
          }

          .admin-login-shell::after {
            right: -80px;
            bottom: 96px;
            width: 260px;
            height: 260px;
            background: rgba(230, 107, 255, 0.16);
            animation: adminLoginFloat 16s ease-in-out infinite reverse;
          }

          @media (max-width: 960px) {
            .admin-login-shell {
              padding: 20px 16px;
            }
          }
        `}
      </style>

      <div
        style={{
          position: 'absolute',
          top: 120,
          left: '12%',
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(122,169,255,0.28) 0%, rgba(122,169,255,0) 72%)',
          animation: 'adminLoginPulse 9s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          right: '10%',
          top: 88,
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(230,107,255,0.22) 0%, rgba(230,107,255,0) 72%)',
          animation: 'adminLoginPulse 11s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 1180,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 24,
          alignItems: 'stretch',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            flex: '1 1 520px',
            minWidth: 0,
            borderRadius: 32,
            padding: 'clamp(28px, 4vw, 44px)',
            color: '#f8fafc',
            position: 'relative',
            overflow: 'hidden',
            background:
              'radial-gradient(circle at top left, rgba(126,247,242,0.12), transparent 32%), radial-gradient(circle at bottom right, rgba(230,107,255,0.14), transparent 30%), linear-gradient(145deg, rgba(5, 15, 28, 0.96) 0%, rgba(12, 28, 51, 0.95) 48%, rgba(14, 72, 92, 0.94) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 30px 80px rgba(2, 6, 23, 0.42)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(115deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 28%), linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 100%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'absolute',
              top: -64,
              right: -40,
              width: 220,
              height: 220,
              borderRadius: 28,
              border: '1px solid rgba(255,255,255,0.08)',
              transform: 'rotate(18deg)',
              opacity: 0.45,
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  boxShadow: '0 18px 44px rgba(4, 14, 29, 0.34)',
                }}
              >
                <img src="/logo.svg" alt="协同学院" style={{ width: 52, height: 52, display: 'block' }} />
              </div>

              <div>
                <div
                  style={{
                    color: 'rgba(248,250,252,0.72)',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 1.8,
                    textTransform: 'uppercase',
                  }}
                >
                  协同学院
                </div>
                <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700 }}>GW2 欧服管理后台</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 28 }}>
              {['受限访问', '欧服运营', '生产环境'].map((label) => (
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
                    letterSpacing: 0.2,
                  }}
                >
                  {label}
                </span>
              ))}
            </div>

            <div
              style={{
                marginTop: 26,
                maxWidth: 600,
                fontSize: 'clamp(38px, 6vw, 64px)',
                fontWeight: 700,
                lineHeight: 0.94,
                letterSpacing: -1.6,
              }}
            >
              进入协同学院控制台
            </div>

            <div
              style={{
                marginTop: 18,
                maxWidth: 580,
                color: 'rgba(226,232,240,0.76)',
                fontSize: 16,
                lineHeight: 1.75,
              }}
            >
              在受限访问的运营工作台中处理翻译、资源目录、交易所监控与后台数据同步，服务面向 GW2 欧服玩家的实际内容场景。
            </div>

            <div
              style={{
                marginTop: 30,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 14,
              }}
            >
              {capabilityCards.map((card) => (
                <div
                  key={card.title}
                  style={{
                    minHeight: 170,
                    padding: 18,
                    borderRadius: 22,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      color: '#f8fafc',
                      background: 'linear-gradient(135deg, rgba(126,247,242,0.34), rgba(122,169,255,0.3))',
                      boxShadow: '0 10px 24px rgba(4, 14, 29, 0.18)',
                    }}
                  >
                    {card.icon}
                  </div>
                  <div
                    style={{
                      marginTop: 16,
                      color: 'rgba(226,232,240,0.66)',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 1.4,
                      textTransform: 'uppercase',
                    }}
                  >
                    {card.eyebrow}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 17, fontWeight: 600, lineHeight: 1.25 }}>{card.title}</div>
                  <div style={{ marginTop: 10, color: 'rgba(226,232,240,0.72)', fontSize: 13, lineHeight: 1.7 }}>
                    {card.description}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 'auto',
                paddingTop: 28,
              }}
            >
              <div
                style={{
                  borderRadius: 24,
                  padding: '18px 20px',
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                  background: 'rgba(7, 19, 35, 0.45)',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    flex: '0 0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(126,247,242,0.14)',
                    color: '#7ef7f2',
                  }}
                >
                  <SafetyOutlined />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>强制改密流程仍然生效</div>
                  <div style={{ marginTop: 6, color: 'rgba(226,232,240,0.72)', fontSize: 13, lineHeight: 1.7 }}>
                    如果你的密码被其他管理员重置，登录后仍会先进入改密流程，再开放其余后台页面。
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            flex: '0 1 430px',
            width: '100%',
            maxWidth: 430,
            alignSelf: 'center',
            borderRadius: 32,
            padding: 18,
            position: 'relative',
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.86)',
            border: '1px solid rgba(255,255,255,0.7)',
            boxShadow: '0 28px 70px rgba(15, 23, 42, 0.16)',
            backdropFilter: 'blur(18px)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -70,
              right: -56,
              width: 180,
              height: 180,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(126,247,242,0.24) 0%, rgba(126,247,242,0) 70%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(140deg, rgba(255,255,255,0.46) 0%, rgba(255,255,255,0.08) 28%, rgba(255,255,255,0) 58%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
                padding: '8px 12px',
                borderRadius: 999,
                background: 'rgba(15, 23, 42, 0.04)',
                border: '1px solid rgba(15, 23, 42, 0.06)',
                color: '#334155',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.2,
              }}
            >
              <SafetyOutlined />
              管理员受限登录
            </div>

            <LoginForm
              logo={(
                <img
                  src="/logo.svg"
                  alt="协同学院"
                  style={{
                    width: 48,
                    height: 48,
                    display: 'block',
                    filter: 'drop-shadow(0 12px 24px rgba(122,169,255,0.24))',
                  }}
                />
              )}
              title="后台入口"
              subTitle="登录协同学院 GW2 欧服管理后台"
              message={
                errorMessage ? (
                  <Alert
                    showIcon
                    type="error"
                    title="无法登录"
                    description={errorMessage}
                    style={{
                      marginBottom: 20,
                      textAlign: 'left',
                      borderRadius: 16,
                      border: '1px solid rgba(239,68,68,0.18)',
                    }}
                  />
                ) : undefined
              }
              submitter={{
                searchConfig: {
                  submitText: '进入后台',
                },
                submitButtonProps: {
                  size: 'large',
                  loading: submitting,
                  style: {
                    height: 48,
                    borderRadius: 14,
                    fontWeight: 700,
                    border: 'none',
                    background: 'linear-gradient(135deg, #0f172a 0%, #0f766e 55%, #1677ff 100%)',
                    boxShadow: '0 16px 30px rgba(15, 118, 110, 0.24)',
                  },
                },
              }}
              onFinish={handleSubmit}
            >
              <ProFormText
                name="username"
                fieldProps={{
                  size: 'large',
                  prefix: <UserOutlined />,
                  autoComplete: 'username',
                  style: { borderRadius: 14 },
                }}
                placeholder="管理员账号"
                rules={[{ required: true, message: '请输入管理员账号' }]}
              />
              <ProFormText.Password
                name="password"
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined />,
                  autoComplete: 'current-password',
                  style: { borderRadius: 14 },
                }}
                placeholder="密码"
                rules={[{ required: true, message: '请输入密码' }]}
              />
            </LoginForm>

            <div
              style={{
                marginTop: 8,
                padding: '14px 16px',
                borderRadius: 18,
                background: 'rgba(15, 23, 42, 0.03)',
                border: '1px solid rgba(15, 23, 42, 0.06)',
              }}
            >
              <Space align="start" size={12}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(15, 118, 110, 0.1)',
                    color: '#0f766e',
                    flex: '0 0 auto',
                  }}
                >
                  <SafetyOutlined />
                </div>
                <div>
                  <div style={{ color: '#0f172a', fontSize: 14, fontWeight: 600 }}>受保护的管理员入口</div>
                  <div style={{ marginTop: 4, color: '#64748b', fontSize: 13, lineHeight: 1.7 }}>
                    这里只接受管理员账号登录，现有的强制改密流程会在登录后继续生效。
                  </div>
                </div>
              </Space>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
