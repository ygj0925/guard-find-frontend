import type { R } from '@/typings';
import { request } from 'umi';
import type { SysRoleDto, SysRoleQo, SysRoleVo } from '../';
import type { SysRoleBindQo, SysRoleBindVo } from './typings';
import { createCrud, resolveId, type Id, type LabelValue } from '../../crud';
import type { PageResult, QueryParam } from '@/typings';

const crud = createCrud<SysRoleVo, SysRoleVo, SysRoleQo, SysRoleDto>(
  'system/role',
);

/** 角色为 `GET /system/role/list`（后端未开放分页） */
export async function query(body: Partial<SysRoleQo>) {
  return crud.list(body) as unknown as Promise<R<SysRoleVo[]>>;
}

export async function create(body: SysRoleDto) {
  return crud.create(body);
}

/** 修改：`PUT /system/role/{id}`；功能权限不在本接口，用 `updatePermissionIds` */
export async function edit(body: SysRoleDto) {
  const { id, ...req } = body;
  if (id === undefined || id === null) {
    throw new Error('[role.edit] 缺少 id，无法定位要修改的角色');
  }
  return crud.update(id, req as SysRoleDto);
}

/** 删除：`DELETE /system/role` + `{ids}` */
export async function del(body: SysRoleVo) {
  return crud.remove(
    (body as { id?: Id }).id ?? resolveId(body as Record<string, any>),
  );
}

export async function getById(id: Id) {
  return crud.get(id);
}

export async function listRoles() {
  return crud.list() as unknown as Promise<R<SysRoleVo[]>>;
}

/** 角色下拉字典：`GET /system/role/dict`，元素为 `{label,value}` */
export async function listSelectData() {
  return crud.dict() as unknown as Promise<R<LabelValue[]>>;
}

/** 角色功能权限树：`GET /system/role/permission/tree` */
export async function getPermissionTree() {
  return request<R<any[]>>(`system/role/permission/tree`, { method: 'GET' });
}

/** 角色已勾选的菜单 ID 集合：取自详情 `GET /system/role/{id}` 的 `menuIds` */
export async function getPermissionIds(roleId: Id) {
  const response = await crud.get(roleId);
  const menuIds = (response?.data as unknown as { menuIds?: Id[] })?.menuIds || [];
  return { ...response, data: menuIds } as R<Id[]>;
}

/** 修改角色功能权限：`PUT /system/role/{id}/permission` */
export async function updatePermissionIds(roleId: Id, menuIds: Id[]) {
  return request<R<null>>(`system/role/${roleId}/permission`, {
    method: 'PUT',
    data: { roleId, menuIds },
  });
}

/** 角色关联用户（分页）：`GET /system/role/{id}/user` */
export async function listRoleBindUser(roleId: Id, body: QueryParam<SysRoleBindQo>) {
  return request<R<PageResult<SysRoleBindVo>>>(`system/role/${roleId}/user`, {
    method: 'GET',
    params: body,
  });
}

/**
 * 取消分配：`DELETE /system/role/user`。
 * 注意此接口 body 为**裸数组**（后端形参 `List<Long> userRoleIds`），不是 `{ids}`，
 * 且元素是 `sys_user_role.id`（后端 `userRoleService.deleteByIds`），不是用户 ID。
 */
export async function unbindUser(userRoleId: Id) {
  return unbindUsers([userRoleId]);
}

/** 批量取消分配：`DELETE /system/role/user` + 裸数组（元素为绑定关系 ID） */
export async function unbindUsers(userRoleIds: Id[]) {
  return request<R<null>>(`system/role/user`, {
    method: 'DELETE',
    data: userRoleIds,
  });
}

/** 角色已绑定的用户 ID 列表：`GET /system/role/{id}/user/id` */
export async function listBoundUserIds(roleId: Id) {
  return request<R<Id[]>>(`system/role/${roleId}/user/id`, { method: 'GET' });
}

/** 分配用户给角色：`POST /system/role/{id}/user`，body 为裸数组（用户 ID） */
export async function assignUsers(roleId: Id, userIds: Id[]) {
  if (!userIds.length) {
    throw new Error('[role.assignUsers] 用户列表不能为空（后端 @NotEmpty）');
  }
  return request<R<null>>(`system/role/${roleId}/user`, {
    method: 'POST',
    data: userIds,
  });
}
