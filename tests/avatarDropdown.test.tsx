import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { history, request, useModel } from '@umijs/max';
import { message } from 'antd';
import { AvatarDropdown } from '@/components/RightContent/AvatarDropdown';
import { logout } from '@/services/web/login';
import { redirectToLogin } from '@/utils/LoginRedirect';
import Notify from '@/utils/NotifyUtils';
import { cacheRoutes } from '@/utils/RouteUtils';
import { Tenant, Token, User } from '@/utils/Web';

jest.mock('@umijs/max', () => ({
  useModel: jest.fn(),
  request: jest.fn(),
  history: { push: jest.fn() },
}));
jest.mock('umi', () => ({ history: { location: { pathname: '/' } } }));
jest.mock('@/services/web/login', () => ({ logout: jest.fn() }));
jest.mock('@/utils/LoginRedirect', () => ({ redirectToLogin: jest.fn() }));
jest.mock('@/utils/RouteUtils', () => ({ cacheRoutes: jest.fn() }));

const cleanCache = jest.fn();
const setInitialState = jest.fn();
const user = { id: '1', nickname: '管理员' };

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  Token.set('session-token');
  Tenant.set('tenant-1');
  User.set(JSON.stringify(user));
  Notify.setCleanCache(cleanCache);
  jest.mocked(useModel).mockImplementation(((
    _name: string,
    selector: (model: unknown) => unknown,
  ) =>
    selector({
      initialState: { user },
      setInitialState,
    })) as never);
  jest.mocked(redirectToLogin).mockResolvedValue(undefined);
  window.history.replaceState(
    null,
    '',
    '/guardfind/im?redirect=%2Fsystem%2Fuser',
  );
});

function openMenu() {
  render(
    <AvatarDropdown menu>
      <span>管理员头像</span>
    </AvatarDropdown>,
  );
  fireEvent.click(screen.getByRole('button', { name: '用户菜单' }));
}

test('click opens the user menu even when only a nickname is present, and profile navigates', async () => {
  openMenu();
  expect(await screen.findByRole('menu')).toBeTruthy();
  expect(
    screen
      .getByRole('button', { name: '用户菜单' })
      .getAttribute('aria-expanded'),
  ).toBe('true');
  fireEvent.click(screen.getByText('个人中心'));
  expect(history.push).toHaveBeenCalledWith('/user/profile');
  expect(logout).not.toHaveBeenCalled();
});

test('logout sends credentials before clearing the session, locks repeated clicks and redirects despite a redirect query', async () => {
  let finish!: () => void;
  jest.mocked(logout).mockImplementation(() => {
    expect(Token.get()).toBe('session-token');
    expect(Tenant.get()).toBe('tenant-1');
    return new Promise((resolve) => {
      finish = () => resolve({} as never);
    });
  });
  openMenu();
  fireEvent.click(await screen.findByText('退出登录'));
  fireEvent.click(screen.getByRole('button', { name: '用户菜单' }));
  expect(logout).toHaveBeenCalledTimes(1);
  expect(
    screen.getByRole('button', { name: '用户菜单' }).hasAttribute('disabled'),
  ).toBe(true);
  expect(Token.get()).toBe('session-token');
  await act(async () => finish());
  expect(Token.get()).toBeNull();
  expect(Tenant.get()).toBeNull();
  expect(User.get()).toBeNull();
  expect(cacheRoutes).toHaveBeenCalledWith([]);
  expect(cleanCache).toHaveBeenCalledTimes(1);
  const update = setInitialState.mock.calls[0][0];
  expect(update({ user, settings: { multiTab: true } })).toEqual({
    user: undefined,
    settings: { multiTab: true },
  });
  expect(redirectToLogin).toHaveBeenCalledWith(
    '/guardfind/im?redirect=%2Fsystem%2Fuser',
  );
});

test('failed server logout still clears local authentication and redirects', async () => {
  const warning = jest
    .spyOn(message, 'warning')
    .mockReturnValue(undefined as never);
  jest.mocked(logout).mockRejectedValueOnce(new Error('Network unavailable'));
  openMenu();
  fireEvent.click(await screen.findByText('退出登录'));
  await waitFor(() => expect(redirectToLogin).toHaveBeenCalledTimes(1));
  expect(Token.get()).toBeNull();
  expect(User.get()).toBeNull();
  expect(Tenant.get()).toBeNull();
  expect(cleanCache).toHaveBeenCalledTimes(1);
  expect(warning).toHaveBeenCalled();
  warning.mockRestore();
});

test('logout uses the backend POST contract with bounded wait and caller-managed errors', async () => {
  const service = jest.requireActual(
    '@/services/web/login',
  ) as typeof import('@/services/web/login');
  jest.mocked(request).mockResolvedValue({ code: '0', success: true });
  await service.logout();
  expect(request).toHaveBeenCalledWith('/auth/logout', {
    method: 'POST',
    silent: true,
    skipErrorHandler: true,
    timeout: 10000,
  });
});
