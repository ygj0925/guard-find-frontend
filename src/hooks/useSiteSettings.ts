import { useSyncExternalStore } from 'react';
import { getSiteSettings, subscribeSiteSettings } from '@/utils/siteSettings';

/** 让登录页、导航和页脚使用同一份实时站点配置。 */
export default function useSiteSettings() {
  return useSyncExternalStore(
    subscribeSiteSettings,
    getSiteSettings,
    getSiteSettings,
  );
}
