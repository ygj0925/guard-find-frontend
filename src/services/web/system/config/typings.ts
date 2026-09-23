export type SysConfig = {
  id?: number;
  name?: string;
  code: string;
  value?: string;
  description?: string;
};

export type SysConfigQo = {
  name?: string;
  code?: string;
  category?: string;
};

export type SysConfigVo = {
  id: number;
  name: string;
  code: string;
  value: string;
  description: string;
};
