/**
 * 深链落点：/system/notice/add（sys_menu 隐藏菜单，权限 system:notice:create 载体）。
 * 公告发布已并入列表页，这里仅重定向。
 */
import { history } from '@umijs/max';
import { useEffect } from 'react';

const NoticeAddRedirect: React.FC = () => {
  useEffect(() => {
    history.replace('/system/notice');
  }, []);
  return null;
};

export default NoticeAddRedirect;
