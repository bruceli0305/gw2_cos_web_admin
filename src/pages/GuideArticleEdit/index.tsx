import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  ProFormDigit,
  ProFormList,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-form';
import { ProForm } from '@ant-design/pro-form/es/layouts/ProForm';
import { Button, Card, Col, Form, Row, Spin, Statistic, Tabs, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GuideCoverUpload from '../../components/GuideCoverUpload';
import GuideRichTextEditor from '../../components/GuideRichTextEditor';
import { PageNoticeAlert } from '../../components/listPageState';
import {
  createGuideArticle,
  getGuideArticle,
  listGuideCategories,
  listGuideTopics,
  updateGuideArticle,
  type GuideArticleAdmin,
  type GuideFaqItem,
  type GuideTaxonomyItem,
  type GuideTocItem,
} from '../../services/guides';
import { getErrorMessage } from '../../services/request';

const DEFAULT_CONTENT_JSON = JSON.stringify(
  {
    type: 'doc',
    content: [],
  },
  null,
  2
);

type GuideFaqFormItem = {
  question?: string;
  answer?: string;
  sort?: number;
};

type GuideArticleFormValues = {
  title?: string;
  slug?: string;
  summary?: string;
  coverImage?: string;
  coverAlt?: string;
  categorySlug?: string;
  topicSlugs?: string[];
  tags?: string[];
  contentJsonText?: string;
  faq?: GuideFaqFormItem[];
  relatedArticleSlugs?: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  canonicalUrl?: string;
  authorName?: string;
  versionLabel?: string;
};

type GuideEditorTabKey = 'base' | 'content' | 'seo';

function parseJsonObject(input: string) {
  const parsed = JSON.parse(input);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('contentJson 必须是 JSON 对象');
  }
  return parsed as Record<string, unknown>;
}

function toFormValues(article?: GuideArticleAdmin): GuideArticleFormValues {
  if (!article) {
    return {
      topicSlugs: [],
      tags: [],
      faq: [],
      relatedArticleSlugs: [],
      seoKeywords: [],
      contentJsonText: DEFAULT_CONTENT_JSON,
    };
  }

  return {
    title: article.title,
    slug: article.slug,
    summary: article.summary,
    coverImage: article.coverImage,
    coverAlt: article.coverAlt,
    categorySlug: article.categorySlug,
    topicSlugs: article.topicSlugs || [],
    tags: article.tags || [],
    contentJsonText: JSON.stringify(article.contentJson || {}, null, 2),
    faq: Array.isArray(article.faq) ? article.faq : [],
    relatedArticleSlugs: article.relatedArticleSlugs || [],
    seoTitle: article.seoTitle,
    seoDescription: article.seoDescription,
    seoKeywords: article.seoKeywords || [],
    canonicalUrl: article.canonicalUrl,
    authorName: article.authorName,
    versionLabel: article.versionLabel,
  };
}

function summarizeToc(toc: GuideTocItem[] | undefined) {
  return Array.isArray(toc) ? toc.length : 0;
}

function countGw2Refs(article: GuideArticleAdmin | null) {
  if (!article?.gw2Refs) return 0;
  return (
    article.gw2Refs.items.length +
    article.gw2Refs.skills.length +
    article.gw2Refs.traits.length +
    article.gw2Refs.specializations.length +
    article.gw2Refs.buildCodes.length
  );
}

function resolveGuideEditorTab(namePath: Array<string | number>): GuideEditorTabKey {
  const fieldName = String(namePath[0] || '').trim();

  if (fieldName === 'contentJsonText' || fieldName === 'faq') return 'content';
  if (['seoTitle', 'seoDescription', 'seoKeywords', 'canonicalUrl', 'relatedArticleSlugs'].includes(fieldName)) {
    return 'seo';
  }

  return 'base';
}

export default function GuideArticleEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isCreate = !id || id === 'new';

  const [form] = Form.useForm<GuideArticleFormValues>();
  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<GuideArticleAdmin | null>(null);
  const [categories, setCategories] = useState<GuideTaxonomyItem[]>([]);
  const [topics, setTopics] = useState<GuideTaxonomyItem[]>([]);
  const [activeTab, setActiveTab] = useState<GuideEditorTabKey>('base');

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        const [nextCategories, nextTopics, nextArticle] = await Promise.all([
          listGuideCategories(),
          listGuideTopics(),
          isCreate || !id ? Promise.resolve(null) : getGuideArticle(id),
        ]);

        if (!active) return;

        setCategories(nextCategories);
        setTopics(nextTopics);
        setArticle(nextArticle);
      } catch (error: unknown) {
        if (!active) return;
        message.error(getErrorMessage(error, '加载攻略文章失败'));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPage();

    return () => {
      active = false;
    };
  }, [id, isCreate]);

  useEffect(() => {
    if (loading) return;
    form.setFieldsValue(toFormValues(article || undefined));
  }, [article, form, loading]);

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((item) => item.isEnabled)
        .map((item) => ({ label: item.name, value: item.slug })),
    [categories]
  );

  const topicOptions = useMemo(
    () =>
      topics
        .filter((item) => item.isEnabled)
        .map((item) => ({ label: item.name, value: item.slug })),
    [topics]
  );

  const hasEnabledCategories = categoryOptions.length > 0;
  const hasEnabledTopics = topicOptions.length > 0;

  const pageSummary = useMemo(
    () => ({
      mode: isCreate ? '新建文章' : '编辑文章',
      status: article?.status === 'published' ? '已发布' : article?.status === 'offline' ? '已下线' : '草稿',
      tocCount: summarizeToc(article?.toc),
      gw2RefCount: countGw2Refs(article),
    }),
    [article, isCreate]
  );

  const tabItems = [
    {
      key: 'base',
      label: '基础信息',
      children: (
        <>
          <ProFormText
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
            fieldProps={{ placeholder: '例如：欧服 WvW 回坑玩家入门指南' }}
          />
          <ProFormText
            name="slug"
            label="Slug"
            rules={[
              { required: true, message: '请输入 slug' },
              { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: '只能使用小写字母、数字和连字符' },
            ]}
            fieldProps={{ placeholder: '例如：eu-wvw-beginner-guide' }}
          />
          <ProFormTextArea
            name="summary"
            label="摘要"
            rules={[{ required: true, message: '请输入摘要' }]}
            fieldProps={{ rows: 3 }}
          />
          <ProFormSelect
            name="categorySlug"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
            options={categoryOptions}
            fieldProps={{ disabled: !hasEnabledCategories }}
            extra={
              !hasEnabledCategories
                ? '当前没有启用中的攻略分类，请先去分类管理创建或启用分类。'
                : undefined
            }
          />
          <ProFormSelect
            name="topicSlugs"
            label="专题"
            options={topicOptions}
            fieldProps={{ mode: 'multiple' }}
          />
          <ProFormSelect
            name="tags"
            label="标签"
            fieldProps={{ mode: 'tags', tokenSeparators: [',', '，', ' '] }}
          />
          <ProFormText name="authorName" label="作者" />
          <ProFormText
            name="versionLabel"
            label="版本标签"
            fieldProps={{ placeholder: '例如：2026 春季版' }}
          />
          <Form.Item name="coverImage" label="封面图">
            <GuideCoverUpload />
          </Form.Item>
          <ProFormText name="coverAlt" label="封面替代文本" />
        </>
      ),
    },
    {
      key: 'content',
      label: '正文与 FAQ',
      children: (
        <>
          <Form.Item
            name="contentJsonText"
            label="正文内容"
            rules={[{ required: true, message: '请填写正文内容' }]}
            extra="可视化编辑器会写入后端现有的 contentJson 结构；若遇到暂不支持的自定义节点，仍可回退到原始 JSON 编辑。"
          >
            <GuideRichTextEditor />
          </Form.Item>

          <ProFormList
            name="faq"
            label="FAQ"
            creatorButtonProps={{ creatorButtonText: '新增 FAQ' }}
            itemRender={({ listDom, action }, { record }) => (
              <ProCard
                title={record?.question ? `FAQ：${record.question}` : 'FAQ'}
                extra={action}
                style={{ marginBlockEnd: 12 }}
              >
                {listDom}
              </ProCard>
            )}
          >
            <ProFormText name="question" label="问题" rules={[{ required: true }]} />
            <ProFormTextArea name="answer" label="回答" fieldProps={{ rows: 3 }} rules={[{ required: true }]} />
            <ProFormDigit name="sort" label="排序" min={1} />
          </ProFormList>
        </>
      ),
    },
    {
      key: 'seo',
      label: 'SEO 与关联',
      children: (
        <>
          <ProFormText name="seoTitle" label="SEO 标题" />
          <ProFormTextArea name="seoDescription" label="SEO 描述" fieldProps={{ rows: 3 }} />
          <ProFormSelect
            name="seoKeywords"
            label="SEO 关键词"
            fieldProps={{ mode: 'tags', tokenSeparators: [',', '，', ' '] }}
          />
          <ProFormText name="canonicalUrl" label="Canonical URL" />
          <ProFormSelect
            name="relatedArticleSlugs"
            label="相关文章 Slug"
            fieldProps={{ mode: 'tags', tokenSeparators: [',', '，', ' '] }}
          />
        </>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Spin />
      </div>
    );
  }

  return (
    <PageContainer
      title={isCreate ? '新增攻略文章' : `编辑：${article?.title || ''}`}
      extra={[
        <Button key="back" onClick={() => navigate('/content/guides')}>
          返回列表
        </Button>,
      ]}
    >
      <PageNoticeAlert
        type="info"
        message="已启用富文本编辑器"
        description={(
          <div>
            <div>1. 编辑器写入的仍是后端当前校验并发布的 `contentJson` 文档结构。</div>
            <div>2. 如果文章包含暂不支持的自定义节点，页面会回退到原始 JSON 编辑，避免已有内容丢失。</div>
            <div>3. 发布校验逻辑不变：空的 `doc.content` 仍然只能作为草稿保存。</div>
          </div>
        )}
        marginBottom={12}
      />

      {!hasEnabledCategories || !hasEnabledTopics ? (
        <PageNoticeAlert
          type="warning"
          message="攻略分类数据未准备完整"
          description={(
            <div>
              {!hasEnabledCategories ? <div>1. 当前没有启用中的攻略分类。文章没有分类时无法保存。</div> : null}
              {!hasEnabledTopics ? <div>{!hasEnabledCategories ? '2.' : '1.'} 当前没有启用中的攻略专题。专题可暂时留空，但建议先补齐专题数据。</div> : null}
              <div style={{ marginTop: 8 }}>
                <Button size="small" style={{ marginRight: 8 }} onClick={() => navigate('/content/guides/categories')}>
                  打开分类管理
                </Button>
                <Button size="small" onClick={() => navigate('/content/guides/topics')}>
                  打开专题管理
                </Button>
              </div>
            </div>
          )}
          marginBottom={12}
        />
      ) : null}

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="编辑模式" value={pageSummary.mode} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>用于区分当前是新建文章还是编辑已有文章。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前状态" value={pageSummary.status} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>发布与下线动作仍在文章列表页统一执行。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="目录节点数" value={pageSummary.tocCount} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>由后端从 `contentJson` 自动提取目录数量。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="GW2 引用数" value={pageSummary.gw2RefCount} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>用于核对自定义 GW2 节点是否被后端正确识别。</div>
          </Card>
        </Col>
      </Row>

      <ProForm<GuideArticleFormValues>
        form={form}
        submitter={{
          searchConfig: { submitText: '保存' },
          resetButtonProps: false,
        }}
        onFinishFailed={(errorInfo) => {
          const firstError = Array.isArray(errorInfo?.errorFields) ? errorInfo.errorFields[0] : null;
          if (firstError?.name) {
            setActiveTab(resolveGuideEditorTab(firstError.name));
          }
          message.error('请先完成必填项后再保存。');
        }}
        onFinish={async (values) => {
          try {
            const contentJson = parseJsonObject(String(values.contentJsonText || '').trim() || DEFAULT_CONTENT_JSON);
            const faq: GuideFaqItem[] = Array.isArray(values.faq)
              ? values.faq
                  .map((item, index) => ({
                    question: String(item?.question || '').trim(),
                    answer: String(item?.answer || '').trim(),
                    sort: Number(item?.sort) || index + 1,
                  }))
                  .filter((item) => item.question && item.answer)
              : [];

            const payload = {
              title: String(values.title || '').trim(),
              slug: String(values.slug || '').trim(),
              summary: String(values.summary || '').trim(),
              coverImage: String(values.coverImage || '').trim() || undefined,
              coverAlt: String(values.coverAlt || '').trim() || undefined,
              categorySlug: String(values.categorySlug || '').trim(),
              topicSlugs: Array.isArray(values.topicSlugs) ? values.topicSlugs : [],
              tags: Array.isArray(values.tags) ? values.tags : [],
              contentJson,
              faq,
              relatedArticleSlugs: Array.isArray(values.relatedArticleSlugs) ? values.relatedArticleSlugs : [],
              seoTitle: String(values.seoTitle || '').trim() || undefined,
              seoDescription: String(values.seoDescription || '').trim() || undefined,
              seoKeywords: Array.isArray(values.seoKeywords) ? values.seoKeywords : [],
              canonicalUrl: String(values.canonicalUrl || '').trim() || undefined,
              authorName: String(values.authorName || '').trim() || undefined,
              versionLabel: String(values.versionLabel || '').trim() || undefined,
            };

            if (isCreate) {
              const created = await createGuideArticle(payload);
              message.success('创建成功');
              navigate(`/content/guides/${created._id}`);
              return true;
            }

            if (!id) {
              message.error('当前文章缺少 ID，无法执行更新。');
              return false;
            }

            const updated = await updateGuideArticle(id, payload);
            setArticle(updated);
            message.success('保存成功');
            return true;
          } catch (error: unknown) {
            message.error(getErrorMessage(error, '保存攻略文章失败'));
            return false;
          }
        }}
      >
        <Card variant="borderless" style={{ borderRadius: 24 }} styles={{ body: { padding: 20 } }}>
          <Tabs
            type="card"
            activeKey={activeTab}
            onChange={(key) => setActiveTab(String(key) as GuideEditorTabKey)}
            tabBarStyle={{
              marginBottom: 24,
              padding: 8,
              background: '#f8fafc',
              borderRadius: 16,
            }}
            items={tabItems}
          />
        </Card>
      </ProForm>
    </PageContainer>
  );
}
