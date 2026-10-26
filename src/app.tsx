import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import '@ant-design/v5-patch-for-react-19';
import type { RequestConfig } from '@umijs/max';
import type { GLOBAL } from '@/typings';
import { getSessionIdentity, loadAuthorization } from '@/utils/AuthSession';
import { requestConfig } from '@/utils/RequestConfig';
import { cacheRoutes } from '@/utils/RouteUtils';
import {
  applyCachedSiteSettings,
  loadSiteSettings,
} from '@/utils/siteSettings';
import { LayoutSetting, Token, User } from '@/utils/Web';
import settings from '../config/defaultSettings';

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
  // 站点标题/图标：先用上次缓存应用，再静默刷新（失败不影响启动）
  applyCachedSiteSettings();
  void loadSiteSettings();
  if (Token.get()) {
    const identity = getSessionIdentity();
    try {
      is.user = await loadAuthorization();
    } catch {
      if (identity === getSessionIdentity()) {
        Token.clean();
        User.clean();
        cacheRoutes([]);
      }
    }
  } else {
    User.clean();
    cacheRoutes([]);
  }

  return { ...is };
}

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request: RequestConfig = {
  ...requestConfig,
};
