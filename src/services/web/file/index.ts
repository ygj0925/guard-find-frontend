import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type {
  FileDirSizeVo,
  FileQuery,
  FileReq,
  FileStatsVo,
  FileUploadResp,
  FileVo,
} from './typings';

/** 文件类型（后端 `FileTypeEnum`，按裸值下发） */
export const FILE_TYPE_DIR = 0;

export async function queryFiles(body: QueryParam<FileQuery>) {
  return request<R<PageResult<FileVo>>>('system/file', {
    method: 'GET',
    params: body,
  });
}

/**
 * 上传文件：`POST /system/file/upload`（multipart，字段名固定为 `file`）。
 * `parentPath` 留空时后端按 `/yyyy/MM/dd` 归档。
 */
export async function uploadFile(file: File, parentPath?: string) {
  const fd = new FormData();
  fd.append('file', file);

  return request<R<FileUploadResp>>('system/file/upload', {
    method: 'POST',
    data: fd,
    params: parentPath ? { parentPath } : undefined,
  });
}

/** 删除（移入回收站）：`DELETE /system/file` + `{ids}` */
export async function deleteFile(id: number | number[]) {
  return request<R<any>>('system/file', {
    method: 'DELETE',
    data: { ids: Array.isArray(id) ? id : [id] },
  });
}

/** 批量删除（移入回收站）：`DELETE /system/file` + `{ids}`，后端只开放批量形态 */
export async function batchDelete(ids: number[]) {
  return deleteFile(ids);
}

/** 查询回收站：`GET /system/file/recycle` */
export async function queryRecycleFiles(body: QueryParam<FileQuery>) {
  return request<R<PageResult<FileVo>>>('system/file/recycle', {
    method: 'GET',
    params: body,
  });
}

/** 从回收站恢复：`PUT /system/file/recycle/restore/{id}` */
export async function restoreFile(id: number) {
  return request<R<null>>(`system/file/recycle/restore/${id}`, {
    method: 'PUT',
  });
}

/** 彻底删除：`DELETE /system/file/recycle/{id}`（单个路径形态，不是 `{ids}`） */
export async function permanentDelete(id: number) {
  return request<R<null>>(`system/file/recycle/${id}`, {
    method: 'DELETE',
  });
}

/** 清空回收站：`DELETE /system/file/recycle/clean`（无参数） */
export async function cleanRecycle() {
  return request<R<null>>('system/file/recycle/clean', { method: 'DELETE' });
}

/**
 * 文件资源统计：`GET /system/file/statistics`。
 *
 * 权限码 `system:file:statistics` 只在 `@SaCheckPermission` 上出现、`sys_menu` 里没有
 * 对应按钮行，因此除超级管理员外任何角色都无法被授予 —— 调用方需按"可选能力"降级。
 */
export async function getStatistics() {
  return request<R<FileStatsVo>>('system/file/statistics', {
    method: 'GET',
    silent: true,
  });
}

/**
 * 创建文件夹：`POST /system/file/dir`，返回 `{id}`。
 *
 * 后端 `createDir` 显式校验 `parentPath` 非空，所以这里必须带上上级目录。
 */
export async function createDir(body: FileReq) {
  return request<R<{ id: number }>>('system/file/dir', {
    method: 'POST',
    data: body,
  });
}

/**
 * 重命名文件：`PUT /system/file/{id}`，body 为 `FileReq`。
 *
 * 改的是 `originalName`（展示名），服务端存储名 `name` 不变；`parentPath` 可顺带移动目录，
 * 留空表示不移动。
 */
export async function renameFile(id: number, body: FileReq) {
  return request<R<null>>(`system/file/${id}`, { method: 'PUT', data: body });
}

/** 计算文件夹大小：`GET /system/file/dir/{id}/size`（仅对 `type=0` 目录有意义） */
export async function calcDirSize(id: number) {
  return request<R<FileDirSizeVo>>(`system/file/dir/${id}/size`, {
    method: 'GET',
  });
}

/**
 * 秒传校验：`GET /system/file/check?fileHash={sha256}`。
 *
 * 命中时返回已存在的文件记录，未命中返回 `data:null`。权限码 `system:file:check`
 * 同样没有 `sys_menu` 行（仅超级管理员可用），故按静默请求发出，失败由调用方降级为普通上传。
 */
export async function checkFile(fileHash: string) {
  return request<R<FileVo | null>>('system/file/check', {
    method: 'GET',
    params: { fileHash },
    silent: true,
  });
}
