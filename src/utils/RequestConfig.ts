import type { RequestConfig, RequestOptions } from '@umijs/max';
import { message, notification } from 'antd';
import type { AxiosResponse } from 'axios';
import { REQUEST_PREFIX } from '@/utils/env';
import Notify from '@/utils/NotifyUtils';
import { serializeParams } from '@/utils/params';
import { Tenant, Token } from '@/utils/Web';

/**
 * 后端统一响应信封（`top.continew.starter.web.model.R`）。
 *
 * 注意：业务失败时 HTTP 状态码仍为 200（`application.yml` 中
 * `default-http-status-code-on-error: 200`），失败信息只存在于 `code` / `msg`。
 */
export interface ApiEnvelope<T = unknown> {
  /** 字符串状态码，成功恒为 '0' */
  code: string;
  /** 提示信息（ContiNew 用 msg，不是 message/errorMessage） */
  msg: string;
  data: T;
  success: boolean;
  timestamp: number;
  /**
   * 兼容字段：非 ContiNew 的后端（第三方接口、旧网关）可能用
   * `message` / `errorMessage` / `error` 承载文案，由 getResponseMessage 兜底读取。
   */
  message?: string;
  errorMessage?: string;
  error?: string;
}

/**
 * 提取可展示的错误文案：优先 ContiNew 的 `msg`，
 * 再回落 `message` / `errorMessage` / `error`，取第一个非空字符串。
 * 这样兼容后端返回的写法差异，提示不会退化成"请求失败"这类无信息文案。
 */
const getResponseMessage = (data: unknown): string | undefined => {
  if (!data || typeof data !== 'object') return undefined;
  const response = data as Partial<ApiEnvelope>;
  return [
    response.msg,
    response.message,
    response.errorMessage,
    response.error,
  ].find(
    (value): value is string =>
      typeof value === 'string' && value.trim().length > 0,
  );
};

/**
 * 业务错误。请求层已完成用户提示，`handled` 用于阻止全局 errorHandler 重复提示。
 */
export class BizError extends Error {
  name = 'BizError';
  info: ApiEnvelope;
  handled = true;

  constructor(message: string, info: ApiEnvelope) {
    super(message);
    this.info = info;
    Object.setPrototypeOf(this, BizError.prototype);
  }
}

/** 后端默认错误码（未捕获异常等），见 `default-error-code: 1` */
export const CODE_SERVER_ERROR = '1';

/**
 * 静默请求：`request(url, { ..., silent: true })`。
 *
 * 用于"可有可无"的乐观调用（例如上传前秒传查重、未读数轮询）——
 * 失败时不弹提示，由调用方自己决定降级路径，但仍然抛 BizError 让调用方能捕获。
 */
export interface SilentRequestOption {
  silent?: boolean;
}

const isSilent = (config: any): boolean => Boolean(config?.silent);

const SUCCESS_CODE = '0';

const isDev = () => process.env.NODE_ENV !== 'production';

/** 相同文案在去重窗口内只提示一次，避免多请求并发失败时刷屏 */
const DEDUPE_WINDOW_MS = 1500;
let lastContentType: 'error' | 'warning' | 'notification' | '' = '';
let lastContentMsg = '';
let lastContentTime = 0;

function showOnce(
  kind: 'error' | 'warning' | 'notification',
  content: string,
  title?: string,
) {
  const now = Date.now();
  if (
    kind === lastContentType &&
    content === lastContentMsg &&
    now - lastContentTime < DEDUPE_WINDOW_MS
  ) {
    return;
  }
  lastContentType = kind;
  lastContentMsg = content;
  lastContentTime = now;

  if (kind === 'notification') {
    notification.error({
      message: title || '服务异常',
      description: content,
      duration: 5,
    });
    return;
  }
  if (kind === 'warning') {
    message.warning(content);
    return;
  }
  message.error(content || '请求失败，请稍后重试');
}

/**
 * 按后端 `code` 分派界面行为。`silent` 时只做开发期告警、不提示用户。
 */
function dispatchByCode(
  code: string,
  msg: string,
  url?: string,
  silent?: boolean,
): void {
  // 契约漂移：接口不存在或 HTTP 方法不匹配，开发期显式告警（静默请求也要报，否则排查不到）
  if ((code === '404' || code === '405') && isDev()) {
    console.error(
      `[api-contract] ${code} ${url || ''} —— 后端不存在该路由或 HTTP 方法不匹配`,
    );
  }
  if (code === '401') {
    Notify.logout();
    return;
  }
  if (code === '403' && !url?.includes('/auth/user/')) {
    window.dispatchEvent(new Event('authorization:refresh'));
  }
  if (silent) return;

  switch (code) {
    // 参数/业务校验失败
    case '400': {
      showOnce('warning', msg || '请求参数不合法');
      return;
    }
    // 无权限 / 租户不匹配
    case '403': {
      showOnce('error', msg || '没有访问权限，请联系管理员授权');
      return;
    }
    case '404':
    case '405': {
      showOnce('error', msg || `接口不存在（${code}）`);
      return;
    }
    // 业务异常（含唯一性冲突、数据不存在）
    case '500': {
      showOnce('error', msg || '操作失败');
      return;
    }
    // 未捕获异常（含数据库异常）及其他未知码
    default: {
      showOnce('notification', msg || '服务器异常，请联系管理员');
    }
  }
}

/** 判断是否为后端 JSON 信封（兼容非信封响应，如第三方接口） */
function isEnvelope(data: unknown): data is ApiEnvelope {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.success === 'boolean' ||
    (typeof d.code !== 'undefined' && Object.hasOwn(d, 'data'))
  );
}

function isSuccess(envelope: ApiEnvelope): boolean {
  return envelope.success === true || String(envelope.code) === SUCCESS_CODE;
}

/**
 * 读取 blob 中的 JSON 错误信封。
 * 导出接口失败时返回的是 `application/json` 信封，若按文件保存会得到一个损坏文件。
 *
 * `Blob.text()` 在部分环境（旧浏览器、jsdom）不存在，回落到 `FileReader`。
 */
function readBlobAsText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') return blob.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

async function readBlobEnvelope(blob: Blob): Promise<unknown> {
  try {
    return JSON.parse(await readBlobAsText(blob));
  } catch {
    return undefined;
  }
}

export const requestConfig: RequestConfig = {
  timeout: 30000,

  /**
   * 全局查询串序列化：后端数组参数（`String[] sort`、`List<LocalDateTime> createTime`）
   * 只认重复键或逗号分隔，而 axios 默认发 `key[]=v` 会被 Spring 绑成 null。
   * 放全局是为了让没走 CRUD 工厂的手写服务（日志、短信日志等）也一并生效。
   */
  paramsSerializer: serializeParams,

  requestInterceptors: [
    (config: RequestOptions): RequestOptions => {
      const prefix = REQUEST_PREFIX;
      const cleanPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
      const cleanUrl = config.url?.startsWith('/')
        ? config.url.slice(1)
        : config.url;

      const token = Token.get();
      const headers: Record<string, string> = {
        ...(config.headers as Record<string, string>),
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // 登录前用 X-Tenant-Code（登录接口显式传入），登录后统一用 X-Tenant-Id
      const tenantId = Tenant.get();
      if (tenantId && !headers['X-Tenant-Code']) {
        headers['X-Tenant-Id'] = tenantId;
      }

      return {
        ...config,
        url: `${cleanPrefix}/${cleanUrl}`,
        headers,
      };
    },
  ],

  responseInterceptors: [
    // 需要 await Blob，故为异步拦截器
    async (response: AxiosResponse) => {
      const { data, headers } = response;
      const url = response.config?.url;
      const silent = isSilent(response.config);

      // 二进制下载：仅当实际是 JSON 错误信封时拦截
      if (data instanceof Blob) {
        const responseType = String(headers?.['content-type'] || '');
        if (!responseType.includes('application/json')) {
          return response;
        }
        const envelope = await readBlobEnvelope(data);
        if (isEnvelope(envelope) && !isSuccess(envelope)) {
          // 下载失败同样兼容 message / errorMessage / error 文案
          const blobMessage = getResponseMessage(envelope) ?? '';
          dispatchByCode(String(envelope.code), blobMessage, url, silent);
          throw new BizError(blobMessage || '下载失败', envelope);
        }
        return response;
      }

      const contentType = headers?.['content-type'] || '';
      if (!contentType.includes('application/json')) {
        return response;
      }

      if (!isEnvelope(data)) {
        return response;
      }

      // 文案优先信封 msg，并兼容 message / errorMessage / error 等其他后端写法
      const responseMessage = getResponseMessage(data) ?? '';

      if (!isSuccess(data)) {
        dispatchByCode(String(data.code), responseMessage, url, silent);
        throw new BizError(responseMessage || '业务处理失败', data);
      }

      return response;
    },
  ],

  errorConfig: {
    errorHandler: (error: any) => {
      // 主动取消的请求不提示
      if (
        error?.name === 'CanceledError' ||
        error?.code === 'ERR_CANCELED' ||
        error?.name === 'AbortError'
      ) {
        return;
      }

      // 业务错误已在 responseInterceptor 内完成分派提示（含兼容文案），避免二次弹窗
      if (error instanceof BizError || error?.name === 'BizError') {
        return;
      }

      if (error?.response) {
        const status = error.response.status;
        if (status === 401) {
          Notify.logout();
          return;
        }
        if (status === 403 && !error.config?.url?.includes('/auth/user/')) {
          window.dispatchEvent(new Event('authorization:refresh'));
        }
        // 静默请求的网络/HTTP 失败交给调用方降级处理
        if (isSilent(error.config) || isSilent(error.response.config)) return;
        // 兼容 HTTP 错误体里的 msg / message / errorMessage / error 文案，
        // 取不到才回落到带状态码的通用提示
        const serverMsg = getResponseMessage(error.response.data);
        showOnce('error', serverMsg || `请求失败(${status})，请稍后重试`);
        return;
      }

      if (error?.request) {
        if (isSilent(error.config)) return;
        showOnce('error', '网络连接失败，请检查您的网络');
        return;
      }

      if (isSilent(error?.config)) return;
      showOnce('error', error?.message || '请求发送失败，请重试');
    },
  },
};
