import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import React, { useRef } from 'react';
import DictTag from '@/components/Dict/DictTag';
import { operationLog } from '@/services/web/log';
import type { OperationLogVo } from '@/services/web/log/typings';

const OperationLogPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();

  const columns: ProColumns<OperationLogVo>[] = [
    {
      title: intl.formatMessage({ id: 'log.operation.trace.id' }),
      dataIndex: 'traceId',
      ellipsis: true,
      width: 200,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'log.operation.message' }),
      dataIndex: 'message',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'log.operation.type' }),
      dataIndex: 'type',
      render: (_, record) => (
        <DictTag dictCode="operation_type" value={record.type} />
      ),
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'log.operation.ip' }),
      dataIndex: 'ip',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'log.operation.uri' }),
      dataIndex: 'uri',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'log.operation.method' }),
      dataIndex: 'method',
      width: 80,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'log.operation.time' }),
      dataIndex: 'time',
      width: 80,
      hideInSearch: true,
      render: (_, record) => `${record.time}ms`,
    },
    {
      title: intl.formatMessage({ id: 'log.operation.operator' }),
      dataIndex: 'operator',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'log.operation.status' }),
      dataIndex: 'status',
      width: 80,
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

  const expandedRowRender = (record: OperationLogVo) => {
    return (
      <div style={{ padding: 16 }}>
        <p>
          <strong>{intl.formatMessage({ id: 'log.operation.params' })}:</strong>{' '}
          {record.params || '-'}
        </p>
        <p>
          <strong>
            {intl.formatMessage({ id: 'log.operation.useragent' })}:
          </strong>{' '}
          {record.userAgent || '-'}
        </p>
      </div>
    );
  };

  return (
    <PageContainer>
      <ProTable<OperationLogVo>
        headerTitle={intl.formatMessage({ id: 'log.operation.title' })}
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        expandable={{ expandedRowRender }}
        request={async (params) => {
          const { current, pageSize, startTime, endTime, ...rest } = params;
          const response = await operationLog.query({
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

export default OperationLogPage;
