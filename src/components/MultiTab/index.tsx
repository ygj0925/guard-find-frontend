import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  DownOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { RouteContext } from '@ant-design/pro-layout';
import { history, useLocation, useModel } from '@umijs/max';
import { Dropdown, Tabs } from 'antd';
import type { KeepAliveRef } from 'keepalive-for-react';
import type { RefObject } from 'react';
import React, { useCallback, useContext, useEffect, useMemo } from 'react';
import RouteUtils from '@/utils/RouteUtils';
import './index.css';

interface MultiTabProps {
  aliveRef: RefObject<KeepAliveRef | null>;
  style?: 'default' | 'card';
  fixed?: boolean;
}

const MultiTab: React.FC<MultiTabProps> = ({
  aliveRef,
  style: tabStyle = 'default',
  fixed = true,
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
  const { siderWidth } = useContext(RouteContext);
  const location = useLocation();

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
        const removed = removeTab(key);
        destroyKeys(removed);
      }
    },
    [removeTab, destroyKeys],
  );

  const handleRefresh = useCallback(() => {
    aliveRef.current?.refresh(activeKey);
  }, [aliveRef, activeKey]);

  const handleClose = useCallback(() => {
    const removed = removeTab(activeKey);
    destroyKeys(removed);
  }, [removeTab, activeKey, destroyKeys]);

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
      })),
    [tabs],
  );

  return (
    <Dropdown menu={{ items: menuItems }} trigger={['contextMenu']}>
      <div
        className={cls.join(' ')}
        style={{
          width: fixed
            ? `calc(100% - ${(siderWidth || 0) + (tabStyle === 'card' ? 48 : 0)}px)`
            : undefined,
        }}
      >
        <Tabs
          hideAdd
          type="editable-card"
          activeKey={activeKey}
          items={tabItems}
          onChange={handleChange}
          onEdit={handleEdit}
          tabBarExtraContent={
            <Dropdown menu={{ items: menuItems }} trigger={['hover', 'click']}>
              <span className="multi-tab-tool">
                <DownOutlined />
              </span>
            </Dropdown>
          }
        />
      </div>
    </Dropdown>
  );
};

export default MultiTab;
