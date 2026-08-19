export interface TenantVo {
  id: number;
  name: string;
  domain: string;
  adminUsername: string;
  status: number;
  packageName: string;
  packageId: number;
  expireTime: string;
  description: string;
  createTime: string;
}

export interface TenantDto {
  id?: number;
  name: string;
  domain?: string;
  adminUsername?: string;
  adminPassword?: string;
  packageId: number;
  expireTime?: string;
  status?: number;
  description?: string;
}

export interface TenantQuery {
  name?: string;
  status?: number;
}

export interface TenantPackageVo {
  id: number;
  name: string;
  description: string;
  menuIds: number[];
  status: number;
  createTime: string;
}

export interface TenantPackageDto {
  id?: number;
  name: string;
  description?: string;
  status?: number;
}
