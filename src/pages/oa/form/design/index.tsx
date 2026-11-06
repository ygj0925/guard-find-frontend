/**
 * 表单设计器：字段面板拖拽排序 + 属性配置 + 实时预览 + 草稿保存/版本发布。
 * 发布由服务端重新校验 schema 并写入不可变版本快照。
 */
import {
  CloudUploadOutlined,
  HistoryOutlined,
  SaveOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useSearchParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Modal,
  message,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import React, { useEffect, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  disableOaForm,
  getOaForm,
  type OaFormVersionVo,
  type OaFormVo,
  publishOaForm,
  queryOaFormVersions,
  updateOaForm,
} from '@/services/web/guardfind/oa';
import {
  createOaFormField,
  type OaFormField,
  type OaFormFieldType,
  parseOaFormSchema,
  serializeOaFormSchema,
  validateOaFormSchema,
} from '@/utils/oaForm';
import OaFormCanvas from './components/OaFormCanvas';
import OaFormPalette from './components/OaFormPalette';
import OaFormPreview from './components/OaFormPreview';
import OaFormProperties from './components/OaFormProperties';

const STATUS_META: Record<string, { text: string; color: string }> = {
  DRAFT: { text: '草稿', color: 'default' },
  PUBLISHED: { text: '已发布', color: 'green' },
  DISABLED: { text: '已停用', color: 'red' },
};

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

const FormDesignPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [formId] = useState(() => searchParams.get('id'));
  const [form, setForm] = useState<OaFormVo | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<OaFormField[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(Boolean(formId));
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'design' | 'preview'>('design');
  const [saving, setSaving] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishErrors, setPublishErrors] = useState<string[]>([]);
  const [versionOpen, setVersionOpen] = useState(false);
  const [versions, setVersions] = useState<OaFormVersionVo[]>([]);
  const [versionLoading, setVersionLoading] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const applyDetail = (detail: OaFormVo) => {
    setForm(detail);
    setName(detail.name);
    setDescription(detail.description ?? '');
    setFields(parseOaFormSchema(detail.schemaJson).fields);
    setSelectedId(null);
    setDirty(false);
  };

  useEffect(() => {
    if (!formId) {
      setLoading(false);
      setError('缺少表单 ID，请从表单列表打开设计器');
      return;
    }
    let cancelled = false;
    setLoading(true);
    getOaForm(formId)
      .then((response) => {
        if (!cancelled) applyDetail(response.data);
      })
      .catch((loadError) => {
        if (!cancelled) setError(errorText(loadError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [formId]);

  const selectedField = fields.find((field) => field.id === selectedId) ?? null;
  const schemaErrors = validateOaFormSchema(
    { version: 1, fields },
    false,
  ).errors;

  const updateField = (patch: Partial<OaFormField>) => {
    if (!selectedField) return;
    setFields((current) =>
      current.map((field) =>
        field.id === selectedField.id ? { ...field, ...patch } : field,
      ),
    );
    setDirty(true);
  };

  const addField = (type: OaFormFieldType, index?: number) => {
    const field = createOaFormField(type, fields);
    setFields((current) => {
      const next = [...current];
      next.splice(index ?? next.length, 0, field);
      return next;
    });
    setSelectedId(field.id);
    setDirty(true);
  };

  const removeField = (id: string) => {
    setFields((current) => current.filter((field) => field.id !== id));
    if (selectedId === id) setSelectedId(null);
    setDirty(true);
  };

  const moveField = (fieldId: string, targetIndex: number) => {
    const from = fields.findIndex((field) => field.id === fieldId);
    if (from < 0) return;
    const next = [...fields];
    const [moved] = next.splice(from, 1);
    const insertAt = from < targetIndex ? targetIndex - 1 : targetIndex;
    next.splice(Math.max(0, Math.min(next.length, insertAt)), 0, moved);
    setFields(next);
    setDirty(true);
  };

  const saveDraft = async () => {
    if (!form) throw new Error('表单尚未加载');
    if (!name.trim()) throw new Error('表单名称不能为空');
    const schema = { version: 1, fields };
    const validation = validateOaFormSchema(schema, false);
    if (!validation.valid) {
      throw new Error(validation.errors.join('；'));
    }
    const response = await updateOaForm(form.id, {
      name: name.trim(),
      description: description.trim() || undefined,
      schemaJson: serializeOaFormSchema(schema),
      version: form.version,
    });
    setForm(response.data);
    setDirty(false);
    return response.data;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDraft();
      message.success('草稿已保存');
    } catch (saveError) {
      message.error(errorText(saveError));
    } finally {
      setSaving(false);
    }
  };

  const openPublish = () => {
    setPublishErrors([]);
    setPublishOpen(true);
  };

  const handlePublish = async () => {
    if (!form) return;
    setPublishing(true);
    try {
      if (dirty) await saveDraft();
      const response = await publishOaForm(form.id);
      const result = response.data;
      if (!result.valid) {
        setPublishErrors(result.errors);
        return;
      }
      setPublishOpen(false);
      setPublishErrors([]);
      message.success(
        `发布成功：版本 v${result.version}，字段 ${result.fieldCount} 个`,
      );
      const detail = await getOaForm(form.id);
      applyDetail(detail.data);
    } catch (publishError) {
      message.error(errorText(publishError));
    } finally {
      setPublishing(false);
    }
  };

  const handleDisable = async () => {
    if (!form) return;
    setDisabling(true);
    try {
      const response = await disableOaForm(form.id);
      setForm(response.data);
      setDisableOpen(false);
      message.success('已停用');
    } catch (disableError) {
      message.error(errorText(disableError));
    } finally {
      setDisabling(false);
    }
  };

  const openVersions = async () => {
    if (!form) return;
    setVersionOpen(true);
    setVersions([]);
    setVersionLoading(true);
    try {
      const response = await queryOaFormVersions(form.id);
      setVersions(response.data || []);
    } catch (versionError) {
      message.error(errorText(versionError));
    } finally {
      setVersionLoading(false);
    }
  };

  const goBack = () => {
    if (!dirty) {
      history.push('/oa/form');
      return;
    }
    Modal.confirm({
      title: '返回表单列表',
      content: '当前未保存的修改将丢失，确定返回吗？',
      okText: '返回',
      cancelText: '继续编辑',
      onOk: () => history.push('/oa/form'),
    });
  };

  const statusMeta = form
    ? STATUS_META[form.status] || { text: form.status, color: 'default' }
    : null;

  const headerExtra = [
    <Button
      key="save"
      icon={<SaveOutlined />}
      loading={saving}
      disabled={!form}
      onClick={() => void handleSave()}
    >
      保存草稿
    </Button>,
    <AccessControl key="publish" permission="system:oa:form:publish">
      <Button
        type="primary"
        icon={<CloudUploadOutlined />}
        disabled={!form}
        onClick={openPublish}
      >
        发布
      </Button>
    </AccessControl>,
    <Button
      key="versions"
      icon={<HistoryOutlined />}
      disabled={!form}
      onClick={() => void openVersions()}
    >
      版本
    </Button>,
    <AccessControl key="disable" permission="system:oa:form:disable">
      <Button
        key="disable"
        danger
        icon={<StopOutlined />}
        disabled={!form || form.status === 'DISABLED'}
        onClick={() => setDisableOpen(true)}
      >
        停用
      </Button>
    </AccessControl>,
  ];

  return (
    <PageContainer
      onBack={goBack}
      header={{
        title: form ? form.name : '表单设计器',
        subTitle: form
          ? `${form.formKey} · 草稿版本 ${form.version}${
              form.currentVersion ? ` · 当前发布 v${form.currentVersion}` : ''
            }`
          : '拖拽字段 · 属性配置 · 实时预览',
        extra: headerExtra,
      }}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {error ? (
          <Alert
            type="error"
            showIcon
            message="加载表单失败"
            description={`${error}。保存与发布不可用。`}
          />
        ) : null}
        {form ? (
          <Alert
            type="info"
            showIcon
            message={
              <Space wrap>
                <span>表单：{form.name}</span>
                {statusMeta ? (
                  <Tag color={statusMeta.color}>{statusMeta.text}</Tag>
                ) : null}
                <Tag>草稿版本 {form.version}</Tag>
                {form.currentVersion ? (
                  <Tag color="green">当前发布 v{form.currentVersion}</Tag>
                ) : null}
                {dirty ? <Tag color="orange">未保存修改</Tag> : null}
              </Space>
            }
            description="保存只写草稿；发布时服务端重新校验字段并生成不可变版本，已发布版本不可修改。"
          />
        ) : null}

        {schemaErrors.length ? (
          <Alert
            type="warning"
            showIcon
            message="表单配置存在问题，保存与发布将被阻止"
            description={
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {schemaErrors.map((item) => (
                  <li key={item}>
                    <Typography.Text type="warning">{item}</Typography.Text>
                  </li>
                ))}
              </ul>
            }
          />
        ) : null}

        {form ? (
          <Card size="small">
            <Tabs
              activeKey={tab}
              onChange={(key) => setTab(key as 'design' | 'preview')}
              items={[
                { key: 'design', label: '字段设计' },
                { key: 'preview', label: '实时预览' },
              ]}
            />
            <div
              style={{
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                flexWrap: 'wrap',
              }}
            >
              <OaFormPalette onAdd={(type) => addField(type)} />
              {tab === 'design' ? (
                <OaFormCanvas
                  fields={fields}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onRemove={removeField}
                  onDropType={(type, index) => addField(type, index)}
                  onMoveField={moveField}
                />
              ) : (
                <div style={{ flex: '1 1 420px', minWidth: 0 }}>
                  <OaFormPreview fields={fields} />
                </div>
              )}
              <OaFormProperties
                field={selectedField}
                formKey={form.formKey}
                name={name}
                description={description}
                onMetaChange={(patch) => {
                  if (patch.name !== undefined) setName(patch.name);
                  if (patch.description !== undefined) {
                    setDescription(patch.description);
                  }
                  setDirty(true);
                }}
                onFieldChange={updateField}
                onRemoveField={() => {
                  if (selectedField) removeField(selectedField.id);
                }}
              />
            </div>
          </Card>
        ) : loading ? null : (
          <Card size="small">
            <Typography.Text type="secondary">
              请从表单列表新建或打开表单后再进入设计器。
            </Typography.Text>
          </Card>
        )}
      </Space>

      <Modal
        title={`发布表单：${form?.name || ''}`}
        open={publishOpen}
        confirmLoading={publishing}
        okText="发布"
        cancelText="取消"
        onOk={() => void handlePublish()}
        onCancel={() => setPublishOpen(false)}
        destroyOnHidden
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="发布前会先保存当前草稿；服务端重新校验 schema 后生成不可变版本。"
        />
        {publishErrors.length ? (
          <Alert
            type="error"
            showIcon
            message="服务端校验未通过"
            description={
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {publishErrors.map((item) => (
                  <li key={item}>
                    <Typography.Text type="danger">{item}</Typography.Text>
                  </li>
                ))}
              </ul>
            }
          />
        ) : null}
      </Modal>

      <Modal
        title={`发布版本：${form?.name || ''}`}
        open={versionOpen}
        footer={null}
        width={820}
        onCancel={() => setVersionOpen(false)}
        destroyOnHidden
      >
        <Table<OaFormVersionVo>
          rowKey="id"
          size="small"
          loading={versionLoading}
          dataSource={versions}
          pagination={false}
          scroll={{ x: 820 }}
          columns={[
            {
              title: '版本',
              dataIndex: 'version',
              width: 70,
              render: (value) => `v${value}`,
            },
            { title: '字段数', dataIndex: 'fieldCount', width: 80 },
            {
              title: '快照摘要',
              dataIndex: 'schemaDigest',
              width: 200,
              ellipsis: true,
              render: (value) => (
                <Typography.Text code>
                  {String(value).slice(0, 16)}…
                </Typography.Text>
              ),
            },
            { title: '发布时间', dataIndex: 'publishTime', width: 170 },
            {
              title: '操作',
              width: 90,
              render: (_, record) => (
                <Button
                  type="link"
                  onClick={() =>
                    history.push(`/oa/form/fill?versionId=${record.id}`)
                  }
                >
                  填写
                </Button>
              ),
            },
          ]}
        />
      </Modal>

      <Modal
        title="停用表单"
        open={disableOpen}
        confirmLoading={disabling}
        okText="停用"
        okButtonProps={{ danger: true }}
        cancelText="取消"
        onOk={() => void handleDisable()}
        onCancel={() => setDisableOpen(false)}
        destroyOnHidden
      >
        <Alert
          type="warning"
          showIcon
          message="停用后不再出现在流程发布的表单版本候选中，已发布版本仍保留。"
        />
      </Modal>
    </PageContainer>
  );
};

export default FormDesignPage;
