export interface FileVo {
  id: number;
  name: string;
  originalName?: string;
  size: number;
  url: string;
  extension: string;
  type: number;
  storageName: string;
  createUserString: string;
  createTime: string;
}

export interface FileQuery {
  name?: string;
  type?: number;
}

export interface FileStatsVo {
  type?: number | null;
  size?: number | null;
  number?: number | null;
  data?: FileStatsVo[];
}
