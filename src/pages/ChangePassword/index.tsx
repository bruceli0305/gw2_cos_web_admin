import {
  CheckCircleOutlined,
  KeyOutlined,
  LockOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Alert, Button, Form, Input, Space, message } from 'antd';
import { useState } from 'react';
import { TOKEN_KEY, getErrorMessage, request } from '../../services/request';

type ChangePasswordValues = {
  oldPassword: string;
  newPassword: string;
  newPassword2: string;
};

const passwordRules = [
  '至少使用 10 个字符。',
  '不要复用你在其他网站或服务里已经使用过的密码。',
  '后台管理员密码应与游戏账号密码分开。',
];

export default function ChangePasswordPage() {
  const [form] = Form.useForm<ChangePasswordValues>();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFinish = async (values: ChangePasswordValues) => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await request<{ success: boolean; token: string }>('/admin/v1/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          oldPassword: values.oldPassword,
          newPassword: values.newPassword,
        }),
      });

      localStorage.setItem(TOKEN_KEY, res.token);
      message.success('密码更新成功');

      // Reload so BasicLayout fetches a fresh auth context with mustChangePassword cleared.
      window.location.href = '/dashboard';
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, '密码更新失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer title="修改密码" subTitle="更新管理员凭证后再返回后台工作区">
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 32,
          padding: 'clamp(20px, 3vw, 28px)',
          background:
            'radial-gradient(circle at top left, rgba(126,247,242,0.18), transparent 22%), radial-gradient(circle at right center, rgba(122,169,255,0.16), transparent 26%), linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -44,
            right: -20,
            width: 220,
            height: 220,
            borderRadius: 28,
            transform: 'rotate(22deg)',
            border: '1px solid rgba(122, 169, 255, 0.16)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 22,
            alignItems: 'stretch',
          }}
        >
          <div
            style={{
              flex: '1 1 380px',
              minWidth: 0,
              borderRadius: 28,
              padding: 'clamp(24px, 3vw, 34px)',
              color: '#f8fafc',
              position: 'relative',
              overflow: 'hidden',
              background:
                'radial-gradient(circle at top left, rgba(126,247,242,0.16), transparent 28%), radial-gradient(circle at bottom right, rgba(230,107,255,0.12), transparent 26%), linear-gradient(145deg, rgba(5, 15, 28, 0.96) 0%, rgba(12, 28, 51, 0.94) 52%, rgba(14, 72, 92, 0.92) 100%)',
              boxShadow: '0 24px 60px rgba(2, 6, 23, 0.28)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(110deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 32%), linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 100%)',
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
                  <img
                    src="/logo.svg"
                    alt="协同学院"
                    style={{ width: 46, height: 46, display: 'block' }}
                  />
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
                    安全更新
                  </div>
                  <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700 }}>恢复后台访问权限</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 26 }}>
                {['必经步骤', '刷新令牌', '受保护后台'].map((label) => (
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
              </div>

              <div
                style={{
                  marginTop: 28,
                  maxWidth: 520,
                  fontSize: 'clamp(34px, 5vw, 52px)',
                  fontWeight: 700,
                  lineHeight: 0.98,
                  letterSpacing: -1.2,
                }}
              >
                先完成改密，再继续进入后台。
              </div>

              <div
                style={{
                  marginTop: 18,
                  maxWidth: 520,
                  color: 'rgba(226,232,240,0.76)',
                  fontSize: 15,
                  lineHeight: 1.75,
                }}
              >
                当前后台仍在强制执行改密流程。新密码提交成功后，系统会刷新登录令牌，并把你重新带回后台工作区。
              </div>

              <div
                style={{
                  marginTop: 28,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    padding: 18,
                    borderRadius: 22,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)',
                    border: '1px solid rgba(255,255,255,0.1)',
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
                      background: 'linear-gradient(135deg, rgba(126,247,242,0.34), rgba(122,169,255,0.3))',
                      color: '#f8fafc',
                      fontSize: 18,
                    }}
                  >
                    <KeyOutlined />
                  </div>
                  <div style={{ marginTop: 16, fontSize: 16, fontWeight: 600 }}>成功后刷新令牌</div>
                  <div style={{ marginTop: 8, color: 'rgba(226,232,240,0.72)', fontSize: 13, lineHeight: 1.7 }}>
                    密码更新成功后，页面会自动刷新，让后台壳层基于新的认证上下文重新加载。
                  </div>
                </div>

                <div
                  style={{
                    padding: 18,
                    borderRadius: 22,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)',
                    border: '1px solid rgba(255,255,255,0.1)',
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
                      background: 'linear-gradient(135deg, rgba(230,107,255,0.28), rgba(122,169,255,0.3))',
                      color: '#f8fafc',
                      fontSize: 18,
                    }}
                  >
                    <ThunderboltOutlined />
                  </div>
                  <div style={{ marginTop: 16, fontSize: 16, fontWeight: 600 }}>立即解除访问限制</div>
                  <div style={{ marginTop: 8, color: 'rgba(226,232,240,0.72)', fontSize: 13, lineHeight: 1.7 }}>
                    当前的强制改密限制会持续生效，直到这次更新完整成功为止。
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 28,
                  padding: '18px 20px',
                  borderRadius: 22,
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
                  <div style={{ fontSize: 15, fontWeight: 600 }}>密码建议</div>
                  <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                    {passwordRules.map((rule) => (
                      <div
                        key={rule}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'rgba(226,232,240,0.76)', fontSize: 13 }}
                      >
                        <CheckCircleOutlined style={{ marginTop: 3, color: '#7ef7f2' }} />
                        <span style={{ lineHeight: 1.7 }}>{rule}</span>
                      </div>
                    ))}
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
              borderRadius: 28,
              padding: 20,
              position: 'relative',
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(255,255,255,0.8)',
              boxShadow: '0 28px 64px rgba(15, 23, 42, 0.12)',
              backdropFilter: 'blur(18px)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -60,
                right: -52,
                width: 180,
                height: 180,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(126,247,242,0.24) 0%, rgba(126,247,242,0) 70%)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 14,
                  padding: '8px 12px',
                  borderRadius: 999,
                  background: 'rgba(15, 23, 42, 0.04)',
                  border: '1px solid rgba(15, 23, 42, 0.06)',
                  color: '#334155',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <LockOutlined />
                需要完成的安全操作
              </div>

              <div style={{ color: '#0f172a', fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>更新你的后台密码</div>
              <div style={{ marginTop: 10, color: '#64748b', fontSize: 14, lineHeight: 1.75 }}>
                先输入当前密码，再设置新的管理员密码。完成后即可解锁其余后台页面。
              </div>

              <Alert
                type="warning"
                showIcon
                message="必须先完成密码更新"
                description="如果你的账号被其他管理员重置，或被标记为强制更新密码，在完成这一步之前不能访问其他后台页面。"
                style={{ marginTop: 20, marginBottom: 14, borderRadius: 16 }}
              />

              <Alert
                type="info"
                showIcon
                message="完成后会发生什么"
                description="更新成功后，页面会自动刷新，并带着新令牌返回后台首页。"
                style={{ marginBottom: 14, borderRadius: 16 }}
              />

              {errorMessage ? (
                <Alert
                  type="error"
                  showIcon
                  message="无法更新密码"
                  description={errorMessage}
                  style={{ marginBottom: 14, borderRadius: 16 }}
                />
              ) : null}

              <Form<ChangePasswordValues> form={form} layout="vertical" onFinish={handleFinish}>
                <Form.Item
                  name="oldPassword"
                  label="当前密码"
                  rules={[{ required: true, message: '请输入当前密码' }]}
                >
                  <Input.Password
                    size="large"
                    autoComplete="current-password"
                    prefix={<LockOutlined />}
                    style={{ borderRadius: 14 }}
                  />
                </Form.Item>

                <Form.Item
                  name="newPassword"
                  label="新密码"
                  rules={[
                    { required: true, message: '请输入新密码' },
                    { min: 10, message: '至少使用 10 个字符' },
                  ]}
                >
                  <Input.Password
                    size="large"
                    autoComplete="new-password"
                    prefix={<KeyOutlined />}
                    style={{ borderRadius: 14 }}
                  />
                </Form.Item>

                <Form.Item
                  name="newPassword2"
                  label="确认新密码"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: '请再次输入新密码' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) {
                          return Promise.resolve();
                        }

                        return Promise.reject(new Error('两次输入的新密码不一致'));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    size="large"
                    autoComplete="new-password"
                    prefix={<CheckCircleOutlined />}
                    style={{ borderRadius: 14 }}
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={submitting}
                      block
                      style={{
                        height: 48,
                        borderRadius: 14,
                        fontWeight: 700,
                        border: 'none',
                        background: 'linear-gradient(135deg, #0f172a 0%, #0f766e 55%, #1677ff 100%)',
                        boxShadow: '0 16px 30px rgba(15, 118, 110, 0.24)',
                      }}
                    >
                      保存新密码
                    </Button>
                    <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.7 }}>
                      更新成功后，后台会自动刷新。
                    </div>
                  </Space>
                </Form.Item>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
