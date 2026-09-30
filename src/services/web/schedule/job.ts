import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type { JobDto, JobQuery, JobVo } from './typings';

export async function queryJobs(body: QueryParam<JobQuery>) {
  return request<R<PageResult<JobVo>>>('schedule/job', {
    method: 'GET',
    params: body,
  });
}

export async function createJob(body: JobDto) {
  return request<R<any>>('schedule/job', {
    method: 'POST',
    data: body,
  });
}

export async function updateJob(body: JobDto) {
  return request<R<any>>(`schedule/job/${body.id}`, {
    method: 'PUT',
    data: body,
  });
}

export async function deleteJob(id: number) {
  return request<R<any>>(`schedule/job/${id}`, {
    method: 'DELETE',
  });
}

/** 立即执行：`POST /schedule/job/trigger/{id}` */
export async function triggerJob(id: number) {
  return request<R<any>>(`schedule/job/trigger/${id}`, {
    method: 'POST',
  });
}

/** 任务分组列表：`GET /schedule/job/group`（用于筛选下拉） */
export async function listGroups() {
  return request<R<string[]>>('schedule/job/group', { method: 'GET' });
}
/** 修改任务状态：`PATCH /schedule/job/{id}/status`，body `{ status }` */
export async function toggleJobStatus(id: number, status: number) {
  return request<R<any>>(`schedule/job/${id}/status`, {
    method: 'PATCH',
    data: { status },
  });
}
