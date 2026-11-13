import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { message } from 'antd';
import { useAccess } from '@/hooks/useAccess';
import {
  saveProperty,
  updatePropertyRecommended,
} from '@/services/web/guardfind/property';
import PropertyPage from './index';
import PropertyDetails from './PropertyDetails';
import PropertyForm from './PropertyForm';
import { formatPropertyPrice, getPriceUnit } from './propertyPricing';

type PropertyVo = import('@/services/web/guardfind/property').PropertyVo;
type AccessHook = typeof import('@/hooks/useAccess')['useAccess'];

jest.mock('@/hooks/useAccess', () => ({ useAccess: jest.fn() }));
jest.mock('@/services/web/guardfind/property', () => ({
  saveProperty: jest.fn(async () => ({ data: null })),
  uploadPropertyImage: jest.fn(),
  updatePropertyRecommended: jest.fn(async () => ({ data: null })),
  updatePropertyStatus: jest.fn(),
  deleteProperty: jest.fn(),
  setManager: jest.fn(),
  queryPropertyPage: jest.fn(),
}));
const mockReload = jest.fn();
let mockRow: PropertyVo;
jest.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ProTable: ({
    columns,
    toolBarRender,
    actionRef,
  }: {
    columns: {
      title: string;
      render?: (value: unknown, row: PropertyVo) => React.ReactNode;
    }[];
    toolBarRender: () => React.ReactNode;
    actionRef: React.RefObject<{ reload: () => void }>;
  }) => {
    actionRef.current = { reload: mockReload };
    return (
      <div>
        {toolBarRender()}
        {columns.map((column) => (
          <div key={column.title}>{column.render?.(null, mockRow)}</div>
        ))}
      </div>
    );
  },
}));

const record: PropertyVo = {
  id: '42',
  userId: null,
  ownerNickname: null,
  ownerIsManager: false,
  title: '测试公寓',
  description: null,
  propertyType: 'apartment',
  layout: null,
  areaSqm: null,
  floorInfo: null,
  orientation: null,
  decoration: null,
  price: 200,
  priceType: 'rent',
  priceUnit: 'day',
  rentalMode: 'short',
  recommended: true,
  community: null,
  availableFrom: null,
  address: '测试地址',
  district: null,
  city: null,
  facilities: [],
  contactName: null,
  contactPhone: null,
  status: 2,
  viewCount: 0,
  images: [],
  createTime: '',
};
const getComputedStyle = window.getComputedStyle;
beforeAll(() =>
  jest
    .spyOn(window, 'getComputedStyle')
    .mockImplementation((element) => getComputedStyle(element)),
);
afterAll(() => jest.restoreAllMocks());
beforeEach(() => {
  jest.clearAllMocks();
  mockRow = { ...record };
  jest.mocked(useAccess).mockReturnValue({
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasRole: () => true,
  } as unknown as ReturnType<AccessHook>);
});

async function choose(label: string, option: string) {
  fireEvent.mouseDown(screen.getByLabelText(label));
  fireEvent.click(await screen.findByText(option));
}

test.each(['whole', 'shared', 'room', 'short', null] as const)(
  'rental mode %s follows the fixed unit contract',
  (mode) => {
    expect(getPriceUnit('rent', mode)).toBe(mode === 'short' ? 'day' : 'month');
    expect(getPriceUnit('sale', mode)).toBeNull();
  },
);

test('new rentals start monthly, short stays switch to daily, sale clears mode and unit', async () => {
  render(<PropertyForm open onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('房源标题'), {
    target: { value: '测试房源' },
  });
  fireEvent.change(screen.getByLabelText('详细地址'), {
    target: { value: '测试地址' },
  });
  fireEvent.change(screen.getByLabelText('月租（元）'), {
    target: { value: '200' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }));
  await waitFor(() =>
    expect(saveProperty).toHaveBeenLastCalledWith(
      undefined,
      expect.objectContaining({ priceUnit: 'month', rentalMode: null }),
    ),
  );
  await choose('租赁方式', '民宿短租');
  expect(screen.getByLabelText('日租（元）')).toBeTruthy();
  expect(screen.getByText('元/天')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }));
  await waitFor(() =>
    expect(saveProperty).toHaveBeenLastCalledWith(
      undefined,
      expect.objectContaining({ priceUnit: 'day', rentalMode: 'short' }),
    ),
  );
  await choose('租售', '出售');
  expect(screen.queryByLabelText('租赁方式')).toBeNull();
  expect(screen.getByLabelText('总价（元）')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }));
  await waitFor(() =>
    expect(saveProperty).toHaveBeenLastCalledWith(
      undefined,
      expect.objectContaining({ priceUnit: null, rentalMode: null }),
    ),
  );
  await choose('租售', '出租');
  expect(screen.getByLabelText('月租（元）')).toBeTruthy();
});

test('single rooms save monthly and recommendation is never included in the generic form write', async () => {
  render(
    <PropertyForm
      open
      record={record}
      onClose={jest.fn()}
      onSaved={jest.fn()}
    />,
  );
  await choose('租赁方式', '单间');
  fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }));
  await waitFor(() =>
    expect(saveProperty).toHaveBeenCalledWith(
      record.id,
      expect.objectContaining({ rentalMode: 'room', priceUnit: 'month' }),
    ),
  );
  expect(jest.mocked(saveProperty).mock.calls[0][1]).not.toHaveProperty(
    'recommended',
  );
});

test('details and list use daily prices and display recommendation', () => {
  render(<PropertyDetails record={record} open onClose={jest.fn()} />);
  expect(screen.getByText('¥200/天')).toBeTruthy();
  expect(screen.getByText('民宿短租')).toBeTruthy();
  expect(formatPropertyPrice({ ...record, priceType: 'sale' })).toBe('¥200');
});

test.each([true, false])(
  'list recommendation action toggles %s using status permission and reloads',
  async (recommended) => {
    mockRow.recommended = recommended;
    render(<PropertyPage />);
    expect(screen.getByText('¥200/天')).toBeTruthy();
    expect(screen.getByRole('button', { name: '首页运营' })).toBeTruthy();
    if (recommended) expect(screen.getByText('推荐')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', {
        name: recommended ? '取消推荐' : '设为推荐',
      }),
    );
    await waitFor(() =>
      expect(updatePropertyRecommended).toHaveBeenCalledWith(
        record.id,
        !recommended,
      ),
    );
    await waitFor(() => expect(mockReload).toHaveBeenCalled());
  },
);

test('recommendation fails with feedback, prevents duplicate clicks and does not reload', async () => {
  let reject!: (error: Error) => void;
  jest.mocked(updatePropertyRecommended).mockImplementationOnce(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  );
  const error = jest.spyOn(message, 'error');
  render(<PropertyPage />);
  const button = screen.getByRole('button', { name: '取消推荐' });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(updatePropertyRecommended).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error('network')));
  expect(error).toHaveBeenCalledWith('推荐设置失败，请重试');
  expect(mockReload).not.toHaveBeenCalled();
});

test('list-only users can open home operations but cannot operate recommendation', () => {
  jest.mocked(useAccess).mockReturnValue({
    hasPermission: (permission: string) =>
      permission === 'system:property:list',
    hasAnyPermission: (permissions: string[]) =>
      permissions.includes('system:property:list'),
    hasRole: () => false,
  } as unknown as ReturnType<AccessHook>);
  render(<PropertyPage />);
  expect(screen.getByRole('button', { name: '首页运营' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: '取消推荐' })).toBeNull();
});
