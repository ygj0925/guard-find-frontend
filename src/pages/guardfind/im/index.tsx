import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useLocation } from '@umijs/max';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Empty,
  Input,
  Segmented,
  Skeleton,
  Spin,
  Tooltip,
} from 'antd';
import { useEffect, useRef, useState } from 'react';
import type { AdminConversationVo } from '@/services/web/guardfind/im';
import ChatSession from './components/ChatSession';
import useSupportConversations from './hooks/useSupportConversations';
import styles from './index.less';

export default function AdminImPage() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(() => !document.hidden);
  const active = visible && pathname.replace(/\/$/, '') === '/guardfind/im';
  const [selected, setSelected] = useState<AdminConversationVo | null>(null);
  const [keyword, setKeyword] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const {
    conversations,
    total,
    loading,
    loadingMore,
    hasMore,
    error,
    listRef,
    onScroll,
    loadMore,
    refresh,
    retry,
    markRead,
  } = useSupportConversations(active, keyword, onlyUnread);
  const drafts = useRef(new Map<string, string>());
  useEffect(() => {
    const changed = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', changed);
    return () => document.removeEventListener('visibilitychange', changed);
  }, []);
  const current =
    conversations.find(
      (item) => String(item.userId) === String(selected?.userId),
    ) || selected;
  return (
    <PageContainer title="用户沟通">
      <div className={styles.workspace}>
        <aside className={styles.sidebar} aria-label="用户会话">
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarTitle}>
              <strong>
                用户会话 <span className={styles.secondary}>({total})</span>
              </strong>
              <Tooltip title="刷新会话">
                <Button
                  type="text"
                  icon={<ReloadOutlined />}
                  aria-label="刷新会话"
                  loading={loading}
                  onClick={refresh}
                />
              </Tooltip>
            </div>
            <Input
              prefix={<SearchOutlined />}
              allowClear
              placeholder="搜索姓名 / 完整用户 ID"
              aria-label="搜索姓名或用户 ID"
              maxLength={64}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <Segmented
              block
              value={onlyUnread ? 'unread' : 'all'}
              options={[
                { label: '全部', value: 'all' },
                { label: '未读', value: 'unread' },
              ]}
              onChange={(value) => setOnlyUnread(value === 'unread')}
            />
          </div>
          {error && (
            <Alert
              type="error"
              showIcon
              message={error}
              action={
                <Button size="small" onClick={retry}>
                  重试
                </Button>
              }
            />
          )}
          <section
            ref={listRef}
            className={styles.conversationList}
            onScroll={onScroll}
            aria-label="会话列表"
            aria-busy={loading || loadingMore}
          >
            {loading ? (
              <div className={styles.listLoading}>
                <Skeleton active avatar paragraph={{ rows: 1 }} />
                <Skeleton active avatar paragraph={{ rows: 1 }} />
                <Skeleton active avatar paragraph={{ rows: 1 }} />
              </div>
            ) : conversations.length ? (
              conversations.map((item) => (
                <button
                  type="button"
                  key={item.userId}
                  className={`${styles.conversation} ${String(item.userId) === String(selected?.userId) ? styles.selected : ''}`}
                  aria-pressed={
                    String(item.userId) === String(selected?.userId)
                  }
                  onClick={() => setSelected(item)}
                >
                  <Badge
                    count={item.unreadCount}
                    size="small"
                    overflowCount={99}
                  >
                    <Avatar size={40} src={item.avatar || undefined}>
                      {(item.nickname || '用户').slice(0, 1)}
                    </Avatar>
                  </Badge>
                  <span className={styles.conversationSummary}>
                    <span className={styles.conversationTitle}>
                      <strong>{item.nickname || `用户 ${item.userId}`}</strong>
                      <time>
                        {item.lastTime?.replace('T', ' ').slice(5, 16)}
                      </time>
                    </span>
                    <span className={styles.lastMessage}>
                      {item.lastMessage || '暂无消息'}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  keyword.trim() || onlyUnread
                    ? '没有符合条件的会话'
                    : '暂无会话'
                }
              />
            )}
            {!loading && conversations.length > 0 && (
              <div className={styles.loadMore}>
                {loadingMore ? (
                  <Spin size="small" />
                ) : hasMore ? (
                  <Button type="text" onClick={loadMore} disabled={!!error}>
                    加载更多会话
                  </Button>
                ) : (
                  <span className={styles.secondary}>已加载全部会话</span>
                )}
              </div>
            )}
          </section>
        </aside>
        <section className={styles.chatPanel} aria-label="对话窗口">
          {current ? (
            <ChatSession
              key={current.userId}
              conversation={current}
              active={active}
              onRead={markRead}
              drafts={drafts.current}
            />
          ) : (
            <div className={styles.emptyChat}>
              <Empty description="选择左侧用户，开始沟通" />
            </div>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
