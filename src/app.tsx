import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import '@ant-design/v5-patch-for-react-19';
import type { RequestConfig } from '@umijs/max';
import { getUserInfo } from '@/services/web/login';
import type { GLOBAL } from '@/typings';
import { requestConfig } from '@/utils/RequestConfig';
import {
  buildClientRoutes,
  fetchAndCacheRoutes,
  getCachedMenuRoutes,
} from '@/utils/RouteUtils';
import { LayoutSetting, Token, User } from '@/utils/Web';
import settings from '../config/defaultSettings';

let userInfoPromise: ReturnType<typeof getUserInfo> | undefined;
let routesPromise: Promise<void> | undefined;

function loadUserInfo() {
  userInfoPromise ??= getUserInfo().catch((error) => {
    userInfoPromise = undefined;
    throw error;
  });
  return userInfoPromise;
}

function loadRoutes() {
  routesPromise ??= fetchAndCacheRoutes().catch((error) => {
    routesPromise = undefined;
    throw error;
  });
  return routesPromise;
}

/**
 * @see https://umijs.org/docs/api/runtime-config#getinitialstate
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  user?: GLOBAL.UserInfo;
  loading?: boolean;
}> {
  const is: GLOBAL.Is = {
    settings: { ...settings, ...LayoutSetting.get() },
  };
  const cache = User.get();

  if (cache) {
    try {
      is.user = JSON.parse(cache);
    } catch {
      User.clean();
    }
  }

  if (Token.get()) {
    try {
      const [response] = await Promise.all([loadUserInfo(), loadRoutes()]);
      is.user = response.data;
      User.set(JSON.stringify(response.data));
    } catch {
      Token.clean();
      User.clean();
      is.user = undefined;
    }
  }

  return { ...is };
}

export function render(oldRender: () => void) {
  if (Token.get()) {
    void loadUserInfo().catch(() => undefined);
    loadRoutes()
      .then(() => oldRender())
      .catch(() => oldRender());
  } else {
    oldRender();
  }
}

export function patchClientRoutes({ routes }: { routes: any[] }) {
  const dynamicClientRoutes = buildClientRoutes(getCachedMenuRoutes());
  if (dynamicClientRoutes.length === 0) return;

  const layoutRoute = routes.find((r: any) => r.path === '/');
  if (layoutRoute) {
    if (!layoutRoute.children) layoutRoute.children = [];
    const catchAllIndex = layoutRoute.children.findIndex(
      (r: any) => r.path === '/*',
    );
    if (catchAllIndex >= 0) {
      layoutRoute.children.splice(catchAllIndex, 0, ...dynamicClientRoutes);
    } else {
      layoutRoute.children.push(...dynamicClientRoutes);
    }
  }
}

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request: RequestConfig = {
  ...requestConfig,
};
