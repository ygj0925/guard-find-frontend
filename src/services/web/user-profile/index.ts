import { request } from 'umi';
import type { R } from '@/typings';
import type { BasicInfoDto, EmailDto, PasswordDto, PhoneDto, SocialBindVo } from './typings';

export async function getProfile() {
  return request<R<any>>('auth/user/info', { method: 'GET' });
}

/** 基本资料：`PATCH /user/profile/basic/info` */
export async function updateBasicInfo(data: BasicInfoDto) {
  return request<R<any>>('user/profile/basic/info', { method: 'PATCH', data });
}

/** 头像：`PATCH /user/profile/avatar`（multipart，字段名 file） */
export async function uploadAvatar(file: Blob, filename: string) {
  const formData = new FormData();
  formData.append('file', file, filename);
  return request<R<any>>('user/profile/avatar', {
    method: 'PATCH',
    data: formData,
  });
}

/** 换绑手机 / 邮箱 / 修改密码：后端统一为 `PATCH` */
export async function changePassword(data: PasswordDto) {
  return request<R<any>>('user/profile/password', { method: 'PATCH', data });
}

export async function changePhone(data: PhoneDto) {
  return request<R<any>>('user/profile/phone', { method: 'PATCH', data });
}

export async function changeEmail(data: EmailDto) {
  return request<R<any>>('user/profile/email', { method: 'PATCH', data });
}

export async function getSocialBindings() {
  return request<R<SocialBindVo[]>>('user/profile/social', { method: 'GET' });
}

/** 绑定第三方：`POST /user/profile/social/{source}`，body 为 OAuth 回调参数 */
export async function bindSocial(source: string, data?: Record<string, string>) {
  return request<R<any>>(`user/profile/social/${source}`, {
    method: 'POST',
    data: data || {},
  });
}

export async function unbindSocial(source: string) {
  return request<R<any>>(`user/profile/social/${source}`, { method: 'DELETE' });
}
