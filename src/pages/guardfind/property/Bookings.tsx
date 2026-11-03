import {
  type ActionType,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space } from 'antd';
import React, { useRef } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  type BookingVo,
  queryBookings,
  updateBooking,
} from '@/services/web/guardfind/property';
export default function Bookings() {
  const action = useRef<ActionType>(null);
  const change = async (id: BookingVo['id'], status: number) => {
    await updateBooking(id, status);
    message.success('预约已更新');
    action.current?.reload();
  };
  const columns: ProColumns<BookingVo>[] = [
    { title: '房源 ID', dataIndex: 'propertyId' },
    { title: '房源', dataIndex: 'propertyTitle', hideInSearch: true },
    { title: '预约人', dataIndex: 'userNickname', hideInSearch: true },
    { title: '联系人', dataIndex: 'contactName', hideInSearch: true },
    { title: '电话', dataIndex: 'contactPhone', hideInSearch: true },
    { title: '看房时间', dataIndex: 'bookingTime', hideInSearch: true },
    { title: '备注', dataIndex: 'remark', hideInSearch: true },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: { 1: '待确认', 2: '已确认', 3: '已拒绝', 4: '已取消' },
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, r) => (
        <AccessControl permission="system:property:booking:update">
          <Space>
            {(r.status === 1
              ? [
                  [2, '确认'],
                  [3, '拒绝'],
                  [4, '取消'],
                ]
              : r.status === 2
                ? [[4, '取消']]
                : []
            ).map(([status, label]) => (
              <Popconfirm
                key={status}
                title={`确定${label}预约？`}
                onConfirm={() => change(r.id, Number(status))}
              >
                <Button type="link">{label}</Button>
              </Popconfirm>
            ))}
          </Space>
        </AccessControl>
      ),
    },
  ];
  return (
    <ProTable<BookingVo>
      rowKey="id"
      actionRef={action}
      columns={columns}
      scroll={{ x: 1000 }}
      request={async ({ current, pageSize, status, propertyId }) => {
        const r = await queryBookings({
          page: current || 1,
          size: pageSize || 10,
          status,
          propertyId,
        });
        return {
          data: r.data?.list || [],
          total: r.data?.total || 0,
          success: true,
        };
      }}
    />
  );
}
