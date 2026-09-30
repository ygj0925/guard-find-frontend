import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type { AppDto, AppQuery, AppSecret, AppVo } from './typings';

export async function queryApps(body: QueryParam<AppQuery>) {
  return request<R<PageResult<AppVo>>>('open/app', {
    method: 'GET',
    params: body,
  });
}

export async function createApp(data: AppDto) {
  return request<R<any>>('open/app', {
    method: 'POST',
    data,
  });
}

export async function updateApp(data: AppDto) {
  return request<R<any>>(`open/app/${data.id}`, {
    method: 'PUT',
    data,
  });
}

/** 删除：`DELETE /open/app` + `{ids}` */
export async function deleteApp(id: number | number[]) {
  return request<R<any>>('open/app', {
    method: 'DELETE',
    data: { ids: Array.isArray(id) ? id : [id] },
  });
}

export async function getAppSecret(id: number) {
  return request<R<AppSecret>>(`open/app/${id}/secret`, {
    method: 'GET',
  });
}

export async function resetAppSecret(id: number) {
  return request<R<AppSecret>>(`open/app/${id}/secret`, {
    method: 'PATCH',
  });
}

export async function exportApps(params?: Partial<AppQuery>) {
  return request('open/app/export', {
    method: 'GET',
    params,
    responseType: 'blob',
  });
}
