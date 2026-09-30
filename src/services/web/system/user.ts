import { request } from 'umi';
import type {
  SysUserDto,
  SysUserPassDto,
  SysUserQo,
  SysUserVo,
  UserImportParseResp,
  UserImportReq,
  UserImportResp,
} from './typing';
import type { PageResult, QueryParam, R } from '@/typings';
import { createCrud, type Id } from '../crud';
import { download } from '@/utils/download';
import { encryptByRsa } from '@/utils/Encrypt';

const crud = createCrud<SysUserVo, SysUserVo, SysUserQo, SysUserDto>('system/user');

export const getUser = (id: Id) => crud.get(id);
export const listUsers = (params?: Partial<SysUserQo>) => crud.list(params);

export async function query(body: QueryParam<SysUserQo>) {
  return crud.page(body);
}

/**
 * 新增：`POST /system/user`。
 * `password` 必须是 RSA 密文（`UserServiceImpl` 用私钥解密），在这里统一加密，
 * 避免各调用点漏加密导致"密码解密失败"。
 */
export async function create(body: SysUserDto) {
  return crud.create({
    ...body,
    password: body.password ? encryptByRsa(body.password) : body.password,
  });
}

/** 修改：`PUT /system/user/{id}`，`UserReq` 无 id 字段，主键只走路径 */
export async function edit(body: SysUserDto) {
  const { id, ...req } = body;
  if (id === undefined || id === null) {
    throw new Error('[user.edit] 缺少 id，无法定位要修改的用户');
  }
  return crud.update(id, req as SysUserDto);
}

/** 删除：后端仅开放批量形态 `DELETE /system/user` + `{ids}` */
export async function del(body: SysUserVo) {
  return crud.remove(body.id);
}

export async function delBatch(ids: Id[]) {
  return crud.remove(ids);
}

/**
 * 重置密码：`PATCH /system/user/{id}/password`，body 为 `{ newPassword }`，
 * 且必须是 RSA 公钥加密后的密文（后端 `SecureUtils.decryptPasswordByRsaPrivateKey`）。
 */
export function changePassword(body: SysUserPassDto) {
  return request<R<null>>(`system/user/${body.userId}/password`, {
    method: 'PATCH',
    data: { newPassword: encryptByRsa(body.pass) },
  });
}

/**
 * 分配角色：`PATCH /system/user/{id}/role`，body 为 `{ roleIds }`。
 * 取代旧版 `scope` 接口（后端无数据权限独立接口，数据权限由角色 `dataScope` 决定）。
 */
export function assignRoles(userId: Id, roleIds: Id[]) {
  return request<R<null>>(`system/user/${userId}/role`, {
    method: 'PATCH',
    data: { roleIds },
  });
}

/**
 * 启用/禁用用户（支持批量）。
 *
 * 后端没有 `PUT /system/user/status`，状态是 `UserReq.status`（`DisEnableStatusEnum`
 * 1 正常 / 2 禁用）的一部分，而 `UserReq` 对 `username` 等有非空校验，
 * 因此逐条"取详情 → 回写状态"。选中量通常为个位数，串行即可避免并发写冲突。
 */
export async function updateStatus(ids: Id[], status: 1 | 2) {
  const list = [...new Set(ids)];
  for (const id of list) {
    const detail = await crud.get(id);
    if (!detail?.data) throw new Error(`用户 ${id} 不存在，无法变更状态`);
    const {
      id: _id,
      createTime: _c,
      updateTime: _u,
      createUser: _cu,
      updateUser: _uu,
      deptName: _dn,
      roleNames: _rn,
      password: _p,
      ...rest
    } = detail.data as Record<string, any>;
    await crud.update(id, { ...rest, status } as unknown as SysUserDto);
  }
  return {
    code: '0',
    msg: '操作成功',
    success: true,
    timestamp: Date.now(),
    data: null,
  } as R<null>;
}

/** 导出用户：`GET /system/user/export`（octet-stream，绕过响应信封） */
export async function exportUsers(params?: Partial<SysUserQo>) {
  await download(crud.exportUrl(), {
    method: 'GET',
    params,
    filename: `用户列表-${Date.now()}.xlsx`,
  });
}

/** 下载导入模板：`GET /system/user/import/template` */
export async function downloadImportTemplate() {
  await download('system/user/import/template', {
    method: 'GET',
    filename: '用户导入模板.xlsx',
  });
}

/**
 * 解析导入文件：`POST /system/user/import/parse`（multipart，字段名 `file`）。
 * 只返回统计与 `importKey`，**不入库**；确认后再调 `importUsers`。
 */
export async function parseImport(file: File) {
  const fd = new FormData();
  fd.append('file', file);
  return request<R<UserImportParseResp>>('system/user/import/parse', {
    method: 'POST',
    data: fd,
  });
}

/** 提交导入：`POST /system/user/import`，携带 `importKey` 与重复策略 */
export async function importUsers(body: UserImportReq) {
  return request<R<UserImportResp>>('system/user/import', {
    method: 'POST',
    data: body,
  });
}
