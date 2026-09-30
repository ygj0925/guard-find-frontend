import type { MessageType } from '@/services/web/user-message/typings';

/** 消息类型（后端 `MessageTypeEnum`，按裸值下发） */
export const MESSAGE_TYPE_MAP: Record<
  MessageType,
  { label: string; color: string }
> = {
  1: { label: '系统消息', color: 'blue' },
  2: { label: '安全消息', color: 'orange' },
};

/** 公告状态（后端 `NoticeStatusEnum`） */
export const NOTICE_STATUS_MAP: Record<
  number,
  { label: string; color: string }
> = {
  1: { label: '草稿', color: 'warning' },
  2: { label: '待发布', color: 'processing' },
  3: { label: '已发布', color: 'success' },
};
