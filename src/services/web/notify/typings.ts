export type AnnouncementVo = {
  id: number;
  title: string;
  content: string;
  status: number;
  permanent: number;
  expireTime: string;
  publishTime: string;
  createTime: string;
  updateTime: string;
};

export type AnnouncementQo = {
  title: string;
  status: number;
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
