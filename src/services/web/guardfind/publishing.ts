import { request } from 'umi';
import type { R } from '@/typings';

export type PublishingPlatform = 'DOUYIN' | 'XIAOHONGSHU' | 'WECHAT_CHANNELS' | 'OTHER';
export type PublishingMode = 'MANUAL' | 'DOUYIN_API';
export type PublishingStatus = 'DRAFT' | 'QUEUED' | 'PROCESSING' | 'MANUAL_REQUIRED' | 'SUBMITTED' | 'PUBLISHED' | 'FAILED' | 'UNKNOWN' | 'CANCELLED' | 'REJECTED';
export interface PublishingCapability {
  code: PublishingPlatform; label: string; mode: string; reason: string;
  maxImages: number; maxTextLength: number; creatorUrl?: string;
}
export interface PublishingCapabilities { platforms: PublishingCapability[]; douyinConfigured: boolean }
export interface PublishingAccountInput {
  platform: PublishingPlatform; name: string; handle: string; mode: PublishingMode;
  credentialKey?: string; enabled: boolean;
}
export interface PublishingAccount extends PublishingAccountInput { id: string; ready?: boolean }
export interface PublishingSettings { autoDraft: boolean; accountIds: string[]; activatedAt?: string | null }
export interface PublishingJob {
  id: string; propertyId: string; accountId: string; accountName: string;
  platform: PublishingPlatform; title: string; body: string; images: string[];
  status: PublishingStatus; version: number; scheduledAt?: string | null;
  lastError?: string | null; resultUrl?: string | null; createdAt: string; updatedAt: string;
  logs?: { action: string; reason?: string | null; createdAt?: string; createTime?: string }[];
}
export interface PublishingContent { title: string; body: string; images: string[]; propertyId: string }
export interface PublishingProperty { id: string; title: string; community?: string; price?: number; priceUnit?: string; status?: number }
export type PublishingAction = 'APPROVE' | 'REJECT' | 'CANCEL' | 'RETRY' | 'CONFIRM_PUBLISHED' | 'CONFIRM_NOT_PUBLISHED';
export interface PublishingJobInput {
  propertyId: string; accountIds: string[]; title?: string; body?: string;
  images?: string[]; scheduledAt?: string; requestId: string;
}
export const publishingStatusLabels: Record<PublishingStatus, string> = {
  DRAFT: '待审核', QUEUED: '已排期', PROCESSING: '正在提交', MANUAL_REQUIRED: '待人工发布',
  SUBMITTED: '已提交平台', PUBLISHED: '已发布', FAILED: '失败', UNKNOWN: '结果待核实',
  CANCELLED: '已取消', REJECTED: '已退回',
};
export const publishingPlatformLabels: Record<PublishingPlatform, string> = {
  DOUYIN: '抖音', XIAOHONGSHU: '小红书', WECHAT_CHANNELS: '视频号', OTHER: '其他平台',
};
export const queryPublishingCapabilities = () => request<R<PublishingCapabilities>>('system/property/publishing/capabilities');
export const queryPublishingAccounts = () => request<R<PublishingAccount[]>>('system/property/publishing/accounts');
export const createPublishingAccount = (data: PublishingAccountInput) => request<R<string>>('system/property/publishing/accounts', { method: 'POST', data });
export const updatePublishingAccount = (id: string, data: PublishingAccountInput) => request<R<void>>(`system/property/publishing/accounts/${id}`, { method: 'PUT', data });
export const queryPublishingSettings = () => request<R<PublishingSettings>>('system/property/publishing/settings');
export const updatePublishingSettings = (data: PublishingSettings) => request<R<void>>('system/property/publishing/settings', { method: 'PUT', data });
export const queryPublishingJobs = (params: Record<string, unknown>) => request<R<{ list: PublishingJob[]; total: number }>>('system/property/publishing/jobs', { params });
export const createPublishingJobs = (data: PublishingJobInput) => request<R<{ ids: string[] }>>('system/property/publishing/jobs', { method: 'POST', data });
export const queryPublishingJob = (id: string) => request<R<PublishingJob>>(`system/property/publishing/jobs/${id}`);
export const updatePublishingJob = (id: string, data: PublishingContent & { version: number; scheduledAt?: string | null }) => request<R<void>>(`system/property/publishing/jobs/${id}`, { method: 'PUT', data });
export const actOnPublishingJob = (id: string, data: { version: number; action: PublishingAction; reason?: string; resultUrl?: string }) => request<R<void>>(`system/property/publishing/jobs/${id}/action`, { method: 'POST', data });
export const queryPublishingPackage = (id: string) => request<R<{ filename: string; content: string }>>(`system/property/publishing/jobs/${id}/package`);
export const queryPublishingProperties = (keyword = '') => request<R<{ list: PublishingProperty[]; total: number }>>('system/property/publishing/properties', { params: { keyword } });
export const queryPublishingPreview = (propertyId: string) => request<R<PublishingContent>>('system/property/publishing/preview', { params: { propertyId } });
