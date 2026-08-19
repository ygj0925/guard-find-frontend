import { socialAuth } from '@/services/web/login';
import { LoginCorp, LoginRedirect } from '@/utils/Web';

function isEnterpriseWechat() {
  return /wxwork/i.test(window.navigator.userAgent);
}

export function isPasswordLoginEnabled() {
  return process.env.loginMode === 'password';
}

function redirectToPasswordLogin(redirect?: string, ssoError = false) {
  const loginUrl = new URL('/user/login', window.location.origin);
  if (redirect && redirect !== '/user/login') {
    loginUrl.searchParams.set('redirect', redirect);
  }
  if (ssoError) loginUrl.searchParams.set('ssoError', '1');
  window.location.replace(loginUrl.toString());
}

export async function redirectToLogin(fullPath?: string) {
  const redirect =
    fullPath || `${window.location.pathname}${window.location.search}`;
  if (redirect && redirect !== '/user/login') LoginRedirect.set(redirect);

  if (isPasswordLoginEnabled()) {
    redirectToPasswordLogin(redirect);
    return;
  }

  try {
    if (!isEnterpriseWechat()) {
      const response = await socialAuth('sso');
      const authorizeUrl = new URL(response.data.authorizeUrl);
      if (redirect) authorizeUrl.searchParams.set('redirect', redirect);
      window.location.replace(authorizeUrl.toString());
      return;
    }

    const corpUrl = new URL('/corp-select', window.location.origin);
    const corp = LoginCorp.get();
    if (corp) corpUrl.searchParams.set('corp', corp);
    if (redirect) corpUrl.searchParams.set('redirect', redirect);
    window.location.replace(corpUrl.toString());
  } catch {
    redirectToPasswordLogin(redirect, true);
  }
}
