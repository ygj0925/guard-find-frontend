import { BellOutlined, NotificationOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Badge, Tabs } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
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
  const { messageUnread, noticeUnread, refreshUnread } = useModel('unread');
  const handleChanged = useCallback(() => refreshUnread(true), [refreshUnread]);

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
            children: <MessageList onChanged={handleChanged} />,
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
            children: <NoticeList onChanged={handleChanged} />,
          },
        ]}
      />
    </PageContainer>
  );
};

export default MessagePage;
