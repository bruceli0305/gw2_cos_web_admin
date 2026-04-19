import {
  PageContainer,
  ProTable,
  type ProColumns,
  type ActionType,
  ModalForm,
  ProFormText,
  ProFormTextArea,
  ProFormDigit,
  ProFormSelect,
} from '@ant-design/pro-components';
import { Button, Card, Col, Row, Statistic, message, Popconfirm, Space, Tabs, Tag } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageNoticeAlert, PageRequestErrorAlert } from '../../components/listPageState';
import { getFilterAwareTableProps } from '../../components/tableState';
import { runSafeFollowUp } from '../../services/followUp';
import { getErrorMessage, request } from '../../services/request';

type SlangGroup = {
  _id: string;
  name: string;
  order: number;
  updatedAt: string;
};

type SlangTerm = {
  _id: string;
  groupId: string;
  groupName?: string;
  zh: string;
  en: string;
  note?: string;
  order: number;
  updatedAt: string;
};

export default function SlangPage() {
  const groupActionRef = useRef<ActionType>(null);
  const termActionRef = useRef<ActionType>(null);

  const [groups, setGroups] = useState<SlangGroup[]>([]);
  const [groupsErrorMessage, setGroupsErrorMessage] = useState<string | null>(null);
  const [termTableErrorMessage, setTermTableErrorMessage] = useState<string | null>(null);
  const [hasTermFilters, setHasTermFilters] = useState(false);
  const [termTotal, setTermTotal] = useState(0);
  const [termPageCount, setTermPageCount] = useState(0);
  const [activeTab, setActiveTab] = useState('terms');

  // ===== Group modals =====
  const [groupCreateOpen, setGroupCreateOpen] = useState(false);
  const [groupEditOpen, setGroupEditOpen] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<SlangGroup | null>(null);

  // ===== Term modals =====
  const [termCreateOpen, setTermCreateOpen] = useState(false);
  const [termEditOpen, setTermEditOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState<SlangTerm | null>(null);
  const termTableState = getFilterAwareTableProps({
    hasFilters: hasTermFilters,
    searchText: '应用筛选',
    filteredEmptyText: '当前筛选条件下没有匹配的黑话条目。',
    emptyText: '当前还没有录入任何黑话条目。',
  });

  const fetchGroups = useCallback(async () => {
    const res = await request<{ items: SlangGroup[] }>('/admin/v1/slang/groups');
    return res.items || [];
  }, []);

  const refreshGroups = useCallback(async () => {
    const items = await fetchGroups();
    setGroups(items);
    setGroupsErrorMessage(null);
    return items;
  }, [fetchGroups]);

  useEffect(() => {
    let active = true;

    async function loadGroups() {
      try {
        const items = await fetchGroups();
        if (!active) return;
        setGroups(items);
        setGroupsErrorMessage(null);
      } catch (error: unknown) {
        if (active) {
          setGroupsErrorMessage(getErrorMessage(error, '加载黑话分组失败'));
        }
      }
    }

    void loadGroups();
    return () => {
      active = false;
    };
  }, [fetchGroups]);

  type TermTableRequestParams = {
    current?: number;
    pageSize?: number;
    q?: string;
    groupId?: string;
  };

  type TermListResponse = {
    items: SlangTerm[];
    total: number;
  };

  const groupValueEnum = useMemo(() => {
    const e: Record<string, { text: string }> = {};
    groups.forEach((g) => {
      e[g._id] = { text: g.name };
    });
    return e;
  }, [groups]);
  const slangSummary = useMemo(() => {
    return {
      groupCount: groups.length,
      termTotal,
      termPageCount,
      currentView: hasTermFilters ? '筛选中' : '全部词条',
      workspace: activeTab === 'terms' ? '黑话条目' : '分组管理',
    };
  }, [activeTab, groups.length, hasTermFilters, termPageCount, termTotal]);

  const groupColumns: ProColumns<SlangGroup>[] = [
    {
      title: '分组名',
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: '排序',
      dataIndex: 'order',
      width: 90,
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
              setCurrentGroup(record);
              setGroupEditOpen(true);
            }}
          >
            编辑
          </Button>

          <Popconfirm
            title="确定删除该分组？（分组内仍有条目将无法删除）"
            description="只有在该分组下没有黑话条目时才能删除。"
            onConfirm={async () => {
              await request(`/admin/v1/slang/groups/${record._id}`, { method: 'DELETE' });
              message.success('已删除');
              await runSafeFollowUp(refreshGroups);
              groupActionRef.current?.reload();
              termActionRef.current?.reload();
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

  const termColumns: ProColumns<SlangTerm>[] = [
    {
      title: '关键词',
      dataIndex: 'q',
      hideInTable: true,
    },
    {
      title: '分组',
      dataIndex: 'groupId',
      width: 140,
      valueType: 'select',
      valueEnum: groupValueEnum,
      render: (_, r) => <Tag>{r.groupName || groupValueEnum[r.groupId]?.text || '-'}</Tag>,
    },
    {
      title: '中文黑话',
      dataIndex: 'zh',
      ellipsis: true,
      copyable: true,
    },
    {
      title: '英文/缩写',
      dataIndex: 'en',
      ellipsis: true,
      copyable: true,
    },
    {
      title: '备注',
      dataIndex: 'note',
      ellipsis: true,
      search: false,
    },
    {
      title: '排序',
      dataIndex: 'order',
      width: 90,
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
              setCurrentTerm(record);
              setTermEditOpen(true);
            }}
          >
            编辑
          </Button>

          <Popconfirm
            title="确定删除该条黑话？"
            description="删除后前台和小程序将不再能快捷查询到这条黑话。"
            onConfirm={async () => {
              await request(`/admin/v1/slang/terms/${record._id}`, { method: 'DELETE' });
              message.success('已删除');
              termActionRef.current?.reload();
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
      title="黑话词典"
      subTitle="录入/管理游戏内黑话（中文 → 英文/缩写），供前台/小程序快捷复制使用"
    >
      <PageNoticeAlert
        type="info"
        message="本页维护黑话条目和分组结构"
        description={(
          <div>
            <div>1. “黑话条目”维护中文黑话、英文缩写和备注，用于前台与小程序快捷复制。</div>
            <div>2. “分组管理”只负责条目归类与排序，不直接修改条目内容。</div>
            <div>3. 删除分组前请先处理分组内条目；删除黑话后前台会立即失去对应映射。</div>
          </div>
        )}
        marginBottom={12}
      />

      <PageRequestErrorAlert
        message="无法加载黑话分组"
        description={groupsErrorMessage}
        onRetry={() => void refreshGroups().catch(() => undefined)}
      />

      <PageRequestErrorAlert
        message="无法加载黑话条目"
        description={termTableErrorMessage}
        onRetry={() => termActionRef.current?.reload()}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="分组总量" value={slangSummary.groupCount} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前黑话词典已建立的分组数量。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="词条总量" value={slangSummary.termTotal} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>当前查询结果对应的黑话条目总数。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前页词条" value={slangSummary.termPageCount} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>用于快速判断当前页载入和筛选结果规模。</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
          <Card size="small" variant="borderless" style={{ width: '100%', borderRadius: 20 }}>
            <Statistic title="当前工作台" value={slangSummary.workspace} />
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>
              {slangSummary.currentView}，当前页签决定你在维护词条还是分组。
            </div>
          </Card>
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="terms"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'terms',
            label: '黑话条目',
            children: (
              <>
                <ProTable<SlangTerm>
                  actionRef={termActionRef}
                  rowKey="_id"
                  columns={termColumns}
                  cardBordered
                  {...termTableState}
                  toolBarRender={() => [
                    <Button key="create" type="primary" onClick={() => setTermCreateOpen(true)}>
                      新增黑话
                    </Button>,
                  ]}
                  request={async (params) => {
                    const query = params as TermTableRequestParams;
                    setHasTermFilters(Boolean(query.q || query.groupId));

                    try {
                      const res = await request<TermListResponse>('/admin/v1/slang/terms', {
                        params: {
                          page: query.current || 1,
                          limit: query.pageSize || 20,
                          q: query.q || '',
                          groupId: query.groupId || '',
                        },
                      });
                      setTermTableErrorMessage(null);
                      setTermTotal(res.total);
                      setTermPageCount(res.items.length);
                      return { data: res.items, total: res.total, success: true };
                    } catch (error: unknown) {
                      setTermTableErrorMessage(getErrorMessage(error, '加载黑话条目失败'));
                      throw error;
                    }
                  }}
                />

                <ModalForm
                  title="新增黑话"
                  open={termCreateOpen}
                  onOpenChange={setTermCreateOpen}
                  modalProps={{ destroyOnHidden: true, width: 760 }}
                  initialValues={{ order: undefined, note: '' }}
                  onFinish={async (values) => {
                    await request('/admin/v1/slang/terms', {
                      method: 'POST',
                      body: JSON.stringify({
                        groupId: values.groupId,
                        zh: values.zh,
                        en: values.en,
                        note: values.note || '',
                        order: values.order,
                      }),
                    });
                    message.success('已保存');
                    termActionRef.current?.reload();
                    return true;
                  }}
                >
                  <ProFormSelect
                    name="groupId"
                    label="分组"
                    valueEnum={groupValueEnum}
                    rules={[{ required: true, message: '必选' }]}
                    fieldProps={{ placeholder: '选择分组' }}
                    extra="分组会影响词典展示归类，建议先建好分类再录入条目。"
                  />
                  <ProFormText
                    name="zh"
                    label="中文黑话"
                    rules={[{ required: true, message: '必填' }]}
                    fieldProps={{ placeholder: '例如：跳跳乐' }}
                  />
                  <ProFormText
                    name="en"
                    label="英文/缩写"
                    rules={[{ required: true, message: '必填' }]}
                    fieldProps={{ placeholder: '例如：JP' }}
                  />
                  <ProFormTextArea
                    name="note"
                    label="备注（可选）"
                    extra="用于补充全称、语境或特殊说明，不建议重复填写缩写本身。"
                    fieldProps={{ rows: 3, placeholder: '例如：Jumping Puzzle' }}
                  />
                  <ProFormDigit
                    name="order"
                    label="排序（可选）"
                    fieldProps={{ precision: 0, placeholder: '不填则自动生成' }}
                  />
                </ModalForm>

                <ModalForm
                  title="编辑黑话"
                  open={termEditOpen}
                  onOpenChange={setTermEditOpen}
                  modalProps={{ destroyOnHidden: true, width: 760 }}
                  initialValues={
                    currentTerm
                      ? {
                          groupId: currentTerm.groupId,
                          zh: currentTerm.zh,
                          en: currentTerm.en,
                          note: currentTerm.note || '',
                          order: currentTerm.order,
                        }
                      : undefined
                  }
                  onFinish={async (values) => {
                    if (!currentTerm) return false;
                    await request(`/admin/v1/slang/terms/${currentTerm._id}`, {
                      method: 'PUT',
                      body: JSON.stringify({
                        groupId: values.groupId,
                        zh: values.zh,
                        en: values.en,
                        note: values.note || '',
                        order: values.order,
                      }),
                    });
                    message.success('已更新');
                    termActionRef.current?.reload();
                    return true;
                  }}
                >
                  <ProFormSelect
                    name="groupId"
                    label="分组"
                    valueEnum={groupValueEnum}
                    rules={[{ required: true, message: '必选' }]}
                    extra="修改分组会直接改变这条黑话在前台词典中的归类。"
                  />
                  <ProFormText
                    name="zh"
                    label="中文黑话"
                    rules={[{ required: true, message: '必填' }]}
                  />
                  <ProFormText
                    name="en"
                    label="英文/缩写"
                    rules={[{ required: true, message: '必填' }]}
                  />
                  <ProFormTextArea
                    name="note"
                    label="备注（可选）"
                    extra="用于补充全称、出处或适用语境。"
                    fieldProps={{ rows: 3 }}
                  />
                  <ProFormDigit
                    name="order"
                    label="排序"
                    fieldProps={{ precision: 0 }}
                  />
                </ModalForm>
              </>
            ),
          },
          {
            key: 'groups',
            label: '分组管理',
            children: (
              <>
                <ProTable<SlangGroup>
                  actionRef={groupActionRef}
                  rowKey="_id"
                  columns={groupColumns}
                  cardBordered
                  search={false}
                  locale={{ emptyText: '当前还没有创建任何黑话分组。' }}
                  pagination={false}
                  toolBarRender={() => [
                    <Button key="create" type="primary" onClick={() => setGroupCreateOpen(true)}>
                      新增分组
                    </Button>,
                  ]}
                  request={async () => {
                    try {
                      const items = await refreshGroups();
                      return { data: items, success: true };
                    } catch (error: unknown) {
                      setGroupsErrorMessage(getErrorMessage(error, '加载黑话分组失败'));
                      throw error;
                    }
                  }}
                />

                <ModalForm
                  title="新增分组"
                  open={groupCreateOpen}
                  onOpenChange={setGroupCreateOpen}
                  modalProps={{ destroyOnHidden: true, width: 680 }}
                  onFinish={async (values) => {
                    await request('/admin/v1/slang/groups', {
                      method: 'POST',
                      body: JSON.stringify({
                        name: values.name,
                        order: values.order,
                      }),
                    });
                    message.success('已保存');
                    await runSafeFollowUp(refreshGroups);
                    groupActionRef.current?.reload();
                    return true;
                  }}
                >
                  <ProFormText
                    name="name"
                    label="分组名"
                    rules={[{ required: true, message: '必填' }]}
                    fieldProps={{ placeholder: '例如：通用 / PVE / PVP / 职业' }}
                    extra="建议按玩家实际检索习惯命名，避免出现功能重叠的分组。"
                  />
                  <ProFormDigit
                    name="order"
                    label="排序（可选）"
                    fieldProps={{ precision: 0, placeholder: '不填则自动生成' }}
                  />
                </ModalForm>

                <ModalForm
                  title="编辑分组"
                  open={groupEditOpen}
                  onOpenChange={setGroupEditOpen}
                  modalProps={{ destroyOnHidden: true, width: 680 }}
                  initialValues={
                    currentGroup
                      ? {
                          name: currentGroup.name,
                          order: currentGroup.order,
                        }
                      : undefined
                  }
                  onFinish={async (values) => {
                    if (!currentGroup) return false;
                    await request(`/admin/v1/slang/groups/${currentGroup._id}`, {
                      method: 'PUT',
                      body: JSON.stringify({
                        name: values.name,
                        order: values.order,
                      }),
                    });
                    message.success('已更新');
                    await runSafeFollowUp(refreshGroups);
                    groupActionRef.current?.reload();
                    termActionRef.current?.reload();
                    return true;
                  }}
                >
                  <ProFormText
                    name="name"
                    label="分组名"
                    rules={[{ required: true, message: '必填' }]}
                    extra="修改名称会直接影响前台词典和后台筛选中的分组显示。"
                  />
                  <ProFormDigit
                    name="order"
                    label="排序"
                    fieldProps={{ precision: 0 }}
                  />
                </ModalForm>
              </>
            ),
          },
        ]}
      />
    </PageContainer>
  );
}
