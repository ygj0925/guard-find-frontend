/**
 * 审批任务详情：展示申请快照与轨迹，待办任务可提交通过、驳回或退回上一人工节点。
 */
import {
  CheckOutlined,
  CloseOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useSearchParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Input,
  Modal,
  message,
  Space,
  Spin,
  Typography,
} from 'antd';
import React, { useEffect, useState } from 'react';
import {
  approveOaTask,
  getOaApprovalTask,
  type OaApprovalActionParams,
  type OaApprovalDetailVo,
  rejectOaTask,
  returnOaTask,
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
  const [detail, setDetail] = useState<OaApprovalDetailVo | null>(null);
  const [loading, setLoading] = useState(Boolean(taskId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [action, setAction] = useState<ActionState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!taskId) {
      setLoading(false);
      setLoadError('缺少任务 ID，请从审批中心进入');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getOaApprovalTask(taskId)
      .then((response) => {
        if (!cancelled) setDetail(response.data);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorText(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

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
                  <Typography.Text type="secondary">
                    通过后进入下一节点；驳回将终止流程；退回仅支持上一人工节点，并行流程暂不支持。
                  </Typography.Text>
                  <Space wrap>
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
    </PageContainer>
  );
};

export default TaskDetailPage;
