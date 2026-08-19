export interface UserMessageVo {
  id: number;
  title: string;
  content: string;
  type: number;
  isRead: boolean;
  createTime: string;
}

export interface UserMessageQuery {
  type?: number;
  isRead?: boolean;
}

export interface UnreadCountVo {
  total: number;
}
