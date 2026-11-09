import { request } from 'umi';
import type { LabelValue } from '@/services/web/crud';
import { get, set } from '@/utils/Web';
import defaultSettings from '../../config/defaultSettings';

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
let pending: Promise<SiteSettings> | undefined;
let revision = 0;
const listeners = new Set<() => void>();

export function subscribeSiteSettings(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSiteSettings(): SiteSettings {
  if (cached) return cached;
  try {
    const raw = get(SITE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        cached = parsed as SiteSettings;
        return cached;
      }
    }
  } catch {
    /* 忽略损坏或不可用的浏览器缓存 */
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

/** 清空字段时也覆盖旧缓存和 DOM，避免恢复旧图标。 */
function applyToDocument(site: SiteSettings) {
  document.title =
    site.title || String(defaultSettings.title || 'Guard Find Backend');
  const links = [
    ...document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']"),
  ];
  if (!links.length) {
    const link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
    links.push(link);
  }
  for (const link of links) {
    link.href = site.favicon || '/favicon.ico';
    link.removeAttribute('type');
    link.removeAttribute('sizes');
  }
  let description = document.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  );
  if (!description) {
    description = document.createElement('meta');
    description.name = 'description';
    document.head.appendChild(description);
  }
  description.content = site.description || '';
}

function publish(site: SiteSettings) {
  cached = site;
  try {
    set(SITE_KEY, JSON.stringify(site));
  } catch {
    // 浏览器禁用持久化存储时，当前页面仍需更新。
  }
  applyToDocument(site);
  listeners.forEach((listener) => {
    listener();
  });
  return site;
}

/** 保存成功后立即同步页面，并使保存之前的请求失效。 */
export function updateSiteSettingsFromOptions(
  options: ReadonlyArray<{ code: string; value?: string | null }>,
) {
  revision++;
  pending = undefined;
  const site = { ...getSiteSettings() };
  for (const option of options) {
    const field = CODE_MAP[option.code];
    if (field) site[field] = option.value == null ? '' : String(option.value);
  }
  return publish(site);
}

/** 先用上次缓存应用（避免首屏闪默认标题/图标），再异步刷新 */
export function applyCachedSiteSettings() {
  applyToDocument(getSiteSettings());
}

/**
 * 拉取并注入站点配置。不抛错：站点信息缺失不该阻塞登录页/后台启动。
 */
export function loadSiteSettings(force = false): Promise<SiteSettings> {
  if (pending && !force) return pending;
  const requestRevision = ++revision;
  pending = (async () => {
    try {
      const res = await request<{ data?: LabelValue[] }>(
        'system/common/dict/option/site',
        { method: 'GET' },
      );
      if (requestRevision !== revision) return getSiteSettings();
      if (!Array.isArray(res?.data)) return getSiteSettings();
      const site: SiteSettings = {};
      for (const item of res.data) {
        const field = CODE_MAP[String(item.label)];
        if (field) site[field] = item.value == null ? '' : String(item.value);
      }
      return publish(site);
    } catch {
      return getSiteSettings();
    } finally {
      if (requestRevision === revision) pending = undefined;
    }
  })();
  return pending;
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
