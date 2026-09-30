import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type {
  AnnouncementDetailVo,
  AnnouncementDto,
  AnnouncementQo,
  AnnouncementVo,
} from './typings';

export async function query(body: QueryParam<AnnouncementQo>) {
  return request<R<PageResult<AnnouncementVo>>>('system/notice', {
    method: 'GET',
    params: body,
  });
}

export async function create(body: AnnouncementDto) {
  return request<R<any>>('system/notice', {
    method: 'POST',
    data: body,
  });
}

/** 修改：`PUT /system/notice/{id}` */
export async function edit(body: AnnouncementDto) {
  return request<R<any>>(`system/notice/${(body as { id?: number }).id}`, {
    method: 'PUT',
    data: body,
  });
}

/** 删除：`DELETE /system/notice` + `{ids}` */
export async function del(id: number | number[]) {
  return request<R<any>>('system/notice', {
    method: 'DELETE',
    data: { ids: Array.isArray(id) ? id : [id] },
  });
}

/**
 * 发布 / 撤回公告。
 *
 * 后端 `NoticeController` 只有 CRUD（`api = {PAGE, GET, CREATE, UPDATE, BATCH_DELETE}`），
 * 没有 publish/close 端点，因此状态变更走 `PUT /system/notice/{id}`。
 * 又因为 `NoticeReq` 对 `title/content/type/noticeScope/isTiming` 有非空校验，
 * 必须先取详情再整体回写，只传 `{status}` 会被判 400。
 *
 * 状态取值同后端 `NoticeStatusEnum`：1 草稿 / 2 待发布 / 3 已发布。
 */
const NOTICE_STATUS_DRAFT = 1;
const NOTICE_STATUS_PUBLISHED = 3;

async function changeStatus(id: number, status: number) {
  const detail = await request<R<Record<string, any>>>(`system/notice/${id}`, {
    method: 'GET',
  });
  if (!detail?.data) throw new Error(`公告 ${id} 不存在，无法变更状态`);
  const {
    id: _id,
    createTime: _c,
    updateTime: _u,
    createUser: _cu,
    updateUser: _uu,
    isRead: _r,
    ...rest
  } = detail.data;
  return request<R<null>>(`system/notice/${id}`, {
    method: 'PUT',
    data: { ...rest, status },
  });
}

export async function publish(id: number) {
  return changeStatus(id, NOTICE_STATUS_PUBLISHED);
}

export async function close(id: number) {
  return changeStatus(id, NOTICE_STATUS_DRAFT);
}

export async function detail(id: number) {
  return request<R<AnnouncementDetailVo>>(`system/notice/${id}`, {
    method: 'GET',
  });
}
