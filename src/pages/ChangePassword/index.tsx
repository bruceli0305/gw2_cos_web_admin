import { PageContainer } from '@ant-design/pro-components';
import { Alert, Button, Form, Input, message } from 'antd';
import { useState } from 'react';
import { TOKEN_KEY, getErrorMessage, request } from '../../services/request';

type ChangePasswordValues = {
  oldPassword: string;
  newPassword: string;
  newPassword2: string;
};

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
      message.success('Password updated');

      // Reload so BasicLayout fetches a fresh auth context with mustChangePassword cleared.
      window.location.href = '/dashboard';
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Failed to update password'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer
      title="Change Password"
      subTitle="Set a new password before continuing to the rest of the admin workspace"
    >
      <div
        style={{
          maxWidth: 560,
          padding: 24,
          borderRadius: 20,
          border: '1px solid #f0f0f0',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          boxShadow: '0 20px 40px rgba(15, 23, 42, 0.06)',
        }}
      >
        <Alert
          type="warning"
          showIcon
          message="Password update required"
          description="If your account was reset by another administrator or marked for a mandatory update, you must finish this step before accessing any other admin page."
          style={{ marginBottom: 16 }}
        />

        <Alert
          type="info"
          showIcon
          message="What happens next"
          description="After a successful update, the page will refresh and return you to the dashboard with the new token."
          style={{ marginBottom: 16 }}
        />

        {errorMessage ? (
          <Alert
            type="error"
            showIcon
            message="Unable to update password"
            description={errorMessage}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Form<ChangePasswordValues> form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item
            name="oldPassword"
            label="Current password"
            rules={[{ required: true, message: 'Please enter your current password' }]}
          >
            <Input.Password size="large" autoComplete="current-password" />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="New password"
            rules={[
              { required: true, message: 'Please enter a new password' },
              { min: 10, message: 'Use at least 10 characters' },
            ]}
          >
            <Input.Password size="large" autoComplete="new-password" />
          </Form.Item>

          <Form.Item
            name="newPassword2"
            label="Confirm new password"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Please confirm the new password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }

                  return Promise.reject(new Error('The confirmation does not match the new password'));
                },
              }),
            ]}
          >
            <Input.Password size="large" autoComplete="new-password" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Save new password
            </Button>
          </Form.Item>
        </Form>
      </div>
    </PageContainer>
  );
}
