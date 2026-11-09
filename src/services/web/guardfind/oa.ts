import { request } from 'umi';
import type { PageResult, QueryParam, R } from '@/typings';
import type { FileUploadResp } from '../file/typings';

export type OaProcessStatus = 'DRAFT' | 'PUBLISHED' | 'DISABLED';

export type OaBusinessType =
  | 'GENERIC'
  | 'LEAVE'
  | 'EXPENSE'
  | 'TRAVEL'
  | 'LOAN'
  | 'ATTENDANCE_CORRECTION'
  | 'OVERTIME'
  | 'OUTING'
  | 'PURCHASE'
  | 'SUPPLY_REQUEST'
  | 'ASSET_SCRAP'
  | 'CONTRACT'
  | 'SEAL_USE'
  | 'DOCUMENT';

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
  travelId?: number | null;
  travelNo?: string | null;
  overBudget?: boolean;
  writeOffAmount?: OaDecimal | null;
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
  writeOffs?: OaLoanLedgerVo[];
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
  writeOffs?: OaExpenseWriteOffParams[];
}

export interface OaExpenseWriteOffParams {
  loanId: number;
  amount: number;
}

export interface OaExpensePreviewVo {
  totalAmount?: OaDecimal | null;
  itemCount: number;
  message?: string | null;
  overBudget?: boolean;
  budgetHint?: string | null;
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

export type OaTravelStatus = 'APPROVING' | 'APPROVED' | 'CLOSED';

export type OaLoanStatus =
  | 'APPROVING'
  | 'PENDING_DISBURSE'
  | 'OUTSTANDING'
  | 'SETTLED'
  | 'CLOSED';

export type OaLoanLedgerAction = 'DISBURSE' | 'WRITE_OFF' | 'REPAY';

export interface OaTravelVo {
  id: number;
  applicationId: number;
  title?: string | null;
  applicationStatus?: string | null;
  applicantId: number;
  applicantName?: string | null;
  travelNo: string;
  destination: string;
  startDate: string;
  endDate: string;
  days: number;
  budgetAmount: OaDecimal;
  status: OaTravelStatus | string;
  loanAmount?: OaDecimal | null;
  loanBalance?: OaDecimal | null;
  expenseAmount?: OaDecimal | null;
  createTime?: string;
}

export interface OaLoanVo {
  id: number;
  applicationId: number;
  title?: string | null;
  applicationStatus?: string | null;
  applicantId: number;
  applicantName?: string | null;
  travelId?: number | null;
  travelNo?: string | null;
  amount: OaDecimal;
  balance: OaDecimal;
  status: OaLoanStatus | string;
  expectedRepayDate?: string | null;
  disburseDate?: string | null;
  disburseMethod?: OaExpensePayMethod | string | null;
  disburseReference?: string | null;
  disburserId?: number | null;
  disburserName?: string | null;
  disbursedTime?: string | null;
  settledTime?: string | null;
  createTime?: string;
}

export interface OaLoanLedgerVo {
  id: number;
  loanId: number;
  action: OaLoanLedgerAction | string;
  amount: OaDecimal;
  balanceAfter: OaDecimal;
  expenseId?: number | null;
  bizDate: string;
  method?: OaExpensePayMethod | string | null;
  reference?: string | null;
  operatorId?: number | null;
  operatorName?: string | null;
  remark?: string | null;
  createTime?: string;
}

export interface OaTravelDetailVo {
  travel: OaTravelVo;
  loans: OaLoanVo[];
  expenses: OaExpenseVo[];
}

export interface OaLoanDetailVo {
  loan: OaLoanVo;
  ledger: OaLoanLedgerVo[];
}

export interface OaTravelQuery {
  status?: string;
  keyword?: string;
}

export interface OaLoanDisburseParams {
  amount: number;
  disburseDate: string;
  method: OaExpensePayMethod;
  reference?: string;
  remark?: string;
}

export interface OaLoanRepayParams {
  requestId: string;
  amount: number;
  repayDate: string;
  method: OaExpensePayMethod;
  reference?: string;
  remark?: string;
}

export interface OaTravelTemplateVo {
  travelFormId: number;
  travelModelId: number;
  travelModelKey: string;
  loanFormId: number;
  loanModelId: number;
  loanModelKey: string;
}

export function queryOaTravels(params: QueryParam<OaTravelQuery>) {
  return request<R<PageResult<OaTravelVo>>>('system/oa/travel/records', {
    method: 'GET',
    params,
  });
}

export function getOaTravel(id: number | string) {
  return request<R<OaTravelDetailVo>>(`system/oa/travel/records/${id}`, {
    method: 'GET',
  });
}

export function queryOaLoans(params: QueryParam<OaTravelQuery>) {
  return request<R<PageResult<OaLoanVo>>>('system/oa/travel/loans', {
    method: 'GET',
    params,
  });
}

export function getOaLoan(id: number | string) {
  return request<R<OaLoanDetailVo>>(`system/oa/travel/loans/${id}`, {
    method: 'GET',
  });
}

export function queryOaOutstandingLoans(applicantId: number | string) {
  return request<R<OaLoanVo[]>>('system/oa/travel/loans/outstanding', {
    method: 'GET',
    params: { applicantId },
  });
}

export function disburseOaLoan(
  id: number | string,
  data: OaLoanDisburseParams,
) {
  return request<R<OaLoanVo>>(`system/oa/travel/loans/${id}/disburse`, {
    method: 'POST',
    data,
  });
}

export function repayOaLoan(id: number | string, data: OaLoanRepayParams) {
  return request<R<OaLoanVo>>(`system/oa/travel/loans/${id}/repay`, {
    method: 'POST',
    data,
  });
}

export function createOaTravelTemplate() {
  return request<R<OaTravelTemplateVo>>('system/oa/travel/template', {
    method: 'POST',
  });
}

export function queryMyOaTravels(params: QueryParam<{ status?: string }>) {
  return request<R<PageResult<OaTravelVo>>>('system/oa/travel/mine', {
    method: 'GET',
    params,
  });
}

export function getMyOaTravel(id: number | string) {
  return request<R<OaTravelDetailVo>>(`system/oa/travel/mine/${id}`, {
    method: 'GET',
  });
}

export function queryMyOaLoans(params: QueryParam<{ status?: string }>) {
  return request<R<PageResult<OaLoanVo>>>('system/oa/travel/mine/loans', {
    method: 'GET',
    params,
  });
}

export function getMyOaLoan(id: number | string) {
  return request<R<OaLoanDetailVo>>(`system/oa/travel/mine/loans/${id}`, {
    method: 'GET',
  });
}

export type OaShiftStatus = 'ENABLED' | 'DISABLED';

export interface OaShiftVo {
  id: number;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  status: OaShiftStatus | string;
  remark?: string | null;
  version: number;
  updateTime?: string | null;
}

export interface OaShiftParams {
  code?: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes?: number;
  status?: OaShiftStatus;
  remark?: string;
  version?: number;
}

export interface OaScheduleVo {
  userId: number;
  userName?: string | null;
  workDate: string;
  shiftId?: number | null;
  shiftCode?: string | null;
  shiftName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

export interface OaScheduleSaveParams {
  userIds: string[];
  startDate: string;
  endDate: string;
  /** ISO 星期，1=周一 … 7=周日；为空表示每天 */
  weekdays?: number[];
  shiftId?: number;
  clear?: boolean;
}

export interface OaAttendanceRangeQuery {
  start: string;
  end: string;
  userId?: string;
}

export interface OaAttendanceRecordVo {
  id: number;
  userId: number;
  userName?: string | null;
  employeeNo?: string | null;
  workDate: string;
  checkIn?: string | null;
  checkOut?: string | null;
  checkInSource?: string | null;
  checkOutSource?: string | null;
  importId?: number | null;
  updateTime?: string | null;
}

export interface OaAttendanceImportRow {
  employeeNo: string;
  workDate: string;
  checkIn?: string;
  checkOut?: string;
}

export interface OaAttendanceImportParams {
  requestId?: string;
  fileName?: string;
  rows: OaAttendanceImportRow[];
}

export interface OaAttendanceImportVo {
  valid: boolean;
  replayed: boolean;
  importId?: number | null;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  keptCorrections: number;
  errors: string[];
}

export interface OaAttendanceDailyVo {
  userId: number;
  userName?: string | null;
  workDate: string;
  shiftName?: string | null;
  shiftStart?: string | null;
  shiftEnd?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  checkInSource?: string | null;
  checkOutSource?: string | null;
  status: string;
  late: boolean;
  early: boolean;
  overtimeHours: OaDecimal;
  note?: string | null;
}

export interface OaAttendanceSummaryVo {
  userId: number;
  userName?: string | null;
  employeeNo?: string | null;
  scheduledDays: number;
  normalDays: number;
  lateCount: number;
  earlyCount: number;
  missingCount: number;
  absentDays: number;
  leaveDays: number;
  travelDays: number;
  outingCount: number;
  overtimeHours: OaDecimal;
  correctionCount: number;
}

export type OaAttendanceRequestKind = 'CORRECTION' | 'OVERTIME' | 'OUTING';

export interface OaAttendanceRequestVo {
  id: number;
  applicationId: number;
  title?: string | null;
  applicationStatus?: string | null;
  applicantId: number;
  applicantName?: string | null;
  kind: OaAttendanceRequestKind | string;
  workDate: string;
  startTime: string;
  endTime: string;
  hours: OaDecimal;
  checkType?: string | null;
  destination?: string | null;
  status: string;
  createTime?: string | null;
}

export interface OaAttendanceRequestQuery {
  kind?: string;
  status?: string;
  keyword?: string;
}

export interface OaAttendanceTemplateVo {
  correctionFormId: number;
  correctionModelId: number;
  correctionModelKey: string;
  overtimeFormId: number;
  overtimeModelId: number;
  overtimeModelKey: string;
  outingFormId: number;
  outingModelId: number;
  outingModelKey: string;
}

export function queryOaShifts(status?: string) {
  return request<R<OaShiftVo[]>>('system/oa/attendance/shifts', {
    method: 'GET',
    params: { status },
  });
}

export function createOaShift(data: OaShiftParams) {
  return request<R<OaShiftVo>>('system/oa/attendance/shifts', {
    method: 'POST',
    data,
  });
}

export function updateOaShift(id: number | string, data: OaShiftParams) {
  return request<R<OaShiftVo>>(`system/oa/attendance/shifts/${id}`, {
    method: 'PUT',
    data,
  });
}

export function queryOaSchedules(params: OaAttendanceRangeQuery) {
  return request<R<OaScheduleVo[]>>('system/oa/attendance/schedules', {
    method: 'GET',
    params,
  });
}

export function saveOaSchedules(data: OaScheduleSaveParams) {
  return request<R<number>>('system/oa/attendance/schedules', {
    method: 'POST',
    data,
  });
}

export function queryOaAttendanceRecords(
  params: QueryParam<OaAttendanceRangeQuery>,
) {
  return request<R<PageResult<OaAttendanceRecordVo>>>(
    'system/oa/attendance/records',
    { method: 'GET', params },
  );
}

export function previewOaAttendanceImport(data: OaAttendanceImportParams) {
  return request<R<OaAttendanceImportVo>>(
    'system/oa/attendance/import/preview',
    { method: 'POST', data },
  );
}

export function commitOaAttendanceImport(data: OaAttendanceImportParams) {
  return request<R<OaAttendanceImportVo>>(
    'system/oa/attendance/import/commit',
    { method: 'POST', data },
  );
}

export function queryOaAttendanceDaily(params: {
  userId: string;
  start: string;
  end: string;
}) {
  return request<R<OaAttendanceDailyVo[]>>('system/oa/attendance/daily', {
    method: 'GET',
    params,
  });
}

export function queryOaAttendanceSummary(params: {
  month: string;
  keyword?: string;
}) {
  return request<R<OaAttendanceSummaryVo[]>>('system/oa/attendance/summary', {
    method: 'GET',
    params,
  });
}

export function queryOaAttendanceRequests(
  params: QueryParam<OaAttendanceRequestQuery>,
) {
  return request<R<PageResult<OaAttendanceRequestVo>>>(
    'system/oa/attendance/requests',
    { method: 'GET', params },
  );
}

export function createOaAttendanceTemplate() {
  return request<R<OaAttendanceTemplateVo>>('system/oa/attendance/template', {
    method: 'POST',
  });
}

export function queryMyOaAttendanceDaily(params: {
  start: string;
  end: string;
}) {
  return request<R<OaAttendanceDailyVo[]>>(
    'system/oa/attendance/mine/daily',
    { method: 'GET', params },
  );
}

export function queryMyOaAttendanceRequests(
  params: QueryParam<{ kind?: string; status?: string }>,
) {
  return request<R<PageResult<OaAttendanceRequestVo>>>(
    'system/oa/attendance/mine/requests',
    { method: 'GET', params },
  );
}

export type OaPurchaseStatus =
  | 'APPROVING'
  | 'PENDING_ORDER'
  | 'ORDERED'
  | 'PARTIAL'
  | 'RECEIVED'
  | 'CLOSED';

export type OaPurchaseCategory = 'SUPPLY' | 'ASSET' | 'OTHER';

export interface OaDeptOptionVo {
  id: number;
  name: string;
}

export interface OaPurchaseBudgetVo {
  id: number;
  deptId: number;
  deptName?: string | null;
  budgetYear: number;
  amount: OaDecimal;
  usedAmount: OaDecimal;
  occupiedAmount: OaDecimal;
  availableAmount: OaDecimal;
  remark?: string | null;
  version: number;
  updateTime?: string | null;
}

export interface OaPurchaseBudgetLedgerVo {
  id: number;
  budgetId: number;
  action: string;
  amount: OaDecimal;
  purchaseId?: number | null;
  purchaseNo?: string | null;
  operatorId: number;
  operatorName?: string | null;
  remark?: string | null;
  createTime?: string;
}

export interface OaPurchaseBudgetParams {
  deptId: number;
  budgetYear: number;
  amount: number;
  remark?: string;
  version?: number;
}

export interface OaPurchaseVo {
  id: number;
  applicationId: number;
  title?: string | null;
  applicationStatus?: string | null;
  applicantId: number;
  applicantName?: string | null;
  deptId: number;
  deptName?: string | null;
  purchaseNo: string;
  totalAmount: OaDecimal;
  itemCount: number;
  expectedDate?: string | null;
  status: OaPurchaseStatus | string;
  supplier?: string | null;
  orderNo?: string | null;
  orderDate?: string | null;
  ordererId?: number | null;
  ordererName?: string | null;
  orderedTime?: string | null;
  receivedTime?: string | null;
  createTime?: string;
}

export interface OaPurchaseItemVo {
  id: number;
  lineNo: number;
  itemName: string;
  category: OaPurchaseCategory | string;
  supplyCode?: string | null;
  spec?: string | null;
  quantity: number;
  unitPrice: OaDecimal;
  amount: OaDecimal;
  receivedQty: number;
}

export interface OaPurchaseReceiptLineVo {
  receiptId: number;
  itemId: number;
  itemName: string;
  quantity: number;
}

export interface OaPurchaseReceiptVo {
  id: number;
  requestId: string;
  receiveDate: string;
  receiverId: number;
  receiverName?: string | null;
  remark?: string | null;
  createTime?: string;
  lines: OaPurchaseReceiptLineVo[];
}

export interface OaPurchaseDetailVo {
  purchase: OaPurchaseVo;
  items: OaPurchaseItemVo[];
  receipts: OaPurchaseReceiptVo[];
  assets: OaAssetVo[];
}

export interface OaPurchaseOrderParams {
  supplier: string;
  orderNo?: string;
  orderDate: string;
}

export interface OaPurchaseReceiveParams {
  requestId: string;
  receiveDate: string;
  location?: string;
  remark?: string;
  lines: { itemId: number; quantity: number }[];
}

export interface OaPurchaseTemplateVo {
  formId: number;
  modelId: number;
  modelKey: string;
}

export type OaAssetStatus = 'IN_STOCK' | 'IN_USE' | 'REPAIR' | 'SCRAPPED';

export type OaAssetAction =
  | 'ASSIGN'
  | 'RETURN'
  | 'TRANSFER'
  | 'REPAIR'
  | 'REPAIRED';

export interface OaSupplyItemVo {
  id: number;
  code: string;
  name: string;
  spec?: string | null;
  unit: string;
  stock: number;
  safetyStock: number;
  belowSafety: boolean;
  status: 'ENABLED' | 'DISABLED' | string;
  version: number;
  updateTime?: string | null;
}

export interface OaSupplyItemParams {
  code: string;
  name: string;
  spec?: string;
  unit: string;
  safetyStock: number;
  status?: 'ENABLED' | 'DISABLED';
  version?: number;
}

export interface OaSupplyStockParams {
  requestId: string;
  quantity: number;
  remark?: string;
}

export interface OaSupplyLedgerVo {
  id: number;
  itemId: number;
  itemCode: string;
  itemName: string;
  action: string;
  quantity: number;
  balanceAfter: number;
  refType: string;
  refId?: number | null;
  requestId?: string | null;
  operatorId: number;
  operatorName?: string | null;
  remark?: string | null;
  createTime?: string;
}

export interface OaSupplyRequestVo {
  id: number;
  applicationId: number;
  title?: string | null;
  applicationStatus?: string | null;
  applicantId: number;
  applicantName?: string | null;
  itemCount: number;
  totalQuantity: number;
  status: string;
  issuerId?: number | null;
  issuerName?: string | null;
  issuedTime?: string | null;
  createTime?: string;
}

export interface OaSupplyRequestItemVo {
  itemId: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  stock: number;
}

export interface OaSupplyRequestDetailVo {
  request: OaSupplyRequestVo;
  items: OaSupplyRequestItemVo[];
}

export interface OaOperationParams {
  requestId: string;
  remark?: string;
}

export interface OaAssetVo {
  id: number;
  assetNo: string;
  name: string;
  category?: string | null;
  spec?: string | null;
  status: OaAssetStatus | string;
  holderId?: number | null;
  holderName?: string | null;
  deptId?: number | null;
  deptName?: string | null;
  location?: string | null;
  originalValue: OaDecimal;
  purchaseId?: number | null;
  purchaseNo?: string | null;
  acquiredDate?: string | null;
  scrapPending: boolean;
  version: number;
  createTime?: string;
}

export interface OaAssetLogVo {
  id: number;
  assetId: number;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  fromHolderId?: number | null;
  fromHolderName?: string | null;
  toHolderId?: number | null;
  toHolderName?: string | null;
  location?: string | null;
  refType?: string | null;
  refId?: number | null;
  requestId?: string | null;
  operatorId: number;
  operatorName?: string | null;
  remark?: string | null;
  createTime?: string;
}

export interface OaAssetScrapVo {
  id: number;
  applicationId: number;
  title?: string | null;
  applicationStatus?: string | null;
  applicantId: number;
  applicantName?: string | null;
  assetId: number;
  assetNo: string;
  assetName: string;
  originalValue: OaDecimal;
  status: string;
  executorId?: number | null;
  executorName?: string | null;
  executedTime?: string | null;
  createTime?: string;
}

export interface OaAssetDetailVo {
  asset: OaAssetVo;
  logs: OaAssetLogVo[];
  scraps: OaAssetScrapVo[];
}

export interface OaAssetCreateParams {
  requestId: string;
  name: string;
  category?: string;
  spec?: string;
  originalValue: number;
  location?: string;
  acquiredDate?: string;
}

export interface OaAssetActionParams {
  requestId: string;
  action: OaAssetAction;
  /** 雪花 ID 以字符串原样提交，避免 Number 精度丢失 */
  holderId?: string;
  location?: string;
  remark?: string;
}

export interface OaStocktakeVo {
  id: number;
  title: string;
  status: 'OPEN' | 'CLOSED' | string;
  lineCount: number;
  countedCount: number;
  varianceCount: number;
  createUser: number;
  createUserName?: string | null;
  createTime?: string;
  closedBy?: number | null;
  closedByName?: string | null;
  closedTime?: string | null;
}

export interface OaStocktakeLineVo {
  id: number;
  targetType: 'SUPPLY' | 'ASSET' | string;
  targetId: number;
  targetCode: string;
  targetName: string;
  bookQty: number;
  countedQty?: number | null;
  adjustedQty?: number | null;
}

export interface OaStocktakeDetailVo {
  stocktake: OaStocktakeVo;
  lines: OaStocktakeLineVo[];
}

export interface OaAssetTemplateVo {
  supplyFormId: number;
  supplyModelId: number;
  supplyModelKey: string;
  scrapFormId: number;
  scrapModelId: number;
  scrapModelKey: string;
}

export function queryOaPurchaseDepts() {
  return request<R<OaDeptOptionVo[]>>('system/oa/purchase/depts', {
    method: 'GET',
  });
}

export function queryOaPurchaseBudgets(year?: number) {
  return request<R<OaPurchaseBudgetVo[]>>('system/oa/purchase/budgets', {
    method: 'GET',
    params: { year },
  });
}

export function queryOaPurchaseBudgetLedger(id: number | string) {
  return request<R<OaPurchaseBudgetLedgerVo[]>>(
    `system/oa/purchase/budgets/${id}/ledger`,
    { method: 'GET' },
  );
}

export function saveOaPurchaseBudget(data: OaPurchaseBudgetParams) {
  return request<R<OaPurchaseBudgetVo>>('system/oa/purchase/budgets', {
    method: 'POST',
    data,
  });
}

export function queryOaPurchases(
  params: QueryParam<{ status?: string; keyword?: string }>,
) {
  return request<R<PageResult<OaPurchaseVo>>>('system/oa/purchase/records', {
    method: 'GET',
    params,
  });
}

export function getOaPurchase(id: number | string) {
  return request<R<OaPurchaseDetailVo>>(`system/oa/purchase/records/${id}`, {
    method: 'GET',
  });
}

export function orderOaPurchase(
  id: number | string,
  data: OaPurchaseOrderParams,
) {
  return request<R<OaPurchaseVo>>(`system/oa/purchase/records/${id}/order`, {
    method: 'POST',
    data,
  });
}

export function receiveOaPurchase(
  id: number | string,
  data: OaPurchaseReceiveParams,
) {
  return request<R<OaPurchaseDetailVo>>(
    `system/oa/purchase/records/${id}/receive`,
    { method: 'POST', data },
  );
}

export function createOaPurchaseTemplate() {
  return request<R<OaPurchaseTemplateVo>>('system/oa/purchase/template', {
    method: 'POST',
  });
}

export function queryMyOaPurchases(params: QueryParam<{ status?: string }>) {
  return request<R<PageResult<OaPurchaseVo>>>('system/oa/purchase/mine', {
    method: 'GET',
    params,
  });
}

export function getMyOaPurchase(id: number | string) {
  return request<R<OaPurchaseDetailVo>>(`system/oa/purchase/mine/${id}`, {
    method: 'GET',
  });
}

export function queryOaSupplyItems(params?: {
  status?: string;
  keyword?: string;
}) {
  return request<R<OaSupplyItemVo[]>>('system/oa/asset/supplies', {
    method: 'GET',
    params,
  });
}

export function createOaSupplyItem(data: OaSupplyItemParams) {
  return request<R<OaSupplyItemVo>>('system/oa/asset/supplies', {
    method: 'POST',
    data,
  });
}

export function updateOaSupplyItem(
  id: number | string,
  data: OaSupplyItemParams,
) {
  return request<R<OaSupplyItemVo>>(`system/oa/asset/supplies/${id}`, {
    method: 'PUT',
    data,
  });
}

export function stockInOaSupply(
  id: number | string,
  data: OaSupplyStockParams,
) {
  return request<R<OaSupplyItemVo>>(
    `system/oa/asset/supplies/${id}/stock-in`,
    { method: 'POST', data },
  );
}

export function stockOutOaSupply(
  id: number | string,
  data: OaSupplyStockParams,
) {
  return request<R<OaSupplyItemVo>>(
    `system/oa/asset/supplies/${id}/stock-out`,
    { method: 'POST', data },
  );
}

export function queryOaSupplyLedger(id: number | string) {
  return request<R<OaSupplyLedgerVo[]>>(
    `system/oa/asset/supplies/${id}/ledger`,
    { method: 'GET' },
  );
}

export function queryOaSupplyRequests(
  params: QueryParam<{ status?: string; keyword?: string }>,
) {
  return request<R<PageResult<OaSupplyRequestVo>>>(
    'system/oa/asset/requests',
    { method: 'GET', params },
  );
}

export function getOaSupplyRequest(id: number | string) {
  return request<R<OaSupplyRequestDetailVo>>(
    `system/oa/asset/requests/${id}`,
    { method: 'GET' },
  );
}

export function issueOaSupplyRequest(
  id: number | string,
  data: OaOperationParams,
) {
  return request<R<OaSupplyRequestDetailVo>>(
    `system/oa/asset/requests/${id}/issue`,
    { method: 'POST', data },
  );
}

export function queryOaAssets(
  params: QueryParam<{ status?: string; keyword?: string }>,
) {
  return request<R<PageResult<OaAssetVo>>>('system/oa/asset/assets', {
    method: 'GET',
    params,
  });
}

export function getOaAsset(id: number | string) {
  return request<R<OaAssetDetailVo>>(`system/oa/asset/assets/${id}`, {
    method: 'GET',
  });
}

export function createOaAsset(data: OaAssetCreateParams) {
  return request<R<OaAssetVo>>('system/oa/asset/assets', {
    method: 'POST',
    data,
  });
}

export function operateOaAsset(
  id: number | string,
  data: OaAssetActionParams,
) {
  return request<R<OaAssetVo>>(`system/oa/asset/assets/${id}/operate`, {
    method: 'POST',
    data,
  });
}

export function queryOaAssetScraps(params: QueryParam<{ status?: string }>) {
  return request<R<PageResult<OaAssetScrapVo>>>('system/oa/asset/scraps', {
    method: 'GET',
    params,
  });
}

export function executeOaAssetScrap(
  id: number | string,
  data: OaOperationParams,
) {
  return request<R<OaAssetScrapVo>>(`system/oa/asset/scraps/${id}/execute`, {
    method: 'POST',
    data,
  });
}

export function queryOaStocktakes(params: QueryParam<{}>) {
  return request<R<PageResult<OaStocktakeVo>>>('system/oa/asset/stocktakes', {
    method: 'GET',
    params,
  });
}

export function getOaStocktake(id: number | string) {
  return request<R<OaStocktakeDetailVo>>(
    `system/oa/asset/stocktakes/${id}`,
    { method: 'GET' },
  );
}

export function createOaStocktake(data: { title: string }) {
  return request<R<OaStocktakeDetailVo>>('system/oa/asset/stocktakes', {
    method: 'POST',
    data,
  });
}

export function countOaStocktake(
  id: number | string,
  data: { counts: { lineId: number; countedQty: number }[] },
) {
  return request<R<OaStocktakeDetailVo>>(
    `system/oa/asset/stocktakes/${id}/count`,
    { method: 'POST', data },
  );
}

export function closeOaStocktake(id: number | string) {
  return request<R<OaStocktakeDetailVo>>(
    `system/oa/asset/stocktakes/${id}/close`,
    { method: 'POST' },
  );
}

export function createOaAssetTemplate() {
  return request<R<OaAssetTemplateVo>>('system/oa/asset/template', {
    method: 'POST',
  });
}

export function queryMyOaAssets(params: QueryParam<{}>) {
  return request<R<PageResult<OaAssetVo>>>('system/oa/asset/mine/assets', {
    method: 'GET',
    params,
  });
}

export function getMyOaAsset(id: number | string) {
  return request<R<OaAssetDetailVo>>(`system/oa/asset/mine/assets/${id}`, {
    method: 'GET',
  });
}

export function queryMyOaSupplyRequests(
  params: QueryParam<{ status?: string }>,
) {
  return request<R<PageResult<OaSupplyRequestVo>>>(
    'system/oa/asset/mine/requests',
    { method: 'GET', params },
  );
}

export function getMyOaSupplyRequest(id: number | string) {
  return request<R<OaSupplyRequestDetailVo>>(
    `system/oa/asset/mine/requests/${id}`,
    { method: 'GET' },
  );
}

export function queryMyOaAssetScraps(params: QueryParam<{ status?: string }>) {
  return request<R<PageResult<OaAssetScrapVo>>>(
    'system/oa/asset/mine/scraps',
    { method: 'GET', params },
  );
}

export interface OaBusinessTemplateVo {
  formId: number;
  modelId: number;
  modelKey: string;
}

export interface OaLinkedFileVo {
  applicationId: number;
  fileId: number;
  name: string;
  size?: number | null;
}

export type OaContractStatus =
  | 'APPROVING'
  | 'PENDING_SIGN'
  | 'SIGNED'
  | 'ARCHIVED'
  | 'CLOSED';

export interface OaContractVo {
  id: number;
  contractNo: string;
  title: string;
  counterparty: string;
  contractType: string;
  amount: OaDecimal;
  startDate: string;
  endDate: string;
  ownerId: number;
  ownerName?: string | null;
  currentVersion: number;
  currentApplicationId: number;
  applicationStatus?: string | null;
  status: OaContractStatus;
  signedDate?: string | null;
  signatories?: string | null;
  signRemark?: string | null;
  signedBy?: number | null;
  signedByName?: string | null;
  signedTime?: string | null;
  archiveNo?: string | null;
  archiveLocation?: string | null;
  archivedBy?: number | null;
  archivedByName?: string | null;
  archivedTime?: string | null;
  createTime?: string;
  updateTime?: string | null;
}

export interface OaContractVersionVo {
  id: number;
  versionNo: number;
  applicationId: number;
  applicationStatus?: string | null;
  title: string;
  counterparty: string;
  contractType: string;
  amount: OaDecimal;
  startDate: string;
  endDate: string;
  summary: string;
  changeNote?: string | null;
  status: string;
  applicantId: number;
  applicantName?: string | null;
  createTime?: string;
}

export interface OaSealRequestVo {
  id: number;
  applicationId: number;
  title?: string | null;
  applicationStatus?: string | null;
  applicantId: number;
  applicantName?: string | null;
  sealId: number;
  sealCode: string;
  sealName: string;
  sealType: string;
  keeperId: number;
  keeperName?: string | null;
  contractId?: number | null;
  contractNo?: string | null;
  copies: number;
  useDate: string;
  status: string;
  usedCopies?: number | null;
  usedDate?: string | null;
  executorId?: number | null;
  executorName?: string | null;
  executedTime?: string | null;
  executeRemark?: string | null;
  createTime?: string;
}

export interface OaContractDetailVo {
  contract: OaContractVo;
  versions: OaContractVersionVo[];
  files: OaLinkedFileVo[];
  sealRequests: OaSealRequestVo[];
}

export interface OaContractSignParams {
  requestId: string;
  signedDate: string;
  signatories: string;
  remark?: string;
}

export interface OaContractArchiveParams {
  requestId: string;
  archiveNo: string;
  location?: string;
  remark?: string;
}

export function queryOaContracts(
  params: QueryParam<{
    status?: string;
    keyword?: string;
    expiringDays?: number;
  }>,
) {
  return request<R<PageResult<OaContractVo>>>('system/oa/contract', {
    method: 'GET',
    params,
  });
}

export function getOaContract(id: number | string) {
  return request<R<OaContractDetailVo>>(`system/oa/contract/${id}`, {
    method: 'GET',
  });
}

export function signOaContract(
  id: number | string,
  data: OaContractSignParams,
) {
  return request<R<OaContractVo>>(`system/oa/contract/${id}/sign`, {
    method: 'POST',
    data,
  });
}

export function archiveOaContract(
  id: number | string,
  data: OaContractArchiveParams,
) {
  return request<R<OaContractVo>>(`system/oa/contract/${id}/archive`, {
    method: 'POST',
    data,
  });
}

export function createOaContractTemplate() {
  return request<R<OaBusinessTemplateVo>>('system/oa/contract/template', {
    method: 'POST',
  });
}

export function queryMyOaContracts(
  params: QueryParam<{ status?: string; keyword?: string }>,
) {
  return request<R<PageResult<OaContractVo>>>(
    'system/oa/contract/mine/contracts',
    { method: 'GET', params },
  );
}

export function getMyOaContract(id: number | string) {
  return request<R<OaContractDetailVo>>(
    `system/oa/contract/mine/contracts/${id}`,
    { method: 'GET' },
  );
}

export function queryMyOaSealRequests(params: QueryParam<{ status?: string }>) {
  return request<R<PageResult<OaSealRequestVo>>>(
    'system/oa/contract/mine/seal-requests',
    { method: 'GET', params },
  );
}

export function queryMyOaSealFiles(id: number | string) {
  return request<R<OaLinkedFileVo[]>>(
    `system/oa/contract/mine/seal-requests/${id}/files`,
    { method: 'GET' },
  );
}

export type OaSealType =
  | 'OFFICIAL'
  | 'CONTRACT'
  | 'FINANCE'
  | 'LEGAL_REP'
  | 'OTHER';

export interface OaSealVo {
  id: number;
  code: string;
  name: string;
  sealType: OaSealType;
  keeperId: number;
  keeperName?: string | null;
  status: 'ENABLED' | 'DISABLED';
  remark?: string | null;
  version: number;
  updateTime?: string | null;
}

export interface OaSealParams {
  code: string;
  name: string;
  sealType: OaSealType;
  keeperId: number | string;
  status?: 'ENABLED' | 'DISABLED';
  remark?: string;
  version?: number;
}

export interface OaSealExecuteParams {
  requestId: string;
  usedCopies: number;
  usedDate: string;
  remark?: string;
}

export function queryOaSeals(params?: { status?: string }) {
  return request<R<OaSealVo[]>>('system/oa/seal/seals', {
    method: 'GET',
    params,
  });
}

export function createOaSeal(data: OaSealParams) {
  return request<R<OaSealVo>>('system/oa/seal/seals', {
    method: 'POST',
    data,
  });
}

export function updateOaSeal(id: number | string, data: OaSealParams) {
  return request<R<OaSealVo>>(`system/oa/seal/seals/${id}`, {
    method: 'PUT',
    data,
  });
}

export function queryOaSealRequests(params: QueryParam<{ status?: string }>) {
  return request<R<PageResult<OaSealRequestVo>>>('system/oa/seal/requests', {
    method: 'GET',
    params,
  });
}

export function queryOaSealRequestFiles(id: number | string) {
  return request<R<OaLinkedFileVo[]>>(
    `system/oa/seal/requests/${id}/files`,
    { method: 'GET' },
  );
}

export function createOaSealTemplate() {
  return request<R<OaBusinessTemplateVo>>('system/oa/seal/template', {
    method: 'POST',
  });
}

export function queryKeeperOaSealRequests(
  params: QueryParam<{ status?: string }>,
) {
  return request<R<PageResult<OaSealRequestVo>>>(
    'system/oa/seal/keeper/requests',
    { method: 'GET', params },
  );
}

export function queryKeeperOaSealFiles(id: number | string) {
  return request<R<OaLinkedFileVo[]>>(
    `system/oa/seal/keeper/requests/${id}/files`,
    { method: 'GET' },
  );
}

export function executeOaSealRequest(
  id: number | string,
  data: OaSealExecuteParams,
) {
  return request<R<OaSealRequestVo>>(
    `system/oa/seal/keeper/requests/${id}/execute`,
    { method: 'POST', data },
  );
}

export type OaDocumentStatus = 'APPROVING' | 'PUBLISHED' | 'CLOSED' | 'REVOKED';

export type OaDocumentType = 'NOTICE' | 'KNOWLEDGE';

export interface OaDocumentVo {
  id: number;
  docNo: string;
  docType: OaDocumentType;
  title: string;
  category?: string | null;
  ownerId: number;
  ownerName?: string | null;
  status: OaDocumentStatus;
  publishedVersion: number;
  latestVersion: number;
  pendingApplicationId?: number | null;
  requireAck: boolean;
  publishTime?: string | null;
  revokeBy?: number | null;
  revokeByName?: string | null;
  revokeTime?: string | null;
  revokeReason?: string | null;
  receiptCount: number;
  readCount: number;
  ackCount: number;
  createTime?: string;
  updateTime?: string | null;
}

export interface OaDocumentAudienceVo {
  all: boolean;
  depts?: number[] | null;
  users?: number[] | null;
}

export interface OaDocumentVersionVo {
  id: number;
  versionNo: number;
  applicationId: number;
  applicationStatus?: string | null;
  title: string;
  category?: string | null;
  content: string;
  changeNote?: string | null;
  audience?: OaDocumentAudienceVo | null;
  requireAck: boolean;
  status: string;
  applicantId: number;
  applicantName?: string | null;
  audienceCount: number;
  publishTime?: string | null;
  createTime?: string;
}

export interface OaDocumentReceiptVo {
  userId: number;
  userName?: string | null;
  deptName?: string | null;
  readTime?: string | null;
  ackTime?: string | null;
}

export interface OaDocumentDetailVo {
  document: OaDocumentVo;
  versions: OaDocumentVersionVo[];
  receipts: OaDocumentReceiptVo[];
  files: OaLinkedFileVo[];
}

export interface OaDocumentInboxVo {
  documentId: number;
  docNo: string;
  docType: OaDocumentType;
  title: string;
  category?: string | null;
  versionNo: number;
  ownerName?: string | null;
  publishTime?: string | null;
  requireAck: boolean;
  readTime?: string | null;
  ackTime?: string | null;
}

export interface OaDocumentReadVo {
  item: OaDocumentInboxVo;
  content: string;
  changeNote?: string | null;
  files: OaLinkedFileVo[];
}

export function queryOaDocuments(
  params: QueryParam<{ status?: string; docType?: string; keyword?: string }>,
) {
  return request<R<PageResult<OaDocumentVo>>>('system/oa/document', {
    method: 'GET',
    params,
  });
}

export function getOaDocument(id: number | string) {
  return request<R<OaDocumentDetailVo>>(`system/oa/document/${id}`, {
    method: 'GET',
  });
}

export function revokeOaDocument(
  id: number | string,
  data: { reason: string },
) {
  return request<R<OaDocumentVo>>(`system/oa/document/${id}/revoke`, {
    method: 'POST',
    data,
  });
}

export function createOaDocumentTemplate() {
  return request<R<OaBusinessTemplateVo>>('system/oa/document/template', {
    method: 'POST',
  });
}

export function queryOaDocumentInbox(
  params: QueryParam<{ keyword?: string; pendingOnly?: boolean }>,
) {
  return request<R<PageResult<OaDocumentInboxVo>>>(
    'system/oa/document/inbox',
    { method: 'GET', params },
  );
}

export function readOaDocument(id: number | string) {
  return request<R<OaDocumentReadVo>>(`system/oa/document/inbox/${id}`, {
    method: 'GET',
  });
}

export function ackOaDocument(id: number | string) {
  return request<R<OaDocumentInboxVo>>(`system/oa/document/inbox/${id}/ack`, {
    method: 'POST',
  });
}
