import { useMemo } from 'react';
import { useModel } from 'umi';
import { type AccessSubject, createAccessChecker } from '@/utils/access';

const checkers = new WeakMap<
  AccessSubject,
  ReturnType<typeof createAccessChecker>
>();
const emptyChecker = createAccessChecker(undefined);

/**
 * 页面/组件用的权限判定。逻辑与 `src/access.ts` 同源（`@/utils/access`），
 * 返回值保持历史字段名，避免大面积改调用点。
 */
export function useAccess() {
  const currentUser = useModel(
    '@@initialState',
    (model) => model.initialState?.user,
  );

  return useMemo(() => {
    // Hundreds of row action buttons share one immutable user snapshot.
    let access = currentUser ? checkers.get(currentUser) : emptyChecker;
    if (!access) {
      access = createAccessChecker(currentUser);
      if (currentUser) checkers.set(currentUser, access);
    }
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
