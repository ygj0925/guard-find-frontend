/**
 * 申请详情的只读分区：申请信息、表单快照与审批轨迹，供我的申请与审批中心复用。
 */
import {
  Card,
  Descriptions,
  Empty,
  Space,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import React, { useMemo } from 'react';
import type { OaApplicationDetailVo } from '@/services/web/guardfind/oa';
import { parseOaFormSchema } from '@/utils/oaForm';
import { formatOaFormValue } from '@/utils/oaLaunch';
import { applicationStatusTag } from './ApplicationStatus';

export const TIMELINE_ACTION: Record<string, string> = {
  SUBMIT: '提交申请',
  APPROVE: '审批通过',
  REJECT: '驳回',
  CANCEL: '撤销',
  WITHDRAW: '撤回',
  RETURN: '退回上一节点',
  TRANSFER: '转交',
  CLAIM: '领取任务',
  TERMINATE: '终止',
};

export function ApplicationInfoCard({
  detail,
}: {
  detail: OaApplicationDetailVo;
}) {
  return (
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
            <Typography.Text code>{detail.processInstanceId}</Typography.Text>
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
  );
}

export function ApplicationFormCard({
  detail,
}: {
  detail: OaApplicationDetailVo;
}) {
  const formFields = useMemo(
    () =>
      parseOaFormSchema(detail.schemaJson).fields.filter(
        (field) => !field.hidden,
      ),
    [detail.schemaJson],
  );
  return (
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
  );
}

export function ApplicationTimelineCard({
  detail,
}: {
  detail: OaApplicationDetailVo;
}) {
  return (
    <Card size="small" title="审批轨迹">
      {detail.timeline?.length ? (
        <Timeline
          items={detail.timeline.map((item, index) => ({
            key: `${item.action}-${item.createTime}-${index}`,
            color:
              item.action === 'REJECT'
                ? 'red'
                : item.action === 'RETURN'
                  ? 'orange'
                  : 'blue',
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
  );
}
