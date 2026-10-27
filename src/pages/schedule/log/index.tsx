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
import { listGroups } from '@/services/web/schedule/job';
import {
  queryJobLogs,
  retryJobLog,
  stopJobLog,
} from '@/services/web/schedule/log';
import type { JobLogVo } from '@/services/web/schedule/typings';
import { getTableScrollX } from '@/utils/tableLayout';

/** 后端 JobExecuteStatusEnum：1 待处理 2 运行中 3 成功 4 已失败 5 已停止 6 已取消 */
const statusMap: Record<number, { text: string; color: string }> = {
  1: { text: '待处理', color: 'blue' },
  2: { text: '运行中', color: 'orange' },
  3: { text: '成功', color: 'green' },
  4: { text: '已失败', color: 'red' },
  5: { text: '已停止', color: 'red' },
  6: { text: '已取消', color: 'default' },
};

const JobLogPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);

  const columns: ProColumns<JobLogVo>[] = [
    {
      title: '任务名称',
      dataIndex: 'jobName',
      width: 180,
      ellipsis: true,
    },
    {
      title: '任务分组',
      dataIndex: 'groupName',
      width: 140,
      ellipsis: true,
      valueType: 'select',
      // 分组候选同样取自 `GET /schedule/job/group`
      request: async () => {
        try {
          const response = await listGroups();
          return (response.data || []).map((group) => ({
            label: group,
            value: group,
          }));
        } catch (error) {
          console.error('Load groups failed:', error);
          return [];
        }
      },
    },
    {
      title: '执行器',
      dataIndex: 'executorInfo',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) =>
        record.executorType
          ? `${record.executorType}：${record.executorInfo || '-'}`
          : record.executorInfo || '-',
    },
    {
      title: '状态',
      dataIndex: 'taskBatchStatus',
      width: 100,
      valueType: 'select',
      valueEnum: {
        1: { text: '待处理', status: 'Default' },
        2: { text: '运行中', status: 'Processing' },
        3: { text: '成功', status: 'Success' },
        4: { text: '已失败', status: 'Error' },
        5: { text: '已停止', status: 'Error' },
        6: { text: '已取消', status: 'Warning' },
      },
      render: (_, record) => {
        const item =
          record.taskBatchStatus != null
            ? statusMap[record.taskBatchStatus]
            : undefined;
        return item ? <Tag color={item.color}>{item.text}</Tag> : '-';
      },
    },
    {
      title: '执行时间',
      dataIndex: 'executionAt',
      width: 180,
      hideInSearch: true,
    },
    {
      title: '记录时间',
      dataIndex: 'createDt',
      width: 180,
      hideInSearch: true,
    },
    {
      title: '操作原因',
      dataIndex: 'operationReason',
      width: 160,
      hideInSearch: true,
      ellipsis: true,
      // 后端 JobLogResp 只有 operationReason（人工停止/超时等原因编码），没有 errorMessage 字段
      render: (_, record) =>
        record.operationReason != null ? (
          <Tooltip title={`操作原因编码：${record.operationReason}`}>
            <span>{record.operationReason}</span>
          </Tooltip>
        ) : (
          '-'
        ),
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      className: 'table-action-column',
      width: 140,
      render: (_, record) => (
        <Space wrap>
          {record.taskBatchStatus === 2 && (
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
          {record.taskBatchStatus === 4 && (
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
        scroll={{ x: getTableScrollX(columns) }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await queryJobLogs({
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

export default JobLogPage;
