import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type { LoginLogQo, LoginLogVo } from './typings';
import { download } from '@/utils/download';

export async function query(body: QueryParam<LoginLogQo>) {
  return request<R<PageResult<LoginLogVo>>>('system/log', {
    method: 'GET',
    params: { ...body, module: '登录' },
  });
}

/** 导出登录日志：`GET /system/log/export/login` */
export async function exportLogs(params?: Partial<LoginLogQo>) {
  await download('system/log/export/login', {
    method: 'GET',
    params,
    filename: `登录日志-${Date.now()}.xlsx`,
  });
}
