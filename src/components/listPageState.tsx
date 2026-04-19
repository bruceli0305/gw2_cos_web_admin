import { Alert, Button } from 'antd';
import type { ReactNode } from 'react';

type PageRequestErrorAlertProps = {
  message: string;
  description: string | null;
  onRetry: () => void;
  retryLabel?: string;
  marginBottom?: number;
};

export function PageRequestErrorAlert({
  message,
  description,
  onRetry,
  retryLabel = '重试',
  marginBottom = 16,
}: PageRequestErrorAlertProps) {
  if (!description) return null;

  return (
    <Alert
      showIcon
      type="error"
      style={{ marginBottom }}
      title={message}
      description={description}
      action={(
        <Button size="small" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    />
  );
}

type PageNoticeAlertProps = {
  type: 'info' | 'warning';
  message: string;
  description: ReactNode;
  marginBottom?: number;
};

export function PageNoticeAlert({
  type,
  message,
  description,
  marginBottom = 16,
}: PageNoticeAlertProps) {
  return (
    <Alert
      showIcon
      type={type}
      style={{ marginBottom }}
      title={message}
      description={description}
    />
  );
}
