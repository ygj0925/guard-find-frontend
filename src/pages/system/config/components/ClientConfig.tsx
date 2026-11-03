import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  type ActionType,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import {
  Button,
  Input,
  InputNumber,
  Modal,
  message,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
} from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  createClient,
  deleteClients,
  getClient,
  queryClients,
  type SysClientDto,
  type SysClientVo,
  updateClient,
} from '@/services/web/system/client';

const AUTH_TYPE_OPTIONS = [
  { value: 'ACCOUNT', label: '账号密码' },
  { value: 'EMAIL', label: '邮箱' },
  { value: 'PHONE', label: '手机号' },
  { value: 'SOCIAL', label: '第三方账号' },
];

const CLIENT_TYPE_OPTIONS = [
  { value: 'PC', label: 'PC 端' },
  { value: 'APP', label: 'App 端' },
];

const CLIENT_TYPE_COLOR: Record<string, string> = {
  PC: 'geekblue',
  APP: 'orange',
};

interface ClientFormValues extends SysClientDto {
  activeTimeoutEnabled?: boolean;
}

const defaultFormValues: ClientFormValues = {
  clientId: '',
  clientType: 'PC',
  authType: ['ACCOUNT'],
  activeTimeout: 1800,
  activeTimeoutEnabled: true,
  timeout: 86400,
  isConcurrent: true,
  replacedRange: null,
  maxLoginCount: 3,
  overflowLogoutMode: 'LOGOUT',
  status: 1,
};

const ClientConfig: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ClientFormValues>({ ...defaultFormValues });
  const [authTypeError, setAuthTypeError] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...defaultFormValues });
    setAuthTypeError(false);
    setModalOpen(true);
  };

  const openEdit = async (record: SysClientVo) => {
    try {
      const response = await getClient(record.id);
      const detail = response.data;
      setEditingId(record.id);
      setForm({
        ...defaultFormValues,
        ...(detail || record),
        activeTimeoutEnabled:
          (detail?.activeTimeout ?? record.activeTimeout) != null,
      });
      setAuthTypeError(false);
      setModalOpen(true);
    } catch {
      message.error('加载客户端信息失败');
    }
  };

  const patch = (values: Partial<ClientFormValues>) => {
    setForm((prev) => ({ ...prev, ...values }));
  };

  const handleSave = async () => {
    if (!form.clientId?.trim()) {
      message.warning('请填写客户端 ID');
      return;
    }
    if (!form.authType?.length) {
      setAuthTypeError(true);
      message.warning('请至少勾选一种认证方式');
      return;
    }
    setAuthTypeError(false);
    setSaving(true);
    const payload: SysClientDto = {
      clientId: form.clientId.trim(),
      clientType: form.clientType,
      authType: form.authType,
      activeTimeout: form.activeTimeoutEnabled
        ? (form.activeTimeout ?? null)
        : null,
      timeout: form.timeout,
      isConcurrent: form.isConcurrent,
      replacedRange: form.isConcurrent
        ? null
        : (form.replacedRange ?? 'CURR_DEVICE_TYPE'),
      maxLoginCount: form.maxLoginCount,
      overflowLogoutMode: form.overflowLogoutMode ?? 'LOGOUT',
      status: form.status,
    };
    try {
      if (editingId == null) {
        await createClient(payload);
        message.success('新增成功');
      } else {
        await updateClient(editingId, payload);
        message.success('修改成功');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: SysClientVo) => {
    await deleteClients(record.id);
    message.success('删除成功');
    actionRef.current?.reload();
  };

  const columns: ProColumns<SysClientVo>[] = [
    { title: 'ID', dataIndex: 'id', width: 70, hideInSearch: true },
    {
      title: '客户端 ID',
      dataIndex: 'clientId',
      width: 220,
      ellipsis: true,
      copyable: true,
    },
    {
      title: '客户端类型',
      dataIndex: 'clientType',
      width: 110,
      hideInSearch: true,
      render: (_, record) => (
        <Tag color={CLIENT_TYPE_COLOR[record.clientType] || 'default'}>
          {record.clientType === 'APP' ? 'App 端' : 'PC 端'}
        </Tag>
      ),
    },
    {
      title: '认证方式',
      dataIndex: 'authType',
      width: 220,
      hideInSearch: true,
      render: (_, record) => (
        <Space wrap size={4}>
          {(record.authType || []).map((auth) => {
            const option = AUTH_TYPE_OPTIONS.find(
              (item) => item.value === auth,
            );
            return <Tag key={auth}>{option?.label ?? auth}</Tag>;
          })}
        </Space>
      ),
    },
    {
      title: '有效期（秒）',
      dataIndex: 'timeout',
      width: 110,
      hideInSearch: true,
    },
    {
      title: '无操作有效期（秒）',
      dataIndex: 'activeTimeout',
      width: 150,
      hideInSearch: true,
      render: (_, record) =>
        record.activeTimeout == null ? '不启用' : record.activeTimeout,
    },
    {
      title: '并发登录',
      dataIndex: 'isConcurrent',
      width: 90,
      hideInSearch: true,
      render: (_, record) => (record.isConcurrent ? '允许' : '互踢'),
    },
    {
      title: '最大登录数',
      dataIndex: 'maxLoginCount',
      width: 100,
      hideInSearch: true,
      render: (_, record) =>
        record.maxLoginCount === -1 ? '不限制' : record.maxLoginCount,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      hideInSearch: true,
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'success' : 'error'}>
          {record.status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 170,
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      className: 'table-action-column',
      width: 140,
      render: (_, record) => (
        <Space wrap>
          <AccessControl permission="system:client:update">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => void openEdit(record)}
            >
              编辑
            </Button>
          </AccessControl>
          <AccessControl permission="system:client:delete">
            <Popconfirm
              title="确定删除该客户端?"
              onConfirm={() => void handleDelete(record)}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          </AccessControl>
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable<SysClientVo>
        headerTitle="客户端配置"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        scroll={{ x: 1300 }}
        pagination={false}
        request={async (params) => {
          const { current, pageSize } = params;
          const response = await queryClients({
            page: (current as number) || 1,
            size: (pageSize as number) || 10,
          });
          return {
            data: response.data?.list || [],
            success: true,
            total: response.data?.total || 0,
          };
        }}
        toolBarRender={() => [
          <AccessControl key="create" permission="system:client:create">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增
            </Button>
          </AccessControl>,
        ]}
      />

      <Modal
        title={editingId == null ? '新增客户端' : '编辑客户端'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void handleSave()}
        confirmLoading={saving}
        destroyOnClose
        width={560}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div>
            <div style={{ marginBottom: 4 }}>客户端 ID *</div>
            <Input
              value={form.clientId}
              onChange={(e) => patch({ clientId: e.target.value })}
              placeholder="客户端唯一标识，如 ef51c9a3e9046c4f2ea45142c8a8344a"
            />
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>客户端类型 *</div>
            <Select
              style={{ width: '100%' }}
              value={form.clientType}
              options={CLIENT_TYPE_OPTIONS}
              onChange={(value) => patch({ clientType: value })}
            />
          </div>
          <div>
            <div
              style={{
                marginBottom: 4,
                color: authTypeError ? '#ff4d4f' : undefined,
              }}
            >
              认证方式 *（可多选）
            </div>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              value={form.authType}
              options={AUTH_TYPE_OPTIONS}
              status={authTypeError ? 'error' : undefined}
              onChange={(value) => {
                patch({ authType: value });
                if (value.length) setAuthTypeError(false);
              }}
            />
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>有效期（秒）*</div>
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              value={form.timeout}
              onChange={(value) => patch({ timeout: value ?? 86400 })}
            />
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>无操作有效期</div>
            <Space>
              <Switch
                checked={form.activeTimeoutEnabled}
                onChange={(checked) => patch({ activeTimeoutEnabled: checked })}
              />
              <InputNumber
                style={{ width: 200 }}
                min={1}
                disabled={!form.activeTimeoutEnabled}
                value={form.activeTimeout ?? undefined}
                onChange={(value) => patch({ activeTimeout: value })}
              />
              <span style={{ color: '#999' }}>
                秒（登录后无操作超过该时长即失效）
              </span>
            </Space>
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>允许同一账号并发登录</div>
            <Switch
              checked={form.isConcurrent}
              onChange={(checked) => patch({ isConcurrent: checked })}
            />
          </div>
          {!form.isConcurrent ? (
            <div>
              <div style={{ marginBottom: 4 }}>互踢范围</div>
              <Select
                style={{ width: '100%' }}
                value={form.replacedRange ?? 'CURR_DEVICE_TYPE'}
                options={[
                  { value: 'CURR_DEVICE_TYPE', label: '当前客户端类型' },
                  { value: 'ALL_DEVICE_TYPE', label: '所有客户端类型' },
                ]}
                onChange={(value) => patch({ replacedRange: value })}
              />
            </div>
          ) : null}
          <div>
            <div style={{ marginBottom: 4 }}>最大登录数量（-1 表示不限制）</div>
            <InputNumber
              style={{ width: '100%' }}
              min={-1}
              value={form.maxLoginCount}
              onChange={(value) => patch({ maxLoginCount: value ?? 3 })}
            />
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>登录数量溢出处理</div>
            <Select
              style={{ width: '100%' }}
              value={form.overflowLogoutMode ?? 'LOGOUT'}
              options={[
                { value: 'LOGOUT', label: '注销下线' },
                { value: 'KICKOUT', label: '踢人下线' },
              ]}
              onChange={(value) => patch({ overflowLogoutMode: value })}
            />
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>状态</div>
            <Select
              style={{ width: 200 }}
              value={form.status}
              options={[
                { value: 1, label: '启用' },
                { value: 2, label: '禁用' },
              ]}
              onChange={(value) => patch({ status: value })}
            />
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default ClientConfig;
