/**
 * 用车申请详情：调度、出车、归还里程与费用，管理台与我的用车共用。
 */
import { Descriptions, Space } from 'antd';
import React from 'react';
import type { OaVehicleRequestVo } from '@/services/web/guardfind/oa';
import { formatAmount } from '@/utils/oaExpense';
import {
  mileageUsed,
  timeRange,
  VEHICLE_REQUEST_STATUS_META,
  vehicleCostTotal,
} from '@/utils/oaResource';
import { metaTag, TrackButton } from '../../purchase/components/PurchaseDetail';

export const VehicleRequestDetail: React.FC<{
  request: OaVehicleRequestVo;
}> = ({ request }) => {
  const used = mileageUsed(request);
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Descriptions size="small" column={1} bordered>
        <Descriptions.Item label="状态">
          {metaTag(VEHICLE_REQUEST_STATUS_META, request.status)}
        </Descriptions.Item>
        <Descriptions.Item label="申请人">
          {request.applicantName || request.applicantId}
        </Descriptions.Item>
        <Descriptions.Item label="事由">{request.purpose}</Descriptions.Item>
        <Descriptions.Item label="目的地">
          {request.destination}
        </Descriptions.Item>
        <Descriptions.Item label="用车时段">
          {timeRange(request.startTime, request.endTime)}
        </Descriptions.Item>
        <Descriptions.Item label="人数">
          {request.passengers}
          {request.needDriver ? '（需司机）' : '（自驾）'}
        </Descriptions.Item>
        <Descriptions.Item label="车辆">
          {request.plateNo
            ? `${request.plateNo}${request.vehicleModel ? ` · ${request.vehicleModel}` : ''}`
            : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="司机">
          {request.driverName
            ? `${request.driverName}${request.driverPhone ? ` · ${request.driverPhone}` : ''}`
            : '—'}
        </Descriptions.Item>
        {request.dispatchTime ? (
          <Descriptions.Item label="调度">
            {request.dispatchByName || ''} {request.dispatchTime}
            {request.dispatchRemark ? `，${request.dispatchRemark}` : ''}
          </Descriptions.Item>
        ) : null}
        {request.departTime ? (
          <Descriptions.Item label="出车">
            {request.departTime}，里程 {request.startMileage} km
          </Descriptions.Item>
        ) : null}
        {request.returnTime ? (
          <>
            <Descriptions.Item label="归还">
              {request.returnTime}，里程 {request.endMileage} km
              {used == null ? '' : `（行驶 ${used} km）`}
            </Descriptions.Item>
            <Descriptions.Item label="费用">
              油费 {formatAmount(request.fuelCost ?? 0)}，路桥停车{' '}
              {formatAmount(request.tollCost ?? 0)}，其他{' '}
              {formatAmount(request.otherCost ?? 0)}，合计{' '}
              {formatAmount(vehicleCostTotal(request))}
            </Descriptions.Item>
            {request.returnRemark ? (
              <Descriptions.Item label="归还备注">
                {request.returnRemark}
              </Descriptions.Item>
            ) : null}
          </>
        ) : null}
        {request.cancelReason ? (
          <Descriptions.Item label="取消原因">
            {request.cancelReason}
            {request.cancelTime ? `（${request.cancelTime}）` : ''}
          </Descriptions.Item>
        ) : null}
      </Descriptions>
      <TrackButton applicationId={request.applicationId} />
    </Space>
  );
};
