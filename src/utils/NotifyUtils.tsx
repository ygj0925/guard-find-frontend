import { Modal } from 'antd';
import { history } from 'umi';
import { cacheRoutes } from './RouteUtils';
import { clearAuthStorage, login_uri, Tenant, Token } from './Web';

let logoutModal: any;
let logoutIdentity: { token: string; tenant: string } | undefined;
let cleanCache: () => void = () => {};

const clearSession = () => {
  clearAuthStorage();
  cacheRoutes([]);
  cleanCache();
  logoutModal = undefined;
  logoutIdentity = undefined;
  Modal.destroyAll();
};

const logoutHandler = () => {
  const { pathname } = history.location;
  clearSession();
  import('./LoginRedirect').then(({ redirectToLogin }) =>
    redirectToLogin(pathname),
  );
};

const Notify = {
  clearSession,
  setCleanCache: (clean: any) => {
    cleanCache = clean;
  },
  logout: (
    expected = { token: Token.get() || '', tenant: Tenant.get() || '' },
  ) => {
    const stillCurrent = () =>
      expected.token === (Token.get() || '') &&
      expected.tenant === (Tenant.get() || '');
    if (!stillCurrent()) return;
    if (
      logoutIdentity &&
      (logoutIdentity.token !== expected.token ||
        logoutIdentity.tenant !== expected.tenant)
    ) {
      logoutModal?.destroy();
      logoutModal = undefined;
    }
    const confirmLogout = () => {
      if (!stillCurrent()) return;
      logoutModal = undefined;
      logoutIdentity = undefined;
      logoutHandler();
    };
    // 未登录页不提示
    if (history.location.pathname === login_uri) {
      return;
    }

    // 如果没有缓存过token - 未登录过.
    if (!Token.get()) {
      // 直接跳转到登录页
      logoutHandler();
      return;
    }

    if (!logoutModal) {
      logoutIdentity = expected;
      Modal.destroyAll();
      logoutModal = Modal.info({
        title: '系统提示',
        content: '登录状态已过期, 请退出重新登录!',
        closable: false,
        keyboard: false,
        okText: '重新登录',
        onOk: confirmLogout,
        onCancel: confirmLogout,
        zIndex: 99999999,
      });
    }
  },
};

export default Notify;
