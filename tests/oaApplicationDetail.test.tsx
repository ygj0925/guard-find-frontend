import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { history } from '@umijs/max';
import ApplicationDetailPage from '@/pages/oa/application/detail';
import { getOaApplication } from '@/services/web/guardfind/oa';
import { download } from '@/utils/download';

jest.mock('@umijs/max', () => ({
  useSearchParams: () => [
    new URLSearchParams((globalThis as any).__oaApplicationSearch || ''),
  ],
  history: { push: jest.fn() },
}));

jest.mock('@/services/web/guardfind/oa', () => ({
  getOaApplication: jest.fn(),
}));

jest.mock('@/utils/download', () => ({
  download: jest.fn(),
}));

const schema = {
  version: 1,
  fields: [
    { id: 'f1', key: 'name', label: '姓名', type: 'text' },
    { id: 'f2', key: 'days', label: '天数', type: 'number' },
    {
      id: 'f3',
      key: 'files',
      label: '附件',
      type: 'attachment',
    },
    { id: 'f4', key: 'secret', label: '内部备注', type: 'text', hidden: true },
  ],
};

const detail = {
  id: 70,
  businessType: 'leave_demo',
  businessKey: 'OA-21-20261106180000-ABCDEF12',
  title: '张三的请假申请',
  status: 'RUNNING',
  applicantId: 101,
  applicantName: '张三',
  applicantDeptId: 10,
  applicantDeptName: '研发部',
  releaseId: 21,
  releaseVersion: 2,
  formVersionId: 31,
  formVersion: 1,
  formName: '请假申请单',
  formKey: 'leave_form',
  modelName: '请假审批',
  modelKey: 'leave_demo',
  schemaJson: JSON.stringify(schema),
  formData: {
    name: '张三',
    days: 2,
    files: [{ uid: 'u1', name: '证明.pdf', fileId: 501 }],
    secret: '不应展示',
  },
  processInstanceId: 'inst-1',
  submittedTime: '2026-11-06 18:00:00',
  finishedTime: null,
  createTime: '2026-11-06 18:00:00',
  timeline: [
    {
      action: 'SUBMIT',
      operatorId: 101,
      operatorName: '张三',
      taskId: null,
      reason: null,
      createTime: '2026-11-06 18:00:00',
    },
  ],
};

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('申请详情页', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).__oaApplicationSearch = 'id=70';
    jest.mocked(getOaApplication).mockResolvedValue({ data: detail } as any);
  });

  it('展示申请人、表单快照与审批轨迹', async () => {
    render(<ApplicationDetailPage />);

    expect(await screen.findByText('张三的请假申请')).toBeTruthy();
    expect(getOaApplication).toHaveBeenCalledWith('70');
    expect(screen.getAllByText('张三').length).toBeGreaterThan(0);
    expect(screen.getByText('研发部')).toBeTruthy();
    expect(screen.getAllByText('审批中').length).toBeGreaterThan(0);
    expect(screen.getByText('请假申请单 v1')).toBeTruthy();
    expect(screen.getAllByText('v2').length).toBeGreaterThan(0);
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('证明.pdf')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /证明.pdf/ }));
    await waitFor(() =>
      expect(download).toHaveBeenCalledWith('system/oa/attachment/501', {
        filename: '证明.pdf',
      }),
    );
    expect(screen.queryByText('内部备注')).toBeNull();
    expect(screen.queryByText('不应展示')).toBeNull();
    expect(screen.getByText('提交申请')).toBeTruthy();
    expect(screen.getByText('inst-1')).toBeTruthy();
  });

  it('缺少申请 ID 时提示并从列表进入', async () => {
    (globalThis as any).__oaApplicationSearch = '';
    render(<ApplicationDetailPage />);

    expect(await screen.findByText('加载申请详情失败')).toBeTruthy();
    expect(screen.getByText(/缺少申请 ID/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /返回列表/ }));
    expect(history.push).toHaveBeenCalledWith('/oa/application');
  });
});
