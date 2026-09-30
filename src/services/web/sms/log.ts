import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type { SmsLogQuery, SmsLogVo } from './typings';

export async function querySmsLogs(body: QueryParam<SmsLogQuery>) {
  return request<R<PageResult<SmsLogVo>>>('system/sms/log', {
    method: 'GET',
    params: body,
  });
}

/** 删除：`DELETE /system/sms/log` + `{ids}` */
export async function deleteSmsLog(id: number | number[]) {
  return request<R<any>>('system/sms/log', {
    method: 'DELETE',
    data: { ids: Array.isArray(id) ? id : [id] },
  });
}

export async function batchDeleteSmsLogs(ids: number[]) {
  return request<R<any>>('system/sms/log', {
    method: 'DELETE',
    data: { ids },
  });
}

export async function exportSmsLogs(body: Partial<SmsLogQuery>) {
  return request<any>('system/sms/log/export', {
    method: 'GET',
    params: body,
    responseType: 'blob',
  });
}
