import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type { OperationLogQo, OperationLogVo } from './typings';
import { download } from '@/utils/download';

export async function query(body: QueryParam<OperationLogQo>) {
  return request<R<PageResult<OperationLogVo>>>('system/log', {
    method: 'GET',
    params: { ...body, moduleNe: '登录' },
  });
}

/** 导出操作日志：`GET /system/log/export/operation` */
export async function exportLogs(params?: Partial<OperationLogQo>) {
  await download('system/log/export/operation', {
    method: 'GET',
    params,
    filename: `操作日志-${Date.now()}.xlsx`,
  });
}
