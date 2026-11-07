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
  withdrawOaApplication,
} from '@/services/web/guardfind/oa';
import { buildOaRequestId } from '@/utils/oaLaunch';
import {
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
              <Button danger onClick={openWithdraw}>
                撤回申请
              </Button>
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
    </PageContainer>
  );
};

export default ApplicationDetailPage;
