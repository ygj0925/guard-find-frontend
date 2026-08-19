import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type { TenantPackageDto, TenantPackageVo } from './typings';

export async function queryPackages(body: QueryParam<any>) {
  return request<R<PageResult<TenantPackageVo>>>('tenant/package', {
    method: 'GET',
    params: body,
  });
}

export async function createPackage(body: TenantPackageDto) {
  return request<R<any>>('tenant/package', {
    method: 'POST',
    data: body,
  });
}

export async function updatePackage(body: TenantPackageDto) {
  return request<R<any>>('tenant/package', {
    method: 'PUT',
    data: body,
  });
}

export async function deletePackage(id: number) {
  return request<R<any>>(`tenant/package/${id}`, {
    method: 'DELETE',
  });
}

export async function getMenuTree() {
  return request<R<any>>('tenant/package/menu/tree', {
    method: 'GET',
  });
}

export async function assignMenus(id: number, menuIds: number[]) {
  return request<R<any>>(`tenant/package/${id}/menu`, {
    method: 'PUT',
    data: { menuIds },
  });
}
