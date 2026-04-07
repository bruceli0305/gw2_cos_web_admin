import {
  ModalForm,
  PageContainer,
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

type FortuneContentItem = {
  _id: string;
  version: string;
  status: 'draft' | 'live';
  titleThemes: string[];
  yiPool: string[];
  jiPool: string[];
  luckyProfessionPool: string[];
  luckyWeaponPool: string[];
  luckyMapPool: string[];
  luckyColorPool: string[];
  luckyCityPool: string[];
  worldTags: string[];
  toneRules: string[];
  createdAt?: string;
  updatedAt?: string;
};

type FortuneContentListResponse = {
  items: FortuneContentItem[];
};

type FortuneContentFormValues = {
  version?: string;
  titleThemesText?: string;
  yiPoolText?: string;
  jiPoolText?: string;
  luckyProfessionPoolText?: string;
  luckyWeaponPoolText?: string;
  luckyMapPoolText?: string;
  luckyColorPoolText?: string;
  luckyCityPoolText?: string;
  worldTagsText?: string;
  toneRulesText?: string;
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

function renderStatusTag(status: FortuneContentItem['status']) {
  return status === 'live' ? <Tag color="green">live</Tag> : <Tag color="gold">draft</Tag>;
}

export default function FortuneContentPage() {
  const actionRef = useRef<ActionType>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FortuneContentItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const columns: ProColumns<FortuneContentItem>[] = [
    {
      title: '版本',
      dataIndex: 'version',
      width: 160,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (_, record) => renderStatusTag(record.status),
    },
    {
      title: '标题 / 宜忌',
      dataIndex: 'titleThemes',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>标题主题 {record.titleThemes.length} 条</span>
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>
            宜 {record.yiPool.length} / 忌 {record.jiPool.length}
          </span>
        </Space>
      ),
    },
    {
      title: '幸运元素池',
      dataIndex: 'luckyProfessionPool',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>职业 {record.luckyProfessionPool.length} / 武器 {record.luckyWeaponPool.length}</span>
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>
            地图 {record.luckyMapPool.length} / 颜色 {record.luckyColorPool.length} / 城市 {record.luckyCityPool.length}
          </span>
        </Space>
      ),
    },
    {
      title: '语境标签',
      dataIndex: 'worldTags',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>{record.worldTags.length} 条</span>
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>
            toneRules {record.toneRules.length} 条
          </span>
        </Space>
      ),
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
              title: '确认发布这个内容池版本吗？',
              description: '发布后后续占签会切换到该内容池版本。',
            })}
            disabled={record.status === 'live'}
            onConfirm={async () => {
              await request(`/admin/v1/fortune/content/${record._id}/publish`, {
                method: 'PUT',
              });
              message.success('内容池版本已发布');
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
      title="内容池"
      subTitle="维护签名方向、宜忌池、幸运元素池和世界观语境标签。"
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
        message="本页管理占签内容池"
        description={(
          <div>
            <div>1. 内容池为 Prompt 提供标题主题、宜忌行为和幸运元素候选。</div>
            <div>2. 所有条目都应保持 GW2 欧服玩家语境，不要混入现实运势或泛玄学内容。</div>
            <div>3. 发布 live 版本后，后续抽签会读取该版本内容池。</div>
          </div>
        )}
        marginBottom={12}
      />

      <PageRequestErrorAlert
        message="无法加载内容池版本"
        description={errorMessage}
        onRetry={() => actionRef.current?.reload()}
      />

      <ProTable<FortuneContentItem>
        actionRef={actionRef}
        rowKey="_id"
        cardBordered
        search={false}
        pagination={false}
        columns={columns}
        request={async () => {
          try {
            const res = await request<FortuneContentListResponse>('/admin/v1/fortune/content');
            setErrorMessage(null);
            return { data: res.items, success: true };
          } catch (error: unknown) {
            setErrorMessage(getErrorMessage(error, '加载内容池版本失败'));
            throw error;
          }
        }}
      />

      <ModalForm<FortuneContentFormValues>
        title={editing ? '编辑内容池版本' : '新建内容池版本'}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        modalProps={{ destroyOnClose: true }}
        initialValues={{
          version: editing?.version,
          titleThemesText: joinLineArray(editing?.titleThemes),
          yiPoolText: joinLineArray(editing?.yiPool),
          jiPoolText: joinLineArray(editing?.jiPool),
          luckyProfessionPoolText: joinLineArray(editing?.luckyProfessionPool),
          luckyWeaponPoolText: joinLineArray(editing?.luckyWeaponPool),
          luckyMapPoolText: joinLineArray(editing?.luckyMapPool),
          luckyColorPoolText: joinLineArray(editing?.luckyColorPool),
          luckyCityPoolText: joinLineArray(editing?.luckyCityPool),
          worldTagsText: joinLineArray(editing?.worldTags),
          toneRulesText: joinLineArray(editing?.toneRules),
        }}
        onFinish={async (values) => {
          const payload = {
            ...(editing ? {} : { version: values.version }),
            titleThemes: parseLineArray(values.titleThemesText),
            yiPool: parseLineArray(values.yiPoolText),
            jiPool: parseLineArray(values.jiPoolText),
            luckyProfessionPool: parseLineArray(values.luckyProfessionPoolText),
            luckyWeaponPool: parseLineArray(values.luckyWeaponPoolText),
            luckyMapPool: parseLineArray(values.luckyMapPoolText),
            luckyColorPool: parseLineArray(values.luckyColorPoolText),
            luckyCityPool: parseLineArray(values.luckyCityPoolText),
            worldTags: parseLineArray(values.worldTagsText),
            toneRules: parseLineArray(values.toneRulesText),
          };

          if (editing) {
            await request(`/admin/v1/fortune/content/${editing._id}`, {
              method: 'PUT',
              body: JSON.stringify(payload),
            });
            message.success('内容池版本已更新');
          } else {
            await request('/admin/v1/fortune/content', {
              method: 'POST',
              body: JSON.stringify(payload),
            });
            message.success('内容池版本已创建');
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

        <ProFormTextArea name="titleThemesText" label="标题主题" fieldProps={{ rows: 4 }} />
        <ProFormTextArea name="yiPoolText" label="宜池" fieldProps={{ rows: 5 }} />
        <ProFormTextArea name="jiPoolText" label="忌池" fieldProps={{ rows: 5 }} />
        <ProFormTextArea name="luckyProfessionPoolText" label="幸运职业池" fieldProps={{ rows: 4 }} />
        <ProFormTextArea name="luckyWeaponPoolText" label="幸运武器池" fieldProps={{ rows: 4 }} />
        <ProFormTextArea name="luckyMapPoolText" label="幸运地图池" fieldProps={{ rows: 4 }} />
        <ProFormTextArea name="luckyColorPoolText" label="幸运颜色池" fieldProps={{ rows: 4 }} />
        <ProFormTextArea name="luckyCityPoolText" label="幸运城市池" fieldProps={{ rows: 4 }} />
        <ProFormTextArea name="worldTagsText" label="世界观标签" fieldProps={{ rows: 4 }} />
        <ProFormTextArea name="toneRulesText" label="语气规则" fieldProps={{ rows: 4 }} />
      </ModalForm>
    </PageContainer>
  );
}
