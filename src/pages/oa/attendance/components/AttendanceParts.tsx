import { history } from '@umijs/max';
import { Button, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import React from 'react';
import type {
  OaAttendanceDailyVo,
  OaAttendanceRequestVo,
} from '@/services/web/guardfind/oa';
import {
  CHECK_SOURCE_LABELS,
  CHECK_TYPE_LABELS,
  DAILY_STATUS_META,
  formatClock,
  formatDateTime,
  formatHours,
  REQUEST_KIND_META,
  REQUEST_STATUS_META,
} from '@/utils/oaAttendance';
import { applicationStatusTag } from '../../application/components/ApplicationStatus';

type Meta = Record<string, { text: string; color: string }>;

function metaTag(meta: Meta, value?: string | null) {
  const key = String(value ?? '');
  const item = meta[key] ?? { text: key || '—', color: 'default' };
  return <Tag color={item.color}>{item.text}</Tag>;
}

export const dailyStatusTag = (status?: string | null) =>
  metaTag(DAILY_STATUS_META, status);

export const requestKindTag = (kind?: string | null) =>
  metaTag(REQUEST_KIND_META, kind);

export const requestStatusTag = (status?: string | null) =>
  metaTag(REQUEST_STATUS_META, status);

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function dateWithWeek(date: string) {
  return `${date} ${WEEK[dayjs(date).day()]}`;
}

export function clockWithSource(time?: string | null, source?: string | null) {
  if (!time) return <Typography.Text type="secondary">—</Typography.Text>;
  const label = source ? CHECK_SOURCE_LABELS[source] : undefined;
  return (
    <span>
      {formatClock(time)}
      {label ? (
        <Tag
          bordered={false}
          color={source === 'CORRECTION' ? 'purple' : 'default'}
          style={{ marginInlineStart: 6 }}
        >
          {label}
        </Tag>
      ) : null}
    </span>
  );
}

export const DailyTable: React.FC<{
  rows: OaAttendanceDailyVo[];
  loading?: boolean;
}> = ({ rows, loading }) => (
  <Table<OaAttendanceDailyVo>
    rowKey="workDate"
    size="small"
    bordered
    loading={loading}
    pagination={false}
    scroll={{ x: 760 }}
    dataSource={rows}
    aria-label="日考勤明细"
    locale={{ emptyText: '该区间暂无考勤数据' }}
    columns={[
      {
        title: '日期',
        dataIndex: 'workDate',
        width: 130,
        render: (value: string) => dateWithWeek(value),
      },
      {
        title: '班次',
        dataIndex: 'shiftName',
        width: 150,
        render: (_, row) =>
          row.shiftName
            ? `${row.shiftName} ${row.shiftStart}-${row.shiftEnd}`
            : '—',
      },
      {
        title: '上班',
        dataIndex: 'checkIn',
        width: 110,
        render: (_, row) => clockWithSource(row.checkIn, row.checkInSource),
      },
      {
        title: '下班',
        dataIndex: 'checkOut',
        width: 110,
        render: (_, row) => clockWithSource(row.checkOut, row.checkOutSource),
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        render: (_, row) =>
          row.note ? (
            <Tooltip title={row.note}>{dailyStatusTag(row.status)}</Tooltip>
          ) : (
            dailyStatusTag(row.status)
          ),
      },
      {
        title: '加班',
        dataIndex: 'overtimeHours',
        width: 90,
        render: (value: unknown) => formatHours(value),
      },
      {
        title: '说明',
        dataIndex: 'note',
        ellipsis: true,
        render: (value?: string | null) => value || '—',
      },
    ]}
  />
);

export function requestTimeText(row: OaAttendanceRequestVo) {
  if (row.kind === 'CORRECTION') {
    const type = CHECK_TYPE_LABELS[String(row.checkType)] ?? row.checkType;
    return `${type ?? ''}补卡 ${formatDateTime(row.startTime)}`;
  }
  return `${formatDateTime(row.startTime)} 至 ${formatClock(row.endTime)}`;
}

export function requestColumns(options: {
  showApplicant: boolean;
}): ColumnsType<OaAttendanceRequestVo> {
  return [
    {
      title: '类型',
      dataIndex: 'kind',
      width: 80,
      render: (value: string) => requestKindTag(value),
    },
    ...(options.showApplicant
      ? [
          {
            title: '申请人',
            dataIndex: 'applicantName',
            width: 100,
            render: (_: unknown, row: OaAttendanceRequestVo) =>
              row.applicantName || row.applicantId,
          },
        ]
      : []),
    {
      title: '归属日期',
      dataIndex: 'workDate',
      width: 130,
      render: (value: string) => dateWithWeek(value),
    },
    {
      title: '时间',
      key: 'time',
      width: 240,
      render: (_, row) => requestTimeText(row),
    },
    {
      title: '时长',
      dataIndex: 'hours',
      width: 90,
      render: (value: unknown, row) =>
        row.kind === 'CORRECTION' ? '—' : formatHours(value),
    },
    {
      title: '地点',
      dataIndex: 'destination',
      width: 120,
      ellipsis: true,
      render: (value?: string | null) => value || '—',
    },
    {
      title: '单据状态',
      dataIndex: 'status',
      width: 90,
      render: (value: string) => requestStatusTag(value),
    },
    {
      title: '审批',
      dataIndex: 'applicationStatus',
      width: 90,
      render: (value?: string | null) =>
        value ? applicationStatusTag(value) : '—',
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 110,
      render: (_, row) => (
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={() =>
            history.push(`/oa/application/detail?id=${row.applicationId}`)
          }
        >
          查看审批
        </Button>
      ),
    },
  ];
}
