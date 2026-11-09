import { Descriptions, Space, Table, Tag, Typography } from 'antd';
import React from 'react';
import type {
  OaAssetDetailVo,
  OaAssetLogVo,
  OaAssetScrapVo,
  OaAssetVo,
  OaSupplyRequestDetailVo,
  OaSupplyRequestItemVo,
} from '@/services/web/guardfind/oa';
import {
  ASSET_LOG_ACTION_META,
  ASSET_STATUS_META,
  SCRAP_STATUS_META,
  SUPPLY_REQUEST_STATUS_META,
} from '@/utils/oaAsset';
import { formatAmount } from '@/utils/oaExpense';
import { applicationStatusTag } from '../../application/components/ApplicationStatus';
import { metaTag, TrackButton } from '../../purchase/components/PurchaseDetail';

export const assetStatusTag = (
  asset: Pick<OaAssetVo, 'status' | 'scrapPending'>,
) => (
  <Space size={4} wrap>
    {metaTag(ASSET_STATUS_META, asset.status)}
    {asset.scrapPending ? <Tag color="red">报废审批中</Tag> : null}
  </Space>
);

export const scrapStatusTag = (status: string) =>
  metaTag(SCRAP_STATUS_META, status);

export const supplyRequestStatusTag = (status: string) =>
  metaTag(SUPPLY_REQUEST_STATUS_META, status);

function holderText(name?: string | null, id?: number | null) {
  return name || id || '—';
}

export const AssetLogTable: React.FC<{ logs: OaAssetLogVo[] }> = ({ logs }) => (
  <Table<OaAssetLogVo>
    rowKey="id"
    size="small"
    bordered
    pagination={false}
    scroll={{ x: 760 }}
    dataSource={logs}
    aria-label="资产履历"
    locale={{ emptyText: '暂无履历' }}
    columns={[
      {
        title: '动作',
        dataIndex: 'action',
        width: 96,
        render: (value: string) => metaTag(ASSET_LOG_ACTION_META, value),
      },
      {
        title: '状态',
        key: 'status',
        width: 150,
        render: (_, log) =>
          log.fromStatus || log.toStatus
            ? `${ASSET_STATUS_META[log.fromStatus ?? '']?.text ?? '—'} → ${
                ASSET_STATUS_META[log.toStatus ?? '']?.text ?? '—'
              }`
            : '—',
      },
      {
        title: '使用人',
        key: 'holder',
        width: 150,
        render: (_, log) =>
          log.fromHolderId || log.toHolderId
            ? `${holderText(log.fromHolderName, log.fromHolderId)} → ${holderText(
                log.toHolderName,
                log.toHolderId,
              )}`
            : '—',
      },
      {
        title: '位置',
        dataIndex: 'location',
        width: 110,
        render: (value) => value || '—',
      },
      {
        title: '操作人',
        key: 'operator',
        width: 90,
        render: (_, log) => holderText(log.operatorName, log.operatorId),
      },
      {
        title: '时间',
        dataIndex: 'createTime',
        width: 170,
        render: (value) => value || '—',
      },
      {
        title: '备注',
        dataIndex: 'remark',
        ellipsis: true,
        render: (value) => value || '—',
      },
    ]}
  />
);

const ScrapTable: React.FC<{ scraps: OaAssetScrapVo[] }> = ({ scraps }) => (
  <Table<OaAssetScrapVo>
    rowKey="id"
    size="small"
    bordered
    pagination={false}
    dataSource={scraps}
    aria-label="报废申请"
    columns={[
      {
        title: '申请',
        dataIndex: 'title',
        render: (_, scrap) => scrap.title || `申请 #${scrap.applicationId}`,
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 96,
        render: (value: string) => scrapStatusTag(value),
      },
      {
        title: '申请人',
        key: 'applicant',
        width: 100,
        render: (_, scrap) =>
          holderText(scrap.applicantName, scrap.applicantId),
      },
      {
        title: '审批轨迹',
        key: 'track',
        width: 120,
        render: (_, scrap) => (
          <TrackButton applicationId={scrap.applicationId} />
        ),
      },
    ]}
  />
);

export const AssetDetailContent: React.FC<{ detail: OaAssetDetailVo }> = ({
  detail,
}) => {
  const { asset } = detail;
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
        <Descriptions.Item label="资产编号">{asset.assetNo}</Descriptions.Item>
        <Descriptions.Item label="资产状态">
          {assetStatusTag(asset)}
        </Descriptions.Item>
        <Descriptions.Item label="名称">{asset.name}</Descriptions.Item>
        <Descriptions.Item label="类别">
          {asset.category || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="规格">{asset.spec || '—'}</Descriptions.Item>
        <Descriptions.Item label="原值">
          {formatAmount(asset.originalValue)}
        </Descriptions.Item>
        <Descriptions.Item label="使用人">
          {holderText(asset.holderName, asset.holderId)}
        </Descriptions.Item>
        <Descriptions.Item label="使用部门">
          {asset.deptName || asset.deptId || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="存放位置">
          {asset.location || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="取得日期">
          {asset.acquiredDate || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="来源采购单">
          {asset.purchaseNo || '手工建卡'}
        </Descriptions.Item>
      </Descriptions>
      <div>
        <Typography.Title level={5}>资产履历</Typography.Title>
        <AssetLogTable logs={detail.logs} />
      </div>
      {detail.scraps.length > 0 ? (
        <div>
          <Typography.Title level={5}>报废申请</Typography.Title>
          <ScrapTable scraps={detail.scraps} />
        </div>
      ) : null}
    </Space>
  );
};

export const SupplyRequestDetailContent: React.FC<{
  detail: OaSupplyRequestDetailVo;
  showStock?: boolean;
}> = ({ detail, showStock }) => {
  const { request } = detail;
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
        <Descriptions.Item label="申请">
          {request.title || `申请 #${request.applicationId}`}
        </Descriptions.Item>
        <Descriptions.Item label="领用状态">
          {supplyRequestStatusTag(request.status)}
        </Descriptions.Item>
        <Descriptions.Item label="审批状态">
          {request.applicationStatus
            ? applicationStatusTag(request.applicationStatus)
            : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="申请人">
          {holderText(request.applicantName, request.applicantId)}
        </Descriptions.Item>
        <Descriptions.Item label="发放人">
          {holderText(request.issuerName, request.issuerId)}
        </Descriptions.Item>
        <Descriptions.Item label="发放时间">
          {request.issuedTime || '—'}
        </Descriptions.Item>
      </Descriptions>
      <TrackButton applicationId={request.applicationId} />
      <Table<OaSupplyRequestItemVo>
        rowKey="itemId"
        size="small"
        bordered
        pagination={false}
        dataSource={detail.items}
        aria-label="领用明细"
        columns={[
          { title: '编码', dataIndex: 'code', width: 110 },
          { title: '用品', dataIndex: 'name' },
          {
            title: '数量',
            key: 'quantity',
            width: 100,
            render: (_, item) => `${item.quantity} ${item.unit}`,
          },
          ...(showStock
            ? [
                {
                  title: '当前库存',
                  key: 'stock',
                  width: 100,
                  render: (_: unknown, item: OaSupplyRequestItemVo) =>
                    item.stock < item.quantity ? (
                      <Typography.Text type="danger">
                        {item.stock}（不足）
                      </Typography.Text>
                    ) : (
                      item.stock
                    ),
                },
              ]
            : []),
        ]}
      />
    </Space>
  );
};
