import { getUserInfo, router } from '@/services/web/login';
import { cacheRoutes, getCachedFirstPath } from '@/utils/RouteUtils';
import { LoginRedirect, Tenant, Token, User } from '@/utils/Web';

let pending:
  | { identity: string; promise: ReturnType<typeof fetchAuthorization> }
  | undefined;

export const getSessionIdentity = () =>
  `${Token.get() || ''}:${Tenant.get() || ''}`;

async function fetchAuthorization(identity: string) {
  const [userResponse, routesResponse] = await Promise.all([
    getUserInfo(),
    router(),
  ]);
  if (identity !== getSessionIdentity()) {
    throw new Error('获取权限期间登录状态已变更');
  }
  cacheRoutes(routesResponse.data || []);
  User.set(JSON.stringify(userResponse.data));
  return userResponse.data;
}

/** Deduplicate concurrent requests only; completed responses must never pin old permissions. */
export function loadAuthorization(
  fresh = false,
): ReturnType<typeof fetchAuthorization> {
  const identity = getSessionIdentity();
  // A mutation must not reuse a snapshot requested before that mutation committed.
  if (fresh && pending?.identity === identity) {
    return pending.promise
      .catch(() => undefined)
      .then(() => {
        if (identity !== getSessionIdentity())
          throw new Error('登录状态已变更');
        return loadAuthorization();
      });
  }
  if (pending?.identity === identity) return pending.promise;
  const promise = fetchAuthorization(identity).finally(() => {
    if (pending?.promise === promise) pending = undefined;
  });
  pending = { identity, promise };
  return promise;
}

export async function establishAuthSession(token: string, tenantId: string) {
  Token.set(token);
  Tenant.set(tenantId);
  return loadAuthorization();
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
