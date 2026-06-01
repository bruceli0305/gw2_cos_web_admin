/**
 * 系统设置 → SMTP 邮件配置
 */

import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Space,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { getErrorMessage, request } from '../../services/request';

const { Text } = Typography;

type SmtpConfigData = {
  configured: boolean;
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

export default function SmtpConfigPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFetching(true);
      setFetchError('');
      try {
        const data = await request<SmtpConfigData>(`/admin/v1/system/smtp-config`);
        if (cancelled) return;
        form.setFieldsValue({
          host: data.host || '',
          port: data.port || 587,
          user: data.user || '',
          pass: data.pass || '',
          from: data.from || '',
        });
      } catch (err) {
        if (!cancelled) setFetchError(getErrorMessage(err, '加载配置失败'));
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await request('/admin/v1/system/smtp-config', {
        method: 'PUT',
        body: JSON.stringify(values),
      });
      message.success('SMTP 配置已保存');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return; // 表单校验错误
      message.error(getErrorMessage(err, '保存失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer header={{ title: '邮件配置（SMTP）' }}>
      <Card loading={fetching} style={{ maxWidth: 600 }}>
        {fetchError ? (
          <Text type="danger">{fetchError}</Text>
        ) : (
          <Form
            form={form}
            layout="vertical"
            initialValues={{ port: 587 }}
          >
            <Form.Item
              name="host"
              label="SMTP 服务器地址"
              rules={[{ required: true, message: '请输入 SMTP 服务器地址' }]}
            >
              <Input placeholder="smtp.example.com" />
            </Form.Item>

            <Form.Item
              name="port"
              label="端口"
              rules={[{ required: true, message: '请输入端口' }]}
            >
              <InputNumber min={1} max={65535} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="user"
              label="发件账号"
              rules={[{ required: true, message: '请输入发件账号' }]}
            >
              <Input placeholder="noreply@example.com" />
            </Form.Item>

            <Form.Item
              name="pass"
              label="密码 / 授权码"
              rules={[{ required: true, message: '请输入密码或授权码' }]}
            >
              <Input.Password placeholder="输入 SMTP 密码或授权码" />
            </Form.Item>

            <Form.Item
              name="from"
              label="发件人显示地址"
            >
              <Input placeholder="noreply@gw2.org.cn" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" onClick={handleSave} loading={loading}>
                  保存配置
                </Button>
                <Button onClick={() => form.resetFields()}>重置</Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Card>
    </PageContainer>
  );
}
