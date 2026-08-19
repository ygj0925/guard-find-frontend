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
  return request<R<any>>('schedule/job', {
    method: 'PUT',
    data: body,
  });
}

export async function deleteJob(id: number) {
  return request<R<any>>(`schedule/job/${id}`, {
    method: 'DELETE',
  });
}

export async function triggerJob(id: number) {
  return request<R<any>>(`schedule/job/${id}/trigger`, {
    method: 'POST',
  });
}

export async function toggleJobStatus(id: number, status: number) {
  return request<R<any>>(`schedule/job/${id}/status`, {
    method: 'PUT',
    params: { status },
  });
}
