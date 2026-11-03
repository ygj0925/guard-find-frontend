import { DownOutlined, SendOutlined } from '@ant-design/icons';
import { Alert, Avatar, Button, Empty, Input, message, Skeleton } from 'antd';
import { useEffect, useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import type { AdminConversationVo } from '@/services/web/guardfind/im';
import useSupportMessages from '../hooks/useSupportMessages';
import styles from '../index.less';

export default function ChatSession({
  conversation,
  active,
  onRead,
  drafts,
}: {
  conversation: AdminConversationVo;
  active: boolean;
  onRead: (userId: string | number) => void;
  drafts: Map<string, string>;
}) {
  const userKey = String(conversation.userId);
  const [draft, setDraft] = useState(() => drafts.get(userKey) || '');
  const { messages, loading, error, sending, send, reload } =
    useSupportMessages(conversation.userId, active, onRead);
  const body = useRef<HTMLElement>(null);
  const atBottom = useRef(true);
  const previousCount = useRef(0);
  const [newCount, setNewCount] = useState(0);
  const scrollToBottom = () => {
    if (body.current) body.current.scrollTop = body.current.scrollHeight;
    atBottom.current = true;
    setNewCount(0);
  };
  useEffect(() => {
    const added = Math.max(0, messages.length - previousCount.current);
    previousCount.current = messages.length;
    if (atBottom.current) scrollToBottom();
    else if (added) setNewCount((value) => value + added);
  }, [messages]);
  const handleSend = async () => {
    const content = draft;
    try {
      if (await send(content)) {
        if (drafts.get(userKey) === content) drafts.delete(userKey);
        setDraft((current) => {
          if (current !== content) return current;
          drafts.delete(userKey);
          return '';
        });
        scrollToBottom();
      }
    } catch {
      message.error('发送失败，内容已保留，请重试');
    }
  };
  const nickname = conversation.nickname || `用户 ${conversation.userId}`;
  return (
    <>
      <header className={styles.chatHeader}>
        <Avatar src={conversation.avatar || undefined}>
          {nickname.slice(0, 1)}
        </Avatar>
        <div>
          <strong>{nickname}</strong>
          <div className={styles.secondary}>用户 ID：{conversation.userId}</div>
        </div>
      </header>
      {error && (
        <Alert
          type="warning"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={reload}>
              重试
            </Button>
          }
        />
      )}
      <div className={styles.messageArea}>
        <section
          ref={body}
          className={styles.messageList}
          aria-label="聊天记录"
          aria-busy={loading}
          onScroll={() => {
            const node = body.current;
            if (!node) return;
            atBottom.current =
              node.scrollHeight - node.scrollTop - node.clientHeight < 64;
            if (atBottom.current) setNewCount(0);
          }}
        >
          {loading ? (
            <Skeleton active paragraph={{ rows: 5 }} />
          ) : messages.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无消息，可以发送第一条回复"
            />
          ) : (
            messages.map((item) => (
              <article
                key={item.id}
                className={`${styles.messageRow} ${item.senderType === 'ADMIN' ? styles.outgoing : ''}`}
              >
                <div className={styles.messageContent}>
                  <div className={styles.messageMeta}>
                    {item.senderType === 'ADMIN'
                      ? item.adminName || '公寓管家'
                      : nickname}
                    <time>
                      {item.createTime.replace('T', ' ').slice(0, 16)}
                    </time>
                  </div>
                  <div className={styles.bubble}>{item.content}</div>
                </div>
              </article>
            ))
          )}
        </section>
        {newCount > 0 && (
          <Button
            className={styles.newMessages}
            icon={<DownOutlined />}
            onClick={scrollToBottom}
          >
            {newCount} 条新消息
          </Button>
        )}
      </div>
      <AccessControl
        permission="system:im:send"
        fallback={
          <div className={styles.readOnly}>当前账号仅可查看聊天记录</div>
        }
      >
        <footer className={styles.composer}>
          <Input.TextArea
            value={draft}
            maxLength={2000}
            showCount
            autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="输入回复内容"
            aria-label="回复内容"
            onChange={(event) => {
              setDraft(event.target.value);
              drafts.set(userKey, event.target.value);
            }}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing &&
                event.keyCode !== 229
              ) {
                event.preventDefault();
                if (!loading) void handleSend();
              }
            }}
          />
          <div className={styles.composerActions}>
            <span className={styles.secondary}>
              Enter 发送 · Shift + Enter 换行
            </span>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={sending}
              disabled={!active || loading || !draft.trim()}
              onClick={() => void handleSend()}
            >
              发送
            </Button>
          </div>
        </footer>
      </AccessControl>
    </>
  );
}
