import { render, screen } from '@testing-library/react';
import React from 'react';
import AccessControl from '@/components/AccessControl';
import RouteAccess from '@/components/RouteAccess';
import FileUpload from '@/pages/system/file/components/FileUpload';
import { checkFile, uploadFile } from '@/services/web/file';
import { getAuthorizedRoutes } from '@/utils/RouteUtils';

type AuthorizedRoute = import('@/typings').GLOBAL.Router;

let mockPermissions: string[] = [];
let mockRoutes: AuthorizedRoute[] = [];
let mockUploadProps: any;
jest.mock('@umijs/max', () => ({
  useModel: () => ({ initialState: { user: { id: 7 } } }),
  useLocation: () => ({ pathname: '/system/user' }),
  Link: ({ children }: any) => <span>{children}</span>,
}));
jest.mock('@/hooks/useAccess', () => ({
  useAccess: () =>
    require('@/utils/access').createAccessChecker({
      permissions: mockPermissions,
    }),
}));
jest.mock('@/utils/Web', () => ({ Token: { get: () => 'token' } }));
jest.mock('@/utils/RouteUtils', () => ({
  getAuthorizedRoutes: jest.fn(() => mockRoutes),
  isOfflinePath: () => false,
}));
jest.mock('@/services/web/file', () => ({
  checkFile: jest.fn(),
  uploadFile: jest.fn(),
}));
jest.mock('antd', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  Button: ({ children, disabled }: any) => (
    <button type="button" disabled={disabled}>
      {children}
    </button>
  ),
  Result: () => <div>Forbidden</div>,
  Upload: (props: any) => {
    mockUploadProps = props;
    return <div>{props.children}</div>;
  },
  message: { success: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPermissions = [];
  mockRoutes = [];
});

test('denied routes never mount the page, and revocation unmounts it', () => {
  const mount = jest.fn();
  const unmount = jest.fn();
  const Page = () => {
    React.useEffect(() => {
      mount();
      return unmount;
    }, []);
    return <div>Secret page</div>;
  };
  const view = render(
    <RouteAccess>
      <Page />
    </RouteAccess>,
  );
  expect(mount).not.toHaveBeenCalled();
  expect(screen.getByText('Forbidden')).toBeTruthy();
  mockRoutes = [{ id: 1, title: 'Users', type: 2, path: '/system/user' }];
  view.rerender(
    <RouteAccess>
      <Page />
    </RouteAccess>,
  );
  expect(mount).toHaveBeenCalledTimes(1);
  mockRoutes = [];
  view.rerender(
    <RouteAccess>
      <Page />
    </RouteAccess>,
  );
  expect(unmount).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Secret page')).toBeNull();
  expect(getAuthorizedRoutes).toHaveBeenCalled();
});

test('AccessControl disables the upload trigger and blocks requests', async () => {
  render(
    <AccessControl permission="system:file:upload" mode="disable">
      <FileUpload />
    </AccessControl>,
  );
  expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  expect(mockUploadProps.disabled).toBe(true);
  await mockUploadProps.customRequest({
    file: new File(['content'], 'test.txt'),
  });
  expect(checkFile).not.toHaveBeenCalled();
  expect(uploadFile).not.toHaveBeenCalled();
});

test('permission refresh enables the upload control', () => {
  const view = render(
    <AccessControl permission="system:file:upload" mode="disable">
      <FileUpload />
    </AccessControl>,
  );
  mockPermissions = ['system:file:upload'];
  view.rerender(
    <AccessControl permission="system:file:upload" mode="disable">
      <FileUpload />
    </AccessControl>,
  );
  expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(
    false,
  );
  expect(mockUploadProps.disabled).toBe(false);
});
