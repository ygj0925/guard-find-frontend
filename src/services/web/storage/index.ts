import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type { StorageDto, StorageQuery, StorageVo } from './typings';

export async function queryStorages(body: QueryParam<StorageQuery>) {
  return request<R<PageResult<StorageVo>>>('system/storage', {
    method: 'GET',
    params: body,
  });
}

export async function createStorage(body: StorageDto) {
  return request<R<any>>('system/storage', {
    method: 'POST',
    data: body,
  });
}

export async function updateStorage(body: StorageDto) {
  return request<R<any>>('system/storage', {
    method: 'PUT',
    data: body,
  });
}

export async function deleteStorage(id: number) {
  return request<R<any>>(`system/storage/${id}`, {
    method: 'DELETE',
  });
}

export async function setDefault(id: number) {
  return request<R<any>>(`system/storage/${id}/default`, {
    method: 'PUT',
  });
}

export async function toggleStatus(id: number, status: number) {
  return request<R<any>>(`system/storage/${id}/status`, {
    method: 'PUT',
    params: { status },
  });
}
