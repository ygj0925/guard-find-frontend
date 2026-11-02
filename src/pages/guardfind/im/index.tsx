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
  Space,
  Tabs,
} from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  type AdminConversationVo,
  type AdminMessageVo,
  queryConversations,
  queryMessages,
  sendMessage,
} from '@/services/web/guardfind/im';

const POLL_INTERVAL = 3000;

const formatTime = (value?: string) => {
  if (!value) return '';
  return value.replace('T', ' ').slice(5, 16);
};

const AdminImPage: React.FC = () => {
  const [conversations, setConversations] = useState<AdminConversationVo[]>([]);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AdminMessageVo[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const lastIdRef = useRef<number>(0);
  const listBodyRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const response = await queryConversations({ page: 1, size: 100 });
      setConversations(response.data?.list || []);
    } catch {
      // 静默:下次轮询重试
    }
  }, []);

  const loadMessages = useCallback(
    async (userId: number, incremental: boolean) => {
      try {
        const response = await queryMessages(
          userId,
          incremental && lastIdRef.current > 0 ? lastIdRef.current : undefined,
        );
        const msgs = response.data || [];
        if (msgs.length > 0) {
          lastIdRef.current = msgs[msgs.length - 1].id;
          setMessages((prev) => {
            const merged = incremental ? [...prev, ...msgs] : msgs;
            // 拉取即标已读,主动把本会话未读清零
            setConversations((prevConvs) =>
              prevConvs.map((c) =>
                c.userId === userId ? { ...c, unreadCount: 0 } : c,
              ),
            );
            return merged;
          });
        } else if (!incremental) {
          setMessages([]);
        }
      } catch {
        // 静默:下次轮询重试
      }
    },
    [],
  );

  // 会话列表 10 秒轮询
  useEffect(() => {
    void loadConversations();
    const timer = setInterval(() => void loadConversations(), 10000);
    return () => clearInterval(timer);
  }, [loadConversations]);

  // 当前会话 3 秒轮询(增量)
  useEffect(() => {
    if (!activeUserId) return;
    lastIdRef.current = 0;
    setMessages([]);
    void loadMessages(activeUserId, false);
    const timer = setInterval(
      () => void loadMessages(activeUserId, true),
      POLL_INTERVAL,
    );
    return () => clearInterval(timer);
  }, [activeUserId, loadMessages]);

  // 新消息滚动到底部
  useEffect(() => {
    if (listBodyRef.current) {
      listBodyRef.current.scrollTop = listBodyRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || !activeUserId || sending) return;
    setSending(true);
    setDraft('');
    try {
      const response = await sendMessage(activeUserId, content);
      if (response.data) {
        setMessages((prev) => [...prev, response.data as AdminMessageVo]);
        lastIdRef.current = Math.max(lastIdRef.current, response.data.id);
      }
      void loadConversations();
    } catch {
      setDraft(content);
      message.error('发送失败,请稍后再试');
    } finally {
      setSending(false);
    }
  };

  const activeConversation =
    conversations.find((c) => c.userId === activeUserId) || null;

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
                            item.userId === activeUserId
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
