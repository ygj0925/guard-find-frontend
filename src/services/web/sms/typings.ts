export interface SmsConfigVo {
  id: number;
  name: string;
  supplier: string;
  accessKey: string;
  secretKey: string;
  signature: string;
  templateId: string;
  weight?: number;
  retryInterval?: number;
  maxRetries?: number;
  maximum?: number;
  supplierConfig?: string;
  isDefault: boolean;
  status: number;
  createTime: string;
}

export interface SmsConfigDto {
  id?: number;
  name: string;
  supplier: string;
  accessKey: string;
  secretKey: string;
  signature: string;
  templateId?: string;
  description?: string;
}

export interface SmsLogVo {
  id: number;
  configId: number;
  phone: string;
  params: string;
  status: number;
  resMsg: string;
  createTime: string;
}

export interface SmsLogQuery {
  phone?: string;
  status?: number;
}
