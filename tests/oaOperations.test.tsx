import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OperationsPage from '@/pages/oa/operations';
import {
  dispatchOaOutbox,
  queryOaOutboxEvents,
  retryOaOutboxEvent,
  terminateOaApplication,
} from '@/services/web/guardfind/oa';

jest.mock('umi', () => ({
  useModel: (_key: string, selector?: (model: unknown) => unknown) =>
    selector
      ? selector({
          initialState: {
            user: { id: '1', nickname: 'Admin', permissions: ['*:*:*'] },
          },
        })
      : undefined,
}));

jest.mock('@/services/web/guardfind/oa', () => ({
  queryOaOutboxEvents: jest.fn(),
  retryOaOutboxEvent: jest.fn(),
  dispatchOaOutbox: jest.fn(),
  terminateOaApplication: jest.fn(),
}));

const failedEvent = {
  id: 11,
  tenantId: 101,
  eventId: 'event-11',
  aggregateType: 'APPLICATION',
  aggregateId: '70',
  eventType: 'APPLICATION_SUBMITTED',
  payload: '{}',
  status: 'FAILED',
  retryCount: 2,
  nextRetryTime: '2026-11-08 10:00:00',
  lastError: '通知负载不是合法 JSON',
  createTime: '2026-11-08 09:00:00',
  sentTime: null,
};

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('OA 运维页', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryOaOutboxEvents).mockResolvedValue({
      data: { list: [failedEvent], total: 1 },
    } as any);
    jest.mocked(retryOaOutboxEvent).mockResolvedValue({ data: null } as any);
    jest.mocked(dispatchOaOutbox).mockResolvedValue({
      data: { scanned: 1, sent: 1, failed: 0 },
    } as any);
    jest.mocked(terminateOaApplication).mockResolvedValue({
      data: {
        applicationId: 70,
        status: 'CANCELLED',
        taskId: null,
        replayed: false,
      },
    } as any);
  });

  it('展示失败事件并支持手动重试', async () => {
    render(<OperationsPage />);

    expect(await screen.findByText('通知负载不是合法 JSON')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '重试' }));

    await waitFor(() => expect(retryOaOutboxEvent).toHaveBeenCalledWith(11));
    await waitFor(() => expect(queryOaOutboxEvents).toHaveBeenCalledTimes(2));
  });

  it('立即投递展示扫描结果', async () => {
    render(<OperationsPage />);
    await screen.findByText('通知负载不是合法 JSON');

    fireEvent.click(screen.getByRole('button', { name: '立即投递' }));
    await waitFor(() => expect(dispatchOaOutbox).toHaveBeenCalled());
  });

  it('终止申请必须填写申请 ID 与原因', async () => {
    render(<OperationsPage />);
    await screen.findByText('通知负载不是合法 JSON');

    fireEvent.click(screen.getByRole('button', { name: '终止申请' }));
    expect(await screen.findByLabelText('申请 ID')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('申请 ID'), {
      target: { value: '70' },
    });
    fireEvent.change(screen.getByLabelText('终止原因'), {
      target: { value: '信息不实' },
    });
    fireEvent.click(screen.getByRole('button', { name: '确认终止' }));

    await waitFor(() =>
      expect(terminateOaApplication).toHaveBeenCalledWith(
        70,
        expect.objectContaining({ reason: '信息不实' }),
      ),
    );
    expect(
      jest.mocked(terminateOaApplication).mock.calls[0][1].requestId,
    ).toBeTruthy();
  });
});
