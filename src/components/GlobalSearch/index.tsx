import { SearchOutlined } from '@ant-design/icons';
import { history, useAppData } from '@umijs/max';
import { AutoComplete, Input } from 'antd';
import { useMemo, useState } from 'react';

interface MenuItem {
  name?: string;
  path?: string;
  routes?: MenuItem[];
}

function flatMenus(menus: MenuItem[], list: MenuItem[] = []) {
  menus.forEach((item) => {
    if (item.name && item.path) {
      list.push(item);
    }

    if (item.routes) {
      flatMenus(item.routes, list);
    }
  });

  return list;
}

export default function GlobalSearch() {
  const { clientRoutes } = useAppData();
  const [value, setValue] = useState('');

  // 提取菜单
  const menus = useMemo(() => {
    return flatMenus(clientRoutes as any);
  }, [clientRoutes]);

  // 搜索
  const options = useMemo(() => {
    if (!value) return [];

    return menus
      .filter((item): item is MenuItem & { path: string } =>
        Boolean(
          item.path && item.name?.toLowerCase().includes(value.toLowerCase()),
        ),
      )
      .map((item) => ({
        value: item.path,
        label: item.name,
      }));
  }, [value, menus]);

  return (
    <AutoComplete
      style={{ width: 200 }}
      options={options}
      value={value}
      onSearch={(v) => setValue(v)}
      onSelect={(path) => {
        history.push(path);
      }}
    >
      <Input prefix={<SearchOutlined />} placeholder="搜索菜单" allowClear />
    </AutoComplete>
  );
}
