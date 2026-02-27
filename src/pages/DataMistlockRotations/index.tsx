import {
  PageContainer,
  ProTable,
  type ProColumns,
  type ActionType,
  ModalForm,
  ProFormDigit,
  ProFormDatePicker,
  ProFormSwitch,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Button, message, Space, Tag, Typography } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteLoading, setPasteLoading] = useState(false);

  const [cfgLoading, setCfgLoading] = useState(false);
  const [cfg, setCfg] = useState<{ rotationOffset?: number; calibratedAt?: string } | null>(null);
  const [calibOpen, setCalibOpen] = useState(false);
  const [calibLoading, setCalibLoading] = useState(false);

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
      // 兼容后端 body 校验：显式发空对象
      const res = await request('/admin/v1/data/mistlock-instabilities/sync-invisi', { method: 'POST', body: '{}' });
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

  const refreshConfig = async () => {
    setCfgLoading(true);
    try {
      const res = await request('/admin/v1/data/mistlock-rotations/config');
      setCfg(res || null);
    } catch {
      setCfg(null);
    } finally {
      setCfgLoading(false);
    }
  };

  useEffect(() => {
    refreshConfig();
  }, []);

  const handleAutoCalibrate = async (values: any) => {
    const date = values?.date;
    const scale = Number(values?.scale);
    const instabilities = [values?.idx1, values?.idx2, values?.idx3].map((x) => Number(x));
    const dryRun = !!values?.dryRun;

    if (!date) {
      message.error('请选择日期');
      return false;
    }
    if (!Number.isFinite(scale) || scale <= 0) {
      message.error('请输入正确的层数（scale）');
      return false;
    }
    if (instabilities.some((x) => !Number.isFinite(x))) {
      message.error('请填写 3 个异变 idx');
      return false;
    }

    setCalibLoading(true);
    try {
      const res = await request('/admin/v1/data/mistlock-rotations/auto-calibrate', {
        method: 'POST',
        body: JSON.stringify({ date, scale, instabilities, dryRun }),
      });
      const off = res?.rotationOffset;
      if (dryRun) {
        message.success(`试算成功：rotationOffset=${off}（未写入）`);
      } else {
        message.success(`校准成功：rotationOffset=${off}（已写入）`);
        await refreshConfig();
        actionRef.current?.reload();
      }
      setCalibOpen(false);
      return true;
    } catch (e: any) {
      message.error(e?.message || '校准失败');
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
    let obj: any;
    try {
      obj = JSON.parse(jsonText);
    } catch {
      message.error('JSON 解析失败，请检查格式是否正确');
      return false;
    }
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      message.error('JSON 顶层必须是对象');
      return false;
    }
    const hasInstabilities = Object.prototype.hasOwnProperty.call(obj, 'instabilities');
    const hasDetails = Object.prototype.hasOwnProperty.call(obj, 'instability_details');
    if (!hasInstabilities || !hasDetails) {
      message.error('JSON 必须包含 instabilities 和 instability_details 两个字段');
      return false;
    }

    setPasteLoading(true);
    try {
      const res = await request('/admin/v1/data/mistlock-instabilities/sync-invisi', {
        method: 'POST',
        body: JSON.stringify(obj),
      });
      message.success(
        `更新完成：轮换 upsert ${res.rotations?.upserted || 0}（跳过手工 ${res.rotations?.skippedManual || 0}）`
      );
      actionRef.current?.reload();
      setPasteOpen(false);
      return true;
    } catch (e: any) {
      message.error(e?.message || '更新失败');
      return false;
    } finally {
      setPasteLoading(false);
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
        <Button key="paste" onClick={() => setPasteOpen(true)}>
          粘贴 JSON 更新
        </Button>,
        <Button key="calib" onClick={() => setCalibOpen(true)}>
          自动校准
        </Button>,
      ]}
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        当前 rotationOffset：{' '}
        <Typography.Text strong>{cfgLoading ? '加载中...' : String(cfg?.rotationOffset ?? 0)}</Typography.Text>
        {cfg?.calibratedAt ? <>（上次校准：{new Date(cfg.calibratedAt).toLocaleString()}）</> : null}
      </Typography.Paragraph>

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
        title="自动校准 rotationOffset"
        open={calibOpen}
        onOpenChange={setCalibOpen}
        modalProps={{ destroyOnClose: true }}
        submitter={{ submitButtonProps: { loading: calibLoading } }}
        onFinish={handleAutoCalibrate}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          请输入「游戏内当日」某层（scale）的 3 个异变 idx；系统会自动推导 rotationOffset。
          建议用 95-100 的数据做校准。
        </Typography.Paragraph>
        <ProFormDatePicker name="date" label="日期" rules={[{ required: true }]} fieldProps={{ style: { width: '100%' } }} />
        <ProFormDigit name="scale" label="层数（scale）" rules={[{ required: true }]} min={1} />
        <ProFormDigit name="idx1" label="异变 idx 1" rules={[{ required: true }]} />
        <ProFormDigit name="idx2" label="异变 idx 2" rules={[{ required: true }]} />
        <ProFormDigit name="idx3" label="异变 idx 3" rules={[{ required: true }]} />
        <ProFormSwitch name="dryRun" label="仅试算（不写入）" />
      </ModalForm>

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
