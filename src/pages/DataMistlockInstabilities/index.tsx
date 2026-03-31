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
import { Alert, Button, Card, Col, Row, Space, Statistic, message } from 'antd';
import { type SyntheticEvent, useMemo, useRef, useState } from 'react';
import { PageNoticeAlert } from '../../components/listPageState';
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
  const [items, setItems] = useState<Item[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<Item | null>(null);

  const summary = useMemo(() => {
    const enabled = items.filter((item) => item.isEnabled).length;
    const iconReady = items.filter((item) => Boolean(item.iconUrl)).length;

    return {
      total: items.length,
      enabled,
      iconReady,
      currentView: '全部词缀',
    };
  }, [items]);

  const columns: ProColumns<Item>[] = useMemo(
    () => [
      { title: 'Idx', dataIndex: 'idx', width: 80, valueType: 'digit' },
      { title: '图标 ID', dataIndex: 'iconId', width: 90, search: false },
      {
        title: '图标',
        dataIndex: 'iconUrl',
        width: 130,
        search: false,
        render: (_, record) =>
          record.iconUrl ? (
            <Space size={8}>
              <img
                src={record.iconUrl}
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
        render: (_, record) => record.name?.zh || <span style={{ color: '#999' }}>未填写</span>,
      },
      {
        title: '英文名',
        dataIndex: ['name', 'en'],
        ellipsis: true,
        search: false,
        render: (_, record) => record.name?.en || '-',
      },
      {
        title: '启用',
        dataIndex: 'isEnabled',
        width: 80,
        search: false,
        render: (_, record) => (record.isEnabled ? '是' : '否'),
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        width: 170,
        search: false,
        render: (_, record) => (record.updatedAt ? new Date(record.updatedAt).toLocaleString('zh-CN') : '-'),
      },
      {
        title: '操作',
        valueType: 'option',
        width: 120,
        render: (_, record) => (
          <Space>
            <Button
              type="link"
              onClick={() => {
                setCurrent(record);
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
      const res = await request<SyncResp>('/admin/v1/data/mistlock-instabilities/sync-invisi', {
        method: 'POST',
        body: '{}',
      });
      message.success(
        `同步完成：词缀 upsert ${res.instabilities?.upserted || 0}，轮换 upsert ${res.rotations?.upserted || 0}（跳过手动 ${res.rotations?.skippedManual || 0}）`
      );
      actionRef.current?.reload();
    } catch (error: unknown) {
      const e = { message: getErrorMessage(error, '同步失败') };
      message.error(e.message || '同步失败');
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
      message.error('JSON 必须同时包含 instabilities 和 instability_details 字段');
      return false;
    }

    setPasteLoading(true);
    try {
      const res = await request<SyncResp>('/admin/v1/data/mistlock-instabilities/sync-invisi', {
        method: 'POST',
        body: JSON.stringify(obj),
      });
      message.success(
        `更新完成：词缀 upsert ${res.instabilities?.upserted || 0}，轮换 upsert ${res.rotations?.upserted || 0}（跳过手动 ${res.rotations?.skippedManual || 0}）`
      );
      actionRef.current?.reload();
      setPasteOpen(false);
      return true;
    } catch (error: unknown) {
      const e = { message: getErrorMessage(error, '更新失败') };
      message.error(e.message || '更新失败');
      return false;
    } finally {
      setPasteLoading(false);
    }
  };

  return (
    <PageContainer
      title="碎层词缀"
      subTitle="从 Invisi 同步基础词缀数据，并在后台维护中文名、说明、小贴士和图标地址。"
      extra={[
        <Button key="sync" loading={syncLoading} type="primary" onClick={handleSync}>
          同步 Invisi
        </Button>,
        <Button key="paste" onClick={() => setPasteOpen(true)}>
          粘贴 JSON 更新
        </Button>,
      ]}
    >
      <PageNoticeAlert
        type="info"
        message="本页维护碎层词缀基础资料"
        description={(
          <div>
            <div>1. “同步 Invisi” 会更新词缀基础数据，并顺带刷新轮换表中的非手动条目。</div>
            <div>2. 本页编辑只维护后台补充字段，例如中文名、说明、小贴士、图标地址和启用状态。</div>
            <div>3. “粘贴 JSON 更新” 适合服务端无法直连上游时的离线同步，不是手工补字段入口。</div>
          </div>
        )}
        marginBottom={12}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="词缀总量" value={summary.total} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前词缀基础表中的全部条目数量。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前启用" value={summary.enabled} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前仍参与前台使用的词缀条目数量。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="图标已补全" value={summary.iconReady} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前已补充图标 URL 的词缀数量。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前视图" value={summary.currentView} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>本页当前展示的是完整词缀资料清单。</div>
          </Card>
        </Col>
      </Row>

      <ProTable<Item>
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        search={false}
        columns={columns}
        request={async () => {
          const res = await request<MistlockInstabilitiesListResp>('/admin/v1/data/mistlock-instabilities');
          setItems(res.items || []);
          return { data: res.items || [], success: true };
        }}
      />

      <ModalForm
        title={`编辑：${current?.name?.en || 'Instability'} (#${current?.idx ?? ''})`}
        open={editOpen}
        onOpenChange={setEditOpen}
        modalProps={{ destroyOnClose: true, width: 760 }}
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
        <ProFormText
          name="nameZh"
          label="中文名"
          placeholder="例如：动能蓄积"
          extra="这里只维护中文补充命名，不影响上游英文原名。"
        />
        <ProFormText
          name="iconUrl"
          label="图标 URL"
          placeholder="例如：https://你的域名/static/instabilities/xxx.png"
          extra="用于后台和前台展示；建议填写稳定的静态资源地址。"
        />
        <ProFormTextArea
          name="descZh"
          label="中文说明"
          extra="用于描述词缀核心效果，建议保持简洁、可直接给玩家阅读。"
          fieldProps={{ rows: 5 }}
        />
        <ProFormTextArea
          name="tipsZh"
          label="中文小贴士"
          extra="用于补充应对建议，不要与说明重复。"
          fieldProps={{ rows: 5 }}
        />
        <ProFormSwitch name="isEnabled" label="启用" />
      </ModalForm>

      <ModalForm
        title="粘贴 JSON 更新（离线同步）"
        open={pasteOpen}
        onOpenChange={setPasteOpen}
        modalProps={{ destroyOnClose: true, width: 840 }}
        submitter={{ submitButtonProps: { loading: pasteLoading } }}
        onFinish={handlePasteSync}
      >
        <Alert
          type="info"
          showIcon
          message="仅用于离线同步上游数据"
          description="请粘贴完整的 Invisi 词缀 JSON，且必须同时包含 instabilities 与 instability_details 两个字段。"
          style={{ marginBottom: 12 }}
        />
        <ProFormTextArea
          name="jsonText"
          label="JSON"
          fieldProps={{ rows: 14, placeholder: '粘贴完整 JSON...' }}
          rules={[{ required: true, message: '请粘贴 JSON 内容' }]}
        />
      </ModalForm>
    </PageContainer>
  );
}
