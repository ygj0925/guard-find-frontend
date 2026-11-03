import { request } from 'umi';
import type { PageResult, QueryParam, R } from '@/typings';

export interface AdminConversationVo {
  userId: string | number;
  nickname: string | null;
  avatar: string | null;
  lastMessage: string | null;
  lastMessageId: string | number;
  lastTime: string;
  unreadCount: number;
}

export interface AdminMessageVo {
  id: string | number;
  senderType: 'ADMIN' | 'USER';
  adminName: string | null;
  content: string;
  createTime: string;
}

export interface AdminConversationQuery {
  /** 昵称模糊匹配，或完整用户 ID 精确匹配。 */
  keyword?: string;
  onlyUnread?: boolean;
  beforeId?: string | number;
}

export async function queryConversations(params: QueryParam<AdminConversationQuery>) {
  return request<R<PageResult<AdminConversationVo>>>('system/im/conversations', {
    method: 'GET',
    params,
  });
}

export async function queryMessages(userId: string | number, afterId?: string | number) {
  return request<R<AdminMessageVo[]>>(`system/im/conversation/${userId}/messages`, {
    method: 'GET',
    params: afterId ? { afterId } : undefined,
  });
}

export async function sendMessage(userId: string | number, content: string) {
  return request<R<AdminMessageVo>>(`system/im/conversation/${userId}/message`, {
    method: 'POST',
    data: { content },
  });
}
