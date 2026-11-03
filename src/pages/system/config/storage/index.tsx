/**
 * 深链落点：/system/config?tab=storage（sys_menu 隐藏菜单直达）。
 * 存储配置已有独立管理页，重定向过去。
 */
import { history } from '@umijs/max';
import { useEffect } from 'react';

const StorageConfigRedirect: React.FC = () => {
  useEffect(() => {
    history.replace('/system/storage');
  }, []);
  return null;
};

export default StorageConfigRedirect;
