import type { R } from '@/typings';
import type {
  SysOrganizationDto,
  SysOrganizationQo,
  SysOrganizationVo,
} from './typings';
import { createCrud, resolveId, type Id } from '../../crud';
import { download } from '@/utils/download';

const crud = createCrud<
  SysOrganizationVo,
  SysOrganizationVo,
  SysOrganizationQo,
  SysOrganizationDto
>('system/dept');

/** 部门为树接口：`GET /system/dept/tree`（不分页） */
export async function query(body?: Partial<SysOrganizationQo>) {
  return crud.tree(body) as unknown as Promise<R<SysOrganizationVo[]>>;
}

export async function tree() {
  return crud.tree() as unknown as Promise<R<SysOrganizationVo[]>>;
}

export async function create(body: SysOrganizationDto) {
  return crud.create(body);
}

/** 修改：`PUT /system/dept/{id}` */
export async function edit(body: SysOrganizationDto) {
  return crud.update(resolveId(body) as Id, body);
}

/** 删除：`DELETE /system/dept` + `{ids}` */
export async function del(body: SysOrganizationVo) {
  return crud.remove((body as { id?: Id }).id ?? resolveId(body as Record<string, any>));
}

export async function getById(id: Id) {
  return crud.get(id);
}

/** 导出部门：`GET /system/dept/export` */
export async function exportDepts(params?: Partial<SysOrganizationQo>) {
  await download(crud.exportUrl(), {
    method: 'GET',
    params,
    filename: `部门列表-${Date.now()}.xlsx`,
  });
}

/** 部门下拉树：`GET /system/dept/dict/tree` */
export async function treeDict() {
  return crud.treeDict();
}
