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
import MeetingManagePage from '@/pages/oa/meeting';
import MeetingBookPage from '@/pages/oa/meeting/book';
import VehicleManagePage from '@/pages/oa/vehicle';
import {
  bookOaMeetingRoom,
  dispatchOaVehicleRequest,
  queryBookableOaMeetingRooms,
  queryOaMeetingRooms,
  queryOaMeetingSchedule,
  queryOaVehicleCandidates,
  queryOaVehicleRequests,
  returnOaVehicleRequest,
  updateOaMeetingRoom,
} from '@/services/web/guardfind/oa';
import {
  bookingConflict,
  calendarEventParams,
  eventsOnDay,
  monthRange,
  overlaps,
  reportPeriod,
  timeRange,
  vehicleCancellable,
  vehicleCostTotal,
} from '@/utils/oaResource';

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
  bookOaMeetingRoom: jest.fn(),
  cancelMyOaMeetingBooking: jest.fn(),
  cancelOaMeetingBooking: jest.fn(),
  cancelOaVehicleRequest: jest.fn(),
  createOaMeetingRoom: jest.fn(),
  createOaMeetingTemplate: jest.fn(),
  createOaVehicleTemplate: jest.fn(),
  departOaVehicleRequest: jest.fn(),
  dispatchOaVehicleRequest: jest.fn(),
  queryBookableOaMeetingRooms: jest.fn(),
  queryMyOaMeetingBookings: jest.fn(),
  queryOaEmployeeOptions: jest.fn(),
  queryOaMeetingBookings: jest.fn(),
  queryOaMeetingRooms: jest.fn(),
  queryOaMeetingSchedule: jest.fn(),
  queryOaVehicleCandidates: jest.fn(),
  queryOaVehicleRequests: jest.fn(),
  queryOaVehicles: jest.fn(),
  returnOaVehicleRequest: jest.fn(),
  updateOaMeetingRoom: jest.fn(),
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

function rowOf(text: string) {
  return screen.getByText(text).closest('tr') as HTMLElement;
}

const room = {
  id: 5,
  code: 'MR-101',
  name: '一号会议室',
  location: '3 楼',
  capacity: 10,
  needApproval: false,
  status: 'ENABLED',
  version: 3,
};

const approvalRoom = {
  ...room,
  id: 6,
  code: 'MR-201',
  name: '董事会议室',
  needApproval: true,
  version: 1,
};

function booking(start: any, end: any, status = 'BOOKED') {
  return {
    id: 31,
    roomId: 5,
    roomCode: 'MR-101',
    roomName: '一号会议室',
    bookerId: 102,
    bookerName: '李四',
    subject: '周会',
    startTime: start.format('YYYY-MM-DD HH:mm:ss'),
    endTime: end.format('YYYY-MM-DD HH:mm:ss'),
    attendees: 6,
    status,
  };
}

describe('会议车辆工具函数', () => {
  it('半开区间、冲突预检、费用与周期', () => {
    const at = (time: string) => dayjs(`2026-11-10 ${time}`);
    expect(overlaps(at('09:00'), at('10:00'), at('10:00'), at('11:00'))).toBe(
      false,
    );
    expect(overlaps(at('09:00'), at('10:30'), at('10:00'), at('11:00'))).toBe(
      true,
    );
    const booked = booking(at('10:00'), at('11:00'));
    expect(
      bookingConflict([booked], 5, at('10:30'), at('11:30'))?.subject,
    ).toBe('周会');
    expect(bookingConflict([booked], 6, at('10:30'), at('11:30'))).toBeNull();
    expect(
      bookingConflict(
        [booking(at('10:00'), at('11:00'), 'CANCELLED')],
        5,
        at('10:30'),
        at('11:30'),
      ),
    ).toBeNull();
    expect(timeRange('2026-11-10 09:00:00', '2026-11-10 10:30:00')).toBe(
      '11-10 09:00–10:30',
    );
    expect(timeRange('2026-11-10 09:00:00', '2026-11-11 10:30:00')).toBe(
      '11-10 09:00–11-11 10:30',
    );
    expect(vehicleCancellable('DISPATCHED')).toBe(true);
    expect(vehicleCancellable('IN_USE')).toBe(false);
    expect(
      vehicleCostTotal({
        fuelCost: '120.50',
        tollCost: '15',
        otherCost: null,
      } as any),
    ).toBe('135.50');
    expect(reportPeriod('WEEKLY', dayjs('2026-11-15'))).toEqual({
      start: '2026-11-09',
      end: '2026-11-15',
    });
    expect(reportPeriod('WEEKLY', dayjs('2026-11-09'))).toEqual({
      start: '2026-11-09',
      end: '2026-11-15',
    });
    expect(reportPeriod('DAILY', dayjs('2026-11-11'))).toEqual({
      start: '2026-11-11',
      end: '2026-11-11',
    });
    const range = monthRange(dayjs('2026-11-20'));
    expect(range.from.format('YYYY-MM-DD')).toBe('2026-10-26');
    expect(range.to.format('YYYY-MM-DD')).toBe('2026-12-07');
    const events = [
      { startTime: '2026-11-10 14:00:00', endTime: '2026-11-10 15:00:00' },
      { startTime: '2026-11-09 00:00:00', endTime: '2026-11-11 00:00:00' },
      { startTime: '2026-11-11 00:00:00', endTime: '2026-11-11 01:00:00' },
    ];
    expect(
      eventsOnDay(events, dayjs('2026-11-10')).map((e) => e.startTime),
    ).toEqual(['2026-11-09 00:00:00', '2026-11-10 14:00:00']);
  });

  it('日程提交参数：全天按日期、不提醒与部门字段', () => {
    const params = calendarEventParams({
      title: ' 团建 ',
      allDay: true,
      range: [dayjs('2026-11-10 09:30'), dayjs('2026-11-11 18:00')],
      scope: 'PERSONAL',
      deptId: 3,
      remindMinutes: -1,
      memberIds: ['102'],
    });
    expect(params).toEqual({
      title: '团建',
      location: undefined,
      description: undefined,
      allDay: true,
      startTime: '2026-11-10 00:00:00',
      endTime: '2026-11-11 00:00:00',
      scope: 'PERSONAL',
      deptId: undefined,
      remindMinutes: undefined,
      memberIds: ['102'],
    });
    expect(
      calendarEventParams({
        title: '部门例会',
        allDay: false,
        range: [dayjs('2026-11-10 09:30'), dayjs('2026-11-10 10:30')],
        scope: 'DEPT',
        deptId: 3,
        remindMinutes: 15,
      }),
    ).toMatchObject({
      startTime: '2026-11-10 09:30:00',
      endTime: '2026-11-10 10:30:00',
      deptId: 3,
      remindMinutes: 15,
      memberIds: [],
    });
  });
});

describe('会议室管理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(queryOaMeetingRooms)
      .mockResolvedValue({ data: [room, approvalRoom] } as any);
  });

  it('编辑会议室携带版本号', async () => {
    jest.mocked(updateOaMeetingRoom).mockResolvedValue({ data: room } as any);
    render(<MeetingManagePage />);
    await screen.findByText('MR-101');

    fireEvent.click(
      within(rowOf('MR-101')).getByRole('button', { name: /编\s*辑/ }),
    );
    const dialog = await screen.findByRole('dialog', {}, { timeout: 15000 });
    fireEvent.change(within(dialog).getByLabelText('会议室名称'), {
      target: { value: ' 一号大会议室 ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(updateOaMeetingRoom).toHaveBeenCalledTimes(1));
    const [id, payload] = jest.mocked(updateOaMeetingRoom).mock.calls[0];
    expect(id).toBe(5);
    expect(payload).toMatchObject({
      code: 'MR-101',
      name: '一号大会议室',
      capacity: 10,
      needApproval: false,
      status: 'ENABLED',
      version: 3,
    });
    await waitFor(() => expect(queryOaMeetingRooms).toHaveBeenCalledTimes(2));
  });
});

describe('会议预订', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(queryBookableOaMeetingRooms)
      .mockResolvedValue({ data: [room, approvalRoom] } as any);
  });

  it('需审批会议室走发起申请，时段冲突前端预检拦截', async () => {
    const base = dayjs().add(1, 'hour').startOf('hour');
    jest.mocked(queryOaMeetingSchedule).mockResolvedValue({
      data: [booking(base.add(30, 'minute'), base.add(2, 'hour'))],
    } as any);
    render(<MeetingBookPage />);
    await screen.findByText('一号会议室');
    expect(
      within(rowOf('董事会议室')).getByRole('button', { name: /发起申请/ }),
    ).toBeTruthy();

    fireEvent.click(
      within(rowOf('一号会议室')).getByRole('button', { name: /预\s*订/ }),
    );
    const dialog = await screen.findByRole('dialog', {}, { timeout: 15000 });
    fireEvent.change(within(dialog).getByLabelText('会议主题'), {
      target: { value: '评审会' },
    });
    const errorSpy = jest.spyOn(message, 'error');
    fireEvent.click(within(dialog).getByRole('button', { name: /确认预订/ }));

    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^与「周会」.*冲突$/),
      ),
    );
    expect(bookOaMeetingRoom).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('预订失败重试复用同一请求号', async () => {
    jest.mocked(queryOaMeetingSchedule).mockResolvedValue({ data: [] } as any);
    jest
      .mocked(bookOaMeetingRoom)
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockResolvedValueOnce({ data: {} } as any);
    render(<MeetingBookPage />);
    await screen.findByText('一号会议室');

    fireEvent.click(
      within(rowOf('一号会议室')).getByRole('button', { name: /预\s*订/ }),
    );
    const dialog = await screen.findByRole('dialog', {}, { timeout: 15000 });
    fireEvent.change(within(dialog).getByLabelText('会议主题'), {
      target: { value: ' 评审会 ' },
    });
    const submit = within(dialog).getByRole('button', { name: /确认预订/ });
    fireEvent.click(submit);
    await waitFor(() => expect(bookOaMeetingRoom).toHaveBeenCalledTimes(1));
    fireEvent.click(submit);
    await waitFor(() => expect(bookOaMeetingRoom).toHaveBeenCalledTimes(2));

    const [first, second] = jest.mocked(bookOaMeetingRoom).mock.calls;
    expect(first[0]).toMatchObject({
      roomId: 5,
      subject: '评审会',
      attendees: 5,
    });
    expect(first[0].requestId).toMatch(/^meeting-book-/);
    expect(second[0].requestId).toBe(first[0].requestId);
    expect(first[0].startTime).toMatch(/:00:00$/);
  });
});

const vehicleRequest = {
  id: 41,
  applicationId: 88,
  applicantId: 101,
  applicantName: '张三',
  purpose: '客户拜访',
  destination: '浦东机场',
  passengers: 3,
  needDriver: true,
  startTime: '2026-11-12 09:00:00',
  endTime: '2026-11-12 12:00:00',
  status: 'PENDING_DISPATCH',
};

describe('用车调度', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('需要司机的申请未指派司机不能派车', async () => {
    jest.mocked(queryOaVehicleRequests).mockResolvedValue({
      data: { list: [vehicleRequest], total: 1 },
    } as any);
    jest.mocked(queryOaVehicleCandidates).mockResolvedValue({
      data: {
        vehicles: [
          {
            id: 7,
            plateNo: '沪A12345',
            model: '别克GL8',
            seats: 7,
            mileage: 1000,
            status: 'ENABLED',
            version: 1,
          },
        ],
        drivers: [
          {
            id: 9,
            name: '王师傅',
            phone: '13800000000',
            status: 'ENABLED',
            version: 1,
          },
        ],
      },
    } as any);
    jest
      .mocked(dispatchOaVehicleRequest)
      .mockResolvedValue({ data: {} } as any);
    render(<VehicleManagePage />);
    await screen.findByText('客户拜访 → 浦东机场');

    fireEvent.click(
      within(rowOf('客户拜访 → 浦东机场')).getByRole('button', {
        name: /派\s*车/,
      }),
    );
    const dialog = await screen.findByRole('dialog', {}, { timeout: 15000 });
    await waitFor(() =>
      expect(queryOaVehicleCandidates).toHaveBeenCalledWith(41),
    );
    fireEvent.mouseDown(
      within(dialog).getByRole('combobox', { name: '派车车辆' }),
    );
    fireEvent.click(await screen.findByText('沪A12345 · 别克GL8 · 7 座'));
    const submit = within(dialog).getByRole('button', { name: /确\s*认/ });
    fireEvent.click(submit);
    expect(
      await within(dialog).findByText('该申请需要司机，请指派司机'),
    ).toBeTruthy();
    expect(dispatchOaVehicleRequest).not.toHaveBeenCalled();

    fireEvent.mouseDown(
      within(dialog).getByRole('combobox', { name: '派车司机' }),
    );
    fireEvent.click(await screen.findByText('王师傅 · 13800000000'));
    fireEvent.click(submit);
    await waitFor(() =>
      expect(dispatchOaVehicleRequest).toHaveBeenCalledTimes(1),
    );
    const [id, payload] = jest.mocked(dispatchOaVehicleRequest).mock.calls[0];
    expect(id).toBe(41);
    expect(payload).toMatchObject({ vehicleId: 7, driverId: 9 });
    expect(payload.requestId).toMatch(/^vehicle-dispatch-/);
  });

  it('归还里程不能小于出车里程', async () => {
    jest.mocked(queryOaVehicleRequests).mockResolvedValue({
      data: {
        list: [
          {
            ...vehicleRequest,
            status: 'IN_USE',
            vehicleId: 7,
            plateNo: '沪A12345',
            driverId: 9,
            driverName: '王师傅',
            startMileage: 1000,
          },
        ],
        total: 1,
      },
    } as any);
    jest.mocked(returnOaVehicleRequest).mockResolvedValue({ data: {} } as any);
    render(<VehicleManagePage />);
    await screen.findByText('客户拜访 → 浦东机场');

    fireEvent.click(
      within(rowOf('客户拜访 → 浦东机场')).getByRole('button', {
        name: /归\s*还/,
      }),
    );
    const dialog = await screen.findByRole('dialog', {}, { timeout: 15000 });
    fireEvent.change(within(dialog).getByLabelText('归还里程'), {
      target: { value: '900' },
    });
    const submit = within(dialog).getByRole('button', { name: /确\s*认/ });
    fireEvent.click(submit);
    expect(
      await within(dialog).findByText('归还里程不能小于出车里程 1000'),
    ).toBeTruthy();
    expect(returnOaVehicleRequest).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText('归还里程'), {
      target: { value: '1080' },
    });
    fireEvent.change(within(dialog).getByLabelText('油费'), {
      target: { value: '120.5' },
    });
    fireEvent.click(submit);
    await waitFor(() =>
      expect(returnOaVehicleRequest).toHaveBeenCalledTimes(1),
    );
    const [id, payload] = jest.mocked(returnOaVehicleRequest).mock.calls[0];
    expect(id).toBe(41);
    expect(payload).toMatchObject({ endMileage: 1080, fuelCost: 120.5 });
    expect(payload.requestId).toMatch(/^vehicle-return-/);
  });
});
