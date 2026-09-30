import type { R } from '@/typings';
import { request } from 'umi';
import type {
  SysDict,
  SysDictData,
  SysDictDataItem,
  SysDictQo,
  SysDictVo,
} from './typing';
import { createCrud, resolveId, type Id, type LabelValue } from '../../crud';

const crud = createCrud<SysDictVo, SysDictVo, SysDictQo, SysDict>('system/dict');

/** 字典列表：`GET /system/dict/list`（后端不分页） */
export async function query(body: Partial<SysDictQo>) {
  return crud.list(body) as unknown as Promise<R<SysDictVo[]>>;
}

export async function create(body: SysDict) {
  return crud.create(body);
}

/** 修改：`PUT /system/dict/{id}` */
export async function edit(body: SysDict) {
  return crud.update(resolveId(body) as Id, body);
}

/** 删除：`DELETE /system/dict` + `{ids}` */
export async function del(id: Id) {
  return crud.remove(id);
}

/**
 * 清理后端字典缓存：`DELETE /system/dict/cache/{code}`。
 * 取代旧版 `system/dict/invalid-hash`（后端无该接口）。
 */
export async function clearCache(code?: string) {
  return request<R<null>>(
    `system/dict/cache/${encodeURIComponent(code || 'all')}`,
    { method: 'DELETE' },
  );
}

/** 单个字典项：`GET /system/common/dict/{code}` → `[{label,value,description}]` */
export async function dictByCode(code: string): Promise<R<LabelValue[]>> {
  return request<R<LabelValue[]>>(
    `system/common/dict/${encodeURIComponent(code)}`,
    { method: 'GET' },
  );
}

/**
 * 批量取字典。
 *
 * 后端只提供按 code 的单取接口，这里并发拉取并组装成调用方沿用的
 * `SysDictData` 结构（`dictItems[].name` 即后端 `label`）。
 */
export async function dictData(codes: string[]): Promise<R<SysDictData[]>> {
  const unique = [...new Set(codes.filter(Boolean))];
  const results = await Promise.all(
    unique.map(async (code) => {
      const response = await dictByCode(code);
      const items: SysDictDataItem[] = (response?.data || []).map((item, index) => ({
        id: index,
        name: item.label,
        value: String(item.value),
        attributes: {},
        realVal: item.value,
      }));
      const data: SysDictData = {
        dictCode: code,
        hashCode: '',
        valueType: 2,
        dictItems: items,
        loading: false,
      };
      return data;
    }),
  );
  return {
    code: '0',
    msg: '操作成功',
    success: true,
    timestamp: Date.now(),
    data: results,
  } as R<SysDictData[]>;
}
