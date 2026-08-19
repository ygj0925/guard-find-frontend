import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type { JobLogQuery, JobLogVo } from './typings';

export async function queryJobLogs(body: QueryParam<JobLogQuery>) {
  return request<R<PageResult<JobLogVo>>>('schedule/log', {
    method: 'GET',
    params: body,
  });
}

export async function stopJobLog(id: number) {
  return request<R<any>>(`schedule/log/${id}/stop`, {
    method: 'PUT',
  });
}

export async function retryJobLog(id: number) {
  return request<R<any>>(`schedule/log/${id}/retry`, {
    method: 'POST',
  });
}
