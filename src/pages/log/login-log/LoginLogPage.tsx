import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import React, { useRef } from 'react';
import DictTag from '@/components/Dict/DictTag';
import { loginLog } from '@/services/web/log';
import type { LoginLogVo } from '@/services/web/log/typings';

const LoginLogPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();

  const columns: ProColumns<LoginLogVo>[] = [
    {
      title: intl.formatMessage({ id: 'log.login.trace.id' }),
      dataIndex: 'traceId',
      ellipsis: true,
      width: 200,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'log.login.username' }),
      dataIndex: 'username',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'log.login.event.type' }),
      dataIndex: 'eventType',
      render: (_, record) => (
        <DictTag dictCode="login_event_type" value={record.eventType} />
      ),
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'log.login.ip' }),
      dataIndex: 'ip',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'log.login.browser' }),
      dataIndex: 'browser',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'log.login.os' }),
      dataIndex: 'os',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'log.login.message' }),
      dataIndex: 'message',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'log.login.status' }),
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

  return (
    <PageContainer>
      <ProTable<LoginLogVo>
        headerTitle={intl.formatMessage({ id: 'log.login.title' })}
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          const { current, pageSize, startTime, endTime, ...rest } = params;
          const response = await loginLog.query({
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

export default LoginLogPage;
