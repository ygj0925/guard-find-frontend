/**
 * 权限判定的唯一实现。
 *
 * 之前有两份：`src/access.ts`（UMI access 插件用，不支持 `*:*:*`）与
 * `src/hooks/useAccess.ts`（页面实际在用）。两份规则不一致，UI 判定与后端放行
 * 可能出现"看得到点不动 / 点得动看不到"。现在两边都走这里。
 *
 * 后端语义（sa-token）：
 * - `UserInfoResp.permissions` 为权限码集合，超级权限是 `*:*:*`
 * - `UserInfoResp.roles` 为角色编码集合
 * - 权限码本身由 `@CrudRequestMapping` 派生（`<prefix>:list/get/create/update/delete/export`）
 *   加 `@SaCheckPermission` 显式声明，权威清单见 `src/config/permissionCodes.ts`（脚本生成）
 */

export const ALL_PERMISSION = '*:*:*';

/** 后端种子数据里的超级管理员角色编码 */
export const SUPER_ROLES = ['admin', 'super_admin', 'account'];

export interface AccessSubject {
  permissions?: string[];
  roles?: string[];
}

export interface AccessChecker {
  permissions: string[];
  roles: string[];
  isAdmin: boolean;
  hasPermission: (permission?: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role?: string) => boolean;
}

export function createAccessChecker(
  subject: AccessSubject | undefined,
): AccessChecker {
  const permissions = subject?.permissions || [];
  const roles = subject?.roles || [];
  const hasAll = permissions.includes(ALL_PERMISSION);
  const isAdmin = hasAll || roles.some((role) => SUPER_ROLES.includes(role));

  const hasPermission = (permission?: string) => {
    // 未声明权限要求 = 登录即可见（与后端"本人数据接口只校验登录"一致）
    if (!permission) return true;
    return isAdmin || permissions.includes(permission);
  };

  return {
    permissions,
    roles,
    isAdmin,
    hasPermission,
    hasAnyPermission: (list) =>
      !list || list.length === 0 ? true : list.some((p) => hasPermission(p)),
    hasAllPermissions: (list) =>
      !list || list.length === 0 ? true : list.every((p) => hasPermission(p)),
    hasRole: (role) => !role || isAdmin || roles.includes(role),
  };
}
