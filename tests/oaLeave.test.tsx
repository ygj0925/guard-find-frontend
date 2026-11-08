import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { history } from '@umijs/max';
import LeaveManagePage from '@/pages/oa/leave';
import MyLeavePage from '@/pages/oa/leave/mine';
import {
  createOaLeaveTemplate,
  createOaLeaveType,
  grantOaLeaveBalance,
  queryMyOaLeaveBalances,
  queryMyOaLeaveRequests,
  queryOaEmployeeOptions,
  queryOaLeaveBalances,
  queryOaLeaveLedger,
  queryOaLeaveTypes,
  queryOaWorkCalendar,
} from '@/services/web/guardfind/oa';
import { formatDays, halfText, leavePreviewInput } from '@/utils/oaLeave';

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
  createOaLeaveTemplate: jest.fn(),
  createOaLeaveType: jest.fn(),
  deleteOaWorkCalendar: jest.fn(),
  grantOaLeaveBalance: jest.fn(),
  queryMyOaLeaveBalances: jest.fn(),
  queryMyOaLeaveRequests: jest.fn(),
  queryOaEmployeeOptions: jest.fn(),
  queryOaLeaveBalances: jest.fn(),
  queryOaLeaveLedger: jest.fn(),
  queryOaLeaveTypes: jest.fn(),
  queryOaWorkCalendar: jest.fn(),
  saveOaWorkCalendar: jest.fn(),
  updateOaLeaveType: jest.fn(),
}));

const annual = {
  id: 1,
  code: 'ANNUAL',
  name: '年假',
  balanceRequired: true,
  maxDaysPerRequest: null,
  status: 'ENABLED',
  sort: 0,
  remark: null,
  version: 0,
};

const sick = {
  ...annual,
  id: 2,
  code: 'SICK',
  name: '病假',
  balanceRequired: false,
  maxDaysPerRequest: '30.0',
  sort: 1,
};

const balance = {
  id: 7,
  userId: 101,
  userName: '张三',
  leaveTypeId: 1,
  leaveTypeCode: 'ANNUAL',
  leaveTypeName: '年假',
  periodYear: 2026,
  totalDays: '10.0',
  usedDays: '2.0',
  occupiedDays: '1.5',
  availableDays: '6.5',
  updateTime: '2026-11-09 10:00:00',
};

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('请假工具函数', () => {
  it('天数统一保留一位且去掉多余 0', () => {
    expect(formatDays('2.0')).toBe('2');
    expect(formatDays(1.5)).toBe('1.5');
    expect(formatDays(null)).toBe('—');
    expect(halfText('PM')).toBe('下午');
    expect(halfText('AM')).toBe('上午');
  });

  it('只有类型与起止日期齐全才生成预览入参', () => {
    expect(leavePreviewInput({ leaveType: 'ANNUAL' })).toBeNull();
    expect(
      leavePreviewInput({
        leaveType: 'ANNUAL',
        startDate: '2026-11-09',
        endDate: '2026-11-10',
        endHalf: 'AM',
        reason: '回家',
      }),
    ).toEqual({
      leaveType: 'ANNUAL',
      startDate: '2026-11-09',
      endDate: '2026-11-10',
      endHalf: 'AM',
    });
  });
});

describe('假期管理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryOaLeaveTypes).mockResolvedValue({
      data: [annual, sick],
    } as any);
    jest.mocked(queryOaWorkCalendar).mockResolvedValue({
      data: [
        { id: 1, calendarDate: '2026-10-01', dayType: 'HOLIDAY', name: '国庆' },
      ],
    } as any);
    jest.mocked(queryOaLeaveBalances).mockResolvedValue({
      data: { list: [balance], total: 1 },
    } as any);
    jest.mocked(queryOaLeaveLedger).mockResolvedValue({
      data: [
        {
          id: 3,
          balanceId: 7,
          applicationId: 70,
          action: 'OCCUPY',
          days: '1.5',
          totalAfter: '10.0',
          usedAfter: '2.0',
          occupiedAfter: '1.5',
          operatorId: 101,
          operatorName: '张三',
          remark: null,
          createTime: '2026-11-09 10:00:00',
        },
      ],
    } as any);
    jest.mocked(queryOaEmployeeOptions).mockResolvedValue({ data: [] } as any);
  });

  it('展示假期类型并新建类型', async () => {
    jest.mocked(createOaLeaveType).mockResolvedValue({ data: annual } as any);
    render(<LeaveManagePage />);

    expect(await screen.findByText('ANNUAL')).toBeTruthy();
    expect(screen.getByText('仅记录')).toBeTruthy();
    expect(screen.getByText('30 天')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /新建假期类型/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('类型编码'), {
      target: { value: 'MARRIAGE' },
    });
    fireEvent.change(within(dialog).getByLabelText('类型名称'), {
      target: { value: '婚假' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: /OK|确 定|确定/ }),
    );

    await waitFor(() => expect(createOaLeaveType).toHaveBeenCalledTimes(1));
    expect(jest.mocked(createOaLeaveType).mock.calls[0][0]).toMatchObject({
      code: 'MARRIAGE',
      name: '婚假',
      balanceRequired: true,
      status: 'ENABLED',
      maxDaysPerRequest: null,
    });
  });

  it('余额页展示可用天数并打开台账', async () => {
    render(<LeaveManagePage />);
    await screen.findByText('ANNUAL');
    fireEvent.click(screen.getByRole('tab', { name: '余额与台账' }));

    expect(await screen.findByText('6.5')).toBeTruthy();
    expect(screen.getByText('张三')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '台账' }));

    expect(await screen.findByText('审批占用')).toBeTruthy();
    expect(queryOaLeaveLedger).toHaveBeenCalledWith(7);
    expect(screen.getByText('10 / 2 / 1.5')).toBeTruthy();
  });

  it('调整额度时雪花员工 ID 按字符串原样提交', async () => {
    jest.mocked(queryOaLeaveBalances).mockResolvedValue({
      data: {
        list: [{ ...balance, userId: '547889293968801825' }],
        total: 1,
      },
    } as any);
    jest.mocked(grantOaLeaveBalance).mockResolvedValue({ data: null } as any);
    render(<LeaveManagePage />);
    await screen.findByText('ANNUAL');
    fireEvent.click(screen.getByRole('tab', { name: '余额与台账' }));
    await screen.findByText('张三');
    fireEvent.click(screen.getByRole('button', { name: /调\s*整/ }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('调整天数'), {
      target: { value: '5' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: /OK|确 定|确定/ }),
    );

    await waitFor(() => expect(grantOaLeaveBalance).toHaveBeenCalledTimes(1));
    expect(jest.mocked(grantOaLeaveBalance).mock.calls[0][0]).toMatchObject({
      userId: '547889293968801825',
      leaveTypeId: 1,
      periodYear: 2026,
      days: 5,
    });
  });

  it('工作日历按年度展示登记日期', async () => {
    render(<LeaveManagePage />);
    await screen.findByText('ANNUAL');
    fireEvent.click(screen.getByRole('tab', { name: '工作日历' }));

    expect(await screen.findByText('2026-10-01（四）')).toBeTruthy();
    expect(screen.getByText('国庆')).toBeTruthy();
    expect(queryOaWorkCalendar).toHaveBeenCalled();
  });

  it('生成请假模板后进入流程设计', async () => {
    jest.mocked(createOaLeaveTemplate).mockResolvedValue({
      data: {
        formId: 3,
        formVersionId: 30,
        modelId: 12,
        modelKey: 'leave_pilot',
      },
    } as any);
    render(<LeaveManagePage />);
    await screen.findByText('ANNUAL');

    fireEvent.click(screen.getByRole('button', { name: /生成请假模板/ }));
    const confirm = await screen.findByText('生成请假表单与流程草稿？');
    const popover = confirm.closest('.ant-popover') as HTMLElement;
    fireEvent.click(within(popover).getByRole('button', { name: /生\s*成/ }));

    await waitFor(() => expect(createOaLeaveTemplate).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(history.push).toHaveBeenCalledWith('/oa/process/design?id=12'),
    );
  });
});

describe('我的假期', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryMyOaLeaveBalances).mockResolvedValue({
      data: [balance],
    } as any);
    jest.mocked(queryMyOaLeaveRequests).mockResolvedValue({
      data: {
        list: [
          {
            id: 1,
            applicationId: 70,
            title: '年假申请',
            applicationStatus: 'RUNNING',
            leaveTypeCode: 'ANNUAL',
            leaveTypeName: '年假',
            startDate: '2026-11-09',
            startHalf: 'PM',
            endDate: '2026-11-10',
            endHalf: 'PM',
            days: '1.5',
            periodYear: 2026,
            status: 'OCCUPIED',
            createTime: '2026-11-09 10:00:00',
          },
        ],
        total: 1,
      },
    } as any);
  });

  it('展示年度余额与请假记录', async () => {
    render(<MyLeavePage />);

    expect(await screen.findByText('总额 10')).toBeTruthy();
    expect(
      document.querySelector('.ant-statistic-content')?.textContent,
    ).toContain('6.5');
    expect(screen.getByText('审批中 1.5')).toBeTruthy();
    expect(await screen.findByText('年假申请')).toBeTruthy();
    expect(screen.getByText('2026-11-09 下午 至 2026-11-10 下午')).toBeTruthy();
    expect(screen.getByText('审批中占用')).toBeTruthy();
    expect(screen.getByText('审批中')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '详情' }));
    expect(history.push).toHaveBeenCalledWith('/oa/application/detail?id=70');
  });

  it('没有额度时提示联系人事', async () => {
    jest.mocked(queryMyOaLeaveBalances).mockResolvedValue({ data: [] } as any);
    render(<MyLeavePage />);

    expect(
      await screen.findByText(/暂无发放的假期额度，如有疑问请联系人事/),
    ).toBeTruthy();
  });
});
