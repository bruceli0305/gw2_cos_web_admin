import {
  PageContainer,
  ProTable,
  type ProColumns,
  type ActionType,
  ModalForm,
  ProFormText,
  ProFormSwitch,
  ProFormSelect,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Alert, Button, Card, Col, Popconfirm, Row, Space, Statistic, Tag, message } from 'antd';
import { useRef, useState } from 'react';
import { PageNoticeAlert, PageRequestErrorAlert } from '../../components/listPageState';
import { getFilterAwareTableProps } from '../../components/tableState';
import { getErrorMessage, request } from '../../services/request';

type Item = {
  _id: string;
  name: string;
  url: string;
  description: string;
  kind?: string;
  badge?: string;
  icon?: string;
  hot: boolean;
  tags: string[];
  updatedAt: string;
};

type RecommendedListParams = {
  current?: number;
  pageSize?: number;
  q?: string;
};

type RecommendedListResp = {
  items: Item[];
  total: number;
};

type RecommendedImportResp = {
  itemsInserted: number;
  skipped: number;
};

export default function DataResourcesRecommendedPage() {
  const actionRef = useRef<ActionType>(null);
  const [importOpen, setImportOpen] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<Item | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearch, setHasSearch] = useState(false);
  const [summary, setSummary] = useState({
    total: 0,
    hotCount: 0,
    kindCount: 0,
    currentView: '全部推荐',
  });
  const tableState = getFilterAwareTableProps({
    hasFilters: hasSearch,
    searchText: '搜索推荐资源',
    filteredEmptyText: '当前搜索条件下没有匹配的推荐资源。',
    emptyText: '当前还没有添加任何推荐资源。',
  });

  const columns: ProColumns<Item>[] = [
    { title: '关键词', dataIndex: 'q', hideInTable: true },

    { title: '名称', dataIndex: 'name', ellipsis: true },
    { title: '链接', dataIndex: 'url', ellipsis: true, copyable: true },
    { title: '类型', dataIndex: 'kind', width: 120, search: false },
    { title: '徽章', dataIndex: 'badge', width: 120, search: false },
    {
      title: '热门',
      dataIndex: 'hot',
      width: 80,
      search: false,
      render: (_, r) => (r.hot ? <Tag color="gold">热门</Tag> : '-'),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      search: false,
      render: (_, r) => (
        <Space wrap>
          {(r.tags || []).slice(0, 6).map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </Space>
      ),
    },
    { title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime', width: 170, search: false },

    {
      title: '操作',
      valueType: 'option',
      width: 200,
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

          <Popconfirm
            title="确定删除该条推荐资源？"
            description="删除后前台推荐位将失去这条资源卡片入口。"
            onConfirm={async () => {
              await request(`/admin/v1/data/resources-recommended/items/${r._id}`, { method: 'DELETE' });
              message.success('已删除');
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
      title="推荐资源"
      subTitle="维护前台推荐资源卡片，支持单条新增 / 编辑 / 删除和 JSON 覆盖导入。"
      extra={[
        <Button key="create" type="primary" onClick={() => setCreateOpen(true)}>
          新增资源
        </Button>,
        <Button key="import" onClick={() => setImportOpen(true)}>
          导入（覆盖）
        </Button>,
      ]}
    >
      <PageNoticeAlert
        type="info"
        message="本页维护前台推荐资源卡片"
        description={(
          <div>
            <div>1. 这里维护的是前台推荐资源区块，不是完整资源黄页目录。</div>
            <div>2. 单条新增 / 编辑适合推荐位小修；JSON 导入适合整包替换当前推荐基线。</div>
            <div>3. 删除或覆盖导入会直接影响前台推荐资源展示顺序与内容。</div>
          </div>
        )}
        marginBottom={12}
      />

      <PageRequestErrorAlert
        message="无法加载推荐资源"
        description={errorMessage}
        onRetry={() => actionRef.current?.reload()}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="推荐总量" value={summary.total} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前查询结果对应的推荐资源总数。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="热门条目" value={summary.hotCount} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前查询结果中被标记为热门的资源数量。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="资源类型" value={summary.kindCount} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前页推荐资源覆盖的类型数量。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前视图" value={summary.currentView} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>搜索关键字会直接影响当前推荐资源结果。</div>
          </Card>
        </Col>
      </Row>

      <ProTable<Item>
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        columns={columns}
        {...tableState}
        request={async (params) => {
          const { current, pageSize, q } = params as RecommendedListParams;
          setHasSearch(Boolean(q));

          try {
            const res = await request<RecommendedListResp>('/admin/v1/data/resources-recommended/items', {
              params: {
                page: current || 1,
                limit: pageSize || 20,
                q: q || '',
              },
            });
            setSummary({
              total: res.total,
              hotCount: res.items.filter((item) => item.hot).length,
              kindCount: new Set(res.items.map((item) => item.kind).filter(Boolean)).size,
              currentView: q ? '筛选中' : '全部推荐',
            });
            setErrorMessage(null);
            return { data: res.items, total: res.total, success: true };
          } catch (error: unknown) {
            setErrorMessage(getErrorMessage(error, '加载推荐资源失败'));
            throw error;
          }
        }}
      />

      {/* 新增 */}
      <ModalForm
        title="新增推荐资源"
        open={createOpen}
        onOpenChange={setCreateOpen}
        modalProps={{ destroyOnHidden: true, width: 760 }}
        onFinish={async (values) => {
          await request('/admin/v1/data/resources-recommended/items', {
            method: 'POST',
            body: JSON.stringify({
              name: values.name,
              url: values.url,
              description: values.description || '',
              kind: values.kind || '',
              badge: values.badge || '',
              icon: values.icon || '',
              hot: !!values.hot,
              tags: values.tags || [],
            }),
          });
          message.success('创建成功');
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText name="name" label="名称" rules={[{ required: true }]} />
        <ProFormText name="url" label="URL" rules={[{ required: true }]} />
        <ProFormTextArea
          name="description"
          label="描述"
          extra="用于前台卡片简介，建议保持一两句可快速理解的说明。"
          fieldProps={{ rows: 3 }}
        />
        <ProFormText name="kind" label="类型（kind）" fieldProps={{ placeholder: '例如：build / wiki / tool / guide' }} />
        <ProFormText name="badge" label="徽章（badge）" fieldProps={{ placeholder: '例如：官方 / 社区精选 / 常用' }} />
        <ProFormText name="icon" label="图标（icon）" fieldProps={{ placeholder: '填写图标标识或静态资源名' }} />
        <ProFormSwitch name="hot" label="热门（hot）" />
        <ProFormSelect
          name="tags"
          label="标签"
          mode="tags"
          extra="标签用于前台展示与后台筛选，建议使用短词并保持稳定命名。"
          fieldProps={{ tokenSeparators: [',', '，', ' '] }}
        />
      </ModalForm>

      {/* 编辑 */}
      <ModalForm
        title={`编辑：${current?.name || ''}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        modalProps={{ destroyOnHidden: true, width: 760 }}
        initialValues={{
          name: current?.name,
          url: current?.url,
          description: current?.description,
          kind: current?.kind,
          badge: current?.badge,
          icon: current?.icon,
          hot: current?.hot,
          tags: current?.tags || [],
        }}
        onFinish={async (values) => {
          if (!current) return false;
          await request(`/admin/v1/data/resources-recommended/items/${current._id}`, {
            method: 'PUT',
            body: JSON.stringify({
              name: values.name,
              url: values.url,
              description: values.description || '',
              kind: values.kind || '',
              badge: values.badge || '',
              icon: values.icon || '',
              hot: !!values.hot,
              tags: values.tags || [],
            }),
          });
          message.success('更新成功');
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText name="name" label="名称" rules={[{ required: true }]} />
        <ProFormText name="url" label="URL" rules={[{ required: true }]} />
        <ProFormTextArea
          name="description"
          label="描述"
          extra="用于前台卡片简介，建议保持一两句可快速理解的说明。"
          fieldProps={{ rows: 3 }}
        />
        <ProFormText name="kind" label="类型（kind）" fieldProps={{ placeholder: '例如：build / wiki / tool / guide' }} />
        <ProFormText name="badge" label="徽章（badge）" fieldProps={{ placeholder: '例如：官方 / 社区精选 / 常用' }} />
        <ProFormText name="icon" label="图标（icon）" fieldProps={{ placeholder: '填写图标标识或静态资源名' }} />
        <ProFormSwitch name="hot" label="热门（hot）" />
        <ProFormSelect
          name="tags"
          label="标签"
          mode="tags"
          extra="修改标签会直接影响前台展示和后台搜索结果。"
          fieldProps={{ tokenSeparators: [',', '，', ' '] }}
        />
      </ModalForm>

      {/* 导入 */}
      <ModalForm
        title="导入推荐资源（JSON，覆盖全量）"
        open={importOpen}
        onOpenChange={setImportOpen}
        modalProps={{ destroyOnHidden: true, width: 780 }}
        onFinish={async (values) => {
          try {
            const json = JSON.parse(values.jsonText || '');
            const res = await request<RecommendedImportResp>('/admin/v1/data/resources-recommended/import', {
              method: 'POST',
              body: JSON.stringify(json),
            });
            message.success(`导入成功：写入 ${res.itemsInserted} 条，跳过 ${res.skipped} 条`);
            actionRef.current?.reload();
            return true;
          } catch (error: unknown) {
            const e = { message: getErrorMessage(error, 'JSON 导入失败') };
            message.error(e?.message || 'JSON 解析或导入失败');
            return false;
          }
        }}
      >
        <Alert
          type="warning"
          showIcon
          title="覆盖导入会替换当前推荐资源清单"
          description="仅在你确认整包推荐资源 JSON 已完整覆盖当前前台推荐位时使用。零散修改建议优先使用单条编辑。"
          style={{ marginBottom: 12 }}
        />
        <ProFormTextArea
          name="jsonText"
          label="JSON 内容"
          placeholder='粘贴 JSON（包含 items 数组）。'
          extra="导入前请确认名称、链接、标签、热门标记和排序语义已经与前台推荐位一致。"
          fieldProps={{ rows: 14 }}
          rules={[{ required: true, message: '请粘贴 JSON 内容' }]}
        />
      </ModalForm>
    </PageContainer>
  );
}
