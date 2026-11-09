/**
 * 合同用印与公文知识试点的前端工具：与后端 OaContractHook/OaSealRequestHook/OaDocumentHook 约定的状态与文案。
 */
import dayjs from 'dayjs';
import type {
  OaDocumentAudienceVo,
  OaDocumentInboxVo,
} from '@/services/web/guardfind/oa';

type Meta = Record<string, { text: string; color: string }>;

export const CONTRACT_STATUS_META: Meta = {
  APPROVING: { text: '审批中', color: 'processing' },
  PENDING_SIGN: { text: '待签署', color: 'orange' },
  SIGNED: { text: '已签署', color: 'green' },
  ARCHIVED: { text: '已归档', color: 'blue' },
  CLOSED: { text: '已关闭', color: 'default' },
};

export const CONTRACT_VERSION_STATUS_META: Meta = {
  APPROVING: { text: '审批中', color: 'processing' },
  APPROVED: { text: '已通过', color: 'green' },
  REJECTED: { text: '已驳回', color: 'red' },
  WITHDRAWN: { text: '已撤回', color: 'default' },
  CANCELLED: { text: '已终止', color: 'default' },
};

export const CONTRACT_TYPE_META: Meta = {
  SALES: { text: '销售', color: 'green' },
  PURCHASE: { text: '采购', color: 'volcano' },
  SERVICE: { text: '服务', color: 'cyan' },
  OTHER: { text: '其他', color: 'default' },
};

export const SEAL_TYPE_META: Meta = {
  OFFICIAL: { text: '公章', color: 'red' },
  CONTRACT: { text: '合同章', color: 'blue' },
  FINANCE: { text: '财务章', color: 'gold' },
  LEGAL_REP: { text: '法人章', color: 'magenta' },
  OTHER: { text: '其他', color: 'default' },
};

export const SEAL_STATUS_META: Meta = {
  ENABLED: { text: '启用', color: 'green' },
  DISABLED: { text: '停用', color: 'default' },
};

export const SEAL_REQUEST_STATUS_META: Meta = {
  APPROVING: { text: '审批中', color: 'processing' },
  PENDING_SEAL: { text: '待用印', color: 'orange' },
  USED: { text: '已用印', color: 'green' },
  CLOSED: { text: '已关闭', color: 'default' },
};

export const DOCUMENT_STATUS_META: Meta = {
  APPROVING: { text: '审批中', color: 'processing' },
  PUBLISHED: { text: '已发布', color: 'green' },
  CLOSED: { text: '已关闭', color: 'default' },
  REVOKED: { text: '已撤稿', color: 'red' },
};

export const DOCUMENT_VERSION_STATUS_META: Meta = {
  APPROVING: { text: '审批中', color: 'processing' },
  PUBLISHED: { text: '已发布', color: 'green' },
  REJECTED: { text: '已驳回', color: 'red' },
  WITHDRAWN: { text: '已撤回', color: 'default' },
  CANCELLED: { text: '已终止', color: 'default' },
};

export const DOCUMENT_TYPE_META: Meta = {
  NOTICE: { text: '通知公告', color: 'volcano' },
  KNOWLEDGE: { text: '知识文章', color: 'geekblue' },
};

export const CONTRACT_EXPIRING_OPTIONS = [
  { value: 30, label: '30 天内到期' },
  { value: 60, label: '60 天内到期' },
  { value: 90, label: '90 天内到期' },
];

/** 与 OaSealRequestHook 的风险规则一致：公章/法人章或超过 10 份需总经理岗位审批 */
export function sealNeedsGm(sealType?: string | null, copies?: number | null) {
  return (
    sealType === 'OFFICIAL' || sealType === 'LEGAL_REP' || (copies ?? 0) > 10
  );
}

/** 到期剩余天数：负数为已过期；空日期返回 null */
export function daysUntil(endDate?: string | null, today = dayjs()) {
  if (!endDate) return null;
  return dayjs(endDate).startOf('day').diff(today.startOf('day'), 'day');
}

/** 仅已签署/已归档合同需要关注到期，30 天内提示 */
export function expiryHint(
  status: string,
  endDate?: string | null,
  today = dayjs(),
) {
  if (status !== 'SIGNED' && status !== 'ARCHIVED') return null;
  const days = daysUntil(endDate, today);
  if (days === null || days > 30) return null;
  return days < 0 ? '已到期' : days === 0 ? '今日到期' : `${days} 天后到期`;
}

export function audienceText(audience?: OaDocumentAudienceVo | null) {
  if (!audience) return '—';
  if (audience.all) return '全员';
  const parts: string[] = [];
  const depts = audience.depts?.length ?? 0;
  const users = audience.users?.length ?? 0;
  if (depts > 0) parts.push(`${depts} 个部门（含下级）`);
  if (users > 0) parts.push(`${users} 名人员`);
  return parts.length > 0 ? parts.join('、') : '—';
}

export function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

/** 收件箱阅读状态：需签收的公文以签收为完成 */
export function inboxState(
  item: Pick<OaDocumentInboxVo, 'requireAck' | 'readTime' | 'ackTime'>,
) {
  if (item.requireAck) {
    if (item.ackTime) return { text: '已签收', color: 'green' };
    return item.readTime
      ? { text: '待签收', color: 'orange' }
      : { text: '未读', color: 'red' };
  }
  return item.readTime
    ? { text: '已读', color: 'green' }
    : { text: '未读', color: 'red' };
}
