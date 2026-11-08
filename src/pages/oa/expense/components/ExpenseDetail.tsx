import { history } from '@umijs/max';
import { Button, Descriptions, Space, Table, Tag } from 'antd';
import React from 'react';
import type { OaExpenseDetailVo } from '@/services/web/guardfind/oa';
import {
  EXPENSE_STATUS_META,
  formatAmount,
  payMethodText,
} from '@/utils/oaExpense';
import { applicationStatusTag } from '../../application/components/ApplicationStatus';

export function expenseStatusTag(status: string) {
  const meta = EXPENSE_STATUS_META[status] ?? {
    text: status,
    color: 'default',
  };
  return <Tag color={meta.color}>{meta.text}</Tag>;
}

export const ExpenseDetailContent: React.FC<{ detail: OaExpenseDetailVo }> = ({
  detail,
}) => {
  const { expense, items } = detail;
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
        <Descriptions.Item label="申请">
          {expense.title || `申请 #${expense.applicationId}`}
        </Descriptions.Item>
        <Descriptions.Item label="申请人">
          {expense.applicantName || expense.applicantId}
        </Descriptions.Item>
        <Descriptions.Item label="报销合计">
          {formatAmount(expense.totalAmount)}
        </Descriptions.Item>
        <Descriptions.Item label="明细行数">
          {expense.itemCount}
        </Descriptions.Item>
        <Descriptions.Item label="报销状态">
          {expenseStatusTag(expense.status)}
        </Descriptions.Item>
        <Descriptions.Item label="审批状态">
          {expense.applicationStatus
            ? applicationStatusTag(expense.applicationStatus)
            : '—'}
        </Descriptions.Item>
        {expense.status === 'PAID' ? (
          <>
            <Descriptions.Item label="实付金额">
              {formatAmount(expense.paidAmount)}
            </Descriptions.Item>
            <Descriptions.Item label="支付日期">
              {expense.payDate || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="支付方式">
              {payMethodText(expense.payMethod)}
            </Descriptions.Item>
            <Descriptions.Item label="支付流水号">
              {expense.payReference || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="登记人">
              {expense.payerName || expense.payerId || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="登记时间">
              {expense.paidTime || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="支付备注" span={2}>
              {expense.payRemark || '—'}
            </Descriptions.Item>
          </>
        ) : null}
      </Descriptions>
      <Table
        rowKey="lineNo"
        size="small"
        bordered
        pagination={false}
        scroll={{ x: 720 }}
        dataSource={items}
        aria-label="报销明细"
        columns={[
          { title: '#', dataIndex: 'lineNo', width: 48 },
          { title: '费用类型', dataIndex: 'categoryName', width: 110 },
          {
            title: '金额',
            dataIndex: 'amount',
            width: 120,
            render: (value) => formatAmount(value),
          },
          {
            title: '发生日期',
            dataIndex: 'expenseDate',
            width: 110,
            render: (value) => value || '—',
          },
          {
            title: '发票号',
            dataIndex: 'invoiceNo',
            width: 140,
            render: (value) => value || '—',
          },
          {
            title: '说明',
            dataIndex: 'description',
            ellipsis: true,
            render: (value) => value || '—',
          },
        ]}
      />
      <Button
        type="link"
        style={{ padding: 0 }}
        onClick={() =>
          history.push(`/oa/application/detail?id=${expense.applicationId}`)
        }
      >
        查看审批轨迹
      </Button>
    </Space>
  );
};
