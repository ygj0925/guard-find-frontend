import React from 'react';
import { useAccess } from '@/hooks/useAccess';

interface AccessControlProps {
  permission: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AccessControl: React.FC<AccessControlProps> = ({
  permission,
  children,
  fallback = null,
}) => {
  const { hasPermission } = useAccess();

  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasAccess = permissions.some((p) => hasPermission(p));

  return hasAccess ? children : fallback;
};

export default AccessControl;
