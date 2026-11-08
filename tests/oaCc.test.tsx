import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { history } from '@umijs/max';
import CcListPage from '@/pages/oa/cc';
import CcDetailPage from '@/pages/oa/cc/detail';
import { getOaCcDetail, queryOaCcPage } from '@/services/web/guardfind/oa';

jest.mock('@umijs/max', () => ({
  useSearchParams: () => [
    new URLSearchParams((globalThis as any).__oaCcSearch || ''),
  ],
  history: { push: jest.fn() },
}));

jest.mock('@/services/web/guardfind/oa', () => ({
  queryOaCcPage: jest.fn(),
  getOaCcDetail: jest.fn(),
}));

jest.mock('@/utils/download', () => ({
  download: jest.fn(),
}));

const ccItem = {
  id: 5,
  applicationId: 70,
  title: '张三的请假申请',
  businessKey: 'OA-21-20261106180000-ABCDEF12',
  applicationStatus: 'RUNNING',
  applicantName: '张三',
  applicantDeptName: '研发部',
  modelName: '请假审批',
  status: 'UNREAD',
  readTime: null,
  createTime: '2026-11-06 18:00:00',
};

const detail = {
  id: 70,
  businessType: 'leave_demo',
  businessKey: 'OA-21-20261106180000-ABCDEF12',
  title: '张三的请假申请',
  status: 'RUNNING',
  applicantId: 101,
  applicantName: '张三',
  applicantDeptName: '研发部',
  releaseVersion: 2,
  formVersion: 1,
  formName: '请假申请单',
  modelName: '请假审批',
  schemaJson: JSON.stringify({
    version: 1,
    fields: [{ id: 'f1', key: 'reason', label: '事由', type: 'text' }],
  }),
  formData: { reason: '家中有事' },
  processInstanceId: 'inst-1',
  submittedTime: '2026-11-06 18:00:00',
  createTime: '2026-11-06 18:00:00',
  ccReceivers: [{ receiverId: '102', receiverName: '李四', status: 'READ' }],
  timeline: [],
};

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('抄送我的', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).__oaCcSearch = 'id=70';
    jest.mocked(queryOaCcPage).mockResolvedValue({
      data: { list: [ccItem], total: 1 },
    } as any);
    jest.mocked(getOaCcDetail).mockResolvedValue({ data: detail } as any);
  });

  it('列表展示抄送记录并进入详情', async () => {
    render(<CcListPage />);

    expect(await screen.findByText('张三的请假申请')).toBeTruthy();
    expect(queryOaCcPage).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, size: 20 }),
    );
    expect(screen.getByText('张三 · 研发部')).toBeTruthy();
    expect(screen.getAllByText('未读').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '查看' }));
    expect(history.push).toHaveBeenCalledWith('/oa/cc/detail?id=70');
  });

  it('详情展示申请快照与抄送人', async () => {
    render(<CcDetailPage />);

    expect(await screen.findAllByText('张三的请假申请')).toBeTruthy();
    await waitFor(() => expect(getOaCcDetail).toHaveBeenCalledWith('70'));
    expect(screen.getByText('家中有事')).toBeTruthy();
    expect(screen.getByText('已读 1/1')).toBeTruthy();
    expect(screen.getByText(/李四 · 已读/)).toBeTruthy();
  });

  it('缺少申请 ID 时提示并返回抄送列表', async () => {
    (globalThis as any).__oaCcSearch = '';
    render(<CcDetailPage />);

    expect(await screen.findByText('加载抄送详情失败')).toBeTruthy();
    expect(getOaCcDetail).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /返回列表/ }));
    expect(history.push).toHaveBeenCalledWith('/oa/cc');
  });
});
