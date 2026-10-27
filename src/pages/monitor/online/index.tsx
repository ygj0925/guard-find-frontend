import { LogoutOutlined } from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, message, Popconfirm } from 'antd';
import React, { useRef } from 'react';
import AccessControl from '@/components/AccessControl';
import * as onlineService from '@/services/web/monitor/online';
import type { OnlineUserVo } from '@/services/web/monitor/typings';
import { getTableScrollX } from '@/utils/tableLayout';

const OnlinePage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);

  const handleKickout = async (record: OnlineUserVo) => {
    await onlineService.kickout(record.token);
    message.success('已强制下线');
    actionRef.current?.reload();
  };

  const columns: ProColumns<OnlineUserVo>[] = [
    { title: '用户名', dataIndex: 'username', width: 140, ellipsis: true },
    {
      title: '昵称',
      dataIndex: 'nickname',
      width: 140,
      ellipsis: true,
      hideInSearch: true,
    },
    { title: 'IP地址', dataIndex: 'ip', width: 140, ellipsis: true },
    {
      title: '登录地点',
      dataIndex: 'address',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '浏览器',
      dataIndex: 'browser',
      width: 160,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '操作系统',
      dataIndex: 'os',
      width: 140,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '登录时间',
      dataIndex: 'loginTime',
      hideInSearch: true,
      width: 180,
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      className: 'table-action-column',
      width: 100,
      render: (_, record) => (
        <AccessControl permission="monitor:online:kickout">
          <Popconfirm
            title="确定要强制下线该用户吗？"
            onConfirm={() => handleKickout(record)}
          >
            <Button type="link" danger icon={<LogoutOutlined />}>
              强退
            </Button>
          </Popconfirm>
        </AccessControl>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable<OnlineUserVo>
        headerTitle="在线用户"
        actionRef={actionRef}
        rowKey="token"
        columns={columns}
        scroll={{ x: getTableScrollX(columns) }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await onlineService.queryOnlineUsers({
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

export default OnlinePage;
