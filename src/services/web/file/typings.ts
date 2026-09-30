export interface FileVo {
  id: number;
  /** 服务端存储名称 */
  name: string;
  /** 原始文件名（重命名改的是这个字段） */
  originalName?: string;
  size: number;
  url: string;
  extension: string;
  /** FileTypeEnum：0 目录 / 1 其他 / 2 图片 / 3 文档 / 4 视频 / 5 音频 */
  type: number;
  /** 上级目录 */
  parentPath?: string;
  /** 完整路径 */
  path?: string;
  contentType?: string;
  /** SHA256（秒传校验用） */
  sha256?: string;
  thumbnailUrl?: string;
  storageId?: number;
  storageName: string;
  createUserString: string;
  createTime: string;
}

/** 后端 `FileQuery`（`originalName` 才是列表上的"文件名"筛选字段） */
export interface FileQuery {
  name?: string;
  originalName?: string;
  parentPath?: string;
  type?: number;
}

/** 后端 `FileReq`：`originalName` 必填；建目录时 `parentPath` 也必填 */
export interface FileReq {
  originalName: string;
  parentPath?: string;
}

/** 文件夹大小计算结果（`FileDirCalcSizeResp`） */
export interface FileDirSizeVo {
  size: number;
}

/** 上传响应（`FileUploadResp`） */
export interface FileUploadResp {
  id: number;
  url: string;
  /** 缩略图 URL */
  thUrl?: string;
  /** 图片元数据 JSON 串 */
  metadata?: string;
}

export interface FileStatsVo {
  type?: number | null;
  size?: number | null;
  number?: number | null;
  data?: FileStatsVo[];
}
