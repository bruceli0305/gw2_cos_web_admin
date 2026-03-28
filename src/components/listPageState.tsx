import { Alert, Button } from 'antd';

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
  retryLabel = 'Retry',
  marginBottom = 16,
}: PageRequestErrorAlertProps) {
  if (!description) return null;

  return (
    <Alert
      showIcon
      type="error"
      style={{ marginBottom }}
      message={message}
      description={description}
      action={(
        <Button size="small" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    />
  );
}
