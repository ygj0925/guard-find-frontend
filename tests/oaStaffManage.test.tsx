import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import EmployeePage from '@/pages/oa/employee';
import PositionPage from '@/pages/oa/position';
import {
  createOaEmployee,
  createOaPosition,
  queryOaEmployeeOptions,
  queryOaEmployees,
  queryOaEmployeeUserOptions,
  queryOaPositionOptions,
  queryOaPositions,
  updateOaEmployee,
  updateOaPosition,
} from '@/services/web/guardfind/oa';

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
  createOaEmployee: jest.fn(),
  createOaPosition: jest.fn(),
  queryOaEmployeeOptions: jest.fn(),
  queryOaEmployees: jest.fn(),
  queryOaEmployeeUserOptions: jest.fn(),
  queryOaPositionOptions: jest.fn(),
  queryOaPositions: jest.fn(),
  updateOaEmployee: jest.fn(),
  updateOaPosition: jest.fn(),
}));

const employee = {
  id: 11,
  userId: 1001,
  nickname: '张三',
  username: 'zhangsan',
  deptId: 10,
  deptName: '研发部',
  employeeNo: 'E001',
  supervisorId: 1003,
  supervisorName: '王五',
  employmentStatus: 'ACTIVE',
  deptLeader: true,
  hireDate: '2024-01-05',
  leaveDate: null,
  positions: [
    { id: 1, code: 'FINANCE', name: '财务' },
    { id: 2, code: 'HR', name: '人事' },
  ],
  version: 3,
};

const position = {
  id: 1,
  code: 'FINANCE',
  name: '财务',
  status: 'ENABLED',
  sort: 10,
  employeeCount: 3,
  version: 2,
};

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('员工管理页', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryOaEmployees).mockResolvedValue({
      data: { list: [employee], total: 1 },
    } as any);
    jest.mocked(queryOaEmployeeUserOptions).mockResolvedValue({
      data: [
        {
          userId: 1002,
          nickname: '李四',
          username: 'lisi',
          deptId: 10,
          deptName: '研发部',
          employeeNo: 'E002',
        },
      ],
    } as any);
    jest.mocked(queryOaEmployeeOptions).mockResolvedValue({
      data: [
        {
          userId: 1003,
          nickname: '王五',
          username: 'wangwu',
          deptId: 10,
          deptName: '研发部',
          employeeNo: 'E009',
        },
      ],
    } as any);
    jest.mocked(queryOaPositionOptions).mockResolvedValue({
      data: [{ id: 1, code: 'FINANCE', name: '财务' }],
    } as any);
    jest.mocked(createOaEmployee).mockResolvedValue({
      data: { ...employee, id: 12, userId: 1002, nickname: '李四' },
    } as any);
    jest.mocked(updateOaEmployee).mockResolvedValue({ data: employee } as any);
  });

  it('展示员工档案与岗位标签', async () => {
    render(<EmployeePage />);

    expect(await screen.findByText('张三')).toBeTruthy();
    expect(screen.getByText('zhangsan')).toBeTruthy();
    expect(screen.getByText('研发部')).toBeTruthy();
    expect(screen.getByText('E001')).toBeTruthy();
    expect(screen.getByText('财务')).toBeTruthy();
    expect(screen.getByText('人事')).toBeTruthy();
    expect(screen.getByText('王五')).toBeTruthy();
    expect(screen.getByText('在职')).toBeTruthy();
    expect(screen.getByText('部门负责人')).toBeTruthy();
    expect(queryOaEmployees).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 }),
    );
  });

  it('新建员工时只提交后台账号与本页维护字段', async () => {
    render(<EmployeePage />);
    await screen.findByText('张三');

    fireEvent.click(screen.getByRole('button', { name: /新建员工/ }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.mouseDown(within(dialog).getByLabelText('后台用户'));
    fireEvent.click(await screen.findByText('李四 · 研发部'));
    fireEvent.change(within(dialog).getByLabelText('工号'), {
      target: { value: ' E002 ' },
    });
    fireEvent.mouseDown(within(dialog).getByLabelText('岗位'));
    fireEvent.click(await screen.findByText('财务（FINANCE）'));
    fireEvent.click(within(dialog).getByRole('button', { name: /确\s*定/ }));

    await waitFor(() =>
      expect(createOaEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1002,
          employeeNo: 'E002',
          employmentStatus: 'ACTIVE',
          deptLeader: false,
          positionIds: [1],
        }),
      ),
    );
  });

  it('编辑员工携带版本号且不回传 userId', async () => {
    render(<EmployeePage />);
    await screen.findByText('张三');

    fireEvent.click(screen.getByRole('button', { name: /编辑/ }));
    const dialog = await screen.findByRole('dialog');
    expect(
      (within(dialog).getByLabelText('后台用户') as HTMLInputElement).disabled,
    ).toBe(true);
    expect(within(dialog).getByText('张三 · 研发部')).toBeTruthy();
    expect(within(dialog).queryByText('1001')).toBeNull();

    fireEvent.change(within(dialog).getByLabelText('工号'), {
      target: { value: 'E001X' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /确\s*定/ }));

    await waitFor(() =>
      expect(updateOaEmployee).toHaveBeenCalledWith(
        11,
        expect.objectContaining({
          employeeNo: 'E001X',
          employmentStatus: 'ACTIVE',
          positionIds: [1, 2],
          version: 3,
        }),
      ),
    );
    const [, payload] = jest.mocked(updateOaEmployee).mock.calls[0];
    expect(payload).not.toHaveProperty('userId');
  });

  it('编辑时直属主管已不在职则显示姓名并提示更换', async () => {
    jest.mocked(queryOaEmployeeOptions).mockResolvedValue({ data: [] } as any);
    render(<EmployeePage />);
    await screen.findByText('张三');

    fireEvent.click(screen.getByRole('button', { name: /编辑/ }));
    const dialog = await screen.findByRole('dialog');
    expect(
      await within(dialog).findByText('王五（非在职，请更换）'),
    ).toBeTruthy();
    expect(within(dialog).queryByText('1003')).toBeNull();
  });
});

describe('岗位管理页', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryOaPositions).mockResolvedValue({
      data: { list: [position], total: 1 },
    } as any);
    jest.mocked(createOaPosition).mockResolvedValue({
      data: { ...position, id: 2, code: 'HR', name: '人事' },
    } as any);
    jest.mocked(updateOaPosition).mockResolvedValue({ data: position } as any);
  });

  it('展示岗位编码、人数与状态', async () => {
    render(<PositionPage />);

    expect(await screen.findByText('财务')).toBeTruthy();
    expect(screen.getByText('FINANCE')).toBeTruthy();
    expect(screen.getByText('3 人')).toBeTruthy();
    expect(screen.getByText('启用')).toBeTruthy();
    expect(queryOaPositions).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 }),
    );
  });

  it('新建岗位时提交编码与名称', async () => {
    render(<PositionPage />);
    await screen.findByText('财务');

    fireEvent.click(screen.getByRole('button', { name: /新建岗位/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('switch')).toBeNull();

    fireEvent.change(within(dialog).getByLabelText('岗位编码'), {
      target: { value: ' HR ' },
    });
    fireEvent.change(within(dialog).getByLabelText('岗位名称'), {
      target: { value: ' 人事 ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /确\s*定/ }));

    await waitFor(() =>
      expect(createOaPosition).toHaveBeenCalledWith({
        code: 'HR',
        name: '人事',
        sort: 0,
      }),
    );
  });

  it('编辑岗位时可停用并携带版本号', async () => {
    render(<PositionPage />);
    await screen.findByText('财务');

    fireEvent.click(screen.getByRole('button', { name: /编辑/ }));
    const dialog = await screen.findByRole('dialog');
    expect(
      (within(dialog).getByLabelText('岗位编码') as HTMLInputElement).disabled,
    ).toBe(true);

    fireEvent.click(within(dialog).getByRole('switch'));
    fireEvent.click(within(dialog).getByRole('button', { name: /确\s*定/ }));

    await waitFor(() =>
      expect(updateOaPosition).toHaveBeenCalledWith(1, {
        name: '财务',
        sort: 10,
        status: 'DISABLED',
        version: 2,
      }),
    );
  });
});
