import type { R } from '@/typings';
import { request } from 'umi';
import type { SysDict, SysDictData, SysDictDataHash, SysDictQo, SysDictVo } from './typing';

export async function query(body: Partial<SysDictQo>) {
  return request<R<SysDictVo[]>>('system/dict/list', {
    method: 'GET',
    params: body,
  });
}

export async function create(body: SysDict) {
  return request<R<any>>('system/dict', {
    method: 'POST',
    data: body,
  });
}

export async function edit(body: SysDict) {
  return request<R<any>>('system/dict', {
    method: 'PUT',
    data: body,
  });
}

export async function del(id: number) {
  return request<R<any>>('system/dict', {
    method: 'DELETE',
    data: [id],
  });
}

export async function validHash(body: SysDictDataHash) {
  return request<R<string[]>>('system/dict/invalid-hash', {
    method: 'POST',
    data: body,
  });
}

export async function dictData(body: string[]) {
  return request<R<SysDictData[]>>(`/system/dict/data?dictCodes=${body.join(',')}`, {
    method: 'GET',
  });
}
