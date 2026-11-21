import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { useAccess } from '@/hooks/useAccess';
import {
  type IdentityStatus,
  type IdentityVerificationSettings,
  type IdentityVerificationStatus,
  identityProviderLabels,
  identityStatusLabels,
  queryIdentitySettings,
  queryIdentityVerifications,
  reviewIdentityVerification,
  updateIdentitySettings,
} from '@/services/web/guardfind/identityVerification';

const defaultSettings: IdentityVerificationSettings = {
  enabled: false,
  required: false,
  provider: 'DISABLED',
  verificationTtlDays: 365,
};

const statusColors: Partial<Record<IdentityStatus, string>> = {
  VERIFIED: 'green',
  PENDING: 'processing',
  FAILED: 'red',
  REVIEW_REQUIRED: 'orange',
  EXPIRED: 'default',
};

const pageSize = 20;

export default function IdentityVerificationPanel() {
  const { hasPermission } = useAccess();
  const editable = hasPermission('system:property:identity:update');
  const viewable = hasPermission('system:property:identity:list') || editable;
  const [form] = Form.useForm<IdentityVerificationSettings>();
  const [settings, setSettings] = useState<IdentityVerificationSettings>();
  const [rows, setRows] = useState<IdentityVerificationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState<IdentityVerificationStatus>();
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewForm] = Form.useForm<{
    action: 'VERIFY' | 'REJECT';
    reason: string;
  }>();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [queue, setQueue] = useState<'AWAITING_REVIEW' | 'ALL'>(
    'AWAITING_REVIEW',
  );
  const [settingsRevision, setSettingsRevision] = useState(0);
  const [queueRevision, setQueueRevision] = useState(0);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueFailed, setQueueFailed] = useState(false);

  useEffect(() => {
    if (!viewable) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setFailed(false);
    void queryIdentitySettings()
      .then(({ data }) => {
        if (!active) return;
        const nextSettings = { ...defaultSettings, ...data };
        setSettings(nextSettings);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [viewable, settingsRevision]);

  useEffect(() => {
    if (!viewable) return;
    let active = true;
    setQueueLoading(true);
    setQueueFailed(false);
    void queryIdentityVerifications({
      page,
      size: pageSize,
      ...(queue === 'ALL' ? {} : { status: queue }),
    })
      .then(({ data }) => {
        if (!active) return;
        setRows(data.list);
        setTotal(data.total);
        const lastPage = Math.max(1, Math.ceil(data.total / pageSize));
        if (page > lastPage) setPage(lastPage);
      })
      .catch(() => {
        if (active) setQueueFailed(true);
      })
      .finally(() => {
        if (active) setQueueLoading(false);
      });
    return () => {
      active = false;
    };
  }, [viewable, page, queue, queueRevision]);

  const save = async () => {
    if (!editable || saving) return;
    try {
      const values = await form.validateFields();
      setSaving(true);
      await updateIdentitySettings({
        ...values,
        enabled: Boolean(values.enabled),
        required: Boolean(values.required),
      });
      message.success('实名认证配置已保存');
      setSettings(values);
    } catch {
      // 请求层统一提示，保留用户输入。
    } finally {
      setSaving(false);
    }
  };

  const submitReview = async () => {
    if (!reviewing || !editable || reviewSaving) return;
    try {
      const values = await reviewForm.validateFields();
      setReviewSaving(true);
      await reviewIdentityVerification(reviewing.id, {
        action: values.action,
        reason: values.reason,
        version: reviewing.version,
      });
      message.success('人工核验结果已记录');
      setReviewing(undefined);
      setQueueRevision((value) => value + 1);
    } catch {
      // 请求层统一提示，保留复核内容。
    } finally {
      setReviewSaving(false);
    }
  };

  if (loading)
    return (
      <Typography.Text type="secondary">正在加载实名认证配置…</Typography.Text>
    );
  if (!viewable)
    return <Alert type="warning" message="你没有查看实名认证状态的权限" />;
  if (failed)
    return (
      <Alert
        type="error"
        message="实名认证配置加载失败"
        action={
          <Button onClick={() => setSettingsRevision((value) => value + 1)}>
            重试
          </Button>
        }
      />
    );

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Alert
        type={settings?.enabled ? 'warning' : 'info'}
        showIcon
        message={
          settings?.enabled
            ? '实名认证已启用，签署前会要求当事人完成身份核验。'
            : '实名认证当前未启用，系统不会把账号登录或手写签名标记为实名认证通过。'
        }
        description="后台只能查看脱敏身份信息和核验状态，不能代替当事人签署合同，也不会展示身份证原图或人脸原图。"
      />
      <Form
        form={form}
        layout="vertical"
        disabled={!editable}
        style={{ maxWidth: 680 }}
        initialValues={settings}
      >
        <Form.Item name="enabled" label="启用实名认证" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item
          name="required"
          label="签署前必须通过核验"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          name="provider"
          label="核验方式"
          rules={[{ required: true }]}
        >
          <Select
            options={Object.entries(identityProviderLabels).map(
              ([value, label]) => ({
                value,
                label,
              }),
            )}
          />
        </Form.Item>
        <Form.Item
          name="verificationTtlDays"
          label="核验有效期（天）"
          rules={[{ required: true, type: 'number', min: 1, max: 3650 }]}
          extra="仅影响已通过核验的有效期，不会修改历史合同的签署记录。"
        >
          <InputNumber min={1} max={3650} precision={0} />
        </Form.Item>
        {editable ? (
          <Button type="primary" loading={saving} onClick={() => void save()}>
            保存实名认证配置
          </Button>
        ) : null}
      </Form>
      <Select
        aria-label="审核记录范围"
        value={queue}
        options={[
          { value: 'AWAITING_REVIEW', label: '待复核' },
          { value: 'ALL', label: '全部记录' },
        ]}
        onChange={(value) => {
          setPage(1);
          setQueue(value);
        }}
      />
      {queueFailed ? (
        <Alert
          type="error"
          message="核验记录加载失败"
          action={
            <Button onClick={() => setQueueRevision((value) => value + 1)}>
              重试
            </Button>
          }
        />
      ) : (
        <Table<IdentityVerificationStatus>
          rowKey="id"
          dataSource={rows}
          loading={queueLoading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: false,
            onChange: setPage,
          }}
          scroll={{ x: 900 }}
          locale={{ emptyText: '暂无身份核验记录' }}
          columns={[
            { title: '用户', dataIndex: 'userName' },
            {
              title: '签约角色',
              dataIndex: 'role',
              render: (role: IdentityVerificationStatus['role']) =>
                role === 'TENANT'
                  ? '承租方'
                  : role === 'LANDLORD'
                    ? '出租方'
                    : '签约用户',
            },
            {
              title: '身份证号',
              dataIndex: 'maskedIdNumber',
              render: (value) => value || '未提供',
            },
            {
              title: '状态',
              dataIndex: 'status',
              render: (status: IdentityStatus) => (
                <Tag color={statusColors[status]}>
                  {identityStatusLabels[status]}
                </Tag>
              ),
            },
            {
              title: '核验时间',
              dataIndex: 'verifiedAt',
              render: (value) => value || '—',
            },
            {
              title: '操作',
              render: (_, row) =>
                editable &&
                (!row.provider || row.provider === 'MANUAL') &&
                (row.status === 'PENDING' ||
                  row.status === 'REVIEW_REQUIRED') ? (
                  <Button
                    type="link"
                    onClick={() => {
                      reviewForm.resetFields();
                      reviewForm.setFieldsValue({ action: 'VERIFY' });
                      setReviewing(row);
                    }}
                  >
                    人工复核
                  </Button>
                ) : (
                  '—'
                ),
            },
          ]}
        />
      )}
      <Modal
        open={Boolean(reviewing)}
        title="人工核验"
        onCancel={() => !reviewSaving && setReviewing(undefined)}
        onOk={() => void submitReview()}
        okText="保存核验结果"
        cancelText="取消"
        confirmLoading={reviewSaving}
        maskClosable={false}
        destroyOnHidden
      >
        <Alert
          type="warning"
          message="请线下核对本人证件和本人状态后记录结果。"
          description="系统只保存人工复核结论、原因、操作人和时间，不上传或展示身份证原图、人脸原图。"
          style={{ marginBottom: 16 }}
        />
        <Typography.Paragraph>
          用户：{reviewing?.userName} ·{' '}
          {reviewing?.maskedIdNumber || '未提供脱敏证件号'}
        </Typography.Paragraph>
        <Form form={reviewForm} layout="vertical">
          <Form.Item
            name="action"
            label="复核结果"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'VERIFY', label: '核验通过' },
                { value: 'REJECT', label: '核验不通过' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="reason"
            label="复核说明"
            rules={[{ required: true, whitespace: true, max: 500 }]}
          >
            <Input.TextArea rows={4} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
