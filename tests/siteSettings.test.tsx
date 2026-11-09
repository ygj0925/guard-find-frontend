import { act, renderHook } from '@testing-library/react';
import { request } from 'umi';
import useSiteSettings from '@/hooks/useSiteSettings';
import {
  getSiteSettings,
  loadSiteSettings,
  updateSiteSettingsFromOptions,
} from '@/utils/siteSettings';

type Site = import('@/utils/siteSettings').SiteSettings;
jest.mock('umi', () => ({ request: jest.fn() }));
jest.mock('@/utils/Web', () => ({ get: () => null, set: jest.fn() }));
const clear = () =>
  updateSiteSettingsFromOptions([
    { code: 'SITE_TITLE', value: '' },
    { code: 'SITE_LOGO', value: '' },
    { code: 'SITE_FAVICON', value: '' },
    { code: 'SITE_DESCRIPTION', value: '' },
    { code: 'SITE_COPYRIGHT', value: '' },
    { code: 'SITE_BEIAN', value: '' },
  ]);
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
beforeEach(() => {
  jest.clearAllMocks();
  clear();
  jest.mocked(request).mockResolvedValue({ data: [] });
});

test('server configuration updates subscribers, browser title, description and favicon together', async () => {
  const { result } = renderHook(() => useSiteSettings());
  jest.mocked(request).mockResolvedValueOnce({
    data: [
      { label: 'SITE_TITLE', value: '上海泊之湾公寓' },
      { label: 'SITE_LOGO', value: '/apartment.svg' },
      { label: 'SITE_FAVICON', value: '/apartment.png' },
      { label: 'SITE_DESCRIPTION', value: '公寓管理平台' },
    ],
  });
  await act(async () => {
    await loadSiteSettings();
  });
  expect(result.current.title).toBe('上海泊之湾公寓');
  expect(result.current.logo).toBe('/apartment.svg');
  expect(document.title).toBe('上海泊之湾公寓');
  expect(
    document.querySelector('meta[name="description"]')?.getAttribute('content'),
  ).toBe('公寓管理平台');
  expect(document.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe(
    '/apartment.png',
  );
});

test('empty and missing fields replace stale cache and reset all favicon links', async () => {
  updateSiteSettingsFromOptions([
    { code: 'SITE_LOGO', value: '/old.svg' },
    { code: 'SITE_FAVICON', value: '/old.ico' },
    { code: 'SITE_COPYRIGHT', value: '旧版权' },
    { code: 'SITE_BEIAN', value: '旧备案' },
  ]);
  const shortcut = document.createElement('link');
  shortcut.rel = 'shortcut icon';
  shortcut.type = 'image/x-icon';
  document.head.appendChild(shortcut);
  jest.mocked(request).mockResolvedValueOnce({
    data: [
      { label: 'SITE_TITLE', value: '新名称' },
      { label: 'SITE_FAVICON', value: '' },
      { label: 'SITE_LOGO', value: null },
      { label: 'SITE_COPYRIGHT', value: '' },
    ],
  });
  const site = await loadSiteSettings();
  expect(site.logo).toBe('');
  expect(site.copyright).toBe('');
  expect(site.beian).toBeUndefined();
  for (const link of document.querySelectorAll('link[rel~="icon"]')) {
    expect(link.getAttribute('href')).toBe('/favicon.ico');
    expect(link.hasAttribute('type')).toBe(false);
  }
  shortcut.remove();
});

test('initialization and login reuse one pending public request', async () => {
  const pending = deferred<{ data: [] }>();
  jest.mocked(request).mockReturnValueOnce(pending.promise);
  const first = loadSiteSettings();
  const second = loadSiteSettings();
  expect(first).toBe(second);
  expect(request).toHaveBeenCalledTimes(1);
  pending.resolve({ data: [] });
  await first;
});

test('saving immediately updates existing subscribers and rejects older responses', async () => {
  const pending = deferred<{ data: { label: string; value: string }[] }>();
  jest.mocked(request).mockReturnValueOnce(pending.promise);
  const old = loadSiteSettings();
  const { result } = renderHook(() => useSiteSettings());
  act(() => {
    updateSiteSettingsFromOptions([{ code: 'SITE_TITLE', value: '新名称' }]);
  });
  await act(async () => {
    pending.resolve({ data: [{ label: 'SITE_TITLE', value: '旧名称' }] });
    await old;
  });
  expect(result.current.title).toBe('新名称');
  expect(document.title).toBe('新名称');
});

test('a forced refresh bypasses older pending reads and keeps the newest server result', async () => {
  const pending = deferred<{ data: { label: string; value: string }[] }>();
  jest
    .mocked(request)
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce({
      data: [{ label: 'SITE_TITLE', value: '最新名称' }],
    });
  const old = loadSiteSettings();
  await loadSiteSettings(true);
  pending.resolve({ data: [{ label: 'SITE_TITLE', value: '旧名称' }] });
  await old;
  expect(getSiteSettings().title).toBe('最新名称');
});

test('network failure keeps branding available without blocking startup and later retries recover', async () => {
  updateSiteSettingsFromOptions([{ code: 'SITE_TITLE', value: '已保存名称' }]);
  jest.mocked(request).mockRejectedValueOnce(new Error('offline'));
  expect((await loadSiteSettings()).title).toBe('已保存名称');
  jest.mocked(request).mockResolvedValueOnce({
    data: [{ label: 'SITE_TITLE', value: '重试成功' }],
  });
  expect((await loadSiteSettings()).title).toBe('重试成功');
});

test('storage failures do not prevent reactive updates or document changes', () => {
  const storage = jest.requireMock('@/utils/Web');
  storage.set.mockImplementationOnce(() => {
    throw new Error('storage disabled');
  });
  let site!: Site;
  expect(() => {
    site = updateSiteSettingsFromOptions([
      { code: 'SITE_TITLE', value: '当前名称' },
    ]);
  }).not.toThrow();
  expect(site.title).toBe('当前名称');
  expect(document.title).toBe('当前名称');
});
