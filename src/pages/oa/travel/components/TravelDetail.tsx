import { history } from '@umijs/max';
import { Button, Descriptions, Space, Table, Tag, Typography } from 'antd';
import React from 'react';
import type {
  OaLoanDetailVo,
  OaLoanLedgerVo,
  OaLoanVo,
  OaTravelDetailVo,
} from '@/services/web/guardfind/oa';
import { formatAmount, payMethodText } from '@/utils/oaExpense';
import {
  LOAN_LEDGER_ACTION_META,
  LOAN_STATUS_META,
  TRAVEL_STATUS_META,
} from '@/utils/oaTravel';
import { applicationStatusTag } from '../../application/components/ApplicationStatus';
import { expenseStatusTag } from '../../expense/components/ExpenseDetail';

function metaTag(
  meta: Record<string, { text: string; color: string }>,
  value: string,
) {
  const item = meta[value] ?? { text: value, color: 'default' };
  return <Tag color={item.color}>{item.text}</Tag>;
}

export const travelStatusTag = (status: string) =>
  metaTag(TRAVEL_STATUS_META, status);

export const loanStatusTag = (status: string) =>
  metaTag(LOAN_STATUS_META, status);

const TrackButton: React.FC<{ applicationId: number }> = ({
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

export const LoanLedgerTable: React.FC<{ ledger: OaLoanLedgerVo[] }> = ({
  ledger,
}) => (
  <Table<OaLoanLedgerVo>
    rowKey="id"
    size="small"
    bordered
    pagination={false}
    scroll={{ x: 760 }}
    dataSource={ledger}
    aria-label="借款台账"
    locale={{ emptyText: '暂无台账记录' }}
    columns={[
      {
        title: '动作',
        dataIndex: 'action',
        width: 96,
        render: (value: string) => metaTag(LOAN_LEDGER_ACTION_META, value),
      },
      {
        title: '金额',
        dataIndex: 'amount',
        width: 110,
        render: (value) => formatAmount(value),
      },
      {
        title: '余额',
        dataIndex: 'balanceAfter',
        width: 110,
        render: (value) => formatAmount(value),
      },
      { title: '业务日期', dataIndex: 'bizDate', width: 110 },
      {
        title: '方式',
        dataIndex: 'method',
        width: 90,
        render: (value) => payMethodText(value),
      },
      {
        title: '流水号 / 报销单',
        key: 'reference',
        width: 140,
        render: (_, record) =>
          record.expenseId
            ? `报销单 #${record.expenseId}`
            : record.reference || '—',
      },
      {
        title: '登记人',
        key: 'operator',
        width: 90,
        render: (_, record) => record.operatorName || record.operatorId || '—',
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

export const LoanDescriptions: React.FC<{ loan: OaLoanVo }> = ({ loan }) => (
  <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
    <Descriptions.Item label="申请">
      {loan.title || `申请 #${loan.applicationId}`}
    </Descriptions.Item>
    <Descriptions.Item label="申请人">
      {loan.applicantName || loan.applicantId}
    </Descriptions.Item>
    <Descriptions.Item label="借款金额">
      {formatAmount(loan.amount)}
    </Descriptions.Item>
    <Descriptions.Item label="待还余额">
      {formatAmount(loan.balance)}
    </Descriptions.Item>
    <Descriptions.Item label="借款状态">
      {loanStatusTag(loan.status)}
    </Descriptions.Item>
    <Descriptions.Item label="审批状态">
      {loan.applicationStatus
        ? applicationStatusTag(loan.applicationStatus)
        : '—'}
    </Descriptions.Item>
    <Descriptions.Item label="关联出差">
      {loan.travelNo || '—'}
    </Descriptions.Item>
    <Descriptions.Item label="预计还款">
      {loan.expectedRepayDate || '—'}
    </Descriptions.Item>
    {loan.disburseDate ? (
      <>
        <Descriptions.Item label="放款日期">
          {loan.disburseDate}
        </Descriptions.Item>
        <Descriptions.Item label="放款方式">
          {payMethodText(loan.disburseMethod)}
        </Descriptions.Item>
        <Descriptions.Item label="放款流水号">
          {loan.disburseReference || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="放款登记人">
          {loan.disburserName || loan.disburserId || '—'}
        </Descriptions.Item>
      </>
    ) : null}
    {loan.settledTime ? (
      <Descriptions.Item label="还清时间">{loan.settledTime}</Descriptions.Item>
    ) : null}
  </Descriptions>
);

export const LoanDetailContent: React.FC<{ detail: OaLoanDetailVo }> = ({
  detail,
}) => (
  <Space direction="vertical" size={16} style={{ width: '100%' }}>
    <LoanDescriptions loan={detail.loan} />
    <Typography.Title level={5} style={{ margin: 0 }}>
      借款台账
    </Typography.Title>
    <LoanLedgerTable ledger={detail.ledger} />
    <TrackButton applicationId={detail.loan.applicationId} />
  </Space>
);

export const TravelDetailContent: React.FC<{ detail: OaTravelDetailVo }> = ({
  detail,
}) => {
  const { travel, loans, expenses } = detail;
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
        <Descriptions.Item label="出差单号">
          {travel.travelNo}
        </Descriptions.Item>
        <Descriptions.Item label="申请人">
          {travel.applicantName || travel.applicantId}
        </Descriptions.Item>
        <Descriptions.Item label="目的地">
          {travel.destination}
        </Descriptions.Item>
        <Descriptions.Item label="行程">
          {`${travel.startDate} 至 ${travel.endDate}（${travel.days} 天）`}
        </Descriptions.Item>
        <Descriptions.Item label="预算">
          {formatAmount(travel.budgetAmount)}
        </Descriptions.Item>
        <Descriptions.Item label="出差状态">
          {travelStatusTag(travel.status)}
        </Descriptions.Item>
        <Descriptions.Item label="借款合计">
          {formatAmount(travel.loanAmount ?? 0)}
        </Descriptions.Item>
        <Descriptions.Item label="借款余额">
          {formatAmount(travel.loanBalance ?? 0)}
        </Descriptions.Item>
        <Descriptions.Item label="已报销" span={2}>
          {formatAmount(travel.expenseAmount ?? 0)}
        </Descriptions.Item>
      </Descriptions>
      <Typography.Title level={5} style={{ margin: 0 }}>
        关联借款
      </Typography.Title>
      <Table<OaLoanVo>
        rowKey="id"
        size="small"
        bordered
        pagination={false}
        dataSource={loans}
        aria-label="关联借款"
        locale={{ emptyText: '暂无关联借款' }}
        columns={[
          {
            title: '申请',
            key: 'title',
            ellipsis: true,
            render: (_, record) =>
              record.title || `申请 #${record.applicationId}`,
          },
          {
            title: '金额',
            dataIndex: 'amount',
            width: 110,
            render: (value) => formatAmount(value),
          },
          {
            title: '余额',
            dataIndex: 'balance',
            width: 110,
            render: (value) => formatAmount(value),
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 90,
            render: (value: string) => loanStatusTag(value),
          },
        ]}
      />
      <Typography.Title level={5} style={{ margin: 0 }}>
        关联报销
      </Typography.Title>
      <Table
        rowKey="id"
        size="small"
        bordered
        pagination={false}
        dataSource={expenses}
        aria-label="关联报销"
        locale={{ emptyText: '暂无关联报销' }}
        columns={[
          {
            title: '申请',
            key: 'title',
            ellipsis: true,
            render: (_, record) =>
              record.title || `申请 #${record.applicationId}`,
          },
          {
            title: '合计',
            dataIndex: 'totalAmount',
            width: 110,
            render: (value) => formatAmount(value),
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 90,
            render: (value: string) => expenseStatusTag(value),
          },
          {
            title: '超预算',
            dataIndex: 'overBudget',
            width: 80,
            render: (value?: boolean) =>
              value ? <Tag color="red">超预算</Tag> : '—',
          },
        ]}
      />
      <TrackButton applicationId={travel.applicationId} />
    </Space>
  );
};
