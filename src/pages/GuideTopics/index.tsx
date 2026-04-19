import {
  ModalForm,
  PageContainer,
  ProFormDigit,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { Button, Form, Space, Tag, message } from 'antd';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GuideCoverUpload from '../../components/GuideCoverUpload';
import { PageNoticeAlert, PageRequestErrorAlert } from '../../components/listPageState';
import {
  createGuideTopic,
  listGuideTopics,
  updateGuideTopic,
  type GuideTaxonomyItem,
} from '../../services/guides';
import { getErrorMessage } from '../../services/request';

type GuideTaxonomyFormValues = {
  name?: string;
  slug?: string;
  description?: string;
  coverImage?: string;
  seoTitle?: string;
  seoDescription?: string;
  sort?: number;
  isEnabled?: boolean;
};

export default function GuideTopicsPage() {
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<GuideTaxonomyItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const columns: ProColumns<GuideTaxonomyItem>[] = [
    { title: '名称', dataIndex: 'name' },
    { title: 'Slug', dataIndex: 'slug', width: 180, copyable: true },
    { title: '排序', dataIndex: 'sort', width: 100, search: false },
    {
      title: '状态',
      dataIndex: 'isEnabled',
      width: 100,
      search: false,
      render: (_, record) => <Tag color={record.isEnabled ? 'success' : 'default'}>{record.isEnabled ? '启用' : '停用'}</Tag>,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      width: 170,
      search: false,
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
              setEditing(record);
              setModalOpen(true);
            }}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="攻略专题"
      subTitle="维护文章专题目录，slug 会直接影响前台专题聚合与文章关联。"
      extra={[
        <Button key="articles" onClick={() => navigate('/content/guides')}>
          返回文章
        </Button>,
        <Button key="categories" onClick={() => navigate('/content/guides/categories')}>
          分类管理
        </Button>,
        <Button
          key="new"
          type="primary"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          新增专题
        </Button>,
      ]}
    >
      <PageNoticeAlert
        type="info"
        message="专题 slug 变更会同步更新文章 topicSlugs"
        description={(
          <div>
            <div>1. 专题用于内容聚合、相关推荐与专题页展示，slug 需长期稳定。</div>
            <div>2. 停用专题不会自动从文章中移除，请先核对现有文章引用关系。</div>
          </div>
        )}
        marginBottom={12}
      />

      <PageRequestErrorAlert
        message="无法加载攻略专题"
        description={errorMessage}
        onRetry={() => actionRef.current?.reload()}
      />

      <ProTable<GuideTaxonomyItem>
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        search={false}
        columns={columns}
        request={async () => {
          try {
            const items = await listGuideTopics();
            setErrorMessage(null);
            return {
              data: items,
              total: items.length,
              success: true,
            };
          } catch (error: unknown) {
            setErrorMessage(getErrorMessage(error, '加载攻略专题失败'));
            throw error;
          }
        }}
      />

      <ModalForm<GuideTaxonomyFormValues>
        key={editing?._id || 'new'}
        title={editing ? `编辑专题：${editing.name}` : '新增专题'}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, width: 720 }}
        initialValues={{
          name: editing?.name,
          slug: editing?.slug,
          description: editing?.description,
          coverImage: editing?.coverImage,
          seoTitle: editing?.seoTitle,
          seoDescription: editing?.seoDescription,
          sort: editing?.sort ?? 0,
          isEnabled: editing ? editing.isEnabled : true,
        }}
        onFinish={async (values) => {
          const payload = {
            name: String(values.name || '').trim(),
            slug: String(values.slug || '').trim(),
            description: String(values.description || '').trim() || undefined,
            coverImage: String(values.coverImage || '').trim() || undefined,
            seoTitle: String(values.seoTitle || '').trim() || undefined,
            seoDescription: String(values.seoDescription || '').trim() || undefined,
            sort: Number(values.sort) || 0,
            isEnabled: values.isEnabled !== false,
          };

          if (editing) {
            await updateGuideTopic(editing._id, payload);
            message.success('专题已更新');
          } else {
            await createGuideTopic(payload);
            message.success('专题已创建');
          }

          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText name="name" label="名称" rules={[{ required: true }]} />
        <ProFormText
          name="slug"
          label="Slug"
          rules={[
            { required: true },
            { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: '只能使用小写字母、数字和短横线' },
          ]}
        />
        <ProFormTextArea name="description" label="描述" fieldProps={{ rows: 3 }} />
        <Form.Item name="coverImage" label="Cover Image">
          <GuideCoverUpload />
        </Form.Item>
        <ProFormText name="seoTitle" label="SEO 标题" />
        <ProFormTextArea name="seoDescription" label="SEO 描述" fieldProps={{ rows: 3 }} />
        <ProFormDigit name="sort" label="排序" min={0} />
        <ProFormSwitch name="isEnabled" label="启用" />
      </ModalForm>
    </PageContainer>
  );
}
