/**
 * 表单列表：草稿、已发布版本与停用入口。
 * 发布时服务端重新校验 schema 并写入不可变版本快照。
 */
import {
  EditOutlined,
  FormOutlined,
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
  createOaForm,
  disableOaForm,
  type OaFormVersionVo,
  type OaFormVo,
  publishOaForm,
  queryOaForms,
  queryOaFormVersions,
} from '@/services/web/guardfind/oa';

const STATUS_META: Record<string, { text: string; color: string }> = {
  DRAFT: { text: '草稿', color: 'default' },
  PUBLISHED: { text: '已发布', color: 'green' },
  DISABLED: { text: '已停用', color: 'red' },
};

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

function statusTag(status: string) {
  const meta = STATUS_META[status] || { text: status, color: 'default' };
  return <Tag color={meta.color}>{meta.text}</Tag>;
}

type CreateFormValues = {
  formKey: string;
  name: string;
  description?: string;
};

const FormListPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [createForm] = Form.useForm<CreateFormValues>();
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [publishTarget, setPublishTarget] = useState<OaFormVo | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishErrors, setPublishErrors] = useState<string[]>([]);
  const [versionTarget, setVersionTarget] = useState<OaFormVo | null>(null);
  const [versions, setVersions] = useState<OaFormVersionVo[]>([]);
  const [versionLoading, setVersionLoading] = useState(false);

  const openCreate = () => {
    createForm.resetFields();
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    const values = await createForm.validateFields();
    setCreating(true);
    try {
      const response = await createOaForm({
        formKey: values.formKey.trim(),
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
      });
      setCreateOpen(false);
      message.success('已创建表单草稿');
      actionRef.current?.reload();
      history.push(`/oa/form/design?id=${response.data.id}`);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setCreating(false);
    }
  };

  const openPublish = (record: OaFormVo) => {
    setPublishErrors([]);
    setPublishTarget(record);
  };

  const handlePublish = async () => {
    if (!publishTarget) return;
    setPublishing(true);
    try {
      const response = await publishOaForm(publishTarget.id);
      const result = response.data;
      if (!result.valid) {
        setPublishErrors(result.errors);
        return;
      }
      setPublishTarget(null);
      setPublishErrors([]);
      message.success(`发布成功：版本 v${result.version}`);
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setPublishing(false);
    }
  };

  const handleDisable = async (record: OaFormVo) => {
    try {
      await disableOaForm(record.id);
      message.success('已停用；已发布版本仍保留，但不再作为发布绑定的候选');
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    }
  };

  const openVersions = async (record: OaFormVo) => {
    setVersionTarget(record);
    setVersions([]);
    setVersionLoading(true);
    try {
      const response = await queryOaFormVersions(record.id);
      setVersions(response.data || []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setVersionLoading(false);
    }
  };

  const columns: ProColumns<OaFormVo>[] = [
    {
      title: '搜索',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '表单标识或名称' },
    },
    {
      title: '标识',
      dataIndex: 'formKey',
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
      dataIndex: 'currentVersion',
      width: 100,
      hideInSearch: true,
      render: (_, record) =>
        record.currentVersion ? `v${record.currentVersion}` : '—',
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
            onClick={() => history.push(`/oa/form/design?id=${record.id}`)}
          >
            设计
          </Button>
          <AccessControl permission="system:oa:form:publish">
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
            onClick={() => void openVersions(record)}
          >
            版本
          </Button>
          {record.status !== 'DISABLED' ? (
            <AccessControl permission="system:oa:form:disable">
              <Popconfirm
                title="停用该表单？"
                description="停用后不再出现在流程发布的表单版本候选中，已发布版本仍保留。"
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
    <PageContainer header={{ title: '表单管理' }}>
      <ProTable<OaFormVo>
        headerTitle="表单管理"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        scroll={{ x: 1300 }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await queryOaForms({
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
          <AccessControl key="create" permission="system:oa:form:create">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新建表单
            </Button>
          </AccessControl>,
        ]}
      />

      <Modal
        title="新建表单"
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
          message="创建后进入表单设计器。表单标识用于流程与数据关联，创建后不可修改。"
        />
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="formKey"
            label="表单标识"
            rules={[
              { required: true, message: '请输入表单标识' },
              {
                pattern: /^[A-Za-z][A-Za-z0-9_]*$/,
                message: '仅支持字母、数字、下划线，且以字母开头',
              },
            ]}
          >
            <Input placeholder="如 leave_form" maxLength={64} />
          </Form.Item>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入表单名称' }]}
          >
            <Input placeholder="如 请假申请单" maxLength={100} />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={2} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`发布表单：${publishTarget?.name || ''}`}
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
          message="服务端会重新校验字段与选项，生成不可变版本快照；已发布版本不可修改。"
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
        title={`发布版本：${versionTarget?.name || ''}`}
        open={Boolean(versionTarget)}
        footer={null}
        width={820}
        onCancel={() => setVersionTarget(null)}
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
            {
              title: '字段数',
              dataIndex: 'fieldCount',
              width: 80,
            },
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
            {
              title: '发布时间',
              dataIndex: 'publishTime',
              width: 170,
            },
            {
              title: '操作',
              width: 90,
              render: (_, record) => (
                <Button
                  type="link"
                  icon={<FormOutlined />}
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
    </PageContainer>
  );
};

export default FormListPage;
