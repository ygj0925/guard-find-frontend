import type { ProLayoutProps } from '@ant-design/pro-components';

export type ProjectSetting = ProLayoutProps & {
  pwa?: boolean;
  logo?: string;
  historyType: 'browser' | 'hash' | 'memory';
  // 是否开启国际化
  i18n: boolean;
  // 是否开始websocket连接
  websocket: boolean;
  // 默认语言
  defaultLocal: 'zh-CN' | 'en-US';
  // 是否展示水印
  waterMark: boolean;
  // 是否展示顶部多页签
  multiTab: boolean;
  // 顶部多页签风格
  multiTabStyle?: 'default' | 'card';
  storageOptions: {
    // 缓存key 前缀
    namespace: string;
    // 缓存类型, 目前仅支持 localStorage
    storage: 'local';
  };
};

/**
 * @name
 */
const Settings: ProjectSetting & {
  pwa?: boolean;
  logo?: string;
} = {
  navTheme: 'light',
  historyType: 'browser',
  // 拂晓蓝
  colorPrimary: '#1890ff',
  layout: 'top',
  contentWidth: 'Fluid',
  fixedHeader: true,
  fixSiderbar: true,
  colorWeak: false,
  title: 'Ant Design Pro',
  pwa: true,
  footerRender: false,
  logo: 'https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg',
  iconfontUrl: '',
  i18n: true,
  websocket: false,
  defaultLocal: 'zh-CN',
  waterMark: true,
  multiTab: true,
  storageOptions: {
    namespace: process.env.namespaceName as string,
    storage: 'local',
  },
  token: {
    // 参见ts声明，demo 见文档，通过token 修改样式
    //https://procomponents.ant.design/components/layout#%E9%80%9A%E8%BF%87-token-%E4%BF%AE%E6%94%B9%E6%A0%B7%E5%BC%8F
  },
};

export default Settings;
