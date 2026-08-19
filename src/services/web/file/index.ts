import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type { FileQuery, FileStatsVo, FileVo } from './typings';

export async function queryFiles(body: QueryParam<FileQuery>) {
  return request<R<PageResult<FileVo>>>('system/file', {
    method: 'GET',
    params: body,
  });
}

export async function uploadFile(file: File) {
  const fd = new FormData();
  fd.append('file', file);

  return request<R<any>>('system/file/upload', {
    method: 'POST',
    body: fd,
  });
}

export async function deleteFile(id: number) {
  return request<R<any>>(`system/file/${id}`, {
    method: 'DELETE',
  });
}

export async function batchDelete(ids: number[]) {
  return request<R<any>>('system/file', {
    method: 'DELETE',
    data: ids,
  });
}

export async function queryRecycleFiles(body: QueryParam<FileQuery>) {
  return request<R<PageResult<FileVo>>>('system/file/recycle', {
    method: 'GET',
    params: body,
  });
}

export async function restoreFile(id: number) {
  return request<R<any>>(`system/file/recycle/${id}/restore`, {
    method: 'PUT',
  });
}

export async function permanentDelete(id: number) {
  return request<R<any>>(`system/file/recycle/${id}`, {
    method: 'DELETE',
  });
}

export async function getStatistics() {
  return request<R<FileStatsVo>>('system/file/statistics', {
    method: 'GET',
  });
}
