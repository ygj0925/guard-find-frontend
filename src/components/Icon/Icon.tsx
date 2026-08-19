import { Spin } from 'antd';
import React from 'react';
import icons from './icons';
import type { IconProps } from './typings';

const convertTypeToIconPath = (type: string) => {
  let path = '';

  type.split('-').forEach((t) => {
    path = `${path}${t.substr(0, 1).toLocaleUpperCase()}${t.substring(1).toLocaleLowerCase()}`;
  });

  return `${path}Outlined`;
};

const Icon: React.FC<IconProps> = (props: IconProps) => {
  const { type } = props;

  // type 值异常
  if (!type || type.length === 0) {
    return null;
  }

  const iconRegistry = icons as unknown as Record<
    string,
    React.ComponentType<any>
  >;
  const IconType =
    iconRegistry[type] || iconRegistry[convertTypeToIconPath(type)];

  return IconType ? (
    <IconType {...props} />
  ) : (
    <Spin spinning size="small" style={{ marginRight: '2px' }} />
  );
};

export default Icon;
