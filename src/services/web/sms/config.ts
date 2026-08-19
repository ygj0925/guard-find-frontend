import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type { SmsConfigDto, SmsConfigVo } from './typings';

export async function querySmsConfigs(body: QueryParam<any>) {
  return request<R<PageResult<SmsConfigVo>>>('system/sms/config', {
    method: 'GET',
    params: body,
  });
}

export async function createSmsConfig(body: SmsConfigDto) {
  return request<R<any>>('system/sms/config', {
    method: 'POST',
    data: body,
  });
}

export async function updateSmsConfig(body: SmsConfigDto) {
  return request<R<any>>('system/sms/config', {
    method: 'PUT',
    data: body,
  });
}

export async function deleteSmsConfig(id: number) {
  return request<R<any>>(`system/sms/config/${id}`, {
    method: 'DELETE',
  });
}

export async function setDefaultSms(id: number) {
  return request<R<any>>(`system/sms/config/${id}/default`, {
    method: 'PUT',
  });
}
