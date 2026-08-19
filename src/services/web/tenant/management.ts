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
  return request<R<any>>('tenant/management', {
    method: 'PUT',
    data: body,
  });
}

export async function deleteTenant(id: number) {
  return request<R<any>>(`tenant/management/${id}`, {
    method: 'DELETE',
  });
}

export async function resetTenantPassword(id: number, password: string) {
  return request<R<any>>(`tenant/management/${id}/password`, {
    method: 'PUT',
    data: { password },
  });
}
