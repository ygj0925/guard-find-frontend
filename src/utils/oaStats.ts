/**
 * OA 工作台与统计报表的前端工具：口径与后端 OaStatsService/OaExportService 一致（区间不超过 366 天、导出类型与状态）。
 */
import dayjs, { type Dayjs } from 'dayjs';
import type {
  OaBusinessType,
  OaExportStatus,
  OaExportTaskVo,
  OaStatsTypeRowVo,
} from '@/services/web/guardfind/oa';

type Meta = Record<string, { text: string; color: string }>;

export const MAX_RANGE_DAYS = 366;

export const BUSINESS_TYPE_META: Record<
  OaBusinessType,
  { text: string; color: string }
> = {
  GENERIC: { text: '通用审批', color: 'default' },
  LEAVE: { text: '请假', color: 'blue' },
  EXPENSE: { text: '报销', color: 'gold' },
  TRAVEL: { text: '出差', color: 'cyan' },
  LOAN: { text: '借款', color: 'orange' },
  ATTENDANCE_CORRECTION: { text: '补卡', color: 'purple' },
  OVERTIME: { text: '加班', color: 'magenta' },
  OUTING: { text: '外出', color: 'geekblue' },
  PURCHASE: { text: '采购', color: 'volcano' },
  SUPPLY_REQUEST: { text: '用品领用', color: 'lime' },
  ASSET_SCRAP: { text: '资产报废', color: 'red' },
  CONTRACT: { text: '合同', color: 'geekblue' },
  SEAL_USE: { text: '用印', color: 'magenta' },
  DOCUMENT: { text: '公文知识', color: 'purple' },
  MEETING_BOOKING: { text: '会议室预订', color: 'cyan' },
  VEHICLE_USE: { text: '用车', color: 'blue' },
};

export const BUSINESS_TYPE_OPTIONS = (
  Object.keys(BUSINESS_TYPE_META) as OaBusinessType[]
).map((value) => ({ value, label: BUSINESS_TYPE_META[value].text }));

export const EXPORT_TYPE_META: Meta = {
  APPLICATION: { text: '申请明细', color: 'blue' },
  VEHICLE_USE: { text: '用车记录', color: 'cyan' },
};

export const EXPORT_STATUS_META: Record<
  OaExportStatus,
  { text: string; color: string }
> = {
  PENDING: { text: '排队中', color: 'default' },
  RUNNING: { text: '生成中', color: 'processing' },
  DONE: { text: '可下载', color: 'green' },
  FAILED: { text: '失败', color: 'red' },
  EXPIRED: { text: '已过期', color: 'default' },
};

export function businessTypeText(type?: string | null) {
  if (!type) return '全部';
  return BUSINESS_TYPE_META[type as OaBusinessType]?.text ?? type;
}

export function defaultStatsRange(today: Dayjs = dayjs()): [Dayjs, Dayjs] {
  return [today.startOf('month'), today.startOf('day')];
}

/** 与后端 requireRange 一致：返回错误文案，合法时返回 null */
export function statsRangeError(range?: [Dayjs, Dayjs] | null) {
  if (!range?.[0] || !range[1]) return '请选择统计区间';
  const [from, to] = range;
  if (to.isBefore(from, 'day')) return '结束日期不能早于开始日期';
  if (to.startOf('day').diff(from.startOf('day'), 'day') >= MAX_RANGE_DAYS) {
    return `统计区间不能超过 ${MAX_RANGE_DAYS} 天`;
  }
  return null;
}

/** 通过率按已结束（通过 + 驳回）计算，无结束申请时为空 */
export function approvalRate(row: OaStatsTypeRowVo) {
  const finished = row.approved + row.rejected;
  if (finished === 0) return null;
  return Math.round((row.approved / finished) * 1000) / 10;
}

export function formatMoney(value?: number | string | null) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '0.00';
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatHours(value?: number | null) {
  return value == null ? '—' : `${value} 小时`;
}

export function exportActive(tasks: OaExportTaskVo[]) {
  return tasks.some(
    (task) => task.status === 'PENDING' || task.status === 'RUNNING',
  );
}

export function exportDownloadable(task: OaExportTaskVo, now: Dayjs = dayjs()) {
  if (task.status !== 'DONE') return false;
  return !task.expireTime || dayjs(task.expireTime).isAfter(now);
}
