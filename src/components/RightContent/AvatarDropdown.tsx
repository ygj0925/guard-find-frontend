import {
  DownOutlined,
  LogoutOutlined,
  MoreOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import type { MenuProps } from 'antd';
import { Avatar, message, Spin } from 'antd';
import { createStyles } from 'antd-style';
import React, { useRef, useState } from 'react';
import { logout } from '@/services/web/login';
import { redirectToLogin } from '@/utils/LoginRedirect';
import Notify from '@/utils/NotifyUtils';
import HeaderDropdown from '../HeaderDropdown';

export type GlobalHeaderRightProps = {
  menu?: boolean;
  children?: React.ReactNode;
  sider?: boolean;
  collapsed?: boolean;
};

export const AvatarName = () => {
  const user = useModel('@@initialState', (model) => model.initialState?.user);
  return <span className="anticon">{user?.nickname || user?.username}</span>;
};

const useStyles = createStyles(({ token }) => ({
  action: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
    padding: '0 8px',
    border: 0,
    background: 'transparent',
    color: 'inherit',
    font: 'inherit',
    cursor: 'pointer',
    borderRadius: token.borderRadius,
    '&:hover': { backgroundColor: token.colorBgTextHover },
    '&:focus-visible': { outline: `2px solid ${token.colorPrimary}` },
    '&:disabled': { cursor: 'wait' },
  },
  siderAction: {
    width: '100%',
    minWidth: 0,
    minHeight: 60,
    padding: '10px 12px',
    gap: 12,
    textAlign: 'start',
  },
  compactAction: {
    width: 40,
    minHeight: 40,
    padding: 6,
    marginInline: 'auto',
    justifyContent: 'center',
  },
  avatar: { flexShrink: 0 },
  identity: { flex: 1, minWidth: 0, lineHeight: 1.5 },
  name: {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontWeight: 500,
  },
  account: {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: token.fontSizeSM,
    color: token.colorTextSecondary,
  },
  indicator: { flexShrink: 0, fontSize: 16, color: token.colorTextSecondary },
}));

export const AvatarDropdown: React.FC<GlobalHeaderRightProps> = ({
  menu,
  children,
  sider = false,
  collapsed = false,
}) => {
  const { styles, cx } = useStyles();
  const user = useModel('@@initialState', (model) => model.initialState?.user);
  const displayName = user?.nickname || user?.username || '用户';
  const setInitialState = useModel(
    '@@initialState',
    (model) => model.setInitialState,
  );
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const logoutPending = useRef(false);

  const loginOut = async () => {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setLoggingOut(true);
    setOpen(false);
    const fullPath = `${window.location.pathname}${window.location.search}`;
    try {
      // 请求完成前保留凭证，后端才能注销当前令牌。
      await logout();
    } catch {
      message.warning('未能确认服务端退出，已清除本机登录状态');
    } finally {
      Notify.clearSession();
      setInitialState((state) => ({ ...state, user: undefined }));
      await redirectToLogin(fullPath);
    }
  };

  const onMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (logoutPending.current) return;
    setOpen(false);
    if (key === 'logout') {
      void loginOut();
    } else if (key === 'center') {
      history.push('/user/profile');
    }
  };

  const menuItems: MenuProps['items'] = [
    ...(menu
      ? [
          { key: 'center', icon: <UserOutlined />, label: '个人中心' },
          { type: 'divider' as const },
        ]
      : []),
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: loggingOut ? '正在退出…' : '退出登录',
      disabled: loggingOut,
      danger: true,
    },
  ];

  return (
    <HeaderDropdown
      trigger={['click']}
      placement={sider ? 'topRight' : 'bottomRight'}
      open={open && !loggingOut && !!user}
      onOpenChange={setOpen}
      menu={{ selectedKeys: [], onClick: onMenuClick, items: menuItems }}
    >
      <button
        type="button"
        className={cx(
          styles.action,
          sider && styles.siderAction,
          sider && collapsed && styles.compactAction,
        )}
        title={sider ? displayName : undefined}
        aria-label="用户菜单"
        aria-haspopup="menu"
        aria-expanded={open && !loggingOut && !!user}
        aria-busy={loggingOut}
        disabled={loggingOut || !user}
      >
        {loggingOut || !user ? (
          <Spin size="small" />
        ) : sider ? (
          <>
            <Avatar
              className={styles.avatar}
              src={user.avatar}
              icon={<UserOutlined />}
              size={collapsed ? 28 : 36}
            />
            {!collapsed && (
              <span className={styles.identity}>
                <span className={styles.name}>{displayName}</span>
                {user.username && user.username !== displayName && (
                  <span className={styles.account}>{user.username}</span>
                )}
              </span>
            )}
          </>
        ) : (
          children
        )}
        {sider ? (
          !collapsed && <MoreOutlined className={styles.indicator} />
        ) : (
          <DownOutlined style={{ fontSize: 10 }} />
        )}
      </button>
    </HeaderDropdown>
  );
};
