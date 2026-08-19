import { useModel } from '@umijs/max';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchAndCacheRoutes,
  getCachedFirstPath,
  getCachedMenuRoutes,
} from '@/utils/RouteUtils';
import { isLogin } from '@/utils/Web';

export default function dynamicRoute() {
  const { initialState } = useModel('@@initialState');
  const [dynamicRoute, setDynamicRoute] = useState<any[]>([]);
  const [firstPath, setMenuFirst] = useState<string>();
  const [load, setLoad] = useState(false);

  const getDynamicRoute = useCallback(async () => {
    await fetchAndCacheRoutes();
    setDynamicRoute(getCachedMenuRoutes());
    setMenuFirst(getCachedFirstPath());
    setLoad(true);
    window.location.reload();
  }, []);

  useEffect(() => {
    if (initialState && isLogin(initialState)) {
      const cached = getCachedMenuRoutes();
      if (cached.length > 0) {
        setDynamicRoute(cached);
        setMenuFirst(getCachedFirstPath());
        setLoad(true);
      }
    }
  }, [initialState]);

  return { dynamicRoute, firstPath, getDynamicRoute, load, setLoad };
}
