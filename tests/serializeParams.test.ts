/**
 * serializeParams 回归测试。
 *
 * 起因：阶段 2 首版把查询串带上了前导 `?`，而 axios 0.27 的 `buildURL` 会自己补
 * `?`/`&`（`url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams`），
 * 结果所有走 CRUD 工厂的 GET 请求拼成 `/path??page=1`，分页参数直接失效。
 * 类型检查与构建都发现不了这类问题，所以固化成测试。
 *
 * ⚠️ 当前**跑不起来**：仓库的 jest harness 坏了（jest/jest-runtime 30.4.2 与
 * `@umijs/max/test` 预置解析到的 jest-mock 30.4.1 不匹配，任何用例都会在
 * `Runtime.resetModules` 处抛 `this._moduleMocker.clearMocksOnScope is not a function`，
 * 连 `expect(1+1).toBe(2)` 也一样）。修好 harness 后本文件应直接可运行；
 * 在那之前，"不得带前导 ?"这条约束另由 `serializeParams` 内的开发期断言兜底。
 *
 * 备注：本文件不 import `axios/lib/helpers/buildURL`（该深路径无类型声明，会让 tsc 报
 * TS7016）；与 buildURL 的组合结果已在阶段 5 用 node 直接验证过，结论写进下面的断言里。
 */
import { serializeParams, toSearchDateRange } from '@/utils/params';

/** 复刻 axios 0.27 buildURL 的拼接规则 */
const buildUrlLike = (path: string, params: Record<string, unknown>) => {
  const serialized = serializeParams(params);
  if (!serialized) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${serialized}`;
};

describe('serializeParams（后端数组/分页参数绑定契约）', () => {
  it('不得带前导问号，否则与 axios 拼接后出现 ??', () => {
    const query = serializeParams({ page: 1, size: 10 });
    expect(query.startsWith('?')).toBe(false);
    expect(query).toBe('page=1&size=10');
  });

  it('拼接结果只有一个问号', () => {
    const url = buildUrlLike('/dev-api/system/user', {
      page: 1,
      size: 10,
      deptId: 3,
    });
    expect(url).toBe('/dev-api/system/user?page=1&size=10&deptId=3');
    expect(url).not.toContain('??');
  });

  it('数组展开为重复键（后端 String[] sort 才能绑定，且不能是 sort[]=）', () => {
    const url = buildUrlLike('/dev-api/system/log', {
      page: 1,
      sort: ['createTime,desc', 'id,asc'],
    });
    expect(url).toContain('sort=createTime%2Cdesc&sort=id%2Casc');
    expect(url).not.toContain('sort[]');
  });

  it('空值与 undefined 不发送', () => {
    expect(serializeParams({ page: 1, nickname: undefined, status: '' })).toBe(
      'page=1',
    );
  });

  it('无参数时不产生问号', () => {
    expect(buildUrlLike('/dev-api/system/dept/tree', {})).toBe(
      '/dev-api/system/dept/tree',
    );
  });

  it('日期区间以重复参数下发（后端 List<LocalDateTime>）', () => {
    const url = buildUrlLike('/dev-api/system/log', {
      page: 1,
      createTime: toSearchDateRange(['2026-09-01', '2026-09-02']),
    });
    expect(url).toBe(
      '/dev-api/system/log?page=1&createTime=2026-09-01+00%3A00%3A00&createTime=2026-09-02+23%3A59%3A59',
    );
  });

  it('dayjs 形态的值不会被拼成 Mon Sep 01 2026 这种不可解析串', () => {
    const fake = (d: string) => ({ format: () => d });
    const range = toSearchDateRange([
      fake('2026-09-01'),
      fake('2026-09-02'),
    ] as never);
    expect(range).toEqual(['2026-09-01 00:00:00', '2026-09-02 23:59:59']);
  });

  it('单边或空区间安全降级', () => {
    expect(toSearchDateRange(['2026-09-01'])).toEqual(['2026-09-01 00:00:00']);
    expect(toSearchDateRange(undefined)).toEqual([]);
    expect(toSearchDateRange([null, '2026-09-02'] as never)).toEqual([
      '2026-09-02 00:00:00',
    ]);
  });
});
