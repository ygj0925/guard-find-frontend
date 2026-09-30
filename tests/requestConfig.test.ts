/**
 * 请求层回归测试（阶段 1 的核心行为）。
 *
 * 这些行为 tsc / biome / max build / 契约扫描全都看不见，只能真跑：
 * 后端业务失败时 HTTP 恒为 200，错误信息只在 `msg` 里，
 * 所以"提示是否真的显示了后端原文""401 是否只登出一次""blob 里的 JSON 错误是否被识别"
 * 必须有用例钉住。
 */
import { message, notification } from 'antd';
import Notify from '@/utils/NotifyUtils';
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

type Interceptor = (response: any) => Promise<any>;
const intercept = () =>
  (requestConfig.responseInterceptors as unknown as Interceptor[])[0];

const jsonResponse = (data: unknown) => ({
  status: 200,
  data,
  headers: { 'content-type': 'application/json' },
  config: { url: '/dev-api/system/user' },
});

const ok = {
  code: '0',
  msg: '操作成功',
  data: { list: [], total: 0 },
  success: true,
  timestamp: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
  // 去重窗口 1.5s，测试之间必须隔离
  jest.useFakeTimers({ now: Date.now() + 10_000 });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('响应拦截器：成功透传', () => {
  it('code=0 直接返回原 response', async () => {
    const res = jsonResponse(ok);
    await expect(intercept()(res)).resolves.toBe(res);
    expect(message.error).not.toHaveBeenCalled();
  });
});

describe('响应拦截器：业务失败要显示后端 msg', () => {
  it('code=500 用 message.error 显示原文并抛错', async () => {
    await expect(
      intercept()(
        jsonResponse({
          code: '500',
          msg: '名称为 [技术部] 的部门已存在',
          success: false,
        }),
      ),
    ).rejects.toThrow('名称为 [技术部] 的部门已存在');
    expect(message.error).toHaveBeenCalledWith('名称为 [技术部] 的部门已存在');
  });

  it('code=400 用警告提示', async () => {
    await expect(
      intercept()(
        jsonResponse({ code: '400', msg: '标题不能为空', success: false }),
      ),
    ).rejects.toThrow('标题不能为空');
    expect(message.warning).toHaveBeenCalledWith('标题不能为空');
  });

  it('code=401 只触发登出，不叠错误提示', async () => {
    await expect(
      intercept()(
        jsonResponse({ code: '401', msg: '登录状态已过期', success: false }),
      ),
    ).rejects.toThrow();
    expect(Notify.logout).toHaveBeenCalledTimes(1);
    expect(message.error).not.toHaveBeenCalled();
  });

  it('未知码（后端默认错误码 1）走 notification', async () => {
    await expect(
      intercept()(
        jsonResponse({
          code: '1',
          msg: '服务器异常，请联系管理员',
          success: false,
        }),
      ),
    ).rejects.toThrow();
    expect(notification.error).toHaveBeenCalled();
    expect(message.error).not.toHaveBeenCalled();
  });

  it('相同错误短时间内只提示一次', async () => {
    const call = intercept();
    const body = () =>
      jsonResponse({ code: '500', msg: '重复提交', success: false });
    await expect(call(body())).rejects.toThrow();
    await expect(call(body())).rejects.toThrow();
    expect(message.error).toHaveBeenCalledTimes(1);
  });
});

describe('响应拦截器：下载接口的 JSON 错误', () => {
  it('blob 里装的是错误信封时提示 msg，而不是存成损坏文件', async () => {
    const blob = new Blob(
      [
        JSON.stringify({
          code: '500',
          msg: '导出失败：无数据权限',
          success: false,
        }),
      ],
      { type: 'application/json' },
    );
    await expect(
      intercept()({
        status: 200,
        data: blob,
        headers: { 'content-type': 'application/json' },
        config: { url: '/dev-api/system/user/export' },
      }),
    ).rejects.toThrow('导出失败：无数据权限');
    expect(message.error).toHaveBeenCalledWith('导出失败：无数据权限');
  });

  it('真正的二进制流原样放行', async () => {
    const blob = new Blob(['binary'], { type: 'application/octet-stream' });
    const res = {
      status: 200,
      data: blob,
      headers: { 'content-type': 'application/octet-stream' },
      config: { url: '/dev-api/system/user/export' },
    };
    await expect(intercept()(res)).resolves.toBe(res);
  });
});

describe('silent 静默请求（秒传查重、未读轮询等可选能力）', () => {
  const silentResponse = (data: unknown) => ({
    ...jsonResponse(data),
    config: { url: '/dev-api/system/file/check', silent: true },
  });

  it('业务失败不弹提示，但仍抛错让调用方降级', async () => {
    await expect(
      intercept()(
        silentResponse({ code: '403', msg: '没有访问权限', success: false }),
      ),
    ).rejects.toThrow('没有访问权限');
    expect(message.error).not.toHaveBeenCalled();
    expect(message.warning).not.toHaveBeenCalled();
    expect(notification.error).not.toHaveBeenCalled();
  });

  it('silent 也不能吞掉 401 —— 登录态失效必须登出', async () => {
    await expect(
      intercept()(
        silentResponse({ code: '401', msg: '登录状态已过期', success: false }),
      ),
    ).rejects.toThrow();
    expect(Notify.logout).toHaveBeenCalledTimes(1);
  });

  it('errorHandler 对 silent 的 HTTP 失败保持安静', () => {
    const handler = () =>
      (requestConfig as any).errorConfig.errorHandler as (e: unknown) => void;
    handler()({
      config: { silent: true },
      response: { status: 500, config: { silent: true }, data: {} },
    });
    expect(message.error).not.toHaveBeenCalled();
  });

  it('非 silent 的同类失败照常提示（确认静默是选项而非全局关掉）', () => {
    const handler = () =>
      (requestConfig as any).errorConfig.errorHandler as (e: unknown) => void;
    handler()({ config: {}, response: { status: 503, data: {} } });
    expect(message.error).toHaveBeenCalledWith('请求失败(503)，请稍后重试');
  });
});

describe('errorHandler：不重复提示', () => {
  const handler = () =>
    (requestConfig as any).errorConfig.errorHandler as (e: unknown) => void;

  it('拦截器已提示过的 BizError 不再弹第二次', async () => {
    await expect(
      intercept()(
        jsonResponse({ code: '500', msg: '已经提示过了', success: false }),
      ),
    ).rejects.toThrow();
    const shown = (message.error as jest.Mock).mock.calls.length;
    try {
      await intercept()(
        jsonResponse({ code: '500', msg: '换个文案', success: false }),
      );
    } catch (error) {
      handler()(error);
    }
    // 拦截器提示 1 次 + errorHandler 0 次
    expect((message.error as jest.Mock).mock.calls.length).toBe(shown + 1);
  });

  it('取消的请求完全静默', () => {
    handler()({ name: 'CanceledError', code: 'ERR_CANCELED' });
    expect(message.error).not.toHaveBeenCalled();
    expect(Notify.logout).not.toHaveBeenCalled();
  });

  it('HTTP 401（真 401，非信封）走登出', () => {
    handler()({ response: { status: 401, data: {} } });
    expect(Notify.logout).toHaveBeenCalledTimes(1);
    expect(message.error).not.toHaveBeenCalled();
  });
});
