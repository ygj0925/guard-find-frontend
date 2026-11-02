import { request } from 'umi';
import type { PageResult, QueryParam, R } from '@/typings';

export interface PropertyVo {
  id: number;
  userId: number;
  ownerNickname: string | null;
  ownerIsManager: boolean | null;
  title: string;
  description: string | null;
  propertyType: string;
  layout: string | null;
  areaSqm: number | null;
  floorInfo: string | null;
  orientation: string | null;
  decoration: string | null;
  price: number;
  priceType: string;
  address: string;
  district: string | null;
  city: string | null;
  facilities: string[];
  contactName: string | null;
  contactPhone: string | null;
  status: number;
  viewCount: number;
  images: string[];
  createTime: string;
}

export interface ManagerVo {
  userId: number;
  nickname: string;
  avatar: string | null;
  phone: string | null;
}

export interface PropertyPageQuery {
  status?: number;
  city?: string;
  priceType?: string;
}

export async function queryPropertyPage(params: QueryParam<PropertyPageQuery>) {
  return request<R<PageResult<PropertyVo>>>('system/property/page', {
    method: 'GET',
    params,
  });
}

export async function updatePropertyStatus(id: number, status: number) {
  return request<R<any>>(`system/property/${id}/status`, {
    method: 'POST',
    params: { status },
  });
}

export async function deleteProperty(id: number) {
  return request<R<any>>(`system/property/${id}`, {
    method: 'DELETE',
  });
}

export async function queryManagers(params: QueryParam<{}>) {
  return request<R<PageResult<ManagerVo>>>('system/property/manager', {
    method: 'GET',
    params,
  });
}

export async function setManager(userId: number, isManager: boolean) {
  return request<R<any>>(`system/property/manager/${userId}`, {
    method: 'POST',
    params: { isManager },
  });
}
