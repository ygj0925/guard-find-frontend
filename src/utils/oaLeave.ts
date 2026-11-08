import type { OaDecimal } from '@/services/web/guardfind/oa';

export const LEDGER_ACTION_META: Record<
  string,
  { text: string; color: string }
> = {
  GRANT: { text: '发放/调整', color: 'blue' },
  OCCUPY: { text: '审批占用', color: 'orange' },
  DEDUCT: { text: '通过扣减', color: 'red' },
  RELEASE: { text: '释放', color: 'green' },
};

export const LEAVE_REQUEST_STATUS_META: Record<
  string,
  { text: string; color: string }
> = {
  OCCUPIED: { text: '审批中占用', color: 'orange' },
  DEDUCTED: { text: '已扣减', color: 'red' },
  RELEASED: { text: '已释放', color: 'default' },
  RECORDED: { text: '仅记录', color: 'blue' },
};

export const LEAVE_FORM_KEYS = {
  type: 'leaveType',
  startDate: 'startDate',
  startHalf: 'startHalf',
  endDate: 'endDate',
  endHalf: 'endHalf',
} as const;

export function formatDays(value: OaDecimal | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return String(Math.round(number * 10) / 10);
}

export function halfText(value: string | null | undefined) {
  return value === 'PM' ? '下午' : '上午';
}

/** 预览只在假期类型与起止日期都已填写时才有意义，避免每次输入都打后端 */
export function leavePreviewInput(
  values: Record<string, unknown>,
): Record<string, unknown> | null {
  const pick = (key: string) => {
    const value = values[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  };
  const type = pick(LEAVE_FORM_KEYS.type);
  const start = pick(LEAVE_FORM_KEYS.startDate);
  const end = pick(LEAVE_FORM_KEYS.endDate);
  if (!type || !start || !end) return null;
  const input: Record<string, unknown> = {
    [LEAVE_FORM_KEYS.type]: type,
    [LEAVE_FORM_KEYS.startDate]: start,
    [LEAVE_FORM_KEYS.endDate]: end,
  };
  const startHalf = pick(LEAVE_FORM_KEYS.startHalf);
  const endHalf = pick(LEAVE_FORM_KEYS.endHalf);
  if (startHalf) input[LEAVE_FORM_KEYS.startHalf] = startHalf;
  if (endHalf) input[LEAVE_FORM_KEYS.endHalf] = endHalf;
  return input;
}
