import { CheckOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  batchDelete,
  deleteMessage,
  markAllAsRead,
  markAsRead,
  queryMessages,
} from '@/services/web/user-message';
import type { UserMessageVo } from '@/services/web/user-message/typings';
import NoticeDetail from './components/NoticeDetail';

const typeMap: Record<number, { label: string; color: string }> = {
  1: { label: '通知', color: 'blue' },
  2: { label: '公告', color: 'green' },
  3: { label: '待办', color: 'orange' },
};

const MessagePage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [noticeId, setNoticeId] = useState<number | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const handleMarkAsRead = async (record: UserMessageVo) => {
    try {
      await markAsRead(record.id);
      message.success('标记已读成功');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Mark as read failed:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      message.success('全部标记已读成功');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Mark all as read failed:', error);
    }
  };

  const handleDelete = async (record: UserMessageVo) => {
    try {
      await deleteMessage(record.id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleBatchDelete = async () => {
    try {
      await batchDelete(selectedRowKeys as number[]);
      message.success('批量删除成功');
      setSelectedRowKeys([]);
      actionRef.current?.reload();
    } catch (error) {
      console.error('Batch delete failed:', error);
    }
  };

  const columns: ProColumns<UserMessageVo>[] = [
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
      render: (_, record) => (
        <a
          onClick={() => {
            setNoticeId(record.id);
            setDetailVisible(true);
          }}
        >
          {record.title}
        </a>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (_, record) => {
        const typeInfo = typeMap[record.type];
        return typeInfo ? (
          <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
        ) : (
          '-'
        );
      },
      valueType: 'select',
      valueEnum: {
        1: { text: '通知' },
        2: { text: '公告' },
        3: { text: '待办' },
      },
    },
    {
      title: '状态',
      dataIndex: 'isRead',
      width: 100,
      render: (_, record) =>
        record.isRead ? (
          <Tag color="default">已读</Tag>
        ) : (
          <Tag color="processing">未读</Tag>
        ),
      valueType: 'select',
      valueEnum: {
        true: { text: '已读' },
        false: { text: '未读' },
      },
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
      width: 180,
      render: (_, record) => (
        <Space>
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
    <PageContainer>
      <ProTable<UserMessageVo>
        headerTitle="我的消息"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await queryMessages({
            page: current as number,
            size: pageSize as number,
            ...rest,
          });
          return {
            data: response.data?.records || [],
            total: response.data?.total || 0,
            success: true,
          };
        }}
        toolBarRender={() => [
          <Button key="readAll" onClick={handleMarkAllAsRead}>
            全部已读
          </Button>,
          selectedRowKeys.length > 0 && (
            <AccessControl key="batchDel" permission="user:message:del">
              <Popconfirm
                title={`确定要删除选中的 ${selectedRowKeys.length} 条消息吗？`}
                onConfirm={handleBatchDelete}
              >
                <Button danger icon={<DeleteOutlined />}>
                  批量删除
                </Button>
              </Popconfirm>
            </AccessControl>
          ),
        ]}
      />

      <NoticeDetail
        noticeId={noticeId}
        visible={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setNoticeId(null);
        }}
      />
    </PageContainer>
  );
};

export default MessagePage;
