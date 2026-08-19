export interface JobVo {
  id: number;
  name: string;
  jobGroup: string;
  cronExpression: string;
  targetBean: string;
  targetMethod: string;
  targetParams: string;
  status: number;
  description: string;
  createTime: string;
}

export interface JobDto {
  id?: number;
  name: string;
  jobGroup: string;
  cronExpression: string;
  targetBean: string;
  targetMethod: string;
  targetParams?: string;
  description?: string;
  status?: number;
}

export interface JobQuery {
  name?: string;
  jobGroup?: string;
  status?: number;
}

export interface JobLogVo {
  id: number;
  jobId: number;
  jobName: string;
  jobGroup: string;
  targetBean: string;
  targetMethod: string;
  targetParams: string;
  status: number;
  errorMessage: string;
  startTime: string;
  endTime: string;
  duration: number;
  createTime: string;
}

export interface JobLogQuery {
  jobName?: string;
  jobGroup?: string;
  status?: number;
}
