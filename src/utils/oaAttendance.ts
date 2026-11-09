/**
 * 假勤试点的前端工具：与后端 OaAttendanceService / 补卡加班外出钩子约定的状态文案、CSV 解析与日期区间。
 */
import dayjs, { type Dayjs } from 'dayjs';
import type {
  OaAttendanceDailyVo,
  OaAttendanceImportRow,
} from '@/services/web/guardfind/oa';

type Meta = Record<string, { text: string; color: string }>;

export const DAILY_STATUS_META: Meta = {
  NORMAL: { text: '正常', color: 'green' },
  LATE: { text: '迟到', color: 'orange' },
  EARLY: { text: '早退', color: 'orange' },
  MISSING_IN: { text: '上班缺卡', color: 'red' },
  MISSING_OUT: { text: '下班缺卡', color: 'red' },
  ABSENT: { text: '旷工', color: 'red' },
  PENDING: { text: '待打卡', color: 'default' },
  LEAVE: { text: '请假', color: 'blue' },
  TRAVEL: { text: '出差', color: 'cyan' },
  OUTING: { text: '外出', color: 'geekblue' },
  REST: { text: '休息', color: 'default' },
  UNSCHEDULED: { text: '未排班', color: 'default' },
};

export const REQUEST_KIND_META: Meta = {
  CORRECTION: { text: '补卡', color: 'purple' },
  OVERTIME: { text: '加班', color: 'volcano' },
  OUTING: { text: '外出', color: 'geekblue' },
};

export const REQUEST_STATUS_META: Meta = {
  APPROVING: { text: '审批中', color: 'processing' },
  APPROVED: { text: '已通过', color: 'green' },
  CLOSED: { text: '已关闭', color: 'default' },
};

export const SHIFT_STATUS_META: Meta = {
  ENABLED: { text: '启用', color: 'green' },
  DISABLED: { text: '停用', color: 'default' },
};

export const CHECK_SOURCE_LABELS: Record<string, string> = {
  IMPORT: '导入',
  CORRECTION: '补卡',
};

export const CHECK_TYPE_LABELS: Record<string, string> = {
  IN: '上班',
  OUT: '下班',
};

export const WEEKDAY_OPTIONS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 7, label: '周日' },
];

/** 与服务端 OaAttendanceService.MAX_RANGE_DAYS / OaAttendanceImportReq 上限一致 */
export const ATTENDANCE_LIMITS = {
  maxRangeDays: 62,
  maxImportRows: 2000,
} as const;

const ABNORMAL = new Set([
  'LATE',
  'EARLY',
  'MISSING_IN',
  'MISSING_OUT',
  'ABSENT',
]);

export function isAbnormalStatus(status?: string | null) {
  return ABNORMAL.has(String(status ?? ''));
}

export function monthRange(month: Dayjs) {
  return {
    start: month.startOf('month').format('YYYY-MM-DD'),
    end: month.endOf('month').format('YYYY-MM-DD'),
  };
}

/** 服务端时间点可能带秒或 T 分隔，统一显示为 HH:mm */
export function formatClock(value?: string | null) {
  if (!value) return '—';
  const time = dayjs(value.replace(' ', 'T'));
  return time.isValid() ? time.format('HH:mm') : value;
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const time = dayjs(value.replace(' ', 'T'));
  return time.isValid() ? time.format('YYYY-MM-DD HH:mm') : value;
}

export function formatHours(value: unknown) {
  const hours = Number(value ?? 0);
  return Number.isFinite(hours) && hours > 0 ? `${hours} 小时` : '—';
}

export interface ParsedImport {
  rows: OaAttendanceImportRow[];
  skippedHeader: boolean;
  truncated: boolean;
}

const DATE_LIKE = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;

function normalizeDate(text: string) {
  if (!DATE_LIKE.test(text)) return text;
  const [year, month, day] = text.split(/[-/]/);
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function normalizeClock(text: string) {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(text);
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : text;
}

function splitLine(line: string) {
  const separator = line.includes('\t') ? '\t' : ',';
  return line.split(separator).map((cell) =>
    cell
      .trim()
      .replace(/^"(.*)"$/, '$1')
      .trim(),
  );
}

/**
 * 解析“工号,日期,上班,下班”四列文本（逗号或制表符分隔），首行若不是数据则视为表头跳过。
 * 只做格式归一，合法性以服务端预览结果为准。
 */
export function parseAttendanceCsv(text: string): ParsedImport {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim());
  let skippedHeader = false;
  if (lines.length && !DATE_LIKE.test(splitLine(lines[0])[1] ?? '')) {
    lines.shift();
    skippedHeader = true;
  }
  const truncated = lines.length > ATTENDANCE_LIMITS.maxImportRows;
  const rows = lines.slice(0, ATTENDANCE_LIMITS.maxImportRows).map((line) => {
    const [employeeNo = '', workDate = '', checkIn = '', checkOut = ''] =
      splitLine(line);
    return {
      employeeNo,
      workDate: normalizeDate(workDate),
      checkIn: checkIn ? normalizeClock(checkIn) : undefined,
      checkOut: checkOut ? normalizeClock(checkOut) : undefined,
    };
  });
  return { rows, skippedHeader, truncated };
}

export interface DailyStats {
  scheduled: number;
  normal: number;
  abnormal: number;
  leave: number;
  travel: number;
  outing: number;
  overtimeHours: number;
}

export function dailyStats(rows: OaAttendanceDailyVo[]): DailyStats {
  const stats: DailyStats = {
    scheduled: 0,
    normal: 0,
    abnormal: 0,
    leave: 0,
    travel: 0,
    outing: 0,
    overtimeHours: 0,
  };
  rows.forEach((row) => {
    const overtime = Number(row.overtimeHours ?? 0);
    if (Number.isFinite(overtime)) stats.overtimeHours += overtime;
    if (row.status === 'REST' || row.status === 'UNSCHEDULED') return;
    stats.scheduled += 1;
    if (row.status === 'NORMAL') stats.normal += 1;
    else if (row.status === 'LEAVE') stats.leave += 1;
    else if (row.status === 'TRAVEL') stats.travel += 1;
    else if (row.status === 'OUTING') stats.outing += 1;
    else if (isAbnormalStatus(row.status)) stats.abnormal += 1;
  });
  stats.overtimeHours = Math.round(stats.overtimeHours * 10) / 10;
  return stats;
}
