/**
 * 我的消息 / 我的公告（后端 `MessageResp`、`NoticeResp`、`NoticeDetailResp`）。
 *
 * 这些接口都在 `/user/message/**` 下，后端只做登录校验（收件人视角），
 * 不需要 `system:notice:*` 之类的管理端权限码。
 */

/** 消息类型（`MessageTypeEnum`）：1 系统消息 / 2 安全消息 */
export type MessageType = 1 | 2;

/** 范围（`NoticeScopeEnum`）：1 所有人 / 2 指定用户 */
export type NoticeScope = 1 | 2;

/** 消息列表行（`MessageResp`：列表不返回 content，详情才有） */
export interface UserMessageVo {
  id: number;
  title: string;
  type: MessageType;
  /** 跳转路径 */
  path?: string;
  isRead?: boolean;
  readTime?: string;
  createTime: string;
}

/** 消息详情（`MessageDetailResp`，读取即置为已读） */
export interface UserMessageDetailVo extends Omit<UserMessageVo, 'readTime'> {
  content: string;
  scope?: NoticeScope;
  users?: string[];
}

/** 消息查询（`MessageQuery`） */
export interface UserMessageQuery {
  title?: string;
  type?: MessageType;
  isRead?: boolean;
}

/** 未读统计（`MessageUnreadResp`：total + 分类型明细，`details[].count`） */
export interface UnreadCountVo {
  total: number;
  details?: { type: MessageType; count: number }[];
}

/** 公告列表行（收件人视角，`NoticeResp`） */
export interface UserNoticeVo {
  id: number;
  title: string;
  /** 分类，取值于字典 notice_type */
  type: string;
  noticeScope?: NoticeScope;
  /** NoticeMethodEnum：1 系统消息 / 2 登录弹窗 */
  noticeMethods?: number[];
  isTiming?: boolean;
  publishTime?: string;
  isTop?: boolean;
  /** NoticeStatusEnum：1 草稿 / 2 待发布 / 3 已发布 */
  status?: number;
  isRead?: boolean;
  createTime?: string;
}

/** 公告详情（`NoticeDetailResp`，比列表多 content；打开即置为已读） */
export interface UserNoticeDetailVo extends UserNoticeVo {
  content: string;
  noticeUsers?: string[];
}

/** 公告查询（`NoticeQuery`；userId 由后端按当前用户注入，前端不传） */
export interface UserNoticeQuery {
  title?: string;
  type?: string;
}

/** 未读公告数量（`NoticeUnreadCountResp`，字段是 total） */
export interface NoticeUnreadCountVo {
  total: number;
}
