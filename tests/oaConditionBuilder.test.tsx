import { fireEvent, render, screen } from '@testing-library/react';
import OaConditionBuilder from '@/pages/oa/process/design/components/OaConditionBuilder';

describe('OaConditionBuilder', () => {
  it('把单条条件编译成受限表达式', async () => {
    const onSubmit = jest.fn();
    render(
      <OaConditionBuilder open onCancel={jest.fn()} onSubmit={onSubmit} />,
    );
    expect(screen.getByRole('button', { name: '应用到连线' })).toHaveProperty(
      'disabled',
      true,
    );
    fireEvent.change(screen.getByLabelText('字段 1'), {
      target: { value: 'amount' },
    });
    fireEvent.change(screen.getByLabelText('条件值 1'), {
      target: { value: '1000' },
    });
    expect(await screen.findByText('${amount == 1000}')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '应用到连线' }));
    expect(onSubmit).toHaveBeenCalledWith('${amount == 1000}');
  });

  it('支持 OR 组合与新增、删除条件', async () => {
    const onSubmit = jest.fn();
    render(
      <OaConditionBuilder open onCancel={jest.fn()} onSubmit={onSubmit} />,
    );
    fireEvent.click(screen.getByRole('radio', { name: '任一满足 (OR)' }));
    fireEvent.change(screen.getByLabelText('字段 1'), {
      target: { value: 'amount' },
    });
    fireEvent.change(screen.getByLabelText('条件值 1'), {
      target: { value: '1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /添加条件/ }));
    fireEvent.change(screen.getByLabelText('字段 2'), {
      target: { value: 'vip' },
    });
    fireEvent.change(screen.getByLabelText('条件值 2'), {
      target: { value: 'true' },
    });
    expect(
      await screen.findByText('${amount == 1 || vip == true}'),
    ).toBeTruthy();
    fireEvent.click(screen.getByLabelText('删除条件 2'));
    expect(screen.queryByLabelText('字段 2')).toBeNull();
  });

  it('字段为空时给出错误且禁止应用', async () => {
    render(
      <OaConditionBuilder open onCancel={jest.fn()} onSubmit={jest.fn()} />,
    );
    expect(await screen.findByText(/条件值不能为空/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '应用到连线' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('展示当前表达式方便对照', () => {
    render(
      <OaConditionBuilder
        open
        currentExpression="${amount > 100}"
        onCancel={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );
    expect(screen.getByText('${amount > 100}')).toBeTruthy();
  });
});
