import { fireEvent, render, screen } from '@testing-library/react';
import { history } from '@umijs/max';
import LaunchListPage from '@/pages/oa/launch';
import { queryOaLaunches } from '@/services/web/guardfind/oa';

jest.mock('@umijs/max', () => ({
  history: { push: jest.fn() },
}));

jest.mock('@/hooks/useAccess', () => ({
  useAccess: () => ({
    permissions: [],
    roles: [],
    isAdmin: true,
    hasPermission: () => true,
    hasRole: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
  }),
}));

jest.mock('@/services/web/guardfind/oa', () => ({
  queryOaLaunches: jest.fn(),
}));

const launch = {
  releaseId: 21,
  modelId: 9,
  modelKey: 'leave_demo',
  modelName: '请假审批',
  category: '人事',
  description: null,
  releaseVersion: 2,
  processDefinitionKey: 'leave_demo',
  formId: 6,
  formVersionId: 31,
  formVersion: 1,
  formName: '请假申请单',
  formKey: 'leave_form',
  launchScope: '{"depts":[10]}',
  publishTime: '2026-11-05 18:00:00',
};

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('发起流程列表页', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryOaLaunches).mockResolvedValue({
      data: { list: [launch], total: 1 },
    } as any);
  });

  it('展示可发起流程与表单版本', async () => {
    render(<LaunchListPage />);

    expect(await screen.findByText('请假审批')).toBeTruthy();
    expect(screen.getByText('leave_demo')).toBeTruthy();
    expect(screen.getByText('请假申请单')).toBeTruthy();
    expect(screen.getByText('leave_form · v1')).toBeTruthy();
    expect(screen.getByText('v2')).toBeTruthy();
    expect(queryOaLaunches).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, size: 20 }),
    );
  });

  it('从列表进入填写页或我的申请', async () => {
    render(<LaunchListPage />);
    await screen.findByText('请假审批');

    fireEvent.click(screen.getByRole('button', { name: /发起/ }));
    expect(history.push).toHaveBeenCalledWith('/oa/launch/fill?releaseId=21');

    fireEvent.click(screen.getByRole('button', { name: /我的申请/ }));
    expect(history.push).toHaveBeenCalledWith('/oa/application');
  });
});
