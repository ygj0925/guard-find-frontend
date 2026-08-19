export interface FileVo {
  id: number;
  name: string;
  size: number;
  url: string;
  extension: string;
  type: string;
  storageName: string;
  createUser: string;
  createTime: string;
}

export interface FileQuery {
  name?: string;
  type?: string;
}

export interface FileStatsVo {
  totalSize: number;
  totalCount: number;
  imageCount: number;
  docCount: number;
  videoCount: number;
  otherCount: number;
}
