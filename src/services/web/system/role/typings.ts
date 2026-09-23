export type SysRole = {
  // 角色编号
  id: number;
  // 角色名称
  name: string;
  // 角色标识
  code: string;
  // 角色备注
  remarks: string;
  // 角色类型，1：系统角色 2：业务角色
  type: 1 | 2;
  // 逻辑删除标识，已删除:0，未删除：删除时间戳
  deleted: string;
  // 创建时间
  createTime: string;
  // 修改时间
  updateTime: string;
  // 数据权限：1全部，2本人，3本人及子部门，4本部门
  scopeType: 1 | 2 | 3 | 4;
};

export type SysRoleQo = {
  // 角色名称
  name?: string;
  // 角色标识
  code?: string;
};

export type SysRoleVo = {
  // 角色编号
  id: number;
  // 角色名称
  name: string;
  // 角色标识
  code: string;
  // 数据权限：1全部，2本人，3本人及子部门，4本部门
  dataScope: number;
  // 排序
  sort?: number;
  // 是否内置角色
  isSystem?: boolean;
  // 描述
  description?: string;
  // 创建人
  createUserString?: string;
  // 创建时间
  createTime?: string;
};

export type SysRoleBindQo = {
  // 关键词
  description?: string;
};

export type SysRoleBindVo = {
  // 用户角色关联ID
  id: number;
  // 角色 ID
  roleId: number;
  // 用户ID
  userId: number;
  // 登录账号
  username: string;
  // 昵称
  nickname: string;
  // 部门名称
  deptName?: string;
  // 状态(1-启用, 2-禁用)
  status?: number;
};
