import { request } from 'umi';
import type { PageResult, QueryParam, R } from '@/typings';

export interface PropertyVo {
  id: string | number;
  userId?: string | number | null;
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
  community: string | null;
  availableFrom: string | null;
  rentalMode: string | null;
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
  userId: string | number;
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

export async function updatePropertyStatus(id: string | number, status: number) {
  return request<R<any>>(`system/property/${id}/status`, {
    method: 'POST',
    params: { status },
  });
}

export async function deleteProperty(id: string | number) {
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

export async function setManager(userId: string | number, isManager: boolean) {
  return request<R<any>>(`system/property/manager/${userId}`, {
    method: 'POST',
    params: { isManager },
  });
}

export type PropertyInput = Pick<PropertyVo, 'title' | 'description' | 'propertyType' | 'layout' | 'areaSqm' | 'floorInfo' | 'orientation' | 'decoration' | 'price' | 'priceType' | 'community' | 'availableFrom' | 'rentalMode' | 'address' | 'district' | 'city' | 'facilities' | 'contactName' | 'contactPhone' | 'status' | 'images'>;
export function saveProperty(id: string | number | undefined, data: PropertyInput & { ownerId?: string }) {
  if (id) return request<R<void>>(`system/property/${id}`, { method: 'PUT', data });
  return request<R<string>>('system/property', { method: 'POST', data });
}
export interface BookingVo {
  id: string | number; propertyId: string | number; propertyTitle: string;
  userId: string | number; ownerId?: string | number | null; userNickname: string;
  bookingTime: string; contactName: string; contactPhone: string; remark: string; status: number;
}
export function queryBookings(params: QueryParam<{ status?: number; propertyId?: string | number }>) {
  return request<R<PageResult<BookingVo>>>('system/property/bookings', { params });
}
export function updateBooking(id: string | number, status: number) {
  return request<R<void>>(`system/property/booking/${id}/status`, { method: 'POST', params: { status } });
}

export function uploadPropertyImage(file: File) {
  const data = new FormData(); data.append('file',file);
  return request<R<{ url: string }>>('system/property/images', { method: 'POST', data });
}
