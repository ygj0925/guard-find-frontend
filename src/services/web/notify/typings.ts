export type AnnouncementVo = {
  id: number;
  title: string;
  type: string;
  noticeScope: number;
  noticeMethods: number[];
  isTiming: boolean;
  publishTime: string;
  isTop: boolean;
  status: number;
  isRead: boolean;
  createUserString: string;
  createTime: string;
};

export type AnnouncementDetailVo = AnnouncementVo & {
  content: string;
};

/** 查询条件 = 后端 `NoticeQuery` */
export type AnnouncementQo = {
  title?: string;
  // 分类
  type?: string;
};

/**
 * 公告新增/修改请求体 = 后端 `NoticeReq`。
 *
 * 必填：`title`、`content`、`type`、`noticeScope`、`isTiming`（`status` 在编辑时也要给，
 * 后端 `NoticeStatusEnum`：1 草稿 / 2 待发布 / 3 已发布）。
 * 旧字段 `permanent`/`expireTime`/`receiverType`/`receiverIds`/`notifyType` 后端不存在，
 * 会被 Jackson 静默忽略（`fail-on-unknown-properties: false`），所以必须改名而不是并存。
 */
export type AnnouncementDto = {
  id?: number;
  // 标题
  title: string;
  // 内容
  content: string;
  // 分类（字典 notice_type 的值）
  type: string;
  // 通知范围：1 所有人 / 2 指定用户（NoticeScopeEnum）
  noticeScope: number;
  // noticeScope=2 时的接收用户ID
  noticeUsers?: number[];
  // 通知方式：1 系统消息 / 2 登录弹窗（NoticeMethodEnum）
  noticeMethods?: number[];
  // 是否定时发布
  isTiming: boolean;
  // 定时发布时间（isTiming=true 时必填）
  publishTime?: string;
  // 是否置顶
  isTop?: boolean;
  // 状态：1 草稿 / 2 待发布 / 3 已发布
  status?: number;
};
