import type { R } from '@/typings';
import { request } from 'umi';
import type { SysConfig, SysConfigQo, SysConfigVo } from './typings';

/**
 * 系统参数（后端 `/system/option`）。
 *
 * 后端 `OptionController` 只有 `GET`（列表）、`PUT`（批量改值）、`PATCH /value`（重置），
 * **没有**新增与删除接口；参数项由 Liquibase 种子数据（`sys_option`）维护。
 */

export async function query(body: Partial<SysConfigQo>) {
  return request<R<SysConfigVo[]>>('system/option', {
    method: 'GET',
    params: body,
  });
}

/** 批量修改参数值：`PUT /system/option`，body 为 `[{id, code, value}]`（后端形参 `List<OptionReq>`） */
export async function edit(body: SysConfig | SysConfig[]) {
  const list = Array.isArray(body) ? body : [body];
  return request<R<null>>('system/option', {
    method: 'PUT',
    data: list.map(({ id, code, value }) => ({ id, code, value })),
  });
}

/** 重置参数为默认值：`PATCH /system/option/value` */
export async function resetValue(body: { category?: string; code?: string }) {
  return request<R<null>>('system/option/value', {
    method: 'PATCH',
    data: body,
  });
}
