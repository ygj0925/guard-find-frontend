import { request } from 'umi';
import type { PageResult, QueryParam, R } from '@/typings';

/** 客户端信息（sys_client，对应后端 ClientResp） */
export interface SysClientVo {
  id: number;
  clientId: string;
  clientType: string;
  authType: string[];
  /** 无操作有效期（秒），null 表示不启用 */
  activeTimeout: number | null;
  /** 有效期（秒） */
  timeout: number;
  isConcurrent: boolean;
  /** 同一账号多端互踢范围（CURR_DEVICE_TYPE/ALL_DEVICE_TYPE），仅关闭并发时生效 */
  replacedRange?: 'CURR_DEVICE_TYPE' | 'ALL_DEVICE_TYPE' | null;
  /** 最大登录数量（-1 不限制） */
  maxLoginCount: number;
  /** 登录溢出处理（LOGOUT 注销下线/KICKOUT 踢人下线） */
  overflowLogoutMode?: 'LOGOUT' | 'KICKOUT' | null;
  status: number;
  createTime?: string;
}

/** 客户端创建/修改请求（对应后端 ClientReq） */
export interface SysClientDto {
  clientId?: string;
  clientType: string;
  authType: string[];
  activeTimeout?: number | null;
  timeout: number;
  isConcurrent: boolean;
  replacedRange?: string | null;
  maxLoginCount: number;
  overflowLogoutMode?: string | null;
  status: number;
}

export async function queryClients(params: QueryParam<{}>) {
  return request<R<PageResult<SysClientVo>>>('system/client', {
    method: 'GET',
    params,
  });
}

export async function getClient(id: number) {
  return request<R<SysClientVo>>(`system/client/${id}`, {
    method: 'GET',
  });
}

export async function createClient(data: SysClientDto) {
  return request<R<any>>('system/client', {
    method: 'POST',
    data,
  });
}

export async function updateClient(id: number, data: SysClientDto) {
  return request<R<any>>(`system/client/${id}`, {
    method: 'PUT',
    data,
  });
}

/** 删除：`DELETE /system/client` + `{ids}`（BATCH_DELETE） */
export async function deleteClients(ids: number | number[]) {
  return request<R<any>>('system/client', {
    method: 'DELETE',
    data: { ids: Array.isArray(ids) ? ids : [ids] },
  });
}
