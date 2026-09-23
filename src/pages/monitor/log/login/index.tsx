import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Tag } from 'antd';
import React, { useRef } from 'react';
import { loginLog } from '@/services/web/log';
import type { LoginLogVo } from '@/services/web/log/typings';

const LoginLogPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();

  const columns: ProColumns<LoginLogVo>[] = [
    {
      title: intl.formatMessage({ id: 'log.login.user' }),
      dataIndex: 'createUserString',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'log.login.description' }),
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'log.login.ip' }),
      dataIndex: 'ip',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'log.login.address' }),
      dataIndex: 'address',
      ellipsis: true,
      hideInSearch: true,
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
      title: intl.formatMessage({ id: 'log.login.status' }),
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

  return (
    <PageContainer>
      <ProTable<LoginLogVo>
        headerTitle={intl.formatMessage({ id: 'log.login.title' })}
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await loginLog.query({
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

export default LoginLogPage;
