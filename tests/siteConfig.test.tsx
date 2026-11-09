import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { message } from 'antd';
import { request } from 'umi';
import useSiteSettings from '@/hooks/useSiteSettings';
import SiteConfig from '@/pages/system/config/components/SiteConfig';
import { updateSiteSettingsFromOptions } from '@/utils/siteSettings';

jest.mock('umi', () => ({ request: jest.fn() }));
jest.mock('@/utils/Web', () => ({ get: () => null, set: jest.fn() }));
jest.mock('@/hooks/useAccess', () => ({
  useAccess: () => ({ hasPermission: () => true }),
}));

const codes = [
  'SITE_TITLE',
  'SITE_DESCRIPTION',
  'SITE_COPYRIGHT',
  'SITE_BEIAN',
  'SITE_FAVICON',
  'SITE_LOGO',
];
let rows: { id: number; code: string; value: string; defaultValue: string }[];
beforeEach(() => {
  jest.clearAllMocks();
  rows = codes.map((code, id) => ({
    id: id + 1,
    code,
    value: id === 0 ? '原名称' : '',
    defaultValue: '',
  }));
  updateSiteSettingsFromOptions(rows);
  jest.spyOn(message, 'success').mockReturnValue(undefined as never);
  jest.mocked(request).mockImplementation((async (
    url: string,
    options: any,
  ) => {
    if (url === 'system/option') {
      if (options.method === 'GET') return { data: rows };
      rows = options.data;
      return { success: true };
    }
    return { data: rows.map((row) => ({ label: row.code, value: row.value })) };
  }) as never);
});
afterEach(() => jest.restoreAllMocks());

test('saving site configuration refreshes existing consumers without reloading or logging in again', async () => {
  const { result } = renderHook(() => useSiteSettings());
  render(<SiteConfig />);
  const title = await screen.findByLabelText('系统名称');
  await waitFor(() => expect((title as HTMLInputElement).value).toBe('原名称'));
  fireEvent.change(title, { target: { value: '上海泊之湾公寓' } });
  fireEvent.change(screen.getByLabelText('系统LOGO'), {
    target: { value: '/apartment.svg' },
  });
  fireEvent.change(screen.getByLabelText('系统图标'), {
    target: { value: '/apartment.png' },
  });
  fireEvent.click(screen.getByRole('button', { name: /提\s*交|保\s*存/ }));
  await waitFor(() => expect(message.success).toHaveBeenCalledWith('保存成功'));
  expect(request).toHaveBeenCalledWith(
    'system/option',
    expect.objectContaining({
      method: 'PUT',
      data: expect.arrayContaining([
        { id: 1, code: 'SITE_TITLE', value: '上海泊之湾公寓' },
      ]),
    }),
  );
  expect(result.current.title).toBe('上海泊之湾公寓');
  expect(result.current.logo).toBe('/apartment.svg');
  expect(document.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe(
    '/apartment.png',
  );
});

test('an unsuccessful save never publishes the edited branding', async () => {
  const { result } = renderHook(() => useSiteSettings());
  render(<SiteConfig />);
  const title = await screen.findByLabelText('系统名称');
  await waitFor(() => expect((title as HTMLInputElement).value).toBe('原名称'));
  jest.mocked(request).mockImplementationOnce((async () => {
    throw new Error('保存失败');
  }) as never);
  fireEvent.change(title, { target: { value: '未保存名称' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /提\s*交|保\s*存/ }));
  });
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      'system/option',
      expect.objectContaining({ method: 'PUT' }),
    ),
  );
  expect(result.current.title).toBe('原名称');
  expect(message.success).not.toHaveBeenCalled();
});
