import {
  ModalForm,
  PageContainer,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { Button, Popconfirm, Space, Tag, message } from 'antd';
import { useRef, useState } from 'react';
import { getDestructivePopconfirmProps } from '../../components/confirmProps';
import { PageNoticeAlert, PageRequestErrorAlert } from '../../components/listPageState';
import { getErrorMessage, request } from '../../services/request';

type FortunePromptItem = {
  _id: string;
  key: 'daily-fortune';
  version: string;
  status: 'draft' | 'test' | 'live' | 'archived';
  systemPrompt: string;
  userPromptTemplate: string;
  forbiddenWords: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

type FortunePromptListResponse = {
  items: FortunePromptItem[];
};

type FortunePromptFormValues = {
  version?: string;
  status?: 'draft' | 'test' | 'archived' | 'live';
  systemPrompt: string;
  userPromptTemplate: string;
  forbiddenWordsText?: string;
  notes?: string;
};

function parseLineArray(value?: string) {
  return String(value ?? '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLineArray(value?: string[]) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function renderStatusTag(status: FortunePromptItem['status']) {
  if (status === 'live') return <Tag color="green">live</Tag>;
  if (status === 'test') return <Tag color="blue">test</Tag>;
  if (status === 'archived') return <Tag>archived</Tag>;
  return <Tag color="gold">draft</Tag>;
}

export default function FortunePromptsPage() {
  const actionRef = useRef<ActionType>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FortunePromptItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isEditingLive = editing?.status === 'live';

  const columns: ProColumns<FortunePromptItem>[] = [
    {
      title: '版本',
      dataIndex: 'version',
      width: 160,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>{record.version}</span>
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>{record.key}</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (_, record) => renderStatusTag(record.status),
    },
    {
      title: '系统提示词',
      dataIndex: 'systemPrompt',
      ellipsis: true,
    },
    {
      title: '用户模板',
      dataIndex: 'userPromptTemplate',
      ellipsis: true,
    },
    {
      title: '禁词数',
      dataIndex: 'forbiddenWords',
      width: 90,
      render: (_, record) => record.forbiddenWords?.length ?? 0,
    },
    {
      title: '备注',
      dataIndex: 'notes',
      ellipsis: true,
      render: (_, record) => record.notes || '-',
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      width: 170,
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
              setEditing(record);
              setFormOpen(true);
            }}
          >
            编辑
          </Button>

          <Popconfirm
            {...getDestructivePopconfirmProps({
              title: '确认发布这个提示词版本吗？',
              description: '发布后当前 live 版本会被归档，新生成请求将切换到该版本。',
            })}
            disabled={record.status === 'live'}
            onConfirm={async () => {
              await request(`/admin/v1/fortune/prompts/${record._id}/publish`, {
                method: 'PUT',
              });
              message.success('提示词版本已发布');
              actionRef.current?.reload();
            }}
          >
            <Button type="link" disabled={record.status === 'live'}>
              发布
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="提示词版本"
      subTitle="管理每日娱乐占签的系统提示词、模板和禁词版本。"
      extra={[
        <Button
          key="create"
          type="primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          新建版本
        </Button>,
      ]}
    >
      <PageNoticeAlert
        type="info"
        message="本页管理 LLM 提示词版本"
        description={(
          <div>
            <div>1. `systemPrompt` 定义模型角色边界，`userPromptTemplate` 负责拼接结构化输入。</div>
            <div>
              2. 模板支持 <code>{'{{fortune_input}}'}</code>、<code>{'{{content_config}}'}</code> 等占位符；不写占位符时后端也会自动补齐输入块。
            </div>
            <div>3. 发布后只影响后续生成，不会改写历史记录绑定的版本号。</div>
          </div>
        )}
        marginBottom={12}
      />

      <PageRequestErrorAlert
        message="无法加载提示词版本"
        description={errorMessage}
        onRetry={() => actionRef.current?.reload()}
      />

      <ProTable<FortunePromptItem>
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        search={false}
        pagination={false}
        columns={columns}
        request={async () => {
          try {
            const res = await request<FortunePromptListResponse>('/admin/v1/fortune/prompts');
            setErrorMessage(null);
            return { data: res.items, success: true };
          } catch (error: unknown) {
            setErrorMessage(getErrorMessage(error, '加载提示词版本失败'));
            throw error;
          }
        }}
      />

      <ModalForm<FortunePromptFormValues>
        title={editing ? '编辑提示词版本' : '新建提示词版本'}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        modalProps={{ destroyOnClose: true }}
        initialValues={{
          version: editing?.version,
          status: editing?.status || 'draft',
          systemPrompt: editing?.systemPrompt,
          userPromptTemplate: editing?.userPromptTemplate,
          forbiddenWordsText: joinLineArray(editing?.forbiddenWords),
          notes: editing?.notes,
        }}
        onFinish={async (values) => {
          const payload = {
            ...(editing ? {} : { version: values.version }),
            ...(!isEditingLive ? { status: values.status } : {}),
            systemPrompt: values.systemPrompt,
            userPromptTemplate: values.userPromptTemplate,
            forbiddenWords: parseLineArray(values.forbiddenWordsText),
            notes: values.notes || undefined,
          };

          if (editing) {
            await request(`/admin/v1/fortune/prompts/${editing._id}`, {
              method: 'PUT',
              body: JSON.stringify(payload),
            });
            message.success('提示词版本已更新');
          } else {
            await request('/admin/v1/fortune/prompts', {
              method: 'POST',
              body: JSON.stringify(payload),
            });
            message.success('提示词版本已创建');
          }

          actionRef.current?.reload();
          return true;
        }}
      >
        {!editing ? (
          <ProFormText
            name="version"
            label="版本号"
            rules={[{ required: true, message: '必填' }]}
          />
        ) : null}

        <ProFormSelect
          name="status"
          label="状态"
          valueEnum={{
            draft: { text: 'draft' },
            test: { text: 'test' },
            archived: { text: 'archived' },
          }}
          rules={[{ required: true, message: '必填' }]}
        />

        <ProFormTextArea
          name="systemPrompt"
          label="系统提示词"
          rules={[{ required: true, message: '必填' }]}
          fieldProps={{ rows: 6 }}
        />

        <ProFormTextArea
          name="userPromptTemplate"
          label="用户模板"
          rules={[{ required: true, message: '必填' }]}
          fieldProps={{ rows: 10 }}
        />

        <ProFormTextArea
          name="forbiddenWordsText"
          label="禁词"
          extra="每行一个禁词或高风险片段。"
          fieldProps={{ rows: 5 }}
        />

        <ProFormTextArea
          name="notes"
          label="备注"
          fieldProps={{ rows: 3 }}
        />
      </ModalForm>
    </PageContainer>
  );
}
