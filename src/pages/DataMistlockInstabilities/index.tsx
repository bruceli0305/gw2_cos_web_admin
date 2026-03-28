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
import { Button, message, Space, Typography } from 'antd';
import { type SyntheticEvent, useMemo, useRef, useState } from 'react';
import { getErrorMessage, request } from '../../services/request';

type Item = {
  _id: string;
  idx: number;
  iconId?: number;
  iconUrl?: string;
  name?: { zh?: string; en?: string; de?: string; fr?: string; es?: string };
  desc?: { zh?: string; en?: string };
  tips?: { zh?: string; en?: string };
  isEnabled: boolean;
  updatedAt?: string;
};

type MistlockInstabilitiesListResp = {
  items?: Item[];
};

type SyncResp = {
  instabilities?: {
    upserted?: number;
  };
  rotations?: {
    upserted?: number;
    skippedManual?: number;
  };
};

type EditFormValues = {
  nameZh?: string;
  iconUrl?: string;
  descZh?: string;
  tipsZh?: string;
  isEnabled?: boolean;
};

export default function DataMistlockInstabilitiesPage() {
  const actionRef = useRef<ActionType>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteLoading, setPasteLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<Item | null>(null);

  const columns: ProColumns<Item>[] = useMemo(
    () => [
      { title: 'Idx', dataIndex: 'idx', width: 80, valueType: 'digit' },
      { title: 'IconId', dataIndex: 'iconId', width: 90, search: false },
      {
        title: 'IconURL',
        dataIndex: 'iconUrl',
        width: 110,
        search: false,
        render: (_, r) =>
          r.iconUrl ? (
            <Space size={8}>
              <img
                src={r.iconUrl}
                alt="icon"
                style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'contain' }}
                onError={(event: SyntheticEvent<HTMLImageElement>) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
              <span>已填写</span>
            </Space>
          ) : (
            <span style={{ color: '#999' }}>未填写</span>
          ),
      },
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
      // 兼容后端 body 校验：显式发空对象
      const res = await request<SyncResp>('/admin/v1/data/mistlock-instabilities/sync-invisi', {
        method: 'POST',
        body: '{}',
      });
      message.success(
        `同步完成：异变 upsert ${res.instabilities?.upserted || 0}，轮换 upsert ${res.rotations?.upserted || 0}（跳过手工 ${res.rotations?.skippedManual || 0}）`
      );
      actionRef.current?.reload();
    } catch (error: unknown) {
      const e = { message: getErrorMessage(error, 'Sync failed') };
      message.error(e?.message || '同步失败');
    } finally {
      setSyncLoading(false);
    }
  };

  const handlePasteSync = async (values: { jsonText?: string }) => {
    const jsonText = (values.jsonText || '').trim();
    if (!jsonText) {
      message.error('请粘贴 JSON 内容');
      return false;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText) as unknown;
    } catch {
      message.error('JSON 解析失败，请检查格式是否正确');
      return false;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      message.error('JSON 顶层必须是对象');
      return false;
    }
    const obj = parsed as Record<string, unknown>;
    const hasInstabilities = Object.prototype.hasOwnProperty.call(obj, 'instabilities');
    const hasDetails = Object.prototype.hasOwnProperty.call(obj, 'instability_details');
    if (!hasInstabilities || !hasDetails) {
      message.error('JSON 必须包含 instabilities 和 instability_details 两个字段');
      return false;
    }

    setPasteLoading(true);
    try {
      const res = await request<SyncResp>('/admin/v1/data/mistlock-instabilities/sync-invisi', {
        method: 'POST',
        body: JSON.stringify(obj),
      });
      message.success(
        `更新完成：异变 upsert ${res.instabilities?.upserted || 0}，轮换 upsert ${res.rotations?.upserted || 0}（跳过手工 ${res.rotations?.skippedManual || 0}）`
      );
      actionRef.current?.reload();
      setPasteOpen(false);
      return true;
    } catch (error: unknown) {
      const e = { message: getErrorMessage(error, 'Update failed') };
      message.error(e?.message || '更新失败');
      return false;
    } finally {
      setPasteLoading(false);
    }
  };

  return (
    <PageContainer
      title="迷雾异变"
      subTitle="从 Invisi 同步基础数据，并在后台维护中文名/说明/图标地址"
      extra={[
        <Button key="sync" loading={syncLoading} type="primary" onClick={handleSync}>
          同步 Invisi
        </Button>,
        <Button key="paste" onClick={() => setPasteOpen(true)}>
          粘贴 JSON 更新
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
          const res = await request<MistlockInstabilitiesListResp>('/admin/v1/data/mistlock-instabilities');
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
          iconUrl: current?.iconUrl || '',
          descZh: current?.desc?.zh || '',
          tipsZh: current?.tips?.zh || '',
          isEnabled: current?.isEnabled ?? true,
        }}
        onFinish={async (values: EditFormValues) => {
          if (!current) return false;
          await request(`/admin/v1/data/mistlock-instabilities/items/${current._id}`, {
            method: 'PUT',
            body: JSON.stringify({
              nameZh: values.nameZh,
              iconUrl: values.iconUrl,
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
        <ProFormText name="iconUrl" label="Icon URL" placeholder="例如：https://你的域名/static/instabilities/xxx.png" />
        <ProFormTextArea name="descZh" label="中文说明" fieldProps={{ rows: 5 }} />
        <ProFormTextArea name="tipsZh" label="中文小贴士" fieldProps={{ rows: 5 }} />
        <ProFormSwitch name="isEnabled" label="启用" />
      </ModalForm>

      <ModalForm
        title="粘贴 JSON 更新（离线同步）"
        open={pasteOpen}
        onOpenChange={setPasteOpen}
        modalProps={{ destroyOnClose: true }}
        submitter={{ submitButtonProps: { loading: pasteLoading } }}
        onFinish={handlePasteSync}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          将 Invisi 的 instabilities.json 内容整体粘贴到下面；需要同时包含 instabilities 与 instability_details。
          适用于服务器无法直连 GitHub 的场景。
        </Typography.Paragraph>
        <ProFormTextArea
          name="jsonText"
          label="JSON"
          fieldProps={{ rows: 14, placeholder: '粘贴完整 JSON...' }}
          rules={[{ required: true, message: '请粘贴 JSON' }]}
        />
      </ModalForm>
    </PageContainer>
  );
}
