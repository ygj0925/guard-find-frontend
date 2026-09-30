/**
 * 端点形状回归测试：钉住"服务函数最终发给 axios 的 method / 路径 / body 形态"。
 *
 * 这层是本轮踩坑最多的地方，而且 tsc / biome / build / 契约扫描**全都看不见**：
 * - `uploadFile` 曾把 multipart 放在 `body:`（umi 走 axios，只认 `data:`）→ 请求体为空，
 *   后端 `@RequestPart` 必报"文件不能为空"，而前端一切检查绿灯；
 * - ContiNew 的批量删除是 `DELETE <base>` + `{ids}`，但角色分配/取消分配是**裸数组**，
 *   写反了后端直接 400；
 * - 主键只走路径，放进 body 会被 Jackson 丢掉。
 * 所以每个形状都要有用例。
 */
import { request } from 'umi';
import {
  calcDirSize,
  checkFile,
  cleanRecycle,
  createDir,
  deleteFile,
  permanentDelete,
  renameFile,
  restoreFile,
  uploadFile,
} from '@/services/web/file';
import {
  assignUsers,
  unbindUser,
  unbindUsers,
} from '@/services/web/system/role';
import {
  batchDeleteMessages,
  deleteMessage,
  getNoticeDetail,
  getUnreadNoticeCount,
  markAsRead,
  queryNotices,
} from '@/services/web/user-message';

jest.mock('umi', () => ({
  request: jest
    .fn()
    .mockResolvedValue({ code: '0', msg: 'ok', data: null, success: true }),
}));

const mockRequest = request as unknown as jest.Mock;
const lastCall = () =>
  mockRequest.mock.calls[mockRequest.mock.calls.length - 1];

beforeEach(() => mockRequest.mockClear());

describe('文件端点', () => {
  it('上传：multipart 必须在 data（不是 body），parentPath 走 query', async () => {
    await uploadFile(new File(['x'], 'a.txt'), '/2026/09');
    const [url, options] = lastCall();
    expect(url).toBe('system/file/upload');
    expect(options.method).toBe('POST');
    expect(options.data).toBeInstanceOf(FormData);
    expect([...options.data.keys()]).toEqual(['file']);
    expect(options.params).toEqual({ parentPath: '/2026/09' });
    // 这条断言就是当年那个 bug 的墓碑
    expect(options.body).toBeUndefined();
  });

  it('创建目录：POST /system/file/dir + FileReq（parentPath 后端要求非空）', async () => {
    await createDir({ originalName: '报告', parentPath: '/' });
    expect(lastCall()).toEqual([
      'system/file/dir',
      expect.objectContaining({
        method: 'POST',
        data: { originalName: '报告', parentPath: '/' },
      }),
    ]);
  });

  it('重命名：PUT /system/file/{id}，id 只在路径不在 body', async () => {
    await renameFile(1001, { originalName: '新名字.txt' });
    const [url, options] = lastCall();
    expect(url).toBe('system/file/1001');
    expect(options.method).toBe('PUT');
    expect(options.data).toEqual({ originalName: '新名字.txt' });
    expect(options.data.id).toBeUndefined();
  });

  it('移入回收站：DELETE /system/file + {ids}（后端只开放批量形态）', async () => {
    await deleteFile(7);
    expect(lastCall()).toEqual([
      'system/file',
      expect.objectContaining({ method: 'DELETE', data: { ids: [7] } }),
    ]);
    await deleteFile([7, 8]);
    expect(lastCall()[1].data).toEqual({ ids: [7, 8] });
  });

  it('回收站：还原走 PUT /recycle/restore/{id}，彻底删除走 DELETE /recycle/{id}，清空走 DELETE /recycle/clean', async () => {
    await restoreFile(3);
    expect(lastCall()[0]).toBe('system/file/recycle/restore/3');
    expect(lastCall()[1].method).toBe('PUT');

    await permanentDelete(3);
    expect(lastCall()[0]).toBe('system/file/recycle/3');
    expect(lastCall()[1].method).toBe('DELETE');

    await cleanRecycle();
    expect(lastCall()).toEqual([
      'system/file/recycle/clean',
      expect.objectContaining({ method: 'DELETE' }),
    ]);
  });

  it('计算目录大小 / 秒传：GET 路径与查询参数', async () => {
    await calcDirSize(9);
    expect(lastCall()[0]).toBe('system/file/dir/9/size');

    await checkFile('deadbeef');
    const [url, options] = lastCall();
    expect(url).toBe('system/file/check');
    expect(options.params).toEqual({ fileHash: 'deadbeef' });
    // 秒传是"可选能力"（权限码无 sys_menu 行），必须静默失败不弹全局提示
    expect(options.silent).toBe(true);
  });
});

describe('角色用户绑定端点', () => {
  it('分配：POST /system/role/{id}/user + 裸数组（不是 {ids}）', async () => {
    await assignUsers(5, [1, 2, 3]);
    const [url, options] = lastCall();
    expect(url).toBe('system/role/5/user');
    expect(options.method).toBe('POST');
    expect(options.data).toEqual([1, 2, 3]);
    expect(Array.isArray(options.data)).toBe(true);
  });

  it('取消分配：DELETE /system/role/user + 裸数组（元素是绑定关系 ID）', async () => {
    await unbindUser(11);
    expect(lastCall()).toEqual([
      'system/role/user',
      expect.objectContaining({ method: 'DELETE', data: [11] }),
    ]);
    await unbindUsers([11, 12]);
    expect(lastCall()[1].data).toEqual([11, 12]);
  });

  it('空列表不发请求到后端（后端 @NotEmpty 会 400，前端先拦）', async () => {
    await expect(assignUsers(5, [])).rejects.toThrow(/不能为空/);
    expect(mockRequest).not.toHaveBeenCalled();
  });
});

describe('消息中心端点（全部走收件人视角，不能用管理端路径）', () => {
  it('公告详情走 /user/message/notice/{id}，不是 /system/notice/{id}', async () => {
    await getNoticeDetail(42);
    expect(lastCall()[0]).toBe('user/message/notice/42');
    expect(lastCall()[0]).not.toMatch(/^system\/notice/);
  });

  it('公告列表与未读数', async () => {
    await queryNotices({ page: 1, size: 10, title: '通知' });
    expect(lastCall()).toEqual([
      'user/message/notice',
      expect.objectContaining({ method: 'GET' }),
    ]);

    await getUnreadNoticeCount();
    expect(lastCall()[0]).toBe('user/message/notice/unread');
  });

  it('标记已读用 {ids}，删除也只有批量形态', async () => {
    await markAsRead([1, 2]);
    expect(lastCall()).toEqual([
      'user/message/read',
      expect.objectContaining({ method: 'PATCH', data: { ids: [1, 2] } }),
    ]);

    await deleteMessage(3);
    expect(lastCall()).toEqual([
      'user/message',
      expect.objectContaining({ method: 'DELETE', data: { ids: [3] } }),
    ]);

    await batchDeleteMessages([4, 5]);
    expect(lastCall()[1].data).toEqual({ ids: [4, 5] });
  });
});
