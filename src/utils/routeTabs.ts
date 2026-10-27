import RouteUtils from './RouteUtils';

type ReactNode = import('react').ReactNode;

export type RouteTab = {
  title: string;
  cache: boolean;
};

export function getRouteTabs(): Record<string, RouteTab> {
  const tabs: Record<string, RouteTab> = {
    '/user/profile': { title: '个人中心', cache: false },
    '/user/message': { title: '消息中心', cache: false },
  };
  for (const [path, menu] of Object.entries(RouteUtils.getMenuDict())) {
    tabs[path.toLowerCase()] = {
      title: String(menu.name || path),
      cache: menu.meta?.isCache === true,
    };
  }
  return tabs;
}

export type CachedRouteTab = {
  name?: string;
  icon?: ReactNode;
  index: number;
  children: ReactNode;
  location: { pathname: string; search: string; hash: string };
};

/** Adapt the preset's cache to the menu contract without managing tab state. */
export function syncRouteTabs(
  entries: Record<string, CachedRouteTab>,
  tabs: Record<string, RouteTab>,
  location: CachedRouteTab['location'],
  outlet: ReactNode,
) {
  const activePath = location.pathname.toLowerCase();
  for (const [path, entry] of Object.entries(entries)) {
    const tab = tabs[path];
    if (!tab) {
      delete entries[path];
      continue;
    }
    entry.name = tab.title;
    entry.icon = undefined;
    if (path === activePath) {
      // Keep the latest query/hash when revisiting a tab or using browser history.
      entry.location = location;
      entry.children = outlet;
    } else if (!tab.cache) {
      // Preserve the tab label, but unmount pages with isCache=false (or omitted).
      entry.children = null;
    }
  }
  Object.values(entries).forEach((entry, index) => {
    entry.index = index;
  });
}
