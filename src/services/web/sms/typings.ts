export interface SmsConfigVo {
  id: number;
  name: string;
  platform: string;
  accessKey: string;
  secretKey: string;
  signName: string;
  templateId: string;
  isDefault: boolean;
  status: number;
  description: string;
  createTime: string;
}

export interface SmsConfigDto {
  id?: number;
  name: string;
  platform: string;
  accessKey: string;
  secretKey: string;
  signName: string;
  templateId?: string;
  description?: string;
}

export interface SmsLogVo {
  id: number;
  phone: string;
  content: string;
  platform: string;
  status: number;
  response: string;
  createTime: string;
}

export interface SmsLogQuery {
  phone?: string;
  status?: number;
}
