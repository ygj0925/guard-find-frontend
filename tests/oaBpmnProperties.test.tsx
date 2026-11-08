import { fireEvent, render, screen } from '@testing-library/react';
import OaBpmnProperties from '@/pages/oa/process/design/components/OaBpmnProperties';
import type { OaBpmnSelection } from '@/utils/oaBpmn';

function selection(patch: Partial<OaBpmnSelection> = {}): OaBpmnSelection {
  return {
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
    ...patch,
  };
}

function props() {
  return {
    onChangeName: jest.fn(),
    onUpdateUserTask: jest.fn(),
    onUpdateCountersign: jest.fn(),
    onUpdateServiceTask: jest.fn(),
    onUpdateCondition: jest.fn(),
    onUpdateDefaultFlow: jest.fn(),
    onUpdateTimer: jest.fn(),
    onOpenConditionBuilder: jest.fn(),
  };
}

describe('OaBpmnProperties', () => {
  it('未选中节点时显示空状态', () => {
    render(<OaBpmnProperties selection={null} {...props()} />);
    expect(screen.getByText('选择画布中的节点或连线编辑属性')).toBeTruthy();
  });

  it('更新用户任务审批范围', () => {
    const handlers = props();
    render(<OaBpmnProperties selection={selection()} {...handlers} />);
    fireEvent.change(screen.getByLabelText('指定审批人'), {
      target: { value: 'user1,user2' },
    });
    fireEvent.click(screen.getByRole('button', { name: '更新审批范围' }));
    expect(handlers.onUpdateUserTask).toHaveBeenCalledWith({
      assignee: 'user1,user2',
      candidateUsers: '',
      candidateGroups: '',
    });
  });

  it('审批范围非法时禁止提交', async () => {
    render(<OaBpmnProperties selection={selection()} {...props()} />);
    fireEvent.change(screen.getByLabelText('指定审批人'), {
      target: { value: '${a b}' },
    });
    expect(
      await screen.findByText('指定审批人 只能使用简单变量表达式'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: '更新审批范围' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('启用会签并提交审批人变量', () => {
    const handlers = props();
    render(
      <OaBpmnProperties
        selection={selection({ assignee: '${reviewer}' })}
        {...handlers}
      />,
    );
    fireEvent.click(screen.getByLabelText('启用会签'));
    fireEvent.click(screen.getByRole('button', { name: '启用会签' }));
    expect(handlers.onUpdateCountersign).toHaveBeenCalledWith({
      enabled: true,
      sequential: false,
      ratioPercent: null,
    });
  });

  it('会签审批人不是单个变量时禁止提交', async () => {
    const handlers = props();
    render(
      <OaBpmnProperties
        selection={selection({ assignee: 'user1,user2' })}
        {...handlers}
      />,
    );
    fireEvent.click(screen.getByLabelText('启用会签'));
    expect(
      await screen.findByText(/会签前需把「指定审批人」设为单个变量/),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: '启用会签' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('回显会签比例并可更新', () => {
    const handlers = props();
    render(
      <OaBpmnProperties
        selection={selection({
          assignee: '${reviewer}',
          isCountersign: true,
          countersignCollection: '${reviewerList}',
          countersignElementVariable: 'reviewer',
          completionCondition:
            '${nrOfCompletedInstances / nrOfInstances >= 0.6}',
        })}
        {...handlers}
      />,
    );
    expect(screen.getByText('已启用')).toBeTruthy();
    expect(
      (screen.getByLabelText('会签通过比例') as HTMLInputElement).value,
    ).toBe('60');
    fireEvent.click(screen.getByRole('button', { name: '更新会签' }));
    expect(handlers.onUpdateCountersign).toHaveBeenCalledWith({
      enabled: true,
      sequential: false,
      ratioPercent: 60,
    });
  });

  it('更新服务任务处理器', () => {
    const handlers = props();
    render(
      <OaBpmnProperties
        selection={selection({
          id: 'Activity_notify',
          type: 'serviceTask',
          name: '通知',
          isUserTask: false,
          isServiceTask: true,
        })}
        {...handlers}
      />,
    );
    fireEvent.change(screen.getByLabelText('处理器类'), {
      target: { value: 'com.guardfind.backend.oa.handler.OaNotifyHandler' },
    });
    fireEvent.click(screen.getByRole('button', { name: '更新处理器' }));
    expect(handlers.onUpdateServiceTask).toHaveBeenCalledWith(
      'com.guardfind.backend.oa.handler.OaNotifyHandler',
    );
  });

  it('应用排他网关输出连线的条件', async () => {
    const handlers = props();
    render(
      <OaBpmnProperties
        selection={selection({
          id: 'Flow_2',
          type: 'sequenceFlow',
          name: '',
          isUserTask: false,
          isSequenceFlow: true,
          sourceType: 'exclusiveGateway',
        })}
        {...handlers}
      />,
    );
    fireEvent.change(screen.getByLabelText('条件表达式'), {
      target: { value: '${amount > 1000}' },
    });
    expect(screen.getByRole('button', { name: '应用条件' })).toHaveProperty(
      'disabled',
      false,
    );
    fireEvent.click(screen.getByRole('button', { name: '应用条件' }));
    expect(handlers.onUpdateCondition).toHaveBeenCalledWith('${amount > 1000}');
    fireEvent.click(screen.getByRole('button', { name: '条件构建器' }));
    expect(handlers.onOpenConditionBuilder).toHaveBeenCalled();
  });

  it('不安全条件禁止提交并可清除', async () => {
    const handlers = props();
    render(
      <OaBpmnProperties
        selection={selection({
          id: 'Flow_2',
          type: 'sequenceFlow',
          isUserTask: false,
          isSequenceFlow: true,
          sourceType: 'exclusiveGateway',
          condition: '${amount > 100}',
        })}
        {...handlers}
      />,
    );
    fireEvent.change(screen.getByLabelText('条件表达式'), {
      target: { value: '${amount = 1}' },
    });
    expect(await screen.findByText('条件表达式不允许单等号')).toBeTruthy();
    expect(screen.getByRole('button', { name: '应用条件' })).toHaveProperty(
      'disabled',
      true,
    );
    fireEvent.click(screen.getByRole('button', { name: '清除条件' }));
    expect(handlers.onUpdateCondition).toHaveBeenCalledWith(null);
  });

  it('默认连线不显示条件编辑', () => {
    render(
      <OaBpmnProperties
        selection={selection({
          id: 'Flow_2',
          type: 'sequenceFlow',
          isUserTask: false,
          isSequenceFlow: true,
          sourceType: 'exclusiveGateway',
          sourceIsDefault: true,
        })}
        {...props()}
      />,
    );
    expect(screen.getByText(/默认连线不能配置条件/)).toBeTruthy();
    expect(screen.queryByLabelText('条件表达式')).toBeNull();
    expect(screen.queryByRole('button', { name: '条件构建器' })).toBeNull();
  });

  it('非排他网关输出连线不显示条件编辑', () => {
    render(
      <OaBpmnProperties
        selection={selection({
          id: 'Flow_1',
          type: 'sequenceFlow',
          isUserTask: false,
          isSequenceFlow: true,
          sourceType: 'userTask',
        })}
        {...props()}
      />,
    );
    expect(
      screen.getByText('只有排他网关的输出连线允许配置条件。'),
    ).toBeTruthy();
    expect(screen.queryByLabelText('条件表达式')).toBeNull();
  });

  it('更新定时边界事件', async () => {
    const handlers = props();
    render(
      <OaBpmnProperties
        selection={selection({
          id: 'Boundary_1',
          type: 'boundaryEvent',
          name: '超时',
          isUserTask: false,
          isBoundaryEvent: true,
          timerType: 'timeDuration',
          timerValue: 'PT1H',
        })}
        {...handlers}
      />,
    );
    expect(screen.getByRole('button', { name: '更新定时器' })).toHaveProperty(
      'disabled',
      false,
    );
    fireEvent.click(screen.getByRole('button', { name: '更新定时器' }));
    expect(handlers.onUpdateTimer).toHaveBeenCalledWith('timeDuration', 'PT1H');
    fireEvent.change(screen.getByLabelText('定时值'), {
      target: { value: '1 hour' },
    });
    expect(await screen.findByText('定时器格式非法')).toBeTruthy();
    expect(screen.getByRole('button', { name: '更新定时器' })).toHaveProperty(
      'disabled',
      true,
    );
  });
});
