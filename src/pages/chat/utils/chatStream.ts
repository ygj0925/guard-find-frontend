import { Token } from '@/utils/Web';
import type { ChatStreamChunk } from '../types';

const BASE_URL = '/api';

export async function* chatSSE(
  url: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamChunk> {
  const response = await fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Token.get()}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const statusMessages: Record<number, string> = {
      401: '登录已过期，请重新登录',
      403: '没有权限访问该资源',
      404: '请求的资源不存在',
      500: '服务器内部错误',
      502: '网关错误',
      503: '服务暂时不可用',
    };
    throw new Error(
      statusMessages[response.status] ?? `请求失败 (${response.status})`,
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('浏览器不支持流式响应');
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') return;

        try {
          const chunk: ChatStreamChunk = JSON.parse(data);
          if (chunk.status === 'error') {
            yield chunk;
            return;
          }
          yield chunk;
        } catch {
          // skip malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
