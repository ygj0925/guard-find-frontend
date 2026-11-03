import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { Form } from 'antd';
import Icon, {
  normalizeIconName,
  resolveIconComponent,
} from '@/components/Icon/Icon';
import IconSelect from '@/components/Icon/IconSelect';
import icons from '@/components/Icon/icons';

// JSDOM has no pseudo-element layout; Ant Design's scrollbar measurement does.
const getComputedStyle = window.getComputedStyle;
beforeAll(() => {
  jest
    .spyOn(window, 'getComputedStyle')
    .mockImplementation((element) => getComputedStyle(element));
});
afterAll(() => jest.restoreAllMocks());

test.each([
  ['settings', 'SettingOutlined'],
  ['user-management', 'TeamOutlined'],
  ['mind-mapping', 'ApartmentOutlined'],
  ['icon-user', 'UserOutlined'],
  ['UserOutlined', 'UserOutlined'],
  ['userOutlined', 'UserOutlined'],
])('resolves saved menu icon %s', (value, expected) => {
  expect(resolveIconComponent(value)).toBe(
    icons[expected as keyof typeof icons],
  );
});

test('unregistered icons render safely', () => {
  const { container } = render(<Icon type="missing-icon" />);
  expect(container.innerHTML).toBe('');
});

test('every registered icon can round-trip through a saved picker value', () => {
  for (const [name, component] of Object.entries(icons)) {
    expect(resolveIconComponent(normalizeIconName(name))).toBe(component);
  }
  expect(resolveIconComponent('constructor')).toBeUndefined();
});

test('the picker reflects a saved alias, commits a replacement to the form and can clear it', async () => {
  let form: ReturnType<typeof Form.useForm>[0] | undefined;
  function Example() {
    [form] = Form.useForm();
    return (
      <Form form={form} initialValues={{ icon: 'settings' }}>
        <Form.Item name="icon" label="菜单图标">
          <IconSelect />
        </Form.Item>
      </Form>
    );
  }
  render(<Example />);
  expect(screen.getByRole('img', { name: 'setting' })).toBeTruthy();
  fireEvent.click(screen.getByLabelText('菜单图标'));
  const dialog = await screen.findByRole('dialog');
  expect(
    within(dialog)
      .getByRole('button', { name: 'setting' })
      .getAttribute('aria-pressed'),
  ).toBe('true');
  fireEvent.change(
    within(dialog).getByPlaceholderText('搜索图标名称，如 user、setting'),
    { target: { value: 'user' } },
  );
  fireEvent.click(within(dialog).getByRole('button', { name: 'user' }));
  expect(form?.getFieldValue('icon')).toBe('settings');
  fireEvent.click(within(dialog).getByRole('button', { name: /^确\s*定$/ }));
  await waitFor(() => expect(form?.getFieldValue('icon')).toBe('user'));
  fireEvent.click(screen.getByRole('button', { name: '清空图标' }));
  expect(form?.getFieldValue('icon')).toBe('');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

test('cancelling a draft preserves the saved icon and reopening restores its selection', async () => {
  const onChange = jest.fn();
  render(<IconSelect value="UserOutlined" onChange={onChange} />);
  fireEvent.click(screen.getByRole('textbox'));
  let dialog = await screen.findByRole('dialog');
  const selected = within(dialog).getByRole('button', {
    name: 'user',
  });
  expect(selected.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(within(dialog).getByRole('button', { name: 'setting' }));
  fireEvent.click(within(dialog).getByRole('button', { name: /^取\s*消$/ }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('textbox'));
  dialog = await screen.findByRole('dialog');
  expect(
    within(dialog)
      .getByRole('button', { name: 'user' })
      .getAttribute('aria-pressed'),
  ).toBe('true');
});
