import { CheckOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  type ActionType,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import {
  batchDeleteMessages,
  deleteMessage,
  markAllAsRead,
  markAsRead,
  queryMessages,
} from '@/services/web/user-message';
import type { UserMessageVo } from '@/services/web/user-message/typings';
import { getTableScrollX } from '@/utils/tableLayout';
import { MESSAGE_TYPE_MAP } from '../constants';
import MessageDetail from './MessageDetail';

interface MessageListProps {
  /** 数据变化后通知外层刷新未读数（Tab 角标 / 顶铃铛） */
  onChanged?: () => void;
}

/**
 * 我的消息列表（`/user/message/**`，后端只做登录校验）。
 *
 * 这一整块都是"当前登录用户的收件箱"，所以按钮不套 AccessControl ——
 * 后端没有对应权限码，套了反而会永久隐藏。
 */
const MessageList: React.FC<MessageListProps> = ({ onChanged }) => {
  const actionRef = useRef<ActionType>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [detailId, setDetailId] = useState<number | null>(null);

  const reload = () => {
    actionRef.current?.reload();
    onChanged?.();
  };

  const handleMarkAsRead = async (record: UserMessageVo) => {
    await markAsRead(record.id);
    message.success('已标记为已读');
    reload();
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    message.success('已全部标记为已读');
    reload();
  };

  const handleDelete = async (record: UserMessageVo) => {
    await deleteMessage(record.id);
    message.success('删除成功');
    setSelectedRowKeys((keys) => keys.filter((key) => key !== record.id));
    reload();
  };

  const handleBatchDelete = async () => {
    await batchDeleteMessages(selectedRowKeys as number[]);
    message.success('批量删除成功');
    setSelectedRowKeys([]);
    reload();
  };

  const columns: ProColumns<UserMessageVo>[] = [
    {
      title: '标题',
      dataIndex: 'title',
      width: 240,
      ellipsis: true,
      render: (_, record) => (
        <a onClick={() => setDetailId(record.id)}>{record.title}</a>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 110,
      valueType: 'select',
      valueEnum: {
        1: { text: '系统消息' },
        2: { text: '安全消息' },
      },
      render: (_, record) => {
        const typeInfo = MESSAGE_TYPE_MAP[record.type];
        return typeInfo ? (
          <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
        ) : (
          '-'
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'isRead',
      width: 90,
      valueType: 'select',
      valueEnum: {
        true: { text: '已读' },
        false: { text: '未读' },
      },
      render: (_, record) =>
        record.isRead ? <Tag>已读</Tag> : <Tag color="processing">未读</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 180,
      hideInSearch: true,
    },
    {
      title: '已读时间',
      dataIndex: 'readTime',
      width: 180,
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      className: 'table-action-column',
      width: 160,
      render: (_, record) => (
        <Space wrap>
          {!record.isRead && (
            <Button
              type="link"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleMarkAsRead(record)}
            >
              已读
            </Button>
          )}
          <Popconfirm
            title="确定要删除该消息吗？"
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable<UserMessageVo>
        headerTitle="我的消息"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        scroll={{ x: getTableScrollX(columns, 64) }}
        pagination={{ defaultPageSize: 10 }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        request={async ({ current, pageSize, ...rest }) => {
          const response = await queryMessages({
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
        toolBarRender={() => [
          <Button
            key="readAll"
            icon={<CheckOutlined />}
            onClick={handleMarkAllAsRead}
          >
            全部已读
          </Button>,
          selectedRowKeys.length > 0 && (
            <Popconfirm
              key="batchDel"
              title={`确定要删除选中的 ${selectedRowKeys.length} 条消息吗？`}
              onConfirm={handleBatchDelete}
            >
              <Button danger icon={<DeleteOutlined />}>
                批量删除
              </Button>
            </Popconfirm>
          ),
        ]}
      />

      <MessageDetail
        messageId={detailId}
        open={detailId !== null}
        onCancel={() => setDetailId(null)}
        onRead={reload}
      />
    </>
  );
};

export default MessageList;
