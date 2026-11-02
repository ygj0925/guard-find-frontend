import { useModel } from '@umijs/max';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  getUnreadCount,
  getUnreadNoticeCount,
} from '@/services/web/user-message';
import { getSessionIdentity } from '@/utils/AuthSession';
import { Token } from '@/utils/Web';

interface Counts {
  identity: string;
  messageUnread: number;
  noticeUnread: number;
}

interface Pending {
  identity: string;
  promise: Promise<void>;
  afterMutation?: Promise<void>;
}

interface UnreadModel {
  messageUnread: number;
  noticeUnread: number;
  refreshUnread: (afterMutation?: boolean) => Promise<void>;
}

/** Share in-flight reads; a completed mutation must request a fresh snapshot. */
export default function useUnreadModel(): UnreadModel {
  const identity = useModel('@@initialState', () => getSessionIdentity());
  const [counts, setCounts] = useState<Counts>({
    identity,
    messageUnread: 0,
    noticeUnread: 0,
  });
  const pending = useRef<Pending | undefined>(undefined);

  const refreshUnread = useCallback(function refresh(
    afterMutation = false,
  ): Promise<void> {
    if (!Token.get()) return Promise.resolve();
    const requestedIdentity = getSessionIdentity();
    const current = pending.current;
    if (current?.identity === requestedIdentity) {
      if (!afterMutation) return current.promise;
      // Do not reuse a read that started before marking a message as read.
      current.afterMutation ??= current.promise.then(async () => {
        if (requestedIdentity === getSessionIdentity()) await refresh();
      });
      return current.afterMutation;
    }

    const promise = Promise.allSettled([
      getUnreadCount(),
      getUnreadNoticeCount(),
    ])
      .then(([messages, notices]) => {
        if (requestedIdentity !== getSessionIdentity()) return;
        setCounts((previous) => {
          const sameSession = previous.identity === requestedIdentity;
          const next = {
            identity: requestedIdentity,
            messageUnread:
              messages.status === 'fulfilled'
                ? Number(messages.value.data?.total) || 0
                : sameSession
                  ? previous.messageUnread
                  : 0,
            noticeUnread:
              notices.status === 'fulfilled'
                ? Number(notices.value.data?.total) || 0
                : sameSession
                  ? previous.noticeUnread
                  : 0,
          };
          return sameSession &&
            next.messageUnread === previous.messageUnread &&
            next.noticeUnread === previous.noticeUnread
            ? previous
            : next;
        });
      })
      .finally(() => {
        if (pending.current?.promise === promise) pending.current = undefined;
      });
    pending.current = { identity: requestedIdentity, promise };
    return promise;
  }, []);

  const messageUnread = counts.identity === identity ? counts.messageUnread : 0;
  const noticeUnread = counts.identity === identity ? counts.noticeUnread : 0;
  return useMemo(
    () => ({ messageUnread, noticeUnread, refreshUnread }),
    [messageUnread, noticeUnread, refreshUnread],
  );
}
