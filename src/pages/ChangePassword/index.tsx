import { PageContainer, ProForm, ProFormText } from '@ant-design/pro-components';
import { message, Alert } from 'antd';
import { request, TOKEN_KEY } from '../../services/request';

export default function ChangePasswordPage() {
  return (
    <PageContainer title="修改密码" subTitle="为保障安全，请设置新密码">
      <div style={{ maxWidth: 420 }}>
        <Alert
          type="warning"
          showIcon
          message="提示"
          description="若管理员被重置密码或系统要求改密，你将无法访问其它功能，直到完成改密。"
          style={{ marginBottom: 16 }}
        />

        <ProForm
          onFinish={async (values) => {
            const res = await request<{ success: boolean; token: string }>('/admin/v1/auth/change-password', {
              method: 'POST',
              body: JSON.stringify({
                oldPassword: values.oldPassword,
                newPassword: values.newPassword,
              }),
            });

            localStorage.setItem(TOKEN_KEY, res.token);
            message.success('密码修改成功');

            // 重新加载，让 BasicLayout 重新拉 me（mustChangePassword=false）
            window.location.href = '/dashboard';
          }}
        >
          <ProFormText.Password
            name="oldPassword"
            label="旧密码"
            rules={[{ required: true, message: '请输入旧密码' }]}
          />
          <ProFormText.Password
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 10, message: '至少10位' },
            ]}
          />
          <ProFormText.Password
            name="newPassword2"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                  return Promise.reject(new Error('两次输入的新密码不一致'));
                },
              }),
            ]}
          />
        </ProForm>
      </div>
    </PageContainer>
  );
}