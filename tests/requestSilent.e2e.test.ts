/**
 * 端到端验证：`request(url, { silent })` 里的自定义选项能否真的走到响应拦截器。
 *
 * 为什么单独写这个文件：`silent` 是通过 axios 的 `config` 透传的，
 * 单元测试里我是直接构造 `{ config: { silent: true } }` 喂给拦截器的，
 * 那并不能证明"调用方写的选项真的活到了拦截器"。
 * 阶段 2 的 `??page=1` 就是同类问题（静态检查全绿、运行时是坏的），
 * 所以这里用真实 axios 实例 + 自定义 adapter 跑一遍完整链路。
 */

import { message } from 'antd';
import axios from 'axios';
import { requestConfig } from '@/utils/RequestConfig';

jest.mock('antd', () => ({
  message: { error: jest.fn(), warning: jest.fn(), success: jest.fn() },
  notification: { error: jest.fn(), open: jest.fn() },
}));
jest.mock('@/utils/NotifyUtils', () => ({
  __esModule: true,
  default: { logout: jest.fn() },
}));
jest.mock('@/utils/Web', () => ({
  Token: { get: () => 'tok' },
  Tenant: { get: () => '1' },
}));

/** 后端业务失败时 HTTP 仍是 200，错误只在信封里 */
const failAdapter = (config: any) =>
  Promise.resolve({
    data: {
      code: '403',
      msg: '没有访问权限，请联系管理员授权',
      data: null,
      success: false,
      timestamp: 1,
    },
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    config,
  });

const buildInstance = () => {
  const instance = axios.create({ adapter: failAdapter });
  (requestConfig.responseInterceptors as any[]).forEach((interceptor) => {
    instance.interceptors.response.use(interceptor);
  });
  return instance;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: Date.now() + 20_000 });
});

afterEach(() => {
  jest.useRealTimers();
});

it('调用方传 silent 时，拦截器读得到并且不提示', async () => {
  await expect(
    buildInstance().request({
      url: 'system/file/check',
      method: 'GET',
      silent: true,
    } as any),
  ).rejects.toThrow('没有访问权限，请联系管理员授权');
  expect(message.error).not.toHaveBeenCalled();
});

it('不传 silent 时照常提示后端原文', async () => {
  await expect(
    buildInstance().request({ url: 'system/file/check', method: 'GET' }),
  ).rejects.toThrow();
  expect(message.error).toHaveBeenCalledWith('没有访问权限，请联系管理员授权');
});

it('自定义选项不会破坏全局 paramsSerializer 的重复键规则', async () => {
  let capturedUrl = '';
  const instance = axios.create({
    ...requestConfig,
    adapter: (config: any) => {
      capturedUrl = require('axios/lib/helpers/buildURL')(
        config.url,
        config.params,
        config.paramsSerializer,
      );
      return Promise.resolve({
        data: { code: '0', msg: 'ok', data: null, success: true, timestamp: 1 },
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        config,
      });
    },
  });
  await instance.request({
    url: 'system/file',
    method: 'GET',
    params: { page: 1, size: 10, sort: ['name,asc', 'createTime,desc'] },
    silent: true,
  } as any);
  // 逗号由 URLSearchParams 编成 %2C（Spring 侧解码回逗号），空格编成 +；
  // 这里钉的是"重复键"这一条契约，不是转义细节
  expect(capturedUrl).toBe(
    'system/file?page=1&size=10&sort=name%2Casc&sort=createTime%2Cdesc',
  );
});
