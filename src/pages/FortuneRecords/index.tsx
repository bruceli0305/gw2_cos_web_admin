import { PageContainer, ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, Card, Col, Modal, Row, Space, Statistic, Tag } from 'antd';
import { useRef, useState } from 'react';
import { PageNoticeAlert, PageRequestErrorAlert } from '../../components/listPageState';
import { getFilterAwareTableProps } from '../../components/tableState';
import { getErrorMessage, request } from '../../services/request';

type FortuneRecordItem = {
  _id: string;
  userId: string;
  username: string;
  fortuneDate: string;
  status: 'success' | 'failed';
  title?: string;
  level?: string;
  mainLine?: string;
  providerId?: string;
  model?: string;
  promptVersion?: string;
  contentVersion?: string;
  posterConfigVersion?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
};

type FortuneRecordListResponse = {
  items: FortuneRecordItem[];
  total: number;
  page: number;
  limit: number;
  summary?: {
    total: number;
    success: number;
    failed: number;
  };
};

type FortuneRecordDetail = FortuneRecordItem & {
  usernameLower?: string;
  result?: unknown;
  inputSnapshot?: unknown;
  divinationFrame?: unknown;
  promptSnapshot?: {
    systemPrompt?: string;
    userPrompt?: string;
  };
  llmRawText?: string;
};

type TableRequestParams = {
  current?: number;
  pageSize?: number;
  q?: string;
  status?: 'success' | 'failed';
  fortuneDate?: string;
};

function renderStatusTag(status: FortuneRecordItem['status']) {
  return status === 'success' ? <Tag color="green">成功</Tag> : <Tag color="red">失败</Tag>;
}

function renderJsonBlock(value: unknown) {
  return (
    <pre
      style={{
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontSize: 12,
        lineHeight: 1.6,
      }}
    >
      {JSON.stringify(value ?? null, null, 2)}
    </pre>
  );
}

export default function FortuneRecordsPage() {
  const actionRef = useRef<ActionType>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasFilters, setHasFilters] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState<FortuneRecordDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    total: 0,
    success: 0,
    failed: 0,
    currentView: '全部记录',
  });
  const tableState = getFilterAwareTableProps({
    hasFilters,
    searchText: '筛选记录',
    filteredEmptyText: '当前筛选条件下没有匹配的占签记录。',
    emptyText: '当前还没有任何占签记录。',
  });

  const columns: ProColumns<FortuneRecordItem>[] = [
    { title: '玩家 / 用户', dataIndex: 'q', hideInTable: true },
    {
      title: '状态',
      dataIndex: 'status',
      hideInTable: true,
      valueType: 'select',
      valueEnum: {
        success: { text: '成功' },
        failed: { text: '失败' },
      },
    },
    {
      title: '日期',
      dataIndex: 'fortuneDate',
      hideInTable: true,
      valueType: 'date',
    },
    {
      title: '玩家',
      dataIndex: 'username',
      width: 160,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>{record.username || '未知用户'}</span>
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>{record.userId}</span>
        </Space>
      ),
    },
    {
      title: '占签日期',
      dataIndex: 'fortuneDate',
      width: 120,
      search: false,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      search: false,
      render: (_, record) => renderStatusTag(record.status),
    },
    {
      title: '签名 / 主签句',
      dataIndex: 'title',
      search: false,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>{record.title || '-'}</span>
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>{record.mainLine || '-'}</span>
        </Space>
      ),
    },
    {
      title: '签势',
      dataIndex: 'level',
      width: 90,
      search: false,
      render: (_, record) => (record.level ? <Tag>{record.level}</Tag> : '-'),
    },
    {
      title: '模型',
      dataIndex: 'model',
      width: 180,
      search: false,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>{record.providerId || '-'}</span>
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>{record.model || '-'}</span>
        </Space>
      ),
    },
    {
      title: '版本命中',
      dataIndex: 'promptVersion',
      width: 220,
      search: false,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>Prompt: {record.promptVersion || '-'}</span>
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>
            Content: {record.contentVersion || '-'} / Poster: {record.posterConfigVersion || '-'}
          </span>
        </Space>
      ),
    },
    {
      title: '失败原因',
      dataIndex: 'errorCode',
      search: false,
      render: (_, record) =>
        record.status === 'failed' ? (
          <Space direction="vertical" size={0}>
            <span>{record.errorCode || '-'}</span>
            <span style={{ color: '#8c8c8c', fontSize: 12 }}>{record.errorMessage || '-'}</span>
          </Space>
        ) : (
          '-'
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      width: 100,
      search: false,
      render: (_, record) => [
        <Button
          key="detail"
          type="link"
          onClick={async () => {
            setDetailOpen(true);
            setDetailLoading(true);
            setDetailRecord(null);
            setDetailError(null);
            try {
              const detail = await request<FortuneRecordDetail>(
                `/admin/v1/fortune/records/${record._id}`
              );
              setDetailRecord(detail);
            } catch (error: unknown) {
              setDetailError(getErrorMessage(error, '加载记录详情失败'));
            } finally {
              setDetailLoading(false);
            }
          }}
        >
          详情
        </Button>,
      ],
    },
  ];

  return (
    <PageContainer
      title="占签记录"
      subTitle="查看每日结果、失败记录、模型命中和版本信息。"
    >
      <PageNoticeAlert
        type="info"
        message="本页用于排查生成结果与失败原因。"
        description={(
          <div>
            <div>1. `success` 记录用于回放玩家当天正式占签结果。</div>
            <div>2. `failed` 记录用于定位配置缺失、Provider 不可用和结构校验失败等问题。</div>
            <div>3. 点击“详情”可查看术数骨架、提示词快照和原始 LLM 返回，便于回溯具体生成链路。</div>
          </div>
        )}
        marginBottom={12}
      />

      <PageRequestErrorAlert
        message="无法加载占签记录"
        description={errorMessage}
        onRetry={() => actionRef.current?.reload()}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="记录总量" value={summary.total} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="成功记录" value={summary.success} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="失败记录" value={summary.failed} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" bordered={false} style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前视图" value={summary.currentView} />
          </Card>
        </Col>
      </Row>

      <ProTable<FortuneRecordItem>
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        columns={columns}
        {...tableState}
        request={async (params) => {
          const query = params as TableRequestParams;
          const nextHasFilters = Boolean(query.q || query.status || query.fortuneDate);
          setHasFilters(nextHasFilters);

          try {
            const res = await request<FortuneRecordListResponse>('/admin/v1/fortune/records', {
              params: {
                page: query.current || 1,
                limit: query.pageSize || 20,
                q: query.q || '',
                status: query.status || '',
                fortuneDate: query.fortuneDate || '',
              },
            });

            setSummary({
              total: res.summary?.total ?? res.total,
              success:
                res.summary?.success ?? res.items.filter((item) => item.status === 'success').length,
              failed:
                res.summary?.failed ?? res.items.filter((item) => item.status === 'failed').length,
              currentView: nextHasFilters ? '筛选中' : '全部记录',
            });
            setErrorMessage(null);
            return { data: res.items, total: res.total, success: true };
          } catch (error: unknown) {
            setErrorMessage(getErrorMessage(error, '加载占签记录失败'));
            throw error;
          }
        }}
      />

      <Modal
        title="占签记录详情"
        open={detailOpen}
        footer={null}
        width={960}
        destroyOnClose
        onCancel={() => {
          setDetailOpen(false);
          setDetailLoading(false);
          setDetailRecord(null);
          setDetailError(null);
        }}
      >
        {detailLoading ? (
          <div>正在加载详情...</div>
        ) : detailError ? (
          <div>{detailError}</div>
        ) : !detailRecord ? (
          <div>未找到可查看的记录详情。</div>
        ) : (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card size="small" title="基本信息">
              {renderJsonBlock({
                id: detailRecord._id,
                userId: detailRecord.userId,
                username: detailRecord.username,
                usernameLower: detailRecord.usernameLower,
                fortuneDate: detailRecord.fortuneDate,
                status: detailRecord.status,
                providerId: detailRecord.providerId,
                model: detailRecord.model,
                promptVersion: detailRecord.promptVersion,
                contentVersion: detailRecord.contentVersion,
                posterConfigVersion: detailRecord.posterConfigVersion,
                errorCode: detailRecord.errorCode,
                errorMessage: detailRecord.errorMessage,
                createdAt: detailRecord.createdAt,
                updatedAt: detailRecord.updatedAt,
              })}
            </Card>

            <Card size="small" title="正式结果">
              {renderJsonBlock(detailRecord.result)}
            </Card>

            <Card size="small" title="输入快照">
              {renderJsonBlock(detailRecord.inputSnapshot)}
            </Card>

            <Card size="small" title="术数骨架">
              {renderJsonBlock(detailRecord.divinationFrame)}
            </Card>

            <Card size="small" title="System Prompt">
              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: 12,
                  lineHeight: 1.6,
                  maxHeight: 240,
                  overflow: 'auto',
                }}
              >
                {detailRecord.promptSnapshot?.systemPrompt || '-'}
              </pre>
            </Card>

            <Card size="small" title="User Prompt">
              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: 12,
                  lineHeight: 1.6,
                  maxHeight: 320,
                  overflow: 'auto',
                }}
              >
                {detailRecord.promptSnapshot?.userPrompt || '-'}
              </pre>
            </Card>

            <Card size="small" title="LLM Raw Text">
              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: 12,
                  lineHeight: 1.6,
                  maxHeight: 320,
                  overflow: 'auto',
                }}
              >
                {detailRecord.llmRawText || '-'}
              </pre>
            </Card>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
}
