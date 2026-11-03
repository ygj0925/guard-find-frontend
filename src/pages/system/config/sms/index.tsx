/**
 * 深链落点：/system/config?tab=sms（sys_menu 隐藏菜单直达）。
 * 短信配置已有独立管理页，重定向过去。
 */
import { history } from '@umijs/max';
import { useEffect } from 'react';

const SmsConfigRedirect: React.FC = () => {
  useEffect(() => {
    history.replace('/system/sms-config');
  }, []);
  return null;
};

export default SmsConfigRedirect;
