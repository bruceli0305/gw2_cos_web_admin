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
          setOverviewErrorMessage(getErrorMessage(error, '鍔犺浇璧勬簮榛勯〉姒傝澶辫触'));
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
    { title: '鍏抽敭璇?, dataIndex: 'q', hideInTable: true },
    {
      title: '鍒嗙被',
      dataIndex: 'category',
      hideInTable: true,
      valueType: 'select',
      valueEnum: categoryEnum,
    },
    { title: '鏍囩', dataIndex: 'tag', hideInTable: true },
    { title: '鍚嶇О', dataIndex: 'name', ellipsis: true, copyable: true },
    { title: 'URL', dataIndex: 'url', ellipsis: true, copyable: true },
    { title: '鍒嗙被', dataIndex: 'categoryName', width: 160, search: false },
    {
      title: '鏍囩',
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
    { title: '鎻忚堪', dataIndex: 'description', ellipsis: true, search: false },
    { title: '鏇存柊鏃堕棿', dataIndex: 'updatedAt', valueType: 'dateTime', width: 170, search: false },
    {
      title: '鎿嶄綔',
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
            缂栬緫
          </Button>
          <Popconfirm
            {...getDestructivePopconfirmProps({
              title: '纭畾鍒犻櫎璇ヨ祫婧愭潯鐩紵',
              description: '杩欎細浠庤祫婧愰粍椤典腑绉婚櫎褰撳墠绮鹃€夋潯鐩€?,
            })}
            onConfirm={async () => {
              await request(`/admin/v1/data/resources-directory/items/${record._id}`, { method: 'DELETE' });
              message.success('鏉＄洰宸插垹闄?);
              await runSafeFollowUp(reloadOverview);
              actionRef.current?.reload();
            }}
          >
            <Button type="link" danger>
              鍒犻櫎
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="璧勬簮榛勯〉"
      subTitle="绠＄悊绮鹃€夎祫婧愭潯鐩拰鍏ㄩ噺 JSON 瀵煎叆銆?
      content={
        <div style={{ color: '#666' }}>
          鏉＄洰鎬绘暟锛歿overview?.total_count ?? '-'} | 鐢熸垚鏃堕棿锛圲TC锛夛細{overview?.generated_at_utc ?? '-'}
        </div>
      }
      extra={[
        <Button key="create" type="primary" onClick={() => setCreateOpen(true)}>
          鏂板缓鏉＄洰
        </Button>,
        <Button key="import" onClick={() => setImportOpen(true)}>
          瀵煎叆 JSON锛堝叏閲忔浛鎹級
        </Button>,
      ]}
    >
      <PageRequestErrorAlert
        message="鏃犳硶鍔犺浇璧勬簮榛勯〉姒傝"
        description={overviewErrorMessage}
        onRetry={() => void reloadOverview().catch(() => undefined)}
      />

      <PageNoticeAlert
        type="info"
        message="鏈〉缁存姢鍏紑璧勬簮鐩綍"
        description={(
          <div>
            <div>1. 杩欓噷缁存姢鐨勬槸璧勬簮榛勯〉鐩綍鏈韩锛屾敮鎸佸崟鏉＄紪杈戝拰鏁村寘 JSON 鍏ㄩ噺瀵煎叆銆?/div>
            <div>2. 椤堕儴鎽樿浼氭樉绀烘€婚噺銆佸垎绫昏妯°€佸綋鍓嶆渶澶у垎绫诲拰褰撳墠瑙嗗浘鐘舵€併€?/div>
            <div>3. 瀵煎叆 JSON 浼氭墽琛屽叏閲忔浛鎹紝閫傚悎鐩綍鍩虹嚎閲嶅缓锛屼笉閫傚悎闆舵暎鐑慨銆?/div>
          </div>
        )}
        marginBottom={12}
      />

      <PageRequestErrorAlert
        message="鏃犳硶鍔犺浇璧勬簮榛勯〉鏉＄洰"
        description={tableErrorMessage}
        onRetry={() => actionRef.current?.reload()}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="鐩綍鎬婚噺" value={overview?.total_count ?? '-'} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>褰撳墠璧勬簮榛勯〉鐩綍涓殑鍏紑鏉＄洰鎬绘暟銆?/div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="鍒嗙被鏁伴噺" value={overview?.categories?.length ?? '-'} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>褰撳墠鐩綍宸插缓绔嬬殑璧勬簮鍒嗙被鏁伴噺銆?/div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="鏈€澶у垎绫? value={largestCategory ? `${largestCategory.name} 路 ${largestCategory.count}` : '-'} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>甯姪蹇€熻瘑鍒綋鍓嶇洰褰曢噷鏉＄洰鏈€闆嗕腑鐨勮祫婧愬垎绫汇€?/div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="褰撳墠瑙嗗浘" value={hasFilters ? '绛涢€変腑' : '鍏ㄩ儴鐩綍'} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>鎼滅储銆佸垎绫诲拰鏍囩绛涢€夐兘浼氱洿鎺ュ奖鍝嶄笅鏂圭洰褰曠粨鏋溿€?/div>
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
            setTableErrorMessage(getErrorMessage(error, '鍔犺浇璧勬簮榛勯〉鏉＄洰澶辫触'));
            throw error;
          }
        }}
      />

      <ModalForm
        title="鏂板缓璧勬簮鏉＄洰"
        open={createOpen}
        onOpenChange={setCreateOpen}
        modalProps={{ destroyOnClose: true, width: 760 }}
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
          message.success('鏉＄洰宸插垱寤?);
          await runSafeFollowUp(reloadOverview);
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText name="name" label="鍚嶇О" rules={[{ required: true }]} />
        <ProFormText name="url" label="URL" rules={[{ required: true }]} />
        <ProFormSelect
          name="categoryName"
          label="鍒嗙被"
          options={categoryOptions}
          placeholder="杈撳叆鏂板垎绫伙紝鎴栭€夋嫨宸叉湁鍒嗙被"
          extra="分类用于目录归档；新建条目时可直接输入新分类，编辑时会影响现有归档。"
          fieldProps={{ showSearch: true, allowClear: true }}
        />
        <ProFormSelect
          name="tags"
          label="鏍囩"
          mode="tags"
          extra="标签用于搜索和前台展示，建议保持短词、可复用，并避免同义词漂移。"
          fieldProps={{ tokenSeparators: [',', '\uFF0C', ' '] }}
        />
        <ProFormTextArea name="description" label="鎻忚堪" fieldProps={{ rows: 3 }} />
        <ProFormTextArea name="descriptionEn" label="鑻辨枃鎻忚堪锛堝彲閫夛級" fieldProps={{ rows: 2 }} />
        <ProFormText name="languageHint" label="璇█鎻愮ず锛堝彲閫夛級" />
        <ProFormText name="regionHint" label="鍦板尯鎻愮ず锛堝彲閫夛級" />
        <ProFormText name="source" label="鏉ユ簮锛堝彲閫夛級" />
        <ProFormText name="status" label="鐘舵€侊紙鍙€夛級" />
        <ProFormTextArea name="notes" label="澶囨敞锛堝彲閫夛級" fieldProps={{ rows: 2 }} />
      </ModalForm>

      <ModalForm
        title={`缂栬緫鏉＄洰锛?{current?.name || ''}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        modalProps={{ destroyOnClose: true, width: 760 }}
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
          message.success('鏉＄洰宸叉洿鏂?);
          await runSafeFollowUp(reloadOverview);
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText name="name" label="鍚嶇О" rules={[{ required: true }]} />
        <ProFormText name="url" label="URL" rules={[{ required: true }]} />
        <ProFormSelect
          name="categoryName"
          label="鍒嗙被"
          options={categoryOptions}
          placeholder="杈撳叆鏂板垎绫伙紝鎴栭€夋嫨宸叉湁鍒嗙被"
          fieldProps={{ showSearch: true, allowClear: true }}
        />
        <ProFormSelect
          name="tags"
          label="鏍囩"
          mode="tags"
          fieldProps={{ tokenSeparators: [',', '\uFF0C', ' '] }}
        />
        <ProFormTextArea name="description" label="鎻忚堪" fieldProps={{ rows: 3 }} />
        <ProFormTextArea name="descriptionEn" label="鑻辨枃鎻忚堪锛堝彲閫夛級" fieldProps={{ rows: 2 }} />
        <ProFormText name="languageHint" label="璇█鎻愮ず锛堝彲閫夛級" />
        <ProFormText name="regionHint" label="鍦板尯鎻愮ず锛堝彲閫夛級" />
        <ProFormText name="source" label="鏉ユ簮锛堝彲閫夛級" />
        <ProFormText name="status" label="鐘舵€侊紙鍙€夛級" />
        <ProFormTextArea name="notes" label="澶囨敞锛堝彲閫夛級" fieldProps={{ rows: 2 }} />
      </ModalForm>

      <ModalForm
        title="瀵煎叆璧勬簮榛勯〉锛圝SON锛屽叏閲忔浛鎹級"
        open={importOpen}
        onOpenChange={setImportOpen}
        modalProps={{ destroyOnClose: true, width: 820 }}
        onFinish={async (values) => {
          try {
            const json = JSON.parse(values.jsonText || '');
            const res = await request<ImportResponse>('/admin/v1/data/resources-directory/import', {
              method: 'POST',
              body: JSON.stringify(json),
            });
            message.success(
              `瀵煎叆瀹屾垚锛氬垎绫?${res.categoriesInserted} 涓紝鏉＄洰 ${res.itemsInserted} 鏉★紝璺宠繃 ${res.skipped} 鏉
            );
            await runSafeFollowUp(reloadOverview);
            actionRef.current?.reload();
            return true;
          } catch (error: unknown) {
            message.error(getErrorMessage(error, 'JSON 瑙ｆ瀽鎴栧鍏ュけ璐?));
            return false;
          }
        }}
      >
        <ProFormTextArea
          name="jsonText"
          label="JSON 鍐呭"
          placeholder='绮樿创鍖呭惈 "items" 鏁扮粍鐨?JSON銆?
          extra="杩欐槸鍏ㄩ噺鏇挎崲鍏ュ彛銆傚鍏ュ墠璇风‘璁?JSON 宸茶鐩栦綘甯屾湜淇濈暀鐨勫叏閮ㄧ洰褰曟潯鐩€?
          fieldProps={{ rows: 14 }}
          rules={[{ required: true, message: '璇峰厛绮樿创 JSON 鍐呭' }]}
        />
      </ModalForm>
    </PageContainer>
  );
}
