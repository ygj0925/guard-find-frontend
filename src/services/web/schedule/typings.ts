/**
 * 任务调度（后端 `guard-find-backend-plugin-schedule`，SnailJob 适配层）。
 * 字段名对齐 `JobReq` / `JobResp` / `JobLogResp`；注意任务状态用的是
 * `JobStatusEnum`：**0 禁用 / 1 启用**（与系统其余模块的 DisEnableStatusEnum 1/2 不同）。
 * 时间字段后端返回 `createDt` / `updateDt` / `executionAt`，不是 `createTime`。
 */

/** 任务列表项（`JobResp`） */
export interface JobVo {
  id: number;
  // 组名
  groupName: string;
  // 任务名
  jobName: string;
  description?: string;
  // 触发类型：1 CRON / 2 固定时间 / 3 API
  triggerType?: number;
  // 触发表达式（CRON 或间隔秒）
  triggerInterval?: string;
  executorType?: string;
  executorInfo?: string;
  taskType?: string;
  argsStr?: string;
  argsType?: string;
  routeKey?: string;
  blockStrategy?: number;
  executorTimeout?: number;
  maxRetryTimes?: number;
  retryInterval?: number;
  parallelNum?: number;
  // 0 禁用 / 1 启用
  jobStatus?: number;
  nextTriggerAt?: string;
  createDt?: string;
  updateDt?: string;
}

/** 新增/修改任务请求体 = 后端 `JobReq`（修改时主键走 `PUT /schedule/job/{id}` 路径） */
export interface JobDto {
  id?: number;
  groupName: string;
  jobName: string;
  description?: string;
  triggerType?: number;
  triggerInterval?: string;
  executorType?: string;
  executorInfo?: string;
  taskType?: string;
  argsStr?: string;
  argsType?: string;
  routeKey?: string;
  blockStrategy?: number;
  executorTimeout?: number;
  maxRetryTimes?: number;
  retryInterval?: number;
  parallelNum?: number;
  jobStatus?: number;
}

/** 任务查询 = 后端 `JobQuery` */
export interface JobQuery {
  groupName?: string;
  jobName?: string;
  jobStatus?: number;
}

/** 任务执行日志（`JobLogResp`） */
export interface JobLogVo {
  id: number;
  jobId: number;
  groupName: string;
  jobName: string;
  taskBatchStatus?: number;
  operationReason?: number;
  executorType?: string;
  executorInfo?: string;
  executionAt?: string;
  createDt?: string;
}

/** 任务日志查询 = 后端 `JobLogQuery` */
export interface JobLogQuery {
  jobId?: number;
  groupName?: string;
  jobName?: string;
  taskBatchStatus?: number;
  // 后端为 LocalDateTime[]，以重复参数 datetimeRange 提交
  datetimeRange?: string[];
}
