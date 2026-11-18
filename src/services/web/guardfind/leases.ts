import { request } from 'umi';
import type { R } from '@/typings';

export interface LeasePage<T> { list: T[]; total: number }
export type LeaseStatus = 'DRAFT' | 'PENDING_SIGNATURE' | 'SIGNED' | 'EXPIRED' | 'TERMINATED' | 'VOID' | 'SIGNING_EXPIRED';
export const leaseStatusLabels: Record<LeaseStatus, string> = {
  DRAFT: '草稿', PENDING_SIGNATURE: '待双方签署', SIGNED: '已签署', EXPIRED: '已到期', TERMINATED: '已终止', VOID: '已作废',
  SIGNING_EXPIRED: '签署已超时',
};
export const renewalLabels = { NONE: '未申请', PENDING: '待审核', APPROVED: '已生成续租合同', REJECTED: '已拒绝', CANCELED: '已撤回' };
export const moveOutLabels = { NONE: '未申请', PENDING: '待处理', RESOLVED: '已处理' };
export interface LeaseInput {
  propertyId: string; tenantId: string; landlordId: string;
  title: string; landlordName: string; tenantName: string;
  startDate: string; endDate: string; monthlyRent: number; deposit: number; terms: string;
  previousLeaseId?: string;
}
export interface LeaseDetail extends LeaseInput {
  publishedVersion?: number; unresolvedReviews?: number; reviews?: LeaseReview[];
  id: string; propertyTitle: string; propertyAddress: string;
  signatureDeadline?: string;
  signatures?: { id: string; signerRole: 'TENANT' | 'LANDLORD'; signedName: string; signedAt: string; imageBase64: string; sealBase64?: string; recordHash: string; contentHash: string }[];
  status: LeaseStatus; version: number; contentHash: string;
  tenantSignedAt?: string; landlordSignedAt?: string; tenantSignedName?: string; landlordSignedName?: string;
  renewalLeaseId?: string; renewalStatus: keyof typeof renewalLabels; requestedEndDate?: string; renewalReason?: string;
  moveOutStatus: keyof typeof moveOutLabels; daysRemaining: number;
  isTenant?: boolean; isLandlord?: boolean;
  logs: { id: string; action: string; actorType: string; reason?: string; createTime: string }[];
}
export type LeaseAction = 'PUBLISH' | 'VOID' | 'TERMINATE' | 'RENEW_APPROVE' | 'RENEW_REJECT' | 'MOVE_OUT_RESOLVE' | 'RECALL' | 'REMIND_SIGN';
export interface LeaseActionInput {
  action: LeaseAction; version: number; reason?: string;
  renewalStartDate?: string; renewalEndDate?: string; monthlyRent?: number; deposit?: number;
}
export interface LeaseSettings { remindersEnabled: boolean; reminderDays: number[]; renewalWindowDays: number; signatureWindowDays?: number }
export interface LeaseReminder { id: string; leaseId: string; title: string; thresholdDays: number; endDate: string; state: string; createTime: string }
export interface LeasePropertyOption { id: string; title: string; address: string; userId?: string | null }
export interface LeaseCustomerOption { id: string; nickname: string; accountStatus: number }

export const queryLeases = (params: Record<string, unknown>) => request<R<LeasePage<LeaseDetail>>>('system/property/leases', { params });
export const queryLease = (id: string) => request<R<LeaseDetail>>(`system/property/leases/${id}`);
export interface LeaseReview {
  id: string; authorRole: 'TENANT' | 'LANDLORD'; clauseLabel: string; content: string; reply?: string;
  status: 'OPEN' | 'REPLIED' | 'RESOLVED'; version: number; currentRound: boolean; createTime: string;
}
export const replyLeaseReview = (id: string, data: { action: 'REPLY'; publishedVersion?: number; contentHash: string; reviewId: string; version: number; content: string }) => request<R<void>>(`system/property/leases/${id}/reviews`, { method: 'POST', data });
export const queryLeasePdf = (id: string) => request<R<{ filename: string; base64: string }>>(`system/property/leases/${id}/pdf`);
export const createLease = (data: LeaseInput) => request<R<string>>('system/property/leases', { method: 'POST', data });
export const updateLease = (id: string, data: LeaseInput & { version: number }) => request<R<void>>(`system/property/leases/${id}`, { method: 'PUT', data });
export const actOnLease = (id: string, data: LeaseActionInput) => request<R<{ renewalLeaseId?: string }>>(`system/property/leases/${id}/action`, { method: 'POST', data });
export const queryLeaseSettings = () => request<R<LeaseSettings>>('system/property/leases/settings');
export const updateLeaseSettings = (data: LeaseSettings) => request<R<void>>('system/property/leases/settings', { method: 'PUT', data });
export const queryLeaseReminders = (params: Record<string, unknown>) => request<R<LeasePage<LeaseReminder>>>('system/property/leases/reminders', { params });
export const queryLeaseProperties = (keyword = '') => request<R<LeasePage<LeasePropertyOption>>>('system/property/leases/property-options', { params: { keyword, page: 1, size: 30 } });
export const queryLeaseCustomers = (keyword = '') => request<R<LeasePage<LeaseCustomerOption>>>('system/property/leases/customer-options', { params: { keyword, page: 1, size: 30 } });
