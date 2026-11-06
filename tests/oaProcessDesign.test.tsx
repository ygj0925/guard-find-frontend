import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProcessDesignPage from '@/pages/oa/process/design';

jest.mock('@/pages/oa/process/design/components/OaBpmnCanvas', () => {
  const React = require('react');
  const { defaultOaBpmnXml } = require('@/utils/oaBpmn');

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
    assignee: '',
    candidateUsers: '',
    candidateGroups: '',
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
    exportXML: jest.fn(async () => defaultOaBpmnXml()),
    updateName: jest.fn(),
    updateUserTask: jest.fn(),
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

describe('流程设计页', () => {
  beforeEach(() => jest.clearAllMocks());

  it('渲染工具栏、画布与属性面板', () => {
    render(<ProcessDesignPage />);
    expect(screen.getByTestId('bpmn-canvas')).toBeTruthy();
    expect(screen.getByText('流程画布')).toBeTruthy();
    expect(screen.getByText('节点属性')).toBeTruthy();
    expect(screen.getByText(/保存\/发布接口将在 9.7 接入/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /校验/ })).toHaveProperty(
      'disabled',
      false,
    );
  });

  it('选中节点后展示对应属性', () => {
    render(<ProcessDesignPage />);
    fireEvent.click(screen.getByRole('button', { name: '选择用户任务' }));
    expect(screen.getByLabelText('指定审批人')).toBeTruthy();
    expect(screen.getByText('userTask')).toBeTruthy();
  });

  it('校验当前模型并展示结果摘要', async () => {
    render(<ProcessDesignPage />);
    fireEvent.click(screen.getByRole('button', { name: /校验/ }));
    expect(await screen.findByText('前端预检结果')).toBeTruthy();
    expect(
      await screen.findByText('节点、连线、审批范围与条件均通过前端预检'),
    ).toBeTruthy();
    expect(canvasApi.exportXML).toHaveBeenCalled();
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
});
