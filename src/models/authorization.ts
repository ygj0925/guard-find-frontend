import { useModel } from '@umijs/max';
import { useCallback, useEffect } from 'react';
import type { GLOBAL } from '@/typings';
import { getSessionIdentity, loadAuthorization } from '@/utils/AuthSession';
import { Token } from '@/utils/Web';

export default function useAuthorizationModel(): {
  refreshAuthorization: () => Promise<GLOBAL.UserInfo | undefined>;
} {
  const { initialState, setInitialState } = useModel('@@initialState');
  const userId = initialState?.user?.id;

  const refreshAuthorization = useCallback(async () => {
    if (!Token.get()) return;
    const identity = getSessionIdentity();
    const user = await loadAuthorization(true);
    if (identity === getSessionIdentity()) {
      setInitialState((state) => ({ ...state, user }));
    }
    return user;
  }, [setInitialState]);

  useEffect(() => {
    if (!userId || !Token.get()) return;
    let lastRefresh = 0;
    const sync = () => {
      if (
        document.visibilityState === 'hidden' ||
        Date.now() - lastRefresh < 5000
      )
        return;
      lastRefresh = Date.now();
      void refreshAuthorization().catch(() => undefined);
    };
    const timer = window.setInterval(sync, 60_000);
    window.addEventListener('focus', sync);
    window.addEventListener('authorization:refresh', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', sync);
      window.removeEventListener('authorization:refresh', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [userId, refreshAuthorization]);

  return { refreshAuthorization };
}
