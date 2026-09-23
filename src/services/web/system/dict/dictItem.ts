import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type { SysDictItem, SysDictItemQo, SysDictItemVo } from './typing';

export async function query(body: QueryParam<SysDictItemQo>) {
  return request<R<PageResult<SysDictItemVo>>>('system/dict/item', {
    method: 'GET',
    params: body,
  });
}

export async function create(body: SysDictItem) {
  return request<R<any>>('system/dict/item', {
    method: 'POST',
    data: body,
  });
}

export async function edit(body: SysDictItem) {
  return request<R<any>>('system/dict/item', {
    method: 'PUT',
    data: body,
  });
}

export async function del(id: number) {
  return request<R<any>>('system/dict/item', {
    method: 'DELETE',
    data: [id],
  });
}
