export interface AppVo {
  id: number;
  name: string;
  appKey: string;
  appSecret: string;
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
