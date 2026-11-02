import { act, renderHook } from '@testing-library/react';
import useUnreadModel from '@/models/unread';
import {
  getUnreadCount,
  getUnreadNoticeCount,
} from '@/services/web/user-message';

let mockIdentity = 'user-A';
jest.mock('@umijs/max', () => ({
  useModel: (_name: string, select: (model: any) => any) =>
    select({ initialState: { user: { id: 1 } } }),
}));
jest.mock('@/utils/AuthSession', () => ({
  getSessionIdentity: () => mockIdentity,
}));
jest.mock('@/utils/Web', () => ({ Token: { get: () => mockIdentity } }));
jest.mock('@/services/web/user-message', () => ({
  getUnreadCount: jest.fn(),
  getUnreadNoticeCount: jest.fn(),
}));

function deferred() {
  let resolve!: (response: any) => void;
  const promise = new Promise<any>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

beforeEach(() => {
  jest.resetAllMocks();
  mockIdentity = 'user-A';
  jest.mocked(getUnreadCount).mockResolvedValue({ data: { total: 3 } } as any);
  jest
    .mocked(getUnreadNoticeCount)
    .mockResolvedValue({ data: { total: 2 } } as any);
});

test('the header and message page share concurrent reads and both receive the latest counts', async () => {
  const read = deferred();
  jest.mocked(getUnreadCount).mockReturnValueOnce(read.promise);
  const { result } = renderHook(useUnreadModel);
  let first!: Promise<void>;
  let second!: Promise<void>;
  await act(async () => {
    first = result.current.refreshUnread();
    second = result.current.refreshUnread();
    read.resolve({ data: { total: 3 } });
    await Promise.all([first, second]);
  });
  expect(first).toBe(second);
  expect(getUnreadCount).toHaveBeenCalledTimes(1);
  expect(getUnreadNoticeCount).toHaveBeenCalledTimes(1);
  expect(result.current.messageUnread + result.current.noticeUnread).toBe(5);
});

test('a mutation during a read queues a fresh request rather than reusing pre-mutation data', async () => {
  const oldRead = deferred();
  jest
    .mocked(getUnreadCount)
    .mockReturnValueOnce(oldRead.promise)
    .mockResolvedValueOnce({ data: { total: 0 } } as any);
  const { result } = renderHook(useUnreadModel);
  await act(async () => {
    const beforeMutation = result.current.refreshUnread();
    const afterMutation = result.current.refreshUnread(true);
    const anotherMutation = result.current.refreshUnread(true);
    oldRead.resolve({ data: { total: 9 } });
    await Promise.all([beforeMutation, afterMutation, anotherMutation]);
  });
  expect(getUnreadCount).toHaveBeenCalledTimes(2);
  expect(getUnreadNoticeCount).toHaveBeenCalledTimes(2);
  expect(result.current.messageUnread).toBe(0);
});

test('a previous account response cannot overwrite a new account, including equal counts', async () => {
  const oldRead = deferred();
  jest.mocked(getUnreadCount).mockReturnValueOnce(oldRead.promise);
  const { result, rerender } = renderHook(useUnreadModel);
  let oldPending!: Promise<void>;
  await act(async () => {
    oldPending = result.current.refreshUnread();
  });
  mockIdentity = 'user-B';
  rerender();
  expect(result.current.messageUnread).toBe(0);
  await act(async () => {
    await result.current.refreshUnread();
  });
  await act(async () => {
    oldRead.resolve({ data: { total: 99 } });
    await oldPending;
  });
  expect(result.current.messageUnread).toBe(3);
  expect(result.current.noticeUnread).toBe(2);
});

test("a failed count retains that account's last value without blocking the other count", async () => {
  const { result } = renderHook(useUnreadModel);
  await act(async () => {
    await result.current.refreshUnread();
  });
  jest.mocked(getUnreadCount).mockRejectedValueOnce(new Error('offline'));
  jest
    .mocked(getUnreadNoticeCount)
    .mockResolvedValueOnce({ data: { total: 1 } } as any);
  await act(async () => {
    await result.current.refreshUnread();
  });
  expect(result.current.messageUnread).toBe(3);
  expect(result.current.noticeUnread).toBe(1);
});
