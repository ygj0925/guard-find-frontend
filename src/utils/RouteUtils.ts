import type { Route } from '@ant-design/pro-layout/lib/typing';
import { router } from '@/services/web/login';
import type { GLOBAL } from '@/typings';

export type ExpandRoute = {
  id?: string;
  redirect?: string;
  meta?: Record<string, any>;
  exact?: boolean;
  children?: ExpandRoute[];
  routes?: ExpandRoute[];
} & Route;

let menuDict: Record<string, ExpandRoute> = {};
let cachedMenuRoutes: ExpandRoute[] = [];
let cachedFirstPath: string | undefined;

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

export function getCachedMenuRoutes(): ExpandRoute[] {
  return cachedMenuRoutes;
}

export function getCachedFirstPath(): string | undefined {
  return cachedFirstPath;
}

const RouteUtils = {
  getMenuDict: () => {
    return menuDict;
  },
};

export default RouteUtils;
