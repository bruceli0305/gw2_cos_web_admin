import {
  PageContainer,
  ProTable,
  type ProColumns,
  type ActionType,
  ModalForm,
  ProFormDigit,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Alert, Button, Card, Col, Popconfirm, Row, Space, Statistic, message } from 'antd';
import { useMemo, useRef, useState } from 'react';
import { PageNoticeAlert } from '../../components/listPageState';
import { getErrorMessage, request } from '../../services/request';

type Item = {
  _id: string;
  scale: number;
  id: number;
  name: string;
};

type FractalDailiesListResp = {
  items: Item[];
};

type FractalDailiesImportResp = {
  itemsInserted: number;
  skipped: number;
};

export default function DataFractalDailiesPage() {
  const actionRef = useRef<ActionType>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<Item | null>(null);

  const summary = useMemo(() => {
    if (!items.length) {
      return {
        total: 0,
        uniqueScales: 0,
        scaleRange: '-',
        currentView: '全部日常',
      };
    }

    const scales = items.map((item) => item.scale).filter((scale) => typeof scale === 'number');
    const minScale = Math.min(...scales);
    const maxScale = Math.max(...scales);

    return {
      total: items.length,
      uniqueScales: new Set(scales).size,
      scaleRange: `${minScale} - ${maxScale}`,
      currentView: '全部日常',
    };
  }, [items]);

  const columns: ProColumns<Item>[] = [
    { title: '层级', dataIndex: 'scale', width: 90, search: false },
    { title: '成就 ID', dataIndex: 'id', width: 110, search: false },
    { title: '名称', dataIndex: 'name', ellipsis: true, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 200,
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

          <Popconfirm
            title="确定删除这条碎层日常吗？"
            description="删除后这条层级与成就 ID 的映射会立即失效。"
            onConfirm={async () => {
              await request(`/admin/v1/data/fractal-dailies/items/${record._id}`, { method: 'DELETE' });
              message.success('条目已删除');
              actionRef.current?.reload();
            }}
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="碎层日常"
      subTitle="维护碎层日常成就映射，支持单条新增 / 编辑 / 删除和 JSON 覆盖导入。"
      extra={[
        <Button key="create" type="primary" onClick={() => setCreateOpen(true)}>
          新增
        </Button>,
        <Button key="import" onClick={() => setImportOpen(true)}>
          导入（覆盖）
        </Button>,
      ]}
    >
      <PageNoticeAlert
        type="info"
        message="本页维护碎层日常成就映射"
        description={(
          <div>
            <div>1. 表格中的每一条记录都对应一个碎层层级与成就 ID 的映射关系。</div>
            <div>2. 单条新增 / 编辑适合日常小修，JSON 导入适合整包替换当前基线。</div>
            <div>3. 导入前请确认 JSON 内容已覆盖你希望保留的全部日常条目。</div>
          </div>
        )}
        marginBottom={12}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="日常条目数" value={summary.total} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前碎层日常映射表中的条目总数。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="覆盖层级" value={summary.uniqueScales} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前列表覆盖的碎层层级数量。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="层级区间" value={summary.scaleRange} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>帮助快速判断当前映射表是否覆盖目标层级段。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前视图" value={summary.currentView} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>本页当前展示的是完整碎层日常映射清单。</div>
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
          const res = await request<FractalDailiesListResp>('/admin/v1/data/fractal-dailies');
          setItems(res.items);
          return { data: res.items, success: true };
        }}
      />

      <ModalForm
        title="新增碎层日常"
        open={createOpen}
        onOpenChange={setCreateOpen}
        modalProps={{ destroyOnClose: true, width: 680 }}
        onFinish={async (values) => {
          await request('/admin/v1/data/fractal-dailies/items', {
            method: 'POST',
            body: JSON.stringify({
              scale: values.scale,
              id: values.id,
              name: values.name,
            }),
          });
          message.success('创建成功');
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormDigit
          name="scale"
          label="层级（scale）"
          extra="填写碎层层级数字，保持与前台和数据源中的 scale 语义一致。"
          rules={[{ required: true }]}
        />
        <ProFormDigit
          name="id"
          label="成就 ID（id）"
          extra="这里填写 GW2 成就 ID，用于日常条目和成就数据之间的准确映射。"
          rules={[{ required: true }]}
        />
        <ProFormText name="name" label="名称" rules={[{ required: true }]} />
      </ModalForm>

      <ModalForm
        title={`编辑：${current?.name || ''}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        modalProps={{ destroyOnClose: true, width: 680 }}
        initialValues={{
          scale: current?.scale,
          id: current?.id,
          name: current?.name,
        }}
        onFinish={async (values) => {
          if (!current) return false;
          await request(`/admin/v1/data/fractal-dailies/items/${current._id}`, {
            method: 'PUT',
            body: JSON.stringify({
              scale: values.scale,
              id: values.id,
              name: values.name,
            }),
          });
          message.success('更新成功');
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormDigit
          name="scale"
          label="层级（scale）"
          extra="修改层级会直接改变这条日常在映射表中的位置。"
          rules={[{ required: true }]}
        />
        <ProFormDigit
          name="id"
          label="成就 ID（id）"
          extra="请确认成就 ID 与目标碎层日常一一对应，避免前台映射到错误成就。"
          rules={[{ required: true }]}
        />
        <ProFormText name="name" label="名称" rules={[{ required: true }]} />
      </ModalForm>

      <ModalForm
        title="导入碎层日常（JSON，覆盖全量）"
        open={importOpen}
        onOpenChange={setImportOpen}
        modalProps={{ destroyOnClose: true, width: 760 }}
        onFinish={async (values) => {
          try {
            const json = JSON.parse(values.jsonText || '');
            const res = await request<FractalDailiesImportResp>('/admin/v1/data/fractal-dailies/import', {
              method: 'POST',
              body: JSON.stringify(json),
            });
            message.success(`导入成功：写入 ${res.itemsInserted} 条，跳过 ${res.skipped} 条`);
            actionRef.current?.reload();
            return true;
          } catch (error: unknown) {
            const e = { message: getErrorMessage(error, 'JSON 导入失败') };
            message.error(e.message || 'JSON 解析或导入失败');
            return false;
          }
        }}
      >
        <Alert
          type="warning"
          showIcon
          message="覆盖导入会替换当前碎层日常映射"
          description="请仅在你确认整包 JSON 已覆盖全部有效日常条目时使用。零散修订建议优先使用新增或编辑。"
          style={{ marginBottom: 12 }}
        />
        <ProFormTextArea
          name="jsonText"
          label="JSON 内容"
          placeholder='粘贴 JSON：可以是数组 []，也可以是 { "items": [] }'
          extra="导入前请确认 JSON 中的 scale、id、name 都已对齐当前碎层日常基线。"
          fieldProps={{ rows: 14 }}
          rules={[{ required: true, message: '请先粘贴 JSON 内容' }]}
        />
      </ModalForm>
    </PageContainer>
  );
}
