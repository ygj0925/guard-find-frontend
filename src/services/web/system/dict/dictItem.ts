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
  return request<R<any>>(`system/dict/item/${body.id}`, {
    method: 'PUT',
    data: body,
  });
}

/** 删除：后端只开放批量形态 `DELETE /system/dict/item` + `{ids}` */
export async function del(id: number | number[]) {
  return request<R<any>>('system/dict/item', {
    method: 'DELETE',
    data: { ids: Array.isArray(id) ? id : [id] },
  });
}
