/**
 * 我的考勤：本人按月的日考勤明细与统计，以及本人提交的补卡、加班、外出申请。
 */
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  message,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useEffect, useState } from 'react';
import {
  type OaAttendanceDailyVo,
  type OaAttendanceRequestVo,
  queryMyOaAttendanceDaily,
  queryMyOaAttendanceRequests,
} from '@/services/web/guardfind/oa';
import {
  dailyStats,
  monthRange,
  REQUEST_KIND_META,
  REQUEST_STATUS_META,
} from '@/utils/oaAttendance';
import { DailyTable, requestColumns } from '../components/AttendanceParts';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '加载失败';
}

const metaOptions = (meta: Record<string, { text: string }>) =>
  Object.entries(meta).map(([value, item]) => ({ value, label: item.text }));

const MyDailyTab: React.FC = () => {
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [rows, setRows] = useState<OaAttendanceDailyVo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    queryMyOaAttendanceDaily(monthRange(month))
      .then((response) => {
        if (active) setRows(response.data ?? []);
      })
      .catch((error) => {
        if (!active) return;
        setRows([]);
        message.error(errorText(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [month]);

  const stats = dailyStats(rows);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space wrap>
        <DatePicker
          picker="month"
          allowClear={false}
          value={month}
          aria-label="考勤月份"
          disabledDate={(date) => date.isAfter(dayjs(), 'month')}
          onChange={(value) => value && setMonth(value)}
        />
        <Button onClick={() => history.push('/oa/launch')}>
          发起补卡、加班或外出
        </Button>
      </Space>
      <Card size="small">
        <Space size={32} wrap>
          <Statistic title="应出勤天数" value={stats.scheduled} />
          <Statistic title="正常" value={stats.normal} />
          <Statistic
            title="异常"
            value={stats.abnormal}
            valueStyle={stats.abnormal ? { color: '#cf1322' } : undefined}
          />
          <Statistic title="请假" value={stats.leave} />
          <Statistic title="出差" value={stats.travel} />
          <Statistic title="外出" value={stats.outing} />
          <Statistic
            title="加班（小时）"
            value={stats.overtimeHours}
            precision={1}
          />
        </Space>
      </Card>
      {stats.abnormal > 0 ? (
        <Alert
          type="warning"
          showIcon
          message="本月有考勤异常，如漏打卡可发起补卡申请，审批通过后自动更正。"
        />
      ) : null}
      <DailyTable rows={rows} loading={loading} />
    </Space>
  );
};

const MyRequestTab: React.FC = () => {
  const [kind, setKind] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [page, setPage] = useState({ current: 1, pageSize: 10 });
  const [rows, setRows] = useState<OaAttendanceRequestVo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    queryMyOaAttendanceRequests({
      page: page.current,
      size: page.pageSize,
      kind,
      status,
    })
      .then((response) => {
        if (!active) return;
        setRows(response.data?.list ?? []);
        setTotal(response.data?.total ?? 0);
      })
      .catch((error) => {
        if (!active) return;
        setRows([]);
        setTotal(0);
        message.error(errorText(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [kind, status, page]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space wrap>
        <Select
          allowClear
          aria-label="申请类型"
          placeholder="申请类型"
          style={{ width: 140 }}
          value={kind}
          options={metaOptions(REQUEST_KIND_META)}
          onChange={(value) => {
            setKind(value);
            setPage((prev) => ({ ...prev, current: 1 }));
          }}
        />
        <Select
          allowClear
          aria-label="单据状态"
          placeholder="单据状态"
          style={{ width: 140 }}
          value={status}
          options={metaOptions(REQUEST_STATUS_META)}
          onChange={(value) => {
            setStatus(value);
            setPage((prev) => ({ ...prev, current: 1 }));
          }}
        />
      </Space>
      <Table<OaAttendanceRequestVo>
        rowKey="id"
        size="small"
        aria-label="我的假勤申请"
        loading={loading}
        scroll={{ x: 960 }}
        dataSource={rows}
        columns={requestColumns({ showApplicant: false })}
        locale={{ emptyText: '暂无补卡、加班或外出申请' }}
        pagination={{
          current: page.current,
          pageSize: page.pageSize,
          total,
          showSizeChanger: true,
          onChange: (current, pageSize) => setPage({ current, pageSize }),
        }}
      />
    </Space>
  );
};

const MyAttendancePage: React.FC = () => (
  <PageContainer header={{ title: '我的考勤' }}>
    <Tabs
      destroyOnHidden
      items={[
        { key: 'daily', label: '考勤明细', children: <MyDailyTab /> },
        { key: 'requests', label: '我的申请', children: <MyRequestTab /> },
      ]}
    />
  </PageContainer>
);

export default MyAttendancePage;
