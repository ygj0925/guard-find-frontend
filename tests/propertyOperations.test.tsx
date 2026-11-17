import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReceptionModal from '@/pages/guardfind/property/ReceptionModal';
import SettingsPage from '@/pages/guardfind/settings';
import {
  reception,
  saveReception,
  saveSettings,
  settings,
} from '@/services/web/guardfind/operations';

jest.mock('@/services/web/guardfind/operations', () => ({
  settings: jest.fn(),
  saveSettings: jest.fn(),
  reception: jest.fn(),
  saveReception: jest.fn(),
  availabilityLabels: { ACTIVE: '正常接待', PAUSED: '暂停接待' },
}));
jest.mock('@/hooks/useAccess', () => ({
  useAccess: () => ({ hasPermission: () => true }),
}));
jest.mock('@/pages/guardfind/components/CustomerSelect', () => ({
  __esModule: true,
  default: () => <span>管家选择器</span>,
}));
jest.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children }: any) => <div>{children}</div>,
  ProTable: () => <div>发送记录</div>,
}));
const config = {
  operator: '',
  contact: '',
  policyVersion: '',
  effectiveDate: '',
  policiesPublished: false,
  userAgreement: '',
  privacyPolicy: '',
  subscriptionEnabled: false,
  templateId: '',
  titleField: 'thing1',
  timeField: 'time2',
  statusField: 'phrase3',
  reminderHours: 24,
  expiryHours: 24,
};
const originalGetComputedStyle = window.getComputedStyle;
beforeAll(() => {
  jest
    .spyOn(window, 'getComputedStyle')
    .mockImplementation((element) => originalGetComputedStyle(element));
});
afterAll(() => jest.restoreAllMocks());
beforeEach(() => {
  jest.clearAllMocks();
  (settings as jest.Mock).mockResolvedValue({ data: config });
  (reception as jest.Mock).mockResolvedValue({
    data: { availability: 'ACTIVE', version: 3, activeBookings: 2 },
  });
  (saveSettings as jest.Mock).mockResolvedValue({});
  (saveReception as jest.Mock).mockResolvedValue({});
});
it('preserves unpublished policy and disabled subscriptions when saving the whole form', async () => {
  render(<SettingsPage />);
  await screen.findByText('保存全部配置');
  fireEvent.click(screen.getByText('保存全部配置'));
  await waitFor(() => expect(saveSettings).toHaveBeenCalled());
  expect((saveSettings as jest.Mock).mock.calls[0][0]).toMatchObject({
    subscriptionEnabled: false,
    policiesPublished: false,
    reminderHours: 24,
    expiryHours: 24,
    titleField: 'thing1',
  });
});
it('loads the versioned reception form and warns about active appointments', async () => {
  const close = jest.fn();
  render(<ReceptionModal id="100" onClose={close} />);
  await screen.findByText(/该房源有 2 条进行中的预约/);
  fireEvent.click(screen.getByRole('button', { name: '保存接待信息' }));
  await waitFor(() =>
    expect(saveReception).toHaveBeenCalledWith(
      '100',
      expect.objectContaining({ version: 3, availability: 'ACTIVE' }),
    ),
  );
  expect(close).toHaveBeenCalled();
});
