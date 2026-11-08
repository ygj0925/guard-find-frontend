import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { history } from '@umijs/max';
import LaunchFillPage from '@/pages/oa/launch/fill';
import {
  createOaDraft,
  getOaDraft,
  getOaLaunch,
  previewOaExpense,
  previewOaLeave,
  queryOaEmployeeOptions,
  queryOaPositionOptions,
  submitOaLaunch,
  updateOaDraft,
} from '@/services/web/guardfind/oa';

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
  queryOaEmployeeOptions: jest.fn(),
  queryOaPositionOptions: jest.fn(),
  getOaDraft: jest.fn(),
  createOaDraft: jest.fn(),
  updateOaDraft: jest.fn(),
  previewOaLeave: jest.fn(),
  previewOaExpense: jest.fn(),
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
    jest.mocked(queryOaEmployeeOptions).mockResolvedValue({
      data: [
        {
          userId: 102,
          nickname: '李四',
          deptName: '研发部',
          employeeNo: 'E002',
        },
      ],
    } as any);
    jest.mocked(queryOaPositionOptions).mockResolvedValue({ data: [] } as any);
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
    expect(screen.getByRole('combobox', { name: '负责人' })).toBeTruthy();
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
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '负责人' }));
    fireEvent.click(await screen.findByText('李四 · 研发部 (E002)'));
    fireEvent.click(screen.getByRole('button', { name: /提交并发起/ }));

    await waitFor(() => expect(submitOaLaunch).toHaveBeenCalledTimes(1));
    const [releaseId, payload] = jest.mocked(submitOaLaunch).mock.calls[0];
    expect(releaseId).toBe('21');
    expect(payload.requestId).toBeTruthy();
    expect(payload.title).toBeUndefined();
    expect(payload.ccUserIds).toBeUndefined();
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

  it('选择抄送人后随提交携带抄送用户', async () => {
    render(<LaunchFillPage />);
    await screen.findByText('发起：请假审批');

    expect(screen.getByText('抄送（可选）')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('姓名'), {
      target: { value: '张三' },
    });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '抄送人' }));
    fireEvent.click(await screen.findByText('李四 · 研发部 (E002)'));
    expect(screen.getByText('1/20')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /提交并发起/ }));

    await waitFor(() => expect(submitOaLaunch).toHaveBeenCalledTimes(1));
    const [, payload] = jest.mocked(submitOaLaunch).mock.calls[0];
    expect(payload.ccUserIds).toEqual(['102']);
  });

  it('未填完也能保存草稿，再次保存走乐观锁更新', async () => {
    jest.mocked(createOaDraft).mockResolvedValue({
      data: { id: '900000000000000001', version: 0 },
    } as any);
    jest.mocked(updateOaDraft).mockResolvedValue({
      data: { id: '900000000000000001', version: 1 },
    } as any);
    render(<LaunchFillPage />);
    await screen.findByText('发起：请假审批');

    fireEvent.click(screen.getByRole('button', { name: /保存草稿/ }));
    await waitFor(() => expect(createOaDraft).toHaveBeenCalledTimes(1));
    expect(jest.mocked(createOaDraft).mock.calls[0][0]).toEqual({
      releaseId: '21',
      title: undefined,
      formData: {},
      assignees: [
        { variableName: 'approver', type: 'FORM_FIELD', value: 'owner' },
        { variableName: 'supervisor', type: 'SUPERVISOR', value: undefined },
      ],
      ccUserIds: undefined,
    });
    expect(history.replace).toHaveBeenCalledWith(
      '/oa/launch/fill?releaseId=21&draftId=900000000000000001',
    );
    expect(screen.queryByText('请填写姓名')).toBeNull();

    fireEvent.change(screen.getByLabelText('姓名'), {
      target: { value: '张三' },
    });
    fireEvent.click(await screen.findByRole('button', { name: /更新草稿/ }));
    await waitFor(() => expect(updateOaDraft).toHaveBeenCalledTimes(1));
    const [id, payload] = jest.mocked(updateOaDraft).mock.calls[0];
    expect(id).toBe('900000000000000001');
    expect(payload.version).toBe(0);
    expect(payload.formData).toEqual({ name: '张三' });
  });

  it('从草稿进入时回填内容，提交时携带草稿 ID', async () => {
    (globalThis as any).__oaLaunchSearch =
      'releaseId=21&draftId=900000000000000001';
    jest.mocked(getOaDraft).mockResolvedValue({
      data: {
        id: '900000000000000001',
        releaseId: '21',
        title: '周五请假',
        formData: { name: '王五', owner: '102' },
        assignees: [
          { variableName: 'approver', type: 'EMPLOYEE', value: '102' },
        ],
        ccUserIds: ['102'],
        launchable: true,
        version: 3,
      },
    } as any);
    render(<LaunchFillPage />);
    await screen.findByText('发起：请假审批');

    expect(getOaDraft).toHaveBeenCalledWith('900000000000000001');
    expect((screen.getByLabelText('姓名') as HTMLInputElement).value).toBe(
      '王五',
    );
    expect((screen.getByLabelText('申请标题') as HTMLInputElement).value).toBe(
      '周五请假',
    );
    expect(screen.getByText('1/20')).toBeTruthy();
    expect(screen.getByRole('button', { name: /更新草稿/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /提交并发起/ }));
    await waitFor(() => expect(submitOaLaunch).toHaveBeenCalledTimes(1));
    const [, payload] = jest.mocked(submitOaLaunch).mock.calls[0];
    expect(payload.draftId).toBe('900000000000000001');
    expect(payload.title).toBe('周五请假');
    expect(payload.formData).toEqual({ name: '王五', owner: '102' });
    expect(payload.ccUserIds).toEqual(['102']);
    expect(payload.assignees).toEqual([
      { variableName: 'approver', type: 'EMPLOYEE', value: '102' },
      { variableName: 'supervisor', type: 'SUPERVISOR', value: undefined },
    ]);
  });

  it('草稿与当前发布版本不匹配时拒绝加载', async () => {
    (globalThis as any).__oaLaunchSearch = 'releaseId=21&draftId=9';
    jest.mocked(getOaDraft).mockResolvedValue({
      data: { id: '9', releaseId: '11', launchable: true, version: 0 },
    } as any);
    render(<LaunchFillPage />);

    expect(
      await screen.findByText('草稿与当前流程版本不匹配，请从草稿列表重新进入'),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /提交并发起/ })).toBeNull();
  });
  it('请假流程按已填写的类型与日期预览天数和余额', async () => {
    (globalThis as any).__oaLaunchSearch = 'releaseId=21&draftId=5';
    const leaveSchema = {
      version: 1,
      fields: [
        {
          id: 'f_leaveType',
          key: 'leaveType',
          label: '假期类型',
          type: 'radio',
          required: true,
          options: [{ label: '年假', value: 'ANNUAL' }],
        },
        {
          id: 'f_startDate',
          key: 'startDate',
          label: '开始日期',
          type: 'date',
        },
        { id: 'f_endDate', key: 'endDate', label: '结束日期', type: 'date' },
      ],
    };
    jest.mocked(getOaLaunch).mockResolvedValue({
      data: {
        ...detail,
        businessType: 'LEAVE',
        schemaJson: JSON.stringify(leaveSchema),
        assigneeVariables: [],
      },
    } as any);
    jest.mocked(getOaDraft).mockResolvedValue({
      data: {
        id: '5',
        releaseId: '21',
        formData: {
          leaveType: 'ANNUAL',
          startDate: '2026-11-09',
          endDate: '2026-11-10',
        },
        launchable: true,
        version: 1,
      },
    } as any);
    jest.mocked(previewOaLeave).mockResolvedValue({
      data: {
        days: '2.0',
        periodYear: 2026,
        balanceRequired: true,
        availableDays: 5,
        message: null,
      },
    } as any);
    render(<LaunchFillPage />);

    expect(
      await screen.findByText(
        '本次请假 2 天（按工作日历折算），2026 年度可用 5 天',
        undefined,
        { timeout: 2000 },
      ),
    ).toBeTruthy();
    expect(previewOaLeave).toHaveBeenCalledWith({
      leaveType: 'ANNUAL',
      startDate: '2026-11-09',
      endDate: '2026-11-10',
    });
  });

  it('非请假流程不调用请假预览', async () => {
    render(<LaunchFillPage />);
    await screen.findByText('发起：请假审批');
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(previewOaLeave).not.toHaveBeenCalled();
    expect(previewOaExpense).not.toHaveBeenCalled();
  });

  it('报销流程按已填写的明细与关联出差预览合计和预算', async () => {
    (globalThis as any).__oaLaunchSearch = 'releaseId=21&draftId=6';
    const expenseSchema = {
      version: 1,
      fields: [
        {
          id: 'f_travel',
          key: 'travelNo',
          label: '关联出差单号',
          type: 'text',
        },
        {
          id: 'f_items',
          key: 'expenseItems',
          label: '报销明细',
          type: 'table',
          maxRows: 50,
          columns: [
            {
              key: 'category',
              label: '费用类型',
              type: 'radio',
              required: true,
              options: [{ label: '交通费', value: 'TRAFFIC' }],
            },
            { key: 'amount', label: '金额', type: 'number', required: true },
            { key: 'expenseDate', label: '发生日期', type: 'date' },
          ],
        },
      ],
    };
    jest.mocked(getOaLaunch).mockResolvedValue({
      data: {
        ...detail,
        businessType: 'EXPENSE',
        schemaJson: JSON.stringify(expenseSchema),
        assigneeVariables: [],
      },
    } as any);
    jest.mocked(getOaDraft).mockResolvedValue({
      data: {
        id: '6',
        releaseId: '21',
        formData: {
          travelNo: 'TR-20261109-0001',
          expenseItems: [
            { category: 'TRAFFIC', amount: 32.5, expenseDate: '2026-11-02' },
          ],
        },
        launchable: true,
        version: 1,
      },
    } as any);
    jest.mocked(previewOaExpense).mockResolvedValue({
      data: {
        totalAmount: '32.50',
        itemCount: 1,
        message: null,
        overBudget: true,
        budgetHint:
          '出差 TR-20261109-0001 预算 30 元，含本单累计报销 32.5 元，已超预算，将追加总经理复核',
      },
    } as any);
    render(<LaunchFillPage />);
    await screen.findByLabelText('报销明细第 1 行金额');

    expect(
      await screen.findByText('报销合计 ¥32.50，共 1 行明细', undefined, {
        timeout: 3000,
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        '出差 TR-20261109-0001 预算 30 元，含本单累计报销 32.5 元，已超预算，将追加总经理复核',
      ),
    ).toBeTruthy();
    expect(previewOaExpense).toHaveBeenCalledWith({
      travelNo: 'TR-20261109-0001',
      expenseItems: [
        { category: 'TRAFFIC', amount: 32.5, expenseDate: '2026-11-02' },
      ],
    });
    expect(previewOaLeave).not.toHaveBeenCalled();
  });
});
