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
  Pagination,
  Segmented,
  Skeleton,
  Tooltip,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminConversationVo } from '@/services/web/guardfind/im';
import { queryConversations } from '@/services/web/guardfind/im';
import ChatSession from './components/ChatSession';
import styles from './index.less';

export default function AdminImPage() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(() => !document.hidden);
  const active = visible && pathname.replace(/\/$/, '') === '/guardfind/im';
  const [conversations, setConversations] = useState<AdminConversationVo[]>([]);
  const [selected, setSelected] = useState<AdminConversationVo | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const drafts = useRef(new Map<string, string>());
  useEffect(() => {
    const changed = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', changed);
    return () => document.removeEventListener('visibilitychange', changed);
  }, []);
  useEffect(() => {
    if (!active) return;
    let canceled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setLoading(true);
    const poll = async () => {
      try {
        const response = await queryConversations({ page, size: 30 });
        if (canceled) return;
        setConversations(response.data?.list || []);
        setTotal(response.data?.total || 0);
        setError('');
      } catch {
        if (!canceled) setError('会话加载失败，请重试');
      } finally {
        if (!canceled) {
          setLoading(false);
          timer = setTimeout(() => void poll(), 10000);
        }
      }
    };
    void poll();
    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [active, page, refresh]);
  const markRead = useCallback((userId: string | number) => {
    setConversations((previous) =>
      previous.some(
        (item) =>
          String(item.userId) === String(userId) && item.unreadCount > 0,
      )
        ? previous.map((item) =>
            String(item.userId) === String(userId)
              ? { ...item, unreadCount: 0 }
              : item,
          )
        : previous,
    );
  }, []);
  const query = keyword.trim().toLowerCase();
  const filtered = conversations.filter(
    (item) =>
      (!onlyUnread || item.unreadCount > 0) &&
      (!query ||
        `${item.nickname || ''} ${item.userId}`.toLowerCase().includes(query)),
  );
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
                  onClick={() => setRefresh((value) => value + 1)}
                />
              </Tooltip>
            </div>
            <Input
              prefix={<SearchOutlined />}
              allowClear
              placeholder="搜索本页姓名 / 用户 ID"
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
                <Button
                  size="small"
                  onClick={() => setRefresh((value) => value + 1)}
                >
                  重试
                </Button>
              }
            />
          )}
          <div className={styles.conversationList}>
            {loading ? (
              <div className={styles.listLoading}>
                <Skeleton active avatar paragraph={{ rows: 1 }} />
                <Skeleton active avatar paragraph={{ rows: 1 }} />
                <Skeleton active avatar paragraph={{ rows: 1 }} />
              </div>
            ) : filtered.length ? (
              filtered.map((item) => (
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
                  query || onlyUnread ? '没有符合条件的会话' : '暂无会话'
                }
              />
            )}
          </div>
          <div className={styles.pagination}>
            <Pagination
              simple
              size="small"
              current={page}
              total={total}
              pageSize={30}
              showSizeChanger={false}
              onChange={(next) => {
                setPage(next);
                setKeyword('');
              }}
            />
          </div>
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
