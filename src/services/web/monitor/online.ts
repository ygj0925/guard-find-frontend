import { request } from 'umi';
import type { PageResult, QueryParam, R } from '@/typings';
import type { OnlineUserQuery, OnlineUserVo } from './typings';

export async function queryOnlineUsers(params: QueryParam<OnlineUserQuery>) {
  return request<R<PageResult<OnlineUserVo>>>('monitor/online', {
    method: 'GET',
    params,
  });
}

export async function kickout(token: string) {
  return request<R<any>>(`monitor/online/${token}`, {
    method: 'DELETE',
  });
}
