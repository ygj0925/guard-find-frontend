import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminConversationVo } from '@/services/web/guardfind/im';
import { queryConversations } from '@/services/web/guardfind/im';

const PAGE_SIZE = 30;
const initialState = {
  conversations: [] as AdminConversationVo[],
  total: 0,
  loading: true,
  loadingMore: false,
  hasMore: false,
  error: '',
};

export default function useSupportConversations(
  active: boolean,
  keyword: string,
  onlyUnread: boolean,
) {
  const [state, setState] = useState(initialState);
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);
  const listRef = useRef<HTMLElement>(null);
  const load = useRef<() => void>(() => {});
  const retryRequest = useRef<() => void>(() => {});
  const readSequence = useRef(0);
  const readVersions = useRef(new Map<string, number>());

  useEffect(() => {
    const timer = setTimeout(() => setSearch(keyword.trim()), 350);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    if (!active) return;
    let canceled = false;
    let busy = false;
    let initialized = false;
    let hasMore = false;
    let beforeId: string | number | undefined;
    setState(initialState);
    if (listRef.current) listRef.current.scrollTop = 0;

    const request = async (reset: boolean, background = false) => {
      if (busy || canceled || (!reset && !hasMore)) return;
      busy = true;
      const readAtStart = readSequence.current;
      if (!reset) setState((old) => ({ ...old, loadingMore: true, error: '' }));
      try {
        const response = await queryConversations({
          page: 1,
          size: PAGE_SIZE,
          keyword: search || undefined,
          onlyUnread,
          beforeId: reset ? undefined : beforeId,
        });
        if (canceled) return;
        // 阅读列表下方时保留已有位置；回到顶部后再刷新会话排序。
        if (background && (listRef.current?.scrollTop || 0) > 0) return;
        const batch = response.data?.list || [];
        beforeId = batch.at(-1)?.lastMessageId;
        hasMore = batch.length === PAGE_SIZE && beforeId != null;
        const normalized = batch.map((item) =>
          (readVersions.current.get(String(item.userId)) || 0) > readAtStart
            ? { ...item, unreadCount: 0 }
            : item,
        );
        const incoming = onlyUnread
          ? normalized.filter((item) => item.unreadCount > 0)
          : normalized;
        initialized = true;
        setState((old) => ({
          conversations: [
            ...new Map(
              [...(reset ? [] : old.conversations), ...incoming].map((item) => [
                String(item.userId),
                item,
              ]),
            ).values(),
          ],
          total: Math.max(
            0,
            (response.data?.total || 0) - (normalized.length - incoming.length),
          ),
          loading: false,
          loadingMore: false,
          hasMore,
          error: '',
        }));
      } catch {
        if (!canceled) {
          retryRequest.current = () => void request(reset);
          setState((old) => ({ ...old, error: '会话加载失败，请重试' }));
        }
      } finally {
        busy = false;
        if (!canceled)
          setState((old) => ({ ...old, loading: false, loadingMore: false }));
      }
    };
    load.current = () => void request(false);
    retryRequest.current = () => void request(true);
    void request(true);
    const timer = setInterval(() => {
      if (initialized && !busy && !listRef.current?.scrollTop) {
        void request(true, true);
      }
    }, 10000);
    return () => {
      canceled = true;
      clearInterval(timer);
      load.current = () => {};
      retryRequest.current = () => {};
    };
  }, [active, search, onlyUnread, revision]);

  const loadMore = useCallback(() => load.current(), []);
  const retry = useCallback(() => retryRequest.current(), []);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const onScroll = useCallback(() => {
    const node = listRef.current;
    if (node && node.scrollHeight - node.scrollTop - node.clientHeight < 96) {
      load.current();
    }
  }, []);
  useEffect(() => {
    const node = listRef.current;
    if (
      active &&
      !state.loading &&
      !state.loadingMore &&
      !state.error &&
      state.hasMore &&
      node &&
      node.clientHeight > 0 &&
      node.scrollHeight <= node.clientHeight + 96
    ) {
      load.current();
    }
  }, [active, state]);

  const markRead = useCallback(
    (userId: string | number) => {
      readVersions.current.set(String(userId), ++readSequence.current);
      setState((old) => {
        const match = old.conversations.find(
          (item) => String(item.userId) === String(userId),
        );
        if (!match?.unreadCount) return old;
        return {
          ...old,
          total: onlyUnread ? Math.max(0, old.total - 1) : old.total,
          conversations: onlyUnread
            ? old.conversations.filter(
                (item) => String(item.userId) !== String(userId),
              )
            : old.conversations.map((item) =>
                String(item.userId) === String(userId)
                  ? { ...item, unreadCount: 0 }
                  : item,
              ),
        };
      });
    },
    [onlyUnread],
  );

  return { ...state, listRef, loadMore, onScroll, refresh, retry, markRead };
}
