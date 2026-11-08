/**
 * 站内通知：只展示当前用户收件箱，支持只看未读、单条已读与全部已读。
 */
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, message, Space, Switch, Tag, Typography } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import {
  type OaNotificationVo,
  queryOaNotifications,
  queryOaUnreadCount,
  readAllOaNotifications,
  readOaNotification,
} from '@/services/web/guardfind/oa';

const TYPE_META: Record<string, { text: string; color: string }> = {
  TODO: { text: '待审批', color: 'blue' },
  APPROVED: { text: '已通过', color: 'green' },
  REJECTED: { text: '已驳回', color: 'red' },
  RETURNED: { text: '已退回', color: 'orange' },
  TRANSFERRED: { text: '已转交', color: 'purple' },
  CANCELLED: { text: '已取消', color: 'default' },
  URGED: { text: '催办', color: 'volcano' },
  OVERDUE: { text: '超期', color: 'gold' },
  CC: { text: '抄送', color: 'cyan' },
  PAID: { text: '已支付', color: 'green' },
};

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

function typeMeta(type: string) {
  return TYPE_META[type] ?? { text: type, color: 'default' };
}

const NotificationsPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = async () => {
    try {
      const response = await queryOaUnreadCount();
      setUnreadCount(response.data.count ?? 0);
    } catch (error) {
      message.error(errorText(error));
    }
  };

  useEffect(() => {
    void refreshUnread();
  }, []);

  const markRead = async (record: OaNotificationVo) => {
    if (record.status === 'READ') return;
    try {
      await readOaNotification(record.id);
      actionRef.current?.reload();
      void refreshUnread();
    } catch (error) {
      message.error(errorText(error));
    }
  };

  const markAllRead = async () => {
    try {
      const response = await readAllOaNotifications();
      message.success(`已标记 ${response.data} 条通知为已读`);
      actionRef.current?.reload();
      void refreshUnread();
    } catch (error) {
      message.error(errorText(error));
    }
  };

  const columns: ProColumns<OaNotificationVo>[] = [
    {
      title: '通知',
      dataIndex: 'title',
      search: false,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Space size={6}>
            <Tag color={typeMeta(record.type).color}>
              {typeMeta(record.type).text}
            </Tag>
            <span>{record.title}</span>
          </Space>
          {record.content ? (
            <Typography.Text type="secondary">{record.content}</Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: '关联申请',
      dataIndex: 'applicationId',
      width: 120,
      search: false,
      render: (_, record) =>
        record.type === 'CC' && record.applicationId != null ? (
          <Button
            type="link"
            size="small"
            onClick={() => {
              void markRead(record);
              history.push(`/oa/cc/detail?id=${record.applicationId}`);
            }}
          >
            查看抄送
          </Button>
        ) : (
          (record.applicationId ?? '—')
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      search: false,
      render: (_, record) =>
        record.status === 'UNREAD' ? (
          <Tag color="red">未读</Tag>
        ) : (
          <Tag>已读</Tag>
        ),
    },
    {
      title: '时间',
      dataIndex: 'createTime',
      width: 180,
      search: false,
      render: (_, record) => record.createTime || '—',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      search: false,
      render: (_, record) =>
        record.status === 'UNREAD' ? (
          <Button type="link" onClick={() => void markRead(record)}>
            标记已读
          </Button>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <PageContainer>
      <ProTable<OaNotificationVo>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={false}
        scroll={{ x: 760 }}
        toolBarRender={() => [
          <Space key="unread" size={6}>
            <span>只看未读</span>
            <Switch
              aria-label="只看未读"
              checked={unreadOnly}
              onChange={(checked) => {
                setUnreadOnly(checked);
                actionRef.current?.reload();
              }}
            />
            <Tag color={unreadCount > 0 ? 'red' : 'default'}>
              未读 {unreadCount}
            </Tag>
          </Space>,
          <Button
            key="readAll"
            disabled={unreadCount === 0}
            onClick={() => void markAllRead()}
          >
            全部已读
          </Button>,
        ]}
        request={async (params) => {
          const response = await queryOaNotifications({
            page: params.current ?? 1,
            size: params.pageSize ?? 10,
            unreadOnly,
          });
          return {
            data: response.data.list,
            total: response.data.total,
            success: true,
          };
        }}
      />
    </PageContainer>
  );
};

export default NotificationsPage;
