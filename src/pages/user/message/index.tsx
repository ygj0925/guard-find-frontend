import { BellOutlined, NotificationOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Badge, Tabs } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import {
  getUnreadCount,
  getUnreadNoticeCount,
} from '@/services/web/user-message';
import MessageList from './components/MessageList';
import NoticeList from './components/NoticeList';

/**
 * 消息中心。
 *
 * 两块数据都走收件人视角接口（`/user/message`、`/user/message/notice`），
 * 后端只做登录校验；管理端的 `/system/notice/**`、`/system/message/**` 需要
 * `system:notice:*` / `system:message:*` 权限码，普通用户访问会直接 403。
 */
const MessagePage: React.FC = () => {
  const [activeKey, setActiveKey] = useState('message');
  const [messageUnread, setMessageUnread] = useState(0);
  const [noticeUnread, setNoticeUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    // 两个接口都只查当前用户，失败时保持上一次角标而不是归零
    const [messages, notices] = await Promise.allSettled([
      getUnreadCount(),
      getUnreadNoticeCount(),
    ]);
    if (messages.status === 'fulfilled') {
      setMessageUnread(Number(messages.value.data?.total) || 0);
    }
    if (notices.status === 'fulfilled') {
      setNoticeUnread(Number(notices.value.data?.total) || 0);
    }
  }, []);

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread]);

  return (
    <PageContainer>
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        destroyOnHidden
        items={[
          {
            key: 'message',
            label: (
              <Badge count={messageUnread} size="small" offset={[8, -2]}>
                <span>
                  <BellOutlined /> 我的消息
                </span>
              </Badge>
            ),
            children: <MessageList onChanged={refreshUnread} />,
          },
          {
            key: 'notice',
            label: (
              <Badge count={noticeUnread} size="small" offset={[8, -2]}>
                <span>
                  <NotificationOutlined /> 公告
                </span>
              </Badge>
            ),
            children: <NoticeList onChanged={refreshUnread} />,
          },
        ]}
      />
    </PageContainer>
  );
};

export default MessagePage;
