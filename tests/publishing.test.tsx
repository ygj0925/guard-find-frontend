type PublishingCapabilities =
  import('@/services/web/guardfind/publishing').PublishingCapabilities;
type PublishingJob =
  import('@/services/web/guardfind/publishing').PublishingJob;

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  AccountEditor,
  JobDrawer,
  PublishingSettings,
} from '@/pages/guardfind/publishing';
import * as api from '@/services/web/guardfind/publishing';

jest.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => children,
  ProTable: () => null,
}));
jest.mock('@/hooks/useAccess', () => ({
  useAccess: () => ({ hasPermission: () => true }),
}));
jest.mock('@/services/web/guardfind/publishing', () => ({
  ...jest.requireActual('@/services/web/guardfind/publishing'),
  queryPublishingJob: jest.fn(),
  actOnPublishingJob: jest.fn(),
  updatePublishingJob: jest.fn(),
  queryPublishingPackage: jest.fn(),
  queryPublishingSettings: jest.fn(),
  updatePublishingSettings: jest.fn(),
  createPublishingAccount: jest.fn(),
  updatePublishingAccount: jest.fn(),
}));
jest.mock('umi', () => ({ request: jest.fn() }));
const job: PublishingJob = {
  id: '101',
  propertyId: '20',
  accountId: '30',
  accountName: '租房运营账号',
  platform: 'XIAOHONGSHU',
  title: '小区整租两居室',
  body: '月租 3000 元，实拍图片。',
  images: ['https://example.com/house.jpg'],
  status: 'DRAFT',
  version: 7,
  createdAt: '2026-11-18 10:00:00',
  updatedAt: '2026-11-18 10:00:00',
  logs: [],
};
const capability: PublishingCapabilities = {
  douyinConfigured: false,
  platforms: [
    {
      code: 'XIAOHONGSHU',
      label: '小红书',
      mode: 'MANUAL',
      reason: '当前使用人工发布',
      maxImages: 9,
      maxTextLength: 1000,
    },
  ],
};
const originalStyle = window.getComputedStyle;
beforeAll(() => {
  jest
    .spyOn(window, 'getComputedStyle')
    .mockImplementation((element) => originalStyle(element));
});
afterAll(() => jest.restoreAllMocks());
beforeEach(() => {
  jest.clearAllMocks();
  (api.queryPublishingJob as jest.Mock).mockResolvedValue({ data: job });
  (api.actOnPublishingJob as jest.Mock).mockResolvedValue({ data: null });
  (api.updatePublishingJob as jest.Mock).mockResolvedValue({ data: null });
  (api.queryPublishingSettings as jest.Mock).mockResolvedValue({
    data: { autoDraft: false, accountIds: [] },
  });
  (api.updatePublishingSettings as jest.Mock).mockResolvedValue({});
});

it('requires explicit approval and sends the loaded version without automatically publishing', async () => {
  render(
    <JobDrawer
      id="101"
      capabilities={capability}
      onClose={() => {}}
      onChanged={() => {}}
    />,
  );
  fireEvent.click(await screen.findByRole('button', { name: '审核通过' }));
  expect(api.actOnPublishingJob).not.toHaveBeenCalled();
  const modal = (await screen.findAllByRole('dialog')).at(-1)!;
  fireEvent.click(within(modal).getByRole('button', { name: '确 认' }));
  await waitFor(() =>
    expect(api.actOnPublishingJob).toHaveBeenCalledWith(
      '101',
      expect.objectContaining({ version: 7, action: 'APPROVE' }),
    ),
  );
});

it('requires changed content to be saved before approval', async () => {
  render(
    <JobDrawer
      id="101"
      capabilities={capability}
      onClose={() => {}}
      onChanged={() => {}}
    />,
  );
  fireEvent.change(await screen.findByLabelText('标题'), {
    target: { value: '修改后的房源标题' },
  });
  expect(
    (screen.getByRole('button', { name: '审核通过' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: '保存修改' }));
  await waitFor(() =>
    expect(api.updatePublishingJob).toHaveBeenCalledWith(
      '101',
      expect.objectContaining({ version: 7, title: '修改后的房源标题' }),
    ),
  );
});

it('does not retry unknown results and requires the published link for manual confirmation', async () => {
  (api.queryPublishingJob as jest.Mock).mockResolvedValue({
    data: { ...job, status: 'UNKNOWN' },
  });
  render(
    <JobDrawer
      id="101"
      capabilities={capability}
      onClose={() => {}}
      onChanged={() => {}}
    />,
  );
  const register = await screen.findByRole('button', { name: '登记已发布' });
  expect(screen.queryByRole('button', { name: '重试任务' })).toBeNull();
  fireEvent.click(register);
  const modal = (await screen.findAllByRole('dialog')).at(-1)!;
  fireEvent.click(within(modal).getByRole('button', { name: '确 认' }));
  await screen.findByText('请填写发布结果链接');
  expect(api.actOnPublishingJob).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('已公开发布的作品链接'), {
    target: { value: 'https://www.xiaohongshu.com/explore/abc' },
  });
  fireEvent.change(screen.getByLabelText('处理说明'), {
    target: { value: '已到平台核实公开展示' },
  });
  fireEvent.click(within(modal).getByRole('button', { name: '确 认' }));
  await waitFor(() =>
    expect(api.actOnPublishingJob).toHaveBeenCalledWith(
      '101',
      expect.objectContaining({
        action: 'CONFIRM_PUBLISHED',
        resultUrl: 'https://www.xiaohongshu.com/explore/abc',
      }),
    ),
  );
});

it('exports real content without changing publication status', async () => {
  const createUrl = jest.fn(() => 'blob:publishing');
  URL.createObjectURL = createUrl;
  URL.revokeObjectURL = jest.fn();
  const click = jest
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {});
  (api.queryPublishingPackage as jest.Mock).mockResolvedValue({
    data: { filename: '房源素材.md', content: '# 小区整租\n实拍素材' },
  });
  render(
    <JobDrawer
      id="101"
      capabilities={capability}
      onClose={() => {}}
      onChanged={() => {}}
    />,
  );
  fireEvent.click(
    await screen.findByRole('button', { name: '下载文案与素材清单' }),
  );
  await waitFor(() => expect(click).toHaveBeenCalled());
  expect(createUrl).toHaveBeenCalledWith(expect.any(Blob));
  expect(api.actOnPublishingJob).not.toHaveBeenCalled();
  click.mockRestore();
});

it('closes an externally rejected submission only after recording the verified reason', async () => {
  (api.queryPublishingJob as jest.Mock).mockResolvedValue({
    data: { ...job, status: 'SUBMITTED' },
  });
  render(
    <JobDrawer
      id="101"
      capabilities={capability}
      onClose={() => {}}
      onChanged={() => {}}
    />,
  );
  fireEvent.click(
    await screen.findByRole('button', { name: '核实未发布 / 审核未通过' }),
  );
  fireEvent.change(screen.getByLabelText('处理说明'), {
    target: { value: '平台审核未通过，已核实作品未公开' },
  });
  const modal = (await screen.findAllByRole('dialog')).at(-1)!;
  fireEvent.click(within(modal).getByRole('button', { name: '确 认' }));
  await waitFor(() =>
    expect(api.actOnPublishingJob).toHaveBeenCalledWith(
      '101',
      expect.objectContaining({
        version: 7,
        action: 'CONFIRM_NOT_PUBLISHED',
        reason: '平台审核未通过，已核实作品未公开',
      }),
    ),
  );
});

it('does not allow enabling auto drafts without a target account', async () => {
  render(<PublishingSettings accounts={[]} editable />);
  fireEvent.click(await screen.findByRole('switch'));
  fireEvent.click(screen.getByRole('button', { name: '保存设置' }));
  await screen.findByText('启用自动建稿时至少选择一个账号');
  expect(api.updatePublishingSettings).not.toHaveBeenCalled();
});

it('shows manual publication when no automatic platform integration is configured', async () => {
  render(
    <AccountEditor
      account={{
        id: '30',
        name: '测试账号',
        handle: 'test',
        platform: 'DOUYIN',
        mode: 'MANUAL',
        enabled: true,
      }}
      capabilities={capability}
      onClose={() => {}}
      onDone={() => {}}
    />,
  );
  expect(
    await screen.findByText('自动发布接入尚未配置，当前可使用人工发布。'),
  ).toBeTruthy();
  expect(screen.queryByLabelText('已配置的授权编号')).toBeNull();
});
