import type { ProjectSetting } from '@/config/defaultSettings';

declare module 'slash2';
declare module '*.css';
declare module '*.less';
declare module '*.scss';
declare module '*.sass';
declare module '*.svg';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.bmp';
declare module '*.tiff';
declare module 'omit.js';
declare module '@antv/data-set';
declare module 'react-fittext';
declare module 'bizcharts-plugin-slider';

// preview.pro.ant.design only do not use in your production ;
// preview.pro.ant.design 专用环境变量，请不要在你的项目中使用它。
declare let ANT_DESIGN_PRO_ONLY_DO_NOT_USE_IN_YOUR_PRODUCTION:
  | 'site'
  | undefined;

declare const REACT_APP_ENV: 'prod' | 'dev' | 'pre' | false;

/**
 * 后端统一响应信封（`top.continew.starter.web.model.R`）。
 *
 * 成功：`{ code: '0', msg: '操作成功', data, success: true, timestamp }`
 * 失败：HTTP 状态码仍为 200，`code` 为 '400'/'401'/'403'/'404'/'405'/'500'/'1'，
 * 提示文案在 `msg`（不是 `message`/`errorMessage`）。
 */
export type R<T> = {
  code: string;
  msg: string;
  data: T;
  success: boolean;
  timestamp: number;
};

export type QueryParam<T> = {
  page: number;
  size: number;
  sort?: string[];
} & Partial<T>;

export type PageResult<T> = {
  total: number;
  list: T[];
};

export type SelectData<T> = {
  // 显示的数据
  name: string;
  // 选中获取的属性
  value: any;
  // 是否被选中
  selected: boolean;
  // 是否禁用
  disabled: boolean;
  // 分组标识
  type: string;
  // 扩展对象
  extendObj: T;
};

export type TreeNode<T> = {
  title: string;
  key: any;
  disabled?: boolean;
  checkable?: boolean;
  selectable?: boolean;
  children?: TreeNode<T>[];
} & T;

declare namespace GLOBAL {
  type Is = {
    settings?: Partial<ProjectSetting>;
    routerLoad?: boolean;
    user?: GLOBAL.UserInfo;
  };

  /**
   * 动态路由项 = 后端 `RouteResp`（`GET /auth/user/route`）。
   *
   * 注意 `RouteResp` 带 `@JsonInclude(NON_EMPTY)`：`isExternal/isCache/isHidden`
   * 为 `false`、`sort` 为 `0`、空字符串字段都会**整体不下发**，
   * 因此除 `id/title/type/path` 外一律按可选处理并显式取默认值。
   * 历史 ballcat 字段（`hidden`/`uri`/`targetType`/`keepAlive`/`remarks`/`status`）后端不存在，已删除。
   */
  type Router = {
    id: number | string;
    parentId?: number | string;
    title: string;
    /** 菜单类型：1 目录 / 2 菜单 / 3 按钮（后端 MenuTypeEnum） */
    type: 1 | 2 | 3;
    path?: string;
    /** 组件名称，如 User */
    name?: string;
    /** 组件路径，如 /system/user/index */
    component?: string;
    redirect?: string;
    icon?: string;
    isExternal?: boolean;
    isCache?: boolean;
    isHidden?: boolean;
    permission?: string;
    sort?: number;
    children?: Router[];
    activeMenu?: string;
    roles?: string[];
  };

  type UserInfo = {
    id: string;
    username: string;
    nickname: string;
    gender: 0 | 1 | 2;
    email: string;
    phone: string;
    avatar: string;
    pwdResetTime: string;
    pwdExpired: boolean;
    registrationDate: string;
    deptName: string;
    roles: string[];
    roleNames: string[];
    permissions: string[];
  };
}
