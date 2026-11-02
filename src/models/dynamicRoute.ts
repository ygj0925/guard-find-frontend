import { useModel } from '@umijs/max';
import { useMemo } from 'react';
import {
  type ExpandRoute,
  getCachedFirstPath,
  getCachedMenuRoutes,
} from '@/utils/RouteUtils';
import { isLogin } from '@/utils/Web';

export default function useDynamicRoute(): {
  dynamicRoute: ExpandRoute[];
  firstPath: string | undefined;
} {
  // Menu edits can change routes without changing the user object.
  const { loggedIn, routes, firstPath } = useModel(
    '@@initialState',
    (model) => ({
      loggedIn: Boolean(
        model.initialState?.user && isLogin(model.initialState),
      ),
      routes: getCachedMenuRoutes(),
      firstPath: getCachedFirstPath(),
    }),
  );
  return useMemo(
    () => ({
      dynamicRoute: loggedIn ? routes : [],
      firstPath: loggedIn ? firstPath : undefined,
    }),
    [loggedIn, routes, firstPath],
  );
}
