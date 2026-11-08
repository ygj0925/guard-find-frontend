/**
 * 员工档案：后台账号 + 部门只读，维护工号、直属主管、岗位与在职状态。
 * 直属主管必须是在职员工且不能形成环路；离职不会自动转交存量待办。
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
  DatePicker,
  Form,
  Input,
  Modal,
  message,
  Select,
  Space,
  Switch,
  Tag,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  createOaEmployee,
  type OaEmployeeOptionVo,
  type OaEmployeeVo,
  type OaPositionOptionVo,
  queryOaEmployeeOptions,
  queryOaEmployees,
  queryOaEmployeeUserOptions,
  queryOaPositionOptions,
  updateOaEmployee,
} from '@/services/web/guardfind/oa';

const STATUS_META: Record<string, { text: string; color: string }> = {
  ACTIVE: { text: '在职', color: 'green' },
  SUSPENDED: { text: '停职', color: 'orange' },
  RESIGNED: { text: '离职', color: 'red' },
};

type EmployeeFormValues = {
  userId: number;
  employeeNo?: string;
  supervisorId?: number;
  employmentStatus: 'ACTIVE' | 'SUSPENDED' | 'RESIGNED';
  deptLeader: boolean;
  hireDate?: Dayjs;
  leaveDate?: Dayjs;
  positionIds: number[];
};

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

const EmployeePage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [form] = Form.useForm<EmployeeFormValues>();
  const [editing, setEditing] = useState<OaEmployeeVo | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<OaEmployeeOptionVo[]>([]);
  const [employees, setEmployees] = useState<OaEmployeeOptionVo[]>([]);
  const [positions, setPositions] = useState<OaPositionOptionVo[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const loadOptions = async (record?: OaEmployeeVo | null) => {
    setOptionsLoading(true);
    try {
      const [userResp, employeeResp, positionResp] = await Promise.all([
        record ? Promise.resolve(null) : queryOaEmployeeUserOptions(),
        queryOaEmployeeOptions(),
        queryOaPositionOptions(),
      ]);
      setUsers(userResp?.data ?? []);
      setEmployees(employeeResp.data ?? []);
      setPositions(positionResp.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setOptionsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadOptions(editing);
  }, [open, editing]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      employmentStatus: 'ACTIVE',
      deptLeader: false,
      positionIds: [],
    });
    setOpen(true);
  };

  const openEdit = (record: OaEmployeeVo) => {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue({
      userId: record.userId,
      employeeNo: record.employeeNo ?? undefined,
      supervisorId: record.supervisorId ?? undefined,
      employmentStatus: record.employmentStatus,
      deptLeader: record.deptLeader,
      hireDate: record.hireDate ? dayjs(record.hireDate) : undefined,
      leaveDate: record.leaveDate ? dayjs(record.leaveDate) : undefined,
      positionIds: record.positions.map((position) => position.id),
    });
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const basePayload = {
        employeeNo: values.employeeNo?.trim() || undefined,
        supervisorId: values.supervisorId,
        employmentStatus: values.employmentStatus,
        deptLeader: Boolean(values.deptLeader),
        hireDate: values.hireDate?.format('YYYY-MM-DD'),
        leaveDate: values.leaveDate?.format('YYYY-MM-DD'),
        positionIds: values.positionIds ?? [],
      };
      if (editing) {
        await updateOaEmployee(editing.id, {
          ...basePayload,
          version: editing.version,
        });
        message.success('员工档案已更新');
      } else {
        await createOaEmployee({ ...basePayload, userId: values.userId });
        message.success('员工档案已创建');
      }
      setOpen(false);
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSaving(false);
    }
  };

  const columns: ProColumns<OaEmployeeVo>[] = [
    {
      title: '员工',
      key: 'keyword',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>{record.nickname}</span>
          <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
            {record.username}
          </span>
        </Space>
      ),
    },
    { title: '部门', dataIndex: 'deptName', search: false },
    { title: '工号', dataIndex: 'employeeNo', search: false },
    {
      title: '岗位',
      dataIndex: 'positions',
      search: false,
      render: (_, record) =>
        record.positions.length === 0
          ? '—'
          : record.positions.map((position) => (
              <Tag key={position.id}>{position.name}</Tag>
            )),
    },
    {
      title: '直属主管',
      dataIndex: 'supervisorName',
      search: false,
      render: (_, record) => record.supervisorName || '—',
    },
    {
      title: '在职状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        ACTIVE: { text: '在职' },
        SUSPENDED: { text: '停职' },
        RESIGNED: { text: '离职' },
      },
      render: (_, record) => {
        const meta = STATUS_META[record.employmentStatus] ?? {
          text: record.employmentStatus,
          color: 'default',
        };
        return (
          <Space size={4}>
            <Tag color={meta.color}>{meta.text}</Tag>
            {record.deptLeader ? <Tag color="blue">部门负责人</Tag> : null}
          </Space>
        );
      },
    },
    {
      title: '入职日期',
      dataIndex: 'hireDate',
      search: false,
      render: (_, record) => record.hireDate || '—',
    },
    {
      title: '操作',
      key: 'action',
      search: false,
      render: (_, record) => (
        <AccessControl permission="system:oa:employee:update">
          <Button type="link" onClick={() => openEdit(record)}>
            编辑
          </Button>
        </AccessControl>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable<OaEmployeeVo>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 1000 }}
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        toolBarRender={() => [
          <AccessControl key="create" permission="system:oa:employee:create">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新建员工
            </Button>
          </AccessControl>,
        ]}
        request={async (params) => {
          const response = await queryOaEmployees({
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
        title={editing ? `编辑员工：${editing.nickname}` : '新建员工'}
        open={open}
        width={620}
        confirmLoading={saving}
        destroyOnHidden
        onCancel={() => setOpen(false)}
        onOk={() => void handleSave()}
      >
        <Form form={form} name="oaEmployeeForm" layout="vertical">
          <Form.Item
            name="userId"
            label="后台用户"
            rules={
              editing ? [] : [{ required: true, message: '请选择后台用户' }]
            }
            extra={
              editing
                ? '员工关联的后台账号创建后不可更换'
                : '只列出尚未建立 OA 档案的启用账号'
            }
          >
            <Select
              showSearch
              disabled={Boolean(editing)}
              loading={optionsLoading}
              optionFilterProp="label"
              placeholder="选择后台用户"
              options={users.map((user) => ({
                value: user.userId,
                label: user.deptName
                  ? `${user.nickname} · ${user.deptName}`
                  : user.nickname,
              }))}
            />
          </Form.Item>
          <Form.Item name="employeeNo" label="工号">
            <Input maxLength={64} placeholder="选填，租户内唯一" />
          </Form.Item>
          <Form.Item name="supervisorId" label="直属主管">
            <Select
              allowClear
              showSearch
              loading={optionsLoading}
              optionFilterProp="label"
              placeholder="选填，必须是本租户在职员工"
              options={employees
                .filter((employee) => employee.userId !== editing?.userId)
                .map((employee) => ({
                  value: employee.userId,
                  label: employee.employeeNo
                    ? `${employee.nickname}（${employee.employeeNo}）`
                    : employee.nickname,
                }))}
            />
          </Form.Item>
          <Space size={12} align="start" style={{ width: '100%' }}>
            <Form.Item
              name="employmentStatus"
              label="在职状态"
              rules={[{ required: true, message: '请选择在职状态' }]}
            >
              <Select
                style={{ width: 160 }}
                options={[
                  { value: 'ACTIVE', label: '在职' },
                  { value: 'SUSPENDED', label: '停职' },
                  { value: 'RESIGNED', label: '离职' },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="deptLeader"
              label="部门负责人"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Space>
          <Space size={12} align="start" style={{ width: '100%' }}>
            <Form.Item name="hireDate" label="入职日期">
              <DatePicker style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="leaveDate" label="离职日期">
              <DatePicker style={{ width: 180 }} />
            </Form.Item>
          </Space>
          <Form.Item name="positionIds" label="岗位">
            <Select
              mode="multiple"
              loading={optionsLoading}
              optionFilterProp="label"
              placeholder="选择启用岗位"
              options={positions.map((position) => ({
                value: position.id,
                label: `${position.name}（${position.code}）`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default EmployeePage;
