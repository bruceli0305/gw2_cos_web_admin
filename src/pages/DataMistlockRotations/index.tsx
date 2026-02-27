import {
  PageContainer,
  ProTable,
  type ProColumns,
  type ActionType,
  ModalForm,
  ProFormDigit,
} from '@ant-design/pro-components';
import { Button, message, Space, Tag } from 'antd';
import { useMemo, useRef, useState } from 'react';
import { request } from '../../services/request';

type Inst = {
  idx: number;
  name?: { zh?: string; en?: string };
};

type Item = {
  _id: string;
  rotationIndex: number;
  scale: number;
  source: 'invisi' | 'manual';
  instabilities: Inst[];
  updatedAt?: string;
};

export default function DataMistlockRotationsPage() {
  const actionRef = useRef<ActionType>(null);
  const [syncLoading, setSyncLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<Item | null>(null);

  const columns: ProColumns<Item>[] = useMemo(
    () => [
      { title: 'Day(0-14)', dataIndex: 'rotationIndex', width: 90, valueType: 'digit' },
      { title: 'Scale', dataIndex: 'scale', width: 80, valueType: 'digit' },
      {
        title: '异变(3个)',
        dataIndex: 'instabilities',
        search: false,
        render: (_, r) => (
          <Space size={[4, 4]} wrap>
            {(r.instabilities || []).map((it) => {
              const name = it.name?.zh || it.name?.en || `#${it.idx}`;
              return (
                <Tag key={it.idx}>
                  {it.idx} {name}
                </Tag>
              );
            })}
          </Space>
        ),
      },
      {
        title: '来源',
        dataIndex: 'source',
        width: 90,
        valueEnum: {
          invisi: { text: 'invisi' },
          manual: { text: 'manual' },
        },
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        width: 170,
        search: false,
        render: (_, r) => (r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '-'),
      },
      {
        title: '操作',
        valueType: 'option',
        width: 120,
        render: (_, r) => (
          <Space>
            <Button
              type="link"
              onClick={() => {
                setCurrent(r);
                setEditOpen(true);
              }}
            >
              编辑
            </Button>
          </Space>
        ),
      },
    ],
    []
  );

  const handleSync = async () => {
    setSyncLoading(true);
    try {
      const res = await request('/admin/v1/data/mistlock-instabilities/sync-invisi', { method: 'POST' });
      message.success(
        `同步完成：轮换 upsert ${res.rotations?.upserted || 0}（跳过手工 ${res.rotations?.skippedManual || 0}）`
      );
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e?.message || '同步失败');
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <PageContainer
      title="异变轮换（15天）"
      subTitle="可手工覆写（source=manual），同步 Invisi 会自动跳过手工项"
      extra={[
        <Button key="sync" loading={syncLoading} type="primary" onClick={handleSync}>
          同步 Invisi
        </Button>,
      ]}
    >
      <ProTable<Item>
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        columns={columns}
        request={async (params) => {
          const qs = new URLSearchParams();
          if (params?.rotationIndex !== undefined && params.rotationIndex !== '') qs.set('rotationIndex', String(params.rotationIndex));
          if (params?.scale !== undefined && params.scale !== '') qs.set('scale', String(params.scale));
          const url = `/admin/v1/data/mistlock-rotations${qs.toString() ? `?${qs.toString()}` : ''}`;
          const res = await request(url);
          return { data: res.items || [], success: true };
        }}
      />

      <ModalForm
        title={`编辑轮换：Day ${current?.rotationIndex ?? ''} / Scale ${current?.scale ?? ''}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        modalProps={{ destroyOnClose: true }}
        initialValues={{
          idx1: current?.instabilities?.[0]?.idx,
          idx2: current?.instabilities?.[1]?.idx,
          idx3: current?.instabilities?.[2]?.idx,
        }}
        onFinish={async (values) => {
          if (!current) return false;
          const instabilities = [values.idx1, values.idx2, values.idx3].map((x) => Number(x));
          await request(`/admin/v1/data/mistlock-rotations/items/${current._id}`, {
            method: 'PUT',
            body: JSON.stringify({ instabilities }),
          });
          message.success('已覆写（manual）');
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormDigit name="idx1" label="异变 idx 1" rules={[{ required: true }]} />
        <ProFormDigit name="idx2" label="异变 idx 2" rules={[{ required: true }]} />
        <ProFormDigit name="idx3" label="异变 idx 3" rules={[{ required: true }]} />
      </ModalForm>
    </PageContainer>
  );
}
