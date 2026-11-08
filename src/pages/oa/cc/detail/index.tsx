/**
 * 抄送详情：只读展示申请快照、抄送人与审批轨迹；打开即由服务端标记已读。
 */
import { PageContainer } from '@ant-design/pro-components';
import { history, useSearchParams } from '@umijs/max';
import { Alert, Button, Card, Space, Spin, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import {
  getOaCcDetail,
  type OaApplicationDetailVo,
} from '@/services/web/guardfind/oa';
import {
  ApplicationCcCard,
  ApplicationFormCard,
  ApplicationInfoCard,
  ApplicationTimelineCard,
} from '../../application/components/ApplicationSections';
import { applicationStatusTag } from '../../application/components/ApplicationStatus';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

const CcDetailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const [detail, setDetail] = useState<OaApplicationDetailVo | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setLoadError('缺少申请 ID，请从抄送列表进入');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getOaCcDetail(id)
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
  }, [id]);

  return (
    <PageContainer
      onBack={() => history.push('/oa/cc')}
      header={{
        title: detail?.title || '抄送详情',
        subTitle: detail?.businessKey,
        extra: detail ? applicationStatusTag(detail.status) : undefined,
      }}
    >
      {loadError ? (
        <Alert
          type="error"
          showIcon
          message="加载抄送详情失败"
          description={loadError}
          action={
            <Button size="small" onClick={() => history.push('/oa/cc')}>
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
              请从抄送列表选择申请
            </Typography.Text>
          </Card>
        ) : null}
      </Spin>
    </PageContainer>
  );
};

export default CcDetailPage;
