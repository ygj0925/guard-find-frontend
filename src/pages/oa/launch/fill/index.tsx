/**
 * 发起填写页：按发布版本渲染表单，补齐审批人变量绑定后一次性提交并启动流程。
 * 服务端会再次校验表单、发起范围与审批人；requestId 保证断线重试不会重复发起。
 */
import {
  CheckCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useSearchParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  message,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import {
  OaEmployeeMultiSelect,
  OaEmployeeSelect,
  OaPositionSelect,
} from '@/pages/oa/components/OaStaffSelects';
import {
  createOaDraft,
  getOaDraft,
  getOaLaunch,
  type OaAssigneeBindingParam,
  type OaLaunchDetailVo,
  type OaLaunchSubmitResultVo,
  submitOaLaunch,
  updateOaDraft,
} from '@/services/web/guardfind/oa';
import {
  type OaFormField,
  parseOaFormSchema,
  validateOaFormValues,
} from '@/utils/oaForm';
import {
  buildOaRequestId,
  fromOaSubmitFormData,
  normalizeAssigneeType,
  OA_ASSIGNEE_TYPE_OPTIONS,
  oaPersonFieldOptions,
  toOaSubmitFormData,
  validateAssigneeBindings,
} from '@/utils/oaLaunch';
import OaFormRenderer from '../../form/components/OaFormRenderer';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

type BindingValue = { type?: string; value?: string };

const OA_CC_MAX = 20;

const LaunchFillPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const releaseId = searchParams.get('releaseId');
  const [initialDraftId] = useState(() => searchParams.get('draftId'));
  const [draftId, setDraftId] = useState<string | null>(initialDraftId);
  const [draftVersion, setDraftVersion] = useState<number | undefined>();
  const [savingDraft, setSavingDraft] = useState(false);
  const [detail, setDetail] = useState<OaLaunchDetailVo | null>(null);
  const [fields, setFields] = useState<OaFormField[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('');
  const [ccUserIds, setCcUserIds] = useState<string[]>([]);
  const [bindings, setBindings] = useState<Record<string, BindingValue>>({});
  const [bindingErrors, setBindingErrors] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(Boolean(releaseId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestId, setRequestId] = useState(() => buildOaRequestId());
  const [result, setResult] = useState<OaLaunchSubmitResultVo | null>(null);

  useEffect(() => {
    if (!releaseId) {
      setLoading(false);
      setLoadError('缺少流程发布 ID，请从发起列表进入');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getOaLaunch(releaseId)
      .then(async (response) => {
        const draft = initialDraftId
          ? (await getOaDraft(initialDraftId)).data
          : null;
        if (draft && String(draft.releaseId) !== releaseId) {
          throw new Error('草稿与当前流程版本不匹配，请从草稿列表重新进入');
        }
        return { next: response.data, draft };
      })
      .then(({ next, draft }) => {
        if (cancelled) return;
        const nextFields = parseOaFormSchema(next.schemaJson).fields;
        setDetail(next);
        setFields(nextFields);
        setValues(fromOaSubmitFormData(nextFields, draft?.formData));
        setErrors({});
        setTitle(draft?.title ?? '');
        setCcUserIds((draft?.ccUserIds ?? []).map(String));
        setDraftVersion(draft?.version);
        setResult(null);
        setRequestId(buildOaRequestId());
        const saved = new Map(
          (draft?.assignees ?? []).map((item) => [item.variableName, item]),
        );
        const initial: Record<string, BindingValue> = {};
        (next.assigneeVariables ?? []).forEach((variable) => {
          const binding = saved.get(variable.name);
          initial[variable.name] = binding
            ? {
                type: normalizeAssigneeType(binding.type),
                value: binding.value ?? undefined,
              }
            : {
                type: normalizeAssigneeType(variable.suggestedType),
                value: variable.suggestedValue ?? undefined,
              };
        });
        setBindings(initial);
        setBindingErrors({});
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorText(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [releaseId, initialDraftId]);

  const visibleFields = useMemo(
    () => fields.filter((field) => !field.hidden),
    [fields],
  );
  const personOptions = useMemo(() => oaPersonFieldOptions(fields), [fields]);
  const variables = detail?.assigneeVariables ?? [];

  const updateBinding = (name: string, patch: BindingValue) => {
    setBindings((current) => ({
      ...current,
      [name]: { ...current[name], ...patch },
    }));
    setBindingErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const buildAssignees = (): OaAssigneeBindingParam[] =>
    variables.flatMap((variable) => {
      const binding = bindings[variable.name] ?? {};
      const type = normalizeAssigneeType(binding.type);
      if (!type) return [];
      const value = binding.value?.trim();
      return [
        {
          variableName: variable.name,
          type,
          value:
            type === 'DEPT_LEADER' || type === 'SUPERVISOR' ? undefined : value,
        },
      ];
    });

  const handleSaveDraft = async () => {
    if (!detail || !releaseId || savingDraft || submitting) return;
    setSavingDraft(true);
    try {
      const payload = {
        releaseId,
        title: title.trim() || undefined,
        formData: toOaSubmitFormData(fields, values),
        assignees: buildAssignees(),
        ccUserIds: ccUserIds.length ? ccUserIds : undefined,
      };
      const response = draftId
        ? await updateOaDraft(draftId, { ...payload, version: draftVersion })
        : await createOaDraft(payload);
      const saved = response.data;
      setDraftId(String(saved.id));
      setDraftVersion(saved.version);
      if (!draftId) {
        history.replace(
          `/oa/launch/fill?releaseId=${releaseId}&draftId=${saved.id}`,
        );
      }
      message.success('草稿已保存');
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    if (!detail || !releaseId || submitting || savingDraft) return;
    const formResult = validateOaFormValues(fields, values);
    const nextBindingErrors = validateAssigneeBindings(variables, bindings);
    setErrors(formResult.errors);
    setBindingErrors(nextBindingErrors);
    if (!formResult.valid) {
      message.error('请检查表单必填项与格式');
      return;
    }
    if (Object.keys(nextBindingErrors).length) {
      message.error('请补齐审批人来源');
      return;
    }
    setSubmitting(true);
    try {
      const response = await submitOaLaunch(releaseId, {
        requestId,
        title: title.trim() || undefined,
        formData: toOaSubmitFormData(fields, values),
        assignees: buildAssignees(),
        ccUserIds: ccUserIds.length ? ccUserIds : undefined,
        draftId: draftId ?? undefined,
      });
      setResult(response.data);
      message.success(
        response.data.replayed ? '已恢复此前的提交结果' : '已提交并启动流程',
      );
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setValues({});
    setErrors({});
    setTitle('');
    setCcUserIds([]);
    setResult(null);
  };

  return (
    <PageContainer
      onBack={() => history.push('/oa/launch')}
      header={{
        title: detail ? `发起：${detail.modelName}` : '发起流程',
        subTitle: detail
          ? `${detail.formName} v${detail.formVersion} · 发布 v${detail.releaseVersion}`
          : '按发布版本填写并提交',
      }}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message="提交后立即启动审批流程"
          description="服务端会再次校验可发起范围、表单与审批人变量；同一 requestId 重试不会重复发起。草稿只保存在本人名下，不校验必填，提交成功后自动移除。"
        />

        {loadError ? (
          <Alert
            type="error"
            showIcon
            message="加载发起信息失败"
            description={loadError}
            action={
              <Button size="small" onClick={() => history.push('/oa/launch')}>
                返回列表
              </Button>
            }
          />
        ) : null}

        {result ? (
          <Alert
            type="success"
            showIcon
            message={result.replayed ? '已恢复提交结果' : '提交成功'}
            description={
              <Space direction="vertical" size={4}>
                <Typography.Text>
                  业务编号：{result.businessKey}
                </Typography.Text>
                <Typography.Text>
                  流程实例：{result.processInstanceId}
                </Typography.Text>
              </Space>
            }
            action={
              <Button
                size="small"
                type="primary"
                onClick={() =>
                  history.push(
                    `/oa/application/detail?id=${result.applicationId}`,
                  )
                }
              >
                查看申请
              </Button>
            }
          />
        ) : null}

        <Spin spinning={loading}>
          {detail ? (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card size="small" title="申请信息">
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Typography.Text strong>申请标题（可选）</Typography.Text>
                  <Input
                    aria-label="申请标题"
                    maxLength={200}
                    showCount
                    value={title}
                    placeholder={`默认使用流程名称：${detail.modelName}`}
                    disabled={Boolean(result)}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                  <Space wrap>
                    <Tag>{detail.modelKey}</Tag>
                    <Tag>{detail.formKey}</Tag>
                    {detail.category ? <Tag>{detail.category}</Tag> : null}
                  </Space>
                </Space>
              </Card>

              <Card
                size="small"
                title="填写表单"
                extra={
                  <Typography.Text type="secondary">
                    {visibleFields.length} 个可见字段
                  </Typography.Text>
                }
              >
                <OaFormRenderer
                  fields={fields}
                  values={values}
                  errors={errors}
                  disabled={Boolean(result)}
                  onChange={(key, value) => {
                    setValues((current) => ({ ...current, [key]: value }));
                    setErrors((current) => {
                      if (!current[key]) return current;
                      const next = { ...current };
                      delete next[key];
                      return next;
                    });
                  }}
                />
              </Card>

              <Card size="small" title="审批人来源">
                {variables.length === 0 ? (
                  <Empty description="该流程没有需要绑定的审批人变量" />
                ) : (
                  <Space
                    direction="vertical"
                    size={12}
                    style={{ width: '100%' }}
                  >
                    {variables.map((variable) => {
                      const binding = bindings[variable.name] ?? {};
                      const type = normalizeAssigneeType(binding.type);
                      return (
                        <Card key={variable.name} size="small" type="inner">
                          <Space
                            direction="vertical"
                            size={8}
                            style={{ width: '100%' }}
                          >
                            <Space wrap>
                              <Typography.Text strong>
                                审批人变量
                              </Typography.Text>
                              <Tag color="blue">{variable.name}</Tag>
                              {variable.suggestedType ? (
                                <Tag color="green">已自动推荐</Tag>
                              ) : (
                                <Tag color="orange">需要手动选择</Tag>
                              )}
                            </Space>
                            <Space wrap align="start">
                              <Select
                                aria-label={`${variable.name} 审批人来源`}
                                style={{ minWidth: 190 }}
                                placeholder="选择来源"
                                value={type}
                                disabled={Boolean(result)}
                                options={[...OA_ASSIGNEE_TYPE_OPTIONS]}
                                onChange={(next) =>
                                  updateBinding(variable.name, {
                                    type: next,
                                    value: undefined,
                                  })
                                }
                              />
                              {type === 'EMPLOYEE' ? (
                                <OaEmployeeSelect
                                  ariaLabel={`${variable.name} 员工`}
                                  style={{ width: 220 }}
                                  placeholder="搜索并选择员工"
                                  value={binding.value}
                                  disabled={Boolean(result)}
                                  onChange={(next) =>
                                    updateBinding(variable.name, {
                                      value: next,
                                    })
                                  }
                                />
                              ) : null}
                              {type === 'POSITION' ? (
                                <OaPositionSelect
                                  ariaLabel={`${variable.name} 岗位`}
                                  style={{ width: 220 }}
                                  placeholder="搜索并选择岗位"
                                  value={binding.value}
                                  disabled={Boolean(result)}
                                  onChange={(next) =>
                                    updateBinding(variable.name, {
                                      value: next,
                                    })
                                  }
                                />
                              ) : null}
                              {type === 'FORM_FIELD' ? (
                                <Select
                                  aria-label={`${variable.name} 表单人员字段`}
                                  style={{ minWidth: 220 }}
                                  placeholder="选择表单人员字段"
                                  value={binding.value}
                                  disabled={Boolean(result)}
                                  options={personOptions}
                                  notFoundContent="表单中没有可写人员字段"
                                  onChange={(next) =>
                                    updateBinding(variable.name, {
                                      value: next,
                                    })
                                  }
                                />
                              ) : null}
                              {type === 'DEPT_LEADER' ||
                              type === 'SUPERVISOR' ? (
                                <Typography.Text type="secondary">
                                  按发起人的组织关系自动解析
                                </Typography.Text>
                              ) : null}
                            </Space>
                            {bindingErrors[variable.name] ? (
                              <Typography.Text type="danger" role="alert">
                                {bindingErrors[variable.name]}
                              </Typography.Text>
                            ) : null}
                          </Space>
                        </Card>
                      );
                    })}
                  </Space>
                )}
              </Card>

              <Card
                size="small"
                title="抄送（可选）"
                extra={
                  <Typography.Text type="secondary">
                    {ccUserIds.length}/{OA_CC_MAX}
                  </Typography.Text>
                }
              >
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <OaEmployeeMultiSelect
                    ariaLabel="抄送人"
                    value={ccUserIds}
                    maxCount={OA_CC_MAX}
                    disabled={Boolean(result)}
                    onChange={setCcUserIds}
                  />
                  <Typography.Text type="secondary">
                    抄送人可只读查看申请与审批轨迹，提交后会收到站内通知；不参与审批。
                  </Typography.Text>
                </Space>
              </Card>

              <Space wrap>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={submitting}
                  disabled={Boolean(result)}
                  onClick={() => void handleSubmit()}
                >
                  提交并发起
                </Button>
                <Button
                  icon={<SaveOutlined />}
                  loading={savingDraft}
                  disabled={submitting || Boolean(result)}
                  onClick={() => void handleSaveDraft()}
                >
                  {draftId ? '更新草稿' : '保存草稿'}
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  disabled={submitting || Boolean(result)}
                  onClick={handleReset}
                >
                  重置
                </Button>
              </Space>
            </Space>
          ) : !loading && !loadError ? (
            <Card size="small">
              <Empty description="请从发起列表选择流程" />
            </Card>
          ) : null}
        </Spin>
      </Space>
    </PageContainer>
  );
};

export default LaunchFillPage;
