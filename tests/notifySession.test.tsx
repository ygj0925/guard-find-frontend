import { Modal } from 'antd';
import Notify from '@/utils/NotifyUtils';
import { clearAuthStorage, Tenant, Token } from '@/utils/Web';

jest.mock('antd', () => ({
  Modal: { info: jest.fn(), destroyAll: jest.fn() },
}));
jest.mock('umi', () => ({
  history: { location: { pathname: '/system/user' } },
}));
jest.mock('@/utils/RouteUtils', () => ({ cacheRoutes: jest.fn() }));
jest.mock('@/utils/Web', () => ({
  Token: { get: jest.fn(() => 'a') },
  Tenant: { get: jest.fn(() => '1') },
  clearAuthStorage: jest.fn(),
  login_uri: '/user/login',
}));

it('does not clear a new session when an older expiry dialog is confirmed', () => {
  (Modal.info as jest.Mock).mockReturnValue({ destroy: jest.fn() });
  Notify.logout({ token: 'a', tenant: '1' });
  const dialog = (Modal.info as jest.Mock).mock.calls[0][0];
  (Token.get as jest.Mock).mockReturnValue('b');
  dialog.onOk();
  expect(clearAuthStorage).not.toHaveBeenCalled();
  Notify.logout({ token: 'a', tenant: '1' });
  expect(Modal.info).toHaveBeenCalledTimes(1);
  expect(Tenant.get()).toBe('1');
  Notify.logout({ token: 'b', tenant: '1' });
  expect(Modal.info).toHaveBeenCalledTimes(2);
  dialog.onOk();
  expect(clearAuthStorage).not.toHaveBeenCalled();
});
