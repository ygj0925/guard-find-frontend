import { Badge } from 'antd';
import React from 'react';
import type { BadgeStatus } from '@/services/web/system';
import { useDictItem } from './useDict';

interface DictBadgeProps {
  dictCode: string;
  value: string | number;
  className?: string;
  style?: React.CSSProperties;
  showText?: boolean;
}

const DictBadge: React.FC<DictBadgeProps> = ({
  dictCode,
  value,
  className,
  style,
  showText = true,
}) => {
  const { dictItem, name, attributes } = useDictItem(dictCode, String(value));

  if (!dictItem) {
    return null;
  }

  const badgeStatus = attributes?.badgeStatus as BadgeStatus;
  const badgeColor = attributes?.badgeColor;

  return (
    <Badge
      status={badgeStatus}
      color={!badgeStatus ? badgeColor : undefined}
      text={showText ? name : undefined}
      className={className}
      style={style}
    />
  );
};

export default DictBadge;
