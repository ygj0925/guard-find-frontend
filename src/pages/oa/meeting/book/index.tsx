/**
 * 会议预订：按日期查看各会议室占用，免审批会议室直接预订；需审批会议室走 OA 申请。我的预订可在会议结束前取消。
 */
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
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  bookOaMeetingRoom,
  cancelMyOaMeetingBooking,
  type OaMeetingBookingVo,
  type OaMeetingRoomVo,
  queryBookableOaMeetingRooms,
  queryMyOaMeetingBookings,
  queryOaMeetingSchedule,
} from '@/services/web/guardfind/oa';
import {
  bookingConflict,
  DATE_TIME,
  MEETING_BOOKING_STATUS_META,
  timeRange,
} from '@/utils/oaResource';
import { newRequestId, statusValueEnum } from '@/utils/oaTravel';
import { metaTag, TrackButton } from '../../purchase/components/PurchaseDetail';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

type BookValues = {
  subject: string;
  range: [Dayjs, Dayjs];
  attendees: number;
};

const ScheduleTab: React.FC = () => {
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [rooms, setRooms] = useState<OaMeetingRoomVo[]>([]);
  const [bookings, setBookings] = useState<OaMeetingBookingVo[]>([]);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<OaMeetingRoomVo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const requestIdRef = useRef('');
  const [form] = Form.useForm<BookValues>();

  const load = useCallback(async (day: Dayjs) => {
    setLoading(true);
    try {
      const [roomResponse, scheduleResponse] = await Promise.all([
        queryBookableOaMeetingRooms(),
        queryOaMeetingSchedule({ date: day.format('YYYY-MM-DD') }),
      ]);
      setRooms(roomResponse.data ?? []);
      setBookings(scheduleResponse.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(date);
  }, [date, load]);

  const openBook = (room: OaMeetingRoomVo) => {
    requestIdRef.current = newRequestId('meeting-book');
    form.resetFields();
    const base = date.isSame(dayjs(), 'day')
      ? dayjs().add(1, 'hour').startOf('hour')
      : date.hour(9).minute(0).second(0);
    form.setFieldsValue({
      range: [base, base.add(1, 'hour')],
      attendees: Math.min(room.capacity, 5),
    });
    setBooking(room);
  };

  const submit = async () => {
    if (!booking) return;
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    const [start, end] = values.range;
    const conflict = bookingConflict(bookings, booking.id, start, end);
    if (conflict) {
      message.error(
        `与「${conflict.subject}」${timeRange(conflict.startTime, conflict.endTime)} 冲突`,
      );
      return;
    }
    setSubmitting(true);
    try {
      await bookOaMeetingRoom({
        requestId: requestIdRef.current,
        roomId: booking.id,
        subject: values.subject.trim(),
        startTime: start.second(0).format(DATE_TIME),
        endTime: end.second(0).format(DATE_TIME),
        attendees: values.attendees,
      });
      message.success('预订成功');
      setBooking(null);
      await load(date);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <DatePicker
          allowClear={false}
          value={date}
          aria-label="查看日期"
          onChange={(value) => value && setDate(value)}
        />
        <Button onClick={() => setDate(dayjs())}>今天</Button>
        <Button onClick={() => void load(date)}>刷新</Button>
      </Space>
      <Table<OaMeetingRoomVo>
        rowKey="id"
        loading={loading}
        dataSource={rooms}
        pagination={false}
        scroll={{ x: 760 }}
        aria-label="会议室日程"
        locale={{ emptyText: '暂无可预订的会议室' }}
        columns={[
          {
            title: '会议室',
            key: 'room',
            width: 200,
            render: (_, room) => (
              <Space direction="vertical" size={0}>
                <span>{room.name}</span>
                <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
                  {room.capacity} 人{room.location ? ` · ${room.location}` : ''}
                </span>
              </Space>
            ),
          },
          {
            title: '当日占用',
            key: 'bookings',
            render: (_, room) => {
              const items = bookings
                .filter((item) => item.roomId === room.id)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
              if (items.length === 0) {
                return <span style={{ color: 'rgba(0,0,0,0.45)' }}>空闲</span>;
              }
              return (
                <Space size={[4, 4]} wrap>
                  {items.map((item) => (
                    <Tooltip
                      key={item.id}
                      title={`${item.subject} · ${item.bookerName || item.bookerId}`}
                    >
                      <Tag
                        color={
                          MEETING_BOOKING_STATUS_META[item.status]?.color ??
                          'default'
                        }
                      >
                        {dayjs(item.startTime).format('HH:mm')}–
                        {dayjs(item.endTime).format('HH:mm')}{' '}
                        {MEETING_BOOKING_STATUS_META[item.status]?.text}
                      </Tag>
                    </Tooltip>
                  ))}
                </Space>
              );
            },
          },
          {
            title: '操作',
            key: 'action',
            fixed: 'right',
            width: 120,
            render: (_, room) =>
              room.needApproval ? (
                <Tooltip title="该会议室需审批，请在发起申请中选择“会议室预订”">
                  <Button
                    type="link"
                    onClick={() => history.push('/oa/launch')}
                  >
                    发起申请
                  </Button>
                </Tooltip>
              ) : (
                <Button type="link" onClick={() => openBook(room)}>
                  预订
                </Button>
              ),
          },
        ]}
      />
      <Modal
        title={booking ? `预订：${booking.name}` : '预订会议室'}
        open={Boolean(booking)}
        width={520}
        confirmLoading={submitting}
        okText="确认预订"
        destroyOnHidden
        onCancel={() => setBooking(null)}
        onOk={() => void submit()}
      >
        {booking ? (
          <Form form={form} name="oaMeetingBookForm" layout="vertical">
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={`容纳 ${booking.capacity} 人；时段按半开区间判定，首尾相接不算冲突。`}
            />
            <Form.Item
              name="subject"
              label="会议主题"
              rules={[
                { required: true, whitespace: true, message: '请填写会议主题' },
              ]}
            >
              <Input maxLength={200} aria-label="会议主题" />
            </Form.Item>
            <Form.Item
              name="range"
              label="会议时段"
              rules={[
                { required: true, message: '请选择会议时段' },
                {
                  validator: async (_, value?: [Dayjs, Dayjs]) => {
                    if (!value) return;
                    if (!value[1].isAfter(value[0])) {
                      throw new Error('结束时间必须晚于开始时间');
                    }
                    if (value[0].isBefore(dayjs().startOf('minute'))) {
                      throw new Error('开始时间不能早于当前时间');
                    }
                  },
                },
              ]}
            >
              <DatePicker.RangePicker
                showTime={{ format: 'HH:mm', minuteStep: 15 }}
                format="YYYY-MM-DD HH:mm"
                style={{ width: '100%' }}
                aria-label="会议时段"
                disabledDate={(day) => day.isBefore(dayjs(), 'day')}
              />
            </Form.Item>
            <Form.Item
              name="attendees"
              label="参会人数"
              rules={[{ required: true, message: '请填写参会人数' }]}
            >
              <InputNumber
                min={1}
                max={booking.capacity}
                precision={0}
                style={{ width: '100%' }}
                aria-label="参会人数"
              />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>
    </>
  );
};

const MyBookingTab: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [cancelling, setCancelling] = useState<OaMeetingBookingVo | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitCancel = async () => {
    if (!cancelling) return;
    setSubmitting(true);
    try {
      await cancelMyOaMeetingBooking(cancelling.id, {
        reason: reason.trim() || undefined,
      });
      message.success('预订已取消');
      setCancelling(null);
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ProColumns<OaMeetingBookingVo>[] = [
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 100,
      valueEnum: statusValueEnum(MEETING_BOOKING_STATUS_META),
      render: (_, record) =>
        metaTag(MEETING_BOOKING_STATUS_META, record.status),
    },
    {
      title: '会议主题',
      dataIndex: 'subject',
      search: false,
      ellipsis: true,
      width: 180,
    },
    { title: '会议室', dataIndex: 'roomName', search: false, width: 140 },
    {
      title: '时段',
      dataIndex: 'startTime',
      search: false,
      width: 170,
      render: (_, record) => timeRange(record.startTime, record.endTime),
    },
    { title: '人数', dataIndex: 'attendees', search: false, width: 70 },
    {
      title: '取消说明',
      dataIndex: 'cancelReason',
      search: false,
      ellipsis: true,
      width: 160,
      render: (_, record) => record.cancelReason || '—',
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 200,
      render: (_, record) => [
        record.applicationId ? (
          <TrackButton key="track" applicationId={record.applicationId} />
        ) : null,
        record.status === 'BOOKED' && dayjs(record.endTime).isAfter(dayjs()) ? (
          <Button
            key="cancel"
            type="link"
            danger
            onClick={() => {
              setReason('');
              setCancelling(record);
            }}
          >
            取消
          </Button>
        ) : null,
      ],
    },
  ];

  return (
    <>
      <ProTable<OaMeetingBookingVo>
        headerTitle="我的预订"
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 1000 }}
        request={async (params) => {
          const response = await queryMyOaMeetingBookings({
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
      <Modal
        title={cancelling ? `取消预订：${cancelling.subject}` : '取消预订'}
        open={Boolean(cancelling)}
        confirmLoading={submitting}
        okText="确认取消"
        okButtonProps={{ danger: true }}
        destroyOnHidden
        onCancel={() => setCancelling(null)}
        onOk={() => void submitCancel()}
      >
        <Input.TextArea
          rows={3}
          maxLength={500}
          showCount
          aria-label="取消原因"
          placeholder="可选"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Modal>
    </>
  );
};

const MeetingBookPage: React.FC = () => (
  <PageContainer header={{ title: '会议预订' }}>
    <Tabs
      destroyOnHidden
      items={[
        { key: 'schedule', label: '会议室日程', children: <ScheduleTab /> },
        { key: 'mine', label: '我的预订', children: <MyBookingTab /> },
      ]}
    />
  </PageContainer>
);

export default MeetingBookPage;
