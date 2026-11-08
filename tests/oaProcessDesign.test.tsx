import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import ProcessDesignPage from '@/pages/oa/process/design';
import {
  disableOaProcessModel,
  getOaProcessModel,
  publishOaProcessModel,
  queryOaFormVersionOptions,
  updateOaProcessModel,
  validateOaProcessBpmn,
} from '@/services/web/guardfind/oa';
import { defaultOaBpmnXml } from '@/utils/oaBpmn';

jest.mock('@umijs/max', () => ({
  useSearchParams: () => [
    new URLSearchParams((globalThis as any).__oaSearch || ''),
  ],
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
  getOaProcessModel: jest.fn(),
  updateOaProcessModel: jest.fn(),
  publishOaProcessModel: jest.fn(),
  disableOaProcessModel: jest.fn(),
  validateOaProcessBpmn: jest.fn(),
  queryOaFormVersionOptions: jest.fn(),
}));

jest.mock('@/pages/oa/process/design/components/OaBpmnCanvas', () => {
  const React = require('react');
  const { defaultOaBpmnXml: buildXml } = require('@/utils/oaBpmn');

  const userTask = {
    id: 'Activity_approve',
    type: 'userTask',
    name: '审批',
    isProcess: false,
    isUserTask: true,
    isServiceTask: false,
    isSequenceFlow: false,
    isExclusiveGateway: false,
    isBoundaryEvent: false,
    assignee: '${reviewer}',
    candidateUsers: '',
    candidateGroups: '',
    isCountersign: false,
    countersignCollection: '',
    countersignElementVariable: '',
    countersignSequential: false,
    completionCondition: '',
    serviceClass: '',
    condition: '',
    timerType: '',
    timerValue: '',
    defaultFlow: '',
    sourceType: '',
    sourceIsDefault: false,
    outgoing: [],
  };
  const flow = {
    ...userTask,
    id: 'Flow_2',
    type: 'sequenceFlow',
    name: '',
    isUserTask: false,
    isSequenceFlow: true,
    sourceType: 'exclusiveGateway',
  };

  const api = {
    importXML: jest.fn(async () => {}),
    exportXML: jest.fn(async () => buildXml()),
    updateName: jest.fn(),
    updateUserTask: jest.fn(),
    updateCountersign: jest.fn(),
    updateServiceTask: jest.fn(),
    updateCondition: jest.fn(),
    updateDefaultFlow: jest.fn(),
    updateTimer: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
    zoomFit: jest.fn(),
    getSelection: jest.fn(() => null),
  };

  const MockCanvas = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => api);
    React.useEffect(() => {
      props.onReady?.();
    }, []);
    return (
      <div data-testid="bpmn-canvas">
        <button
          type="button"
          onClick={() => props.onSelectionChange?.(userTask)}
        >
          选择用户任务
        </button>
        <button type="button" onClick={() => props.onSelectionChange?.(flow)}>
          选择连线
        </button>
        <button type="button" onClick={() => props.onChange?.()}>
          模拟修改
        </button>
      </div>
    );
  });
  MockCanvas.api = api;

  return { __esModule: true, default: MockCanvas };
});

const canvasApi = (
  jest.requireMock('@/pages/oa/process/design/components/OaBpmnCanvas') as {
    default: { api: Record<string, jest.Mock> };
  }
).default.api;

const model = {
  id: 9,
  modelKey: 'leave_demo',
  name: '请假审批',
  category: '人事',
  description: null,
  bpmnXml: defaultOaBpmnXml('leave_demo', '请假审批'),
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

function mockLoadedModel() {
  (globalThis as any).__oaSearch = 'id=9';
  jest.mocked(getOaProcessModel).mockResolvedValue({ data: model } as any);
  jest.mocked(updateOaProcessModel).mockResolvedValue({
    data: { ...model, version: 4 },
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
  jest.mocked(disableOaProcessModel).mockResolvedValue({
    data: { ...model, status: 'DISABLED' },
  } as any);
  jest.mocked(queryOaFormVersionOptions).mockResolvedValue({
    data: [
      {
        formId: 9,
        formKey: 'leave_form',
        name: '请假单',
        versionId: 9001,
        version: 1,
        publishTime: '2026-11-05 18:00:00',
      },
    ],
  } as any);
}

async function chooseFormVersion(dialog: HTMLElement) {
  const select = within(dialog).getByLabelText('表单版本');
  fireEvent.mouseDown(select);
  fireEvent.click(await screen.findByText('请假单（leave_form）v1'));
}

describe('流程设计页', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).__oaSearch = '';
    jest.mocked(validateOaProcessBpmn).mockResolvedValue({
      data: {
        valid: true,
        errors: [],
        nodeCount: 3,
        digest: 'digest',
        processKey: 'oa_process',
      },
    } as any);
  });

  it('本地模式渲染工具栏、画布与属性面板', () => {
    render(<ProcessDesignPage />);
    expect(screen.getByTestId('bpmn-canvas')).toBeTruthy();
    expect(screen.getByText('流程画布')).toBeTruthy();
    expect(screen.getByText('节点属性')).toBeTruthy();
    expect(screen.getByText(/当前为本地设计模式/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /校验/ })).toHaveProperty(
      'disabled',
      false,
    );
    expect(screen.getByRole('button', { name: /保存草稿/ })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('选中节点后展示对应属性', () => {
    render(<ProcessDesignPage />);
    fireEvent.click(screen.getByRole('button', { name: '选择用户任务' }));
    expect(screen.getByLabelText('指定审批人')).toBeTruthy();
    expect(screen.getByText('userTask')).toBeTruthy();
  });

  it('在属性面板启用会签并交给画布', async () => {
    render(<ProcessDesignPage />);
    fireEvent.click(screen.getByRole('button', { name: '选择用户任务' }));
    fireEvent.click(screen.getByLabelText('启用会签'));
    fireEvent.click(screen.getByRole('button', { name: '启用会签' }));
    await waitFor(() =>
      expect(canvasApi.updateCountersign).toHaveBeenCalledWith(
        'Activity_approve',
        { enabled: true, sequential: false, ratioPercent: null },
      ),
    );
  });

  it('校验当前模型并展示前端与服务端结果', async () => {
    render(<ProcessDesignPage />);
    fireEvent.click(screen.getByRole('button', { name: /校验/ }));
    expect(await screen.findByText('前端预检结果')).toBeTruthy();
    expect(
      await screen.findByText('节点、连线、审批范围与条件均通过前端预检'),
    ).toBeTruthy();
    expect(
      await screen.findByText(/服务端校验通过：流程 Key oa_process/),
    ).toBeTruthy();
    expect(canvasApi.exportXML).toHaveBeenCalled();
    expect(validateOaProcessBpmn).toHaveBeenCalled();
  });

  it('新建流程会重新导入默认模型', async () => {
    render(<ProcessDesignPage />);
    fireEvent.click(screen.getByRole('button', { name: /新建/ }));
    await waitFor(() => expect(canvasApi.importXML).toHaveBeenCalledTimes(1));
  });

  it('通过条件构建器把条件应用到连线', async () => {
    render(<ProcessDesignPage />);
    fireEvent.click(screen.getByRole('button', { name: '选择连线' }));
    fireEvent.click(screen.getByRole('button', { name: '条件构建器' }));
    fireEvent.change(await screen.findByLabelText('字段 1'), {
      target: { value: 'amount' },
    });
    fireEvent.change(screen.getByLabelText('条件值 1'), {
      target: { value: '1000' },
    });
    fireEvent.click(await screen.findByRole('button', { name: '应用到连线' }));
    await waitFor(() =>
      expect(canvasApi.updateCondition).toHaveBeenCalledWith(
        'Flow_2',
        '${amount == 1000}',
      ),
    );
  });

  it('按 id 加载模型并保存草稿时带上乐观锁版本', async () => {
    mockLoadedModel();
    render(<ProcessDesignPage />);
    expect(
      await screen.findByText(/leave_demo · 草稿版本 3 · 当前发布 v2/),
    ).toBeTruthy();
    expect(getOaProcessModel).toHaveBeenCalledWith('9');

    fireEvent.click(screen.getByRole('button', { name: /保存草稿/ }));
    await waitFor(() =>
      expect(updateOaProcessModel).toHaveBeenCalledWith(
        9,
        expect.objectContaining({
          name: '请假审批',
          version: 3,
          bpmnXml: expect.stringContaining('<bpmn:process'),
        }),
      ),
    );
  });

  it('有未保存修改时先保存再发布，并展示发布结果', async () => {
    mockLoadedModel();
    render(<ProcessDesignPage />);
    await screen.findByText(/leave_demo · 草稿版本 3/);

    fireEvent.click(screen.getByRole('button', { name: '模拟修改' }));
    fireEvent.click(screen.getByRole('button', { name: /发布/ }));

    const dialog = await screen.findByRole('dialog');
    await chooseFormVersion(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: /发.?布/ }));

    await waitFor(() => expect(updateOaProcessModel).toHaveBeenCalled());
    await waitFor(() =>
      expect(publishOaProcessModel).toHaveBeenCalledWith(
        9,
        expect.objectContaining({ formVersionId: 9001 }),
      ),
    );
    expect(
      jest.mocked(publishOaProcessModel).mock.invocationCallOrder[0],
    ).toBeGreaterThan(
      jest.mocked(updateOaProcessModel).mock.invocationCallOrder[0],
    );
    await waitFor(() => expect(getOaProcessModel).toHaveBeenCalledTimes(2));
  });

  it('发布被服务端拒绝时在弹窗内展示错误', async () => {
    mockLoadedModel();
    jest.mocked(publishOaProcessModel).mockResolvedValue({
      data: {
        valid: false,
        errors: ['流程定义 Key 已被其他模型占用: leave_demo'],
      },
    } as any);
    render(<ProcessDesignPage />);
    await screen.findByText(/leave_demo · 草稿版本 3/);

    fireEvent.click(screen.getByRole('button', { name: /发布/ }));
    const dialog = await screen.findByRole('dialog');
    await chooseFormVersion(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: /发.?布/ }));

    expect(
      await screen.findByText('流程定义 Key 已被其他模型占用: leave_demo'),
    ).toBeTruthy();
    expect(screen.getByText('服务端校验未通过')).toBeTruthy();
  });

  it('停用模型后刷新状态', async () => {
    mockLoadedModel();
    render(<ProcessDesignPage />);
    await screen.findByText(/leave_demo · 草稿版本 3/);

    fireEvent.click(screen.getByRole('button', { name: /停用/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /停.?用/ }));

    await waitFor(() => expect(disableOaProcessModel).toHaveBeenCalledWith(9));
    expect((await screen.findAllByText('已停用')).length).toBeGreaterThan(0);
  });
});
