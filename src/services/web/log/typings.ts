export type AccessLogVo = {
  id: number;
  traceId: string;
  username: string;
  ip: string;
  uri: string;
  method: string;
  time: number;
  statusCode: number;
  errorMessage: string;
  reqParams: string;
  reqBody: string;
  result: string;
  userAgent: string;
  createTime: string;
};

export type AccessLogQo = {
  username: string;
  ip: string;
  uri: string;
  startTime: string;
  endTime: string;
};

export type LogVo = {
  id: number;
  description: string;
  module: string;
  timeTaken: number;
  ip: string;
  address: string;
  browser: string;
  os: string;
  status: number;
  errorMsg: string;
  createUserString: string;
  createTime: string;
};

export type LoginLogVo = LogVo;

export type LoginLogQo = {
  description?: string;
  ip?: string;
  createUserString?: string;
  createTime?: string;
};

export type OperationLogVo = LogVo;

export type OperationLogQo = {
  description?: string;
  module?: string;
  ip?: string;
  createUserString?: string;
  createTime?: string;
};
