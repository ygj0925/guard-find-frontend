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
  Steps,
  Switch,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import DateInput from '@/components/DateInput';
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
  queryLeasePdf,
  queryLeaseProperties,
  queryLeaseReminders,
  queryLeaseSettings,
  queryLeases,
  renewalLabels,
  updateLease,
  updateLeaseSettings,
} from '@/services/web/guardfind/leases';
import IdentityVerificationPanel from './IdentityVerificationPanel';
import styles from './index.less';
import LeaseContractPreview, { SigningProgress } from './LeaseContractPreview';
import LeaseLifecyclePanel from './LeaseLifecyclePanel';
import LeaseReviewPanel from './LeaseReviewPanel';

const actionLabels: Record<LeaseAction, string> = {
  PUBLISH: '发布待签合同',
  RECALL: '撤回修改',
  REMIND_SIGN: '提醒未签方',
  VOID: '作废合同',
  TERMINATE: '终止合同',
  RENEW_APPROVE: '同意续租并生成草稿',
  RENEW_REJECT: '拒绝续租',
  MOVE_OUT_RESOLVE: '处理退租申请',
};
const logLabels: Record<string, string> = {
  REVIEW_CREATE: '提出审阅意见',
  REVIEW_REPLY: '回复审阅意见',
  REVIEW_CONFIRM: '确认意见已解决',
  REVIEW_REOPEN: '继续反馈审阅意见',
  BILL_CREATE: '创建费用账单',
  BILL_GENERATE: '生成周期账单',
  BILL_SUBMIT: '登记线下付款',
  BILL_WITHDRAW: '撤回付款登记',
  BILL_CONFIRM: '确认收到款项',
  BILL_REJECT: '退回付款登记',
  BILL_VOID: '作废费用账单',
  CHECK_IN_CREATE: '发起入住交接',
  CHECK_IN_CONFIRM: '确认入住交接',
  CHECK_IN_DISPUTE: '入住交接异议',
  CHECK_IN_VOID: '作废入住交接',
  CHECK_OUT_CREATE: '发起退租交接',
  CHECK_OUT_CONFIRM: '确认退租交接',
  CHECK_OUT_DISPUTE: '退租交接异议',
  CHECK_OUT_VOID: '作废退租交接',
  SETTLEMENT_CREATE: '发起押金结算',
  SETTLEMENT_CONFIRM: '确认押金结算',
  SETTLEMENT_DISPUTE: '押金结算异议',
  SETTLEMENT_VOID: '作废押金结算',
  SETTLEMENT_REFUND: '登记押金退款',
  SETTLEMENT_RECEIVED: '承租人确认押金到账',
  PROPERTY_REOPEN: '确认房源重新开放',
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
  SIGNING_EXPIRED: '签署超时失效',
  MOVE_OUT_CANCEL: '撤回退租意向',
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
  const [preview, setPreview] = useState(false);
  const [property, setProperty] = useState<LeasePropertyOption>();
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
      width={960}
      style={{ top: 24 }}
      styles={{
        body: {
          maxHeight: 'calc(100dvh - 170px)',
          overflowY: 'auto',
          paddingRight: 8,
        },
      }}
      onCancel={() => !saving && onClose()}
      cancelButtonProps={{ disabled: saving }}
      closable={!saving}
      onOk={() => void save()}
      okText="保存合同草稿"
      confirmLoading={saving}
      maskClosable={false}
    >
      <Alert
        type="info"
        showIcon
        message="保存草稿后可预览完整合同。发送签署后，由出租方与承租方分别阅读、核对信息并手写签名。"
        style={{ marginBottom: 16 }}
      />
      <Button onClick={() => setPreview(true)} style={{ marginBottom: 8 }}>
        预览完整合同
      </Button>
      <Form
        form={form}
        layout="vertical"
        initialValues={initial}
        disabled={saving}
      >
        <div className={styles.editorSection}>01 · 房源与合同</div>
        <Form.Item name="propertyId" label="出租房源" rules={required}>
          <SearchSelect
            kind="property"
            disabled={Boolean(record)}
            initial={
              record
                ? { value: record.propertyId, label: record.propertyTitle }
                : undefined
            }
            onProperty={(p) => {
              setProperty(p);
              form.setFieldsValue({ landlordId: p.userId || undefined });
            }}
          />
        </Form.Item>
        <Form.Item
          name="title"
          label="合同标题"
          rules={[...required, { whitespace: true }, { max: 200 }]}
        >
          <Input maxLength={200} />
        </Form.Item>
        <div className={styles.editorSection}>02 · 签约双方</div>
        <div className={styles.editorGrid}>
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
        </div>
        <div className={styles.editorGrid}>
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
        </div>
        <div className={styles.editorSection}>03 · 租期与费用</div>
        <div className={styles.editorGrid}>
          <Form.Item name="startDate" label="起租日期" rules={required}>
            <DateInput />
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
            <DateInput />
          </Form.Item>
          <Form.Item name="monthlyRent" label="月租金（元）" rules={required}>
            <InputNumber
              min={0.01}
              max={99999999.99}
              precision={2}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item name="deposit" label="押金（元）" rules={required}>
            <InputNumber
              min={0}
              max={99999999.99}
              precision={2}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </div>
        <div className={styles.editorSection}>04 · 合同正文</div>
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
      <Drawer
        open={preview}
        title="合同预览 · 保存后发送双方签署"
        width={920}
        onClose={() => setPreview(false)}
      >
        {preview ? (
          <LeaseContractPreview
            lease={{
              ...record,
              ...form.getFieldsValue(true),
              propertyTitle: property?.title || record?.propertyTitle,
              propertyAddress: property?.address || record?.propertyAddress,
              status: 'DRAFT',
            }}
          />
        ) : null}
      </Drawer>
    </Modal>
  );
}

function savePdf(file: { filename: string; base64: string }) {
  const bytes = Uint8Array.from(atob(file.base64), (char) =>
    char.charCodeAt(0),
  );
  const url = URL.createObjectURL(
    new Blob([bytes], { type: 'application/pdf' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = file.filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
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
  const [downloading, setDownloading] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const result = await queryLeasePdf(id);
      if (alive.current) savePdf(result.data);
    } catch {
      /* 统一请求层显示错误 */
    } finally {
      if (alive.current) setDownloading(false);
    }
  };
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
      detail.status === 'PENDING_SIGNATURE' &&
      hasPermission('system:property:lease:publish')
    ) {
      available.push('REMIND_SIGN');
      if (!detail.tenantSignedAt && !detail.landlordSignedAt)
        available.push('RECALL');
    }
    if (
      detail.status === 'DRAFT' &&
      hasPermission('system:property:lease:publish')
    )
      available.push('PUBLISH');
    if (
      ['DRAFT', 'PENDING_SIGNATURE', 'SIGNING_EXPIRED'].includes(
        detail.status,
      ) &&
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
      <Drawer title="合同工作台" open width={1080} onClose={onClose}>
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
            <div className={styles.detailHeader}>
              <Tag
                color={
                  detail.status === 'SIGNED'
                    ? 'success'
                    : detail.status === 'PENDING_SIGNATURE'
                      ? 'processing'
                      : 'default'
                }
              >
                {leaseStatusLabels[detail.status]}
              </Tag>
              <h2>{detail.title}</h2>
              <p>
                {detail.propertyTitle} · {detail.propertyAddress}
              </p>
            </div>
            <Space wrap style={{ marginBottom: 16 }}>
              {detail.status === 'DRAFT' &&
              hasPermission('system:property:lease:update') ? (
                <Button onClick={() => setEditing(true)}>编辑草稿</Button>
              ) : null}
              {available.map((item) => (
                <Button
                  key={item}
                  type={item === 'PUBLISH' ? 'primary' : 'default'}
                  danger={item === 'VOID' || item === 'TERMINATE'}
                  onClick={() => openAction(item)}
                >
                  {actionLabels[item]}
                </Button>
              ))}
              <Button loading={downloading} onClick={() => void download()}>
                下载合同 PDF
              </Button>
              <Button onClick={() => setRevision((v) => v + 1)}>刷新</Button>
            </Space>
            <Alert
              type="info"
              message="双方签署前可撤回修改；已有签名时正文锁定。续租生成新合同，双方需重新手写签署。"
              style={{ marginBottom: 16 }}
            />
            <SigningProgress lease={detail} />
            <Tabs
              defaultActiveKey="contract"
              items={[
                {
                  key: 'contract',
                  label: '合同正文与签署',
                  children: <LeaseContractPreview lease={detail} />,
                },
                {
                  key: 'review',
                  label: `合同审阅${detail.unresolvedReviews ? ` (${detail.unresolvedReviews})` : ''}`,
                  children: (
                    <LeaseReviewPanel lease={detail} onChanged={changed} />
                  ),
                },
                {
                  key: 'details',
                  label: '租约信息与申请',
                  children: (
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
                          key: 'deadline',
                          label: '签署截止时间',
                          children: detail.signatureDeadline || '发布时确定',
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
                  ),
                },
                ...(['SIGNED', 'EXPIRED', 'TERMINATED'].includes(detail.status)
                  ? [
                      {
                        key: 'lifecycle',
                        label: '账单、交接与结算',
                        children: (
                          <LeaseLifecyclePanel
                            lease={detail}
                            onChanged={changed}
                          />
                        ),
                      },
                    ]
                  : []),
                {
                  key: 'logs',
                  label: '处理记录',
                  children: (
                    <Timeline
                      items={(detail.logs || []).map((log) => ({
                        key: log.id,
                        children: (
                          <>
                            <div>
                              {log.createTime} ·{' '}
                              {logLabels[log.action] || log.action} ·{' '}
                              {{
                                ADMIN: '管理员',
                                TENANT: '承租方',
                                LANDLORD: '出租方',
                                SYSTEM: '系统',
                              }[log.actorType] || log.actorType}
                            </div>
                            <div>{log.reason}</div>
                          </>
                        ),
                      }))}
                    />
                  ),
                },
              ]}
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
        {action === 'RECALL' ? (
          <Alert
            type="warning"
            message="仅双方均未签署时可以撤回。撤回后将停止本次签约，修改完成需重新发送。"
            style={{ marginBottom: 16 }}
          />
        ) : null}
        {action === 'REMIND_SIGN' ? (
          <Alert
            type="info"
            message="向尚未签署的一方发送站内提醒，10分钟内不重复发送，不延长签署期限。"
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
                <DateInput />
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
                <DateInput />
              </Form.Item>
              <Form.Item
                name="monthlyRent"
                label="续租月租金（元）"
                rules={required}
              >
                <InputNumber
                  min={0.01}
                  max={99999999.99}
                  precision={2}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item name="deposit" label="续租押金（元）" rules={required}>
                <InputNumber
                  min={0}
                  max={99999999.99}
                  precision={2}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </>
          ) : null}
          <Form.Item
            name="reason"
            label="处理说明"
            rules={
              ['PUBLISH', 'REMIND_SIGN'].includes(action || '')
                ? []
                : [...required, { whitespace: true }]
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
          name="signatureWindowDays"
          label="发布后签署有效天数"
          initialValue={7}
          rules={required}
          extra="1至90天，最晚不超过租期结束日。仅影响以后发布的合同；关闭到期提醒仍会处理签署超时。"
        >
          <InputNumber min={1} max={90} precision={0} />
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
  const [queue, setQueue] = useState('all');
  const queues: Record<string, Record<string, unknown>> = {
    all: {},
    draft: { status: 'DRAFT' },
    signing: { status: 'PENDING_SIGNATURE' },
    review: { status: 'REVIEW_PENDING' },
    signed: { status: 'SIGNED' },
    renewal: { renewalStatus: 'PENDING' },
    moveout: { moveOutStatus: 'PENDING' },
    expiring: { expiringDays: 30 },
  };
  const columns: ProColumns<LeaseDetail>[] = [
    {
      title: '搜索',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '合同标题、编号或房源' },
    },
    {
      title: '房源与合同',
      dataIndex: 'title',
      hideInSearch: true,
      width: 260,
      render: (_, row) => (
        <>
          <div className={styles.rowTitle}>{row.propertyTitle}</div>
          <div>{row.title}</div>
          <Typography.Text copyable className={styles.muted}>
            {row.id}
          </Typography.Text>
        </>
      ),
    },
    {
      title: '双方签署进度',
      key: 'signatureProgress',
      hideInSearch: true,
      width: 220,
      render: (_, row) => (
        <>
          <div>
            出租方 {row.landlordName} · {row.landlordSignedAt ? '已签' : '待签'}
          </div>
          <div>
            承租方 {row.tenantName} · {row.tenantSignedAt ? '已签' : '待签'}
          </div>
          {Boolean(row.unresolvedReviews) && (
            <Tag color="orange">{row.unresolvedReviews} 条审阅待处理</Tag>
          )}
        </>
      ),
    },
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
    {
      title: '租期 / 月租',
      dataIndex: 'endDate',
      hideInSearch: true,
      width: 205,
      render: (_, row) => (
        <>
          <div>
            {row.startDate} 至 {row.endDate}
          </div>
          <span className={styles.muted}>¥{row.monthlyRent} / 月</span>
        </>
      ),
    },
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
    <PageContainer className={styles.workspace}>
      <div className={styles.intro}>
        <div>
          <h2>合同签约与履行</h2>
          <p>从合同草稿到双方签署，集中处理租期、费用与交接。</p>
        </div>
      </div>
      <Steps
        className={styles.workflow}
        size="small"
        current={-1}
        items={['拟定合同', '发送双方', '手写签署', '履行与结算'].map(
          (title) => ({ title }),
        )}
      />
      <Tabs
        items={[
          {
            key: 'leases',
            label: '合同工作台',
            children: (
              <>
                <Tabs
                  className={styles.queue}
                  activeKey={queue}
                  onChange={setQueue}
                  items={Object.entries({
                    all: '全部合同',
                    draft: '草稿',
                    signing: '待签署',
                    review: '审阅待处理',
                    signed: '已签署',
                    renewal: '续租待审核',
                    moveout: '退租待处理',
                    expiring: '30天内到期',
                  }).map(([key, label]) => ({ key, label }))}
                />
                <ProTable<LeaseDetail>
                  params={{ queue }}
                  scroll={{ x: 1100 }}
                  rowKey="id"
                  actionRef={table}
                  columns={columns}
                  pagination={{ defaultPageSize: 10 }}
                  request={async ({
                    current,
                    pageSize,
                    queue: selectedQueue,
                    ...params
                  }) => {
                    const result = await queryLeases({
                      ...params,
                      ...queues[String(selectedQueue || 'all')],
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
              </>
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
          ...(hasPermission('system:property:identity:list') ||
          hasPermission('system:property:identity:update')
            ? [
                {
                  key: 'identity',
                  label: '实名认证',
                  children: <IdentityVerificationPanel />,
                },
              ]
            : []),
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
