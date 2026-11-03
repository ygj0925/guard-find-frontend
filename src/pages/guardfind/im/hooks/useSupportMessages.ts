import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminMessageVo } from '@/services/web/guardfind/im';
import { queryMessages, sendMessage } from '@/services/web/guardfind/im';
import { mergeMessages } from '@/utils/messageCursor';

/** One instance per selected user keeps late responses inside their conversation. */
export default function useSupportMessages(
  userId: string | number,
  enabled: boolean,
  onRead: (userId: string | number) => void,
) {
  const [messages, setMessages] = useState<AdminMessageVo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [retry, setRetry] = useState(0);
  const cursor = useRef<string | number | undefined>(undefined);
  const loaded = useRef(false);
  const version = useRef(0);
  const sendingRef = useRef(false);
  useEffect(() => {
    const current = ++version.current;
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      let count = 0;
      try {
        const response = await queryMessages(userId, cursor.current);
        if (version.current !== current) return;
        const incoming = response.data || [];
        count = incoming.length;
        if (incoming.length) {
          cursor.current = incoming[incoming.length - 1].id;
          setMessages((previous) => mergeMessages(previous, incoming));
        }
        if (count < 100) onRead(userId);
        loaded.current = true;
        setError('');
      } catch {
        if (version.current === current)
          setError(
            loaded.current
              ? '消息同步失败，将自动重试'
              : '消息加载失败，请重试',
          );
      } finally {
        if (version.current === current) {
          setLoading(false);
          timer = setTimeout(() => void poll(), count === 100 ? 50 : 3000);
        }
      }
    };
    void poll();
    return () => {
      version.current++;
      clearTimeout(timer);
    };
  }, [userId, enabled, retry, onRead]);
  const send = async (content: string) => {
    const text = content.trim();
    if (!enabled || sendingRef.current || !text || text.length > 2000)
      return false;
    sendingRef.current = true;
    setSending(true);
    try {
      const response = await sendMessage(userId, text);
      if (!response.data) throw new Error('未返回发送结果');
      setMessages((previous) => mergeMessages(previous, [response.data]));
      return true;
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };
  const reload = useCallback(() => setRetry((value) => value + 1), []);
  return { messages, loading, error, sending, send, reload };
}
