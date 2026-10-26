import { Link, useLocation, useModel } from '@umijs/max';
import { Button, Result } from 'antd';
import type { ReactNode } from 'react';
import { getAuthorizedRoutes, isOfflinePath } from '@/utils/RouteUtils';
import { canAccessRoute } from '@/utils/routeAccess';
import { Token } from '@/utils/Web';

export default function RouteAccess({ children }: { children: ReactNode }) {
  const { initialState } = useModel('@@initialState');
  const { pathname } = useLocation();
  if (!Token.get() || !initialState?.user) return null;
  if (
    isOfflinePath(pathname) ||
    !canAccessRoute(pathname, getAuthorizedRoutes())
  ) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="你没有访问此页面的权限"
        extra={
          <Link to="/user/profile">
            <Button type="primary">个人中心</Button>
          </Link>
        }
      />
    );
  }
  return children;
}
