/**
 * @see https://umijs.org/docs/max/access#access
 * */
import type { GLOBAL } from '@/typings';

export default function access(
  initialState: { user?: GLOBAL.UserInfo } | undefined,
) {
  const currentUser = initialState?.user;
  const permissions = currentUser?.permissions || [];
  const roles = currentUser?.roles || [];

  return {
    canAdmin: roles.includes('admin') || roles.includes('super_admin'),
    permissions,
    roles,
    hasPermission: (permission: string) => permissions.includes(permission),
    hasRole: (role: string) => roles.includes(role),
  };
}
