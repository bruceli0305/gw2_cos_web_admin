import { EyeOutlined } from '@ant-design/icons';
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, Tag } from 'antd';
import type { RefObject } from 'react';
import { getErrorMessage } from '../../../services/request';
import { fetchGw2ApiEntities, fetchGw2ApiEntityPayload } from '../../../services/gw2Data';
import type { EntityItem, Language, TableRequestParams } from '../types';

type Props = {
  actionRef: RefObject<ActionType | null>;
  type: string;
  lang: Language;
  hasSearch: boolean;
  setHasSearch: (hasSearch: boolean) => void;
  setTableErrorMessage: (message: string | null) => void;
  onOpenPayload: (payload: unknown) => void;
};

export function Gw2EntityBrowser({
  actionRef,
  type,
  lang,
  hasSearch,
  setHasSearch,
  setTableErrorMessage,
  onOpenPayload,
}: Props) {
  const columns: ProColumns<EntityItem>[] = [
    {
      title: '名称 / 英文名称 / GW2 ID',
      dataIndex: 'q',
      hideInTable: true,
      fieldProps: { placeholder: '输入中文名、英文名或 GW2 ID' },
    },
    { title: 'GW2 ID', dataIndex: 'gw2Id', width: 160, copyable: true },
    { title: '名称', dataIndex: 'name', ellipsis: true },
    {
      title: '英文名称',
      dataIndex: 'nameEn',
      ellipsis: true,
      search: false,
      render: (_, record) => record.nameEn || <Tag>-</Tag>,
    },
    { title: '类型', dataIndex: 'type', width: 150, search: false },
    { title: '语言', dataIndex: 'lang', width: 90, search: false },
    { title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime', width: 170, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={async () => {
            const payload = await fetchGw2ApiEntityPayload({ type, gw2Id: record.gw2Id, lang });
            onOpenPayload(payload);
          }}
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <ProTable<EntityItem>
      actionRef={actionRef}
      rowKey="_id"
      cardBordered
      columns={columns}
      search={{
        labelWidth: 'auto',
        searchText: '搜索缓存实体',
        resetText: '清空筛选',
      }}
      locale={{
        emptyText: hasSearch
          ? '没有匹配当前搜索条件的缓存实体。'
          : '当前所选类型和语言还没有可用的缓存实体。',
      }}
      request={async (params) => {
        const query = params as TableRequestParams;
        setHasSearch(Boolean(query.q));

        try {
          const res = await fetchGw2ApiEntities({
            type,
            lang,
            page: query.current || 1,
            limit: query.pageSize || 20,
            q: query.q || '',
          });
          setTableErrorMessage(null);
          return { data: res.items, total: res.total, success: true };
        } catch (error: unknown) {
          setTableErrorMessage(getErrorMessage(error, '加载 GW2官方数据库实体失败'));
          throw error;
        }
      }}
    />
  );
}
