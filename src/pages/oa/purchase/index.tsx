/**
 * 采购管理：采购台账（经办下单、分批验收）与部门年度预算（下达/调整、占用台账）；一键生成采购表单与流程草稿。
 * 审批只决定能否采购，下单与验收由采购经办登记，经办人不能是申请人；验收入库按请求号幂等。
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
  Alert,
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
  Table,
  Tabs,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  createOaPurchaseTemplate,
  getOaPurchase,
  type OaDeptOptionVo,
  type OaPurchaseBudgetLedgerVo,
  type OaPurchaseBudgetVo,
  type OaPurchaseDetailVo,
  type OaPurchaseItemVo,
  type OaPurchaseVo,
  orderOaPurchase,
  queryOaPurchaseBudgetLedger,
  queryOaPurchaseBudgets,
  queryOaPurchaseDepts,
  queryOaPurchases,
  receiveOaPurchase,
  saveOaPurchaseBudget,
} from '@/services/web/guardfind/oa';
import {
  BUDGET_LEDGER_ACTION_META,
  PURCHASE_CATEGORY_META,
  PURCHASE_STATUS_META,
  pendingQty,
} from '@/utils/oaAsset';
import { formatAmount } from '@/utils/oaExpense';
import { newRequestId, statusValueEnum } from '@/utils/oaTravel';
import {
  metaTag,
  PurchaseDetailContent,
  purchaseStatusTag,
} from './components/PurchaseDetail';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

type OrderValues = { supplier: string; orderNo?: string; orderDate: Dayjs };

type ReceiveValues = {
  receiveDate: Dayjs;
  location?: string;
  remark?: string;
  quantities: Record<string, number | null>;
};

const RecordTab: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [detail, setDetail] = useState<OaPurchaseDetailVo | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ordering, setOrdering] = useState<OaPurchaseVo | null>(null);
  const [receiving, setReceiving] = useState<OaPurchaseDetailVo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const requestIdRef = useRef('');
  const [orderForm] = Form.useForm<OrderValues>();
  const [receiveForm] = Form.useForm<ReceiveValues>();

  const openDetail = async (record: OaPurchaseVo) => {
    setOpen(true);
    setDetail(null);
    setLoading(true);
    try {
      const response = await getOaPurchase(record.id);
      setDetail(response.data);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  };

  const openOrder = (record: OaPurchaseVo) => {
    setOrdering(record);
    orderForm.resetFields();
    orderForm.setFieldsValue({ orderDate: dayjs() });
  };

  const openReceive = async (record: OaPurchaseVo) => {
    try {
      const response = await getOaPurchase(record.id);
      requestIdRef.current = newRequestId('receive');
      receiveForm.resetFields();
      receiveForm.setFieldsValue({
        receiveDate: dayjs(),
        quantities: Object.fromEntries(
          response.data.items.map((item) => [
            String(item.id),
            pendingQty(item),
          ]),
        ),
      });
      setReceiving(response.data);
    } catch (error) {
      message.error(errorText(error));
    }
  };

  const submitOrder = async () => {
    if (!ordering) return;
    const values = await orderForm.validateFields().catch(() => null);
    if (!values) return;
    setSubmitting(true);
    try {
      await orderOaPurchase(ordering.id, {
        supplier: values.supplier.trim(),
        orderNo: values.orderNo?.trim() || undefined,
        orderDate: values.orderDate.format('YYYY-MM-DD'),
      });
      message.success('已登记下单');
      setOrdering(null);
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const submitReceive = async () => {
    if (!receiving) return;
    const values = await receiveForm.validateFields().catch(() => null);
    if (!values) return;
    const lines = receiving.items
      .map((item) => ({
        itemId: item.id,
        quantity: Number(values.quantities?.[String(item.id)] ?? 0),
      }))
      .filter((line) => line.quantity > 0);
    if (lines.length === 0) {
      message.warning('请至少填写一行验收数量');
      return;
    }
    setSubmitting(true);
    try {
      const response = await receiveOaPurchase(receiving.purchase.id, {
        requestId: requestIdRef.current,
        receiveDate: values.receiveDate.format('YYYY-MM-DD'),
        location: values.location?.trim() || undefined,
        remark: values.remark?.trim() || undefined,
        lines,
      });
      message.success(
        response.data.purchase.status === 'RECEIVED'
          ? '已全部验收入库'
          : '已登记部分验收',
      );
      setReceiving(null);
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ProColumns<OaPurchaseVo>[] = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '采购单号、标题、供应商或申请人' },
    },
    { title: '采购单号', dataIndex: 'purchaseNo', search: false, width: 150 },
    {
      title: '采购状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 100,
      valueEnum: statusValueEnum(PURCHASE_STATUS_META),
      render: (_, record) => purchaseStatusTag(record.status),
    },
    {
      title: '申请',
      dataIndex: 'title',
      search: false,
      ellipsis: true,
      width: 180,
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
      title: '预算部门',
      dataIndex: 'deptName',
      search: false,
      width: 100,
      render: (_, record) => record.deptName || record.deptId,
    },
    {
      title: '合计',
      dataIndex: 'totalAmount',
      search: false,
      width: 120,
      render: (_, record) => formatAmount(record.totalAmount),
    },
    {
      title: '供应商',
      dataIndex: 'supplier',
      search: false,
      ellipsis: true,
      width: 140,
      render: (_, record) => record.supplier || '—',
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 190,
      render: (_, record) => [
        <Button
          key="detail"
          type="link"
          onClick={() => void openDetail(record)}
        >
          详情
        </Button>,
        record.status === 'PENDING_ORDER' ? (
          <AccessControl key="order" permission="system:oa:purchase:execute">
            <Button type="link" onClick={() => openOrder(record)}>
              登记下单
            </Button>
          </AccessControl>
        ) : null,
        record.status === 'ORDERED' || record.status === 'PARTIAL' ? (
          <AccessControl key="receive" permission="system:oa:purchase:execute">
            <Button type="link" onClick={() => void openReceive(record)}>
              登记验收
            </Button>
          </AccessControl>
        ) : null,
      ],
    },
  ];

  return (
    <>
      <ProTable<OaPurchaseVo>
        headerTitle="采购台账"
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 1200 }}
        request={async (params) => {
          const response = await queryOaPurchases({
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
        title="采购单详情"
        width={860}
        open={open}
        destroyOnHidden
        onClose={() => setOpen(false)}
      >
        <Spin spinning={loading}>
          {detail ? <PurchaseDetailContent detail={detail} /> : null}
        </Spin>
      </Drawer>
      <Modal
        title={ordering ? `登记下单：${ordering.purchaseNo}` : '登记下单'}
        open={Boolean(ordering)}
        width={520}
        confirmLoading={submitting}
        okText="确认下单"
        destroyOnHidden
        onCancel={() => setOrdering(null)}
        onOk={() => void submitOrder()}
      >
        {ordering ? (
          <Form form={orderForm} name="oaPurchaseOrderForm" layout="vertical">
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={`采购合计 ${formatAmount(ordering.totalAmount)}，审批已通过。下单只做登记，不对接供应商系统。`}
            />
            <Form.Item
              name="supplier"
              label="供应商"
              rules={[
                { required: true, whitespace: true, message: '请输入供应商' },
              ]}
            >
              <Input maxLength={100} aria-label="供应商" />
            </Form.Item>
            <Space size={16} align="start" wrap>
              <Form.Item name="orderNo" label="订单号">
                <Input maxLength={64} aria-label="订单号" />
              </Form.Item>
              <Form.Item
                name="orderDate"
                label="下单日期"
                rules={[{ required: true, message: '请选择下单日期' }]}
              >
                <DatePicker
                  aria-label="下单日期"
                  disabledDate={(date) => date.isAfter(dayjs(), 'day')}
                />
              </Form.Item>
            </Space>
          </Form>
        ) : null}
      </Modal>
      <Modal
        title={
          receiving ? `登记验收：${receiving.purchase.purchaseNo}` : '登记验收'
        }
        open={Boolean(receiving)}
        width={760}
        confirmLoading={submitting}
        okText="确认验收"
        destroyOnHidden
        onCancel={() => setReceiving(null)}
        onOk={() => void submitReceive()}
      >
        {receiving ? (
          <Form
            form={receiveForm}
            name="oaPurchaseReceiveForm"
            layout="vertical"
          >
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="可分批验收：用品类入库并记库存台账，资产类按数量逐件建卡（原值为单价），其他类只记验收数量。"
            />
            <Table<OaPurchaseItemVo>
              rowKey="id"
              size="small"
              bordered
              pagination={false}
              dataSource={receiving.items}
              aria-label="验收明细"
              columns={[
                { title: '物品', dataIndex: 'itemName' },
                {
                  title: '类别',
                  dataIndex: 'category',
                  width: 72,
                  render: (value: string) =>
                    metaTag(PURCHASE_CATEGORY_META, value),
                },
                {
                  title: '已验收',
                  key: 'received',
                  width: 80,
                  render: (_, item) => `${item.receivedQty}/${item.quantity}`,
                },
                {
                  title: '本次验收',
                  key: 'quantity',
                  width: 130,
                  render: (_, item) => (
                    <Form.Item
                      name={['quantities', String(item.id)]}
                      style={{ margin: 0 }}
                    >
                      <InputNumber
                        min={0}
                        max={pendingQty(item)}
                        precision={0}
                        disabled={pendingQty(item) === 0}
                        aria-label={`${item.itemName}验收数量`}
                      />
                    </Form.Item>
                  ),
                },
              ]}
            />
            <Space size={16} align="start" wrap style={{ marginTop: 16 }}>
              <Form.Item
                name="receiveDate"
                label="验收日期"
                rules={[{ required: true, message: '请选择验收日期' }]}
              >
                <DatePicker
                  aria-label="验收日期"
                  disabledDate={(date) => date.isAfter(dayjs(), 'day')}
                />
              </Form.Item>
              <Form.Item name="location" label="资产存放位置">
                <Input maxLength={100} aria-label="资产存放位置" />
              </Form.Item>
            </Space>
            <Form.Item name="remark" label="备注">
              <Input.TextArea rows={2} maxLength={500} showCount />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>
    </>
  );
};

type BudgetValues = {
  deptId: number;
  budgetYear: number;
  amount: number;
  remark?: string;
};

const BudgetTab: React.FC = () => {
  const [year, setYear] = useState(dayjs().year());
  const [budgets, setBudgets] = useState<OaPurchaseBudgetVo[]>([]);
  const [depts, setDepts] = useState<OaDeptOptionVo[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<OaPurchaseBudgetVo | 'new' | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [ledgerOf, setLedgerOf] = useState<OaPurchaseBudgetVo | null>(null);
  const [ledger, setLedger] = useState<OaPurchaseBudgetLedgerVo[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [form] = Form.useForm<BudgetValues>();

  const load = async (target: number) => {
    setLoading(true);
    try {
      const response = await queryOaPurchaseBudgets(target);
      setBudgets(response.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(year);
  }, [year]);

  useEffect(() => {
    queryOaPurchaseDepts()
      .then((response) => setDepts(response.data ?? []))
      .catch(() => setDepts([]));
  }, []);

  const openEdit = (budget: OaPurchaseBudgetVo | 'new') => {
    setEditing(budget);
    form.resetFields();
    form.setFieldsValue(
      budget === 'new'
        ? { budgetYear: year }
        : {
            deptId: budget.deptId,
            budgetYear: budget.budgetYear,
            amount: Number(budget.amount),
            remark: budget.remark ?? undefined,
          },
    );
  };

  const save = async () => {
    if (!editing) return;
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setSaving(true);
    try {
      await saveOaPurchaseBudget({
        deptId: values.deptId,
        budgetYear: values.budgetYear,
        amount: values.amount,
        remark: values.remark?.trim() || undefined,
        version: editing === 'new' ? undefined : editing.version,
      });
      message.success(editing === 'new' ? '预算已下达' : '预算已调整');
      setEditing(null);
      if (values.budgetYear === year) {
        await load(year);
      } else {
        setYear(values.budgetYear);
      }
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSaving(false);
    }
  };

  const openLedger = async (budget: OaPurchaseBudgetVo) => {
    setLedgerOf(budget);
    setLedger([]);
    setLedgerLoading(true);
    try {
      const response = await queryOaPurchaseBudgetLedger(budget.id);
      setLedger(response.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLedgerLoading(false);
    }
  };

  const current = dayjs().year();
  const yearOptions = [current - 1, current, current + 1].map((value) => ({
    value,
    label: `${value} 年`,
  }));
  const editingBudget = editing && editing !== 'new' ? editing : null;
  const floor = editingBudget
    ? Number(editingBudget.usedAmount) + Number(editingBudget.occupiedAmount)
    : 0;

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          aria-label="预算年度"
          style={{ width: 120 }}
          value={year}
          options={yearOptions}
          onChange={setYear}
        />
        <AccessControl permission="system:oa:purchase:manage">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openEdit('new')}
          >
            下达预算
          </Button>
        </AccessControl>
      </Space>
      <Table<OaPurchaseBudgetVo>
        rowKey="id"
        loading={loading}
        dataSource={budgets}
        pagination={false}
        scroll={{ x: 900 }}
        aria-label="部门预算"
        locale={{
          emptyText: `${year} 年度暂无部门预算，未设置预算的部门不能发起采购`,
        }}
        columns={[
          {
            title: '部门',
            dataIndex: 'deptName',
            render: (_, record) => record.deptName || record.deptId,
          },
          {
            title: '预算额度',
            dataIndex: 'amount',
            width: 130,
            render: (value) => formatAmount(value),
          },
          {
            title: '已使用',
            dataIndex: 'usedAmount',
            width: 130,
            render: (value) => formatAmount(value),
          },
          {
            title: '审批占用',
            dataIndex: 'occupiedAmount',
            width: 130,
            render: (value) => formatAmount(value),
          },
          {
            title: '可用',
            dataIndex: 'availableAmount',
            width: 130,
            render: (value) => formatAmount(value),
          },
          {
            title: '备注',
            dataIndex: 'remark',
            ellipsis: true,
            render: (value) => value || '—',
          },
          {
            title: '操作',
            key: 'action',
            width: 150,
            render: (_, record) => (
              <Space size={0}>
                <Button type="link" onClick={() => void openLedger(record)}>
                  台账
                </Button>
                <AccessControl permission="system:oa:purchase:manage">
                  <Button type="link" onClick={() => openEdit(record)}>
                    调整
                  </Button>
                </AccessControl>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editing === 'new' ? '下达部门预算' : '调整部门预算'}
        open={Boolean(editing)}
        width={520}
        confirmLoading={saving}
        okText="保存"
        destroyOnHidden
        onCancel={() => setEditing(null)}
        onOk={() => void save()}
      >
        {editing ? (
          <Form form={form} name="oaPurchaseBudgetForm" layout="vertical">
            <Space size={16} align="start" wrap>
              <Form.Item
                name="deptId"
                label="部门"
                rules={[{ required: true, message: '请选择部门' }]}
              >
                <Select
                  aria-label="预算部门"
                  style={{ width: 200 }}
                  showSearch
                  optionFilterProp="label"
                  disabled={Boolean(editingBudget)}
                  options={depts.map((dept) => ({
                    value: dept.id,
                    label: dept.name,
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="budgetYear"
                label="年度"
                rules={[{ required: true, message: '请选择年度' }]}
              >
                <Select
                  aria-label="年度"
                  style={{ width: 120 }}
                  disabled={Boolean(editingBudget)}
                  options={yearOptions}
                />
              </Form.Item>
            </Space>
            <Form.Item
              name="amount"
              label="预算额度（元）"
              extra={
                editingBudget
                  ? `不能低于已使用与审批占用合计 ${formatAmount(floor)}，差额记入预算台账`
                  : '部门年度预算下达后，采购提交即占用，驳回或撤回释放，通过后转为已使用'
              }
              rules={[{ required: true, message: '请输入预算额度' }]}
            >
              <InputNumber
                min={floor}
                precision={2}
                style={{ width: '100%' }}
                aria-label="预算额度"
              />
            </Form.Item>
            <Form.Item name="remark" label="备注">
              <Input.TextArea rows={2} maxLength={500} showCount />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>
      <Drawer
        title={
          ledgerOf
            ? `预算台账：${ledgerOf.deptName || ledgerOf.deptId} ${ledgerOf.budgetYear} 年`
            : '预算台账'
        }
        width={760}
        open={Boolean(ledgerOf)}
        destroyOnHidden
        onClose={() => setLedgerOf(null)}
      >
        <Table<OaPurchaseBudgetLedgerVo>
          rowKey="id"
          size="small"
          bordered
          loading={ledgerLoading}
          pagination={false}
          dataSource={ledger}
          aria-label="预算台账"
          locale={{ emptyText: '暂无台账记录' }}
          columns={[
            {
              title: '动作',
              dataIndex: 'action',
              width: 96,
              render: (value: string) =>
                metaTag(BUDGET_LEDGER_ACTION_META, value),
            },
            {
              title: '金额',
              dataIndex: 'amount',
              width: 120,
              render: (value) => formatAmount(value),
            },
            {
              title: '采购单',
              dataIndex: 'purchaseNo',
              width: 150,
              render: (value) => value || '—',
            },
            {
              title: '操作人',
              key: 'operator',
              width: 100,
              render: (_, record) => record.operatorName || record.operatorId,
            },
            {
              title: '时间',
              dataIndex: 'createTime',
              width: 170,
              render: (value) => value || '—',
            },
            {
              title: '备注',
              dataIndex: 'remark',
              ellipsis: true,
              render: (value) => value || '—',
            },
          ]}
        />
      </Drawer>
    </>
  );
};

const PurchaseManagePage: React.FC = () => {
  const [templating, setTemplating] = useState(false);

  const handleTemplate = async () => {
    setTemplating(true);
    try {
      const response = await createOaPurchaseTemplate();
      message.success(`已生成采购流程草稿 ${response.data.modelKey}`);
      history.push(`/oa/process/design?id=${response.data.modelId}`);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setTemplating(false);
    }
  };

  return (
    <PageContainer
      header={{ title: '采购管理' }}
      extra={[
        <AccessControl key="template" permission="system:oa:purchase:manage">
          <Popconfirm
            title="生成采购模板？"
            description={
              <div style={{ maxWidth: 360 }}>
                生成并发布“采购申请”表单（明细含物品、类别、用品编码、数量、单价），并创建流程草稿：直属上级
                → 财务岗位审核，合计超过 20000
                元再由总经理岗位审批。需选择表单版本后发布。
              </div>
            }
            okText="生成"
            cancelText="取消"
            onConfirm={() => handleTemplate()}
          >
            <Button icon={<ThunderboltOutlined />} loading={templating}>
              生成采购模板
            </Button>
          </Popconfirm>
        </AccessControl>,
      ]}
    >
      <Tabs
        destroyOnHidden
        items={[
          { key: 'records', label: '采购台账', children: <RecordTab /> },
          { key: 'budgets', label: '部门预算', children: <BudgetTab /> },
        ]}
      />
    </PageContainer>
  );
};

export default PurchaseManagePage;
