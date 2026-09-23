export interface AppVo {
  id: number;
  name: string;
  accessKey: string;
  expireTime: string;
  status: number;
  description: string;
  createTime: string;
}

export interface AppDto {
  id?: number;
  name: string;
  status?: number;
  description?: string;
}

export interface AppQuery {
  name?: string;
  status?: number;
}

export interface AppSecret {
  accessKey: string;
  secretKey: string;
}
