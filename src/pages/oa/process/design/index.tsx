/**
 * 流程设计页：bpmn-js 画布 + 受限属性面板 + 前端预检 + 只读预览。
 * 服务端 OaBpmnValidator 仍是发布时的最终校验方，这里的结果只用于设计期提示。
 */
import {
  CheckCircleOutlined,
  ExpandOutlined,
  ExportOutlined,
  EyeOutlined,
  ImportOutlined,
  PlusOutlined,
  RedoOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Card,
  Divider,
  List,
  Modal,
  message,
  Space,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import React, { useRef, useState } from 'react';
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

const ProcessDesignPage: React.FC = () => {
  const canvasRef = useRef<OaBpmnCanvasHandle>(null);
  const [initialXml] = useState(defaultOaBpmnXml);
  const [selection, setSelection] = useState<OaBpmnSelection | null>(null);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [report, setReport] = useState<OaBpmnValidationReport | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewXml, setPreviewXml] = useState('');
  const [previewSummary, setPreviewSummary] = useState<OaBpmnSummary | null>(
    null,
  );
  const [conditionOpen, setConditionOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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
    try {
      const { result } = await exportAndValidate();
      if (result.valid)
        message.success('前端预检通过，发布前仍以服务端校验为准');
      else message.error(`预检发现 ${result.errors.length} 个问题`);
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
      content: '当前未导出的修改将丢失，确定新建吗？',
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

  return (
    <PageContainer
      header={{
        title: '流程设计器',
        subTitle: 'BPMN 2.0 · 设计期预检与服务端发布校验',
      }}
      extra={[
        <Tooltip key="publish" title="保存与发布接口将在 9.7 接入">
          <Button disabled>发布</Button>
        </Tooltip>,
      ]}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message="当前版本提供画布设计、导入导出、前端预检与只读预览；保存/发布接口将在 9.7 接入。"
        />

        <Card size="small">
          <Space wrap>
            <Button icon={<PlusOutlined />} onClick={handleNew}>
              新建
            </Button>
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
            {dirty ? <Tag color="orange">未导出修改</Tag> : null}
          </Space>
        </Card>

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
    </PageContainer>
  );
};

export default ProcessDesignPage;
