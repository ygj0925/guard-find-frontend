import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type { AccessLogQo, AccessLogVo } from './typings';

export async function query(body: QueryParam<AccessLogQo>) {
  return request<R<PageResult<AccessLogVo>>>('system/access-log/page', {
    method: 'GET',
    params: body,
  });
}
