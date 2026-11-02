import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import DialogHost, { useDialog } from '@/components/DialogHost';
import AnnouncementForm from '@/pages/system/notice/components/AnnouncementForm';
import AnnouncementPreview from '@/pages/system/notice/components/AnnouncementPreview';
import { announcement } from '@/services/web/notify';

jest.mock('@umijs/max', () => ({
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }),
}));
jest.mock('@/services/web/notify', () => ({
  announcement: { detail: jest.fn(), create: jest.fn(), edit: jest.fn() },
}));
jest.mock('@/components/Editor', () => ({
  __esModule: true,
  default: ({ value }: { value: string }) => <div>{value}</div>,
}));
jest.mock('antd', () => ({
  Modal: ({ open, loading, children }: any) =>
    open ? <div role="dialog">{loading ? 'loading' : children}</div> : null,
  Alert: ({ message }: any) => <div role="alert">{message}</div>,
  message: { success: jest.fn() },
}));
jest.mock('@ant-design/pro-components', () => {
  const Field = () => null;
  const Form = ({ children, initialValues }: any) => (
    <div data-testid="form" data-values={JSON.stringify(initialValues)}>
      {children}
    </div>
  );
  Form.useForm = () => [{}];
  return {
    ProForm: Form,
    ProFormText: Field,
    ProFormSelect: Field,
    ProFormDateTimePicker: Field,
    ProFormCheckbox: { Group: Field },
    ProFormSwitch: Field,
  };
});

function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<any>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function Page({ preview = false }: { preview?: boolean }) {
  const dialog = useDialog<number>();
  return (
    <>
      <button type="button" onClick={() => dialog.open(1)}>
        first
      </button>
      <button type="button" onClick={() => dialog.open(2)}>
        second
      </button>
      <button type="button" onClick={dialog.close}>
        close
      </button>
      <DialogHost dialog={dialog}>
        {({ data, visible }) =>
          preview ? (
            <AnnouncementPreview
              announcementId={data}
              visible={visible}
              onCancel={dialog.close}
            />
          ) : (
            <AnnouncementForm
              announcementId={data}
              visible={visible}
              onCancel={dialog.close}
              onSuccess={dialog.close}
            />
          )
        }
      </DialogHost>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('the edit dialog is visible while detail is pending and initializes after it resolves', async () => {
  const request = deferred();
  jest.mocked(announcement.detail).mockReturnValue(request.promise);
  render(<Page />);
  fireEvent.click(screen.getByText('first'));
  expect(screen.getByRole('dialog').textContent).toBe('loading');
  expect(screen.queryByTestId('form')).toBeNull();
  await act(async () => {
    request.resolve({
      data: { id: 1, title: 'loaded title', content: 'loaded content' },
    });
  });
  expect(
    JSON.parse(screen.getByTestId('form').getAttribute('data-values') || '{}')
      .title,
  ).toBe('loaded title');
  expect(screen.getByText('loaded content')).toBeTruthy();
});

test.each([false, true])(
  'late responses cannot replace a newly opened announcement (preview=%s)',
  async (preview) => {
    const first = deferred();
    const second = deferred();
    jest
      .mocked(announcement.detail)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    render(<Page preview={preview} />);
    fireEvent.click(screen.getByText('first'));
    fireEvent.click(screen.getByText('close'));
    fireEvent.click(screen.getByText('second'));
    await act(async () => {
      second.resolve({
        data: { id: 2, title: 'second', content: 'current content' },
      });
    });
    await act(async () => {
      first.resolve({
        data: { id: 1, title: 'first', content: 'stale content' },
      });
    });
    expect(screen.getByText('current content')).toBeTruthy();
    expect(screen.queryByText('stale content')).toBeNull();
  },
);

test('failed detail loading does not expose an empty create form', async () => {
  const request = deferred();
  jest.mocked(announcement.detail).mockReturnValue(request.promise);
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    render(<Page />);
    fireEvent.click(screen.getByText('first'));
    await act(async () => {
      request.reject(new Error('unavailable'));
    });
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.queryByTestId('form')).toBeNull();
    expect(announcement.create).not.toHaveBeenCalled();
  } finally {
    log.mockRestore();
  }
});
