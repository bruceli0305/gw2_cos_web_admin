import { LockOutlined, SafetyOutlined, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { Alert, message } from 'antd';
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
      message.success('Login successful');
      navigate('/');
      return true;
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Login failed'));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        background:
          'radial-gradient(circle at top left, rgba(22,119,255,0.14), transparent 32%), linear-gradient(180deg, #f5f8ff 0%, #eef4f7 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 980,
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 420px) minmax(320px, 420px)',
          gap: 28,
          alignItems: 'stretch',
        }}
      >
        <div
          style={{
            borderRadius: 24,
            padding: 28,
            color: '#fff',
            background: 'linear-gradient(160deg, #0f172a 0%, #0f766e 100%)',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.24)',
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              background: 'rgba(255,255,255,0.14)',
              border: '1px solid rgba(255,255,255,0.18)',
            }}
          >
            GW2
          </div>
          <div style={{ marginTop: 24, fontSize: 34, fontWeight: 700, lineHeight: 1.1 }}>
            College of Synergetics Admin
          </div>
          <div style={{ marginTop: 12, maxWidth: 320, color: 'rgba(255,255,255,0.74)', fontSize: 15, lineHeight: 1.6 }}>
            Manage Guild Wars 2 EU content, translations, WvW guild recruitment, and admin-side data operations from one workspace.
          </div>

          <div
            style={{
              marginTop: 24,
              padding: 18,
              borderRadius: 18,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600 }}>
              <SafetyOutlined />
              Admin access only
            </div>
            <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.74)', fontSize: 13, lineHeight: 1.7 }}>
              Sign in with your administrator account. If your password was reset by another admin, you will be redirected to update it before accessing the rest of the console.
            </div>
          </div>
        </div>

        <div
          style={{
            borderRadius: 24,
            padding: 12,
            background: 'rgba(255,255,255,0.86)',
            border: '1px solid rgba(15,23,42,0.08)',
            boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <LoginForm
            logo={(
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #1677ff 0%, #0f766e 100%)',
                }}
              >
                COS
              </div>
            )}
            title="COS Admin"
            subTitle="Admin console for the GW2 EU workspace"
            message={
              errorMessage ? (
                <Alert
                  showIcon
                  type="error"
                  message="Unable to sign in"
                  description={errorMessage}
                  style={{ marginBottom: 20, textAlign: 'left' }}
                />
              ) : undefined
            }
            submitter={{
              searchConfig: {
                submitText: 'Sign in',
              },
              submitButtonProps: {
                size: 'large',
                loading: submitting,
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
              }}
              placeholder="Admin username"
              rules={[{ required: true, message: 'Please enter an admin username' }]}
            />
            <ProFormText.Password
              name="password"
              fieldProps={{
                size: 'large',
                prefix: <LockOutlined />,
                autoComplete: 'current-password',
              }}
              placeholder="Password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            />
          </LoginForm>
        </div>
      </div>
    </div>
  );
}
