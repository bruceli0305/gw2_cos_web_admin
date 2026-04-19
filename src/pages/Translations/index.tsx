import {
  ModalForm,
  PageContainer,
  ProFormSelect,
  ProFormSwitch,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { Button, Card, Col, Popconfirm, Row, Space, Statistic, Tag, message } from 'antd';
import { useRef, useState } from 'react';
import { getDestructivePopconfirmProps } from '../../components/confirmProps';
import { PageNoticeAlert, PageRequestErrorAlert } from '../../components/listPageState';
import { getFilterAwareTableProps } from '../../components/tableState';
import { getErrorMessage, request } from '../../services/request';

type TranslationItem = {
  _id: string;
  direction: 'CN_TO_EN' | 'EN_TO_CN';
  sourceText: string;
  sourceTextNorm: string;
  translatedText: string;
  usageCount: number;
  providerId?: string;
  model?: string;
  updatedAt: string;
};

type TableRequestParams = {
  current?: number;
  pageSize?: number;
  q?: string;
};

type TranslationListResponse = {
  items: TranslationItem[];
  total: number;
};

type TranslationEditValues = {
  translatedText: string;
};

type TranslationCreateValues = {
  direction: 'CN_TO_EN' | 'EN_TO_CN';
  sourceText: string;
  translatedText: string;
  overwrite?: boolean;
};

export default function TranslationsPage() {
  const actionRef = useRef<ActionType>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<TranslationItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearch, setHasSearch] = useState(false);
  const [tableSummary, setTableSummary] = useState({ total: 0, rows: 0, usage: 0, cnToEn: 0, enToCn: 0 });
  const tableState = getFilterAwareTableProps({
    hasFilters: hasSearch,
    searchText: '搜索缓存条目',
    filteredEmptyText: '没有匹配当前搜索条件的缓存条目。',
    emptyText: '当前还没有任何翻译缓存条目。',
  });

  const columns: ProColumns<TranslationItem>[] = [
    { title: '原文 / 译文', dataIndex: 'q', hideInTable: true },
    {
      title: '方向',
      dataIndex: 'direction',
      width: 110,
      valueEnum: {
        CN_TO_EN: { text: '中转英' },
        EN_TO_CN: { text: '英转中' },
      },
      render: (_, record) => <Tag>{record.direction === 'CN_TO_EN' ? '中转英' : '英转中'}</Tag>,
    },
    {
      title: '归一化原文',
      dataIndex: 'sourceTextNorm',
      ellipsis: true,
      copyable: true,
    },
    {
      title: '译文',
      dataIndex: 'translatedText',
      ellipsis: true,
    },
    {
      title: '调用次数',
      dataIndex: 'usageCount',
      width: 90,
      search: false,
    },
    {
      title: '模型',
      dataIndex: 'model',
      width: 140,
      search: false,
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
      width: 180,
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
              title: '确定删除该缓存条目？',
              description: '这会删除当前缓存的翻译对，后续请求仍可能通过上游翻译流程重新生成。',
            })}
            onConfirm={async () => {
              await request(`/admin/v1/translations/${record._id}`, { method: 'DELETE' });
              message.success('缓存条目已删除');
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
      title="翻译缓存"
      subTitle="查看翻译缓存、手工修正项和按方向区分的术语对。"
      extra={[
        <Button key="create" type="primary" onClick={() => setCreateOpen(true)}>
          新建缓存条目
        </Button>,
      ]}
    >
      <PageRequestErrorAlert
        message="无法加载翻译缓存条目"
        description={errorMessage}
        onRetry={() => actionRef.current?.reload()}
      />

      <PageNoticeAlert
        type="info"
        message="本页管理的是翻译缓存本身"
        description={(
          <div>
            <div>1. 这里维护的是已经落库的翻译对，而不是实时上游翻译响应。</div>
            <div>2. 顶部摘要会区分缓存规模、当前页调用量和当前页的翻译方向分布。</div>
            <div>3. 手工新建条目时可以选择是否覆盖已有缓存记录。</div>
          </div>
        )}
        marginBottom={12}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title={hasSearch ? '筛选结果数' : '缓存总量'} value={tableSummary.total} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>
              {hasSearch ? '当前搜索条件下的总匹配缓存条目数。' : '当前翻译缓存库中的总条目数。'}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前页调用量" value={tableSummary.usage} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>按当前结果页累计的 usageCount 汇总，用于判断热度。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前页中转英" value={tableSummary.cnToEn} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前结果页里 `CN_TO_EN` 方向的缓存条目数。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前页英转中" value={tableSummary.enToCn} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前结果页里 `EN_TO_CN` 方向的缓存条目数。</div>
          </Card>
        </Col>
      </Row>

      <ProTable<TranslationItem>
        actionRef={actionRef}
        rowKey="_id"
        columns={columns}
        cardBordered
        {...tableState}
        request={async (params) => {
          const query = params as TableRequestParams;
          setHasSearch(Boolean(query.q));

          try {
            const res = await request<TranslationListResponse>('/admin/v1/translations', {
              params: {
                page: query.current || 1,
                limit: query.pageSize || 20,
                q: query.q || '',
                sort: 'created',
              },
            });
            setTableSummary({
              total: res.total,
              rows: res.items.length,
              usage: res.items.reduce((sum, item) => sum + item.usageCount, 0),
              cnToEn: res.items.filter((item) => item.direction === 'CN_TO_EN').length,
              enToCn: res.items.filter((item) => item.direction === 'EN_TO_CN').length,
            });
            setErrorMessage(null);
            return { data: res.items, total: res.total, success: true };
          } catch (error: unknown) {
            setErrorMessage(getErrorMessage(error, '加载翻译缓存条目失败'));
            throw error;
          }
        }}
      />

      <ModalForm<TranslationEditValues>
        title="编辑缓存条目"
        open={editOpen}
        onOpenChange={setEditOpen}
        modalProps={{ destroyOnHidden: true }}
        onFinish={async (values) => {
          if (!current) return false;
          await request(`/admin/v1/translations/${current._id}`, {
            method: 'PUT',
            body: JSON.stringify({ translatedText: values.translatedText }),
          });
          message.success('缓存条目已更新');
          actionRef.current?.reload();
          return true;
        }}
        initialValues={{ translatedText: current?.translatedText }}
      >
        <ProFormTextArea
          name="translatedText"
          label="译文"
          rules={[{ required: true, message: '必填' }]}
          fieldProps={{ rows: 6 }}
        />
      </ModalForm>

      <ModalForm<TranslationCreateValues>
        title="新建缓存条目"
        open={createOpen}
        onOpenChange={setCreateOpen}
        modalProps={{ destroyOnHidden: true }}
        initialValues={{ direction: 'EN_TO_CN', overwrite: true }}
        onFinish={async (values) => {
          await request('/admin/v1/translations', {
            method: 'POST',
            body: JSON.stringify({
              direction: values.direction,
              sourceText: values.sourceText,
            translatedText: values.translatedText,
            overwrite: values.overwrite,
          }),
        });
          message.success('缓存条目已保存');
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormSelect
          name="direction"
          label="翻译方向"
          valueEnum={{
            CN_TO_EN: { text: '中转英' },
            EN_TO_CN: { text: '英转中' },
          }}
          rules={[{ required: true, message: '必填' }]}
        />

        <ProFormTextArea
          name="sourceText"
          label="原文"
          extra="请填写你希望缓存精确匹配的原文短语。"
          rules={[{ required: true, message: '必填' }]}
          fieldProps={{ rows: 4 }}
        />

        <ProFormTextArea
          name="translatedText"
          label="译文"
          rules={[{ required: true, message: '必填' }]}
          fieldProps={{ rows: 6 }}
        />

        <ProFormSwitch
          name="overwrite"
          label="覆盖已有条目"
          tooltip="当你希望手工条目替换同方向、同原文的现有缓存记录时启用。"
        />
      </ModalForm>
    </PageContainer>
  );
}
