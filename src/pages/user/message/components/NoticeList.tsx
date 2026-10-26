import {
  type ActionType,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Space, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import DictSelect from '@/components/Dict/DictSelect';
import DictTag from '@/components/Dict/DictTag';
import { queryNotices } from '@/services/web/user-message';
import type { UserNoticeVo } from '@/services/web/user-message/typings';
import NoticeDetail from './NoticeDetail';

/** 公告分类取值于字典 `notice_type`（后端 `NoticeQuery.type` / `NoticeResp.type`） */
const NOTICE_TYPE_DICT = 'notice_type';

interface NoticeListProps {
  onChanged?: () => void;
}

/**
 * 我的公告（`GET /user/message/notice`，只返回发给当前用户的公告）。
 *
 * 打开详情走 `GET /user/message/notice/{id}`，后端会顺带标记已读。
 */
const NoticeList: React.FC<NoticeListProps> = ({ onChanged }) => {
  const actionRef = useRef<ActionType>(null);
  const [noticeId, setNoticeId] = useState<number | null>(null);

  const columns: ProColumns<UserNoticeVo>[] = [
    {
      title: '标题',
      dataIndex: 'title',
      width: 240,
      ellipsis: true,
      render: (_, record) => (
        <Space>
          {record.isTop && <Tag color="red">置顶</Tag>}
          <a onClick={() => setNoticeId(record.id)}>{record.title}</a>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'type',
      width: 120,
      renderFormItem: () => (
        <DictSelect
          dictCode={NOTICE_TYPE_DICT}
          placeholder="请选择"
          allowClear
        />
      ),
      render: (_, record) =>
        record.type ? (
          <DictTag dictCode={NOTICE_TYPE_DICT} value={record.type} />
        ) : (
          '-'
        ),
    },
    {
      title: '状态',
      dataIndex: 'isRead',
      width: 90,
      hideInSearch: true,
      render: (_, record) =>
        record.isRead ? <Tag>已读</Tag> : <Tag color="processing">未读</Tag>,
    },
    {
      title: '发布时间',
      dataIndex: 'publishTime',
      width: 180,
      hideInSearch: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 180,
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 80,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => setNoticeId(record.id)}>
          查看
        </Button>
      ),
    },
  ];

  return (
    <>
      <ProTable<UserNoticeVo>
        headerTitle="我的公告"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        scroll={{ x: 'max-content' }}
        pagination={{ defaultPageSize: 10 }}
        request={async ({ current, pageSize, ...rest }) => {
          const response = await queryNotices({
            page: current as number,
            size: pageSize as number,
            ...rest,
          });
          return {
            data: response.data?.list || [],
            total: response.data?.total || 0,
            success: true,
          };
        }}
      />

      <NoticeDetail
        noticeId={noticeId}
        visible={noticeId !== null}
        onCancel={() => {
          setNoticeId(null);
          onChanged?.();
        }}
      />
    </>
  );
};

export default NoticeList;
