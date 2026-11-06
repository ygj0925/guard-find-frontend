import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { history } from '@umijs/max';
import ProcessModelPage from '@/pages/oa/process';
import {
  createOaProcessModel,
  publishOaProcessModel,
  queryOaProcessModels,
  queryOaProcessReleases,
} from '@/services/web/guardfind/oa';
import { defaultOaBpmnXml } from '@/utils/oaBpmn';

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
  createOaProcessModel: jest.fn(),
  disableOaProcessModel: jest.fn(),
  publishOaProcessModel: jest.fn(),
  queryOaProcessModels: jest.fn(),
  queryOaProcessReleases: jest.fn(),
}));

const model = {
  id: 9,
  modelKey: 'leave_demo',
  name: '请假审批',
  category: '人事',
  description: null,
  bpmnXml: null,
  xmlDigest: 'digest',
  status: 'PUBLISHED',
  currentReleaseId: 21,
  currentReleaseVersion: 2,
  formId: null,
  formVersionId: null,
  version: 3,
  createTime: '2026-11-01 10:00:00',
  updateTime: '2026-11-06 09:00:00',
};

const release = {
  id: 21,
  releaseVersion: 2,
  engineDefinitionId: 'leave_demo:2:88',
  processDefinitionKey: 'leave_demo',
  processDefinitionVersion: 2,
  formId: null,
  formVersionId: null,
  formVersion: null,
  launchScope: null,
  status: 'ACTIVE',
  publishedBy: 1,
  publishTime: '2026-11-05 18:00:00',
  remark: '上线',
  xmlDigest: 'digest',
};

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('流程模型列表页', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryOaProcessModels).mockResolvedValue({
      data: { list: [model], total: 1 },
    } as any);
    jest.mocked(createOaProcessModel).mockResolvedValue({
      data: { ...model, id: 10, modelKey: 'expense_demo', name: '报销审批' },
    } as any);
    jest.mocked(publishOaProcessModel).mockResolvedValue({
      data: {
        valid: true,
        errors: [],
        releaseId: 22,
        releaseVersion: 3,
        engineDefinitionId: 'leave_demo:3:99',
        processDefinitionVersion: 3,
      },
    } as any);
    jest.mocked(queryOaProcessReleases).mockResolvedValue({
      data: [release],
    } as any);
  });

  it('加载并展示流程模型与发布状态', async () => {
    render(<ProcessModelPage />);
    expect(await screen.findByText('请假审批')).toBeTruthy();
    expect(screen.getByText('leave_demo')).toBeTruthy();
    expect(screen.getByText('已发布')).toBeTruthy();
    expect(screen.getByText('v2')).toBeTruthy();
    expect(queryOaProcessModels).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, size: 20 }),
    );
  });

  it('新建模型时预置独立的流程 Key 并进入设计器', async () => {
    render(<ProcessModelPage />);
    await screen.findByText('请假审批');

    fireEvent.click(screen.getByRole('button', { name: /新建流程/ }));
    fireEvent.change(await screen.findByLabelText('模型标识'), {
      target: { value: 'expense_demo' },
    });
    fireEvent.change(screen.getByLabelText('名称'), {
      target: { value: '报销审批' },
    });
    fireEvent.click(screen.getByRole('button', { name: '创建并设计' }));

    await waitFor(() =>
      expect(createOaProcessModel).toHaveBeenCalledWith(
        expect.objectContaining({
          modelKey: 'expense_demo',
          name: '报销审批',
          bpmnXml: expect.stringContaining('bpmnElement="expense_demo"'),
        }),
      ),
    );
    expect(defaultOaBpmnXml('expense_demo', '报销审批')).toContain(
      '<bpmn:process id="expense_demo"',
    );
    expect(history.push).toHaveBeenCalledWith('/oa/process/design?id=10');
  });

  it('查看发布版本历史', async () => {
    render(<ProcessModelPage />);
    await screen.findByText('请假审批');

    fireEvent.click(screen.getByRole('button', { name: /版本/ }));

    await waitFor(() => expect(queryOaProcessReleases).toHaveBeenCalledWith(9));
    expect((await screen.findAllByText('v2')).length).toBeGreaterThan(0);
    expect(screen.getByText('生效中')).toBeTruthy();
    expect(screen.getByText('leave_demo:2:88')).toBeTruthy();
  });

  it('发布被服务端拒绝时保留弹窗并展示错误', async () => {
    jest.mocked(publishOaProcessModel).mockResolvedValue({
      data: {
        valid: false,
        errors: ['流程定义 Key 已被其他模型占用: leave_demo'],
      },
    } as any);
    render(<ProcessModelPage />);
    await screen.findByText('请假审批');

    fireEvent.click(screen.getByRole('button', { name: /发布/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /发.?布/ }));

    expect(
      await screen.findByText('流程定义 Key 已被其他模型占用: leave_demo'),
    ).toBeTruthy();
    expect(screen.getByText('服务端校验未通过')).toBeTruthy();
  });
});
