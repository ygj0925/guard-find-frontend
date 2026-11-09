/**
 * 会议室管理：会议室档案（编码、容量、是否需审批、启停）、预订台账与管理员取消；一键生成需审批会议室的预订表单与流程草稿。
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
  Button,
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
import type { Dayjs } from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import { useAccess } from '@/hooks/useAccess';
import {
  cancelOaMeetingBooking,
  createOaMeetingRoom,
  createOaMeetingTemplate,
  type OaMeetingBookingVo,
  type OaMeetingRoomVo,
  type OaResourceStatus,
  queryOaMeetingBookings,
  queryOaMeetingRooms,
  updateOaMeetingRoom,
} from '@/services/web/guardfind/oa';
import {
  MEETING_BOOKING_STATUS_META,
  RESOURCE_STATUS_META,
  timeRange,
} from '@/utils/oaResource';
import { statusValueEnum } from '@/utils/oaTravel';
import { metaTag, TrackButton } from '../purchase/components/PurchaseDetail';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

type RoomValues = {
  code: string;
  name: string;
  location?: string;
  capacity: number;
  needApproval: boolean;
  status: OaResourceStatus;
  remark?: string;
};

const STATUS_OPTIONS = [
  { value: 'ENABLED', label: '启用' },
  { value: 'DISABLED', label: '停用' },
];

const RoomTab: React.FC = () => {
  const [rooms, setRooms] = useState<OaMeetingRoomVo[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<OaMeetingRoomVo | 'new' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<RoomValues>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await queryOaMeetingRooms();
      setRooms(response.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (room: OaMeetingRoomVo | 'new') => {
    form.resetFields();
    form.setFieldsValue(
      room === 'new'
        ? { status: 'ENABLED', needApproval: false, capacity: 10 }
        : {
            code: room.code,
            name: room.name,
            location: room.location ?? undefined,
            capacity: room.capacity,
            needApproval: room.needApproval,
            status: room.status,
            remark: room.remark ?? undefined,
          },
    );
    setEditing(room);
  };

  const submit = async () => {
    if (!editing) return;
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    const data = {
      code: values.code.trim(),
      name: values.name.trim(),
      location: values.location?.trim() || undefined,
      capacity: values.capacity,
      needApproval: Boolean(values.needApproval),
      status: values.status,
      remark: values.remark?.trim() || undefined,
    };
    setSubmitting(true);
    try {
      if (editing === 'new') {
        await createOaMeetingRoom(data);
      } else {
        await updateOaMeetingRoom(editing.id, {
          ...data,
          version: editing.version,
        });
      }
      message.success('会议室已保存');
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
        <AccessControl permission="system:oa:meeting:manage">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openEdit('new')}
          >
            新建会议室
          </Button>
        </AccessControl>
      </Space>
      <Table<OaMeetingRoomVo>
        rowKey="id"
        loading={loading}
        dataSource={rooms}
        pagination={false}
        scroll={{ x: 820 }}
        aria-label="会议室档案"
        locale={{ emptyText: '暂无会议室，请先新建并启用' }}
        columns={[
          { title: '编码', dataIndex: 'code', width: 110 },
          { title: '名称', dataIndex: 'name', width: 150 },
          {
            title: '位置',
            dataIndex: 'location',
            ellipsis: true,
            render: (value) => value || '—',
          },
          {
            title: '容纳',
            dataIndex: 'capacity',
            width: 80,
            render: (value: number) => `${value} 人`,
          },
          {
            title: '预订方式',
            dataIndex: 'needApproval',
            width: 110,
            render: (value: boolean) =>
              value ? <Tag color="orange">需审批</Tag> : <Tag>直接预订</Tag>,
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
              <AccessControl permission="system:oa:meeting:manage">
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
            ? '新建会议室'
            : editing
              ? `编辑会议室：${editing.name}`
              : '会议室'
        }
        open={Boolean(editing)}
        width={520}
        confirmLoading={submitting}
        okText="保存"
        destroyOnHidden
        onCancel={() => setEditing(null)}
        onOk={() => void submit()}
      >
        <Form form={form} name="oaMeetingRoomForm" layout="vertical">
          <Form.Item
            name="code"
            label="会议室编码"
            rules={[
              { required: true, whitespace: true, message: '请输入会议室编码' },
              {
                pattern: /^[A-Za-z0-9_-]+$/,
                message: '只能包含字母、数字、下划线和短横线',
              },
            ]}
          >
            <Input maxLength={32} aria-label="会议室编码" />
          </Form.Item>
          <Form.Item
            name="name"
            label="会议室名称"
            rules={[
              { required: true, whitespace: true, message: '请输入会议室名称' },
            ]}
          >
            <Input maxLength={100} aria-label="会议室名称" />
          </Form.Item>
          <Form.Item name="location" label="位置">
            <Input maxLength={200} aria-label="位置" />
          </Form.Item>
          <Form.Item
            name="capacity"
            label="容纳人数"
            rules={[{ required: true, message: '请填写容纳人数' }]}
          >
            <InputNumber
              min={1}
              max={1000}
              precision={0}
              style={{ width: '100%' }}
              aria-label="容纳人数"
            />
          </Form.Item>
          <Form.Item
            name="needApproval"
            label="预订需审批"
            valuePropName="checked"
            extra="需审批的会议室通过 OA 申请预订，审批期间占用时段，会议开始前未通过自动释放"
          >
            <Switch aria-label="预订需审批" />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select aria-label="会议室状态" options={STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

const BookingLedgerTab: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [rooms, setRooms] = useState<OaMeetingRoomVo[]>([]);
  const [cancelling, setCancelling] = useState<OaMeetingBookingVo | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    queryOaMeetingRooms()
      .then((response) => setRooms(response.data ?? []))
      .catch(() => setRooms([]));
  }, []);

  const submitCancel = async () => {
    if (!cancelling) return;
    if (!reason.trim()) {
      message.warning('请填写取消原因');
      return;
    }
    setSubmitting(true);
    try {
      await cancelOaMeetingBooking(cancelling.id, { reason: reason.trim() });
      message.success('预订已取消，已通知预订人');
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
      title: '会议室',
      dataIndex: 'roomId',
      valueType: 'select',
      width: 140,
      fieldProps: {
        options: rooms.map((room) => ({ value: room.id, label: room.name })),
      },
      render: (_, record) => record.roomName,
    },
    {
      title: '日期',
      dataIndex: 'date',
      valueType: 'date',
      hideInTable: true,
    },
    {
      title: '会议主题',
      dataIndex: 'subject',
      search: false,
      ellipsis: true,
      width: 180,
    },
    {
      title: '时段',
      dataIndex: 'startTime',
      search: false,
      width: 170,
      render: (_, record) => timeRange(record.startTime, record.endTime),
    },
    {
      title: '人数',
      dataIndex: 'attendees',
      search: false,
      width: 70,
    },
    {
      title: '预订人',
      dataIndex: 'bookerName',
      search: false,
      width: 100,
      render: (_, record) => record.bookerName || record.bookerId,
    },
    {
      title: '取消说明',
      dataIndex: 'cancelReason',
      search: false,
      ellipsis: true,
      width: 160,
      render: (_, record) =>
        record.cancelReason
          ? `${record.cancelByName || record.cancelBy || ''}：${record.cancelReason}`
          : '—',
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
        record.status === 'BOOKED' ? (
          <AccessControl key="cancel" permission="system:oa:meeting:manage">
            <Button
              type="link"
              danger
              onClick={() => {
                setReason('');
                setCancelling(record);
              }}
            >
              取消预订
            </Button>
          </AccessControl>
        ) : null,
      ],
    },
  ];

  return (
    <>
      <ProTable<OaMeetingBookingVo>
        headerTitle="预订台账"
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 1200 }}
        request={async (params) => {
          const response = await queryOaMeetingBookings({
            page: (params.current as number) || 1,
            size: (params.pageSize as number) || 10,
            status: params.status || undefined,
            roomId: params.roomId || undefined,
            date: params.date
              ? typeof params.date === 'string'
                ? params.date
                : (params.date as Dayjs).format('YYYY-MM-DD')
              : undefined,
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
          placeholder="例如：会议室设备检修，请改订其他会议室"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Modal>
    </>
  );
};

const MeetingManagePage: React.FC = () => {
  const { hasPermission } = useAccess();
  const [templating, setTemplating] = useState(false);

  const handleTemplate = async () => {
    setTemplating(true);
    try {
      const response = await createOaMeetingTemplate();
      message.success(`已生成会议室预订流程草稿 ${response.data.modelKey}`);
      history.push(`/oa/process/design?id=${response.data.modelId}`);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setTemplating(false);
    }
  };

  const canView =
    hasPermission('system:oa:meeting:list') ||
    hasPermission('system:oa:meeting:manage');

  return (
    <PageContainer
      header={{ title: '会议室管理' }}
      extra={[
        <AccessControl key="template" permission="system:oa:meeting:manage">
          <Popconfirm
            title="生成会议室预订模板？"
            description={
              <div style={{ maxWidth: 360 }}>
                按当前启用且需审批的会议室生成并发布“会议室预订”表单（会议室、主题、起止时间、人数），并创建流程草稿：直属上级审批。新增需审批会议室后需重新生成。
              </div>
            }
            okText="生成"
            cancelText="取消"
            onConfirm={() => handleTemplate()}
          >
            <Button icon={<ThunderboltOutlined />} loading={templating}>
              生成预订模板
            </Button>
          </Popconfirm>
        </AccessControl>,
      ]}
    >
      <Tabs
        destroyOnHidden
        items={
          canView
            ? [
                { key: 'rooms', label: '会议室档案', children: <RoomTab /> },
                {
                  key: 'bookings',
                  label: '预订台账',
                  children: <BookingLedgerTab />,
                },
              ]
            : []
        }
      />
    </PageContainer>
  );
};

export default MeetingManagePage;
