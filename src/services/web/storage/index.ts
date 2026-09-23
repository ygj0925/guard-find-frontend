import type { R } from '@/typings';
import { request } from 'umi';
import type { StorageDto, StorageQuery, StorageVo } from './typings';

export async function queryStorages(body: Partial<StorageQuery>) {
  return request<R<StorageVo[]>>('system/storage/list', {
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
  return request<R<any>>('system/storage', {
    method: 'DELETE',
    data: [id],
  });
}

export async function setDefault(id: number) {
  return request<R<any>>(`system/storage/${id}/default`, {
    method: 'PUT',
  });
}

export async function toggleStatus(id: number, status: 1 | 2) {
  return request<R<any>>(`system/storage/${id}/status`, {
    method: 'PUT',
    data: { status },
  });
}
