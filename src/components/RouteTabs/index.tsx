import { RouteContext } from '@ant-design/pro-components';
import {
  KeepAliveContext,
  useKeepOutlets,
  useLocation,
  useOutlet,
} from '@umijs/max';
import { theme } from 'antd';
import { useContext, useLayoutEffect, useRef } from 'react';
import Notify from '@/utils/NotifyUtils';
import { getRouteTabs, syncRouteTabs } from '@/utils/routeTabs';
import './index.css';

export default function RouteTabs() {
  const cache = useContext(KeepAliveContext);
  const location = useLocation();
  const outlet = useOutlet();
  const rootRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const { collapsed, isMobile, layout, fixedHeader } = useContext(RouteContext);
  const { token } = theme.useToken();

  // Cache belongs to the current authorization scope, not the root provider's lifetime.
  if (!initialized.current) {
    cache.keepElements.current = {};
    initialized.current = true;
  }
  syncRouteTabs(cache.keepElements.current, getRouteTabs(), location, outlet);

  useLayoutEffect(() => {
    const entries = cache.keepElements.current;
    const clear = () => {
      Object.keys(cache.keepElements.current).forEach(cache.dropByCacheKey);
    };
    Notify.setCleanCache(clear);
    return () => {
      // A new authorization scope may already have installed its own cache.
      if (cache.keepElements.current === entries) {
        cache.keepElements.current = {};
      }
      Notify.setCleanCache(() => {});
    };
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const content = root?.closest<HTMLElement>('.ant-pro-layout-content');
    const container = content?.parentElement;
    if (!root || !content || !container) return;
    const measure = () => {
      const padding = getComputedStyle(content);
      // Finish layout reads before changing CSS variables on the measured tree.
      const insetStart = padding.paddingInlineStart;
      const insetEnd = padding.paddingInlineEnd;
      const insetTop = padding.paddingTop;
      const header = container.querySelector<HTMLElement>(
        '.ant-pro-layout-header',
      );
      const fixed = header && getComputedStyle(header).position === 'fixed';
      const top = fixed
        ? Math.max(0, header.getBoundingClientRect().bottom)
        : 0;
      root.style.setProperty('--route-tabs-inset-start', insetStart);
      root.style.setProperty('--route-tabs-inset-end', insetEnd);
      root.style.setProperty('--route-tabs-inset-top', insetTop);
      root.style.setProperty('--route-tabs-top', `${top}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    const header = container.querySelector<HTMLElement>(
      '.ant-pro-layout-header',
    );
    if (header) observer.observe(header);
    return () => observer.disconnect();
  }, [location.pathname, collapsed, isMobile, layout, fixedHeader]);

  const content = useKeepOutlets();
  return (
    <div
      ref={rootRef}
      className="admin-route-tabs"
      style={
        {
          '--route-tabs-background': token.colorBgContainer,
          '--route-tabs-border': token.colorBorderSecondary,
        } as React.CSSProperties
      }
    >
      {content}
    </div>
  );
}
