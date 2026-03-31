import {
  PageContainer,
  ProTable,
  type ProColumns,
  type ActionType,
  ModalForm,
  ProFormDatePicker,
  ProFormDigit,
  ProFormSwitch,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Alert, Button, Card, Col, Row, Space, Statistic, Tag, message } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageNoticeAlert } from '../../components/listPageState';
import { getErrorMessage, request } from '../../services/request';

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

type RotationConfig = {
  rotationOffset?: number;
  calibratedAt?: string;
};

type RotationListResp = {
  items?: Item[];
};

type SyncResp = {
  rotations?: {
    upserted?: number;
    skippedManual?: number;
  };
};

type AutoCalibrateValues = {
  date?: unknown;
  scale?: number | string;
  idx1?: number | string;
  idx2?: number | string;
  idx3?: number | string;
  dryRun?: boolean;
};

type AutoCalibrateResp = {
  rotationOffset?: number;
};

type RotationEditValues = {
  idx1?: number | string;
  idx2?: number | string;
  idx3?: number | string;
};

export default function DataMistlockRotationsPage() {
  const actionRef = useRef<ActionType>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteLoading, setPasteLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [hasFilters, setHasFilters] = useState(false);

  const [cfgLoading, setCfgLoading] = useState(false);
  const [cfg, setCfg] = useState<RotationConfig | null>(null);
  const [calibOpen, setCalibOpen] = useState(false);
  const [calibLoading, setCalibLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<Item | null>(null);

  const summary = useMemo(() => {
    const manualCount = items.filter((item) => item.source === 'manual').length;
    const invisiCount = items.filter((item) => item.source === 'invisi').length;
    const currentView = hasFilters ? '筛选中' : '完整轮换';

    return {
      total: items.length,
      manualCount,
      invisiCount,
      currentView,
    };
  }, [items, hasFilters]);

  const columns: ProColumns<Item>[] = useMemo(
    () => [
      { title: '轮换日序', dataIndex: 'rotationIndex', width: 90, valueType: 'digit' },
      { title: '层级', dataIndex: 'scale', width: 80, valueType: 'digit' },
      {
        title: '词缀（3 个）',
        dataIndex: 'instabilities',
        search: false,
        render: (_, record) => (
          <Space size={[4, 4]} wrap>
            {(record.instabilities || []).map((item) => {
              const name = item.name?.zh || item.name?.en || `#${item.idx}`;
              return (
                <Tag key={item.idx}>
                  {item.idx} {name}
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
      message.success(`同步完成：轮换 upsert ${res.rotations?.upserted || 0}（跳过手动 ${res.rotations?.skippedManual || 0}）`);
      actionRef.current?.reload();
    } catch (error: unknown) {
      const e = { message: getErrorMessage(error, '同步失败') };
      message.error(e.message || '同步失败');
    } finally {
      setSyncLoading(false);
    }
  };

  const refreshConfig = async () => {
    setCfgLoading(true);
    try {
      const res = await request<RotationConfig>('/admin/v1/data/mistlock-rotations/config');
      setCfg(res || null);
    } catch {
      setCfg(null);
    } finally {
      setCfgLoading(false);
    }
  };

  useEffect(() => {
    void refreshConfig();
  }, []);

  const handleAutoCalibrate = async (values: AutoCalibrateValues) => {
    const date = values?.date;
    const scale = Number(values?.scale);
    const instabilities = [values?.idx1, values?.idx2, values?.idx3].map((value) => Number(value));
    const dryRun = !!values?.dryRun;

    if (!date) {
      message.error('请选择日期');
      return false;
    }
    if (!Number.isFinite(scale) || scale <= 0) {
      message.error('请输入正确的层数（scale）');
      return false;
    }
    if (instabilities.some((value) => !Number.isFinite(value))) {
      message.error('请填写 3 个词缀 idx');
      return false;
    }

    setCalibLoading(true);
    try {
      const res = await request<AutoCalibrateResp>('/admin/v1/data/mistlock-rotations/auto-calibrate', {
        method: 'POST',
        body: JSON.stringify({ date, scale, instabilities, dryRun }),
      });
      const offset = res?.rotationOffset;
      if (dryRun) {
        message.success(`试算成功：rotationOffset=${offset}（未写入）`);
      } else {
        message.success(`校准成功：rotationOffset=${offset}（已写入）`);
        await refreshConfig();
        actionRef.current?.reload();
      }
      setCalibOpen(false);
      return true;
    } catch (error: unknown) {
      const e = { message: getErrorMessage(error, '校准失败') };
      message.error(e.message || '校准失败');
      return false;
    } finally {
      setCalibLoading(false);
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
      message.success(`更新完成：轮换 upsert ${res.rotations?.upserted || 0}（跳过手动 ${res.rotations?.skippedManual || 0}）`);
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
      title="碎层词缀轮换（15 天）"
      subTitle="支持手动覆盖轮换条目；同步 Invisi 时会自动跳过 source=manual 的记录。"
      extra={[
        <Button key="sync" loading={syncLoading} type="primary" onClick={handleSync}>
          同步 Invisi
        </Button>,
        <Button key="paste" onClick={() => setPasteOpen(true)}>
          粘贴 JSON 更新
        </Button>,
        <Button key="calib" onClick={() => setCalibOpen(true)}>
          自动校准
        </Button>,
      ]}
    >
      <PageNoticeAlert
        type="info"
        message="本页维护碎层词缀轮换表"
        description={(
          <div>
            <div>1. 同步 Invisi 只会刷新上游轮换结果，已经手动覆盖的条目会按 source=manual 保留。</div>
            <div>2. 自动校准用于根据某天某层的 3 个词缀反推 rotationOffset，适合轮换偏移核对。</div>
            <div>3. 粘贴 JSON 更新适合离线同步上游数据，不适合作为手工编辑入口。</div>
          </div>
        )}
        marginBottom={12}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前页条目数" value={summary.total} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前查询结果对应的轮换条目数量。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="手动覆盖" value={summary.manualCount} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前页中 source=manual 的轮换条目数量。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="rotationOffset" value={cfgLoading ? '加载中' : String(cfg?.rotationOffset ?? 0)} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>
              上次校准：{cfg?.calibratedAt ? new Date(cfg.calibratedAt).toLocaleString('zh-CN') : '未校准'}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前视图" value={summary.currentView} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>
              invisi 条目 {summary.invisiCount} 个；筛选条件会直接影响当前结果。
            </div>
          </Card>
        </Col>
      </Row>

      <ProTable<Item>
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        columns={columns}
        request={async (params) => {
          const qs = new URLSearchParams();
          if (params?.rotationIndex !== undefined && params.rotationIndex !== '') qs.set('rotationIndex', String(params.rotationIndex));
          if (params?.scale !== undefined && params.scale !== '') qs.set('scale', String(params.scale));
          setHasFilters(Boolean(params?.rotationIndex !== undefined && params.rotationIndex !== '' || params?.scale !== undefined && params.scale !== ''));

          const url = `/admin/v1/data/mistlock-rotations${qs.toString() ? `?${qs.toString()}` : ''}`;
          const res = await request<RotationListResp>(url);
          setItems(res.items || []);
          return { data: res.items || [], success: true };
        }}
      />

      <ModalForm
        title="自动校准 rotationOffset"
        open={calibOpen}
        onOpenChange={setCalibOpen}
        modalProps={{ destroyOnClose: true, width: 720 }}
        submitter={{ submitButtonProps: { loading: calibLoading } }}
        onFinish={handleAutoCalibrate}
      >
        <Alert
          type="info"
          showIcon
          message="按已知轮换结果反推偏移量"
          description="请填写游戏内同一天、同一层的 3 个词缀 idx。建议优先使用 95-100 层的数据做校准。"
          style={{ marginBottom: 12 }}
        />
        <ProFormDatePicker name="date" label="日期" rules={[{ required: true }]} fieldProps={{ style: { width: '100%' } }} />
        <ProFormDigit name="scale" label="层数（scale）" rules={[{ required: true }]} min={1} />
        <ProFormDigit name="idx1" label="词缀 idx 1" rules={[{ required: true }]} />
        <ProFormDigit name="idx2" label="词缀 idx 2" rules={[{ required: true }]} />
        <ProFormDigit name="idx3" label="词缀 idx 3" rules={[{ required: true }]} />
        <ProFormSwitch name="dryRun" label="仅试算（不写入）" />
      </ModalForm>

      <ModalForm
        title={`编辑轮换：Day ${current?.rotationIndex ?? ''} / Scale ${current?.scale ?? ''}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        modalProps={{ destroyOnClose: true, width: 680 }}
        initialValues={{
          idx1: current?.instabilities?.[0]?.idx,
          idx2: current?.instabilities?.[1]?.idx,
          idx3: current?.instabilities?.[2]?.idx,
        }}
        onFinish={async (values: RotationEditValues) => {
          if (!current) return false;
          const instabilities = [values.idx1, values.idx2, values.idx3].map((value) => Number(value));
          await request(`/admin/v1/data/mistlock-rotations/items/${current._id}`, {
            method: 'PUT',
            body: JSON.stringify({ instabilities }),
          });
          message.success('已覆盖保存（manual）');
          actionRef.current?.reload();
          return true;
        }}
      >
        <Alert
          type="warning"
          showIcon
          message="保存后该条轮换会标记为 manual"
          description="后续同步 Invisi 时，这条记录会被跳过，直到你再次手工修改或重建数据。"
          style={{ marginBottom: 12 }}
        />
        <ProFormDigit name="idx1" label="词缀 idx 1" rules={[{ required: true }]} />
        <ProFormDigit name="idx2" label="词缀 idx 2" rules={[{ required: true }]} />
        <ProFormDigit name="idx3" label="词缀 idx 3" rules={[{ required: true }]} />
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
          message="仅用于离线同步上游轮换数据"
          description="请粘贴完整的 Invisi JSON，且必须同时包含 instabilities 与 instability_details 字段。"
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
