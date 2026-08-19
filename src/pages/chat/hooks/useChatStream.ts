import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatStreamChunk } from '../types';
import { chatSSE } from '../utils/chatStream';

interface ChatStreamCallbacks {
  onChunk: (chunk: ChatStreamChunk) => void;
  onComplete: () => void;
  onError: (err: Error) => void;
}

export function useChatStream() {
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const send = useCallback(
    async (
      url: string,
      body: Record<string, unknown>,
      callbacks: ChatStreamCallbacks,
    ) => {
      cancel();
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);
      let bufferedChunk: ChatStreamChunk | undefined;
      let flushTimer: ReturnType<typeof setTimeout> | undefined;

      const flush = () => {
        if (flushTimer) clearTimeout(flushTimer);
        flushTimer = undefined;
        if (!bufferedChunk) return;
        callbacks.onChunk(bufferedChunk);
        bufferedChunk = undefined;
      };

      try {
        for await (const chunk of chatSSE(url, body, controller.signal)) {
          if (chunk.status === 'error') {
            flush();
            callbacks.onError(new Error(chunk.content || '服务端返回错误'));
            return;
          }
          bufferedChunk = bufferedChunk
            ? {
                ...chunk,
                content: bufferedChunk.content + chunk.content,
                tools: [...(bufferedChunk.tools ?? []), ...(chunk.tools ?? [])],
              }
            : chunk;
          flushTimer ??= setTimeout(flush, 16);
        }
        flush();
        callbacks.onComplete();
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          callbacks.onError(new Error('[已中断]'));
        } else {
          callbacks.onError(
            err instanceof Error
              ? err
              : new Error('网络连接异常，请检查网络后重试'),
          );
        }
      } finally {
        if (flushTimer) clearTimeout(flushTimer);
        abortRef.current = null;
        setStreaming(false);
      }
    },
    [cancel],
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { streaming, send, cancel };
}
