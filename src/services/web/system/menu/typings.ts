/**
 * 菜单（后端 `MenuController`，路径 `/system/menu`）。
 * 字段名对齐 `MenuReq` / `MenuResp`；`type` 取值来自后端 `MenuTypeEnum`：
 * 1 目录 / 2 菜单 / 3 按钮（不是 ballcat 的 0/1/2）。
 */

/** 查询条件 = 后端 `MenuQuery` */
export type SysMenuQo = {
  // 菜单标题
  title?: string;
  // 状态(1-启用, 2-禁用)
  status?: 1 | 2;
};

/** 树节点（`GET /system/menu/tree` → `MenuResp` + `children`） */
export type SysMenuVo = {
  id: number;
  parentId: number;
  // 菜单标题
  title: string;
  // 菜单类型：1目录 2菜单 3按钮
  type: number;
  // 路由地址
  path: string;
  // 组件名称
  name?: string;
  // 组件路径（相对 src/pages，不含扩展名），如 system/user/index
  component?: string;
  // 重定向地址
  redirect?: string;
  // 菜单图标
  icon?: string;
  // 是否外链
  isExternal?: boolean;
  // 是否缓存
  isCache?: boolean;
  // 是否隐藏
  isHidden?: boolean;
  // 权限标识
  permission?: string;
  // 显示排序
  sort: number;
  // 状态(1-启用, 2-禁用)
  status: number;
  // 创建时间
  createTime?: string;
  // 子级
  children?: SysMenuVo[];
};

/** 新增/修改请求体 = 后端 `MenuReq`（编辑时主键走 `PUT /system/menu/{id}` 路径） */
export type SysMenuDto = {
  id?: number;
  parentId?: number;
  // 菜单类型：1目录 2菜单 3按钮
  type: number;
  // 菜单标题
  title: string;
  // 图标
  icon?: string;
  // 排序
  sort?: number;
  // 权限标识（type=3 按钮时使用）
  permission?: string;
  // 路由地址
  path?: string;
  // 组件名称
  name?: string;
  // 组件路径
  component?: string;
  // 重定向地址
  redirect?: string;
  // 是否外链
  isExternal?: boolean;
  // 是否缓存
  isCache?: boolean;
  // 是否隐藏
  isHidden?: boolean;
  // 状态(1-启用, 2-禁用)
  status?: number;
};
