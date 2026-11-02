import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffect, useState } from 'react';
import DialogHost, { useDialog } from '@/components/DialogHost';

test('opening, closing and switching records never re-renders the owning page', () => {
  const pageRender = jest.fn();
  const formMount = jest.fn();
  function Form({
    name,
    visible,
    close,
  }: {
    name: string;
    visible: boolean;
    close: () => void;
  }) {
    const [value, setValue] = useState(name);
    useEffect(() => {
      formMount();
    }, []);
    return (
      <div data-testid="dialog" data-visible={visible}>
        <input
          aria-label="name"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <button type="button" onClick={close}>
          close
        </button>
      </div>
    );
  }
  function Page() {
    pageRender();
    const dialog = useDialog<string>();
    return (
      <>
        <button type="button" onClick={() => dialog.open('Alice')}>
          Alice
        </button>
        <button type="button" onClick={() => dialog.open('Bob')}>
          Bob
        </button>
        <DialogHost dialog={dialog}>
          {({ data, visible }) => (
            <Form name={data} visible={visible} close={dialog.close} />
          )}
        </DialogHost>
      </>
    );
  }
  render(<Page />);
  expect(screen.queryByTestId('dialog')).toBeNull();
  expect(formMount).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Alice'));
  fireEvent.change(screen.getByLabelText('name'), {
    target: { value: 'unsaved' },
  });
  fireEvent.click(screen.getByText('close'));
  // Preserve the closing animation's content, then reset on the next open.
  expect(screen.getByTestId('dialog').getAttribute('data-visible')).toBe(
    'false',
  );
  expect((screen.getByLabelText('name') as HTMLInputElement).value).toBe(
    'unsaved',
  );
  fireEvent.click(screen.getByText('Bob'));
  expect((screen.getByLabelText('name') as HTMLInputElement).value).toBe('Bob');
  fireEvent.click(screen.getByText('Alice'));
  expect((screen.getByLabelText('name') as HTMLInputElement).value).toBe(
    'Alice',
  );
  expect(formMount).toHaveBeenCalledTimes(3);
  expect(pageRender).toHaveBeenCalledTimes(1);
});

test('independent dialog hosts only update their own subscribers and clean up on unmount', () => {
  const renderA = jest.fn();
  const renderB = jest.fn();
  let controls: ReturnType<typeof useDialog<string>>;
  function Page() {
    const a = useDialog<string>();
    const b = useDialog<string>();
    controls = a;
    return (
      <>
        <button type="button" onClick={() => a.open('A')}>
          open A
        </button>
        <button type="button" onClick={() => b.open('B')}>
          open B
        </button>
        <DialogHost dialog={a}>
          {({ data }) => {
            renderA();
            return <span>{data}</span>;
          }}
        </DialogHost>
        <DialogHost dialog={b}>
          {({ data }) => {
            renderB();
            return <span>{data}</span>;
          }}
        </DialogHost>
      </>
    );
  }
  const view = render(<Page />);
  fireEvent.click(screen.getByText('open B'));
  fireEvent.click(screen.getByText('open A'));
  expect(renderB).toHaveBeenCalledTimes(1);
  act(() => {
    controls.close();
  });
  const count = renderA.mock.calls.length;
  act(() => {
    controls.close();
  });
  expect(renderA).toHaveBeenCalledTimes(count);
  view.unmount();
  act(() => {
    controls.open('after unmount');
  });
  expect(renderA).toHaveBeenCalledTimes(count);
});
