import type { Route } from '@ant-design/pro-layout/lib/typing';
import React from 'react';
import { router } from '@/services/web/login';
import type { GLOBAL } from '@/typings';
import pageMap from '@/utils/pageImports';

export type ExpandRoute = {
  id?: string;
  redirect?: string;
  meta?: Record<string, any>;
  exact?: boolean;
  children?: ExpandRoute[];
  routes?: ExpandRoute[];
  component?: any;
} & Route;

let menuDict: Record<string, ExpandRoute> = {};
let cachedMenuRoutes: ExpandRoute[] = [];
let cachedFirstPath: string | undefined;

const componentAliases: Record<string, string> = {
  'dashboard/workplace/index': 'welcome/Welcome',
  'system/user/index': 'system/user/SysUserPage',
  'system/role/index': 'system/role/SysRolePage',
  'system/menu/index': 'system/menu/SysMenuPage',
  'system/dept/index': 'system/organization/SysOrganizationPage',
  'system/dict/index': 'system/dict/SysDictPage',
  'system/config/index': 'system/config/SysConfigPage',
  'system/notice/index': 'notify/announcement/AnnouncementPage',
  'monitor/log/login/index': 'log/login-log/LoginLogPage',
  'monitor/log/operation/index': 'log/operation-log/OperationLogPage',
  'monitor/log/access/index': 'log/access-log/AccessLogPage',
  'system/i18n/index': 'i18n/I18nDataPage',
};

function getRedirectPath(menu: ExpandRoute): string {
  let redirectPath = menu.path;

  if (menu.children && menu.children.length > 0) {
    const cm = menu.children[0];
    if (!cm.exact) {
      return getRedirectPath(cm as ExpandRoute);
    }
    redirectPath = cm.path || redirectPath;
  }

  return redirectPath || '/';
}

function getFirstUrl(menuArray: ExpandRoute[]): string | undefined {
  for (const menu of menuArray) {
    if (!menu?.hideInMenu) {
      if (menu?.children && menu.children.length > 0 && menu.children[0].path) {
        const url = getFirstUrl(menu.children);
        if (url) return url;
      } else if (menu?.exact) {
        return menu.path;
      }
    }
  }
  return undefined;
}

export function serializationRemoteList(
  list: GLOBAL.Router[],
  _parentId?: string | number,
  _parentPath = '',
): ExpandRoute[] {
  return [...list]
    .filter((item) => item.status !== 0 && item.type !== 3)
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((item) => {
      const rawPath = item.path || '';
      const localPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
      const fullPath = item.isExternal ? rawPath : localPath;
      const children = item.children?.length
        ? serializationRemoteList(item.children, item.id, fullPath)
        : [];
      const isPage = item.type === 2;
      const route: ExpandRoute = {
        id: String(item.id),
        hideInMenu: item.isHidden ?? item.hidden,
        icon: item.icon,
        locale: false,
        path: fullPath,
        name: item.title,
        exact: isPage,
        meta: item,
      };

      if (children.length > 0) {
        route.routes = children;
        route.children = children;
        route.meta = {
          ...item,
          redirectPath: item.redirect || getRedirectPath(route),
        };
      }

      if (isPage) {
        if (item.isExternal) {
          route.target = '_blank';
        } else {
          route.component = item.component || item.uri;
          menuDict[fullPath] = route;
        }
      }

      return route;
    });
}

export async function fetchAndCacheRoutes(): Promise<void> {
  const res = await router();
  const list = res?.data ?? [];
  const arr = Array.isArray(list) ? list : [];
  menuDict = {};
  cachedMenuRoutes = serializationRemoteList(arr);
  cachedFirstPath = getFirstUrl(cachedMenuRoutes);
}

function buildClientPageRoute(route: ExpandRoute): any {
  let LazyComponent: React.LazyExoticComponent<any>;

  if (route.component === '__inline__') {
    LazyComponent = React.lazy(() => import('@/components/Inline'));
  } else {
    const uri = route.component
      ? componentAliases[route.component] || route.component
      : '';
    const loader = pageMap[uri];
    LazyComponent = React.lazy(loader ?? (() => import('@/pages/404')));
  }

  return {
    path: route.path,
    id: `dynamic-${route.id}`,
    element: React.createElement(
      React.Suspense,
      { fallback: React.createElement('div') },
      React.createElement(LazyComponent),
    ),
  };
}

function flattenClientPageRoutes(menuRoutes: ExpandRoute[]): any[] {
  const pageRoutes: any[] = [];
  const registeredPaths = new Set<string>();

  const visit = (routes: ExpandRoute[]) => {
    routes.forEach((route) => {
      if (
        route.exact &&
        route.path &&
        !route.target &&
        !registeredPaths.has(route.path)
      ) {
        registeredPaths.add(route.path);
        pageRoutes.push(buildClientPageRoute(route));
      }

      if (route.children?.length) {
        visit(route.children);
      }
    });
  };

  visit(menuRoutes);
  return pageRoutes;
}

export function buildClientRoutes(menuRoutes: ExpandRoute[]): any[] {
  return [
    ...flattenClientPageRoutes(menuRoutes),
    {
      path: '*',
      element: React.createElement(
        React.Suspense,
        { fallback: React.createElement('div') },
        React.createElement(React.lazy(() => import('@/pages/404'))),
      ),
    },
  ];
}

export function getCachedMenuRoutes(): ExpandRoute[] {
  return cachedMenuRoutes;
}

export function getCachedFirstPath(): string | undefined {
  return cachedFirstPath;
}

export function redirect(arg: string) {
  const path = arg.startsWith('/') ? arg : `/${arg}`;
  window.location.href = `${path}?redirect=${window.location.pathname}`;
}

const RouteUtils = {
  getRedirectPath,
  redirect,
  getMenuDict: () => {
    return menuDict;
  },
};

export default RouteUtils;
