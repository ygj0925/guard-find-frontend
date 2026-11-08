/**
 * 假期管理：假期类型、工作日历、年度余额发放与台账；一键生成请假表单与流程草稿。
 * 余额只能通过发放/调整与审批流转变化，台账逐笔留痕。
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
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  createOaLeaveTemplate,
  createOaLeaveType,
  deleteOaWorkCalendar,
  grantOaLeaveBalance,
  type OaLeaveBalanceVo,
  type OaLeaveLedgerVo,
  type OaLeaveTypeVo,
  type OaWorkCalendarVo,
  type OaWorkDayType,
  queryOaLeaveBalances,
  queryOaLeaveLedger,
  queryOaLeaveTypes,
  queryOaWorkCalendar,
  saveOaWorkCalendar,
  updateOaLeaveType,
} from '@/services/web/guardfind/oa';
import { formatDays, LEDGER_ACTION_META } from '@/utils/oaLeave';
import { OaEmployeeSelect } from '../components/OaStaffSelects';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

type TypeFormValues = {
  code: string;
  name: string;
  balanceRequired: boolean;
  maxDaysPerRequest?: number | null;
  enabled: boolean;
  sort: number;
  remark?: string;
};

const LeaveTypeTab: React.FC<{
  types: OaLeaveTypeVo[];
  loading: boolean;
  reload: () => void;
}> = ({ types, loading, reload }) => {
  const [form] = Form.useForm<TypeFormValues>();
  const [editing, setEditing] = useState<OaLeaveTypeVo | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ balanceRequired: true, enabled: true, sort: 0 });
    setOpen(true);
  };

  const openEdit = (record: OaLeaveTypeVo) => {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      balanceRequired: record.balanceRequired,
      maxDaysPerRequest:
        record.maxDaysPerRequest == null
          ? null
          : Number(record.maxDaysPerRequest),
      enabled: record.status === 'ENABLED',
      sort: record.sort,
      remark: record.remark ?? undefined,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        balanceRequired: values.balanceRequired,
        maxDaysPerRequest: values.maxDaysPerRequest ?? null,
        status: values.enabled ? ('ENABLED' as const) : ('DISABLED' as const),
        sort: values.sort ?? 0,
        remark: values.remark?.trim() || undefined,
      };
      if (editing) {
        await updateOaLeaveType(editing.id, {
          ...payload,
          version: editing.version,
        });
        message.success('假期类型已更新');
      } else {
        await createOaLeaveType({ ...payload, code: values.code.trim() });
        message.success('假期类型已创建');
      }
      setOpen(false);
      reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <AccessControl permission="system:oa:leave:manage">
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建假期类型
          </Button>
        </AccessControl>
      </Space>
      <Table<OaLeaveTypeVo>
        rowKey="id"
        loading={loading}
        dataSource={types}
        pagination={false}
        scroll={{ x: 900 }}
        columns={[
          { title: '编码', dataIndex: 'code', width: 120 },
          { title: '名称', dataIndex: 'name', width: 120 },
          {
            title: '扣减余额',
            dataIndex: 'balanceRequired',
            width: 100,
            render: (value: boolean) =>
              value ? <Tag color="blue">扣减</Tag> : <Tag>仅记录</Tag>,
          },
          {
            title: '单次上限',
            dataIndex: 'maxDaysPerRequest',
            width: 100,
            render: (value: OaLeaveTypeVo['maxDaysPerRequest']) =>
              value == null ? '不限' : `${formatDays(value)} 天`,
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 90,
            render: (value: string) => (
              <Tag color={value === 'ENABLED' ? 'green' : 'red'}>
                {value === 'ENABLED' ? '启用' : '停用'}
              </Tag>
            ),
          },
          { title: '排序', dataIndex: 'sort', width: 70 },
          {
            title: '说明',
            dataIndex: 'remark',
            ellipsis: true,
            render: (value?: string | null) => value || '—',
          },
          {
            title: '操作',
            key: 'action',
            width: 90,
            fixed: 'right',
            render: (_, record) => (
              <AccessControl permission="system:oa:leave:manage">
                <Button type="link" onClick={() => openEdit(record)}>
                  编辑
                </Button>
              </AccessControl>
            ),
          },
        ]}
      />
      <Modal
        title={editing ? `编辑假期类型：${editing.name}` : '新建假期类型'}
        open={open}
        width={520}
        confirmLoading={saving}
        destroyOnHidden
        onCancel={() => setOpen(false)}
        onOk={() => void handleSave()}
      >
        <Form form={form} name="oaLeaveTypeForm" layout="vertical">
          <Form.Item
            name="code"
            label="类型编码"
            extra={
              editing
                ? '编码已写入请假表单选项，创建后不可修改'
                : '写入请假表单 leaveType 选项值，如 ANNUAL'
            }
            rules={[
              { required: true, message: '请输入类型编码' },
              {
                pattern: /^[A-Za-z][A-Za-z0-9_]*$/,
                transform: (value: string) => value?.trim(),
                message: '只能包含字母、数字和下划线，且以字母开头',
              },
            ]}
          >
            <Input maxLength={32} disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item
            name="name"
            label="类型名称"
            rules={[{ required: true, message: '请输入类型名称' }]}
          >
            <Input maxLength={64} placeholder="如 年假" />
          </Form.Item>
          <Space size={24} align="start" wrap>
            <Form.Item
              name="balanceRequired"
              label="扣减余额"
              valuePropName="checked"
              extra="关闭后只记录请假单，不校验额度"
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="maxDaysPerRequest"
              label="单次最多天数"
              extra="留空表示不限"
            >
              <InputNumber min={0.5} max={366} step={0.5} precision={1} />
            </Form.Item>
            <Form.Item name="sort" label="排序">
              <InputNumber min={0} max={9999} precision={0} />
            </Form.Item>
            <Form.Item name="enabled" label="启用" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item name="remark" label="说明">
            <Input.TextArea rows={2} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

type CalendarFormValues = {
  calendarDate: Dayjs;
  dayType: OaWorkDayType;
  name?: string;
};

const WorkCalendarTab: React.FC = () => {
  const [year, setYear] = useState(dayjs().year());
  const [days, setDays] = useState<OaWorkCalendarVo[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<CalendarFormValues>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await queryOaWorkCalendar(year);
      setDays(response.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await saveOaWorkCalendar({
        calendarDate: values.calendarDate.format('YYYY-MM-DD'),
        dayType: values.dayType,
        name: values.name?.trim() || undefined,
      });
      message.success('日历已保存');
      setOpen(false);
      void load();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (date: string) => {
    try {
      await deleteOaWorkCalendar(date);
      message.success('已恢复为默认（周一至周五上班）');
      void load();
    } catch (error) {
      message.error(errorText(error));
    }
  };

  return (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="未登记的日期按周一至周五上班、周末休息计算；在此登记法定节假日与调休上班日。修改日历只影响之后提交的请假单。"
      />
      <Space style={{ marginBottom: 16 }} wrap>
        <DatePicker
          picker="year"
          allowClear={false}
          aria-label="日历年度"
          value={dayjs().year(year)}
          onChange={(value) => value && setYear(value.year())}
        />
        <AccessControl permission="system:oa:leave:manage">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              form.setFieldsValue({ dayType: 'HOLIDAY' });
              setOpen(true);
            }}
          >
            登记日期
          </Button>
        </AccessControl>
      </Space>
      <Table<OaWorkCalendarVo>
        rowKey="id"
        loading={loading}
        dataSource={days}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        columns={[
          {
            title: '日期',
            dataIndex: 'calendarDate',
            render: (value: string) =>
              `${value}（${'日一二三四五六'[dayjs(value).day()]}）`,
          },
          {
            title: '类型',
            dataIndex: 'dayType',
            render: (value: OaWorkDayType) =>
              value === 'HOLIDAY' ? (
                <Tag color="orange">休息</Tag>
              ) : (
                <Tag color="green">上班</Tag>
              ),
          },
          {
            title: '名称',
            dataIndex: 'name',
            render: (value?: string | null) => value || '—',
          },
          {
            title: '操作',
            key: 'action',
            width: 100,
            render: (_, record) => (
              <AccessControl permission="system:oa:leave:manage">
                <Popconfirm
                  title="删除该登记？"
                  description="删除后按默认周规则计算。"
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => void handleDelete(record.calendarDate)}
                >
                  <Button type="link" danger>
                    删除
                  </Button>
                </Popconfirm>
              </AccessControl>
            ),
          },
        ]}
      />
      <Modal
        title="登记日历日期"
        open={open}
        confirmLoading={saving}
        destroyOnHidden
        onCancel={() => setOpen(false)}
        onOk={() => void handleSave()}
      >
        <Form form={form} name="oaWorkCalendarForm" layout="vertical">
          <Form.Item
            name="calendarDate"
            label="日期"
            extra="已登记的日期会被覆盖"
            rules={[{ required: true, message: '请选择日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="dayType" label="类型" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'HOLIDAY', label: '休息（节假日）' },
                { value: 'WORKDAY', label: '上班（调休）' },
              ]}
            />
          </Form.Item>
          <Form.Item name="name" label="名称">
            <Input maxLength={64} placeholder="如 国庆节" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

type GrantFormValues = {
  userId: string;
  leaveTypeId: number;
  periodYear: Dayjs;
  days: number;
  remark?: string;
};

const BalanceTab: React.FC<{ types: OaLeaveTypeVo[] }> = ({ types }) => {
  const actionRef = useRef<ActionType>(null);
  const [form] = Form.useForm<GrantFormValues>();
  const [grantOpen, setGrantOpen] = useState(false);
  const [granting, setGranting] = useState(false);
  const [ledgerTarget, setLedgerTarget] = useState<OaLeaveBalanceVo | null>(
    null,
  );
  const [ledger, setLedger] = useState<OaLeaveLedgerVo[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const balanceTypes = types.filter((type) => type.balanceRequired);

  const openGrant = (record?: OaLeaveBalanceVo) => {
    form.resetFields();
    form.setFieldsValue(
      record
        ? {
            userId: String(record.userId),
            leaveTypeId: record.leaveTypeId,
            periodYear: dayjs().year(record.periodYear),
          }
        : { periodYear: dayjs() },
    );
    setGrantOpen(true);
  };

  const handleGrant = async () => {
    const values = await form.validateFields();
    setGranting(true);
    try {
      await grantOaLeaveBalance({
        userId: String(values.userId),
        leaveTypeId: values.leaveTypeId,
        periodYear: values.periodYear.year(),
        days: values.days,
        remark: values.remark?.trim() || undefined,
      });
      message.success(values.days > 0 ? '额度已发放' : '额度已调减');
      setGrantOpen(false);
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setGranting(false);
    }
  };

  const openLedger = async (record: OaLeaveBalanceVo) => {
    setLedgerTarget(record);
    setLedger([]);
    setLedgerLoading(true);
    try {
      const response = await queryOaLeaveLedger(record.id);
      setLedger(response.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLedgerLoading(false);
    }
  };

  const columns: ProColumns<OaLeaveBalanceVo>[] = [
    {
      title: '年度',
      dataIndex: 'periodYear',
      valueType: 'dateYear',
      width: 90,
      initialValue: dayjs(),
      render: (_, record) => record.periodYear,
    },
    {
      title: '搜索',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '姓名或账号' },
    },
    {
      title: '员工',
      dataIndex: 'userName',
      hideInSearch: true,
      width: 120,
      render: (_, record) => record.userName || `#${record.userId}`,
    },
    {
      title: '假期类型',
      dataIndex: 'leaveTypeName',
      hideInSearch: true,
      width: 100,
    },
    {
      title: '总额度',
      dataIndex: 'totalDays',
      hideInSearch: true,
      width: 90,
      render: (_, record) => formatDays(record.totalDays),
    },
    {
      title: '已扣减',
      dataIndex: 'usedDays',
      hideInSearch: true,
      width: 90,
      render: (_, record) => formatDays(record.usedDays),
    },
    {
      title: '审批中占用',
      dataIndex: 'occupiedDays',
      hideInSearch: true,
      width: 110,
      render: (_, record) => formatDays(record.occupiedDays),
    },
    {
      title: '可用',
      dataIndex: 'availableDays',
      hideInSearch: true,
      width: 90,
      render: (_, record) => (
        <Tag color={Number(record.availableDays) > 0 ? 'green' : 'default'}>
          {formatDays(record.availableDays)}
        </Tag>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      hideInSearch: true,
      width: 170,
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 140,
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => void openLedger(record)}>
            台账
          </Button>
          <AccessControl permission="system:oa:leave:manage">
            <Button type="link" onClick={() => openGrant(record)}>
              调整
            </Button>
          </AccessControl>
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable<OaLeaveBalanceVo>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 1100 }}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        toolBarRender={() => [
          <AccessControl key="grant" permission="system:oa:leave:manage">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openGrant()}
            >
              发放额度
            </Button>
          </AccessControl>,
        ]}
        request={async (params) => {
          const { current, pageSize, periodYear, keyword } = params;
          const response = await queryOaLeaveBalances({
            page: (current as number) || 1,
            size: (pageSize as number) || 10,
            year: periodYear ? dayjs(periodYear).year() : undefined,
            keyword: (keyword as string) || undefined,
          });
          return {
            data: response.data?.list ?? [],
            total: response.data?.total ?? 0,
            success: true,
          };
        }}
      />

      <Modal
        title="发放 / 调整假期额度"
        open={grantOpen}
        confirmLoading={granting}
        destroyOnHidden
        onCancel={() => setGrantOpen(false)}
        onOk={() => void handleGrant()}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="正数为发放，负数为调减；调减后总额不能低于已扣减与审批中占用之和。每次调整都会写入台账。"
        />
        <Form form={form} name="oaLeaveGrantForm" layout="vertical">
          <Form.Item
            name="userId"
            label="员工"
            rules={[{ required: true, message: '请选择员工' }]}
          >
            <OaEmployeeSelect ariaLabel="发放员工" />
          </Form.Item>
          <Space size={16} align="start" wrap>
            <Form.Item
              name="leaveTypeId"
              label="假期类型"
              rules={[{ required: true, message: '请选择假期类型' }]}
            >
              <Select
                style={{ width: 160 }}
                placeholder="仅扣减余额的类型"
                notFoundContent="暂无需要额度的假期类型"
                options={balanceTypes.map((type) => ({
                  value: type.id,
                  label:
                    type.status === 'ENABLED'
                      ? type.name
                      : `${type.name}（已停用）`,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="periodYear"
              label="年度"
              rules={[{ required: true, message: '请选择年度' }]}
            >
              <DatePicker picker="year" allowClear={false} />
            </Form.Item>
            <Form.Item
              name="days"
              label="调整天数"
              rules={[
                { required: true, message: '请输入调整天数' },
                {
                  validator: (_, value?: number) =>
                    value === undefined ||
                    value === null ||
                    (value !== 0 && Number.isInteger(value * 2))
                      ? Promise.resolve()
                      : Promise.reject(new Error('须为非 0 的 0.5 整数倍')),
                },
              ]}
            >
              <InputNumber min={-366} max={366} step={0.5} precision={1} />
            </Form.Item>
          </Space>
          <Form.Item name="remark" label="说明">
            <Input.TextArea
              rows={2}
              maxLength={500}
              showCount
              placeholder="如 2026 年度年假发放"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={
          ledgerTarget
            ? `台账：${ledgerTarget.userName || ledgerTarget.userId} · ${ledgerTarget.periodYear} ${ledgerTarget.leaveTypeName}`
            : '台账'
        }
        width={760}
        open={Boolean(ledgerTarget)}
        onClose={() => setLedgerTarget(null)}
        destroyOnHidden
      >
        <Table<OaLeaveLedgerVo>
          rowKey="id"
          size="small"
          loading={ledgerLoading}
          dataSource={ledger}
          pagination={false}
          scroll={{ x: 700 }}
          columns={[
            { title: '时间', dataIndex: 'createTime', width: 160 },
            {
              title: '动作',
              dataIndex: 'action',
              width: 90,
              render: (value: string) => {
                const meta = LEDGER_ACTION_META[value] ?? {
                  text: value,
                  color: 'default',
                };
                return <Tag color={meta.color}>{meta.text}</Tag>;
              },
            },
            {
              title: '天数',
              dataIndex: 'days',
              width: 70,
              render: (value: OaLeaveLedgerVo['days']) => formatDays(value),
            },
            {
              title: '变更后 总/扣/占',
              key: 'after',
              width: 130,
              render: (_, record) =>
                `${formatDays(record.totalAfter)} / ${formatDays(record.usedAfter)} / ${formatDays(record.occupiedAfter)}`,
            },
            {
              title: '申请',
              dataIndex: 'applicationId',
              width: 90,
              render: (value?: number | null) => (value ? `#${value}` : '—'),
            },
            {
              title: '操作人',
              dataIndex: 'operatorName',
              width: 100,
              render: (value: string | null | undefined, record) =>
                value || `#${record.operatorId}`,
            },
            {
              title: '说明',
              dataIndex: 'remark',
              ellipsis: true,
              render: (value?: string | null) => value || '—',
            },
          ]}
        />
      </Drawer>
    </>
  );
};

const LeaveManagePage: React.FC = () => {
  const [types, setTypes] = useState<OaLeaveTypeVo[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [templating, setTemplating] = useState(false);

  const loadTypes = useCallback(async () => {
    setTypesLoading(true);
    try {
      const response = await queryOaLeaveTypes(false);
      setTypes(response.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setTypesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTypes();
  }, [loadTypes]);

  const handleTemplate = async () => {
    setTemplating(true);
    try {
      const response = await createOaLeaveTemplate();
      message.success(
        `已生成表单版本 #${response.data.formVersionId} 与流程草稿 ${response.data.modelKey}`,
      );
      void loadTypes();
      history.push(`/oa/process/design?id=${response.data.modelId}`);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setTemplating(false);
    }
  };

  return (
    <PageContainer
      header={{ title: '假期管理' }}
      extra={[
        <AccessControl key="template" permission="system:oa:leave:manage">
          <Popconfirm
            title="生成请假表单与流程草稿？"
            description={
              <div style={{ maxWidth: 360 }}>
                按启用的假期类型生成并发布“请假单”表单，并创建“请假审批”流程草稿（直属上级审批，超过
                3 天再由 HR
                岗位审批）；没有假期类型时先初始化年假、病假、事假。流程需选择该表单版本后发布。
              </div>
            }
            okText="生成"
            cancelText="取消"
            onConfirm={() => handleTemplate()}
          >
            <Button icon={<ThunderboltOutlined />} loading={templating}>
              生成请假模板
            </Button>
          </Popconfirm>
        </AccessControl>,
      ]}
    >
      <Tabs
        destroyOnHidden
        items={[
          {
            key: 'types',
            label: '假期类型',
            children: (
              <LeaveTypeTab
                types={types}
                loading={typesLoading}
                reload={() => void loadTypes()}
              />
            ),
          },
          {
            key: 'calendar',
            label: '工作日历',
            children: <WorkCalendarTab />,
          },
          {
            key: 'balances',
            label: '余额与台账',
            children: <BalanceTab types={types} />,
          },
        ]}
      />
    </PageContainer>
  );
};

export default LeaveManagePage;
