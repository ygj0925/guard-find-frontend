import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DateInput from '@/components/DateInput';

it('uses an Ant Design calendar while preserving date-only API strings', async () => {
  const changed = jest.fn();
  const { container } = render(
    <DateInput
      open
      value="2026-11-18"
      onChange={changed}
      aria-label="合同日期"
    />,
  );
  expect((screen.getByLabelText('合同日期') as HTMLInputElement).value).toBe(
    '2026-11-18',
  );
  expect(container.querySelector('input[type="date"]')).toBeNull();
  fireEvent.mouseDown(screen.getByLabelText('合同日期'));
  fireEvent.focus(screen.getByLabelText('合同日期'));
  const target = await waitFor(() => {
    const cell = document.querySelector('td[title="2026-11-20"]');
    expect(cell).not.toBeNull();
    return cell!;
  });
  fireEvent.click(target.querySelector('.ant-picker-cell-inner')!);
  await waitFor(() => expect(changed).toHaveBeenCalledWith('2026-11-20'));
});
