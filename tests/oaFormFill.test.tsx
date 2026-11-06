import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { history } from '@umijs/max';
import FormFillPage from '@/pages/oa/form/fill';
import {
  getOaFormVersion,
  queryOaFormVersionOptions,
} from '@/services/web/guardfind/oa';

jest.mock('@umijs/max', () => ({
  useSearchParams: () => [
    new URLSearchParams((globalThis as any).__oaFillSearch || ''),
  ],
  history: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/services/web/guardfind/oa', () => ({
  getOaFormVersion: jest.fn(),
  queryOaFormVersionOptions: jest.fn(),
}));

const schema = {
  version: 1,
  fields: [
    { id: 'f1', key: 'name', label: '姓名', type: 'text', required: true },
    {
      id: 'f2',
      key: 'applicant',
      label: '申请人',
      type: 'text',
      readonly: true,
    },
    {
      id: 'f3',
      key: 'secret',
      label: '内部备注',
      type: 'textarea',
      hidden: true,
    },
    { id: 'f4', key: 'amount', label: '金额', type: 'number', required: true },
    { id: 'f5', key: 'day', label: '日期', type: 'date' },
    {
      id: 'f6',
      key: 'leaveType',
      label: '请假类型',
      type: 'radio',
      options: [
        { label: '事假', value: 'personal' },
        { label: '病假', value: 'sick' },
      ],
    },
    {
      id: 'f7',
      key: 'tags',
      label: '标签',
      type: 'checkbox',
      options: [{ label: '紧急', value: 'urgent' }],
    },
    { id: 'f8', key: 'files', label: '附件', type: 'attachment' },
    { id: 'f9', key: 'owner', label: '负责人', type: 'person' },
  ],
};

const detail = {
  id: 31,
  formId: 5,
  formKey: 'leave_form',
  name: '请假申请单',
  status: 'PUBLISHED',
  version: 2,
  schemaJson: JSON.stringify(schema),
  schemaDigest: 'abcdef0123456789abcdef0123456789',
  fieldCount: 9,
  publishTime: '2026-11-05 18:00:00',
};

const options = [
  {
    formId: 5,
    formKey: 'leave_form',
    name: '请假申请单',
    versionId: 31,
    version: 2,
  },
  {
    formId: 6,
    formKey: 'expense_form',
    name: '报销申请单',
    versionId: 41,
    version: 1,
  },
];

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('表单填写页', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).__oaFillSearch = 'versionId=31';
    jest.mocked(getOaFormVersion).mockResolvedValue({ data: detail } as any);
    jest.mocked(queryOaFormVersionOptions).mockResolvedValue({
      data: options,
    } as any);
  });

  it('按发布版本渲染可见字段并标注只能本地校验', async () => {
    render(<FormFillPage />);

    expect(await screen.findByText('请假申请单 · v2')).toBeTruthy();
    expect(getOaFormVersion).toHaveBeenCalledWith('31');
    expect(screen.getByText('leave_form · v2')).toBeTruthy();

    expect(screen.getByLabelText('姓名')).toBeTruthy();
    expect(screen.getByLabelText('姓名必填')).toBeTruthy();
    expect((screen.getByLabelText('申请人') as HTMLInputElement).disabled).toBe(
      true,
    );
    expect(screen.getByLabelText('金额')).toBeTruthy();
    expect(screen.getByLabelText('日期')).toBeTruthy();
    expect(screen.getByLabelText('请假类型')).toBeTruthy();
    expect(screen.getByLabelText('标签')).toBeTruthy();
    expect(screen.getByLabelText('负责人')).toBeTruthy();

    expect(screen.queryByLabelText('内部备注')).toBeNull();
    expect(screen.getByText(/另有 1 个隐藏字段未展示/)).toBeTruthy();
    expect(screen.getByText(/本页不会写入申请数据/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /提交/ })).toBeNull();
    expect(screen.getByRole('button', { name: /校验填写/ })).toBeTruthy();
  });

  it('校验必填与格式并跳过隐藏字段', async () => {
    render(<FormFillPage />);
    await screen.findByText('请假申请单 · v2');

    fireEvent.click(screen.getByRole('button', { name: /校验填写/ }));

    expect(await screen.findByText('请填写姓名')).toBeTruthy();
    expect(screen.getByText('请填写金额')).toBeTruthy();
    expect(screen.queryByText('请填写内部备注')).toBeNull();

    fireEvent.change(screen.getByLabelText('姓名'), {
      target: { value: '张三' },
    });
    fireEvent.change(screen.getByLabelText('金额'), {
      target: { value: '120' },
    });
    fireEvent.click(screen.getByRole('button', { name: /校验填写/ }));

    await waitFor(() => expect(screen.queryByText('请填写姓名')).toBeNull());
    expect(screen.queryByText('请填写金额')).toBeNull();
  });

  it('切换发布版本后重新加载 schema', async () => {
    jest.mocked(getOaFormVersion).mockImplementation(
      async (versionId) =>
        ({
          data:
            versionId === '41'
              ? {
                  ...detail,
                  id: 41,
                  formId: 6,
                  formKey: 'expense_form',
                  name: '报销申请单',
                  version: 1,
                  schemaJson: JSON.stringify({
                    version: 1,
                    fields: [
                      {
                        id: 'f1',
                        key: 'total',
                        label: '报销金额',
                        type: 'number',
                        required: true,
                      },
                    ],
                  }),
                  fieldCount: 1,
                }
              : detail,
        }) as any,
    );
    render(<FormFillPage />);
    await screen.findByText('请假申请单 · v2');

    fireEvent.mouseDown(screen.getByRole('combobox'));
    const option = await screen.findByText('报销申请单（expense_form）v1');
    fireEvent.click(option);

    await waitFor(() => expect(getOaFormVersion).toHaveBeenCalledWith('41'));
    expect(history.replace).toHaveBeenCalledWith('/oa/form/fill?versionId=41');
    expect(await screen.findByText('报销申请单 · v1')).toBeTruthy();
    expect(screen.getByLabelText('报销金额必填')).toBeTruthy();
  });

  it('版本加载失败时展示错误且不渲染表单', async () => {
    jest
      .mocked(getOaFormVersion)
      .mockRejectedValue(new Error('表单版本不存在'));
    render(<FormFillPage />);

    expect(await screen.findByText('加载表单版本失败')).toBeTruthy();
    expect(
      screen.getByText(/表单版本不存在。请确认版本属于当前租户且已发布/),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /校验填写/ })).toBeNull();
  });
});
