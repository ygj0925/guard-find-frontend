/**
 * 申请详情：展示发布版本对应的表单快照、申请人与审批轨迹。
 */
import { PageContainer } from '@ant-design/pro-components';
import { history, useSearchParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Space,
  Spin,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import {
  getOaApplication,
  type OaApplicationDetailVo,
} from '@/services/web/guardfind/oa';
import { parseOaFormSchema } from '@/utils/oaForm';
import { formatOaFormValue } from '@/utils/oaLaunch';
import { applicationStatusTag } from '../components/ApplicationStatus';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

const TIMELINE_ACTION: Record<string, string> = {
  SUBMIT: '提交申请',
  APPROVE: '审批通过',
  REJECT: '驳回',
  CANCEL: '撤销',
  WITHDRAW: '撤回',
  TRANSFER: '转交',
};

const ApplicationDetailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const [detail, setDetail] = useState<OaApplicationDetailVo | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState<string | null>(null);

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
  }, [id]);

  const formFields = useMemo(
    () =>
      detail
        ? parseOaFormSchema(detail.schemaJson).fields.filter(
            (field) => !field.hidden,
          )
        : [],
    [detail],
  );

  return (
    <PageContainer
      onBack={() => history.push('/oa/application')}
      header={{
        title: detail?.title || '申请详情',
        subTitle: detail?.businessKey,
        extra: detail ? applicationStatusTag(detail.status) : undefined,
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
            <Card size="small" title="申请信息">
              <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} size="small">
                <Descriptions.Item label="申请人">
                  {detail.applicantName || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="所属部门">
                  {detail.applicantDeptName || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  {applicationStatusTag(detail.status)}
                </Descriptions.Item>
                <Descriptions.Item label="流程">
                  {detail.modelName || detail.businessType}
                </Descriptions.Item>
                <Descriptions.Item label="表单">
                  {detail.formName || '—'}
                  {detail.formVersion ? ` v${detail.formVersion}` : ''}
                </Descriptions.Item>
                <Descriptions.Item label="发布版本">
                  {detail.releaseVersion ? `v${detail.releaseVersion}` : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="业务编号">
                  {detail.businessKey}
                </Descriptions.Item>
                <Descriptions.Item label="流程实例">
                  {detail.processInstanceId ? (
                    <Typography.Text code>
                      {detail.processInstanceId}
                    </Typography.Text>
                  ) : (
                    '—'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="提交时间">
                  {detail.submittedTime || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="完成时间">
                  {detail.finishedTime || '—'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card size="small" title="表单快照">
              {formFields.length ? (
                <Descriptions column={1} size="small" bordered>
                  {formFields.map((field) => (
                    <Descriptions.Item key={field.key} label={field.label}>
                      {formatOaFormValue(field, detail.formData[field.key])}
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              ) : (
                <Empty description="该申请没有表单字段" />
              )}
            </Card>

            <Card size="small" title="审批轨迹">
              {detail.timeline?.length ? (
                <Timeline
                  items={detail.timeline.map((item, index) => ({
                    key: `${item.action}-${item.createTime}-${index}`,
                    color: item.action === 'REJECT' ? 'red' : 'blue',
                    children: (
                      <Space direction="vertical" size={2}>
                        <Space wrap>
                          <Typography.Text strong>
                            {TIMELINE_ACTION[item.action] || item.action}
                          </Typography.Text>
                          <Tag>{item.operatorName || item.operatorId}</Tag>
                        </Space>
                        {item.reason ? (
                          <Typography.Text type="secondary">
                            {item.reason}
                          </Typography.Text>
                        ) : null}
                        <Typography.Text type="secondary">
                          {item.createTime || '—'}
                        </Typography.Text>
                      </Space>
                    ),
                  }))}
                />
              ) : (
                <Empty description="暂无审批轨迹" />
              )}
            </Card>
          </Space>
        ) : !loading && !loadError ? (
          <Card size="small">
            <Empty description="请从我的申请列表选择申请" />
          </Card>
        ) : null}
      </Spin>
    </PageContainer>
  );
};

export default ApplicationDetailPage;
