/**
 * 申请详情：展示发布版本对应的表单快照、申请人与审批轨迹；进行中的申请可由发起人撤回。
 */
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
  getOaApplication,
  type OaApplicationDetailVo,
  urgeOaApplication,
  withdrawOaApplication,
} from '@/services/web/guardfind/oa';
import { buildOaRequestId } from '@/utils/oaLaunch';
import {
  ApplicationCcCard,
  ApplicationFormCard,
  ApplicationInfoCard,
  ApplicationTimelineCard,
} from '../components/ApplicationSections';
import { applicationStatusTag } from '../components/ApplicationStatus';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

const ApplicationDetailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const [detail, setDetail] = useState<OaApplicationDetailVo | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawRequestId, setWithdrawRequestId] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [urgeOpen, setUrgeOpen] = useState(false);
  const [urgeReason, setUrgeReason] = useState('');
  const [urgeRequestId, setUrgeRequestId] = useState('');
  const [urging, setUrging] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setLoadError('缺少申请 ID，请从我的申请列表进入');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getOaApplication(id)
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
  }, [id, reloadKey]);

  const openWithdraw = () => {
    setWithdrawReason('');
    setWithdrawRequestId(buildOaRequestId());
    setWithdrawOpen(true);
  };

  const confirmWithdraw = async () => {
    if (!id || withdrawing) return;
    setWithdrawing(true);
    try {
      const response = await withdrawOaApplication(id, {
        requestId: withdrawRequestId,
        reason: withdrawReason.trim() || undefined,
      });
      message.success(response.data.replayed ? '已恢复撤回结果' : '已撤回申请');
      setWithdrawOpen(false);
      setReloadKey((value) => value + 1);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setWithdrawing(false);
    }
  };

  const openUrge = () => {
    setUrgeReason('');
    setUrgeRequestId(buildOaRequestId());
    setUrgeOpen(true);
  };

  const confirmUrge = async () => {
    if (!id || urging) return;
    setUrging(true);
    try {
      const response = await urgeOaApplication(id, {
        requestId: urgeRequestId,
        reason: urgeReason.trim() || undefined,
      });
      const nextAllowed = response.data.nextAllowedTime
        ? `，下次可催办时间 ${response.data.nextAllowedTime}`
        : '';
      message.success(
        `已提醒 ${response.data.taskCount} 个审批任务${nextAllowed}`,
      );
      setUrgeOpen(false);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setUrging(false);
    }
  };

  return (
    <PageContainer
      onBack={() => history.push('/oa/application')}
      header={{
        title: detail?.title || '申请详情',
        subTitle: detail?.businessKey,
        extra: detail ? (
          <Space wrap>
            {applicationStatusTag(detail.status)}
            {detail.status === 'RUNNING' ? (
              <>
                <Button onClick={openUrge}>催办</Button>
                <Button danger onClick={openWithdraw}>
                  撤回申请
                </Button>
              </>
            ) : null}
          </Space>
        ) : undefined,
      }}
    >
      {loadError ? (
        <Alert
          type="error"
          showIcon
          message="加载申请详情失败"
          description={loadError}
          action={
            <Button
              size="small"
              onClick={() => history.push('/oa/application')}
            >
              返回列表
            </Button>
          }
        />
      ) : null}

      <Spin spinning={loading}>
        {detail ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <ApplicationInfoCard detail={detail} />
            <ApplicationFormCard detail={detail} />
            <ApplicationCcCard detail={detail} />
            <ApplicationTimelineCard detail={detail} />
          </Space>
        ) : !loading && !loadError ? (
          <Card size="small">
            <Typography.Text type="secondary">
              请从我的申请列表选择申请
            </Typography.Text>
          </Card>
        ) : null}
      </Spin>

      <Modal
        title="撤回申请"
        open={withdrawOpen}
        okText="确认撤回"
        cancelText="取消"
        confirmLoading={withdrawing}
        onOk={() => void confirmWithdraw()}
        onCancel={() => {
          if (!withdrawing) setWithdrawOpen(false);
        }}
      >
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Typography.Text type="secondary">
            撤回后流程立即终止；已有审批动作的申请不可撤回。
          </Typography.Text>
          <Input.TextArea
            aria-label="撤回原因"
            rows={3}
            maxLength={500}
            showCount
            placeholder="撤回原因（可选）"
            value={withdrawReason}
            onChange={(event) => setWithdrawReason(event.target.value)}
          />
        </Space>
      </Modal>

      <Modal
        title="催办审批"
        open={urgeOpen}
        okText="发送催办"
        cancelText="取消"
        confirmLoading={urging}
        onOk={() => void confirmUrge()}
        onCancel={() => {
          if (!urging) setUrgeOpen(false);
        }}
      >
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Typography.Text type="secondary">
            提醒当前处理人处理待办；同一任务有冷却时间与每日上限，且不会重置超期计时。
          </Typography.Text>
          <Input.TextArea
            aria-label="催办备注"
            rows={3}
            maxLength={500}
            showCount
            placeholder="催办备注（可选）"
            value={urgeReason}
            onChange={(event) => setUrgeReason(event.target.value)}
          />
        </Space>
      </Modal>
    </PageContainer>
  );
};

export default ApplicationDetailPage;
