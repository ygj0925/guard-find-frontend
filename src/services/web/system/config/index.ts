import type { R } from '@/typings';
import { request } from 'umi';
import type { SysConfig, SysConfigQo, SysConfigVo } from './typings';

export async function query(body: Partial<SysConfigQo>) {
  return request<R<SysConfigVo[]>>('system/option', {
    method: 'GET',
    params: body,
  });
}

export async function create(body: SysConfig) {
  return request<R<any>>('system/option', {
    method: 'POST',
    data: body,
  });
}

export async function edit(body: SysConfig) {
  return request<R<any>>('system/option', {
    method: 'PUT',
    data: [body],
  });
}

export async function del(body: SysConfigVo) {
  return request<R<any>>('system/option', {
    method: 'DELETE',
    data: [body.id],
  });
}
