import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type { OperationLogQo, OperationLogVo } from './typings';

export async function query(body: QueryParam<OperationLogQo>) {
  return request<R<PageResult<OperationLogVo>>>('system/log', {
    method: 'GET',
    params: { ...body, moduleNe: '登录' },
  });
}
