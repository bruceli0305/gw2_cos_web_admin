import {
  PageContainer,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { Button, Popconfirm, Space, Tag, message } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageNoticeAlert, PageRequestErrorAlert } from '../../components/listPageState';
import {
  deleteGuideArticle,
  listGuideArticles,
  listGuideCategories,
  listGuideTopics,
  offlineGuideArticle,
  publishGuideArticle,
  type GuideArticleAdmin,
  type GuideArticleListParams,
  type GuideStatus,
  type GuideTaxonomyItem,
} from '../../services/guides';
import { getErrorMessage } from '../../services/request';

const STATUS_META: Record<GuideStatus, { color: string; text: string }> = {
  draft: { color: 'default', text: '草稿' },
  published: { color: 'success', text: '已发布' },
  offline: { color: 'warning', text: '已下线' },
};

function buildValueEnum(items: GuideTaxonomyItem[]) {
  return items.reduce<Record<string, { text: string }>>((acc, item) => {
    acc[item.slug] = { text: item.name };
    return acc;
  }, {});
}

export default function GuideArticlesPage() {
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>(null);
  const [categories, setCategories] = useState<GuideTaxonomyItem[]>([]);
  const [topics, setTopics] = useState<GuideTaxonomyItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadLookups() {
      try {
        const [nextCategories, nextTopics] = await Promise.all([listGuideCategories(), listGuideTopics()]);
        if (!active) return;
        setCategories(nextCategories);
        setTopics(nextTopics);
      } catch (error: unknown) {
        if (!active) return;
        setErrorMessage(getErrorMessage(error, '加载攻略分类/专题失败'));
      }
    }

    void loadLookups();

    return () => {
      active = false;
    };
  }, []);

  const categoryValueEnum = useMemo(() => buildValueEnum(categories), [categories]);
  const topicValueEnum = useMemo(() => buildValueEnum(topics), [topics]);

  const columns: ProColumns<GuideArticleAdmin>[] = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 120,
      valueEnum: {
        draft: { text: '草稿' },
        published: { text: '已发布' },
        offline: { text: '已下线' },
      },
      render: (_, record) => {
        const meta = STATUS_META[record.status];
        return <Tag color={meta.color}>{meta.text}</Tag>;
      },
    },
    {
      title: '分类筛选',
      dataIndex: 'categorySlug',
      hideInTable: true,
      valueType: 'select',
      valueEnum: categoryValueEnum,
    },
    {
      title: '专题筛选',
      dataIndex: 'topicSlug',
      hideInTable: true,
      valueType: 'select',
      valueEnum: topicValueEnum,
    },
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
      width: 240,
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      width: 220,
      ellipsis: true,
      copyable: true,
      search: false,
    },
    {
      title: '分类',
      dataIndex: 'categorySlug',
      width: 140,
      search: false,
      render: (_, record) => categoryValueEnum[record.categorySlug]?.text || record.categorySlug,
    },
    {
      title: '专题',
      dataIndex: 'topicSlugs',
      search: false,
      render: (_, record) => (
        <Space wrap>
          {(record.topicSlugs || []).length > 0
            ? record.topicSlugs.map((slug) => <Tag key={slug}>{topicValueEnum[slug]?.text || slug}</Tag>)
            : '-'}
        </Space>
      ),
    },
    {
      title: '推荐/加精',
      dataIndex: 'isRecommended',
      width: 180,
      search: false,
      render: (_, record) => (
        <Space wrap>
          {record.isRecommended ? <Tag color="gold">首页推荐</Tag> : null}
          {record.isFeatured ? <Tag color="blue">精选导读</Tag> : null}
          {!record.isRecommended && !record.isFeatured ? '-': null}
        </Space>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    {
      title: '发布时间',
      dataIndex: 'publishedAt',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 260,
      render: (_, record) => (
        <Space wrap>
          <Button type="link" onClick={() => navigate(`/content/guides/${record._id}`)}>
            编辑
          </Button>
          {record.status === 'published' ? (
            <Button
              type="link"
              onClick={async () => {
                await offlineGuideArticle(record._id);
                message.success('已下线');
                actionRef.current?.reload();
              }}
            >
              下线
            </Button>
          ) : (
            <Button
              type="link"
              onClick={async () => {
                await publishGuideArticle(record._id);
                message.success('已发布');
                actionRef.current?.reload();
              }}
            >
              发布
            </Button>
          )}
          <Popconfirm
            title="确定删除这篇攻略？"
            description="删除后文章会被标记为已删除，并从公开接口移除。"
            onConfirm={async () => {
              await deleteGuideArticle(record._id);
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
      title="攻略文章"
      subTitle="管理攻略文章草稿、发布、下线与删除。正文暂以 JSON 形式维护，先打通后端契约。"
      extra={[
        <Button key="categories" onClick={() => navigate('/content/guides/categories')}>
          分类管理
        </Button>,
        <Button key="topics" onClick={() => navigate('/content/guides/topics')}>
          专题管理
        </Button>,
        <Button key="new" type="primary" onClick={() => navigate('/content/guides/new')}>
          新增文章
        </Button>,
      ]}
    >
      <PageNoticeAlert
        type="info"
        message="Guide editing is wired end to end"
        description={(
          <div>
            <div>1. Article body editing now uses a rich text editor that still saves `contentJson` for the backend contract.</div>
            <div>2. Publish still runs backend validation, so empty body content or missing required fields will be rejected.</div>
            <div>3. Category and topic slugs still affect public routes and aggregate pages directly, so keep them stable.</div>
          </div>
        )}
        marginBottom={12}
      />

      <PageRequestErrorAlert
        message="无法加载攻略文章列表"
        description={errorMessage}
        onRetry={() => actionRef.current?.reload()}
      />

      <ProTable<GuideArticleAdmin>
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        columns={columns}
        request={async (params) => {
          try {
            const query = params as GuideArticleListParams;
            const res = await listGuideArticles(query);
            setErrorMessage(null);
            return {
              data: res.items,
              total: res.total,
              success: true,
            };
          } catch (error: unknown) {
            setErrorMessage(getErrorMessage(error, '加载攻略文章失败'));
            throw error;
          }
        }}
      />
    </PageContainer>
  );
}
