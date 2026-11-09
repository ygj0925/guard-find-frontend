/**
 * 我的用车：本人发起的用车申请、调度结果与行程；出车前可取消，审批中请撤回申请。
 */
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Drawer, Input, Modal, message, Spin } from 'antd';
import React, { useRef, useState } from 'react';
import {
  cancelMyOaVehicleRequest,
  getMyOaVehicleRequest,
  type OaVehicleRequestVo,
  queryMyOaVehicleRequests,
} from '@/services/web/guardfind/oa';
import {
  timeRange,
  VEHICLE_REQUEST_STATUS_META,
  vehicleCancellable,
} from '@/utils/oaResource';
import { statusValueEnum } from '@/utils/oaTravel';
import { metaTag } from '../../purchase/components/PurchaseDetail';
import { VehicleRequestDetail } from '../components/VehicleRequestDetail';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

const MyVehiclePage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<OaVehicleRequestVo | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState<OaVehicleRequestVo | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const show = async (id: number) => {
    setOpen(true);
    setDetail(null);
    setLoading(true);
    try {
      const response = await getMyOaVehicleRequest(id);
      setDetail(response.data);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  };

  const submitCancel = async () => {
    if (!cancelling) return;
    setSubmitting(true);
    try {
      await cancelMyOaVehicleRequest(cancelling.id, {
        reason: reason.trim() || undefined,
      });
      message.success('用车申请已取消');
      setCancelling(null);
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
    { title: '人数', dataIndex: 'passengers', search: false, width: 70 },
    {
      title: '车辆 / 司机',
      dataIndex: 'plateNo',
      search: false,
      width: 170,
      render: (_, record) =>
        record.plateNo
          ? `${record.plateNo}${record.driverName ? ` / ${record.driverName}` : ''}`
          : '—',
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 130,
      render: (_, record) => [
        <Button key="view" type="link" onClick={() => void show(record.id)}>
          详情
        </Button>,
        vehicleCancellable(record.status) ? (
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
    <PageContainer header={{ title: '我的用车' }}>
      <ProTable<OaVehicleRequestVo>
        headerTitle="我的用车申请"
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 900 }}
        toolBarRender={() => [
          <Button
            key="launch"
            type="primary"
            onClick={() => history.push('/oa/launch')}
          >
            申请用车
          </Button>,
        ]}
        request={async (params) => {
          const response = await queryMyOaVehicleRequests({
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
        open={open}
        destroyOnHidden
        onClose={() => setOpen(false)}
      >
        <Spin spinning={loading}>
          {detail ? <VehicleRequestDetail request={detail} /> : null}
        </Spin>
      </Drawer>
      <Modal
        title="取消用车"
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
          placeholder="可选，已派车时会通知调度与司机"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Modal>
    </PageContainer>
  );
};

export default MyVehiclePage;
