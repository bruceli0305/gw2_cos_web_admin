// src/pages/Login/index.tsx
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { request, TOKEN_KEY } from '../../services/request';

export default function LoginPage() {
  const navigate = useNavigate();

  const handleSubmit = async (values: any) => {
    try {
      const res = await request<{ token: string; admin: any }>('/admin/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });

      localStorage.setItem(TOKEN_KEY, res.token);
      message.success('登录成功');
      navigate('/');
    } catch (error: any) {
      message.error(error.message || '登录失败');
    }
  };

  return (
    <div style={{ height: '100vh', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LoginForm title="GW2 Admin" subTitle="后端管理系统" onFinish={handleSubmit}>
        <ProFormText
          name="username"
          fieldProps={{ size: 'large', prefix: <UserOutlined /> }}
          placeholder="管理员用户名"
          rules={[{ required: true, message: '请输入用户名' }]}
        />
        <ProFormText.Password
          name="password"
          fieldProps={{ size: 'large', prefix: <LockOutlined /> }}
          placeholder="密码"
          rules={[{ required: true, message: '请输入密码' }]}
        />
      </LoginForm>
    </div>
  );
}