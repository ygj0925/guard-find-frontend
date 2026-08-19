import { request } from '@umijs/max';
import type { R } from '@/typings';
import type { ChatMessage, Session } from '../types';

export async function getSessions() {
  return request<R<Session[]>>('chat/sessions', {
    method: 'GET',
  });
}

export async function createSession() {
  return request<R<Session>>('chat/sessions', {
    method: 'POST',
  });
}

export async function deleteSession(id: string) {
  return request<R<void>>(`chat/sessions/${id}`, {
    method: 'DELETE',
  });
}

export async function getHistory(sessionId: string) {
  return request<R<ChatMessage[]>>(`chat/sessions/${sessionId}/messages`, {
    method: 'GET',
  });
}
