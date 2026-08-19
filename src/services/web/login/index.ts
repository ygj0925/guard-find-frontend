import { request } from '@umijs/max';
import type { GLOBAL, R } from '@/typings';
import type {
  AccountLoginParams,
  EmailLoginParams,
  ImageCaptchaResponse,
  LegacyLoginParams,
  LoginResponse,
  PhoneLoginParams,
  SocialAuthorizeResponse,
} from './typings';

export * from './typings';

/**
 * 退出登录接口
 */
export async function logout() {
  return request<R<unknown>>('/auth/logout', {
    method: 'POST',
  });
}

/**
 * 登录接口
 */
export function login(body: AccountLoginParams, tenantCode?: string): Promise<R<LoginResponse>>;
export function login(body: LegacyLoginParams, tenantCode?: string): Promise<any>;
export async function login(body: AccountLoginParams | LegacyLoginParams, tenantCode?: string) {
  return request<R<LoginResponse>>('/auth/login', {
    method: 'POST',
    data: { ...body, authType: 'ACCOUNT' },
    headers: tenantCode ? { 'X-Tenant-Code': tenantCode } : undefined,
  });
}

export async function getUserInfo() {
  return request<R<GLOBAL.UserInfo>>('/auth/user/info', { method: 'GET' });
}

export async function getImageCaptcha() {
  return request<R<ImageCaptchaResponse>>('/captcha/image', { method: 'GET' });
}

export async function phoneLogin(body: PhoneLoginParams, tenantCode?: string) {
  return request<R<LoginResponse>>('/auth/login', {
    method: 'POST',
    data: { ...body, clientId: process.env.clientId, authType: 'PHONE' },
    headers: tenantCode ? { 'X-Tenant-Code': tenantCode } : undefined,
  });
}

export async function emailLogin(body: EmailLoginParams, tenantCode?: string) {
  return request<R<LoginResponse>>('/auth/login', {
    method: 'POST',
    data: { ...body, clientId: process.env.clientId, authType: 'EMAIL' },
    headers: tenantCode ? { 'X-Tenant-Code': tenantCode } : undefined,
  });
}

export async function getSmsCaptcha(phone: string) {
  return request<R<boolean>>(`/captcha/sms?phone=${encodeURIComponent(phone)}`, { method: 'GET' });
}

export async function getEmailCaptcha(email: string) {
  return request<R<boolean>>(`/captcha/mail?email=${encodeURIComponent(email)}`, { method: 'GET' });
}

export async function socialAuth(source: string) {
  return request<R<SocialAuthorizeResponse>>(`/auth/${source}`, { method: 'GET' });
}

export async function socialLogin(source: string, params: Record<string, string>) {
  return request<R<LoginResponse>>('/auth/login', {
    method: 'POST',
    data: {
      ...params,
      source,
      clientId: process.env.clientId,
      authType: 'SOCIAL',
    },
  });
}

export async function updateUserPassword(data: { oldPassword: string; newPassword: string }) {
  return request<R<unknown>>('/user/profile/password', { method: 'PATCH', data });
}

/**
 * 获取路由
 */
export async function router() {
  return request<R<GLOBAL.Router[]>>('/auth/user/route', {
    method: 'GET',
  });
}
