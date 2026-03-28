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
import { Button, Popconfirm, Space, Tag, message } from 'antd';
import { useRef, useState } from 'react';
import { PageRequestErrorAlert } from '../../components/listPageState';
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
  const tableState = getFilterAwareTableProps({
    hasFilters: hasSearch,
    searchText: 'Search translations',
    filteredEmptyText: 'No translation entries match the current search.',
    emptyText: 'No translation cache entries have been created yet.',
  });

  const columns: ProColumns<TranslationItem>[] = [
    { title: 'Keyword', dataIndex: 'q', hideInTable: true },
    {
      title: 'Direction',
      dataIndex: 'direction',
      width: 110,
      valueEnum: {
        CN_TO_EN: { text: 'CN to EN' },
        EN_TO_CN: { text: 'EN to CN' },
      },
      render: (_, record) => <Tag>{record.direction === 'CN_TO_EN' ? 'CN to EN' : 'EN to CN'}</Tag>,
    },
    {
      title: 'Normalized Source',
      dataIndex: 'sourceTextNorm',
      ellipsis: true,
      copyable: true,
    },
    {
      title: 'Translation',
      dataIndex: 'translatedText',
      ellipsis: true,
    },
    {
      title: 'Usage Count',
      dataIndex: 'usageCount',
      width: 90,
      search: false,
    },
    {
      title: 'Model',
      dataIndex: 'model',
      width: 140,
      search: false,
    },
    {
      title: 'Updated At',
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    {
      title: 'Actions',
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
            Edit
          </Button>

          <Popconfirm
            title="Delete this translation entry?"
            onConfirm={async () => {
              await request(`/admin/v1/translations/${record._id}`, { method: 'DELETE' });
              message.success('Deleted');
              actionRef.current?.reload();
            }}
          >
            <Button type="link" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="Translations"
      subTitle="Inspect, edit, delete, and manually add translation cache entries"
      extra={[
        <Button key="create" type="primary" onClick={() => setCreateOpen(true)}>
          Create Entry
        </Button>,
      ]}
    >
      <PageRequestErrorAlert
        message="Unable to load translation entries"
        description={errorMessage}
        onRetry={() => actionRef.current?.reload()}
      />

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
                sort: 'hot',
              },
            });
            setErrorMessage(null);
            return { data: res.items, total: res.total, success: true };
          } catch (error: unknown) {
            setErrorMessage(getErrorMessage(error, 'Failed to load translation entries'));
            throw error;
          }
        }}
      />

      <ModalForm<TranslationEditValues>
        title="Edit Translation"
        open={editOpen}
        onOpenChange={setEditOpen}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          if (!current) return false;
          await request(`/admin/v1/translations/${current._id}`, {
            method: 'PUT',
            body: JSON.stringify({ translatedText: values.translatedText }),
          });
          message.success('Updated');
          actionRef.current?.reload();
          return true;
        }}
        initialValues={{ translatedText: current?.translatedText }}
      >
        <ProFormTextArea
          name="translatedText"
          label="Translation"
          rules={[{ required: true, message: 'Required' }]}
          fieldProps={{ rows: 6 }}
        />
      </ModalForm>

      <ModalForm<TranslationCreateValues>
        title="Create Translation"
        open={createOpen}
        onOpenChange={setCreateOpen}
        modalProps={{ destroyOnClose: true }}
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
          message.success('Saved');
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormSelect
          name="direction"
          label="Direction"
          valueEnum={{
            CN_TO_EN: { text: 'CN to EN' },
            EN_TO_CN: { text: 'EN to CN' },
          }}
          rules={[{ required: true, message: 'Required' }]}
        />

        <ProFormTextArea
          name="sourceText"
          label="Source Text"
          rules={[{ required: true, message: 'Required' }]}
          fieldProps={{ rows: 4 }}
        />

        <ProFormTextArea
          name="translatedText"
          label="Translated Text"
          rules={[{ required: true, message: 'Required' }]}
          fieldProps={{ rows: 6 }}
        />

        <ProFormSwitch
          name="overwrite"
          label="Overwrite Existing Entry"
        />
      </ModalForm>
    </PageContainer>
  );
}
