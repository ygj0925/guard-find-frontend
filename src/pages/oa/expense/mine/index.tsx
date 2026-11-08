/**
 * 我的报销：本人报销单与支付进度；审批通过后由财务登记支付。
 */
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Drawer, message, Spin } from 'antd';
import React, { useRef, useState } from 'react';
import {
  getMyOaExpense,
  type OaExpenseDetailVo,
  type OaExpenseVo,
  queryMyOaExpenses,
} from '@/services/web/guardfind/oa';
import { EXPENSE_STATUS_META, formatAmount } from '@/utils/oaExpense';
import { applicationStatusTag } from '../../application/components/ApplicationStatus';
import {
  ExpenseDetailContent,
  expenseStatusTag,
} from '../components/ExpenseDetail';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '加载失败';
}

const MyExpensePage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<OaExpenseDetailVo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (record: OaExpenseVo) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const response = await getMyOaExpense(record.id);
      setDetail(response.data);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: ProColumns<OaExpenseVo>[] = [
    {
      title: '报销状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 100,
      valueEnum: Object.fromEntries(
        Object.entries(EXPENSE_STATUS_META).map(([key, meta]) => [
          key,
          { text: meta.text },
        ]),
      ),
      render: (_, record) => expenseStatusTag(record.status),
    },
    {
      title: '申请',
      dataIndex: 'title',
      search: false,
      ellipsis: true,
      width: 200,
      render: (_, record) => record.title || `申请 #${record.applicationId}`,
    },
    {
      title: '合计',
      dataIndex: 'totalAmount',
      search: false,
      width: 120,
      render: (_, record) => formatAmount(record.totalAmount),
    },
    { title: '明细', dataIndex: 'itemCount', search: false, width: 60 },
    {
      title: '审批状态',
      dataIndex: 'applicationStatus',
      search: false,
      width: 100,
      render: (_, record) =>
        record.applicationStatus
          ? applicationStatusTag(record.applicationStatus)
          : '—',
    },
    {
      title: '支付日期',
      dataIndex: 'payDate',
      search: false,
      width: 110,
      render: (_, record) => record.payDate || '—',
    },
    { title: '提交时间', dataIndex: 'createTime', search: false, width: 170 },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 90,
      render: (_, record) => (
        <Button type="link" onClick={() => void openDetail(record)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <PageContainer header={{ title: '我的报销' }}>
      <ProTable<OaExpenseVo>
        headerTitle="报销记录"
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 1000 }}
        toolBarRender={() => [
          <Button
            key="launch"
            type="primary"
            onClick={() => history.push('/oa/launch')}
          >
            发起报销
          </Button>,
        ]}
        request={async (params) => {
          const response = await queryMyOaExpenses({
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
        title="报销单详情"
        width={760}
        open={detailOpen}
        destroyOnHidden
        onClose={() => setDetailOpen(false)}
      >
        <Spin spinning={detailLoading}>
          {detail ? <ExpenseDetailContent detail={detail} /> : null}
        </Spin>
      </Drawer>
    </PageContainer>
  );
};

export default MyExpensePage;
