import {
  PageContainer,
  ProTable,
  type ProColumns,
  type ActionType,
  ModalForm,
  ProFormText,
  ProFormTextArea,
  ProFormSelect,
} from '@ant-design/pro-components';
import { Button, Card, Col, Popconfirm, Row, Space, Statistic, Tag, message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getDestructivePopconfirmProps } from '../../components/confirmProps';
import { PageNoticeAlert, PageRequestErrorAlert } from '../../components/listPageState';
import { getFilterAwareTableProps } from '../../components/tableState';
import { runSafeFollowUp } from '../../services/followUp';
import { getErrorMessage, request } from '../../services/request';

type Overview = {
  generated_at_utc?: string;
  total_count: number;
  categories: { name: string; count: number }[];
};

type Item = {
  _id: string;
  externalId?: number;
  name: string;
  url: string;
  description: string;
  descriptionEn?: string;
  tags: string[];
  categoryName: string;
  languageHint?: string;
  regionHint?: string;
  source?: string;
  status?: string;
  notes?: string;
  updatedAt: string;
};

type CategoryValueEnum = Record<string, { text: string }>;

type TableRequestParams = {
  current?: number;
  pageSize?: number;
  q?: string;
  category?: string;
  tag?: string;
};

type DirectoryListResponse = {
  items: Item[];
  total: number;
};

type ImportResponse = {
  categoriesInserted: number;
  itemsInserted: number;
  skipped: number;
};

export default function DataResourcesDirectoryPage() {
  const actionRef = useRef<ActionType>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewErrorMessage, setOverviewErrorMessage] = useState<string | null>(null);
  const [tableErrorMessage, setTableErrorMessage] = useState<string | null>(null);
  const [hasFilters, setHasFilters] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<Item | null>(null);

  const tableState = getFilterAwareTableProps({
    hasFilters,
    searchText: '应用筛选',
    filteredEmptyText: '没有匹配当前筛选条件的资源条目。',
    emptyText: '当前还没有录入任何资源黄页条目。',
  });

  const fetchOverview = useCallback(async () => {
    return request<Overview>('/admin/v1/data/resources-directory/overview');
  }, []);

  const reloadOverview = useCallback(async () => {
    const res = await fetchOverview();
    setOverview(res);
    setOverviewErrorMessage(null);
    return res;
  }, [fetchOverview]);

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      try {
        const res = await fetchOverview();
        if (!active) return;
        setOverview(res);
        setOverviewErrorMessage(null);
      } catch (error: unknown) {
        if (active) {
          setOverviewErrorMessage(getErrorMessage(error, '加载资源黄页概览失败'));
        }
      }
    }

    void loadOverview();
    return () => {
      active = false;
    };
  }, [fetchOverview]);

  const categoryEnum = useMemo(() => {
    const out: CategoryValueEnum = {};
    for (const category of overview?.categories || []) {
      out[category.name] = { text: `${category.name} (${category.count})` };
    }
    return out;
  }, [overview]);

  const categoryOptions = useMemo(
    () => (overview?.categories || []).map((category) => ({ label: category.name, value: category.name })),
    [overview]
  );
  const largestCategory = useMemo(() => {
    if (!overview?.categories?.length) return null;
    return [...overview.categories].sort((a, b) => b.count - a.count)[0];
  }, [overview]);

  const columns: ProColumns<Item>[] = [
    { title: '关键词', dataIndex: 'q', hideInTable: true },
    {
      title: '分类',
      dataIndex: 'category',
      hideInTable: true,
      valueType: 'select',
      valueEnum: categoryEnum,
    },
    { title: '标签', dataIndex: 'tag', hideInTable: true },
    { title: '名称', dataIndex: 'name', ellipsis: true, copyable: true },
    { title: 'URL', dataIndex: 'url', ellipsis: true, copyable: true },
    { title: '分类', dataIndex: 'categoryName', width: 160, search: false },
    {
      title: '标签',
      dataIndex: 'tags',
      search: false,
      render: (_, record) => (
        <Space wrap>
          {(record.tags || []).slice(0, 6).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </Space>
      ),
    },
    { title: '描述', dataIndex: 'description', ellipsis: true, search: false },
    { title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime', width: 170, search: false },
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
            {...getDestructivePopconfirmProps({
              title: '确定删除这条资源目录记录吗？',
              description: '这会从资源黄页中移除当前条目，删除后无法恢复。',
            })}
            onConfirm={async () => {
              await request(`/admin/v1/data/resources-directory/items/${record._id}`, { method: 'DELETE' });
              message.success('条目已删除');
              await runSafeFollowUp(reloadOverview);
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
      title="资源黄页"
      subTitle="管理精选资源条目，并支持使用 JSON 对目录进行全量导入。"
      content={
        <div style={{ color: '#666' }}>
          条目总量：{overview?.total_count ?? '-'} | 生成时间（UTC）：{overview?.generated_at_utc ?? '-'}
        </div>
      }
      extra={[
        <Button key="create" type="primary" onClick={() => setCreateOpen(true)}>
          新建条目
        </Button>,
        <Button key="import" onClick={() => setImportOpen(true)}>
          导入 JSON（全量替换）
        </Button>,
      ]}
    >
      <PageRequestErrorAlert
        message="无法加载资源黄页概览"
        description={overviewErrorMessage}
        onRetry={() => void reloadOverview().catch(() => undefined)}
      />

      <PageNoticeAlert
        type="info"
        message="本页维护公开资源目录"
        description={(
          <div>
            <div>1. 这里维护的是资源黄页目录本身，支持单条编辑和整包 JSON 全量导入。</div>
            <div>2. 顶部摘要会展示目录总量、分类规模、当前最大分类和当前视图状态。</div>
            <div>3. 导入 JSON 会执行全量替换，适合目录基线重建，不适合零散热修。</div>
          </div>
        )}
        marginBottom={12}
      />

      <PageRequestErrorAlert
        message="无法加载资源黄页条目"
        description={tableErrorMessage}
        onRetry={() => actionRef.current?.reload()}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="目录总量" value={overview?.total_count ?? '-'} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前资源黄页目录中的公开条目总数。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="分类数量" value={overview?.categories?.length ?? '-'} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前目录已建立的资源分类数量。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="最大分类" value={largestCategory ? `${largestCategory.name} / ${largestCategory.count}` : '-'} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>帮助快速识别当前目录里条目最集中的资源分类。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前视图" value={hasFilters ? '筛选中' : '全部目录'} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>搜索、分类和标签筛选都会直接影响下方目录结果。</div>
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
          const query = params as TableRequestParams;
          setHasFilters(Boolean(query.q || query.category || query.tag));

          try {
            const res = await request<DirectoryListResponse>('/admin/v1/data/resources-directory/items', {
              params: {
                page: query.current || 1,
                limit: query.pageSize || 20,
                q: query.q || '',
                category: query.category || '',
                tag: query.tag || '',
              },
            });
            setTableErrorMessage(null);
            return { data: res.items, total: res.total, success: true };
          } catch (error: unknown) {
            setTableErrorMessage(getErrorMessage(error, '加载资源黄页条目失败'));
            throw error;
          }
        }}
      />

      <ModalForm
        title="新建资源条目"
        open={createOpen}
        onOpenChange={setCreateOpen}
        modalProps={{ destroyOnHidden: true, width: 760 }}
        onFinish={async (values) => {
          await request('/admin/v1/data/resources-directory/items', {
            method: 'POST',
            body: JSON.stringify({
              name: values.name,
              url: values.url,
              description: values.description || '',
              descriptionEn: values.descriptionEn || '',
              categoryName: values.categoryName || '',
              tags: values.tags || [],
              languageHint: values.languageHint || '',
              regionHint: values.regionHint || '',
              source: values.source || '',
              status: values.status || '',
              notes: values.notes || '',
            }),
          });
          message.success('条目已创建');
          await runSafeFollowUp(reloadOverview);
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText name="name" label="名称" rules={[{ required: true }]} />
        <ProFormText name="url" label="URL" rules={[{ required: true }]} />
        <ProFormSelect
          name="categoryName"
          label="分类"
          options={categoryOptions}
          placeholder="输入新分类，或选择已有分类"
          extra="分类用于目录归档；新建条目时可直接输入新分类，编辑时会影响现有归档。"
          fieldProps={{ showSearch: true, allowClear: true }}
        />
        <ProFormSelect
          name="tags"
          label="标签"
          mode="tags"
          extra="标签用于搜索和前台展示，建议保持短词、可复用，并避免同义词漂移。"
          fieldProps={{ tokenSeparators: [',', '\uFF0C', ' '] }}
        />
        <ProFormTextArea name="description" label="描述" fieldProps={{ rows: 3 }} />
        <ProFormTextArea name="descriptionEn" label="英文描述（可选）" fieldProps={{ rows: 2 }} />
        <ProFormText name="languageHint" label="语言提示（可选）" />
        <ProFormText name="regionHint" label="地区提示（可选）" />
        <ProFormText name="source" label="来源（可选）" />
        <ProFormText name="status" label="状态（可选）" />
        <ProFormTextArea name="notes" label="备注（可选）" fieldProps={{ rows: 2 }} />
      </ModalForm>

      <ModalForm
        title={`编辑条目：${current?.name || ''}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        modalProps={{ destroyOnHidden: true, width: 760 }}
        initialValues={{
          name: current?.name,
          url: current?.url,
          description: current?.description,
          descriptionEn: current?.descriptionEn,
          categoryName: current?.categoryName,
          tags: current?.tags || [],
          languageHint: current?.languageHint,
          regionHint: current?.regionHint,
          source: current?.source,
          status: current?.status,
          notes: current?.notes,
        }}
        onFinish={async (values) => {
          if (!current) return false;
          await request(`/admin/v1/data/resources-directory/items/${current._id}`, {
            method: 'PUT',
            body: JSON.stringify({
              name: values.name,
              url: values.url,
              description: values.description || '',
              descriptionEn: values.descriptionEn || '',
              categoryName: values.categoryName || '',
              tags: values.tags || [],
              languageHint: values.languageHint || '',
              regionHint: values.regionHint || '',
              source: values.source || '',
              status: values.status || '',
              notes: values.notes || '',
            }),
          });
          message.success('条目已更新');
          await runSafeFollowUp(reloadOverview);
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText name="name" label="名称" rules={[{ required: true }]} />
        <ProFormText name="url" label="URL" rules={[{ required: true }]} />
        <ProFormSelect
          name="categoryName"
          label="分类"
          options={categoryOptions}
          placeholder="输入新分类，或选择已有分类"
          extra="修改分类会影响条目在资源黄页中的归档位置，请按目录结构统一命名。"
          fieldProps={{ showSearch: true, allowClear: true }}
        />
        <ProFormSelect
          name="tags"
          label="标签"
          mode="tags"
          extra="标签会影响搜索与前台聚合展示；删除旧标签前请先确认是否有同义标签替代。"
          fieldProps={{ tokenSeparators: [',', '\uFF0C', ' '] }}
        />
        <ProFormTextArea name="description" label="描述" fieldProps={{ rows: 3 }} />
        <ProFormTextArea name="descriptionEn" label="英文描述（可选）" fieldProps={{ rows: 2 }} />
        <ProFormText name="languageHint" label="语言提示（可选）" />
        <ProFormText name="regionHint" label="地区提示（可选）" />
        <ProFormText name="source" label="来源（可选）" />
        <ProFormText name="status" label="状态（可选）" />
        <ProFormTextArea name="notes" label="备注（可选）" fieldProps={{ rows: 2 }} />
      </ModalForm>

      <ModalForm
        title="导入资源黄页（JSON，全量替换）"
        open={importOpen}
        onOpenChange={setImportOpen}
        modalProps={{ destroyOnHidden: true, width: 820 }}
        onFinish={async (values) => {
          try {
            const json = JSON.parse(values.jsonText || '');
            const res = await request<ImportResponse>('/admin/v1/data/resources-directory/import', {
              method: 'POST',
              body: JSON.stringify(json),
            });
            message.success(
              `导入完成：分类 ${res.categoriesInserted} 个，条目 ${res.itemsInserted} 条，跳过 ${res.skipped} 条`
            );
            await runSafeFollowUp(reloadOverview);
            actionRef.current?.reload();
            return true;
          } catch (error: unknown) {
            message.error(getErrorMessage(error, 'JSON 解析或导入失败'));
            return false;
          }
        }}
      >
        <ProFormTextArea
          name="jsonText"
          label="JSON 内容"
          placeholder='粘贴包含 "items" 数组的 JSON。'
          extra="这是全量替换入口。导入前请确认 JSON 已覆盖你希望保留的全部目录条目。"
          fieldProps={{ rows: 14 }}
          rules={[{ required: true, message: '请先粘贴 JSON 内容' }]}
        />
      </ModalForm>
    </PageContainer>
  );
}
