/**
 * 构建期环境变量读取与回落。
 *
 * `process.env.*` 由 `config/config.ts`（及 `config.dev.ts` / `config.prod.ts`）的
 * `define` 注入。历史遗留问题：只有设置 `UMI_ENV` 时才会加载后两者，导致默认
 * `max build` 拿到 `undefined`，进而出现"登录缺少 clientId"、localStorage 键前缀
 * 变成字面量 `"undefined"` 等故障。这里集中做一次性回落，并在生产构建缺失关键
 * 变量时给出显式告警，而不是静默劣化。
 */

const isProd = process.env.NODE_ENV === 'production';

/** ContiNew dev 环境的公开 OAuth2 客户端 ID（非密钥，与后端 sys_client 表对应） */
const DEV_CLIENT_ID = 'ef51c9a3e9046c4f2ea45142c8a8344a';

let warned = false;
function warnMissing(name: string, fallback: string) {
  if (warned || !isProd) return;
  warned = true;
  console.warn(
    `[env] 生产构建未注入 ${name}，已回落到开发默认值 ${fallback}，请检查 CI 的 UMI_ENV/相关变量`,
  );
}

const read = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.length > 0) return value;
  return undefined;
};

export const REQUEST_PREFIX: string =
  read(process.env.requestPrefix) ?? '/dev-api';

/** 请求存储键命名空间，必须以 `/` 结尾以保证可读性 */
export const STORAGE_NAMESPACE: string =
  read(process.env.namespaceName) ?? 'guard-find-admin/';

export const CLIENT_ID: string =
  read(process.env.clientId) ??
  (() => {
    warnMissing('process.env.clientId', DEV_CLIENT_ID);
    return DEV_CLIENT_ID;
  })();

/** 站点名（登录页/标题展示） */
export const COMPANY_NAME: string =
  read(process.env.companyName) ?? 'Guard Find 管理后台';
