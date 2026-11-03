import { SendOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Input,
  List,
  message,
  Pagination,
  Space,
  Tabs,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  type AdminConversationVo,
  type AdminMessageVo,
  queryConversations,
  queryMessages,
  sendMessage,
} from '@/services/web/guardfind/im';
import { mergeMessages } from '@/utils/messageCursor';

const POLL_INTERVAL = 3000;

const formatTime = (value?: string) => {
  if (!value) return '';
  return value.replace('T', ' ').slice(5, 16);
};

const AdminImPage: React.FC = () => {
  const [conversations, setConversations] = useState<AdminConversationVo[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | number | null>(
    null,
  );
  const [messages, setMessages] = useState<AdminMessageVo[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listBodyRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(activeUserId);
  activeRef.current = activeUserId;
  const [conversationPage, setConversationPage] = useState(1);
  const [conversationTotal, setConversationTotal] = useState(0);

  useEffect(() => {
    let canceled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await queryConversations({
          page: conversationPage,
          size: 30,
        });
        if (!canceled) {
          setConversations(response.data?.list || []);
          setConversationTotal(response.data?.total || 0);
        }
      } catch {
        /* retry on the next poll */
      } finally {
        if (!canceled) timer = setTimeout(() => void poll(), 10000);
      }
    };
    void poll();
    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [conversationPage]);

  useEffect(() => {
    if (!activeUserId) return;
    const userId = activeUserId;
    let canceled = false;
    let cursor: string | number | undefined;
    let timer: ReturnType<typeof setTimeout>;
    setMessages([]);
    setDraft('');
    const poll = async () => {
      let count = 0;
      try {
        const response = await queryMessages(userId, cursor);
        if (canceled) return;
        const incoming = response.data || [];
        count = incoming.length;
        if (incoming.length) {
          cursor = incoming[incoming.length - 1].id;
          setMessages((prev) => mergeMessages(prev, incoming));
          setConversations((prev) =>
            prev.map((c) =>
              String(c.userId) === String(userId)
                ? { ...c, unreadCount: 0 }
                : c,
            ),
          );
        }
      } catch {
        /* retry on the next poll */
      } finally {
        if (!canceled)
          timer = setTimeout(
            () => void poll(),
            count === 100 ? 50 : POLL_INTERVAL,
          );
      }
    };
    void poll();
    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [activeUserId]);

  useEffect(() => {
    if (listBodyRef.current)
      listBodyRef.current.scrollTop = listBodyRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    const content = draft.trim();
    const userId = activeUserId;
    if (!content || !userId || sending) return;
    setSending(true);
    try {
      const response = await sendMessage(userId, content);
      if (String(activeRef.current) !== String(userId)) return;
      if (response.data)
        setMessages((prev) =>
          mergeMessages(prev, [response.data as AdminMessageVo]),
        );
      setDraft((prev) => (prev.trim() === content ? '' : prev));
    } catch {
      if (String(activeRef.current) === String(userId))
        message.error('发送失败，请重试');
    } finally {
      setSending(false);
    }
  };

  const activeConversation =
    conversations.find((c) => String(c.userId) === String(activeUserId)) ||
    null;

  return (
    <PageContainer>
      <div style={{ display: 'flex', gap: 16, minHeight: 480 }}>
        {/* 左侧会话列表 */}
        <div
          style={{
            width: 320,
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            background: '#fff',
          }}
        >
          <Pagination
            size="small"
            current={conversationPage}
            pageSize={30}
            total={conversationTotal}
            onChange={setConversationPage}
            showSizeChanger={false}
          />
          <Tabs
            items={[
              {
                key: 'all',
                label: `会话(${conversations.length})`,
                children: (
                  <List
                    dataSource={conversations}
                    locale={{ emptyText: '暂无会话' }}
                    renderItem={(item) => (
                      <List.Item
                        style={{
                          cursor: 'pointer',
                          background:
                            String(item.userId) === String(activeUserId)
                              ? '#e6f4ff'
                              : undefined,
                          padding: '10px 14px',
                        }}
                        onClick={() => setActiveUserId(item.userId)}
                      >
                        <List.Item.Meta
                          avatar={
                            <Badge count={item.unreadCount} size="small">
                              <Avatar src={item.avatar || undefined}>
                                {(item.nickname || '用户').slice(0, 1)}
                              </Avatar>
                            </Badge>
                          }
                          title={
                            <span style={{ fontSize: 14 }}>
                              {item.nickname || `用户 ${item.userId}`}
                            </span>
                          }
                          description={
                            <span
                              style={{
                                fontSize: 12,
                                color: '#999',
                                display: 'block',
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.lastMessage || ''}
                            </span>
                          }
                        />
                        <span style={{ fontSize: 12, color: '#bbb' }}>
                          {formatTime(item.lastTime)}
                        </span>
                      </List.Item>
                    )}
                  />
                ),
              },
            ]}
          />
        </div>

        {/* 右侧聊天窗口 */}
        <div
          style={{
            flex: 1,
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {activeUserId ? (
            <>
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0f0f0',
                  fontWeight: 600,
                }}
              >
                {activeConversation?.nickname || `用户 ${activeUserId}`}
              </div>
              <div
                ref={listBodyRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 16,
                  maxHeight: 460,
                }}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent:
                        msg.senderType === 'ADMIN' ? 'flex-end' : 'flex-start',
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '70%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        background:
                          msg.senderType === 'ADMIN' ? '#1677ff' : '#f4f4f5',
                        color: msg.senderType === 'ADMIN' ? '#fff' : '#333',
                      }}
                    >
                      <div style={{ fontSize: 14, wordBreak: 'break-word' }}>
                        {msg.content}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          marginTop: 4,
                          opacity: 0.7,
                          textAlign: 'right',
                        }}
                      >
                        {msg.senderType === 'ADMIN'
                          ? msg.adminName || '客服'
                          : '用户'}{' '}
                        {formatTime(msg.createTime)}
                      </div>
                    </div>
                  </div>
                ))}
                {messages.length === 0 ? (
                  <Empty description="暂无消息" style={{ marginTop: 80 }} />
                ) : null}
              </div>
              <div style={{ padding: 12, borderTop: '1px solid #f0f0f0' }}>
                <AccessControl permission="system:im:send">
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      placeholder="输入回复内容,回车发送"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onPressEnter={() => void handleSend()}
                    />
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      disabled={!draft.trim() || sending}
                      onClick={() => void handleSend()}
                    >
                      发送
                    </Button>
                  </Space.Compact>
                </AccessControl>
              </div>
            </>
          ) : (
            <Empty
              description="选择左侧用户开始沟通"
              style={{ margin: 'auto' }}
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default AdminImPage;
