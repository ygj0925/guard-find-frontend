import { useCallback, useMemo } from 'react';
import { useModel } from 'umi';

export function useAccess() {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.user;

  const permissions = useMemo(() => {
    return currentUser?.permissions || [];
  }, [currentUser]);

  const roles = useMemo(() => {
    return currentUser?.roles || [];
  }, [currentUser]);

  const hasPermission = useCallback(
    (permission: string) => {
      if (!permission) return true;
      return permissions.includes(permission);
    },
    [permissions],
  );

  const hasRole = useCallback(
    (role: string) => {
      if (!role) return true;
      return roles.includes(role);
    },
    [roles],
  );

  const hasAnyPermission = useCallback(
    (permissionList: string[]) => {
      if (!permissionList || permissionList.length === 0) return true;
      return permissionList.some((p) => permissions.includes(p));
    },
    [permissions],
  );

  const hasAllPermissions = useCallback(
    (permissionList: string[]) => {
      if (!permissionList || permissionList.length === 0) return true;
      return permissionList.every((p) => permissions.includes(p));
    },
    [permissions],
  );

  return {
    permissions,
    roles,
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin: roles.includes('admin') || roles.includes('super_admin'),
  };
}
