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

export type LoginLogVo = {
  id: number;
  traceId: string;
  username: string;
  eventType: string;
  ip: string;
  browser: string;
  os: string;
  message: string;
  status: number;
  createTime: string;
};

export type LoginLogQo = {
  username: string;
  ip: string;
  startTime: string;
  endTime: string;
};

export type OperationLogVo = {
  id: number;
  traceId: string;
  message: string;
  type: string;
  ip: string;
  uri: string;
  method: string;
  time: number;
  operator: string;
  status: number;
  params: string;
  userAgent: string;
  createTime: string;
};

export type OperationLogQo = {
  operator: string;
  ip: string;
  uri: string;
  startTime: string;
  endTime: string;
};
