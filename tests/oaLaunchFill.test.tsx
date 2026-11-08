import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { history } from '@umijs/max';
import LaunchFillPage from '@/pages/oa/launch/fill';
import { getOaLaunch, submitOaLaunch } from '@/services/web/guardfind/oa';

jest.mock('@umijs/max', () => ({
  useSearchParams: () => [
    new URLSearchParams((globalThis as any).__oaLaunchSearch || ''),
  ],
  history: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock('umi', () => ({
  request: jest.fn(),
}));

jest.mock('@/services/web/guardfind/oa', () => ({
  getOaLaunch: jest.fn(),
  submitOaLaunch: jest.fn(),
}));

const schema = {
  version: 1,
  fields: [
    { id: 'f1', key: 'name', label: '姓名', type: 'text', required: true },
    { id: 'f2', key: 'owner', label: '负责人', type: 'person' },
    { id: 'f3', key: 'secret', label: '内部备注', type: 'text', hidden: true },
  ],
};

const detail = {
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
  schemaJson: JSON.stringify(schema),
  schemaDigest: 'digest',
  launchScope: '{"depts":[10]}',
  launchable: true,
  assigneeVariables: [
    { name: 'approver', suggestedType: 'FORM_FIELD', suggestedValue: 'owner' },
    { name: 'supervisor', suggestedType: 'SUPERVISOR', suggestedValue: null },
  ],
};

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('发起填写页', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).__oaLaunchSearch = 'releaseId=21';
    jest.mocked(getOaLaunch).mockResolvedValue({ data: detail } as any);
    jest.mocked(submitOaLaunch).mockResolvedValue({
      data: {
        applicationId: 70,
        businessKey: 'OA-21-20261106180000-ABCDEF12',
        processInstanceId: 'inst-1',
        replayed: false,
      },
    } as any);
  });

  it('渲染表单与自动推荐的审批人来源', async () => {
    render(<LaunchFillPage />);

    expect(await screen.findByText('发起：请假审批')).toBeTruthy();
    expect(getOaLaunch).toHaveBeenCalledWith('21');
    expect(screen.getByText('请假申请单 v1 · 发布 v2')).toBeTruthy();
    expect(screen.getByLabelText('姓名')).toBeTruthy();
    expect(screen.getByLabelText('负责人')).toBeTruthy();
    expect(screen.queryByLabelText('内部备注')).toBeNull();
    expect(screen.getByText('approver')).toBeTruthy();
    expect(screen.getByText('supervisor')).toBeTruthy();
    expect(screen.getAllByText('已自动推荐')).toHaveLength(2);
    expect(screen.getByText('按发起人的组织关系自动解析')).toBeTruthy();
  });

  it('校验必填后才提交，并携带幂等请求与绑定', async () => {
    render(<LaunchFillPage />);
    await screen.findByText('发起：请假审批');

    fireEvent.click(screen.getByRole('button', { name: /提交并发起/ }));
    expect(await screen.findByText('请填写姓名')).toBeTruthy();
    expect(submitOaLaunch).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('姓名'), {
      target: { value: '张三' },
    });
    fireEvent.change(screen.getByLabelText('负责人'), {
      target: { value: '102' },
    });
    fireEvent.click(screen.getByRole('button', { name: /提交并发起/ }));

    await waitFor(() => expect(submitOaLaunch).toHaveBeenCalledTimes(1));
    const [releaseId, payload] = jest.mocked(submitOaLaunch).mock.calls[0];
    expect(releaseId).toBe('21');
    expect(payload.requestId).toBeTruthy();
    expect(payload.title).toBeUndefined();
    expect(payload.formData).toEqual({ name: '张三', owner: '102' });
    expect(payload.assignees).toEqual([
      { variableName: 'approver', type: 'FORM_FIELD', value: 'owner' },
      { variableName: 'supervisor', type: 'SUPERVISOR', value: undefined },
    ]);

    expect(await screen.findByText('提交成功')).toBeTruthy();
    expect(screen.getByText(/OA-21-20261106180000-ABCDEF12/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /查看申请/ }));
    expect(history.push).toHaveBeenCalledWith('/oa/application/detail?id=70');
  });

  it('缺少推荐时必须手动选择审批人来源', async () => {
    jest.mocked(getOaLaunch).mockResolvedValue({
      data: {
        ...detail,
        assigneeVariables: [{ name: 'approver' }],
      },
    } as any);
    render(<LaunchFillPage />);
    await screen.findByText('发起：请假审批');

    fireEvent.change(screen.getByLabelText('姓名'), {
      target: { value: '张三' },
    });
    fireEvent.click(screen.getByRole('button', { name: /提交并发起/ }));

    expect(await screen.findByText('请选择审批人来源')).toBeTruthy();
    expect(screen.getByText('需要手动选择')).toBeTruthy();
    expect(submitOaLaunch).not.toHaveBeenCalled();
  });
});
