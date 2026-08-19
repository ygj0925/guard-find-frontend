export interface OnlineUserVo {
  token: string;
  username: string;
  nickname: string;
  ip: string;
  address: string;
  browser: string;
  os: string;
  loginTime: string;
}

export interface OnlineUserQuery {
  username?: string;
  ip?: string;
}
