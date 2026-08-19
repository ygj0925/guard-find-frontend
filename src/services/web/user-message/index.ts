import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type { UnreadCountVo, UserMessageQuery, UserMessageVo } from './typings';

export async function queryMessages(body: QueryParam<UserMessageQuery>) {
  return request<R<PageResult<UserMessageVo>>>('user/message', {
    method: 'GET',
    params: body,
  });
}

export async function markAsRead(id: number) {
  return request<R<any>>(`user/message/read/${id}`, {
    method: 'PUT',
  });
}

export async function markAllAsRead() {
  return request<R<any>>('user/message/read', {
    method: 'PUT',
  });
}

export async function deleteMessage(id: number) {
  return request<R<any>>(`user/message/${id}`, {
    method: 'DELETE',
  });
}

export async function batchDelete(ids: number[]) {
  return request<R<any>>('user/message', {
    method: 'DELETE',
    data: ids,
  });
}

export async function getUnreadCount() {
  return request<R<UnreadCountVo>>('user/message/unread', {
    method: 'GET',
  });
}

export async function getNoticeDetail(id: number) {
  return request<R<any>>(`system/notice/${id}`, {
    method: 'GET',
  });
}
