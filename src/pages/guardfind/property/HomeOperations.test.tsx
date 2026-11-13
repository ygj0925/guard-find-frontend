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
  queryPropertyHome,
  queryPropertyPage,
  savePropertyHome,
} from '@/services/web/guardfind/property';
import HomeOperations from './HomeOperations';
import { HOME_PHONE_MESSAGE } from './homeOperationsModel';

type PropertyHome = import('@/services/web/guardfind/property').PropertyHome;
type PropertyVo = import('@/services/web/guardfind/property').PropertyVo;
type AccessHook = typeof import('@/hooks/useAccess')['useAccess'];
type HomeResponse = Awaited<
  ReturnType<
    typeof import('@/services/web/guardfind/property')['queryPropertyHome']
  >
>;
type PropertyPageResponse = Awaited<
  ReturnType<
    typeof import('@/services/web/guardfind/property')['queryPropertyPage']
  >
>;

jest.mock('@/hooks/useAccess', () => ({ useAccess: jest.fn() }));
jest.mock('@/services/web/guardfind/property', () => ({
  queryPropertyHome: jest.fn(),
  queryPropertyPage: jest.fn(),
  savePropertyHome: jest.fn(async () => ({ data: null })),
}));

const home: PropertyHome = {
  supportPhone: null,
  serviceHours: null,
  banners: [
    {
      id: 'main',
      title: '首页横幅',
      subtitle: '副标题',
      imageUrl: 'https://example.com/banner.jpg',
      targetType: 'activity',
      targetId: 'stay',
      enabled: true,
    },
  ],
  activities: [
    {
      id: 'stay',
      title: '住宿活动',
      description: '活动说明',
      imageUrl: null,
      startsAt: '2026-12-01 09:00:00',
      endsAt: '2026-12-31 18:00:00',
      enabled: true,
      propertyIds: ['1'],
    },
  ],
};
const envelope = <T,>(data: T) => ({
  code: '0',
  msg: 'ok',
  data,
  success: true,
  timestamp: 0,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((success, failure) => {
    resolve = success;
    reject = failure;
  });
  return { promise, resolve, reject };
}
const property = (id: string, title: string) => ({ id, title }) as PropertyVo;
const getComputedStyle = window.getComputedStyle;
beforeAll(() =>
  jest
    .spyOn(window, 'getComputedStyle')
    .mockImplementation((element) => getComputedStyle(element)),
);
afterAll(() => jest.restoreAllMocks());
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(queryPropertyHome).mockReset();
  jest.mocked(queryPropertyPage).mockReset();
  jest.mocked(savePropertyHome).mockReset();
  jest.mocked(useAccess).mockReturnValue({
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasRole: () => true,
  } as unknown as ReturnType<AccessHook>);
  jest.mocked(queryPropertyHome).mockResolvedValue(envelope(home));
  jest
    .mocked(queryPropertyPage)
    .mockResolvedValue(
      envelope({ list: [property('1', '一号公寓')], total: 1 }),
    );
  jest.mocked(savePropertyHome).mockResolvedValue(envelope(undefined));
});

async function openHome() {
  const onClose = jest.fn();
  render(<HomeOperations open onClose={onClose} />);
  await act(async () => {});
  await waitFor(() =>
    expect((screen.getByLabelText('横幅 ID') as HTMLInputElement).value).toBe(
      'main',
    ),
  );
  return onClose;
}
async function choose(label: string, option: string) {
  fireEvent.mouseDown(screen.getByLabelText(label));
  await act(async () => {});
  const matches = screen.getAllByText(option);
  fireEvent.click(matches[matches.length - 1]);
}
const saveButton = () => screen.getByRole('button', { name: /保存首页配置/ });

test('loads the complete configuration, edits fields and dates, pages property choices and saves a full body', async () => {
  jest
    .mocked(queryPropertyPage)
    .mockResolvedValueOnce(
      envelope({ list: [property('1', '一号公寓')], total: 51 }),
    )
    .mockResolvedValueOnce(
      envelope({ list: [property('51', '五十一号公寓')], total: 51 }),
    );
  const onClose = await openHome();
  expect((screen.getByLabelText('运营电话') as HTMLInputElement).value).toBe(
    '',
  );
  expect((screen.getByLabelText('服务时间') as HTMLInputElement).value).toBe(
    '',
  );
  expect(
    (screen.getByPlaceholderText('开始时间（选填）') as HTMLInputElement).value,
  ).toBe(home.activities[0].startsAt);
  fireEvent.change(screen.getByLabelText('运营电话'), {
    target: { value: '+86-021-12345678' },
  });
  fireEvent.change(screen.getByLabelText('服务时间'), {
    target: { value: '工作日 09:00–18:00' },
  });
  fireEvent.change(screen.getByLabelText('横幅标题'), {
    target: { value: '改版横幅' },
  });
  fireEvent.change(screen.getByLabelText('横幅副标题'), {
    target: { value: '新的副标题' },
  });
  fireEvent.change(screen.getByLabelText('横幅图片 URL'), {
    target: { value: 'https://example.com/new.jpg' },
  });
  fireEvent.change(screen.getByLabelText('活动说明'), {
    target: { value: '新活动说明' },
  });
  fireEvent.change(screen.getByLabelText('活动图片 URL'), {
    target: { value: 'https://example.com/activity.jpg' },
  });
  fireEvent.click(screen.getByRole('switch', { name: '启用横幅 1' }));
  fireEvent.click(screen.getByRole('switch', { name: '启用活动 1' }));
  fireEvent.click(screen.getByRole('button', { name: /加载更多房源/ }));
  await waitFor(() =>
    expect(queryPropertyPage).toHaveBeenLastCalledWith({ page: 2, size: 50 }),
  );
  await choose('关联房源', '五十一号公寓（#51）');
  fireEvent.mouseDown(screen.getByLabelText('运营电话'));
  await choose('跳转类型', '单个房源');
  await choose('跳转房源', '五十一号公寓（#51）');
  fireEvent.click(saveButton());
  await waitFor(() =>
    expect(savePropertyHome).toHaveBeenCalledWith({
      supportPhone: '+86-021-12345678',
      serviceHours: '工作日 09:00–18:00',
      banners: [
        {
          ...home.banners[0],
          title: '改版横幅',
          subtitle: '新的副标题',
          imageUrl: 'https://example.com/new.jpg',
          enabled: false,
          targetType: 'property',
          targetId: '51',
        },
      ],
      activities: [
        {
          ...home.activities[0],
          description: '新活动说明',
          imageUrl: 'https://example.com/activity.jpg',
          enabled: false,
          propertyIds: ['1', '51'],
        },
      ],
    }),
  );
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('adds and removes form-list entries and selects an actual activity target', async () => {
  await openHome();
  fireEvent.click(screen.getByRole('button', { name: /新增活动/ }));
  fireEvent.change(screen.getAllByLabelText('活动 ID')[1], {
    target: { value: 'new-stay' },
  });
  fireEvent.change(screen.getAllByLabelText('活动标题')[1], {
    target: { value: '新增住宿' },
  });
  await choose('跳转活动', '新增住宿（new-stay）');
  fireEvent.click(screen.getByRole('button', { name: /新增横幅/ }));
  expect(screen.getAllByLabelText('横幅 ID')).toHaveLength(2);
  fireEvent.click(screen.getAllByRole('button', { name: /删除横幅/ })[1]);
  fireEvent.click(saveButton());
  await waitFor(() =>
    expect(savePropertyHome).toHaveBeenCalledWith(
      expect.objectContaining({
        banners: [{ ...home.banners[0], targetId: 'new-stay' }],
        activities: [
          home.activities[0],
          {
            id: 'new-stay',
            title: '新增住宿',
            description: null,
            imageUrl: null,
            startsAt: null,
            endsAt: null,
            enabled: true,
            propertyIds: [],
          },
        ],
      }),
    ),
  );
});

test('invalid URLs and duplicate IDs prevent saving', async () => {
  await openHome();
  fireEvent.change(screen.getByLabelText('横幅图片 URL'), {
    target: { value: 'https://example.com/bad url' },
  });
  fireEvent.click(saveButton());
  expect(
    await screen.findByText('请输入无空白的 HTTP(S) 图片 URL，最多 1000 字'),
  ).toBeTruthy();
  expect(savePropertyHome).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('横幅图片 URL'), {
    target: { value: '' },
  });
  fireEvent.click(screen.getByRole('button', { name: /新增横幅/ }));
  fireEvent.change(screen.getAllByLabelText('横幅 ID')[1], {
    target: { value: 'main' },
  });
  fireEvent.change(screen.getAllByLabelText('横幅标题')[1], {
    target: { value: '重复 ID' },
  });
  fireEvent.click(saveButton());
  expect(await screen.findByText('横幅 ID 不能重复')).toBeTruthy();
  expect(savePropertyHome).not.toHaveBeenCalled();
});

test('empty server configuration stays empty without invented phone or activities', async () => {
  const empty = {
    supportPhone: null,
    serviceHours: null,
    banners: [],
    activities: [],
  };
  jest.mocked(queryPropertyHome).mockResolvedValue(envelope(empty));
  render(<HomeOperations open onClose={jest.fn()} />);
  await waitFor(() =>
    expect((saveButton() as HTMLButtonElement).disabled).toBe(false),
  );
  fireEvent.click(saveButton());
  await waitFor(() => expect(savePropertyHome).toHaveBeenCalledWith(empty));
});

test('list-only users get a read-only form without save/add/remove controls', async () => {
  jest.mocked(useAccess).mockReturnValue({
    hasPermission: (permission: string) =>
      permission === 'system:property:list',
    hasAnyPermission: (permissions: string[]) =>
      permissions.includes('system:property:list'),
    hasRole: () => false,
  } as unknown as ReturnType<AccessHook>);
  await openHome();
  expect((screen.getByLabelText('运营电话') as HTMLInputElement).disabled).toBe(
    true,
  );
  expect(screen.queryByRole('button', { name: /保存首页配置/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /新增横幅/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /删除活动/ })).toBeNull();
});

test('closing dirty configuration requires confirmation and continuing editing preserves the form', async () => {
  const onClose = await openHome();
  fireEvent.change(screen.getByLabelText('服务时间'), {
    target: { value: '全天' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^关\s*闭$/ }));
  expect(await screen.findAllByText('放弃未保存的首页配置？')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '继续编辑' }));
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /^关\s*闭$/ }));
  fireEvent.click(await screen.findByRole('button', { name: '放弃修改' }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});

test('loading failure disables saving and reload recovers', async () => {
  jest.mocked(queryPropertyHome).mockRejectedValueOnce(new Error('network'));
  render(<HomeOperations open onClose={jest.fn()} />);
  await act(async () => {});
  expect(
    await screen.findByRole('button', { name: '重新加载配置' }),
  ).toBeTruthy();
  expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: '重新加载配置' }));
  await act(async () => {});
  await waitFor(() =>
    expect((screen.getByLabelText('横幅 ID') as HTMLInputElement).value).toBe(
      'main',
    ),
  );
  expect((saveButton() as HTMLButtonElement).disabled).toBe(false);
});

test('property paging failure can retry without blocking or discarding the configuration', async () => {
  jest.mocked(queryPropertyPage).mockRejectedValueOnce(new Error('network'));
  await openHome();
  fireEvent.click(screen.getByRole('button', { name: '重试加载房源' }));
  await waitFor(() =>
    expect(queryPropertyPage).toHaveBeenLastCalledWith({ page: 1, size: 50 }),
  );
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: '重试加载房源' })).toBeNull(),
  );
});

test('pending save blocks duplicate submissions and close, failure keeps edits for retry', async () => {
  let reject!: (error: unknown) => void;
  jest.mocked(savePropertyHome).mockImplementationOnce(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  );
  const error = jest.spyOn(message, 'error');
  const onClose = await openHome();
  fireEvent.change(screen.getByLabelText('服务时间'), {
    target: { value: '全天' },
  });
  fireEvent.click(saveButton());
  fireEvent.click(saveButton());
  await waitFor(() => expect(savePropertyHome).toHaveBeenCalledTimes(1));
  expect(
    (screen.getByRole('button', { name: /^关\s*闭$/ }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  await act(async () => reject({}));
  expect(error).toHaveBeenCalledWith('首页配置保存失败，请重试');
  expect(onClose).not.toHaveBeenCalled();
  expect((screen.getByLabelText('服务时间') as HTMLInputElement).value).toBe(
    '全天',
  );
  fireEvent.click(saveButton());
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});

test.each(['+86 (021) 1234-5678', '123 456', '12345', '1'.repeat(21)])(
  'phone input rejects invalid backend format %s before saving',
  async (value) => {
    await openHome();
    const input = screen.getByLabelText('运营电话') as HTMLInputElement;
    expect(input.maxLength).toBe(20);
    fireEvent.change(input, { target: { value } });
    fireEvent.click(saveButton());
    expect(await screen.findAllByText(HOME_PHONE_MESSAGE)).not.toHaveLength(0);
    expect(savePropertyHome).not.toHaveBeenCalled();
  },
);

test('image URL with credentials is rejected before saving', async () => {
  await openHome();
  fireEvent.change(screen.getByLabelText('活动图片 URL'), {
    target: { value: 'https://user:password@example.com/image.jpg' },
  });
  fireEvent.click(saveButton());
  expect(
    await screen.findByText('请输入无空白的 HTTP(S) 图片 URL，最多 1000 字'),
  ).toBeTruthy();
  expect(savePropertyHome).not.toHaveBeenCalled();
});

test('reopening clears loaded fields, options, totals and paging; a failed page one retries page one', async () => {
  jest
    .mocked(queryPropertyPage)
    .mockResolvedValueOnce(
      envelope({ list: [property('1', '旧一号公寓')], total: 101 }),
    )
    .mockResolvedValueOnce(
      envelope({ list: [property('51', '旧五十一号公寓')], total: 101 }),
    )
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce(
      envelope({ list: [property('2', '新二号公寓')], total: 1 }),
    );
  const nextHome = deferred<HomeResponse>();
  jest
    .mocked(queryPropertyHome)
    .mockResolvedValueOnce(envelope({ ...home, supportPhone: '123456' }))
    .mockReturnValueOnce(nextHome.promise);
  const onClose = jest.fn();
  const view = render(<HomeOperations open onClose={onClose} />);
  await act(async () => {});
  await waitFor(() => expect(screen.getByDisplayValue('123456')).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: /加载更多房源/ }));
  await waitFor(() =>
    expect(screen.getByText(/已加载 2 \/ 101 个房源/)).toBeTruthy(),
  );
  view.rerender(<HomeOperations open={false} onClose={onClose} />);
  view.rerender(<HomeOperations open onClose={onClose} />);
  await act(async () => {});
  await screen.findByRole('button', { name: '重试加载房源' });
  expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByLabelText('运营电话') as HTMLInputElement).disabled).toBe(
    true,
  );
  expect((screen.getByLabelText('运营电话') as HTMLInputElement).value).toBe(
    '',
  );
  expect(screen.queryByLabelText('横幅 ID')).toBeNull();
  expect(screen.getByText(/已加载 0 \/ 0 个房源/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '重试加载房源' }));
  await waitFor(() =>
    expect(queryPropertyPage).toHaveBeenLastCalledWith({ page: 1, size: 50 }),
  );
  await waitFor(() =>
    expect(screen.getByText(/已加载 1 \/ 1 个房源/)).toBeTruthy(),
  );
  await act(async () => nextHome.resolve(envelope(home)));
  expect((saveButton() as HTMLButtonElement).disabled).toBe(false);
  fireEvent.mouseDown(screen.getByLabelText('关联房源'));
  await act(async () => {});
  expect(screen.getAllByText('新二号公寓（#2）').length).toBeGreaterThan(0);
  expect(screen.queryByText('旧一号公寓（#1）')).toBeNull();
  expect(screen.queryByText('旧五十一号公寓（#51）')).toBeNull();
});

test('a failed configuration reload after reopening leaves no old loaded editable configuration', async () => {
  const nextHome = deferred<HomeResponse>();
  jest
    .mocked(queryPropertyHome)
    .mockResolvedValueOnce(envelope(home))
    .mockReturnValueOnce(nextHome.promise);
  const onClose = jest.fn();
  const view = render(<HomeOperations open onClose={onClose} />);
  await act(async () => {});
  await waitFor(() =>
    expect((saveButton() as HTMLButtonElement).disabled).toBe(false),
  );
  view.rerender(<HomeOperations open={false} onClose={onClose} />);
  view.rerender(<HomeOperations open onClose={onClose} />);
  await act(async () => nextHome.reject(new Error('network')));
  await screen.findByRole('button', { name: '重新加载配置' });
  expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByLabelText('服务时间') as HTMLInputElement).disabled).toBe(
    true,
  );
  expect(
    (screen.getByRole('button', { name: /新增横幅/ }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(screen.queryByLabelText('横幅 ID')).toBeNull();
  fireEvent.click(saveButton());
  expect(savePropertyHome).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '重新加载配置' }));
  await act(async () => {});
  await waitFor(() =>
    expect((saveButton() as HTMLButtonElement).disabled).toBe(false),
  );
  expect((screen.getByLabelText('横幅 ID') as HTMLInputElement).value).toBe(
    'main',
  );
});

test.each(['success', 'failure'] as const)(
  'requests from a previous opening cannot backfill or change loading state on stale %s',
  async (result) => {
    const oldHome = deferred<HomeResponse>();
    const oldProperties = deferred<PropertyPageResponse>();
    const nextHome = deferred<HomeResponse>();
    const nextProperties = deferred<PropertyPageResponse>();
    jest
      .mocked(queryPropertyHome)
      .mockReturnValueOnce(oldHome.promise)
      .mockReturnValueOnce(nextHome.promise);
    jest
      .mocked(queryPropertyPage)
      .mockReturnValueOnce(oldProperties.promise)
      .mockReturnValueOnce(nextProperties.promise);
    const error = jest.spyOn(message, 'error');
    const onClose = jest.fn();
    const view = render(<HomeOperations open onClose={onClose} />);
    view.rerender(<HomeOperations open={false} onClose={onClose} />);
    view.rerender(<HomeOperations open onClose={onClose} />);
    await act(async () => {
      if (result === 'success') {
        oldHome.resolve(envelope(home));
        oldProperties.resolve(
          envelope({ list: [property('1', '过期公寓')], total: 51 }),
        );
      } else {
        oldHome.reject(new Error('stale network'));
        oldProperties.reject(new Error('stale network'));
      }
    });
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByLabelText('横幅 ID')).toBeNull();
    expect(screen.getByText(/已加载 0 \/ 0 个房源/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: '重新加载配置' })).toBeNull();
    expect(screen.queryByRole('button', { name: '重试加载房源' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /加载更多房源/ }));
    expect(queryPropertyPage).toHaveBeenCalledTimes(2);
    await act(async () => {
      nextHome.resolve(envelope({ ...home, supportPhone: '654321' }));
      nextProperties.resolve(
        envelope({ list: [property('2', '当前公寓')], total: 1 }),
      );
    });
    expect(screen.getByDisplayValue('654321')).toBeTruthy();
    expect(screen.getByText(/已加载 1 \/ 1 个房源/)).toBeTruthy();
    expect((saveButton() as HTMLButtonElement).disabled).toBe(false);
    expect(error).not.toHaveBeenCalled();
  },
);

test('late successful requests cannot overwrite an already loaded reopened configuration', async () => {
  const oldHome = deferred<HomeResponse>();
  const oldProperties = deferred<PropertyPageResponse>();
  jest
    .mocked(queryPropertyHome)
    .mockReturnValueOnce(oldHome.promise)
    .mockResolvedValueOnce(envelope({ ...home, supportPhone: '654321' }));
  jest
    .mocked(queryPropertyPage)
    .mockReturnValueOnce(oldProperties.promise)
    .mockResolvedValueOnce(
      envelope({ list: [property('2', '当前公寓')], total: 1 }),
    );
  const onClose = jest.fn();
  const view = render(<HomeOperations open onClose={onClose} />);
  view.rerender(<HomeOperations open={false} onClose={onClose} />);
  view.rerender(<HomeOperations open onClose={onClose} />);
  await waitFor(() => expect(screen.getByDisplayValue('654321')).toBeTruthy());
  await act(async () => {
    oldHome.resolve(envelope(home));
    oldProperties.resolve(
      envelope({ list: [property('1', '过期公寓')], total: 51 }),
    );
  });
  expect(screen.getByDisplayValue('654321')).toBeTruthy();
  expect(screen.getByText(/已加载 1 \/ 1 个房源/)).toBeTruthy();
  fireEvent.click(saveButton());
  await waitFor(() =>
    expect(savePropertyHome).toHaveBeenCalledWith({
      ...home,
      supportPhone: '654321',
    }),
  );
});
