import React from 'react';
import icons from './icons';
import type { IconProps } from './typings';

export const convertTypeToIconPath = (type: string) => {
  let path = '';

  type
    .replace(/^icon-/, '')
    .split('-')
    .forEach((part) => {
      path = `${path}${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`;
    });

  return `${path}Outlined`;
};

export const resolveIconComponent = (type?: string) => {
  if (!type) return undefined;
  const iconRegistry = icons as Record<string, React.ComponentType<any>>;
  return iconRegistry[type] || iconRegistry[convertTypeToIconPath(type)];
};

const Icon: React.FC<IconProps> = ({ type, ...props }) => {
  const IconType = resolveIconComponent(type);
  return IconType ? <IconType {...props} /> : null;
};

export default Icon;
