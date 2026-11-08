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
  Popconfirm,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import React, { useMemo, useState } from 'react';
import {
  type OaApplicationDetailVo,
  type OaApplicationTimelineVo,
  revokeOaCc,
} from '@/services/web/guardfind/oa';
import { download } from '@/utils/download';
import {
  type OaFormField,
  type OaFormTableRow,
  oaAttachmentFileId,
  parseOaFormSchema,
} from '@/utils/oaForm';
import {
  buildOaRequestId,
  formatOaFormValue,
  formatOaTableCell,
} from '@/utils/oaLaunch';
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
  ADD_CC: '追加抄送',
  REVOKE_CC: '撤销抄送',
};

function timelineRelation(item: OaApplicationTimelineVo) {
  const original = item.originalAssigneeId;
  const actedForOther =
    original != null && String(original) !== String(item.operatorId ?? '');
  const originalLabel = item.originalAssigneeName || original;
  if (item.action === 'REVOKE_CC') {
    return item.targetUserId != null ? (
      <Tag>撤销对 {item.targetUserName || item.targetUserId} 的抄送</Tag>
    ) : null;
  }
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

function TableSnapshot({
  field,
  rows,
}: {
  field: OaFormField;
  rows: OaFormTableRow[];
}) {
  return (
    <Table<OaFormTableRow>
      size="small"
      bordered
      pagination={false}
      scroll={{ x: true }}
      rowKey={(row) => String(rows.indexOf(row))}
      dataSource={rows}
      aria-label={`${field.label}明细`}
      columns={[
        {
          key: '__index',
          title: '#',
          width: 48,
          render: (_, __, index) => index + 1,
        },
        ...(field.columns ?? []).map((column) => ({
          key: column.key,
          title: column.label,
          render: (_: unknown, row: OaFormTableRow) =>
            formatOaTableCell(column, row[column.key]),
        })),
      ]}
    />
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
            const tableRows =
              field.type === 'table' && Array.isArray(value)
                ? (value as OaFormTableRow[])
                : [];
            return (
              <Descriptions.Item key={field.key} label={field.label}>
                {tableRows.length ? (
                  <TableSnapshot field={field} rows={tableRows} />
                ) : attachments.length ? (
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
  currentUserId,
  onChanged,
  extra,
}: {
  detail: OaApplicationDetailVo;
  /** 传入后，本人发起的抄送可撤销 */
  currentUserId?: number | string | null;
  onChanged?: () => void;
  extra?: React.ReactNode;
}) {
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const receivers = detail.ccReceivers ?? [];
  if (!receivers.length && !extra) return null;
  const active = receivers.filter((item) => item.status !== 'REVOKED');
  const readCount = active.filter((item) => item.status === 'READ').length;

  const revoke = async (receiverId: number | string) => {
    const key = String(receiverId);
    if (revokingId) return;
    setRevokingId(key);
    try {
      await revokeOaCc(detail.id, receiverId, {
        requestId: buildOaRequestId(),
      });
      message.success('已撤销抄送');
      onChanged?.();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '撤销失败');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <Card
      size="small"
      title="抄送人"
      extra={
        <Space size={12}>
          {active.length ? (
            <Typography.Text type="secondary">
              已读 {readCount}/{active.length}
            </Typography.Text>
          ) : null}
          {extra}
        </Space>
      }
    >
      {receivers.length ? (
        <Space size={[8, 8]} wrap>
          {receivers.map((item) => {
            const key = String(item.receiverId);
            const revoked = item.status === 'REVOKED';
            const name = item.receiverName || key;
            const statusText = revoked
              ? '已撤销'
              : item.status === 'READ'
                ? '已读'
                : '未读';
            const tip = [
              item.ccByName ? `由 ${item.ccByName} 抄送` : null,
              item.readTime ? `已读于 ${item.readTime}` : null,
              item.revokeTime ? `撤销于 ${item.revokeTime}` : null,
            ]
              .filter(Boolean)
              .join('；');
            const canRevoke =
              !revoked &&
              currentUserId != null &&
              item.ccById != null &&
              String(item.ccById) === String(currentUserId);
            return (
              <Tag
                key={key}
                color={
                  revoked
                    ? undefined
                    : item.status === 'READ'
                      ? 'green'
                      : 'default'
                }
                style={revoked ? { textDecoration: 'line-through' } : undefined}
                title={tip || statusText}
              >
                {name} · {statusText}
                {canRevoke ? (
                  <Popconfirm
                    title={`撤销对 ${name} 的抄送？`}
                    description="撤销后对方将无法再查看该申请及附件。"
                    okText="撤销"
                    cancelText="取消"
                    onConfirm={() => revoke(item.receiverId)}
                  >
                    <Button
                      type="link"
                      size="small"
                      loading={revokingId === key}
                      style={{ paddingInline: 4, height: 'auto' }}
                    >
                      撤销
                    </Button>
                  </Popconfirm>
                ) : null}
              </Tag>
            );
          })}
        </Space>
      ) : (
        <Typography.Text type="secondary">暂无抄送人</Typography.Text>
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
