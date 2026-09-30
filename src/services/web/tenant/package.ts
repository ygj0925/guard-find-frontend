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
  return request<R<any>>(`tenant/package/${body.id}`, {
    method: 'PUT',
    data: body,
  });
}

export async function deletePackage(id: number) {
  return request<R<any>>(`tenant/package/${id}`, {
    method: 'DELETE',
  });
}

/** 套餐可分配菜单树：`GET /tenant/package/menu/tree` */
export async function getMenuTree() {
  return request<R<any>>('tenant/package/menu/tree', {
    method: 'GET',
  });
}

/**
 * 分配菜单：后端没有独立接口，菜单集合是套餐实体的一部分，
 * 因此先取详情再 `PUT /tenant/package/{id}`（携带原字段 + 新 menuIds）。
 */
export async function assignMenus(id: number, menuIds: number[]) {
  const detail = await request<R<TenantPackageVo & Partial<TenantPackageDto>>>(
    `tenant/package/${id}`,
    { method: 'GET' },
  );
  const { data } = detail;
  if (!data) throw new Error(`套餐 ${id} 不存在，无法分配菜单`);
  const { id: _id, createTime: _c, updateTime: _u, ...rest } = data as Record<string, any>;
  return request<R<null>>(`tenant/package/${id}`, {
    method: 'PUT',
    data: { ...rest, menuIds },
  });
}
