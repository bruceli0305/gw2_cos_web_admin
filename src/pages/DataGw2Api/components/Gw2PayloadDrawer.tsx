import { Descriptions, Drawer } from 'antd';

type Props = {
  open: boolean;
  payload: unknown;
  onClose: () => void;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function displayValue(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '-';
}

export function Gw2PayloadDrawer({ open, payload, onClose }: Props) {
  const doc = asRecord(payload);
  const rawData = doc.data ?? payload;

  return (
    <Drawer title="实体载荷" open={open} onClose={onClose} width={900}>
      <Descriptions size="small" column={1} bordered style={{ marginBottom: 16 }}>
        <Descriptions.Item label="类型">{displayValue(doc.type)}</Descriptions.Item>
        <Descriptions.Item label="语言">{displayValue(doc.lang)}</Descriptions.Item>
        <Descriptions.Item label="GW2 ID">{displayValue(doc.gw2Id)}</Descriptions.Item>
        <Descriptions.Item label="名称">{displayValue(doc.name)}</Descriptions.Item>
        <Descriptions.Item label="英文名称">{displayValue(doc.nameEn)}</Descriptions.Item>
        <Descriptions.Item label="同步批次">{displayValue(doc.syncRunId)}</Descriptions.Item>
      </Descriptions>

      <pre style={{ maxHeight: 'calc(100vh - 320px)', overflow: 'auto', background: '#f6f6f6', padding: 12 }}>
        {JSON.stringify(rawData, null, 2)}
      </pre>
    </Drawer>
  );
}
