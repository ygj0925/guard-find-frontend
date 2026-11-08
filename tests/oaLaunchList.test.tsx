import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { history } from '@umijs/max';
import LaunchListPage from '@/pages/oa/launch';
import {
  deleteOaDraft,
  queryOaDrafts,
  queryOaLaunches,
} from '@/services/web/guardfind/oa';

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
  queryOaDrafts: jest.fn(),
  deleteOaDraft: jest.fn(),
}));

const drafts = [
  {
    id: '900000000000000001',
    releaseId: '21',
    title: '周五请假',
    modelName: '年假流程',
    formName: '年假单',
    releaseVersion: 2,
    launchable: true,
    version: 1,
    updateTime: '2026-11-09 10:00:00',
  },
  {
    id: '900000000000000002',
    releaseId: '11',
    title: null,
    modelName: '旧报销流程',
    formName: '报销单',
    releaseVersion: 1,
    launchable: false,
    version: 0,
    updateTime: '2026-11-08 10:00:00',
  },
];

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
    jest.mocked(queryOaDrafts).mockResolvedValue({
      data: { list: drafts, total: 2 },
    } as any);
    jest.mocked(deleteOaDraft).mockResolvedValue({ data: null } as any);
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

  it('我的草稿：可继续的带草稿 ID 进入，停用的只能删除', async () => {
    render(<LaunchListPage />);

    expect(await screen.findByText('周五请假')).toBeTruthy();
    expect(screen.getByText('（未填写标题）')).toBeTruthy();
    expect(screen.getByText('旧报销流程 · 发布 v1')).toBeTruthy();
    expect(screen.getByText('流程已停用')).toBeTruthy();

    const continueButtons = screen.getAllByRole('button', { name: /继续/ });
    expect((continueButtons[1] as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(continueButtons[0]);
    expect(history.push).toHaveBeenCalledWith(
      '/oa/launch/fill?releaseId=21&draftId=900000000000000001',
    );

    fireEvent.click(screen.getAllByRole('button', { name: /删除/ })[1]);
    fireEvent.click(await screen.findByRole('button', { name: /确\s*定|OK/ }));
    await waitFor(() =>
      expect(deleteOaDraft).toHaveBeenCalledWith('900000000000000002'),
    );
    await waitFor(() => expect(queryOaDrafts).toHaveBeenCalledTimes(2));
  });
});
