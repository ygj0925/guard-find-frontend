import { message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as chatService from '../services';
import type { ChatMessage, Session } from '../types';
import { mergeTools } from '../utils/mergeTools';
import { useChatStream } from './useChatStream';

const CHAT_URL = '/chat/completions';
const EMPTY_MESSAGES: ChatMessage[] = [];

function genKey() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useChat(defaultSessionId?: string) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(
    defaultSessionId,
  );
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>(
    {},
  );
  const { streaming, send, cancel } = useChatStream();
  const activeSessionIdRef = useRef(activeSessionId);
  const messagesMapRef = useRef(messagesMap);
  const historyRequestsRef = useRef(new Map<string, Promise<void>>());
  activeSessionIdRef.current = activeSessionId;
  messagesMapRef.current = messagesMap;

  const messages = activeSessionId
    ? (messagesMap[activeSessionId] ?? EMPTY_MESSAGES)
    : EMPTY_MESSAGES;
  const hasActiveHistory = activeSessionId
    ? Boolean(messagesMap[activeSessionId])
    : false;

  const updateMessages = useCallback(
    (sessionId: string, updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setMessagesMap((prev) => ({
        ...prev,
        [sessionId]: updater(prev[sessionId] ?? []),
      }));
    },
    [],
  );

  const loadSessions = useCallback(async () => {
    try {
      const res = await chatService.getSessions();
      const list = res?.data ?? [];
      setSessions(list);
      if (!activeSessionIdRef.current && list.length > 0) {
        setActiveSessionId(list[0].id);
      }
    } catch {
      message.error('加载会话列表失败');
    }
  }, []);

  const loadHistory = useCallback(async (sessionId: string) => {
    if (messagesMapRef.current[sessionId]) return;
    const existing = historyRequestsRef.current.get(sessionId);
    if (existing) return existing;

    const request = (async () => {
      try {
        const res = await chatService.getHistory(sessionId);
        const list = (res?.data ?? []).map((item) => ({
          ...item,
          key: item.key || genKey(),
          status: 'success' as const,
        }));
        setMessagesMap((current) => {
          const next = { ...current, [sessionId]: list };
          messagesMapRef.current = next;
          return next;
        });
      } catch {
        message.error('加载聊天记录失败');
      } finally {
        historyRequestsRef.current.delete(sessionId);
      }
    })();
    historyRequestsRef.current.set(sessionId, request);
    return request;
  }, []);

  const createSessionFn = useCallback(async () => {
    try {
      const res = await chatService.createSession();
      const session = res?.data;
      if (session) {
        setSessions((prev) => [session, ...prev]);
        setActiveSessionId(session.id);
        setMessagesMap((prev) => ({ ...prev, [session.id]: [] }));
      }
      return session;
    } catch {
      message.error('创建会话失败');
      return undefined;
    }
  }, []);

  const deleteSessionFn = useCallback(async (id: string) => {
    try {
      await chatService.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setMessagesMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (activeSessionIdRef.current === id) {
        setSessions((prev) => {
          if (prev.length > 0) setActiveSessionId(prev[0].id);
          else setActiveSessionId(undefined);
          return prev;
        });
      }
    } catch {
      message.error('删除会话失败');
    }
  }, []);

  const switchSession = useCallback(
    (id: string) => {
      setActiveSessionId(id);
      if (!messagesMap[id]) {
        loadHistory(id);
      }
    },
    [loadHistory],
  );

  const sendMessage = useCallback(
    async (query: string) => {
      let sessionId = activeSessionIdRef.current;
      if (!sessionId) {
        const session = await createSessionFn();
        if (!session) return;
        sessionId = session.id;
      }

      const userMsg: ChatMessage = {
        key: genKey(),
        role: 'user',
        content: query,
        status: 'local',
      };
      const aiMsgKey = genKey();
      const aiMsg: ChatMessage = {
        key: aiMsgKey,
        role: 'assistant',
        content: '',
        status: 'loading',
      };

      const sid = sessionId;
      updateMessages(sid, (prev) => [...prev, userMsg, aiMsg]);

      await send(
        CHAT_URL,
        { query, sessionId: sid },
        {
          onChunk(chunk) {
            updateMessages(sid, (prev) =>
              prev.map((m) => {
                if (m.key !== aiMsgKey) return m;
                const updated: ChatMessage = {
                  ...m,
                  content: m.content + chunk.content,
                  status: 'streaming',
                };
                if (chunk.tools?.length) {
                  updated.tools = mergeTools(m.tools, chunk.tools);
                }
                return updated;
              }),
            );
          },
          onComplete() {
            updateMessages(sid, (prev) =>
              prev.map((m) =>
                m.key === aiMsgKey ? { ...m, status: 'success' } : m,
              ),
            );
          },
          onError(err) {
            updateMessages(sid, (prev) =>
              prev.map((m) => {
                if (m.key !== aiMsgKey) return m;
                const content =
                  err.message === '[已中断]'
                    ? `${m.content}\n\n[已中断]`
                    : err.message || '网络连接异常，请检查网络后重试';
                return { ...m, content, status: 'error' };
              }),
            );
          },
        },
      );
    },
    [send, updateMessages, createSessionFn],
  );

  const cancelStream = useCallback(() => {
    cancel();
  }, [cancel]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (activeSessionId && !hasActiveHistory) {
      loadHistory(activeSessionId);
    }
  }, [activeSessionId, hasActiveHistory, loadHistory]);

  return {
    sessions,
    activeSessionId,
    messages,
    streaming,
    sendMessage,
    createSession: createSessionFn,
    deleteSession: deleteSessionFn,
    switchSession,
    cancelStream,
    loadSessions,
    loadHistory,
  };
}
