import { fireEvent, render, screen } from '@testing-library/react';
import { history } from '@umijs/max';
import TaskListPage from '@/pages/oa/tasks';
import {
  queryOaDoneRecords,
  queryOaTodoTasks,
} from '@/services/web/guardfind/oa';

jest.mock('@umijs/max', () => ({
  history: { push: jest.fn() },
}));

jest.mock('@/services/web/guardfind/oa', () => ({
  queryOaTodoTasks: jest.fn(),
  queryOaDoneRecords: jest.fn(),
}));

const todo = {
  applicationId: 70,
  title: '差旅报销',
  businessKey: 'OA-10-20261107100000-AAA',
  modelName: '报销流程',
  formName: '报销单',
  applicantName: '张三',
  applicantDeptName: '研发部',
  taskId: 'task-1',
  taskName: '主管审批',
  taskCreateTime: '2026-11-07 10:00:00',
  submittedTime: '2026-11-07 09:59:00',
};

const done = {
  applicationId: 71,
  title: '采购申请',
  businessKey: 'OA-10-20261107110000-BBB',
  modelName: '采购流程',
  formName: '采购单',
  applicantName: '李四',
  action: 'RETURN',
  reason: '金额需复核',
  taskId: 'task-2',
  operatedTime: '2026-11-07 11:00:00',
  applicationStatus: 'RUNNING',
};

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('审批中心列表页', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryOaTodoTasks).mockResolvedValue({
      data: { list: [todo], total: 1 },
    } as any);
    jest.mocked(queryOaDoneRecords).mockResolvedValue({
      data: { list: [done], total: 1 },
    } as any);
  });

  it('展示待办并进入审批详情', async () => {
    render(<TaskListPage />);

    expect(await screen.findByText('差旅报销')).toBeTruthy();
    expect(screen.getByText('报销单')).toBeTruthy();
    expect(screen.getByText('主管审批')).toBeTruthy();
    expect(queryOaTodoTasks).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, size: 20 }),
    );

    fireEvent.click(screen.getByRole('button', { name: /处理/ }));
    expect(history.push).toHaveBeenCalledWith('/oa/tasks/detail?taskId=task-1');
  });

  it('切换到已办并展示动作与意见', async () => {
    render(<TaskListPage />);
    await screen.findByText('差旅报销');

    fireEvent.click(screen.getByRole('tab', { name: '已办' }));

    expect(await screen.findByText('采购申请')).toBeTruthy();
    expect(screen.getByText('退回上一节点')).toBeTruthy();
    expect(screen.getByText('金额需复核')).toBeTruthy();
    expect(queryOaDoneRecords).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, size: 20 }),
    );
  });
});
