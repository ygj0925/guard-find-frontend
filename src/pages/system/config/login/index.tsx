/**
 * 深链落点：/system/config?tab=login（sys_menu 隐藏菜单直达）。
 * 配置页已是统一 Tabs 实现，这里仅重定向到对应 tab。
 */
import { history } from '@umijs/max';
import { useEffect } from 'react';

const ConfigTabRedirect: React.FC = () => {
  useEffect(() => {
    history.replace('/system/config?tab=login');
  }, []);
  return null;
};

export default ConfigTabRedirect;
