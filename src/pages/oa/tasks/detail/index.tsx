/**
 * 审批任务详情：展示申请快照与轨迹，待办任务可提交通过、驳回或退回上一人工节点。
 */
import {
  CheckCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  RollbackOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useModel, useSearchParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Input,
  Modal,
  message,
  Select,
  Space,
  Spin,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import {
  approveOaTask,
  claimOaTask,
  getOaApprovalTask,
  type OaApprovalActionParams,
  type OaApprovalDetailVo,
  type OaEmployeeOptionVo,
  queryOaEmployeeOptions,
  rejectOaTask,
  returnOaTask,
  transferOaTask,
} from '@/services/web/guardfind/oa';
import { buildOaRequestId } from '@/utils/oaLaunch';
import {
  ApplicationFormCard,
  ApplicationInfoCard,
  ApplicationTimelineCard,
} from '../../application/components/ApplicationSections';
import { applicationStatusTag } from '../../application/components/ApplicationStatus';

type ActionType = 'approve' | 'reject' | 'return';

const ACTION_META: Record<
  ActionType,
  { title: string; okText: string; placeholder: string; required: boolean }
> = {
  approve: {
    title: '审批通过',
    okText: '确认通过',
    placeholder: '审批意见（可选）',
    required: false,
  },
  reject: {
    title: '驳回申请',
    okText: '确认驳回',
    placeholder: '请填写驳回原因（必填）',
    required: true,
  },
  return: {
    title: '退回上一节点',
    okText: '确认退回',
    placeholder: '请填写退回原因（必填）',
    required: true,
  },
};

interface ActionState {
  type: ActionType;
  reason: string;
  requestId: string;
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

const TaskDetailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');
  const currentUser = useModel(
    '@@initialState',
    (model) => model.initialState?.user,
  );
  const [detail, setDetail] = useState<OaApprovalDetailVo | null>(null);
  const [loading, setLoading] = useState(Boolean(taskId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [action, setAction] = useState<ActionState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferTarget, setTransferTarget] = useState<number | null>(null);
  const [transferReason, setTransferReason] = useState('');
  const [transferRequestId, setTransferRequestId] = useState('');
  const [employees, setEmployees] = useState<OaEmployeeOptionVo[]>([]);

  const loadDetail = useCallback(async () => {
    if (!taskId) {
      setLoading(false);
      setLoadError('缺少任务 ID，请从审批中心进入');
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const response = await getOaApprovalTask(taskId);
      setDetail(response.data);
    } catch (error) {
      setLoadError(errorText(error));
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const claim = async () => {
    if (!taskId || claiming) return;
    setClaiming(true);
    try {
      await claimOaTask(taskId, { requestId: buildOaRequestId() });
      message.success('任务已领取');
      await loadDetail();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setClaiming(false);
    }
  };

  const openTransfer = async () => {
    setTransferTarget(null);
    setTransferReason('');
    setTransferRequestId(buildOaRequestId());
    setTransferOpen(true);
    try {
      const response = await queryOaEmployeeOptions();
      setEmployees(response.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    }
  };

  const submitTransfer = async () => {
    if (!taskId || !transferTarget || transferSaving) return;
    setTransferSaving(true);
    try {
      await transferOaTask(taskId, {
        requestId: transferRequestId,
        targetUserId: transferTarget,
        reason: transferReason.trim() || undefined,
      });
      message.success('任务已转交');
      setTransferOpen(false);
      history.push('/oa/tasks');
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setTransferSaving(false);
    }
  };

  const openAction = (type: ActionType) => {
    setAction({ type, reason: '', requestId: buildOaRequestId() });
  };

  const submitAction = async () => {
    if (!taskId || !action || submitting) return;
    const meta = ACTION_META[action.type];
    const reason = action.reason.trim();
    if (meta.required && !reason) {
      message.error('请填写原因');
      return;
    }
    const params: OaApprovalActionParams = {
      requestId: action.requestId,
      reason: reason || undefined,
    };
    setSubmitting(true);
    try {
      const response =
        action.type === 'approve'
          ? await approveOaTask(taskId, params)
          : action.type === 'reject'
            ? await rejectOaTask(taskId, params)
            : await returnOaTask(taskId, params);
      message.success(
        response.data.replayed
          ? '已恢复此前处理结果'
          : action.type === 'approve'
            ? '已通过'
            : action.type === 'reject'
              ? '已驳回'
              : '已退回上一节点',
      );
      setAction(null);
      history.push('/oa/tasks');
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const application = detail?.application;
  const isDirectAssignee = Boolean(
    detail?.assignee && String(currentUser?.id) === detail.assignee,
  );
  const canClaim = Boolean(
    detail?.pending && !detail.assignee && !detail.proxyForId,
  );
  const transferOptions = employees
    .filter((employee) => String(employee.userId) !== String(currentUser?.id))
    .map((employee) => ({
      value: employee.userId,
      label: employee.employeeNo
        ? `${employee.nickname}（${employee.employeeNo}）`
        : employee.nickname,
    }));

  return (
    <PageContainer
      onBack={() => history.push('/oa/tasks')}
      header={{
        title: application?.title || '审批任务',
        subTitle: detail?.taskName ? `当前节点：${detail.taskName}` : undefined,
        extra: application
          ? applicationStatusTag(application.status)
          : undefined,
      }}
    >
      {loadError ? (
        <Alert
          type="error"
          showIcon
          message="加载审批任务失败"
          description={loadError}
          action={
            <Button size="small" onClick={() => history.push('/oa/tasks')}>
              返回审批中心
            </Button>
          }
        />
      ) : null}

      <Spin spinning={loading}>
        {detail && application ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {detail.pending ? (
              <Card size="small" title="审批操作">
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  {detail.proxyForName ? (
                    <Alert
                      type="info"
                      showIcon
                      message={`你正在代 ${detail.proxyForName} 处理该任务`}
                      description="审批轨迹会同时记录代理人与委托人。"
                    />
                  ) : null}
                  <Typography.Text type="secondary">
                    通过后进入下一节点；驳回将终止流程；退回仅支持上一人工节点，并行流程暂不支持。
                    {canClaim ? ' 当前任务为候选任务，建议先领取再处理。' : ''}
                  </Typography.Text>
                  <Space wrap>
                    {canClaim ? (
                      <Button
                        icon={<CheckCircleOutlined />}
                        loading={claiming}
                        onClick={() => void claim()}
                      >
                        领取任务
                      </Button>
                    ) : null}
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={() => openAction('approve')}
                    >
                      通过
                    </Button>
                    <Button
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => openAction('reject')}
                    >
                      驳回
                    </Button>
                    <Button
                      icon={<RollbackOutlined />}
                      onClick={() => openAction('return')}
                    >
                      退回上一节点
                    </Button>
                    {isDirectAssignee ? (
                      <Button
                        icon={<SwapOutlined />}
                        onClick={() => void openTransfer()}
                      >
                        转交
                      </Button>
                    ) : null}
                  </Space>
                </Space>
              </Card>
            ) : (
              <Alert
                type="info"
                showIcon
                message="该任务已处理"
                description="当前为只读视图，审批轨迹见下方记录。"
              />
            )}
            <ApplicationInfoCard detail={application} />
            <ApplicationFormCard detail={application} />
            <ApplicationTimelineCard detail={application} />
          </Space>
        ) : !loading && !loadError ? (
          <Card size="small">
            <Typography.Text type="secondary">
              请从审批中心选择任务
            </Typography.Text>
          </Card>
        ) : null}
      </Spin>

      <Modal
        title={action ? ACTION_META[action.type].title : '审批操作'}
        open={Boolean(action)}
        okText={action ? ACTION_META[action.type].okText : '确定'}
        cancelText="取消"
        okButtonProps={{ danger: action?.type === 'reject' }}
        confirmLoading={submitting}
        onOk={() => void submitAction()}
        onCancel={() => {
          if (!submitting) setAction(null);
        }}
      >
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Input.TextArea
            aria-label="审批意见"
            rows={3}
            maxLength={500}
            showCount
            placeholder={
              action ? ACTION_META[action.type].placeholder : '审批意见'
            }
            value={action?.reason ?? ''}
            onChange={(event) =>
              setAction((current) =>
                current ? { ...current, reason: event.target.value } : current,
              )
            }
          />
        </Space>
      </Modal>

      <Modal
        title="转交任务"
        open={transferOpen}
        okText="确认转交"
        cancelText="取消"
        okButtonProps={{ disabled: !transferTarget }}
        confirmLoading={transferSaving}
        onOk={() => void submitTransfer()}
        onCancel={() => {
          if (!transferSaving) setTransferOpen(false);
        }}
        destroyOnHidden
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Typography.Text type="secondary">
            转交后由目标处理人继续审批，你将不再看到该任务，轨迹中保留原处理人。
          </Typography.Text>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="选择本租户在职员工"
            value={transferTarget ?? undefined}
            onChange={(value) => setTransferTarget(value)}
            options={transferOptions}
            style={{ width: '100%' }}
          />
          <Input.TextArea
            aria-label="转交原因"
            rows={3}
            maxLength={500}
            showCount
            placeholder="转交原因（可选）"
            value={transferReason}
            onChange={(event) => setTransferReason(event.target.value)}
          />
        </Space>
      </Modal>
    </PageContainer>
  );
};

export default TaskDetailPage;
