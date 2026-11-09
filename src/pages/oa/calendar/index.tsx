/**
 * 我的日程：月视图展示本人、受邀与所在部门的日程；本人创建的日程可编辑与取消，有权限时可向本部门及下级部门发布。
 */
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import {
  Button,
  Calendar,
  Checkbox,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Modal,
  message,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAccess } from '@/hooks/useAccess';
import {
  cancelOaCalendarEvent,
  createOaCalendarEvent,
  type OaCalendarEventVo,
  type OaDeptOptionVo,
  queryOaCalendarDepts,
  queryOaCalendarEvents,
  updateOaCalendarEvent,
} from '@/services/web/guardfind/oa';
import {
  CALENDAR_SCOPE_META,
  type CalendarEventValues,
  calendarEventParams,
  eventsOnDay,
  monthRange,
  REMIND_OPTIONS,
  timeRange,
} from '@/utils/oaResource';
import { newRequestId } from '@/utils/oaTravel';
import { OaEmployeeMultiSelect } from '../components/OaStaffSelects';
import { metaTag } from '../purchase/components/PurchaseDetail';

const ISO = 'YYYY-MM-DDTHH:mm:ss';
const MAX_MEMBERS = 50;

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

function eventTime(event: OaCalendarEventVo) {
  if (!event.allDay) return timeRange(event.startTime, event.endTime);
  const start = dayjs(event.startTime);
  const last = dayjs(event.endTime).subtract(1, 'day');
  return start.isSame(last, 'day')
    ? `${start.format('MM-DD')} 全天`
    : `${start.format('MM-DD')}–${last.format('MM-DD')} 全天`;
}

const CalendarPage: React.FC = () => {
  const currentUser = useModel('@@initialState', (m) => m.initialState?.user);
  const { hasPermission } = useAccess();
  const canDept = hasPermission('system:oa:calendar:dept');
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [selected, setSelected] = useState<Dayjs>(dayjs());
  const [events, setEvents] = useState<OaCalendarEventVo[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<OaCalendarEventVo | null>(null);
  const [editing, setEditing] = useState<OaCalendarEventVo | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [depts, setDepts] = useState<OaDeptOptionVo[]>([]);
  const requestIdRef = useRef('');
  const [form] = Form.useForm<CalendarEventValues>();
  const allDay = Form.useWatch('allDay', form);
  const scope = Form.useWatch('scope', form);

  const load = useCallback(async () => {
    const { from, to } = monthRange(month);
    setLoading(true);
    try {
      const response = await queryOaCalendarEvents({
        from: from.format(ISO),
        to: to.format(ISO),
      });
      setEvents(response.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!canDept) return;
    queryOaCalendarDepts()
      .then((response) => setDepts(response.data ?? []))
      .catch((error) => message.error(errorText(error)));
  }, [canDept]);

  const isOwner = (event: OaCalendarEventVo) =>
    currentUser?.id != null && String(event.ownerId) === String(currentUser.id);

  const openCreate = (day: Dayjs) => {
    requestIdRef.current = newRequestId('calendar');
    setEditing(null);
    form.resetFields();
    const start = day
      .hour(dayjs().hour() + 1)
      .minute(0)
      .second(0);
    form.setFieldsValue({
      allDay: false,
      scope: 'PERSONAL',
      remindMinutes: 15,
      range: [start, start.add(1, 'hour')],
      memberIds: [],
    });
    setFormOpen(true);
  };

  const openEdit = (event: OaCalendarEventVo) => {
    setEditing(event);
    setViewing(null);
    form.resetFields();
    const end = event.allDay
      ? dayjs(event.endTime).subtract(1, 'day')
      : dayjs(event.endTime);
    form.setFieldsValue({
      title: event.title,
      location: event.location ?? undefined,
      description: event.description ?? undefined,
      allDay: event.allDay,
      range: [dayjs(event.startTime), end],
      scope: event.scope,
      deptId: event.deptId ?? undefined,
      remindMinutes: event.remindMinutes ?? -1,
      memberIds: (event.members ?? [])
        .map((member) => String(member.userId))
        .filter((id) => id !== String(event.ownerId)),
    });
    setFormOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setSubmitting(true);
    try {
      const params = calendarEventParams(values);
      if (editing) {
        await updateOaCalendarEvent(editing.id, {
          ...params,
          version: editing.version,
        });
        message.success('日程已更新');
      } else {
        await createOaCalendarEvent({
          ...params,
          requestId: requestIdRef.current,
        });
        message.success('日程已创建');
      }
      setFormOpen(false);
      void load();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const cancelEvent = async (event: OaCalendarEventVo) => {
    try {
      await cancelOaCalendarEvent(event.id);
      message.success('日程已取消');
      setViewing(null);
      void load();
    } catch (error) {
      message.error(errorText(error));
    }
  };

  const dayEvents = eventsOnDay(events, selected);

  return (
    <PageContainer
      header={{ title: '我的日程' }}
      extra={[
        <Button
          key="create"
          type="primary"
          onClick={() => openCreate(selected)}
        >
          新建日程
        </Button>,
      ]}
    >
      <Spin spinning={loading}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 640px', minWidth: 0 }}>
            <Calendar
              value={selected}
              onSelect={(date) => {
                setSelected(date);
                if (!date.isSame(month, 'month')) setMonth(date);
              }}
              onPanelChange={(date) => setMonth(date)}
              cellRender={(date, info) => {
                if (info.type !== 'date') return info.originNode;
                const list = eventsOnDay(events, date);
                if (list.length === 0) return null;
                return (
                  <div>
                    {list.slice(0, 3).map((event) => (
                      <Typography.Text
                        key={event.id}
                        ellipsis
                        style={{ display: 'block', fontSize: 12 }}
                      >
                        <Tag
                          color={CALENDAR_SCOPE_META[event.scope]?.color}
                          style={{ marginInlineEnd: 4, fontSize: 11 }}
                        >
                          {event.allDay
                            ? '全天'
                            : dayjs(event.startTime).format('HH:mm')}
                        </Tag>
                        {event.title}
                      </Typography.Text>
                    ))}
                    {list.length > 3 ? (
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 12 }}
                      >
                        另有 {list.length - 3} 项
                      </Typography.Text>
                    ) : null}
                  </div>
                );
              }}
            />
          </div>
          <div style={{ flex: '0 1 320px', minWidth: 260 }}>
            <List
              aria-label="当日日程"
              header={
                <Space>
                  <Typography.Text strong>
                    {selected.format('YYYY-MM-DD')} 日程
                  </Typography.Text>
                  <Button size="small" onClick={() => openCreate(selected)}>
                    添加
                  </Button>
                </Space>
              }
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="当天没有日程"
                  />
                ),
              }}
              dataSource={dayEvents}
              renderItem={(event) => (
                <List.Item
                  actions={[
                    <Button
                      key="view"
                      type="link"
                      size="small"
                      onClick={() => setViewing(event)}
                    >
                      详情
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space size={4}>
                        {metaTag(CALENDAR_SCOPE_META, event.scope)}
                        <span>{event.title}</span>
                      </Space>
                    }
                    description={eventTime(event)}
                  />
                </List.Item>
              )}
            />
          </div>
        </div>
      </Spin>

      <Drawer
        title={viewing ? viewing.title : '日程详情'}
        width={480}
        open={Boolean(viewing)}
        destroyOnHidden
        onClose={() => setViewing(null)}
        extra={
          viewing && isOwner(viewing) ? (
            <Space>
              <Button onClick={() => openEdit(viewing)}>编辑</Button>
              <Popconfirm
                title="取消该日程？"
                description="参与人会收到取消通知。"
                okText="取消日程"
                cancelText="返回"
                onConfirm={() => cancelEvent(viewing)}
              >
                <Button danger>取消日程</Button>
              </Popconfirm>
            </Space>
          ) : null
        }
      >
        {viewing ? (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="时间">
              {eventTime(viewing)}
            </Descriptions.Item>
            <Descriptions.Item label="范围">
              {metaTag(CALENDAR_SCOPE_META, viewing.scope)}
              {viewing.scope === 'DEPT' ? viewing.deptName : null}
            </Descriptions.Item>
            <Descriptions.Item label="创建人">
              {viewing.ownerName || viewing.ownerId}
            </Descriptions.Item>
            <Descriptions.Item label="地点">
              {viewing.location || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="提醒">
              {REMIND_OPTIONS.find(
                (option) => option.value === (viewing.remindMinutes ?? -1),
              )?.label ?? `提前 ${viewing.remindMinutes} 分钟`}
            </Descriptions.Item>
            <Descriptions.Item label="参与人">
              {(viewing.members ?? []).length === 0
                ? '-'
                : (viewing.members ?? [])
                    .map((member) => member.userName || member.userId)
                    .join('、')}
            </Descriptions.Item>
            <Descriptions.Item label="说明">
              <Typography.Paragraph
                style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}
              >
                {viewing.description || '-'}
              </Typography.Paragraph>
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>

      <Modal
        title={editing ? '编辑日程' : '新建日程'}
        open={formOpen}
        width={560}
        confirmLoading={submitting}
        okText="保存"
        destroyOnHidden
        onCancel={() => setFormOpen(false)}
        onOk={() => void submit()}
      >
        <Form
          form={form}
          name="oaCalendarEventForm"
          layout="vertical"
          preserve={false}
        >
          <Form.Item
            name="title"
            label="日程标题"
            rules={[
              { required: true, whitespace: true, message: '请填写日程标题' },
              { max: 100, message: '标题不超过 100 字' },
            ]}
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item name="allDay" valuePropName="checked">
            <Checkbox>全天</Checkbox>
          </Form.Item>
          <Form.Item
            name="range"
            label="日程时间"
            rules={[
              { required: true, message: '请选择日程时间' },
              {
                validator: async (_, value?: [Dayjs, Dayjs]) => {
                  if (!value) return;
                  const [start, end] = value;
                  if (
                    allDay ? end.isBefore(start, 'day') : !end.isAfter(start)
                  ) {
                    throw new Error('结束时间必须晚于开始时间');
                  }
                },
              },
            ]}
          >
            {allDay ? (
              <DatePicker.RangePicker style={{ width: '100%' }} />
            ) : (
              <DatePicker.RangePicker
                style={{ width: '100%' }}
                showTime={{ format: 'HH:mm', minuteStep: 5 }}
                format="YYYY-MM-DD HH:mm"
              />
            )}
          </Form.Item>
          <Form.Item name="location" label="地点">
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="scope" label="日程范围">
            <Select
              aria-label="日程范围"
              options={[
                { value: 'PERSONAL', label: '个人日程' },
                ...(canDept ? [{ value: 'DEPT', label: '部门日程' }] : []),
              ]}
            />
          </Form.Item>
          {scope === 'DEPT' ? (
            <Form.Item
              name="deptId"
              label="发布部门"
              rules={[{ required: true, message: '请选择发布部门' }]}
            >
              <Select
                aria-label="发布部门"
                options={depts.map((dept) => ({
                  value: dept.id,
                  label: dept.name,
                }))}
              />
            </Form.Item>
          ) : null}
          <Form.Item name="remindMinutes" label="提醒">
            <Select aria-label="提醒" options={REMIND_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="memberIds"
            label="参与人"
            extra={`最多 ${MAX_MEMBERS} 人，参与人会收到邀请通知。`}
          >
            <OaEmployeeMultiSelect ariaLabel="参与人" maxCount={MAX_MEMBERS} />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={3} maxLength={1000} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default CalendarPage;
