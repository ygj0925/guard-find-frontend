import { Tooltip } from 'antd';
import React from 'react';
import { useAccess } from '@/hooks/useAccess';

interface AccessControlProps {
  /** 需要的权限码，任一命中即可；留空表示仅需登录（与后端"本人数据接口"一致） */
  permission?: string | string[];
  /** 需要的角色编码，任一命中即可 */
  role?: string | string[];
  /**
   * hide（默认）：无权限时不渲染，按钮凭空消失，排查成本高；
   * disable：无权限时渲染禁用态并给出原因，适合放在显眼位置的主操作
   */
  mode?: 'hide' | 'disable';
  /** disable 模式下的提示文案 */
  disabledTip?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const toArray = (value?: string | string[]) =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const AccessControl: React.FC<AccessControlProps> = ({
  permission,
  role,
  mode = 'hide',
  disabledTip = '没有该操作权限',
  children,
  fallback = null,
}) => {
  const { hasAnyPermission, hasRole } = useAccess();

  const permissions = toArray(permission);
  const roles = toArray(role);

  const allowed =
    (permissions.length === 0 || hasAnyPermission(permissions)) &&
    (roles.length === 0 || roles.some((r) => hasRole(r)));

  if (allowed) return <>{children}</>;
  if (mode === 'hide') return <>{fallback}</>;

  return (
    <Tooltip title={disabledTip}>
      <span style={{ display: 'inline-block', cursor: 'not-allowed' }}>
        {React.isValidElement<{ disabled?: boolean }>(children)
          ? React.cloneElement(children, { disabled: true })
          : children}
      </span>
    </Tooltip>
  );
};

export default AccessControl;
