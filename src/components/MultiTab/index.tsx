import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { ProProvider, RouteContext } from '@ant-design/pro-components';
import { history, useLocation, useModel } from '@umijs/max';
import { Dropdown, Tabs } from 'antd';
import type { KeepAliveRef } from 'keepalive-for-react';
import type { RefObject } from 'react';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import RouteUtils from '@/utils/RouteUtils';
import './index.css';

interface MultiTabProps {
  aliveRef: RefObject<KeepAliveRef | null>;
  style?: 'default' | 'card';
}

const MultiTab: React.FC<MultiTabProps> = ({
  aliveRef,
  style: tabStyle = 'default',
}) => {
  const {
    tabs,
    activeKey,
    addTab,
    removeTab,
    removeLeft,
    removeRight,
    removeOthers,
  } = useModel('multiTab');
  const [closingKeys, setClosingKeys] = useState<string[]>([]);
  const closeTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const { layout, fixedHeader, hasHeader, isMobile, siderWidth } =
    useContext(RouteContext);
  const { token } = useContext(ProProvider);
  const location = useLocation();
  const fixed = fixedHeader || layout === 'mix';
  // Desktop side layouts render no header; mobile layouts do render one.
  const hasVisibleHeader = hasHeader && (layout !== 'side' || isMobile);
  const headerHeight = token.layout?.header?.heightLayoutHeader ?? 56;
  // The side menu's logo/collapse row occupies the first header-height pixels
  // even when ProLayout does not render a global header in desktop side mode.
  const topOffset =
    layout === 'side' ? headerHeight : hasVisibleHeader ? headerHeight : 0;

  useEffect(
    () => () => {
      closeTimers.current.forEach((timer) => {
        clearTimeout(timer);
      });
      closeTimers.current.clear();
    },
    [],
  );

  useEffect(() => {
    const pathname = location.pathname;
    if (pathname.startsWith('/user/') || pathname === '/404') return;

    const menuDict = RouteUtils.getMenuDict();
    const menu = menuDict[pathname];
    if (!menu) return;

    const title = (menu.name as string) || pathname;
    addTab(pathname, title);
  }, [location.pathname, addTab]);

  const destroyKeys = useCallback(
    async (keys: string[]) => {
      await Promise.all(keys.map((key) => aliveRef.current?.destroy(key)));
    },
    [aliveRef],
  );

  const handleChange = useCallback(
    (key: string) => {
      if (activeKey !== key) {
        history.push(key);
      }
    },
    [activeKey],
  );

  const handleEdit = useCallback(
    (
      key: React.MouseEvent | React.KeyboardEvent | string,
      action: 'add' | 'remove',
    ) => {
      if (action === 'remove' && typeof key === 'string') {
        if (tabs.length <= 1 || closingKeys.includes(key)) {
          removeTab(key);
          return;
        }

        setClosingKeys((current) => [...current, key]);
        const timer = setTimeout(() => {
          const removed = removeTab(key);
          destroyKeys(removed);
          setClosingKeys((current) => current.filter((item) => item !== key));
          closeTimers.current.delete(key);
        }, 180);
        closeTimers.current.set(key, timer);
      }
    },
    [tabs.length, closingKeys, removeTab, destroyKeys],
  );

  const handleRefresh = useCallback(() => {
    aliveRef.current?.refresh(activeKey);
  }, [aliveRef, activeKey]);

  const handleClose = useCallback(() => {
    handleEdit(activeKey, 'remove');
  }, [handleEdit, activeKey]);

  const handleCloseLeft = useCallback(() => {
    const removed = removeLeft(activeKey);
    destroyKeys(removed);
  }, [removeLeft, activeKey, destroyKeys]);

  const handleCloseRight = useCallback(() => {
    const removed = removeRight(activeKey);
    destroyKeys(removed);
  }, [removeRight, activeKey, destroyKeys]);

  const handleCloseOthers = useCallback(() => {
    const removed = removeOthers(activeKey);
    destroyKeys(removed);
  }, [removeOthers, activeKey, destroyKeys]);

  const menuItems = useMemo(
    () => [
      {
        key: 'refresh',
        icon: <ReloadOutlined />,
        label: '刷新当前',
        onClick: handleRefresh,
      },
      {
        key: 'close',
        icon: <CloseOutlined />,
        label: '关闭当前',
        onClick: handleClose,
      },
      {
        key: 'close-left',
        icon: <ArrowLeftOutlined />,
        label: '关闭左侧',
        onClick: handleCloseLeft,
      },
      {
        key: 'close-right',
        icon: <ArrowRightOutlined />,
        label: '关闭右侧',
        onClick: handleCloseRight,
      },
      {
        key: 'close-other',
        icon: <CloseCircleOutlined />,
        label: '关闭其他',
        onClick: handleCloseOthers,
      },
    ],
    [
      handleRefresh,
      handleClose,
      handleCloseLeft,
      handleCloseRight,
      handleCloseOthers,
    ],
  );

  const cls = ['multi-tab'];
  if (tabStyle === 'card') cls.push('multi-tab-card');
  cls.push(fixed ? 'multi-tab-fixed' : 'multi-tab-float');

  const tabItems = useMemo(
    () =>
      tabs.map((tab) => ({
        key: tab.key,
        label: tab.title,
        closable: tabs.length > 1,
        className: closingKeys.includes(tab.key)
          ? 'multi-tab-item-closing'
          : undefined,
      })),
    [tabs, closingKeys],
  );

  return (
    <Dropdown menu={{ items: menuItems }} trigger={['contextMenu']}>
      <div
        className={cls.join(' ')}
        style={{
          top: fixed ? topOffset : undefined,
          left: fixed ? (siderWidth ?? 0) : undefined,
        }}
      >
        <Tabs
          hideAdd
          type="editable-card"
          activeKey={activeKey}
          items={tabItems}
          onChange={handleChange}
          onEdit={handleEdit}
        />
      </div>
    </Dropdown>
  );
};

export default MultiTab;
