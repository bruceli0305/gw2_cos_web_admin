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
import { Button, message, Popconfirm, Space, Tag } from 'antd';
import { useRef, useState } from 'react';
import { PageRequestErrorAlert } from '../../components/listPageState';
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
  const tableState = getFilterAwareTableProps({
    hasFilters: hasSearch,
    searchText: 'Search resources',
    filteredEmptyText: 'No recommended resources match the current search.',
    emptyText: 'No recommended resources have been added yet.',
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
      render: (_, r) => (r.hot ? <Tag color="gold">HOT</Tag> : '-'),
    },
    {
      title: 'Tags',
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
      subTitle="查看 / 新增编辑删除 / 导入（覆盖）"
      extra={[
        <Button key="create" type="primary" onClick={() => setCreateOpen(true)}>
          新增
        </Button>,
        <Button key="import" onClick={() => setImportOpen(true)}>
          导入（覆盖）
        </Button>,
      ]}
    >
      <PageRequestErrorAlert
        message="Unable to load recommended resources"
        description={errorMessage}
        onRetry={() => actionRef.current?.reload()}
      />

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
            setErrorMessage(null);
            return { data: res.items, total: res.total, success: true };
          } catch (error: unknown) {
            setErrorMessage(getErrorMessage(error, 'Failed to load recommended resources'));
            throw error;
          }
        }}
      />

      {/* 新增 */}
      <ModalForm
        title="新增推荐资源"
        open={createOpen}
        onOpenChange={setCreateOpen}
        modalProps={{ destroyOnClose: true }}
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
        <ProFormTextArea name="description" label="描述" fieldProps={{ rows: 3 }} />
        <ProFormText name="kind" label="类型(kind)" />
        <ProFormText name="badge" label="徽章(badge)" />
        <ProFormText name="icon" label="图标(icon)" />
        <ProFormSwitch name="hot" label="热门(hot)" />
        <ProFormSelect
          name="tags"
          label="Tags"
          mode="tags"
          fieldProps={{ tokenSeparators: [',', '，', ' '] }}
        />
      </ModalForm>

      {/* 编辑 */}
      <ModalForm
        title={`编辑：${current?.name || ''}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        modalProps={{ destroyOnClose: true }}
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
        <ProFormTextArea name="description" label="描述" fieldProps={{ rows: 3 }} />
        <ProFormText name="kind" label="类型(kind)" />
        <ProFormText name="badge" label="徽章(badge)" />
        <ProFormText name="icon" label="图标(icon)" />
        <ProFormSwitch name="hot" label="热门(hot)" />
        <ProFormSelect
          name="tags"
          label="Tags"
          mode="tags"
          fieldProps={{ tokenSeparators: [',', '，', ' '] }}
        />
      </ModalForm>

      {/* 导入 */}
      <ModalForm
        title="导入推荐资源（JSON，覆盖全量）"
        open={importOpen}
        onOpenChange={setImportOpen}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          try {
            const json = JSON.parse(values.jsonText || '');
            const res = await request<RecommendedImportResp>('/admin/v1/data/resources-recommended/import', {
              method: 'POST',
              body: JSON.stringify(json),
            });
            message.success(`导入成功：写入 ${res.itemsInserted}，跳过 ${res.skipped}`);
            actionRef.current?.reload();
            return true;
          } catch (error: unknown) {
            const e = { message: getErrorMessage(error, 'JSON import failed') };
            message.error(e?.message || 'JSON 解析/导入失败');
            return false;
          }
        }}
      >
        <ProFormTextArea
          name="jsonText"
          label="JSON 内容"
          placeholder='粘贴 JSON（包含 items 数组）。'
          fieldProps={{ rows: 14 }}
          rules={[{ required: true, message: '请粘贴 JSON' }]}
        />
      </ModalForm>
    </PageContainer>
  );
}
