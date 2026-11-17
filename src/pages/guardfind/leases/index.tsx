import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Select,
  Space,
  Spin,
  Switch,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { useAccess } from '@/hooks/useAccess';
import {
  actOnLease,
  createLease,
  type LeaseAction,
  type LeaseActionInput,
  type LeaseDetail,
  type LeaseInput,
  type LeasePropertyOption,
  type LeaseReminder,
  type LeaseSettings,
  leaseStatusLabels,
  moveOutLabels,
  queryLease,
  queryLeaseCustomers,
  queryLeaseProperties,
  queryLeaseReminders,
  queryLeaseSettings,
  queryLeases,
  renewalLabels,
  updateLease,
  updateLeaseSettings,
} from '@/services/web/guardfind/leases';

const actionLabels: Record<LeaseAction, string> = {
  PUBLISH: '发布待签合同',
  VOID: '作废合同',
  TERMINATE: '终止合同',
  RENEW_APPROVE: '同意续租并生成草稿',
  RENEW_REJECT: '拒绝续租',
  MOVE_OUT_RESOLVE: '处理退租申请',
};
const logLabels: Record<string, string> = {
  ...actionLabels,
  CREATE: '创建草稿',
  UPDATE: '修改草稿',
  EDIT: '修改草稿',
  SIGN: '确认签署',
  DECLINE: '拒绝签署',
  RENEW_REQUEST: '申请续租',
  RENEW_CANCEL: '撤回续租',
  MOVE_OUT_REQUEST: '申请退租',
  EXPIRE: '合同到期',
  REMIND: '到期提醒',
};
const required = [{ required: true, message: '请填写此项' }];

function SearchSelect({
  id,
  value,
  onChange,
  kind,
  initial,
  onProperty,
  disabled,
}: {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  kind: 'property' | 'customer';
  initial?: { value: string; label: string };
  onProperty?: (property: LeasePropertyOption) => void;
  disabled?: boolean;
}) {
  const [options, setOptions] = useState<
    { value: string; label: string; disabled?: boolean }[]
  >(initial ? [initial] : []);
  const [loading, setLoading] = useState(false);
  const properties = useRef<LeasePropertyOption[]>([]);
  const version = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      version.current++;
      clearTimeout(timer.current);
    },
    [],
  );
  const search = (keyword: string) => {
    clearTimeout(timer.current);
    const request = ++version.current;
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        if (kind === 'property') {
          const response = await queryLeaseProperties(keyword);
          if (request !== version.current) return;
          properties.current = response.data.list;
          setOptions(
            response.data.list.map((p) => ({
              value: p.id,
              label: `${p.title} · ${p.address} · ${p.id}`,
            })),
          );
        } else {
          const response = await queryLeaseCustomers(keyword);
          if (request !== version.current) return;
          setOptions(
            response.data.list.map((u) => ({
              value: u.id,
              label: `${u.nickname || '用户'} · ${u.id}${u.accountStatus === 1 ? '' : ' · 已停用'}`,
              disabled: u.accountStatus !== 1,
            })),
          );
        }
      } catch {
        if (request === version.current) message.error('搜索失败，请重试');
      } finally {
        if (request === version.current) setLoading(false);
      }
    }, 250);
  };
  return (
    <Select
      id={id}
      value={value}
      disabled={disabled}
      showSearch
      filterOption={false}
      loading={loading}
      placeholder={
        kind === 'property'
          ? '搜索出租房源标题或地址'
          : '搜索小程序用户昵称或 ID'
      }
      onFocus={() => search('')}
      onSearch={search}
      options={options}
      onChange={(next) => {
        onChange?.(next);
        const property = properties.current.find((p) => p.id === next);
        if (property) onProperty?.(property);
      }}
    />
  );
}

export function LeaseEditor({
  record,
  onClose,
  onSaved,
}: {
  record?: LeaseDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm<LeaseInput>();
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const initial: Partial<LeaseInput> = record
    ? { ...record }
    : { title: '房屋租赁合同', deposit: 0 };
  const save = async () => {
    if (savingRef.current) return;
    let values: LeaseInput;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      if (record)
        await updateLease(record.id, {
          ...values,
          previousLeaseId: record.previousLeaseId,
          version: record.version,
        });
      else await createLease(values);
      message.success('合同草稿已保存');
      onSaved();
      onClose();
    } catch {
      /* RequestConfig 展示服务端错误，保留用户输入 */
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  return (
    <Modal
      open
      title={record ? '编辑合同草稿' : '创建合同草稿'}
      width={850}
      onCancel={onClose}
      onOk={() => void save()}
      okText="保存合同草稿"
      confirmLoading={saving}
      maskClosable={false}
    >
      <Alert
        type="info"
        showIcon
        message="发布后合同内容固定，双方在小程序确认签署。请填写真实主体信息及双方认可的完整条款。"
        style={{ marginBottom: 16 }}
      />
      <Form form={form} layout="vertical" initialValues={initial}>
        <Form.Item name="propertyId" label="出租房源" rules={required}>
          <SearchSelect
            kind="property"
            disabled={Boolean(record)}
            initial={
              record
                ? { value: record.propertyId, label: record.propertyTitle }
                : undefined
            }
            onProperty={(p) =>
              form.setFieldsValue({ landlordId: p.userId || undefined })
            }
          />
        </Form.Item>
        <Form.Item
          name="title"
          label="合同标题"
          rules={[...required, { whitespace: true }, { max: 200 }]}
        >
          <Input maxLength={200} />
        </Form.Item>
        <Space align="start" wrap>
          <Form.Item
            name="landlordId"
            label="出租方小程序账号"
            rules={required}
            extra="有房东归属的房源须选择该房东账号。"
          >
            <SearchSelect
              kind="customer"
              disabled={Boolean(record?.previousLeaseId)}
              initial={
                record
                  ? {
                      value: record.landlordId,
                      label: `${record.landlordName} · ${record.landlordId}`,
                    }
                  : undefined
              }
            />
          </Form.Item>
          <Form.Item
            name="tenantId"
            label="承租方小程序账号"
            dependencies={['landlordId']}
            rules={[
              ...required,
              ({ getFieldValue }) => ({
                validator: (_, value) =>
                  value && value === getFieldValue('landlordId')
                    ? Promise.reject(new Error('出租方与承租方不能是同一账号'))
                    : Promise.resolve(),
              }),
            ]}
          >
            <SearchSelect
              kind="customer"
              disabled={Boolean(record?.previousLeaseId)}
              initial={
                record
                  ? {
                      value: record.tenantId,
                      label: `${record.tenantName} · ${record.tenantId}`,
                    }
                  : undefined
              }
            />
          </Form.Item>
        </Space>
        <Space align="start" wrap>
          <Form.Item
            name="landlordName"
            label="出租方签署姓名"
            rules={[...required, { whitespace: true }]}
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item
            name="tenantName"
            label="承租方签署姓名"
            rules={[...required, { whitespace: true }]}
          >
            <Input maxLength={100} />
          </Form.Item>
        </Space>
        <Space align="start" wrap>
          <Form.Item name="startDate" label="起租日期" rules={required}>
            <Input type="date" />
          </Form.Item>
          <Form.Item
            name="endDate"
            label="租期结束日期"
            dependencies={['startDate']}
            rules={[
              ...required,
              ({ getFieldValue }) => ({
                validator: (_, value) =>
                  value &&
                  getFieldValue('startDate') &&
                  value < getFieldValue('startDate')
                    ? Promise.reject(new Error('结束日期不能早于起租日期'))
                    : Promise.resolve(),
              }),
            ]}
          >
            <Input type="date" />
          </Form.Item>
          <Form.Item name="monthlyRent" label="月租金（元）" rules={required}>
            <InputNumber min={0.01} max={99999999.99} precision={2} />
          </Form.Item>
          <Form.Item name="deposit" label="押金（元）" rules={required}>
            <InputNumber min={0} max={99999999.99} precision={2} />
          </Form.Item>
        </Space>
        <Form.Item
          name="terms"
          label="完整合同条款"
          rules={[...required, { whitespace: true }]}
          extra="请明确租赁用途、付款方式、费用承担、维修、续租、解约和交接等约定。"
        >
          <Input.TextArea
            rows={12}
            maxLength={50000}
            showCount
            placeholder="填写已审核并经双方认可的合同正文"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function downloadLease(record: LeaseDetail) {
  const text = [
    `${record.title}`,
    `合同编号：${record.id}`,
    `房源：${record.propertyTitle}`,
    `地址：${record.propertyAddress}`,
    `出租方：${record.landlordName}`,
    `承租方：${record.tenantName}`,
    `租期：${record.startDate} 至 ${record.endDate}`,
    `月租金：${record.monthlyRent} 元；押金：${record.deposit} 元`,
    `状态：${leaseStatusLabels[record.status]}`,
    '',
    record.terms,
    '',
    `出租方确认：${record.landlordSignedName || '未签署'} ${record.landlordSignedAt || ''}`,
    `承租方确认：${record.tenantSignedName || '未签署'} ${record.tenantSignedAt || ''}`,
    `内容校验值：${record.contentHash || '草稿尚未发布'}`,
    '签署方式：小程序账号登录后由双方确认签署；未接入第三方实名认证或 CA 认证。',
  ].join('\n');
  const url = URL.createObjectURL(
    new Blob([text], { type: 'text/plain;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `租赁合同-${record.id}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function LeaseDetailDrawer({
  id,
  onClose,
  onChanged,
  onOpenLease,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
  onOpenLease?: (id: string) => void;
}) {
  const { hasPermission } = useAccess();
  const [detail, setDetail] = useState<LeaseDetail>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState(false);
  const [action, setAction] = useState<LeaseAction>();
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<LeaseActionInput>();
  const savingRef = useRef(false);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    setDetail(undefined);
    queryLease(id)
      .then((r) => {
        if (alive) setDetail(r.data);
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, revision]);
  const changed = () => {
    setRevision((v) => v + 1);
    onChanged();
  };
  const openAction = (next: LeaseAction) => {
    if (!detail) return;
    form.resetFields();
    form.setFieldsValue({
      renewalStartDate: dayjs(detail.endDate)
        .add(1, 'day')
        .format('YYYY-MM-DD'),
      renewalEndDate: detail.requestedEndDate,
      monthlyRent: detail.monthlyRent,
      deposit: detail.deposit,
    });
    setAction(next);
  };
  const submit = async () => {
    if (!detail || !action || savingRef.current) return;
    let values: LeaseActionInput;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await actOnLease(id, { ...values, action, version: detail.version });
      message.success(
        action === 'RENEW_APPROVE'
          ? '续租草稿已生成，请审核发布后由双方重新签署'
          : '合同处理成功',
      );
      setAction(undefined);
      changed();
    } catch {
      /* 保留表单，错误由统一请求层展示 */
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const available: LeaseAction[] = [];
  if (detail) {
    if (
      detail.status === 'DRAFT' &&
      hasPermission('system:property:lease:publish')
    )
      available.push('PUBLISH');
    if (
      ['DRAFT', 'PENDING_SIGNATURE'].includes(detail.status) &&
      hasPermission('system:property:lease:terminate')
    )
      available.push('VOID');
    if (
      ['SIGNED', 'EXPIRED'].includes(detail.status) &&
      hasPermission('system:property:lease:terminate')
    )
      available.push('TERMINATE');
    if (
      detail.renewalStatus === 'PENDING' &&
      hasPermission('system:property:lease:publish')
    )
      available.push('RENEW_APPROVE');
    if (
      detail.renewalStatus === 'PENDING' &&
      hasPermission('system:property:lease:update')
    )
      available.push('RENEW_REJECT');
    if (
      detail.moveOutStatus === 'PENDING' &&
      hasPermission('system:property:lease:update')
    )
      available.push('MOVE_OUT_RESOLVE');
  }
  return (
    <>
      <Drawer title="租赁合同详情" open width={850} onClose={onClose}>
        {loading ? (
          <Spin />
        ) : failed ? (
          <Alert
            type="error"
            message="合同加载失败"
            action={
              <Button onClick={() => setRevision((v) => v + 1)}>重试</Button>
            }
          />
        ) : detail ? (
          <>
            <Space wrap style={{ marginBottom: 16 }}>
              {detail.status === 'DRAFT' &&
              hasPermission('system:property:lease:update') ? (
                <Button onClick={() => setEditing(true)}>编辑草稿</Button>
              ) : null}
              {available.map((item) => (
                <Button
                  key={item}
                  danger={item === 'VOID' || item === 'TERMINATE'}
                  onClick={() => openAction(item)}
                >
                  {actionLabels[item]}
                </Button>
              ))}
              <Button onClick={() => downloadLease(detail)}>
                导出合同文本
              </Button>
              <Button onClick={() => setRevision((v) => v + 1)}>刷新</Button>
            </Space>
            <Alert
              type="info"
              message="发布后的正文不可修改。续租会生成一份新合同草稿，由双方重新确认签署。"
              style={{ marginBottom: 16 }}
            />
            <Descriptions
              bordered
              column={2}
              items={[
                { key: 'id', label: '合同编号', children: detail.id },
                {
                  key: 'state',
                  label: '状态',
                  children: leaseStatusLabels[detail.status],
                },
                {
                  key: 'title',
                  label: '合同标题',
                  children: detail.title,
                  span: 2,
                },
                {
                  key: 'property',
                  label: '房源',
                  children: `${detail.propertyTitle} · ${detail.propertyAddress}`,
                  span: 2,
                },
                {
                  key: 'landlord',
                  label: '出租方',
                  children: `${detail.landlordName}（${detail.landlordId}）`,
                },
                {
                  key: 'tenant',
                  label: '承租方',
                  children: `${detail.tenantName}（${detail.tenantId}）`,
                },
                {
                  key: 'term',
                  label: '租期',
                  children: `${detail.startDate} 至 ${detail.endDate}`,
                  span: 2,
                },
                {
                  key: 'rent',
                  label: '月租金',
                  children: `¥${detail.monthlyRent}`,
                },
                {
                  key: 'deposit',
                  label: '押金',
                  children: `¥${detail.deposit}`,
                },
                {
                  key: 'signed1',
                  label: '出租方签署',
                  children: detail.landlordSignedAt
                    ? `${detail.landlordSignedName || detail.landlordName} · ${detail.landlordSignedAt}`
                    : '未签署',
                },
                {
                  key: 'signed2',
                  label: '承租方签署',
                  children: detail.tenantSignedAt
                    ? `${detail.tenantSignedName || detail.tenantName} · ${detail.tenantSignedAt}`
                    : '未签署',
                },
                {
                  key: 'renew',
                  label: '续租申请',
                  children: renewalLabels[detail.renewalStatus],
                },
                {
                  key: 'move',
                  label: '退租申请',
                  children: moveOutLabels[detail.moveOutStatus],
                },
                {
                  key: 'requested',
                  label: '希望续租至',
                  children: detail.requestedEndDate || '—',
                },
                {
                  key: 'days',
                  label: '距租期结束',
                  children:
                    detail.daysRemaining < 0
                      ? `已过期 ${-detail.daysRemaining} 天`
                      : `${detail.daysRemaining} 天`,
                },
                {
                  key: 'reason',
                  label: '续租说明',
                  children: detail.renewalReason || '—',
                  span: 2,
                },
                {
                  key: 'previous',
                  label: '原合同编号',
                  children: detail.previousLeaseId ? (
                    <Button
                      type="link"
                      onClick={() => {
                        if (detail.previousLeaseId)
                          onOpenLease?.(detail.previousLeaseId);
                      }}
                      disabled={!onOpenLease}
                    >
                      {detail.previousLeaseId}
                    </Button>
                  ) : (
                    '—'
                  ),
                },
                {
                  key: 'next',
                  label: '续租合同编号',
                  children: detail.renewalLeaseId ? (
                    <Button
                      type="link"
                      onClick={() => {
                        if (detail.renewalLeaseId)
                          onOpenLease?.(detail.renewalLeaseId);
                      }}
                      disabled={!onOpenLease}
                    >
                      {detail.renewalLeaseId}
                    </Button>
                  ) : (
                    '—'
                  ),
                },
              ]}
            />
            <Typography.Title level={5}>合同正文</Typography.Title>
            <Typography.Paragraph
              style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
            >
              {detail.terms}
            </Typography.Paragraph>
            <Typography.Paragraph
              type="secondary"
              style={{ overflowWrap: 'anywhere' }}
            >
              内容校验值：{detail.contentHash || '草稿尚未发布'}
            </Typography.Paragraph>
            <Typography.Paragraph type="secondary">
              签署方式：小程序双方确认签署，未接入第三方实名认证或 CA 认证。
            </Typography.Paragraph>
            <Typography.Title level={5}>处理记录</Typography.Title>
            <Timeline
              items={(detail.logs || []).map((log) => ({
                key: log.id,
                children: (
                  <>
                    <div>
                      {log.createTime} · {logLabels[log.action] || log.action} ·{' '}
                      {log.actorType}
                    </div>
                    <div>{log.reason}</div>
                  </>
                ),
              }))}
            />
          </>
        ) : null}
      </Drawer>
      {editing && detail ? (
        <LeaseEditor
          record={detail}
          onClose={() => setEditing(false)}
          onSaved={changed}
        />
      ) : null}
      <Modal
        open={Boolean(action)}
        title={action ? actionLabels[action] : ''}
        onCancel={() => !saving && setAction(undefined)}
        onOk={() => void submit()}
        okText="确认处理"
        confirmLoading={saving}
        destroyOnHidden
        maskClosable={false}
      >
        {action === 'PUBLISH' ? (
          <Alert
            type="warning"
            message="请核对双方账号、姓名、房源、租期、金额和完整条款。发布后正文固定，双方可在小程序签署。"
            style={{ marginBottom: 16 }}
          />
        ) : null}
        {action === 'TERMINATE' ? (
          <Alert
            type="warning"
            message="确认双方已完成解约协商与必要交接后再终止。操作会记录原因并通知双方。"
            style={{ marginBottom: 16 }}
          />
        ) : null}
        {action === 'MOVE_OUT_RESOLVE' ? (
          <Alert
            type="info"
            message="标记退租申请已处理不会自动终止合同。需要提前结束合同时，请完成交接后另行终止合同。"
            style={{ marginBottom: 16 }}
          />
        ) : null}
        <Form form={form} layout="vertical" preserve={false}>
          {action === 'RENEW_APPROVE' ? (
            <>
              <Alert
                type="info"
                message="将复制原合同条款生成续租草稿。草稿仍需审核、发布与双方签署。"
                style={{ marginBottom: 16 }}
              />
              <Form.Item
                name="renewalStartDate"
                label="续租开始日期"
                rules={required}
              >
                <Input type="date" />
              </Form.Item>
              <Form.Item
                name="renewalEndDate"
                label="续租结束日期"
                dependencies={['renewalStartDate']}
                rules={[
                  ...required,
                  ({ getFieldValue }) => ({
                    validator: (_, value) =>
                      value && value < getFieldValue('renewalStartDate')
                        ? Promise.reject(new Error('结束日期不能早于开始日期'))
                        : Promise.resolve(),
                  }),
                ]}
              >
                <Input type="date" />
              </Form.Item>
              <Form.Item
                name="monthlyRent"
                label="续租月租金（元）"
                rules={required}
              >
                <InputNumber min={0.01} max={99999999.99} precision={2} />
              </Form.Item>
              <Form.Item name="deposit" label="续租押金（元）" rules={required}>
                <InputNumber min={0} max={99999999.99} precision={2} />
              </Form.Item>
            </>
          ) : null}
          <Form.Item
            name="reason"
            label="处理说明"
            rules={
              action === 'PUBLISH' ? [] : [...required, { whitespace: true }]
            }
          >
            <Input.TextArea rows={3} maxLength={1000} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export function LeaseReminderSettings() {
  const { hasPermission } = useAccess();
  const [form] = Form.useForm<LeaseSettings>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    queryLeaseSettings()
      .then((r) => {
        if (alive) form.setFieldsValue(r.data);
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [form, revision]);
  const save = async () => {
    let values: LeaseSettings;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      await updateLeaseSettings(values);
      message.success('到期提醒设置已保存');
    } catch {
      /* 全局请求层显示错误 */
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <Spin />;
  if (failed)
    return (
      <Alert
        type="error"
        message="提醒设置加载失败"
        action={<Button onClick={() => setRevision((v) => v + 1)}>重试</Button>}
      />
    );
  return (
    <>
      <Alert
        type="info"
        message="合同到期提醒通过小程序站内通知发送给双方。当前未配置合同专用微信订阅模板，微信服务通知不在本设置范围内。"
        style={{ marginBottom: 20 }}
      />
      <Form
        form={form}
        layout="vertical"
        style={{ maxWidth: 600 }}
        disabled={!hasPermission('system:property:lease:update')}
      >
        <Form.Item
          name="remindersEnabled"
          label="站内到期提醒"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          name="reminderDays"
          label="提前提醒天数"
          rules={[
            {
              required: true,
              type: 'array',
              min: 1,
              message: '至少选择一个提醒时间',
            },
          ]}
          extra="0 表示到期当天。相同合同、相同提醒节点只发送一次。"
        >
          <Select
            mode="multiple"
            options={[90, 60, 30, 15, 7, 3, 1, 0].map((value) => ({
              value,
              label: value === 0 ? '到期当天' : `提前 ${value} 天`,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="renewalWindowDays"
          label="允许提前申请续租的天数"
          rules={required}
        >
          <InputNumber min={1} max={365} precision={0} />
        </Form.Item>
        <Button type="primary" loading={saving} onClick={() => void save()}>
          保存提醒设置
        </Button>
      </Form>
    </>
  );
}

export default function LeasesPage() {
  const { hasPermission } = useAccess();
  const table = useRef<ActionType | undefined>(undefined);
  const [selected, setSelected] = useState<string>();
  const [creating, setCreating] = useState(false);
  const columns: ProColumns<LeaseDetail>[] = [
    {
      title: '搜索',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '合同标题、编号或房源' },
    },
    { title: '合同编号', dataIndex: 'id', hideInSearch: true, copyable: true },
    { title: '合同标题', dataIndex: 'title', hideInSearch: true },
    { title: '房源', dataIndex: 'propertyTitle', hideInSearch: true },
    { title: '承租方', dataIndex: 'tenantName', hideInSearch: true },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: Object.fromEntries(
        Object.entries(leaseStatusLabels).map(([key, text]) => [key, { text }]),
      ),
    },
    {
      title: '临期筛选',
      dataIndex: 'expiringDays',
      hideInTable: true,
      valueType: 'select',
      valueEnum: { 7: '7天内到期', 30: '30天内到期', 90: '90天内到期' },
    },
    { title: '租期结束', dataIndex: 'endDate', hideInSearch: true },
    {
      title: '续租申请',
      dataIndex: 'renewalStatus',
      valueType: 'select',
      valueEnum: Object.fromEntries(
        Object.entries(renewalLabels).map(([key, text]) => [key, { text }]),
      ),
      render: (_, r) => (
        <Tag color={r.renewalStatus === 'PENDING' ? 'orange' : undefined}>
          {renewalLabels[r.renewalStatus]}
        </Tag>
      ),
    },
    {
      title: '退租申请',
      dataIndex: 'moveOutStatus',
      valueType: 'select',
      valueEnum: Object.fromEntries(
        Object.entries(moveOutLabels).map(([key, text]) => [key, { text }]),
      ),
      render: (_, r) => moveOutLabels[r.moveOutStatus],
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, r) => (
        <Button type="link" onClick={() => setSelected(r.id)}>
          查看与处理
        </Button>
      ),
    },
  ];
  return (
    <PageContainer>
      <Tabs
        items={[
          {
            key: 'leases',
            label: '合同与续租',
            children: (
              <ProTable<LeaseDetail>
                rowKey="id"
                actionRef={table}
                columns={columns}
                pagination={{ defaultPageSize: 10 }}
                request={async ({ current, pageSize, ...params }) => {
                  const result = await queryLeases({
                    ...params,
                    page: current || 1,
                    size: pageSize || 10,
                  });
                  return {
                    data: result.data.list,
                    total: result.data.total,
                    success: true,
                  };
                }}
                toolBarRender={() =>
                  hasPermission('system:property:lease:create')
                    ? [
                        <Button
                          key="create"
                          type="primary"
                          onClick={() => setCreating(true)}
                        >
                          创建合同草稿
                        </Button>,
                      ]
                    : []
                }
              />
            ),
          },
          {
            key: 'settings',
            label: '到期提醒设置',
            children: <LeaseReminderSettings />,
          },
          {
            key: 'reminders',
            label: '提醒记录',
            children: (
              <ProTable<LeaseReminder>
                rowKey="id"
                search={false}
                pagination={{ defaultPageSize: 10 }}
                columns={[
                  { title: '合同编号', dataIndex: 'leaseId' },
                  { title: '合同标题', dataIndex: 'title' },
                  { title: '提前天数', dataIndex: 'thresholdDays' },
                  { title: '租期结束', dataIndex: 'endDate' },
                  {
                    title: '发送状态',
                    dataIndex: 'state',
                    render: (_, r) =>
                      r.state === 'SENT' ? '站内通知已发送' : r.state,
                  },
                  { title: '发送时间', dataIndex: 'createTime' },
                ]}
                request={async ({ current, pageSize }) => {
                  const result = await queryLeaseReminders({
                    page: current || 1,
                    size: pageSize || 10,
                  });
                  return {
                    data: result.data.list,
                    total: result.data.total,
                    success: true,
                  };
                }}
              />
            ),
          },
        ]}
      />
      {creating ? (
        <LeaseEditor
          onClose={() => setCreating(false)}
          onSaved={() => table.current?.reload()}
        />
      ) : null}
      {selected ? (
        <LeaseDetailDrawer
          key={selected}
          id={selected}
          onClose={() => setSelected(undefined)}
          onChanged={() => table.current?.reload()}
          onOpenLease={setSelected}
        />
      ) : null}
    </PageContainer>
  );
}
