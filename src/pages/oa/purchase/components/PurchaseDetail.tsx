import { history } from '@umijs/max';
import { Button, Descriptions, Space, Table, Tag, Typography } from 'antd';
import React from 'react';
import type {
  OaAssetVo,
  OaPurchaseDetailVo,
  OaPurchaseItemVo,
  OaPurchaseReceiptVo,
} from '@/services/web/guardfind/oa';
import {
  ASSET_STATUS_META,
  PURCHASE_CATEGORY_META,
  PURCHASE_STATUS_META,
} from '@/utils/oaAsset';
import { formatAmount } from '@/utils/oaExpense';
import { applicationStatusTag } from '../../application/components/ApplicationStatus';

export function metaTag(
  meta: Record<string, { text: string; color: string }>,
  value?: string | null,
) {
  if (!value) return '—';
  const item = meta[value] ?? { text: value, color: 'default' };
  return <Tag color={item.color}>{item.text}</Tag>;
}

export const purchaseStatusTag = (status: string) =>
  metaTag(PURCHASE_STATUS_META, status);

export const TrackButton: React.FC<{ applicationId: number }> = ({
  applicationId,
}) => (
  <Button
    type="link"
    style={{ padding: 0 }}
    onClick={() => history.push(`/oa/application/detail?id=${applicationId}`)}
  >
    查看审批轨迹
  </Button>
);

export const PurchaseItemTable: React.FC<{ items: OaPurchaseItemVo[] }> = ({
  items,
}) => (
  <Table<OaPurchaseItemVo>
    rowKey="id"
    size="small"
    bordered
    pagination={false}
    scroll={{ x: 760 }}
    dataSource={items}
    aria-label="采购明细"
    columns={[
      { title: '行', dataIndex: 'lineNo', width: 48 },
      { title: '物品', dataIndex: 'itemName', width: 140 },
      {
        title: '类别',
        dataIndex: 'category',
        width: 72,
        render: (value: string) => metaTag(PURCHASE_CATEGORY_META, value),
      },
      {
        title: '用品编码',
        dataIndex: 'supplyCode',
        width: 100,
        render: (value) => value || '—',
      },
      {
        title: '规格',
        dataIndex: 'spec',
        ellipsis: true,
        render: (value) => value || '—',
      },
      { title: '数量', dataIndex: 'quantity', width: 64 },
      {
        title: '单价',
        dataIndex: 'unitPrice',
        width: 100,
        render: (value) => formatAmount(value),
      },
      {
        title: '金额',
        dataIndex: 'amount',
        width: 110,
        render: (value) => formatAmount(value),
      },
      {
        title: '已验收',
        key: 'received',
        width: 80,
        render: (_, record) => `${record.receivedQty}/${record.quantity}`,
      },
    ]}
  />
);

const ReceiptTable: React.FC<{ receipts: OaPurchaseReceiptVo[] }> = ({
  receipts,
}) => (
  <Table<OaPurchaseReceiptVo>
    rowKey="id"
    size="small"
    bordered
    pagination={false}
    dataSource={receipts}
    aria-label="验收记录"
    locale={{ emptyText: '暂无验收记录' }}
    columns={[
      { title: '验收日期', dataIndex: 'receiveDate', width: 110 },
      {
        title: '验收明细',
        key: 'lines',
        render: (_, record) =>
          record.lines
            .map((line) => `${line.itemName} × ${line.quantity}`)
            .join('，'),
      },
      {
        title: '验收人',
        key: 'receiver',
        width: 100,
        render: (_, record) => record.receiverName || record.receiverId,
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

export const AssetBriefTable: React.FC<{ assets: OaAssetVo[] }> = ({
  assets,
}) => (
  <Table<OaAssetVo>
    rowKey="id"
    size="small"
    bordered
    pagination={false}
    dataSource={assets}
    aria-label="入库资产"
    locale={{ emptyText: '暂无入库资产' }}
    columns={[
      { title: '资产编号', dataIndex: 'assetNo', width: 150 },
      { title: '名称', dataIndex: 'name' },
      {
        title: '状态',
        dataIndex: 'status',
        width: 90,
        render: (value: string) => metaTag(ASSET_STATUS_META, value),
      },
      {
        title: '原值',
        dataIndex: 'originalValue',
        width: 110,
        render: (value) => formatAmount(value),
      },
      {
        title: '存放位置',
        dataIndex: 'location',
        width: 120,
        render: (value) => value || '—',
      },
    ]}
  />
);

export const PurchaseDetailContent: React.FC<{
  detail: OaPurchaseDetailVo;
}> = ({ detail }) => {
  const { purchase } = detail;
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
        <Descriptions.Item label="采购单号">
          {purchase.purchaseNo}
        </Descriptions.Item>
        <Descriptions.Item label="采购状态">
          {purchaseStatusTag(purchase.status)}
        </Descriptions.Item>
        <Descriptions.Item label="申请">
          {purchase.title || `申请 #${purchase.applicationId}`}
        </Descriptions.Item>
        <Descriptions.Item label="审批状态">
          {purchase.applicationStatus
            ? applicationStatusTag(purchase.applicationStatus)
            : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="申请人">
          {purchase.applicantName || purchase.applicantId}
        </Descriptions.Item>
        <Descriptions.Item label="预算部门">
          {purchase.deptName || purchase.deptId}
        </Descriptions.Item>
        <Descriptions.Item label="采购合计">
          {formatAmount(purchase.totalAmount)}
        </Descriptions.Item>
        <Descriptions.Item label="期望到货">
          {purchase.expectedDate || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="供应商">
          {purchase.supplier || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="订单号">
          {purchase.orderNo || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="下单日期">
          {purchase.orderDate || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="经办人">
          {purchase.ordererName || purchase.ordererId || '—'}
        </Descriptions.Item>
      </Descriptions>
      <TrackButton applicationId={purchase.applicationId} />
      <Typography.Title level={5} style={{ margin: 0 }}>
        采购明细
      </Typography.Title>
      <PurchaseItemTable items={detail.items} />
      <Typography.Title level={5} style={{ margin: 0 }}>
        验收记录
      </Typography.Title>
      <ReceiptTable receipts={detail.receipts} />
      {detail.assets.length > 0 ? (
        <>
          <Typography.Title level={5} style={{ margin: 0 }}>
            入库资产
          </Typography.Title>
          <AssetBriefTable assets={detail.assets} />
        </>
      ) : null}
    </Space>
  );
};
