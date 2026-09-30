import type { R } from '@/typings';
import { request } from 'umi';
import type { SysMenuDto, SysMenuQo, SysMenuVo } from './typings';
import { createCrud, resolveId, type Id } from '../../crud';

const crud = createCrud<SysMenuVo, SysMenuVo, SysMenuQo, SysMenuDto>('system/menu');

/** 菜单为树接口：`GET /system/menu/tree`（不分页） */
export async function query(body: Partial<SysMenuQo>) {
  return crud.tree(body) as unknown as Promise<R<SysMenuVo[]>>;
}

export async function create(body: SysMenuDto) {
  return crud.create(body);
}

/** 修改：`PUT /system/menu/{id}` */
export async function edit(body: SysMenuDto) {
  return crud.update(resolveId(body) as Id, body);
}

/** 删除：`DELETE /system/menu` + `{ids}` */
export async function del(body: SysMenuVo) {
  return crud.remove(body.id);
}

export async function getById(id: Id) {
  return crud.get(id);
}

/** 清理菜单缓存：`DELETE /system/menu/cache` */
export async function clearCache() {
  return request<R<null>>(`system/menu/cache`, { method: 'DELETE' });
}
