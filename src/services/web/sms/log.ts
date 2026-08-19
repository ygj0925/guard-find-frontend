import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type { SmsLogQuery, SmsLogVo } from './typings';

export async function querySmsLogs(body: QueryParam<SmsLogQuery>) {
  return request<R<PageResult<SmsLogVo>>>('system/sms/log', {
    method: 'GET',
    params: body,
  });
}

export async function deleteSmsLog(id: number) {
  return request<R<any>>(`system/sms/log/${id}`, {
    method: 'DELETE',
  });
}

export async function batchDeleteSmsLogs(ids: number[]) {
  return request<R<any>>('system/sms/log', {
    method: 'DELETE',
    data: ids,
  });
}

export async function exportSmsLogs(body: Partial<SmsLogQuery>) {
  return request<any>('system/sms/log/export', {
    method: 'GET',
    params: body,
    responseType: 'blob',
  });
}
