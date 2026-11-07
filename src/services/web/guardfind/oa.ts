import { request } from 'umi';
import type { PageResult, QueryParam, R } from '@/typings';

export type OaProcessStatus = 'DRAFT' | 'PUBLISHED' | 'DISABLED';

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
  timeline: OaApplicationTimelineVo[];
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

export function withdrawOaApplication(
  applicationId: number | string,
  data: OaApprovalActionParams,
) {
  return request<R<OaApprovalActionResultVo>>(
    `system/oa/approval/application/${applicationId}/withdraw`,
    { method: 'POST', data },
  );
}
