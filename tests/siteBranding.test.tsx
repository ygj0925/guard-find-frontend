import { act, render, screen } from '@testing-library/react';
import BaseLayout from '@/layouts/BaseLayouts';
import { updateSiteSettingsFromOptions } from '@/utils/siteSettings';

jest.mock('umi', () => ({ request: jest.fn() }));
jest.mock('@/utils/Web', () => ({
  get: () => null,
  set: jest.fn(),
  isLogin: () => true,
  LayoutSetting: { set: jest.fn() },
  Tenant: { get: () => '1' },
}));
jest.mock('@umijs/max', () => ({
  useLocation: () => ({ pathname: '/guardfind/im' }),
  useModel: (name: string, selector?: (model: any) => any) => {
    const model =
      name === '@@initialState'
        ? {
            initialState: {
              user: { id: '1' },
              settings: { title: '旧布局名称', logo: '/old-layout.svg' },
            },
            setInitialState: jest.fn(),
          }
        : name === 'unread'
          ? { refreshUnread: jest.fn() }
          : { dynamicRoute: [] };
    return selector ? selector(model) : model;
  },
  history: { replace: jest.fn(), push: jest.fn() },
  Link: ({ children }: any) => <>{children}</>,
  Outlet: () => null,
}));
jest.mock('@ant-design/pro-components', () => ({
  ProLayout: ({ title, logo, footerRender, children }: any) => (
    <div>
      <h1>{title}</h1>
      <img src={logo} alt="导航 LOGO" />
      {footerRender?.()}
      {children}
    </div>
  ),
  SettingDrawer: () => null,
  WaterMark: ({ children }: any) => <>{children}</>,
  DefaultFooter: ({ copyright, links }: any) => (
    <footer>
      {copyright}
      {links.map((item: any) => (
        <span key={item.key}>{item.title}</span>
      ))}
    </footer>
  ),
}));
jest.mock('@/components/ChatFloat', () => () => null);
jest.mock('@/components/Dict/DictProvider', () => ({ children }: any) => (
  <>{children}</>
));
jest.mock('@/components/RightContent/AvatarDropdown', () => ({
  AvatarDropdown: () => null,
}));
jest.mock('@/components/RouteAccess', () => ({ children }: any) => (
  <>{children}</>
));
jest.mock('@/components/RouteTabs', () => () => null);
jest.mock('@/components/UnreadBell', () => () => null);
jest.mock('@/utils/LoginRedirect', () => ({ redirectToLogin: jest.fn() }));
jest.mock('@/utils/RouteUtils', () => ({
  getAuthorizedRoutes: () => [],
  isOfflinePath: () => true,
}));

test('saved branding replaces stale layout settings and changes the mounted navigation and footer immediately', () => {
  updateSiteSettingsFromOptions([
    { code: 'SITE_TITLE', value: '初始名称' },
    { code: 'SITE_LOGO', value: '/first.svg' },
  ]);
  render(<BaseLayout {...({} as any)} />);
  expect(screen.getByRole('heading', { name: '初始名称' })).toBeTruthy();
  expect(screen.getByAltText('导航 LOGO').getAttribute('src')).toBe(
    '/first.svg',
  );
  act(() => {
    updateSiteSettingsFromOptions([
      { code: 'SITE_TITLE', value: '上海泊之湾公寓' },
      { code: 'SITE_LOGO', value: '/new.svg' },
      { code: 'SITE_COPYRIGHT', value: '泊之湾公寓版权所有' },
      { code: 'SITE_BEIAN', value: '沪ICP备123号' },
    ]);
  });
  expect(screen.getByRole('heading', { name: '上海泊之湾公寓' })).toBeTruthy();
  expect(screen.getByAltText('导航 LOGO').getAttribute('src')).toBe('/new.svg');
  expect(screen.getByText('泊之湾公寓版权所有')).toBeTruthy();
  expect(screen.getByText('沪ICP备123号')).toBeTruthy();
});
