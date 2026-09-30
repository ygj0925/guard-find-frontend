/**
 * 查询串序列化。
 *
 * 后端（Spring Boot）绑定数组的两种方式：重复键 `sort=a,desc&sort=b,asc` 或逗号分隔；
 * axios 默认发的是 `sort[]=...` / `createTime[]=...`，**后端绑不上**（`String[] sort`、
 * `List<LocalDateTime> createTime` 都会拿到 null）。所以项目里所有 GET 都走这个序列化器。
 *
 * 返回的字符串不能带前导 `?`：axios 0.27 `buildURL` 会自己补 `?`/`&`
 * （`url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams`），
 * 带问号会拼成 `/path??page=1`，参数全部失效。
 */
export function serializeParams(params: Record<string, any> = {}): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null || item === '') continue;
        search.append(key, String(item));
      }
    } else if (value instanceof Date) {
      // 后端 LocalDateTime 接收 "yyyy-MM-dd HH:mm:ss"
      search.append(key, value.toISOString().slice(0, 19).replace('T', ' '));
    } else if (typeof value === 'object') {
      search.append(key, JSON.stringify(value));
    } else {
      search.append(key, String(value));
    }
  }

  const query = search.toString();

  // 开发期兜底断言：改回带前导 ? 时立刻暴露，而不是等分页静默失效
  if (process.env.NODE_ENV !== 'production' && query.startsWith('?')) {
    throw new Error(
      '[params] serializeParams 不得返回带前导 ? 的查询串（axios 会自行补 ?）',
    );
  }
  return query;
}

/** 把 RangePicker 之类的值规整为后端要的 `yyyy-MM-dd HH:mm:ss` 数组 */
export function toDateTimeRange(
  range?: (string | Date | null | undefined)[] | null,
): string[] {
  if (!Array.isArray(range)) return [];
  return range
    .filter((v): v is string | Date => Boolean(v))
    .map((v) =>
      typeof v === 'string'
        ? v
        : v.toISOString().slice(0, 19).replace('T', ' '),
    );
}

type DateLike = string | Date | { format?: (f: string) => string };

/**
 * ProTable `valueType: 'dateRange'` 的搜索值 → 后端 `List<LocalDateTime>` 参数。
 *
 * 后端形参是数组（`@Size(max = 2)`），必须发**重复键**
 * （`createTime=2026-09-01 00:00:00&createTime=2026-09-02 23:59:59`）；
 * 直接 `value.join(',')` 在 dayjs 对象上会得到 `Mon Sep 01 2026 ...` 这种无法解析的串。
 * 只给日期时自动补当天的起止时刻。
 */
export function toSearchDateRange(
  value: DateLike[] | undefined | null,
): string[] {
  if (!Array.isArray(value) || value.length === 0) return [];
  const normalized = value
    .filter((v) => Boolean(v))
    .map((v, index) => {
      const raw =
        typeof v === 'string'
          ? v
          : v instanceof Date
            ? `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
            : typeof v.format === 'function'
              ? v.format('YYYY-MM-DD')
              : '';
      if (!raw) return '';
      // 只到日期精度时补时刻：区间起 00:00:00，止 23:59:59
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const isEnd = index === value.filter((x) => Boolean(x)).length - 1;
        return `${raw} ${isEnd && index > 0 ? '23:59:59' : '00:00:00'}`;
      }
      return raw.replace('T', ' ').slice(0, 19);
    })
    .filter(Boolean);
  return normalized;
}
