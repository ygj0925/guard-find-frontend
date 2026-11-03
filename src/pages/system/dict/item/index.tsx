/**
 * 深链落点：/system/dict/item（sys_menu 隐藏菜单）。
 * 字典项管理已并入字典列表页（DictItemModal），这里仅重定向。
 */
import { history } from '@umijs/max';
import { useEffect } from 'react';

const DictItemRedirect: React.FC = () => {
  useEffect(() => {
    history.replace('/system/dict');
  }, []);
  return null;
};

export default DictItemRedirect;
