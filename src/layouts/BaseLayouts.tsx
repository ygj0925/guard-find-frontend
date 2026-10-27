import {
  BellOutlined,
  GithubFilled,
  InfoCircleFilled,
  PlusCircleFilled,
  QuestionCircleFilled,
  SearchOutlined,
} from '@ant-design/icons';
import type {
  MenuDataItem,
  ProLayoutProps,
  Settings,
} from '@ant-design/pro-components';
import {
  ProLayout,
  SettingDrawer,
  WaterMark,
} from '@ant-design/pro-components';
import { history, Link, Outlet, useLocation, useModel } from '@umijs/max';
import { Badge, Input, theme } from 'antd';
import React, { type FC, useEffect, useMemo, useState } from 'react';
import defaultSettings from '@/../config/defaultSettings';
import ChatFloat from '@/components/ChatFloat';
import { DictProvider } from '@/components/Dict';
import Footer from '@/components/Footer';
import RouteAccess from '@/components/RouteAccess';
import RouteTabs from '@/components/RouteTabs';
import {
  getUnreadCount,
  getUnreadNoticeCount,
} from '@/services/web/user-message';
import { redirectToLogin } from '@/utils/LoginRedirect';
import { getAuthorizedRoutes, isOfflinePath } from '@/utils/RouteUtils';
import { isLogin, LayoutSetting } from '@/utils/Web';

/**
 * BaseLayout Props
 */

export type BaseLayoutProps = {
  route: ProLayoutProps['route'] & {
    authority: string[];
    routes: any[];
  };

  settings: Settings;
  breadcrumbNameMap: Record<string, MenuDataItem>;
} & ProLayoutProps;

/**
 * 无布局页面（登录/企业选择/SSO 回调/密码过期），约定式路由无法声明 layout:false，
 * 在布局内按路径判断直接渲染裸 Outlet
 */
const AUTH_PATHS = [
  '/user/login',
  '/corp-select',
  '/social/callback',
  '/pwdExpired',
];

const SearchInput = () => {
  const { token } = theme.useToken();
  return (
    <div
      key="SearchOutlined"
      aria-hidden
      style={{
        display: 'flex',
        alignItems: 'center',
        color: token.colorPrimary,
        marginInlineEnd: 24,
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <Input
        style={{
          borderRadius: 4,
          marginInlineEnd: 12,
          backgroundColor: token.colorBgTextHover,
        }}
        prefix={
          <SearchOutlined
            style={{
              color: token.colorPrimary,
            }}
          />
        }
        placeholder="搜索方案"
        variant="borderless"
      />
      <PlusCircleFilled
        style={{
          color: token.colorPrimary,
          fontSize: 24,
        }}
      />
    </div>
  );
};

/**
 * BaseLayout
 */

const BaseLayout: FC<BaseLayoutProps> = () => {
  const location = useLocation();

  const { initialState, setInitialState } = useModel('@@initialState');
  useModel('authorization');

  const authorizationKey = JSON.stringify([
    initialState?.user?.id,
    initialState?.user?.permissions,
    initialState?.user?.roles,
    getAuthorizedRoutes(),
  ]);

  const multiTab =
    (initialState?.settings as any)?.multiTab ?? defaultSettings.multiTab;

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isLogin(initialState)) return;
    // 铃铛角标 = 未读消息 + 未读公告，两者都是"当前登录用户"视角接口
    void Promise.allSettled([getUnreadCount(), getUnreadNoticeCount()]).then(
      ([messages, notices]) => {
        const pick = (
          result: PromiseSettledResult<{ data?: { total?: number } }>,
        ) =>
          result.status === 'fulfilled'
            ? Number(result.value.data?.total) || 0
            : 0;
        setUnreadCount(pick(messages) + pick(notices));
      },
    );
  }, [initialState, location.pathname]);

  /**
   * 动态菜单 model
   */

  const { dynamicRoute, firstPath } = useModel('dynamicRoute');

  /**
   * 菜单（后端下发）
   */

  const menuData = useMemo(() => dynamicRoute ?? [], [dynamicRoute]);

  /**
   * 自动跳转首页
   */

  useEffect(() => {
    if (location.pathname === '/' && firstPath && firstPath !== '/') {
      history.replace(firstPath);
    }
  }, [location.pathname, firstPath]);

  useEffect(() => {
    if (initialState?.user?.pwdExpired && location.pathname !== '/pwdExpired') {
      history.replace('/pwdExpired');
    }
  }, [initialState?.user?.pwdExpired, location.pathname]);

  /**
   * 路由变化
   */

  const handlePageChange = () => {
    if (!initialState?.user || !isLogin(initialState)) {
      redirectToLogin(`${location.pathname}${location.search}`);
    }
  };

  if (AUTH_PATHS.includes(location.pathname)) {
    return <Outlet />;
  }

  /**
   * Layout
   */

  return (
    <DictProvider>
      <ProLayout
        title={defaultSettings.title}
        logo={defaultSettings.logo}
        location={location}
        appList={[
          {
            icon: 'https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg',
            title: 'Ant Design',
            desc: '杭州市较知名的 UI 设计语言',
            url: 'https://ant.design',
          },
          {
            icon: 'https://gw.alipayobjects.com/zos/antfincdn/FLrTNDvlna/antv.png',
            title: 'AntV',
            desc: '蚂蚁集团全新一代数据可视化解决方案',
            url: 'https://antv.vision/',
            target: '_blank',
          },
          {
            icon: 'https://gw.alipayobjects.com/zos/antfincdn/upvrAjAPQX/Logo_Tech%252520UI.svg',
            title: 'Pro Components',
            desc: '专业级 UI 组件库',
            url: 'https://procomponents.ant.design/',
          },
          {
            icon: 'https://img.alicdn.com/tfs/TB1zomHwxv1gK0jSZFFXXb0sXXa-200-200.png',
            title: 'umi',
            desc: '插件化的企业级前端应用框架。',
            url: 'https://umijs.org/zh-CN/docs',
          },
          {
            icon: 'https://gw.alipayobjects.com/zos/bmw-prod/8a74c1d3-16f3-4719-be63-15e467a68a24/km0cv8vn_w500_h500.png',
            title: 'qiankun',
            desc: '可能是你见过最完善的微前端解决方案🧐',
            url: 'https://qiankun.umijs.org/',
          },
          {
            icon: 'https://gw.alipayobjects.com/zos/rmsportal/XuVpGqBFxXplzvLjJBZB.svg',
            title: '语雀',
            desc: '知识创作与分享工具',
            url: 'https://www.yuque.com/',
          },
          {
            icon: 'https://gw.alipayobjects.com/zos/rmsportal/LFooOLwmxGLsltmUjTAP.svg',
            title: 'Kitchen ',
            desc: 'Sketch 工具集',
            url: 'https://kitchen.alipay.com/',
          },
          {
            icon: 'https://gw.alipayobjects.com/zos/bmw-prod/d3e3eb39-1cd7-4aa5-827c-877deced6b7e/lalxt4g3_w256_h256.png',
            title: 'dumi',
            desc: '为组件开发场景而生的文档工具',
            url: 'https://d.umijs.org/zh-CN',
          },
        ]}
        /**
         * 菜单
         */

        route={{
          path: '/',
          routes: menuData,
        }}
        /**
         * mix = 顶部 + 左侧
         */

        navTheme="light"
        layout={defaultSettings.layout as 'top' | 'side' | 'mix'}
        contentWidth={defaultSettings.contentWidth as 'Fluid' | 'Fixed'}
        /**
         * 顶部菜单
         */

        splitMenus
        /**
         * 页面变化
         */

        onPageChange={handlePageChange}
        /**
         * 菜单点击
         */

        menuItemRender={(item, dom) => {
          if (!item.path) return dom;

          return <Link to={item.path}>{dom}</Link>;
        }}
        /**
         * 顶部 actions
         */

        actionsRender={(props) => {
          if (props.isMobile) return [];
          return [
            props.layout !== 'side' ? (
              <SearchInput key="SearchInput" />
            ) : undefined,
            <Badge key="bell" count={unreadCount} size="small" offset={[-2, 2]}>
              <BellOutlined
                style={{ fontSize: 16, cursor: 'pointer' }}
                onClick={() => history.push('/user/message')}
              />
            </Badge>,
            <InfoCircleFilled key="InfoCircleFilled" />,
            <QuestionCircleFilled key="QuestionCircleFilled" />,
            <GithubFilled key="GithubFilled" />,
          ];
        }}
        /**
         * 头像
         */

        avatarProps={{
          src: initialState?.user?.avatar || 'https://i.pravatar.cc/40',
          size: 'small',
          title: initialState?.user?.nickname || initialState?.user?.username,
        }}
        /**
         * footer
         */

        onMenuHeaderClick={(e) => {
          e?.stopPropagation?.();
          history.push('/');
        }}
        footerRender={() => <Footer />}
        /**
         * 侧边栏
         */

        fixedHeader={defaultSettings.fixedHeader}
        fixSiderbar={defaultSettings.fixSiderbar}
        siderWidth={256}
        /**
         * breadcrumb
         */

        breadcrumbRender={(routers) =>
          routers?.map((item) => ({
            path: item.path,
            breadcrumbName: item.breadcrumbName,
          }))
        }
        {...initialState?.settings}
      >
        <WaterMark
          content={initialState?.user?.nickname || initialState?.user?.username}
        >
          <RouteAccess>
            {multiTab ? <RouteTabs key={authorizationKey} /> : <Outlet />}
          </RouteAccess>
        </WaterMark>

        <SettingDrawer
          pathname={location.pathname}
          enableDarkTheme
          hideHintAlert
          hideCopyButton
          disableUrlParams
          settings={(initialState as any)?.settings}
          onSettingChange={(changeSetting) => {
            const nextSettings = {
              ...initialState?.settings,
              ...changeSetting,
            };
            setInitialState({ ...initialState, settings: nextSettings });
            LayoutSetting.set(nextSettings);
          }}
        />

        {/* 智能助手：后端（guard-find-backend 与 guard-find-server）均无 /chat 接口，
            随 OFFLINE_MENU_PATHS 一并下线；后端就绪后去掉此处判断即可恢复 */}
        {isLogin(initialState) && !isOfflinePath('/chat') && <ChatFloat />}
      </ProLayout>
    </DictProvider>
  );
};

export default BaseLayout;
