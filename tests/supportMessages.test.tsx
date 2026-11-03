import { act, renderHook } from '@testing-library/react';
import useSupportMessages from '@/pages/guardfind/im/hooks/useSupportMessages';
import { queryMessages, sendMessage } from '@/services/web/guardfind/im';

type Message = import('@/services/web/guardfind/im').AdminMessageVo;
type Envelope<T> = import('@/typings').R<T>;
jest.mock('@/services/web/guardfind/im', () => ({
  queryMessages: jest.fn(),
  sendMessage: jest.fn(),
}));
const response = <T,>(data: T): Envelope<T> => ({
  code: '0',
  msg: 'ok',
  success: true,
  timestamp: 0,
  data,
});
const item = (id: string): Message => ({
  id,
  senderType: 'USER',
  content: id,
  createTime: '2026-11-03 10:00:00',
  adminName: null,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
beforeEach(() => {
  jest.useFakeTimers();
  jest.resetAllMocks();
  jest.mocked(queryMessages).mockResolvedValue(response([]));
});
afterEach(() => jest.useRealTimers());

test('requests never overlap, drains full pages, and resumes from the cursor after becoming visible', async () => {
  const first = deferred<Envelope<Message[]>>();
  const onRead = jest.fn();
  jest
    .mocked(queryMessages)
    .mockReturnValueOnce(first.promise)
    .mockResolvedValueOnce(response([item('101')]));
  const { result, rerender, unmount } = renderHook(
    ({ enabled }) => useSupportMessages('7', enabled, onRead),
    { initialProps: { enabled: true } },
  );
  await act(async () => {
    jest.advanceTimersByTime(9000);
  });
  expect(queryMessages).toHaveBeenCalledTimes(1);
  await act(async () =>
    first.resolve(
      response(Array.from({ length: 100 }, (_, i) => item(String(i + 1)))),
    ),
  );
  expect(onRead).not.toHaveBeenCalled();
  await act(async () => {
    jest.advanceTimersByTime(50);
  });
  expect(queryMessages).toHaveBeenLastCalledWith('7', '100');
  expect(result.current.messages).toHaveLength(101);
  expect(onRead).toHaveBeenCalledWith('7');
  rerender({ enabled: false });
  await act(async () => {
    jest.advanceTimersByTime(20000);
  });
  expect(queryMessages).toHaveBeenCalledTimes(2);
  await act(async () => rerender({ enabled: true }));
  expect(queryMessages).toHaveBeenLastCalledWith('7', '101');
  unmount();
});

test('a request completed after leaving the page cannot mark unread messages as read locally', async () => {
  const pending = deferred<Envelope<Message[]>>();
  const onRead = jest.fn();
  jest.mocked(queryMessages).mockReturnValueOnce(pending.promise);
  const { result, rerender } = renderHook(
    ({ enabled }) => useSupportMessages('7', enabled, onRead),
    { initialProps: { enabled: true } },
  );
  rerender({ enabled: false });
  await act(async () => pending.resolve(response([item('1')])));
  expect(result.current.messages).toEqual([]);
  expect(onRead).not.toHaveBeenCalled();
});

test('double send is locked immediately and polling deduplicates the send response', async () => {
  const pending = deferred<Envelope<Message>>();
  const message = item('9007199254740993');
  const onRead = jest.fn();
  jest.mocked(sendMessage).mockReturnValueOnce(pending.promise);
  const { result } = renderHook(() => useSupportMessages('7', true, onRead));
  await act(async () => {});
  let sent!: Promise<boolean>;
  await act(async () => {
    sent = result.current.send(' hello ');
    expect(await result.current.send('hello')).toBe(false);
  });
  expect(sendMessage).toHaveBeenCalledTimes(1);
  expect(sendMessage).toHaveBeenCalledWith('7', 'hello');
  await act(async () => {
    pending.resolve(response(message));
    await sent;
  });
  jest.mocked(queryMessages).mockResolvedValueOnce(response([message]));
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
  expect(result.current.messages).toEqual([message]);
  expect(result.current.sending).toBe(false);
});

test('failed initial reads show an error and a later retry recovers', async () => {
  const onRead = jest.fn();
  jest.mocked(queryMessages).mockRejectedValueOnce(new Error('offline'));
  const { result } = renderHook(() => useSupportMessages('7', true, onRead));
  await act(async () => {});
  expect(result.current.error).toBe('消息加载失败，请重试');
  expect(result.current.loading).toBe(false);
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
  expect(result.current.error).toBe('');
  expect(onRead).toHaveBeenCalledWith('7');
});
