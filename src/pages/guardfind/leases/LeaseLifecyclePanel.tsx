import {
  Alert,
  Button,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import DateInput from '@/components/DateInput';
import { useAccess } from '@/hooks/useAccess';

type LeaseDetail = import('@/services/web/guardfind/leases').LeaseDetail;

import {
  actOnLeaseBill,
  actOnLeaseDocument,
  billLabels,
  createLeaseBill,
  createLeaseDocument,
  documentLabels,
  documentStateLabels,
  generateLeaseBills,
  queryLeaseFile,
  queryLeaseLifecycle,
  uploadLeaseFile,
} from '@/services/web/guardfind/leaseLifecycle';

type BillInput = import('@/services/web/guardfind/leaseLifecycle').BillInput;
type DocumentInput =
  import('@/services/web/guardfind/leaseLifecycle').DocumentInput;
type LeaseBill = import('@/services/web/guardfind/leaseLifecycle').LeaseBill;
type LeaseDocument =
  import('@/services/web/guardfind/leaseLifecycle').LeaseDocument;
type LeaseLifecycle =
  import('@/services/web/guardfind/leaseLifecycle').LeaseLifecycle;
type ScheduleInput =
  import('@/services/web/guardfind/leaseLifecycle').ScheduleInput;

import { reopenLeaseProperty } from '@/services/web/guardfind/leaseLifecycle';

type Editor = {
  mode:
    | 'bill'
    | 'generate'
    | 'CHECK_IN'
    | 'CHECK_OUT'
    | 'SETTLEMENT'
    | 'billAction'
    | 'documentAction'
    | 'reopen';
  title: string;
  id?: string;
  version?: number;
  action?: string;
};
type Values = Partial<
  Omit<BillInput, 'kind'> & ScheduleInput & Omit<DocumentInput, 'kind'>
> & {
  kind?: BillInput['kind'];
  reason?: string;
  reference?: string;
  paidDate?: string;
};
const required = [{ required: true, message: '请填写此项' }];
const money = (value?: number) => Number(value || 0).toFixed(2);

export default function LeaseLifecyclePanel({
  lease,
  onChanged,
}: {
  lease: LeaseDetail;
  onChanged: () => void;
}) {
  const { hasPermission } = useAccess();
  const editable = hasPermission('system:property:lease:update');
  const [data, setData] = useState<LeaseLifecycle>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<Editor>();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [preview, setPreview] = useState('');
  const [form] = Form.useForm<Values>();
  const epoch = useRef(0);
  const busy = useRef(false);
  const uploadBusy = useRef(false);
  useEffect(() => {
    const current = ++epoch.current;
    busy.current = false;
    uploadBusy.current = false;
    setSaving(false);
    setUploading(false);
    setLoading(true);
    setData(undefined);
    setError('');
    setEditor(undefined);
    setPreview('');
    setPhotos([]);
    queryLeaseLifecycle(lease.id)
      .then((response) => {
        if (current === epoch.current) setData(response.data);
      })
      .catch(() => {
        if (current === epoch.current)
          setError('账单和交接记录加载失败，请重试');
      })
      .finally(() => {
        if (current === epoch.current) setLoading(false);
      });
    return () => {
      epoch.current++;
    };
  }, [lease.id, lease.version, revision]);
  const open = (value: Editor) => {
    if (busy.current || uploading) return;
    form.resetFields();
    form.setFieldsValue({
      kind: 'RENT',
      periodStart: lease.startDate,
      periodEnd: lease.endDate,
      dueDate: lease.startDate,
      amount: lease.monthlyRent,
      cycleMonths: 1,
      dueDaysBefore: 0,
      includeDeposit: Number(lease.deposit) > 0,
      date: dayjs().format('YYYY-MM-DD'),
      paidDate: dayjs().format('YYYY-MM-DD'),
      keys: 0,
      deductions: [],
    });
    setPhotos([]);
    setError('');
    setEditor(value);
  };
  const save = async () => {
    if (!editor || busy.current || uploading) return;
    const current = epoch.current;
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      const values = await form.validateFields();
      if (current !== epoch.current) return;
      if (editor.mode === 'bill')
        await createLeaseBill(lease.id, values as BillInput);
      else if (editor.mode === 'reopen') await reopenLeaseProperty(lease.id);
      else if (editor.mode === 'generate')
        await generateLeaseBills(lease.id, values as ScheduleInput);
      else if (editor.mode === 'billAction')
        await actOnLeaseBill(lease.id, editor.id!, {
          action: editor.action!,
          version: editor.version!,
          reason: values.reason,
        });
      else if (editor.mode === 'documentAction')
        await actOnLeaseDocument(lease.id, editor.id!, {
          action: editor.action!,
          version: editor.version!,
          reason: values.reason,
          reference: values.reference,
          paidDate: values.paidDate,
        });
      else
        await createLeaseDocument(lease.id, {
          ...values,
          kind: editor.mode,
          photos,
        } as DocumentInput);
      if (current !== epoch.current) return;
      setEditor(undefined);
      setRevision((value) => value + 1);
      onChanged();
    } catch (failure) {
      if (
        current === epoch.current &&
        !(failure && typeof failure === 'object' && 'errorFields' in failure)
      )
        setError(
          failure instanceof Error
            ? failure.message
            : '提交失败，请核对状态后重试',
        );
    } finally {
      if (current === epoch.current) {
        busy.current = false;
        setSaving(false);
      }
    }
  };
  const viewPhoto = async (id: string) => {
    const current = epoch.current;
    try {
      const result = await queryLeaseFile(lease.id, id);
      if (current === epoch.current)
        setPreview(`data:${result.data.mimeType};base64,${result.data.data}`);
    } catch {
      if (current === epoch.current) setError('照片加载失败');
    }
  };
  const billActions = (bill: LeaseBill) =>
    !editable ? null : (
      <Space wrap>
        {bill.status === 'PENDING_CONFIRMATION' ? (
          <>
            <Button
              onClick={() =>
                open({
                  mode: 'billAction',
                  id: bill.id,
                  version: bill.version,
                  action: 'CONFIRM',
                  title: `确认实际收到 ¥${money(bill.amount)}`,
                })
              }
            >
              确认收款
            </Button>
            <Button
              onClick={() =>
                open({
                  mode: 'billAction',
                  id: bill.id,
                  version: bill.version,
                  action: 'REJECT',
                  title: '退回付款登记',
                })
              }
            >
              退回登记
            </Button>
          </>
        ) : null}
        {['UNPAID', 'OVERDUE'].includes(bill.status) ? (
          <Button
            danger
            onClick={() =>
              open({
                mode: 'billAction',
                id: bill.id,
                version: bill.version,
                action: 'VOID',
                title: '作废账单',
              })
            }
          >
            作废
          </Button>
        ) : null}
      </Space>
    );
  const renderDocument = (doc: LeaseDocument) => (
    <section
      key={doc.id}
      style={{
        padding: '20px 0',
        borderBottom: '1px solid var(--ant-color-border, #ddd)',
      }}
    >
      <Space wrap>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {documentLabels[doc.kind]}
        </Typography.Title>
        <Tag>{documentStateLabels[doc.status]}</Tag>
      </Space>
      <Descriptions
        size="small"
        column={1}
        style={{ marginTop: 12 }}
        items={[
          { key: 'date', label: '实际日期', children: doc.content.date },
          ...(doc.kind === 'SETTLEMENT'
            ? [
                {
                  key: 'held',
                  label: '已确认实收押金',
                  children: `¥${money(doc.content.depositHeld)}`,
                },
                {
                  key: 'deductions',
                  label: '扣款明细',
                  children: (
                    <div style={{ whiteSpace: 'pre-line' }}>
                      {(doc.content.deductions || [])
                        .map((item) => `${item.title}：¥${money(item.amount)}`)
                        .join('\n')}
                    </div>
                  ),
                },
                {
                  key: 'refund',
                  label: '应退押金',
                  children: <strong>¥{money(doc.content.refundAmount)}</strong>,
                },
                {
                  key: 'ref',
                  label: '退款登记',
                  children: doc.refundReference
                    ? `${doc.refundDate} · ${doc.refundReference}`
                    : '未登记',
                },
              ]
            : [
                {
                  key: 'inventory',
                  label: '物品清单',
                  children: (
                    <span style={{ whiteSpace: 'pre-wrap' }}>
                      {doc.content.inventory}
                    </span>
                  ),
                },
                {
                  key: 'condition',
                  label: '房屋现状',
                  children: (
                    <span style={{ whiteSpace: 'pre-wrap' }}>
                      {doc.content.condition}
                    </span>
                  ),
                },
                {
                  key: 'meter',
                  label: '表读数',
                  children: `水 ${doc.content.water} · 电 ${doc.content.electricity} · 燃气 ${doc.content.gas}`,
                },
                { key: 'keys', label: '钥匙数量', children: doc.content.keys },
              ]),
          {
            key: 'note',
            label: '说明',
            children: (
              <span style={{ whiteSpace: 'pre-wrap' }}>{doc.content.note}</span>
            ),
          },
          {
            key: 'signatures',
            label: '双方确认',
            children: `承租人：${doc.tenantConfirmedAt || '未确认'}；出租人：${doc.landlordConfirmedAt || '未确认'}`,
          },
        ]}
      />
      <Space wrap>
        {doc.content.photos?.map((id, index) => (
          <Button key={id} onClick={() => void viewPhoto(id)}>
            照片 {index + 1}
          </Button>
        ))}
      </Space>
      {editable ? (
        <Space wrap style={{ marginTop: 12, display: 'flex' }}>
          {['PENDING', 'DISPUTED'].includes(doc.status) ? (
            <Button
              danger
              onClick={() =>
                open({
                  mode: 'documentAction',
                  id: doc.id,
                  version: doc.version,
                  action: 'VOID',
                  title: '作废记录并重新核实',
                })
              }
            >
              作废记录
            </Button>
          ) : null}
          {doc.status === 'REFUND_PENDING' ? (
            <Button
              onClick={() =>
                open({
                  mode: 'documentAction',
                  id: doc.id,
                  version: doc.version,
                  action: 'REFUND',
                  title: `登记已退还 ¥${money(doc.content.refundAmount)}`,
                })
              }
            >
              登记退款
            </Button>
          ) : null}
        </Space>
      ) : null}
    </section>
  );
  const isDocument =
    editor && ['CHECK_IN', 'CHECK_OUT', 'SETTLEMENT'].includes(editor.mode);
  return (
    <section style={{ margin: '24px 0' }}>
      <Typography.Title level={4}>账单、交接与结算</Typography.Title>
      {error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button
              disabled={saving}
              onClick={() => setRevision((value) => value + 1)}
            >
              刷新
            </Button>
          }
          style={{ marginBottom: 12 }}
        />
      ) : null}
      {loading ? (
        <Spin />
      ) : data ? (
        <Tabs
          items={[
            {
              key: 'bills',
              label: '租金账单',
              children: (
                <>
                  <Typography.Paragraph>
                    待结清 ¥{money(data.amountDue)}（含付款待确认 ¥
                    {money(data.amountPending)}） · 已确认收款 ¥
                    {money(data.amountPaid)}
                  </Typography.Paragraph>
                  {editable ? (
                    <Space wrap style={{ marginBottom: 16 }}>
                      <Button
                        type="primary"
                        onClick={() =>
                          open({ mode: 'bill', title: '新增费用账单' })
                        }
                      >
                        新增账单
                      </Button>
                      {lease.status !== 'TERMINATED' ? (
                        <Button
                          onClick={() =>
                            open({
                              mode: 'generate',
                              title: '按合同生成租金账单',
                            })
                          }
                        >
                          生成周期账单
                        </Button>
                      ) : null}
                    </Space>
                  ) : null}
                  <Table<LeaseBill>
                    rowKey="id"
                    size="small"
                    dataSource={data.bills}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 680 }}
                    columns={[
                      {
                        title: '账单',
                        dataIndex: 'title',
                        render: (_, item) => (
                          <>
                            <div>{item.title}</div>
                            <Typography.Text type="secondary">
                              {item.periodStart} 至 {item.periodEnd}
                            </Typography.Text>
                          </>
                        ),
                      },
                      {
                        title: '金额',
                        dataIndex: 'amount',
                        render: (value) => `¥${money(value)}`,
                      },
                      { title: '应付日期', dataIndex: 'dueDate' },
                      {
                        title: '状态',
                        dataIndex: 'status',
                        render: (value: LeaseBill['status']) =>
                          billLabels[value],
                      },
                      {
                        title: '付款记录',
                        render: (_, item) => (
                          <>
                            <div>{item.paymentReference || '—'}</div>
                            {item.paymentFileId ? (
                              <Button
                                type="link"
                                onClick={() =>
                                  void viewPhoto(item.paymentFileId!)
                                }
                              >
                                查看照片
                              </Button>
                            ) : null}
                          </>
                        ),
                      },
                      { title: '操作', render: (_, item) => billActions(item) },
                    ]}
                  />
                </>
              ),
            },
            {
              key: 'handover',
              label: '入住与退租交接',
              children: (
                <>
                  {editable ? (
                    <Space wrap>
                      <Button
                        onClick={() =>
                          open({ mode: 'CHECK_IN', title: '发起入住交接确认' })
                        }
                      >
                        填写入住交接
                      </Button>
                      <Button
                        onClick={() =>
                          open({ mode: 'CHECK_OUT', title: '发起退租交接确认' })
                        }
                      >
                        填写退租交接
                      </Button>
                    </Space>
                  ) : null}
                  {data.documents
                    .filter((doc) => doc.kind !== 'SETTLEMENT')
                    .map(renderDocument)}
                  {!data.documents.some((doc) => doc.kind !== 'SETTLEMENT') ? (
                    <Typography.Paragraph style={{ marginTop: 16 }}>
                      暂无交接记录。现场核对后填写清单，由双方在小程序确认。
                    </Typography.Paragraph>
                  ) : null}
                </>
              ),
            },
            {
              key: 'settlement',
              label: '押金结算',
              children: (
                <>
                  <Alert
                    type="info"
                    message="完成双方退租交接确认、处理所有未结账单后发起。押金以确认实收为准，双方核对结算后登记退款，最后由承租人确认到账。"
                    style={{ marginBottom: 16 }}
                  />
                  {editable ? (
                    <Button
                      onClick={() =>
                        open({ mode: 'SETTLEMENT', title: '发起押金结算确认' })
                      }
                    >
                      填写押金结算
                    </Button>
                  ) : null}
                  {editable &&
                  hasPermission('system:property:status') &&
                  ['EXPIRED', 'TERMINATED'].includes(lease.status) &&
                  data.documents.some(
                    (doc) =>
                      doc.kind === 'SETTLEMENT' && doc.status === 'CLOSED',
                  ) ? (
                    <Button
                      style={{ marginLeft: 8 }}
                      onClick={() =>
                        open({
                          mode: 'reopen',
                          title: '确认房源已交接完毕并重新开放接待',
                        })
                      }
                    >
                      确认重新开放房源
                    </Button>
                  ) : null}
                  {data.documents
                    .filter((doc) => doc.kind === 'SETTLEMENT')
                    .map(renderDocument)}
                </>
              ),
            },
          ]}
        />
      ) : null}
      <Modal
        open={Boolean(editor)}
        title={editor?.title}
        onCancel={() => {
          if (!saving && !uploading) setEditor(undefined);
        }}
        onOk={() => void save()}
        confirmLoading={saving || uploading}
        maskClosable={false}
        destroyOnHidden
        width={720}
        okText="核对并提交"
      >
        {error ? (
          <Alert type="error" message={error} style={{ marginBottom: 16 }} />
        ) : null}
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          disabled={saving || uploading}
        >
          {editor?.mode === 'generate' ? (
            <>
              <Alert
                type="info"
                message={`租期 ${lease.startDate} 至 ${lease.endDate}，月租 ¥${money(lease.monthlyRent)}。按起租日逐月计算，末期不足整月按实际天数比例计费。请核对合同约定；特殊计费可逐笔新增账单。`}
                style={{ marginBottom: 16 }}
              />
              <Form.Item name="cycleMonths" label="付款周期" rules={required}>
                <Select
                  options={[1, 3, 6, 12].map((value) => ({
                    value,
                    label: `每${value}个月`,
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="dueDaysBefore"
                label="每期开始前几天缴费"
                rules={required}
              >
                <InputNumber min={0} max={30} precision={0} />
              </Form.Item>
              <Form.Item
                name="includeDeposit"
                label="同时生成合同押金账单"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </>
          ) : null}
          {editor?.mode === 'bill' ? (
            <>
              <Form.Item name="kind" label="费用类型" rules={required}>
                <Select
                  options={[
                    { value: 'RENT', label: '租金' },
                    { value: 'DEPOSIT', label: '押金' },
                    { value: 'OTHER', label: '其他费用' },
                  ]}
                />
              </Form.Item>
              <Form.Item name="title" label="费用名称与依据" rules={required}>
                <Input maxLength={200} />
              </Form.Item>
              <Form.Item name="amount" label="应付金额（元）" rules={required}>
                <InputNumber min={0.01} max={9999999999.99} precision={2} />
              </Form.Item>
              <Form.Item
                name="periodStart"
                label="费用期间开始"
                rules={required}
              >
                <DateInput />
              </Form.Item>
              <Form.Item name="periodEnd" label="费用期间结束" rules={required}>
                <DateInput />
              </Form.Item>
              <Form.Item name="dueDate" label="应付日期" rules={required}>
                <DateInput />
              </Form.Item>
            </>
          ) : null}
          {isDocument ? (
            <>
              <Form.Item
                name="date"
                label="实际交接或结算日期"
                rules={required}
              >
                <DateInput max={dayjs().format('YYYY-MM-DD')} />
              </Form.Item>
              {editor?.mode !== 'SETTLEMENT' ? (
                <>
                  <Form.Item
                    name="inventory"
                    label="家具、家电及物品清单"
                    rules={required}
                  >
                    <Input.TextArea rows={3} maxLength={5000} />
                  </Form.Item>
                  <Form.Item
                    name="condition"
                    label="房屋现状、损坏与责任说明"
                    rules={required}
                  >
                    <Input.TextArea rows={3} maxLength={5000} />
                  </Form.Item>
                  <Space wrap>
                    {(['water', 'electricity', 'gas'] as const).map(
                      (name, index) => (
                        <Form.Item
                          key={name}
                          name={name}
                          label={['水表读数', '电表读数', '燃气表读数'][index]}
                        >
                          <Input
                            inputMode="decimal"
                            placeholder="无此表可留空"
                          />
                        </Form.Item>
                      ),
                    )}
                  </Space>
                  <Form.Item name="keys" label="钥匙数量" rules={required}>
                    <InputNumber min={0} max={100} precision={0} />
                  </Form.Item>
                </>
              ) : (
                <Form.List name="deductions">
                  {(fields, { add, remove }) => (
                    <>
                      <Typography.Paragraph>
                        扣款须逐项说明。无扣款可留空；应退金额按实收押金自动计算。
                      </Typography.Paragraph>
                      {fields.map((field) => (
                        <Space key={field.key} align="baseline" wrap>
                          <Form.Item
                            name={[field.name, 'title']}
                            label="扣款项目及原因"
                            rules={required}
                          >
                            <Input maxLength={200} />
                          </Form.Item>
                          <Form.Item
                            name={[field.name, 'amount']}
                            label="金额（元）"
                            rules={required}
                          >
                            <InputNumber
                              min={0.01}
                              max={9999999999.99}
                              precision={2}
                            />
                          </Form.Item>
                          <Button onClick={() => remove(field.name)}>
                            删除此项
                          </Button>
                        </Space>
                      ))}
                      <Button
                        disabled={fields.length >= 30}
                        onClick={() => add()}
                      >
                        增加扣款明细
                      </Button>
                    </>
                  )}
                </Form.List>
              )}
              <Form.Item
                name="note"
                label="双方需核对的说明"
                rules={required}
                style={{ marginTop: 16 }}
              >
                <Input.TextArea rows={3} maxLength={2000} />
              </Form.Item>
              <Upload
                accept="image/png,image/jpeg"
                showUploadList={false}
                beforeUpload={async (file) => {
                  if (
                    uploadBusy.current ||
                    photos.length >= 8 ||
                    file.size > 2 * 1024 * 1024
                  ) {
                    setError('最多8张照片，每张不超过2MB');
                    return false;
                  }
                  const current = epoch.current;
                  uploadBusy.current = true;
                  setUploading(true);
                  try {
                    const result = await uploadLeaseFile(lease.id, file);
                    if (current === epoch.current)
                      setPhotos((old) => [...old, result.data.id]);
                  } catch {
                    if (current === epoch.current)
                      setError('照片上传失败，请重试');
                  } finally {
                    if (current === epoch.current) {
                      uploadBusy.current = false;
                      setUploading(false);
                    }
                  }
                  return false;
                }}
              >
                <Button
                  loading={uploading}
                  disabled={saving || photos.length >= 8}
                >
                  上传现场照片（选填）
                </Button>
              </Upload>
              <Space wrap style={{ marginTop: 12 }}>
                {photos.map((photo, index) => (
                  <Button
                    key={photo}
                    disabled={saving || uploading}
                    onClick={() =>
                      setPhotos((old) => old.filter((id) => id !== photo))
                    }
                  >
                    照片 {index + 1} · 移除
                  </Button>
                ))}
              </Space>
            </>
          ) : null}
          {editor?.action === 'REFUND' ? (
            <>
              <Form.Item name="paidDate" label="实际退款日期" rules={required}>
                <DateInput max={dayjs().format('YYYY-MM-DD')} />
              </Form.Item>
              <Form.Item
                name="reference"
                label="退款流水号或说明"
                rules={required}
              >
                <Input.TextArea maxLength={1000} rows={3} />
              </Form.Item>
            </>
          ) : null}
          {editor && ['REJECT', 'VOID'].includes(editor.action || '') ? (
            <Form.Item name="reason" label="处理原因" rules={required}>
              <Input.TextArea maxLength={500} rows={3} />
            </Form.Item>
          ) : null}
          {editor?.action === 'CONFIRM' ? (
            <Alert
              type="warning"
              message="请核实银行或线下收款记录后确认。确认后该账单计入实收金额。"
            />
          ) : null}
          {editor?.mode === 'reopen' ? (
            <Alert
              type="warning"
              message="确认现场退租交接及押金结算已完成。系统会检查其他租约，恢复该房源的新预约接待。已有预约仍需逐笔处理。"
            />
          ) : null}
        </Form>
      </Modal>
      <Modal
        open={Boolean(preview)}
        footer={null}
        title="合同附件照片"
        onCancel={() => setPreview('')}
      >
        <img
          src={preview || undefined}
          alt="合同附件"
          style={{ width: '100%' }}
        />
      </Modal>
    </section>
  );
}
