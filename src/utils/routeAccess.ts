type AuthorizedRoute = import('@/typings').GLOBAL.Router;

const PERSONAL_PATHS = new Set([
  '/',
  '/user/profile',
  '/user/message',
  '/pwdExpired',
  '/exception/403',
  '/exception/404',
  '/exception/500',
]);

const normalizePath = (path: string) =>
  `/${path.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '')}`;

/** Hidden menus still grant access; directories and external links do not grant pages. */
export function canAccessRoute(
  pathname: string,
  routes: AuthorizedRoute[],
): boolean {
  const path = normalizePath(pathname);
  if (PERSONAL_PATHS.has(path)) return true;
  return routes.some((route) => {
    if (route.type === 2 && !route.isExternal) {
      const componentPath = route.component
        ?.replace(/^\/?(?:src\/)?pages\//, '')
        .replace(/\.(tsx?|jsx?)$/, '')
        .replace(/\/index$/, '');
      if (
        (route.path && normalizePath(route.path) === path) ||
        (componentPath && normalizePath(componentPath) === path)
      )
        return true;
    }
    return Boolean(route.children && canAccessRoute(path, route.children));
  });
}
