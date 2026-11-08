import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import FormDesignPage from '@/pages/oa/form/design';
import {
  getOaForm,
  publishOaForm,
  updateOaForm,
} from '@/services/web/guardfind/oa';

jest.mock('@umijs/max', () => ({
  useSearchParams: () => [
    new URLSearchParams((globalThis as any).__oaFormSearch || ''),
  ],
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
  disableOaForm: jest.fn(),
  getOaForm: jest.fn(),
  publishOaForm: jest.fn(),
  queryOaFormVersions: jest.fn(),
  updateOaForm: jest.fn(),
}));

const schema = {
  version: 1,
  fields: [
    {
      id: 'field_1',
      key: 'amount',
      label: '金额',
      type: 'number',
      required: true,
    },
  ],
};

const form = {
  id: 5,
  formKey: 'leave_form',
  name: '请假申请单',
  description: '员工请假',
  status: 'DRAFT',
  currentVersion: 0,
  currentVersionId: null,
  schemaJson: JSON.stringify(schema),
  schemaDigest: 'digest',
  version: 2,
  createTime: '2026-11-01 10:00:00',
  updateTime: '2026-11-06 09:00:00',
};

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('表单设计页', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).__oaFormSearch = 'id=5';
    jest.mocked(getOaForm).mockResolvedValue({ data: form } as any);
    jest.mocked(updateOaForm).mockImplementation(
      async (_id, data) =>
        ({
          data: { ...form, ...data, version: form.version + 1 },
        }) as any,
    );
    jest.mocked(publishOaForm).mockResolvedValue({
      data: {
        valid: true,
        errors: [],
        versionId: 41,
        version: 1,
        schemaDigest: 'digest',
        fieldCount: 2,
      },
    } as any);
  });

  it('加载草稿字段与表单信息', async () => {
    render(<FormDesignPage />);
    expect(await screen.findByText(/leave_form · 草稿版本 2/)).toBeTruthy();
    expect(screen.getByText('金额')).toBeTruthy();
    expect(screen.getByText('amount')).toBeTruthy();
    expect(getOaForm).toHaveBeenCalledWith('5');
  });

  it('从字段面板新增单选并保存草稿', async () => {
    render(<FormDesignPage />);
    await screen.findByText(/leave_form · 草稿版本 2/);

    fireEvent.click(screen.getByRole('button', { name: '添加单选' }));
    expect(await screen.findByText('字段属性')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('字段名称'), {
      target: { value: '请假类型' },
    });
    fireEvent.change(screen.getByLabelText('字段 key'), {
      target: { value: 'leave_type' },
    });
    fireEvent.click(screen.getByRole('button', { name: /保存草稿/ }));

    await waitFor(() => expect(updateOaForm).toHaveBeenCalled());
    const [, payload] = jest.mocked(updateOaForm).mock.calls[0];
    expect(payload).toMatchObject({
      name: '请假申请单',
      version: 2,
    });
    const saved = JSON.parse(payload.schemaJson as string);
    expect(saved.fields).toHaveLength(2);
    expect(saved.fields[1]).toMatchObject({
      key: 'leave_type',
      label: '请假类型',
      type: 'radio',
    });
    expect(saved.fields[1].options).toHaveLength(2);
  });

  it('新增明细表并编辑列后保存', async () => {
    render(<FormDesignPage />);
    await screen.findByText(/leave_form · 草稿版本 2/);

    fireEvent.click(screen.getByRole('button', { name: '添加明细表' }));
    expect(await screen.findByText('明细列')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '添加列' }));
    fireEvent.change(screen.getByLabelText('第 3 列名称'), {
      target: { value: '备注' },
    });
    fireEvent.change(screen.getByLabelText('第 3 列 key'), {
      target: { value: 'remark' },
    });
    fireEvent.click(screen.getByLabelText('第 1 列必填'));
    fireEvent.click(screen.getByRole('button', { name: /保存草稿/ }));

    await waitFor(() => expect(updateOaForm).toHaveBeenCalled());
    const [, payload] = jest.mocked(updateOaForm).mock.calls[0];
    const saved = JSON.parse(payload.schemaJson as string);
    expect(saved.fields[1]).toMatchObject({ type: 'table', maxRows: 50 });
    expect(saved.fields[1].columns).toEqual([
      { key: 'item', label: '项目', type: 'text', required: false },
      { key: 'amount', label: '金额', type: 'number', required: false },
      { key: 'remark', label: '备注', type: 'text', required: false },
    ]);
  });

  it('实时预览渲染字段控件', async () => {
    render(<FormDesignPage />);
    await screen.findByText(/leave_form · 草稿版本 2/);

    fireEvent.click(screen.getByText('实时预览'));
    expect(await screen.findByLabelText('金额')).toBeTruthy();
    expect(screen.getByLabelText('金额必填')).toBeTruthy();
  });

  it('发布前先保存未提交修改', async () => {
    render(<FormDesignPage />);
    await screen.findByText(/leave_form · 草稿版本 2/);

    fireEvent.click(screen.getByText('金额'));
    fireEvent.change(screen.getByLabelText('字段名称'), {
      target: { value: '申请金额' },
    });
    fireEvent.click(screen.getByRole('button', { name: /发布/ }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /发.?布/ }));

    await waitFor(() => expect(updateOaForm).toHaveBeenCalled());
    await waitFor(() => expect(publishOaForm).toHaveBeenCalledWith(5));
    expect(
      jest.mocked(publishOaForm).mock.invocationCallOrder[0],
    ).toBeGreaterThan(jest.mocked(updateOaForm).mock.invocationCallOrder[0]);
  });

  it('隐藏字段会清除必填并从预览与校验中移除', async () => {
    render(<FormDesignPage />);
    await screen.findByText(/leave_form · 草稿版本 2/);

    fireEvent.click(screen.getByText('金额'));
    expect(await screen.findByText('字段属性')).toBeTruthy();
    expect(screen.getByLabelText('必填').getAttribute('aria-checked')).toBe(
      'true',
    );

    fireEvent.click(screen.getByLabelText('隐藏'));
    expect(screen.getByLabelText('必填').getAttribute('aria-checked')).toBe(
      'false',
    );
    expect(screen.getByLabelText('隐藏').getAttribute('aria-checked')).toBe(
      'true',
    );

    fireEvent.click(screen.getByText('实时预览'));
    expect(await screen.findByText('所有字段均已隐藏')).toBeTruthy();
    expect(screen.queryByLabelText('金额')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /保存草稿/ }));
    await waitFor(() => expect(updateOaForm).toHaveBeenCalled());
    const [, payload] = jest.mocked(updateOaForm).mock.calls[0];
    const saved = JSON.parse(payload.schemaJson as string);
    expect(saved.fields[0]).toMatchObject({ hidden: true, required: false });
    expect(saved.fields[0].readonly).toBeUndefined();
  });

  it('只读字段清除必填并保留在预览中', async () => {
    render(<FormDesignPage />);
    await screen.findByText(/leave_form · 草稿版本 2/);

    fireEvent.click(screen.getByText('金额'));
    expect(await screen.findByText('字段属性')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('只读'));
    expect(screen.getByLabelText('必填').getAttribute('aria-checked')).toBe(
      'false',
    );

    fireEvent.click(screen.getByText('实时预览'));
    expect(await screen.findByText('（只读）')).toBeTruthy();
    expect((screen.getByLabelText('金额') as HTMLInputElement).disabled).toBe(
      true,
    );

    fireEvent.click(screen.getByRole('button', { name: /保存草稿/ }));
    await waitFor(() => expect(updateOaForm).toHaveBeenCalled());
    const [, payload] = jest.mocked(updateOaForm).mock.calls[0];
    const saved = JSON.parse(payload.schemaJson as string);
    expect(saved.fields[0]).toMatchObject({ readonly: true, required: false });
    expect(saved.fields[0].hidden).toBeUndefined();
  });

  it('发布被拒绝时保留弹窗并展示错误', async () => {
    jest.mocked(publishOaForm).mockResolvedValue({
      data: {
        valid: false,
        errors: ['第 1 个字段至少需要一个选项'],
      },
    } as any);
    render(<FormDesignPage />);
    await screen.findByText(/leave_form · 草稿版本 2/);

    fireEvent.click(screen.getByRole('button', { name: /发布/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /发.?布/ }));

    expect(await screen.findByText('第 1 个字段至少需要一个选项')).toBeTruthy();
    expect(screen.getByText('服务端校验未通过')).toBeTruthy();
  });
});
