import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type {
  NoticeUnreadCountVo,
  UnreadCountVo,
  UserMessageDetailVo,
  UserMessageQuery,
  UserMessageVo,
  UserNoticeDetailVo,
  UserNoticeQuery,
  UserNoticeVo,
} from './typings';

export async function queryMessages(body: QueryParam<UserMessageQuery>) {
  return request<R<PageResult<UserMessageVo>>>('user/message', {
    method: 'GET',
    params: body,
  });
}

/** 标记已读：`PATCH /user/message/read`，body `{ ids }` */
export async function markAsRead(id: number | number[]) {
  return request<R<null>>('user/message/read', {
    method: 'PATCH',
    data: { ids: Array.isArray(id) ? id : [id] },
  });
}

/** 全部已读：`PATCH /user/message/readAll`（无 body） */
export async function markAllAsRead() {
  return request<R<null>>('user/message/readAll', {
    method: 'PATCH',
  });
}

/** 删除（单条或批量）：`DELETE /user/message` + `{ids}`（后端只开放批量形态） */
export async function deleteMessage(id: number | number[]) {
  return request<R<null>>('user/message', {
    method: 'DELETE',
    data: { ids: Array.isArray(id) ? id : [id] },
  });
}

export async function batchDeleteMessages(ids: number[]) {
  return deleteMessage(ids);
}

/**
 * 未读消息数量：`GET /user/message/unread`。
 *
 * `detail=true` 时后端额外返回 `details[]`（按 `MessageTypeEnum` 分组的 `count`）。
 */
export async function getUnreadCount(detail?: boolean) {
  return request<R<UnreadCountVo>>('user/message/unread', {
    method: 'GET',
    params: detail ? { detail: true } : undefined,
  });
}

/**
 * 公告详情（收件人视角）：`GET /user/message/notice/{id}`。
 *
 * 不能用管理端的 `GET /system/notice/{id}` —— 那个要 `system:notice:get` 权限码，
 * 普通用户在"我的消息"里点公告会直接 403。
 */
export async function getNoticeDetail(id: number) {
  return request<R<UserNoticeDetailVo>>(`user/message/notice/${id}`, {
    method: 'GET',
  });
}

/** 公告列表（分页，只含发给当前用户的）：`GET /user/message/notice` */
export async function queryNotices(body: QueryParam<UserNoticeQuery>) {
  return request<R<PageResult<UserNoticeVo>>>('user/message/notice', {
    method: 'GET',
    params: body,
  });
}

/** 未读公告数量：`GET /user/message/notice/unread`（后端字段是 `total`） */
export async function getUnreadNoticeCount() {
  return request<R<NoticeUnreadCountVo>>('user/message/notice/unread', {
    method: 'GET',
  });
}

/** 消息详情：`GET /user/message/{id}`（后端读取即置已读） */
export async function getMessageDetail(id: number) {
  return request<R<UserMessageDetailVo>>(`user/message/${id}`, {
    method: 'GET',
  });
}
