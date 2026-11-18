import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { message } from 'antd';
import PropertyForm from '@/pages/guardfind/property/PropertyForm';
import {
  saveProperty,
  uploadPropertyImage,
} from '@/services/web/guardfind/property';

type PropertyVo = import('@/services/web/guardfind/property').PropertyVo;
jest.mock('@/services/web/guardfind/propertyLocation', () => ({
  queryRegions: jest.fn(async () => ({ data: [] })),
  queryRegionSource: jest.fn(async () => ({ data: { version: '2024-12-31' } })),
}));

jest.mock('@/pages/guardfind/components/CustomerSelect', () => ({
  __esModule: true,
  default: ({
    id,
    value,
    onChange,
  }: {
    id?: string;
    value?: string;
    onChange: (value: string) => void;
  }) => (
    <select
      id={id}
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">选择用户</option>
      <option value="123">测试房东</option>
    </select>
  ),
}));
jest.mock('@/services/web/guardfind/property', () => ({
  saveProperty: jest.fn(async () => ({ data: null })),
  uploadPropertyImage: jest.fn(),
}));

const record: PropertyVo = {
  id: '12',
  userId: '3',
  ownerNickname: '房东',
  ownerIsManager: false,
  title: '公寓房源',
  description: null,
  propertyType: 'apartment',
  layout: null,
  areaSqm: 45,
  floorInfo: null,
  orientation: null,
  decoration: null,
  price: 3000,
  priceType: 'rent',
  priceUnit: 'month',
  recommended: false,
  community: null,
  availableFrom: '2026-12-08',
  rentalMode: 'whole',
  address: '上海',
  district: null,
  city: '上海',
  facilities: [],
  contactName: null,
  contactPhone: null,
  status: 1,
  viewCount: 0,
  images: ['https://example.com/apartment.jpg'],
  createTime: '',
};

const getComputedStyle = window.getComputedStyle;
beforeAll(() => {
  jest
    .spyOn(window, 'getComputedStyle')
    .mockImplementation((element) => getComputedStyle(element));
});
afterAll(() => jest.restoreAllMocks());
beforeEach(() => jest.clearAllMocks());

function openForm(value = record) {
  return render(
    <PropertyForm
      open
      record={value}
      onClose={jest.fn()}
      onSaved={jest.fn()}
    />,
  );
}

test('editing shows the calendar date and image thumbnail, previews the image and preserves saved values', async () => {
  openForm();
  expect((screen.getByLabelText('可入住日期') as HTMLInputElement).value).toBe(
    '2026-12-08',
  );
  expect(screen.queryByLabelText('图片链接')).toBeNull();
  expect(screen.queryByText(record.images[0])).toBeNull();
  expect(screen.getByAltText('房源图片 1').getAttribute('src')).toBe(
    record.images[0],
  );
  fireEvent.click(screen.getByTitle('Preview file'));
  await waitFor(() =>
    expect(
      document.querySelector('.ant-image-preview-img')?.getAttribute('src'),
    ).toBe(record.images[0]),
  );
  fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }));
  await waitFor(() =>
    expect(saveProperty).toHaveBeenCalledWith(
      record.id,
      expect.objectContaining({
        availableFrom: '2026-12-08',
        images: record.images,
      }),
    ),
  );
});

test('changing the calendar date sends a date string and removing all images sends an empty list', async () => {
  openForm();
  fireEvent.click(screen.getByLabelText('可入住日期'));
  const day = await screen.findByTitle('2026-12-15');
  fireEvent.click(day);
  fireEvent.click(screen.getByTitle('Remove file'));
  await waitFor(() => expect(screen.queryByTitle('Remove file')).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }));
  await waitFor(() =>
    expect(saveProperty).toHaveBeenCalledWith(
      record.id,
      expect.objectContaining({ availableFrom: '2026-12-15', images: [] }),
    ),
  );
});

test('new image uploads block saving until completion and save the returned URL', async () => {
  let finish!: (value: { data: { url: string } }) => void;
  jest.mocked(uploadPropertyImage).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve as typeof finish;
      }),
  );
  const { container } = openForm();
  const file = new File(['photo'], 'new.png', { type: 'image/png' });
  fireEvent.change(
    container.ownerDocument.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement,
    { target: { files: [file] } },
  );
  await waitFor(() => expect(uploadPropertyImage).toHaveBeenCalledWith(file));
  expect(
    (screen.getByRole('button', { name: /^保\s*存$/ }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  await act(async () =>
    finish({ data: { url: 'https://example.com/new.png' } }),
  );
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: /^保\s*存$/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }));
  await waitFor(() =>
    expect(saveProperty).toHaveBeenCalledWith(
      record.id,
      expect.objectContaining({
        images: [...record.images, 'https://example.com/new.png'],
      }),
    ),
  );
});

test('oversized images are rejected before uploading', async () => {
  const warning = jest.spyOn(message, 'warning');
  openForm();
  const file = new File(['photo'], 'large.png', { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });
  fireEvent.change(
    document.querySelector('input[type="file"]') as HTMLInputElement,
    {
      target: { files: [file] },
    },
  );
  await waitFor(() =>
    expect(warning).toHaveBeenCalledWith('最多9张图片，每张不超过5MB'),
  );
  expect(uploadPropertyImage).not.toHaveBeenCalled();
  warning.mockRestore();
});

function createForm() {
  render(<PropertyForm open onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('房源标题'), {
    target: { value: '泊之湾公寓' },
  });
  fireEvent.change(screen.getByLabelText('月租（元）'), {
    target: { value: '3000' },
  });
  fireEvent.change(screen.getByLabelText('详细地址'), {
    target: { value: '上海市浦东新区公寓101室' },
  });
}

test('admin can create a property without binding a miniapp owner', async () => {
  createForm();
  fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }));
  await waitFor(() =>
    expect(saveProperty).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        title: '泊之湾公寓',
        ownerId: undefined,
        price: 3000,
        images: [],
      }),
    ),
  );
});

test('a searched owner is saved using the selected user ID', async () => {
  createForm();
  fireEvent.change(
    screen.getByRole('combobox', { name: '房东的小程序用户 ID' }),
    { target: { value: '123' } },
  );
  fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }));
  await waitFor(() =>
    expect(saveProperty).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ ownerId: '123' }),
    ),
  );
});
