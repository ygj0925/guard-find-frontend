import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { history } from '@umijs/max';
import { message } from 'antd';
import dayjs from 'dayjs';
import ExpenseManagePage from '@/pages/oa/expense';
import MyExpensePage from '@/pages/oa/expense/mine';
import {
  createOaExpenseCategory,
  createOaExpenseTemplate,
  getMyOaExpense,
  getOaExpenseRecord,
  payOaExpense,
  queryMyOaExpenses,
  queryOaExpenseCategories,
  queryOaExpenseRecords,
  queryOaOutstandingLoans,
} from '@/services/web/guardfind/oa';
import {
  expensePreviewInput,
  formatAmount,
  payMethodText,
} from '@/utils/oaExpense';

jest.mock('@umijs/max', () => ({
  history: { push: jest.fn() },
}));

jest.mock('@/hooks/useAccess', () => ({
  useAccess: () => ({
    permissions: [],
    roles: [],
    isAdmin: true,
    hasPermission: () => true,
    hasRole: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
  }),
}));

jest.mock('@/services/web/guardfind/oa', () => ({
  createOaExpenseCategory: jest.fn(),
  createOaExpenseTemplate: jest.fn(),
  getMyOaExpense: jest.fn(),
  getOaExpenseRecord: jest.fn(),
  payOaExpense: jest.fn(),
  queryMyOaExpenses: jest.fn(),
  queryOaExpenseCategories: jest.fn(),
  queryOaExpenseRecords: jest.fn(),
  queryOaOutstandingLoans: jest.fn(),
  updateOaExpenseCategory: jest.fn(),
}));

const traffic = {
  id: 1,
  code: 'TRAFFIC',
  name: '交通费',
  perItemLimit: '500.00',
  invoiceRequired: false,
  status: 'ENABLED',
  sort: 0,
  remark: null,
  version: 0,
};

const pending = {
  id: 9,
  applicationId: 80,
  title: '11 月差旅报销',
  applicationStatus: 'APPROVED',
  applicantId: 101,
  applicantName: '张三',
  totalAmount: '1234.50',
  itemCount: 2,
  status: 'PENDING_PAYMENT',
  createTime: '2026-11-09 10:00:00',
};

const detail = {
  expense: pending,
  items: [
    {
      lineNo: 1,
      categoryCode: 'TRAFFIC',
      categoryName: '交通费',
      amount: '234.50',
      expenseDate: '2026-11-02',
      invoiceNo: 'INV-001',
      description: '打车',
    },
    {
      lineNo: 2,
      categoryCode: 'HOTEL',
      categoryName: '住宿费',
      amount: '1000.00',
      expenseDate: '2026-11-03',
      invoiceNo: null,
      description: null,
    },
  ],
};

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('报销工具函数', () => {
  it('金额统一两位小数并带千分位', () => {
    expect(formatAmount('1234.5')).toBe('¥1,234.50');
    expect(formatAmount(0.1)).toBe('¥0.10');
    expect(formatAmount(null)).toBe('—');
    expect(payMethodText('CASH')).toBe('现金');
    expect(payMethodText(null)).toBe('—');
  });

  it('至少一行填了金额才生成预览入参', () => {
    expect(expensePreviewInput({})).toBeNull();
    expect(
      expensePreviewInput({ expenseItems: [{ category: 'TRAFFIC' }] }),
    ).toBeNull();
    expect(
      expensePreviewInput({
        reason: '出差',
        expenseItems: [{ category: 'TRAFFIC', amount: 32 }],
      }),
    ).toEqual({ expenseItems: [{ category: 'TRAFFIC', amount: 32 }] });
    expect(
      expensePreviewInput({
        travelNo: ' TR-1 ',
        expenseItems: [{ category: 'TRAFFIC', amount: 32 }],
      }),
    ).toEqual({
      travelNo: 'TR-1',
      expenseItems: [{ category: 'TRAFFIC', amount: 32 }],
    });
  });
});

describe('报销管理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryOaExpenseRecords).mockResolvedValue({
      data: { list: [pending], total: 1 },
    } as any);
    jest.mocked(getOaExpenseRecord).mockResolvedValue({ data: detail } as any);
    jest.mocked(queryOaExpenseCategories).mockResolvedValue({
      data: [traffic],
    } as any);
    jest.mocked(queryOaOutstandingLoans).mockResolvedValue({ data: [] } as any);
  });

  it('台账展示待支付并登记支付', async () => {
    jest.mocked(payOaExpense).mockResolvedValue({
      data: { ...pending, status: 'PAID' },
    } as any);
    render(<ExpenseManagePage />);

    expect(await screen.findByText('11 月差旅报销')).toBeTruthy();
    expect(screen.getByText('¥1,234.50')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '登记支付' }));

    const dialog = await screen.findByRole('dialog');
    expect(
      (within(dialog).getByLabelText('实付金额') as HTMLInputElement).value,
    ).toBe('1234.50');
    fireEvent.change(within(dialog).getByLabelText('支付流水号'), {
      target: { value: ' TX-1 ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /确认登记/ }));

    await waitFor(() => expect(payOaExpense).toHaveBeenCalledTimes(1));
    expect(jest.mocked(payOaExpense).mock.calls[0]).toEqual([
      9,
      {
        paidAmount: 1234.5,
        payDate: dayjs().format('YYYY-MM-DD'),
        payMethod: 'BANK_TRANSFER',
        payReference: 'TX-1',
        remark: undefined,
      },
    ]);
    await waitFor(() => expect(queryOaExpenseRecords).toHaveBeenCalledTimes(2));
  });

  it('登记支付时用借款核销冲抵，实付自动等于合计减核销', async () => {
    jest.mocked(queryOaExpenseRecords).mockResolvedValue({
      data: {
        list: [{ ...pending, travelNo: 'TR-20261109-0001', overBudget: true }],
        total: 1,
      },
    } as any);
    jest.mocked(queryOaOutstandingLoans).mockResolvedValue({
      data: [
        {
          id: 31,
          applicationId: 70,
          title: '差旅借款',
          applicantId: 101,
          travelNo: 'TR-20261109-0001',
          amount: '1000.00',
          balance: '1000.00',
          status: 'OUTSTANDING',
        },
      ],
    } as any);
    jest.mocked(payOaExpense).mockResolvedValue({
      data: { ...pending, status: 'PAID' },
    } as any);
    render(<ExpenseManagePage />);

    await screen.findByText('11 月差旅报销');
    fireEvent.click(screen.getByRole('button', { name: '登记支付' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      await within(dialog).findByText(
        '关联出差 TR-20261109-0001，报销已超出差预算',
      ),
    ).toBeTruthy();
    expect(queryOaOutstandingLoans).toHaveBeenCalledWith(101);
    const writeOff = await within(dialog).findByLabelText('核销借款 31');
    fireEvent.change(writeOff, { target: { value: '1000' } });
    fireEvent.blur(writeOff);
    await waitFor(() =>
      expect(
        (within(dialog).getByLabelText('实付金额') as HTMLInputElement).value,
      ).toBe('234.50'),
    );
    fireEvent.click(within(dialog).getByRole('button', { name: /确认登记/ }));

    await waitFor(() => expect(payOaExpense).toHaveBeenCalledTimes(1));
    expect(jest.mocked(payOaExpense).mock.calls[0][1]).toMatchObject({
      paidAmount: 234.5,
      writeOffs: [{ loanId: 31, amount: 1000 }],
    });
  });

  it('实付与合计减核销不一致时拦截提交', async () => {
    const errorSpy = jest.spyOn(message, 'error');
    render(<ExpenseManagePage />);
    await screen.findByText('11 月差旅报销');
    fireEvent.click(screen.getByRole('button', { name: '登记支付' }));
    const dialog = await screen.findByRole('dialog');
    const paid = within(dialog).getByLabelText('实付金额');
    fireEvent.change(paid, { target: { value: '100' } });
    fireEvent.blur(paid);
    fireEvent.click(within(dialog).getByRole('button', { name: /确认登记/ }));

    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith(
        '实付金额应为报销合计减核销金额 ¥1,234.50',
      ),
    );
    expect(payOaExpense).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('详情抽屉展示报销明细并可跳转审批轨迹', async () => {
    render(<ExpenseManagePage />);
    await screen.findByText('11 月差旅报销');
    fireEvent.click(screen.getByRole('button', { name: '详情' }));

    expect(await screen.findByText('INV-001')).toBeTruthy();
    expect(getOaExpenseRecord).toHaveBeenCalledWith(9);
    expect(screen.getByText('住宿费')).toBeTruthy();
    expect(screen.getByText('¥1,000.00')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '查看审批轨迹' }));
    expect(history.push).toHaveBeenCalledWith('/oa/application/detail?id=80');
  });

  it('新建费用类型', async () => {
    jest.mocked(createOaExpenseCategory).mockResolvedValue({
      data: traffic,
    } as any);
    render(<ExpenseManagePage />);
    await screen.findByText('11 月差旅报销');
    fireEvent.click(screen.getByRole('tab', { name: '费用类型' }));

    expect(await screen.findByText('TRAFFIC')).toBeTruthy();
    expect(screen.getByText('¥500.00')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /新建费用类型/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('类型编码'), {
      target: { value: 'MEAL' },
    });
    fireEvent.change(within(dialog).getByLabelText('类型名称'), {
      target: { value: '餐费' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: /OK|确 定|确定/ }),
    );

    await waitFor(() =>
      expect(createOaExpenseCategory).toHaveBeenCalledTimes(1),
    );
    expect(jest.mocked(createOaExpenseCategory).mock.calls[0][0]).toMatchObject(
      {
        code: 'MEAL',
        name: '餐费',
        perItemLimit: null,
        invoiceRequired: false,
        status: 'ENABLED',
      },
    );
  });

  it('生成报销模板后进入流程设计', async () => {
    jest.mocked(createOaExpenseTemplate).mockResolvedValue({
      data: {
        formId: 4,
        formVersionId: 40,
        modelId: 15,
        modelKey: 'expense_pilot',
      },
    } as any);
    render(<ExpenseManagePage />);
    await screen.findByText('11 月差旅报销');

    fireEvent.click(screen.getByRole('button', { name: /生成报销模板/ }));
    const confirm = await screen.findByText('生成报销表单与流程草稿？');
    const popover = confirm.closest('.ant-popover') as HTMLElement;
    fireEvent.click(within(popover).getByRole('button', { name: /生\s*成/ }));

    await waitFor(() =>
      expect(createOaExpenseTemplate).toHaveBeenCalledTimes(1),
    );
    await waitFor(() =>
      expect(history.push).toHaveBeenCalledWith('/oa/process/design?id=15'),
    );
  });
});

describe('我的报销', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryMyOaExpenses).mockResolvedValue({
      data: {
        list: [
          {
            ...pending,
            status: 'PAID',
            paidAmount: '1234.50',
            payDate: '2026-11-08',
            payMethod: 'CASH',
          },
        ],
        total: 1,
      },
    } as any);
    jest.mocked(getMyOaExpense).mockResolvedValue({
      data: {
        ...detail,
        expense: {
          ...pending,
          status: 'PAID',
          paidAmount: '1234.50',
          payDate: '2026-11-08',
          payMethod: 'CASH',
          payerName: '财务李四',
          travelNo: 'TR-20261109-0001',
          overBudget: true,
          writeOffAmount: '1000.00',
        },
        writeOffs: [
          {
            id: 5,
            loanId: 31,
            action: 'WRITE_OFF',
            amount: '1000.00',
            balanceAfter: '0.00',
            expenseId: 9,
            bizDate: '2026-11-08',
          },
        ],
      },
    } as any);
  });

  it('展示本人报销与支付信息', async () => {
    render(<MyExpensePage />);

    expect(await screen.findByText('11 月差旅报销')).toBeTruthy();
    expect(screen.getByText('2026-11-08')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '详情' }));

    expect(await screen.findByText('财务李四')).toBeTruthy();
    expect(getMyOaExpense).toHaveBeenCalledWith(9);
    expect(screen.getByText('现金')).toBeTruthy();
    expect(screen.getByText('TR-20261109-0001')).toBeTruthy();
    expect(screen.getByText('超预算')).toBeTruthy();
    expect(screen.getByRole('table', { name: '借款核销' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '发起报销' }));
    expect(history.push).toHaveBeenCalledWith('/oa/launch');
  });
});
