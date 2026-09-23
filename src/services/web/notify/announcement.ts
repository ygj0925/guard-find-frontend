import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type {
  AnnouncementDetailVo,
  AnnouncementDto,
  AnnouncementQo,
  AnnouncementVo,
} from './typings';

export async function query(body: QueryParam<AnnouncementQo>) {
  return request<R<PageResult<AnnouncementVo>>>('system/notice', {
    method: 'GET',
    params: body,
  });
}

export async function create(body: AnnouncementDto) {
  return request<R<any>>('system/notice', {
    method: 'POST',
    data: body,
  });
}

export async function edit(body: AnnouncementDto) {
  return request<R<any>>('system/notice', {
    method: 'PUT',
    data: body,
  });
}

export async function del(id: number) {
  return request<R<any>>('system/notice', {
    method: 'DELETE',
    data: [id],
  });
}

export async function publish(id: number) {
  return request<R<any>>(`system/announcement/publish/${id}`, {
    method: 'PUT',
  });
}

export async function close(id: number) {
  return request<R<any>>(`system/announcement/close/${id}`, {
    method: 'PUT',
  });
}

export async function detail(id: number) {
  return request<R<AnnouncementDetailVo>>(`system/notice/${id}`, {
    method: 'GET',
  });
}
