/**
 * OA 运维：outbox 失败事件重试/立即投递，以及独立授权的流程终止。
 * 终止与审批动作权限分离，必须填写原因并生成幂等 requestId。
 */
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Space,
  Tag,
  Typography,
} from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  dispatchOaOutbox,
  type OaOutboxEventVo,
  queryOaOutboxEvents,
  retryOaOutboxEvent,
  terminateOaApplication,
} from '@/services/web/guardfind/oa';
import { buildOaRequestId } from '@/utils/oaLaunch';

const STATUS_META: Record<string, { text: string; color: string }> = {
  PENDING: { text: '待投递', color: 'blue' },
  PROCESSING: { text: '处理中', color: 'processing' },
  SENT: { text: '已投递', color: 'green' },
  FAILED: { text: '失败', color: 'red' },
};

type TerminateFormValues = {
  applicationId: number;
  reason: string;
};

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

const OperationsPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [form] = Form.useForm<TerminateFormValues>();
  const [open, setOpen] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const retry = async (record: OaOutboxEventVo) => {
    try {
      await retryOaOutboxEvent(record.id);
      message.success('已重新排队');
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    }
  };

  const dispatch = async () => {
    try {
      const response = await dispatchOaOutbox();
      message.success(
        `扫描 ${response.data.scanned}，成功 ${response.data.sent}，失败 ${response.data.failed}`,
      );
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    }
  };

  const openTerminate = () => {
    form.resetFields();
    setRequestId(buildOaRequestId());
    setOpen(true);
  };

  const submitTerminate = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const response = await terminateOaApplication(values.applicationId, {
        requestId,
        reason: values.reason.trim(),
      });
      message.success(response.data.replayed ? '已恢复终止结果' : '申请已终止');
      setOpen(false);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ProColumns<OaOutboxEventVo>[] = [
    {
      title: '事件',
      dataIndex: 'eventType',
      search: false,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <span>{record.eventType}</span>
          <Typography.Text type="secondary">
            {record.aggregateType} / {record.aggregateId}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        PENDING: { text: '待投递' },
        PROCESSING: { text: '处理中' },
        SENT: { text: '已投递' },
        FAILED: { text: '失败' },
      },
      width: 110,
      render: (_, record) => {
        const meta = STATUS_META[record.status] ?? {
          text: record.status,
          color: 'default',
        };
        return <Tag color={meta.color}>{meta.text}</Tag>;
      },
    },
    {
      title: '重试',
      dataIndex: 'retryCount',
      width: 80,
      search: false,
    },
    {
      title: '错误 / 备注',
      dataIndex: 'lastError',
      search: false,
      render: (_, record) =>
        record.lastError ? (
          <Typography.Text type="danger">{record.lastError}</Typography.Text>
        ) : (
          '—'
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 180,
      search: false,
      render: (_, record) => record.createTime || '—',
    },
    {
      title: '投递时间',
      dataIndex: 'sentTime',
      width: 180,
      search: false,
      render: (_, record) => record.sentTime || '—',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      search: false,
      render: (_, record) =>
        record.status === 'FAILED' || record.status === 'PENDING' ? (
          <AccessControl permission="system:oa:ops:outbox:retry">
            <Button type="link" onClick={() => void retry(record)}>
              重试
            </Button>
          </AccessControl>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <PageContainer>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Typography.Text type="secondary">
            outbox
            由后台定时投递；失败事件按指数退避重试，也可在此手动重排或立即投递。
          </Typography.Text>
          <AccessControl permission="system:oa:ops:outbox:retry">
            <Button onClick={() => void dispatch()}>立即投递</Button>
          </AccessControl>
          <AccessControl permission="system:oa:ops:terminate">
            <Button danger onClick={openTerminate}>
              终止申请
            </Button>
          </AccessControl>
        </Space>
      </Card>

      <ProTable<OaOutboxEventVo>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 1100 }}
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        request={async (params) => {
          const response = await queryOaOutboxEvents({
            page: params.current ?? 1,
            size: params.pageSize ?? 10,
            status: params.status,
            keyword: params.keyword,
          });
          return {
            data: response.data.list,
            total: response.data.total,
            success: true,
          };
        }}
      />

      <Modal
        title="终止运行中的申请"
        open={open}
        okText="确认终止"
        cancelText="取消"
        confirmLoading={submitting}
        destroyOnHidden
        onOk={() => void submitTerminate()}
        onCancel={() => {
          if (!submitting) setOpen(false);
        }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Typography.Text type="secondary">
            终止会删除流程实例并将申请置为
            CANCELLED，同时写入不可变审计；操作不可撤销。
          </Typography.Text>
          <Form form={form} name="oaTerminateForm" layout="vertical">
            <Form.Item
              name="applicationId"
              label="申请 ID"
              rules={[{ required: true, message: '请填写申请 ID' }]}
            >
              <InputNumber
                aria-label="申请 ID"
                min={1}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item
              name="reason"
              label="终止原因"
              rules={[{ required: true, message: '请填写终止原因' }]}
            >
              <Input.TextArea
                aria-label="终止原因"
                rows={3}
                maxLength={500}
                showCount
                placeholder="必填，会写入审计"
              />
            </Form.Item>
          </Form>
        </Space>
      </Modal>
    </PageContainer>
  );
};

export default OperationsPage;
