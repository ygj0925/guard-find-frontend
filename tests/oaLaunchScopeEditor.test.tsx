import { render, screen } from '@testing-library/react';
import OaLaunchScopeEditor from '@/pages/oa/process/components/OaLaunchScopeEditor';

describe('可发起范围编辑器', () => {
  it('回显已配置的用户、部门与角色', () => {
    render(
      <OaLaunchScopeEditor value='{"users":[101],"depts":[10],"roles":["hr"]}' />,
    );

    expect(screen.getByText('101')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('hr')).toBeTruthy();
    expect(screen.getByText(/三组条件任一命中/)).toBeTruthy();
  });

  it('空范围展示三组输入与不限制说明', () => {
    render(<OaLaunchScopeEditor />);

    expect(screen.getAllByLabelText('可发起用户 ID').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('可发起部门 ID').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('可发起角色编码').length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText(/全部留空表示所有员工都可发起/)).toBeTruthy();
  });
});
