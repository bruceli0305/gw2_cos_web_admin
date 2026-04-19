import { LoadingOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Image, Input, Space, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { useState } from 'react';
import { uploadGuideCover } from '../services/guides';
import { getErrorMessage } from '../services/request';

type GuideCoverUploadProps = {
  value?: string;
  onChange?: (value?: string) => void;
};

const MAX_SIZE_MB = 5;

export default function GuideCoverUpload({ value, onChange }: GuideCoverUploadProps) {
  const [uploading, setUploading] = useState(false);

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    const isAllowed = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (!isAllowed) {
      message.error('Only JPG, PNG, and WEBP images are supported');
      return Upload.LIST_IGNORE;
    }
    const isSizeOk = file.size / 1024 / 1024 <= MAX_SIZE_MB;
    if (!isSizeOk) {
      message.error('Cover image must be 5MB or smaller');
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const customRequest: UploadProps['customRequest'] = async (options) => {
    try {
      setUploading(true);
      const uploaded = await uploadGuideCover(options.file as File);
      onChange?.(uploaded.path || uploaded.url);
      message.success('Cover image uploaded');
      options.onSuccess?.(uploaded);
    } catch (error: unknown) {
      message.error(getErrorMessage(error, 'Cover image upload failed'));
      options.onError?.(error as Error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <Input
        value={value}
        allowClear
        placeholder="Paste an existing image URL, or upload a local file below"
        onChange={(event) => onChange?.(event.target.value.trim() || undefined)}
      />

      {value ? (
        <Space orientation="vertical" size={8} style={{ width: '100%' }}>
          <Image
            src={value}
            alt="Guide cover"
            width={220}
            style={{ borderRadius: 12, border: '1px solid rgba(148, 163, 184, 0.28)' }}
          />
          <Typography.Text type="secondary" copyable={{ text: value }}>
            {value}
          </Typography.Text>
        </Space>
      ) : (
        <Typography.Text type="secondary">
          No cover image yet. You can upload a local file to the server or keep using a manual URL.
        </Typography.Text>
      )}

      <Space wrap>
        <Upload
          accept=".jpg,.jpeg,.png,.webp"
          showUploadList={false}
          beforeUpload={beforeUpload}
          customRequest={customRequest}
        >
          <Button icon={uploading ? <LoadingOutlined /> : <UploadOutlined />} loading={uploading}>
            Upload Local Image
          </Button>
        </Upload>
        {value ? <Button onClick={() => onChange?.(undefined)}>Clear</Button> : null}
      </Space>
    </Space>
  );
}
