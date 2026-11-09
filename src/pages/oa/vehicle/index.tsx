/**
 * 车辆管理：车辆与司机档案、维保登记（维保期间不可派车）、用车调度（派车→出车→归还，按请求号幂等）；一键生成用车申请表单与流程草稿。
 */
import { PlusOutlined, ThunderboltOutlined } from '@ant-design/icons';
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
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import { useAccess } from '@/hooks/useAccess';
import {
  cancelOaVehicleRequest,
  completeOaVehicleMaintenance,
  createOaDriver,
  createOaVehicle,
  createOaVehicleMaintenance,
  createOaVehicleTemplate,
  departOaVehicleRequest,
  dispatchOaVehicleRequest,
  type OaDriverVo,
  type OaResourceStatus,
  type OaVehicleCandidatesVo,
  type OaVehicleMaintenanceVo,
  type OaVehicleMaintType,
  type OaVehicleRequestVo,
  type OaVehicleVo,
  queryOaDrivers,
  queryOaVehicleCandidates,
  queryOaVehicleMaintenances,
  queryOaVehicleRequests,
  queryOaVehicles,
  returnOaVehicleRequest,
  updateOaDriver,
  updateOaVehicle,
} from '@/services/web/guardfind/oa';
import { formatAmount } from '@/utils/oaExpense';
import {
  DATE_TIME,
  MAINT_STATUS_META,
  MAINT_TYPE_META,
  RESOURCE_STATUS_META,
  timeRange,
  VEHICLE_REQUEST_STATUS_META,
  vehicleCancellable,
} from '@/utils/oaResource';
import { newRequestId, statusValueEnum } from '@/utils/oaTravel';
import { OaEmployeeSelect } from '../components/OaStaffSelects';
import { metaTag } from '../purchase/components/PurchaseDetail';
import { VehicleRequestDetail } from './components/VehicleRequestDetail';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

const STATUS_OPTIONS = [
  { value: 'ENABLED', label: '启用' },
  { value: 'DISABLED', label: '停用' },
];

const MAINT_TYPE_OPTIONS = Object.entries(MAINT_TYPE_META).map(
  ([value, meta]) => ({ value, label: meta.text }),
);

const MANAGE = 'system:oa:vehicle:manage';
const DISPATCH = 'system:oa:vehicle:dispatch';

type VehicleValues = {
  plateNo: string;
  model: string;
  seats: number;
  mileage?: number;
  status: OaResourceStatus;
  remark?: string;
};

const VehicleTab: React.FC = () => {
  const [vehicles, setVehicles] = useState<OaVehicleVo[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<OaVehicleVo | 'new' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<VehicleValues>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await queryOaVehicles();
      setVehicles(response.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (vehicle: OaVehicleVo | 'new') => {
    form.resetFields();
    form.setFieldsValue(
      vehicle === 'new'
        ? { status: 'ENABLED', seats: 5, mileage: 0 }
        : {
            plateNo: vehicle.plateNo,
            model: vehicle.model,
            seats: vehicle.seats,
            mileage: vehicle.mileage,
            status: vehicle.status,
            remark: vehicle.remark ?? undefined,
          },
    );
    setEditing(vehicle);
  };

  const submit = async () => {
    if (!editing) return;
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    const data = {
      plateNo: values.plateNo.trim(),
      model: values.model.trim(),
      seats: values.seats,
      mileage: values.mileage ?? 0,
      status: values.status,
      remark: values.remark?.trim() || undefined,
    };
    setSubmitting(true);
    try {
      if (editing === 'new') {
        await createOaVehicle(data);
      } else {
        await updateOaVehicle(editing.id, {
          ...data,
          version: editing.version,
        });
      }
      message.success('车辆已保存');
      setEditing(null);
      await load();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <AccessControl permission={MANAGE}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openEdit('new')}
          >
            新建车辆
          </Button>
        </AccessControl>
      </Space>
      <Table<OaVehicleVo>
        rowKey="id"
        loading={loading}
        dataSource={vehicles}
        pagination={false}
        scroll={{ x: 760 }}
        aria-label="车辆档案"
        locale={{ emptyText: '暂无车辆，请先新建并启用' }}
        columns={[
          { title: '车牌号', dataIndex: 'plateNo', width: 120 },
          { title: '品牌型号', dataIndex: 'model', width: 160 },
          {
            title: '座位',
            dataIndex: 'seats',
            width: 80,
            render: (value: number) => `${value} 座`,
          },
          {
            title: '当前里程',
            dataIndex: 'mileage',
            width: 110,
            render: (value: number) => `${value} km`,
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 80,
            render: (value: string) => metaTag(RESOURCE_STATUS_META, value),
          },
          {
            title: '备注',
            dataIndex: 'remark',
            ellipsis: true,
            render: (value) => value || '—',
          },
          {
            title: '操作',
            key: 'action',
            fixed: 'right',
            width: 80,
            render: (_, record) => (
              <AccessControl permission={MANAGE}>
                <Button type="link" onClick={() => openEdit(record)}>
                  编辑
                </Button>
              </AccessControl>
            ),
          },
        ]}
      />
      <Modal
        title={
          editing === 'new'
            ? '新建车辆'
            : editing
              ? `编辑车辆：${editing.plateNo}`
              : '车辆'
        }
        open={Boolean(editing)}
        width={520}
        confirmLoading={submitting}
        okText="保存"
        destroyOnHidden
        onCancel={() => setEditing(null)}
        onOk={() => void submit()}
      >
        <Form form={form} name="oaVehicleForm" layout="vertical">
          <Form.Item
            name="plateNo"
            label="车牌号"
            rules={[
              { required: true, whitespace: true, message: '请输入车牌号' },
            ]}
          >
            <Input maxLength={20} aria-label="车牌号" />
          </Form.Item>
          <Form.Item
            name="model"
            label="品牌型号"
            rules={[
              { required: true, whitespace: true, message: '请输入品牌型号' },
            ]}
          >
            <Input maxLength={100} aria-label="品牌型号" />
          </Form.Item>
          <Form.Item
            name="seats"
            label="座位数"
            rules={[{ required: true, message: '请填写座位数' }]}
          >
            <InputNumber
              min={2}
              max={60}
              precision={0}
              style={{ width: '100%' }}
              aria-label="座位数"
            />
          </Form.Item>
          <Form.Item
            name="mileage"
            label="当前里程（km）"
            extra="出车里程不能小于当前里程，归还后自动更新"
          >
            <InputNumber
              min={0}
              max={9999999}
              precision={0}
              style={{ width: '100%' }}
              aria-label="当前里程"
            />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select aria-label="车辆状态" options={STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

type DriverValues = {
  name: string;
  phone?: string;
  userId?: string;
  status: OaResourceStatus;
  remark?: string;
};

const DriverTab: React.FC = () => {
  const [drivers, setDrivers] = useState<OaDriverVo[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<OaDriverVo | 'new' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<DriverValues>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await queryOaDrivers();
      setDrivers(response.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (driver: OaDriverVo | 'new') => {
    form.resetFields();
    form.setFieldsValue(
      driver === 'new'
        ? { status: 'ENABLED' }
        : {
            name: driver.name,
            phone: driver.phone ?? undefined,
            userId: driver.userId == null ? undefined : String(driver.userId),
            status: driver.status,
            remark: driver.remark ?? undefined,
          },
    );
    setEditing(driver);
  };

  const submit = async () => {
    if (!editing) return;
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    const data = {
      name: values.name.trim(),
      phone: values.phone?.trim() || undefined,
      userId: values.userId || undefined,
      status: values.status,
      remark: values.remark?.trim() || undefined,
    };
    setSubmitting(true);
    try {
      if (editing === 'new') {
        await createOaDriver(data);
      } else {
        await updateOaDriver(editing.id, { ...data, version: editing.version });
      }
      message.success('司机已保存');
      setEditing(null);
      await load();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <AccessControl permission={MANAGE}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openEdit('new')}
          >
            新建司机
          </Button>
        </AccessControl>
      </Space>
      <Table<OaDriverVo>
        rowKey="id"
        loading={loading}
        dataSource={drivers}
        pagination={false}
        scroll={{ x: 700 }}
        aria-label="司机档案"
        locale={{ emptyText: '暂无司机' }}
        columns={[
          { title: '姓名', dataIndex: 'name', width: 120 },
          {
            title: '电话',
            dataIndex: 'phone',
            width: 140,
            render: (value) => value || '—',
          },
          {
            title: '关联员工',
            dataIndex: 'userName',
            width: 140,
            render: (_, record) =>
              record.userName || record.userId || '未关联（无法接收通知）',
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 80,
            render: (value: string) => metaTag(RESOURCE_STATUS_META, value),
          },
          {
            title: '操作',
            key: 'action',
            fixed: 'right',
            width: 80,
            render: (_, record) => (
              <AccessControl permission={MANAGE}>
                <Button type="link" onClick={() => openEdit(record)}>
                  编辑
                </Button>
              </AccessControl>
            ),
          },
        ]}
      />
      <Modal
        title={
          editing === 'new'
            ? '新建司机'
            : editing
              ? `编辑司机：${editing.name}`
              : '司机'
        }
        open={Boolean(editing)}
        width={520}
        confirmLoading={submitting}
        okText="保存"
        destroyOnHidden
        onCancel={() => setEditing(null)}
        onOk={() => void submit()}
      >
        <Form form={form} name="oaDriverForm" layout="vertical">
          <Form.Item
            name="name"
            label="司机姓名"
            rules={[
              { required: true, whitespace: true, message: '请输入司机姓名' },
            ]}
          >
            <Input maxLength={64} aria-label="司机姓名" />
          </Form.Item>
          <Form.Item name="phone" label="联系电话">
            <Input maxLength={32} aria-label="联系电话" />
          </Form.Item>
          <Form.Item
            name="userId"
            label="关联员工"
            extra="关联后司机可收到派车与取消通知"
          >
            <OaEmployeeSelect ariaLabel="关联员工" allowClear />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select aria-label="司机状态" options={STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

type MaintValues = {
  vehicleId: number;
  maintType: OaVehicleMaintType;
  range: [Dayjs, Dayjs];
  remark?: string;
};

type CompleteValues = { cost?: number; remark?: string };

const MaintenanceTab: React.FC = () => {
  const [items, setItems] = useState<OaVehicleMaintenanceVo[]>([]);
  const [vehicles, setVehicles] = useState<OaVehicleVo[]>([]);
  const [status, setStatus] = useState<string | undefined>('ACTIVE');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [completing, setCompleting] = useState<OaVehicleMaintenanceVo | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const requestIdRef = useRef('');
  const [form] = Form.useForm<MaintValues>();
  const [completeForm] = Form.useForm<CompleteValues>();

  const load = useCallback(async (filter?: string) => {
    setLoading(true);
    try {
      const response = await queryOaVehicleMaintenances({ status: filter });
      setItems(response.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(status);
  }, [status, load]);

  useEffect(() => {
    queryOaVehicles()
      .then((response) => setVehicles(response.data ?? []))
      .catch(() => setVehicles([]));
  }, []);

  const openCreate = () => {
    requestIdRef.current = newRequestId('vehicle-maint');
    form.resetFields();
    const start = dayjs().add(1, 'hour').startOf('hour');
    form.setFieldsValue({
      maintType: 'MAINTENANCE',
      range: [start, start.add(1, 'day')],
    });
    setCreating(true);
  };

  const submitCreate = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setSubmitting(true);
    try {
      await createOaVehicleMaintenance({
        requestId: requestIdRef.current,
        vehicleId: values.vehicleId,
        maintType: values.maintType,
        startTime: values.range[0].second(0).format(DATE_TIME),
        endTime: values.range[1].second(0).format(DATE_TIME),
        remark: values.remark?.trim() || undefined,
      });
      message.success('维保已登记，期间车辆不可派车');
      setCreating(false);
      await load(status);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const submitComplete = async () => {
    if (!completing) return;
    const values = await completeForm.validateFields().catch(() => null);
    if (!values) return;
    setSubmitting(true);
    try {
      await completeOaVehicleMaintenance(completing.id, {
        cost: values.cost ?? undefined,
        remark: values.remark?.trim() || undefined,
      });
      message.success('维保已完成');
      setCompleting(null);
      await load(status);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          aria-label="维保状态"
          style={{ width: 140 }}
          allowClear
          placeholder="全部状态"
          value={status}
          options={Object.entries(MAINT_STATUS_META).map(([value, meta]) => ({
            value,
            label: meta.text,
          }))}
          onChange={(value) => setStatus(value)}
        />
        <AccessControl permission={MANAGE}>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            登记维保
          </Button>
        </AccessControl>
      </Space>
      <Table<OaVehicleMaintenanceVo>
        rowKey="id"
        loading={loading}
        dataSource={items}
        pagination={false}
        scroll={{ x: 900 }}
        aria-label="维保记录"
        locale={{ emptyText: '暂无维保记录' }}
        columns={[
          { title: '车牌号', dataIndex: 'plateNo', width: 110 },
          {
            title: '类型',
            dataIndex: 'maintType',
            width: 80,
            render: (value: string) => metaTag(MAINT_TYPE_META, value),
          },
          {
            title: '时段',
            key: 'range',
            width: 200,
            render: (_, record) => timeRange(record.startTime, record.endTime),
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 90,
            render: (value: string) => metaTag(MAINT_STATUS_META, value),
          },
          {
            title: '费用',
            dataIndex: 'cost',
            width: 100,
            render: (value) => (value == null ? '—' : formatAmount(value)),
          },
          {
            title: '备注',
            dataIndex: 'remark',
            ellipsis: true,
            render: (value) => value || '—',
          },
          {
            title: '操作',
            key: 'action',
            fixed: 'right',
            width: 90,
            render: (_, record) =>
              record.status === 'ACTIVE' ? (
                <AccessControl permission={MANAGE}>
                  <Button
                    type="link"
                    onClick={() => {
                      completeForm.resetFields();
                      setCompleting(record);
                    }}
                  >
                    完成
                  </Button>
                </AccessControl>
              ) : null,
          },
        ]}
      />
      <Modal
        title="登记维保"
        open={creating}
        width={520}
        confirmLoading={submitting}
        okText="登记"
        destroyOnHidden
        onCancel={() => setCreating(false)}
        onOk={() => void submitCreate()}
      >
        <Form form={form} name="oaVehicleMaintForm" layout="vertical">
          <Form.Item
            name="vehicleId"
            label="车辆"
            rules={[{ required: true, message: '请选择车辆' }]}
          >
            <Select
              aria-label="维保车辆"
              showSearch
              optionFilterProp="label"
              options={vehicles.map((vehicle) => ({
                value: vehicle.id,
                label: `${vehicle.plateNo} · ${vehicle.model}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="maintType"
            label="维保类型"
            rules={[{ required: true, message: '请选择维保类型' }]}
          >
            <Select aria-label="维保类型" options={MAINT_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="range"
            label="维保时段"
            rules={[
              { required: true, message: '请选择维保时段' },
              {
                validator: async (_, value?: [Dayjs, Dayjs]) => {
                  if (value && !value[1].isAfter(value[0])) {
                    throw new Error('结束时间必须晚于开始时间');
                  }
                },
              },
            ]}
          >
            <DatePicker.RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              aria-label="维保时段"
            />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={completing ? `完成维保：${completing.plateNo}` : '完成维保'}
        open={Boolean(completing)}
        width={480}
        confirmLoading={submitting}
        okText="确认完成"
        destroyOnHidden
        onCancel={() => setCompleting(null)}
        onOk={() => void submitComplete()}
      >
        <Form
          form={completeForm}
          name="oaVehicleMaintDoneForm"
          layout="vertical"
        >
          <Form.Item name="cost" label="费用（元）">
            <InputNumber
              min={0}
              max={9999999999.99}
              precision={2}
              style={{ width: '100%' }}
              aria-label="维保费用"
            />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

type DispatchValues = { vehicleId: number; driverId?: number; remark?: string };
type DepartValues = { startMileage: number };
type ReturnValues = {
  endMileage: number;
  fuelCost?: number;
  tollCost?: number;
  otherCost?: number;
  remark?: string;
};
type Action = 'dispatch' | 'depart' | 'return' | 'cancel';

const ACTION_TITLE: Record<Action, string> = {
  dispatch: '派车',
  depart: '登记出车',
  return: '登记归还',
  cancel: '取消用车',
};

const DispatchTab: React.FC = () => {
  const { hasPermission } = useAccess();
  const canDispatch = hasPermission(DISPATCH);
  const actionRef = useRef<ActionType>(null);
  const [viewing, setViewing] = useState<OaVehicleRequestVo | null>(null);
  const [acting, setActing] = useState<{
    action: Action;
    request: OaVehicleRequestVo;
  } | null>(null);
  const [candidates, setCandidates] = useState<OaVehicleCandidatesVo | null>(
    null,
  );
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const requestIdRef = useRef('');
  const [form] = Form.useForm();

  const open = async (action: Action, request: OaVehicleRequestVo) => {
    requestIdRef.current = newRequestId(`vehicle-${action}`);
    form.resetFields();
    setCandidates(null);
    setActing({ action, request });
    if (action === 'return') {
      form.setFieldsValue({ endMileage: request.startMileage ?? undefined });
    }
    if (action === 'dispatch' || action === 'depart') {
      setLoadingCandidates(true);
      try {
        if (action === 'dispatch') {
          const response = await queryOaVehicleCandidates(request.id);
          setCandidates(response.data);
        } else {
          const response = await queryOaVehicles();
          const vehicle = (response.data ?? []).find(
            (item) => item.id === request.vehicleId,
          );
          if (vehicle) form.setFieldsValue({ startMileage: vehicle.mileage });
        }
      } catch (error) {
        message.error(errorText(error));
      } finally {
        setLoadingCandidates(false);
      }
    }
  };

  const submit = async () => {
    if (!acting) return;
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    const { action, request } = acting;
    const requestId = requestIdRef.current;
    setSubmitting(true);
    try {
      if (action === 'dispatch') {
        const v = values as DispatchValues;
        await dispatchOaVehicleRequest(request.id, {
          requestId,
          vehicleId: v.vehicleId,
          driverId: v.driverId ?? undefined,
          remark: v.remark?.trim() || undefined,
        });
      } else if (action === 'depart') {
        await departOaVehicleRequest(request.id, {
          requestId,
          startMileage: (values as DepartValues).startMileage,
        });
      } else if (action === 'return') {
        const v = values as ReturnValues;
        await returnOaVehicleRequest(request.id, {
          requestId,
          endMileage: v.endMileage,
          fuelCost: v.fuelCost ?? undefined,
          tollCost: v.tollCost ?? undefined,
          otherCost: v.otherCost ?? undefined,
          remark: v.remark?.trim() || undefined,
        });
      } else {
        await cancelOaVehicleRequest(request.id, {
          reason: (values.reason as string).trim(),
        });
      }
      message.success(`${ACTION_TITLE[action]}成功`);
      setActing(null);
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ProColumns<OaVehicleRequestVo>[] = [
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 90,
      valueEnum: statusValueEnum(VEHICLE_REQUEST_STATUS_META),
      render: (_, record) =>
        metaTag(VEHICLE_REQUEST_STATUS_META, record.status),
    },
    {
      title: '申请人',
      dataIndex: 'applicantName',
      search: false,
      width: 90,
      render: (_, record) => record.applicantName || record.applicantId,
    },
    {
      title: '事由 / 目的地',
      dataIndex: 'purpose',
      search: false,
      ellipsis: true,
      width: 200,
      render: (_, record) => `${record.purpose} → ${record.destination}`,
    },
    {
      title: '用车时段',
      dataIndex: 'startTime',
      search: false,
      width: 180,
      render: (_, record) => timeRange(record.startTime, record.endTime),
    },
    {
      title: '人数',
      dataIndex: 'passengers',
      search: false,
      width: 90,
      render: (_, record) => (
        <>
          {record.passengers}
          {record.needDriver ? (
            <Tag style={{ marginLeft: 4 }}>需司机</Tag>
          ) : null}
        </>
      ),
    },
    {
      title: '车辆 / 司机',
      dataIndex: 'plateNo',
      search: false,
      width: 150,
      render: (_, record) =>
        record.plateNo
          ? `${record.plateNo}${record.driverName ? ` / ${record.driverName}` : ''}`
          : '—',
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 190,
      render: (_, record) => [
        <Button key="view" type="link" onClick={() => setViewing(record)}>
          详情
        </Button>,
        canDispatch && record.status === 'PENDING_DISPATCH' ? (
          <Button
            key="dispatch"
            type="link"
            onClick={() => void open('dispatch', record)}
          >
            派车
          </Button>
        ) : null,
        canDispatch && record.status === 'DISPATCHED' ? (
          <Button
            key="depart"
            type="link"
            onClick={() => void open('depart', record)}
          >
            出车
          </Button>
        ) : null,
        canDispatch && record.status === 'IN_USE' ? (
          <Button
            key="return"
            type="link"
            onClick={() => void open('return', record)}
          >
            归还
          </Button>
        ) : null,
        canDispatch && vehicleCancellable(record.status) ? (
          <Button
            key="cancel"
            type="link"
            danger
            onClick={() => void open('cancel', record)}
          >
            取消
          </Button>
        ) : null,
      ],
    },
  ];

  const request = acting?.request;

  return (
    <>
      <ProTable<OaVehicleRequestVo>
        headerTitle="用车调度"
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 1100 }}
        form={{ initialValues: { status: 'PENDING_DISPATCH' } }}
        request={async (params) => {
          const response = await queryOaVehicleRequests({
            page: (params.current as number) || 1,
            size: (params.pageSize as number) || 10,
            status: params.status || undefined,
          });
          return {
            data: response.data?.list ?? [],
            total: response.data?.total ?? 0,
            success: true,
          };
        }}
      />
      <Drawer
        title="用车详情"
        width={560}
        open={Boolean(viewing)}
        destroyOnHidden
        onClose={() => setViewing(null)}
      >
        {viewing ? <VehicleRequestDetail request={viewing} /> : null}
      </Drawer>
      <Modal
        title={acting ? ACTION_TITLE[acting.action] : ''}
        open={Boolean(acting)}
        width={520}
        confirmLoading={submitting}
        okText="确认"
        okButtonProps={{ danger: acting?.action === 'cancel' }}
        destroyOnHidden
        onCancel={() => setActing(null)}
        onOk={() => void submit()}
      >
        {acting && request ? (
          <Spin spinning={loadingCandidates}>
            <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="用车">
                {request.purpose} → {request.destination}
              </Descriptions.Item>
              <Descriptions.Item label="时段">
                {timeRange(request.startTime, request.endTime)}
              </Descriptions.Item>
              <Descriptions.Item label="人数">
                {request.passengers}
                {request.needDriver ? '（需司机）' : '（自驾）'}
              </Descriptions.Item>
            </Descriptions>
            <Form form={form} name="oaVehicleActionForm" layout="vertical">
              {acting.action === 'dispatch' ? (
                <>
                  {candidates && candidates.vehicles.length === 0 ? (
                    <Alert
                      type="warning"
                      showIcon
                      style={{ marginBottom: 16 }}
                      message="该时段没有座位足够且空闲的车辆"
                    />
                  ) : null}
                  <Form.Item
                    name="vehicleId"
                    label="车辆"
                    rules={[{ required: true, message: '请选择车辆' }]}
                  >
                    <Select
                      aria-label="派车车辆"
                      options={(candidates?.vehicles ?? []).map((vehicle) => ({
                        value: vehicle.id,
                        label: `${vehicle.plateNo} · ${vehicle.model} · ${vehicle.seats} 座`,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    name="driverId"
                    label="司机"
                    rules={[
                      {
                        required: request.needDriver,
                        message: '该申请需要司机，请指派司机',
                      },
                    ]}
                  >
                    <Select
                      aria-label="派车司机"
                      allowClear
                      options={(candidates?.drivers ?? []).map((driver) => ({
                        value: driver.id,
                        label: `${driver.name}${driver.phone ? ` · ${driver.phone}` : ''}`,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item name="remark" label="调度备注">
                    <Input.TextArea rows={2} maxLength={500} showCount />
                  </Form.Item>
                </>
              ) : null}
              {acting.action === 'depart' ? (
                <Form.Item
                  name="startMileage"
                  label="出车里程（km）"
                  rules={[{ required: true, message: '请填写出车里程' }]}
                >
                  <InputNumber
                    min={0}
                    max={9999999}
                    precision={0}
                    style={{ width: '100%' }}
                    aria-label="出车里程"
                  />
                </Form.Item>
              ) : null}
              {acting.action === 'return' ? (
                <>
                  <Form.Item
                    name="endMileage"
                    label="归还里程（km）"
                    rules={[
                      { required: true, message: '请填写归还里程' },
                      {
                        validator: async (_, value?: number) => {
                          if (
                            value != null &&
                            request.startMileage != null &&
                            value < request.startMileage
                          ) {
                            throw new Error(
                              `归还里程不能小于出车里程 ${request.startMileage}`,
                            );
                          }
                        },
                      },
                    ]}
                  >
                    <InputNumber
                      min={0}
                      max={9999999}
                      precision={0}
                      style={{ width: '100%' }}
                      aria-label="归还里程"
                    />
                  </Form.Item>
                  {(
                    [
                      ['fuelCost', '油费'],
                      ['tollCost', '路桥停车费'],
                      ['otherCost', '其他费用'],
                    ] as const
                  ).map(([name, label]) => (
                    <Form.Item key={name} name={name} label={`${label}（元）`}>
                      <InputNumber
                        min={0}
                        max={9999999999.99}
                        precision={2}
                        style={{ width: '100%' }}
                        aria-label={label}
                      />
                    </Form.Item>
                  ))}
                  <Form.Item name="remark" label="归还备注">
                    <Input.TextArea rows={2} maxLength={500} showCount />
                  </Form.Item>
                </>
              ) : null}
              {acting.action === 'cancel' ? (
                <Form.Item
                  name="reason"
                  label="取消原因"
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: '请填写取消原因',
                    },
                  ]}
                  extra="将通知申请人与已指派的司机"
                >
                  <Input.TextArea
                    rows={3}
                    maxLength={500}
                    showCount
                    aria-label="取消原因"
                  />
                </Form.Item>
              ) : null}
            </Form>
          </Spin>
        ) : null}
      </Modal>
    </>
  );
};

const VehicleManagePage: React.FC = () => {
  const { hasPermission } = useAccess();
  const [templating, setTemplating] = useState(false);
  const canList = hasPermission('system:oa:vehicle:list');
  const canManage = hasPermission(MANAGE);
  const canDispatch = hasPermission(DISPATCH);

  const handleTemplate = async () => {
    setTemplating(true);
    try {
      const response = await createOaVehicleTemplate();
      message.success(`已生成用车流程草稿 ${response.data.modelKey}`);
      history.push(`/oa/process/design?id=${response.data.modelId}`);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setTemplating(false);
    }
  };

  const items = [
    ...(canList || canDispatch
      ? [{ key: 'requests', label: '用车调度', children: <DispatchTab /> }]
      : []),
    ...(canList || canManage || canDispatch
      ? [
          { key: 'vehicles', label: '车辆档案', children: <VehicleTab /> },
          { key: 'drivers', label: '司机', children: <DriverTab /> },
        ]
      : []),
    ...(canList || canManage
      ? [{ key: 'maint', label: '维保', children: <MaintenanceTab /> }]
      : []),
  ];

  return (
    <PageContainer
      header={{ title: '车辆管理' }}
      extra={[
        <AccessControl key="template" permission={MANAGE}>
          <Popconfirm
            title="生成用车模板？"
            description={
              <div style={{ maxWidth: 360 }}>
                生成并发布“用车申请”表单（事由、目的地、起止时间、人数、是否需司机），并创建流程草稿：直属上级审批；通过后进入待调度。
              </div>
            }
            okText="生成"
            cancelText="取消"
            onConfirm={() => handleTemplate()}
          >
            <Button icon={<ThunderboltOutlined />} loading={templating}>
              生成用车模板
            </Button>
          </Popconfirm>
        </AccessControl>,
      ]}
    >
      <Tabs destroyOnHidden items={items} />
    </PageContainer>
  );
};

export default VehicleManagePage;
