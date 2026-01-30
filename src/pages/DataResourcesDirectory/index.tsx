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
import { Button, message, Popconfirm, Space, Tag } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { request } from '../../services/request';

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

export default function DataResourcesDirectoryPage() {
  const actionRef = useRef<ActionType>(null);
  const [overview, setOverview] = useState<Overview | null>(null);

  const [importOpen, setImportOpen] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<Item | null>(null);

  async function reloadOverview() {
    const res = await request<Overview>('/admin/v1/data/resources-directory/overview');
    setOverview(res);
  }

  useEffect(() => {
    reloadOverview().catch(() => {});
  }, []);

  const categoryEnum = useMemo(() => {
    const out: any = {};
    for (const c of overview?.categories || []) out[c.name] = { text: `${c.name} (${c.count})` };
    return out;
  }, [overview]);

  const columns: ProColumns<Item>[] = [
    { title: '关键词', dataIndex: 'q', hideInTable: true },
    {
      title: '分类筛选',
      dataIndex: 'category',
      hideInTable: true,
      valueType: 'select',
      valueEnum: categoryEnum,
    },
    { title: 'Tag', dataIndex: 'tag', hideInTable: true },

    { title: '名称', dataIndex: 'name', ellipsis: true, copyable: true },
    { title: '链接', dataIndex: 'url', ellipsis: true, copyable: true },
    { title: '分类', dataIndex: 'categoryName', width: 160, search: false },
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
    { title: '描述', dataIndex: 'description', ellipsis: true, search: false },
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
            title="确定删除该条目？"
            onConfirm={async () => {
              await request(`/admin/v1/data/resources-directory/items/${r._id}`, { method: 'DELETE' });
              message.success('已删除');
              await reloadOverview();
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

  const categoryOptions = useMemo(
    () => (overview?.categories || []).map((c) => ({ label: c.name, value: c.name })),
    [overview]
  );

  return (
    <PageContainer
      title="资源黄页"
      subTitle="查看 / 新增编辑删除 / 导入（覆盖）"
      content={
        <div style={{ color: '#666' }}>
          总条目：{overview?.total_count ?? '-'}；生成时间：{overview?.generated_at_utc ?? '-'}
        </div>
      }
      extra={[
        <Button key="create" type="primary" onClick={() => setCreateOpen(true)}>
          新增
        </Button>,
        <Button key="import" onClick={() => setImportOpen(true)}>
          导入（覆盖）
        </Button>,
      ]}
    >
      <ProTable<Item>
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        columns={columns}
        request={async (params) => {
          const { current, pageSize, q, category, tag } = params as any;
          const res = await request('/admin/v1/data/resources-directory/items', {
            params: {
              page: current || 1,
              limit: pageSize || 20,
              q: q || '',
              category: category || '',
              tag: tag || '',
            },
          });
          return { data: res.items, total: res.total, success: true };
        }}
      />

      {/* 新增 */}
      <ModalForm
        title="新增黄页条目"
        open={createOpen}
        onOpenChange={setCreateOpen}
        modalProps={{ destroyOnClose: true }}
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
          message.success('创建成功');
          await reloadOverview();
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
          placeholder="可直接输入新分类"
          fieldProps={{ showSearch: true, allowClear: true }}
        />
        <ProFormSelect
          name="tags"
          label="Tags"
          mode="tags"
          fieldProps={{ tokenSeparators: [',', '，', ' '] }}
        />
        <ProFormTextArea name="description" label="描述" fieldProps={{ rows: 3 }} />
        <ProFormTextArea name="descriptionEn" label="英文描述(可选)" fieldProps={{ rows: 2 }} />
        <ProFormText name="languageHint" label="语言提示(可选)" />
        <ProFormText name="regionHint" label="地区提示(可选)" />
        <ProFormText name="source" label="来源(可选)" />
        <ProFormText name="status" label="状态(可选)" />
        <ProFormTextArea name="notes" label="备注(可选)" fieldProps={{ rows: 2 }} />
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
          message.success('更新成功');
          await reloadOverview();
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
          placeholder="可直接输入新分类"
          fieldProps={{ showSearch: true, allowClear: true }}
        />
        <ProFormSelect
          name="tags"
          label="Tags"
          mode="tags"
          fieldProps={{ tokenSeparators: [',', '，', ' '] }}
        />
        <ProFormTextArea name="description" label="描述" fieldProps={{ rows: 3 }} />
        <ProFormTextArea name="descriptionEn" label="英文描述(可选)" fieldProps={{ rows: 2 }} />
        <ProFormText name="languageHint" label="语言提示(可选)" />
        <ProFormText name="regionHint" label="地区提示(可选)" />
        <ProFormText name="source" label="来源(可选)" />
        <ProFormText name="status" label="状态(可选)" />
        <ProFormTextArea name="notes" label="备注(可选)" fieldProps={{ rows: 2 }} />
      </ModalForm>

      {/* 导入 */}
      <ModalForm
        title="导入资源黄页（JSON，覆盖全量）"
        open={importOpen}
        onOpenChange={setImportOpen}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          try {
            const json = JSON.parse(values.jsonText || '');
            const res = await request('/admin/v1/data/resources-directory/import', {
              method: 'POST',
              body: JSON.stringify(json),
            });
            message.success(`导入成功：分类 ${res.categoriesInserted}，条目 ${res.itemsInserted}，跳过 ${res.skipped}`);
            await reloadOverview();
            actionRef.current?.reload();
            return true;
          } catch (e: any) {
            message.error(e?.message || 'JSON 解析/导入失败');
            return false;
          }
        }}
      >
        <ProFormTextArea
          name="jsonText"
          label="JSON 内容"
          placeholder="粘贴 JSON（包含 items 数组）。"
          fieldProps={{ rows: 14 }}
          rules={[{ required: true, message: '请粘贴 JSON' }]}
        />
      </ModalForm>
    </PageContainer>
  );
}