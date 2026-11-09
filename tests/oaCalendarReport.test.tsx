import {
  configure,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { message } from 'antd';
import dayjs from 'dayjs';
import CalendarPage from '@/pages/oa/calendar';
import WorkReportPage from '@/pages/oa/report';
import {
  createOaCalendarEvent,
  getMyOaWorkReportForPeriod,
  queryMyOaWorkReports,
  queryOaCalendarDepts,
  queryOaCalendarEvents,
  queryOaEmployeeOptions,
  queryOaWorkReportSummary,
  remindOaWorkReport,
  saveMyOaWorkReport,
  updateOaCalendarEvent,
} from '@/services/web/guardfind/oa';

jest.mock('@umijs/max', () => ({
  history: { push: jest.fn() },
  useModel: (_key: string, selector?: (model: any) => any) =>
    selector
      ? selector({ initialState: { user: { id: '101', nickname: '张三' } } })
      : undefined,
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
  cancelOaCalendarEvent: jest.fn(),
  commentOaWorkReport: jest.fn(),
  createOaCalendarEvent: jest.fn(),
  deleteMyOaWorkReport: jest.fn(),
  getMyOaWorkReportForPeriod: jest.fn(),
  getOaWorkReport: jest.fn(),
  queryMyOaWorkReports: jest.fn(),
  queryOaCalendarDepts: jest.fn(),
  queryOaCalendarEvents: jest.fn(),
  queryOaEmployeeOptions: jest.fn(),
  queryOaWorkReportSummary: jest.fn(),
  queryTeamOaWorkReports: jest.fn(),
  remindOaWorkReport: jest.fn(),
  saveMyOaWorkReport: jest.fn(),
  updateOaCalendarEvent: jest.fn(),
}));

jest.setTimeout(90000);
configure({ asyncUtilTimeout: 15000 });

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const today = dayjs().format('YYYY-MM-DD');

const ownEvent = {
  id: 11,
  ownerId: '101',
  ownerName: '张三',
  scope: 'PERSONAL',
  title: '方案评审',
  location: '一号会议室',
  startTime: `${today} 00:10:00`,
  endTime: `${today} 00:50:00`,
  allDay: false,
  remindMinutes: 15,
  status: 'ACTIVE',
  version: 2,
  members: [{ eventId: 11, userId: '102', userName: '李四' }],
};

const deptEvent = {
  ...ownEvent,
  id: 12,
  ownerId: '103',
  ownerName: '王五',
  scope: 'DEPT',
  deptId: 3,
  deptName: '研发部',
  title: '部门例会',
  startTime: `${today} 23:00:00`,
  endTime: `${today} 23:30:00`,
  version: 1,
  members: [],
};

describe('我的日程', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryOaCalendarEvents).mockResolvedValue({
      data: [deptEvent, ownEvent],
    } as any);
    jest.mocked(queryOaCalendarDepts).mockResolvedValue({
      data: [{ id: 3, name: '研发部' }],
    } as any);
    jest.mocked(queryOaEmployeeOptions).mockResolvedValue({ data: [] } as any);
  });

  it('按月视图区间查询，仅本人日程可编辑并携带版本号', async () => {
    jest.mocked(updateOaCalendarEvent).mockResolvedValue({ data: {} } as any);
    render(<CalendarPage />);
    await waitFor(() => expect(queryOaCalendarEvents).toHaveBeenCalled());
    const { from, to } = jest.mocked(queryOaCalendarEvents).mock.calls[0][0];
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00$/);
    expect(dayjs(to).diff(dayjs(from), 'day')).toBe(42);

    const details = await screen.findAllByRole('button', { name: /详\s*情/ });
    expect(details).toHaveLength(2);

    fireEvent.click(details[1]);
    const deptDrawer = await screen.findByRole('dialog');
    expect(within(deptDrawer).getByText('研发部')).toBeTruthy();
    expect(
      within(deptDrawer).queryByRole('button', { name: /编\s*辑/ }),
    ).toBeNull();
    fireEvent.click(document.querySelector('.ant-drawer-close') as HTMLElement);

    fireEvent.click(details[0]);
    const drawer = await screen.findByText('李四');
    const ownDrawer = drawer.closest('[role="dialog"]') as HTMLElement;
    fireEvent.click(within(ownDrawer).getByRole('button', { name: /编\s*辑/ }));

    const modal = await screen.findByRole('dialog', { name: '编辑日程' });
    fireEvent.change(within(modal).getByLabelText('日程标题'), {
      target: { value: '方案终审' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: /保\s*存/ }));
    await waitFor(() => expect(updateOaCalendarEvent).toHaveBeenCalledTimes(1));
    const [id, payload] = jest.mocked(updateOaCalendarEvent).mock.calls[0];
    expect(id).toBe(11);
    expect(payload).toMatchObject({
      title: '方案终审',
      scope: 'PERSONAL',
      remindMinutes: 15,
      memberIds: ['102'],
      version: 2,
      startTime: `${today} 00:10:00`,
      endTime: `${today} 00:50:00`,
    });
  });

  it('新建日程携带请求号与默认提醒', async () => {
    jest.mocked(createOaCalendarEvent).mockResolvedValue({ data: {} } as any);
    render(<CalendarPage />);
    await screen.findAllByRole('button', { name: /详\s*情/ });

    fireEvent.click(screen.getByRole('button', { name: /新建日程/ }));
    const modal = await screen.findByRole('dialog', { name: '新建日程' });
    fireEvent.click(within(modal).getByRole('button', { name: /保\s*存/ }));
    expect(await within(modal).findByText('请填写日程标题')).toBeTruthy();
    expect(createOaCalendarEvent).not.toHaveBeenCalled();

    fireEvent.change(within(modal).getByLabelText('日程标题'), {
      target: { value: ' 客户回访 ' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: /保\s*存/ }));
    await waitFor(() => expect(createOaCalendarEvent).toHaveBeenCalledTimes(1));
    const payload = jest.mocked(createOaCalendarEvent).mock.calls[0][0];
    expect(payload).toMatchObject({
      title: '客户回访',
      allDay: false,
      scope: 'PERSONAL',
      deptId: undefined,
      remindMinutes: 15,
      memberIds: [],
    });
    expect(payload.requestId).toMatch(/^calendar-/);
    expect(
      dayjs(payload.endTime).diff(dayjs(payload.startTime), 'minute'),
    ).toBe(60);
  });
});

const submittedReport = {
  id: 51,
  authorId: '101',
  authorName: '张三',
  reportType: 'DAILY',
  periodStart: today,
  periodEnd: today,
  doneContent: '完成接口联调',
  status: 'SUBMITTED',
  submitTime: `${today} 18:00:00`,
  late: false,
  commentCount: 0,
  version: 1,
};

describe('工作报告', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(getMyOaWorkReportForPeriod)
      .mockResolvedValue({ data: null } as any);
    jest.mocked(queryMyOaWorkReports).mockResolvedValue({
      data: { list: [], total: 0 },
    } as any);
  });

  it('填写并提交日报，提交后锁定', async () => {
    jest
      .mocked(saveMyOaWorkReport)
      .mockResolvedValue({ data: submittedReport } as any);
    render(<WorkReportPage />);
    await waitFor(() =>
      expect(getMyOaWorkReportForPeriod).toHaveBeenCalledWith({
        type: 'DAILY',
        date: today,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /提交报告/ }));
    expect(await screen.findByText('请填写已完成工作')).toBeTruthy();
    expect(saveMyOaWorkReport).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('已完成工作'), {
      target: { value: ' 完成接口联调 ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /提交报告/ }));
    await waitFor(() => expect(saveMyOaWorkReport).toHaveBeenCalledTimes(1));
    expect(jest.mocked(saveMyOaWorkReport).mock.calls[0][0]).toEqual({
      reportType: 'DAILY',
      date: today,
      doneContent: '完成接口联调',
      planContent: undefined,
      issueContent: undefined,
      submit: true,
      version: undefined,
    });
    expect(await screen.findByText(/提交后不可修改/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /提交报告/ })).toBeNull();
  });

  it('提交统计未提交优先，催交提示人数', async () => {
    jest.mocked(queryOaWorkReportSummary).mockResolvedValue({
      data: {
        reportType: 'DAILY',
        periodStart: today,
        periodEnd: today,
        total: 2,
        submitted: 1,
        late: 0,
        members: [
          {
            userId: '101',
            userName: '张三',
            deptName: '研发部',
            reportId: 51,
            status: 'SUBMITTED',
            late: false,
          },
          {
            userId: '102',
            userName: '李四',
            deptName: '研发部',
            status: 'MISSING',
            late: false,
          },
        ],
      },
    } as any);
    jest
      .mocked(remindOaWorkReport)
      .mockResolvedValue({ data: { reminded: 1 } } as any);
    const successSpy = jest.spyOn(message, 'success');
    render(<WorkReportPage />);

    fireEvent.click(await screen.findByRole('tab', { name: '提交统计' }));
    const table = await screen.findByRole('table');
    await within(table).findByText('李四');
    const rows = within(table).getAllByRole('row');
    expect(within(rows[1]).getByText('李四')).toBeTruthy();
    expect(within(rows[1]).getByText('未提交')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /催交未提交/ }));
    const confirm = await screen.findByText('催交 1 名未提交成员？');
    const popover = confirm.closest('.ant-popover') as HTMLElement;
    fireEvent.click(within(popover).getByRole('button', { name: /催\s*交/ }));
    await waitFor(() =>
      expect(remindOaWorkReport).toHaveBeenCalledWith({
        reportType: 'DAILY',
        date: today,
      }),
    );
    await waitFor(() => expect(successSpy).toHaveBeenCalledWith('已催交 1 人'));
    successSpy.mockRestore();
  });
});
