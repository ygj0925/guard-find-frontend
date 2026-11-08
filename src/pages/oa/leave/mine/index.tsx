/**
 * 我的假期：本人年度余额与请假记录；余额由人事发放，请假单提交后占用、通过后扣减。
 */
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  message,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';
import {
  type OaLeaveBalanceVo,
  type OaLeaveRequestVo,
  queryMyOaLeaveBalances,
  queryMyOaLeaveRequests,
} from '@/services/web/guardfind/oa';
import {
  formatDays,
  halfText,
  LEAVE_REQUEST_STATUS_META,
} from '@/utils/oaLeave';
import { applicationStatusTag } from '../../application/components/ApplicationStatus';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '加载失败';
}

const MyLeavePage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [year, setYear] = useState(dayjs().year());
  const [balances, setBalances] = useState<OaLeaveBalanceVo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    queryMyOaLeaveBalances(year)
      .then((response) => {
        if (active) setBalances(response.data ?? []);
      })
      .catch((error) => {
        if (active) {
          setBalances([]);
          message.error(errorText(error));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [year]);

  const columns: ProColumns<OaLeaveRequestVo>[] = [
    {
      title: '申请',
      dataIndex: 'title',
      ellipsis: true,
      width: 200,
      render: (_, record) => record.title || `申请 #${record.applicationId}`,
    },
    { title: '假期类型', dataIndex: 'leaveTypeName', width: 100 },
    {
      title: '时间',
      key: 'range',
      width: 260,
      render: (_, record) =>
        `${record.startDate} ${halfText(record.startHalf)} 至 ${record.endDate} ${halfText(record.endHalf)}`,
    },
    {
      title: '天数',
      dataIndex: 'days',
      width: 70,
      render: (_, record) => formatDays(record.days),
    },
    {
      title: '额度状态',
      dataIndex: 'status',
      width: 110,
      render: (_, record) => {
        const meta = LEAVE_REQUEST_STATUS_META[record.status] ?? {
          text: record.status,
          color: 'default',
        };
        return <Tag color={meta.color}>{meta.text}</Tag>;
      },
    },
    {
      title: '审批状态',
      dataIndex: 'applicationStatus',
      width: 100,
      render: (_, record) =>
        record.applicationStatus
          ? applicationStatusTag(record.applicationStatus)
          : '—',
    },
    { title: '提交时间', dataIndex: 'createTime', width: 170 },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 90,
      render: (_, record) => (
        <Button
          type="link"
          onClick={() =>
            history.push(`/oa/application/detail?id=${record.applicationId}`)
          }
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <PageContainer header={{ title: '我的假期' }}>
      <Card
        title="年度余额"
        style={{ marginBottom: 16 }}
        extra={
          <DatePicker
            picker="year"
            allowClear={false}
            aria-label="余额年度"
            value={dayjs().year(year)}
            onChange={(value) => value && setYear(value.year())}
          />
        }
      >
        <Spin spinning={loading}>
          {balances.length === 0 ? (
            <Empty
              description={`${year} 年度暂无发放的假期额度，如有疑问请联系人事`}
            />
          ) : (
            <Row gutter={[16, 16]}>
              {balances.map((balance) => (
                <Col key={balance.id} xs={24} sm={12} lg={8} xl={6}>
                  <Card size="small">
                    <Statistic
                      title={balance.leaveTypeName}
                      value={formatDays(balance.availableDays)}
                      suffix="天可用"
                    />
                    <Space size={12} wrap style={{ marginTop: 8 }}>
                      <Typography.Text type="secondary">
                        总额 {formatDays(balance.totalDays)}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        已用 {formatDays(balance.usedDays)}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        审批中 {formatDays(balance.occupiedDays)}
                      </Typography.Text>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Spin>
      </Card>

      <ProTable<OaLeaveRequestVo>
        headerTitle="请假记录"
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={false}
        scroll={{ x: 1100 }}
        toolBarRender={() => [
          <Button
            key="launch"
            type="primary"
            onClick={() => history.push('/oa/launch')}
          >
            发起请假
          </Button>,
        ]}
        request={async (params) => {
          const response = await queryMyOaLeaveRequests({
            page: (params.current as number) || 1,
            size: (params.pageSize as number) || 10,
          });
          return {
            data: response.data?.list ?? [],
            total: response.data?.total ?? 0,
            success: true,
          };
        }}
      />
    </PageContainer>
  );
};

export default MyLeavePage;
