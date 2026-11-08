/**
 * 岗位字典：编码会写入 BPMN 的 position:CODE，创建后不可修改；停用后不再出现在选择器。
 */
import { PlusOutlined } from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Space,
  Switch,
  Tag,
} from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  createOaPosition,
  type OaPositionStatus,
  type OaPositionVo,
  queryOaPositions,
  updateOaPosition,
} from '@/services/web/guardfind/oa';

type PositionFormValues = {
  code: string;
  name: string;
  sort: number;
  enabled: boolean;
};

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

const PositionPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [form] = Form.useForm<PositionFormValues>();
  const [editing, setEditing] = useState<OaPositionVo | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ sort: 0, enabled: true });
    setOpen(true);
  };

  const openEdit = (record: OaPositionVo) => {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      sort: record.sort,
      enabled: record.status === 'ENABLED',
    });
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        const status: OaPositionStatus = values.enabled
          ? 'ENABLED'
          : 'DISABLED';
        await updateOaPosition(editing.id, {
          name: values.name.trim(),
          sort: values.sort,
          status,
          version: editing.version,
        });
        message.success('岗位已更新');
      } else {
        await createOaPosition({
          code: values.code.trim(),
          name: values.name.trim(),
          sort: values.sort,
        });
        message.success('岗位已创建');
      }
      setOpen(false);
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSaving(false);
    }
  };

  const columns: ProColumns<OaPositionVo>[] = [
    { title: '岗位编码', dataIndex: 'code', copyable: true },
    { title: '岗位名称', dataIndex: 'name', search: false },
    {
      title: '在职员工',
      dataIndex: 'employeeCount',
      search: false,
      render: (_, record) => `${record.employeeCount} 人`,
    },
    { title: '排序', dataIndex: 'sort', search: false },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        ENABLED: { text: '启用' },
        DISABLED: { text: '停用' },
      },
      render: (_, record) => (
        <Tag color={record.status === 'ENABLED' ? 'green' : 'red'}>
          {record.status === 'ENABLED' ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      search: false,
      render: (_, record) => (
        <AccessControl permission="system:oa:position:update">
          <Button type="link" onClick={() => openEdit(record)}>
            编辑
          </Button>
        </AccessControl>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable<OaPositionVo>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        toolBarRender={() => [
          <AccessControl key="create" permission="system:oa:position:create">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新建岗位
            </Button>
          </AccessControl>,
        ]}
        request={async (params) => {
          const response = await queryOaPositions({
            page: params.current ?? 1,
            size: params.pageSize ?? 10,
            keyword: params.keyword,
            status: params.status,
          });
          return {
            data: response.data.list,
            total: response.data.total,
            success: true,
          };
        }}
      />

      <Modal
        title={editing ? `编辑岗位：${editing.name}` : '新建岗位'}
        open={open}
        width={520}
        confirmLoading={saving}
        destroyOnHidden
        onCancel={() => setOpen(false)}
        onOk={() => void handleSave()}
      >
        <Form form={form} name="oaPositionForm" layout="vertical">
          <Form.Item
            name="code"
            label="岗位编码"
            rules={[
              { required: true, message: '请输入岗位编码' },
              {
                pattern: /^[A-Za-z][A-Za-z0-9_-]*$/,
                transform: (value: string) => value?.trim(),
                message: '只能包含字母、数字、下划线和短横线，且以字母开头',
              },
            ]}
            extra={
              editing
                ? '编码已写入流程审批人配置，创建后不可修改'
                : '流程 BPMN 中通过 position:编码 指定岗位审批人'
            }
          >
            <Input
              maxLength={64}
              disabled={Boolean(editing)}
              placeholder="如 FINANCE"
            />
          </Form.Item>
          <Form.Item
            name="name"
            label="岗位名称"
            rules={[{ required: true, message: '请输入岗位名称' }]}
          >
            <Input maxLength={64} placeholder="如 财务" />
          </Form.Item>
          <Space size={16} align="start">
            <Form.Item name="sort" label="排序">
              <InputNumber min={0} max={9999} precision={0} />
            </Form.Item>
            {editing ? (
              <Form.Item
                name="enabled"
                label="启用"
                valuePropName="checked"
                extra="停用后不再参与审批人候选与岗位选择"
              >
                <Switch />
              </Form.Item>
            ) : null}
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default PositionPage;
