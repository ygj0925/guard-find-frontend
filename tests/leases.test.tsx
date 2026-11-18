import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  LeaseDetailDrawer,
  LeaseEditor,
  LeaseReminderSettings,
} from '@/pages/guardfind/leases';
import {
  actOnLease,
  queryLease,
  queryLeasePdf,
  queryLeaseSettings,
  updateLease,
  updateLeaseSettings,
} from '@/services/web/guardfind/leases';

type LeaseDetail = import('@/services/web/guardfind/leases').LeaseDetail;

const mockPermissions = new Set<string>();
jest.mock('@/pages/guardfind/leases/LeaseLifecyclePanel', () => () => null);
jest.mock('@/hooks/useAccess', () => ({
  useAccess: () => ({
    hasPermission: (permission: string) => mockPermissions.has(permission),
  }),
}));
jest.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => children,
  ProTable: () => null,
}));
jest.mock('@/services/web/guardfind/leases', () => ({
  actOnLease: jest.fn(),
  createLease: jest.fn(),
  updateLease: jest.fn(),
  queryLease: jest.fn(),
  queryLeasePdf: jest.fn(),
  queryLeases: jest.fn(),
  queryLeaseSettings: jest.fn(),
  updateLeaseSettings: jest.fn(),
  queryLeaseReminders: jest.fn(),
  queryLeaseProperties: jest.fn().mockResolvedValue({ data: { list: [] } }),
  queryLeaseCustomers: jest.fn().mockResolvedValue({ data: { list: [] } }),
  leaseStatusLabels: {
    DRAFT: '草稿',
    PENDING_SIGNATURE: '待双方签署',
    SIGNED: '已签署',
    EXPIRED: '已到期',
    TERMINATED: '已终止',
    VOID: '已作废',
  },
  renewalLabels: {
    NONE: '未申请',
    PENDING: '待审核',
    APPROVED: '已生成续租合同',
    REJECTED: '已拒绝',
    CANCELED: '已撤回',
  },
  moveOutLabels: { NONE: '未申请', PENDING: '待处理', RESOLVED: '已处理' },
}));
const lease: LeaseDetail = {
  id: '9000000000001',
  propertyId: '12',
  propertyTitle: '测试公寓',
  propertyAddress: '上海市测试路10号',
  tenantId: '21',
  landlordId: '22',
  title: '公寓租赁合同',
  tenantName: '张三',
  landlordName: '李四',
  startDate: '2026-12-01',
  endDate: '2027-11-30',
  monthlyRent: 3000,
  deposit: 6000,
  terms: '双方已确认的完整条款',
  status: 'DRAFT',
  version: 5,
  contentHash: '',
  renewalStatus: 'NONE',
  moveOutStatus: 'NONE',
  daysRemaining: 100,
  logs: [],
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
  ['list', 'create', 'update', 'publish', 'terminate'].forEach((permission) => {
    mockPermissions.add(`system:property:lease:${permission}`);
  });
  (queryLease as jest.Mock).mockResolvedValue({ data: lease });
  (queryLeaseSettings as jest.Mock).mockResolvedValue({
    data: {
      remindersEnabled: false,
      reminderDays: [30, 7, 1, 0],
      renewalWindowDays: 90,
      signatureWindowDays: 7,
    },
  });
  (updateLease as jest.Mock).mockResolvedValue({});
  (updateLeaseSettings as jest.Mock).mockResolvedValue({});
  (actOnLease as jest.Mock).mockResolvedValue({ data: {} });
  (queryLeasePdf as jest.Mock).mockResolvedValue({
    data: { filename: '合同.pdf', base64: 'JVBERi0=' },
  });
});

it('allows recall only before either party signs and reminds with the loaded version', async () => {
  (queryLease as jest.Mock).mockResolvedValue({
    data: {
      ...lease,
      status: 'PENDING_SIGNATURE',
      tenantSignedAt: '2026-11-18 10:00:00',
    },
  });
  render(
    <LeaseDetailDrawer
      id={lease.id}
      onClose={jest.fn()}
      onChanged={jest.fn()}
    />,
  );
  fireEvent.click(await screen.findByRole('button', { name: '提醒未签方' }));
  expect(screen.queryByRole('button', { name: '撤回修改' })).toBeNull();
  expect(actOnLease).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '确认处理' }));
  await waitFor(() =>
    expect(actOnLease).toHaveBeenCalledWith(
      lease.id,
      expect.objectContaining({ action: 'REMIND_SIGN', version: 5 }),
    ),
  );
});

it('offers recall for unsigned contracts but requires a reason', async () => {
  (queryLease as jest.Mock).mockResolvedValue({
    data: { ...lease, status: 'PENDING_SIGNATURE' },
  });
  render(
    <LeaseDetailDrawer
      id={lease.id}
      onClose={jest.fn()}
      onChanged={jest.fn()}
    />,
  );
  fireEvent.click(await screen.findByRole('button', { name: '撤回修改' }));
  fireEvent.click(screen.getByRole('button', { name: '确认处理' }));
  await screen.findByText('请填写此项');
  expect(actOnLease).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('处理说明'), {
    target: { value: '双方信息需核实' },
  });
  fireEvent.click(screen.getByRole('button', { name: '确认处理' }));
  await waitFor(() =>
    expect(actOnLease).toHaveBeenCalledWith(
      lease.id,
      expect.objectContaining({
        action: 'RECALL',
        reason: '双方信息需核实',
        version: 5,
      }),
    ),
  );
});

it('saves a draft using its loaded version and preserves the contract terms', async () => {
  render(
    <LeaseEditor record={lease} onClose={jest.fn()} onSaved={jest.fn()} />,
  );
  expect(
    (screen.getByRole('combobox', { name: '出租房源' }) as HTMLInputElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: '保存合同草稿' }));
  await waitFor(() =>
    expect(updateLease).toHaveBeenCalledWith(
      lease.id,
      expect.objectContaining({
        version: 5,
        terms: lease.terms,
        tenantId: '21',
        landlordId: '22',
        propertyId: '12',
      }),
    ),
  );
});

it('published contracts have no edit control and publication requires an explicit confirmation', async () => {
  const changed = jest.fn();
  render(
    <LeaseDetailDrawer id={lease.id} onClose={jest.fn()} onChanged={changed} />,
  );
  fireEvent.click(await screen.findByRole('button', { name: '发布待签合同' }));
  expect(actOnLease).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '确认处理' }));
  await waitFor(() =>
    expect(actOnLease).toHaveBeenCalledWith(
      lease.id,
      expect.objectContaining({ action: 'PUBLISH', version: 5 }),
    ),
  );
  expect(changed).toHaveBeenCalled();
});

it('signed terms cannot be edited and termination requires an audit reason', async () => {
  (queryLease as jest.Mock).mockResolvedValue({
    data: {
      ...lease,
      status: 'SIGNED',
      tenantSignedAt: '2026-11-18 10:00:00',
      contentHash: 'checksum',
    },
  });
  render(
    <LeaseDetailDrawer
      id={lease.id}
      onClose={jest.fn()}
      onChanged={jest.fn()}
    />,
  );
  fireEvent.click(await screen.findByRole('button', { name: '终止合同' }));
  expect(screen.queryByRole('button', { name: '编辑草稿' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '确认处理' }));
  expect(await screen.findByText('请填写此项')).toBeTruthy();
  expect(actOnLease).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('处理说明'), {
    target: { value: '双方协商完成交接' },
  });
  fireEvent.click(screen.getByRole('button', { name: '确认处理' }));
  await waitFor(() =>
    expect(actOnLease).toHaveBeenCalledWith(
      lease.id,
      expect.objectContaining({
        action: 'TERMINATE',
        reason: '双方协商完成交接',
        version: 5,
      }),
    ),
  );
});

it('renewal approval requires publish permission even when the user can update', async () => {
  mockPermissions.delete('system:property:lease:publish');
  (queryLease as jest.Mock).mockResolvedValue({
    data: { ...lease, status: 'SIGNED', renewalStatus: 'PENDING' },
  });
  render(
    <LeaseDetailDrawer
      id={lease.id}
      onClose={jest.fn()}
      onChanged={jest.fn()}
    />,
  );
  await screen.findByRole('button', { name: '拒绝续租' });
  expect(
    screen.queryByRole('button', { name: '同意续租并生成草稿' }),
  ).toBeNull();
});

it('keeps disabled reminder settings disabled when saving and sends all thresholds', async () => {
  render(<LeaseReminderSettings />);
  fireEvent.click(await screen.findByRole('button', { name: '保存提醒设置' }));
  await waitFor(() =>
    expect(updateLeaseSettings).toHaveBeenCalledWith({
      remindersEnabled: false,
      reminderDays: [30, 7, 1, 0],
      renewalWindowDays: 90,
      signatureWindowDays: 7,
    }),
  );
});

it('opens the linked renewal draft from the original contract', async () => {
  const openLease = jest.fn();
  (queryLease as jest.Mock).mockResolvedValue({
    data: {
      ...lease,
      status: 'SIGNED',
      renewalStatus: 'APPROVED',
      renewalLeaseId: '9000000000002',
    },
  });
  render(
    <LeaseDetailDrawer
      id={lease.id}
      onClose={jest.fn()}
      onChanged={jest.fn()}
      onOpenLease={openLease}
    />,
  );
  fireEvent.click(await screen.findByRole('tab', { name: '租约信息与申请' }));
  fireEvent.click(await screen.findByRole('button', { name: '9000000000002' }));
  expect(openLease).toHaveBeenCalledWith('9000000000002');
});
