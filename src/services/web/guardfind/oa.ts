import { request } from 'umi';
import type { PageResult, QueryParam, R } from '@/typings';
import type { FileUploadResp } from '../file/typings';

export type OaProcessStatus = 'DRAFT' | 'PUBLISHED' | 'DISABLED';

export type OaBusinessType = 'GENERIC' | 'LEAVE' | 'EXPENSE';

export interface OaProcessModelVo {
  id: number;
  modelKey: string;
  name: string;
  category?: string | null;
  description?: string | null;
  /** 列表接口不返回 XML，仅在详情中下发 */
  bpmnXml?: string | null;
  xmlDigest?: string | null;
  status: OaProcessStatus;
  currentReleaseId?: number | null;
  currentReleaseVersion?: number | null;
  formId?: number | null;
  formVersionId?: number | null;
  version: number;
  createTime?: string;
  updateTime?: string;
  businessType?: OaBusinessType | null;
}

export interface OaProcessReleaseVo {
  id: number;
  releaseVersion: number;
  engineDefinitionId: string;
  processDefinitionKey: string;
  processDefinitionVersion: number;
  formId?: number | null;
  formVersionId?: number | null;
  formVersion?: number | null;
  launchScope?: string | null;
  status: string;
  publishedBy?: number | null;
  publishTime?: string;
  remark?: string | null;
  xmlDigest?: string | null;
}

export interface OaBpmnValidateResultVo {
  valid: boolean;
  errors: string[];
  nodeCount: number;
  digest: string | null;
  processKey: string | null;
}

export interface OaProcessPublishResultVo {
  valid: boolean;
  errors: string[];
  releaseId?: number | null;
  releaseVersion?: number | null;
  engineDefinitionId?: string | null;
  processDefinitionVersion?: number | null;
}

export interface OaProcessModelQuery {
  keyword?: string;
  status?: string;
}

export interface OaProcessModelCreateParams {
  modelKey: string;
  name: string;
  category?: string;
  description?: string;
  bpmnXml?: string;
  businessType?: OaBusinessType;
}

export interface OaProcessModelUpdateParams {
  name: string;
  category?: string;
  description?: string;
  bpmnXml: string;
  version: number;
}

export interface OaProcessPublishParams {
  formVersionId: number;
  launchScope?: string;
  remark?: string;
}

export function queryOaProcessModels(
  params: QueryParam<OaProcessModelQuery>,
) {
  return request<R<PageResult<OaProcessModelVo>>>(
    'system/oa/process/model/page',
    { method: 'GET', params },
  );
}

export function getOaProcessModel(id: number | string) {
  return request<R<OaProcessModelVo>>(`system/oa/process/model/${id}`, {
    method: 'GET',
  });
}

export function createOaProcessModel(data: OaProcessModelCreateParams) {
  return request<R<OaProcessModelVo>>('system/oa/process/model', {
    method: 'POST',
    data,
  });
}

export function updateOaProcessModel(
  id: number | string,
  data: OaProcessModelUpdateParams,
) {
  return request<R<OaProcessModelVo>>(`system/oa/process/model/${id}`, {
    method: 'PUT',
    data,
  });
}

export function validateOaProcessBpmn(bpmnXml: string) {
  return request<R<OaBpmnValidateResultVo>>(
    'system/oa/process/model/validate',
    { method: 'POST', data: { bpmnXml } },
  );
}

export function publishOaProcessModel(
  id: number | string,
  data: OaProcessPublishParams,
) {
  return request<R<OaProcessPublishResultVo>>(
    `system/oa/process/model/${id}/publish`,
    { method: 'POST', data },
  );
}

export function disableOaProcessModel(id: number | string) {
  return request<R<OaProcessModelVo>>(
    `system/oa/process/model/${id}/disable`,
    { method: 'POST' },
  );
}

export function queryOaProcessReleases(id: number | string) {
  return request<R<OaProcessReleaseVo[]>>(
    `system/oa/process/model/${id}/releases`,
    { method: 'GET' },
  );
}

export type OaFormStatus = 'DRAFT' | 'PUBLISHED' | 'DISABLED';

export interface OaFormVo {
  id: number;
  formKey: string;
  name: string;
  description?: string | null;
  status: OaFormStatus;
  currentVersion: number;
  currentVersionId?: number | null;
  /** 草稿 schema；列表接口不返回 */
  schemaJson?: string | null;
  schemaDigest?: string | null;
  version: number;
  createTime?: string;
  updateTime?: string;
}

export interface OaFormVersionVo {
  id: number;
  version: number;
  /** 版本列表不返回完整 schema */
  schemaJson?: string | null;
  schemaDigest: string;
  fieldCount: number;
  publishedBy?: number | null;
  publishTime?: string;
}

export interface OaFormPublishResultVo {
  valid: boolean;
  errors: string[];
  versionId?: number | null;
  version?: number | null;
  schemaDigest?: string | null;
  fieldCount?: number | null;
}

export interface OaFormVersionOptionVo {
  formId: number;
  formKey: string;
  name: string;
  versionId: number;
  version: number;
  publishTime?: string;
}

export interface OaFormVersionDetailVo {
  id: number;
  formId: number;
  formKey: string;
  name: string;
  status: OaFormStatus;
  version: number;
  schemaJson: string;
  schemaDigest: string;
  fieldCount: number;
  publishTime?: string;
}

export interface OaFormQuery {
  keyword?: string;
  status?: string;
}

export interface OaFormCreateParams {
  formKey: string;
  name: string;
  description?: string;
  schemaJson?: string;
}

export interface OaFormUpdateParams {
  name: string;
  description?: string;
  schemaJson?: string;
  version: number;
}

export function queryOaForms(params: QueryParam<OaFormQuery>) {
  return request<R<PageResult<OaFormVo>>>('system/oa/form/page', {
    method: 'GET',
    params,
  });
}

export function getOaForm(id: number | string) {
  return request<R<OaFormVo>>(`system/oa/form/${id}`, { method: 'GET' });
}

export function createOaForm(data: OaFormCreateParams) {
  return request<R<OaFormVo>>('system/oa/form', { method: 'POST', data });
}

export function updateOaForm(
  id: number | string,
  data: OaFormUpdateParams,
) {
  return request<R<OaFormVo>>(`system/oa/form/${id}`, {
    method: 'PUT',
    data,
  });
}

export function publishOaForm(id: number | string) {
  return request<R<OaFormPublishResultVo>>(`system/oa/form/${id}/publish`, {
    method: 'POST',
  });
}

export function disableOaForm(id: number | string) {
  return request<R<OaFormVo>>(`system/oa/form/${id}/disable`, {
    method: 'POST',
  });
}

export function queryOaFormVersions(id: number | string) {
  return request<R<OaFormVersionVo[]>>(`system/oa/form/${id}/versions`, {
    method: 'GET',
  });
}

export function queryOaFormVersionOptions() {
  return request<R<OaFormVersionOptionVo[]>>('system/oa/form/version-options', {
    method: 'GET',
  });
}

export function getOaFormVersion(versionId: number | string) {
  return request<R<OaFormVersionDetailVo>>(
    `system/oa/form/version/${versionId}`,
    { method: 'GET' },
  );
}

/** 申请附件走登录即可用的公共上传，不要求文件管理权限；归属在发起时由服务端校验 */
export function uploadOaAttachment(file: File) {
  const data = new FormData();
  data.append('file', file);
  return request<R<FileUploadResp>>('system/common/file', {
    method: 'POST',
    data,
  });
}

export interface OaLaunchItemVo {
  releaseId: number;
  modelId: number;
  modelKey: string;
  modelName: string;
  category?: string | null;
  description?: string | null;
  releaseVersion: number;
  processDefinitionKey: string;
  formId: number;
  formVersionId: number;
  formVersion: number;
  formName: string;
  formKey: string;
  launchScope?: string | null;
  publishTime?: string;
}

export interface OaAssigneeVariableVo {
  name: string;
  /** 推荐来源；用户仍可在发起页改选 */
  suggestedType?: string | null;
  suggestedValue?: string | null;
}

export interface OaLaunchDetailVo extends OaLaunchItemVo {
  schemaJson: string;
  schemaDigest: string;
  launchable: boolean;
  assigneeVariables: OaAssigneeVariableVo[];
  businessType?: OaBusinessType | null;
}

export interface OaAssigneeBindingParam {
  variableName: string;
  type: string;
  value?: string;
}

export interface OaLaunchSubmitParams {
  requestId: string;
  title?: string;
  formData: Record<string, unknown>;
  assignees: OaAssigneeBindingParam[];
  /** 抄送人 userId（雪花 ID 用字符串传输），最多 20 人 */
  ccUserIds?: string[];
  /** 从草稿提交时携带；提交成功后草稿在同一事务内被消费 */
  draftId?: string;
}

export interface OaLaunchSubmitResultVo {
  applicationId: number;
  businessKey: string;
  processInstanceId: string;
  replayed: boolean;
}

export interface OaLaunchQuery {
  keyword?: string;
  category?: string;
}

export function queryOaLaunches(params: QueryParam<OaLaunchQuery>) {
  return request<R<PageResult<OaLaunchItemVo>>>('system/oa/launch/page', {
    method: 'GET',
    params,
  });
}

export function getOaLaunch(releaseId: number | string) {
  return request<R<OaLaunchDetailVo>>(`system/oa/launch/${releaseId}`, {
    method: 'GET',
  });
}

export function submitOaLaunch(
  releaseId: number | string,
  data: OaLaunchSubmitParams,
) {
  return request<R<OaLaunchSubmitResultVo>>(
    `system/oa/launch/${releaseId}/submit`,
    { method: 'POST', data },
  );
}

export interface OaDraftVo {
  id: string;
  releaseId: string;
  title?: string | null;
  modelName?: string | null;
  formName?: string | null;
  releaseVersion?: number | null;
  launchable: boolean;
  version: number;
  createTime?: string;
  updateTime?: string;
}

export interface OaDraftDetailVo {
  id: string;
  releaseId: string;
  title?: string | null;
  formData?: Record<string, unknown> | null;
  assignees?: OaAssigneeBindingParam[] | null;
  ccUserIds?: string[] | null;
  launchable: boolean;
  version: number;
  updateTime?: string;
}

export interface OaDraftSaveParams {
  releaseId: string;
  title?: string;
  formData: Record<string, unknown>;
  assignees: OaAssigneeBindingParam[];
  ccUserIds?: string[];
  version?: number;
}

export interface OaDraftSaveResultVo {
  id: string;
  version: number;
  updateTime?: string;
}

export function queryOaDrafts(params: QueryParam<{ keyword?: string }>) {
  return request<R<PageResult<OaDraftVo>>>('system/oa/draft/page', {
    method: 'GET',
    params,
  });
}

export function getOaDraft(id: string) {
  return request<R<OaDraftDetailVo>>(`system/oa/draft/${id}`, {
    method: 'GET',
  });
}

export function createOaDraft(data: OaDraftSaveParams) {
  return request<R<OaDraftSaveResultVo>>('system/oa/draft', {
    method: 'POST',
    data,
  });
}

export function updateOaDraft(id: string, data: OaDraftSaveParams) {
  return request<R<OaDraftSaveResultVo>>(`system/oa/draft/${id}`, {
    method: 'PUT',
    data,
  });
}

export function deleteOaDraft(id: string) {
  return request<R<null>>(`system/oa/draft/${id}`, { method: 'DELETE' });
}

export interface OaApplicationVo {
  id: number;
  businessType: string;
  businessKey: string;
  title: string;
  status: string;
  formVersion?: number | null;
  processInstanceId?: string | null;
  modelName?: string | null;
  formName?: string | null;
  submittedTime?: string;
  finishedTime?: string;
  createTime?: string;
}

export interface OaApplicationTimelineVo {
  action: string;
  operatorId?: number | null;
  operatorName?: string | null;
  taskId?: string | null;
  reason?: string | null;
  createTime?: string;
  originalAssigneeId?: number | string | null;
  originalAssigneeName?: string | null;
  targetUserId?: number | string | null;
  targetUserName?: string | null;
}

export interface OaApplicationDetailVo extends OaApplicationVo {
  applicantId?: number | null;
  applicantName?: string | null;
  applicantDeptId?: number | null;
  applicantDeptName?: string | null;
  releaseId: number;
  releaseVersion?: number | null;
  formVersionId?: number | null;
  formName?: string | null;
  formKey?: string | null;
  modelName?: string | null;
  modelKey?: string | null;
  schemaJson?: string | null;
  formData: Record<string, unknown>;
  /** 人员字段 key→姓名，服务端按表单 schema 解析 */
  formLabels?: Record<string, string>;
  timeline: OaApplicationTimelineVo[];
  ccReceivers?: OaCcReceiverVo[];
}

export interface OaCcReceiverVo {
  receiverId: number | string;
  receiverName?: string | null;
  /** UNREAD / READ / REVOKED */
  status: string;
  readTime?: string | null;
  /** 抄送发起人：发起时为申请人，审批中追加为追加人；只有本人可撤销 */
  ccById?: number | string | null;
  ccByName?: string | null;
  sourceTaskId?: string | null;
  revokeTime?: string | null;
}

export interface OaCcItemVo {
  id: number;
  applicationId: number;
  title: string;
  businessKey: string;
  applicationStatus: string;
  applicantName?: string | null;
  applicantDeptName?: string | null;
  modelName?: string | null;
  status: string;
  readTime?: string | null;
  createTime?: string;
}

export interface OaCcQuery {
  keyword?: string;
  status?: string;
}

export function queryOaCcPage(params: QueryParam<OaCcQuery>) {
  return request<R<PageResult<OaCcItemVo>>>('system/oa/cc/page', {
    method: 'GET',
    params,
  });
}

export function getOaCcDetail(applicationId: number | string) {
  return request<R<OaApplicationDetailVo>>(`system/oa/cc/${applicationId}`, {
    method: 'GET',
  });
}

export interface OaApplicationQuery {
  keyword?: string;
  status?: string;
}

export function queryOaApplications(
  params: QueryParam<OaApplicationQuery>,
) {
  return request<R<PageResult<OaApplicationVo>>>(
    'system/oa/application/page',
    { method: 'GET', params },
  );
}

export function getOaApplication(id: number | string) {
  return request<R<OaApplicationDetailVo>>(`system/oa/application/${id}`, {
    method: 'GET',
  });
}

export interface OaTodoTaskVo {
  applicationId: number;
  title: string;
  businessKey: string;
  modelName?: string | null;
  formName?: string | null;
  applicantName?: string | null;
  applicantDeptName?: string | null;
  taskId: string;
  taskName?: string | null;
  taskCreateTime?: string;
  submittedTime?: string;
  /** 代理处理时记录委托人 */
  proxyForId?: number | null;
  proxyForName?: string | null;
}

export interface OaDoneRecordVo {
  applicationId: number;
  title: string;
  businessKey: string;
  modelName?: string | null;
  formName?: string | null;
  applicantName?: string | null;
  action: string;
  reason?: string | null;
  taskId?: string | null;
  operatedTime?: string;
  applicationStatus: string;
}

export interface OaApprovalDetailVo {
  taskId: string;
  taskName?: string | null;
  taskDefinitionKey?: string | null;
  assignee?: string | null;
  pending: boolean;
  application: OaApplicationDetailVo;
  proxyForId?: number | null;
  proxyForName?: string | null;
}

export interface OaApprovalActionParams {
  requestId: string;
  reason?: string;
}

export interface OaApprovalActionResultVo {
  applicationId: number;
  status: string;
  taskId?: string | null;
  replayed: boolean;
}

export interface OaApprovalQuery {
  keyword?: string;
}

export function queryOaTodoTasks(params: QueryParam<OaApprovalQuery>) {
  return request<R<PageResult<OaTodoTaskVo>>>('system/oa/approval/todo', {
    method: 'GET',
    params,
  });
}

export function queryOaDoneRecords(params: QueryParam<OaApprovalQuery>) {
  return request<R<PageResult<OaDoneRecordVo>>>('system/oa/approval/done', {
    method: 'GET',
    params,
  });
}

export function getOaApprovalTask(taskId: string) {
  return request<R<OaApprovalDetailVo>>(
    `system/oa/approval/task/${taskId}`,
    { method: 'GET' },
  );
}

export function approveOaTask(
  taskId: string,
  data: OaApprovalActionParams,
) {
  return request<R<OaApprovalActionResultVo>>(
    `system/oa/approval/task/${taskId}/approve`,
    { method: 'POST', data },
  );
}

export function rejectOaTask(taskId: string, data: OaApprovalActionParams) {
  return request<R<OaApprovalActionResultVo>>(
    `system/oa/approval/task/${taskId}/reject`,
    { method: 'POST', data },
  );
}

export function returnOaTask(taskId: string, data: OaApprovalActionParams) {
  return request<R<OaApprovalActionResultVo>>(
    `system/oa/approval/task/${taskId}/return`,
    { method: 'POST', data },
  );
}

export function claimOaTask(taskId: string, data: OaApprovalActionParams) {
  return request<R<OaApprovalActionResultVo>>(
    `system/oa/approval/task/${taskId}/claim`,
    { method: 'POST', data },
  );
}

export interface OaTaskTransferParams {
  requestId: string;
  targetUserId: number;
  reason?: string;
}

export function transferOaTask(
  taskId: string,
  data: OaTaskTransferParams,
) {
  return request<R<OaApprovalActionResultVo>>(
    `system/oa/approval/task/${taskId}/transfer`,
    { method: 'POST', data },
  );
}

export interface OaTaskCcParams {
  requestId: string;
  /** 以字符串传递，避免雪花 ID 精度丢失 */
  receiverIds: string[];
  reason?: string;
}

export function addOaTaskCc(taskId: string, data: OaTaskCcParams) {
  return request<R<OaApprovalActionResultVo>>(
    `system/oa/approval/task/${taskId}/cc`,
    { method: 'POST', data },
  );
}

export function revokeOaCc(
  applicationId: number | string,
  receiverId: number | string,
  data: OaApprovalActionParams,
) {
  return request<R<OaApprovalActionResultVo>>(
    `system/oa/approval/application/${applicationId}/cc/${receiverId}/revoke`,
    { method: 'POST', data },
  );
}

export interface OaDelegateRuleVo {
  id: number;
  delegatorId: number;
  delegatorName?: string | null;
  delegateId: number;
  delegateName?: string | null;
  startTime: string;
  endTime: string;
  status: string;
  reason?: string | null;
  active: boolean;
  createTime?: string;
}

export interface OaDelegateRuleCreateParams {
  delegateId: number;
  startTime: string;
  endTime: string;
  reason?: string;
}

export function queryOaDelegateRules() {
  return request<R<OaDelegateRuleVo[]>>('system/oa/approval/delegate', {
    method: 'GET',
  });
}

export function createOaDelegateRule(data: OaDelegateRuleCreateParams) {
  return request<R<OaDelegateRuleVo>>('system/oa/approval/delegate', {
    method: 'POST',
    data,
  });
}

export function deleteOaDelegateRule(id: number | string) {
  return request<R<null>>(`system/oa/approval/delegate/${id}`, {
    method: 'DELETE',
  });
}

export function withdrawOaApplication(
  applicationId: number | string,
  data: OaApprovalActionParams,
) {
  return request<R<OaApprovalActionResultVo>>(
    `system/oa/approval/application/${applicationId}/withdraw`,
    { method: 'POST', data },
  );
}

export type OaEmploymentStatus = 'ACTIVE' | 'SUSPENDED' | 'RESIGNED';

export interface OaEmployeePositionVo {
  id: number;
  code: string;
  name: string;
}

export interface OaEmployeeVo {
  id: number;
  userId: number;
  nickname: string;
  username: string;
  deptId?: number | null;
  deptName?: string | null;
  employeeNo?: string | null;
  supervisorId?: number | null;
  supervisorName?: string | null;
  employmentStatus: OaEmploymentStatus;
  deptLeader: boolean;
  hireDate?: string | null;
  leaveDate?: string | null;
  positions: OaEmployeePositionVo[];
  version: number;
  createTime?: string;
  updateTime?: string;
}

export interface OaEmployeeOptionVo {
  userId: number;
  nickname: string;
  username: string;
  deptId?: number | null;
  deptName?: string | null;
  employeeNo?: string | null;
}

export interface OaEmployeeCreateParams {
  userId: number;
  employeeNo?: string;
  supervisorId?: number;
  employmentStatus: OaEmploymentStatus;
  deptLeader: boolean;
  hireDate?: string;
  leaveDate?: string;
  positionIds: number[];
}

export interface OaEmployeeUpdateParams {
  employeeNo?: string;
  supervisorId?: number;
  employmentStatus: OaEmploymentStatus;
  deptLeader: boolean;
  hireDate?: string;
  leaveDate?: string;
  positionIds: number[];
  version: number;
}

export interface OaEmployeeQuery {
  keyword?: string;
  status?: string;
}

export function queryOaEmployees(params: QueryParam<OaEmployeeQuery>) {
  return request<R<PageResult<OaEmployeeVo>>>(
    'system/oa/staff/employee/page',
    { method: 'GET', params },
  );
}

export function getOaEmployee(id: number | string) {
  return request<R<OaEmployeeVo>>(`system/oa/staff/employee/${id}`, {
    method: 'GET',
  });
}

export function createOaEmployee(data: OaEmployeeCreateParams) {
  return request<R<OaEmployeeVo>>('system/oa/staff/employee', {
    method: 'POST',
    data,
  });
}

export function updateOaEmployee(
  id: number | string,
  data: OaEmployeeUpdateParams,
) {
  return request<R<OaEmployeeVo>>(`system/oa/staff/employee/${id}`, {
    method: 'PUT',
    data,
  });
}

export interface OaEmployeeHandoverParams {
  targetUserId: number;
  reason?: string;
}

export interface OaHandoverResultVo {
  transferred: number;
}

export function handoverOaEmployee(
  id: number | string,
  data: OaEmployeeHandoverParams,
) {
  return request<R<OaHandoverResultVo>>(
    `system/oa/staff/employee/${id}/handover`,
    { method: 'POST', data },
  );
}

export function queryOaEmployeeOptions(params?: { keyword?: string }) {
  return request<R<OaEmployeeOptionVo[]>>('system/oa/staff/employee/options', {
    method: 'GET',
    params,
  });
}

export function queryOaEmployeeUserOptions(params?: { keyword?: string }) {
  return request<R<OaEmployeeOptionVo[]>>(
    'system/oa/staff/employee/user-options',
    { method: 'GET', params },
  );
}

export type OaPositionStatus = 'ENABLED' | 'DISABLED';

export interface OaPositionVo {
  id: number;
  code: string;
  name: string;
  status: OaPositionStatus;
  sort: number;
  employeeCount: number;
  version: number;
  createTime?: string;
  updateTime?: string;
}

export interface OaPositionOptionVo {
  id: number;
  code: string;
  name: string;
}

export interface OaPositionQuery {
  keyword?: string;
  status?: string;
}

export function queryOaPositions(params: QueryParam<OaPositionQuery>) {
  return request<R<PageResult<OaPositionVo>>>(
    'system/oa/staff/position/page',
    { method: 'GET', params },
  );
}

export function createOaPosition(data: {
  code: string;
  name: string;
  sort: number;
}) {
  return request<R<OaPositionVo>>('system/oa/staff/position', {
    method: 'POST',
    data,
  });
}

export function updateOaPosition(
  id: number | string,
  data: {
    name: string;
    sort: number;
    status: OaPositionStatus;
    version: number;
  },
) {
  return request<R<OaPositionVo>>(`system/oa/staff/position/${id}`, {
    method: 'PUT',
    data,
  });
}

export function queryOaPositionOptions() {
  return request<R<OaPositionOptionVo[]>>('system/oa/staff/position/options', {
    method: 'GET',
  });
}

export interface OaNotificationVo {
  id: number;
  type: string;
  title: string;
  content?: string | null;
  applicationId?: number | null;
  taskId?: string | null;
  status: 'UNREAD' | 'READ';
  readTime?: string | null;
  createTime?: string;
}

export interface OaNotificationQuery {
  unreadOnly?: boolean;
}

export interface OaUnreadCountVo {
  count: number;
}

export function queryOaNotifications(
  params: QueryParam<OaNotificationQuery>,
) {
  return request<R<PageResult<OaNotificationVo>>>(
    'system/oa/notification/page',
    { method: 'GET', params },
  );
}

export function queryOaUnreadCount() {
  return request<R<OaUnreadCountVo>>('system/oa/notification/unread-count', {
    method: 'GET',
  });
}

export function readOaNotification(id: number | string) {
  return request<R<null>>(`system/oa/notification/${id}/read`, {
    method: 'POST',
  });
}

export function readAllOaNotifications() {
  return request<R<number>>('system/oa/notification/read-all', {
    method: 'POST',
  });
}

export interface OaOutboxEventVo {
  id: number;
  tenantId: number;
  eventId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload?: string | null;
  status: string;
  retryCount: number;
  nextRetryTime?: string | null;
  lastError?: string | null;
  createTime?: string;
  sentTime?: string | null;
}

export interface OaOutboxQuery {
  status?: string;
  keyword?: string;
}

export interface OaOutboxDispatchResultVo {
  scanned: number;
  sent: number;
  failed: number;
}

export function queryOaOutboxEvents(params: QueryParam<OaOutboxQuery>) {
  return request<R<PageResult<OaOutboxEventVo>>>('system/oa/ops/outbox', {
    method: 'GET',
    params,
  });
}

export function retryOaOutboxEvent(id: number | string) {
  return request<R<null>>(`system/oa/ops/outbox/${id}/retry`, {
    method: 'POST',
  });
}

export function dispatchOaOutbox() {
  return request<R<OaOutboxDispatchResultVo>>('system/oa/ops/outbox/dispatch', {
    method: 'POST',
  });
}

export interface OaOpsTerminateParams {
  requestId: string;
  reason: string;
}

export function terminateOaApplication(
  id: number | string,
  data: OaOpsTerminateParams,
) {
  return request<R<OaApprovalActionResultVo>>(
    `system/oa/ops/application/${id}/terminate`,
    { method: 'POST', data },
  );
}

export interface OaUrgeResultVo {
  applicationId: number;
  taskCount: number;
  recipients: number[];
  urgedAt?: string;
  nextAllowedTime?: string;
}

export function urgeOaApplication(
  id: number | string,
  data: OaApprovalActionParams,
) {
  return request<R<OaUrgeResultVo>>(
    `system/oa/application/${id}/urge`,
    { method: 'POST', data },
  );
}

/** 后端 BigDecimal 可能序列化为字符串，展示和计算前统一转 number */
export type OaDecimal = number | string;

export type OaLeaveTypeStatus = 'ENABLED' | 'DISABLED';

export interface OaLeaveTypeVo {
  id: number;
  code: string;
  name: string;
  balanceRequired: boolean;
  maxDaysPerRequest?: OaDecimal | null;
  status: OaLeaveTypeStatus;
  sort: number;
  remark?: string | null;
  version: number;
  createTime?: string;
  updateTime?: string;
}

export interface OaLeaveTypeParams {
  code?: string;
  name: string;
  balanceRequired: boolean;
  maxDaysPerRequest?: number | null;
  status?: OaLeaveTypeStatus;
  sort?: number;
  remark?: string;
  version?: number;
}

export type OaWorkDayType = 'WORKDAY' | 'HOLIDAY';

export interface OaWorkCalendarVo {
  id: number;
  calendarDate: string;
  dayType: OaWorkDayType;
  name?: string | null;
}

export interface OaLeaveBalanceVo {
  id: number;
  userId: number;
  userName?: string | null;
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  periodYear: number;
  totalDays: OaDecimal;
  usedDays: OaDecimal;
  occupiedDays: OaDecimal;
  availableDays: OaDecimal;
  updateTime?: string;
}

export interface OaLeaveBalanceQuery {
  year?: number;
  keyword?: string;
  userId?: number;
}

export interface OaLeaveGrantParams {
  userId: string;
  leaveTypeId: number;
  periodYear: number;
  days: number;
  remark?: string;
}

export interface OaLeaveLedgerVo {
  id: number;
  balanceId: number;
  applicationId?: number | null;
  action: 'GRANT' | 'OCCUPY' | 'DEDUCT' | 'RELEASE' | string;
  days: OaDecimal;
  totalAfter: OaDecimal;
  usedAfter: OaDecimal;
  occupiedAfter: OaDecimal;
  operatorId: number;
  operatorName?: string | null;
  remark?: string | null;
  createTime?: string;
}

export interface OaLeaveRequestVo {
  id: number;
  applicationId: number;
  title?: string | null;
  applicationStatus?: string | null;
  leaveTypeCode: string;
  leaveTypeName: string;
  startDate: string;
  startHalf: 'AM' | 'PM';
  endDate: string;
  endHalf: 'AM' | 'PM';
  days: OaDecimal;
  periodYear: number;
  status: 'OCCUPIED' | 'DEDUCTED' | 'RELEASED' | 'RECORDED' | string;
  createTime?: string;
}

export interface OaLeavePreviewVo {
  days?: OaDecimal | null;
  periodYear?: number | null;
  balanceRequired: boolean;
  availableDays?: OaDecimal | null;
  message?: string | null;
}

export interface OaLeaveTemplateVo {
  formId: number;
  formVersionId: number;
  modelId: number;
  modelKey: string;
}

export function queryOaLeaveTypes(enabledOnly = false) {
  return request<R<OaLeaveTypeVo[]>>('system/oa/leave/types', {
    method: 'GET',
    params: { enabledOnly },
  });
}

export function createOaLeaveType(data: OaLeaveTypeParams) {
  return request<R<OaLeaveTypeVo>>('system/oa/leave/types', {
    method: 'POST',
    data,
  });
}

export function updateOaLeaveType(id: number | string, data: OaLeaveTypeParams) {
  return request<R<OaLeaveTypeVo>>(`system/oa/leave/types/${id}`, {
    method: 'PUT',
    data,
  });
}

export function queryOaWorkCalendar(year: number) {
  return request<R<OaWorkCalendarVo[]>>('system/oa/leave/calendar', {
    method: 'GET',
    params: { year },
  });
}

export function saveOaWorkCalendar(data: {
  calendarDate: string;
  dayType: OaWorkDayType;
  name?: string;
}) {
  return request<R<null>>('system/oa/leave/calendar', {
    method: 'PUT',
    data,
  });
}

export function deleteOaWorkCalendar(date: string) {
  return request<R<null>>(`system/oa/leave/calendar/${date}`, {
    method: 'DELETE',
  });
}

export function queryOaLeaveBalances(params: QueryParam<OaLeaveBalanceQuery>) {
  return request<R<PageResult<OaLeaveBalanceVo>>>(
    'system/oa/leave/balances',
    { method: 'GET', params },
  );
}

export function grantOaLeaveBalance(data: OaLeaveGrantParams) {
  return request<R<OaLeaveBalanceVo>>('system/oa/leave/balances/grant', {
    method: 'POST',
    data,
  });
}

export function queryOaLeaveLedger(balanceId: number | string) {
  return request<R<OaLeaveLedgerVo[]>>(
    `system/oa/leave/balances/${balanceId}/ledger`,
    { method: 'GET' },
  );
}

export function createOaLeaveTemplate() {
  return request<R<OaLeaveTemplateVo>>('system/oa/leave/template', {
    method: 'POST',
  });
}

export function queryMyOaLeaveBalances(year?: number) {
  return request<R<OaLeaveBalanceVo[]>>('system/oa/leave/mine/balances', {
    method: 'GET',
    params: { year },
  });
}

export function queryMyOaLeaveRequests(params: QueryParam<object>) {
  return request<R<PageResult<OaLeaveRequestVo>>>(
    'system/oa/leave/mine/requests',
    { method: 'GET', params },
  );
}

export function previewOaLeave(formData: Record<string, unknown>) {
  return request<R<OaLeavePreviewVo>>('system/oa/leave/preview', {
    method: 'POST',
    data: formData,
  });
}

export type OaExpenseCategoryStatus = 'ENABLED' | 'DISABLED';

export interface OaExpenseCategoryVo {
  id: number;
  code: string;
  name: string;
  perItemLimit?: OaDecimal | null;
  invoiceRequired: boolean;
  status: OaExpenseCategoryStatus;
  sort: number;
  remark?: string | null;
  version: number;
  createTime?: string;
  updateTime?: string;
}

export interface OaExpenseCategoryParams {
  code?: string;
  name: string;
  perItemLimit?: number | null;
  invoiceRequired: boolean;
  status?: OaExpenseCategoryStatus;
  sort?: number;
  remark?: string;
  version?: number;
}

export type OaExpenseStatus =
  | 'APPROVING'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'CLOSED';

export type OaExpensePayMethod = 'BANK_TRANSFER' | 'CASH' | 'OTHER';

export interface OaExpenseVo {
  id: number;
  applicationId: number;
  title?: string | null;
  applicationStatus?: string | null;
  applicantId: number;
  applicantName?: string | null;
  totalAmount: OaDecimal;
  itemCount: number;
  status: OaExpenseStatus | string;
  paidAmount?: OaDecimal | null;
  payDate?: string | null;
  payMethod?: OaExpensePayMethod | string | null;
  payReference?: string | null;
  payRemark?: string | null;
  payerId?: number | null;
  payerName?: string | null;
  paidTime?: string | null;
  createTime?: string;
}

export interface OaExpenseItemVo {
  lineNo: number;
  categoryCode: string;
  categoryName: string;
  amount: OaDecimal;
  expenseDate?: string | null;
  invoiceNo?: string | null;
  description?: string | null;
}

export interface OaExpenseDetailVo {
  expense: OaExpenseVo;
  items: OaExpenseItemVo[];
}

export interface OaExpenseRecordQuery {
  status?: string;
  keyword?: string;
}

export interface OaExpensePayParams {
  paidAmount: number;
  payDate: string;
  payMethod: OaExpensePayMethod;
  payReference?: string;
  remark?: string;
}

export interface OaExpensePreviewVo {
  totalAmount?: OaDecimal | null;
  itemCount: number;
  message?: string | null;
}

export interface OaExpenseTemplateVo {
  formId: number;
  formVersionId: number;
  modelId: number;
  modelKey: string;
}

export function queryOaExpenseCategories(enabledOnly = false) {
  return request<R<OaExpenseCategoryVo[]>>('system/oa/expense/categories', {
    method: 'GET',
    params: { enabledOnly },
  });
}

export function createOaExpenseCategory(data: OaExpenseCategoryParams) {
  return request<R<OaExpenseCategoryVo>>('system/oa/expense/categories', {
    method: 'POST',
    data,
  });
}

export function updateOaExpenseCategory(
  id: number | string,
  data: OaExpenseCategoryParams,
) {
  return request<R<OaExpenseCategoryVo>>(
    `system/oa/expense/categories/${id}`,
    { method: 'PUT', data },
  );
}

export function queryOaExpenseRecords(
  params: QueryParam<OaExpenseRecordQuery>,
) {
  return request<R<PageResult<OaExpenseVo>>>('system/oa/expense/records', {
    method: 'GET',
    params,
  });
}

export function getOaExpenseRecord(id: number | string) {
  return request<R<OaExpenseDetailVo>>(`system/oa/expense/records/${id}`, {
    method: 'GET',
  });
}

export function payOaExpense(id: number | string, data: OaExpensePayParams) {
  return request<R<OaExpenseVo>>(`system/oa/expense/records/${id}/pay`, {
    method: 'POST',
    data,
  });
}

export function createOaExpenseTemplate() {
  return request<R<OaExpenseTemplateVo>>('system/oa/expense/template', {
    method: 'POST',
  });
}

export function queryMyOaExpenses(params: QueryParam<{ status?: string }>) {
  return request<R<PageResult<OaExpenseVo>>>('system/oa/expense/mine', {
    method: 'GET',
    params,
  });
}

export function getMyOaExpense(id: number | string) {
  return request<R<OaExpenseDetailVo>>(`system/oa/expense/mine/${id}`, {
    method: 'GET',
  });
}

export function previewOaExpense(formData: Record<string, unknown>) {
  return request<R<OaExpensePreviewVo>>('system/oa/expense/preview', {
    method: 'POST',
    data: formData,
  });
}
