import type { RequestConfig, RequestOptions } from '@umijs/max';
import { message, notification } from 'antd';
import type { AxiosResponse } from 'axios';
import Notify from '@/utils/NotifyUtils';
import { Tenant, Token } from '@/utils/Web';

interface ICodeMessage {
  [propName: number]: string;
}

const StatusCodeMessage: ICodeMessage = {
  200: '服务器成功返回请求的数据',
  201: '新建或修改数据成功。',
  202: '一个请求已经进入后台排队（异步任务）',
  204: '删除数据成功',
  400: '请求错误(400)',
  401: '未授权，请重新登录(401)',
  403: '拒绝访问(403)',
  404: '请求出错(404)',
  408: '请求超时(408)',
  500: '服务器错误(500)',
  501: '服务未实现(501)',
  502: '网络错误(502)',
  503: '服务不可用(503)',
  504: '网络超时(504)',
};

interface ResponseStructure {
  success: boolean;
  data: any;
  errorCode?: number;
  errorMessage?: string;
  showType?: ErrorShowType;
}

export enum ErrorShowType {
  SILENT = 0,
  WARN_MESSAGE = 1,
  ERROR_MESSAGE = 2,
  NOTIFICATION = 3,
  REDIRECT = 9,
}

export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  errorCode?: number | string;
  errorMessage?: string;
  showType?: ErrorShowType;

  code?: number | string;
  msg?: string;
}

export class BizError extends Error {
  name = 'BizError';
  info: ApiResponse;

  constructor(message: string, info: ApiResponse) {
    super(message);
    this.info = info;
    Object.setPrototypeOf(this, BizError.prototype);
  }
}

let lastErrorMsg = '';
let lastErrorTime = 0;

const _showError = (msg: string) => {
  const now = Date.now();

  if (msg === lastErrorMsg && now - lastErrorTime < 1500) {
    return;
  }

  lastErrorMsg = msg;
  lastErrorTime = now;

  message.error(msg);
};

export const requestConfig: RequestConfig = {
  timeout: 30000,

  requestInterceptors: [
    (config: RequestOptions): RequestOptions => {
      const prefix = process.env.requestPrefix || '/dev-api';

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

      const tenantId = Tenant.get();
      if (tenantId) {
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
    (response: AxiosResponse) => {
      const { data, headers, status } = response;

      const contentType = headers?.['content-type'] || '';

      // 非 JSON 直接返回
      if (!contentType.includes('application/json')) {
        return response;
      }

      const res = data as ApiResponse;

      const { success, code, msg, errorCode, errorMessage } = res;

      if (String(code) === '401') {
        Notify.logout();
      }

      // 401 直接退出
      if (status === 401) {
        Notify.logout();
      }

      /* ========= 多后端兼容判断 ========= */

      const isBizError =
        success === false ||
        (typeof success === 'undefined' &&
          typeof code !== 'undefined' &&
          !['0', '200'].includes(String(code))) ||
        (typeof success === 'undefined' &&
          typeof errorCode !== 'undefined' &&
          Number(errorCode) !== 0);

      if (isBizError) {
        throw new BizError(errorMessage || msg || '业务处理失败', res);
      }

      return response;
    },
  ],

  errorConfig: {
    errorHandler: (error: any) => {
      console.log(error, 'errorHandler');

      // 我们的 errorThrower 抛出的错误。
      if (error.name === 'BizError') {
        const errorInfo: ResponseStructure | undefined = error.info;
        if (errorInfo) {
          const { errorMessage, errorCode } = errorInfo;
          switch (errorInfo.showType) {
            case ErrorShowType.SILENT:
              // do nothing
              break;
            case ErrorShowType.WARN_MESSAGE:
              message.warning(errorMessage);
              break;
            case ErrorShowType.ERROR_MESSAGE:
              message.error(errorMessage);
              break;
            case ErrorShowType.NOTIFICATION:
              notification.open({
                description: errorMessage,
                message: errorCode,
              });
              break;
            case ErrorShowType.REDIRECT:
              // TODO: redirect
              break;
            default:
              message.error(errorMessage);
          }
        }
      } else if (error.response) {
        // Axios 的错误
        // 请求成功发出且服务器也响应了状态码，但状态代码超出了 2xx 的范围
        const status = error.response?.status;
        const errorMsg =
          error.response?.data?.error ||
          StatusCodeMessage[status] ||
          '服务器暂时未响应，请刷新页面并重试。若无法解决，请联系管理员';
        if (status === 401) {
          Notify.logout();
        } else {
          message.error(errorMsg);
        }
      } else if (error.request) {
        const status = error.response?.status;
        const errorMsg =
          StatusCodeMessage[status] ||
          '服务器暂时未响应，请刷新页面并重试。若无法解决，请联系管理员';
        message.error(errorMsg);
      } else {
        // 发送请求时出了点问题
        message.error('Request error, please retry.');
      }
    },
  },
};
