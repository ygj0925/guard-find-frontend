export interface StorageVo {
  id: number;
  name: string;
  code: string;
  type: number;
  accessKey: string;
  secretKey: string;
  endpoint: string;
  bucketName: string;
  domain: string;
  description: string;
  isDefault: boolean;
  status: number;
  sort: number;
  createTime: string;
}

export interface StorageDto {
  id?: number;
  name: string;
  code: string;
  type: number;
  accessKey?: string;
  secretKey?: string;
  endpoint?: string;
  bucketName?: string;
  domain?: string;
  description?: string;
  sort?: number;
}

export interface StorageQuery {
  name?: string;
  type?: number;
  status?: number;
}
