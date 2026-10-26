import { useModel } from '@umijs/max';
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
  const { initialState } = useModel('@@initialState');
  const loggedIn = Boolean(initialState?.user && isLogin(initialState));
  return {
    dynamicRoute: loggedIn ? getCachedMenuRoutes() : [],
    firstPath: loggedIn ? getCachedFirstPath() : undefined,
  };
}
