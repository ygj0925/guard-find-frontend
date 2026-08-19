import { ReloadOutlined, StopOutlined } from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, message, Space, Tag, Tooltip } from 'antd';
import React, { useRef } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  queryJobLogs,
  retryJobLog,
  stopJobLog,
} from '@/services/web/schedule/log';
import type { JobLogVo } from '@/services/web/schedule/typings';

const statusMap: Record<number, { text: string; color: string }> = {
  0: { text: '失败', color: 'red' },
  1: { text: '成功', color: 'green' },
  2: { text: '运行中', color: 'blue' },
};

const JobLogPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);

  const columns: ProColumns<JobLogVo>[] = [
    {
      title: '任务名称',
      dataIndex: 'jobName',
      ellipsis: true,
    },
    {
      title: '任务分组',
      dataIndex: 'jobGroup',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '目标方法',
      dataIndex: 'targetBean',
      hideInSearch: true,
      render: (_, record) => `${record.targetBean}.${record.targetMethod}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        0: { text: '失败', status: 'Error' },
        1: { text: '成功', status: 'Success' },
        2: { text: '运行中', status: 'Processing' },
      },
      render: (_, record) => {
        const item = statusMap[record.status];
        return item ? <Tag color={item.color}>{item.text}</Tag> : '-';
      },
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      hideInSearch: true,
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      hideInSearch: true,
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      hideInSearch: true,
      render: (_, record) =>
        record.duration != null ? `${record.duration} ms` : '-',
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      hideInSearch: true,
      ellipsis: true,
      render: (_, record) =>
        record.errorMessage ? (
          <Tooltip title={record.errorMessage}>
            <span>{record.errorMessage}</span>
          </Tooltip>
        ) : (
          '-'
        ),
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => (
        <Space>
          {record.status === 2 && (
            <AccessControl permission="schedule:log:stop">
              <Button
                type="link"
                icon={<StopOutlined />}
                onClick={() => handleStop(record)}
              >
                停止
              </Button>
            </AccessControl>
          )}
          {record.status === 0 && (
            <AccessControl permission="schedule:log:retry">
              <Button
                type="link"
                icon={<ReloadOutlined />}
                onClick={() => handleRetry(record)}
              >
                重试
              </Button>
            </AccessControl>
          )}
        </Space>
      ),
    },
  ];

  const handleStop = async (record: JobLogVo) => {
    try {
      await stopJobLog(record.id);
      message.success('停止成功');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Stop failed:', error);
    }
  };

  const handleRetry = async (record: JobLogVo) => {
    try {
      await retryJobLog(record.id);
      message.success('重试成功');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  return (
    <PageContainer>
      <ProTable<JobLogVo>
        headerTitle="任务日志"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await queryJobLogs({
            page: current as number,
            size: pageSize as number,
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

export default JobLogPage;
