/**
 * 申请详情的只读分区：申请信息、表单快照与审批轨迹，供我的申请与审批中心复用。
 */
import { DownloadOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Descriptions,
  Empty,
  message,
  Space,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import React, { useMemo } from 'react';
import type {
  OaApplicationDetailVo,
  OaApplicationTimelineVo,
} from '@/services/web/guardfind/oa';
import { download } from '@/utils/download';
import { oaAttachmentFileId, parseOaFormSchema } from '@/utils/oaForm';
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

function timelineRelation(item: OaApplicationTimelineVo) {
  const original = item.originalAssigneeId;
  const actedForOther =
    original != null && String(original) !== String(item.operatorId ?? '');
  const originalLabel = item.originalAssigneeName || original;
  if (item.action === 'TRANSFER') {
    return (
      <>
        {actedForOther ? <Tag>原处理人 {originalLabel}</Tag> : null}
        {item.targetUserId != null ? (
          <Tag color="blue">
            转交给 {item.targetUserName || item.targetUserId}
          </Tag>
        ) : null}
      </>
    );
  }
  return actedForOther ? <Tag color="gold">代 {originalLabel}</Tag> : null;
}

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

interface AttachmentItem {
  key: string;
  fileId: string;
  name: string;
}

function attachmentItems(value: unknown): AttachmentItem[] {
  return (Array.isArray(value) ? value : []).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const fileId = oaAttachmentFileId(item as { fileId?: unknown });
    if (!fileId) return [];
    const file = item as { uid?: unknown; name?: unknown };
    return [
      {
        key: String(file.uid ?? fileId),
        fileId,
        name: String(file.name ?? '附件'),
      },
    ];
  });
}

function AttachmentLinks({ items }: { items: AttachmentItem[] }) {
  const handleDownload = async (item: AttachmentItem) => {
    try {
      await download(`system/oa/attachment/${item.fileId}`, {
        filename: item.name,
      });
    } catch {
      message.error('附件下载失败，请稍后重试');
    }
  };
  return (
    <Space size={8} wrap>
      {items.map((item) => (
        <Button
          key={item.key}
          size="small"
          icon={<DownloadOutlined />}
          onClick={() => handleDownload(item)}
        >
          {item.name}
        </Button>
      ))}
    </Space>
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
          {formFields.map((field) => {
            const value = detail.formData[field.key];
            const attachments =
              field.type === 'attachment' ? attachmentItems(value) : [];
            const personLabel =
              field.type === 'person' ? detail.formLabels?.[field.key] : null;
            return (
              <Descriptions.Item key={field.key} label={field.label}>
                {attachments.length ? (
                  <AttachmentLinks items={attachments} />
                ) : personLabel ? (
                  personLabel
                ) : (
                  formatOaFormValue(field, value)
                )}
              </Descriptions.Item>
            );
          })}
        </Descriptions>
      ) : (
        <Empty description="该申请没有表单字段" />
      )}
    </Card>
  );
}

export function ApplicationCcCard({
  detail,
}: {
  detail: OaApplicationDetailVo;
}) {
  const receivers = detail.ccReceivers ?? [];
  if (!receivers.length) return null;
  const readCount = receivers.filter((item) => item.status === 'READ').length;
  return (
    <Card
      size="small"
      title="抄送人"
      extra={
        <Typography.Text type="secondary">
          已读 {readCount}/{receivers.length}
        </Typography.Text>
      }
    >
      <Space size={[8, 8]} wrap>
        {receivers.map((item) => (
          <Tag
            key={String(item.receiverId)}
            color={item.status === 'READ' ? 'green' : 'default'}
            title={item.readTime ? `已读于 ${item.readTime}` : '未读'}
          >
            {item.receiverName || String(item.receiverId)} ·{' '}
            {item.status === 'READ' ? '已读' : '未读'}
          </Tag>
        ))}
      </Space>
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
                  {timelineRelation(item)}
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
