import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import React, { useRef } from 'react';
import { accessLog } from '@/services/web/log';
import type { AccessLogVo } from '@/services/web/log/typings';

const AccessLogPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();

  const columns: ProColumns<AccessLogVo>[] = [
    {
      title: intl.formatMessage({ id: 'log.access.trace.id' }),
      dataIndex: 'traceId',
      ellipsis: true,
      width: 200,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'log.access.username' }),
      dataIndex: 'username',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'log.access.ip' }),
      dataIndex: 'ip',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'log.access.uri' }),
      dataIndex: 'uri',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'log.access.method' }),
      dataIndex: 'method',
      width: 80,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'log.access.time' }),
      dataIndex: 'time',
      width: 80,
      hideInSearch: true,
      render: (_, record) => `${record.time}ms`,
    },
    {
      title: intl.formatMessage({ id: 'log.access.status' }),
      dataIndex: 'statusCode',
      width: 80,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'log.access.error' }),
      dataIndex: 'errorMessage',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.time.create' }),
      dataIndex: 'createTime',
      width: 180,
      valueType: 'dateRange',
      search: {
        transform: (value) => ({
          startTime: value[0],
          endTime: value[1],
        }),
      },
    },
  ];

  const expandedRowRender = (record: AccessLogVo) => {
    return (
      <div style={{ padding: 16 }}>
        <p>
          <strong>{intl.formatMessage({ id: 'log.access.params' })}:</strong>{' '}
          {record.reqParams || '-'}
        </p>
        <p>
          <strong>{intl.formatMessage({ id: 'log.access.body' })}:</strong>{' '}
          {record.reqBody || '-'}
        </p>
        <p>
          <strong>{intl.formatMessage({ id: 'log.access.result' })}:</strong>{' '}
          {record.result || '-'}
        </p>
        <p>
          <strong>{intl.formatMessage({ id: 'log.access.useragent' })}:</strong>{' '}
          {record.userAgent || '-'}
        </p>
      </div>
    );
  };

  return (
    <PageContainer>
      <ProTable<AccessLogVo>
        headerTitle={intl.formatMessage({ id: 'log.access.title' })}
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        expandable={{ expandedRowRender }}
        request={async (params) => {
          const { current, pageSize, startTime, endTime, ...rest } = params;
          const response = await accessLog.query({
            page: current as number,
            size: pageSize as number,
            startTime: startTime as string,
            endTime: endTime as string,
            ...rest,
          });
          return {
            data: response.data?.records || [],
            total: response.data?.total || 0,
            success: true,
          };
        }}
      />
    </PageContainer>
  );
};

export default AccessLogPage;
