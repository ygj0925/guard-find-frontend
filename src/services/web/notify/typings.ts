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

export type AnnouncementQo = {
  title: string;
};

export type AnnouncementDto = {
  id?: number;
  title: string;
  content: string;
  status?: number;
  permanent: number;
  expireTime?: string;
  receiverType: number;
  receiverIds?: number[];
  notifyType: number[];
};
