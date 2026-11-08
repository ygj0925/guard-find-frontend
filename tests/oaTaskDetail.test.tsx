import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { history } from '@umijs/max';
import TaskDetailPage from '@/pages/oa/tasks/detail';
import {
  approveOaTask,
  getOaApprovalTask,
  rejectOaTask,
} from '@/services/web/guardfind/oa';

jest.mock('@umijs/max', () => ({
  useSearchParams: () => [
    new URLSearchParams((globalThis as any).__oaTaskSearch || ''),
  ],
  history: { push: jest.fn() },
}));

jest.mock('@/services/web/guardfind/oa', () => ({
  getOaApprovalTask: jest.fn(),
  approveOaTask: jest.fn(),
  rejectOaTask: jest.fn(),
  returnOaTask: jest.fn(),
}));

const application = {
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

const pendingDetail = {
  taskId: 'task-1',
  taskName: '主管审批',
  taskDefinitionKey: 'manager',
  assignee: '102',
  pending: true,
  application,
};

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('审批任务详情页', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).__oaTaskSearch = 'taskId=task-1';
    jest.mocked(getOaApprovalTask).mockResolvedValue({
      data: pendingDetail,
    } as any);
    jest.mocked(approveOaTask).mockResolvedValue({
      data: {
        applicationId: 70,
        status: 'RUNNING',
        taskId: 'task-1',
        replayed: false,
      },
    } as any);
    jest.mocked(rejectOaTask).mockResolvedValue({
      data: {
        applicationId: 70,
        status: 'REJECTED',
        taskId: 'task-1',
        replayed: false,
      },
    } as any);
  });

  it('展示申请快照并通过任务', async () => {
    render(<TaskDetailPage />);

    expect(await screen.findByText('差旅报销')).toBeTruthy();
    expect(screen.getByText('当前节点：主管审批')).toBeTruthy();
    expect(screen.getByText('客户拜访')).toBeTruthy();
    expect(getOaApprovalTask).toHaveBeenCalledWith('task-1');

    fireEvent.click(screen.getByRole('button', { name: /通过/ }));
    fireEvent.change(screen.getByLabelText('审批意见'), {
      target: { value: '同意' },
    });
    fireEvent.click(screen.getByRole('button', { name: '确认通过' }));

    await waitFor(() =>
      expect(approveOaTask).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({ reason: '同意' }),
      ),
    );
    expect(jest.mocked(approveOaTask).mock.calls[0][1].requestId).toBeTruthy();
    await waitFor(() => expect(history.push).toHaveBeenCalledWith('/oa/tasks'));
  });

  it('驳回必须填写原因', async () => {
    render(<TaskDetailPage />);
    await screen.findByText('差旅报销');

    fireEvent.click(screen.getByRole('button', { name: /驳回/ }));
    fireEvent.click(screen.getByRole('button', { name: '确认驳回' }));
    expect(rejectOaTask).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('审批意见'), {
      target: { value: '预算不足' },
    });
    fireEvent.click(screen.getByRole('button', { name: '确认驳回' }));

    await waitFor(() =>
      expect(rejectOaTask).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({ reason: '预算不足' }),
      ),
    );
  });

  it('已处理任务为只读视图', async () => {
    jest.mocked(getOaApprovalTask).mockResolvedValue({
      data: { ...pendingDetail, pending: false },
    } as any);
    render(<TaskDetailPage />);

    expect(await screen.findByText('该任务已处理')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^通过$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^驳回$/ })).toBeNull();
  });
});
