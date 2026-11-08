import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { history } from '@umijs/max';
import dayjs from 'dayjs';
import TravelManagePage from '@/pages/oa/travel';
import MyTravelPage from '@/pages/oa/travel/mine';
import {
  createOaTravelTemplate,
  disburseOaLoan,
  getMyOaLoan,
  getOaTravel,
  queryMyOaLoans,
  queryMyOaTravels,
  queryOaLoans,
  queryOaTravels,
  repayOaLoan,
} from '@/services/web/guardfind/oa';
import { newRequestId, toCents } from '@/utils/oaTravel';

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
  createOaTravelTemplate: jest.fn(),
  disburseOaLoan: jest.fn(),
  getMyOaLoan: jest.fn(),
  getMyOaTravel: jest.fn(),
  getOaLoan: jest.fn(),
  getOaTravel: jest.fn(),
  queryMyOaLoans: jest.fn(),
  queryMyOaTravels: jest.fn(),
  queryOaLoans: jest.fn(),
  queryOaTravels: jest.fn(),
  repayOaLoan: jest.fn(),
}));

const travel = {
  id: 3,
  applicationId: 60,
  title: '上海客户拜访',
  applicationStatus: 'APPROVED',
  applicantId: 101,
  applicantName: '张三',
  travelNo: 'TR-20261109-0001',
  destination: '上海',
  startDate: '2026-11-10',
  endDate: '2026-11-12',
  days: 3,
  budgetAmount: '3000.00',
  status: 'APPROVED',
  loanAmount: '1000.00',
  loanBalance: '600.00',
  expenseAmount: '400.00',
};

const pendingLoan = {
  id: 31,
  applicationId: 70,
  title: '差旅借款',
  applicationStatus: 'APPROVED',
  applicantId: 101,
  applicantName: '张三',
  travelId: 3,
  travelNo: 'TR-20261109-0001',
  amount: '1000.00',
  balance: '1000.00',
  status: 'PENDING_DISBURSE',
};

const outstandingLoan = {
  ...pendingLoan,
  id: 32,
  title: '备用金借款',
  balance: '600.00',
  status: 'OUTSTANDING',
  disburseDate: '2026-11-08',
};

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('出差借款工具函数', () => {
  it('金额按分计算避免浮点误差，请求号带前缀且不超过 64 位', () => {
    expect(toCents('0.1') + toCents(0.2)).toBe(30);
    expect(toCents(null)).toBe(0);
    const id = newRequestId('repay');
    expect(id.startsWith('repay-')).toBe(true);
    expect(id.length).toBeLessThanOrEqual(64);
    expect(newRequestId('repay')).not.toBe(id);
  });
});

describe('出差借款管理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryOaTravels).mockResolvedValue({
      data: { list: [travel], total: 1 },
    } as any);
    jest.mocked(queryOaLoans).mockResolvedValue({
      data: { list: [pendingLoan, outstandingLoan], total: 2 },
    } as any);
  });

  it('出差台账展示预算与关联借款报销', async () => {
    jest.mocked(getOaTravel).mockResolvedValue({
      data: {
        travel,
        loans: [outstandingLoan],
        expenses: [
          {
            id: 9,
            applicationId: 80,
            title: '上海报销',
            applicantId: 101,
            totalAmount: '400.00',
            itemCount: 1,
            status: 'PAID',
            overBudget: false,
          },
        ],
      },
    } as any);
    render(<TravelManagePage />);

    expect(await screen.findByText('TR-20261109-0001')).toBeTruthy();
    expect(screen.getByText('2026-11-10 至 2026-11-12（3 天）')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '详情' }));

    expect(await screen.findByText('上海报销')).toBeTruthy();
    expect(getOaTravel).toHaveBeenCalledWith(3);
    expect(screen.getByText('备用金借款')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '查看审批轨迹' }));
    expect(history.push).toHaveBeenCalledWith('/oa/application/detail?id=60');
  });

  it('登记放款默认借款金额', async () => {
    jest.mocked(disburseOaLoan).mockResolvedValue({
      data: { ...pendingLoan, status: 'OUTSTANDING' },
    } as any);
    render(<TravelManagePage />);
    await screen.findByText('TR-20261109-0001');
    fireEvent.click(screen.getByRole('tab', { name: '借款台账' }));
    await screen.findByText('备用金借款', {}, { timeout: 15000 });

    fireEvent.click(await screen.findByRole('button', { name: '登记放款' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      (within(dialog).getByLabelText('放款金额') as HTMLInputElement).value,
    ).toBe('1000.00');
    fireEvent.change(within(dialog).getByLabelText('流水号'), {
      target: { value: ' BX-1 ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /确认放款/ }));

    await waitFor(() => expect(disburseOaLoan).toHaveBeenCalledTimes(1));
    expect(jest.mocked(disburseOaLoan).mock.calls[0]).toEqual([
      31,
      {
        amount: 1000,
        disburseDate: dayjs().format('YYYY-MM-DD'),
        method: 'BANK_TRANSFER',
        reference: 'BX-1',
        remark: undefined,
      },
    ]);
    await waitFor(() => expect(queryOaLoans).toHaveBeenCalledTimes(2));
  });

  it('登记还款携带请求号，失败重试复用同一请求号', async () => {
    jest
      .mocked(repayOaLoan)
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockResolvedValueOnce({
        data: { ...outstandingLoan, balance: '0.00', status: 'SETTLED' },
      } as any);
    render(<TravelManagePage />);
    await screen.findByText('TR-20261109-0001');
    fireEvent.click(screen.getByRole('tab', { name: '借款台账' }));
    await screen.findByText('备用金借款', {}, { timeout: 15000 });

    fireEvent.click(await screen.findByRole('button', { name: '登记还款' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      (within(dialog).getByLabelText('还款金额') as HTMLInputElement).value,
    ).toBe('600.00');
    const submit = within(dialog).getByRole('button', { name: /确认还款/ });
    fireEvent.click(submit);
    await waitFor(() => expect(repayOaLoan).toHaveBeenCalledTimes(1));
    fireEvent.click(submit);
    await waitFor(() => expect(repayOaLoan).toHaveBeenCalledTimes(2));

    const [first, second] = jest.mocked(repayOaLoan).mock.calls;
    expect(first[0]).toBe(32);
    expect(first[1]).toMatchObject({
      amount: 600,
      repayDate: dayjs().format('YYYY-MM-DD'),
      method: 'BANK_TRANSFER',
    });
    expect(first[1].requestId).toMatch(/^repay-/);
    expect(second[1].requestId).toBe(first[1].requestId);
  });

  it('生成出差借款模板后进入出差流程设计', async () => {
    jest.mocked(createOaTravelTemplate).mockResolvedValue({
      data: {
        travelFormId: 5,
        travelModelId: 16,
        travelModelKey: 'travel_pilot',
        loanFormId: 6,
        loanModelId: 17,
        loanModelKey: 'loan_pilot',
      },
    } as any);
    render(<TravelManagePage />);
    await screen.findByText('TR-20261109-0001');

    fireEvent.click(screen.getByRole('button', { name: /生成出差借款模板/ }));
    const confirm = await screen.findByText('生成出差与借款模板？');
    const popover = confirm.closest('.ant-popover') as HTMLElement;
    fireEvent.click(within(popover).getByRole('button', { name: /生\s*成/ }));

    await waitFor(() =>
      expect(createOaTravelTemplate).toHaveBeenCalledTimes(1),
    );
    await waitFor(() =>
      expect(history.push).toHaveBeenCalledWith('/oa/process/design?id=16'),
    );
  });
});

describe('我的出差借款', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryMyOaTravels).mockResolvedValue({
      data: { list: [travel], total: 1 },
    } as any);
    jest.mocked(queryMyOaLoans).mockResolvedValue({
      data: { list: [outstandingLoan], total: 1 },
    } as any);
    jest.mocked(getMyOaLoan).mockResolvedValue({
      data: {
        loan: outstandingLoan,
        ledger: [
          {
            id: 1,
            loanId: 32,
            action: 'DISBURSE',
            amount: '1000.00',
            balanceAfter: '1000.00',
            bizDate: '2026-11-08',
            method: 'BANK_TRANSFER',
            operatorName: '财务李四',
          },
          {
            id: 2,
            loanId: 32,
            action: 'WRITE_OFF',
            amount: '400.00',
            balanceAfter: '600.00',
            expenseId: 9,
            bizDate: '2026-11-09',
            operatorName: '财务李四',
          },
        ],
      },
    } as any);
  });

  it('展示本人出差并查看借款台账', async () => {
    render(<MyTravelPage />);
    expect(await screen.findByText('TR-20261109-0001')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '发起出差或借款' }));
    expect(history.push).toHaveBeenCalledWith('/oa/launch');

    fireEvent.click(screen.getByRole('tab', { name: '我的借款' }));
    expect(await screen.findByText('备用金借款')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '详情' }));

    expect(await screen.findByText('报销核销')).toBeTruthy();
    expect(getMyOaLoan).toHaveBeenCalledWith(32);
    expect(screen.getByText('报销单 #9')).toBeTruthy();
    expect(screen.getAllByText('财务李四').length).toBeGreaterThan(0);
  });
});
