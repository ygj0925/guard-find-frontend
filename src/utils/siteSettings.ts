import { request } from 'umi';
import type { LabelValue } from '@/services/web/crud';
import { get, set } from '@/utils/Web';

/**
 * 站点配置注入（后端 `GET /system/common/dict/option/site`）。
 *
 * 该接口 `@SaIgnore + @TenantIgnore`，登录前也能取，返回 `[{label,value}]`，
 * label 即 `sys_option.code`（种子值：SITE_TITLE / SITE_DESCRIPTION / SITE_COPYRIGHT /
 * SITE_BEIAN / SITE_FAVICON / SITE_LOGO），value 为 null 时后端已回落 defaultValue。
 * 这里负责：写 document.title、换 favicon、给布局提供 logo/版权/备案号，并把结果
 * 缓存在 localStorage 以便首屏不闪默认值。
 */

const SITE_KEY = 'site_settings';

export interface SiteSettings {
  title?: string;
  description?: string;
  copyright?: string;
  beian?: string;
  favicon?: string;
  logo?: string;
}

let cached: SiteSettings | undefined;

export function getSiteSettings(): SiteSettings {
  if (cached) return cached;
  const raw = get(SITE_KEY);
  if (raw) {
    try {
      cached = JSON.parse(raw) as SiteSettings;
      return cached;
    } catch {
      /* 忽略损坏缓存 */
    }
  }
  cached = {};
  return cached;
}

const CODE_MAP: Record<string, keyof SiteSettings> = {
  SITE_TITLE: 'title',
  SITE_DESCRIPTION: 'description',
  SITE_COPYRIGHT: 'copyright',
  SITE_BEIAN: 'beian',
  SITE_FAVICON: 'favicon',
  SITE_LOGO: 'logo',
};

/** 应用到 DOM；失败或未配置时保持 index.html 的默认值 */
function applyToDocument(site: SiteSettings) {
  if (site.title) document.title = site.title;
  if (site.favicon) {
    let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = site.favicon;
  }
}

/** 先用上次缓存应用（避免首屏闪默认标题/图标），再异步刷新 */
export function applyCachedSiteSettings() {
  applyToDocument(getSiteSettings());
}

/**
 * 拉取并注入站点配置。不抛错：站点信息缺失不该阻塞登录页/后台启动。
 */
export async function loadSiteSettings(): Promise<SiteSettings> {
  try {
    const res = await request<{ data?: LabelValue[] }>(
      'system/common/dict/option/site',
      { method: 'GET' },
    );
    const site: SiteSettings = { ...getSiteSettings() };
    for (const item of res?.data || []) {
      const field = CODE_MAP[String(item.label)];
      if (!field) continue;
      const value = item.value == null ? '' : String(item.value);
      if (value) site[field] = value;
    }
    cached = site;
    set(SITE_KEY, JSON.stringify(site));
    applyToDocument(site);
    return site;
  } catch {
    return getSiteSettings();
  }
}

/** 多租户是否开启（`GET /system/common/dict/option/tenant`），决定登录页/请求头是否带租户 */
export async function loadTenantEnabled(): Promise<boolean> {
  try {
    const res = await request<{ data?: boolean }>(
      'system/common/dict/option/tenant',
      { method: 'GET' },
    );
    return res?.data === true;
  } catch {
    return false;
  }
}
