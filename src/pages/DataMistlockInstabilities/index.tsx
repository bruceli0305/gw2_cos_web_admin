import {
  PageContainer,
  ProTable,
  type ProColumns,
  type ActionType,
  ModalForm,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Button, message, Space } from 'antd';
import { useMemo, useRef, useState } from 'react';
import { request } from '../../services/request';

type Item = {
  _id: string;
  idx: number;
  iconId?: number;
  name?: { zh?: string; en?: string; de?: string; fr?: string; es?: string };
  desc?: { zh?: string; en?: string };
  tips?: { zh?: string; en?: string };
  isEnabled: boolean;
  updatedAt?: string;
};

export default function DataMistlockInstabilitiesPage() {
  const actionRef = useRef<ActionType>(null);
  const [syncLoading, setSyncLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<Item | null>(null);

  const columns: ProColumns<Item>[] = useMemo(
    () => [
      { title: 'Idx', dataIndex: 'idx', width: 80, valueType: 'digit' },
      { title: 'IconId', dataIndex: 'iconId', width: 90, search: false },
      {
        title: '中文名',
        dataIndex: ['name', 'zh'],
        ellipsis: true,
        search: false,
        render: (_, r) => r.name?.zh || <span style={{ color: '#999' }}>（未填写）</span>,
      },
      {
        title: '英文名',
        dataIndex: ['name', 'en'],
        ellipsis: true,
        search: false,
        render: (_, r) => r.name?.en || '-',
      },
      {
        title: '启用',
        dataIndex: 'isEnabled',
        width: 80,
        search: false,
        render: (_, r) => (r.isEnabled ? '是' : '否'),
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
        `同步完成：异变 upsert ${res.instabilities?.upserted || 0}，轮换 upsert ${res.rotations?.upserted || 0}（跳过手工 ${res.rotations?.skippedManual || 0}）`
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
      title="迷雾异变"
      subTitle="从 Invisi 同步基础数据，并在后台维护中文名/说明/小贴士"
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
        search={false}
        columns={columns}
        request={async () => {
          const res = await request('/admin/v1/data/mistlock-instabilities');
          return { data: res.items || [], success: true };
        }}
      />

      <ModalForm
        title={`编辑：${current?.name?.en || 'Instability'} (#${current?.idx ?? ''})`}
        open={editOpen}
        onOpenChange={setEditOpen}
        modalProps={{ destroyOnClose: true }}
        initialValues={{
          nameZh: current?.name?.zh || '',
          descZh: current?.desc?.zh || '',
          tipsZh: current?.tips?.zh || '',
          isEnabled: current?.isEnabled ?? true,
        }}
        onFinish={async (values) => {
          if (!current) return false;
          await request(`/admin/v1/data/mistlock-instabilities/items/${current._id}`, {
            method: 'PUT',
            body: JSON.stringify({
              nameZh: values.nameZh,
              descZh: values.descZh,
              tipsZh: values.tipsZh,
              isEnabled: values.isEnabled,
            }),
          });
          message.success('更新成功');
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText name="nameZh" label="中文名" placeholder="例如：动能蓄积" />
        <ProFormTextArea name="descZh" label="中文说明" fieldProps={{ rows: 5 }} />
        <ProFormTextArea name="tipsZh" label="中文小贴士" fieldProps={{ rows: 5 }} />
        <ProFormSwitch name="isEnabled" label="启用" />
      </ModalForm>
    </PageContainer>
  );
}
