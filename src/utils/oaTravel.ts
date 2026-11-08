/**
 * 出差借款试点的前端工具：与后端 OaTravelHook/OaLoanHook 约定的状态与台账动作文案。
 */
import type { OaDecimal } from '@/services/web/guardfind/oa';

type Meta = Record<string, { text: string; color: string }>;

export const TRAVEL_STATUS_META: Meta = {
  APPROVING: { text: '审批中', color: 'processing' },
  APPROVED: { text: '已通过', color: 'green' },
  CLOSED: { text: '已关闭', color: 'default' },
};

export const LOAN_STATUS_META: Meta = {
  APPROVING: { text: '审批中', color: 'processing' },
  PENDING_DISBURSE: { text: '待放款', color: 'orange' },
  OUTSTANDING: { text: '待还款', color: 'gold' },
  SETTLED: { text: '已还清', color: 'green' },
  CLOSED: { text: '已关闭', color: 'default' },
};

export const LOAN_LEDGER_ACTION_META: Meta = {
  DISBURSE: { text: '放款', color: 'blue' },
  WRITE_OFF: { text: '报销核销', color: 'purple' },
  REPAY: { text: '还款', color: 'green' },
};

export function statusValueEnum(meta: Meta) {
  return Object.fromEntries(
    Object.entries(meta).map(([key, item]) => [key, { text: item.text }]),
  );
}

/** 分转换避免浮点误差，用于报销实付 = 合计 − 核销 */
export function toCents(value: OaDecimal | number | null | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

export function newRequestId(prefix: string) {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}-${random}`.slice(0, 64);
}
