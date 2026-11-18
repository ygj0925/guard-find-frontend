import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Form, Input } from 'antd';
import LocationFields from '@/pages/guardfind/property/LocationFields';

jest.mock('@/services/web/guardfind/propertyLocation', () => ({
  queryRegions: jest.fn(async () => ({
    data: [
      {
        code: 110000,
        name: '北京市',
        children: [{ code: 110101, name: '东城区', children: [] }],
      },
    ],
  })),
  queryRegionSource: jest.fn(async () => ({ data: { version: '2024-12-31' } })),
}));
function Page() {
  return (
    <Form>
      <Form.Item name="city" label="城市">
        <Input />
      </Form.Item>
      <Form.Item name="district" label="区县">
        <Input />
      </Form.Item>
      <LocationFields />
    </Form>
  );
}
beforeEach(() => {
  process.env.TENCENT_MAP_KEY = 'test-key';
});
afterEach(() => {
  delete process.env.TENCENT_MAP_KEY;
});
test('official municipality selection keeps city and district distinct', async () => {
  render(<Page />);
  await waitFor(() => expect(screen.getByText(/2024-12-31/)).toBeTruthy());
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(await screen.findByText('北京市'));
  fireEvent.click(await screen.findByText('东城区'));
  expect((screen.getByLabelText('城市') as HTMLInputElement).value).toBe(
    '北京市',
  );
  expect((screen.getByLabelText('区县') as HTMLInputElement).value).toBe(
    '东城区',
  );
});
test('map picker accepts coordinates only from its exact trusted iframe', async () => {
  render(<Page />);
  fireEvent.click(screen.getByText('在地图搜索小区并选点'));
  const frame = (await screen.findByTitle('腾讯地图选点')) as HTMLIFrameElement;
  const data = {
    module: 'locationPicker',
    latlng: { lat: 31.2, lng: 121.5 },
    poiname: '小区南门',
  };
  act(() =>
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://evil.example',
        source: frame.contentWindow,
        data,
      }),
    ),
  );
  expect(
    (screen.getByLabelText('公开位置名称') as HTMLInputElement).value,
  ).toBe('');
  act(() =>
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://apis.map.qq.com',
        source: window,
        data,
      }),
    ),
  );
  expect(
    (screen.getByLabelText('公开位置名称') as HTMLInputElement).value,
  ).toBe('');
  act(() =>
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://apis.map.qq.com',
        source: frame.contentWindow,
        data,
      }),
    ),
  );
  await waitFor(() =>
    expect(
      (screen.getByLabelText('公开位置名称') as HTMLInputElement).value,
    ).toBe('小区南门'),
  );
  expect(
    (screen.getByLabelText('公开位置纬度（GCJ-02）') as HTMLInputElement).value,
  ).toBe('31.2000000');
});
