/**
 * 深链落点：/system/notice/view（sys_menu 隐藏菜单，权限 system:notice:view 载体）。
 * 公告查看已并入列表页，这里仅重定向，保证直接访问不白屏且权限码保留。
 */
import { history } from '@umijs/max';
import { useEffect } from 'react';

const NoticeViewRedirect: React.FC = () => {
  useEffect(() => {
    history.replace('/system/notice');
  }, []);
  return null;
};

export default NoticeViewRedirect;
