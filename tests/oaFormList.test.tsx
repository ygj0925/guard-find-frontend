import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { history } from '@umijs/max';
import FormListPage from '@/pages/oa/form';
import {
  createOaForm,
  publishOaForm,
  queryOaForms,
  queryOaFormVersions,
} from '@/services/web/guardfind/oa';

jest.mock('@umijs/max', () => ({
  history: { push: jest.fn() },
}));

jest.mock('@/hooks/useAccess', () => ({
  useAccess: () => ({
    permissions: [],
    roles: [],
    isAdmin: true,
    hasPermission: () => true,
    hasRole: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
  }),
}));

jest.mock('@/services/web/guardfind/oa', () => ({
  createOaForm: jest.fn(),
  disableOaForm: jest.fn(),
  publishOaForm: jest.fn(),
  queryOaForms: jest.fn(),
  queryOaFormVersions: jest.fn(),
}));

const form = {
  id: 5,
  formKey: 'leave_form',
  name: '请假申请单',
  description: '员工请假',
  status: 'PUBLISHED',
  currentVersion: 2,
  currentVersionId: 31,
  schemaJson: null,
  schemaDigest: 'digest',
  version: 4,
  createTime: '2026-11-01 10:00:00',
  updateTime: '2026-11-06 09:00:00',
};

const version = {
  id: 31,
  version: 2,
  schemaDigest: 'abcdef0123456789abcdef0123456789',
  fieldCount: 6,
  publishedBy: 1,
  publishTime: '2026-11-05 18:00:00',
};

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('表单列表页', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryOaForms).mockResolvedValue({
      data: { list: [form], total: 1 },
    } as any);
    jest.mocked(createOaForm).mockResolvedValue({
      data: { ...form, id: 6, formKey: 'expense_form', name: '报销申请单' },
    } as any);
    jest.mocked(publishOaForm).mockResolvedValue({
      data: {
        valid: true,
        errors: [],
        versionId: 32,
        version: 3,
        schemaDigest: 'digest',
        fieldCount: 6,
      },
    } as any);
    jest.mocked(queryOaFormVersions).mockResolvedValue({
      data: [version],
    } as any);
  });

  it('加载并展示表单与发布状态', async () => {
    render(<FormListPage />);
    expect(await screen.findByText('请假申请单')).toBeTruthy();
    expect(screen.getByText('leave_form')).toBeTruthy();
    expect(screen.getByText('已发布')).toBeTruthy();
    expect(screen.getByText('v2')).toBeTruthy();
    expect(queryOaForms).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, size: 20 }),
    );
  });

  it('新建表单后进入设计器', async () => {
    render(<FormListPage />);
    await screen.findByText('请假申请单');

    fireEvent.click(screen.getByRole('button', { name: /新建表单/ }));
    fireEvent.change(await screen.findByLabelText('表单标识'), {
      target: { value: 'expense_form' },
    });
    fireEvent.change(screen.getByLabelText('名称'), {
      target: { value: '报销申请单' },
    });
    fireEvent.click(screen.getByRole('button', { name: '创建并设计' }));

    await waitFor(() =>
      expect(createOaForm).toHaveBeenCalledWith(
        expect.objectContaining({
          formKey: 'expense_form',
          name: '报销申请单',
        }),
      ),
    );
    expect(history.push).toHaveBeenCalledWith('/oa/form/design?id=6');
  });

  it('发布成功刷新列表', async () => {
    render(<FormListPage />);
    await screen.findByText('请假申请单');

    fireEvent.click(screen.getByRole('button', { name: /发布/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /发.?布/ }));

    await waitFor(() => expect(publishOaForm).toHaveBeenCalledWith(5));
    await waitFor(() => expect(queryOaForms).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('发布表单：请假申请单')).toBeNull();
  });

  it('发布被拒绝时展示服务端错误', async () => {
    jest.mocked(publishOaForm).mockResolvedValue({
      data: {
        valid: false,
        errors: ['表单至少需要一个字段才能发布'],
      },
    } as any);
    render(<FormListPage />);
    await screen.findByText('请假申请单');

    fireEvent.click(screen.getByRole('button', { name: /发布/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /发.?布/ }));

    expect(
      await screen.findByText('表单至少需要一个字段才能发布'),
    ).toBeTruthy();
    expect(screen.getByText('服务端校验未通过')).toBeTruthy();
  });

  it('查看发布版本历史', async () => {
    render(<FormListPage />);
    await screen.findByText('请假申请单');

    fireEvent.click(screen.getByRole('button', { name: /版本/ }));

    await waitFor(() => expect(queryOaFormVersions).toHaveBeenCalledWith(5));
    expect((await screen.findAllByText('字段数')).length).toBeGreaterThan(0);
    expect(screen.getByText(/abcdef0123456789/)).toBeTruthy();

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /填写/ }));
    expect(history.push).toHaveBeenCalledWith('/oa/form/fill?versionId=31');
  });
});
