import { getRouteTabs, syncRouteTabs } from '@/utils/routeTabs';

type CachedRouteTab = import('@/utils/routeTabs').CachedRouteTab;

let mockMenu: Record<string, any> = {};
jest.mock('@/utils/RouteUtils', () => ({
  __esModule: true,
  default: { getMenuDict: () => mockMenu },
}));

beforeEach(() => {
  mockMenu = {
    '/system/user': { name: '用户管理', meta: { isCache: true } },
    '/system/role': { name: '角色管理', meta: { isCache: false } },
    '/system/menu': { name: '菜单管理', meta: {} },
  };
});

const entry = (pathname: string, index = 0): CachedRouteTab => ({
  name: pathname,
  children: 'mounted page',
  index,
  location: { pathname, search: '', hash: '' },
});

test('uses backend titles and only caches pages explicitly marked isCache=true', () => {
  const tabs = getRouteTabs();
  const entries = {
    '/system/user': entry('/system/user'),
    '/system/role': entry('/system/role', 1),
    '/system/menu': entry('/system/menu', 2),
  };
  syncRouteTabs(entries, tabs, entry('/user/profile').location, 'profile');
  expect(entries['/system/user'].name).toBe('用户管理');
  expect(entries['/system/user'].children).toBe('mounted page');
  expect(entries['/system/role'].children).toBeNull();
  expect(entries['/system/menu'].children).toBeNull();
  expect(tabs['/user/profile'].title).toBe('个人中心');
});

test('revoked pages are removed and remaining tab indexes are compacted', () => {
  const entries = {
    '/removed': entry('/removed'),
    '/system/user': entry('/system/user', 1),
  };
  syncRouteTabs(
    entries,
    getRouteTabs(),
    entry('/system/user').location,
    'users',
  );
  expect(entries).not.toHaveProperty('/removed');
  expect(entries['/system/user'].index).toBe(0);
});

test('revisiting an uncached tab mounts the current outlet and retains query and hash', () => {
  const entries = { '/system/role': entry('/system/role') };
  entries['/system/role'].children = null;
  const location = {
    pathname: '/system/role',
    search: '?page=2',
    hash: '#members',
  };
  syncRouteTabs(entries, getRouteTabs(), location, 'new role page');
  expect(entries['/system/role'].children).toBe('new role page');
  expect(entries['/system/role'].location).toEqual(location);
});
