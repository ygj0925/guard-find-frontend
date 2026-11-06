import { fireEvent, render, screen } from '@testing-library/react';
import { history } from '@umijs/max';
import ApplicationListPage from '@/pages/oa/application';
import { queryOaApplications } from '@/services/web/guardfind/oa';

jest.mock('@umijs/max', () => ({
  history: { push: jest.fn() },
}));

jest.mock('@/services/web/guardfind/oa', () => ({
  queryOaApplications: jest.fn(),
}));

const application = {
  id: 70,
  businessType: 'leave_demo',
  businessKey: 'OA-21-20261106180000-ABCDEF12',
  title: '张三的请假申请',
  status: 'RUNNING',
  formVersion: 1,
  processInstanceId: 'inst-1',
  modelName: '请假审批',
  formName: '请假申请单',
  submittedTime: '2026-11-06 18:00:00',
  finishedTime: null,
  createTime: '2026-11-06 18:00:00',
};

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('我的申请列表页', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryOaApplications).mockResolvedValue({
      data: { list: [application], total: 1 },
    } as any);
  });

  it('展示申请、流程与状态', async () => {
    render(<ApplicationListPage />);

    expect(await screen.findByText('张三的请假申请')).toBeTruthy();
    expect(screen.getByText('OA-21-20261106180000-ABCDEF12')).toBeTruthy();
    expect(screen.getByText('请假审批')).toBeTruthy();
    expect(screen.getByText('请假申请单 v1')).toBeTruthy();
    expect(screen.getByText('审批中')).toBeTruthy();
    expect(queryOaApplications).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, size: 20 }),
    );
  });

  it('进入详情或发起新流程', async () => {
    render(<ApplicationListPage />);
    await screen.findByText('张三的请假申请');

    fireEvent.click(screen.getByRole('button', { name: /查看/ }));
    expect(history.push).toHaveBeenCalledWith('/oa/application/detail?id=70');

    fireEvent.click(screen.getByRole('button', { name: /发起流程/ }));
    expect(history.push).toHaveBeenCalledWith('/oa/launch');
  });
});
