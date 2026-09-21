import { useModel } from '@umijs/max';
import { useEffect, useState } from 'react';
import {
  getCachedFirstPath,
  getCachedMenuRoutes,
} from '@/utils/RouteUtils';
import { isLogin } from '@/utils/Web';

export default function useDynamicRoute() {
  const { initialState } = useModel('@@initialState');
  const [dynamicRoute, setDynamicRoute] = useState<any[]>([]);
  const [firstPath, setMenuFirst] = useState<string>();

  useEffect(() => {
    if (initialState && isLogin(initialState)) {
      const cached = getCachedMenuRoutes();
      if (cached.length > 0) {
        setDynamicRoute(cached);
        setMenuFirst(getCachedFirstPath());
      }
    }
  }, [initialState]);

  return { dynamicRoute, firstPath };
}
