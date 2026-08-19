import { Modal } from 'antd';
import { history } from 'umi';
import { clearAuthStorage, login_uri, Token } from './Web';

let logoutModal: any;
let cleanCache: any = () => {};

const logoutHandler = () => {
  cleanCache();
  const { pathname } = history.location;
  clearAuthStorage();
  import('./LoginRedirect').then(({ redirectToLogin }) =>
    redirectToLogin(pathname),
  );
  logoutModal = undefined;
  Modal.destroyAll();
};

const Notify = {
  setCleanCache: (clean: any) => {
    cleanCache = clean;
  },
  logout: () => {
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
      Modal.destroyAll();
      logoutModal = Modal.info({
        title: '系统提示',
        content: '登录状态已过期, 请退出重新登录!',
        closable: false,
        keyboard: false,
        okText: '重新登录',
        onOk: () => logoutHandler(),
        onCancel: () => logoutHandler(),
        zIndex: 99999999,
      });
    }
  },
};

export default Notify;
