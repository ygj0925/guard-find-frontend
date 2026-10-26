import { getUserInfo, router } from '@/services/web/login';
import { loadAuthorization } from '@/utils/AuthSession';
import { createAccessChecker } from '@/utils/access';
import { cacheRoutes } from '@/utils/RouteUtils';
import { canAccessRoute } from '@/utils/routeAccess';
import { Tenant, Token, User } from '@/utils/Web';

type AuthorizedRoute = import('@/typings').GLOBAL.Router;

jest.mock('@/services/web/login', () => ({
  getUserInfo: jest.fn(),
  router: jest.fn(),
}));
jest.mock('@/utils/RouteUtils', () => ({
  cacheRoutes: jest.fn(),
  getCachedFirstPath: jest.fn(),
}));
jest.mock('@/utils/Web', () => ({
  Token: { get: jest.fn(() => 'token') },
  Tenant: { get: jest.fn(() => '1') },
  User: { set: jest.fn() },
  LoginRedirect: { get: jest.fn(), clean: jest.fn() },
}));

const page = (overrides: Partial<AuthorizedRoute> = {}): AuthorizedRoute => ({
  id: 1,
  title: 'Users',
  type: 2,
  path: '/system/user',
  ...overrides,
});

describe('backend permissions are authoritative', () => {
  test.each(['admin', 'account', 'super_admin'])(
    '%s does not imply permissions',
    (role) => {
      const access = createAccessChecker({ roles: [role], permissions: [] });
      expect(access.hasPermission('system:user:delete')).toBe(false);
      expect(access.isAdmin).toBe(false);
    },
  );
  test('exact permission membership and backend wildcard', () => {
    const access = createAccessChecker({ permissions: ['system:user:list'] });
    expect(access.hasPermission('system:user:list')).toBe(true);
    expect(access.hasPermission('system:user:delete')).toBe(false);
    expect(
      access.hasAllPermissions(['system:user:list', 'system:user:delete']),
    ).toBe(false);
    expect(
      access.hasAnyPermission(['system:user:list', 'system:user:delete']),
    ).toBe(true);
    const superAccess = createAccessChecker({ permissions: ['*:*:*'] });
    expect(superAccess.hasPermission('system:user:delete')).toBe(true);
    expect(superAccess.hasRole('some-role')).toBe(false);
    expect(
      createAccessChecker(undefined).hasPermission('system:user:list'),
    ).toBe(false);
  });
});

describe('page access uses the current backend route tree', () => {
  test('hidden authorized pages and canonical components are reachable', () => {
    const routes = [
      page({
        type: 1,
        path: '/system',
        children: [page({ isHidden: true, component: '/system/user/index' })],
      }),
    ];
    expect(canAccessRoute('/system/user/?page=1', routes)).toBe(true);
    expect(
      canAccessRoute('/system/user', [
        page({ path: '/users', component: 'src/pages/system/user/index.tsx' }),
      ]),
    ).toBe(true);
  });
  test.each(['/system/role', '/system/user/secret', '/system'])(
    'does not grant %s by prefix or directory',
    (path) => {
      expect(
        canAccessRoute(path, [
          page({ type: 1, path: '/system', children: [page()] }),
        ]),
      ).toBe(false);
    },
  );
  test('buttons and external links do not grant pages', () => {
    expect(canAccessRoute('/system/user', [page({ type: 3 })])).toBe(false);
    expect(canAccessRoute('/system/user', [page({ isExternal: true })])).toBe(
      false,
    );
  });
  test('empty or revoked routes deny business pages, personal pages remain available', () => {
    expect(canAccessRoute('/system/user', [])).toBe(false);
    expect(canAccessRoute('/user/profile', [])).toBe(true);
    expect(canAccessRoute('/user/message', [])).toBe(true);
    expect(canAccessRoute('/user/profile/secret', [])).toBe(false);
  });
});

describe('authorization refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Token.get as jest.Mock).mockReturnValue('token');
    (Tenant.get as jest.Mock).mockReturnValue('1');
    (getUserInfo as jest.Mock).mockResolvedValue({
      data: { id: 7, permissions: ['system:user:list'] },
    });
    (router as jest.Mock).mockResolvedValue({ data: [page()] });
  });
  test('deduplicates concurrent requests and fetches again after completion', async () => {
    const first = loadAuthorization();
    expect(loadAuthorization()).toBe(first);
    await first;
    (getUserInfo as jest.Mock).mockResolvedValue({
      data: { id: 7, permissions: [] },
    });
    (router as jest.Mock).mockResolvedValue({ data: [] });
    const user = await loadAuthorization();
    expect(getUserInfo).toHaveBeenCalledTimes(2);
    expect(router).toHaveBeenCalledTimes(2);
    expect(user.permissions).toEqual([]);
    expect(cacheRoutes).toHaveBeenLastCalledWith([]);
    expect(User.set).toHaveBeenLastCalledWith(JSON.stringify(user));
  });
  test.each(['token', 'tenant'])(
    'discards responses from a replaced %s',
    async (changed) => {
      let resolveUser!: (value: unknown) => void;
      (getUserInfo as jest.Mock).mockReturnValue(
        new Promise((resolve) => {
          resolveUser = resolve;
        }),
      );
      const pending = loadAuthorization();
      if (changed === 'token')
        (Token.get as jest.Mock).mockReturnValue('new-token');
      else (Tenant.get as jest.Mock).mockReturnValue('2');
      resolveUser({ data: { id: 7, permissions: ['*:*:*'] } });
      await expect(pending).rejects.toThrow();
      expect(cacheRoutes).not.toHaveBeenCalled();
      expect(User.set).not.toHaveBeenCalled();
    },
  );
  test('does not partially update caches when one request fails; retries later', async () => {
    (router as jest.Mock).mockRejectedValueOnce(new Error('network'));
    await expect(loadAuthorization()).rejects.toThrow('network');
    expect(cacheRoutes).not.toHaveBeenCalled();
    expect(User.set).not.toHaveBeenCalled();
    await expect(loadAuthorization()).resolves.toHaveProperty('id', 7);
  });
  test('a mutation refresh fetches a new snapshot after a preceding request finishes', async () => {
    let resolveUser!: (value: unknown) => void;
    (getUserInfo as jest.Mock).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUser = resolve;
      }),
    );
    const preceding = loadAuthorization();
    const refresh = loadAuthorization(true);
    (getUserInfo as jest.Mock).mockResolvedValue({
      data: { id: 7, permissions: [] },
    });
    (router as jest.Mock).mockResolvedValue({ data: [] });
    resolveUser({ data: { id: 7, permissions: ['system:user:list'] } });
    await preceding;
    await expect(refresh).resolves.toEqual({ id: 7, permissions: [] });
    expect(getUserInfo).toHaveBeenCalledTimes(2);
    expect(cacheRoutes).toHaveBeenLastCalledWith([]);
  });
});
