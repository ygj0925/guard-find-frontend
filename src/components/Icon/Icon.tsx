import React from 'react';
import icons from './icons';
import type { IconProps } from './typings';

// Names used by the original menu seed data. Keep old installations readable
// even before their database normalization migration has been applied.
const legacyNames: Record<string, string> = {
  settings: 'setting',
  'user-management': 'team',
  'mind-mapping': 'apartment',
  bookmark: 'book',
  config: 'setting',
  apps: 'appstore',
  safe: 'safety',
  email: 'mail',
  storage: 'database',
  computer: 'desktop',
  expand: 'fullscreen',
  common: 'appstore',
  'select-all': 'check-square',
  'find-replace': 'search',
  'code-release-managment': 'code',
};

/** Stable picker value shared by previews, selection and navigation. */
export const normalizeIconName = (type?: string | null) => {
  const name = (type ?? '')
    .trim()
    .replace(/^icon-/i, '')
    .replace(/Outlined$/i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
  return Object.hasOwn(legacyNames, name) ? legacyNames[name] : name;
};

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

export const resolveIconComponent = (type?: string | null) => {
  if (!type) return undefined;
  const iconRegistry = icons as Record<string, React.ComponentType<any>>;
  return (
    (Object.hasOwn(iconRegistry, type) ? iconRegistry[type] : undefined) ||
    iconRegistry[convertTypeToIconPath(normalizeIconName(type))]
  );
};

const Icon: React.FC<IconProps> = ({ type, ...props }) => {
  const IconType = resolveIconComponent(type);
  return IconType ? <IconType {...props} /> : null;
};

export default Icon;
