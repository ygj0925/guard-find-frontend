/**
 * 角色（后端 `RoleController`，路径 `/system/role`）。
 * 字段对齐 `RoleReq` / `RoleResp`；数据权限取值来自 `DataScopeEnum`
 * （1 全部 / 2 本部门及以下 / 3 本部门 / 4 仅本人 / 5 自定义）。
 *
 * 注意：功能权限（菜单）**不在** `RoleReq` 里，必须走
 * `PUT /system/role/{id}/permission`（body `{roleId, menuIds}`）。
 */

/** 列表/详情响应（`RoleResp` / `RoleDetailResp` 的公共部分） */
export type SysRoleVo = {
  id: number;
  // 角色名称
  name: string;
  // 角色编码
  code: string;
  // 数据权限：1全部 2本部门及以下 3本部门 4仅本人 5自定义
  dataScope?: number;
  // 显示排序
  sort?: number;
  // 是否系统内置
  isSystem?: boolean;
  // 描述
  description?: string;
  // 创建人
  createUserString?: string;
  // 创建时间
  createTime?: string;
};

/**
 * 历史别名：响应实体。
 * 请求体请用 `SysRoleDto`（后端 `RoleReq` 里没有 `type`/`remarks`/`scopeType`）。
 */
export type SysRole = SysRoleVo;

/** 新增/修改请求体 = 后端 `RoleReq`（编辑时主键走 `PUT /system/role/{id}` 路径） */
export type SysRoleDto = {
  id?: number;
  name: string;
  code: string;
  sort?: number;
  description?: string;
  dataScope?: number;
  // dataScope=5 自定义时使用的部门集合
  deptIds?: number[];
  deptCheckStrictly?: boolean;
};

/** 查询条件 = 后端 `RoleQuery` */
export type SysRoleQo = {
  name?: string;
  code?: string;
  description?: string;
};

/** 角色关联用户查询（`RoleUserQuery` 继承通用查询） */
export type SysRoleBindQo = {
  description?: string;
  status?: 1 | 2;
};

/** 角色关联用户（`RoleUserResp`） */
export type SysRoleBindVo = {
  id: number;
  roleId: number;
  userId: number;
  username: string;
  nickname: string;
  gender?: number;
  status?: number;
  isSystem?: boolean;
  description?: string;
  deptId?: number;
  deptName?: string;
  roleIds?: number[];
  roleNames?: string[];
};

/** 角色权限树节点（`RolePermissionResp`） */
export type SysRolePermissionVo = {
  id: number;
  title: string;
  parentId: number;
  type: number;
  permission?: string;
  children?: SysRolePermissionVo[];
};
