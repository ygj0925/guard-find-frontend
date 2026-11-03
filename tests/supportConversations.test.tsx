import { act, renderHook } from '@testing-library/react';
import useSupportConversations from '@/pages/guardfind/im/hooks/useSupportConversations';
import { queryConversations } from '@/services/web/guardfind/im';

type Conversation = import('@/services/web/guardfind/im').AdminConversationVo;
type Response = import('@/typings').R<
  import('@/typings').PageResult<Conversation>
>;
jest.mock('@/services/web/guardfind/im', () => ({
  queryConversations: jest.fn(),
}));

const item = (id: number, userId: string | number = id): Conversation => ({
  userId,
  nickname: `用户${userId}`,
  avatar: null,
  lastMessage: '消息',
  lastMessageId: String(id),
  lastTime: '2026-11-03 10:00:00',
  unreadCount: 1,
});
const batch = () => Array.from({ length: 30 }, (_, i) => item(100 - i));
const response = (list: Conversation[], total = list.length): Response => ({
  code: '0',
  msg: 'ok',
  success: true,
  timestamp: 0,
  data: { list, total },
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
beforeEach(() => {
  jest.useFakeTimers();
  jest.resetAllMocks();
  jest.mocked(queryConversations).mockResolvedValue(response([]));
});
afterEach(() => jest.useRealTimers());

test('search is debounced and submitted to the server with unread filtering', async () => {
  const { rerender } = renderHook(
    ({ keyword, unread }) => useSupportConversations(true, keyword, unread),
    { initialProps: { keyword: '', unread: false } },
  );
  await act(async () => {});
  rerender({ keyword: '张', unread: false });
  await act(async () => {
    jest.advanceTimersByTime(200);
  });
  rerender({ keyword: ' 张先生 ', unread: false });
  await act(async () => {
    jest.advanceTimersByTime(349);
  });
  expect(queryConversations).toHaveBeenCalledTimes(1);
  await act(async () => {
    jest.advanceTimersByTime(1);
  });
  expect(queryConversations).toHaveBeenLastCalledWith(
    expect.objectContaining({ keyword: '张先生' }),
  );
  await act(async () => {
    rerender({ keyword: ' 张先生 ', unread: true });
  });
  expect(queryConversations).toHaveBeenLastCalledWith(
    expect.objectContaining({ keyword: '张先生', onlyUnread: true }),
  );
});

test('scroll requests the next cursor, appends results, deduplicates users, and stops at the end', async () => {
  jest
    .mocked(queryConversations)
    .mockResolvedValueOnce(response(batch(), 32))
    .mockResolvedValueOnce(response([item(70, '100'), item(69)], 32));
  const { result } = renderHook(() => useSupportConversations(true, '', false));
  await act(async () => {});
  const node = document.createElement('div');
  Object.defineProperties(node, {
    scrollHeight: { value: 1000 },
    clientHeight: { value: 400 },
  });
  node.scrollTop = 550;
  result.current.listRef.current = node;
  await act(async () => {
    result.current.onScroll();
    result.current.onScroll();
  });
  expect(queryConversations).toHaveBeenCalledTimes(2);
  expect(queryConversations).toHaveBeenLastCalledWith(
    expect.objectContaining({ beforeId: '71' }),
  );
  expect(result.current.conversations).toHaveLength(31);
  expect(result.current.conversations[0].lastMessageId).toBe('70');
  expect(result.current.hasMore).toBe(false);
  await act(async () => {
    result.current.onScroll();
  });
  expect(queryConversations).toHaveBeenCalledTimes(2);
});

test('a stale response after a filter change cannot replace or append new results', async () => {
  const pending = deferred<Response>();
  jest
    .mocked(queryConversations)
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce(response([item(1)]));
  const { result, rerender } = renderHook(
    ({ unread }) => useSupportConversations(true, '', unread),
    { initialProps: { unread: false } },
  );
  await act(async () => {
    rerender({ unread: true });
  });
  await act(async () => {
    pending.resolve(response(batch(), 100));
  });
  expect(result.current.conversations.map((entry) => entry.userId)).toEqual([
    1,
  ]);
  expect(result.current.total).toBe(1);
});

test('failed next-page request preserves rows and retries with the same cursor', async () => {
  jest
    .mocked(queryConversations)
    .mockResolvedValueOnce(response(batch(), 31))
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(response([item(70)], 31));
  const { result } = renderHook(() => useSupportConversations(true, '', false));
  await act(async () => {});
  await act(async () => {
    result.current.loadMore();
  });
  expect(result.current.conversations).toHaveLength(30);
  expect(result.current.error).toBeTruthy();
  await act(async () => {
    result.current.retry();
  });
  expect(queryConversations).toHaveBeenLastCalledWith(
    expect.objectContaining({ beforeId: '71' }),
  );
  expect(result.current.error).toBe('');
  expect(result.current.conversations).toHaveLength(31);
});

test('polling cannot overlap pagination and stops while inactive', async () => {
  const pending = deferred<Response>();
  jest
    .mocked(queryConversations)
    .mockResolvedValueOnce(response(batch(), 60))
    .mockReturnValueOnce(pending.promise);
  const { result, rerender } = renderHook(
    ({ active }) => useSupportConversations(active, '', false),
    { initialProps: { active: true } },
  );
  await act(async () => {});
  await act(async () => {
    result.current.loadMore();
  });
  await act(async () => {
    jest.advanceTimersByTime(30000);
  });
  expect(queryConversations).toHaveBeenCalledTimes(2);
  rerender({ active: false });
  await act(async () => {
    pending.resolve(response([item(70)]));
    jest.advanceTimersByTime(30000);
  });
  expect(queryConversations).toHaveBeenCalledTimes(2);
  expect(result.current.conversations).toHaveLength(30);
});

test('polling preserves scroll position and refreshes when the list is at the top', async () => {
  jest.mocked(queryConversations).mockResolvedValue(response(batch(), 60));
  const { result } = renderHook(() => useSupportConversations(true, '', false));
  await act(async () => {});
  const node = document.createElement('div');
  node.scrollTop = 400;
  result.current.listRef.current = node;
  await act(async () => {
    jest.advanceTimersByTime(10000);
  });
  expect(queryConversations).toHaveBeenCalledTimes(1);
  node.scrollTop = 0;
  await act(async () => {
    jest.advanceTimersByTime(10000);
  });
  expect(queryConversations).toHaveBeenCalledTimes(2);
});

test('a read acknowledgment cannot be overwritten by an in-flight poll', async () => {
  const pending = deferred<Response>();
  jest
    .mocked(queryConversations)
    .mockResolvedValueOnce(response([item(1)]))
    .mockReturnValueOnce(pending.promise);
  const { result } = renderHook(() => useSupportConversations(true, '', true));
  await act(async () => {});
  await act(async () => {
    jest.advanceTimersByTime(10000);
  });
  await act(async () => {
    result.current.markRead(1);
  });
  expect(result.current.conversations).toEqual([]);
  await act(async () => {
    pending.resolve(response([item(1)]));
  });
  expect(result.current.conversations).toEqual([]);
  expect(result.current.total).toBe(0);
});

test('large user IDs stay strings and clearing search returns to the first batch', async () => {
  const { rerender } = renderHook(
    ({ keyword }) => useSupportConversations(true, keyword, false),
    { initialProps: { keyword: '9007199254740993' } },
  );
  await act(async () => {
    jest.advanceTimersByTime(350);
  });
  expect(queryConversations).toHaveBeenLastCalledWith(
    expect.objectContaining({ keyword: '9007199254740993' }),
  );
  rerender({ keyword: '' });
  await act(async () => {
    jest.advanceTimersByTime(350);
  });
  expect(queryConversations).toHaveBeenLastCalledWith(
    expect.objectContaining({ keyword: undefined, beforeId: undefined }),
  );
});
