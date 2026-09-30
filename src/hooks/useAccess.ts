import { useMemo } from 'react';
import { useModel } from 'umi';
import { createAccessChecker } from '@/utils/access';

/**
 * 页面/组件用的权限判定。逻辑与 `src/access.ts` 同源（`@/utils/access`），
 * 返回值保持历史字段名，避免大面积改调用点。
 */
export function useAccess() {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.user;

  return useMemo(() => {
    const access = createAccessChecker(currentUser);
    return {
      permissions: access.permissions,
      roles: access.roles,
      isAdmin: access.isAdmin,
      hasPermission: access.hasPermission,
      hasRole: access.hasRole,
      hasAnyPermission: access.hasAnyPermission,
      hasAllPermissions: access.hasAllPermissions,
    };
  }, [currentUser]);
}
