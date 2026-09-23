import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Tag } from 'antd';
import React, { useRef } from 'react';
import { operationLog } from '@/services/web/log';
import type { OperationLogVo } from '@/services/web/log/typings';

const OperationLogPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();

  const columns: ProColumns<OperationLogVo>[] = [
    {
      title: intl.formatMessage({ id: 'log.operation.description' }),
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'log.operation.module' }),
      dataIndex: 'module',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'log.operation.time' }),
      dataIndex: 'timeTaken',
      width: 90,
      render: (_, record) => `${record.timeTaken}ms`,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'log.operation.operator' }),
      dataIndex: 'createUserString',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'log.operation.ip' }),
      dataIndex: 'ip',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'log.operation.address' }),
      dataIndex: 'address',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'log.operation.browser' }),
      dataIndex: 'browser',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'log.operation.os' }),
      dataIndex: 'os',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'log.operation.status' }),
      dataIndex: 'status',
      width: 80,
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'green' : 'red'}>
          {record.status === 1
            ? intl.formatMessage({ id: 'common.status.success' })
            : intl.formatMessage({ id: 'common.status.fail' })}
        </Tag>
      ),
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.time.create' }),
      dataIndex: 'createTime',
      width: 180,
      valueType: 'dateRange',
      render: (_, record) => record.createTime || '-',
      search: {
        transform: (value) => ({
          createTime: value.join(','),
        }),
      },
    },
  ];

  const expandedRowRender = (record: OperationLogVo) => {
    return (
      <div style={{ padding: 16 }}>
        <p>
          <strong>
            {intl.formatMessage({ id: 'log.operation.useragent' })}:
          </strong>{' '}
          {record.browser || '-'} / {record.os || '-'}
        </p>
        {record.errorMsg && (
          <p>
            <strong>{intl.formatMessage({ id: 'log.access.error' })}:</strong>{' '}
            {record.errorMsg}
          </p>
        )}
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
          const { current, pageSize, ...rest } = params;
          const response = await operationLog.query({
            page: current as number,
            size: pageSize as number,
            ...rest,
          });
          return {
            data: response.data?.list || [],
            total: response.data?.total || 0,
            success: true,
          };
        }}
      />
    </PageContainer>
  );
};

export default OperationLogPage;
