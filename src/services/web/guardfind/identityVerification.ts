import { request } from 'umi';
import type { R } from '@/typings';

export type IdentityProvider = 'DISABLED' | 'MANUAL' | 'TENCENT' | 'ALIYUN';
export type IdentityStatus =
  | 'UNVERIFIED'
  | 'PENDING_CONSENT'
  | 'PENDING'
  | 'VERIFIED'
  | 'FAILED'
  | 'EXPIRED'
  | 'REVIEW_REQUIRED';

export interface IdentityVerificationSettings {
  enabled: boolean;
  required: boolean;
  provider: IdentityProvider;
  verificationTtlDays: number;
  updatedAt?: string | null;
}

export interface IdentityVerificationStatus {
  id: string;
  userId: string;
  userName: string;
  role: 'USER' | 'TENANT' | 'LANDLORD';
  status: IdentityStatus;
  maskedIdNumber?: string | null;
  provider?: IdentityProvider;
  verifiedAt?: string | null;
  failedReason?: string | null;
  lastAttemptAt?: string | null;
  version: number;
}

export interface IdentityVerificationPage {
  list: IdentityVerificationStatus[];
  total: number;
}

export const identityStatusLabels: Record<IdentityStatus, string> = {
  UNVERIFIED: '未核验',
  PENDING_CONSENT: '待用户同意',
  PENDING: '核验中',
  VERIFIED: '已通过',
  FAILED: '核验失败',
  EXPIRED: '已过期',
  REVIEW_REQUIRED: '待人工复核',
};

export const identityProviderLabels: Record<IdentityProvider, string> = {
  DISABLED: '未启用',
  MANUAL: '人工复核',
  TENCENT: '腾讯云实人认证',
  ALIYUN: '阿里云实人认证',
};

export const queryIdentitySettings = () =>
  request<R<IdentityVerificationSettings>>('system/identity-verification/settings');

export const updateIdentitySettings = (data: IdentityVerificationSettings) =>
  request<R<void>>('system/identity-verification/settings', {
    method: 'PUT',
    data,
  });

export const queryIdentityVerifications = (params: Record<string, unknown>) =>
  request<R<IdentityVerificationPage>>('system/identity-verification/status', {
    params,
  });

export const reviewIdentityVerification = (
  id: string,
  data: {
    action: 'VERIFY' | 'REJECT';
    reason: string;
    version: number;
  },
) =>
  request<R<void>>(`system/identity-verification/${id}/manual-review`, {
    method: 'POST',
    data: {
      decision: data.action,
      reason: data.reason,
      version: data.version,
    },
  });
