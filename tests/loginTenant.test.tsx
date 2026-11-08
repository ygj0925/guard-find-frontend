import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import AuthLogin from '@/pages/user/login';
import { getImageCaptcha, login } from '@/services/web/login';
import { establishAuthSession } from '@/utils/AuthSession';

jest.mock('@umijs/max', () => ({
  history: { location: { search: '' }, push: jest.fn() },
  useModel: () => ({ setInitialState: jest.fn() }),
}));

jest.mock('@/services/web/login', () => ({
  login: jest.fn(),
  phoneLogin: jest.fn(),
  emailLogin: jest.fn(),
  getImageCaptcha: jest.fn(),
  getSmsCaptcha: jest.fn(),
  getEmailCaptcha: jest.fn(),
}));

jest.mock('@/utils/AuthSession', () => ({
  establishAuthSession: jest.fn(),
  resolveLoginRedirect: () => '/',
}));

jest.mock('@/utils/Encrypt', () => ({
  encryptByRsa: (value: string) => `enc:${value}`,
}));

jest.mock('@/utils/LoginRedirect', () => ({
  isPasswordLoginEnabled: () => true,
  redirectToLogin: jest.fn(),
}));

jest.mock('@/utils/siteSettings', () => ({
  loadSiteSettings: () => Promise.resolve({}),
}));

describe('登录页租户编码', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getImageCaptcha).mockResolvedValue({
      data: { uuid: 'u1', img: '', isEnabled: false },
    } as any);
    jest.mocked(login).mockResolvedValue({
      data: { token: 'tk', tenantId: '9001' },
    } as any);
    jest.mocked(establishAuthSession).mockResolvedValue({} as any);
  });

  const fillAccount = async () => {
    await waitFor(() =>
      expect(screen.queryByPlaceholderText('验证码')).toBeNull(),
    );
    fireEvent.change(screen.getByPlaceholderText('用户名'), {
      target: { value: 'tbadmin' },
    });
    fireEvent.change(screen.getByPlaceholderText('密码'), {
      target: { value: 'secret' },
    });
  };

  it('填写租户编码时随登录请求携带', async () => {
    render(
      <App>
        <AuthLogin />
      </App>,
    );
    fireEvent.change(
      screen.getByPlaceholderText('租户编码（平台账号无需填写）'),
      { target: { value: ' T15Dm ' } },
    );
    await fillAccount();
    fireEvent.click(screen.getByRole('button', { name: /立即登录/ }));

    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    expect(jest.mocked(login).mock.calls[0][1]).toBe('T15Dm');
    await waitFor(() =>
      expect(establishAuthSession).toHaveBeenCalledWith('tk', '9001'),
    );
  });

  it('平台账号不填租户编码时不携带', async () => {
    render(
      <App>
        <AuthLogin />
      </App>,
    );
    await fillAccount();
    fireEvent.click(screen.getByRole('button', { name: /立即登录/ }));

    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    expect(jest.mocked(login).mock.calls[0][1]).toBeUndefined();
  });
});
