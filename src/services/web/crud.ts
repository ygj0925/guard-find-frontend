import { request } from 'umi';
import type { PageResult, QueryParam, R } from '@/typings';

/**
 * ContiNew CRUD 契约工厂。
 *
 * 后端 `@CrudRequestMapping` + `AbstractCrudController` 固定派生如下端点，
 * 前端不得自行发明动词或把 id 放进 body：
 *
 * | 能力        | 请求                                         |
 * | ----------- | -------------------------------------------- |
 * | 分页        | `GET <base>?page&size&sort=f,desc`           |
 * | 列表/树     | `GET <base>/list`、`GET <base>/tree`         |
 * | 详情        | `GET <base>/{id}`                            |
 * | 新增        | `POST <base>` → `data:{id}`                  |
 * | 修改        | `PUT <base>/{id}`                            |
 * | 删除/批删   | `DELETE <base>` + body `{ ids: [...] }`      |
 * | 导出        | `GET <base>/export`（octet-stream）          |
 * | 下拉字典    | `GET <base>/dict`、`GET <base>/dict/tree`    |
 */

export type Id = string | number;

export interface LabelValue {
  label: string;
  value: string | number;
  description?: string;
  disabled?: boolean;
  extra?: unknown;
}

export interface CrudOptions {
  /** 关闭分页（后端仅暴露 list/tree 的模块） */
  pagination?: false;
  /** 不生成某些方法，便于按需覆写 */
  omit?: Array<
    'page' | 'list' | 'tree' | 'get' | 'create' | 'update' | 'remove' | 'export' | 'dict'
  >;
}

import { serializeParams } from '@/utils/params';

/**
 * 查询串序列化统一在 `@/utils/params`（请求层全局也用同一个实现，
 * 这样手写服务的 `sort` / `createTime` 数组参数同样能按重复键下发）。
 */
export { serializeParams };

/** 统一删除入参：标量、数组、`{ids}` 都归一化为数组 */
export function toIds(
  input: Id | Id[] | { ids?: Id[] | Id } | undefined | null,
): Id[] {
  if (input === undefined || input === null) return [];
  if (Array.isArray(input)) return input;
  if (typeof input === 'object') {
    const ids = (input as { ids?: Id[] | Id }).ids;
    if (Array.isArray(ids)) return ids;
    return ids === undefined || ids === null ? [] : [ids];
  }
  return [input];
}

/** 工厂产出的方法集合（`pagination:false` 或 `omit` 后对应方法为 undefined） */
export interface CrudApi<L, D, Q, C> {
  page(params: QueryParam<Q>): Promise<R<PageResult<L>>>;
  list(params?: Partial<Q>): Promise<R<L[]>>;
  tree(params?: Partial<Q>): Promise<R<L[]>>;
  get(id: Id): Promise<R<D>>;
  create(body: C): Promise<R<{ id: Id }>>;
  update(id: Id, body: C): Promise<R<null>>;
  remove(ids: Id | Id[] | { ids?: Id[] | Id } | undefined | null): Promise<R<null>>;
  exportUrl(): string;
  dict(params?: Record<string, any>): Promise<R<LabelValue[]>>;
  treeDict(params?: Record<string, any>): Promise<R<LabelValue[]>>;
}

/**
 * 从旧版（ballcat 风格）payload 中取主键：优先 `id`，其次 `<entity>Id`（如 `userId`）。
 * 后端 ContiNew 的 `*Req` 不含 id，id 只走路径，多余字段会被 Jackson 忽略。
 */
export function resolveId(body: Record<string, any> | undefined | null): Id | undefined {
  if (!body) return undefined;
  if (body.id !== undefined && body.id !== null) return body.id;
  for (const [key, value] of Object.entries(body)) {
    if (/Id$/.test(key) && value !== undefined && value !== null && !Array.isArray(value)) {
      return value as Id;
    }
  }
  return undefined;
}

export function createCrud<L = any, D = L, Q = any, C = any>(
  base: string,
  options: CrudOptions = {},
) {
  const skip = new Set<string>(options.omit || []);
  const enabled = (name: string) => !skip.has(name);

  const api = {
    /** 分页列表：`GET <base>` */
    page(
      params: QueryParam<Q>,
    ): Promise<R<PageResult<L>>> {
      return request(base, { method: 'GET', params, paramsSerializer: serializeParams });
    },
    /** 非分页列表：`GET <base>/list` */
    list(params?: Partial<Q>): Promise<R<L[]>> {
      return request(`${base}/list`, {
        method: 'GET',
        params,
        paramsSerializer: serializeParams,
      });
    },
    /** 树：`GET <base>/tree` */
    tree(params?: Partial<Q>): Promise<R<L[]>> {
      return request(`${base}/tree`, {
        method: 'GET',
        params,
        paramsSerializer: serializeParams,
      });
    },
    /** 详情：`GET <base>/{id}` */
    get(id: Id): Promise<R<D>> {
      return request(`${base}/${id}`, { method: 'GET' });
    },
    /** 新增：`POST <base>`，成功返回 `data:{id}` */
    create(body: C): Promise<R<{ id: Id }>> {
      return request(base, { method: 'POST', data: body });
    },
    /** 修改：`PUT <base>/{id}`，id 只在路径上 */
    update(id: Id, body: C): Promise<R<null>> {
      if (id === undefined || id === null || id === '') {
        throw new Error(`[crud] update('${base}') 缺少路径 id`);
      }
      return request(`${base}/${id}`, { method: 'PUT', data: body });
    },
    /** 批量删除（含单条）：`DELETE <base>` + `{ids}` */
    remove(ids: Id | Id[] | { ids?: Id[] | Id } | undefined | null): Promise<R<null>> {
      const list = toIds(ids);
      if (list.length === 0) {
        throw new Error(`[crud] remove('${base}') 未取到 id，请检查记录主键字段`);
      }
      return request(base, { method: 'DELETE', data: { ids: list } });
    },
    /** 导出：`GET <base>/export`（二进制，交由 utils/download 处理） */
    exportUrl(): string {
      return `${base}/export`;
    },
    /** 下拉字典：`GET <base>/dict`（后端免权限校验） */
    dict(params?: Record<string, any>): Promise<R<LabelValue[]>> {
      return request(`${base}/dict`, {
        method: 'GET',
        params,
        paramsSerializer: serializeParams,
      });
    },
    /** 树形下拉字典：`GET <base>/dict/tree` */
    treeDict(params?: Record<string, any>): Promise<R<LabelValue[]>> {
      return request(`${base}/dict/tree`, {
        method: 'GET',
        params,
        paramsSerializer: serializeParams,
      });
    },
  } as Record<string, any>;

  if (options.pagination === false) delete api.page;
  if (!enabled('export')) delete api.exportUrl;
  return api as CrudApi<L, D, Q, C>;
}
