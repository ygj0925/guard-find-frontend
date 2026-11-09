import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { history } from '@umijs/max';
import dayjs from 'dayjs';
import AttendanceManagePage from '@/pages/oa/attendance';
import MyAttendancePage from '@/pages/oa/attendance/mine';
import {
  commitOaAttendanceImport,
  createOaShift,
  previewOaAttendanceImport,
  queryMyOaAttendanceDaily,
  queryMyOaAttendanceRequests,
  queryOaAttendanceDaily,
  queryOaAttendanceSummary,
  queryOaSchedules,
  queryOaShifts,
  saveOaSchedules,
} from '@/services/web/guardfind/oa';
import {
  dailyStats,
  monthRange,
  parseAttendanceCsv,
} from '@/utils/oaAttendance';
import { createOaFormField } from '@/utils/oaForm';
import { fromOaSubmitFormData, toOaSubmitFormData } from '@/utils/oaLaunch';

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

jest.mock('@/pages/oa/components/OaStaffSelects', () => {
  const { createElement } = require('react');
  return {
    OaEmployeeSelect: () => null,
    OaEmployeeMultiSelect: ({
      onChange,
    }: {
      onChange?: (v: string[]) => void;
    }) =>
      createElement(
        'button',
        {
          type: 'button',
          onClick: () =>
            onChange?.(['547889293968801822', '547889293968801825']),
        },
        '选两名员工',
      ),
  };
});

jest.mock('@/services/web/guardfind/oa', () => ({
  commitOaAttendanceImport: jest.fn(),
  createOaAttendanceTemplate: jest.fn(),
  createOaShift: jest.fn(),
  previewOaAttendanceImport: jest.fn(),
  queryMyOaAttendanceDaily: jest.fn(),
  queryMyOaAttendanceRequests: jest.fn(),
  queryOaAttendanceDaily: jest.fn(),
  queryOaAttendanceRecords: jest.fn(),
  queryOaAttendanceRequests: jest.fn(),
  queryOaAttendanceSummary: jest.fn(),
  queryOaSchedules: jest.fn(),
  queryOaShifts: jest.fn(),
  saveOaSchedules: jest.fn(),
  updateOaShift: jest.fn(),
}));

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const day = (workDate: string, status: string, extra = {}) => ({
  userId: 101,
  workDate,
  status,
  late: false,
  early: false,
  overtimeHours: 0,
  ...extra,
});

const shift = {
  id: 7,
  code: 'DAY',
  name: '白班',
  startTime: '09:00',
  endTime: '18:00',
  graceMinutes: 5,
  status: 'ENABLED',
  version: 0,
};

describe('假勤工具函数', () => {
  it('CSV 解析跳过表头、兼容制表符与短格式并归一日期时间', () => {
    const parsed = parseAttendanceCsv(
      '\uFEFF工号,日期,上班,下班\r\n"E001",2026/11/2,8:58,18:05:30\nE002\t2026-11-03\t\t17:00\n\n',
    );
    expect(parsed.skippedHeader).toBe(true);
    expect(parsed.truncated).toBe(false);
    expect(parsed.rows).toEqual([
      {
        employeeNo: 'E001',
        workDate: '2026-11-02',
        checkIn: '08:58',
        checkOut: '18:05',
      },
      {
        employeeNo: 'E002',
        workDate: '2026-11-03',
        checkIn: undefined,
        checkOut: '17:00',
      },
    ]);

    const many = Array.from(
      { length: 2001 },
      () => 'E1,2026-11-02,09:00,18:00',
    );
    const big = parseAttendanceCsv(many.join('\n'));
    expect(big.skippedHeader).toBe(false);
    expect(big.truncated).toBe(true);
    expect(big.rows).toHaveLength(2000);
  });

  it('日统计排除休息与未排班，异常只计迟到早退缺卡旷工', () => {
    const stats = dailyStats([
      day('2026-11-02', 'NORMAL', { overtimeHours: 1.5 }),
      day('2026-11-03', 'LATE'),
      day('2026-11-04', 'MISSING_OUT'),
      day('2026-11-05', 'LEAVE'),
      day('2026-11-06', 'TRAVEL'),
      day('2026-11-07', 'REST', { overtimeHours: '2' }),
      day('2026-11-08', 'UNSCHEDULED'),
      day('2026-11-09', 'PENDING'),
      day('2026-11-10', 'OUTING'),
    ] as any);
    expect(stats).toEqual({
      scheduled: 7,
      normal: 1,
      abnormal: 2,
      leave: 1,
      travel: 1,
      outing: 1,
      overtimeHours: 3.5,
    });
    expect(monthRange(dayjs('2026-02-15'))).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    });
  });

  it('日期时间字段提交为分钟精度并可回填', () => {
    const field = { ...createOaFormField('datetime', []), key: 'checkTime' };
    expect(field.label).toBe('日期时间');
    const formData = toOaSubmitFormData([field], {
      checkTime: dayjs('2026-11-09T08:57:42'),
    });
    expect(formData).toEqual({ checkTime: '2026-11-09 08:57' });
    const values = fromOaSubmitFormData([field], formData);
    expect((values.checkTime as any).format('YYYY-MM-DD HH:mm')).toBe(
      '2026-11-09 08:57',
    );
  });
});

describe('假勤管理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryOaAttendanceSummary).mockResolvedValue({
      data: [
        {
          userId: 101,
          userName: '张三',
          employeeNo: 'E001',
          scheduledDays: 20,
          normalDays: 18,
          lateCount: 1,
          earlyCount: 0,
          missingCount: 1,
          absentDays: 0,
          leaveDays: 0,
          travelDays: 0,
          outingCount: 0,
          correctionCount: 1,
          overtimeHours: 2,
        },
      ],
    } as any);
    jest.mocked(queryOaShifts).mockResolvedValue({ data: [shift] } as any);
    jest.mocked(queryOaSchedules).mockResolvedValue({ data: [] } as any);
  });

  it('月度汇总可查看员工日明细', async () => {
    jest.mocked(queryOaAttendanceDaily).mockResolvedValue({
      data: [
        day('2026-11-03', 'LATE', {
          shiftName: '白班',
          shiftStart: '09:00',
          shiftEnd: '18:00',
          checkIn: '2026-11-03 09:12:00',
          checkInSource: 'IMPORT',
          checkOut: '2026-11-03 18:01:00',
          checkOutSource: 'CORRECTION',
          note: '迟到 7 分钟',
        }),
      ],
    } as any);
    render(<AttendanceManagePage />);

    expect(await screen.findByText('张三')).toBeTruthy();
    expect(queryOaAttendanceSummary).toHaveBeenCalledWith({
      month: dayjs().format('YYYY-MM'),
      keyword: undefined,
    });
    fireEvent.click(screen.getByRole('button', { name: '日明细' }));

    const drawer = await screen.findByRole('dialog');
    expect(await within(drawer).findByText('09:12')).toBeTruthy();
    expect(queryOaAttendanceDaily).toHaveBeenCalledWith({
      userId: '101',
      ...monthRange(dayjs()),
    });
    expect(within(drawer).getByText('迟到')).toBeTruthy();
    expect(within(drawer).getByText('白班 09:00-18:00')).toBeTruthy();
    expect(within(drawer).getByText('补卡')).toBeTruthy();
  });

  it('考勤导入先预览，校验失败不可导入，通过后用同一请求号提交', async () => {
    jest
      .mocked(previewOaAttendanceImport)
      .mockResolvedValueOnce({
        data: {
          valid: false,
          totalRows: 1,
          insertedRows: 0,
          updatedRows: 0,
          keptCorrections: 0,
          errors: ['第 1 行：工号 E404 不存在'],
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          valid: true,
          totalRows: 1,
          insertedRows: 1,
          updatedRows: 0,
          keptCorrections: 0,
          errors: [],
        },
      } as any);
    jest.mocked(commitOaAttendanceImport).mockResolvedValue({
      data: {
        valid: true,
        importId: 12,
        totalRows: 1,
        insertedRows: 1,
        updatedRows: 0,
        keptCorrections: 0,
        errors: [],
        replayed: false,
      },
    } as any);
    render(<AttendanceManagePage />);
    await screen.findByText('张三');
    fireEvent.click(screen.getByRole('tab', { name: '考勤导入' }));
    const input = await screen.findByLabelText(
      '考勤数据',
      {},
      { timeout: 15000 },
    );

    fireEvent.change(input, {
      target: { value: 'E404,2026-11-02,9:00,18:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: '解析并预览' }));
    expect(await screen.findByText('第 1 行：工号 E404 不存在')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: '确认导入' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    fireEvent.change(input, {
      target: { value: 'E001,2026-11-02,9:00,18:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: '解析并预览' }));
    expect(await screen.findByText('校验通过，确认后写入')).toBeTruthy();
    const previewRequest = jest.mocked(previewOaAttendanceImport).mock
      .calls[1][0];
    expect(previewRequest.rows).toEqual([
      {
        employeeNo: 'E001',
        workDate: '2026-11-02',
        checkIn: '09:00',
        checkOut: '18:00',
      },
    ]);

    fireEvent.click(screen.getByRole('button', { name: '确认导入' }));
    fireEvent.click(await screen.findByRole('button', { name: /^导\s*入$/ }));
    await waitFor(() =>
      expect(commitOaAttendanceImport).toHaveBeenCalledTimes(1),
    );
    const commit = jest.mocked(commitOaAttendanceImport).mock.calls[0][0];
    expect(String(commit.requestId).startsWith('att-import-')).toBe(true);
    expect(commit.rows).toEqual(previewRequest.rows);
    expect(await screen.findByText('#12')).toBeTruthy();
  });

  it('新增班次提交编码、时间与宽限', async () => {
    jest.mocked(createOaShift).mockResolvedValue({ data: shift } as any);
    render(<AttendanceManagePage />);
    await screen.findByText('张三');
    fireEvent.click(screen.getByRole('tab', { name: '班次' }));
    fireEvent.click(
      await screen.findByRole(
        'button',
        { name: /新增班次/ },
        { timeout: 15000 },
      ),
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('班次编码'), {
      target: { value: ' NIGHT ' },
    });
    fireEvent.change(within(dialog).getByLabelText('班次名称'), {
      target: { value: ' 晚班 ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(createOaShift).toHaveBeenCalledTimes(1));
    expect(jest.mocked(createOaShift).mock.calls[0][0]).toEqual({
      code: 'NIGHT',
      name: '晚班',
      startTime: '09:00',
      endTime: '18:00',
      graceMinutes: 0,
      status: 'ENABLED',
      remark: undefined,
    });
    await waitFor(() => expect(queryOaShifts).toHaveBeenCalledTimes(2));
  });

  it('批量排班可设为休息且不携带班次', async () => {
    jest.mocked(saveOaSchedules).mockResolvedValue({ data: 20 } as any);
    render(<AttendanceManagePage />);
    await screen.findByText('张三');
    fireEvent.click(screen.getByRole('tab', { name: '排班' }));
    fireEvent.click(
      await screen.findByRole(
        'button',
        { name: /批量排班/ },
        { timeout: 15000 },
      ),
    );
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(queryOaShifts).toHaveBeenCalledWith('ENABLED'));
    fireEvent.click(within(dialog).getByRole('button', { name: '选两名员工' }));
    fireEvent.click(within(dialog).getByRole('switch', { name: '设为休息' }));
    await waitFor(() =>
      expect(within(dialog).queryByLabelText('班次')).toBeNull(),
    );
    fireEvent.click(within(dialog).getByRole('button', { name: /保存排班/ }));

    await waitFor(() => expect(saveOaSchedules).toHaveBeenCalledTimes(1));
    const monday = dayjs().startOf('week').add(1, 'day');
    expect(jest.mocked(saveOaSchedules).mock.calls[0][0]).toEqual({
      userIds: ['547889293968801822', '547889293968801825'],
      startDate: monday.format('YYYY-MM-DD'),
      endDate: monday.add(13, 'day').format('YYYY-MM-DD'),
      weekdays: [1, 2, 3, 4, 5],
      shiftId: undefined,
      clear: true,
    });
    await waitFor(() => expect(queryOaSchedules).toHaveBeenCalledTimes(2));
  });
});

describe('我的考勤', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryMyOaAttendanceDaily).mockResolvedValue({
      data: [
        day('2026-11-02', 'NORMAL'),
        day('2026-11-03', 'MISSING_IN', { overtimeHours: 2 }),
        day('2026-11-08', 'REST'),
      ],
    } as any);
    jest.mocked(queryMyOaAttendanceRequests).mockResolvedValue({
      data: {
        list: [
          {
            id: 5,
            applicationId: 88,
            kind: 'CORRECTION',
            status: 'APPROVING',
            applicationStatus: 'RUNNING',
            applicantId: 101,
            workDate: '2026-11-03',
            checkType: 'IN',
            startTime: '2026-11-03 08:55:00',
          },
        ],
        total: 1,
      },
    } as any);
  });

  it('展示本月统计与异常提示，可查看本人申请审批', async () => {
    render(<MyAttendancePage />);

    expect(await screen.findByText('上班缺卡')).toBeTruthy();
    expect(queryMyOaAttendanceDaily).toHaveBeenCalledWith(monthRange(dayjs()));
    expect(screen.getByText(/本月有考勤异常/)).toBeTruthy();
    expect(screen.getByText('应出勤天数')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: '我的申请' }));
    expect(
      await screen.findByText(
        '上班补卡 2026-11-03 08:55',
        {},
        { timeout: 15000 },
      ),
    ).toBeTruthy();
    expect(queryMyOaAttendanceRequests).toHaveBeenCalledWith({
      page: 1,
      size: 10,
      kind: undefined,
      status: undefined,
    });
    fireEvent.click(screen.getByRole('button', { name: '查看审批' }));
    expect(history.push).toHaveBeenCalledWith('/oa/application/detail?id=88');
  });
});
