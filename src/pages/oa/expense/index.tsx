/**
 * 报销管理：费用类型维护、报销台账与财务支付登记；一键生成报销表单与流程草稿。
 * 审批通过只进入“待支付”，支付由财务单独登记，实付金额必须等于报销合计。
 */
import { PlusOutlined, ThunderboltOutlined } from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  createOaExpenseCategory,
  createOaExpenseTemplate,
  getOaExpenseRecord,
  type OaExpenseCategoryVo,
  type OaExpenseDetailVo,
  type OaExpensePayMethod,
  type OaExpenseVo,
  payOaExpense,
  queryOaExpenseCategories,
  queryOaExpenseRecords,
  updateOaExpenseCategory,
} from '@/services/web/guardfind/oa';
import {
  EXPENSE_PAY_METHOD_OPTIONS,
  EXPENSE_STATUS_META,
  formatAmount,
} from '@/utils/oaExpense';
import { applicationStatusTag } from '../application/components/ApplicationStatus';
import {
  ExpenseDetailContent,
  expenseStatusTag,
} from './components/ExpenseDetail';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

type CategoryFormValues = {
  code: string;
  name: string;
  perItemLimit?: number | null;
  invoiceRequired: boolean;
  enabled: boolean;
  sort: number;
  remark?: string;
};

const CategoryTab: React.FC = () => {
  const [categories, setCategories] = useState<OaExpenseCategoryVo[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<CategoryFormValues>();
  const [editing, setEditing] = useState<OaExpenseCategoryVo | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await queryOaExpenseCategories(false);
      setCategories(response.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ invoiceRequired: false, enabled: true, sort: 0 });
    setOpen(true);
  };

  const openEdit = (record: OaExpenseCategoryVo) => {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      perItemLimit:
        record.perItemLimit == null ? null : Number(record.perItemLimit),
      invoiceRequired: record.invoiceRequired,
      enabled: record.status === 'ENABLED',
      sort: record.sort,
      remark: record.remark ?? undefined,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        perItemLimit: values.perItemLimit ?? null,
        invoiceRequired: values.invoiceRequired,
        status: values.enabled ? ('ENABLED' as const) : ('DISABLED' as const),
        sort: values.sort ?? 0,
        remark: values.remark?.trim() || undefined,
      };
      if (editing) {
        await updateOaExpenseCategory(editing.id, {
          ...payload,
          version: editing.version,
        });
        message.success('费用类型已更新');
      } else {
        await createOaExpenseCategory({ ...payload, code: values.code.trim() });
        message.success('费用类型已创建');
      }
      setOpen(false);
      void load();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <AccessControl permission="system:oa:expense:manage">
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建费用类型
          </Button>
        </AccessControl>
      </Space>
      <Table<OaExpenseCategoryVo>
        rowKey="id"
        loading={loading}
        dataSource={categories}
        pagination={false}
        scroll={{ x: 900 }}
        columns={[
          { title: '编码', dataIndex: 'code', width: 120 },
          { title: '名称', dataIndex: 'name', width: 120 },
          {
            title: '单笔上限',
            dataIndex: 'perItemLimit',
            width: 120,
            render: (value: OaExpenseCategoryVo['perItemLimit']) =>
              value == null ? '不限' : formatAmount(value),
          },
          {
            title: '发票号',
            dataIndex: 'invoiceRequired',
            width: 100,
            render: (value: boolean) =>
              value ? <Tag color="blue">必填</Tag> : <Tag>可选</Tag>,
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 90,
            render: (value: string) => (
              <Tag color={value === 'ENABLED' ? 'green' : 'red'}>
                {value === 'ENABLED' ? '启用' : '停用'}
              </Tag>
            ),
          },
          { title: '排序', dataIndex: 'sort', width: 70 },
          {
            title: '说明',
            dataIndex: 'remark',
            ellipsis: true,
            render: (value?: string | null) => value || '—',
          },
          {
            title: '操作',
            key: 'action',
            width: 90,
            fixed: 'right',
            render: (_, record) => (
              <AccessControl permission="system:oa:expense:manage">
                <Button type="link" onClick={() => openEdit(record)}>
                  编辑
                </Button>
              </AccessControl>
            ),
          },
        ]}
      />
      <Modal
        title={editing ? `编辑费用类型：${editing.name}` : '新建费用类型'}
        open={open}
        width={520}
        confirmLoading={saving}
        destroyOnHidden
        onCancel={() => setOpen(false)}
        onOk={() => void handleSave()}
      >
        <Form form={form} name="oaExpenseCategoryForm" layout="vertical">
          <Form.Item
            name="code"
            label="类型编码"
            extra={
              editing
                ? '编码已写入报销表单选项，创建后不可修改'
                : '写入报销明细“费用类型”列的选项值，如 TRAFFIC'
            }
            rules={[
              { required: true, message: '请输入类型编码' },
              {
                pattern: /^[A-Za-z][A-Za-z0-9_]*$/,
                transform: (value: string) => value?.trim(),
                message: '只能包含字母、数字和下划线，且以字母开头',
              },
            ]}
          >
            <Input maxLength={32} disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item
            name="name"
            label="类型名称"
            rules={[{ required: true, message: '请输入类型名称' }]}
          >
            <Input maxLength={64} placeholder="如 交通费" />
          </Form.Item>
          <Space size={24} align="start" wrap>
            <Form.Item
              name="perItemLimit"
              label="单笔上限（元）"
              extra="留空表示不限"
            >
              <InputNumber min={0.01} max={9999999999.99} precision={2} />
            </Form.Item>
            <Form.Item
              name="invoiceRequired"
              label="必须填写发票号"
              valuePropName="checked"
              extra="同一发票号在本租户只能报销一次"
            >
              <Switch />
            </Form.Item>
            <Form.Item name="sort" label="排序">
              <InputNumber min={0} max={9999} precision={0} />
            </Form.Item>
            <Form.Item name="enabled" label="启用" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item name="remark" label="说明">
            <Input.TextArea rows={2} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

type PayFormValues = {
  paidAmount: number;
  payDate: Dayjs;
  payMethod: OaExpensePayMethod;
  payReference?: string;
  remark?: string;
};

const RecordTab: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<OaExpenseDetailVo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [paying, setPaying] = useState<OaExpenseVo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payForm] = Form.useForm<PayFormValues>();

  const openDetail = async (record: OaExpenseVo) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const response = await getOaExpenseRecord(record.id);
      setDetail(response.data);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setDetailLoading(false);
    }
  };

  const openPay = (record: OaExpenseVo) => {
    setPaying(record);
    payForm.resetFields();
    payForm.setFieldsValue({
      paidAmount: Number(record.totalAmount),
      payDate: dayjs(),
      payMethod: 'BANK_TRANSFER',
    });
  };

  const handlePay = async () => {
    if (!paying) return;
    const values = await payForm.validateFields();
    setSubmitting(true);
    try {
      await payOaExpense(paying.id, {
        paidAmount: values.paidAmount,
        payDate: values.payDate.format('YYYY-MM-DD'),
        payMethod: values.payMethod,
        payReference: values.payReference?.trim() || undefined,
        remark: values.remark?.trim() || undefined,
      });
      message.success('支付已登记');
      setPaying(null);
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ProColumns<OaExpenseVo>[] = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '申请标题或申请人' },
    },
    {
      title: '报销状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 100,
      valueEnum: Object.fromEntries(
        Object.entries(EXPENSE_STATUS_META).map(([key, meta]) => [
          key,
          { text: meta.text },
        ]),
      ),
      render: (_, record) => expenseStatusTag(record.status),
    },
    {
      title: '申请',
      dataIndex: 'title',
      search: false,
      ellipsis: true,
      width: 200,
      render: (_, record) => record.title || `申请 #${record.applicationId}`,
    },
    {
      title: '申请人',
      dataIndex: 'applicantName',
      search: false,
      width: 100,
      render: (_, record) => record.applicantName || record.applicantId,
    },
    {
      title: '合计',
      dataIndex: 'totalAmount',
      search: false,
      width: 120,
      render: (_, record) => formatAmount(record.totalAmount),
    },
    { title: '明细', dataIndex: 'itemCount', search: false, width: 60 },
    {
      title: '审批状态',
      dataIndex: 'applicationStatus',
      search: false,
      width: 100,
      render: (_, record) =>
        record.applicationStatus
          ? applicationStatusTag(record.applicationStatus)
          : '—',
    },
    {
      title: '支付日期',
      dataIndex: 'payDate',
      search: false,
      width: 110,
      render: (_, record) => record.payDate || '—',
    },
    { title: '提交时间', dataIndex: 'createTime', search: false, width: 170 },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 140,
      render: (_, record) => [
        <Button
          key="detail"
          type="link"
          onClick={() => void openDetail(record)}
        >
          详情
        </Button>,
        record.status === 'PENDING_PAYMENT' ? (
          <AccessControl key="pay" permission="system:oa:expense:pay">
            <Button type="link" onClick={() => openPay(record)}>
              登记支付
            </Button>
          </AccessControl>
        ) : null,
      ],
    },
  ];

  return (
    <>
      <ProTable<OaExpenseVo>
        headerTitle="报销台账"
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 1200 }}
        request={async (params) => {
          const response = await queryOaExpenseRecords({
            page: (params.current as number) || 1,
            size: (params.pageSize as number) || 10,
            status: params.status || undefined,
            keyword: (params.keyword as string)?.trim() || undefined,
          });
          return {
            data: response.data?.list ?? [],
            total: response.data?.total ?? 0,
            success: true,
          };
        }}
      />
      <Drawer
        title="报销单详情"
        width={760}
        open={detailOpen}
        destroyOnHidden
        onClose={() => setDetailOpen(false)}
      >
        <Spin spinning={detailLoading}>
          {detail ? <ExpenseDetailContent detail={detail} /> : null}
        </Spin>
      </Drawer>
      <Modal
        title={paying ? `登记支付：${paying.title || paying.id}` : '登记支付'}
        open={Boolean(paying)}
        width={520}
        confirmLoading={submitting}
        okText="确认登记"
        destroyOnHidden
        onCancel={() => setPaying(null)}
        onOk={() => void handlePay()}
      >
        {paying ? (
          <Form form={payForm} name="oaExpensePayForm" layout="vertical">
            <Form.Item
              name="paidAmount"
              label="实付金额（元）"
              extra={`报销合计 ${formatAmount(paying.totalAmount)}，实付必须与合计一致`}
              rules={[{ required: true, message: '请输入实付金额' }]}
            >
              <InputNumber
                min={0.01}
                precision={2}
                style={{ width: '100%' }}
                aria-label="实付金额"
              />
            </Form.Item>
            <Space size={16} align="start" wrap>
              <Form.Item
                name="payDate"
                label="支付日期"
                rules={[{ required: true, message: '请选择支付日期' }]}
              >
                <DatePicker
                  aria-label="支付日期"
                  disabledDate={(date) => date.isAfter(dayjs(), 'day')}
                />
              </Form.Item>
              <Form.Item
                name="payMethod"
                label="支付方式"
                rules={[{ required: true, message: '请选择支付方式' }]}
              >
                <Select
                  aria-label="支付方式"
                  style={{ width: 160 }}
                  options={EXPENSE_PAY_METHOD_OPTIONS.map((item) => ({
                    value: item.value,
                    label: item.label,
                  }))}
                />
              </Form.Item>
            </Space>
            <Form.Item name="payReference" label="支付流水号">
              <Input maxLength={64} aria-label="支付流水号" />
            </Form.Item>
            <Form.Item name="remark" label="备注">
              <Input.TextArea rows={2} maxLength={500} showCount />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>
    </>
  );
};

const ExpenseManagePage: React.FC = () => {
  const [templating, setTemplating] = useState(false);

  const handleTemplate = async () => {
    setTemplating(true);
    try {
      const response = await createOaExpenseTemplate();
      message.success(
        `已生成表单版本 #${response.data.formVersionId} 与流程草稿 ${response.data.modelKey}`,
      );
      history.push(`/oa/process/design?id=${response.data.modelId}`);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setTemplating(false);
    }
  };

  return (
    <PageContainer
      header={{ title: '报销管理' }}
      extra={[
        <AccessControl key="template" permission="system:oa:expense:manage">
          <Popconfirm
            title="生成报销表单与流程草稿？"
            description={
              <div style={{ maxWidth: 360 }}>
                按启用的费用类型生成并发布“报销单”表单，并创建“费用报销”流程草稿（直属上级
                → 财务岗位审核，合计超过 5000
                元再由总经理岗位审批）；没有费用类型时先初始化默认类型。流程需选择该表单版本后发布。
              </div>
            }
            okText="生成"
            cancelText="取消"
            onConfirm={() => handleTemplate()}
          >
            <Button icon={<ThunderboltOutlined />} loading={templating}>
              生成报销模板
            </Button>
          </Popconfirm>
        </AccessControl>,
      ]}
    >
      <Tabs
        destroyOnHidden
        items={[
          { key: 'records', label: '报销台账', children: <RecordTab /> },
          { key: 'categories', label: '费用类型', children: <CategoryTab /> },
        ]}
      />
    </PageContainer>
  );
};

export default ExpenseManagePage;
