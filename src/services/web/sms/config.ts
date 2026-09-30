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
  return request<R<any>>(`system/sms/config/${body.id}`, {
    method: 'PUT',
    data: body,
  });
}

/** 删除：`DELETE /system/sms/config` + `{ids}` */
export async function deleteSmsConfig(id: number | number[]) {
  return request<R<any>>('system/sms/config', {
    method: 'DELETE',
    data: { ids: Array.isArray(id) ? id : [id] },
  });
}

export async function setDefaultSms(id: number) {
  return request<R<any>>(`system/sms/config/${id}/default`, {
    method: 'PUT',
  });
}
