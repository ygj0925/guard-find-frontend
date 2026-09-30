/**
 * @see https://umijs.org/docs/max/access#access
 *
 * 判定逻辑统一走 `@/utils/access`，与 `useAccess`/`AccessControl` 完全一致。
 */

import type { GLOBAL } from '@/typings';
import { createAccessChecker } from '@/utils/access';

export default function access(
  initialState: { user?: GLOBAL.UserInfo } | undefined,
) {
  const access = createAccessChecker(initialState?.user);

  return {
    /** 兼容旧命名 */
    canAdmin: access.isAdmin,
    permissions: access.permissions,
    roles: access.roles,
    hasPermission: access.hasPermission,
    hasRole: access.hasRole,
    hasAnyPermission: access.hasAnyPermission,
    hasAllPermissions: access.hasAllPermissions,
  };
}
