import {
  configure,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { history } from '@umijs/max';
import dayjs from 'dayjs';
import StatsPage from '@/pages/oa/stats';
import WorkbenchPage from '@/pages/oa/workbench';
import {
  createOaExport,
  getOaStatsOverview,
  getOaWorkbench,
  queryOaExports,
} from '@/services/web/guardfind/oa';
import { download } from '@/utils/download';
import {
  approvalRate,
  defaultStatsRange,
  exportActive,
  exportDownloadable,
  formatHours,
  formatMoney,
  statsRangeError,
} from '@/utils/oaStats';

let mockCanExport = true;

jest.mock('@umijs/max', () => ({
  history: { push: jest.fn() },
  useModel: () => undefined,
}));

jest.mock('@/hooks/useAccess', () => ({
  useAccess: () => ({
    permissions: [],
    roles: [],
    isAdmin: false,
    hasPermission: (code: string) =>
      code === 'system:oa:stats:export' ? mockCanExport : true,
    hasRole: () => false,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
  }),
}));

jest.mock('@/services/web/guardfind/oa', () => ({
  createOaExport: jest.fn(),
  getOaStatsOverview: jest.fn(),
  getOaWorkbench: jest.fn(),
  oaExportDownloadUrl: (id: number | string) =>
    `system/oa/stats/exports/${id}/download`,
  queryOaExports: jest.fn(),
}));

jest.mock('@/utils/download', () => ({ download: jest.fn() }));

jest.setTimeout(90000);
configure({ asyncUtilTimeout: 15000 });

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const typeRow = (overrides: Record<string, unknown> = {}) => ({
  businessType: 'EXPENSE',
  total: 4,
  running: 1,
  approved: 2,
  rejected: 1,
  withdrawn: 0,
  cancelled: 0,
  avgHours: 3,
  requestedAmount: 350.5,
  approvedAmount: 100.5,
  ...overrides,
});

describe('oaStats 工具', () => {
  it('区间校验与后端口径一致', () => {
    const from = dayjs('2026-01-01');
    expect(statsRangeError(null)).toBe('请选择统计区间');
    expect(statsRangeError([from, from.subtract(1, 'day')])).toBe(
      '结束日期不能早于开始日期',
    );
    expect(statsRangeError([from, from.add(365, 'day')])).toBeNull();
    expect(statsRangeError([from, from.add(366, 'day')])).toBe(
      '统计区间不能超过 366 天',
    );
    const [start, end] = defaultStatsRange(dayjs('2026-11-10 15:00:00'));
    expect(start.format('YYYY-MM-DD')).toBe('2026-11-01');
    expect(end.format('YYYY-MM-DD')).toBe('2026-11-10');
  });

  it('通过率、金额、耗时与导出状态', () => {
    expect(approvalRate(typeRow() as any)).toBe(66.7);
    expect(approvalRate(typeRow({ approved: 0, rejected: 0 }) as any)).toBe(
      null,
    );
    expect(formatMoney('1234.5')).toBe('1,234.50');
    expect(formatHours(null)).toBe('—');
    expect(
      exportActive([{ status: 'DONE' }, { status: 'RUNNING' }] as any),
    ).toBe(true);
    const now = dayjs('2026-11-10 12:00:00');
    expect(
      exportDownloadable(
        { status: 'DONE', expireTime: '2026-11-11 12:00:00' } as any,
        now,
      ),
    ).toBe(true);
    expect(
      exportDownloadable(
        { status: 'DONE', expireTime: '2026-11-10 11:00:00' } as any,
        now,
      ),
    ).toBe(false);
    expect(exportDownloadable({ status: 'FAILED' } as any, now)).toBe(false);
  });
});

describe('OA 工作台', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getOaWorkbench).mockResolvedValue({
      data: {
        todoCount: 2,
        overdueTodoCount: 1,
        overdueHours: 24,
        runningCount: 3,
        unreadNotificationCount: 5,
        unreadCcCount: 1,
        dailyReportSubmitted: false,
        recentApplications: [
          {
            id: 88,
            businessType: 'EXPENSE',
            title: '差旅报销',
            status: 'RUNNING',
            submittedTime: '2026-11-09 10:00:00',
          },
        ],
        todayEvents: [
          {
            id: 1,
            title: '方案评审',
            subtitle: '一号会议室',
            startTime: '2026-11-10 09:00:00',
            endTime: '2026-11-10 10:00:00',
            status: 'ACTIVE',
          },
        ],
        upcomingMeetings: [],
        activeVehicleRequests: [
          {
            id: 7,
            title: '客户拜访',
            subtitle: '浦东',
            startTime: '2026-11-11 09:00:00',
            endTime: '2026-11-11 12:00:00',
            status: 'DISPATCHED',
          },
        ],
      },
    } as any);
  });

  it('展示本人汇总并跳转对应模块', async () => {
    render(<WorkbenchPage />);
    const todo = await screen.findByTestId('workbench-todo');
    expect(within(todo).getByText('超 24 小时 1')).toBeTruthy();
    expect(
      within(screen.getByTestId('workbench-report')).getByText('未提交'),
    ).toBeTruthy();
    expect(screen.getByText('方案评审')).toBeTruthy();
    expect(screen.getByText('一号会议室')).toBeTruthy();
    expect(screen.getByText('客户拜访')).toBeTruthy();
    expect(screen.getByText('暂无会议预订')).toBeTruthy();
    expect(screen.getByText('报销')).toBeTruthy();

    fireEvent.click(todo);
    expect(history.push).toHaveBeenCalledWith('/oa/tasks');
    fireEvent.click(screen.getByText('差旅报销'));
    expect(history.push).toHaveBeenCalledWith('/oa/application/detail?id=88');
    fireEvent.click(screen.getByText('发起申请'));
    expect(history.push).toHaveBeenCalledWith('/oa/launch');
  });
});

describe('统计报表', () => {
  const doneTask = {
    id: 31,
    exportType: 'APPLICATION',
    dateFrom: '2026-11-01',
    dateTo: '2026-11-10',
    status: 'DONE',
    fileName: 'OA申请明细.xlsx',
    rowCount: 4,
    createTime: '2026-11-10 10:00:00',
    expireTime: dayjs().add(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
  };
  const expiredTask = {
    ...doneTask,
    id: 32,
    exportType: 'VEHICLE_USE',
    status: 'EXPIRED',
    fileName: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCanExport = true;
    jest.mocked(getOaStatsOverview).mockResolvedValue({
      data: {
        from: '2026-11-01',
        to: '2026-11-10',
        total: typeRow({ businessType: null }),
        byType: [typeRow()],
        byDept: [
          { deptName: '研发部', total: 3, approved: 2, approvedAmount: 100.5 },
        ],
        overdueHours: 24,
        overdueTaskCount: 1,
        overdueTasks: [
          {
            taskId: 't-1',
            taskName: '主管审批',
            applicationId: 66,
            title: '采购申请',
            businessType: 'PURCHASE',
            applicantName: 'Alice',
            assigneeName: 'Bob',
            createTime: '2026-11-08 09:00:00',
            pendingHours: 50,
          },
        ],
      },
    } as any);
    jest
      .mocked(queryOaExports)
      .mockResolvedValue({ data: [doneTask, expiredTask] } as any);
    jest.mocked(createOaExport).mockResolvedValue({ data: doneTask } as any);
    jest.mocked(download).mockResolvedValue(undefined);
  });

  it('按默认区间查询并展示汇总、部门与超期待办', async () => {
    render(<StatsPage />);
    await screen.findByText('研发部');
    const [from, to] = defaultStatsRange();
    expect(getOaStatsOverview).toHaveBeenCalledWith({
      from: from.format('YYYY-MM-DD'),
      to: to.format('YYYY-MM-DD'),
      businessType: undefined,
    });
    expect(screen.getAllByText('66.7%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('350.50').length).toBeGreaterThan(0);
    expect(screen.getByText('50 小时')).toBeTruthy();
    fireEvent.click(screen.getByText('采购申请'));
    expect(history.push).toHaveBeenCalledWith('/oa/application/detail?id=66');
  });

  it('创建导出并只对未过期的完成任务提供下载', async () => {
    render(<StatsPage />);
    await screen.findByText('可下载');
    fireEvent.click(screen.getByText('导出申请明细'));
    await waitFor(() => expect(createOaExport).toHaveBeenCalledTimes(1));
    const params = jest.mocked(createOaExport).mock.calls[0][0];
    expect(params.exportType).toBe('APPLICATION');
    expect(params.requestId).toBeTruthy();
    expect(params.from).toBe(defaultStatsRange()[0].format('YYYY-MM-DD'));

    const downloads = screen.getAllByText('下载');
    expect(downloads).toHaveLength(1);
    expect(screen.getByText('已过期')).toBeTruthy();
    fireEvent.click(downloads[0]);
    await waitFor(() =>
      expect(download).toHaveBeenCalledWith(
        'system/oa/stats/exports/31/download',
        { filename: 'OA申请明细.xlsx' },
      ),
    );
  });

  it('无导出权限时不展示导出区也不查询导出任务', async () => {
    mockCanExport = false;
    render(<StatsPage />);
    await screen.findByText('研发部');
    expect(screen.queryByText('导出申请明细')).toBeNull();
    expect(queryOaExports).not.toHaveBeenCalled();
  });
});
