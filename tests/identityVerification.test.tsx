import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import IdentityVerificationPanel from '@/pages/guardfind/leases/IdentityVerificationPanel';
import {
  queryIdentitySettings,
  queryIdentityVerifications,
  updateIdentitySettings,
} from '@/services/web/guardfind/identityVerification';

jest.mock('@/hooks/useAccess', () => ({
  useAccess: () => ({
    hasPermission: (permission: string) =>
      permission === 'system:property:identity:list' ||
      permission === 'system:property:identity:update',
  }),
}));

jest.mock('@/services/web/guardfind/identityVerification', () => ({
  queryIdentitySettings: jest.fn(),
  queryIdentityVerifications: jest.fn(),
  updateIdentitySettings: jest.fn(),
  reviewIdentityVerification: jest.fn(),
  identityProviderLabels: {
    DISABLED: '未启用',
    MANUAL: '人工复核',
    TENCENT: '腾讯云实人认证',
    ALIYUN: '阿里云实人认证',
  },
  identityStatusLabels: {
    UNVERIFIED: '未核验',
    PENDING: '核验中',
    VERIFIED: '已通过',
    FAILED: '核验失败',
    EXPIRED: '已过期',
    REVIEW_REQUIRED: '待人工复核',
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  (queryIdentitySettings as jest.Mock).mockResolvedValue({
    data: {
      enabled: false,
      required: false,
      provider: 'DISABLED',
      verificationTtlDays: 365,
    },
  });
  (queryIdentityVerifications as jest.Mock).mockResolvedValue({
    data: {
      list: [
        {
          id: '1',
          userId: '2',
          userName: '张三',
          role: 'TENANT',
          status: 'REVIEW_REQUIRED',
          maskedIdNumber: '**************1234',
          version: 2,
        },
      ],
      total: 1,
    },
  });
  (updateIdentitySettings as jest.Mock).mockResolvedValue({});
});

it('shows disabled state and only a masked identity number', async () => {
  render(<IdentityVerificationPanel />);
  expect(await screen.findByText(/实名认证当前未启用/)).toBeTruthy();
  expect(screen.getByText('**************1234')).toBeTruthy();
  expect(screen.queryByText('身份证原图')).toBeNull();
});

it('saves the configured verification requirement', async () => {
  render(<IdentityVerificationPanel />);
  await screen.findByText(/实名认证当前未启用/);
  fireEvent.click(screen.getByLabelText('启用实名认证'));
  fireEvent.click(screen.getByLabelText('签署前必须通过核验'));
  fireEvent.click(screen.getByRole('button', { name: '保存实名认证配置' }));
  await waitFor(() =>
    expect(updateIdentitySettings).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        required: true,
        provider: 'DISABLED',
      }),
    ),
  );
});
