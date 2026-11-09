/**
 * 会议车辆与日程报告的前端工具：与后端 OaMeetingBookingHook/OaVehicleRequestHook/OaCalendarService/OaWorkReportService 约定的状态与时间规则。
 */
import dayjs, { type Dayjs } from 'dayjs';
import type {
  OaCalendarEventParams,
  OaCalendarScope,
  OaMeetingBookingVo,
  OaVehicleRequestVo,
  OaWorkReportType,
} from '@/services/web/guardfind/oa';
import { toCents } from './oaTravel';

type Meta = Record<string, { text: string; color: string }>;

export const DATE_TIME = 'YYYY-MM-DD HH:mm:ss';

export const RESOURCE_STATUS_META: Meta = {
  ENABLED: { text: '启用', color: 'green' },
  DISABLED: { text: '停用', color: 'default' },
};

export const MEETING_BOOKING_STATUS_META: Meta = {
  APPROVING: { text: '审批中', color: 'processing' },
  BOOKED: { text: '已预订', color: 'green' },
  CANCELLED: { text: '已取消', color: 'default' },
  CLOSED: { text: '已关闭', color: 'default' },
  EXPIRED: { text: '超时释放', color: 'orange' },
};

export const VEHICLE_REQUEST_STATUS_META: Meta = {
  APPROVING: { text: '审批中', color: 'processing' },
  PENDING_DISPATCH: { text: '待调度', color: 'orange' },
  DISPATCHED: { text: '已派车', color: 'blue' },
  IN_USE: { text: '出车中', color: 'purple' },
  RETURNED: { text: '已归还', color: 'green' },
  CANCELLED: { text: '已取消', color: 'default' },
  CLOSED: { text: '已关闭', color: 'default' },
  EXPIRED: { text: '已过期', color: 'default' },
};

export const MAINT_TYPE_META: Meta = {
  MAINTENANCE: { text: '保养', color: 'blue' },
  REPAIR: { text: '维修', color: 'volcano' },
  INSPECTION: { text: '年检', color: 'cyan' },
};

export const MAINT_STATUS_META: Meta = {
  ACTIVE: { text: '进行中', color: 'orange' },
  DONE: { text: '已完成', color: 'green' },
};

export const CALENDAR_SCOPE_META: Meta = {
  PERSONAL: { text: '个人', color: 'blue' },
  DEPT: { text: '部门', color: 'purple' },
};

export const REPORT_TYPE_META: Meta = {
  DAILY: { text: '日报', color: 'blue' },
  WEEKLY: { text: '周报', color: 'purple' },
};

export const REPORT_STATUS_META: Meta = {
  DRAFT: { text: '草稿', color: 'default' },
  SUBMITTED: { text: '已提交', color: 'green' },
  MISSING: { text: '未提交', color: 'red' },
};

export const REMIND_OPTIONS = [
  { value: -1, label: '不提醒' },
  { value: 0, label: '开始时' },
  { value: 5, label: '提前 5 分钟' },
  { value: 15, label: '提前 15 分钟' },
  { value: 30, label: '提前 30 分钟' },
  { value: 60, label: '提前 1 小时' },
  { value: 1440, label: '提前 1 天' },
];

const OCCUPYING = new Set(['APPROVING', 'BOOKED']);
const VEHICLE_CANCELLABLE = new Set(['PENDING_DISPATCH', 'DISPATCHED']);

/** 半开区间 [start, end) 相交，首尾相接不算冲突，与后端一致。 */
export function overlaps(
  aStart: Dayjs,
  aEnd: Dayjs,
  bStart: Dayjs,
  bEnd: Dayjs,
) {
  return aStart.isBefore(bEnd) && bStart.isBefore(aEnd);
}

/** 预检同一会议室占用（审批中/已预订）的时段；最终以后端加锁判定为准。 */
export function bookingConflict(
  bookings: OaMeetingBookingVo[],
  roomId: number,
  start: Dayjs,
  end: Dayjs,
) {
  return (
    bookings.find(
      (booking) =>
        booking.roomId === roomId &&
        OCCUPYING.has(booking.status) &&
        overlaps(start, end, dayjs(booking.startTime), dayjs(booking.endTime)),
    ) ?? null
  );
}

export function timeRange(start: string, end: string) {
  const from = dayjs(start);
  const to = dayjs(end);
  return from.isSame(to, 'day')
    ? `${from.format('MM-DD HH:mm')}–${to.format('HH:mm')}`
    : `${from.format('MM-DD HH:mm')}–${to.format('MM-DD HH:mm')}`;
}

export function vehicleCancellable(status: string) {
  return VEHICLE_CANCELLABLE.has(status);
}

export function vehicleCostTotal(request: OaVehicleRequestVo) {
  const cents =
    toCents(request.fuelCost) +
    toCents(request.tollCost) +
    toCents(request.otherCost);
  return (cents / 100).toFixed(2);
}

export function mileageUsed(request: OaVehicleRequestVo) {
  return request.startMileage == null || request.endMileage == null
    ? null
    : request.endMileage - request.startMileage;
}

/** 与后端 periodStart/periodEnd 一致：周报按周一开始的自然周。 */
export function reportPeriod(type: OaWorkReportType, date: Dayjs) {
  if (type === 'DAILY') {
    const day = date.format('YYYY-MM-DD');
    return { start: day, end: day };
  }
  const monday = date.subtract((date.day() + 6) % 7, 'day');
  return {
    start: monday.format('YYYY-MM-DD'),
    end: monday.add(6, 'day').format('YYYY-MM-DD'),
  };
}

export function periodText(type: string, start: string, end: string) {
  return type === 'WEEKLY' ? `${start} ~ ${end}` : start;
}

/** 月视图查询区间：覆盖该月所在的完整周（周一起），不超过后端 62 天上限。 */
export function monthRange(month: Dayjs) {
  const first = month.startOf('month');
  const from = first.subtract((first.day() + 6) % 7, 'day').startOf('day');
  return { from, to: from.add(42, 'day') };
}

export function eventsOnDay<T extends { startTime: string; endTime: string }>(
  events: T[],
  day: Dayjs,
) {
  const start = day.startOf('day');
  const end = start.add(1, 'day');
  return events
    .filter((event) =>
      overlaps(start, end, dayjs(event.startTime), dayjs(event.endTime)),
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export type CalendarEventValues = {
  title: string;
  location?: string;
  description?: string;
  allDay: boolean;
  range: [Dayjs, Dayjs];
  scope: OaCalendarScope;
  deptId?: number;
  remindMinutes: number;
  memberIds?: string[];
};

/** 全天日程按日期提交，后端将结束日扩展到次日零点；提醒 -1 表示不提醒。 */
export function calendarEventParams(
  values: CalendarEventValues,
): OaCalendarEventParams {
  const [start, end] = values.range;
  return {
    title: values.title.trim(),
    location: values.location?.trim() || undefined,
    description: values.description?.trim() || undefined,
    allDay: values.allDay,
    startTime: (values.allDay ? start.startOf('day') : start).format(DATE_TIME),
    endTime: (values.allDay ? end.startOf('day') : end).format(DATE_TIME),
    scope: values.scope,
    deptId: values.scope === 'DEPT' ? values.deptId : undefined,
    remindMinutes: values.remindMinutes < 0 ? undefined : values.remindMinutes,
    memberIds: values.memberIds ?? [],
  };
}
