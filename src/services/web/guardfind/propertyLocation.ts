import { request } from 'umi';
import type { R } from '@/typings';
export interface Region { code: number; name: string; children?: Region[] }
export function queryRegions() { return request<R<Region[]>>('miniapp/region/tree'); }
export function queryRegionSource() { return request<R<{ version: string }>>('miniapp/region/source'); }
