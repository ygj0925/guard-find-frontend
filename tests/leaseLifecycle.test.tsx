import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Panel from '@/pages/guardfind/leases/LeaseLifecyclePanel';
import {
  actOnLeaseBill,
  createLeaseBill,
  generateLeaseBills,
  queryLeaseLifecycle,
} from '@/services/web/guardfind/leaseLifecycle';

type LeaseDetail = import('@/services/web/guardfind/leases').LeaseDetail;
const mockPermissions = new Set<string>();
jest.mock('umi', () => ({ request: jest.fn() }));
jest.mock('@/hooks/useAccess', () => ({
  useAccess: () => ({
    hasPermission: (value: string) => mockPermissions.has(value),
  }),
}));
jest.mock('@/services/web/guardfind/leaseLifecycle', () => ({
  ...jest.requireActual('@/services/web/guardfind/leaseLifecycle'),
  queryLeaseLifecycle: jest.fn(),
  createLeaseBill: jest.fn(),
  generateLeaseBills: jest.fn(),
  actOnLeaseBill: jest.fn(),
  createLeaseDocument: jest.fn(),
  actOnLeaseDocument: jest.fn(),
  queryLeaseFile: jest.fn(),
  uploadLeaseFile: jest.fn(),
  reopenLeaseProperty: jest.fn(),
}));
const lease = {
  id: '501',
  status: 'SIGNED',
  version: 3,
  startDate: '2026-11-01',
  endDate: '2027-10-31',
  monthlyRent: 2000,
  deposit: 2000,
} as LeaseDetail;
const bill = {
  id: '601',
  kind: 'RENT',
  title: '十一月租金',
  periodStart: '2026-11-01',
  periodEnd: '2026-11-30',
  dueDate: '2026-11-01',
  amount: 2000,
  status: 'PENDING_CONFIRMATION',
  version: 2,
};
const getComputedStyle = window.getComputedStyle;
beforeAll(() =>
  jest
    .spyOn(window, 'getComputedStyle')
    .mockImplementation((element) => getComputedStyle(element)),
);
afterAll(() => jest.restoreAllMocks());
beforeEach(() => {
  jest.clearAllMocks();
  mockPermissions.clear();
  mockPermissions.add('system:property:lease:update');
  (queryLeaseLifecycle as jest.Mock).mockResolvedValue({
    data: {
      bills: [bill],
      documents: [],
      amountDue: 2000,
      amountPaid: 0,
      amountPending: 2000,
    },
  });
  (actOnLeaseBill as jest.Mock).mockResolvedValue({ data: null });
  (createLeaseBill as jest.Mock).mockResolvedValue({ data: null });
  (generateLeaseBills as jest.Mock).mockResolvedValue({ data: null });
});
it('requires a review confirmation before marking a payment received', async () => {
  render(<Panel lease={lease} onChanged={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: '确认收款' }));
  expect(actOnLeaseBill).not.toHaveBeenCalled();
  expect(screen.getByText(/请核实银行或线下收款记录/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '核对并提交' }));
  await waitFor(() =>
    expect(actOnLeaseBill).toHaveBeenCalledWith(
      '501',
      '601',
      expect.objectContaining({ action: 'CONFIRM', version: 2 }),
    ),
  );
});
it('hides financial write operations without the edit permission', async () => {
  mockPermissions.clear();
  render(<Panel lease={lease} onChanged={jest.fn()} />);
  await screen.findByText('十一月租金');
  expect(screen.queryByRole('button', { name: '新增账单' })).toBeNull();
  expect(screen.queryByRole('button', { name: '确认收款' })).toBeNull();
});
it('shows billing rules before generating the full schedule', async () => {
  render(<Panel lease={lease} onChanged={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: '生成周期账单' }));
  expect(screen.getByText(/末期不足整月按实际天数比例计费/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '核对并提交' }));
  await waitFor(() =>
    expect(generateLeaseBills).toHaveBeenCalledWith(
      '501',
      expect.objectContaining({
        cycleMonths: 1,
        dueDaysBefore: 0,
        includeDeposit: true,
      }),
    ),
  );
});
it('keeps an unsuccessful bill form so the operator can correct it', async () => {
  (createLeaseBill as jest.Mock).mockRejectedValueOnce(
    new Error('费用期间不在合同内'),
  );
  render(<Panel lease={lease} onChanged={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: '新增账单' }));
  fireEvent.change(screen.getByLabelText('费用名称与依据'), {
    target: { value: '合同约定租金' },
  });
  fireEvent.click(screen.getByRole('button', { name: '核对并提交' }));
  await waitFor(() => expect(createLeaseBill).toHaveBeenCalled());
  expect(
    (screen.getByLabelText('费用名称与依据') as HTMLInputElement).value,
  ).toBe('合同约定租金');
  expect(screen.getAllByText('费用期间不在合同内').length).toBeGreaterThan(0);
});
