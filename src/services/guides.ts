import { request } from './request';

export type GuideStatus = 'draft' | 'published' | 'offline';

export type GuideFaqItem = {
  question: string;
  answer: string;
  sort: number;
};

export type GuideTocItem = {
  id: string;
  text: string;
  level: number;
  sort: number;
};

export type GuideGw2Refs = {
  items: number[];
  skills: number[];
  traits: number[];
  specializations: number[];
  buildCodes: string[];
};

export type GuideArticleAdmin = {
  _id: string;
  title: string;
  slug: string;
  summary: string;
  coverImage?: string;
  coverAlt?: string;
  status: GuideStatus;
  categorySlug: string;
  topicSlugs: string[];
  tags: string[];
  contentJson: Record<string, unknown>;
  contentVersion: number;
  faq: GuideFaqItem[];
  relatedArticleSlugs: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string[];
  canonicalUrl?: string;
  authorName?: string;
  publishedAt?: string;
  versionLabel?: string;
  isFeatured: boolean;
  isRecommended: boolean;
  toc: GuideTocItem[];
  gw2Refs?: GuideGw2Refs;
  deleted: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type GuideTaxonomyItem = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  coverImage?: string;
  seoTitle?: string;
  seoDescription?: string;
  sort: number;
  isEnabled: boolean;
  updatedAt?: string;
  createdAt?: string;
};

export type GuideArticleListParams = {
  current?: number;
  pageSize?: number;
  keyword?: string;
  status?: GuideStatus;
  categorySlug?: string;
  topicSlug?: string;
};

export type GuideArticleWritePayload = {
  title: string;
  slug: string;
  summary: string;
  coverImage?: string;
  coverAlt?: string;
  categorySlug: string;
  topicSlugs: string[];
  tags: string[];
  contentJson: Record<string, unknown>;
  faq: GuideFaqItem[];
  relatedArticleSlugs: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string[];
  canonicalUrl?: string;
  authorName?: string;
  versionLabel?: string;
  isFeatured?: boolean;
  isRecommended?: boolean;
};

export type GuideTaxonomyWritePayload = {
  name: string;
  slug: string;
  description?: string;
  coverImage?: string;
  seoTitle?: string;
  seoDescription?: string;
  sort?: number;
  isEnabled?: boolean;
};

export type GuideCoverUploadResult = {
  url: string;
  path: string;
  fileName: string;
  mimeType: string;
  size: number;
};

type GuideArticleListResp = {
  items: GuideArticleAdmin[];
  total: number;
  page: number;
  pageSize: number;
};

type GuideArticleResp = {
  item: GuideArticleAdmin;
};

type GuideTaxonomyListResp = {
  items: GuideTaxonomyItem[];
};

type GuideTaxonomyResp = {
  item: GuideTaxonomyItem;
};

type GuideCoverUploadResp = GuideCoverUploadResult;

export async function listGuideArticles(params: GuideArticleListParams) {
  return request<GuideArticleListResp>('/admin/v1/guides/articles', {
    params: {
      page: params.current || 1,
      pageSize: params.pageSize || 20,
      keyword: params.keyword || '',
      status: params.status || '',
      categorySlug: params.categorySlug || '',
      topicSlug: params.topicSlug || '',
    },
  });
}

export async function uploadGuideCover(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request<GuideCoverUploadResp>('/admin/v1/guides/upload/cover', {
    method: 'POST',
    body: formData,
  });
}

export async function getGuideArticle(id: string) {
  const res = await request<GuideArticleResp>(`/admin/v1/guides/articles/${id}`);
  return res.item;
}

export async function createGuideArticle(payload: GuideArticleWritePayload) {
  const res = await request<GuideArticleResp>('/admin/v1/guides/articles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.item;
}

export async function updateGuideArticle(id: string, payload: GuideArticleWritePayload) {
  const res = await request<GuideArticleResp>(`/admin/v1/guides/articles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.item;
}

export async function publishGuideArticle(id: string) {
  const res = await request<GuideArticleResp>(`/admin/v1/guides/articles/${id}/publish`, {
    method: 'POST',
  });
  return res.item;
}

export async function offlineGuideArticle(id: string) {
  const res = await request<GuideArticleResp>(`/admin/v1/guides/articles/${id}/offline`, {
    method: 'POST',
  });
  return res.item;
}

export async function deleteGuideArticle(id: string) {
  return request<{ success: true }>(`/admin/v1/guides/articles/${id}`, {
    method: 'DELETE',
  });
}

export async function listGuideCategories() {
  const res = await request<GuideTaxonomyListResp>('/admin/v1/guides/categories');
  return res.items;
}

export async function getGuideCategory(id: string) {
  const res = await request<GuideTaxonomyResp>(`/admin/v1/guides/categories/${id}`);
  return res.item;
}

export async function createGuideCategory(payload: GuideTaxonomyWritePayload) {
  const res = await request<GuideTaxonomyResp>('/admin/v1/guides/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.item;
}

export async function updateGuideCategory(id: string, payload: GuideTaxonomyWritePayload) {
  const res = await request<GuideTaxonomyResp>(`/admin/v1/guides/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.item;
}

export async function listGuideTopics() {
  const res = await request<GuideTaxonomyListResp>('/admin/v1/guides/topics');
  return res.items;
}

export async function getGuideTopic(id: string) {
  const res = await request<GuideTaxonomyResp>(`/admin/v1/guides/topics/${id}`);
  return res.item;
}

export async function createGuideTopic(payload: GuideTaxonomyWritePayload) {
  const res = await request<GuideTaxonomyResp>('/admin/v1/guides/topics', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.item;
}

export async function updateGuideTopic(id: string, payload: GuideTaxonomyWritePayload) {
  const res = await request<GuideTaxonomyResp>(`/admin/v1/guides/topics/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.item;
}
