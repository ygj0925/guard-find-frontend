/**
 * 假勤管理：月度汇总与日明细、考勤记录、排班、班次、考勤受控导入与补卡/加班/外出申请台账；
 * 一键生成补卡、加班、外出表单与流程草稿。考勤数据只来自导入与审批通过的补卡，不对接打卡设备。
 */
import {
  PlusOutlined,
  ThunderboltOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  message,
  Popconfirm,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  TimePicker,
  Typography,
  Upload,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import { useAccess } from '@/hooks/useAccess';
import {
  commitOaAttendanceImport,
  createOaAttendanceTemplate,
  createOaShift,
  type OaAttendanceDailyVo,
  type OaAttendanceImportVo,
  type OaAttendanceRecordVo,
  type OaAttendanceRequestVo,
  type OaAttendanceSummaryVo,
  type OaScheduleVo,
  type OaShiftVo,
  previewOaAttendanceImport,
  queryOaAttendanceDaily,
  queryOaAttendanceRecords,
  queryOaAttendanceRequests,
  queryOaAttendanceSummary,
  queryOaSchedules,
  queryOaShifts,
  saveOaSchedules,
  updateOaShift,
} from '@/services/web/guardfind/oa';
import {
  ATTENDANCE_LIMITS,
  formatHours,
  monthRange,
  type ParsedImport,
  parseAttendanceCsv,
  REQUEST_KIND_META,
  REQUEST_STATUS_META,
  SHIFT_STATUS_META,
  WEEKDAY_OPTIONS,
} from '@/utils/oaAttendance';
import { newRequestId } from '@/utils/oaTravel';
import {
  OaEmployeeMultiSelect,
  OaEmployeeSelect,
} from '../components/OaStaffSelects';
import {
  clockWithSource,
  DailyTable,
  dateWithWeek,
  requestColumns,
} from './components/AttendanceParts';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

type Range = [Dayjs, Dayjs];

function defaultMonthRange(): Range {
  return [dayjs().startOf('month'), dayjs()];
}

function rangeError(range: Range | null) {
  if (!range) return '请选择日期区间';
  if (range[1].diff(range[0], 'day') + 1 > ATTENDANCE_LIMITS.maxRangeDays) {
    return `日期区间不能超过 ${ATTENDANCE_LIMITS.maxRangeDays} 天`;
  }
  return null;
}

const SummaryTab: React.FC = () => {
  const [month, setMonth] = useState<Dayjs>(dayjs().startOf('month'));
  const [keyword, setKeyword] = useState('');
  const [rows, setRows] = useState<OaAttendanceSummaryVo[]>([]);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<OaAttendanceSummaryVo | null>(null);
  const [daily, setDaily] = useState<OaAttendanceDailyVo[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  const load = useCallback(async (value: Dayjs, text: string) => {
    setLoading(true);
    try {
      const response = await queryOaAttendanceSummary({
        month: value.format('YYYY-MM'),
        keyword: text.trim() || undefined,
      });
      setRows(response.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(month, keyword);
    // 关键词只在回车/搜索时生效
  }, [month, load]);

  const openDaily = async (row: OaAttendanceSummaryVo) => {
    setTarget(row);
    setDaily([]);
    setDailyLoading(true);
    try {
      const response = await queryOaAttendanceDaily({
        userId: String(row.userId),
        ...monthRange(month),
      });
      setDaily(response.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setDailyLoading(false);
    }
  };

  const count = (value: number, danger = false) =>
    value > 0 ? (
      <Typography.Text type={danger ? 'danger' : undefined}>
        {value}
      </Typography.Text>
    ) : (
      <Typography.Text type="secondary">0</Typography.Text>
    );

  return (
    <>
      <Space wrap style={{ marginBottom: 16 }}>
        <DatePicker
          picker="month"
          allowClear={false}
          aria-label="统计月份"
          value={month}
          onChange={(value) => value && setMonth(value.startOf('month'))}
        />
        <Input.Search
          allowClear
          aria-label="员工关键词"
          placeholder="姓名或账号"
          style={{ width: 220 }}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onSearch={(value) => void load(month, value)}
        />
      </Space>
      <Table<OaAttendanceSummaryVo>
        rowKey="userId"
        size="small"
        bordered
        loading={loading}
        dataSource={rows}
        aria-label="月度考勤汇总"
        scroll={{ x: 1180 }}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        locale={{ emptyText: '当月没有排班或考勤记录' }}
        columns={[
          {
            title: '员工',
            dataIndex: 'userName',
            width: 110,
            fixed: 'left',
            render: (_, row) => row.userName || row.userId,
          },
          {
            title: '工号',
            dataIndex: 'employeeNo',
            width: 90,
            render: (value?: string | null) => value || '—',
          },
          { title: '应出勤', dataIndex: 'scheduledDays', width: 76 },
          { title: '正常', dataIndex: 'normalDays', width: 66 },
          {
            title: '迟到',
            dataIndex: 'lateCount',
            width: 66,
            render: (value: number) => count(value, true),
          },
          {
            title: '早退',
            dataIndex: 'earlyCount',
            width: 66,
            render: (value: number) => count(value, true),
          },
          {
            title: '缺卡',
            dataIndex: 'missingCount',
            width: 66,
            render: (value: number) => count(value, true),
          },
          {
            title: '旷工',
            dataIndex: 'absentDays',
            width: 66,
            render: (value: number) => count(value, true),
          },
          {
            title: '请假',
            dataIndex: 'leaveDays',
            width: 66,
            render: (value: number) => count(value),
          },
          {
            title: '出差',
            dataIndex: 'travelDays',
            width: 66,
            render: (value: number) => count(value),
          },
          {
            title: '外出',
            dataIndex: 'outingCount',
            width: 66,
            render: (value: number) => count(value),
          },
          {
            title: '补卡',
            dataIndex: 'correctionCount',
            width: 66,
            render: (value: number) => count(value),
          },
          {
            title: '加班',
            dataIndex: 'overtimeHours',
            width: 90,
            render: (value: unknown) => formatHours(value),
          },
          {
            title: '操作',
            key: 'actions',
            fixed: 'right',
            width: 90,
            render: (_, row) => (
              <Button type="link" onClick={() => void openDaily(row)}>
                日明细
              </Button>
            ),
          },
        ]}
      />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        汇总按当月有排班或考勤记录的员工计算，最多 500
        人；今天及以后的缺卡记为“待打卡”不计异常。
      </Typography.Text>
      <Drawer
        title={
          target
            ? `${target.userName || target.userId} · ${month.format('YYYY 年 M 月')}考勤`
            : '考勤明细'
        }
        width={900}
        open={Boolean(target)}
        destroyOnHidden
        onClose={() => setTarget(null)}
      >
        <DailyTable rows={daily} loading={dailyLoading} />
      </Drawer>
    </>
  );
};

const RecordTab: React.FC = () => {
  const [range, setRange] = useState<Range>(defaultMonthRange);
  const [userId, setUserId] = useState<string>();
  const [page, setPage] = useState({ current: 1, size: 20 });
  const [rows, setRows] = useState<OaAttendanceRecordVo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const invalid = rangeError(range);
    if (invalid) {
      message.error(invalid);
      return;
    }
    let active = true;
    setLoading(true);
    queryOaAttendanceRecords({
      page: page.current,
      size: page.size,
      start: range[0].format('YYYY-MM-DD'),
      end: range[1].format('YYYY-MM-DD'),
      userId: userId || undefined,
    })
      .then((response) => {
        if (!active) return;
        setRows(response.data?.list ?? []);
        setTotal(response.data?.total ?? 0);
      })
      .catch((error) => active && message.error(errorText(error)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [range, userId, page]);

  return (
    <>
      <Space wrap style={{ marginBottom: 16 }}>
        <DatePicker.RangePicker
          allowClear={false}
          aria-label="记录日期区间"
          value={range}
          onChange={(value) => {
            if (value?.[0] && value[1]) {
              setRange([value[0], value[1]]);
              setPage((current) => ({ ...current, current: 1 }));
            }
          }}
        />
        <OaEmployeeSelect
          allowClear
          ariaLabel="筛选员工"
          style={{ width: 240 }}
          value={userId}
          onChange={(value) => {
            setUserId(value);
            setPage((current) => ({ ...current, current: 1 }));
          }}
        />
      </Space>
      <Table<OaAttendanceRecordVo>
        rowKey="id"
        size="small"
        bordered
        loading={loading}
        dataSource={rows}
        aria-label="考勤记录"
        scroll={{ x: 820 }}
        pagination={{
          current: page.current,
          pageSize: page.size,
          total,
          showTotal: (value) => `共 ${value} 条`,
          onChange: (current, size) => setPage({ current, size }),
        }}
        locale={{ emptyText: '该区间暂无考勤记录，可在“考勤导入”中导入' }}
        columns={[
          {
            title: '日期',
            dataIndex: 'workDate',
            width: 130,
            render: (value: string) => dateWithWeek(value),
          },
          {
            title: '员工',
            dataIndex: 'userName',
            width: 110,
            render: (_, row) => row.userName || row.userId,
          },
          {
            title: '工号',
            dataIndex: 'employeeNo',
            width: 90,
            render: (value?: string | null) => value || '—',
          },
          {
            title: '上班',
            dataIndex: 'checkIn',
            width: 120,
            render: (_, row) => clockWithSource(row.checkIn, row.checkInSource),
          },
          {
            title: '下班',
            dataIndex: 'checkOut',
            width: 120,
            render: (_, row) =>
              clockWithSource(row.checkOut, row.checkOutSource),
          },
          {
            title: '导入批次',
            dataIndex: 'importId',
            width: 90,
            render: (value?: number | null) => (value ? `#${value}` : '—'),
          },
          {
            title: '更新时间',
            dataIndex: 'updateTime',
            width: 160,
            render: (value?: string | null) => value || '—',
          },
        ]}
      />
    </>
  );
};

type ScheduleFormValues = {
  userIds: string[];
  range: Range;
  weekdays: number[];
  clear: boolean;
  shiftId?: number;
};

const ScheduleTab: React.FC = () => {
  const [range, setRange] = useState<Range>(() => {
    const monday = dayjs().startOf('week').add(1, 'day');
    return [monday, monday.add(13, 'day')];
  });
  const [userId, setUserId] = useState<string>();
  const [rows, setRows] = useState<OaScheduleVo[]>([]);
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shifts, setShifts] = useState<OaShiftVo[]>([]);
  const [form] = Form.useForm<ScheduleFormValues>();
  const clear = Form.useWatch('clear', form);

  useEffect(() => {
    const invalid = rangeError(range);
    if (invalid) {
      message.error(invalid);
      return;
    }
    let active = true;
    setLoading(true);
    queryOaSchedules({
      start: range[0].format('YYYY-MM-DD'),
      end: range[1].format('YYYY-MM-DD'),
      userId: userId || undefined,
    })
      .then((response) => active && setRows(response.data ?? []))
      .catch((error) => active && message.error(errorText(error)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [range, userId, reload]);

  const openForm = async () => {
    form.resetFields();
    form.setFieldsValue({
      range,
      weekdays: [1, 2, 3, 4, 5],
      clear: false,
      userIds: userId ? [userId] : [],
    });
    setOpen(true);
    try {
      const response = await queryOaShifts('ENABLED');
      setShifts(response.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    }
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const invalid = rangeError(values.range);
    if (invalid) {
      message.error(invalid);
      return;
    }
    setSaving(true);
    try {
      const response = await saveOaSchedules({
        userIds: values.userIds.map(String),
        startDate: values.range[0].format('YYYY-MM-DD'),
        endDate: values.range[1].format('YYYY-MM-DD'),
        weekdays: values.weekdays,
        shiftId: values.clear ? undefined : values.shiftId,
        clear: values.clear,
      });
      message.success(
        values.clear
          ? `已设为休息 ${response.data} 天次`
          : `已排班 ${response.data} 天次`,
      );
      setOpen(false);
      setReload((value) => value + 1);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Space wrap style={{ marginBottom: 16 }}>
        <DatePicker.RangePicker
          allowClear={false}
          aria-label="排班日期区间"
          value={range}
          onChange={(value) =>
            value?.[0] && value[1] && setRange([value[0], value[1]])
          }
        />
        <OaEmployeeSelect
          allowClear
          ariaLabel="筛选排班员工"
          style={{ width: 240 }}
          value={userId}
          onChange={setUserId}
        />
        <AccessControl permission="system:oa:attendance:manage">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => void openForm()}
          >
            批量排班
          </Button>
        </AccessControl>
      </Space>
      <Table<OaScheduleVo>
        rowKey={(row) => `${row.userId}@${row.workDate}`}
        size="small"
        bordered
        loading={loading}
        dataSource={rows}
        aria-label="排班"
        pagination={{ pageSize: 31, showSizeChanger: false }}
        locale={{ emptyText: '该区间暂无排班' }}
        columns={[
          {
            title: '日期',
            dataIndex: 'workDate',
            width: 140,
            render: (value: string) => dateWithWeek(value),
          },
          {
            title: '员工',
            dataIndex: 'userName',
            width: 120,
            render: (_, row) => row.userName || row.userId,
          },
          {
            title: '班次',
            dataIndex: 'shiftName',
            render: (_, row) =>
              row.shiftId ? (
                `${row.shiftName}（${row.startTime}-${row.endTime}）`
              ) : (
                <Tag>休息</Tag>
              ),
          },
        ]}
      />
      <Modal
        title="批量排班"
        open={open}
        width={560}
        confirmLoading={saving}
        okText="保存排班"
        destroyOnHidden
        onCancel={() => setOpen(false)}
        onOk={() => void handleSave()}
      >
        <Form form={form} name="oaScheduleForm" layout="vertical">
          <Form.Item
            name="userIds"
            label="员工"
            rules={[{ required: true, message: '请选择员工' }]}
          >
            <OaEmployeeMultiSelect ariaLabel="排班员工" maxCount={200} />
          </Form.Item>
          <Form.Item
            name="range"
            label="日期区间"
            extra={`单次最多 ${ATTENDANCE_LIMITS.maxRangeDays} 天`}
            rules={[{ required: true, message: '请选择日期区间' }]}
          >
            <DatePicker.RangePicker aria-label="排班区间" />
          </Form.Item>
          <Form.Item
            name="weekdays"
            label="适用星期"
            extra="不勾选表示区间内每天"
          >
            <Checkbox.Group options={WEEKDAY_OPTIONS} />
          </Form.Item>
          <Form.Item name="clear" label="设为休息" valuePropName="checked">
            <Switch aria-label="设为休息" />
          </Form.Item>
          {clear ? null : (
            <Form.Item
              name="shiftId"
              label="班次"
              rules={[{ required: true, message: '请选择班次' }]}
            >
              <Select
                aria-label="班次"
                placeholder="选择启用的班次"
                notFoundContent="暂无启用班次，请先在“班次”中新增"
                options={shifts.map((shift) => ({
                  value: shift.id,
                  label: `${shift.name}（${shift.startTime}-${shift.endTime}）`,
                }))}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};

type ShiftFormValues = {
  code: string;
  name: string;
  time: [Dayjs, Dayjs];
  graceMinutes: number;
  enabled: boolean;
  remark?: string;
};

const ShiftTab: React.FC = () => {
  const [rows, setRows] = useState<OaShiftVo[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<OaShiftVo | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<ShiftFormValues>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await queryOaShifts();
      setRows(response.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openForm = (shift: OaShiftVo | 'new') => {
    form.resetFields();
    if (shift === 'new') {
      form.setFieldsValue({
        time: [dayjs('09:00', 'HH:mm'), dayjs('18:00', 'HH:mm')],
        graceMinutes: 0,
        enabled: true,
      });
    } else {
      form.setFieldsValue({
        code: shift.code,
        name: shift.name,
        time: [dayjs(shift.startTime, 'HH:mm'), dayjs(shift.endTime, 'HH:mm')],
        graceMinutes: shift.graceMinutes,
        enabled: shift.status === 'ENABLED',
        remark: shift.remark ?? undefined,
      });
    }
    setEditing(shift);
  };

  const handleSave = async () => {
    if (!editing) return;
    const values = await form.validateFields();
    const payload = {
      name: values.name.trim(),
      startTime: values.time[0].format('HH:mm'),
      endTime: values.time[1].format('HH:mm'),
      graceMinutes: values.graceMinutes ?? 0,
      status: values.enabled ? ('ENABLED' as const) : ('DISABLED' as const),
      remark: values.remark?.trim() || undefined,
    };
    setSaving(true);
    try {
      if (editing === 'new') {
        await createOaShift({ ...payload, code: values.code.trim() });
        message.success('班次已新增');
      } else {
        await updateOaShift(editing.id, {
          ...payload,
          version: editing.version,
        });
        message.success('班次已保存');
      }
      setEditing(null);
      void load();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AccessControl permission="system:oa:attendance:manage">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ marginBottom: 16 }}
          onClick={() => openForm('new')}
        >
          新增班次
        </Button>
      </AccessControl>
      <Table<OaShiftVo>
        rowKey="id"
        size="small"
        bordered
        loading={loading}
        dataSource={rows}
        aria-label="班次"
        pagination={false}
        locale={{ emptyText: '暂无班次' }}
        columns={[
          { title: '编码', dataIndex: 'code', width: 120 },
          { title: '名称', dataIndex: 'name', width: 140 },
          {
            title: '时间',
            key: 'time',
            width: 130,
            render: (_, row) => `${row.startTime}-${row.endTime}`,
          },
          {
            title: '迟到宽限',
            dataIndex: 'graceMinutes',
            width: 90,
            render: (value: number) => `${value} 分钟`,
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 80,
            render: (value: string) => {
              const meta = SHIFT_STATUS_META[value];
              return <Tag color={meta?.color}>{meta?.text ?? value}</Tag>;
            },
          },
          {
            title: '说明',
            dataIndex: 'remark',
            ellipsis: true,
            render: (value?: string | null) => value || '—',
          },
          {
            title: '操作',
            key: 'actions',
            width: 80,
            render: (_, row) => (
              <AccessControl permission="system:oa:attendance:manage">
                <Button type="link" onClick={() => openForm(row)}>
                  编辑
                </Button>
              </AccessControl>
            ),
          },
        ]}
      />
      <Modal
        title={editing === 'new' ? '新增班次' : '编辑班次'}
        open={Boolean(editing)}
        width={520}
        confirmLoading={saving}
        okText="保存"
        destroyOnHidden
        onCancel={() => setEditing(null)}
        onOk={() => void handleSave()}
      >
        <Form form={form} name="oaShiftForm" layout="vertical">
          <Form.Item
            name="code"
            label="班次编码"
            extra={editing === 'new' ? '字母开头，保存后不可修改' : undefined}
            normalize={(value?: string) => value?.replace(/\s/g, '')}
            rules={[
              { required: true, message: '请输入班次编码' },
              {
                pattern: /^[A-Za-z][A-Za-z0-9_]{0,31}$/,
                message: '只能包含字母、数字和下划线，且以字母开头',
              },
            ]}
          >
            <Input
              aria-label="班次编码"
              maxLength={32}
              disabled={editing !== 'new'}
            />
          </Form.Item>
          <Form.Item
            name="name"
            label="班次名称"
            rules={[
              { required: true, whitespace: true, message: '请输入班次名称' },
            ]}
          >
            <Input aria-label="班次名称" maxLength={64} />
          </Form.Item>
          <Form.Item
            name="time"
            label="上下班时间"
            extra="暂不支持跨天班次，下班时间必须晚于上班时间"
            rules={[
              { required: true, message: '请选择上下班时间' },
              {
                validator: (_, value?: [Dayjs, Dayjs]) =>
                  !value || value[1].isAfter(value[0])
                    ? Promise.resolve()
                    : Promise.reject(new Error('下班时间必须晚于上班时间')),
              },
            ]}
          >
            <TimePicker.RangePicker
              format="HH:mm"
              order={false}
              aria-label="上下班时间"
            />
          </Form.Item>
          <Space size={24} align="start">
            <Form.Item name="graceMinutes" label="迟到宽限（分钟）">
              <InputNumber
                min={0}
                max={120}
                precision={0}
                aria-label="迟到宽限"
              />
            </Form.Item>
            <Form.Item name="enabled" label="启用" valuePropName="checked">
              <Switch aria-label="启用班次" />
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

const IMPORT_SAMPLE = '工号,日期,上班,下班\nE001,2026-11-02,08:58,18:05';

const ImportTab: React.FC = () => {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string>();
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [preview, setPreview] = useState<OaAttendanceImportVo | null>(null);
  const [result, setResult] = useState<OaAttendanceImportVo | null>(null);
  const [busy, setBusy] = useState<'preview' | 'commit' | null>(null);
  const requestIdRef = useRef('');

  const reset = (next: string, name?: string) => {
    setText(next);
    setFileName(name);
    setParsed(null);
    setPreview(null);
    setResult(null);
  };

  const handlePreview = async () => {
    const next = parseAttendanceCsv(text);
    if (!next.rows.length) {
      message.error('没有可导入的数据行');
      return;
    }
    requestIdRef.current = newRequestId('att-import');
    setParsed(next);
    setResult(null);
    setBusy('preview');
    try {
      const response = await previewOaAttendanceImport({
        fileName,
        rows: next.rows,
      });
      setPreview(response.data);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setBusy(null);
    }
  };

  const handleCommit = async () => {
    if (!parsed) return;
    setBusy('commit');
    try {
      const response = await commitOaAttendanceImport({
        requestId: requestIdRef.current,
        fileName,
        rows: parsed.rows,
      });
      if (response.data.valid) {
        setResult(response.data);
        setPreview(null);
        message.success(
          response.data.replayed ? '该批次已导入过，未重复写入' : '导入完成',
        );
      } else {
        setPreview(response.data);
      }
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="导入格式"
        description={
          <div>
            每行四列：工号、日期（YYYY-MM-DD）、上班时间、下班时间（HH:mm，可只填一个），逗号或制表符分隔，首行表头可选。
            只能导入今天及之前 90
            天内的记录；任一行有错整批不导入；已通过补卡写入的一侧不会被导入覆盖。单次最多{' '}
            {ATTENDANCE_LIMITS.maxImportRows} 行。
          </div>
        }
      />
      <Space wrap>
        <Upload
          accept=".csv,.txt"
          showUploadList={false}
          beforeUpload={(file) => {
            void file.text().then((content) => reset(content, file.name));
            return false;
          }}
        >
          <Button icon={<UploadOutlined />}>选择 CSV 文件</Button>
        </Upload>
        {fileName ? <Typography.Text>{fileName}</Typography.Text> : null}
      </Space>
      <Input.TextArea
        aria-label="考勤数据"
        rows={8}
        placeholder={IMPORT_SAMPLE}
        value={text}
        onChange={(event) => reset(event.target.value, fileName)}
      />
      <Space>
        <Button
          loading={busy === 'preview'}
          disabled={!text.trim() || busy === 'commit'}
          onClick={() => void handlePreview()}
        >
          解析并预览
        </Button>
        <Popconfirm
          title="确认导入？"
          description="导入后按工号与日期覆盖已有打卡（补卡结果除外）。"
          okText="导入"
          cancelText="取消"
          disabled={!preview?.valid}
          onConfirm={() => handleCommit()}
        >
          <Button
            type="primary"
            loading={busy === 'commit'}
            disabled={!preview?.valid || busy === 'preview'}
          >
            确认导入
          </Button>
        </Popconfirm>
      </Space>
      {parsed?.truncated ? (
        <Alert
          type="warning"
          showIcon
          message={`超过 ${ATTENDANCE_LIMITS.maxImportRows} 行，只取前 ${ATTENDANCE_LIMITS.maxImportRows} 行，请分批导入`}
        />
      ) : null}
      {preview && !preview.valid ? (
        <Alert
          type="error"
          showIcon
          message={`校验未通过（${preview.errors.length} 处），整批未导入`}
          description={
            <List
              size="small"
              dataSource={preview.errors}
              renderItem={(item) => <List.Item>{item}</List.Item>}
            />
          }
        />
      ) : null}
      {preview?.valid ? (
        <Alert
          type="success"
          showIcon
          message="校验通过，确认后写入"
          description={
            <Descriptions size="small" column={4}>
              <Descriptions.Item label="行数">
                {preview.totalRows}
              </Descriptions.Item>
              <Descriptions.Item label="新增">
                {preview.insertedRows}
              </Descriptions.Item>
              <Descriptions.Item label="更新">
                {preview.updatedRows}
              </Descriptions.Item>
              <Descriptions.Item label="保留补卡">
                {preview.keptCorrections}
              </Descriptions.Item>
            </Descriptions>
          }
        />
      ) : null}
      {result ? (
        <Space size={32} wrap aria-label="导入结果">
          <Statistic title="导入批次" value={`#${result.importId ?? '—'}`} />
          <Statistic title="新增记录" value={result.insertedRows} />
          <Statistic title="更新记录" value={result.updatedRows} />
          <Statistic title="保留补卡" value={result.keptCorrections} />
        </Space>
      ) : null}
    </Space>
  );
};

const KIND_OPTIONS = Object.entries(REQUEST_KIND_META).map(([value, item]) => ({
  value,
  label: item.text,
}));

const STATUS_OPTIONS = Object.entries(REQUEST_STATUS_META).map(
  ([value, item]) => ({ value, label: item.text }),
);

const RequestTab: React.FC = () => {
  const [filter, setFilter] = useState<{
    kind?: string;
    status?: string;
    keyword?: string;
  }>({});
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState({ current: 1, size: 10 });
  const [rows, setRows] = useState<OaAttendanceRequestVo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    queryOaAttendanceRequests({
      page: page.current,
      size: page.size,
      ...filter,
    })
      .then((response) => {
        if (!active) return;
        setRows(response.data?.list ?? []);
        setTotal(response.data?.total ?? 0);
      })
      .catch((error) => active && message.error(errorText(error)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [filter, page]);

  const update = (next: Partial<typeof filter>) => {
    setFilter((current) => ({ ...current, ...next }));
    setPage((current) => ({ ...current, current: 1 }));
  };

  return (
    <>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          allowClear
          aria-label="申请类型"
          placeholder="全部类型"
          style={{ width: 120 }}
          options={KIND_OPTIONS}
          value={filter.kind}
          onChange={(kind) => update({ kind })}
        />
        <Select
          allowClear
          aria-label="单据状态"
          placeholder="全部状态"
          style={{ width: 120 }}
          options={STATUS_OPTIONS}
          value={filter.status}
          onChange={(status) => update({ status })}
        />
        <Input.Search
          allowClear
          aria-label="申请关键词"
          placeholder="申请标题或申请人"
          style={{ width: 220 }}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onSearch={(value) => update({ keyword: value.trim() || undefined })}
        />
      </Space>
      <Table<OaAttendanceRequestVo>
        rowKey="id"
        size="small"
        bordered
        loading={loading}
        dataSource={rows}
        aria-label="假勤申请台账"
        scroll={{ x: 1150 }}
        pagination={{
          current: page.current,
          pageSize: page.size,
          total,
          showTotal: (value) => `共 ${value} 条`,
          onChange: (current, size) => setPage({ current, size }),
        }}
        locale={{ emptyText: '暂无补卡、加班或外出申请' }}
        columns={requestColumns({ showApplicant: true })}
      />
    </>
  );
};

const AttendanceManagePage: React.FC = () => {
  const { hasPermission } = useAccess();
  const [templating, setTemplating] = useState(false);

  const handleTemplate = async () => {
    setTemplating(true);
    try {
      const response = await createOaAttendanceTemplate();
      message.success(
        `已生成补卡、加班、外出流程草稿 ${response.data.correctionModelKey}、${response.data.overtimeModelKey}、${response.data.outingModelKey}`,
      );
      history.push(`/oa/process/design?id=${response.data.correctionModelId}`);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setTemplating(false);
    }
  };

  const items = [
    { key: 'summary', label: '月度汇总', children: <SummaryTab /> },
    { key: 'records', label: '考勤记录', children: <RecordTab /> },
    { key: 'schedules', label: '排班', children: <ScheduleTab /> },
    { key: 'shifts', label: '班次', children: <ShiftTab /> },
    ...(hasPermission('system:oa:attendance:import')
      ? [{ key: 'import', label: '考勤导入', children: <ImportTab /> }]
      : []),
    { key: 'requests', label: '申请台账', children: <RequestTab /> },
  ];

  return (
    <PageContainer
      header={{ title: '假勤管理' }}
      extra={[
        <AccessControl key="template" permission="system:oa:attendance:manage">
          <Popconfirm
            title="生成假勤模板？"
            description={
              <div style={{ maxWidth: 360 }}>
                生成并发布“补卡申请”“加班申请”“外出申请”三张表单，并创建对应流程草稿：直属上级审批后由
                HR 岗位审核。三个流程都需选择表单版本后发布。
              </div>
            }
            okText="生成"
            cancelText="取消"
            onConfirm={() => handleTemplate()}
          >
            <Button icon={<ThunderboltOutlined />} loading={templating}>
              生成假勤模板
            </Button>
          </Popconfirm>
        </AccessControl>,
      ]}
    >
      <Tabs destroyOnHidden items={items} />
    </PageContainer>
  );
};

export default AttendanceManagePage;
