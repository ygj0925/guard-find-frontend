import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type { TenantDto, TenantQuery, TenantVo } from './typings';

export async function queryTenants(body: QueryParam<TenantQuery>) {
  return request<R<PageResult<TenantVo>>>('tenant/management', {
    method: 'GET',
    params: body,
  });
}

export async function createTenant(body: TenantDto) {
  return request<R<any>>('tenant/management', {
    method: 'POST',
    data: body,
  });
}

export async function updateTenant(body: TenantDto) {
  return request<R<any>>(`tenant/management/${body.id}`, {
    method: 'PUT',
    data: body,
  });
}

export async function deleteTenant(id: number) {
  return request<R<any>>(`tenant/management/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 重置租户管理员密码：`PUT /tenant/management/{id}/admin/pwd`，
 * body 为 `{ password }`，且必须是 RSA 加密后的密文
 * （后端 `TenantController.updateAdminUserPwd` 用私钥解密）。
 */
export async function resetTenantPassword(id: number, password: string) {
  return request<R<any>>(`tenant/management/${id}/admin/pwd`, {
    method: 'PUT',
    data: { password },
  });
}
