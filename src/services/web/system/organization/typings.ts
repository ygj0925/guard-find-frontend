/**
 * 部门（后端 `DeptController`，路径为 `/system/dept`）。
 * 字段名与后端 `DeptReq` / `DeptResp` 一致，不要沿用 ballcat 时代的 `remarks`/`hierarchy`。
 */

/** 树节点（`GET /system/dept/tree` → `DeptResp` + `children`） */
export type SysOrganizationVo = {
  id: number;
  // 部门名称
  name: string;
  // 父级ID
  parentId: number;
  // 状态(1-启用, 2-禁用) DisEnableStatusEnum
  status: number;
  // 是否内置
  isSystem?: boolean;
  // 描述
  description?: string;
  // 排序字段，由小到大
  sort: number;
  // 创建人
  createUserString?: string;
  // 创建时间
  createTime?: string;
  // 下级部门
  children: SysOrganizationVo[];
};

/** 新增/修改请求体 = 后端 `DeptReq`（编辑时主键走 `PUT /system/dept/{id}` 路径） */
export type SysOrganizationDto = {
  id?: number;
  // 父级ID
  parentId?: number;
  // 部门名称
  name: string;
  // 排序
  sort?: number;
  // 描述
  description?: string;
  // 状态(1-启用, 2-禁用)
  status?: number;
};

/** 查询条件 = 后端 `DeptQuery`（继承 CommonQuery：name、description、status） */
export type SysOrganizationQo = {
  name?: string;
  description?: string;
  status?: 1 | 2;
};
