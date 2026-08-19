import { getUserInfo } from '@/services/web/login';
import { fetchAndCacheRoutes, getCachedFirstPath } from '@/utils/RouteUtils';
import { LoginRedirect, Tenant, Token, User } from '@/utils/Web';

export async function establishAuthSession(token: string, tenantId: string) {
  Token.set(token);
  Tenant.set(tenantId);
  const [userResponse] = await Promise.all([
    getUserInfo(),
    fetchAndCacheRoutes(),
  ]);
  User.set(JSON.stringify(userResponse.data));
  return userResponse.data;
}

export function resolveLoginRedirect(search: string) {
  const queryRedirect = new URLSearchParams(search).get('redirect');
  const target = queryRedirect
    ? decodeURIComponent(queryRedirect)
    : LoginRedirect.get();
  LoginRedirect.clean();
  if (!target || /^https?:\/\//i.test(target))
    return getCachedFirstPath() || '/';
  return target.startsWith('/') ? target : '/';
}
