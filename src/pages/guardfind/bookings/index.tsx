import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  message,
  Space,
  Spin,
  Timeline,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  type BookingDetail,
  bookingAction,
  bookingDetail,
  bookingLabels,
  bookings,
  type OpsBooking,
} from '@/services/web/guardfind/operations';

function Detail({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<BookingDetail>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [action, setAction] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    bookingDetail(id)
      .then((r) => {
        if (alive) setDetail(r.data);
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, revision]);
  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await bookingAction(id, {
        action: action!,
        reason: values.reason,
        bookingTime: values.bookingTime?.format('YYYY-MM-DD HH:mm:ss'),
      });
      message.success('预约已处理');
      setAction(undefined);
      form.resetFields();
      setRevision((v) => v + 1);
      onChanged();
    } finally {
      setSaving(false);
    }
  };
  const actions =
    detail?.status === 1
      ? ['CONFIRM', 'REJECT', 'CANCEL', 'RESCHEDULE']
      : detail?.status === 2
        ? ['VISIT', 'NO_SHOW', 'CANCEL', 'RESCHEDULE']
        : detail?.status === 5
          ? ['COMPLETE']
          : [];
  const names: Record<string, string> = {
    CONFIRM: '确认预约',
    REJECT: '拒绝预约',
    CANCEL: '取消预约',
    RESCHEDULE: '预约改期',
    VISIT: '登记到访',
    NO_SHOW: '标记未到访',
    COMPLETE: '完成看房',
  };
  return (
    <>
      <Drawer title="看房预约详情" open onClose={onClose} width={650}>
        {loading ? (
          <Spin />
        ) : error ? (
          <Alert
            type="error"
            message="加载失败"
            action={
              <Button onClick={() => setRevision((v) => v + 1)}>重试</Button>
            }
          />
        ) : (
          detail && (
            <>
              <Descriptions
                column={1}
                bordered
                items={[
                  { key: 'id', label: '预约编号', children: detail.id },
                  {
                    key: 'property',
                    label: '房源',
                    children: detail.property[0]?.title || '房源已删除',
                  },
                  {
                    key: 'time',
                    label: '看房时间',
                    children: detail.bookingTime,
                  },
                  {
                    key: 'state',
                    label: '状态',
                    children: bookingLabels[detail.status],
                  },
                  {
                    key: 'contact',
                    label: '预约联系人',
                    children: `${detail.contactName} ${detail.contactPhone}`,
                  },
                  {
                    key: 'meeting',
                    label: '集合地点',
                    children: detail.reception.meetingPoint || '暂未配置',
                  },
                  {
                    key: 'manager',
                    label: '接待管家',
                    children: detail.reception.managerName || '后台统一接待',
                  },
                  {
                    key: 'remark',
                    label: '用户备注',
                    children: detail.remark || '—',
                  },
                ]}
              />
              <AccessControl permission="system:property:booking:update">
                <Space wrap style={{ margin: '20px 0' }}>
                  {actions.map((a) => (
                    <Button
                      key={a}
                      onClick={() => {
                        form.resetFields();
                        setAction(a);
                      }}
                    >
                      {names[a]}
                    </Button>
                  ))}
                </Space>
              </AccessControl>
              <h3>处理轨迹</h3>
              <Timeline
                items={detail.logs.map((l) => ({
                  key: l.id,
                  children: (
                    <>
                      <strong>
                        {l.createTime} · {l.actorType}
                      </strong>
                      <div>
                        {l.reason || l.action}
                        {l.toStatus ? ` · ${bookingLabels[l.toStatus]}` : ''}
                      </div>
                    </>
                  ),
                }))}
              />
            </>
          )
        )}
      </Drawer>
      <Modal
        title={action ? names[action] : ''}
        open={!!action}
        onCancel={() => setAction(undefined)}
        onOk={() => void submit().catch(() => {})}
        confirmLoading={saving}
        closable={!saving}
        maskClosable={!saving}
        cancelButtonProps={{ disabled: saving }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="reason"
            label="处理原因 / 说明"
            rules={[
              {
                required: [
                  'REJECT',
                  'CANCEL',
                  'RESCHEDULE',
                  'NO_SHOW',
                ].includes(action || ''),
                whitespace: true,
                message: '请填写原因',
              },
            ]}
          >
            <Input.TextArea maxLength={500} showCount />
          </Form.Item>
          {action === 'RESCHEDULE' && (
            <Form.Item
              name="bookingTime"
              label="新的看房时间"
              rules={[{ required: true }]}
            >
              <DatePicker
                showTime
                disabledDate={(d) => d.isBefore(dayjs(), 'day')}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
}
export default function Bookings() {
  const action = useRef<ActionType>(null);
  const [selected, setSelected] = useState<string>();
  const columns: ProColumns<OpsBooking>[] = [
    {
      title: '房源 / 联系人 / 预约编号',
      dataIndex: 'keyword',
      hideInTable: true,
    },
    { title: '房源', dataIndex: 'propertyTitle', hideInSearch: true },
    { title: '联系人', dataIndex: 'contactName', hideInSearch: true },
    { title: '联系电话', dataIndex: 'contactPhone', hideInSearch: true },
    { title: '看房时间', dataIndex: 'bookingTime', hideInSearch: true },
    {
      title: '看房日期',
      dataIndex: 'dateRange',
      valueType: 'dateRange',
      hideInTable: true,
    },
    { title: '接待管家', dataIndex: 'managerName', hideInSearch: true },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: Object.fromEntries(
        Object.entries(bookingLabels).map(([key, text]) => [key, { text }]),
      ),
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, row) => (
        <Button type="link" onClick={() => setSelected(row.id)}>
          详情与处理
        </Button>
      ),
    },
  ];
  return (
    <PageContainer title="看房预约">
      <ProTable<OpsBooking>
        rowKey="id"
        actionRef={action}
        columns={columns}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        scroll={{ x: 1000 }}
        request={async ({ current, pageSize, dateRange, keyword, status }) => {
          const r = await bookings({
            page: current || 1,
            size: pageSize || 10,
            keyword,
            status: status ? Number(status) : undefined,
            dateFrom: dateRange?.[0],
            dateTo: dateRange?.[1],
          });
          return { data: r.data.list, total: r.data.total, success: true };
        }}
      />
      {selected && (
        <Detail
          id={selected}
          onClose={() => setSelected(undefined)}
          onChanged={() => action.current?.reload()}
        />
      )}
    </PageContainer>
  );
}
