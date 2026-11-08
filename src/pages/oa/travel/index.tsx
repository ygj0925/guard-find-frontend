/**
 * 出差借款管理：出差台账、借款台账与财务放款/还款登记；一键生成出差与借款表单及流程草稿。
 * 放款、还款只做登记不对接支付通道；报销核销在报销管理的支付登记里完成。
 */
import { ThunderboltOutlined } from '@ant-design/icons';
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
  Tabs,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  createOaTravelTemplate,
  disburseOaLoan,
  getOaLoan,
  getOaTravel,
  type OaExpensePayMethod,
  type OaLoanDetailVo,
  type OaLoanVo,
  type OaTravelDetailVo,
  type OaTravelVo,
  queryOaLoans,
  queryOaTravels,
  repayOaLoan,
} from '@/services/web/guardfind/oa';
import { EXPENSE_PAY_METHOD_OPTIONS, formatAmount } from '@/utils/oaExpense';
import {
  LOAN_STATUS_META,
  newRequestId,
  statusValueEnum,
  TRAVEL_STATUS_META,
} from '@/utils/oaTravel';
import {
  LoanDetailContent,
  loanStatusTag,
  TravelDetailContent,
  travelStatusTag,
} from './components/TravelDetail';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

const METHOD_OPTIONS = EXPENSE_PAY_METHOD_OPTIONS.map((item) => ({
  value: item.value,
  label: item.label,
}));

const TravelTab: React.FC = () => {
  const [detail, setDetail] = useState<OaTravelDetailVo | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const openDetail = async (record: OaTravelVo) => {
    setOpen(true);
    setDetail(null);
    setLoading(true);
    try {
      const response = await getOaTravel(record.id);
      setDetail(response.data);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  };

  const columns: ProColumns<OaTravelVo>[] = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '出差单号、目的地或申请人' },
    },
    { title: '出差单号', dataIndex: 'travelNo', search: false, width: 170 },
    {
      title: '出差状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 100,
      valueEnum: statusValueEnum(TRAVEL_STATUS_META),
      render: (_, record) => travelStatusTag(record.status),
    },
    {
      title: '申请人',
      dataIndex: 'applicantName',
      search: false,
      width: 100,
      render: (_, record) => record.applicantName || record.applicantId,
    },
    {
      title: '目的地',
      dataIndex: 'destination',
      search: false,
      ellipsis: true,
      width: 140,
    },
    {
      title: '行程',
      key: 'range',
      search: false,
      width: 200,
      render: (_, record) =>
        `${record.startDate} 至 ${record.endDate}（${record.days} 天）`,
    },
    {
      title: '预算',
      dataIndex: 'budgetAmount',
      search: false,
      width: 110,
      render: (_, record) => formatAmount(record.budgetAmount),
    },
    {
      title: '已报销',
      dataIndex: 'expenseAmount',
      search: false,
      width: 110,
      render: (_, record) => formatAmount(record.expenseAmount ?? 0),
    },
    {
      title: '借款余额',
      dataIndex: 'loanBalance',
      search: false,
      width: 110,
      render: (_, record) => formatAmount(record.loanBalance ?? 0),
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 80,
      render: (_, record) => (
        <Button type="link" onClick={() => void openDetail(record)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <>
      <ProTable<OaTravelVo>
        headerTitle="出差台账"
        rowKey="id"
        columns={columns}
        scroll={{ x: 1200 }}
        request={async (params) => {
          const response = await queryOaTravels({
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
        title="出差单详情"
        width={760}
        open={open}
        destroyOnHidden
        onClose={() => setOpen(false)}
      >
        <Spin spinning={loading}>
          {detail ? <TravelDetailContent detail={detail} /> : null}
        </Spin>
      </Drawer>
    </>
  );
};

type MoneyFormValues = {
  amount: number;
  date: Dayjs;
  method: OaExpensePayMethod;
  reference?: string;
  remark?: string;
};

type LoanAction = { kind: 'disburse' | 'repay'; loan: OaLoanVo };

const LoanTab: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [detail, setDetail] = useState<OaLoanDetailVo | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<LoanAction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const requestIdRef = useRef('');
  const [form] = Form.useForm<MoneyFormValues>();

  const openDetail = async (record: OaLoanVo) => {
    setOpen(true);
    setDetail(null);
    setLoading(true);
    try {
      const response = await getOaLoan(record.id);
      setDetail(response.data);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  };

  const openAction = (kind: LoanAction['kind'], loan: OaLoanVo) => {
    requestIdRef.current = newRequestId('repay');
    setAction({ kind, loan });
    form.resetFields();
    form.setFieldsValue({
      amount: Number(kind === 'disburse' ? loan.amount : loan.balance),
      date: dayjs(),
      method: 'BANK_TRANSFER',
    });
  };

  const handleSubmit = async () => {
    if (!action) return;
    const values = await form.validateFields();
    const common = {
      amount: values.amount,
      method: values.method,
      reference: values.reference?.trim() || undefined,
      remark: values.remark?.trim() || undefined,
    };
    const date = values.date.format('YYYY-MM-DD');
    setSubmitting(true);
    try {
      if (action.kind === 'disburse') {
        await disburseOaLoan(action.loan.id, {
          ...common,
          disburseDate: date,
        });
        message.success('放款已登记');
      } else {
        await repayOaLoan(action.loan.id, {
          ...common,
          requestId: requestIdRef.current,
          repayDate: date,
        });
        message.success('还款已登记');
      }
      setAction(null);
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ProColumns<OaLoanVo>[] = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '申请标题、出差单号或申请人' },
    },
    {
      title: '借款状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 100,
      valueEnum: statusValueEnum(LOAN_STATUS_META),
      render: (_, record) => loanStatusTag(record.status),
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
      title: '关联出差',
      dataIndex: 'travelNo',
      search: false,
      width: 170,
      render: (_, record) => record.travelNo || '—',
    },
    {
      title: '借款金额',
      dataIndex: 'amount',
      search: false,
      width: 110,
      render: (_, record) => formatAmount(record.amount),
    },
    {
      title: '余额',
      dataIndex: 'balance',
      search: false,
      width: 110,
      render: (_, record) => formatAmount(record.balance),
    },
    {
      title: '放款日期',
      dataIndex: 'disburseDate',
      search: false,
      width: 110,
      render: (_, record) => record.disburseDate || '—',
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 170,
      render: (_, record) => [
        <Button
          key="detail"
          type="link"
          onClick={() => void openDetail(record)}
        >
          详情
        </Button>,
        record.status === 'PENDING_DISBURSE' ? (
          <AccessControl key="disburse" permission="system:oa:loan:pay">
            <Button type="link" onClick={() => openAction('disburse', record)}>
              登记放款
            </Button>
          </AccessControl>
        ) : null,
        record.status === 'OUTSTANDING' ? (
          <AccessControl key="repay" permission="system:oa:loan:pay">
            <Button type="link" onClick={() => openAction('repay', record)}>
              登记还款
            </Button>
          </AccessControl>
        ) : null,
      ],
    },
  ];

  const isDisburse = action?.kind === 'disburse';
  const label = isDisburse ? '放款' : '还款';

  return (
    <>
      <ProTable<OaLoanVo>
        headerTitle="借款台账"
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 1200 }}
        request={async (params) => {
          const response = await queryOaLoans({
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
        title="借款单详情"
        width={820}
        open={open}
        destroyOnHidden
        onClose={() => setOpen(false)}
      >
        <Spin spinning={loading}>
          {detail ? <LoanDetailContent detail={detail} /> : null}
        </Spin>
      </Drawer>
      <Modal
        title={
          action
            ? `登记${label}：${action.loan.title || action.loan.id}`
            : '登记'
        }
        open={Boolean(action)}
        width={520}
        confirmLoading={submitting}
        okText={`确认${label}`}
        destroyOnHidden
        onCancel={() => setAction(null)}
        onOk={() => void handleSubmit()}
      >
        {action ? (
          <Form form={form} name="oaLoanMoneyForm" layout="vertical">
            <Form.Item
              name="amount"
              label={`${label}金额（元）`}
              extra={
                isDisburse
                  ? `借款金额 ${formatAmount(action.loan.amount)}，放款必须与借款金额一致`
                  : `待还余额 ${formatAmount(action.loan.balance)}，可部分还款，余额归零后借款还清`
              }
              rules={[{ required: true, message: `请输入${label}金额` }]}
            >
              <InputNumber
                min={0.01}
                max={isDisburse ? undefined : Number(action.loan.balance)}
                precision={2}
                style={{ width: '100%' }}
                aria-label={`${label}金额`}
              />
            </Form.Item>
            <Space size={16} align="start" wrap>
              <Form.Item
                name="date"
                label={`${label}日期`}
                rules={[{ required: true, message: `请选择${label}日期` }]}
              >
                <DatePicker
                  aria-label={`${label}日期`}
                  disabledDate={(date) => date.isAfter(dayjs(), 'day')}
                />
              </Form.Item>
              <Form.Item
                name="method"
                label={`${label}方式`}
                rules={[{ required: true, message: `请选择${label}方式` }]}
              >
                <Select
                  aria-label={`${label}方式`}
                  style={{ width: 160 }}
                  options={METHOD_OPTIONS}
                />
              </Form.Item>
            </Space>
            <Form.Item name="reference" label="流水号">
              <Input maxLength={64} aria-label="流水号" />
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

const TravelManagePage: React.FC = () => {
  const [templating, setTemplating] = useState(false);

  const handleTemplate = async () => {
    setTemplating(true);
    try {
      const response = await createOaTravelTemplate();
      message.success(
        `已生成出差流程草稿 ${response.data.travelModelKey} 与借款流程草稿 ${response.data.loanModelKey}`,
      );
      history.push(`/oa/process/design?id=${response.data.travelModelId}`);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setTemplating(false);
    }
  };

  return (
    <PageContainer
      header={{ title: '出差借款' }}
      extra={[
        <AccessControl key="template" permission="system:oa:travel:manage">
          <Popconfirm
            title="生成出差与借款模板？"
            description={
              <div style={{ maxWidth: 360 }}>
                生成并发布“出差申请”“借款申请”两张表单，并创建对应流程草稿：出差由直属上级审批，预算超过
                3000 元再由财务岗位审核；借款由直属上级 → 财务岗位审核，超过
                10000 元再由总经理岗位审批。两个流程都需选择表单版本后发布。
              </div>
            }
            okText="生成"
            cancelText="取消"
            onConfirm={() => handleTemplate()}
          >
            <Button icon={<ThunderboltOutlined />} loading={templating}>
              生成出差借款模板
            </Button>
          </Popconfirm>
        </AccessControl>,
      ]}
    >
      <Tabs
        destroyOnHidden
        items={[
          { key: 'travels', label: '出差台账', children: <TravelTab /> },
          { key: 'loans', label: '借款台账', children: <LoanTab /> },
        ]}
      />
    </PageContainer>
  );
};

export default TravelManagePage;
