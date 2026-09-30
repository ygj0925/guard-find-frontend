import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type { JobLogQuery, JobLogVo } from './typings';

export async function queryJobLogs(body: QueryParam<JobLogQuery>) {
  return request<R<PageResult<JobLogVo>>>('schedule/log', {
    method: 'GET',
    params: body,
  });
}

/** 停止执行中的任务：`POST /schedule/log/stop/{id}` */
export async function stopJobLog(id: number) {
  return request<R<any>>(`schedule/log/stop/${id}`, {
    method: 'POST',
  });
}

/** 重新执行：`POST /schedule/log/retry/{id}` */
export async function retryJobLog(id: number) {
  return request<R<any>>(`schedule/log/retry/${id}`, {
    method: 'POST',
  });
}
