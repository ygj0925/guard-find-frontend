import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ApplicationDetailPage from '@/pages/oa/application/detail';
import {
  getOaApplication,
  urgeOaApplication,
  withdrawOaApplication,
} from '@/services/web/guardfind/oa';

jest.mock('@umijs/max', () => ({
  useSearchParams: () => [
    new URLSearchParams((globalThis as any).__oaWithdrawSearch || ''),
  ],
  history: { push: jest.fn() },
}));

jest.mock('@/services/web/guardfind/oa', () => ({
  getOaApplication: jest.fn(),
  withdrawOaApplication: jest.fn(),
  urgeOaApplication: jest.fn(),
}));

const detail = {
  id: 70,
  businessType: 'expense',
  businessKey: 'OA-10-20261107100000-AAA',
  title: '差旅报销',
  status: 'RUNNING',
  applicantId: 101,
  applicantName: '张三',
  applicantDeptName: '研发部',
  releaseId: 10,
  releaseVersion: 1,
  formVersion: 1,
  formName: '报销单',
  modelName: '报销流程',
  schemaJson: JSON.stringify({
    version: 1,
    fields: [{ id: 'f1', key: 'reason', label: '事由', type: 'text' }],
  }),
  formData: { reason: '客户拜访' },
  processInstanceId: 'inst-1',
  submittedTime: '2026-11-07 09:59:00',
  finishedTime: null,
  createTime: '2026-11-07 09:59:00',
  timeline: [
    {
      action: 'SUBMIT',
      operatorId: 101,
      operatorName: '张三',
      taskId: null,
      reason: null,
      createTime: '2026-11-07 09:59:00',
    },
  ],
};

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('我的申请撤回', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).__oaWithdrawSearch = 'id=70';
    jest.mocked(getOaApplication).mockResolvedValue({ data: detail } as any);
    jest.mocked(withdrawOaApplication).mockResolvedValue({
      data: {
        applicationId: 70,
        status: 'WITHDRAWN',
        taskId: null,
        replayed: false,
      },
    } as any);
    jest.mocked(urgeOaApplication).mockResolvedValue({
      data: {
        applicationId: 70,
        taskCount: 1,
        recipients: [102],
        urgedAt: '2026-11-08 10:00:00',
        nextAllowedTime: '2026-11-08 10:10:00',
      },
    } as any);
  });

  it('进行中的申请可填写原因后撤回并刷新', async () => {
    render(<ApplicationDetailPage />);

    expect(await screen.findByText('差旅报销')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '撤回申请' }));

    expect(await screen.findByLabelText('撤回原因')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('撤回原因'), {
      target: { value: '信息填错了' },
    });
    fireEvent.click(screen.getByRole('button', { name: '确认撤回' }));

    await waitFor(() =>
      expect(withdrawOaApplication).toHaveBeenCalledWith(
        '70',
        expect.objectContaining({ reason: '信息填错了' }),
      ),
    );
    expect(
      jest.mocked(withdrawOaApplication).mock.calls[0][1].requestId,
    ).toBeTruthy();
    await waitFor(() => expect(getOaApplication).toHaveBeenCalledTimes(2));
  });

  it('进行中的申请可填写备注后催办', async () => {
    render(<ApplicationDetailPage />);

    expect(await screen.findByText('差旅报销')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /催\s*办/ }));
    fireEvent.change(await screen.findByLabelText('催办备注'), {
      target: { value: '请尽快处理' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送催办' }));

    await waitFor(() =>
      expect(urgeOaApplication).toHaveBeenCalledWith(
        '70',
        expect.objectContaining({ reason: '请尽快处理' }),
      ),
    );
    expect(
      jest.mocked(urgeOaApplication).mock.calls[0][1].requestId,
    ).toBeTruthy();
  });

  it('已结束的申请不显示撤回按钮', async () => {
    jest.mocked(getOaApplication).mockResolvedValue({
      data: { ...detail, status: 'APPROVED' },
    } as any);
    render(<ApplicationDetailPage />);

    expect(await screen.findByText('差旅报销')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '撤回申请' })).toBeNull();
  });
});
