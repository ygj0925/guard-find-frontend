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

/**
 * 用户查询条件 = 后端 `UserQuery`。
 *
 * `roleId` 是**排除**语义：`UserServiceImpl.buildQueryWrapper` 把它换成
 * `notIn(id, userRoleService.listUserIdByRoleId(roleId))`，用于"给角色挑尚未拥有的用户"。
 */
export type SysUserQo = {
  // 关键词（后端对 username / nickname / description 做 OR 模糊）
  description?: string;
  // 登录账号
  username?: string;
  // 昵称
  nickname?: string;
  // 状态(1-启用,2-禁用)
  status?: 1 | 2;
  // 部门ID
  deptId?: number;
  // 限定在这些用户 ID 内
  userIds?: number[];
  // 排除已拥有该角色的用户
  roleId?: number;
  // 创建时间区间：['YYYY-MM-DD 00:00:00','YYYY-MM-DD 23:59:59']
  createTime?: string[];
};

/**
 * 用户新增/编辑请求体 = 后端 `UserReq`。
 *
 * 注意：`password` 只在新增时必填（`CrudValidationGroup.Create`），且必须是 RSA 公钥加密后的
 * 密文（`UserServiceImpl` 用 `SecureUtils.decryptPasswordByRsaPrivateKey` 解密）；
 * 编辑走 `PUT /system/user/{id}`，主键在路径、不在 body。
 */
export type SysUserDto = {
  // 编辑时由调用方带上，服务层取它拼到路径里
  id?: number;
  // 登录账号
  username: string;
  // 昵称
  nickname: string;
  // 密码（RSA 密文，仅新增必填）
  password?: string;
  // 电子邮件
  email?: string;
  // 手机号
  phone?: string;
  // 性别(0-未知,1-男,2-女)
  gender?: number;
  // 部门ID
  deptId?: number;
  // 角色ID列表
  roleIds?: number[];
  // 描述
  description?: string;
  // 状态(1-启用, 2-禁用) DisEnableStatusEnum
  status?: number;
};

/** 重置密码请求体（`pass` 为明文，服务层负责 RSA 加密后发给后端） */
export type SysUserPassDto = {
  userId: number;
  pass: string;
};

/**
 * 用户导入相关类型（对齐后端 `UserImportParseResp` / `UserImportReq` / `UserImportResp`）。
 *
 * 流程：下载模板 → `POST /system/user/import/parse` 上传文件拿 `importKey` 与行数统计
 * → `POST /system/user/import` 带 `importKey` 与三个重复策略真正入库。
 * 策略取值后端 `ImportPolicyEnum`：1 跳过该行 / 2 修改数据 / 3 停止导入。
 */
export type ImportPolicy = 1 | 2 | 3;

export type UserImportParseResp = {
  importKey: string;
  totalRows: number;
  validRows: number;
  duplicateUserRows?: number;
  duplicateEmailRows?: number;
  duplicatePhoneRows?: number;
};

export type UserImportReq = {
  importKey: string;
  duplicateUser: ImportPolicy;
  duplicateEmail: ImportPolicy;
  duplicatePhone: ImportPolicy;
  /** 新用户默认状态：1 启用 / 2 禁用（DisEnableStatusEnum） */
  defaultStatus: 1 | 2;
};

export type UserImportResp = {
  totalRows: number;
  insertRows: number;
  updateRows: number;
};
