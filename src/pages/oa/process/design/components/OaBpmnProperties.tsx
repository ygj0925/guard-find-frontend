/**
 * 自定义属性面板：只暴露首版 BPMN 白名单内的属性。
 * 条件只允许写在排他网关的输出连线上，定时器只用于用户任务的边界事件。
 */
import { Button, Empty, Input, Select, Space, Tag, Typography } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import {
  OA_BPMN_TIMER_TYPES,
  type OaBpmnSelection,
  oaConditionError,
  validateOaAssignment,
  validateOaTimerValue,
} from '@/utils/oaBpmn';
import type { OaUserTaskAttributes } from './OaBpmnCanvas';

type OaBpmnPropertiesProps = {
  selection: OaBpmnSelection | null;
  readOnly?: boolean;
  onChangeName: (name: string) => void;
  onUpdateUserTask: (attributes: OaUserTaskAttributes) => void;
  onUpdateServiceTask: (className: string) => void;
  onUpdateCondition: (expression: string | null) => void;
  onUpdateDefaultFlow: (flowId: string | null) => void;
  onUpdateTimer: (type: string, value: string) => void;
  onOpenConditionBuilder: () => void;
};

const TIMER_LABELS: Record<string, string> = {
  timeDuration: '固定时长 (ISO-8601)',
  timeDate: '指定时间 (ISO-8601)',
  timeCycle: '循环 (ISO-8601 / Cron)',
};

const TIMER_PLACEHOLDERS: Record<string, string> = {
  timeDuration: '如 PT2H',
  timeDate: '如 2026-12-01T09:00:00+08:00',
  timeCycle: '如 R3/PT1H 或 0 0 9 * * ?',
};

function AssignmentField({
  label,
  value,
  onChange,
  disabled,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string | null;
  placeholder?: string;
}) {
  return (
    <div>
      <Typography.Text>{label}</Typography.Text>
      <Input
        aria-label={label}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        status={error ? 'error' : undefined}
      />
      {error ? (
        <Typography.Text type="danger" style={{ fontSize: 12 }}>
          {error}
        </Typography.Text>
      ) : null}
    </div>
  );
}

const OaBpmnProperties: React.FC<OaBpmnPropertiesProps> = ({
  selection,
  readOnly = false,
  onChangeName,
  onUpdateUserTask,
  onUpdateServiceTask,
  onUpdateCondition,
  onUpdateDefaultFlow,
  onUpdateTimer,
  onOpenConditionBuilder,
}) => {
  const [name, setName] = useState('');
  const [assignee, setAssignee] = useState('');
  const [candidateUsers, setCandidateUsers] = useState('');
  const [candidateGroups, setCandidateGroups] = useState('');
  const [serviceClass, setServiceClass] = useState('');
  const [condition, setCondition] = useState('');
  const [timerType, setTimerType] = useState('');
  const [timerValue, setTimerValue] = useState('');

  useEffect(() => {
    setName(selection?.name || '');
    setAssignee(selection?.assignee || '');
    setCandidateUsers(selection?.candidateUsers || '');
    setCandidateGroups(selection?.candidateGroups || '');
    setServiceClass(selection?.serviceClass || '');
    setCondition(selection?.condition || '');
    setTimerType(selection?.timerType || '');
    setTimerValue(selection?.timerValue || '');
  }, [selection]);

  const assignmentErrors = useMemo(
    () => ({
      assignee: validateOaAssignment(assignee, '指定审批人'),
      candidateUsers: validateOaAssignment(candidateUsers, '候选用户'),
      candidateGroups: validateOaAssignment(candidateGroups, '候选组'),
    }),
    [assignee, candidateUsers, candidateGroups],
  );

  const conditionError = useMemo(
    () => (condition.trim() ? oaConditionError(condition) : null),
    [condition],
  );
  const timerError = useMemo(
    () =>
      timerType && timerValue.trim()
        ? validateOaTimerValue(timerType, timerValue)
        : null,
    [timerType, timerValue],
  );

  if (!selection) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="选择画布中的节点或连线编辑属性"
      />
    );
  }

  const disabled = readOnly;
  const assignmentValid =
    !assignmentErrors.assignee &&
    !assignmentErrors.candidateUsers &&
    !assignmentErrors.candidateGroups &&
    Boolean(assignee.trim() || candidateUsers.trim() || candidateGroups.trim());

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space wrap>
        <Tag color="blue">{selection.type}</Tag>
        <Typography.Text type="secondary" copyable>
          {selection.id}
        </Typography.Text>
      </Space>

      <div>
        <Typography.Text>名称</Typography.Text>
        <Input
          aria-label="节点名称"
          value={name}
          disabled={disabled}
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => {
            if (name !== selection.name) onChangeName(name);
          }}
          onPressEnter={() => {
            if (name !== selection.name) onChangeName(name);
          }}
        />
      </div>

      {selection.isProcess ? (
        <Typography.Text type="secondary">
          流程标识 {selection.id}，发布时由服务端校验 isExecutable
          与节点白名单。
        </Typography.Text>
      ) : null}

      {selection.isUserTask ? (
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Typography.Text strong>审批人</Typography.Text>
          <AssignmentField
            label="指定审批人"
            value={assignee}
            disabled={disabled}
            error={assignmentErrors.assignee}
            placeholder="如 ${assignee} 或 user1"
            onChange={setAssignee}
          />
          <AssignmentField
            label="候选用户"
            value={candidateUsers}
            disabled={disabled}
            error={assignmentErrors.candidateUsers}
            placeholder="如 ${approvers} 或 user1,user2"
            onChange={setCandidateUsers}
          />
          <AssignmentField
            label="候选组"
            value={candidateGroups}
            disabled={disabled}
            error={assignmentErrors.candidateGroups}
            placeholder="如 ${groupCode} 或 manager"
            onChange={setCandidateGroups}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            三项至少填一项；变量必须是简单表达式，多个值用英文逗号分隔。
          </Typography.Text>
          <Button
            type="primary"
            disabled={disabled || !assignmentValid}
            onClick={() =>
              onUpdateUserTask({ assignee, candidateUsers, candidateGroups })
            }
          >
            更新审批范围
          </Button>
        </Space>
      ) : null}

      {selection.isServiceTask ? (
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Typography.Text strong>服务任务</Typography.Text>
          <div>
            <Typography.Text>处理器类</Typography.Text>
            <Input
              aria-label="处理器类"
              value={serviceClass}
              disabled={disabled}
              placeholder="如 com.guardfind.backend.oa.handler.OaNotifyHandler"
              onChange={(event) => setServiceClass(event.target.value)}
            />
          </div>
          <Typography.Text type="warning" style={{ fontSize: 12 }}>
            处理器类必须已加入服务端 oa.bpmn.allowed-service-handlers
            白名单，否则发布会被拒绝。
          </Typography.Text>
          <Button
            type="primary"
            disabled={disabled || !serviceClass.trim()}
            onClick={() => onUpdateServiceTask(serviceClass)}
          >
            更新处理器
          </Button>
        </Space>
      ) : null}

      {selection.isSequenceFlow ? (
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Typography.Text strong>连线条件</Typography.Text>
          {selection.sourceIsDefault ? (
            <Typography.Text type="warning">
              当前连线是排他网关的默认连线，默认连线不能配置条件；请先在网关属性中取消默认设置。
            </Typography.Text>
          ) : selection.sourceType === 'exclusiveGateway' ? (
            <>
              <Input.TextArea
                aria-label="条件表达式"
                value={condition}
                disabled={disabled}
                autoSize={{ minRows: 2, maxRows: 5 }}
                placeholder='如 ${amount > 1000 && dept == "sales"}'
                status={conditionError ? 'error' : undefined}
                onChange={(event) => setCondition(event.target.value)}
              />
              {conditionError ? (
                <Typography.Text type="danger" style={{ fontSize: 12 }}>
                  {conditionError}
                </Typography.Text>
              ) : null}
              <Space wrap>
                <Button
                  type="primary"
                  disabled={
                    disabled || Boolean(conditionError) || !condition.trim()
                  }
                  onClick={() => onUpdateCondition(condition)}
                >
                  应用条件
                </Button>
                <Button
                  disabled={disabled}
                  onClick={() => {
                    setCondition('');
                    onUpdateCondition(null);
                  }}
                >
                  清除条件
                </Button>
                <Button disabled={disabled} onClick={onOpenConditionBuilder}>
                  条件构建器
                </Button>
              </Space>
            </>
          ) : (
            <Typography.Text type="secondary">
              只有排他网关的输出连线允许配置条件。
            </Typography.Text>
          )}
        </Space>
      ) : null}

      {selection.isExclusiveGateway ? (
        <div>
          <Typography.Text>默认连线</Typography.Text>
          <Select
            aria-label="默认连线"
            style={{ width: '100%' }}
            allowClear
            disabled={disabled}
            value={selection.defaultFlow || undefined}
            placeholder="不设置默认连线"
            options={selection.outgoing.map((flow) => ({
              value: flow.id,
              label: flow.name ? `${flow.name} (${flow.id})` : flow.id,
            }))}
            onChange={(value) => onUpdateDefaultFlow(value || null)}
          />
        </div>
      ) : null}

      {selection.isBoundaryEvent ? (
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Typography.Text strong>定时边界事件</Typography.Text>
          <div>
            <Typography.Text>定时类型</Typography.Text>
            <Select
              aria-label="定时类型"
              style={{ width: '100%' }}
              disabled={disabled}
              value={timerType || undefined}
              placeholder="选择定时类型"
              options={OA_BPMN_TIMER_TYPES.map((type) => ({
                value: type,
                label: TIMER_LABELS[type],
              }))}
              onChange={(value) => setTimerType(value)}
            />
          </div>
          <div>
            <Typography.Text>定时值</Typography.Text>
            <Input
              aria-label="定时值"
              value={timerValue}
              disabled={disabled || !timerType}
              placeholder={TIMER_PLACEHOLDERS[timerType] || '先选择定时类型'}
              status={timerError ? 'error' : undefined}
              onChange={(event) => setTimerValue(event.target.value)}
            />
            {timerError ? (
              <Typography.Text type="danger" style={{ fontSize: 12 }}>
                {timerError}
              </Typography.Text>
            ) : null}
          </div>
          <Button
            type="primary"
            disabled={
              disabled || !timerType || !timerValue.trim() || !!timerError
            }
            onClick={() => onUpdateTimer(timerType, timerValue)}
          >
            更新定时器
          </Button>
        </Space>
      ) : null}
    </Space>
  );
};

export default OaBpmnProperties;
