export type SysUserVo = {
  // 用户ID
  id: number;
  // 登录账号
  username: string;
  // 昵称
  nickname: string;
  // 头像
  avatar: string;
  // 性别(0-未知,1-男,2-女)
  gender: number;
  // 电子邮件
  email: string;
  // 电话（列表返回脱敏数据）
  phone: string;
  // 状态(1-启用, 2-禁用)
  status: number;
  // 是否内置用户
  isSystem?: boolean;
  // 描述
  description?: string;
  // 部门ID
  deptId?: number;
  // 部门名称
  deptName?: string;
  // 角色ID列表
  roleIds?: number[];
  // 角色名称列表
  roleNames?: string[];
  // 创建人
  createUserString?: string;
  // 创建时间
  createTime?: string;
};

export type SysUserQo = {
  // 登录账号
  username?: string;
  // 昵称
  nickname?: string;
  // 状态(1-启用,2-禁用)
  status?: 1 | 2;
  // 部门ID
  deptId?: number;
};

export type SysUserDto = {
  // 主键id
  userId: number;
  // 前端传入密码-
  pass: string;
  // 登录账号
  username: string;
  // 昵称
  nickname: string;
  // 头像
  avatar: string;
  // 性别(0-默认未知,1-男,2-女)
  gender: number;
  // 电子邮件
  email: string;
  // 电话
  phoneNumber: string;
  // 状态(1-正常,2-冻结)
  status: number;
  // 组织机构ID
  organizationId: number;
  // 角色标识列表
  roleCodes: string[];
};

export type SysUserScopeVo = {
  roleCodes: string[];
};

export type SysUserScopeDto = {
  userId: number;
  username?: string;
  roleCodes: string[];
};

export type SysUserPassDto = {
  userId: number;
  username?: string;
  pass: string;
  confirmPass?: string;
};
