import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotificationsPage from '@/pages/oa/notifications';
import {
  queryOaNotifications,
  queryOaUnreadCount,
  readAllOaNotifications,
  readOaNotification,
} from '@/services/web/guardfind/oa';

jest.mock('@/services/web/guardfind/oa', () => ({
  queryOaNotifications: jest.fn(),
  queryOaUnreadCount: jest.fn(),
  readOaNotification: jest.fn(),
  readAllOaNotifications: jest.fn(),
}));

const notification = {
  id: 1,
  type: 'TODO',
  title: '待审批：差旅报销',
  content: '「报销流程」已提交，等待您审批',
  applicationId: 70,
  taskId: 'task-1',
  status: 'UNREAD',
  readTime: null,
  createTime: '2026-11-08 09:00:00',
};

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('OA 站内通知', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryOaNotifications).mockResolvedValue({
      data: { list: [notification], total: 1 },
    } as any);
    jest.mocked(queryOaUnreadCount).mockResolvedValue({
      data: { count: 1 },
    } as any);
    jest.mocked(readOaNotification).mockResolvedValue({ data: null } as any);
    jest.mocked(readAllOaNotifications).mockResolvedValue({ data: 1 } as any);
  });

  it('展示未读通知并可标记单条已读', async () => {
    render(<NotificationsPage />);

    expect(await screen.findByText('待审批：差旅报销')).toBeTruthy();
    expect(await screen.findByText('未读 1')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '标记已读' }));
    await waitFor(() => expect(readOaNotification).toHaveBeenCalledWith(1));
    await waitFor(() => expect(queryOaNotifications).toHaveBeenCalledTimes(2));
  });

  it('全部已读调用批量接口并刷新未读数', async () => {
    render(<NotificationsPage />);

    const button = await screen.findByRole('button', { name: '全部已读' });
    await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false));
    fireEvent.click(button);

    await waitFor(() => expect(readAllOaNotifications).toHaveBeenCalled());
    await waitFor(() =>
      expect(jest.mocked(queryOaUnreadCount).mock.calls.length).toBeGreaterThan(
        1,
      ),
    );
  });

  it('切换只看未读后按 unreadOnly 重新请求', async () => {
    render(<NotificationsPage />);
    await screen.findByText('待审批：差旅报销');

    fireEvent.click(screen.getByRole('switch', { name: '只看未读' }));
    await waitFor(() =>
      expect(queryOaNotifications).toHaveBeenLastCalledWith(
        expect.objectContaining({ unreadOnly: true }),
      ),
    );
  });
});
