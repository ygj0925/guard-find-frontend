/**
 * 流程模型列表：草稿、发布版本与停用入口。
 * 发布由服务端重新校验并生成不可变版本，运行中的旧实例不迁移。
 */
import {
  EditOutlined,
  HistoryOutlined,
  PlusOutlined,
  StopOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  createOaProcessModel,
  disableOaProcessModel,
  type OaProcessModelVo,
  type OaProcessReleaseVo,
  publishOaProcessModel,
  queryOaProcessModels,
  queryOaProcessReleases,
} from '@/services/web/guardfind/oa';
import { defaultOaBpmnXml } from '@/utils/oaBpmn';

const STATUS_META: Record<string, { text: string; color: string }> = {
  DRAFT: { text: '草稿', color: 'default' },
  PUBLISHED: { text: '已发布', color: 'green' },
  DISABLED: { text: '已停用', color: 'red' },
};

const RELEASE_STATUS_META: Record<string, { text: string; color: string }> = {
  ACTIVE: { text: '生效中', color: 'green' },
  STOPPED: { text: '已停止', color: 'default' },
};

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

function statusTag(status: string) {
  const meta = STATUS_META[status] || { text: status, color: 'default' };
  return <Tag color={meta.color}>{meta.text}</Tag>;
}

type CreateFormValues = {
  modelKey: string;
  name: string;
  category?: string;
  description?: string;
};

type PublishFormValues = {
  formVersionId?: number;
  launchScope?: string;
  remark?: string;
};

const ProcessModelPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [createForm] = Form.useForm<CreateFormValues>();
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [publishForm] = Form.useForm<PublishFormValues>();
  const [publishTarget, setPublishTarget] = useState<OaProcessModelVo | null>(
    null,
  );
  const [publishing, setPublishing] = useState(false);
  const [publishErrors, setPublishErrors] = useState<string[]>([]);
  const [releaseTarget, setReleaseTarget] = useState<OaProcessModelVo | null>(
    null,
  );
  const [releases, setReleases] = useState<OaProcessReleaseVo[]>([]);
  const [releaseLoading, setReleaseLoading] = useState(false);

  const openCreate = () => {
    createForm.resetFields();
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    const values = await createForm.validateFields();
    setCreating(true);
    try {
      const response = await createOaProcessModel({
        modelKey: values.modelKey.trim(),
        name: values.name.trim(),
        category: values.category?.trim() || undefined,
        description: values.description?.trim() || undefined,
        bpmnXml: defaultOaBpmnXml(values.modelKey.trim(), values.name.trim()),
      });
      setCreateOpen(false);
      message.success('已创建流程草稿');
      actionRef.current?.reload();
      history.push(`/oa/process/design?id=${response.data.id}`);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setCreating(false);
    }
  };

  const openPublish = (record: OaProcessModelVo) => {
    publishForm.resetFields();
    setPublishErrors([]);
    setPublishTarget(record);
  };

  const handlePublish = async () => {
    if (!publishTarget) return;
    const values = await publishForm.validateFields();
    setPublishing(true);
    try {
      const response = await publishOaProcessModel(publishTarget.id, {
        formVersionId: values.formVersionId,
        launchScope: values.launchScope?.trim() || undefined,
        remark: values.remark?.trim() || undefined,
      });
      const result = response.data;
      if (!result.valid) {
        setPublishErrors(result.errors);
        return;
      }
      setPublishTarget(null);
      setPublishErrors([]);
      message.success(
        `发布成功：版本 v${result.releaseVersion}（引擎版本 ${result.processDefinitionVersion}）`,
      );
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setPublishing(false);
    }
  };

  const handleDisable = async (record: OaProcessModelVo) => {
    try {
      await disableOaProcessModel(record.id);
      message.success('已停用，新发起将被阻止；运行中的实例不受影响');
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    }
  };

  const openReleases = async (record: OaProcessModelVo) => {
    setReleaseTarget(record);
    setReleases([]);
    setReleaseLoading(true);
    try {
      const response = await queryOaProcessReleases(record.id);
      setReleases(response.data || []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setReleaseLoading(false);
    }
  };

  const columns: ProColumns<OaProcessModelVo>[] = [
    {
      title: '搜索',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '模型标识或名称' },
    },
    {
      title: '标识',
      dataIndex: 'modelKey',
      width: 160,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '名称',
      dataIndex: 'name',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 110,
      hideInSearch: true,
      render: (_, record) => record.category || '—',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: {
        DRAFT: { text: '草稿' },
        PUBLISHED: { text: '已发布' },
        DISABLED: { text: '已停用' },
      },
      render: (_, record) => statusTag(record.status),
    },
    {
      title: '当前版本',
      dataIndex: 'currentReleaseVersion',
      width: 100,
      hideInSearch: true,
      render: (_, record) =>
        record.currentReleaseVersion ? `v${record.currentReleaseVersion}` : '—',
    },
    {
      title: '草稿版本',
      dataIndex: 'version',
      width: 100,
      hideInSearch: true,
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      width: 170,
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      className: 'table-action-column',
      width: 280,
      render: (_, record) => (
        <Space wrap>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => history.push(`/oa/process/design?id=${record.id}`)}
          >
            设计
          </Button>
          <AccessControl permission="system:oa:process:publish">
            <Button
              type="link"
              icon={<UploadOutlined />}
              onClick={() => openPublish(record)}
            >
              发布
            </Button>
          </AccessControl>
          <Button
            type="link"
            icon={<HistoryOutlined />}
            onClick={() => void openReleases(record)}
          >
            版本
          </Button>
          {record.status !== 'DISABLED' ? (
            <AccessControl permission="system:oa:process:disable">
              <Popconfirm
                title="停用该流程模型？"
                description="新发起将被阻止，运行中的实例不受影响。"
                okText="停用"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={() => void handleDisable(record)}
              >
                <Button type="link" danger icon={<StopOutlined />}>
                  停用
                </Button>
              </Popconfirm>
            </AccessControl>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer header={{ title: '流程模型' }}>
      <ProTable<OaProcessModelVo>
        headerTitle="流程模型"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        scroll={{ x: 1300 }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await queryOaProcessModels({
            page: (current as number) || 1,
            size: (pageSize as number) || 10,
            keyword: (rest.keyword as string) || undefined,
            status: (rest.status as string) || undefined,
          });
          return {
            data: response.data?.list || [],
            success: true,
            total: response.data?.total || 0,
          };
        }}
        toolBarRender={() => [
          <AccessControl key="create" permission="system:oa:process:create">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新建流程
            </Button>
          </AccessControl>,
        ]}
      />

      <Modal
        title="新建流程模型"
        open={createOpen}
        confirmLoading={creating}
        okText="创建并设计"
        cancelText="取消"
        onOk={() => void handleCreate()}
        onCancel={() => setCreateOpen(false)}
        destroyOnHidden
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="创建后进入设计器。模型标识用于流程定义 Key，创建后不可修改。"
        />
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="modelKey"
            label="模型标识"
            rules={[
              { required: true, message: '请输入模型标识' },
              {
                pattern: /^[A-Za-z_][A-Za-z0-9_]{0,63}$/,
                message: '仅支持字母、数字、下划线，且以字母或下划线开头',
              },
            ]}
          >
            <Input placeholder="如 leave_demo" maxLength={64} />
          </Form.Item>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入模型名称' }]}
          >
            <Input placeholder="如 请假审批" maxLength={100} />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Input placeholder="如 人事" maxLength={64} />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={2} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`发布流程：${publishTarget?.name || ''}`}
        open={Boolean(publishTarget)}
        confirmLoading={publishing}
        okText="发布"
        cancelText="取消"
        onOk={() => void handlePublish()}
        onCancel={() => setPublishTarget(null)}
        destroyOnHidden
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="服务端会重新校验并部署 XML，生成不可变版本；运行中的旧实例不会迁移。"
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
        title={`发布版本：${releaseTarget?.name || ''}`}
        open={Boolean(releaseTarget)}
        footer={null}
        width={900}
        onCancel={() => setReleaseTarget(null)}
        destroyOnHidden
      >
        <Table<OaProcessReleaseVo>
          rowKey="id"
          size="small"
          loading={releaseLoading}
          dataSource={releases}
          pagination={false}
          scroll={{ x: 800 }}
          columns={[
            {
              title: '版本',
              dataIndex: 'releaseVersion',
              width: 70,
              render: (value) => `v${value}`,
            },
            {
              title: '流程 Key',
              dataIndex: 'processDefinitionKey',
              width: 140,
              ellipsis: true,
            },
            {
              title: '引擎定义 ID',
              dataIndex: 'engineDefinitionId',
              width: 170,
              ellipsis: true,
            },
            {
              title: '引擎版本',
              dataIndex: 'processDefinitionVersion',
              width: 90,
            },
            {
              title: '表单版本',
              dataIndex: 'formVersion',
              width: 90,
              render: (value) => (value ? `v${value}` : '—'),
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 90,
              render: (value: string) => {
                const meta = RELEASE_STATUS_META[value] || {
                  text: value,
                  color: 'default',
                };
                return <Tag color={meta.color}>{meta.text}</Tag>;
              },
            },
            {
              title: '发布时间',
              dataIndex: 'publishTime',
              width: 170,
            },
            {
              title: '说明',
              dataIndex: 'remark',
              ellipsis: true,
            },
          ]}
        />
      </Modal>
    </PageContainer>
  );
};

export default ProcessModelPage;
