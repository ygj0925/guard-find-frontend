import { Provider, useModel } from '@@/plugin-model';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useState } from 'react';
import UnreadBell from '@/components/UnreadBell';
import useDynamicRoute from '@/models/dynamicRoute';
import useUnreadModel from '@/models/unread';

let mockRoutes: any[] = [{ path: '/first', name: 'Before' }];
jest.mock('@umijs/max', () => ({
  useModel: require('@@/plugin-model').useModel,
  history: { push: jest.fn() },
}));
jest.mock('@/utils/RouteUtils', () => ({
  getCachedMenuRoutes: () => mockRoutes,
  getCachedFirstPath: () => mockRoutes[0]?.path,
}));
jest.mock('@/utils/Web', () => ({
  isLogin: () => true,
  Token: { get: () => 'token' },
}));
jest.mock('@/utils/AuthSession', () => ({
  getSessionIdentity: () => 'token:tenant',
}));
jest.mock('@/services/web/user-message', () => ({
  getUnreadCount: jest.fn(async () => ({ data: { total: 3 } })),
  getUnreadNoticeCount: jest.fn(async () => ({ data: { total: 2 } })),
}));
jest.mock('antd', () => ({
  Badge: ({ children, count }: any) => (
    <span data-testid="badge" data-count={count}>
      {children}
    </span>
  ),
}));
jest.mock('@ant-design/icons', () => ({
  BellOutlined: () => <span>bell</span>,
}));

test('menu changes reach dynamic routes even when the user object is unchanged', async () => {
  const user = { id: 1 };
  let notify!: () => void;
  function Session() {
    const [revision, setRevision] = useState(0);
    notify = () => setRevision((value) => value + 1);
    return { initialState: { user }, revision };
  }
  function Page() {
    const { dynamicRoute } = useModel('dynamicRoute');
    return <span>{dynamicRoute[0]?.name}</span>;
  }
  render(
    <Provider
      models={{ '@@initialState': Session, dynamicRoute: useDynamicRoute }}
    >
      <Page />
    </Provider>,
  );
  expect(screen.getByText('Before')).toBeTruthy();
  act(() => {
    mockRoutes = [{ path: '/first', name: 'After' }];
    notify();
  });
  await waitFor(() => expect(screen.getByText('After')).toBeTruthy());
  expect(screen.queryByText('Before')).toBeNull();
});

test('unread count updates render the bell without rendering a layout that only uses the refresh action', async () => {
  const renders = jest.fn();
  function Layout() {
    renders();
    const refresh = useModel('unread', (model) => model.refreshUnread);
    return (
      <>
        <button type="button" onClick={() => void refresh()}>
          refresh
        </button>
        <UnreadBell />
      </>
    );
  }
  render(
    <Provider
      models={{
        '@@initialState': () => ({ initialState: { user: { id: 1 } } }),
        unread: useUnreadModel,
      }}
    >
      <Layout />
    </Provider>,
  );
  fireEvent.click(screen.getByText('refresh'));
  await waitFor(() =>
    expect(screen.getByTestId('badge').getAttribute('data-count')).toBe('5'),
  );
  expect(renders).toHaveBeenCalledTimes(1);
});
