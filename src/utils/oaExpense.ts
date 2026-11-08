/**
 * 报销试点的前端工具：与后端 OaExpenseHook 约定的字段 key、状态文案与金额格式。
 */
import type { OaDecimal } from '@/services/web/guardfind/oa';

export const EXPENSE_ITEMS_KEY = 'expenseItems';

export const EXPENSE_STATUS_META: Record<
  string,
  { text: string; color: string }
> = {
  APPROVING: { text: '审批中', color: 'processing' },
  PENDING_PAYMENT: { text: '待支付', color: 'orange' },
  PAID: { text: '已支付', color: 'green' },
  CLOSED: { text: '已关闭', color: 'default' },
};

export const EXPENSE_PAY_METHOD_OPTIONS = [
  { value: 'BANK_TRANSFER', label: '银行转账' },
  { value: 'CASH', label: '现金' },
  { value: 'OTHER', label: '其他' },
] as const;

export function payMethodText(value?: string | null) {
  if (!value) return '—';
  return (
    EXPENSE_PAY_METHOD_OPTIONS.find((item) => item.value === value)?.label ??
    value
  );
}

export function formatAmount(value: OaDecimal | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return `¥${number.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** 只有至少一行填了金额时才请求服务端合计，避免空表单反复打后端 */
export function expensePreviewInput(
  values: Record<string, unknown>,
): Record<string, unknown> | null {
  const rows = values[EXPENSE_ITEMS_KEY];
  if (!Array.isArray(rows)) return null;
  const hasAmount = rows.some(
    (row) =>
      row &&
      typeof row === 'object' &&
      typeof (row as Record<string, unknown>).amount === 'number',
  );
  return hasAmount ? { [EXPENSE_ITEMS_KEY]: rows } : null;
}
