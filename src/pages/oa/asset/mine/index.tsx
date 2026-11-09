/**
 * 我的采购资产：本人名下资产、领用申请、报废申请与采购申请。
 */
import {
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Drawer, message, Spin, Tabs } from 'antd';
import React, { useState } from 'react';
import {
  getMyOaAsset,
  getMyOaPurchase,
  getMyOaSupplyRequest,
  type OaAssetDetailVo,
  type OaAssetScrapVo,
  type OaAssetVo,
  type OaPurchaseDetailVo,
  type OaPurchaseVo,
  type OaSupplyRequestDetailVo,
  type OaSupplyRequestVo,
  queryMyOaAssetScraps,
  queryMyOaAssets,
  queryMyOaPurchases,
  queryMyOaSupplyRequests,
} from '@/services/web/guardfind/oa';
import {
  PURCHASE_STATUS_META,
  SCRAP_STATUS_META,
  SUPPLY_REQUEST_STATUS_META,
} from '@/utils/oaAsset';
import { formatAmount } from '@/utils/oaExpense';
import { statusValueEnum } from '@/utils/oaTravel';
import {
  PurchaseDetailContent,
  purchaseStatusTag,
  TrackButton,
} from '../../purchase/components/PurchaseDetail';
import {
  AssetDetailContent,
  assetStatusTag,
  SupplyRequestDetailContent,
  scrapStatusTag,
  supplyRequestStatusTag,
} from '../components/AssetDetail';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '加载失败';
}

function useDetail<T>(loader: (id: number) => Promise<{ data: T }>) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const show = async (id: number) => {
    setOpen(true);
    setDetail(null);
    setLoading(true);
    try {
      const response = await loader(id);
      setDetail(response.data);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  };
  return { open, setOpen, detail, loading, show };
}

function pageResult<T>(response: { data?: { list?: T[]; total?: number } }) {
  return {
    data: response.data?.list ?? [],
    total: response.data?.total ?? 0,
    success: true,
  };
}

const launchButton = (
  <Button
    key="launch"
    type="primary"
    onClick={() => history.push('/oa/launch')}
  >
    发起采购、领用或报废
  </Button>
);

const MyAssetTab: React.FC = () => {
  const view = useDetail<OaAssetDetailVo>(getMyOaAsset);
  const columns: ProColumns<OaAssetVo>[] = [
    { title: '资产编号', dataIndex: 'assetNo', width: 150 },
    { title: '名称', dataIndex: 'name', width: 140 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 150,
      render: (_, record) => assetStatusTag(record),
    },
    {
      title: '位置',
      dataIndex: 'location',
      ellipsis: true,
      width: 120,
      render: (_, record) => record.location || '—',
    },
    {
      title: '原值',
      dataIndex: 'originalValue',
      width: 110,
      render: (_, record) => formatAmount(record.originalValue),
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 80,
      render: (_, record) => (
        <Button type="link" onClick={() => void view.show(record.id)}>
          详情
        </Button>
      ),
    },
  ];
  return (
    <>
      <ProTable<OaAssetVo>
        headerTitle="名下资产"
        rowKey="id"
        columns={columns}
        search={false}
        scroll={{ x: 800 }}
        toolBarRender={() => [launchButton]}
        request={async (params) =>
          pageResult(
            await queryMyOaAssets({
              page: (params.current as number) || 1,
              size: (params.pageSize as number) || 10,
            }),
          )
        }
      />
      <Drawer
        title="资产详情"
        width={860}
        open={view.open}
        destroyOnHidden
        onClose={() => view.setOpen(false)}
      >
        <Spin spinning={view.loading}>
          {view.detail ? <AssetDetailContent detail={view.detail} /> : null}
        </Spin>
      </Drawer>
    </>
  );
};

const MyRequestTab: React.FC = () => {
  const view = useDetail<OaSupplyRequestDetailVo>(getMyOaSupplyRequest);
  const columns: ProColumns<OaSupplyRequestVo>[] = [
    {
      title: '申请',
      dataIndex: 'title',
      search: false,
      ellipsis: true,
      width: 180,
      render: (_, record) => record.title || `申请 #${record.applicationId}`,
    },
    {
      title: '领用状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 100,
      valueEnum: statusValueEnum(SUPPLY_REQUEST_STATUS_META),
      render: (_, record) => supplyRequestStatusTag(record.status),
    },
    {
      title: '明细',
      key: 'summary',
      search: false,
      width: 120,
      render: (_, record) =>
        `${record.itemCount} 种 / ${record.totalQuantity} 件`,
    },
    {
      title: '发放时间',
      dataIndex: 'issuedTime',
      search: false,
      width: 170,
      render: (_, record) => record.issuedTime || '—',
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 80,
      render: (_, record) => (
        <Button type="link" onClick={() => void view.show(record.id)}>
          详情
        </Button>
      ),
    },
  ];
  return (
    <>
      <ProTable<OaSupplyRequestVo>
        headerTitle="领用申请"
        rowKey="id"
        columns={columns}
        scroll={{ x: 760 }}
        request={async (params) =>
          pageResult(
            await queryMyOaSupplyRequests({
              page: (params.current as number) || 1,
              size: (params.pageSize as number) || 10,
              status: params.status || undefined,
            }),
          )
        }
      />
      <Drawer
        title="领用单详情"
        width={720}
        open={view.open}
        destroyOnHidden
        onClose={() => view.setOpen(false)}
      >
        <Spin spinning={view.loading}>
          {view.detail ? (
            <SupplyRequestDetailContent detail={view.detail} />
          ) : null}
        </Spin>
      </Drawer>
    </>
  );
};

const MyScrapTab: React.FC = () => {
  const columns: ProColumns<OaAssetScrapVo>[] = [
    { title: '资产编号', dataIndex: 'assetNo', search: false, width: 150 },
    { title: '资产名称', dataIndex: 'assetName', search: false, width: 140 },
    {
      title: '报废状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 100,
      valueEnum: statusValueEnum(SCRAP_STATUS_META),
      render: (_, record) => scrapStatusTag(record.status),
    },
    {
      title: '原值',
      dataIndex: 'originalValue',
      search: false,
      width: 110,
      render: (_, record) => formatAmount(record.originalValue),
    },
    {
      title: '执行时间',
      dataIndex: 'executedTime',
      search: false,
      width: 170,
      render: (_, record) => record.executedTime || '—',
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <TrackButton applicationId={record.applicationId} />
      ),
    },
  ];
  return (
    <ProTable<OaAssetScrapVo>
      headerTitle="报废申请"
      rowKey="id"
      columns={columns}
      scroll={{ x: 800 }}
      request={async (params) =>
        pageResult(
          await queryMyOaAssetScraps({
            page: (params.current as number) || 1,
            size: (params.pageSize as number) || 10,
            status: params.status || undefined,
          }),
        )
      }
    />
  );
};

const MyPurchaseTab: React.FC = () => {
  const view = useDetail<OaPurchaseDetailVo>(getMyOaPurchase);
  const columns: ProColumns<OaPurchaseVo>[] = [
    { title: '采购单号', dataIndex: 'purchaseNo', search: false, width: 150 },
    {
      title: '采购状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 100,
      valueEnum: statusValueEnum(PURCHASE_STATUS_META),
      render: (_, record) => purchaseStatusTag(record.status),
    },
    {
      title: '申请',
      dataIndex: 'title',
      search: false,
      ellipsis: true,
      width: 180,
      render: (_, record) => record.title || `申请 #${record.applicationId}`,
    },
    {
      title: '合计',
      dataIndex: 'totalAmount',
      search: false,
      width: 120,
      render: (_, record) => formatAmount(record.totalAmount),
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 80,
      render: (_, record) => (
        <Button type="link" onClick={() => void view.show(record.id)}>
          详情
        </Button>
      ),
    },
  ];
  return (
    <>
      <ProTable<OaPurchaseVo>
        headerTitle="采购申请"
        rowKey="id"
        columns={columns}
        scroll={{ x: 760 }}
        request={async (params) =>
          pageResult(
            await queryMyOaPurchases({
              page: (params.current as number) || 1,
              size: (params.pageSize as number) || 10,
              status: params.status || undefined,
            }),
          )
        }
      />
      <Drawer
        title="采购单详情"
        width={860}
        open={view.open}
        destroyOnHidden
        onClose={() => view.setOpen(false)}
      >
        <Spin spinning={view.loading}>
          {view.detail ? <PurchaseDetailContent detail={view.detail} /> : null}
        </Spin>
      </Drawer>
    </>
  );
};

const MyAssetPage: React.FC = () => (
  <PageContainer header={{ title: '我的采购资产' }}>
    <Tabs
      destroyOnHidden
      items={[
        { key: 'assets', label: '我的资产', children: <MyAssetTab /> },
        { key: 'requests', label: '我的领用', children: <MyRequestTab /> },
        { key: 'scraps', label: '我的报废', children: <MyScrapTab /> },
        { key: 'purchases', label: '我的采购', children: <MyPurchaseTab /> },
      ]}
    />
  </PageContainer>
);

export default MyAssetPage;
