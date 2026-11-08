/**
 * 我的出差借款：本人出差单（预算、借款与报销汇总）与借款余额、台账。
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
  getMyOaLoan,
  getMyOaTravel,
  type OaLoanDetailVo,
  type OaLoanVo,
  type OaTravelDetailVo,
  type OaTravelVo,
  queryMyOaLoans,
  queryMyOaTravels,
} from '@/services/web/guardfind/oa';
import { formatAmount } from '@/utils/oaExpense';
import {
  LOAN_STATUS_META,
  statusValueEnum,
  TRAVEL_STATUS_META,
} from '@/utils/oaTravel';
import {
  LoanDetailContent,
  loanStatusTag,
  TravelDetailContent,
  travelStatusTag,
} from '../components/TravelDetail';

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

const MyTravelTab: React.FC = () => {
  const view = useDetail<OaTravelDetailVo>(getMyOaTravel);
  const columns: ProColumns<OaTravelVo>[] = [
    { title: '出差单号', dataIndex: 'travelNo', search: false, width: 170 },
    {
      title: '出差状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 100,
      valueEnum: statusValueEnum(TRAVEL_STATUS_META),
      render: (_, record) => travelStatusTag(record.status),
    },
    {
      title: '目的地',
      dataIndex: 'destination',
      search: false,
      ellipsis: true,
      width: 140,
    },
    {
      title: '行程',
      key: 'range',
      search: false,
      width: 200,
      render: (_, record) =>
        `${record.startDate} 至 ${record.endDate}（${record.days} 天）`,
    },
    {
      title: '预算',
      dataIndex: 'budgetAmount',
      search: false,
      width: 110,
      render: (_, record) => formatAmount(record.budgetAmount),
    },
    {
      title: '已报销',
      dataIndex: 'expenseAmount',
      search: false,
      width: 110,
      render: (_, record) => formatAmount(record.expenseAmount ?? 0),
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
      <ProTable<OaTravelVo>
        headerTitle="出差记录"
        rowKey="id"
        columns={columns}
        scroll={{ x: 960 }}
        toolBarRender={() => [
          <Button
            key="launch"
            type="primary"
            onClick={() => history.push('/oa/launch')}
          >
            发起出差或借款
          </Button>,
        ]}
        request={async (params) => {
          const response = await queryMyOaTravels({
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
        title="出差单详情"
        width={760}
        open={view.open}
        destroyOnHidden
        onClose={() => view.setOpen(false)}
      >
        <Spin spinning={view.loading}>
          {view.detail ? <TravelDetailContent detail={view.detail} /> : null}
        </Spin>
      </Drawer>
    </>
  );
};

const MyLoanTab: React.FC = () => {
  const view = useDetail<OaLoanDetailVo>(getMyOaLoan);
  const columns: ProColumns<OaLoanVo>[] = [
    {
      title: '借款状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 100,
      valueEnum: statusValueEnum(LOAN_STATUS_META),
      render: (_, record) => loanStatusTag(record.status),
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
      title: '关联出差',
      dataIndex: 'travelNo',
      search: false,
      width: 170,
      render: (_, record) => record.travelNo || '—',
    },
    {
      title: '借款金额',
      dataIndex: 'amount',
      search: false,
      width: 110,
      render: (_, record) => formatAmount(record.amount),
    },
    {
      title: '待还余额',
      dataIndex: 'balance',
      search: false,
      width: 110,
      render: (_, record) => formatAmount(record.balance),
    },
    {
      title: '预计还款',
      dataIndex: 'expectedRepayDate',
      search: false,
      width: 110,
      render: (_, record) => record.expectedRepayDate || '—',
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
      <ProTable<OaLoanVo>
        headerTitle="借款记录"
        rowKey="id"
        columns={columns}
        scroll={{ x: 960 }}
        request={async (params) => {
          const response = await queryMyOaLoans({
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
        title="借款单详情"
        width={820}
        open={view.open}
        destroyOnHidden
        onClose={() => view.setOpen(false)}
      >
        <Spin spinning={view.loading}>
          {view.detail ? <LoanDetailContent detail={view.detail} /> : null}
        </Spin>
      </Drawer>
    </>
  );
};

const MyTravelPage: React.FC = () => (
  <PageContainer header={{ title: '我的出差借款' }}>
    <Tabs
      destroyOnHidden
      items={[
        { key: 'travels', label: '我的出差', children: <MyTravelTab /> },
        { key: 'loans', label: '我的借款', children: <MyLoanTab /> },
      ]}
    />
  </PageContainer>
);

export default MyTravelPage;
