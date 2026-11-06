/**
 * 流程设计页：bpmn-js 画布 + 受限属性面板 + 前端预检 + 只读预览。
 * 服务端 OaBpmnValidator 仍是发布时的最终校验方，这里的结果只用于设计期提示。
 */
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  ExpandOutlined,
  ExportOutlined,
  EyeOutlined,
  ImportOutlined,
  PlusOutlined,
  RedoOutlined,
  SaveOutlined,
  StopOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useSearchParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  message,
  Space,
  Spin,
  Tag,
  Typography,
  Upload,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  disableOaProcessModel,
  getOaProcessModel,
  type OaBpmnValidateResultVo,
  type OaProcessModelVo,
  publishOaProcessModel,
  updateOaProcessModel,
  validateOaProcessBpmn,
} from '@/services/web/guardfind/oa';
import {
  defaultOaBpmnXml,
  type OaBpmnSelection,
  type OaBpmnSummary,
  type OaBpmnValidationReport,
  validateOaBpmnXml,
} from '@/utils/oaBpmn';
import OaBpmnCanvas, {
  type OaBpmnCanvasHandle,
} from './components/OaBpmnCanvas';
import OaBpmnPreview from './components/OaBpmnPreview';
import OaBpmnProperties from './components/OaBpmnProperties';
import OaConditionBuilder from './components/OaConditionBuilder';

const STATUS_META: Record<string, { text: string; color: string }> = {
  DRAFT: { text: '草稿', color: 'default' },
  PUBLISHED: { text: '已发布', color: 'green' },
  DISABLED: { text: '已停用', color: 'red' },
};

function downloadXml(xml: string, filename: string) {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function summaryTags(summary: OaBpmnSummary) {
  return [
    { label: '节点', value: summary.nodeCount },
    { label: '审批', value: summary.userTaskCount },
    { label: '服务任务', value: summary.serviceTaskCount },
    { label: '网关', value: summary.gatewayCount },
    { label: '定时边界', value: summary.boundaryTimerCount },
    { label: '条件连线', value: summary.conditionCount },
  ];
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

type PublishFormValues = {
  formVersionId?: number;
  launchScope?: string;
  remark?: string;
};

const ProcessDesignPage: React.FC = () => {
  const canvasRef = useRef<OaBpmnCanvasHandle>(null);
  const [searchParams] = useSearchParams();
  const [modelId] = useState(() => searchParams.get('id'));
  const [model, setModel] = useState<OaProcessModelVo | null>(null);
  const [initialXml, setInitialXml] = useState<string | null>(() =>
    modelId ? null : defaultOaBpmnXml(),
  );
  const [modelLoading, setModelLoading] = useState(Boolean(modelId));
  const [modelError, setModelError] = useState<string | null>(null);
  const [selection, setSelection] = useState<OaBpmnSelection | null>(null);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [report, setReport] = useState<OaBpmnValidationReport | null>(null);
  const [serverReport, setServerReport] =
    useState<OaBpmnValidateResultVo | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewXml, setPreviewXml] = useState('');
  const [previewSummary, setPreviewSummary] = useState<OaBpmnSummary | null>(
    null,
  );
  const [conditionOpen, setConditionOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishErrors, setPublishErrors] = useState<string[]>([]);
  const [publishForm] = Form.useForm<PublishFormValues>();
  const [disableOpen, setDisableOpen] = useState(false);
  const [disabling, setDisabling] = useState(false);

  useEffect(() => {
    if (!modelId) return;
    let cancelled = false;
    setModelLoading(true);
    setModelError(null);
    getOaProcessModel(modelId)
      .then((response) => {
        if (cancelled) return;
        const detail = response.data;
        setModel(detail);
        setInitialXml(
          detail.bpmnXml || defaultOaBpmnXml(detail.modelKey, detail.name),
        );
      })
      .catch((error) => {
        if (cancelled) return;
        setModelError(errorText(error));
        setInitialXml(defaultOaBpmnXml());
      })
      .finally(() => {
        if (!cancelled) setModelLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [modelId]);

  const requireCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('画布尚未就绪');
    return canvas;
  };

  const exportAndValidate = async () => {
    const xml = await requireCanvas().exportXML();
    const result = validateOaBpmnXml(xml);
    setReport(result);
    return { xml, result };
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      const { xml, result } = await exportAndValidate();
      const filename = `${result.summary.processId || 'process'}.bpmn`;
      downloadXml(xml, filename);
      message.success(`已导出 ${filename}`);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const handleValidate = async () => {
    setBusy(true);
    setServerReport(null);
    try {
      const { xml, result } = await exportAndValidate();
      if (!result.valid) {
        message.error(`预检发现 ${result.errors.length} 个问题`);
        return result;
      }
      const response = await validateOaProcessBpmn(xml);
      setServerReport(response.data);
      if (response.data.valid) {
        message.success('前端预检与服务端校验均通过，发布时服务端会再次校验');
      } else {
        message.error(`服务端校验发现 ${response.data.errors.length} 个问题`);
      }
      return result;
    } catch (error) {
      message.error(errorText(error));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handlePreview = async () => {
    setBusy(true);
    try {
      const { xml, result } = await exportAndValidate();
      if (!result.valid) {
        message.error('请先修复预检问题再预览');
        return;
      }
      setPreviewXml(xml);
      setPreviewSummary(result.summary);
      setPreviewOpen(true);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const handleNew = () => {
    const reset = async () => {
      try {
        await requireCanvas().importXML(defaultOaBpmnXml());
        setDirty(false);
        setReport(null);
        setServerReport(null);
        setSelection(null);
        message.success('已新建空白流程');
      } catch (error) {
        message.error(errorText(error));
      }
    };
    if (!dirty) {
      void reset();
      return;
    }
    Modal.confirm({
      title: '新建流程',
      content: '当前未保存的修改将丢失，确定新建吗？',
      okText: '新建',
      cancelText: '取消',
      onOk: reset,
    });
  };

  const handleImport = async (file: File) => {
    try {
      const xml = await file.text();
      await requireCanvas().importXML(xml);
      setDirty(true);
      setReport(null);
      setServerReport(null);
      setSelection(null);
      message.success(`已导入 ${file.name}`);
    } catch (error) {
      message.error(`导入失败：${errorText(error)}`);
    }
  };

  const handleConditionSubmit = (expression: string) => {
    if (!selection?.isSequenceFlow) return;
    try {
      requireCanvas().updateCondition(selection.id, expression);
      setConditionOpen(false);
      setDirty(true);
      message.success('条件已应用');
    } catch (error) {
      message.error(errorText(error));
    }
  };

  const saveDraft = async () => {
    if (!model) throw new Error('请从流程模型列表创建或打开模型后再保存');
    const xml = await requireCanvas().exportXML();
    const response = await updateOaProcessModel(model.id, {
      name: model.name,
      category: model.category ?? undefined,
      description: model.description ?? undefined,
      bpmnXml: xml,
      version: model.version,
    });
    setModel(response.data);
    setDirty(false);
    return response.data;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDraft();
      message.success('草稿已保存');
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSaving(false);
    }
  };

  const openPublish = () => {
    publishForm.resetFields();
    setPublishErrors([]);
    setPublishOpen(true);
  };

  const handlePublish = async () => {
    if (!model) return;
    const values = await publishForm.validateFields();
    setPublishing(true);
    try {
      if (dirty) await saveDraft();
      const response = await publishOaProcessModel(model.id, {
        formVersionId: values.formVersionId,
        launchScope: values.launchScope?.trim() || undefined,
        remark: values.remark?.trim() || undefined,
      });
      const result = response.data;
      if (!result.valid) {
        setPublishErrors(result.errors);
        return;
      }
      setPublishOpen(false);
      setPublishErrors([]);
      message.success(
        `发布成功：版本 v${result.releaseVersion}（引擎版本 ${result.processDefinitionVersion}）`,
      );
      const detail = await getOaProcessModel(model.id);
      setModel(detail.data);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setPublishing(false);
    }
  };

  const handleDisable = async () => {
    if (!model) return;
    setDisabling(true);
    try {
      const response = await disableOaProcessModel(model.id);
      setModel(response.data);
      setDisableOpen(false);
      message.success('已停用');
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setDisabling(false);
    }
  };

  const statusMeta = model
    ? STATUS_META[model.status] || { text: model.status, color: 'default' }
    : null;

  const headerExtra = [
    <Button
      key="save"
      icon={<SaveOutlined />}
      loading={saving}
      disabled={!model || !ready}
      onClick={() => void handleSave()}
    >
      保存草稿
    </Button>,
    <AccessControl key="publish" permission="system:oa:process:publish">
      <Button
        type="primary"
        icon={<CloudUploadOutlined />}
        disabled={!model || !ready}
        onClick={openPublish}
      >
        发布
      </Button>
    </AccessControl>,
    <AccessControl key="disable" permission="system:oa:process:disable">
      <Button
        danger
        icon={<StopOutlined />}
        disabled={!model || model.status === 'DISABLED'}
        onClick={() => setDisableOpen(true)}
      >
        停用
      </Button>
    </AccessControl>,
  ];

  return (
    <PageContainer
      onBack={() => history.push('/oa/process')}
      header={{
        title: model ? model.name : '流程设计器',
        subTitle: model
          ? `${model.modelKey} · 草稿版本 ${model.version}${
              model.currentReleaseVersion
                ? ` · 当前发布 v${model.currentReleaseVersion}`
                : ''
            }`
          : 'BPMN 2.0 · 设计期预检与服务端发布校验',
        extra: headerExtra,
      }}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {modelError ? (
          <Alert
            type="error"
            showIcon
            message="加载流程模型失败"
            description={`${modelError}。当前已回退到本地空白流程，保存与发布不可用。`}
          />
        ) : null}
        {model ? (
          <Alert
            type="info"
            showIcon
            message={
              <Space wrap>
                <span>模型：{model.name}</span>
                {statusMeta ? (
                  <Tag color={statusMeta.color}>{statusMeta.text}</Tag>
                ) : null}
                <Tag>草稿版本 {model.version}</Tag>
                {model.currentReleaseVersion ? (
                  <Tag color="green">
                    当前发布 v{model.currentReleaseVersion}
                  </Tag>
                ) : null}
                {dirty ? <Tag color="orange">未保存修改</Tag> : null}
              </Space>
            }
            description="保存只写草稿；发布时服务端会重新校验 XML、部署流程并生成不可变版本，运行中的旧实例不迁移。"
          />
        ) : !modelId ? (
          <Alert
            type="info"
            showIcon
            message="当前为本地设计模式，未绑定流程模型。"
            description="请从流程模型列表新建或打开模型后再保存、发布；本地模式仍可编辑、导出和预检。"
          />
        ) : null}

        <Card size="small">
          <Space wrap>
            {!model ? (
              <Button icon={<PlusOutlined />} onClick={handleNew}>
                新建
              </Button>
            ) : null}
            <Upload
              accept=".bpmn,.xml"
              showUploadList={false}
              beforeUpload={(file) => {
                void handleImport(file);
                return Upload.LIST_IGNORE;
              }}
            >
              <Button icon={<ImportOutlined />}>导入</Button>
            </Upload>
            <Button
              icon={<ExportOutlined />}
              loading={busy}
              onClick={handleExport}
            >
              导出
            </Button>
            <Divider type="vertical" />
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={busy}
              disabled={!ready}
              onClick={handleValidate}
            >
              校验
            </Button>
            <Button
              icon={<EyeOutlined />}
              loading={busy}
              disabled={!ready}
              onClick={handlePreview}
            >
              预览
            </Button>
            <Divider type="vertical" />
            <Button
              icon={<UndoOutlined />}
              disabled={!ready}
              onClick={() => canvasRef.current?.undo()}
            >
              撤销
            </Button>
            <Button
              icon={<RedoOutlined />}
              disabled={!ready}
              onClick={() => canvasRef.current?.redo()}
            >
              重做
            </Button>
            <Button
              icon={<ExpandOutlined />}
              disabled={!ready}
              onClick={() => canvasRef.current?.zoomFit()}
            >
              适应画布
            </Button>
            <Divider type="vertical" />
            <Tag color={ready ? 'green' : 'default'}>
              {ready ? '画布已就绪' : '加载中'}
            </Tag>
            {dirty ? <Tag color="orange">未保存修改</Tag> : null}
          </Space>
        </Card>

        {modelLoading ? (
          <Card size="small">
            <Spin tip="正在加载流程模型…">
              <div style={{ height: 80 }} />
            </Spin>
          </Card>
        ) : null}

        {initialXml ? (
          <div
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            <Card
              title="流程画布"
              size="small"
              style={{ flex: '1 1 560px', minWidth: 0 }}
              styles={{ body: { padding: 0 } }}
            >
              <OaBpmnCanvas
                ref={canvasRef}
                xml={initialXml}
                onSelectionChange={setSelection}
                onChange={() => {
                  if (ready) setDirty(true);
                }}
                onReady={() => setReady(true)}
              />
            </Card>
            <Card
              title="节点属性"
              size="small"
              style={{ flex: '0 0 380px', maxWidth: '100%' }}
            >
              <OaBpmnProperties
                selection={selection}
                onChangeName={(name) => {
                  if (!selection) return;
                  canvasRef.current?.updateName(selection.id, name);
                }}
                onUpdateUserTask={(attributes) => {
                  if (!selection) return;
                  canvasRef.current?.updateUserTask(selection.id, attributes);
                }}
                onUpdateServiceTask={(className) => {
                  if (!selection) return;
                  canvasRef.current?.updateServiceTask(selection.id, className);
                }}
                onUpdateCondition={(expression) => {
                  if (!selection) return;
                  canvasRef.current?.updateCondition(selection.id, expression);
                }}
                onUpdateDefaultFlow={(flowId) => {
                  if (!selection) return;
                  canvasRef.current?.updateDefaultFlow(selection.id, flowId);
                }}
                onUpdateTimer={(type, value) => {
                  if (!selection) return;
                  canvasRef.current?.updateTimer(selection.id, type, value);
                }}
                onOpenConditionBuilder={() => setConditionOpen(true)}
              />
            </Card>
          </div>
        ) : null}

        {report ? (
          <Card
            title="前端预检结果"
            size="small"
            extra={
              <Tag color={report.valid ? 'green' : 'red'}>
                {report.valid ? '通过' : `${report.errors.length} 个问题`}
              </Tag>
            }
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Alert
                type={report.valid ? 'success' : 'error'}
                showIcon
                message={
                  report.valid
                    ? '节点、连线、审批范围与条件均通过前端预检'
                    : '前端预检未通过'
                }
              />
              {report.errors.length ? (
                <List
                  size="small"
                  header={<Typography.Text strong>错误</Typography.Text>}
                  dataSource={report.errors}
                  renderItem={(item) => (
                    <List.Item>
                      <Typography.Text type="danger">{item}</Typography.Text>
                    </List.Item>
                  )}
                />
              ) : null}
              {report.warnings.length ? (
                <List
                  size="small"
                  header={<Typography.Text strong>提示</Typography.Text>}
                  dataSource={report.warnings}
                  renderItem={(item) => (
                    <List.Item>
                      <Typography.Text type="warning">{item}</Typography.Text>
                    </List.Item>
                  )}
                />
              ) : null}
              <Space wrap>
                {summaryTags(report.summary).map((entry) => (
                  <Tag key={entry.label}>
                    {entry.label} {entry.value}
                  </Tag>
                ))}
              </Space>
              {serverReport ? (
                <Alert
                  type={serverReport.valid ? 'success' : 'error'}
                  showIcon
                  message={
                    serverReport.valid
                      ? `服务端校验通过：流程 Key ${serverReport.processKey}，节点 ${serverReport.nodeCount} 个`
                      : '服务端校验未通过'
                  }
                  description={
                    serverReport.valid ? undefined : (
                      <List
                        size="small"
                        dataSource={serverReport.errors}
                        renderItem={(item) => (
                          <List.Item>
                            <Typography.Text type="danger">
                              {item}
                            </Typography.Text>
                          </List.Item>
                        )}
                      />
                    )
                  }
                />
              ) : null}
            </Space>
          </Card>
        ) : null}
      </Space>

      <OaConditionBuilder
        open={conditionOpen}
        currentExpression={selection?.condition}
        onCancel={() => setConditionOpen(false)}
        onSubmit={handleConditionSubmit}
      />
      {previewSummary ? (
        <OaBpmnPreview
          open={previewOpen}
          xml={previewXml}
          summary={previewSummary}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}

      <Modal
        title={`发布流程：${model?.name || ''}`}
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
          message="发布前会先保存当前画布；服务端将重新校验 XML、部署流程并生成不可变版本，运行中的旧实例不会迁移。"
        />
        {publishErrors.length ? (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
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
        <Form form={publishForm} layout="vertical">
          <Form.Item
            name="formVersionId"
            label="表单版本 ID（可选）"
            tooltip="需属于当前租户；表单设计接入后可由页面选择"
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="留空表示不绑定表单"
            />
          </Form.Item>
          <Form.Item name="launchScope" label="可发起范围（可选）">
            <Input placeholder="如 dept:10,dept:11；留空表示后续按组织策略" />
          </Form.Item>
          <Form.Item name="remark" label="发布说明（可选）">
            <Input.TextArea rows={2} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="停用流程模型"
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
          message="停用后新发起将被阻止，运行中的实例不会迁移或终止。"
        />
      </Modal>
    </PageContainer>
  );
};

export default ProcessDesignPage;
