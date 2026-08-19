import { request } from 'umi';
import type { R } from '@/typings';
import type { BasicInfoDto, EmailDto, PasswordDto, PhoneDto, SocialBindVo } from './typings';

export async function getProfile() {
  return request<R<any>>('auth/user/info', { method: 'GET' });
}

export async function updateBasicInfo(data: BasicInfoDto) {
  return request<R<any>>('user/profile/basic', { method: 'PUT', data });
}

export async function uploadAvatar(file: Blob, filename: string) {
  const formData = new FormData();
  formData.append('file', file, filename);
  return request<R<any>>('user/profile/avatar', {
    method: 'POST',
    body: formData,
  });
}

export async function changePassword(data: PasswordDto) {
  return request<R<any>>('user/profile/password', { method: 'PUT', data });
}

export async function changePhone(data: PhoneDto) {
  return request<R<any>>('user/profile/phone', { method: 'PUT', data });
}

export async function changeEmail(data: EmailDto) {
  return request<R<any>>('user/profile/email', { method: 'PUT', data });
}

export async function getSocialBindings() {
  return request<R<SocialBindVo[]>>('user/profile/social', { method: 'GET' });
}

export async function unbindSocial(source: string) {
  return request<R<any>>(`user/profile/social/${source}`, { method: 'DELETE' });
}
